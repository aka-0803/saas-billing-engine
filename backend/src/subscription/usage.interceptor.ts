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
        const user = request.user as
          | { userId: number; tenantId: number }
          | undefined;

        // Skip auth routes — no JWT user context on signup/login
        if (!user?.tenantId) return;

        this.subscriptionService
          .recordUsageForTenant(user.tenantId, 1)
          .catch(() => {
            // silently ignore — usage tracking must not break the response
          });
      }),
    );
  }
}
