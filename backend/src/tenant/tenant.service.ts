import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string) {
    return this.prisma.tenant.create({
      data: {
        name,
      },
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: {
        is_deleted: 0,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.tenant.update({
      where: { id },
      data: {
        is_deleted: 1,
      },
    });
  }
}