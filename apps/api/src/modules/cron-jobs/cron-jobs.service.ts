import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CronJob, CronJobExecution, Environment } from '@vesta/db';
import { EventsService } from '../../events/events.service';
import { EventTypes } from '../../events/event-types';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { UpdateCronJobDto } from './dto/update-cron-job.dto';

@Injectable()
export class CronJobsService {
  constructor(
    @InjectRepository(CronJob)
    private readonly cronJobRepo: Repository<CronJob>,
    @InjectRepository(CronJobExecution)
    private readonly executionRepo: Repository<CronJobExecution>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    @InjectQueue('cron-jobs')
    private readonly cronQueue: Queue,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    environmentId: string,
    dto: CreateCronJobDto,
  ): Promise<CronJob> {
    const env = await this.envRepo.findOne({ where: { id: environmentId } });
    if (!env) {
      throw new NotFoundException('Environment not found');
    }

    const cronJob = this.cronJobRepo.create({
      environment_id: environmentId,
      name: dto.name,
      command: dto.command,
      schedule: dto.schedule,
      timeout_seconds: dto.timeout_seconds ?? 300,
      concurrency_policy: dto.concurrency_policy ?? 'forbid',
      enabled: dto.enabled ?? true,
    });
    return this.cronJobRepo.save(cronJob);
  }

  async findByEnvironment(environmentId: string): Promise<CronJob[]> {
    return this.cronJobRepo.find({
      where: { environment_id: environmentId },
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string): Promise<CronJob> {
    const cronJob = await this.cronJobRepo.findOne({ where: { id } });
    if (!cronJob) {
      throw new NotFoundException('Cron job not found');
    }
    return cronJob;
  }

  async update(id: string, dto: UpdateCronJobDto): Promise<CronJob> {
    const cronJob = await this.findById(id);
    Object.assign(cronJob, dto);
    return this.cronJobRepo.save(cronJob);
  }

  async delete(id: string): Promise<void> {
    const result = await this.cronJobRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Cron job not found');
    }
  }

  async trigger(id: string): Promise<CronJobExecution> {
    const cronJob = await this.findById(id);

    const execution = this.executionRepo.create({
      cron_job_id: cronJob.id,
      status: 'running',
      started_at: new Date(),
    });
    const saved = await this.executionRepo.save(execution);

    await this.cronQueue.add('execute-cron', {
      executionId: saved.id,
      cronJobId: cronJob.id,
      command: cronJob.command,
      timeoutSeconds: cronJob.timeout_seconds,
      environmentId: cronJob.environment_id,
    });

    return saved;
  }

  async getExecutions(
    cronJobId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: CronJobExecution[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const [data, total] = await this.executionRepo.findAndCount({
      where: { cron_job_id: cronJobId },
      order: { started_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getExecutionById(executionId: string): Promise<CronJobExecution> {
    const execution = await this.executionRepo.findOne({
      where: { id: executionId },
    });
    if (!execution) {
      throw new NotFoundException('Cron job execution not found');
    }
    return execution;
  }

  async recordExecution(
    cronJobId: string,
    data: {
      status: CronJobExecution['status'];
      exit_code?: number;
      logs?: string;
      duration_ms?: number;
    },
  ): Promise<CronJobExecution> {
    const execution = this.executionRepo.create({
      cron_job_id: cronJobId,
      status: data.status,
      exit_code: data.exit_code ?? null,
      logs: data.logs ?? null,
      duration_ms: data.duration_ms ?? null,
      started_at: new Date(),
      finished_at: new Date(),
    });
    const saved = await this.executionRepo.save(execution);

    const eventType =
      data.status === 'succeeded'
        ? EventTypes.CRONJOB_COMPLETED
        : data.status === 'failed' || data.status === 'timed_out'
          ? EventTypes.CRONJOB_FAILED
          : null;

    if (eventType) {
      this.eventsService.emitCronJobEvent(eventType, {
        cronJobId,
        executionId: saved.id,
      });
    }

    return saved;
  }
}
