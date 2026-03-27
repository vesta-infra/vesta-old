import {
  TeamRole,
  DeploymentStatus,
  BuildMethod,
  SecretScope,
  SecretPermission,
  DatabaseEngine,
  BackupStatus,
} from './enums';

export interface JwtPayload {
  sub: string;
  email: string;
  teamId?: string;
  role?: TeamRole;
  iat?: number;
  exp?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

export interface DeploymentSummary {
  id: string;
  status: DeploymentStatus;
  commitSha?: string;
  commitMessage?: string;
  imageTag?: string;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface ServerMetrics {
  cpuUsagePercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskUsedGb: number;
  diskTotalGb: number;
  networkInBytes: number;
  networkOutBytes: number;
  timestamp: string;
}

export interface SecretAclEntry {
  granteeType: 'user' | 'role' | 'api_token';
  granteeId: string;
  permissions: SecretPermission[];
}
