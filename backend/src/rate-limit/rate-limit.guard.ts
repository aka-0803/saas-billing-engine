import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly LIMIT = 100;
  private readonly WINDOW_SECONDS = 60;

  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = (request.headers['x-tenant-id'] as string) || 'default';

    const key = `rate-limit:tenant:${tenantId}`;

    const currentCount = await this.redis.incr(key);
    if (currentCount === 1) {
      await this.redis.expire(key, this.WINDOW_SECONDS);
    }
    if (currentCount > this.LIMIT) {
      throw new HttpException(
        'Rate limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
