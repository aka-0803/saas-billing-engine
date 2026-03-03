import { Controller } from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { Body, Post } from "@nestjs/common";

@Controller('subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) { }

    @Post('create')
    async create(@Body() body: { tenant_id: number, plan_id: number }) {
        return this.subscriptionService.create(body.tenant_id, body.plan_id);
    }

    @Post('increment-usage')
    async incrementUsage(@Body() body: { subscription_id: number, amount: number }) {
        return this.subscriptionService.incrementUsage(body.subscription_id, body.amount);
    }
}