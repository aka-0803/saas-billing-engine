import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  @Cron('0 0 1 * *') // every month 1st
  async runMonthlyBilling() {
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    for (const sub of subs) {
      let amount = sub.plan.price;

      if (sub.current_usage > sub.plan.usage_limit) {
        const overage = sub.current_usage - sub.plan.usage_limit;
        amount += overage * 2;
      }

      await this.prisma.invoice.create({
        data: {
          tenant_id: sub.tenant_id,
          subscription_id: sub.id,
          amount,
          billing_period_start: sub.start_date,
          billing_period_end: sub.end_date,
          status: 'PENDING',
        },
      });
    }
  }
}
