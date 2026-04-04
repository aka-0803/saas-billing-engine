import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionDto,
  IncrementUsageDto,
} from './dto/subscription.dto';
import { ISubscription } from './interfaces/subscription.interface';

@ApiTags('Subscriptions')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new subscription for a tenant' })
  async create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.create(dto.tenant_id, dto.plan_id);
  }

  @Post('increment-usage')
  @ApiOperation({ summary: 'Increment usage for a subscription' })
  async incrementUsage(@Body() dto: IncrementUsageDto) {
    return this.subscriptionService.incrementUsage(
      dto.subscription_id,
      dto.amount,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a subscription by ID' })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: 1 })
  async getSubscription(
    @Param('id') id: string,
  ): Promise<ISubscription | null> {
    return this.subscriptionService.getSubscription(Number(id));
  }
}
