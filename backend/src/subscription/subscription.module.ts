import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { UsageInterceptor } from './usage.interceptor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { BillingModule } from 'src/billing/billing.module';

@Module({
  imports: [PrismaModule, RedisModule, BillingModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, UsageInterceptor],
  exports: [SubscriptionService, UsageInterceptor],
})
export class SubscriptionModule {}
