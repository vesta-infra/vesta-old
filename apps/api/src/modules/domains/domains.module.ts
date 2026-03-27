import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Domain, Project, Environment } from '@vesta/db';
import { DomainsService } from './domains.service';
import { DomainsController } from './domains.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Domain, Project, Environment])],
  providers: [DomainsService],
  controllers: [DomainsController],
  exports: [DomainsService],
})
export class DomainsModule {}
