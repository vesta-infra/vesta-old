import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityService } from './activity.service';

@Injectable()
export class ActivityListener {
  private readonly logger = new Logger(ActivityListener.name);

  constructor(private readonly activityService: ActivityService) {}

  @OnEvent('deployment.*')
  async handleDeploymentEvent(payload: Record<string, unknown>) {
    await this.logEvent('deployment', payload);
  }

  @OnEvent('secret.*')
  async handleSecretEvent(payload: Record<string, unknown>) {
    await this.logEvent('secret', payload);
  }

  @OnEvent('server.*')
  async handleServerEvent(payload: Record<string, unknown>) {
    await this.logEvent('server', payload);
  }

  @OnEvent('backup.*')
  async handleBackupEvent(payload: Record<string, unknown>) {
    await this.logEvent('backup', payload);
  }

  @OnEvent('scaling.*')
  async handleScalingEvent(payload: Record<string, unknown>) {
    await this.logEvent('scaling', payload);
  }

  @OnEvent('maintenance.*')
  async handleMaintenanceEvent(payload: Record<string, unknown>) {
    await this.logEvent('maintenance', payload);
  }

  @OnEvent('cronjob.*')
  async handleCronJobEvent(payload: Record<string, unknown>) {
    await this.logEvent('cronjob', payload);
  }

  private async logEvent(
    resourceType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const action = (payload._eventName as string) ?? `${resourceType}.unknown`;
      const teamId =
        (payload.teamId as string) ?? (payload.team_id as string) ?? '';
      const resourceId =
        (payload.deploymentId as string) ??
        (payload.secretId as string) ??
        (payload.serverId as string) ??
        (payload.backupId as string) ??
        (payload.environmentId as string) ??
        (payload.cronJobId as string) ??
        '';

      if (!teamId) {
        this.logger.debug(
          `Skipping audit log for ${action}: no teamId in payload`,
        );
        return;
      }

      await this.activityService.log({
        teamId,
        actorId: payload.actorId as string | undefined,
        action,
        resourceType,
        resourceId,
        metadata: payload,
      });
    } catch (error) {
      this.logger.error(
        `Failed to log activity for ${resourceType}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
