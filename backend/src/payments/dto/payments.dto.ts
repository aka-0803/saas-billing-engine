import { ApiProperty } from '@nestjs/swagger';

export class SimulatePaymentDto {
  @ApiProperty({ example: 1, description: 'ID of the invoice to mark as paid' })
  invoice_id!: number;

  @ApiProperty({
    example: 42,
    required: false,
    description: 'User ID for audit logging (optional, will be required later)',
  })
  user_id?: number;
}