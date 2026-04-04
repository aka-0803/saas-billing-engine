import { ApiProperty } from '@nestjs/swagger';

export class SimulatePaymentDto {
  @ApiProperty({ example: 1, description: 'ID of the invoice to mark as paid' })
  invoice_id: number;
}
