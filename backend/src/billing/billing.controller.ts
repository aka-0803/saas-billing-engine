import { Controller, Post } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('run')
  runManualBilling() {
    return this.billingService.runMonthlyBilling();
  }
}
