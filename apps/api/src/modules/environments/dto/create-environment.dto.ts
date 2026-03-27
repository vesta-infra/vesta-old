import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnvironmentDto {
  @ApiProperty({ example: 'production' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  auto_deploy?: boolean;

  @ApiPropertyOptional({ example: '.example.com' })
  @IsString()
  @IsOptional()
  domain_suffix?: string;
}
