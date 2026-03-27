'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectItem } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials, formatRelativeTime } from '@/lib/utils';
import {
  Rocket,
  KeyRound,
  Server,
  Database,
  Layers,
  Activity,
  ArrowUpRight,
  Bell,
} from 'lucide-react';

const eventIcons: Record<string, { icon: typeof Rocket; color: string; bgColor: string }> = {
  deployment: { icon: Rocket, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  secret: { icon: KeyRound, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  server: { icon: Server, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  backup: { icon: Database, color: 'text-violet-500', bgColor: 'bg-violet-500/10' },
  scaling: { icon: Layers, color: 'text-pink-500', bgColor: 'bg-pink-500/10' },
};

function getEventCategory(action: string): string {
  if (action.startsWith('deployment')) return 'deployment';
  if (action.startsWith('secret')) return 'secret';
  if (action.startsWith('server')) return 'server';
  if (action.startsWith('backup')) return 'backup';
  if (action.startsWith('scaling')) return 'scaling';
  return 'deployment';
}

function actorLabel(event: {
  actor_id?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  const meta = event.metadata;
  if (meta && typeof meta === 'object') {
    const n = (meta as { actor_name?: string; actorName?: string }).actor_name
      ?? (meta as { actorName?: string }).actorName;
    if (typeof n === 'string' && n.trim()) return n;
  }
  if (event.actor_id) {
    return `User ${event.actor_id.slice(0, 8)}…`;
  }
  return null;
}

function eventDescription(action: string, resourceType: string): string {
  return `${action} · ${resourceType}`;
}

function formatResourceLine(resourceType: string, resourceId: string): string {
  return `${resourceType} ${resourceId}`;
}

export default function ActivityPage() {
  const params = useParams<{ teamId: string }>();
  const [eventFilter, setEventFilter] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [hasNewEvents, setHasNewEvents] = React.useState(false);

  const limit = 30;
  const queryParams = React.useMemo(() => {
    const offset = (page - 1) * limit;
    const p: Record<string, string> = {
      offset: String(offset),
      limit: String(limit),
    };
    if (eventFilter !== 'all') p.type = eventFilter;
    return p;
  }, [page, eventFilter]);

  const { data: activityRes, isLoading, refetch } = useQuery({
    queryKey: ['team-activity', params.teamId, queryParams],
    queryFn: () => api.getTeamActivity(params.teamId, queryParams),
    enabled: !!params.teamId,
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (page === 1 && eventFilter === 'all') {
        setHasNewEvents(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [page, eventFilter]);

  const events = activityRes?.data || [];
  const total = activityRes?.total || 0;

  function handleRefresh() {
    setHasNewEvents(false);
    refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Activity</h2>
          <p className="text-sm text-muted-foreground">
            Timeline of events across your team
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={eventFilter} onValueChange={(v) => { setEventFilter(v); setPage(1); }} className="w-44">
          <SelectItem value="all">All Events</SelectItem>
          <SelectItem value="deployment">Deployments</SelectItem>
          <SelectItem value="secret">Secrets</SelectItem>
          <SelectItem value="server">Servers</SelectItem>
          <SelectItem value="backup">Backups</SelectItem>
          <SelectItem value="scaling">Scaling</SelectItem>
        </Select>
      </div>

      {hasNewEvents && (
        <button
          type="button"
          onClick={handleRefresh}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 cursor-pointer"
        >
          <Bell className="h-4 w-4" />
          New events available — click to refresh
        </button>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <>
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-0">
              {events.map((event: any, i: number) => {
                const action = event.action || '';
                const category = getEventCategory(action);
                const iconCfg = eventIcons[category] || eventIcons.deployment;
                const Icon = iconCfg.icon;
                const label = actorLabel(event);
                const desc = eventDescription(action, event.resource_type || '');
                const resLabel = formatResourceLine(event.resource_type || 'resource', event.resource_id || '');

                return (
                  <div
                    key={event.id || i}
                    className="relative flex items-start gap-4 py-4 pl-0"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconCfg.bgColor} ring-4 ring-background`}>
                      <Icon className={`h-4 w-4 ${iconCfg.color}`} />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {label && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                                  {getInitials(label)}
                                </div>
                                <span className="text-sm font-medium">{label}</span>
                              </div>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {desc}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">{resLabel}</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          {event.created_at ? formatRelativeTime(event.created_at) : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {events.length < total && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                Load More
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No activity yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              {eventFilter !== 'all'
                ? 'No events match your filters. Try adjusting the filter.'
                : 'Events will appear here as your team performs actions.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
