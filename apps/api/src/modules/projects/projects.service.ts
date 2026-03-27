import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Environment } from '@vesta/db';
import { BuildMethod } from '@vesta/shared';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
  ) {}

  async create(
    teamId: string,
    data: {
      name: string;
      description?: string;
      git_url?: string;
      build_method: BuildMethod;
    },
  ): Promise<Project> {
    const slug = data.name
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '');

    const project = this.projectRepo.create({
      team_id: teamId,
      name: data.name,
      slug,
      description: data.description ?? null,
      git_url: data.git_url ?? null,
      build_method: data.build_method,
    });
    const savedProject = await this.projectRepo.save(project);

    const productionEnv = this.envRepo.create({
      project_id: savedProject.id,
      name: 'production',
      auto_deploy: false,
      replicas: 1,
    });
    await this.envRepo.save(productionEnv);

    return this.findById(savedProject.id) as Promise<Project>;
  }

  async findByTeam(teamId: string): Promise<Project[]> {
    return this.projectRepo.find({
      where: { team_id: teamId },
      relations: ['environments'],
      order: { created_at: 'DESC' },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.projectRepo.findOne({
      where: { id },
      relations: ['environments'],
    });
  }

  async update(
    id: string,
    data: Partial<Pick<Project, 'name' | 'description' | 'git_url' | 'build_method'>>,
  ): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    Object.assign(project, data);
    if (data.name) {
      project.slug = data.name
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-|-$/g, '');
    }

    return this.projectRepo.save(project);
  }

  async delete(id: string): Promise<void> {
    const result = await this.projectRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Project not found');
    }
  }
}
