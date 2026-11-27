import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, IconButton, PageHeader } from '@/shared/ui';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  ClipboardList,
  CalendarClock,
  Film,
  Layers,
  Loader2,
  MessageSquare,
  Palette,
  PenLine,
  RefreshCw,
  CheckCircle2,
  Globe,
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
  type BibleEntryDto,
} from '@/services/bible.service';
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
import {
  ContinueCard,
  DesignStatus,
  DesignThumb,
  OverviewEmpty,
  OverviewLinkButton,
  OverviewList,
  OverviewMetrics,
  OverviewPanel,
  OverviewRow,
} from './WorkspaceOverview';
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
  const { t, lang: locale } = useTranslation('collaboration');
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewer = isReviewerRole(workspaceRole);
  const normalizedRole = String(workspaceRole || '').toUpperCase();
  const isWriter = normalizedRole === 'WRITER';
  const isArtist = normalizedRole === 'ARTIST';
  const isFeedbackView = searchParams.get('view') === 'feedback';

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [writerBibleEntries, setWriterBibleEntries] = useState<BibleEntryDto[]>([]);
  const [writerDesignQueue, setWriterDesignQueue] = useState<BibleDesignQueueItemDto[]>([]);
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
      .then((s) => {
        setSeriesTitle(s?.title ?? '');
      })
      .catch(() => {
        setSeriesTitle('');
      });
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

  useEffect(() => {
    if (!seriesId || !isWriter) return;
    let cancelled = false;
    void Promise.all([
      bibleService.getSeriesBible(seriesId).catch(() => null),
      bibleService.getBibleDesignQueue(seriesId).catch(() => []),
    ]).then(([bible, queue]) => {
      if (cancelled) return;
      setWriterBibleEntries(bible?.entries ?? []);
      setWriterDesignQueue(queue ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [isWriter, seriesId]);

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
    lot.tasks.filter((cell) => cell.status === 'ReworkRequired').map((cell) => ({ lot, cell })),
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

  const scrollToSection = (id: string) => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(id)
      ?.scrollIntoView?.({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const writerActiveChapter = useMemo(
    () =>
      [...chapters]
        .filter((chapter) => !chapter.isScriptFrozen && chapter.scriptStatus !== 'Frozen')
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        })[0] ?? null,
    [chapters],
  );

  const writerAssignedChapterCount = useMemo(() => {
    const assignedChapterIds = new Set<string>();
    gridLots.forEach((lot) => {
      if (lot.status !== 'Completed') assignedChapterIds.add(lot.chapterId);
    });
    assignments.forEach((assignment) => {
      if (!currentUserId || assignment.assigneeUserId === currentUserId) {
        assignedChapterIds.add(assignment.chapterId);
      }
    });
    return assignedChapterIds.size;
  }, [assignments, currentUserId, gridLots]);

  const writerWritingCount = useMemo(
    () =>
      chapters.filter(
        (chapter) =>
          !chapter.isScriptFrozen &&
          chapter.scriptStatus !== 'Frozen' &&
          chapter.scriptStatus !== 'InReview',
      ).length,
    [chapters],
  );

  const writerWaitingReviewCount = useMemo(
    () => chapters.filter((chapter) => chapter.scriptStatus === 'InReview').length,
    [chapters],
  );

  const writerCharactersMissingNotes = useMemo(
    () =>
      writerBibleEntries.filter((entry) => {
        const category = String(entry.category).toLowerCase();
        const isCharacter = category === 'character' || category === '0';
        const notes = entry.effectiveRevision?.artistNotes || entry.artistNotes;
        return isCharacter && entry.isActive !== false && (entry.isStub || !notes?.trim());
      }),
    [writerBibleEntries],
  );

  const writerReworkCells = useMemo(
    () =>
      gridLots.flatMap((lot) =>
        lot.tasks.filter((task) => task.status === 'ReworkRequired').map((task) => ({ lot, task })),
      ),
    [gridLots],
  );

  const writerBibleRework = useMemo(
    () => writerDesignQueue.filter((item) => item.reviewStatus === 'ReworkRequired'),
    [writerDesignQueue],
  );

  if (isWriter) {
    const firstMissingNotes = writerCharactersMissingNotes[0];
    const activeChapterHref = writerActiveChapter
      ? `/workspaces/${workspaceId}/series/${seriesId}/script/editor?chapterId=${writerActiveChapter.id}`
      : `/workspaces/${workspaceId}/series/${seriesId}/script`;
    const bibleHref = firstMissingNotes
      ? `/workspaces/${workspaceId}/series/${seriesId}/bible?search=${encodeURIComponent(firstMissingNotes.name)}`
      : `/workspaces/${workspaceId}/series/${seriesId}/bible`;
    const feedbackCount = writerReworkCells.length + writerBibleRework.length;
    const lastEdited = writerActiveChapter?.updatedAt || writerActiveChapter?.createdAt;

    const scriptListHref = `/workspaces/${workspaceId}/series/${seriesId}/script`;
    const writerPendingCount = writerCharactersMissingNotes.length + feedbackCount;

    return (
      <PageContainer
        className='space-y-5 py-6 text-stone-900 font-sans'
        data-testid='writer-workspace-overview'
      >
        <PageHeader
          icon={<PenLine aria-hidden='true' />}
          eyebrow={t('writerStudio.workspaceEyebrow', {
            series: seriesTitle || t('myWork.currentSeries'),
          })}
          title={t('writerStudio.creativeWorkspace')}
          description={t('myWork.greeting', { name: currentMemberName })}
          actions={
            <Button
              size='sm'
              variant='secondary'
              onClick={() => void loadWork()}
              loading={loadingWork}
              leadingIcon={<RefreshCw aria-hidden='true' />}
            >
              {t('myWork.reload')}
            </Button>
          }
        />

        <OverviewMetrics
          ariaLabel={t('writerStudio.summaryAria')}
          items={[
            {
              key: 'assigned',
              value: writerAssignedChapterCount,
              label: t('writerStudio.assignedChapters'),
              icon: <ClipboardList />,
              to: scriptListHref,
              testId: 'writer-metric-assigned',
            },
            {
              key: 'writing',
              value: writerWritingCount,
              label: t('writerStudio.currentlyWriting'),
              icon: <PenLine />,
              to: activeChapterHref,
              testId: 'writer-metric-writing',
            },
            {
              key: 'collaborating',
              value: writerDesignQueue.length,
              label: t('writerStudio.collaborating'),
              icon: <Palette />,
              tone: 'info',
              onClick: () => scrollToSection('writer-collaboration'),
              testId: 'writer-metric-collaborating',
            },
            {
              key: 'review',
              value: writerWaitingReviewCount,
              label: t('writerStudio.awaitingReview'),
              icon: <CheckCircle2 />,
              tone: 'warning',
              attention: true,
              to: scriptListHref,
              testId: 'writer-metric-review',
            },
          ]}
        />

        <ContinueCard
          eyebrow={t('writerStudio.continueSection')}
          title={
            writerActiveChapter
              ? t('writerStudio.chapterTitle', {
                  number: writerActiveChapter.chapterNumber,
                  title: writerActiveChapter.title || t('writerStudio.untitledChapter'),
                })
              : t('writerStudio.noActiveChapter')
          }
          badge={
            writerActiveChapter && (
              <Badge tone='brand'>
                {t('writerStudio.writingVersion', {
                  version: writerActiveChapter.versionVector || 1,
                })}
              </Badge>
            )
          }
          action={
            <OverviewLinkButton
              to={activeChapterHref}
              trailingIcon={<ChevronRight aria-hidden='true' />}
            >
              {writerActiveChapter
                ? t('writerStudio.continueAction')
                : t('writerStudio.openScripts')}
            </OverviewLinkButton>
          }
        >
          {writerActiveChapter ? (
            <>
              <p className='max-w-3xl text-sm leading-relaxed text-stone-700'>
                {writerActiveChapter.outline || t('myWork.noOutline')}
              </p>
              <dl className='flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-600'>
                <div className='flex items-center gap-1.5'>
                  <Film className='h-3.5 w-3.5 text-accent-dark' aria-hidden='true' />
                  <dt className='sr-only'>{t('writerStudio.scenesMetric')}</dt>
                  <dd>
                    {t('writerStudio.scenesCount', {
                      count: writerActiveChapter.scenesCount || 0,
                    })}
                  </dd>
                </div>
                <div className='flex items-center gap-1.5'>
                  <BookOpen className='h-3.5 w-3.5 text-accent-dark' aria-hidden='true' />
                  <dt className='sr-only'>{t('writerStudio.pagesMetric')}</dt>
                  <dd>{t('myWork.pagesCount', { count: writerActiveChapter.pagesCount || 0 })}</dd>
                </div>
                {lastEdited && (
                  <div className='flex items-center gap-1.5'>
                    <CalendarClock className='h-3.5 w-3.5 text-accent-dark' aria-hidden='true' />
                    <dt>{t('writerStudio.lastEdited')}</dt>
                    <dd>
                      <time dateTime={lastEdited}>
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(lastEdited))}
                      </time>
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p className='text-sm text-stone-600'>{t('writerStudio.noActiveChapterDesc')}</p>
          )}
        </ContinueCard>

        <div className='grid grid-cols-1 gap-5 xl:grid-cols-2'>
          <OverviewPanel
            id='writer-action-center'
            icon={<ClipboardList />}
            title={t('writerStudio.actionCenter')}
            count={writerPendingCount}
            emphasized={isFeedbackView}
          >
            <OverviewList>
              {writerCharactersMissingNotes.length > 0 && (
                <OverviewRow
                  to={bibleHref}
                  leading={<PenLine className='text-accent-dark' aria-hidden='true' />}
                  title={t('writerStudio.completeCharacterNotes')}
                  meta={t('writerStudio.charactersNeedNotes', {
                    count: writerCharactersMissingNotes.length,
                  })}
                />
              )}
              <OverviewRow
                to={activeChapterHref}
                leading={<BookOpen className='text-accent-dark' aria-hidden='true' />}
                title={t('writerStudio.checkScriptReadiness')}
                meta={t('writerStudio.scriptReadinessDesc', {
                  chapter: writerActiveChapter?.chapterNumber ?? '—',
                })}
              />
              {writerBibleRework.slice(0, 3).map((item) => (
                <OverviewRow
                  key={item.revisionId}
                  tone='danger'
                  to={`/workspaces/${workspaceId}/series/${seriesId}/bible?search=${encodeURIComponent(item.name)}`}
                  leading={<MessageSquare className='text-rose-700' aria-hidden='true' />}
                  title={item.name}
                  meta={item.reworkFeedback || t('writerStudio.feedbackNeedsAction')}
                  status={
                    <span className='text-rose-700'>
                      {t('writerStudio.designStatus.ReworkRequired')}
                    </span>
                  }
                />
              ))}
              {writerReworkCells.length > 0 && (
                <OverviewRow
                  tone='danger'
                  to={activeChapterHref}
                  leading={<MessageSquare className='text-rose-700' aria-hidden='true' />}
                  title={t('writerStudio.feedbackNeedsAction')}
                  meta={t('writerStudio.feedbackNeedsActionDesc', {
                    count: writerReworkCells.length,
                  })}
                />
              )}
            </OverviewList>
          </OverviewPanel>

          <OverviewPanel
            id='writer-collaboration'
            icon={<Palette />}
            tone='info'
            title={t('writerStudio.artistCollaboration')}
            count={writerDesignQueue.length}
          >
            {writerDesignQueue.length > 0 ? (
              <OverviewList>
                {writerDesignQueue.slice(0, 5).map((item) => (
                  <OverviewRow
                    key={item.revisionId}
                    to={`/workspaces/${workspaceId}/series/${seriesId}/bible?search=${encodeURIComponent(item.name)}`}
                    leading={<DesignThumb item={item} />}
                    title={item.name}
                    meta={`${item.variantLabel || t('writerStudio.defaultVariant')} · v${item.versionNumber || 1}`}
                    status={<DesignStatus status={item.reviewStatus} />}
                  />
                ))}
              </OverviewList>
            ) : (
              <OverviewEmpty
                icon={<Palette className='h-5 w-5 text-stone-400' aria-hidden='true' />}
              >
                {t('writerStudio.noArtistCollaboration')}
              </OverviewEmpty>
            )}
          </OverviewPanel>
        </div>
      </PageContainer>
    );
  }

  const deskHref = `/workspaces/${workspaceId}/series/${seriesId}/artist`;
  const bibleListHref = `/workspaces/${workspaceId}/series/${seriesId}/bible`;
  const artistActiveStageIndex = artistPrimaryLot
    ? stages.findIndex((stage) => stage.id === artistPrimaryLot.pipelineStageId)
    : -1;
  const showTaskList = (nextTab: Tab) => {
    setTab(nextTab);
    scrollToSection('my-work-list');
  };

  return (
    <PageContainer className='space-y-5 py-6 text-stone-900 font-sans' data-testid='my-work-view'>
      <PageHeader
        icon={isArtist ? <Palette aria-hidden='true' /> : <Layers aria-hidden='true' />}
        eyebrow={
          isArtist
            ? t('myWork.artistOverview.workspaceEyebrow', {
                series: seriesTitle || t('myWork.currentSeries'),
              })
            : seriesTitle || t('myWork.currentSeries')
        }
        title={isArtist ? t('myWork.artistOverview.title') : t('myWork.title')}
        description={
          isArtist ? t('myWork.greeting', { name: currentMemberName }) : t('myWork.desc')
        }
        actions={
          isArtist && workspaceId && seriesId ? (
            <div className='flex flex-wrap items-center gap-2'>
              <OverviewLinkButton
                to={bibleListHref}
                variant='secondary'
                icon={<BookOpen aria-hidden='true' />}
              >
                {t('myWork.artistOverview.openDesignRequests')}
              </OverviewLinkButton>
              <OverviewLinkButton to={deskHref} icon={<Palette aria-hidden='true' />}>
                {t('myWork.artistOverview.openDesk')}
              </OverviewLinkButton>
            </div>
          ) : undefined
        }
      />

      {isArtist && (
        <OverviewMetrics
          ariaLabel={t('myWork.artistOverview.summaryAria')}
          items={[
            {
              key: 'assigned',
              value: artistSummary.assigned,
              label: t('myWork.artistOverview.assigned'),
              icon: <ClipboardList />,
              onClick: () => showTaskList('mine'),
              testId: 'artist-metric-assigned',
            },
            {
              key: 'design',
              value: artistDesignQueue.length,
              label: t('myWork.artistOverview.designRequests'),
              icon: <Palette />,
              tone: 'info',
              onClick: () => scrollToSection('artist-design-requests'),
              testId: 'artist-metric-design',
            },
            {
              key: 'pending',
              value: artistSummary.pendingReview,
              label: t('myWork.artistOverview.pendingReview'),
              icon: <CheckCircle2 />,
              tone: 'warning',
              onClick: () => showTaskList('mine'),
              testId: 'artist-metric-pending',
            },
            {
              key: 'revisions',
              value: artistSummary.revisions,
              label: t('myWork.artistOverview.revisions'),
              icon: <RotateCcw />,
              tone: 'danger',
              attention: true,
              onClick: () => scrollToSection('artist-revisions'),
              testId: 'artist-metric-revisions',
            },
          ]}
        />
      )}

      {isArtist && workspaceId && seriesId && (
        <ContinueCard
          testId='artist-continue-production'
          eyebrow={t('myWork.artistOverview.continueProduction')}
          title={
            artistPrimaryLot
              ? t('myWork.artistOverview.chapterTitle', {
                  number: artistPrimaryLot.chapterNumber,
                  title: artistPrimaryLot.chapterTitle || t('writerStudio.untitledChapter'),
                })
              : t('myWork.artistOverview.noActiveProduction')
          }
          badge={artistPrimaryLot && <Badge tone='brand'>{artistPrimaryLot.stageName}</Badge>}
          action={
            <OverviewLinkButton
              to={
                artistPrimaryLot
                  ? `${deskHref}?chapterId=${encodeURIComponent(artistPrimaryLot.chapterId)}`
                  : deskHref
              }
              trailingIcon={<ChevronRight aria-hidden='true' />}
            >
              {t('myWork.artistOverview.openDesk')}
            </OverviewLinkButton>
          }
        >
          {artistPrimaryLot ? (
            <>
              <p className='max-w-3xl text-sm leading-relaxed text-stone-700'>
                {artistPrimaryLot.brief || t('myWork.artistOverview.checkAssignment')}
              </p>
              <dl className='flex flex-wrap gap-x-5 gap-y-2 text-xs text-stone-600'>
                <div className='flex items-center gap-1.5'>
                  <BookOpen className='h-3.5 w-3.5 text-accent-dark' aria-hidden='true' />
                  <dt className='sr-only'>{t('writerStudio.pagesMetric')}</dt>
                  <dd>
                    {t('myWork.artistOverview.productionScope', {
                      pages:
                        artistPrimaryLot.tasks
                          .map((task) => task.pageNumber)
                          .filter((page): page is number => page != null)
                          .join(', ') || '—',
                      stage: artistPrimaryLot.stageName,
                    })}
                  </dd>
                </div>
                <div className='flex items-center gap-1.5'>
                  <ClipboardList className='h-3.5 w-3.5 text-accent-dark' aria-hidden='true' />
                  <dt className='sr-only'>{t('myWork.artistOverview.assigned')}</dt>
                  <dd>{t('myWork.tasksCount', { count: artistPrimaryLot.tasks.length })}</dd>
                </div>
              </dl>
              {stages.length > 0 && (
                <ol
                  className='flex flex-wrap items-center gap-1.5'
                  aria-label={t('myWork.artistOverview.stageAria')}
                >
                  {stages.map((stage, index) => {
                    const state =
                      index === artistActiveStageIndex
                        ? 'active'
                        : artistActiveStageIndex >= 0 && index < artistActiveStageIndex
                          ? 'done'
                          : 'upcoming';
                    return (
                      <li key={stage.id} className='flex items-center gap-1.5'>
                        <span
                          aria-current={state === 'active' ? 'step' : undefined}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                            state === 'active'
                              ? 'border-accent bg-accent-soft text-accent-dark'
                              : state === 'done'
                                ? 'border-stone-200 bg-white text-stone-600'
                                : 'border-stone-200 bg-stone-50 text-stone-500'
                          }`}
                        >
                          {state === 'done' && (
                            <CheckCircle2 className='h-3 w-3 text-emerald-600' aria-hidden='true' />
                          )}
                          {stage.name}
                        </span>
                        {index < stages.length - 1 && (
                          <ChevronRight className='h-3 w-3 text-stone-300' aria-hidden='true' />
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          ) : (
            <p className='text-sm text-stone-600'>
              {t('myWork.artistOverview.noActiveProductionDesc')}
            </p>
          )}
        </ContinueCard>
      )}

      {isArtist && workspaceId && seriesId && (
        <div className='grid grid-cols-1 gap-5 xl:grid-cols-2'>
          <OverviewPanel
            id='artist-revisions'
            icon={<RotateCcw />}
            tone={artistSummary.revisions > 0 ? 'danger' : 'brand'}
            title={t('myWork.artistOverview.revisionSectionTitle')}
            count={artistProductionReworks.length + artistDesignReworks.length}
            emphasized={isFeedbackView}
          >
            {artistProductionReworks.length + artistDesignReworks.length === 0 ? (
              <OverviewEmpty
                icon={<CheckCircle2 className='h-5 w-5 text-emerald-600' aria-hidden='true' />}
              >
                {t('myWork.artistOverview.noRevisions')}
              </OverviewEmpty>
            ) : (
              <OverviewList>
                {artistProductionReworks.map(({ lot, cell }) => (
                  <OverviewRow
                    key={cell.id}
                    tone='danger'
                    to={`${deskHref}?chapterId=${encodeURIComponent(lot.chapterId)}&taskId=${encodeURIComponent(cell.id)}`}
                    leading={<Film className='text-rose-700' aria-hidden='true' />}
                    title={t('myWork.artistOverview.revisionProductionTitle', {
                      chapter: lot.chapterNumber,
                      page: cell.pageNumber ?? '—',
                    })}
                    meta={cell.lastDecisionComment || lot.stageName}
                  />
                ))}
                {artistDesignReworks.map((item) => (
                  <OverviewRow
                    key={item.revisionId || item.entryId}
                    tone='danger'
                    to={`${bibleListHref}?entityId=${encodeURIComponent(item.entryId)}`}
                    leading={<DesignThumb item={item} />}
                    title={item.name}
                    meta={item.reworkFeedback || t('myWork.artistOverview.designRevisionFallback')}
                    status={<DesignStatus status={item.reviewStatus} />}
                  />
                ))}
              </OverviewList>
            )}
          </OverviewPanel>

          <OverviewPanel
            id='artist-design-requests'
            icon={<Palette />}
            tone='info'
            title={t('myWork.artistOverview.designSectionTitle')}
            count={artistDesignQueue.length}
            action={
              artistDesignQueue.length > 0 ? (
                <Link
                  to={bibleListHref}
                  className='text-xs font-semibold text-accent-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark'
                >
                  {t('myWork.artistOverview.viewAllDesignRequests')}
                </Link>
              ) : undefined
            }
          >
            {artistDesignQueue.length > 0 ? (
              <OverviewList>
                {artistDesignQueue.slice(0, 5).map((item) => (
                  <OverviewRow
                    key={item.revisionId || item.entryId}
                    to={`${bibleListHref}?entityId=${encodeURIComponent(item.entryId)}`}
                    leading={<DesignThumb item={item} />}
                    title={item.name}
                    meta={t('myWork.artistOverview.designRequestMeta', {
                      variant: item.variantLabel || t('myWork.artistOverview.defaultVariant'),
                      chapters: item.waitingChapterNumbers?.join(', ') || '—',
                    })}
                    status={<DesignStatus status={item.reviewStatus} />}
                  />
                ))}
              </OverviewList>
            ) : (
              <OverviewEmpty
                icon={<Palette className='h-5 w-5 text-stone-400' aria-hidden='true' />}
              >
                {t('myWork.artistOverview.noDesignRequests')}
              </OverviewEmpty>
            )}
          </OverviewPanel>
        </div>
      )}

      <section
        id='my-work-list'
        className='scroll-mt-6 space-y-3'
        aria-labelledby='my-work-list-title'
      >
        <div className='flex flex-col gap-3 border-b border-head-line pb-3 sm:flex-row sm:items-center sm:justify-between'>
          <h2 id='my-work-list-title' className='font-serif text-lg font-bold text-stone-900'>
            {t('myWork.taskListTitle')}
          </h2>
          <div className='flex items-center gap-2'>
            <select
              value={chapterId}
              onChange={(e) => selectChapter(e.target.value)}
              aria-label={t('collaboration.myWork.selectChapterAria')}
              disabled={loadingChapters && chapters.length === 0}
              className='h-9 min-w-0 max-w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-900 focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark'
            >
              <option value='ALL_STUDIO'>{t('collaboration.myWork.allStudioOption')}</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {t('myWork.chapterOption', { number: c.chapterNumber })}
                  {c.title ? `: ${c.title}` : ''}
                </option>
              ))}
            </select>
            <IconButton
              size='sm'
              variant='secondary'
              aria-label={t('collaboration.myWork.reload')}
              onClick={() => void (isStudioTab ? loadStudioWork() : loadWork())}
              icon={
                <RefreshCw
                  aria-hidden='true'
                  className={(isStudioTab ? loadingStudio : loadingWork) ? 'animate-spin' : ''}
                />
              }
            />
          </div>
        </div>

        <nav className='flex flex-wrap gap-2' aria-label={t('myWork.filterAria')}>
          {tabs.map((tabItem) => (
            <button
              key={tabItem.key}
              type='button'
              onClick={() => setTab(tabItem.key)}
              title={tabItem.tooltip}
              aria-pressed={tab === tabItem.key}
              className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark ${
                tab === tabItem.key
                  ? 'border-accent bg-accent-soft text-stone-900'
                  : 'border-stone-200 bg-white text-stone-600 hover:bg-head-wash hover:text-stone-900'
              }`}
            >
              <span className={tab === tabItem.key ? 'text-accent-dark' : 'text-stone-500'}>
                {tabItem.icon}
              </span>
              <span>{tabItem.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold leading-none ${
                  tabItem.badgeAlert
                    ? 'bg-amber-100 text-amber-900'
                    : tab === tabItem.key
                      ? 'bg-accent text-white'
                      : 'bg-kraft text-kraft-ink'
                }`}
              >
                {counts[tabItem.key]}
              </span>
            </button>
          ))}
        </nav>
      </section>

      {/* Lọc theo Phân cảnh trong Chương (CF2 & CF3) */}
      {chapterId !== 'ALL_STUDIO' && scenes.length > 0 && !isStudioTab && (
        <div className='flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 text-xs border-t border-stone-200'>
          <span className='flex items-center gap-1 font-bold text-stone-600 whitespace-nowrap text-xs uppercase tracking-wider shrink-0'>
            <Clapperboard className='w-3.5 h-3.5 text-accent' />
            {t('myWork.scenesLabel')}
          </span>
          <button
            type='button'
            onClick={() => setSelectedSceneId('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedSceneId === 'ALL'
                ? 'bg-accent-soft border-accent text-stone-900 font-bold shadow-xs'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-head-wash hover:text-stone-900'
            }`}
          >
            <span>{t('myWork.allScenes')}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                selectedSceneId === 'ALL'
                  ? 'bg-accent/20 text-accent-dark font-bold'
                  : 'bg-kraft text-stone-500'
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
                      ? 'bg-accent-soft border-accent text-stone-900 font-bold shadow-xs'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-head-wash hover:text-stone-900'
                  }`}
                >
                  <span>
                    {t('myWork.scene', { number: s.sceneNumber })}
                    {s.heading ? `: ${s.heading}` : ''}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                      isSelected
                        ? 'bg-accent/20 text-accent-dark font-bold'
                        : 'bg-kraft text-stone-500'
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
                  ? 'bg-accent-soft border-accent text-stone-900 font-bold shadow-xs'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-head-wash hover:text-stone-900'
              }`}
            >
              <span>{t('myWork.wholeChapter')}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                  selectedSceneId === 'UNASSIGNED'
                    ? 'bg-accent/20 text-accent-dark font-bold'
                    : 'bg-kraft text-stone-500'
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
              className='px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold shrink-0'
            >
              {t('myWork.openGridV3Arrow')}
            </Link>
          </div>
        )}

      {isStudioTab ? (
        loadingStudio ? (
          <div className='py-12 text-center text-stone-500 text-xs'>
            <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-accent' />
            {t('myWork.loadingStudio')}
          </div>
        ) : studioLots.length === 0 && studioWork.length === 0 ? (
          <div
            className='py-12 text-center border border-dashed border-stone-200 bg-white rounded-xl text-xs text-stone-600'
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
                <p className='text-xs font-semibold text-stone-600'>
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
        <div className='py-12 text-center text-stone-500 text-xs'>
          <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-accent' />
          {t('myWork.loadingWork')}
        </div>
      ) : visibleGridLots.length === 0 &&
        visibleGridReviews.length === 0 &&
        visible.length === 0 ? (
        <div
          className='py-12 text-center border border-dashed border-stone-200 bg-white rounded-xl text-xs text-stone-600 space-y-2'
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
              className='text-xs font-semibold text-accent-dark hover:underline cursor-pointer'
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
              <div className='py-10 text-center border border-dashed border-stone-200 bg-white rounded-xl text-xs text-stone-600 space-y-2'>
                <p>{t('myWork.emptyScene')}</p>
                <button
                  type='button'
                  onClick={() => setSelectedSceneId('ALL')}
                  className='text-xs font-semibold text-accent-dark hover:underline cursor-pointer'
                >
                  {t('myWork.viewAllChapterTasks', { count: visible.length })}
                </button>
              </div>
            ) : chapterId === 'ALL_STUDIO' || scenes.length === 0 ? (
              <div className='space-y-3'>
                {filteredAssignments.map((a) => (
                  <div key={a.id} className='space-y-1.5'>
                    {(a as any).seriesTitle && (
                      <div className='flex items-center gap-1.5 text-xs font-semibold text-accent-dark bg-accent-soft px-2.5 py-1 rounded-md border border-accent/30 w-fit'>
                        <span>Series: {(a as any).seriesTitle}</span>
                        <span className='text-accent'>|</span>
                        <span>
                          {t('myWork.chapterOption', { number: (a as any).chapterNumber })}
                        </span>
                        {(a as any).scopeLabel && (
                          <>
                            <span className='text-accent'>|</span>
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
                      className='rounded-2xl border border-stone-200 bg-white p-3.5 space-y-3 shadow-xs'
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
                          <div className='w-7 h-7 rounded-lg bg-accent-soft border border-accent/30 flex items-center justify-center text-accent shrink-0'>
                            {group.scene ? (
                              <Film className='w-4 h-4' />
                            ) : (
                              <Layers className='w-4 h-4' />
                            )}
                          </div>
                          <div className='min-w-0'>
                            <div className='flex items-center gap-2'>
                              <h2 className='text-xs font-bold text-stone-900 truncate'>
                                {group.title}
                              </h2>
                              <span className='px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-kraft border border-stone-200 text-stone-600'>
                                {t('myWork.tasksCount', { count: group.assignments.length })}
                              </span>
                            </div>
                            {group.summary && (
                              <p className='text-xs text-stone-600 truncate max-w-xl'>
                                {group.summary}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          <span className='text-xs font-semibold text-stone-600'>
                            {isCollapsed ? t('myWork.expand') : t('myWork.collapse')}
                          </span>
                          <div className='p-1 rounded-md hover:bg-head-wash text-stone-500 hover:text-stone-900 transition-colors'>
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
