import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Backup } from '@vesta/db';
import { EventsService } from '../../events/events.service';
import { EventTypes } from '../../events/event-types';
import { CreateBackupDto } from './dto/create-backup.dto';

@Injectable()
export class BackupsService {
  constructor(
    @InjectRepository(Backup)
    private readonly backupRepo: Repository<Backup>,
    @InjectQueue('backups')
    private readonly backupQueue: Queue,
    private readonly eventsService: EventsService,
  ) {}

  async triggerBackup(teamId: string, dto: CreateBackupDto): Promise<Backup> {
    const backup = this.backupRepo.create({
      team_id: teamId,
      resource_type: dto.resource_type,
      resource_id: dto.resource_id,
      storage_destination_id: dto.storage_destination_id,
      status: 'scheduled',
    });
    const saved = await this.backupRepo.save(backup);

    await this.backupQueue.add('run-backup', {
      backupId: saved.id,
      resourceType: dto.resource_type,
      resourceId: dto.resource_id,
      storageDestinationId: dto.storage_destination_id,
    });

    this.eventsService.emitBackupEvent(EventTypes.BACKUP_STARTED, {
      backupId: saved.id,
    });

    return saved;
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<Backup[]> {
    return this.backupRepo.find({
      where: { resource_type: resourceType, resource_id: resourceId },
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string): Promise<Backup> {
    const backup = await this.backupRepo.findOne({ where: { id } });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }
    return backup;
  }

  async delete(id: string): Promise<void> {
    const result = await this.backupRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Backup not found');
    }
  }

  async updateStatus(
    id: string,
    status: Backup['status'],
    sizeBytes?: string,
  ): Promise<Backup> {
    const backup = await this.findById(id);
    backup.status = status;

    if (sizeBytes) {
      backup.size_bytes = sizeBytes;
    }

    if (status === 'running') {
      backup.started_at = new Date();
    }
    if (status === 'completed' || status === 'failed') {
      backup.finished_at = new Date();
    }

    const saved = await this.backupRepo.save(backup);

    const eventType =
      status === 'completed'
        ? EventTypes.BACKUP_COMPLETED
        : status === 'failed'
          ? EventTypes.BACKUP_FAILED
          : null;

    if (eventType) {
      this.eventsService.emitBackupEvent(eventType, { backupId: id });
    }

    return saved;
  }

  async restore(id: string, targetId?: string): Promise<{ jobId: string }> {
    const backup = await this.findById(id);

    const job = await this.backupQueue.add('restore-backup', {
      backupId: backup.id,
      targetId: targetId ?? backup.resource_id,
      resourceType: backup.resource_type,
      storageDestinationId: backup.storage_destination_id,
    });

    return { jobId: job.id! };
  }
}
