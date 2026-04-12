import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class SimulatePaymentDto {
  @ApiProperty({ example: 1, description: 'ID of the invoice to mark as paid' })
  @IsInt()
  @IsPositive()
  invoice_id!: number;

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
