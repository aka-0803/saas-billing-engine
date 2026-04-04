import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/plan.dto';

@ApiTags('Plans')
@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new plan' })
  async create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto.name, dto.price, dto.usage_limit);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active plans' })
  async findAll() {
    return this.planService.findAll();
  }
}