import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResourceLimit, TeamQuota, Environment, Project } from '@vesta/db';
import { SetResourceLimitsDto } from './dto/set-resource-limits.dto';
import { SetTeamQuotaDto } from './dto/set-team-quota.dto';

@Injectable()
export class ResourceLimitsService {
  constructor(
    @InjectRepository(ResourceLimit)
    private readonly limitRepo: Repository<ResourceLimit>,
    @InjectRepository(TeamQuota)
    private readonly quotaRepo: Repository<TeamQuota>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async getForEnvironment(environmentId: string): Promise<ResourceLimit | null> {
    return this.limitRepo.findOne({
      where: { environment_id: environmentId },
    });
  }

  async setForEnvironment(
    environmentId: string,
    dto: SetResourceLimitsDto,
  ): Promise<ResourceLimit> {
    let limit = await this.limitRepo.findOne({
      where: { environment_id: environmentId },
    });

    if (limit) {
      if (dto.cpu_limit !== undefined) limit.cpu_limit = dto.cpu_limit;
      if (dto.memory_limit_mb !== undefined) limit.memory_limit_mb = dto.memory_limit_mb;
      return this.limitRepo.save(limit);
    }

    limit = this.limitRepo.create({
      environment_id: environmentId,
      cpu_limit: dto.cpu_limit ?? null,
      memory_limit_mb: dto.memory_limit_mb ?? null,
    });
    return this.limitRepo.save(limit);
  }

  async getTeamQuota(teamId: string): Promise<TeamQuota | null> {
    return this.quotaRepo.findOne({ where: { team_id: teamId } });
  }

  async setTeamQuota(
    teamId: string,
    dto: SetTeamQuotaDto,
  ): Promise<TeamQuota> {
    let quota = await this.quotaRepo.findOne({
      where: { team_id: teamId },
    });

    if (quota) {
      if (dto.max_cpu !== undefined) quota.max_cpu = dto.max_cpu;
      if (dto.max_memory_mb !== undefined) quota.max_memory_mb = dto.max_memory_mb;
      if (dto.max_containers !== undefined) quota.max_containers = dto.max_containers;
      if (dto.max_projects !== undefined) quota.max_projects = dto.max_projects;
      return this.quotaRepo.save(quota);
    }

    quota = this.quotaRepo.create({
      team_id: teamId,
      max_cpu: dto.max_cpu ?? null,
      max_memory_mb: dto.max_memory_mb ?? null,
      max_containers: dto.max_containers ?? null,
      max_projects: dto.max_projects ?? null,
    });
    return this.quotaRepo.save(quota);
  }

  async getTeamUsage(teamId: string): Promise<{
    total_cpu: number;
    total_memory_mb: number;
    total_environments: number;
    total_projects: number;
  }> {
    const result = await this.limitRepo
      .createQueryBuilder('rl')
      .innerJoin(Environment, 'e', 'e.id = rl.environment_id')
      .innerJoin(Project, 'p', 'p.id = e.project_id')
      .select('COALESCE(SUM(rl.cpu_limit), 0)', 'total_cpu')
      .addSelect('COALESCE(SUM(rl.memory_limit_mb), 0)', 'total_memory_mb')
      .addSelect('COUNT(DISTINCT e.id)', 'total_environments')
      .addSelect('COUNT(DISTINCT p.id)', 'total_projects')
      .where('p.team_id = :teamId', { teamId })
      .getRawOne();

    return {
      total_cpu: Number(result.total_cpu),
      total_memory_mb: Number(result.total_memory_mb),
      total_environments: Number(result.total_environments),
      total_projects: Number(result.total_projects),
    };
  }

  async checkQuota(
    teamId: string,
    additionalCpu: number,
    additionalMemory: number,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const quota = await this.getTeamQuota(teamId);
    if (!quota) {
      return { allowed: true };
    }

    const usage = await this.getTeamUsage(teamId);

    if (quota.max_cpu && usage.total_cpu + additionalCpu > quota.max_cpu) {
      return {
        allowed: false,
        reason: `CPU quota exceeded: ${usage.total_cpu + additionalCpu}m requested, ${quota.max_cpu}m allowed`,
      };
    }

    if (
      quota.max_memory_mb &&
      usage.total_memory_mb + additionalMemory > quota.max_memory_mb
    ) {
      return {
        allowed: false,
        reason: `Memory quota exceeded: ${usage.total_memory_mb + additionalMemory}MB requested, ${quota.max_memory_mb}MB allowed`,
      };
    }

    return { allowed: true };
  }
}
