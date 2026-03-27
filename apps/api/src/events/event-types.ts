export const EventTypes = {
  DEPLOYMENT_QUEUED: 'deployment.queued',
  DEPLOYMENT_STARTED: 'deployment.started',
  DEPLOYMENT_SUCCEEDED: 'deployment.succeeded',
  DEPLOYMENT_FAILED: 'deployment.failed',
  DEPLOYMENT_ROLLED_BACK: 'deployment.rolled_back',
  DEPLOYMENT_CANCELLED: 'deployment.cancelled',

  SECRET_CREATED: 'secret.created',
  SECRET_UPDATED: 'secret.updated',
  SECRET_DELETED: 'secret.deleted',
  SECRET_ACCESSED: 'secret.accessed',
  SECRET_ROTATED: 'secret.rotated',

  SERVER_ADDED: 'server.added',
  SERVER_REMOVED: 'server.removed',
  SERVER_ONLINE: 'server.online',
  SERVER_OFFLINE: 'server.offline',

  BACKUP_STARTED: 'backup.started',
  BACKUP_COMPLETED: 'backup.completed',
  BACKUP_FAILED: 'backup.failed',

  SCALING_CHANGED: 'scaling.changed',
  SCALING_AUTO_TRIGGERED: 'scaling.auto_triggered',

  MAINTENANCE_ENABLED: 'maintenance.enabled',
  MAINTENANCE_DISABLED: 'maintenance.disabled',

  DATABASE_CREATED: 'database.created',
  DATABASE_DELETED: 'database.deleted',
  DATABASE_STATUS_CHANGED: 'database.status_changed',

  CRONJOB_COMPLETED: 'cronjob.completed',
  CRONJOB_FAILED: 'cronjob.failed',

  EXEC_SESSION_STARTED: 'exec.session_started',
  EXEC_SESSION_ENDED: 'exec.session_ended',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
