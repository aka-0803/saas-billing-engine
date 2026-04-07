import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async markInvoicePaid(invoiceId: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    // Idempotency: return as-is if already paid
    if (invoice.status === 'PAID') {
      return invoice;
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PAID', modified_time: new Date() },
    });
  }
}
