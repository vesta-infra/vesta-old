'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useTeamStore } from '@/stores/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectItem } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  Save,
  Trash2,
  AlertTriangle,
  GitBranch,
  Box,
} from 'lucide-react';

const generalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const gitSchema = z.object({
  git_provider: z.string().optional(),
  git_url: z.string().optional(),
  default_branch: z.string().optional(),
});

const buildSchema = z.object({
  build_method: z.string().min(1, 'Build method is required'),
  dockerfile_path: z.string().optional(),
});

type GeneralFormData = z.infer<typeof generalSchema>;
type GitFormData = z.infer<typeof gitSchema>;
type BuildFormData = z.infer<typeof buildSchema>;

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', params.projectId],
    queryFn: () => api.getProject(activeTeam!.id, params.projectId),
    enabled: !!activeTeam,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.updateProject(activeTeam!.id, params.projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', params.projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteProject(activeTeam!.id, params.projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push('/projects');
    },
  });

  const generalForm = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    values: {
      name: project?.name || '',
      description: project?.description || '',
    },
  });

  const gitForm = useForm<GitFormData>({
    resolver: zodResolver(gitSchema),
    values: {
      git_provider: project?.git_provider || '',
      git_url: project?.git_url || '',
      default_branch: project?.default_branch || 'main',
    },
  });

  const buildForm = useForm<BuildFormData>({
    resolver: zodResolver(buildSchema),
    values: {
      build_method: project?.build_method || 'nixpacks',
      dockerfile_path: project?.dockerfile_path || '',
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={generalForm.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <Input
                {...generalForm.register('name')}
                error={generalForm.formState.errors.name?.message}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                rows={3}
                placeholder="What does this project do?"
                {...generalForm.register('description')}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                isLoading={updateMutation.isPending}
                disabled={!generalForm.formState.isDirty}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Git Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Git Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={gitForm.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select
                value={gitForm.watch('git_provider') || ''}
                onValueChange={(v) => gitForm.setValue('git_provider', v, { shouldDirty: true })}
                placeholder="Select provider..."
              >
                <SelectItem value="github">GitHub</SelectItem>
                <SelectItem value="gitlab">GitLab</SelectItem>
                <SelectItem value="bitbucket">Bitbucket</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository URL</label>
              <Input
                placeholder="https://github.com/user/repo.git"
                className="font-mono"
                {...gitForm.register('git_url')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Input
                placeholder="main"
                className="font-mono"
                {...gitForm.register('default_branch')}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                isLoading={updateMutation.isPending}
                disabled={!gitForm.formState.isDirty}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Build Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Box className="h-4 w-4" />
            Build Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={buildForm.handleSubmit((data) => updateMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Build Method</label>
              <Select
                value={buildForm.watch('build_method')}
                onValueChange={(v) => buildForm.setValue('build_method', v, { shouldDirty: true })}
              >
                <SelectItem value="nixpacks">Nixpacks</SelectItem>
                <SelectItem value="dockerfile">Dockerfile</SelectItem>
                <SelectItem value="compose">Docker Compose</SelectItem>
                <SelectItem value="image">Docker Image</SelectItem>
              </Select>
            </div>
            {buildForm.watch('build_method') === 'dockerfile' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Dockerfile Path</label>
                <Input
                  placeholder="./Dockerfile"
                  className="font-mono"
                  {...buildForm.register('dockerfile_path')}
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                isLoading={updateMutation.isPending}
                disabled={!buildForm.formState.isDirty}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Project</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete this project and all its environments, deployments, and secrets.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Project</DialogTitle>
            <DialogDescription>
              This action is irreversible. All environments, deployments, secrets, and domains will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <code className="font-mono text-xs text-destructive">{project?.name}</code> to confirm
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={project?.name}
              className="font-mono"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== project?.name}
              onClick={() => deleteMutation.mutate()}
              isLoading={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
