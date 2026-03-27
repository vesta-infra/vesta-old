'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  LayoutDashboard,
  Layers,
  Rocket,
  KeyRound,
  Globe,
  Link2,
  Settings,
  HardDrive,
  Timer,
  ScrollText,
  ShieldAlert,
} from 'lucide-react';

const tabs = [
  { href: '', label: 'Overview', icon: LayoutDashboard },
  { href: '/environments', label: 'Environments', icon: Layers },
  { href: '/deployments', label: 'Deployments', icon: Rocket },
  { href: '/secrets', label: 'Secrets', icon: KeyRound },
  { href: '/domains', label: 'Domains', icon: Globe },
  { href: '/services', label: 'Services', icon: Link2 },
  { href: '/backups', label: 'Backups', icon: HardDrive },
  { href: '/cron-jobs', label: 'Cron Jobs', icon: Timer },
  { href: '/logs', label: 'Logs', icon: ScrollText },
  { href: '/maintenance', label: 'Maintenance', icon: ShieldAlert },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const activeTeam = useTeamStore((s) => s.activeTeam);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', params.projectId],
    queryFn: () => api.getProject(activeTeam!.id, params.projectId),
    enabled: !!activeTeam,
  });

  const basePath = `/projects/${params.projectId}`;

  function isActive(tabHref: string) {
    const fullPath = basePath + tabHref;
    if (tabHref === '') return pathname === basePath;
    return pathname.startsWith(fullPath);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/projects"
          className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                {project?.name || 'Project'}
              </h1>
              {project?.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {project.description}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={basePath + tab.href}
              className={cn(
                'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                'hover:text-foreground',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="animate-fade-in">{children}</div>
    </div>
  );
}
