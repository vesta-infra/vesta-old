export const DEFAULT_REPLICAS = 1;
export const MAX_REPLICAS = 100;

export const DEFAULT_API_PORT = 3001;
export const DEFAULT_GRPC_PORT = 50051;

export const JWT_DEFAULT_EXPIRATION = '15m';
export const JWT_DEFAULT_REFRESH_EXPIRATION = '7d';

export const RATE_LIMIT_AUTH_MAX = 10;
export const RATE_LIMIT_AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export const EXEC_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export const BACKUP_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const SECRET_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const ARGON2_TIME_COST = 3;
export const ARGON2_MEMORY_COST = 65536; // 64 MB
export const ARGON2_PARALLELISM = 4;

export const WEBHOOK_MAX_RETRIES = 5;
export const WEBHOOK_RETRY_DELAYS_MS = [1000, 5000, 30000, 300000, 900000];

export const LOG_RETENTION_DEFAULT_DAYS = 30;
