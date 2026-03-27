import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Deployment, Environment } from '@vesta/db';
import { EventsService } from '../../events/events.service';
import { EventTypes } from '../../events/event-types';
import { CreateDeploymentDto } from './dto/create-deployment.dto';

@Injectable()
export class DeploymentsService {
  constructor(
    @InjectRepository(Deployment)
    private readonly deploymentRepo: Repository<Deployment>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    @InjectQueue('deployments')
    private readonly deploymentQueue: Queue,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    environmentId: string,
    dto: CreateDeploymentDto,
  ): Promise<Deployment> {
    const env = await this.envRepo.findOne({
      where: { id: environmentId },
    });
    if (!env) {
      throw new NotFoundException('Environment not found');
    }

    const deployment = this.deploymentRepo.create({
      environment_id: environmentId,
      status: 'queued',
      commit_sha: dto.commit_sha ?? null,
      image_tag: dto.image_tag ?? null,
      desired_replicas: dto.desired_replicas ?? env.replicas,
    });
    const saved = await this.deploymentRepo.save(deployment);

    await this.deploymentQueue.add('deploy', {
      deploymentId: saved.id,
      environmentId,
    });

    this.eventsService.emitDeploymentEvent(EventTypes.DEPLOYMENT_QUEUED, {
      deploymentId: saved.id,
      environmentId,
    });

    return saved;
  }

  async findByEnvironment(
    environmentId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ data: Deployment[]; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    const [data, total] = await this.deploymentRepo.findAndCount({
      where: { environment_id: environmentId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findById(id: string): Promise<Deployment> {
    const deployment = await this.deploymentRepo.findOne({ where: { id } });
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    return deployment;
  }

  async updateStatus(
    id: string,
    status: Deployment['status'],
    logs?: string,
  ): Promise<Deployment> {
    const deployment = await this.findById(id);
    deployment.status = status;

    if (logs) {
      if (status === 'building') {
        deployment.build_logs = logs;
      } else {
        deployment.deploy_logs = logs;
      }
    }

    if (status === 'building' || status === 'deploying') {
      deployment.started_at = deployment.started_at ?? new Date();
    }

    if (['running', 'failed', 'cancelled', 'rolled_back'].includes(status)) {
      deployment.finished_at = new Date();
    }

    return this.deploymentRepo.save(deployment);
  }

  async rollback(id: string): Promise<Deployment> {
    const previous = await this.findById(id);
    if (!previous.image_tag) {
      throw new BadRequestException(
        'Cannot rollback: no image tag on the target deployment',
      );
    }

    const deployment = this.deploymentRepo.create({
      environment_id: previous.environment_id,
      status: 'queued',
      commit_sha: previous.commit_sha,
      image_tag: previous.image_tag,
      desired_replicas: previous.desired_replicas,
    });
    const saved = await this.deploymentRepo.save(deployment);

    await this.deploymentQueue.add('deploy', {
      deploymentId: saved.id,
      environmentId: previous.environment_id,
    });

    this.eventsService.emitDeploymentEvent(EventTypes.DEPLOYMENT_QUEUED, {
      deploymentId: saved.id,
      environmentId: previous.environment_id,
      rollbackFromId: id,
    });

    return saved;
  }

  async cancel(id: string): Promise<Deployment> {
    const deployment = await this.findById(id);
    if (!['queued', 'building'].includes(deployment.status)) {
      throw new BadRequestException(
        'Can only cancel queued or building deployments',
      );
    }

    deployment.status = 'cancelled';
    deployment.finished_at = new Date();
    const saved = await this.deploymentRepo.save(deployment);

    this.eventsService.emitDeploymentEvent(EventTypes.DEPLOYMENT_CANCELLED, {
      deploymentId: id,
      environmentId: deployment.environment_id,
    });

    return saved;
  }
}
