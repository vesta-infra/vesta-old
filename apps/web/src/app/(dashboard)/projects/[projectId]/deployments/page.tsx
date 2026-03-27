'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDeploymentLogs } from '@/hooks/use-socket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectItem } from '@/components/ui/select';
import { formatRelativeTime } from '@/lib/utils';
import {
  Rocket,
  RotateCcw,
  XCircle,
  Clock,
  GitCommit,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const statusConfig: Record<string, { variant: 'success' | 'destructive' | 'warning' | 'secondary'; label: string; color: string }> = {
  queued: { variant: 'secondary', label: 'Queued', color: 'text-muted-foreground' },
  building: { variant: 'warning', label: 'Building', color: 'text-warning' },
  deploying: { variant: 'warning', label: 'Deploying', color: 'text-primary' },
  running: { variant: 'success', label: 'Running', color: 'text-success' },
  failed: { variant: 'destructive', label: 'Failed', color: 'text-destructive' },
  rolled_back: { variant: 'warning', label: 'Rolled Back', color: 'text-warning' },
  cancelled: { variant: 'secondary', label: 'Cancelled', color: 'text-muted-foreground' },
};

export default function DeploymentsPage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [deployDialogOpen, setDeployDialogOpen] = React.useState(false);
  const [selectedEnvId, setSelectedEnvId] = React.useState('');
  const [logsDeploymentId, setLogsDeploymentId] = React.useState<string | null>(null);

  const { data: environments } = useQuery({
    queryKey: ['environments', params.projectId],
    queryFn: () => api.getEnvironments(params.projectId),
    enabled: !!params.projectId,
  });

  const envNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const e of environments ?? []) {
      map.set(e.id, e.name);
    }
    return map;
  }, [environments]);

  const firstEnvId = environments?.[0]?.id;

  const { data: deploymentsRes, isLoading } = useQuery({
    queryKey: ['project-deployments', params.projectId, page, firstEnvId],
    queryFn: () => api.getDeployments(firstEnvId!, page),
    enabled: !!params.projectId && !!firstEnvId,
  });

  const deployMutation = useMutation({
    mutationFn: () => api.createDeployment(selectedEnvId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-deployments'] });
      setDeployDialogOpen(false);
      setSelectedEnvId('');
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (id: string) => api.rollbackDeployment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-deployments'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelDeployment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-deployments'] }),
  });

  const deployments = deploymentsRes?.data || [];
  const total = deploymentsRes?.total || 0;
  const totalPages = Math.ceil(total / 20);

  function formatDuration(started_at: string, finished_at?: string) {
    if (!started_at) return '—';
    const start = new Date(started_at).getTime();
    const end = finished_at ? new Date(finished_at).getTime() : Date.now();
    const seconds = Math.floor((end - start) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Deployments</h2>
          <p className="text-sm text-muted-foreground">
            View and manage deployment history
          </p>
        </div>
        <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
          <Button onClick={() => setDeployDialogOpen(true)}>
            <Rocket className="h-4 w-4" />
            Deploy Now
          </Button>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>New Deployment</DialogTitle>
              <DialogDescription>
                Select an environment to deploy to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Environment</label>
                <Select
                  value={selectedEnvId}
                  onValueChange={setSelectedEnvId}
                  placeholder="Select environment..."
                >
                  {environments?.map((env: any) => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => deployMutation.mutate()}
                disabled={!selectedEnvId}
                isLoading={deployMutation.isPending}
              >
                <Rocket className="h-4 w-4" />
                Deploy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : deployments.length > 0 ? (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deployments.map((deploy: any) => {
                  const status = statusConfig[deploy.status] || { variant: 'secondary' as const, label: deploy.status, color: '' };
                  const canCancel = ['queued', 'building'].includes(deploy.status);
                  const canRollback = ['running', 'failed'].includes(deploy.status);

                  return (
                    <TableRow key={deploy.id} className="group">
                      <TableCell>
                        <Badge variant={status.variant}>
                          {['building', 'deploying'].includes(deploy.status) && (
                            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                          )}
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {deploy.commit_sha ? (
                          <div className="flex items-center gap-2">
                            <GitCommit className="h-3.5 w-3.5 text-muted-foreground" />
                            <code className="text-xs font-mono">{deploy.commit_sha.slice(0, 7)}</code>
                            {deploy.commit_message && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {deploy.commit_message}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Manual deploy</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium">
                          {deploy.environment?.name ??
                            (deploy.environment_id
                              ? envNameById.get(deploy.environment_id)
                              : undefined) ??
                            '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {deploy.started_at ? formatRelativeTime(deploy.started_at) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono tabular-nums">
                          {deploy.started_at
                            ? formatDuration(deploy.started_at, deploy.finished_at)
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setLogsDeploymentId(deploy.id)}
                          >
                            <Terminal className="h-3.5 w-3.5" />
                          </Button>
                          {canRollback && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => rollbackMutation.mutate(deploy.id)}
                              disabled={rollbackMutation.isPending}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => cancelMutation.mutate(deploy.id)}
                              disabled={cancelMutation.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {deployments.length} of {total} deployments
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm font-medium tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No deployments yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Trigger your first deployment to get started.
            </p>
            <Button onClick={() => setDeployDialogOpen(true)}>
              <Rocket className="h-4 w-4" />
              Deploy Now
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!logsDeploymentId} onOpenChange={(open) => !open && setLogsDeploymentId(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Deployment Logs</DialogTitle>
            <DialogDescription>
              Real-time logs for this deployment.
            </DialogDescription>
          </DialogHeader>
          <DeploymentLogViewer deploymentId={logsDeploymentId} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDeploymentId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDeployLogColor(line: string): string {
  if (line.startsWith('[status]')) return 'text-blue-400 py-0.5';
  if (line.startsWith('==>')) return 'text-cyan-400 font-bold py-1';
  if (line.startsWith('Error')) return 'text-red-400 py-0.5';
  return 'text-green-400 py-0.5';
}

function DeploymentLogViewer({ deploymentId }: Readonly<{ deploymentId: string | null }>) {
  const { lines, isStreaming } = useDeploymentLogs(deploymentId);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div
      ref={scrollRef}
      className="rounded-lg bg-[#0c0a09] p-4 font-mono text-xs h-80 overflow-y-auto"
    >
      {lines.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          {isStreaming ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
              {' '}Waiting for logs...
            </>
          ) : (
            'No logs available for this deployment.'
          )}
        </div>
      ) : (
        lines.map((line, i) => (
          <div key={`log-${i}`} className={getDeployLogColor(line)}>
            {line}
          </div>
        ))
      )}
      {isStreaming && lines.length > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground mt-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          {' '}Streaming...
        </div>
      )}
    </div>
  );
}
