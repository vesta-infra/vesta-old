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
  Link2,
  ArrowRight,
  Trash2,
  Database,
} from 'lucide-react';

const linkSchema = z.object({
  dependency_type: z.enum(['project', 'database']),
  dependency_id: z.string().uuid('Must be a valid dependency UUID'),
  injected_env_prefix: z
    .string()
    .min(1, 'Prefix is required')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Must start with uppercase A–Z; only A–Z, 0–9, _'),
});

type LinkFormData = z.infer<typeof linkSchema>;

export default function ServicesPage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const { data: links, isLoading } = useQuery({
    queryKey: ['service-links', params.projectId],
    queryFn: () => api.getServiceLinks(params.projectId),
    enabled: !!params.projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: LinkFormData) =>
      api.createServiceLink(params.projectId, {
        dependency_type: data.dependency_type,
        dependency_id: data.dependency_id,
        injected_env_prefix: data.injected_env_prefix,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-links', params.projectId] });
      setAddDialogOpen(false);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteServiceLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-links', params.projectId] });
      setDeleteConfirmId(null);
    },
  });

  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      dependency_type: 'project',
      dependency_id: '',
      injected_env_prefix: '',
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Service Links</h2>
          <p className="text-sm text-muted-foreground">
            Connect to other services and databases. Linked services inject connection variables automatically.
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Link Service
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : links && links.length > 0 ? (
        <div className="space-y-3">
          {links.map((link: any) => (
            <Card key={link.id} className="group">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">{link.injected_env_prefix}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {'{{'}services.{link.injected_env_prefix}.url{'}}'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium capitalize">{link.dependency_type}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        dependency_id: {link.dependency_id}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success">Connected</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteConfirmId(link.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Link2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No service links</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Link databases and other services to automatically inject connection variables using the{' '}
              <code className="font-mono text-xs">{'{{'}services.*{'}}'}</code> template syntax.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Link a Service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Link Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Service</DialogTitle>
            <DialogDescription>
              Connect to another project&apos;s service. Connection variables will be injected automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dependency type</label>
              <Select
                value={form.watch('dependency_type')}
                onValueChange={(v) =>
                  form.setValue('dependency_type', v as LinkFormData['dependency_type'])
                }
              >
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="database">Database</SelectItem>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dependency ID</label>
              <Input
                placeholder="UUID of the project or managed database"
                className="font-mono"
                {...form.register('dependency_id')}
                error={form.formState.errors.dependency_id?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Injected env prefix</label>
              <Input
                placeholder="e.g. DATABASE, REDIS"
                className="font-mono"
                {...form.register('injected_env_prefix')}
                error={form.formState.errors.injected_env_prefix?.message}
              />
              <p className="text-xs text-muted-foreground">
                Access via{' '}
                <code className="font-mono">{'{{'}services.PREFIX.url{'}}'}</code> (use your prefix)
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                <Link2 className="h-4 w-4" />
                Link Service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove Service Link</DialogTitle>
            <DialogDescription>
              This will remove the service link. Connection variables will no longer be injected on next deployment.
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
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
