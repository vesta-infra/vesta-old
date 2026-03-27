'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { User, Palette, Key, Shield } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const loadUser = useAuthStore((s) => s.loadUser);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '' },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => api.updateProfile(data),
    onSuccess: () => {
      loadUser();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-primary" />
              <CardTitle className="text-base">Profile</CardTitle>
            </div>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name || 'User'} size="lg" />
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <form
              onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))}
              className="space-y-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    {...form.register('name')}
                    error={form.formState.errors.name?.message}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={user?.email || ''} type="email" readOnly disabled className="opacity-80" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" isLoading={updateProfileMutation.isPending} disabled={!form.formState.isDirty}>
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-4.5 w-4.5 text-primary" />
              <CardTitle className="text-base">Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* API Tokens */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4.5 w-4.5 text-primary" />
                <CardTitle className="text-base">API Tokens</CardTitle>
              </div>
              <Button variant="outline" size="sm" disabled>
                Generate token
              </Button>
            </div>
            <CardDescription>
              Manage tokens for programmatic API access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No API tokens created yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tokens allow you to interact with the Vesta API from scripts and CI/CD pipelines
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
