import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { S3Service } from '../storage/s3.service';
import { INVOICE_QUEUE } from './billing.constants';
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
    private s3: S3Service,
    @InjectQueue(INVOICE_QUEUE) private invoiceQueue: Queue,
  ) {}

  /**
   * Creates a PENDING invoice row, then enqueues a background job to
   * generate the PDF and upload it to S3. Returns immediately — the
   * caller does not wait for the PDF to be ready.
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

    const invoice = await this.prisma.invoice.create({
      data: {
        tenant_id: sub.tenant_id,
        subscription_id: sub.id,
        amount,
        billing_period_start: sub.start_date,
        billing_period_end: sub.end_date,
        status: InvoiceStatus.PENDING,
      },
    });

    // Enqueue PDF generation — non-blocking, retried on failure
    await this.invoiceQueue.add(
      'generate-pdf',
      { invoiceId: invoice.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }, // 2s → 4s → 8s
        removeOnComplete: true,
        removeOnFail: false, // keep failed jobs visible for debugging
      },
    );

    return invoice;
  }

  async processRenewal(subscriptionId: number) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    const invoice = await this.generateInvoice(subscriptionId);

    const newStart = sub.end_date;
    const newEnd = new Date(sub.end_date);
    newEnd.setMonth(newEnd.getMonth() + 1);

    const subscription = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        start_date: newStart,
        end_date: newEnd,
        current_usage: 0,
        status: 'ACTIVE',
      },
    });

    await this.redis.del(`sub:${subscriptionId}`);

    return { invoice, subscription };
  }

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
   * Returns a 15-minute pre-signed S3 URL for the invoice PDF.
   * Throws 400 if the background worker hasn't uploaded the PDF yet.
   */
  async getInvoiceDownloadUrl(
    invoiceId: number,
  ): Promise<{ download_url: string }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (!invoice.pdf_url) {
      throw new BadRequestException(
        'PDF not ready yet — generation is in progress, try again in a few seconds',
      );
    }

    const download_url = await this.s3.getPresignedUrl(invoice.pdf_url);
    return { download_url };
  }

  /**
   * Used internally by InvoiceProcessor to generate the raw PDF buffer.
   * Kept separate from the download endpoint so the worker can reuse it.
   */
  async buildPdfBuffer(invoiceId: number): Promise<Buffer> {
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

    doc.moveDown(1).moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    doc
      .moveDown(0.8)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('BILLED TO')
      .font('Helvetica')
      .fontSize(10)
      .text(`Tenant: ${tenant.name}`)
      .text(`Plan:   ${plan.name}`);

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

    doc.moveDown(0.8).moveTo(50, doc.y).lineTo(560, doc.y).stroke();

    doc
      .moveDown(0.5)
      .font('Helvetica-Bold')
      .text('TOTAL', 50, doc.y)
      .text(formatCurrency(amount), 460, doc.y - doc.currentLineHeight());

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

    const chunks: Buffer[] = [];
    for await (const chunk of doc) {
      chunks.push(Buffer.from(chunk as Buffer));
    }
    return Buffer.concat(chunks);
  }
}
