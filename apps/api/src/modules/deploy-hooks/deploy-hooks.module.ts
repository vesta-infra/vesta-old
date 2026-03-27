import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeployHook, Environment } from '@vesta/db';
import { DeployHooksService } from './deploy-hooks.service';
import { DeployHooksController } from './deploy-hooks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeployHook, Environment])],
  providers: [DeployHooksService],
  controllers: [DeployHooksController],
  exports: [DeployHooksService],
})
export class DeployHooksModule {}
