import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Environment, Project } from '@vesta/db';
import { EnvironmentsService } from './environments.service';
import { EnvironmentsController } from './environments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Environment, Project])],
  providers: [EnvironmentsService],
  controllers: [EnvironmentsController],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
