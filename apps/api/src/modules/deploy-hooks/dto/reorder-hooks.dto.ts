import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderHooksDto {
  @ApiProperty({
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    description: 'Ordered list of hook IDs',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  ordered_ids!: string[];
}
