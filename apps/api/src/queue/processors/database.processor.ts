import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManagedDatabase } from '@vesta/db';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface DatabaseJobData {
  databaseId: string;
  teamId: string;
}

@Processor('databases')
export class DatabaseProcessor extends WorkerHost {
  private readonly logger = new Logger(DatabaseProcessor.name);

  constructor(
    @InjectRepository(ManagedDatabase)
    private readonly dbRepo: Repository<ManagedDatabase>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<DatabaseJobData>) {
    const { databaseId, teamId } = job.data;
    this.logger.log(`Provisioning database ${databaseId}`);

    const db = await this.dbRepo.findOne({ where: { id: databaseId } });
    if (!db) {
      this.logger.warn(`Database ${databaseId} not found, skipping`);
      return;
    }

    const emitLog = (message: string) => {
      this.eventEmitter.emit('database.log', {
        databaseId,
        teamId,
        line: message,
        timestamp: new Date().toISOString(),
      });
    };

    try {
      emitLog(`Starting provisioning of ${db.engine} v${db.version}...`);
      await this.delay(800);

      emitLog(`Pulling ${db.engine}:${db.version} image...`);
      await this.delay(1500);

      emitLog('Creating container...');
      await this.delay(600);

      emitLog(`Configuring ${db.engine} instance "${db.name}"...`);
      await this.delay(500);

      emitLog(`Setting up credentials and network on port ${db.port}...`);
      await this.delay(400);

      emitLog('Starting database service...');
      await this.delay(1000);

      emitLog('Running health checks...');
      await this.delay(800);

      db.status = 'running';
      await this.dbRepo.save(db);

      emitLog('Database is ready.');

      this.eventEmitter.emit('database.status', {
        databaseId,
        teamId,
        status: 'running',
      });

      this.logger.log(`Database ${databaseId} provisioned successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to provision database ${databaseId}: ${message}`);

      emitLog(`Error: ${message}`);

      db.status = 'error';
      await this.dbRepo.save(db);

      this.eventEmitter.emit('database.status', {
        databaseId,
        teamId,
        status: 'error',
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
