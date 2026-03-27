import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageDestination } from '@vesta/db';
import { CreateStorageDestinationDto } from './dto/create-storage-destination.dto';
import { UpdateStorageDestinationDto } from './dto/update-storage-destination.dto';

@Injectable()
export class StorageDestinationsService {
  constructor(
    @InjectRepository(StorageDestination)
    private readonly destRepo: Repository<StorageDestination>,
  ) {}

  async create(
    teamId: string,
    dto: CreateStorageDestinationDto,
  ): Promise<StorageDestination> {
    const dest = this.destRepo.create({
      team_id: teamId,
      name: dto.name,
      type: dto.type ?? 's3',
      config: dto.config,
    });
    return this.destRepo.save(dest);
  }

  async findByTeam(teamId: string): Promise<StorageDestination[]> {
    return this.destRepo.find({ where: { team_id: teamId } });
  }

  async findById(id: string): Promise<StorageDestination> {
    const dest = await this.destRepo.findOne({ where: { id } });
    if (!dest) {
      throw new NotFoundException('Storage destination not found');
    }
    return dest;
  }

  async update(
    id: string,
    dto: UpdateStorageDestinationDto,
  ): Promise<StorageDestination> {
    const dest = await this.findById(id);
    Object.assign(dest, dto);
    return this.destRepo.save(dest);
  }

  async delete(id: string): Promise<void> {
    const result = await this.destRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Storage destination not found');
    }
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    await this.findById(id);
    return { success: true, message: 'Connection test passed (placeholder)' };
  }
}
