'use client';

import { useAuthStore } from '@/stores/auth';
import { useTeamStore } from '@/stores/team';
import { ThemeToggle } from './theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, User, LogOut, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { teams, activeTeam, setActiveTeam } = useTeamStore();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        {teams.length > 0 && (
          <DropdownMenu
            align="left"
            trigger={
              <button className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent cursor-pointer">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                  {activeTeam?.name?.[0]?.toUpperCase() || 'T'}
                </div>
                <span>{activeTeam?.name || 'Select team'}</span>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            }
          >
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => setActiveTeam(team)}
                className={team.id === activeTeam?.id ? 'bg-accent' : ''}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                  {team.name[0].toUpperCase()}
                </div>
                {team.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {user && (
          <DropdownMenu
            trigger={
              <Avatar name={user.name} size="sm" />
            }
          >
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem>
                <User className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive hover:!text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
