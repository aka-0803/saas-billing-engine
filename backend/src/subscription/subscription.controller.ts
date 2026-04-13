import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionDto,
  IncrementUsageDto,
} from './dto/subscription.dto';
import { ISubscription } from './interfaces/subscription.interface';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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

  @Post('renew/:id')
  @ApiOperation({
    summary:
      'Renew a subscription: invoice the completed period, roll dates forward, reset usage',
  })
  @ApiParam({ name: 'id', description: 'Subscription ID', example: 1 })
  async renew(@Param('id', ParseIntPipe) id: number) {
    return this.subscriptionService.renewSubscription(id);
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
