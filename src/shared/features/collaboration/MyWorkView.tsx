import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/shared/ui';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  ClipboardList,
  Film,
  Layers,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Globe,
  User,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { chapterService, type ChapterDto } from '@/services/chapter.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewer = isReviewerRole(workspaceRole);

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
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

  const highlightedId = searchParams.get('taskId') || searchParams.get('assignmentId');
  const chaptersRef = useRef<ChapterDto[]>([]);
  chaptersRef.current = chapters;

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
        if (!cancelled) setError(errorMessage(err, 'Không thể tải danh sách chương.'));
      } finally {
        if (!cancelled) setLoadingChapters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [seriesId, workspaceId]);

  const loadWork = useCallback(async () => {
    if (!chapterId) return;
    setLoadingWork(true);
    try {
      if (chapterId === 'ALL_STUDIO') {
        if (!workspaceId) return;
        const [myLotsRes, reviewQueueRes, legacyList] = await Promise.all([
          typeof assignmentService.getMyTaskLots === 'function'
            ? assignmentService.getMyTaskLots(workspaceId, {
                seriesId: seriesId || undefined,
                includeCompleted: true,
              })
            : Promise.resolve([]),
          reviewer && typeof assignmentService.getTaskGridReviewQueue === 'function'
            ? assignmentService.getTaskGridReviewQueue(workspaceId, {
                seriesId: seriesId || undefined,
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
                seriesTitle: 'Series hiện tại',
                chapterId,
                chapterNumber: chapMeta?.chapterNumber ?? 0,
                chapterTitle: chapMeta?.title ?? null,
                pipelineStageId: lot.pipelineStageId,
                stageName: stg?.name || 'Công đoạn',
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
                stg?.isEnabled !== false && (t.status === 'Submitted' || t.status === 'UnderReview')
              );
            })
            .map((t) => {
              const stg = stageMap.get(t.pipelineStageId);
              return {
                taskId: t.id,
                seriesId: seriesId || '',
                seriesTitle: 'Series hiện tại',
                chapterId,
                chapterNumber: chapMeta?.chapterNumber ?? 0,
                chapterTitle: chapMeta?.title ?? null,
                pipelineStageId: t.pipelineStageId,
                stageName: stg?.name || 'Công đoạn',
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
      setError(errorMessage(err, 'Không thể tải danh sách công việc.'));
    } finally {
      setLoadingWork(false);
    }
  }, [chapterId, workspaceId, seriesId, reviewer, currentUserId]);

  useEffect(() => {
    void loadWork();
  }, [loadWork]);

  // Việc cá nhân xuyên chương/series của cả Studio (CF2 Cross-Chapter Worklist - ưu tiên Lưới V3)
  const loadStudioWork = useCallback(async () => {
    if (!workspaceId) return;
    setLoadingStudio(true);
    try {
      const [lotsRes, legacyStudio] = await Promise.all([
        typeof assignmentService.getMyTaskLots === 'function'
          ? assignmentService.getMyTaskLots(workspaceId, { includeCompleted: true })
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
      setError(errorMessage(err, 'Không thể tải việc toàn Studio.'));
    } finally {
      setLoadingStudio(false);
    }
  }, [workspaceId, currentUserId]);

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
    return s ? `${s.stageOrder}. ${s.name}` : 'Công đoạn';
  };
  const memberName = (userId: string) => {
    const m = members.find((x) => x.userId === userId);
    return m
      ? m.fullName || m.email.split('@')[0]
      : userId === currentUserId
        ? 'Bạn'
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
          title: 'Tất cả công việc',
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
                title: 'Toàn chương',
                summary: 'Việc cấp chương (Script, Review) hoặc trang chưa gắn cảnh',
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
            title: `Cảnh ${sc.sceneNumber}${sc.heading ? `: ${sc.heading}` : ''}`,
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
          title: `Cảnh ${sc.sceneNumber}${sc.heading ? `: ${sc.heading}` : ''}`,
          summary: sc.summary,
          assignments: list,
        });
      }
    }

    if (unassignedTasks.length > 0) {
      groups.push({
        sceneId: 'UNASSIGNED',
        scene: null,
        title: 'Toàn chương',
        summary: 'Việc cấp chương (Script, Review) hoặc trang chưa gắn cảnh',
        assignments: unassignedTasks,
      });
    }

    return groups;
  }, [chapterId, scenes, filteredAssignments, getAssignmentSceneInfo, selectedSceneId]);

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
          label: 'Chờ duyệt',
          icon: <CheckCircle2 className='w-3.5 h-3.5 text-amber-600' />,
          tooltip: 'Các panel/artwork đang chờ review hoặc kiểm tra chất lượng',
          badgeAlert: counts.review > 0,
        },
        {
          key: 'all',
          label: 'Tất cả',
          icon: <Layers className='w-3.5 h-3.5' />,
          tooltip: 'Tất cả công việc trong series hiện tại',
        },
        {
          key: 'mine',
          label: 'Của tôi',
          icon: <User className='w-3.5 h-3.5' />,
          tooltip: 'Công việc được giao cho bạn trong series này',
        },
      ]
    : [
        {
          key: 'mine',
          label: 'Của tôi',
          icon: <User className='w-3.5 h-3.5' />,
          tooltip: 'Công việc được giao cho bạn trong series này',
        },
        {
          key: 'all',
          label: 'Tất cả',
          icon: <Layers className='w-3.5 h-3.5' />,
          tooltip: 'Tất cả công việc trong series hiện tại',
        },
      ];
  const tabs: TabItem[] = workspaceId
    ? [
        ...baseTabs,
        {
          key: 'studio' as Tab,
          label: 'Toàn Studio',
          icon: <Globe className='w-3.5 h-3.5' />,
          tooltip: 'Công việc của bạn trên toàn bộ các series trong Studio',
        },
      ]
    : baseTabs;
  const isStudioTab = tab === 'studio';

  return (
    <PageContainer className='space-y-6 py-6 text-[#1C1917] font-sans' data-testid='my-work-view'>
      {/* Contextual Quick Breadcrumbs */}
      {workspaceId && seriesId && (
        <nav
          aria-label='Đường dẫn ngữ cảnh'
          className='flex items-center gap-1.5 text-xs text-[#57534E] font-medium'
        >
          <Link
            to={`/workspaces/${workspaceId}`}
            className='hover:text-[#1C1917] hover:underline transition-colors'
          >
            Workspace
          </Link>
          <span className='text-[#D8D2C5]'>/</span>
          <Link
            to={`/workspaces/${workspaceId}/series/${seriesId}`}
            className='hover:text-[#1C1917] hover:underline transition-colors'
          >
            Series
          </Link>
          <span className='text-[#D8D2C5]'>/</span>
          <span className='text-[#1C1917] font-bold'>
            {chapterId === 'ALL_STUDIO'
              ? 'Toàn bộ Studio'
              : chapters.find((c) => c.id === chapterId)
                ? `Chương ${chapters.find((c) => c.id === chapterId)?.chapterNumber}`
                : 'Công việc của tôi'}
          </span>
        </nav>
      )}

      <header className='flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3.5'>
          <div className='w-10 h-10 rounded-xl bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#F97316] shadow-xs'>
            <ClipboardList className='w-5 h-5' />
          </div>
          <div>
            <h1 className='text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight'>
              Công việc của tôi
            </h1>
            <p className='text-xs text-[#57534E]'>
              Bắt đầu, tải artwork, nộp bài và xử lý yêu cầu sửa của từng chương.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2.5'>
          <select
            value={chapterId}
            onChange={(e) => selectChapter(e.target.value)}
            aria-label='Chọn chương'
            disabled={loadingChapters && chapters.length === 0}
            className='px-4 py-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl text-xs font-semibold text-[#1C1917] shadow-xs focus:outline-none focus:border-[#F97316] cursor-pointer'
          >
            <option value='ALL_STUDIO'>✨ Toàn bộ Studio (Tất cả các chương)</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                Chương {c.chapterNumber}
                {c.title ? `: ${c.title}` : ''}
              </option>
            ))}
          </select>
          <button
            type='button'
            onClick={() => void (isStudioTab ? loadStudioWork() : loadWork())}
            aria-label='Tải lại'
            className='p-2.5 rounded-xl border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] shadow-xs cursor-pointer transition-colors text-[#1C1917]'
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${(isStudioTab ? loadingStudio : loadingWork) ? 'animate-spin text-[#F97316]' : ''}`}
            />
          </button>
        </div>
      </header>

      <nav className='flex flex-wrap gap-2' aria-label='Bộ lọc việc'>
        {tabs.map((t) => (
          <button
            key={t.key}
            type='button'
            onClick={() => setTab(t.key)}
            title={t.tooltip}
            aria-pressed={tab === t.key}
            className={`h-9 px-3.5 rounded-lg text-xs font-semibold border cursor-pointer inline-flex items-center gap-2 transition-all shadow-xs ${
              tab === t.key
                ? 'bg-[#FFF2E6] text-[#1C1917] border-[#C2410C]'
                : 'bg-[#FCFBF8] text-[#57534E] border-[#D8D2C5] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
            }`}
          >
            <span className={tab === t.key ? 'text-[#C2410C]' : 'text-[#78716C]'}>{t.icon}</span>
            <span>{t.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium leading-none ${
                t.badgeAlert
                  ? tab === t.key
                    ? 'bg-[#F97316] text-white font-bold'
                    : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : tab === t.key
                    ? 'bg-[#F97316]/20 text-[#C2410C] font-semibold'
                    : 'bg-[#F3F0E9] text-[#78716C]'
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </nav>

      {/* Lọc theo Phân cảnh trong Chương (CF2 & CF3) */}
      {chapterId !== 'ALL_STUDIO' && scenes.length > 0 && !isStudioTab && (
        <div className='flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 text-xs border-t border-[#D8D2C5]/60'>
          <span className='flex items-center gap-1 font-bold text-[#57534E] whitespace-nowrap text-xs uppercase tracking-wider shrink-0'>
            <Clapperboard className='w-3.5 h-3.5 text-[#F97316]' />
            Phân cảnh:
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
            <span>Tất cả các cảnh</span>
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
                    Cảnh {s.sceneNumber}
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
              <span>Toàn chương</span>
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
        <Alert tone='danger' className='text-xs'>
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
              Mục công việc này thuộc <strong>Lưới giao việc V3</strong> của chương.
            </span>
            <Link
              to={`/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${encodeURIComponent(chapterId)}&board=grid-v3`}
              className='px-3 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold shrink-0'
            >
              Mở Lưới V3 →
            </Link>
          </div>
        )}

      {isStudioTab ? (
        loadingStudio ? (
          <div className='py-12 text-center text-[#888888] text-xs'>
            <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
            Đang tải việc toàn Studio...
          </div>
        ) : studioLots.length === 0 && studioWork.length === 0 ? (
          <div
            className='py-12 text-center border border-dashed border-[#D8D2C5] bg-[#FCFBF8] rounded-xl text-xs text-[#57534E]'
            data-testid='studio-work-empty'
          >
            Bạn chưa được giao việc nào trong Studio này.
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
                onChanged={() => void loadStudioWork()}
                onCellsUpdated={applyLotCellUpdates}
                onToast={onShowToast}
              />
            ))}
            {sortedStudioWork.map((a) => (
              <div key={a.id} className='space-y-1'>
                <p className='text-xs font-semibold text-[#57534E]'>
                  Series: {a.seriesTitle} | Chương {a.chapterNumber}
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
          Đang tải công việc...
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
                ? 'Không có việc nào đang chờ duyệt trong toàn bộ Studio.'
                : tab === 'mine'
                  ? 'Bạn không có nhiệm vụ nào được phân công trong toàn bộ Studio.'
                  : 'Chưa có công việc nào trong Studio.'
              : tab === 'review'
                ? 'Không có việc nào đang chờ duyệt trong chương này.'
                : tab === 'mine'
                  ? 'Bạn không có nhiệm vụ được phân công trực tiếp trong chương này.'
                  : 'Chưa có công việc nào trong chương này.'}
          </p>
          {tab !== 'all' && counts.all > 0 && (
            <button
              type='button'
              onClick={() => setTab('all')}
              className='text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer'
            >
              Xem tất cả ({counts.all}) công việc trong chương →
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
                    item.assigneeUserId ? memberName(item.assigneeUserId) : 'Chưa rõ người nộp'
                  }
                  reviewerName={
                    item.reviewerName ??
                    (item.reviewerUserId ? memberName(item.reviewerUserId) : null)
                  }
                  currentUserId={currentUserId}
                  isProducer={String(workspaceRole || '').toUpperCase() === 'PRODUCER'}
                  highlighted={item.taskId === highlightedId}
                  onChanged={() => void loadWork()}
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
                    onChanged={() => void loadWork()}
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
                <p>Không có công việc nào thuộc phân cảnh này trong mục đã chọn.</p>
                <button
                  type='button'
                  onClick={() => setSelectedSceneId('ALL')}
                  className='text-xs font-semibold text-[#C2410C] hover:underline cursor-pointer'
                >
                  Xem tất cả ({visible.length}) công việc trong chương →
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
                        <span>Chương {(a as any).chapterNumber}</span>
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
                                {group.assignments.length} công việc
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
                            {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
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
                                  <span>Chương {(a as any).chapterNumber}</span>
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
