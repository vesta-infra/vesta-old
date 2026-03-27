import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CronJob, CronJobExecution, Environment } from '@vesta/db';
import { EventsModule } from '../../events/events.module';
import { CronJobsService } from './cron-jobs.service';
import { CronJobsController } from './cron-jobs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CronJob, CronJobExecution, Environment]),
    BullModule.registerQueue({ name: 'cron-jobs' }),
    EventsModule,
  ],
  providers: [CronJobsService],
  controllers: [CronJobsController],
  exports: [CronJobsService],
})
export class CronJobsModule {}
