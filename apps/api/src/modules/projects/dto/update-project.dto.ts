import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BuildMethod } from '@vesta/shared';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'renamed-app' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/repo.git' })
  @IsString()
  @IsOptional()
  git_url?: string;

  @ApiPropertyOptional({ enum: BuildMethod })
  @IsEnum(BuildMethod)
  @IsOptional()
  build_method?: BuildMethod;
}
