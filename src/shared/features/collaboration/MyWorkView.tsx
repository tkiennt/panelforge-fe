import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/shared/ui';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  ClipboardList,
  Film,
  Layers,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Globe,
  Palette,
  RotateCcw,
  User,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { chapterService, type ChapterDto } from '@/services/chapter.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
import { seriesService } from '@/services/series.service';
import {
  bibleService,
  type BibleDesignQueueItemDto,
} from '@/services/bible.service';
import { formatSeriesFormat } from '@/shared/utils/seriesFormat';
import { scriptLineService, type SceneDto } from '@/services/scriptLine.service';
import { pageService, type PageDto } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import type {
  AssignmentDto,
  PanelDto,
  StageProgressDto,
  StageTaskDto,
  TaskGridReviewItemDto,
  TaskGridStageDto,
  WorkspaceAssignmentDto,
} from '@/types';
import { AssignmentWorkCard } from './AssignmentWorkCard';
import { TaskGridReviewCard, TaskLotWorkCard, type MyTaskLotViewItem } from './TaskGridWorkCards';
import {
  compareWorkOrder,
  errorMessage,
  isReviewerRole,
  resolveWorkScene,
  type WorkOrderContext,
} from './collaborationRules';
import { PageContainer } from '@/shared/components/PageContainer';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';

interface MyWorkViewProps {
  currentUserId?: string | null;
  workspaceRole?: string | null;
  onShowToast?: (title: string, desc: string) => void;
}

type Tab = 'mine' | 'review' | 'all' | 'studio';

/**
 * "Công việc của tôi" theo Series (CF2 + CF3): mọi vai trò làm nội dung vào đây để bắt đầu, tải artwork, nộp, xử lý yêu cầu sửa;
 * Editor/Producer thấy thêm hàng chờ duyệt. Danh sách lấy hoàn toàn từ Backend.
 */
