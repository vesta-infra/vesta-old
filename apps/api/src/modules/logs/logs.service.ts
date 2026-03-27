import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { LogEntry, LogRetentionPolicy, Environment } from '@vesta/db';
import { SearchLogsDto } from './dto/search-logs.dto';
import { SetRetentionDto } from './dto/set-retention.dto';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogEntry)
    private readonly logRepo: Repository<LogEntry>,
    @InjectRepository(LogRetentionPolicy)
    private readonly retentionRepo: Repository<LogRetentionPolicy>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
  ) {}

  async ingest(
    environmentId: string,
    entries: Partial<LogEntry>[],
  ): Promise<void> {
    const logs = entries.map((entry) =>
      this.logRepo.create({
        environment_id: environmentId,
        container_id: entry.container_id ?? '',
        stream: entry.stream ?? 'stdout',
        message: entry.message ?? '',
        level: entry.level ?? 'info',
        structured_fields: entry.structured_fields ?? null,
        timestamp: entry.timestamp ?? new Date(),
      }),
    );
    await this.logRepo.save(logs);
  }

  async search(
    environmentId: string,
    query: SearchLogsDto,
  ): Promise<{ data: LogEntry[]; total: number }> {
    const qb = this.logRepo
      .createQueryBuilder('log')
      .where('log.environment_id = :environmentId', { environmentId });

    if (query.q) {
      qb.andWhere('log.message ILIKE :q', { q: `%${query.q}%` });
    }
    if (query.from) {
      qb.andWhere('log.timestamp >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('log.timestamp <= :to', { to: query.to });
    }
    if (query.level) {
      qb.andWhere('log.level = :level', { level: query.level });
    }
    if (query.stream) {
      qb.andWhere('log.stream = :stream', { stream: query.stream });
    }

    qb.orderBy('log.timestamp', 'DESC');

    const limit = query.limit ?? 100;
    const offset = query.offset ?? 0;

    const [data, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async export(
    environmentId: string,
    query: SearchLogsDto,
  ): Promise<LogEntry[]> {
    const result = await this.search(environmentId, {
      ...query,
      limit: 10000,
      offset: 0,
    });
    return result.data;
  }

  async getRetentionPolicy(
    environmentId: string,
  ): Promise<LogRetentionPolicy | null> {
    return this.retentionRepo.findOne({
      where: { environment_id: environmentId },
    });
  }

  async setRetentionPolicy(
    environmentId: string,
    dto: SetRetentionDto,
  ): Promise<LogRetentionPolicy> {
    const env = await this.envRepo.findOne({ where: { id: environmentId } });
    if (!env) {
      throw new NotFoundException('Environment not found');
    }

    let policy = await this.retentionRepo.findOne({
      where: { environment_id: environmentId },
    });

    if (policy) {
      policy.retention_days = dto.retention_days;
      policy.storage_backend = dto.storage_backend ?? 'local';
    } else {
      policy = this.retentionRepo.create({
        environment_id: environmentId,
        retention_days: dto.retention_days,
        storage_backend: dto.storage_backend ?? 'local',
      });
    }

    return this.retentionRepo.save(policy);
  }

  async cleanup(): Promise<{ deleted: number }> {
    const policies = await this.retentionRepo.find();
    let totalDeleted = 0;

    for (const policy of policies) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - policy.retention_days);

      const result = await this.logRepo.delete({
        environment_id: policy.environment_id,
        timestamp: LessThan(cutoff),
      });

      totalDeleted += result.affected ?? 0;
    }

    return { deleted: totalDeleted };
  }
}
