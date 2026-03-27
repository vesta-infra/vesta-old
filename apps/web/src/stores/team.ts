import { create } from 'zustand';
import { api } from '@/lib/api';

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface TeamState {
  teams: Team[];
  activeTeam: Team | null;
  isLoading: boolean;
  loadTeams: () => Promise<void>;
  setActiveTeam: (team: Team) => void;
  hydrate: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  activeTeam: null,
  isLoading: true,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const savedId = localStorage.getItem('vesta_active_team');
    if (savedId && get().teams.length > 0) {
      const team = get().teams.find((t) => t.id === savedId);
      if (team) set({ activeTeam: team });
    }
  },

  loadTeams: async () => {
    try {
      const teams = await api.getTeams();
      const savedId = localStorage.getItem('vesta_active_team');
      const activeTeam =
        teams.find((t: Team) => t.id === savedId) || teams[0] || null;
      if (activeTeam) {
        localStorage.setItem('vesta_active_team', activeTeam.id);
      }
      set({ teams, activeTeam, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveTeam: (team) => {
    localStorage.setItem('vesta_active_team', team.id);
    set({ activeTeam: team });
  },
}));
