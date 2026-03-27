import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScaleDto {
  @ApiProperty({ example: 3, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  replicas!: number;
}
