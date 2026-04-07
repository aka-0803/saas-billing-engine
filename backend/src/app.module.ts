import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { PlanModule } from './plan/plan.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingModule } from './billing/billing.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    PrismaModule,
    RateLimitModule,
    TenantModule,
    PlanModule,
    ScheduleModule.forRoot(),
    BillingModule,
    PaymentsModule,
    SubscriptionModule,
    UserModule,
  ],
})
export class AppModule {}
