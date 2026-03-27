import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Server, SshKey } from '@vesta/db';
import { ServersService } from './servers.service';
import { ServersController } from './servers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Server, SshKey])],
  providers: [ServersService],
  controllers: [ServersController],
  exports: [ServersService],
})
export class ServersModule {}
