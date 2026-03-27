import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecretAcl } from '@vesta/db';
import { SetAclDto } from './dto/set-acl.dto';

@Injectable()
export class SecretAclService {
  constructor(
    @InjectRepository(SecretAcl)
    private readonly aclRepo: Repository<SecretAcl>,
  ) {}

  async getAcl(secretId: string): Promise<SecretAcl[]> {
    return this.aclRepo.find({ where: { secret_id: secretId } });
  }

  async setAcl(secretId: string, dto: SetAclDto): Promise<SecretAcl> {
    const existing = await this.aclRepo.findOne({
      where: {
        secret_id: secretId,
        grantee_type: dto.grantee_type,
        grantee_id: dto.grantee_id,
      },
    });

    if (existing) {
      existing.permissions = dto.permissions;
      return this.aclRepo.save(existing);
    }

    const acl = this.aclRepo.create({
      secret_id: secretId,
      scope: 'global',
      scope_id: '',
      grantee_type: dto.grantee_type,
      grantee_id: dto.grantee_id,
      permissions: dto.permissions,
    });
    return this.aclRepo.save(acl);
  }

  async removeAcl(aclId: string): Promise<void> {
    const result = await this.aclRepo.delete(aclId);
    if (result.affected === 0) {
      throw new NotFoundException('ACL entry not found');
    }
  }

  async checkPermission(
    secretId: string,
    userId: string,
    permission: string,
  ): Promise<boolean> {
    const acl = await this.aclRepo.findOne({
      where: {
        secret_id: secretId,
        grantee_type: 'user',
        grantee_id: userId,
      },
    });
    if (!acl) return false;
    return acl.permissions.includes(permission);
  }

  async getScopeDefaults(
    scope: 'global' | 'project' | 'environment',
    scopeId: string,
  ): Promise<SecretAcl[]> {
    return this.aclRepo.find({
      where: { secret_id: undefined as any, scope, scope_id: scopeId },
    });
  }
}
