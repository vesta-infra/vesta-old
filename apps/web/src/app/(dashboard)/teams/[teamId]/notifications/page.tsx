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
import {
  Plus,
  BellRing,
  Trash2,
  Play,
  Mail,
  MessageSquare,
  Hash,
  Send,
  Webhook,
} from 'lucide-react';

const channelTypeConfig: Record<string, { icon: typeof Mail; label: string; color: string; bgColor: string }> = {
  email: { icon: Mail, label: 'Email', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  slack: { icon: Hash, label: 'Slack', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  discord: { icon: MessageSquare, label: 'Discord', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' },
  telegram: { icon: Send, label: 'Telegram', color: 'text-sky-500', bgColor: 'bg-sky-500/10' },
  webhook: { icon: Webhook, label: 'Webhook', color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
};

const notificationEvents = [
  { value: 'deployment.succeeded', label: 'Deployment Succeeded' },
  { value: 'deployment.failed', label: 'Deployment Failed' },
  { value: 'backup.completed', label: 'Backup Completed' },
  { value: 'backup.failed', label: 'Backup Failed' },
  { value: 'server.disconnected', label: 'Server Disconnected' },
  { value: 'scaling.changed', label: 'Scaling Changed' },
  { value: 'certificate.expiring', label: 'Certificate Expiring' },
  { value: 'maintenance.started', label: 'Maintenance Started' },
];

const channelSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  config: z.object({
    label: z.string().optional(),
    recipients: z.string().optional(),
    webhook_url: z.string().optional(),
    channel_name: z.string().optional(),
    bot_token: z.string().optional(),
    chat_id: z.string().optional(),
    url: z.string().optional(),
    secret: z.string().optional(),
  }),
});

type ChannelFormData = z.infer<typeof channelSchema>;

export default function NotificationsPage() {
  const params = useParams<{ teamId: string }>();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const { data: channels, isLoading } = useQuery({
    queryKey: ['notification-channels', params.teamId],
    queryFn: () => api.getNotificationChannels(params.teamId),
    enabled: !!params.teamId,
  });

  const createMutation = useMutation({
    mutationFn: (data: ChannelFormData) => api.createNotificationChannel(params.teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setAddDialogOpen(false);
      form.reset();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api.updateNotificationChannel(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notification-channels'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => api.testNotificationChannel(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNotificationChannel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setDeleteId(null);
    },
  });

  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      type: '',
      events: [],
      config: {},
    },
  });

  const selectedType = form.watch('type');
  const selectedEvents = form.watch('events') || [];

  function toggleEvent(event: string) {
    const current = form.getValues('events') || [];
    if (current.includes(event)) {
      form.setValue('events', current.filter((e) => e !== event), { shouldValidate: true });
    } else {
      form.setValue('events', [...current, event], { shouldValidate: true });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Notifications</h2>
          <p className="text-sm text-muted-foreground">
            Configure notification channels for team events
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : channels && channels.length > 0 ? (
        <div className="space-y-3">
          {channels.map((channel: any) => {
            const typeCfg = channelTypeConfig[channel.type] || channelTypeConfig.webhook;
            const Icon = typeCfg.icon;
            const cfg = (channel.config || {}) as Record<string, unknown>;
            const title =
              (typeof cfg.label === 'string' && cfg.label.trim()) ? cfg.label : typeCfg.label;
            return (
              <Card key={channel.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${typeCfg.bgColor}`}>
                        <Icon className={`h-5 w-5 ${typeCfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium">{title}</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {typeCfg.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {channel.events?.length || 0} events
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => testMutation.mutate(channel.id)}
                        disabled={testMutation.isPending}
                        title="Send test notification"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: channel.id, enabled: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(channel.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
              <BellRing className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No notification channels</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Set up channels to receive notifications about important events.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Channel
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Add Notification Channel</DialogTitle>
            <DialogDescription>
              Configure a channel to receive event notifications.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel Type</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(channelTypeConfig).map(([key, cfg]) => {
                  const TypeIcon = cfg.icon;
                  const isSelected = selectedType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => form.setValue('type', key, { shouldValidate: true })}
                      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <TypeIcon className="h-5 w-5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              {form.formState.errors.type && (
                <p className="text-xs text-destructive">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Label (optional)</label>
              <Input
                placeholder="e.g. Production alerts"
                {...form.register('config.label')}
              />
            </div>

            {selectedType === 'email' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipients</label>
                <Textarea
                  rows={3}
                  placeholder="One email per line"
                  {...form.register('config.recipients')}
                />
              </div>
            )}

            {selectedType === 'slack' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                    placeholder="https://hooks.slack.com/services/..."
                    className="font-mono"
                    {...form.register('config.webhook_url')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Channel Name</label>
                  <Input
                    placeholder="#deployments"
                    {...form.register('config.channel_name')}
                  />
                </div>
              </>
            )}

            {selectedType === 'discord' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  className="font-mono"
                  {...form.register('config.webhook_url')}
                />
              </div>
            )}

            {selectedType === 'telegram' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bot Token</label>
                  <Input
                    placeholder="123456:ABC-DEF..."
                    className="font-mono"
                    {...form.register('config.bot_token')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chat ID</label>
                  <Input
                    placeholder="-1001234567890"
                    className="font-mono"
                    {...form.register('config.chat_id')}
                  />
                </div>
              </>
            )}

            {selectedType === 'webhook' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL</label>
                  <Input
                    placeholder="https://example.com/notifications"
                    className="font-mono"
                    {...form.register('config.url')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Secret</label>
                  <Input
                    placeholder="Optional signing secret"
                    className="font-mono"
                    {...form.register('config.secret')}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Events</label>
              {form.formState.errors.events && (
                <p className="text-xs text-destructive">{form.formState.errors.events.message}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {notificationEvents.map((evt) => (
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
                <BellRing className="h-4 w-4" />
                Create Channel
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Channel</DialogTitle>
            <DialogDescription>
              This will permanently remove this notification channel.
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
