import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackupSchedule } from '@vesta/db';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class BackupSchedulesService {
  constructor(
    @InjectRepository(BackupSchedule)
    private readonly scheduleRepo: Repository<BackupSchedule>,
  ) {}

  async create(dto: CreateScheduleDto): Promise<BackupSchedule> {
    const schedule = this.scheduleRepo.create({
      resource_type: dto.resource_type,
      resource_id: dto.resource_id,
      cron_expression: dto.cron_expression,
      retention_count: dto.retention_count ?? null,
      retention_days: dto.retention_days ?? null,
      storage_destination_id: dto.storage_destination_id,
      enabled: dto.enabled ?? true,
    });
    return this.scheduleRepo.save(schedule);
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<BackupSchedule[]> {
    return this.scheduleRepo.find({
      where: { resource_type: resourceType, resource_id: resourceId },
    });
  }

  async findById(id: string): Promise<BackupSchedule> {
    const schedule = await this.scheduleRepo.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('Backup schedule not found');
    }
    return schedule;
  }

  async update(id: string, dto: UpdateScheduleDto): Promise<BackupSchedule> {
    const schedule = await this.findById(id);
    Object.assign(schedule, dto);
    return this.scheduleRepo.save(schedule);
  }

  async delete(id: string): Promise<void> {
    const result = await this.scheduleRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Backup schedule not found');
    }
  }
}
