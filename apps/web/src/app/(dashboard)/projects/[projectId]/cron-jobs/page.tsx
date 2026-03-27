'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
import { formatRelativeTime } from '@/lib/utils';
import {
  Plus,
  Timer,
  Play,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
} from 'lucide-react';

const execStatusConfig: Record<string, { variant: 'success' | 'destructive' | 'warning' | 'secondary'; label: string }> = {
  running: { variant: 'warning', label: 'Running' },
  succeeded: { variant: 'success', label: 'Succeeded' },
  failed: { variant: 'destructive', label: 'Failed' },
  timed_out: { variant: 'warning', label: 'Timed Out' },
};

const concurrencyLabels: Record<string, string> = {
  allow: 'Allow',
  forbid: 'Forbid',
  replace: 'Replace',
};

const cronJobSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  command: z.string().min(1, 'Command is required'),
  schedule: z.string().min(1, 'Schedule is required'),
  timeout_seconds: z.coerce.number().min(1, 'Timeout must be at least 1s').max(86400),
  concurrency_policy: z.string().min(1, 'Concurrency policy is required'),
});

type CronJobFormData = z.infer<typeof cronJobSchema>;

function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, , dow] = parts;
  if (min === '*' && hour === '*') return 'Every minute';
  if (hour === '*' && min === '*/5') return 'Every 5 minutes';
  if (hour === '*' && min === '*/15') return 'Every 15 minutes';
  if (hour === '*' && min === '0') return 'Every hour';
  if (dom === '*' && dow === '*' && hour !== '*' && min !== '*') return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (dow !== '*' && dom === '*') return `Weekly on day ${dow}`;
  return cron;
}

export default function CronJobsPage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [expandedJobId, setExpandedJobId] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const { data: environments } = useQuery({
    queryKey: ['environments', params.projectId],
    queryFn: () => api.getEnvironments(params.projectId),
    enabled: !!params.projectId,
  });
  const envId = environments?.[0]?.id;

  const { data: cronJobs, isLoading } = useQuery({
    queryKey: ['cron-jobs', envId],
    queryFn: () => api.getCronJobs(envId!),
    enabled: !!envId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CronJobFormData) =>
      api.createCronJob(envId!, {
        name: data.name,
        command: data.command,
        schedule: data.schedule,
        timeout_seconds: data.timeout_seconds,
        concurrency_policy: data.concurrency_policy as 'allow' | 'forbid' | 'replace',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      setAddDialogOpen(false);
      form.reset();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateCronJob(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cron-jobs'] }),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => api.triggerCronJob(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cron-jobs'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCronJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      setDeleteConfirmId(null);
    },
  });

  const form = useForm<CronJobFormData>({
    resolver: zodResolver(cronJobSchema),
    defaultValues: {
      name: '',
      command: '',
      schedule: '*/5 * * * *',
      timeout_seconds: 300,
      concurrency_policy: 'forbid',
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Cron Jobs</h2>
          <p className="text-sm text-muted-foreground">
            Scheduled tasks that run as one-shot containers
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Cron Job
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : cronJobs && cronJobs.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Command</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Concurrency</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cronJobs.map((job: any) => {
                const isExpanded = expandedJobId === job.id;
                return (
                  <React.Fragment key={job.id}>
                    <TableRow className="group">
                      <TableCell>
                        <button
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="p-1 rounded hover:bg-muted transition-colors cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{job.name}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {job.command}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium">{cronToHuman(job.schedule)}</span>
                          <div>
                            <code className="text-[10px] font-mono text-muted-foreground">{job.schedule}</code>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {concurrencyLabels[job.concurrency_policy] || job.concurrency_policy}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={job.enabled}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: job.id, enabled: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => triggerMutation.mutate(job.id)}
                            disabled={triggerMutation.isPending}
                            title="Run Now"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(job.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30 p-0">
                          <ExecutionHistory jobId={job.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Timer className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No cron jobs</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Schedule recurring tasks that run as one-shot containers.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Cron Job
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cron Job</DialogTitle>
            <DialogDescription>
              Define a scheduled task that runs as a one-shot container.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. cleanup-temp-files"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Command</label>
              <Input
                placeholder="e.g. node scripts/cleanup.js"
                className="font-mono"
                {...form.register('command')}
                error={form.formState.errors.command?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule (cron expression)</label>
              <Input
                placeholder="*/5 * * * *"
                className="font-mono"
                {...form.register('schedule')}
                error={form.formState.errors.schedule?.message}
              />
              <p className="text-xs text-muted-foreground">
                {cronToHuman(form.watch('schedule') || '')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Timeout (seconds)</label>
                <Input
                  type="number"
                  min={1}
                  max={86400}
                  {...form.register('timeout_seconds')}
                  error={form.formState.errors.timeout_seconds?.message}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Concurrency Policy</label>
                <Select
                  value={form.watch('concurrency_policy')}
                  onValueChange={(v) => form.setValue('concurrency_policy', v, { shouldValidate: true })}
                  error={form.formState.errors.concurrency_policy?.message}
                >
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="forbid">Forbid</SelectItem>
                  <SelectItem value="replace">Replace</SelectItem>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                <Timer className="h-4 w-4" />
                Create Job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Cron Job</DialogTitle>
            <DialogDescription>
              This will permanently delete this cron job and all its execution history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              isLoading={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExecutionHistory({ jobId }: { jobId: string }) {
  const { data: executions, isLoading } = useQuery({
    queryKey: ['cron-executions', jobId],
    queryFn: () => api.getCronJobExecutions(jobId),
    enabled: !!jobId,
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-xs text-muted-foreground">No executions yet</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left px-3 py-1.5 font-medium">Status</th>
            <th className="text-left px-3 py-1.5 font-medium">Exit Code</th>
            <th className="text-left px-3 py-1.5 font-medium">Duration</th>
            <th className="text-left px-3 py-1.5 font-medium">Started</th>
          </tr>
        </thead>
        <tbody>
          {executions.map((exec: any) => {
            const status = execStatusConfig[exec.status] || { variant: 'secondary' as const, label: exec.status };
            return (
              <tr key={exec.id} className="border-t border-border/50">
                <td className="px-3 py-1.5">
                  <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                    {exec.status === 'running' && (
                      <span className="mr-1 inline-block h-1 w-1 rounded-full bg-current animate-pulse" />
                    )}
                    {status.label}
                  </Badge>
                </td>
                <td className="px-3 py-1.5">
                  <code className="font-mono tabular-nums">{exec.exit_code ?? '—'}</code>
                </td>
                <td className="px-3 py-1.5">
                  <span className="font-mono tabular-nums text-muted-foreground">
                    {exec.duration_ms == null ? '—' : `${(exec.duration_ms / 1000).toFixed(1)}s`}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {exec.started_at ? formatRelativeTime(exec.started_at) : '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
