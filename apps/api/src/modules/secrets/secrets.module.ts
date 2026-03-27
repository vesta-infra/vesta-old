import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Secret, SecretAcl } from '@vesta/db';
import { SecretsService } from './secrets.service';
import { SecretAclService } from './secret-acl.service';
import { SecretsController } from './secrets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Secret, SecretAcl])],
  providers: [SecretsService, SecretAclService],
  controllers: [SecretsController],
  exports: [SecretsService, SecretAclService],
})
export class SecretsModule {}
