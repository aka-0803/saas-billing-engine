import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'alice@example.com' })
  email!: string;

  @ApiProperty({ example: 'secret123' })
  password!: string;

  @ApiProperty({ example: 'admin' })
  role?: string;

  @ApiProperty({ example: 1 })
  tenant_id!: number;
}

export class GetUserDto {
  @ApiProperty({ example: 1 })
  tenant_id!: number;

  @ApiProperty({ example: 0, description: '0 = active, 1 = deleted' })
  status?: number;

  @ApiProperty({
    example: 1,
    description: 'Omit to fetch all users for the tenant',
  })
  user_id?: number;
}

export class UpdateUserDto {
  @ApiProperty({ example: 1 })
  user_id!: number;

  @ApiProperty({ example: 'newemail@example.com' })
  email?: string;

  @ApiProperty({ example: 'editor' })
  role?: string;

  @ApiProperty({ example: 1, description: '1 = soft delete, 0 = restore' })
  is_deleted?: number;
}
