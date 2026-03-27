'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Server,
  Activity,
  Tag,
  Save,
  Trash2,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';

const serverSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535),
});

type ServerFormData = z.infer<typeof serverSchema>;

function UsageBar({ value, max, label, unit }: { value: number; max: number; label: string; unit?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color =
    pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-primary';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value.toFixed(1)}{unit ? ` ${unit}` : '%'} / {max.toFixed(1)}{unit ? ` ${unit}` : '%'}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right tabular-nums">{pct.toFixed(1)}% used</p>
    </div>
  );
}

export default function ServerDetailPage() {
  const params = useParams<{ serverId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

  const { data: server, isLoading } = useQuery({
    queryKey: ['server', params.serverId],
    queryFn: () => api.getServer(activeTeam!.id, params.serverId),
    enabled: !!activeTeam,
  });

  const updateMutation = useMutation({
    mutationFn: (data: ServerFormData) =>
      api.updateServer(activeTeam!.id, params.serverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', params.serverId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteServer(activeTeam!.id, params.serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      router.push('/servers');
    },
  });

  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    values: {
      name: server?.name || '',
      host: server?.host || '',
      port: server?.port || 22,
    },
  });

  const isOnline = server?.agent_status === 'online';

  const metrics = server?.metrics as
    | {
        cpu_usage_percent?: number;
        cpu_usage?: number;
        memory_used_mb?: number;
        memory_total_mb?: number;
        disk_used_gb?: number;
        disk_total_gb?: number;
      }
    | undefined;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/servers"
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                isOnline ? 'bg-success/10' : 'bg-muted',
              )}
            >
              <Server
                className={cn('h-5 w-5', isOnline ? 'text-success' : 'text-muted-foreground')}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {server?.name || 'Server'}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">{server?.host}</p>
            </div>
          </div>
        </div>
        <Badge variant={isOnline ? 'success' : 'secondary'} className="text-sm">
          {isOnline ? (
            <Wifi className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Server Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Server Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Host</p>
                  <p className="text-sm font-mono font-medium">{server?.host}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">SSH Port</p>
                  <p className="text-sm font-mono font-medium">{server?.port || 22}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Status</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-block h-2 w-2 rounded-full',
                        isOnline ? 'bg-success animate-pulse' : 'bg-muted-foreground',
                      )}
                    />
                    <span className="text-sm font-medium capitalize">{server?.agent_status || 'unknown'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Agent Version</p>
                  <p className="text-sm font-mono font-medium">{server?.agent_version || '—'}</p>
                </div>
              </div>

              {server?.tags && server.tags.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {server.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resource Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Resource Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {metrics ? (
                <>
                  <UsageBar
                    value={metrics.cpu_usage_percent ?? metrics.cpu_usage ?? 0}
                    max={100}
                    label="CPU"
                  />
                  <UsageBar
                    value={metrics.memory_used_mb ?? 0}
                    max={metrics.memory_total_mb ?? 1}
                    label="Memory"
                    unit="MB"
                  />
                  <UsageBar
                    value={metrics.disk_used_gb ?? 0}
                    max={metrics.disk_total_gb ?? 1}
                    label="Disk"
                    unit="GB"
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No metrics available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Edit Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    {...form.register('name')}
                    error={form.formState.errors.name?.message}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Host</label>
                  <Input
                    className="font-mono"
                    {...form.register('host')}
                    error={form.formState.errors.host?.message}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SSH Port</label>
                  <Input
                    type="number"
                    className="font-mono"
                    {...form.register('port')}
                    error={form.formState.errors.port?.message}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  isLoading={updateMutation.isPending}
                  disabled={!form.formState.isDirty}
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Remove this server from your team. Running containers will not be affected.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Remove Server
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Remove Server</DialogTitle>
            <DialogDescription>
              This will disconnect the server from Vesta. Running containers will not be stopped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <code className="font-mono text-xs text-destructive">{server?.name}</code> to confirm
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={server?.name}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== server?.name}
              onClick={() => deleteMutation.mutate()}
              isLoading={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Remove Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
