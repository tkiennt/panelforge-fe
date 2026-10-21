import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seriesService, CreateSeriesRequest, UpdateSeriesRequest } from '@/services/series.service';

export const SERIES_QUERY_KEYS = {
  all: (workspaceId: string) => ['series', 'list', workspaceId] as const,
  detail: (seriesId: string) => ['series', 'detail', seriesId] as const,
};

export function useSeriesList(workspaceId?: string | null) {
  return useQuery({
    queryKey: SERIES_QUERY_KEYS.all(workspaceId || ''),
    queryFn: () => seriesService.getSeriesList(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useSeriesDetail(seriesId?: string | null) {
  return useQuery({
    queryKey: SERIES_QUERY_KEYS.detail(seriesId || ''),
    queryFn: () => seriesService.getSeriesById(seriesId!),
    enabled: !!seriesId,
  });
}

export function useCreateSeries(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (req: CreateSeriesRequest) => seriesService.createSeries(workspaceId, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERIES_QUERY_KEYS.all(workspaceId) });
    },
  });
}

export function useUpdateSeries(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, req }: { seriesId: string; req: UpdateSeriesRequest }) =>
      seriesService.updateSeries(seriesId, req),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SERIES_QUERY_KEYS.all(workspaceId) });
      queryClient.invalidateQueries({ queryKey: SERIES_QUERY_KEYS.detail(variables.seriesId) });
    },
  });
}

export function useDeleteSeries(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: string) => seriesService.deleteSeries(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERIES_QUERY_KEYS.all(workspaceId) });
    },
  });
}
