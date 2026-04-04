import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 1, description: 'ID of the tenant' })
  tenant_id: number;

  @ApiProperty({ example: 1, description: 'ID of the plan to subscribe to' })
  plan_id: number;
}

export class IncrementUsageDto {
  @ApiProperty({ example: 1, description: 'ID of the subscription' })
  subscription_id: number;

  @ApiProperty({ example: 100, description: 'Amount of usage units to add' })
  amount: number;
}
