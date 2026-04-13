import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/plan.dto';

@ApiTags('Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
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
