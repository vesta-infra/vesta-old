import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Backup, BackupSchedule, StorageDestination } from '@vesta/db';
import { EventsModule } from '../../events/events.module';
import { BackupsService } from './backups.service';
import { BackupSchedulesService } from './backup-schedules.service';
import { StorageDestinationsService } from './storage-destinations.service';
import { BackupsController } from './backups.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Backup, BackupSchedule, StorageDestination]),
    BullModule.registerQueue({ name: 'backups' }),
    EventsModule,
  ],
  providers: [BackupsService, BackupSchedulesService, StorageDestinationsService],
  controllers: [BackupsController],
  exports: [BackupsService, BackupSchedulesService, StorageDestinationsService],
})
export class BackupsModule {}
