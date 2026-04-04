import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { SimulatePaymentDto } from './dto/payments.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Simulate a payment webhook to mark an invoice as paid' })
  simulatePayment(@Body() dto: SimulatePaymentDto) {
    return this.paymentsService.markInvoicePaid(dto.invoice_id);
  }
}
