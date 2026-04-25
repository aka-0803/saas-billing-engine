import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('generate-invoice/:subscriptionId')
  @ApiOperation({
    summary:
      'Generate an invoice for a subscription (PDF created in background)',
  })
  @ApiParam({
    name: 'subscriptionId',
    description: 'Subscription ID',
    example: 1,
  })
  generateInvoice(
    @Param('subscriptionId', ParseIntPipe) subscriptionId: number,
  ) {
    return this.billingService.generateInvoice(subscriptionId);
  }

  @Post('run')
  @ApiOperation({
    summary:
      'Manually trigger the billing cycle (processes all due subscriptions)',
  })
  runBillingCycle() {
    return this.billingService.runBillingCycle();
  }

  @Get('invoice/:id/download')
  @ApiOperation({
    summary:
      'Get a pre-signed S3 URL to download the invoice PDF (valid 15 minutes)',
  })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: 1 })
  getInvoiceDownloadUrl(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.getInvoiceDownloadUrl(id);
  }
}
