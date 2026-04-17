import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, price: number, usage_limit: number, rate_limit_per_minute: number) {
    return this.prisma.plan.create({
      data: {
        name,
        price,
        usage_limit,
        rate_limit_per_minute,
      },
    });
  }

  async findAll() {
    return this.prisma.plan.findMany({
      where: { is_deleted: 0 },
    });
  }
}