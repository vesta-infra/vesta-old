export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export enum DeploymentStatus {
  QUEUED = 'queued',
  BUILDING = 'building',
  DEPLOYING = 'deploying',
  RUNNING = 'running',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled',
}

export enum BuildMethod {
  NIXPACKS = 'nixpacks',
  DOCKERFILE = 'dockerfile',
  COMPOSE = 'compose',
  IMAGE = 'image',
}

export enum ServerAgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  INSTALLING = 'installing',
}

export enum SecretScope {
  GLOBAL = 'global',
  PROJECT = 'project',
  ENVIRONMENT = 'environment',
}

export enum SecretPermission {
  READ = 'read',
  WRITE = 'write',
  USE = 'use',
  MANAGE = 'manage',
}

export enum DatabaseEngine {
  POSTGRES = 'postgres',
  MYSQL = 'mysql',
  MONGO = 'mongo',
  REDIS = 'redis',
  CLICKHOUSE = 'clickhouse',
  MINIO = 'minio',
}

export enum SslStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ERROR = 'error',
}

export enum NotificationChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  DISCORD = 'discord',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
}

export enum BackupStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum CronConcurrencyPolicy {
  ALLOW = 'allow',
  FORBID = 'forbid',
  REPLACE = 'replace',
}

export enum CronJobExecutionStatus {
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  TIMED_OUT = 'timed_out',
}

export enum DeployHookPhase {
  PRE_DEPLOY = 'pre_deploy',
  POST_DEPLOY = 'post_deploy',
}

export enum LogStream {
  STDOUT = 'stdout',
  STDERR = 'stderr',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export enum AuditAction {
  DEPLOYMENT_CREATED = 'deployment.created',
  DEPLOYMENT_STARTED = 'deployment.started',
  DEPLOYMENT_SUCCEEDED = 'deployment.succeeded',
  DEPLOYMENT_FAILED = 'deployment.failed',
  DEPLOYMENT_ROLLED_BACK = 'deployment.rolled_back',
  SECRET_CREATED = 'secret.created',
  SECRET_UPDATED = 'secret.updated',
  SECRET_DELETED = 'secret.deleted',
  SECRET_ACCESSED = 'secret.accessed',
  SECRET_ROTATED = 'secret.rotated',
  SERVER_ADDED = 'server.added',
  SERVER_REMOVED = 'server.removed',
  SERVER_ONLINE = 'server.online',
  SERVER_OFFLINE = 'server.offline',
  EXEC_SESSION_STARTED = 'exec.session_started',
  EXEC_SESSION_ENDED = 'exec.session_ended',
  BACKUP_COMPLETED = 'backup.completed',
  BACKUP_FAILED = 'backup.failed',
  SCALING_CHANGED = 'scaling.changed',
  MAINTENANCE_ENABLED = 'maintenance.enabled',
  MAINTENANCE_DISABLED = 'maintenance.disabled',
  CRONJOB_COMPLETED = 'cronjob.completed',
  CRONJOB_FAILED = 'cronjob.failed',
}
