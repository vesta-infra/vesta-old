import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, SshKey } from '@vesta/db';
import * as os from 'os';
import { CreateServerDto } from './dto/create-server.dto';
import { UpdateServerDto } from './dto/update-server.dto';

@Injectable()
export class ServersService {
  constructor(
    @InjectRepository(Server)
    private readonly serverRepo: Repository<Server>,
    @InjectRepository(SshKey)
    private readonly sshKeyRepo: Repository<SshKey>,
  ) {}

  async create(teamId: string, dto: CreateServerDto): Promise<Server> {
    const server = this.serverRepo.create({
      team_id: teamId,
      name: dto.name,
      host: dto.host,
      port: dto.port ?? 22,
      tags: dto.tags ?? [],
    });
    return this.serverRepo.save(server);
  }

  async createLocalServer(teamId: string): Promise<Server> {
    const existing = await this.serverRepo.findOne({
      where: { team_id: teamId, is_local: true },
    });
    if (existing) return existing;

    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const cpus = os.cpus().length;

    const server = this.serverRepo.create({
      team_id: teamId,
      name: 'localhost',
      host: '127.0.0.1',
      port: 22,
      is_local: true,
      agent_status: 'online',
      cpu_cores: cpus,
      memory_mb: totalMem,
      tags: ['local', 'default'],
      last_heartbeat_at: new Date(),
    });
    return this.serverRepo.save(server);
  }

  async findByTeam(teamId: string): Promise<Server[]> {
    await this.createLocalServer(teamId);
    return this.serverRepo.find({ where: { team_id: teamId } });
  }

  async findById(id: string): Promise<Server> {
    const server = await this.serverRepo.findOne({ where: { id } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }
    return server;
  }

  async update(id: string, dto: UpdateServerDto): Promise<Server> {
    const server = await this.findById(id);
    Object.assign(server, dto);
    return this.serverRepo.save(server);
  }

  async delete(id: string): Promise<void> {
    const result = await this.serverRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Server not found');
    }
  }

  async updateAgentStatus(
    id: string,
    status: 'online' | 'offline' | 'installing',
    agentVersion?: string,
  ): Promise<Server> {
    const server = await this.findById(id);
    server.agent_status = status;
    server.last_heartbeat_at = new Date();
    if (agentVersion) {
      server.agent_version = agentVersion;
    }
    return this.serverRepo.save(server);
  }

  async getMetrics(id: string) {
    const server = await this.findById(id);
    return {
      server_id: server.id,
      cpu_usage: 0,
      memory_usage: 0,
      disk_usage: 0,
      network_rx: 0,
      network_tx: 0,
      uptime: 0,
      collected_at: new Date(),
    };
  }
}
