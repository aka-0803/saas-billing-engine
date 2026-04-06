import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { BillingService } from 'src/billing/billing.service';
import { ISubscription } from './interfaces/subscription.interface';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private billingService: BillingService,
  ) {}

  async create(tenant_id: number, plan_id: number) {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    const subscription = await this.prisma.subscription.create({
      data: {
        tenant_id,
        plan_id,
        start_date: start,
        end_date: end,
        status: 'ACTIVE',
      },
    });

    // Generate initial invoice for the subscription period
    await this.billingService.generateInvoice(subscription.id);

    return subscription;
  }

  async incrementUsage(subscription_id: number, amount: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscription_id },
      include: { plan: true },
    });

    if (!subscription) throw new NotFoundException('Subscription not found');

    const newUsage = subscription.current_usage + amount;

    const overage = Math.max(0, newUsage - subscription.plan.usage_limit);

    await this.prisma.subscription.update({
      where: { id: subscription_id },
      data: { current_usage: newUsage },
    });

    await this.prisma.usageRecord.create({
      data: {
        tenant_id: subscription.tenant_id,
        subscription_id: subscription_id,
        usage_count: amount,
      },
    });

    return {
      current_usage: newUsage,
      overage,
    };
  }

  async getSubscription(id: number): Promise<ISubscription | null> {
    const cacheKey = `sub:${id}`;

    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as ISubscription;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (subscription) {
      await this.redis.set(cacheKey, subscription, 300);
    }

    return subscription as ISubscription | null;
  }

  /**
   * Delegates renewal to BillingService:
   * invoices the completed period → rolls dates forward → resets usage.
   */
  async renewSubscription(id: number) {
    // Invalidate cache after renewal
    const result = await this.billingService.processRenewal(id);
    await this.redis.set(`sub:${id}`, result.subscription, 300);
    return result;
  }
}
