import { IsString, IsFQDN, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDomainDto {
  @ApiProperty({ example: 'app.example.com' })
  @IsString()
  @IsFQDN()
  fqdn!: string;

  @ApiPropertyOptional({ example: 'uuid-of-environment' })
  @IsUUID()
  @IsOptional()
  environment_id?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  redirect_www?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  force_https?: boolean;
}
