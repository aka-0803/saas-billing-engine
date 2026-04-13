import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, GetUserDto } from './dto/user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get users for a tenant; pass user_id to get one' })
  getUsers(@Body() body: GetUserDto) {
    return this.userService.getUsers(body);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user fields or soft-delete via is_deleted' })
  update(@Body() dto: UpdateUserDto) {
    return this.userService.update(dto);
  }
}
