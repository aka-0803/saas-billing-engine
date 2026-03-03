import { Controller, Get, Post, Body } from '@nestjs/common';
import { PlanService } from './plan.service';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  async create(
    @Body('name') name: string,
    @Body('price') price: number,
    @Body('usage_limit') usage_limit: number,
  ) {
    return this.planService.create(name, price, usage_limit);
  }

  @Get()
  async findAll() {
    return this.planService.findAll();
  }
}