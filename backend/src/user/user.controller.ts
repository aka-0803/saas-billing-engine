import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, GetUserDto } from './dto/user.dto';

@ApiTags('Users')
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
