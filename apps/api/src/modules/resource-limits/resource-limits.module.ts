import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourceLimit, TeamQuota, Environment, Team, Project } from '@vesta/db';
import { ResourceLimitsService } from './resource-limits.service';
import { ResourceLimitsController } from './resource-limits.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceLimit, TeamQuota, Environment, Team, Project]),
  ],
  providers: [ResourceLimitsService],
  controllers: [ResourceLimitsController],
  exports: [ResourceLimitsService],
})
export class ResourceLimitsModule {}
