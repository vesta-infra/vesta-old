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
  Globe,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Trash2,
  ExternalLink,
} from 'lucide-react';

const domainSchema = z.object({
  fqdn: z.string().min(1, 'Domain is required'),
  environment_id: z.string().optional(),
});

type DomainFormData = z.infer<typeof domainSchema>;

const sslStatusConfig: Record<string, { variant: 'success' | 'destructive' | 'warning'; label: string; icon: typeof ShieldCheck }> = {
  active: { variant: 'success', label: 'SSL Active', icon: ShieldCheck },
  pending: { variant: 'warning', label: 'SSL Pending', icon: ShieldQuestion },
  error: { variant: 'destructive', label: 'SSL Error', icon: ShieldAlert },
};

export default function DomainsPage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  const { data: domains, isLoading } = useQuery({
    queryKey: ['domains', params.projectId],
    queryFn: () => api.getDomains(params.projectId),
    enabled: !!params.projectId,
  });

  const { data: environments } = useQuery({
    queryKey: ['environments', params.projectId],
    queryFn: () => api.getEnvironments(params.projectId),
    enabled: !!params.projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: DomainFormData) =>
      api.createDomain(params.projectId, {
        fqdn: data.fqdn,
        ...(data.environment_id ? { environment_id: data.environment_id } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains', params.projectId] });
      setAddDialogOpen(false);
      form.reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains', params.projectId] });
      setDeleteConfirmId(null);
    },
  });

  const form = useForm<DomainFormData>({
    resolver: zodResolver(domainSchema),
    defaultValues: { fqdn: '', environment_id: '' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Domains</h2>
          <p className="text-sm text-muted-foreground">
            Custom domains and SSL certificates
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Domain
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : domains && domains.length > 0 ? (
        <div className="space-y-3">
          {domains.map((domain: any) => {
            const ssl = sslStatusConfig[domain.ssl_status] || sslStatusConfig.pending;
            const SslIcon = ssl.icon;

            return (
              <Card key={domain.id} className="group">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium font-mono text-sm">{domain.fqdn}</p>
                        <a
                          href={`https://${domain.fqdn}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {domain.environment_id
                          ? `environment_id: ${domain.environment_id}`
                          : 'No environment assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={ssl.variant}>
                      <SslIcon className="h-3 w-3 mr-1" />
                      {ssl.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteConfirmId(domain.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No custom domains</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Add a custom domain to serve your application. SSL certificates are provisioned automatically.
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Domain
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Domain Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
            <DialogDescription>
              Point your domain&apos;s DNS to your server, then add it here. SSL will be provisioned automatically via Caddy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Domain</label>
              <Input
                placeholder="e.g. app.example.com"
                className="font-mono"
                {...form.register('fqdn')}
                error={form.formState.errors.fqdn?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Environment (optional)</label>
              <Select
                value={form.watch('environment_id') || ''}
                onValueChange={(v) => form.setValue('environment_id', v)}
                placeholder="Select environment..."
              >
                {environments?.map((env: any) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                Add Domain
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove Domain</DialogTitle>
            <DialogDescription>
              This will remove the domain and its SSL certificate. Traffic will no longer be routed to your application.
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
