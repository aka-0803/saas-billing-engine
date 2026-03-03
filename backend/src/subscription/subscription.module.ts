import { Module } from "@nestjs/common";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
    imports: [PrismaModule],
    controllers: [SubscriptionController],
    providers: [SubscriptionService],
})
export class SubscriptionModule { }