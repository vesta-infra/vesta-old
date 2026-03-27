import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceLink, Project, ManagedDatabase } from '@vesta/db';
import { CreateServiceLinkDto } from './dto/create-service-link.dto';
import { UpdateServiceLinkDto } from './dto/update-service-link.dto';

export interface GraphNode {
  id: string;
  name: string;
  type: 'project' | 'database';
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

@Injectable()
export class ServiceLinksService {
  constructor(
    @InjectRepository(ServiceLink)
    private readonly linkRepo: Repository<ServiceLink>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ManagedDatabase)
    private readonly dbRepo: Repository<ManagedDatabase>,
  ) {}

  async create(
    projectId: string,
    dto: CreateServiceLinkDto,
  ): Promise<ServiceLink> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (dto.dependency_type === 'project') {
      const depProject = await this.projectRepo.findOne({
        where: { id: dto.dependency_id },
      });
      if (!depProject) {
        throw new NotFoundException('Dependency project not found');
      }
      await this.detectCircularDependency(projectId, dto.dependency_id);
    } else {
      const depDb = await this.dbRepo.findOne({
        where: { id: dto.dependency_id },
      });
      if (!depDb) {
        throw new NotFoundException('Dependency database not found');
      }
    }

    const link = this.linkRepo.create({
      project_id: projectId,
      dependency_type: dto.dependency_type,
      dependency_id: dto.dependency_id,
      injected_env_prefix: dto.injected_env_prefix,
      cascade_restart: dto.cascade_restart ?? false,
    });
    return this.linkRepo.save(link);
  }

  async findByProject(projectId: string): Promise<ServiceLink[]> {
    return this.linkRepo.find({ where: { project_id: projectId } });
  }

  async findById(id: string): Promise<ServiceLink> {
    const link = await this.linkRepo.findOne({ where: { id } });
    if (!link) {
      throw new NotFoundException('Service link not found');
    }
    return link;
  }

  async update(id: string, dto: UpdateServiceLinkDto): Promise<ServiceLink> {
    const link = await this.findById(id);

    if (dto.injected_env_prefix !== undefined) {
      link.injected_env_prefix = dto.injected_env_prefix;
    }
    if (dto.cascade_restart !== undefined) {
      link.cascade_restart = dto.cascade_restart;
    }

    return this.linkRepo.save(link);
  }

  async delete(id: string): Promise<void> {
    const result = await this.linkRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Service link not found');
    }
  }

  async getDependencyGraph(
    teamId: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const projects = await this.projectRepo.find({
      where: { team_id: teamId },
    });
    const databases = await this.dbRepo.find({ where: { team_id: teamId } });

    const projectIds = projects.map((p) => p.id);
    const links =
      projectIds.length > 0
        ? await this.linkRepo
            .createQueryBuilder('sl')
            .where('sl.project_id IN (:...ids)', { ids: projectIds })
            .getMany()
        : [];

    const nodes: GraphNode[] = [
      ...projects.map((p) => ({
        id: p.id,
        name: p.name,
        type: 'project' as const,
      })),
      ...databases.map((d) => ({
        id: d.id,
        name: d.name,
        type: 'database' as const,
      })),
    ];

    const edges: GraphEdge[] = links.map((l) => ({
      from: l.project_id,
      to: l.dependency_id,
      label: l.injected_env_prefix,
    }));

    return { nodes, edges };
  }

  async getInjectedVars(
    projectId: string,
  ): Promise<Record<string, string>> {
    const links = await this.linkRepo.find({
      where: { project_id: projectId },
    });

    const vars: Record<string, string> = {};

    for (const link of links) {
      const prefix = link.injected_env_prefix;

      if (link.dependency_type === 'database') {
        const db = await this.dbRepo.findOne({
          where: { id: link.dependency_id },
          relations: ['server'],
        });
        if (!db) continue;

        vars[`${prefix}_ENGINE`] = db.engine;
        vars[`${prefix}_HOST`] = db.server?.host ?? 'localhost';
        vars[`${prefix}_PORT`] = String(db.port);
        vars[`${prefix}_NAME`] = db.name;
        vars[`${prefix}_VERSION`] = db.version;
      } else {
        const depProject = await this.projectRepo.findOne({
          where: { id: link.dependency_id },
        });
        if (!depProject) continue;

        vars[`${prefix}_HOST`] = `${depProject.slug}.internal`;
        vars[`${prefix}_NAME`] = depProject.name;
        vars[`${prefix}_SLUG`] = depProject.slug;
      }
    }

    return vars;
  }

  private async detectCircularDependency(
    projectId: string,
    newDependencyId: string,
  ): Promise<void> {
    const visited = new Set<string>();
    const stack = [newDependencyId];

    let current: string | undefined;
    while ((current = stack.pop()) !== undefined) {
      if (current === projectId) {
        throw new BadRequestException(
          'Circular dependency detected: adding this link would create a cycle',
        );
      }
      if (visited.has(current)) continue;
      visited.add(current);

      const outgoing = await this.linkRepo.find({
        where: { project_id: current, dependency_type: 'project' },
      });
      for (const link of outgoing) {
        stack.push(link.dependency_id);
      }
    }
  }
}
