'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
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
  FolderGit2,
  Clock,
  ArrowUpRight,
  Rocket,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  git_url: z.string().optional(),
  build_method: z.string().min(1, 'Build method is required'),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', activeTeam?.id],
    queryFn: () => api.getProjects(activeTeam!.id),
    enabled: !!activeTeam,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => {
      if (!activeTeam) throw new Error('No active team');
      return api.createProject(activeTeam.id, data);
    },
    onSuccess: (project: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDialogOpen(false);
      form.reset();
      router.push(`/projects/${project.id}`);
    },
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      git_url: '',
      build_method: 'nixpacks',
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage your deployed applications and services
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!activeTeam}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <FolderGit2 className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{project.name}</CardTitle>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">No deploys</Badge>
                    {project.updated_at && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(project.updated_at)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No projects yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Deploy your first application, database, or service to get started.
            </p>
            <Button onClick={() => setDialogOpen(true)} disabled={!activeTeam}>
              <Plus className="h-4 w-4" />
              Create your first project
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>
              Create a new project to deploy your application.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
              <Input
                placeholder="my-awesome-app"
                {...form.register('name')}
                error={form.formState.errors.name?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="What does this project do?"
                rows={2}
                {...form.register('description')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Git Repository URL</label>
              <Input
                placeholder="https://github.com/user/repo.git"
                className="font-mono"
                {...form.register('git_url')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Build Method <span className="text-destructive">*</span></label>
              <Select
                value={form.watch('build_method')}
                onValueChange={(v) => form.setValue('build_method', v)}
              >
                <SelectItem value="nixpacks">Nixpacks</SelectItem>
                <SelectItem value="dockerfile">Dockerfile</SelectItem>
                <SelectItem value="compose">Docker Compose</SelectItem>
                <SelectItem value="image">Docker Image</SelectItem>
              </Select>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-destructive">
                {(createMutation.error as any)?.message || 'Failed to create project. Please try again.'}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={createMutation.isPending}>
                <Rocket className="h-4 w-4" />
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
