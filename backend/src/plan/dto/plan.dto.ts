import { ApiProperty } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro', description: 'Name of the plan' })
  name: string;

  @ApiProperty({ example: 49.99, description: 'Monthly price of the plan' })
  price: number;

  @ApiProperty({ example: 10000, description: 'Maximum usage units allowed per month' })
  usage_limit: number;
}
