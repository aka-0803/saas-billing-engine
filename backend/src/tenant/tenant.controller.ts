import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  async create(@Body('name') name: string) {
    return this.tenantService.create(name);
  }

  @Get()
  async findAll() {
    return this.tenantService.findAll();
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id));
  }
}