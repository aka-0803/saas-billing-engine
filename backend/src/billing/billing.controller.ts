import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('run')
  @ApiOperation({ summary: 'Manually trigger monthly billing for all active subscriptions' })
  runManualBilling() {
    return this.billingService.runMonthlyBilling();
  }
}
