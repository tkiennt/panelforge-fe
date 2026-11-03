import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceService, CreateWorkspaceRequest } from '@/services/workspace.service';

export const WORKSPACE_QUERY_KEYS = {
  all: ['workspaces'] as const,
  detail: (id: string) => ['workspaces', id] as const,
  usage: (id: string) => ['workspaces', id, 'usage'] as const,
  members: (id: string) => ['workspaces', id, 'members'] as const,
  sessions: (id: string) => ['workspaces', id, 'sessions'] as const,
};

export function useMyWorkspaces() {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.all,
    queryFn: () => workspaceService.getMyWorkspaces(),
  });
}

export function useWorkspaceUsage(workspaceId?: string | null, isProducer = true) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.usage(workspaceId || ''),
    queryFn: () => workspaceService.getWorkspaceUsage(workspaceId!),
    enabled: !!workspaceId && isProducer,
  });
}

export function useWorkspaceMembers(workspaceId?: string | null) {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEYS.members(workspaceId || ''),
    queryFn: () => workspaceService.getMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: CreateWorkspaceRequest) => workspaceService.createWorkspace(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKSPACE_QUERY_KEYS.all });
    },
  });
}
