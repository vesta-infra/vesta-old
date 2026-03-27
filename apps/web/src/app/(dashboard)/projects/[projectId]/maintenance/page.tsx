'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Save,
  ShieldAlert,
  Eye,
  Power,
} from 'lucide-react';

const maintenanceSchema = z.object({
  allowed_ips: z.string().optional(),
  custom_page_html: z.string().optional(),
  status_code: z.string().min(1),
  bypass_token: z.string().optional(),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

const defaultMaintenanceHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Maintenance</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fafaf9; color: #1c1917; }
    .container { text-align: center; max-width: 480px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #71717a; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <h1>We'll be back soon</h1>
    <p>We're performing scheduled maintenance. Please check back shortly.</p>
  </div>
</body>
</html>`;

export default function MaintenancePage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [showPreview, setShowPreview] = React.useState(false);

  const { data: environments } = useQuery({
    queryKey: ['environments', params.projectId],
    queryFn: () => api.getEnvironments(params.projectId),
    enabled: !!params.projectId,
  });
  const envId = environments?.[0]?.id;

  const { data: maintenance, isLoading } = useQuery({
    queryKey: ['maintenance', envId],
    queryFn: () => api.getMaintenance(envId!),
    enabled: !!envId,
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.toggleMaintenance(envId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: MaintenanceFormData) =>
      api.updateMaintenance(envId!, {
        allowed_ips:
          data.allowed_ips
            ?.split('\n')
            .map((s) => s.trim())
            .filter(Boolean) || [],
        custom_page_html: data.custom_page_html,
        status_code: Number.parseInt(data.status_code, 10),
        bypass_token: data.bypass_token,
        scheduled_start: data.scheduled_start || undefined,
        scheduled_end: data.scheduled_end || undefined,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance'] }),
  });

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    values: {
      allowed_ips: maintenance?.allowed_ips?.join('\n') || '',
      custom_page_html: maintenance?.custom_page_html || defaultMaintenanceHtml,
      status_code: String(maintenance?.status_code ?? 503),
      bypass_token: '',
      scheduled_start: maintenance?.scheduled_start
        ? new Date(maintenance.scheduled_start).toISOString().slice(0, 16)
        : '',
      scheduled_end: maintenance?.scheduled_end
        ? new Date(maintenance.scheduled_end).toISOString().slice(0, 16)
        : '',
    },
  });

  const isActive = maintenance?.enabled === true;
  const customPageHtml = form.watch('custom_page_html') || defaultMaintenanceHtml;

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Maintenance Mode</h2>
          <p className="text-sm text-muted-foreground">
            Control access during maintenance windows
          </p>
        </div>
      </div>

      <Card className={isActive ? 'border-warning/50 bg-warning/[0.02]' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isActive ? 'bg-warning/10' : 'bg-muted'}`}>
                <Power className={`h-6 w-6 ${isActive ? 'text-warning' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Maintenance Mode</h3>
                  <Badge variant={isActive ? 'warning' : 'secondary'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isActive
                    ? 'All traffic is being served the maintenance page.'
                    : 'Your application is serving traffic normally.'}
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={() => toggleMutation.mutate()}
              className="scale-125"
            />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Access Control
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">IP Allowlist</label>
              <Textarea
                rows={4}
                placeholder="One IP per line, e.g.&#10;192.168.1.0/24&#10;10.0.0.1"
                className="font-mono text-xs"
                {...form.register('allowed_ips')}
              />
              <p className="text-xs text-muted-foreground">
                These IPs will bypass the maintenance page.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bypass Token</label>
              <Input
                placeholder="Optional secret token to bypass maintenance"
                className="font-mono"
                {...form.register('bypass_token')}
              />
              <p className="text-xs text-muted-foreground">
                Append <code className="text-xs font-mono">?bypass=TOKEN</code> to any URL to skip maintenance.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Code</label>
              <Select
                value={form.watch('status_code')}
                onValueChange={(v) => form.setValue('status_code', v, { shouldDirty: true })}
              >
                <SelectItem value="503">503 Service Unavailable</SelectItem>
                <SelectItem value="200">200 OK</SelectItem>
                <SelectItem value="307">307 Temporary Redirect</SelectItem>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Maintenance Page</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-3.5 w-3.5" />
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showPreview ? (
              <div className="rounded-lg border overflow-hidden bg-white">
                <iframe
                  srcDoc={customPageHtml}
                  className="w-full h-64 border-0"
                  title="Maintenance page preview"
                  sandbox=""
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  rows={12}
                  className="font-mono text-xs"
                  placeholder="Custom HTML for maintenance page..."
                  {...form.register('custom_page_html')}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduled Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  type="datetime-local"
                  {...form.register('scheduled_start')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input
                  type="datetime-local"
                  {...form.register('scheduled_end')}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Maintenance mode will automatically enable/disable at these times.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            isLoading={updateMutation.isPending}
            disabled={!form.formState.isDirty}
          >
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
