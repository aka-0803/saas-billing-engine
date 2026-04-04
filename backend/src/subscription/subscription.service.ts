import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { ISubscription } from './interfaces/subscription.interface';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async create(tenant_id: number, plan_id: number) {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 1);

    return this.prisma.subscription.create({
      data: {
        tenant_id,
        plan_id,
        start_date: start,
        end_date: end,
        status: 'ACTIVE',
      },
    });
  }

  async incrementUsage(subscription_id: number, amount: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscription_id },
      include: { plan: true },
    });

    if (!subscription) throw new Error('Subscription not found');

    const newUsage = subscription.current_usage + amount;

    let overage = 0;
    if (newUsage > subscription.plan.usage_limit) {
      overage = newUsage - subscription.plan.usage_limit;
    }

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

    await this.redis.set(cacheKey, subscription, 300);

    return subscription as ISubscription | null;
  }
}
