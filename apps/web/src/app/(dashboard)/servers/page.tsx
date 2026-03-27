'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Plus,
  Server,
  ServerCrash,
} from 'lucide-react';

const serverSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535).default(22),
});

type ServerFormData = z.infer<typeof serverSchema>;

function UsageBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color =
    pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-primary';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ServersPage() {
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: servers, isLoading } = useQuery({
    queryKey: ['servers', activeTeam?.id],
    queryFn: () => api.getServers(activeTeam!.id),
    enabled: !!activeTeam,
  });

  const createMutation = useMutation({
    mutationFn: (data: ServerFormData) => {
      if (!activeTeam) throw new Error('No active team');
      return api.createServer(activeTeam.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      setDialogOpen(false);
      form.reset();
    },
  });

  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: { name: '', host: '', port: 22 },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your infrastructure and connected servers
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!activeTeam}>
          <Plus className="h-4 w-4" />
          Add Server
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-2 w-full rounded bg-muted" />
                  <div className="h-2 w-full rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : servers && servers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server: any) => {
            const isOnline = server.agent_status === 'online';
            return (
              <Link key={server.id} href={`/servers/${server.id}`}>
                <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer h-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-lg',
                          isOnline ? 'bg-success/10' : 'bg-muted',
                        )}
                      >
                        <Server
                          className={cn(
                            'h-4.5 w-4.5',
                            isOnline ? 'text-success' : 'text-muted-foreground',
                          )}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{server.name}</CardTitle>
                          {server.is_local && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Local
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {server.host}
                          {server.cpu_cores && (
                            <span className="ml-2 text-muted-foreground/60">
                              {server.cpu_cores} cores &middot; {server.memory_mb ? `${(server.memory_mb / 1024).toFixed(0)} GB` : ''}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isOnline ? 'success' : 'secondary'}>
                      <span
                        className={cn(
                          'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                          isOnline ? 'bg-success animate-pulse' : 'bg-muted-foreground',
                        )}
                      />
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {server.metrics ? (
                      <>
                        <UsageBar value={server.metrics.cpuUsagePercent} max={100} label="CPU" />
                        <UsageBar value={server.metrics.memoryUsedMb} max={server.metrics.memoryTotalMb} label="Memory" />
                        <UsageBar value={server.metrics.diskUsedGb} max={server.metrics.diskTotalGb} label="Disk" />
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">
                        {isOnline ? 'Collecting metrics...' : 'Server is offline'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <ServerCrash className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No servers connected</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Connect your first server to start deploying applications. Install the Vesta agent on any Linux server.
            </p>
            <Button onClick={() => setDialogOpen(true)} disabled={!activeTeam}>
              <Plus className="h-4 w-4" />
              Add your first server
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Server</DialogTitle>
            <DialogDescription>
              Connect a new server by providing its SSH connection details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <Input
                placeholder="production-1"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Host <span className="text-destructive">*</span></label>
              <Input
                placeholder="192.168.1.100 or server.example.com"
                className="font-mono"
                {...form.register('host')}
                error={form.formState.errors.host?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SSH Port</label>
              <Input
                type="number"
                placeholder="22"
                className="font-mono"
                {...form.register('port')}
                error={form.formState.errors.port?.message}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {(createMutation.error as any)?.message || 'Failed to add server.'}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                <Server className="h-4 w-4" />
                Add Server
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
