import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { SimulatePaymentDto } from './dto/payments.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('webhook')
  @ApiOperation({
    summary: 'Simulate a payment webhook to mark an invoice as paid',
  })
  simulatePayment(@Body() dto: SimulatePaymentDto) {
    return this.paymentsService.markInvoicePaid(dto.invoice_id);
  }
}
