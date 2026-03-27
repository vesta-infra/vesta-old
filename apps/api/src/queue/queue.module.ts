import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deployment, ManagedDatabase } from '@vesta/db';
import { DeploymentProcessor } from './processors/deployment.processor';
import { DatabaseProcessor } from './processors/database.processor';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'deployments' },
      { name: 'databases' },
      { name: 'backups' },
      { name: 'webhooks' },
      { name: 'cron-jobs' },
    ),
    TypeOrmModule.forFeature([Deployment, ManagedDatabase]),
  ],
  providers: [DeploymentProcessor, DatabaseProcessor],
  exports: [BullModule],
})
export class QueueModule {}
