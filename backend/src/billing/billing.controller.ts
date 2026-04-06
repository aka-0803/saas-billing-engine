import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('generate-invoice/:subscriptionId')
  @ApiOperation({ summary: 'Generate an invoice for a subscription' })
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
  @ApiOperation({ summary: 'Download an invoice as a PDF file' })
  @ApiParam({ name: 'id', description: 'Invoice ID', example: 1 })
  async downloadInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const buffer = await this.billingService.downloadInvoice(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
