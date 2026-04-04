import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { PlanModule } from './plan/plan.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingModule } from './billing/billing.module';
import { PaymentsModule } from './payments/payments.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    PrismaModule,
    TenantModule,
    PlanModule,
    ScheduleModule.forRoot(),
    BillingModule,
    PaymentsModule,
    SubscriptionModule,
  ],
})
export class AppModule {}
