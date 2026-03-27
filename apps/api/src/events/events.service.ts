import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventTypes } from './event-types';

@Injectable()
export class EventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitDeploymentEvent(
    type:
      | typeof EventTypes.DEPLOYMENT_QUEUED
      | typeof EventTypes.DEPLOYMENT_STARTED
      | typeof EventTypes.DEPLOYMENT_SUCCEEDED
      | typeof EventTypes.DEPLOYMENT_FAILED
      | typeof EventTypes.DEPLOYMENT_ROLLED_BACK
      | typeof EventTypes.DEPLOYMENT_CANCELLED,
    payload: { deploymentId: string; environmentId: string; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }

  emitSecretEvent(
    type:
      | typeof EventTypes.SECRET_CREATED
      | typeof EventTypes.SECRET_UPDATED
      | typeof EventTypes.SECRET_DELETED
      | typeof EventTypes.SECRET_ACCESSED
      | typeof EventTypes.SECRET_ROTATED,
    payload: { secretId: string; teamId: string; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }

  emitServerEvent(
    type:
      | typeof EventTypes.SERVER_ADDED
      | typeof EventTypes.SERVER_REMOVED
      | typeof EventTypes.SERVER_ONLINE
      | typeof EventTypes.SERVER_OFFLINE,
    payload: { serverId: string; teamId: string; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }

  emitBackupEvent(
    type:
      | typeof EventTypes.BACKUP_STARTED
      | typeof EventTypes.BACKUP_COMPLETED
      | typeof EventTypes.BACKUP_FAILED,
    payload: { backupId: string; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }

  emitScalingEvent(
    type:
      | typeof EventTypes.SCALING_CHANGED
      | typeof EventTypes.SCALING_AUTO_TRIGGERED,
    payload: { environmentId: string; replicas: number; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }

  emitMaintenanceEvent(
    type:
      | typeof EventTypes.MAINTENANCE_ENABLED
      | typeof EventTypes.MAINTENANCE_DISABLED,
    payload: { environmentId: string; teamId: string; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }

  emitDatabaseEvent(
    type:
      | typeof EventTypes.DATABASE_CREATED
      | typeof EventTypes.DATABASE_DELETED
      | typeof EventTypes.DATABASE_STATUS_CHANGED,
    payload: { databaseId: string; teamId: string; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }

  emitCronJobEvent(
    type:
      | typeof EventTypes.CRONJOB_COMPLETED
      | typeof EventTypes.CRONJOB_FAILED,
    payload: { cronJobId: string; executionId: string; [key: string]: unknown },
  ) {
    this.eventEmitter.emit(type, payload);
  }
}
