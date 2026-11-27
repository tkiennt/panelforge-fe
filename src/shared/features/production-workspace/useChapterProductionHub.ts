import { useCallback, useEffect, useState } from 'react';
import {
  chapterService,
  type ChapterDto,
  type ChapterReadinessDto,
  type ReadinessResolutionTargetDto,
} from '@/services/chapter.service';
import {
  buildBibleUrl,
  buildChapterManagementUrl,
  buildChapterReaderUrl,
  buildProductionWorkspaceUrl,
  buildScriptReviewUrl,
  buildSeriesExportUrl,
} from '@/app/routePaths';

export const CHAPTER_HUB_CHANGED_EVENT = 'panelforge:chapter-hub-changed';

export const notifyChapterHubChanged = (detail?: { seriesId?: string; chapterId?: string }) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHAPTER_HUB_CHANGED_EVENT, { detail }));
};

/**
 * Resolve a backend ReadinessResolutionTargetDto into a canonical deep-link URL
 * so Producer lands directly on the exact Detail Workspace + tab + resource.
 */
export const buildReadinessResolutionUrl = (
  workspaceId: string,
  seriesId: string,
  chapterId: string,
  target?: ReadinessResolutionTargetDto | null,
): string => {
  if (!target) {
    return buildScriptReviewUrl(workspaceId, seriesId, chapterId);
  }

  switch (target.workspace) {
    case 'pre-production': {
      const base = buildScriptReviewUrl(workspaceId, seriesId, chapterId);
      const params = new URLSearchParams();
      if (target.section && target.section !== 'script') {
        params.set('tab', target.section);
      }
      if (target.section === 'entities' && target.resourceId && target.resourceId !== chapterId) {
        params.set('entityId', target.resourceId);
      }
      const q = params.toString();
      return q ? `${base}?${q}` : base;
    }
    case 'production':
      return buildProductionWorkspaceUrl(workspaceId, seriesId, {
        chapterId,
        tab: target.section === 'team' ? 'crew' : 'progress',
      });
    case 'review':
      return buildChapterReaderUrl(workspaceId, seriesId, chapterId);
    case 'delivery':
      return buildSeriesExportUrl(workspaceId, seriesId, chapterId);
    case 'bible':
      return buildBibleUrl(workspaceId, seriesId, target.resourceId || undefined);
    default:
      return buildChapterManagementUrl(workspaceId, seriesId, chapterId);
  }
};

export type ChapterLifecycleStepId =
  | 'draft'
  | 'pre_production'
  | 'ready_for_production'
  | 'in_production'
  | 'review'
  | 'approved'
  | 'delivered';

export interface ChapterLifecycleStep {
  id: ChapterLifecycleStepId;
  label: string;
  state: 'completed' | 'current' | 'upcoming';
}

/**
 * Maps current backend ChapterStatus + ScriptStatus + CanStartProduction + IsHandedOff
 * into the 7-stage Producer Lifecycle Tracker without mutating backend enums.
 */
export const computeChapterLifecycleSteps = (
  chapter?: Pick<ChapterDto, 'status' | 'scriptStatus' | 'isHandedOff'> | null,
  readiness?: ChapterReadinessDto | null,
): { steps: ChapterLifecycleStep[]; currentStepId: ChapterLifecycleStepId } => {
  const status = String(readiness?.chapterStatus || chapter?.status || 'PreProduction');
  const scriptStatus = String(readiness?.script?.scriptStatus || chapter?.scriptStatus || 'Draft');
  const isHandedOff = Boolean(readiness?.isHandedOff ?? chapter?.isHandedOff);
  const canStart = Boolean(readiness?.canStartProduction);
  const submittedTasks = readiness?.production?.submittedTasks ?? 0;
  const totalTasks = readiness?.production?.totalTasks ?? 0;
  const approvedTasks = readiness?.production?.approvedTasks ?? 0;

  let currentStepId: ChapterLifecycleStepId = 'draft';
  if (status === 'HandedOffAndPublished' || status === 'Published' || isHandedOff) {
    currentStepId = 'delivered';
  } else if (status === 'ChapterApproved' || status === 'Approved') {
    currentStepId = 'approved';
  } else if (status === 'InProduction') {
    // Review step when all tasks are submitted/approved and awaiting final review/approval
    const allSubmittedOrApproved =
      totalTasks > 0 && approvedTasks + submittedTasks >= totalTasks && submittedTasks > 0;
    currentStepId = allSubmittedOrApproved ? 'review' : 'in_production';
  } else {
    // PreProduction
    if (canStart) {
      currentStepId = 'ready_for_production';
    } else if (scriptStatus === 'InReview' || (readiness?.script?.lineCount ?? 0) > 0) {
      currentStepId = 'pre_production';
    } else {
      currentStepId = 'draft';
    }
  }

  const ordered: Array<{ id: ChapterLifecycleStepId; label: string }> = [
    { id: 'draft', label: 'Bản thảo' },
    { id: 'pre_production', label: 'Tiền sản xuất' },
    { id: 'ready_for_production', label: 'Sẵn sàng SX' },
    { id: 'in_production', label: 'Đang sản xuất' },
    { id: 'review', label: 'Kiểm duyệt' },
    { id: 'approved', label: 'Đã duyệt' },
    { id: 'delivered', label: 'Bàn giao' },
  ];

  const currentIdx = ordered.findIndex((s) => s.id === currentStepId);
  const steps: ChapterLifecycleStep[] = ordered.map((item, idx) => ({
    ...item,
    state: idx < currentIdx ? 'completed' : idx === currentIdx ? 'current' : 'upcoming',
  }));

  return { steps, currentStepId };
};

/**
 * Shared hook to fetch authoritative GET /api/chapters/{chapterId}/readiness
 * and automatically stay synchronized when any workspace mutates chapter state.
 */
export const useChapterReadiness = (chapterId?: string | null) => {
  const [readiness, setReadiness] = useState<ChapterReadinessDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const refetch = useCallback(() => {
    setReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<{ chapterId?: string }>).detail;
      if (!detail?.chapterId || !chapterId || detail.chapterId === chapterId) {
        setReloadTick((t) => t + 1);
      }
    };
    window.addEventListener(CHAPTER_HUB_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHAPTER_HUB_CHANGED_EVENT, onChanged);
  }, [chapterId]);

  useEffect(() => {
    if (!chapterId || typeof chapterService.getChapterReadiness !== 'function') {
      setReadiness(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    chapterService
      .getChapterReadiness(chapterId)
      .then((data) => {
        if (!cancelled) {
          setReadiness(data);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err?.message || 'Không thể tải trạng thái sẵn sàng của chương.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId, reloadTick]);

  return { readiness, loading, error, refetch };
};
