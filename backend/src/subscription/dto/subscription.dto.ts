import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 1, description: 'ID of the tenant' })
  @IsInt()
  @IsPositive()
  tenant_id!: number;

  @ApiProperty({ example: 1, description: 'ID of the plan to subscribe to' })
  @IsInt()
  @IsPositive()
  plan_id!: number;

  @ApiProperty({
    example: 42,
    required: false,
    description: 'User ID for audit logging (optional, will be required later)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  user_id?: number;
}

export class IncrementUsageDto {
  @ApiProperty({ example: 1, description: 'ID of the subscription' })
  @IsInt()
  @IsPositive()
  subscription_id!: number;

  @ApiProperty({ example: 100, description: 'Amount of usage units to add' })
  @IsInt()
  @IsPositive()
  amount!: number;

  @ApiProperty({
    example: 42,
    required: false,
    description: 'User ID for audit logging (optional, will be required later)',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  user_id?: number;
}
