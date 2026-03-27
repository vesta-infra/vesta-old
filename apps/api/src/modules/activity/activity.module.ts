import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '@vesta/db';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ActivityListener } from './activity.listener';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [ActivityService, ActivityListener],
  controllers: [ActivityController],
  exports: [ActivityService],
})
export class ActivityModule {}
