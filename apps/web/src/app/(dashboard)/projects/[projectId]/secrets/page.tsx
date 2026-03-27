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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
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
  KeyRound,
  Pencil,
  Trash2,
  RotateCcw,
  Shield,
  Clock,
} from 'lucide-react';

const secretSchema = z.object({
  key: z.string().min(1, 'Key is required').regex(/^[A-Z_][A-Z0-9_]*$/, 'Must be uppercase with underscores'),
  value: z.string().min(1, 'Value is required'),
  scope: z.enum(['global', 'project', 'environment']),
});

type SecretFormData = z.infer<typeof secretSchema>;

export default function SecretsPage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editingSecret, setEditingSecret] = React.useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const { data: secrets, isLoading } = useQuery({
    queryKey: ['secrets', 'project', params.projectId],
    queryFn: () => api.getSecrets('project', params.projectId),
    enabled: !!params.projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: SecretFormData) =>
      api.createSecret({
        scope: data.scope,
        scope_id: params.projectId,
        key: data.key,
        value: data.value,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', 'project', params.projectId] });
      setAddDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SecretFormData> }) =>
      api.updateSecret(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', 'project', params.projectId] });
      setEditingSecret(null);
      editForm.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSecret(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', 'project', params.projectId] });
      setDeleteConfirmId(null);
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => api.rotateSecret(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['secrets', 'project', params.projectId] });
    },
  });

  const form = useForm<SecretFormData>({
    resolver: zodResolver(secretSchema),
    defaultValues: { key: '', value: '', scope: 'project' },
  });

  const editForm = useForm<SecretFormData>({
    resolver: zodResolver(secretSchema),
  });

  React.useEffect(() => {
    if (editingSecret) {
      editForm.reset({
        key: editingSecret.key,
        value: '',
        scope: editingSecret.scope || 'project',
      });
    }
  }, [editingSecret, editForm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Secrets</h2>
          <p className="text-sm text-muted-foreground">
            Encrypted environment variables and secrets
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Secret
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : secrets && secrets.length > 0 ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {secrets.map((secret: any) => (
                  <TableRow key={secret.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-primary" />
                        <code className="text-xs font-mono font-medium">{secret.key}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs font-mono text-muted-foreground">••••••••</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {secret.scope || 'project'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground">
                        v{secret.version || 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {secret.updated_at ? formatRelativeTime(secret.updated_at) : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setEditingSecret(secret)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => rotateMutation.mutate(secret.id)}
                          disabled={rotateMutation.isPending}
                          title="Rotate secret"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(secret.id)}
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
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No secrets</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Add encrypted environment variables and secrets for your deployments.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Secret
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Secret Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Secret</DialogTitle>
            <DialogDescription>
              Secrets are encrypted at rest and injected at deploy time.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Key</label>
              <Input
                placeholder="e.g. DATABASE_URL"
                className="font-mono"
                {...form.register('key')}
                error={form.formState.errors.key?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Value</label>
              <Textarea
                placeholder="Secret value..."
                className="font-mono"
                rows={3}
                {...form.register('value')}
                error={form.formState.errors.value?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scope</label>
              <Select
                value={form.watch('scope')}
                onValueChange={(v) => form.setValue('scope', v as SecretFormData['scope'])}
              >
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="environment">Environment</SelectItem>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                <KeyRound className="h-4 w-4" />
                Add Secret
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Secret Dialog */}
      <Dialog open={!!editingSecret} onOpenChange={(open) => !open && setEditingSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Secret</DialogTitle>
            <DialogDescription>
              Update the value for <code className="font-mono text-xs">{editingSecret?.key}</code>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) =>
              updateMutation.mutate({ id: editingSecret.id, data })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">New Value</label>
              <Textarea
                placeholder="New secret value..."
                className="font-mono"
                rows={3}
                {...editForm.register('value')}
                error={editForm.formState.errors.value?.message}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditingSecret(null)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Update Secret
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete Secret</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The secret will be permanently removed from all environments.
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
