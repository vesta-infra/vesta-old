import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog } from '@vesta/db';
import { ActivityQueryDto } from './dto/activity-query.dto';

interface LogData {
  teamId: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(data: LogData): Promise<AuditLog> {
    const entry = this.auditLogRepo.create({
      team_id: data.teamId,
      actor_id: data.actorId ?? null,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      metadata: data.metadata ?? null,
      ip_address: data.ipAddress ?? null,
    });
    return this.auditLogRepo.save(entry);
  }

  async getTeamActivity(
    teamId: string,
    filters?: ActivityQueryDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.team_id = :teamId', { teamId });

    this.applyFilters(qb, filters);

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [data, total] = await qb
      .orderBy('log.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getProjectActivity(
    projectId: string,
    filters?: ActivityQueryDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.resource_type = :type AND log.resource_id = :id', {
        type: 'project',
        id: projectId,
      });

    this.applyFilters(qb, filters);

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [data, total] = await qb
      .orderBy('log.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getEnvironmentActivity(
    environmentId: string,
    filters?: ActivityQueryDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.resource_type = :type AND log.resource_id = :id', {
        type: 'environment',
        id: environmentId,
      });

    this.applyFilters(qb, filters);

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [data, total] = await qb
      .orderBy('log.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getServerActivity(
    serverId: string,
    filters?: ActivityQueryDto,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.resource_type = :type AND log.resource_id = :id', {
        type: 'server',
        id: serverId,
      });

    this.applyFilters(qb, filters);

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [data, total] = await qb
      .orderBy('log.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async search(
    teamId: string,
    query: string,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.team_id = :teamId', { teamId })
      .andWhere(
        '(log.action ILIKE :query OR log.resource_type ILIKE :query OR log.resource_id ILIKE :query)',
        { query: `%${query}%` },
      )
      .orderBy('log.created_at', 'DESC')
      .take(50);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  private applyFilters(
    qb: SelectQueryBuilder<AuditLog>,
    filters?: ActivityQueryDto,
  ): void {
    if (!filters) return;

    if (filters.type) {
      qb.andWhere('log.action = :action', { action: filters.type });
    }
    if (filters.actorId) {
      qb.andWhere('log.actor_id = :actorId', { actorId: filters.actorId });
    }
    if (filters.from) {
      qb.andWhere('log.created_at >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('log.created_at <= :to', { to: new Date(filters.to) });
    }
  }
}
