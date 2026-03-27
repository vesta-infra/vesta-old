import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Environment, Project } from '@vesta/db';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';

@Injectable()
export class EnvironmentsService {
  constructor(
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async create(
    projectId: string,
    dto: CreateEnvironmentDto,
  ): Promise<Environment> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const env = this.envRepo.create({
      project_id: projectId,
      name: dto.name,
      auto_deploy: dto.auto_deploy ?? false,
      domain_suffix: dto.domain_suffix ?? null,
    });
    return this.envRepo.save(env);
  }

  async findByProject(projectId: string): Promise<Environment[]> {
    return this.envRepo.find({ where: { project_id: projectId } });
  }

  async findById(id: string): Promise<Environment> {
    const env = await this.envRepo.findOne({ where: { id } });
    if (!env) {
      throw new NotFoundException('Environment not found');
    }
    return env;
  }

  async update(id: string, dto: UpdateEnvironmentDto): Promise<Environment> {
    const env = await this.findById(id);
    Object.assign(env, dto);
    return this.envRepo.save(env);
  }

  async delete(id: string): Promise<void> {
    const result = await this.envRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Environment not found');
    }
  }

  async updateScale(id: string, replicas: number): Promise<Environment> {
    const env = await this.findById(id);
    env.replicas = replicas;
    return this.envRepo.save(env);
  }
}
