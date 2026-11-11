import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  seriesService,
  type ChapterProgressDto,
  type SeriesDetailDto,
  type SeriesMemberDto,
  type SeriesProgressDto,
} from '@/services/series.service';

export interface SeriesDashboardKpis {
  overallPercent: number;
  totalPanels: number;
  totalApprovedPanels: number;
  inProdChapters: number;
  approvedChapters: number;
  publishedChapters: number;
  totalChapters: number;
  waitingReviewTotal: number;
  overdueTotal: number;
}

const EMPTY_KPIS: SeriesDashboardKpis = {
  overallPercent: 0,
  totalPanels: 0,
  totalApprovedPanels: 0,
  inProdChapters: 0,
  approvedChapters: 0,
  publishedChapters: 0,
  totalChapters: 0,
  waitingReviewTotal: 0,
  overdueTotal: 0,
};

const computeKpis = (progress: SeriesProgressDto | null): SeriesDashboardKpis => {
  const chapters = progress?.chapters ?? [];
  if (chapters.length === 0) return EMPTY_KPIS;

  const countStatus = (status: string) => chapters.filter((c) => c.status === status).length;

  return {
    overallPercent: Math.round(
      chapters.reduce((sum, c) => sum + (c.percentComplete || 0), 0) / chapters.length,
    ),
    totalPanels: chapters.reduce((sum, c) => sum + (c.panelCount || 0), 0),
    // A panel counts as approved only once it has cleared the final pipeline stage.
    totalApprovedPanels: chapters.reduce(
      (sum, c) => sum + (c.stages?.[c.stages.length - 1]?.approved || 0),
      0,
    ),
    inProdChapters: countStatus('InProduction'),
    approvedChapters: countStatus('Approved'),
    publishedChapters: countStatus('Published'),
    totalChapters: chapters.length,
    waitingReviewTotal: (progress?.workload ?? []).reduce(
      (sum, w) => sum + (w.waitingReview || 0),
      0,
    ),
    overdueTotal: (progress?.overdue?.length ?? 0) + (progress?.overdueChangeRequests?.length ?? 0),
  };
};

const readWorkspaceName = (): string => {
  try {
    const stored = localStorage.getItem('activeWorkspace');
    return stored ? JSON.parse(stored).name || 'Studio Workspace' : 'Studio Workspace';
  } catch {
    return 'Studio Workspace';
  }
};

export function useSeriesDashboard(
  seriesId: string | undefined,
  workspaceId: string | undefined,
  onError: (title: string, desc: string) => void,
) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<SeriesProgressDto | null>(null);
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetailDto | null>(null);
  const [seriesMembers, setSeriesMembers] = useState<SeriesMemberDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const workspaceName = useMemo(() => readWorkspaceName(), []);

  const fetchProgress = useCallback(async () => {
    if (!seriesId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Detail and members are optional garnish; progress is the only request allowed to fail the view.
      const [prog, detail, members] = await Promise.all([
        seriesService.getSeriesProgress(seriesId),
        seriesService.getSeriesById(seriesId).catch(() => null),
        seriesService.getSeriesMembers(workspaceId || '', seriesId).catch(() => []),
      ]);
      setProgress(prog);
      setSeriesDetail(detail);
      setSeriesMembers(members);
      if (prog.chapters.length > 0) {
        setSelectedChapterId((prev) =>
          prev && prog.chapters.some((c) => c.chapterId === prev)
            ? prev
            : prog.chapters[0].chapterId,
        );
      }
    } catch (err: any) {
      const msg = err.message || 'Không thể tải tiến độ Series.';
      setError(msg);
      onError('Lỗi tiến độ', msg);
    } finally {
      setLoading(false);
    }
  }, [seriesId, workspaceId, onError]);

  useEffect(() => {
    void fetchProgress();
  }, [fetchProgress]);

  const refreshMembers = useCallback(() => {
    if (!seriesId || !workspaceId) return;
    void seriesService
      .getSeriesMembers(workspaceId, seriesId)
      .then((m) => setSeriesMembers(m || []));
  }, [seriesId, workspaceId]);

  const kpis = useMemo(() => computeKpis(progress), [progress]);

  const selectedChapter: ChapterProgressDto | undefined = useMemo(() => {
    const chapters = progress?.chapters;
    if (!chapters?.length) return undefined;
    return chapters.find((c) => c.chapterId === selectedChapterId) || chapters[0];
  }, [progress, selectedChapterId]);

  const activeProductionChapter: ChapterProgressDto | undefined = useMemo(() => {
    const chapters = progress?.chapters;
    if (!chapters?.length) return undefined;
    return (
      chapters.find((c) => ['InProduction', 'Draft', 'Review'].includes(c.status)) || chapters[0]
    );
  }, [progress]);

  return {
    loading,
    error,
    progress,
    seriesDetail,
    setSeriesDetail,
    seriesMembers,
    workspaceName,
    kpis,
    selectedChapter,
    selectedChapterId,
    setSelectedChapterId,
    activeProductionChapter,
    fetchProgress,
    refreshMembers,
  };
}
