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
import { Select, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ScrollText,
  Save,
} from 'lucide-react';

const levelConfig: Record<string, { color: string; bgColor: string }> = {
  debug: { color: 'text-zinc-500', bgColor: 'bg-zinc-500/10' },
  info: { color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  warn: { color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  error: { color: 'text-red-500', bgColor: 'bg-red-500/10' },
};

const retentionSchema = z.object({
  retention_days: z.coerce.number().min(1).max(365),
});

type RetentionFormData = z.infer<typeof retentionSchema>;

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    return ts;
  }
}

export default function LogsPage() {
  const params = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  const { data: environments } = useQuery({
    queryKey: ['environments', params.projectId],
    queryFn: () => api.getEnvironments(params.projectId),
    enabled: !!params.projectId,
  });
  const envId = environments?.[0]?.id;

  const [searchText, setSearchText] = React.useState('');
  const [level, setLevel] = React.useState('all');
  const [stream, setStream] = React.useState('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [retentionOpen, setRetentionOpen] = React.useState(false);

  const searchParams = React.useMemo(() => {
    const p: Record<string, string> = { page: String(page), limit: '100' };
    if (searchText) p.q = searchText;
    if (level !== 'all') p.level = level;
    if (stream !== 'all') p.stream = stream;
    if (dateFrom) p.from = dateFrom;
    if (dateTo) p.to = dateTo;
    return p;
  }, [searchText, level, stream, dateFrom, dateTo, page]);

  const { data: logsRes, isLoading } = useQuery({
    queryKey: ['logs', envId, searchParams],
    queryFn: () => api.searchLogs(envId!, searchParams),
    enabled: !!envId,
  });

  const { data: retention } = useQuery({
    queryKey: ['log-retention', envId],
    queryFn: () => api.getLogRetention(envId!),
    enabled: !!envId,
  });

  const retentionMutation = useMutation({
    mutationFn: (data: RetentionFormData) => api.setLogRetention(envId!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['log-retention'] }),
  });

  const retentionForm = useForm<RetentionFormData>({
    resolver: zodResolver(retentionSchema),
    values: {
      retention_days: retention?.retention_days ?? 30,
    },
  });

  const logs = logsRes?.data || [];
  const total = logsRes?.total || 0;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
  }

  function handleExport() {
    if (envId) api.exportLogs(envId, searchParams);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Logs</h2>
          <p className="text-sm text-muted-foreground">
            Search and browse application logs
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!envId}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search logs..."
            className="flex h-10 w-full rounded-lg border border-input bg-transparent pl-10 pr-4 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={level} onValueChange={setLevel} className="w-32">
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warn</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </Select>

          <Select value={stream} onValueChange={setStream} className="w-32">
            <SelectItem value="all">All Streams</SelectItem>
            <SelectItem value="stdout">stdout</SelectItem>
            <SelectItem value="stderr">stderr</SelectItem>
          </Select>

          <Input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-48"
            placeholder="From"
          />
          <Input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-48"
            placeholder="To"
          />

          <Button type="submit" size="sm">
            <Search className="h-3.5 w-3.5" />
            Search
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-1">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : logs.length > 0 ? (
        <>
          <div className="rounded-lg border bg-[#0c0a09] overflow-hidden">
            <div className="p-4 space-y-0.5 font-mono text-xs leading-6 overflow-x-auto max-h-[600px] overflow-y-auto">
              {logs.map((log: any, i: number) => {
                const lc = levelConfig[log.level] || levelConfig.info;
                return (
                  <div key={i} className="flex items-start gap-3 hover:bg-white/[0.02] px-1 rounded">
                    <span className="text-zinc-600 tabular-nums whitespace-nowrap shrink-0 select-none">
                      {log.timestamp ? formatTimestamp(log.timestamp) : ''}
                    </span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0 text-[10px] font-semibold uppercase shrink-0 ${lc.color} ${lc.bgColor}`}>
                      {log.level}
                    </span>
                    <span className="text-zinc-300 break-all whitespace-pre-wrap">
                      {log.message}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {logs.length} of {total} entries
            </p>
            {logs.length < total && (
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                Load More
              </Button>
            )}
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <ScrollText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No logs found</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              {searchText || level !== 'all' || stream !== 'all'
                ? 'Try adjusting your search filters.'
                : 'Logs will appear here once your application starts running.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-xl">
        <button
          onClick={() => setRetentionOpen(!retentionOpen)}
          className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors cursor-pointer rounded-xl"
        >
          <span>Log Retention Settings</span>
          {retentionOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {retentionOpen && (
          <div className="px-4 pb-4 animate-fade-in">
            <form
              onSubmit={retentionForm.handleSubmit((data) => retentionMutation.mutate(data))}
              className="space-y-4 max-w-md"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Retention Period (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  {...retentionForm.register('retention_days')}
                  error={retentionForm.formState.errors.retention_days?.message}
                />
              </div>
              <Button
                type="submit"
                size="sm"
                isLoading={retentionMutation.isPending}
                disabled={!retentionForm.formState.isDirty}
              >
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
