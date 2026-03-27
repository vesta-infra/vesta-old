'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { useAuthStore } from '@/stores/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Select, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Users, UserPlus, Crown, Shield, Eye, Code, Trash2 } from 'lucide-react';

const roleConfig: Record<string, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'warning' }> = {
  owner: { icon: <Crown className="h-3 w-3" />, label: 'Owner', variant: 'warning' },
  admin: { icon: <Shield className="h-3 w-3" />, label: 'Admin', variant: 'default' },
  developer: { icon: <Code className="h-3 w-3" />, label: 'Developer', variant: 'secondary' },
  viewer: { icon: <Eye className="h-3 w-3" />, label: 'Viewer', variant: 'secondary' },
};

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.string().min(1, 'Role is required'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export default function TeamPage() {
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members', activeTeam?.id],
    queryFn: () => api.getTeamMembers(activeTeam!.id),
    enabled: !!activeTeam,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteFormData) => {
      if (!activeTeam) throw new Error('No active team');
      return api.inviteMember(activeTeam.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setInviteOpen(false);
      form.reset();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => {
      if (!activeTeam) throw new Error('No active team');
      return api.removeMember(activeTeam.id, memberId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => {
      if (!activeTeam) throw new Error('No active team');
      return api.updateMemberRole(activeTeam.id, memberId, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'developer' },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">
            Manage members and roles for {activeTeam?.name || 'your team'}
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} disabled={!activeTeam}>
          <UserPlus className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4.5 w-4.5 text-primary" />
            <CardTitle className="text-base">Members</CardTitle>
            {members && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {members.length} {members.length === 1 ? 'member' : 'members'}
              </Badge>
            )}
          </div>
          <CardDescription>
            People who have access to this team&apos;s resources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-48 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : members && members.length > 0 ? (
            <div className="divide-y">
              {members.map((member: any) => {
                const role = roleConfig[member.role] || roleConfig.viewer;
                const isCurrentUser = member.user?.id === currentUser?.id;
                const isOwner = member.role === 'owner';
                return (
                  <div key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar
                      name={member.user?.name || member.user?.email || '?'}
                      src={member.user?.avatar_url}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {member.user?.name || 'Unknown'}
                        </p>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.user?.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <Badge variant={role.variant} className="gap-1">
                          {role.icon}
                          {role.label}
                        </Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) =>
                            updateRoleMutation.mutate({ memberId: member.id, role: newRole })
                          }
                        >
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="developer">Developer</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </Select>
                      )}
                      {!isOwner && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeMutation.mutate(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No members yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Invite developers, admins, and viewers to collaborate on your projects.
              </p>
              <Button onClick={() => setInviteOpen(true)} disabled={!activeTeam}>
                <UserPlus className="h-4 w-4" />
                Invite your first member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to a registered user by their email address.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email <span className="text-destructive">*</span></label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                {...form.register('email')}
                error={form.formState.errors.email?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role <span className="text-destructive">*</span></label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v)}
              >
                <SelectItem value="admin">Admin -- Full access</SelectItem>
                <SelectItem value="developer">Developer -- Deploy &amp; manage</SelectItem>
                <SelectItem value="viewer">Viewer -- Read-only access</SelectItem>
              </Select>
            </div>
            {inviteMutation.isError && (
              <p className="text-sm text-destructive">
                {(inviteMutation.error as any)?.message || 'Failed to invite member.'}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={inviteMutation.isPending}>
                <UserPlus className="h-4 w-4" />
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
