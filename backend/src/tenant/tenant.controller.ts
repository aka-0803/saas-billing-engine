import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantService.create(dto.name);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active tenants' })
  async findAll() {
    return this.tenantService.findAll();
  }

  @Post(':id')
  @ApiOperation({ summary: 'Soft delete a tenant' })
  @ApiParam({ name: 'id', description: 'Tenant ID', example: 1 })
  async softDelete(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id));
  }
}
