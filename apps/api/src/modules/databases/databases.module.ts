import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ManagedDatabase, Server, Secret } from '@vesta/db';
import { SecretsModule } from '../secrets/secrets.module';
import { DatabasesService } from './databases.service';
import { DatabasesController } from './databases.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ManagedDatabase, Server, Secret]),
    BullModule.registerQueue({ name: 'databases' }),
    SecretsModule,
  ],
  providers: [DatabasesService],
  controllers: [DatabasesController],
  exports: [DatabasesService],
})
export class DatabasesModule {}
