import * as crypto from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Secret } from '@vesta/db';
import { CreateSecretDto } from './dto/create-secret.dto';
import { UpdateSecretDto } from './dto/update-secret.dto';

@Injectable()
export class SecretsService {
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectRepository(Secret)
    private readonly secretRepo: Repository<Secret>,
    private readonly configService: ConfigService,
  ) {
    const masterKey = this.configService.get<string>('encryption.masterKey')!;
    this.encryptionKey = crypto.scryptSync(masterKey, 'vesta-salt', 32);
  }

  async create(dto: CreateSecretDto): Promise<Secret> {
    const existing = await this.secretRepo.findOne({
      where: { scope: dto.scope, scope_id: dto.scope_id, key: dto.key },
    });
    if (existing) {
      throw new ConflictException(
        `Secret "${dto.key}" already exists in this scope`,
      );
    }

    const encrypted_value = this.encrypt(dto.value);
    const secret = this.secretRepo.create({
      scope: dto.scope,
      scope_id: dto.scope_id,
      key: dto.key,
      encrypted_value,
      version: 1,
    });
    return this.secretRepo.save(secret);
  }

  async findByScope(
    scope: string,
    scopeId: string,
  ): Promise<Secret[]> {
    return this.secretRepo.find({
      where: { scope: scope as Secret['scope'], scope_id: scopeId },
      select: ['id', 'scope', 'scope_id', 'key', 'version', 'created_at', 'updated_at'],
    });
  }

  async findById(id: string): Promise<Secret> {
    const secret = await this.secretRepo.findOne({
      where: { id },
      select: ['id', 'scope', 'scope_id', 'key', 'version', 'created_at', 'updated_at'],
    });
    if (!secret) {
      throw new NotFoundException('Secret not found');
    }
    return secret;
  }

  async getDecryptedValue(id: string): Promise<string> {
    const secret = await this.secretRepo.findOne({ where: { id } });
    if (!secret) {
      throw new NotFoundException('Secret not found');
    }
    return this.decrypt(secret.encrypted_value);
  }

  async update(id: string, dto: UpdateSecretDto): Promise<Secret> {
    const secret = await this.secretRepo.findOne({ where: { id } });
    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    if (dto.key) {
      secret.key = dto.key;
    }
    if (dto.value) {
      secret.encrypted_value = this.encrypt(dto.value);
      secret.version += 1;
    }

    return this.secretRepo.save(secret);
  }

  async delete(id: string): Promise<void> {
    const result = await this.secretRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Secret not found');
    }
  }

  async rotate(id: string): Promise<Secret> {
    const secret = await this.secretRepo.findOne({ where: { id } });
    if (!secret) {
      throw new NotFoundException('Secret not found');
    }

    const plaintext = this.decrypt(secret.encrypted_value);
    secret.encrypted_value = this.encrypt(plaintext);
    secret.version += 1;

    return this.secretRepo.save(secret);
  }

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
  }

  private decrypt(encryptedHex: string): string {
    const iv = Buffer.from(encryptedHex.slice(0, 32), 'hex');
    const authTag = Buffer.from(encryptedHex.slice(32, 64), 'hex');
    const encrypted = Buffer.from(encryptedHex.slice(64), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
