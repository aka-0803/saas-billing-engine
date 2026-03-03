import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TenantModule } from './tenant/tenant.module';
import { PlanModule } from './plan/plan.module';

@Module({
  imports: [PrismaModule,TenantModule,PlanModule],
})
export class AppModule {}