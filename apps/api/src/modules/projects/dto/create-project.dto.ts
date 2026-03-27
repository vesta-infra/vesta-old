import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BuildMethod } from '@vesta/shared';

export class CreateProjectDto {
  @ApiProperty({ example: 'my-web-app', minLength: 2 })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'A web application' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/repo.git' })
  @IsString()
  @IsOptional()
  git_url?: string;

  @ApiProperty({ enum: BuildMethod, example: BuildMethod.NIXPACKS })
  @IsEnum(BuildMethod)
  build_method!: BuildMethod;
}
