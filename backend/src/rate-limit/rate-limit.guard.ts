import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly WINDOW_SECONDS = 60;
  private readonly FALLBACK_LIMIT = 60;
  private readonly CONFIG_TTL = 300; // cache plan rate limit for 5 min

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = (request.headers['x-tenant-id'] as string) || 'default';

    const limit = await this.getPlanRateLimit(tenantId);

    const key = `rate-limit:tenant:${tenantId}`;
    const currentCount = await this.redis.incr(key);

    if (currentCount === 1) {
      await this.redis.expire(key, this.WINDOW_SECONDS);
    }

    if (currentCount > limit) {
      throw new HttpException(
        `Rate limit exceeded. Your plan allows ${limit} requests per minute.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async getPlanRateLimit(tenantId: string): Promise<number> {
    const numericTenantId = parseInt(tenantId, 10);
    if (isNaN(numericTenantId)) {
      return this.FALLBACK_LIMIT;
    }

    const configKey = `rl-config:${tenantId}`;

    const cached = await this.redis.get(configKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenant_id: numericTenantId,
        status: 'ACTIVE',
        is_deleted: 0,
      },
      include: { plan: true },
    });

    const limit = subscription?.plan?.rate_limit_per_minute ?? this.FALLBACK_LIMIT;

    await this.redis.set(configKey, limit, this.CONFIG_TTL);

    return limit;
  }
}
