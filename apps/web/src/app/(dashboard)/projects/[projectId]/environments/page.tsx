'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
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
  Layers,
  Rocket,
  ChevronRight,
  Minus,
} from 'lucide-react';

const envSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type EnvFormData = z.infer<typeof envSchema>;

export default function EnvironmentsPage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const { data: environments, isLoading } = useQuery({
    queryKey: ['environments', params.projectId],
    queryFn: () => api.getEnvironments(params.projectId),
    enabled: !!params.projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: EnvFormData) =>
      api.createEnvironment(params.projectId, { name: data.name, auto_deploy: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', params.projectId] });
      setDialogOpen(false);
      form.reset();
    },
  });

  const scaleMutation = useMutation({
    mutationFn: ({ envId, replicas }: { envId: string; replicas: number }) =>
      api.updateScale(envId, replicas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', params.projectId] });
    },
  });

  const deployMutation = useMutation({
    mutationFn: ({ envId }: { envId: string }) => api.createDeployment(envId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-deployments'] });
      queryClient.invalidateQueries({ queryKey: ['environments', params.projectId] });
    },
  });

  const autoDeployMutation = useMutation({
    mutationFn: ({ envId, auto_deploy }: { envId: string; auto_deploy: boolean }) =>
      api.updateEnvironment(envId, { auto_deploy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environments', params.projectId] });
    },
  });

  const form = useForm<EnvFormData>({
    resolver: zodResolver(envSchema),
    defaultValues: { name: '' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Environments</h2>
          <p className="text-sm text-muted-foreground">
            Manage deployment environments for this project
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            New Environment
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Environment</DialogTitle>
              <DialogDescription>
                Add a new deployment environment to this project.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="e.g. production, staging, preview"
                  {...form.register('name')}
                  error={form.formState.errors.name?.message}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : environments && environments.length > 0 ? (
        <div className="space-y-3">
          {environments.map((env: any) => {
            const isExpanded = expandedId === env.id;
            const replicas = env.replicas || 1;

            return (
              <Card key={env.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : env.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{env.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {replicas} replica{replicas !== 1 ? 's' : ''}
                        {env.updated_at && (
                          <> · Updated {formatRelativeTime(env.updated_at)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-4 space-y-4 animate-slide-down">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Replica Count</p>
                        <p className="text-xs text-muted-foreground">
                          Scale the number of running containers
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={replicas <= 0 || scaleMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            scaleMutation.mutate({ envId: env.id, replicas: replicas - 1 });
                          }}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-mono font-medium tabular-nums">
                          {replicas}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          disabled={scaleMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            scaleMutation.mutate({ envId: env.id, replicas: replicas + 1 });
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Auto Deploy</p>
                        <p className="text-xs text-muted-foreground">
                          Automatically deploy on git push
                        </p>
                      </div>
                      <Switch
                        checked={env.auto_deploy ?? false}
                        onCheckedChange={(checked) =>
                          autoDeployMutation.mutate({ envId: env.id, auto_deploy: checked })
                        }
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deployMutation.mutate({ envId: env.id });
                        }}
                        isLoading={deployMutation.isPending}
                        disabled={deployMutation.isPending}
                      >
                        <Rocket className="h-3.5 w-3.5" />
                        Deploy
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No environments</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Create your first environment to start deploying this project.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Environment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
