import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import 'dotenv/config';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello() {
    return `server is running on ${process.env.PORT}`;
  }
}
