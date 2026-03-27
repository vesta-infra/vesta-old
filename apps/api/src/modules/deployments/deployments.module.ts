import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Deployment, Environment } from '@vesta/db';
import { EventsModule } from '../../events/events.module';
import { DeploymentsService } from './deployments.service';
import { DeploymentsController } from './deployments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment, Environment]),
    BullModule.registerQueue({ name: 'deployments' }),
    EventsModule,
  ],
  providers: [DeploymentsService],
  controllers: [DeploymentsController],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
