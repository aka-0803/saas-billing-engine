import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro', description: 'Name of the plan' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 49.99, description: 'Monthly price of the plan' })
  @IsNumber()
  @IsPositive()
  price!: number;

  @ApiProperty({ example: 10000, description: 'Maximum usage units allowed per month' })
  @IsInt()
  @IsPositive()
  usage_limit!: number;
}
