import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const request = context.switchToHttp().getRequest<Request>();
        const tenantId = parseInt(request.headers['x-tenant-id'] as string, 10);

        if (!isNaN(tenantId)) {
          this.subscriptionService
            .recordUsageForTenant(tenantId, 1)
            .catch(() => {
              // silently ignore — usage tracking must not break the response
            });
        }
      }),
    );
  }
}
