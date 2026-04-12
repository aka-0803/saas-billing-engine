import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'admin' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  tenant_id!: number;
}

export class GetUserDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  tenant_id!: number;

  @ApiProperty({ example: 0, description: '0 = active, 1 = deleted' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  status?: number;

  @ApiProperty({
    example: 1,
    description: 'Omit to fetch all users for the tenant',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  user_id?: number;
}

export class UpdateUserDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  user_id!: number;

  @ApiProperty({ example: 'newemail@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'editor' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: 1, description: '1 = soft delete, 0 = restore' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  is_deleted?: number;
}
