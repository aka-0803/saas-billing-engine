import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { InvoiceProcessor } from './invoice.processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/redis/redis.module';
import { StorageModule } from 'src/storage/storage.module';
import { INVOICE_QUEUE } from './billing.constants';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    StorageModule,
    BullModule.registerQueue({ name: INVOICE_QUEUE }),
  ],
  providers: [BillingService, InvoiceProcessor],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}