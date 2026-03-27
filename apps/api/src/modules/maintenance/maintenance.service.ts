import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceWindow, Environment } from '@vesta/db';
import { createHash } from 'crypto';
import { EventsService } from '../../events/events.service';
import { EventTypes } from '../../events/event-types';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceWindow)
    private readonly maintenanceRepo: Repository<MaintenanceWindow>,
    @InjectRepository(Environment)
    private readonly envRepo: Repository<Environment>,
    private readonly eventsService: EventsService,
  ) {}

  async getForEnvironment(environmentId: string): Promise<MaintenanceWindow> {
    let window = await this.maintenanceRepo.findOne({
      where: { environment_id: environmentId },
    });

    if (!window) {
      const env = await this.envRepo.findOne({
        where: { id: environmentId },
      });
      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      window = this.maintenanceRepo.create({
        environment_id: environmentId,
        enabled: false,
        allowed_ips: [],
        status_code: 503,
      });
      window = await this.maintenanceRepo.save(window);
    }

    return window;
  }

  async update(
    environmentId: string,
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceWindow> {
    const window = await this.getForEnvironment(environmentId);

    if (dto.enabled !== undefined) window.enabled = dto.enabled;
    if (dto.allowed_ips !== undefined) window.allowed_ips = dto.allowed_ips;
    if (dto.custom_page_html !== undefined)
      window.custom_page_html = dto.custom_page_html;
    if (dto.status_code !== undefined) window.status_code = dto.status_code;
    if (dto.scheduled_start !== undefined)
      window.scheduled_start = dto.scheduled_start
        ? new Date(dto.scheduled_start)
        : null;
    if (dto.scheduled_end !== undefined)
      window.scheduled_end = dto.scheduled_end
        ? new Date(dto.scheduled_end)
        : null;
    if (dto.bypass_token !== undefined) {
      window.bypass_token_hash = dto.bypass_token
        ? createHash('sha256').update(dto.bypass_token).digest('hex')
        : null;
    }

    return this.maintenanceRepo.save(window);
  }

  async toggle(environmentId: string): Promise<MaintenanceWindow> {
    const window = await this.getForEnvironment(environmentId);
    window.enabled = !window.enabled;
    const saved = await this.maintenanceRepo.save(window);

    const env = await this.envRepo.findOne({
      where: { id: environmentId },
      relations: ['project'],
    });

    const eventType = saved.enabled
      ? EventTypes.MAINTENANCE_ENABLED
      : EventTypes.MAINTENANCE_DISABLED;

    this.eventsService.emitMaintenanceEvent(eventType, {
      environmentId,
      teamId: env?.project?.team_id ?? '',
    });

    return saved;
  }

  async isInMaintenance(
    environmentId: string,
    clientIp?: string,
  ): Promise<boolean> {
    const window = await this.maintenanceRepo.findOne({
      where: { environment_id: environmentId },
    });

    if (!window || !window.enabled) return false;

    if (window.scheduled_start || window.scheduled_end) {
      const now = new Date();
      if (window.scheduled_start && now < window.scheduled_start) return false;
      if (window.scheduled_end && now > window.scheduled_end) return false;
    }

    if (clientIp && window.allowed_ips.length > 0) {
      if (window.allowed_ips.includes(clientIp)) return false;
    }

    return true;
  }
}
