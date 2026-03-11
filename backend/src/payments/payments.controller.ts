import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('webhook')
  simulatePayment(@Body('invoice_id') invoiceId: number) {
    return this.paymentsService.markInvoicePaid(invoiceId);
  }
}
