import * as crypto from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ManagedDatabase, Server } from '@vesta/db';
import { SecretsService } from '../secrets/secrets.service';
import { CreateDatabaseDto } from './dto/create-database.dto';

const DEFAULT_PORTS: Record<ManagedDatabase['engine'], number> = {
  postgres: 5432,
  mysql: 3306,
  mongo: 27017,
  redis: 6379,
  clickhouse: 9000,
  minio: 9000,
};

const DEFAULT_VERSIONS: Record<ManagedDatabase['engine'], string> = {
  postgres: '16',
  mysql: '8.0',
  mongo: '7',
  redis: '7',
  clickhouse: '24',
  minio: 'latest',
};

@Injectable()
export class DatabasesService {
  constructor(
    @InjectRepository(ManagedDatabase)
    private readonly dbRepo: Repository<ManagedDatabase>,
    @InjectRepository(Server)
    private readonly serverRepo: Repository<Server>,
    private readonly secretsService: SecretsService,
    @InjectQueue('databases')
    private readonly databaseQueue: Queue,
  ) {}

  async create(teamId: string, dto: CreateDatabaseDto): Promise<ManagedDatabase> {
    const server = await this.serverRepo.findOne({ where: { id: dto.server_id } });
    if (!server) {
      throw new NotFoundException('Server not found');
    }

    const { username, password } = this.generateCredentials(dto.engine);

    const secret = await this.secretsService.create({
      scope: 'global',
      scope_id: teamId,
      key: `db_${dto.name}_credentials`,
      value: JSON.stringify({ username, password }),
    });

    const db = this.dbRepo.create({
      team_id: teamId,
      server_id: dto.server_id,
      name: dto.name,
      engine: dto.engine,
      version: dto.version ?? DEFAULT_VERSIONS[dto.engine],
      port: DEFAULT_PORTS[dto.engine],
      credentials_secret_id: secret.id,
      status: 'provisioning',
    });

    const saved = await this.dbRepo.save(db);

    await this.databaseQueue.add('provision', {
      databaseId: saved.id,
      teamId,
    });

    return saved;
  }

  async findByTeam(teamId: string): Promise<ManagedDatabase[]> {
    return this.dbRepo.find({ where: { team_id: teamId } });
  }

  async findById(id: string): Promise<ManagedDatabase> {
    const db = await this.dbRepo.findOne({ where: { id } });
    if (!db) {
      throw new NotFoundException('Managed database not found');
    }
    return db;
  }

  async delete(id: string): Promise<void> {
    const db = await this.findById(id);
    if (db.credentials_secret_id) {
      await this.secretsService.delete(db.credentials_secret_id).catch(() => {});
    }
    await this.dbRepo.delete(id);
  }

  async updateStatus(id: string, status: string): Promise<ManagedDatabase> {
    const db = await this.findById(id);
    db.status = status;
    return this.dbRepo.save(db);
  }

  async getConnectionInfo(id: string) {
    const db = await this.findById(id);
    return {
      id: db.id,
      name: db.name,
      engine: db.engine,
      version: db.version,
      host: db.server_id,
      port: db.port,
      status: db.status,
    };
  }

  private generateCredentials(engine: ManagedDatabase['engine']): {
    username: string;
    password: string;
  } {
    const password = crypto.randomBytes(24).toString('base64url');

    const userPrefixes: Record<ManagedDatabase['engine'], string> = {
      postgres: 'pg',
      mysql: 'mysql',
      mongo: 'mongo',
      redis: '',
      clickhouse: 'ch',
      minio: 'minio',
    };

    const prefix = userPrefixes[engine];
    const username = prefix ? `${prefix}_${crypto.randomBytes(4).toString('hex')}` : '';

    return { username, password };
  }
}
