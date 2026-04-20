import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';

const IDEMPOTENCY_TTL = 86400; // 24 hours

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async markInvoicePaid(invoiceId: number, idempotencyKey?: string) {
    if (idempotencyKey) {
      const cached = await this.redis.get(
        `idempotency:payment:${idempotencyKey}`,
      );
      if (cached) return JSON.parse(cached);
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const updated =
      invoice.status === 'PAID'
        ? invoice
        : await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: { status: 'PAID', modified_time: new Date() },
          });

    const event = {
      event: 'payment.succeeded',
      idempotency_key: idempotencyKey ?? null,
      timestamp: new Date().toISOString(),
      data: {
        invoice_id: updated.id,
        status: updated.status,
        amount: updated.amount,
      },
    };

    if (idempotencyKey) {
      await this.redis.set(
        `idempotency:payment:${idempotencyKey}`,
        event,
        IDEMPOTENCY_TTL,
      );
    }

    return event;
  }
}
