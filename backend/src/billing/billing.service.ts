import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import PDFDocument from 'pdfkit';

const OVERAGE_RATE = 2;

export enum InvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
}

@Injectable()
export class BillingService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Generates a PENDING invoice for a subscription based on its current
   * usage and billing period dates. Called on subscription creation,
   * manual renewal, and the daily billing cron.
   */
  async generateInvoice(subscriptionId: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const overage = Math.max(0, sub.current_usage - sub.plan.usage_limit);
    const amount = sub.plan.price + overage * OVERAGE_RATE;

    return this.prisma.invoice.create({
      data: {
        tenant_id: sub.tenant_id,
        subscription_id: sub.id,
        amount,
        billing_period_start: sub.start_date,
        billing_period_end: sub.end_date,
        status: InvoiceStatus.PENDING,
      },
    });
  }

  /**
   * Industry-standard renewal: invoice the completed period (with actual
   * usage), then roll the subscription forward and reset usage.
   * Sequence matters — invoice always reflects the period it covers.
   */
  async processRenewal(subscriptionId: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    // 1. Invoice the completed period using current usage/dates
    const invoice = await this.generateInvoice(subscriptionId);

    // 2. Roll billing period forward
    const newStart = sub.end_date;
    const newEnd = new Date(sub.end_date);
    newEnd.setMonth(newEnd.getMonth() + 1);

    // 3. Reset usage for the new period
    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        start_date: newStart,
        end_date: newEnd,
        current_usage: 0,
        status: 'ACTIVE',
      },
    });

    // Invalidate cached subscription so next read reflects renewed state
    await this.redis.del(`sub:${subscriptionId}`);

    return { invoice, subscription };
  }

  /**
   * Daily cron (industry standard: check end_date <= today instead of
   * running only on the 1st). Catches subscriptions expiring on any day.
   */
  @Cron('0 0 * * *')
  async runBillingCycle() {
    const today = new Date();

    const dueSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        end_date: { lte: today },
      },
      select: { id: true },
    });

    for (const sub of dueSubs) {
      await this.processRenewal(sub.id);
    }

    return { processed: dueSubs.length };
  }

  /**
   * Generates and returns a PDF buffer for an invoice.
   * Includes tenant info, plan, line items (base + overage), total, and period.
   */
  async downloadInvoice(invoiceId: number): Promise<Buffer> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: true,
        subscription: { include: { plan: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const { tenant, subscription, amount, status } = invoice;
    const plan = subscription.plan;
    const basePrice = plan.price;
    const overageAmount = amount - basePrice;
    const overageUnits =
      overageAmount > 0 ? Math.round(overageAmount / OVERAGE_RATE) : 0;

    const formatDate = (d: Date) =>
      new Date(d).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    const formatCurrency = (n: number) => `$${n.toFixed(2)}`;

    const doc = new PDFDocument({ margin: 50 });

    // ── Header ──────────────────────────────────────────────────
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('SaaS Billing Engine', 50, 50)
      .fontSize(20)
      .text('INVOICE', { align: 'right' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text(`Invoice #: INV-${String(invoice.id).padStart(4, '0')}`, {
        align: 'right',
      })
      .text(`Date: ${formatDate(invoice.created_at)}`, { align: 'right' });

    // ── Divider ──────────────────────────────────────────────────
    doc.moveDown(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    // ── Billed To ────────────────────────────────────────────────
    doc
      .moveDown(0.8)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('BILLED TO')
      .font('Helvetica')
      .fontSize(10)
      .text(`Tenant: ${tenant.name}`)
      .text(`Plan:   ${plan.name}`);

    // ── Line Items ───────────────────────────────────────────────
    doc.moveDown(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    const tableTop = doc.y + 10;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('DESCRIPTION', 50, tableTop)
      .text('AMOUNT', 460, tableTop);

    doc
      .moveDown(0.5)
      .font('Helvetica')
      .text('Base Subscription', 50, doc.y)
      .text(formatCurrency(basePrice), 460, doc.y - doc.currentLineHeight());

    if (overageUnits > 0) {
      doc
        .moveDown(0.3)
        .text(
          `Overage (${overageUnits} units × ${formatCurrency(OVERAGE_RATE)}/unit)`,
          50,
          doc.y,
        )
        .text(
          formatCurrency(overageAmount),
          460,
          doc.y - doc.currentLineHeight(),
        );
    }

    // ── Total ────────────────────────────────────────────────────
    doc.moveDown(0.8).moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    doc
      .moveDown(0.5)
      .font('Helvetica-Bold')
      .text('TOTAL', 50, doc.y)
      .text(formatCurrency(amount), 460, doc.y - doc.currentLineHeight());

    // ── Footer ───────────────────────────────────────────────────
    doc.moveDown(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    doc
      .moveDown(0.5)
      .font('Helvetica')
      .fontSize(9)
      .text(
        `Billing Period: ${formatDate(invoice.billing_period_start)} – ${formatDate(invoice.billing_period_end)}`,
      )
      .text(`Status: ${status}`);

    doc.end();

    // Collect stream chunks using async iteration (no Promise constructor)
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of doc) {
        chunks.push(Buffer.from(chunk as Buffer));
      }
      return Buffer.concat(chunks);
    } catch (err) {
      throw new Error(`PDF generation failed: ${(err as Error).message}`);
    }
  }
}
