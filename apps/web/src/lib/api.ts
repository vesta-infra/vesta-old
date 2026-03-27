const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || 'Request failed');
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  login(email: string, password: string) {
    return this.request<{ accessToken: string; refreshToken: string }>(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    );
  }

  register(name: string, email: string, password: string) {
    return this.request<{ accessToken: string; refreshToken: string }>(
      '/api/auth/register',
      { method: 'POST', body: JSON.stringify({ name, email, password }) },
    );
  }

  getMe() {
    return this.request<{ id: string; email: string; name: string }>(
      '/api/users/me',
    );
  }

  updateProfile(data: any) {
    return this.request<any>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  getTeams() {
    return this.request<any[]>('/api/teams');
  }

  createTeam(name: string) {
    return this.request<any>('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  getProjects(teamId: string) {
    return this.request<any[]>(`/api/teams/${teamId}/projects`);
  }

  createProject(teamId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getServers(teamId: string) {
    return this.request<any[]>(`/api/teams/${teamId}/servers`);
  }

  createServer(teamId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/servers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getServer(_teamId: string, serverId: string) {
    return this.request<any>(`/api/servers/${serverId}`);
  }

  updateServer(_teamId: string, serverId: string, data: any) {
    return this.request<any>(`/api/servers/${serverId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteServer(_teamId: string, serverId: string) {
    return this.request<void>(`/api/servers/${serverId}`, {
      method: 'DELETE',
    });
  }

  getServerMetrics(serverId: string) {
    return this.request<any>(`/api/servers/${serverId}/metrics`);
  }

  getTeamMembers(teamId: string) {
    return this.request<any[]>(`/api/teams/${teamId}/members`);
  }

  inviteMember(teamId: string, data: { email: string; role: string }) {
    return this.request<any>(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateMemberRole(teamId: string, memberId: string, data: { role: string }) {
    return this.request<any>(`/api/teams/${teamId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  removeMember(teamId: string, memberId: string) {
    return this.request<void>(`/api/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    });
  }

  getProject(teamId: string, projectId: string) {
    return this.request<any>(`/api/teams/${teamId}/projects/${projectId}`);
  }

  updateProject(teamId: string, projectId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteProject(teamId: string, projectId: string) {
    return this.request<void>(`/api/teams/${teamId}/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  getEnvironments(projectId: string) {
    return this.request<any[]>(`/api/projects/${projectId}/environments`);
  }

  createEnvironment(projectId: string, data: any) {
    return this.request<any>(`/api/projects/${projectId}/environments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateEnvironment(id: string, data: any) {
    return this.request<any>(`/api/environments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  updateScale(envId: string, replicas: number) {
    return this.request<any>(`/api/environments/${envId}/scale`, {
      method: 'POST',
      body: JSON.stringify({ replicas }),
    });
  }

  getDeployments(envId: string, page?: number) {
    const params = page ? `?page=${page}` : '';
    return this.request<{ data: any[]; total: number; page: number }>(
      `/api/environments/${envId}/deployments${params}`,
    );
  }

  createDeployment(envId: string, data: any) {
    return this.request<any>(`/api/environments/${envId}/deployments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  rollbackDeployment(id: string) {
    return this.request<any>(`/api/deployments/${id}/rollback`, {
      method: 'POST',
    });
  }

  cancelDeployment(id: string) {
    return this.request<any>(`/api/deployments/${id}/cancel`, {
      method: 'POST',
    });
  }

  getSecrets(scope: string, scopeId: string) {
    return this.request<any[]>(`/api/secrets?scope=${scope}&scopeId=${scopeId}`);
  }

  createSecret(data: any) {
    return this.request<any>('/api/secrets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSecret(id: string, data: any) {
    return this.request<any>(`/api/secrets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteSecret(id: string) {
    return this.request<void>(`/api/secrets/${id}`, {
      method: 'DELETE',
    });
  }

  rotateSecret(id: string) {
    return this.request<any>(`/api/secrets/${id}/rotate`, {
      method: 'POST',
    });
  }

  getDomains(projectId: string) {
    return this.request<any[]>(`/api/projects/${projectId}/domains`);
  }

  createDomain(projectId: string, data: any) {
    return this.request<any>(`/api/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteDomain(id: string) {
    return this.request<void>(`/api/domains/${id}`, {
      method: 'DELETE',
    });
  }

  getHooks(envId: string) {
    return this.request<any[]>(`/api/environments/${envId}/hooks`);
  }

  createHook(envId: string, data: any) {
    return this.request<any>(`/api/environments/${envId}/hooks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateHook(id: string, data: any) {
    return this.request<any>(`/api/hooks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteHook(id: string) {
    return this.request<void>(`/api/hooks/${id}`, {
      method: 'DELETE',
    });
  }

  getServiceLinks(projectId: string) {
    return this.request<any[]>(`/api/projects/${projectId}/service-links`);
  }

  createServiceLink(projectId: string, data: any) {
    return this.request<any>(`/api/projects/${projectId}/service-links`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteServiceLink(id: string) {
    return this.request<void>(`/api/service-links/${id}`, {
      method: 'DELETE',
    });
  }

  getDependencyGraph(teamId: string) {
    return this.request<any>(`/api/teams/${teamId}/dependency-graph`);
  }

  getResourceLimits(envId: string) {
    return this.request<any>(`/api/environments/${envId}/resource-limits`);
  }

  setResourceLimits(envId: string, data: any) {
    return this.request<any>(`/api/environments/${envId}/resource-limits`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  getTeamQuota(teamId: string) {
    return this.request<any>(`/api/teams/${teamId}/quota`);
  }

  getTeamUsage(teamId: string) {
    return this.request<any>(`/api/teams/${teamId}/usage`);
  }

  // Databases
  getDatabases(teamId: string) {
    return this.request<any[]>(`/api/teams/${teamId}/databases`);
  }

  createDatabase(teamId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/databases`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getDatabase(id: string) {
    return this.request<any>(`/api/databases/${id}`);
  }

  deleteDatabase(id: string) {
    return this.request<void>(`/api/databases/${id}`, {
      method: 'DELETE',
    });
  }

  // Backups
  getBackups(resourceType: string, resourceId: string) {
    return this.request<any[]>(`/api/backups?resourceType=${resourceType}&resourceId=${resourceId}`);
  }

  createBackup(teamId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/backups`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteBackup(id: string) {
    return this.request<void>(`/api/backups/${id}`, {
      method: 'DELETE',
    });
  }

  restoreBackup(id: string, targetId?: string) {
    return this.request<any>(`/api/backups/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    });
  }

  getBackupSchedules(resourceType: string, resourceId: string) {
    return this.request<any[]>(`/api/backup-schedules?resourceType=${resourceType}&resourceId=${resourceId}`);
  }

  createBackupSchedule(data: any) {
    return this.request<any>('/api/backup-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateBackupSchedule(id: string, data: any) {
    return this.request<any>(`/api/backup-schedules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteBackupSchedule(id: string) {
    return this.request<void>(`/api/backup-schedules/${id}`, {
      method: 'DELETE',
    });
  }

  getStorageDestinations(teamId: string) {
    return this.request<any[]>(`/api/teams/${teamId}/storage-destinations`);
  }

  createStorageDestination(teamId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/storage-destinations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  deleteStorageDestination(id: string) {
    return this.request<void>(`/api/storage-destinations/${id}`, {
      method: 'DELETE',
    });
  }

  testStorageDestination(id: string) {
    return this.request<any>(`/api/storage-destinations/${id}/test`, {
      method: 'POST',
    });
  }

  // Cron Jobs
  getCronJobs(envId: string) {
    return this.request<any[]>(`/api/environments/${envId}/cron-jobs`);
  }

  createCronJob(envId: string, data: any) {
    return this.request<any>(`/api/environments/${envId}/cron-jobs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCronJob(id: string, data: any) {
    return this.request<any>(`/api/cron-jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteCronJob(id: string) {
    return this.request<void>(`/api/cron-jobs/${id}`, {
      method: 'DELETE',
    });
  }

  triggerCronJob(id: string) {
    return this.request<any>(`/api/cron-jobs/${id}/trigger`, {
      method: 'POST',
    });
  }

  getCronJobExecutions(id: string) {
    return this.request<any[]>(`/api/cron-jobs/${id}/executions`);
  }

  // Logs
  searchLogs(envId: string, params: any) {
    const query = new URLSearchParams(params).toString();
    return this.request<{ data: any[]; total: number }>(`/api/environments/${envId}/logs?${query}`);
  }

  exportLogs(envId: string, params: any) {
    const query = new URLSearchParams(params).toString();
    return this.request<Blob>(`/api/environments/${envId}/logs/export?${query}`);
  }

  getLogRetention(envId: string) {
    return this.request<any>(`/api/environments/${envId}/log-retention`);
  }

  setLogRetention(envId: string, data: any) {
    return this.request<any>(`/api/environments/${envId}/log-retention`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Maintenance
  getMaintenance(envId: string) {
    return this.request<any>(`/api/environments/${envId}/maintenance`);
  }

  updateMaintenance(envId: string, data: any) {
    return this.request<any>(`/api/environments/${envId}/maintenance`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  toggleMaintenance(envId: string) {
    return this.request<any>(`/api/environments/${envId}/maintenance/toggle`, {
      method: 'POST',
    });
  }

  // Webhooks
  getWebhooks(teamId: string) {
    return this.request<any[]>(`/api/teams/${teamId}/webhooks`);
  }

  createWebhook(teamId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/webhooks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateWebhook(id: string, data: any) {
    return this.request<any>(`/api/webhooks/outbound/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteWebhook(id: string) {
    return this.request<void>(`/api/webhooks/outbound/${id}`, {
      method: 'DELETE',
    });
  }

  testWebhook(id: string) {
    return this.request<any>(`/api/webhooks/outbound/${id}/test`, {
      method: 'POST',
    });
  }

  getWebhookDeliveries(id: string) {
    return this.request<any[]>(`/api/webhooks/outbound/${id}/deliveries`);
  }

  // Activity
  getTeamActivity(teamId: string, params?: any) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<{ data: any[]; total: number }>(`/api/teams/${teamId}/activity${query}`);
  }

  getProjectActivity(projectId: string, params?: any) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<{ data: any[]; total: number }>(`/api/projects/${projectId}/activity${query}`);
  }

  // Notifications
  getNotificationChannels(teamId: string) {
    return this.request<any[]>(`/api/teams/${teamId}/notifications`);
  }

  createNotificationChannel(teamId: string, data: any) {
    return this.request<any>(`/api/teams/${teamId}/notifications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateNotificationChannel(id: string, data: any) {
    return this.request<any>(`/api/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  deleteNotificationChannel(id: string) {
    return this.request<void>(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  testNotificationChannel(id: string) {
    return this.request<any>(`/api/notifications/${id}/test`, {
      method: 'POST',
    });
  }
}

export const api = new ApiClient(API_URL);
