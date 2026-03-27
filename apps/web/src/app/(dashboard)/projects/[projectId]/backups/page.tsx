'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  HardDrive,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Clock,
  Calendar,
  Archive,
} from 'lucide-react';

const backupStatusConfig: Record<string, { variant: 'success' | 'destructive' | 'warning' | 'secondary'; label: string }> = {
  scheduled: { variant: 'secondary', label: 'Scheduled' },
  running: { variant: 'warning', label: 'Running' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'destructive', label: 'Failed' },
};

const scheduleSchema = z.object({
  cron_expression: z.string().min(1, 'Cron expression is required'),
  retention_days: z.coerce.number().min(1, 'Must keep at least 1 day').max(365),
  storage_destination_id: z.string().min(1, 'Destination is required'),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

function cronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  const [min, hour, dom, , dow] = parts;
  if (dom === '*' && dow === '*' && hour !== '*' && min !== '*') return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (dow !== '*' && dom === '*') return `Weekly on day ${dow} at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (dom !== '*') return `Monthly on day ${dom} at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (hour === '*' && min === '0') return 'Every hour';
  return cron;
}

function formatSize(bytes: number | string | null | undefined): string {
  if (bytes == null || bytes === '') return '—';
  const n = typeof bytes === 'string' ? Number(bytes) : bytes;
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!startedAt) return '—';
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function BackupsPage() {
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const queryClient = useQueryClient();
  const [scheduleDialogOpen, setScheduleDialogOpen] = React.useState(false);
  const [deleteBackupId, setDeleteBackupId] = React.useState<string | null>(null);

  const { data: databases } = useQuery({
    queryKey: ['databases', activeTeam?.id],
    queryFn: () => api.getDatabases(activeTeam!.id),
    enabled: !!activeTeam?.id,
  });

  const { data: storageDestinations } = useQuery({
    queryKey: ['storage-destinations', activeTeam?.id],
    queryFn: () => api.getStorageDestinations(activeTeam!.id),
    enabled: !!activeTeam?.id,
  });

  const backupResourceId = databases?.[0]?.id;
  const storageDestinationId = storageDestinations?.[0]?.id;

  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: ['backups', 'database', backupResourceId],
    queryFn: () => api.getBackups('database', backupResourceId!),
    enabled: !!backupResourceId,
  });

  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['backup-schedules', 'database', backupResourceId],
    queryFn: () => api.getBackupSchedules('database', backupResourceId!),
    enabled: !!backupResourceId,
  });

  const triggerMutation = useMutation({
    mutationFn: () =>
      api.createBackup(activeTeam!.id, {
        resource_type: 'database',
        resource_id: backupResourceId!,
        storage_destination_id: storageDestinationId!,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['backups', 'database', backupResourceId] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => api.restoreBackup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backups'] }),
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (id: string) => api.deleteBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      setDeleteBackupId(null);
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: (data: ScheduleFormData) =>
      api.createBackupSchedule({
        resource_type: 'database',
        resource_id: backupResourceId!,
        cron_expression: data.cron_expression,
        retention_days: data.retention_days,
        storage_destination_id: data.storage_destination_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-schedules'] });
      setScheduleDialogOpen(false);
      scheduleForm.reset();
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateBackupSchedule(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backup-schedules'] }),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id: string) => api.deleteBackupSchedule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backup-schedules'] }),
  });

  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { cron_expression: '0 2 * * *', retention_days: 7, storage_destination_id: '' },
  });

  React.useEffect(() => {
    const first = storageDestinations?.[0]?.id;
    if (first && !scheduleForm.getValues('storage_destination_id')) {
      scheduleForm.setValue('storage_destination_id', first);
    }
  }, [storageDestinations, scheduleForm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Backups</h2>
          <p className="text-sm text-muted-foreground">
            Manage backups and automated backup schedules
          </p>
        </div>
        <Button
          onClick={() => triggerMutation.mutate()}
          isLoading={triggerMutation.isPending}
          disabled={!activeTeam || !backupResourceId || !storageDestinationId}
        >
          <Play className="h-4 w-4" />
          Trigger Backup
        </Button>
      </div>

      <Tabs defaultValue="backups">
        <TabsList>
          <TabsTrigger value="backups">
            <Archive className="h-4 w-4" />
            Backups
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Calendar className="h-4 w-4" />
            Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backups">
          {backupsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : backups && backups.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup: any) => {
                    const status = backupStatusConfig[backup.status] || { variant: 'secondary' as const, label: backup.status };
                    return (
                      <TableRow key={backup.id} className="group">
                        <TableCell>
                          <Badge variant={status.variant}>
                            {backup.status === 'running' && (
                              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                            )}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium capitalize">{backup.resource_type}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono tabular-nums">{formatSize(backup.size_bytes)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {backup.started_at ? formatRelativeTime(backup.started_at) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono tabular-nums">
                            {backup.started_at ? formatDuration(backup.started_at, backup.finished_at) : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {backup.status === 'completed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => restoreMutation.mutate(backup.id)}
                                disabled={restoreMutation.isPending}
                                title="Restore"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-destructive hover:text-destructive"
                              onClick={() => setDeleteBackupId(backup.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <HardDrive className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No backups yet</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  Trigger a manual backup or set up an automated schedule.
                </p>
                <Button
                  onClick={() => triggerMutation.mutate()}
                  isLoading={triggerMutation.isPending}
                  disabled={!activeTeam || !backupResourceId || !storageDestinationId}
                >
                  <Play className="h-4 w-4" />
                  Trigger Backup
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="schedules">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => setScheduleDialogOpen(true)}
              disabled={!backupResourceId || !storageDestinations?.length}
            >
              <Plus className="h-4 w-4" />
              Add Schedule
            </Button>
          </div>

          {schedulesLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : schedules && schedules.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Cron Expression</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule: any) => (
                    <TableRow key={schedule.id} className="group">
                      <TableCell>
                        <span className="text-sm font-medium">{cronToHuman(schedule.cron_expression)}</span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs font-mono text-muted-foreground">{schedule.cron_expression}</code>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{schedule.retention_days} days</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={schedule.enabled}
                          onCheckedChange={(checked) =>
                            toggleScheduleMutation.mutate({ id: schedule.id, enabled: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                            disabled={deleteScheduleMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No schedules</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  Set up automated backup schedules to protect your data.
                </p>
                <Button
                  onClick={() => setScheduleDialogOpen(true)}
                  disabled={!backupResourceId || !storageDestinations?.length}
                >
                  <Plus className="h-4 w-4" />
                  Add Schedule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Backup Schedule</DialogTitle>
            <DialogDescription>
              Configure an automated backup schedule with retention policy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={scheduleForm.handleSubmit((data) => createScheduleMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cron Expression</label>
              <Input
                placeholder="0 2 * * *"
                className="font-mono"
                {...scheduleForm.register('cron_expression')}
                error={scheduleForm.formState.errors.cron_expression?.message}
              />
              <p className="text-xs text-muted-foreground">
                {cronToHuman(scheduleForm.watch('cron_expression') || '')}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Retention (days)</label>
              <Input
                type="number"
                min={1}
                max={365}
                {...scheduleForm.register('retention_days')}
                error={scheduleForm.formState.errors.retention_days?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Storage Destination</label>
              <Select
                value={scheduleForm.watch('storage_destination_id')}
                onValueChange={(v) => scheduleForm.setValue('storage_destination_id', v, { shouldValidate: true })}
                placeholder="Select destination..."
                error={scheduleForm.formState.errors.storage_destination_id?.message}
              >
                {storageDestinations?.map((d: { id: string; name: string }) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createScheduleMutation.isPending}>
                <Calendar className="h-4 w-4" />
                Create Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteBackupId} onOpenChange={(open) => !open && setDeleteBackupId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Backup</DialogTitle>
            <DialogDescription>
              This will permanently delete this backup. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBackupId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteBackupId && deleteBackupMutation.mutate(deleteBackupId)}
              isLoading={deleteBackupMutation.isPending}
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
