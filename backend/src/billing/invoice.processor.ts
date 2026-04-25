import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/storage/s3.service';
import { BillingService } from './billing.service';
import { INVOICE_QUEUE } from './billing.constants';

interface GeneratePdfJobData {
  invoiceId: number;
}

@Processor(INVOICE_QUEUE)
export class InvoiceProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoiceProcessor.name);

  constructor(
    private readonly billing: BillingService,
    private readonly s3: S3Service,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<GeneratePdfJobData>) {
    const { invoiceId } = job.data;
    this.logger.log(
      `Processing PDF job for invoice #${invoiceId} (attempt ${job.attemptsMade + 1})`,
    );

    // 1. Generate PDF buffer using the billing service
    const pdfBuffer = await this.billing.buildPdfBuffer(invoiceId);

    // 2. Upload to S3 — key is deterministic so re-uploads on retry are safe
    const key = `invoices/invoice-${invoiceId}.pdf`;
    await this.s3.upload(key, pdfBuffer, 'application/pdf');

    // 3. Persist the S3 key on the invoice row
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdf_url: key },
    });

    this.logger.log(`Invoice #${invoiceId} PDF uploaded → ${key}`);
  }
}