export const MyWorkView: React.FC<MyWorkViewProps> = ({
  currentUserId,
  workspaceRole,
  onShowToast,
}) => {
  const { workspaceId, seriesId } = useParams();
  const { t } = useTranslation('collaboration');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const reviewer = isReviewerRole(workspaceRole);
  const normalizedRole = String(workspaceRole || '').toUpperCase();
  const isWriter = normalizedRole === 'WRITER';
  const isArtist = normalizedRole === 'ARTIST';

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [seriesFormat, setSeriesFormat] = useState('');
  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [panels, setPanels] = useState<PanelDto[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string>('ALL');
  const [collapsedScenes, setCollapsedScenes] = useState<Record<string, boolean>>({});
  const [chapterId, setChapterId] = useState<string>(searchParams.get('chapterId') ?? '');
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [progress, setProgress] = useState<StageProgressDto[]>([]);
  const [tab, setTab] = useState<Tab>(() => (reviewer ? 'review' : 'mine'));
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingWork, setLoadingWork] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studioWork, setStudioWork] = useState<WorkspaceAssignmentDto[]>([]);
  const [studioLots, setStudioLots] = useState<MyTaskLotViewItem[]>([]);
  const [loadingStudio, setLoadingStudio] = useState(false);
  const [gridLots, setGridLots] = useState<MyTaskLotViewItem[]>([]);
  const [gridReviewItems, setGridReviewItems] = useState<TaskGridReviewItemDto[]>([]);
  const [artistDesignQueue, setArtistDesignQueue] = useState<BibleDesignQueueItemDto[]>([]);

  const highlightedId = searchParams.get('taskId') || searchParams.get('assignmentId');
  const chaptersRef = useRef<ChapterDto[]>([]);
  chaptersRef.current = chapters;

  useEffect(() => {
    if (!seriesId) return;
    seriesService
      .getSeriesById(seriesId)
      .then((s) => setSeriesFormat(s?.format ?? ''))
      .catch(() => setSeriesFormat(''));
  }, [seriesId]);

  useEffect(() => {
    if (!isArtist || !seriesId) {
      setArtistDesignQueue([]);
      return;
    }
    let cancelled = false;
    bibleService
      .getBibleDesignQueue(seriesId)
      .then((queue) => {
        if (!cancelled) setArtistDesignQueue(queue || []);
      })
      .catch(() => {
        if (!cancelled) setArtistDesignQueue([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isArtist, seriesId]);

  // Chương, pipeline và thành viên của Series
  useEffect(() => {
    if (!seriesId) return;
    let cancelled = false;
    (async () => {
      setLoadingChapters(true);
      setError(null);
      try {
        const [chapterPage, pipeline, memberList] = await Promise.all([
          chapterService.getChaptersBySeries(seriesId, 1, 50),
          pipelineService.getSeriesPipeline(seriesId).catch(() => null),
          // Tên người làm lấy từ thành viên Workspace (route /series/{id}/members không tồn tại ở Backend)
          workspaceId ? workspaceService.getMembers(workspaceId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setChapters(chapterPage.items);
        if (pipeline?.stages) setStages(pipeline.stages);
        setMembers(memberList ?? []);
        setChapterId((current) => current || 'ALL_STUDIO');
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, t('myWork.loadChaptersError')));
      } finally {
        if (!cancelled) setLoadingChapters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seriesId, workspaceId, t]);

  const loadWork = useCallback(
    async (silent = false) => {
      if (!chapterId) return;
      if (!silent) setLoadingWork(true);
      try {
        if (chapterId === 'ALL_STUDIO') {
          if (!workspaceId) return;
          const [myLotsRes, reviewQueueRes, legacyList] = await Promise.all([
            typeof assignmentService.getMyTaskLots === 'function'
              ? assignmentService
                  .getMyTaskLots(workspaceId, {
                    seriesId: seriesId || undefined,
                    includeCompleted: true,
                  })
                  .catch((err) => {
                    if (err?.status === 404 || err?.response?.status === 404) return [];
                    throw err;
                  })
              : Promise.resolve([]),
            reviewer && typeof assignmentService.getTaskGridReviewQueue === 'function'
              ? assignmentService
                  .getTaskGridReviewQueue(workspaceId, {
                    seriesId: seriesId || undefined,
                  })
                  .catch((err) => {
                    if (err?.status === 404 || err?.response?.status === 404) return [];
                    throw err;
                  })
              : Promise.resolve([]),
            typeof assignmentService.getMyWorkspaceAssignments === 'function'
              ? assignmentService
                  .getMyWorkspaceAssignments(workspaceId, {
                    seriesId: seriesId || undefined,
                  })
                  .catch(() => [])
              : Promise.resolve([]),
          ]);
          setGridLots(
            (myLotsRes || []).map((lot) => ({
              ...lot,
              assigneeUserId: currentUserId ?? undefined,
            })),
          );
          setGridReviewItems(reviewQueueRes || []);
          setAssignments(legacyList || []);
          setProgress([]);
          setScenes([]);
          setPages([]);
          setPanels([]);
          setSelectedSceneId('ALL');
        } else {
          const grid =
            typeof assignmentService.getTaskGrid === 'function'
              ? await assignmentService.getTaskGrid(chapterId).catch(() => null)
              : null;
          const activeGridTasks = (grid?.tasks ?? []).filter((t) => t.status !== 'Cancelled');

          if (grid && activeGridTasks.length > 0) {
            const chapMeta = chaptersRef.current.find((c) => c.id === chapterId);
            const pageMap = new Map<string, number>(
              (grid.pages ?? []).map((p) => [p.id, p.pageNumber] as const),
            );
            const stageMap = new Map<string, TaskGridStageDto>(
              (grid.stages ?? []).map((s) => [s.id, s] as [string, TaskGridStageDto]),
            );

            const lotsFromGrid: MyTaskLotViewItem[] = (grid.lots ?? [])
              .filter((l) => l.status !== 'Closed')
              .sort((a, b) => {
                if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
                const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
                return da - db;
              })
              .map((lot) => {
                const stg = stageMap.get(lot.pipelineStageId);
                const cells = activeGridTasks
                  .filter((t) => t.lotId === lot.id)
                  .map((t) => ({
                    id: t.id,
                    pageId: t.pageId,
                    pageNumber: t.pageId ? (pageMap.get(t.pageId) ?? null) : null,
                    status: t.status,
                    isStartable: t.isStartable,
                    isInputOutdated: t.isInputOutdated,
                    outdatedReason: t.outdatedReason,
                    lastDecisionComment: t.lastDecisionComment ?? null,
                    reopenReason: t.reopenReason ?? null,
                    attemptCount: t.attemptCount ?? 0,
                  }))
                  .sort((a, b) => (a.pageNumber ?? -1) - (b.pageNumber ?? -1));

                return {
                  id: lot.id,
                  seriesId: seriesId || '',
                  seriesTitle: t('myWork.currentSeries'),
                  chapterId,
                  chapterNumber: chapMeta?.chapterNumber ?? 0,
                  chapterTitle: chapMeta?.title ?? null,
                  pipelineStageId: lot.pipelineStageId,
                  stageName: stg?.name || t('myWork.defaultStage'),
                  stageOrder: stg?.stageOrder ?? 0,
                  stageColorCode: null,
                  assignedRole: lot.assignedRole,
                  brief: lot.brief,
                  dueDate: lot.dueDate,
                  status: lot.status === 'Completed' ? 'Completed' : 'Active',
                  isOverdue: lot.isOverdue,
                  tasks: cells,
                  assigneeUserId: lot.assigneeUserId,
                };
              })
              .filter((lot) => lot.tasks.length > 0);

            const reviewsFromGrid: TaskGridReviewItemDto[] = activeGridTasks
              .filter((t) => {
                const stg = stageMap.get(t.pipelineStageId);
                return (
                  stg?.isEnabled !== false &&
                  (t.status === 'Submitted' || t.status === 'UnderReview')
                );
              })
              .map((t) => {
                const stg = stageMap.get(t.pipelineStageId);
                return {
                  taskId: t.id,
                  seriesId: seriesId || '',
                  seriesTitle: t('myWork.currentSeries'),
                  chapterId,
                  chapterNumber: chapMeta?.chapterNumber ?? 0,
                  chapterTitle: chapMeta?.title ?? null,
                  pipelineStageId: t.pipelineStageId,
                  stageName: stg?.name || t('myWork.defaultStage'),
                  pageId: t.pageId,
                  pageNumber: t.pageId ? (pageMap.get(t.pageId) ?? null) : null,
                  status: t.status === 'UnderReview' ? 'UnderReview' : 'Submitted',
                  assigneeUserId: t.assigneeUserId,
                  reviewerUserId: t.reviewerUserId,
                  reviewerName: null,
                  isInputOutdated: t.isInputOutdated,
                  attemptNumber: t.attemptCount && t.attemptCount > 0 ? t.attemptCount : null,
                  submittedAt: null,
                };
              });

            setGridLots(lotsFromGrid);
            setGridReviewItems(reviewsFromGrid);
            setAssignments([]);
            setProgress([]);
            setScenes([]);
            setPages([]);
            setPanels([]);
            setSelectedSceneId('ALL');
          } else {
            setGridLots([]);
            setGridReviewItems([]);
            const [list, prog, sceneList, pageList] = await Promise.all([
              assignmentService.getAssignments(chapterId),
              assignmentService.getStageProgress(chapterId),
              scriptLineService.getScenesByChapter(chapterId).catch(() => [] as SceneDto[]),
              pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
            ]);
            // Cảnh gắn trên Panel (Page không có sceneId), nên cần panel của từng trang để quy việc vào cảnh
            const panelLists = await Promise.all(
              (pageList || []).map((p) =>
                panelService.getPanelsByPage(p.id).catch(() => [] as PanelDto[]),
              ),
            );
            setAssignments(list);
            setProgress(prog);
            setScenes(sceneList || []);
            setPages(pageList || []);
            setPanels(panelLists.flat());
          }
        }
      } catch (err) {
        setError(errorMessage(err, t('myWork.loadWorkError')));
      } finally {
        if (!silent) setLoadingWork(false);
      }
    },
    [chapterId, workspaceId, seriesId, reviewer, currentUserId, t],
  );

  useEffect(() => {
    void loadWork();
  }, [loadWork]);

  // Việc cá nhân xuyên chương/series của cả Studio (CF2 Cross-Chapter Worklist - ưu tiên Lưới V3)
  const loadStudioWork = useCallback(
    async (silent = false) => {
      if (!workspaceId) return;
      if (!silent) setLoadingStudio(true);
      try {
        const [lotsRes, legacyStudio] = await Promise.all([
          typeof assignmentService.getMyTaskLots === 'function'
            ? assignmentService
                .getMyTaskLots(workspaceId, { includeCompleted: true })
                .catch((err) => {
                  if (err?.status === 404 || err?.response?.status === 404) return [];
                  throw err;
                })
            : Promise.resolve([]),
          typeof assignmentService.getMyAssignments === 'function'
            ? assignmentService.getMyAssignments(workspaceId).catch(() => [])
            : Promise.resolve([]),
        ]);
        setStudioLots(
          (lotsRes || []).map((lot) => ({
            ...lot,
            assigneeUserId: currentUserId ?? undefined,
          })),
        );
        setStudioWork(legacyStudio || []);
      } catch (err) {
        setError(errorMessage(err, t('myWork.loadStudioError')));
      } finally {
        if (!silent) setLoadingStudio(false);
      }
    },
    [workspaceId, currentUserId, t],
  );

  useEffect(() => {
    if (tab === 'studio') void loadStudioWork();
  }, [tab, loadStudioWork]);

  const applyLotCellUpdates = useCallback(
    (targetChapterId: string, updates: Array<Partial<StageTaskDto> & { id: string }>) => {
      if (!updates.length) return;
      const byId = new Map(updates.map((u) => [u.id, u]));
      const patchLots = (lots: MyTaskLotViewItem[]): MyTaskLotViewItem[] =>
        lots.map((lot) =>
          lot.chapterId !== targetChapterId
            ? lot
            : {
                ...lot,
                tasks: lot.tasks.map((cell) => {
                  const patch = byId.get(cell.id);
                  if (!patch) return cell;
                  return {
                    ...cell,
                    status: patch.status ?? cell.status,
                    isStartable: patch.isStartable ?? cell.isStartable,
                    isInputOutdated: patch.isInputOutdated ?? cell.isInputOutdated,
                    outdatedReason:
                      patch.outdatedReason !== undefined
                        ? patch.outdatedReason
                        : cell.outdatedReason,
                    lastDecisionComment:
                      patch.lastDecisionComment !== undefined
                        ? patch.lastDecisionComment
                        : cell.lastDecisionComment,
                    reopenReason:
                      patch.reopenReason !== undefined ? patch.reopenReason : cell.reopenReason,
                    attemptCount:
                      patch.attemptCount !== undefined ? patch.attemptCount : cell.attemptCount,
                  };
                }),
              },
        );
      setGridLots(patchLots);
      setStudioLots(patchLots);
      setGridReviewItems((prev) =>
        prev.filter((item) => {
          const patch = byId.get(item.taskId);
          if (!patch || !patch.status) return true;
          return patch.status === 'Submitted' || patch.status === 'UnderReview';
        }),
      );
    },
    [],
  );

  const stageName = (id: string, a?: AssignmentDto) => {
    if ((a as any)?.stageName) {
      const order = (a as any).stageOrder ? `${(a as any).stageOrder}. ` : '';
      return `${order}${(a as any).stageName}`;
    }
    const s = stages.find((x) => x.id === id);
    return s ? `${s.stageOrder}. ${s.name}` : t('myWork.defaultStage');
  };
  const memberName = (userId: string) => {
    const m = members.find((x) => x.userId === userId);
    return m
      ? m.fullName || m.email.split('@')[0]
      : userId === currentUserId
        ? t('myWork.you')
        : userId.slice(0, 8);
  };

  const mineGridLots = useMemo(
    () =>
      gridLots.filter(
        (lot) => !currentUserId || !lot.assigneeUserId || lot.assigneeUserId === currentUserId,
      ),
    [gridLots, currentUserId],
  );

  const visibleGridLots = useMemo(() => {
    if (tab === 'mine') return mineGridLots;
    if (tab === 'all') return gridLots;
    return [];
  }, [tab, mineGridLots, gridLots]);

  const visibleGridReviews = useMemo(() => {
    if (tab === 'review') return gridReviewItems;
    if (tab === 'all' && chapterId === 'ALL_STUDIO') return gridReviewItems;
    return [];
  }, [tab, gridReviewItems, chapterId]);

  const visible = useMemo(() => {
    const status = (a: AssignmentDto) => String(a.status);
    if (tab === 'mine') return assignments.filter((a) => a.assigneeUserId === currentUserId);
    if (tab === 'review')
      return assignments.filter((a) => status(a) === 'Submitted' || status(a) === 'UnderReview');
    return assignments;
  }, [assignments, tab, currentUserId]);

  const counts = {
    mine:
      mineGridLots.length + assignments.filter((a) => a.assigneeUserId === currentUserId).length,
    review:
      gridReviewItems.length +
      assignments.filter((a) => ['Submitted', 'UnderReview'].includes(String(a.status))).length,
    all:
      gridLots.length +
      (chapterId === 'ALL_STUDIO' ? gridReviewItems.length : 0) +
      assignments.length,
    studio: studioLots.length + studioWork.length,
  };

  const hasHighlightedInData = useMemo(() => {
    if (!highlightedId) return false;
    return (
      assignments.some((a) => a.id === highlightedId) ||
      gridLots.some((l) => l.id === highlightedId || l.tasks.some((c) => c.id === highlightedId)) ||
      gridReviewItems.some((r) => r.taskId === highlightedId)
    );
  }, [highlightedId, assignments, gridLots, gridReviewItems]);

  const orderCtx = useMemo<WorkOrderContext>(
    () => ({
      stageOrder: Object.fromEntries(stages.map((s) => [s.id, s.stageOrder])),
      pageNumber: Object.fromEntries(pages.map((p) => [p.id, p.pageNumber])),
      panels,
      sceneNumber: Object.fromEntries(scenes.map((s) => [s.id, s.sceneNumber])),
    }),
    [stages, pages, panels, scenes],
  );

  const getAssignmentSceneInfo = useCallback(
    (a: AssignmentDto) => resolveWorkScene(a, orderCtx),
    [orderCtx],
  );

  // Toàn Studio: theo số chương rồi công đoạn 1 → 7; trong chương: công đoạn, trang, thứ tự đọc
  const byWorkOrder = useCallback(
    (list: AssignmentDto[]) =>
      [...list].sort((a, b) => {
        const ca = (a as Partial<WorkspaceAssignmentDto>).chapterNumber ?? 0;
        const cb = (b as Partial<WorkspaceAssignmentDto>).chapterNumber ?? 0;
        if (ca !== cb) return ca - cb;
        const sa = (a as Partial<WorkspaceAssignmentDto>).stageOrder;
        const sb = (b as Partial<WorkspaceAssignmentDto>).stageOrder;
        if (sa !== undefined && sb !== undefined && sa !== sb) return sa - sb;
        return compareWorkOrder(a, b, orderCtx);
      }),
    [orderCtx],
  );

  const sceneFilterCounts = useMemo(() => {
    const map: Record<string, number> = {};
    let unassigned = 0;
    for (const a of visible) {
      const { sceneId } = getAssignmentSceneInfo(a);
      if (sceneId === 'UNASSIGNED') {
        unassigned++;
      } else {
        map[sceneId] = (map[sceneId] || 0) + 1;
      }
    }
    return { ...map, UNASSIGNED: unassigned };
  }, [visible, getAssignmentSceneInfo]);

  const filteredAssignments = useMemo(() => {
    const list =
      selectedSceneId === 'ALL'
        ? visible
        : visible.filter((a) => getAssignmentSceneInfo(a).sceneId === selectedSceneId);
    return byWorkOrder(list); // nhóm cảnh dựng từ danh sách này nên giữ luôn thứ tự
  }, [visible, selectedSceneId, getAssignmentSceneInfo, byWorkOrder]);

  const sortedStudioWork = useMemo(
    () => byWorkOrder(studioWork) as WorkspaceAssignmentDto[],
    [studioWork, byWorkOrder],
  );

  interface SceneGroup {
    sceneId: string;
    scene: SceneDto | null;
    title: string;
    summary?: string | null;
    assignments: AssignmentDto[];
  }

  const sceneGroups = useMemo((): SceneGroup[] => {
    if (chapterId === 'ALL_STUDIO' || scenes.length === 0) {
      return [
        {
          sceneId: 'ALL',
          scene: null,
          title: t('myWork.allTasks'),
          assignments: filteredAssignments,
        },
      ];
    }

    const tasksByScene = new Map<string, AssignmentDto[]>();
    const unassignedTasks: AssignmentDto[] = [];

    for (const a of filteredAssignments) {
      const { sceneId } = getAssignmentSceneInfo(a);
      if (sceneId === 'UNASSIGNED') {
        unassignedTasks.push(a);
      } else {
        const list = tasksByScene.get(sceneId) || [];
        list.push(a);
        tasksByScene.set(sceneId, list);
      }
    }

    if (selectedSceneId !== 'ALL') {
      if (selectedSceneId === 'UNASSIGNED') {
        return unassignedTasks.length > 0
          ? [
              {
                sceneId: 'UNASSIGNED',
                scene: null,
                title: t('myWork.wholeChapter'),
                summary: t('myWork.wholeChapterDesc'),
                assignments: unassignedTasks,
              },
            ]
          : [];
      }
      const sc = scenes.find((s) => s.id === selectedSceneId);
      const list = tasksByScene.get(selectedSceneId) || [];
      if (sc) {
        return [
          {
            sceneId: sc.id,
            scene: sc,
            title: `${t('myWork.scene', { number: sc.sceneNumber })}${sc.heading ? `: ${sc.heading}` : ''}`,
            summary: sc.summary,
            assignments: list,
          },
        ];
      }
      return [];
    }

    const groups: SceneGroup[] = [];
    const sortedScenes = [...scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
    for (const sc of sortedScenes) {
      const list = tasksByScene.get(sc.id) || [];
      if (list.length > 0) {
        groups.push({
          sceneId: sc.id,
          scene: sc,
          title: `${t('myWork.scene', { number: sc.sceneNumber })}${sc.heading ? `: ${sc.heading}` : ''}`,
          summary: sc.summary,
          assignments: list,
        });
      }
    }

    if (unassignedTasks.length > 0) {
      groups.push({
        sceneId: 'UNASSIGNED',
        scene: null,
        title: t('myWork.wholeChapter'),
        summary: t('myWork.wholeChapterDesc'),
        assignments: unassignedTasks,
      });
    }

    return groups;
  }, [chapterId, scenes, filteredAssignments, getAssignmentSceneInfo, selectedSceneId, t]);

  // Với Reviewer (Editor / Producer):
  // 1. Tự động chuyển khỏi tab 'mine' nếu không có việc cá nhân (tránh màn hình trống 0 việc)
  // 2. Ưu tiên tab 'review' nếu có việc đang chờ duyệt; nếu không có việc chờ duyệt thì mở 'all'
  useEffect(() => {
    if (reviewer) {
      if (tab === 'mine' && counts.mine === 0) {
        setTab(counts.review > 0 ? 'review' : 'all');
      } else if (tab === 'review' && counts.review === 0 && counts.all > 0 && counts.mine === 0) {
        setTab('all');
      }
    }
  }, [reviewer, counts.mine, counts.review, counts.all, tab]);

  // Mở từ thông báo: cuộn tới đúng việc sau khi danh sách đã vẽ xong
  useEffect(() => {
    if (!highlightedId || loadingWork) return;
    const target = assignments.find((a) => a.id === highlightedId);
    if (target) {
      const { sceneId } = getAssignmentSceneInfo(target);
      if (sceneId && collapsedScenes[sceneId]) {
        setCollapsedScenes((prev) => ({ ...prev, [sceneId]: false }));
      }
      if (selectedSceneId !== 'ALL' && selectedSceneId !== sceneId) {
        setSelectedSceneId('ALL');
      }
    }
    const timer = setTimeout(() => {
      document
        .getElementById(`assignment-${highlightedId}`)
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(timer);
  }, [
    highlightedId,
    loadingWork,
    assignments,
    getAssignmentSceneInfo,
    collapsedScenes,
    selectedSceneId,
  ]);

  const selectChapter = (id: string) => {
    setChapterId(id);
    setSelectedSceneId('ALL');
    setCollapsedScenes({});
    setSearchParams(
      id && id !== 'ALL_STUDIO' ? { chapterId: id } : id === 'ALL_STUDIO' ? { view: 'all' } : {},
    );
  };

  type TabItem = {
    key: Tab;
    label: string;
    icon: React.ReactNode;
    tooltip: string;
    badgeAlert?: boolean;
  };

  const baseTabs: TabItem[] = reviewer
    ? [
        {
          key: 'review',
          label: t('myWork.tabs.review'),
          icon: <CheckCircle2 className='w-3.5 h-3.5 text-amber-600' />,
          tooltip: t('myWork.tabs.reviewTooltip'),
          badgeAlert: counts.review > 0,
        },
        {
          key: 'all',
          label: t('myWork.tabs.all'),
          icon: <Layers className='w-3.5 h-3.5' />,
          tooltip: t('myWork.tabs.allTooltip'),
        },
        {
          key: 'mine',
          label: t('myWork.tabs.mine'),
          icon: <User className='w-3.5 h-3.5' />,
          tooltip: t('myWork.tabs.mineTooltip'),
        },
      ]
    : [
        {
          key: 'mine',
          label: t('myWork.tabs.mine'),
          icon: <User className='w-3.5 h-3.5' />,
          tooltip: t('myWork.tabs.mineTooltip'),
        },
        {
          key: 'all',
          label: t('myWork.tabs.all'),
          icon: <Layers className='w-3.5 h-3.5' />,
          tooltip: t('myWork.tabs.allTooltip'),
        },
      ];
  const tabs: TabItem[] = workspaceId
    ? [
        ...baseTabs,
        {
          key: 'studio' as Tab,
          label: t('myWork.tabs.studio'),
          icon: <Globe className='w-3.5 h-3.5' />,
          tooltip: t('myWork.tabs.studioTooltip'),
        },
      ]
    : baseTabs;
  const isStudioTab = tab === 'studio';
  const currentMember = members.find((m) => m.userId === currentUserId);
  const currentMemberName =
    currentMember?.fullName ||
    (typeof window !== 'undefined' ? localStorage.getItem('userName') : null) ||
    '—';
  const artistCells = mineGridLots.flatMap((lot) => lot.tasks);
  const artistAssignments = artistCells.length
    ? []
    : assignments.filter((assignment) => assignment.assigneeUserId === currentUserId);
  const artistPrimaryLot =
    mineGridLots.find((lot) =>
      lot.tasks.some((cell) => ['ReworkRequired', 'InProgress', 'Assigned'].includes(cell.status)),
    ) || mineGridLots[0];
  const artistProductionReworks = mineGridLots.flatMap((lot) =>
    lot.tasks
      .filter((cell) => cell.status === 'ReworkRequired')
      .map((cell) => ({ lot, cell })),
  );
  const artistRevisionCells = artistProductionReworks.map(({ cell }) => cell);
  const artistDesignReworks = artistDesignQueue.filter(
    (item) => item.isPriorityRework || item.reviewStatus === 'ReworkRequired',
  );
  const artistSummary = {
    assigned: artistCells.length + artistAssignments.length,
    pendingReview:
      artistCells.filter((cell) => ['Submitted', 'UnderReview'].includes(cell.status)).length +
      artistAssignments.filter((assignment) =>
        ['Submitted', 'UnderReview'].includes(String(assignment.status)),
      ).length,
    revisions:
      artistRevisionCells.length +
      artistAssignments.filter((assignment) => String(assignment.status) === 'ReworkRequired')
        .length +
      artistDesignReworks.length,
  };

  return (
    <PageContainer className='space-y-6 py-6 text-[#1C1917] font-sans' data-testid='my-work-view'>
      {/* Stitch Manga Production Workspace Banner */}
      <header className='relative bg-white rounded-xl p-6 sm:p-8 shadow-sm overflow-hidden border border-stone-200/80'>
        <div className='relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6'>
          <div>
            <h1 className='text-2xl sm:text-3xl font-serif font-bold text-[#18181B] tracking-tight'>
              {isWriter
                ? `${t('writerStudio.workbenchTitle')} — ${currentMemberName}`
                : isArtist
                  ? `${t('myWork.artistOverview.title')} — ${currentMemberName}`
                  : `${t('myWork.title')} — ${currentMemberName}`}
            </h1>
            <p className='text-sm text-stone-500 mt-1'>
              {isArtist ? t('myWork.artistOverview.desc') : t('myWork.desc')}
            </p>
          </div>

          <div className='flex items-center gap-2.5 flex-wrap'>
            {isWriter &&
              chapters.length > 0 &&
              workspaceId &&
              seriesId &&
              (() => {
                const activeChapter = chapters.find((c) => !c.isScriptFrozen) || chapters[0];
                return (
                  <Link
                    to={`/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${activeChapter.id}`}
                    className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-xs transition-colors shadow-xs'
                  >
                    <BookOpen className='w-4 h-4' />
                    <span>
                      {t('writerStudio.continueWriting', { chapter: activeChapter.chapterNumber })}
                    </span>
                  </Link>
                );
              })()}
            {isArtist && workspaceId && seriesId && (
              <>
                <Link
                  to={`/workspaces/${workspaceId}/series/${seriesId}/artist`}
                  className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-xs transition-colors shadow-xs'
                >
                  <Palette className='w-4 h-4' aria-hidden='true' />
                  <span>{t('myWork.artistOverview.openDesk')}</span>
                </Link>
                <Link
                  to={`/workspaces/${workspaceId}/series/${seriesId}/bible`}
                  className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 font-semibold text-xs transition-colors'
                >
                  <BookOpen className='w-4 h-4' aria-hidden='true' />
                  <span>{t('myWork.artistOverview.openDesignRequests')}</span>
                </Link>
              </>
            )}
            <select
              value={chapterId}
              onChange={(e) => selectChapter(e.target.value)}
              aria-label={t('collaboration.myWork.selectChapterAria')}
              disabled={loadingChapters && chapters.length === 0}
              className='px-4 py-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl text-xs font-semibold text-[#1C1917] shadow-xs focus:outline-none focus:border-[#F97316] cursor-pointer'
            >
              <option value='ALL_STUDIO'>{t('collaboration.myWork.allStudioOption')}</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {t('myWork.chapterOption', { number: c.chapterNumber })}
                  {c.title ? `: ${c.title}` : ''}
                </option>
              ))}
            </select>
            <button
              type='button'
              onClick={() => void (isStudioTab ? loadStudioWork() : loadWork())}
              aria-label={t('collaboration.myWork.reload')}
              className='p-2.5 rounded-xl border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] shadow-xs cursor-pointer transition-colors text-[#1C1917]'
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${(isStudioTab ? loadingStudio : loadingWork) ? 'animate-spin text-[#F97316]' : ''}`}
              />
            </button>
          </div>
        </div>

        {isWriter && (
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-stone-200/80'>
          <div className='flex items-center gap-3 bg-[#FAF9F5] p-3.5 rounded-lg border border-[#E8E3DA]'>
            <div className='w-10 h-10 rounded-lg bg-[#EA580C]/10 flex items-center justify-center text-[#EA580C] shrink-0'>
              <BookOpen className='w-5 h-5' />
            </div>
            <div>
              <div className='font-bold text-[#18181B] text-sm sm:text-base'>
                {counts.mine > 0
                  ? t('writerStudio.scriptsInProgress', { count: counts.mine })
                  : chapters.length > 0
                    ? t('writerStudio.scriptsInProgress', { count: chapters.length })
                    : '—'}
              </div>
              <div className='text-xs text-stone-500'>
                {t('writerStudio.scriptsInProgressDesc')}
              </div>
            </div>
          </div>
          <div className='flex items-center gap-3 bg-[#FAF9F5] p-3.5 rounded-lg border border-[#E8E3DA]'>
            <div className='w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0'>
              <User className='w-5 h-5' />
            </div>
            <div>
              <div className='font-bold text-[#18181B] text-sm sm:text-base'>—</div>
              <div className='text-xs text-stone-500'>{t('myWork.characterProfiles')}</div>
            </div>
          </div>
          <div className='flex items-center gap-3 bg-[#FAF9F5] p-3.5 rounded-lg border border-[#E8E3DA]'>
            <div className='w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0'>
              <CheckCircle2 className='w-5 h-5' />
            </div>
            <div>
              <div className='font-bold text-[#18181B] text-sm sm:text-base'>—</div>
              <div className='text-xs text-stone-500'>Model Sheet</div>
            </div>
          </div>
          </div>
        )}

        {isArtist && (
          <div className='grid grid-cols-2 xl:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-200/80'>
            <div className='rounded-lg border border-stone-200 bg-[#FAF9F5] px-3.5 py-3'>
              <div className='flex items-center gap-2 text-xs font-semibold text-stone-600'>
                <ClipboardList className='h-4 w-4 text-orange-600' aria-hidden='true' />
                {t('myWork.artistOverview.assigned')}
              </div>
              <div className='mt-1 text-xl font-bold tabular-nums text-stone-900'>
                {artistSummary.assigned}
              </div>
            </div>
            <div className='rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3'>
              <div className='flex items-center gap-2 text-xs font-semibold text-blue-800'>
                <Palette className='h-4 w-4' aria-hidden='true' />
                {t('myWork.artistOverview.designRequests')}
              </div>
              <div className='mt-1 text-xl font-bold tabular-nums text-blue-950'>
                {artistDesignQueue.length}
              </div>
            </div>
            <div className='rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3'>
              <div className='flex items-center gap-2 text-xs font-semibold text-amber-800'>
                <CheckCircle2 className='h-4 w-4' aria-hidden='true' />
                {t('myWork.artistOverview.pendingReview')}
              </div>
              <div className='mt-1 text-xl font-bold tabular-nums text-amber-950'>
                {artistSummary.pendingReview}
              </div>
            </div>
            <div className='rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3'>
              <div className='flex items-center gap-2 text-xs font-semibold text-rose-800'>
                <RotateCcw className='h-4 w-4' aria-hidden='true' />
                {t('myWork.artistOverview.revisions')}
              </div>
              <div className='mt-1 text-xl font-bold tabular-nums text-rose-950'>
                {artistSummary.revisions}
              </div>
            </div>
          </div>
        )}
      </header>

      {isArtist && artistPrimaryLot && workspaceId && seriesId && (
        <section className='space-y-3' aria-labelledby='artist-continue-production'>
          <h2 id='artist-continue-production' className='text-sm font-bold text-stone-900'>
            {t('myWork.artistOverview.continueProduction')}
          </h2>
          <div className='rounded-xl border border-stone-200 bg-white p-4 shadow-xs'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div className='min-w-0 space-y-2'>
                <div>
                  <h3 className='text-base font-bold text-stone-900'>
                    {t('myWork.artistOverview.chapterTitle', {
                      number: artistPrimaryLot.chapterNumber,
                      title: artistPrimaryLot.chapterTitle || '',
                    })}
                  </h3>
                  <p className='mt-0.5 text-xs text-stone-500'>
                    {t('myWork.artistOverview.productionScope', {
                      pages: artistPrimaryLot.tasks
                        .map((task) => task.pageNumber)
                        .filter((page): page is number => page != null)
                        .join(', ') || '—',
                      stage: artistPrimaryLot.stageName,
                    })}
                  </p>
                </div>
                <div
                  className='flex flex-wrap gap-1.5'
                  aria-label={t('myWork.artistOverview.stageAria')}
                >
                  {stages.map((stage) => {
                    const active = stage.id === artistPrimaryLot.pipelineStageId;
                    return (
                      <span
                        key={stage.id}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                          active
                            ? 'border-orange-300 bg-orange-50 text-orange-800'
                            : 'border-stone-200 bg-stone-50 text-stone-500'
                        }`}
                      >
                        {stage.name}
                      </span>
                    );
                  })}
                </div>
                <p className='text-xs text-stone-600'>
                  {artistPrimaryLot.brief || t('myWork.artistOverview.checkAssignment')}
                </p>
              </div>
              <Link
                to={`/workspaces/${workspaceId}/series/${seriesId}/artist?chapterId=${encodeURIComponent(artistPrimaryLot.chapterId)}`}
                className='inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-orange-700'
              >
                {t('myWork.artistOverview.openDesk')}
                <ChevronRight className='h-4 w-4' aria-hidden='true' />
              </Link>
            </div>
          </div>
        </section>
      )}

      {isArtist && workspaceId && seriesId && artistDesignQueue.length > 0 && (
        <section className='space-y-3' aria-labelledby='artist-design-requests'>
          <div className='flex items-center justify-between gap-3'>
            <h2 id='artist-design-requests' className='text-sm font-bold text-stone-900'>
              {t('myWork.artistOverview.designSectionTitle')}
            </h2>
            <Link
              to={`/workspaces/${workspaceId}/series/${seriesId}/bible`}
              className='text-xs font-semibold text-orange-700 hover:underline'
            >
              {t('myWork.artistOverview.viewAllDesignRequests')}
            </Link>
          </div>
          <div className='divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white px-4 shadow-xs'>
            {artistDesignQueue.slice(0, 3).map((item) => (
              <Link
                key={item.revisionId || item.entryId}
                to={`/workspaces/${workspaceId}/series/${seriesId}/bible?entityId=${encodeURIComponent(item.entryId)}`}
                className='flex items-center gap-3 py-3 transition-colors hover:bg-stone-50'
              >
                <div className='flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-stone-500'>
                  {item.referenceImageUrl ? (
                    <AuthenticatedImage
                      src={item.referenceImageUrl}
                      alt={item.name}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <User className='h-4 w-4' aria-hidden='true' />
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='truncate text-xs font-bold text-stone-900'>{item.name}</h3>
                  <p className='truncate text-xs text-stone-500'>
                    {t('myWork.artistOverview.designRequestMeta', {
                      variant: item.variantLabel || t('myWork.artistOverview.defaultVariant'),
                      chapters: item.waitingChapterNumbers?.join(', ') || '—',
                    })}
                  </p>
                </div>
                <span className='shrink-0 text-xs font-semibold text-orange-700'>
                  {t('myWork.artistOverview.viewRequest')}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isArtist && (
        <section className='space-y-3 border-t border-stone-200 pt-5' aria-labelledby='artist-revisions'>
          <h2 id='artist-revisions' className='text-sm font-bold text-stone-900'>
            {t('myWork.artistOverview.revisionSectionTitle')}
          </h2>
          {artistSummary.revisions === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-5 py-8 text-center'>
              <CheckCircle2 className='h-5 w-5 text-emerald-600' aria-hidden='true' />
              <p className='mt-2 text-xs text-stone-500'>
                {t('myWork.artistOverview.noRevisions')}
              </p>
            </div>
          ) : (
            <div className='divide-y divide-rose-200 rounded-xl border border-rose-200 bg-white px-4'>
              {artistProductionReworks.map(({ lot, cell }) => (
                <Link
                  key={cell.id}
                  to={`/workspaces/${workspaceId}/series/${seriesId}/artist?chapterId=${encodeURIComponent(lot.chapterId)}&taskId=${encodeURIComponent(cell.id)}`}
                  className='flex items-center justify-between gap-3 py-3 text-sm hover:bg-rose-50'
                >
                  <span className='min-w-0'>
                    <strong className='block truncate text-stone-900'>
                      {t('myWork.artistOverview.revisionProductionTitle', {
                        chapter: lot.chapterNumber,
                        page: cell.pageNumber ?? '—',
                      })}
                    </strong>
                    <span className='line-clamp-1 text-xs text-rose-700'>
                      {cell.lastDecisionComment || lot.stageName}
                    </span>
                  </span>
                  <ChevronRight className='h-4 w-4 shrink-0 text-rose-700' aria-hidden='true' />
                </Link>
              ))}
              {artistDesignReworks.map((item) => (
                <Link
                  key={item.revisionId || item.entryId}
                  to={`/workspaces/${workspaceId}/series/${seriesId}/bible?entityId=${encodeURIComponent(item.entryId)}`}
                  className='flex items-center justify-between gap-3 py-3 text-sm hover:bg-rose-50'
                >
                  <span className='min-w-0'>
                    <strong className='block truncate text-stone-900'>{item.name}</strong>
                    <span className='line-clamp-1 text-xs text-rose-700'>
                      {item.reworkFeedback || t('myWork.artistOverview.designRevisionFallback')}
                    </span>
                  </span>
                  <ChevronRight className='h-4 w-4 shrink-0 text-rose-700' aria-hidden='true' />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Kịch bản Chương đang thực hiện (Stitch tab-tasks view) */}
      {isWriter && chapters.length > 0 && workspaceId && seriesId && (
        <section className='space-y-3.5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Film className='w-5 h-5 text-[#EA580C]' />
              <h2 className='text-lg font-serif font-bold text-[#18181B]'>
                {t('writerStudio.chaptersInProgressTitle')}
              </h2>
            </div>
            <span className='text-xs text-stone-500'>
              {t('myWork.chaptersInSeries', { count: chapters.length })}
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {chapters.slice(0, 4).map((c) => {
              const isActive = !c.isScriptFrozen;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (workspaceId && seriesId) {
                      navigate(
                        `/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${c.id}`,
                      );
                    }
                  }}
                  className='bg-white rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group border border-stone-200/80 flex flex-col justify-between space-y-4 cursor-pointer'
                >
                  <div
                    className={`absolute top-0 left-0 w-1.5 h-full ${
                      isActive ? 'bg-[#EA580C]' : 'bg-stone-200'
                    }`}
                  />
                  <div className='flex items-start justify-between gap-4'>
                    <div className='space-y-1.5 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        {seriesFormat && (
                          <span className='px-2 py-0.5 rounded bg-stone-100 text-[#EA580C] text-xs font-semibold'>
                            {formatSeriesFormat(seriesFormat)}
                          </span>
                        )}
                        <span className='px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-xs'>
                          {c.isScriptFrozen
                            ? t('myWork.scriptLocked')
                            : t('writerStudio.writingVersion', { version: c.versionVector || 1 })}
                        </span>
                        {isActive && (
                          <span className='inline-flex items-center gap-1.5 text-xs text-amber-800 font-medium'>
                            <span className='w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping' />
                            {t('writerStudio.activeStatus')}
                          </span>
                        )}
                      </div>
                      <h3 className='text-base font-serif font-bold text-[#18181B] group-hover:text-[#EA580C] transition-colors truncate'>
                        {t('myWork.chapterOption', { number: c.chapterNumber })}
                        {c.title ? `: ${c.title}` : ''}
                      </h3>
                      <p className='text-xs text-stone-500 line-clamp-2 leading-relaxed'>
                        {c.outline || t('myWork.noOutline')}
                      </p>
                    </div>
                    <ChevronRight className='w-5 h-5 text-stone-400 group-hover:text-[#EA580C] transition-colors shrink-0' />
                  </div>

                  <div className='space-y-1.5 pt-1'>
                    <div className='flex justify-between text-xs'>
                      <span className='text-stone-500'>{t('writerStudio.draftProgress')}</span>
                      <span className='font-semibold font-mono text-[#18181B]'>
                        {t('myWork.pagesCount', { count: c.pagesCount ?? 0 })}
                      </span>
                    </div>
                    <div className='w-full h-2 rounded-full bg-stone-100 overflow-hidden'>
                      <div
                        className='h-full bg-[#EA580C] rounded-full transition-all duration-500'
                        style={{
                          width: c.isScriptFrozen
                            ? '100%'
                            : (c.pagesCount ?? 0) > 0
                              ? '60%'
                              : '15%',
                        }}
                      />
                    </div>
                  </div>

                  <div className='pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500'>
                    <span className='font-mono'>
                      {c.updatedAt
                        ? new Intl.DateTimeFormat(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(c.updatedAt))
                        : '—'}
                    </span>
                    <Link
                      to={`/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${c.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className='inline-flex items-center gap-1 font-semibold text-[#EA580C] hover:underline'
                    >
                      <span>
                        {t('writerStudio.openScriptChapter', { chapter: c.chapterNumber })}
                      </span>
                      <ChevronRight className='w-4 h-4' />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <nav className='flex flex-wrap gap-2' aria-label={t('myWork.filterAria')}>
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type='button'
            onClick={() => setTab(tabItem.key)}
            title={tabItem.tooltip}
            aria-pressed={tab === tabItem.key}
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold border cursor-pointer inline-flex items-center gap-2 transition-all shadow-xs ${
              tab === tabItem.key
                ? 'bg-[#FFF2E6] text-[#1C1917] border-[#C2410C]'
                : 'bg-[#FCFBF8] text-[#57534E] border-[#D8D2C5] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
            }`}
          >
            <span className={tab === tabItem.key ? 'text-[#C2410C]' : 'text-[#78716C]'}>
              {tabItem.icon}
            </span>
            <span>{tabItem.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium leading-none ${
                tabItem.badgeAlert
                  ? tab === tabItem.key
                    ? 'bg-[#F97316] text-white font-bold'
                    : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : tab === tabItem.key
                    ? 'bg-[#F97316]/20 text-[#C2410C] font-semibold'
                    : 'bg-[#F3F0E9] text-[#78716C]'
              }`}
            >
              {counts[tabItem.key]}
            </span>
          </button>
        ))}
      </nav>

      {/* Lọc theo Phân cảnh trong Chương (CF2 & CF3) */}
      {chapterId !== 'ALL_STUDIO' && scenes.length > 0 && !isStudioTab && (
        <div className='flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 text-xs border-t border-[#D8D2C5]/60'>
          <span className='flex items-center gap-1 font-bold text-[#57534E] whitespace-nowrap text-xs uppercase tracking-wider shrink-0'>
            <Clapperboard className='w-3.5 h-3.5 text-[#F97316]' />
            {t('myWork.scenesLabel')}
          </span>
          <button
            type='button'
            onClick={() => setSelectedSceneId('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedSceneId === 'ALL'
                ? 'bg-[#FFF2E6] border-[#C2410C] text-[#1C1917] font-bold shadow-xs'
                : 'bg-[#FCFBF8] text-[#57534E] border-[#D8D2C5] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
            }`}
          >
            <span>{t('myWork.allScenes')}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                selectedSceneId === 'ALL'
                  ? 'bg-[#F97316]/20 text-[#C2410C] font-bold'
                  : 'bg-[#F3F0E9] text-[#78716C]'
              }`}
            >
              {visible.length}
            </span>
          </button>
          {scenes
            .slice()
            .sort((a, b) => a.sceneNumber - b.sceneNumber)
            .map((s) => {
              const count = sceneFilterCounts[s.id] || 0;
              const isSelected = selectedSceneId === s.id;
              return (
                <button
                  key={s.id}
                  type='button'
                  onClick={() => setSelectedSceneId(s.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#FFF2E6] border-[#C2410C] text-[#1C1917] font-bold shadow-xs'
                      : 'bg-[#FCFBF8] text-[#57534E] border-[#D8D2C5] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
                  }`}
                >
                  <span>
                    {t('myWork.scene', { number: s.sceneNumber })}
                    {s.heading ? `: ${s.heading}` : ''}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                      isSelected
                        ? 'bg-[#F97316]/20 text-[#C2410C] font-bold'
                        : 'bg-[#F3F0E9] text-[#78716C]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          {sceneFilterCounts['UNASSIGNED'] > 0 && (
            <button
              type='button'
              onClick={() => setSelectedSceneId('UNASSIGNED')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedSceneId === 'UNASSIGNED'
                  ? 'bg-[#FFF2E6] border-[#C2410C] text-[#1C1917] font-bold shadow-xs'
                  : 'bg-[#FCFBF8] text-[#57534E] border-[#D8D2C5] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
              }`}
            >
              <span>{t('myWork.wholeChapter')}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                  selectedSceneId === 'UNASSIGNED'
                    ? 'bg-[#F97316]/20 text-[#C2410C] font-bold'
                    : 'bg-[#F3F0E9] text-[#78716C]'
                }`}
              >
                {sceneFilterCounts['UNASSIGNED']}
              </span>
            </button>
          )}
        </div>
      )}

      {error && (
        <Alert tone='danger' className='text-xs whitespace-pre-line'>
          {error}
        </Alert>
      )}

      {highlightedId &&
        !loadingChapters &&
        !loadingWork &&
        chapterId &&
        chapterId !== 'ALL_STUDIO' &&
        !hasHighlightedInData &&
        workspaceId &&
        seriesId && (
          <div
            data-testid='grid-v3-redirect-hint'
            className='p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-xs flex items-center justify-between gap-3'
          >
            <span>
              {t('myWork.gridV3RedirectPrefix')} <strong>{t('myWork.gridV3Name')}</strong>{' '}
              {t('myWork.gridV3RedirectSuffix')}
            </span>
            <Link
              to={`/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${encodeURIComponent(chapterId)}&board=grid-v3`}
              className='px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold shrink-0'
            >
              {t('myWork.openGridV3Arrow')}
            </Link>
          </div>
        )}

      {isStudioTab ? (
        loadingStudio ? (
          <div className='py-12 text-center text-[#888888] text-xs'>
            <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
            {t('myWork.loadingStudio')}
          </div>
        ) : studioLots.length === 0 && studioWork.length === 0 ? (
          <div
            className='py-12 text-center border border-dashed border-[#D8D2C5] bg-[#FCFBF8] rounded-xl text-xs text-[#57534E]'
            data-testid='studio-work-empty'
          >
            {t('myWork.studioEmpty')}
          </div>
        ) : (
          <div className='space-y-3' data-testid='studio-work-list'>
            {studioLots.map((lot) => (
              <TaskLotWorkCard
                key={lot.id}
                workspaceId={workspaceId}
                lot={lot}
                isOwner={true}
                highlightedId={highlightedId}
                showSeriesHeader={true}
                onChanged={() => void loadStudioWork(true)}
                onCellsUpdated={applyLotCellUpdates}
                onToast={onShowToast}
              />
            ))}
            {sortedStudioWork.map((a) => (
              <div key={a.id} className='space-y-1'>
                <p className='text-xs font-semibold text-[#57534E]'>
                  Series: {a.seriesTitle} | {t('myWork.chapterOption', { number: a.chapterNumber })}
                  {a.scopeLabel ? ` | ${a.scopeLabel}` : ''}
                </p>
                <AssignmentWorkCard
                  chapterId={a.chapterId}
                  assignment={a}
                  stageName={`${a.stageOrder}. ${a.stageName}`}
                  assigneeName={memberName(a.assigneeUserId)}
                  userId={currentUserId}
                  workspaceRole={workspaceRole}
                  stageProgress={[]}
                  highlighted={a.id === highlightedId}
                  onChanged={() => void loadStudioWork()}
                  onToast={onShowToast}
                />
              </div>
            ))}
          </div>
        )
      ) : loadingChapters || loadingWork ? (
        <div className='py-12 text-center text-[#78716C] text-xs'>
          <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
          {t('myWork.loadingWork')}
        </div>
      ) : visibleGridLots.length === 0 &&
        visibleGridReviews.length === 0 &&
        visible.length === 0 ? (
        <div
          className='py-12 text-center border border-dashed border-[#D8D2C5] bg-[#FCFBF8] rounded-xl text-xs text-[#57534E] space-y-2'
          data-testid='my-work-empty'
        >
          <p>
            {chapterId === 'ALL_STUDIO'
              ? tab === 'review'
                ? t('myWork.emptyStudioReview')
                : tab === 'mine'
                  ? t('myWork.emptyStudioMine')
                  : t('myWork.emptyStudioAll')
              : tab === 'review'
                ? t('myWork.emptyChapterReview')
                : tab === 'mine'
                  ? t('myWork.emptyChapterMine')
                  : t('myWork.emptyChapterAll')}
          </p>
          {tab !== 'all' && counts.all > 0 && (
            <button
              type='button'
              onClick={() => setTab('all')}
              className='text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer'
            >
              {t('myWork.viewAllChapterTasks', { count: counts.all })}
            </button>
          )}
        </div>
      ) : (
        <div className='space-y-4'>
          {visibleGridReviews.length > 0 && (
            <div className='space-y-3' data-testid='grid-review-queue-list'>
              {visibleGridReviews.map((item) => (
                <TaskGridReviewCard
                  key={item.taskId}
                  workspaceId={workspaceId}
                  item={item}
                  assigneeName={
                    item.assigneeUserId
                      ? memberName(item.assigneeUserId)
                      : t('myWork.unknownSubmitter')
                  }
                  reviewerName={
                    item.reviewerName ??
                    (item.reviewerUserId ? memberName(item.reviewerUserId) : null)
                  }
                  currentUserId={currentUserId}
                  isProducer={String(workspaceRole || '').toUpperCase() === 'PRODUCER'}
                  highlighted={item.taskId === highlightedId}
                  onChanged={() => void loadWork(true)}
                  onToast={onShowToast}
                />
              ))}
            </div>
          )}

          {visibleGridLots.length > 0 && (
            <div className='space-y-3' data-testid='grid-lots-list'>
              {visibleGridLots.map((lot) => {
                const isOwner =
                  !currentUserId || !lot.assigneeUserId || lot.assigneeUserId === currentUserId;
                return (
                  <TaskLotWorkCard
                    key={lot.id}
                    workspaceId={workspaceId}
                    lot={lot}
                    isOwner={isOwner}
                    assigneeName={lot.assigneeUserId ? memberName(lot.assigneeUserId) : undefined}
                    highlightedId={highlightedId}
                    showSeriesHeader={chapterId === 'ALL_STUDIO'}
                    onChanged={() => void loadWork(true)}
                    onCellsUpdated={applyLotCellUpdates}
                    onToast={onShowToast}
                  />
                );
              })}
            </div>
          )}

          {visible.length > 0 &&
            (filteredAssignments.length === 0 ? (
              <div className='py-10 text-center border border-dashed border-[#D8D2C5] bg-[#FCFBF8] rounded-xl text-xs text-[#57534E] space-y-2'>
                <p>{t('myWork.emptyScene')}</p>
                <button
                  type='button'
                  onClick={() => setSelectedSceneId('ALL')}
                  className='text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer'
                >
                  {t('myWork.viewAllChapterTasks', { count: visible.length })}
                </button>
              </div>
            ) : chapterId === 'ALL_STUDIO' || scenes.length === 0 ? (
              <div className='space-y-3'>
                {filteredAssignments.map((a) => (
                  <div key={a.id} className='space-y-1.5'>
                    {(a as any).seriesTitle && (
                      <div className='flex items-center gap-1.5 text-xs font-semibold text-[#C2410C] bg-[#FFF2E6] px-2.5 py-1 rounded-md border border-[#F97316]/30 w-fit'>
                        <span>Series: {(a as any).seriesTitle}</span>
                        <span className='text-[#F97316]'>|</span>
                        <span>
                          {t('myWork.chapterOption', { number: (a as any).chapterNumber })}
                        </span>
                        {(a as any).scopeLabel && (
                          <>
                            <span className='text-[#F97316]'>|</span>
                            <span>{(a as any).scopeLabel}</span>
                          </>
                        )}
                      </div>
                    )}
                    <AssignmentWorkCard
                      chapterId={a.chapterId || chapterId}
                      assignment={a}
                      stageName={stageName(a.pipelineStageId, a)}
                      assigneeName={memberName(a.assigneeUserId)}
                      userId={currentUserId}
                      workspaceRole={workspaceRole}
                      stageProgress={progress}
                      highlighted={a.id === highlightedId}
                      onChanged={() => void loadWork()}
                      onToast={onShowToast}
                      relatedAssignments={assignments}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className='space-y-6'>
                {sceneGroups.map((group) => {
                  const isCollapsed = Boolean(collapsedScenes[group.sceneId]);
                  return (
                    <section
                      key={group.sceneId}
                      className='rounded-2xl border border-[#D8D2C5] bg-[#FCFBF8] p-3.5 space-y-3 shadow-xs'
                    >
                      <div
                        onClick={() =>
                          setCollapsedScenes((prev) => ({
                            ...prev,
                            [group.sceneId]: !prev[group.sceneId],
                          }))
                        }
                        className='flex items-center justify-between gap-3 cursor-pointer select-none'
                      >
                        <div className='flex items-center gap-2.5 min-w-0'>
                          <div className='w-7 h-7 rounded-lg bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#F97316] shrink-0'>
                            {group.scene ? (
                              <Film className='w-4 h-4' />
                            ) : (
                              <Layers className='w-4 h-4' />
                            )}
                          </div>
                          <div className='min-w-0'>
                            <div className='flex items-center gap-2'>
                              <h2 className='text-xs font-bold text-[#1C1917] truncate'>
                                {group.title}
                              </h2>
                              <span className='px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F3F0E9] border border-[#D8D2C5] text-[#57534E]'>
                                {t('myWork.tasksCount', { count: group.assignments.length })}
                              </span>
                            </div>
                            {group.summary && (
                              <p className='text-xs text-[#57534E] truncate max-w-xl'>
                                {group.summary}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          <span className='text-xs font-semibold text-[#57534E]'>
                            {isCollapsed ? t('myWork.expand') : t('myWork.collapse')}
                          </span>
                          <div className='p-1 rounded-md hover:bg-[#F3F0E9] text-[#78716C] hover:text-[#1C1917] transition-colors'>
                            {isCollapsed ? (
                              <ChevronDown className='w-4 h-4' />
                            ) : (
                              <ChevronUp className='w-4 h-4' />
                            )}
                          </div>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className='space-y-3 pt-1'>
                          {group.assignments.map((a) => (
                            <div key={a.id} className='space-y-1.5'>
                              {(a as any).seriesTitle && (
                                <div className='flex items-center gap-1.5 text-xs font-semibold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200/80 w-fit'>
                                  <span>Series: {(a as any).seriesTitle}</span>
                                  <span className='text-orange-400'>|</span>
                                  <span>
                                    {t('myWork.chapterOption', {
                                      number: (a as any).chapterNumber,
                                    })}
                                  </span>
                                  {(a as any).scopeLabel && (
                                    <>
                                      <span className='text-orange-400'>|</span>
                                      <span>{(a as any).scopeLabel}</span>
                                    </>
                                  )}
                                </div>
                              )}
                              <AssignmentWorkCard
                                chapterId={a.chapterId || chapterId}
                                assignment={a}
                                stageName={stageName(a.pipelineStageId, a)}
                                assigneeName={memberName(a.assigneeUserId)}
                                userId={currentUserId}
                                workspaceRole={workspaceRole}
                                stageProgress={progress}
                                highlighted={a.id === highlightedId}
                                onChanged={() => void loadWork()}
                                onToast={onShowToast}
                                relatedAssignments={assignments}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ))}
        </div>
      )}
    </PageContainer>
  );
};
