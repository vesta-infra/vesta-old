'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatRelativeTime } from '@/lib/utils';
import {
  GitBranch,
  Rocket,
  Layers,
  Settings,
  ExternalLink,
  Clock,
  Activity,
  Box,
} from 'lucide-react';
import Link from 'next/link';

function formatDeploymentDuration(deployment: {
  started_at?: string | Date | null;
  finished_at?: string | Date | null;
}): string | null {
  const start = deployment.started_at != null ? new Date(deployment.started_at).getTime() : null;
  const end = deployment.finished_at != null ? new Date(deployment.finished_at).getTime() : null;
  if (start == null || end == null || end < start) return null;
  const sec = Math.round((end - start) / 1000);
  return `${sec}s`;
}

const statusConfig: Record<string, { variant: 'success' | 'destructive' | 'warning' | 'secondary'; label: string }> = {
  running: { variant: 'success', label: 'Running' },
  failed: { variant: 'destructive', label: 'Failed' },
  building: { variant: 'warning', label: 'Building' },
  deploying: { variant: 'warning', label: 'Deploying' },
  queued: { variant: 'secondary', label: 'Queued' },
  rolled_back: { variant: 'warning', label: 'Rolled Back' },
};

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const activeTeam = useTeamStore((s) => s.activeTeam);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', params.projectId],
    queryFn: () => api.getProject(activeTeam!.id, params.projectId),
    enabled: !!activeTeam,
  });

  const { data: environments, isLoading: envsLoading } = useQuery({
    queryKey: ['environments', params.projectId],
    queryFn: () => api.getEnvironments(params.projectId),
    enabled: !!params.projectId,
  });

  const firstEnvId = environments?.[0]?.id;

  const { data: deploymentsRes } = useQuery({
    queryKey: ['project-deployments', params.projectId, firstEnvId],
    queryFn: () => api.getDeployments(firstEnvId!, 1),
    enabled: !!params.projectId && !!firstEnvId,
  });

  const latestDeployment = deploymentsRes?.data?.[0];
  const latestDeploymentDuration = latestDeployment
    ? formatDeploymentDuration(latestDeployment)
    : null;

  if (projectLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Project Details</CardTitle>
            <Link href={`/projects/${params.projectId}/settings`}>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
                Edit
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Build Method</p>
                <div className="flex items-center gap-2">
                  <Box className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{project?.build_method || 'Nixpacks'}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Repository</p>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium font-mono truncate">
                    {project?.git_url || 'Not configured'}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Branch</p>
                <span className="text-sm font-medium font-mono">{project?.default_branch || 'main'}</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</p>
                <span className="text-sm font-medium">
                  {project?.created_at ? formatRelativeTime(project.created_at) : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Environments</CardTitle>
            <Link href={`/projects/${params.projectId}/environments`}>
              <Button variant="ghost" size="sm">
                View all
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {envsLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : environments && environments.length > 0 ? (
              <div className="space-y-2">
                {environments.map((env: any) => (
                    <div
                      key={env.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <Layers className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{env.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {env.replicas || 1} replica{(env.replicas || 1) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Idle</Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No environments configured yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full justify-start"
              onClick={() => router.push(`/projects/${params.projectId}/deployments`)}
            >
              <Rocket className="h-4 w-4" />
              Deploy Now
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push(`/projects/${params.projectId}/environments`)}
            >
              <Layers className="h-4 w-4" />
              Manage Environments
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push(`/projects/${params.projectId}/settings`)}
            >
              <Settings className="h-4 w-4" />
              Project Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Deployment</CardTitle>
          </CardHeader>
          <CardContent>
            {latestDeployment ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={statusConfig[latestDeployment.status]?.variant || 'secondary'}>
                    {statusConfig[latestDeployment.status]?.label || latestDeployment.status}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatRelativeTime(latestDeployment.created_at)}
                  </span>
                </div>
                <Separator />
                {latestDeployment.commit_sha && (
                  <div className="flex items-center gap-2 text-xs">
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                    <code className="font-mono text-muted-foreground">
                      {latestDeployment.commit_sha.slice(0, 7)}
                    </code>
                    {latestDeployment.commit_message && (
                      <span className="text-muted-foreground truncate">
                        {latestDeployment.commit_message}
                      </span>
                    )}
                  </div>
                )}
                {latestDeploymentDuration && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                    Duration: {latestDeploymentDuration}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No deployments yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
