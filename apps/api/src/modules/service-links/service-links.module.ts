import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceLink, Project, ManagedDatabase } from '@vesta/db';
import { ServiceLinksService } from './service-links.service';
import { ServiceLinksController } from './service-links.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceLink, Project, ManagedDatabase])],
  providers: [ServiceLinksService],
  controllers: [ServiceLinksController],
  exports: [ServiceLinksService],
})
export class ServiceLinksModule {}
