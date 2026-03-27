import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Domain } from '@vesta/db';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';

@Injectable()
export class DomainsService {
  constructor(
    @InjectRepository(Domain)
    private readonly domainRepo: Repository<Domain>,
  ) {}

  async create(projectId: string, dto: CreateDomainDto): Promise<Domain> {
    const existing = await this.domainRepo.findOne({
      where: { fqdn: dto.fqdn },
    });
    if (existing) {
      throw new ConflictException(`Domain "${dto.fqdn}" is already in use`);
    }

    const domain = this.domainRepo.create({
      project_id: projectId,
      fqdn: dto.fqdn,
      environment_id: dto.environment_id ?? null,
      redirect_www: dto.redirect_www ?? false,
      force_https: dto.force_https ?? true,
    });
    return this.domainRepo.save(domain);
  }

  async findByProject(projectId: string): Promise<Domain[]> {
    return this.domainRepo.find({ where: { project_id: projectId } });
  }

  async findById(id: string): Promise<Domain> {
    const domain = await this.domainRepo.findOne({ where: { id } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    return domain;
  }

  async update(id: string, dto: UpdateDomainDto): Promise<Domain> {
    const domain = await this.domainRepo.findOne({ where: { id } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    if (dto.environment_id !== undefined) {
      domain.environment_id = dto.environment_id ?? null;
    }
    if (dto.redirect_www !== undefined) {
      domain.redirect_www = dto.redirect_www;
    }
    if (dto.force_https !== undefined) {
      domain.force_https = dto.force_https;
    }

    return this.domainRepo.save(domain);
  }

  async delete(id: string): Promise<void> {
    const result = await this.domainRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Domain not found');
    }
  }

  async updateSslStatus(
    id: string,
    status: 'pending' | 'active' | 'error',
  ): Promise<Domain> {
    const domain = await this.domainRepo.findOne({ where: { id } });
    if (!domain) {
      throw new NotFoundException('Domain not found');
    }
    domain.ssl_status = status;
    return this.domainRepo.save(domain);
  }
}
