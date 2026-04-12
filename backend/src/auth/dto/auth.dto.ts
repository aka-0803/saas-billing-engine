import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'alice@example.com' })
  email!: string;

  @ApiProperty({ example: 'secret123' })
  password!: string;

  @ApiProperty({ example: 1 })
  tenant_id!: number;
}

export class LoginDto {
  @ApiProperty({ example: 'alice@example.com' })
  email!: string;

  @ApiProperty({ example: 'secret123' })
  password!: string;
}
