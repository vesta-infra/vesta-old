import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeployHook } from '@vesta/db';
import { CreateDeployHookDto } from './dto/create-deploy-hook.dto';
import { UpdateDeployHookDto } from './dto/update-deploy-hook.dto';

@Injectable()
export class DeployHooksService {
  constructor(
    @InjectRepository(DeployHook)
    private readonly hookRepo: Repository<DeployHook>,
  ) {}

  async create(
    environmentId: string,
    dto: CreateDeployHookDto,
  ): Promise<DeployHook> {
    const maxOrder = await this.hookRepo
      .createQueryBuilder('hook')
      .select('COALESCE(MAX(hook.order), 0)', 'max')
      .where('hook.environment_id = :environmentId', { environmentId })
      .getRawOne();

    const hook = this.hookRepo.create({
      environment_id: environmentId,
      phase: dto.phase,
      command: dto.command,
      timeout_seconds: dto.timeout_seconds ?? 60,
      enabled: dto.enabled ?? true,
      order: (maxOrder?.max ?? 0) + 1,
    });
    return this.hookRepo.save(hook);
  }

  async findByEnvironment(environmentId: string): Promise<DeployHook[]> {
    return this.hookRepo.find({
      where: { environment_id: environmentId },
      order: { order: 'ASC' },
    });
  }

  async findById(id: string): Promise<DeployHook> {
    const hook = await this.hookRepo.findOne({ where: { id } });
    if (!hook) {
      throw new NotFoundException('Deploy hook not found');
    }
    return hook;
  }

  async update(id: string, dto: UpdateDeployHookDto): Promise<DeployHook> {
    const hook = await this.hookRepo.findOne({ where: { id } });
    if (!hook) {
      throw new NotFoundException('Deploy hook not found');
    }

    if (dto.phase !== undefined) hook.phase = dto.phase;
    if (dto.command !== undefined) hook.command = dto.command;
    if (dto.timeout_seconds !== undefined) hook.timeout_seconds = dto.timeout_seconds;
    if (dto.enabled !== undefined) hook.enabled = dto.enabled;

    return this.hookRepo.save(hook);
  }

  async delete(id: string): Promise<void> {
    const result = await this.hookRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Deploy hook not found');
    }
  }

  async reorder(
    environmentId: string,
    orderedIds: string[],
  ): Promise<DeployHook[]> {
    const updates = orderedIds.map((id, index) =>
      this.hookRepo.update(id, { order: index + 1 }),
    );
    await Promise.all(updates);
    return this.findByEnvironment(environmentId);
  }
}
