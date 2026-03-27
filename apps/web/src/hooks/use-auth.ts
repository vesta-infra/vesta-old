'use client';

import * as React from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTeamStore } from '@/stores/team';

export function useAuth() {
  const auth = useAuthStore();
  const loadTeams = useTeamStore((s) => s.loadTeams);

  React.useEffect(() => {
    auth.hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (auth.isAuthenticated) {
      loadTeams();
    }
  }, [auth.isAuthenticated, loadTeams]);

  return auth;
}
