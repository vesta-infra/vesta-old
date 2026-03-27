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
  Webhook,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
} from 'lucide-react';

const eventTypes = [
  { value: 'deployment.started', label: 'Deployment Started' },
  { value: 'deployment.succeeded', label: 'Deployment Succeeded' },
  { value: 'deployment.failed', label: 'Deployment Failed' },
  { value: 'backup.completed', label: 'Backup Completed' },
  { value: 'backup.failed', label: 'Backup Failed' },
  { value: 'server.connected', label: 'Server Connected' },
  { value: 'server.disconnected', label: 'Server Disconnected' },
  { value: 'scaling.changed', label: 'Scaling Changed' },
  { value: 'secret.rotated', label: 'Secret Rotated' },
];

const webhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  secret: z.string().optional(),
  event_types: z.array(z.string()).min(1, 'Select at least one event'),
});

type WebhookFormData = z.infer<typeof webhookSchema>;

function statusCodeVariant(code: number): 'success' | 'destructive' | 'warning' | 'secondary' {
  if (code >= 200 && code < 300) return 'success';
  if (code >= 400 && code < 500) return 'warning';
  if (code >= 500) return 'destructive';
  return 'secondary';
}

export default function WebhooksPage() {
  const params = useParams<{ teamId: string }>();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks', params.teamId],
    queryFn: () => api.getWebhooks(params.teamId),
    enabled: !!params.teamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: WebhookFormData) => api.createWebhook(params.teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setAddDialogOpen(false);
      form.reset();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateWebhook(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testWebhook(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setDeleteId(null);
    },
  });

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { name: '', url: '', secret: '', event_types: [] },
  });

  const selectedEvents = form.watch('event_types') || [];

  function toggleEvent(event: string) {
    const current = form.getValues('event_types') || [];
    if (current.includes(event)) {
      form.setValue('event_types', current.filter((e) => e !== event), { shouldValidate: true });
    } else {
      form.setValue('event_types', [...current, event], { shouldValidate: true });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Send event notifications to external services
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : webhooks && webhooks.length > 0 ? (
        <div className="space-y-3">
          {webhooks.map((wh: any) => (
            <WebhookRow
              key={wh.id}
              webhook={wh}
              expanded={expandedId === wh.id}
              onToggleExpand={() => setExpandedId(expandedId === wh.id ? null : wh.id)}
              onToggleEnabled={(enabled) => toggleMutation.mutate({ id: wh.id, enabled })}
              onTest={() => testMutation.mutate(wh.id)}
              onDelete={() => setDeleteId(wh.id)}
              testPending={testMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Webhook className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No webhooks</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Set up outbound webhooks to notify external services about events.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure an outbound webhook. Payloads are signed with HMAC-SHA256.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Slack notifications"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <Input
                placeholder="https://hooks.example.com/webhook"
                className="font-mono"
                {...form.register('url')}
                error={form.formState.errors.url?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret</label>
              <Input
                placeholder="Optional signing secret"
                className="font-mono"
                {...form.register('secret')}
              />
              <p className="text-xs text-muted-foreground">
                Used to sign payloads with HMAC-SHA256 for verification.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Events</label>
              {form.formState.errors.event_types && (
                <p className="text-xs text-destructive">{form.formState.errors.event_types.message}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {eventTypes.map((evt) => (
                  <label
                    key={evt.value}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(evt.value)}
                      onChange={() => toggleEvent(evt.value)}
                      className="rounded border-input"
                    />
                    <span>{evt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                <Webhook className="h-4 w-4" />
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              This will permanently remove this webhook and its delivery history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
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

function WebhookRow({
  webhook,
  expanded,
  onToggleExpand,
  onToggleEnabled,
  onTest,
  onDelete,
  testPending,
}: {
  webhook: any;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onTest: () => void;
  onDelete: () => void;
  testPending: boolean;
}) {
  const { data: deliveries } = useQuery({
    queryKey: ['webhook-deliveries', webhook.id],
    queryFn: () => api.getWebhookDeliveries(webhook.id),
    enabled: expanded,
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={onToggleExpand}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-accent transition-colors cursor-pointer"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{webhook.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {webhook.event_types?.length || 0} events
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="font-mono truncate max-w-[300px]">{webhook.url}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onTest}
              disabled={testPending}
              title="Send test"
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Switch checked={webhook.enabled} onCheckedChange={onToggleEnabled} />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="border-t px-4 pb-4 pt-3 animate-fade-in">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Recent Deliveries
            </h4>
            {deliveries && deliveries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.slice(0, 10).map((delivery: any) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <code className="text-xs font-mono">{delivery.event_type}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCodeVariant(delivery.status_code ?? 0)}>
                          {delivery.status_code ?? '—'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono tabular-nums">
                          {delivery.duration_ms != null ? `${delivery.duration_ms}ms` : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono tabular-nums">{delivery.attempts ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {delivery.created_at ? formatRelativeTime(delivery.created_at) : '—'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <Webhook className="h-3.5 w-3.5" />
                No deliveries recorded yet
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
