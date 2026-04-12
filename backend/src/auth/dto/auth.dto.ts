import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsPositive, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  tenant_id!: number;
}

export class LoginDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  password!: string;
}
