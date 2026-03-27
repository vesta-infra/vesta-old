'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { useDatabaseLogs } from '@/hooks/use-socket';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem } from '@/components/ui/select';
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
  Plus,
  Database,
  Trash2,
  Server,
  Plug,
  Terminal,
} from 'lucide-react';

const engineConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  postgres: { label: 'PostgreSQL', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-500/10' },
  mysql: { label: 'MySQL', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-500/10' },
  redis: { label: 'Redis', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-500/10' },
  mongo: { label: 'MongoDB', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-500/10' },
};

const statusVariant: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  running: 'success',
  stopped: 'secondary',
  error: 'destructive',
  provisioning: 'warning',
};

const createDbSchema = z.object({
  name: z.string().min(1, 'Name is required').regex(/^[a-z][a-z0-9-]*$/, 'Lowercase letters, numbers, and hyphens only'),
  engine: z.string().min(1, 'Engine is required'),
  version: z.string().min(1, 'Version is required'),
  server_id: z.string().min(1, 'Server is required'),
});

type CreateDbFormData = z.infer<typeof createDbSchema>;

const versionsByEngine: Record<string, string[]> = {
  postgres: ['16', '15', '14', '13'],
  mysql: ['8.4', '8.0', '5.7'],
  redis: ['7.2', '7.0', '6.2'],
  mongo: ['7.0', '6.0', '5.0'],
};

export default function DatabasesPage() {
  const queryClient = useQueryClient();
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [logsDbId, setLogsDbId] = React.useState<string | null>(null);

  const { data: databases, isLoading } = useQuery({
    queryKey: ['databases', activeTeam?.id],
    queryFn: () => api.getDatabases(activeTeam!.id),
    enabled: !!activeTeam,
    refetchInterval: (query) => {
      const dbs = query.state.data as any[] | undefined;
      const hasProvisioning = dbs?.some((db: any) => db.status === 'provisioning');
      return hasProvisioning ? 3000 : false;
    },
  });

  const { data: servers } = useQuery({
    queryKey: ['servers', activeTeam?.id],
    queryFn: () => api.getServers(activeTeam!.id),
    enabled: !!activeTeam,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDbFormData) => api.createDatabase(activeTeam!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      setCreateDialogOpen(false);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDatabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
      setDeleteConfirmId(null);
    },
  });

  const form = useForm<CreateDbFormData>({
    resolver: zodResolver(createDbSchema),
    defaultValues: { name: '', engine: '', version: '', server_id: '' },
  });

  const selectedEngine = form.watch('engine');
  const versions = selectedEngine ? versionsByEngine[selectedEngine] || [] : [];

  React.useEffect(() => {
    if (selectedEngine) {
      form.setValue('version', versions[0] || '');
    }
  }, [selectedEngine, form, versions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Databases</h2>
          <p className="text-sm text-muted-foreground">
            Managed database instances across your servers
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Database
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : databases && databases.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {databases.map((db: any) => {
            const serverName = servers?.find((s: { id: string }) => s.id === db.server_id)?.name;
            const engine = engineConfig[db.engine] || { label: db.engine, color: 'text-muted-foreground', bgColor: 'bg-muted' };
            const variant = statusVariant[db.status] || 'secondary';
            return (
              <Card key={db.id} className="group relative overflow-hidden">
                <div className={`absolute inset-x-0 top-0 h-1 ${engine.bgColor.replace('/10', '')}`} />
                <CardContent className="p-5 pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${engine.bgColor}`}>
                      <Database className={`h-5 w-5 ${engine.color}`} />
                    </div>
                    <Badge variant={variant} className="capitalize">
                      {db.status === 'running' && (
                        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                      )}
                      {db.status}
                    </Badge>
                  </div>

                  <h3 className="font-semibold text-sm mb-1 truncate">{db.name}</h3>

                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium ${engine.bgColor} ${engine.color}`}>
                        {engine.label}
                      </span>
                      {db.version && (
                        <span className="font-mono tabular-nums">v{db.version}</span>
                      )}
                    </div>
                    {serverName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Server className="h-3 w-3" />
                        <span className="truncate">{serverName}</span>
                      </div>
                    )}
                    {db.port && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Plug className="h-3 w-3" />
                        <span className="font-mono tabular-nums">:{db.port}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setLogsDbId(db.id)}
                    >
                      <Terminal className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(db.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No databases</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Create a managed database instance to get started.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Database
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Database</DialogTitle>
            <DialogDescription>
              Provision a new managed database instance on one of your servers.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. my-app-db"
                className="font-mono"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Engine</label>
              <Select
                value={form.watch('engine')}
                onValueChange={(v) => form.setValue('engine', v, { shouldValidate: true })}
                placeholder="Select engine..."
                error={form.formState.errors.engine?.message}
              >
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="redis">Redis</SelectItem>
                <SelectItem value="mongo">MongoDB</SelectItem>
              </Select>
            </div>
            {versions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Version</label>
                <Select
                  value={form.watch('version')}
                  onValueChange={(v) => form.setValue('version', v, { shouldValidate: true })}
                  placeholder="Select version..."
                  error={form.formState.errors.version?.message}
                >
                  {versions.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Server</label>
              <Select
                value={form.watch('server_id')}
                onValueChange={(v) => form.setValue('server_id', v, { shouldValidate: true })}
                placeholder="Select server..."
                error={form.formState.errors.server_id?.message}
              >
                {servers?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                <Database className="h-4 w-4" />
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Database</DialogTitle>
            <DialogDescription>
              This will permanently destroy the database and all its data. This action cannot be undone.
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
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!logsDbId} onOpenChange={(open) => !open && setLogsDbId(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Database Logs</DialogTitle>
            <DialogDescription>
              Provisioning and runtime logs for this database.
            </DialogDescription>
          </DialogHeader>
          <DatabaseLogViewer databaseId={logsDbId} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsDbId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getDbLogColor(line: string): string {
  if (line.startsWith('Error')) return 'text-red-400 py-0.5';
  if (line.includes('ready') || line.includes('successfully')) return 'text-green-400 py-0.5';
  return 'text-emerald-300/80 py-0.5';
}

function DatabaseLogViewer({ databaseId }: Readonly<{ databaseId: string | null }>) {
  const { lines, status, isStreaming } = useDatabaseLogs(databaseId);
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
              {' '}Waiting for provisioning logs...
            </>
          ) : (
            'No logs available. Logs appear during provisioning.'
          )}
        </div>
      ) : (
        lines.map((line, i) => (
          <div key={`dblog-${i}`} className={getDbLogColor(line)}>
            {line}
          </div>
        ))
      )}
      {isStreaming && lines.length > 0 && (
        <div className="flex items-center gap-2 text-muted-foreground mt-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          {' '}Provisioning...
        </div>
      )}
      {status && !isStreaming && (
        <div className={`mt-2 pt-2 border-t border-white/10 ${status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
          Final status: {status}
        </div>
      )}
    </div>
  );
}
