import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { AssignmentDto, StageProgressDto, WorkspaceAssignmentDto } from '@/types';
import { AssignmentWorkCard } from './AssignmentWorkCard';
import { errorMessage, isReviewerRole, resolvePageId } from './collaborationRules';
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
  const [loadingStudio, setLoadingStudio] = useState(false);

  const highlightedId = searchParams.get('assignmentId');

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
        const list = await assignmentService.getMyWorkspaceAssignments(workspaceId, {
          seriesId: seriesId || undefined,
        });
        setAssignments(list);
        setProgress([]);
        setScenes([]);
        setPages([]);
        setSelectedSceneId('ALL');
      } else {
        const [list, prog, sceneList, pageList] = await Promise.all([
          assignmentService.getAssignments(chapterId),
          assignmentService.getStageProgress(chapterId),
          scriptLineService.getScenesByChapter(chapterId).catch(() => [] as SceneDto[]),
          pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
        ]);
        setAssignments(list);
        setProgress(prog);
        setScenes(sceneList || []);
        setPages(pageList || []);
      }
    } finally {
      setLoadingWork(false);
    }
  }, [chapterId, workspaceId, seriesId]);

  useEffect(() => {
    void loadWork();
  }, [loadWork]);

  // Việc cá nhân xuyên chương/series của cả Studio (CF2 Cross-Chapter Worklist)
  const loadStudioWork = useCallback(async () => {
    if (!workspaceId) return;
    setLoadingStudio(true);
    try {
      setStudioWork(await assignmentService.getMyAssignments(workspaceId));
    } catch (err) {
      setError(errorMessage(err, 'Không thể tải việc toàn Studio.'));
    } finally {
      setLoadingStudio(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (tab === 'studio') void loadStudioWork();
  }, [tab, loadStudioWork]);

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

  const visible = useMemo(() => {
    const status = (a: AssignmentDto) => String(a.status);
    if (tab === 'mine') return assignments.filter((a) => a.assigneeUserId === currentUserId);
    if (tab === 'review')
      return assignments.filter((a) => status(a) === 'Submitted' || status(a) === 'UnderReview');
    return assignments;
  }, [assignments, tab, currentUserId]);

  const counts = {
    mine: assignments.filter((a) => a.assigneeUserId === currentUserId).length,
    review: assignments.filter((a) => ['Submitted', 'UnderReview'].includes(String(a.status)))
      .length,
    all: assignments.length,
    studio: studioWork.length,
  };

  const getAssignmentSceneInfo = useCallback(
    (a: AssignmentDto) => {
      const pageId = resolvePageId(a, progress);
      if (!pageId) {
        return { sceneId: 'UNASSIGNED', scene: null, page: null };
      }
      const page = pages.find((p) => p.id === pageId);
      if (!page || !page.sceneId) {
        return { sceneId: 'UNASSIGNED', scene: null, page: page ?? null };
      }
      const scene = scenes.find((s) => s.id === page.sceneId);
      if (!scene) {
        return { sceneId: 'UNASSIGNED', scene: null, page };
      }
      return { sceneId: scene.id, scene, page };
    },
    [progress, pages, scenes],
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
    if (selectedSceneId === 'ALL') return visible;
    return visible.filter((a) => getAssignmentSceneInfo(a).sceneId === selectedSceneId);
  }, [visible, selectedSceneId, getAssignmentSceneInfo]);

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
                title: 'Công việc chung / Toàn chương',
                summary: 'Các công việc cấp chương hoặc chưa gắn vào phân cảnh cụ thể',
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
        title: 'Công việc chung / Toàn chương',
        summary: 'Các công việc cấp chương hoặc chưa gắn vào phân cảnh cụ thể',
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

  const baseTabs: {
    key: Tab;
    label: string;
    icon: React.ReactNode;
    tooltip: string;
    badgeAlert?: boolean;
  }[] = reviewer
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
  const tabs = workspaceId
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
    <PageContainer className='space-y-6 py-6 text-[#0c0a09]' data-testid='my-work-view'>
      {/* Contextual Quick Breadcrumbs */}
      {workspaceId && seriesId && (
        <nav
          aria-label='Đường dẫn ngữ cảnh'
          className='flex items-center gap-1.5 text-xs text-[#777169] font-medium'
        >
          <Link
            to={`/workspaces/${workspaceId}`}
            className='hover:text-[#0c0a09] hover:underline transition-colors'
          >
            Workspace
          </Link>
          <span className='text-[#a8a29e]'>/</span>
          <Link
            to={`/workspaces/${workspaceId}/series/${seriesId}`}
            className='hover:text-[#0c0a09] hover:underline transition-colors'
          >
            Series
          </Link>
          <span className='text-[#a8a29e]'>/</span>
          <span className='text-[#0c0a09] font-bold'>
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
          <div className='w-10 h-10 rounded-full bg-[#292524] flex items-center justify-center text-white shadow-soft-sm'>
            <ClipboardList className='w-5 h-5' />
          </div>
          <div>
            <h1 className='text-2xl font-serif font-light text-[#0c0a09] tracking-tight'>
              Công việc của tôi
            </h1>
            <p className='text-xs text-[#777169]'>
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
            className='px-4 py-2 bg-white border border-[#e7e5e4] rounded-full text-xs font-medium text-[#0c0a09] shadow-soft-sm focus:outline-none focus:ring-2 focus:ring-[#292524]/10 cursor-pointer'
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
            className='p-2.5 rounded-full border border-[#e7e5e4] bg-white hover:bg-[#f0efed] shadow-soft-sm cursor-pointer transition-colors'
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#0c0a09] ${(isStudioTab ? loadingStudio : loadingWork) ? 'animate-spin' : ''}`}
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
            className={`h-9 px-3.5 rounded-full text-xs font-medium border cursor-pointer inline-flex items-center gap-2 transition-all shadow-soft-sm ${
              tab === t.key
                ? 'bg-[#292524] text-white border-[#292524] font-semibold'
                : 'bg-white text-stone-700 border-[#e7e5e4] hover:bg-[#f0efed] hover:text-[#0c0a09]'
            }`}
          >
            <span className={tab === t.key ? 'text-white' : 'text-stone-500'}>{t.icon}</span>
            <span>{t.label}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-medium leading-none ${
                t.badgeAlert
                  ? tab === t.key
                    ? 'bg-amber-500 text-white font-bold'
                    : 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                  : tab === t.key
                    ? 'bg-white/20 text-white'
                    : 'bg-[#f0efed] text-[#4e4e4e]'
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </nav>

      {/* Lọc theo Phân cảnh trong Chương (CF2 & CF3) */}
      {chapterId !== 'ALL_STUDIO' && scenes.length > 0 && !isStudioTab && (
        <div className='flex items-center gap-2 overflow-x-auto pb-1.5 pt-1 text-xs border-t border-[#F0ECE1]'>
          <span className='flex items-center gap-1 font-bold text-zinc-600 whitespace-nowrap text-xs uppercase tracking-wider shrink-0'>
            <Clapperboard className='w-3.5 h-3.5 text-[#F97316]' />
            Phân cảnh:
          </span>
          <button
            type='button'
            onClick={() => setSelectedSceneId('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              selectedSceneId === 'ALL'
                ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-2xs font-bold'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            <span>Tất cả các cảnh</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                selectedSceneId === 'ALL'
                  ? 'bg-orange-200/80 text-orange-950 font-bold'
                  : 'bg-zinc-100 text-zinc-600'
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
                      ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-2xs font-bold'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <span>
                    Cảnh {s.sceneNumber}
                    {s.heading ? `: ${s.heading}` : ''}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                      isSelected
                        ? 'bg-orange-200/80 text-orange-950 font-bold'
                        : 'bg-zinc-100 text-zinc-600'
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
                  ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-2xs font-bold'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <span>Chung / Chưa gắn cảnh</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${
                  selectedSceneId === 'UNASSIGNED'
                    ? 'bg-orange-200/80 text-orange-950 font-bold'
                    : 'bg-zinc-100 text-zinc-600'
                }`}
              >
                {sceneFilterCounts['UNASSIGNED']}
              </span>
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          role='alert'
          className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs'
        >
          {error}
        </div>
      )}

      {isStudioTab ? (
        loadingStudio ? (
          <div className='py-12 text-center text-[#888888] text-xs'>
            <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
            Đang tải việc toàn Studio...
          </div>
        ) : studioWork.length === 0 ? (
          <div
            className='py-12 text-center border border-dashed border-[#E7E7E7] rounded-xl text-xs text-[#737373]'
            data-testid='studio-work-empty'
          >
            Bạn chưa được giao việc nào trong Studio này.
          </div>
        ) : (
          <div className='space-y-3' data-testid='studio-work-list'>
            {studioWork.map((a) => (
              <div key={a.id} className='space-y-1'>
                <p className='text-xs font-semibold text-[#737373]'>
                  {a.seriesTitle} · Chương {a.chapterNumber}
                  {a.chapterTitle ? `: ${a.chapterTitle}` : ''}
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
        <div className='py-12 text-center text-[#888888] text-xs'>
          <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
          Đang tải công việc...
        </div>
      ) : visible.length === 0 ? (
        <div
          className='py-12 text-center border border-dashed border-[#E7E7E7] rounded-xl text-xs text-[#737373] space-y-2'
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
              className='text-xs font-semibold text-[#F97316] hover:underline cursor-pointer'
            >
              Xem tất cả ({counts.all}) công việc trong chương →
            </button>
          )}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className='py-10 text-center border border-dashed border-[#E7E7E7] rounded-xl text-xs text-[#737373] space-y-2'>
          <p>Không có công việc nào thuộc phân cảnh này trong mục đã chọn.</p>
          <button
            type='button'
            onClick={() => setSelectedSceneId('ALL')}
            className='text-xs font-semibold text-[#F97316] hover:underline cursor-pointer'
          >
            Xem tất cả ({visible.length}) công việc trong chương →
          </button>
        </div>
      ) : chapterId === 'ALL_STUDIO' || scenes.length === 0 ? (
        <div className='space-y-3'>
          {filteredAssignments.map((a) => (
            <div key={a.id} className='space-y-1.5'>
              {(a as any).seriesTitle && (
                <div className='flex items-center gap-1.5 text-xs font-semibold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200/80 w-fit'>
                  <span>{(a as any).seriesTitle}</span>
                  <span className='text-orange-400'>•</span>
                  <span>
                    Chương {(a as any).chapterNumber}
                    {(a as any).chapterTitle ? `: ${(a as any).chapterTitle}` : ''}
                  </span>
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
                className='rounded-2xl border border-zinc-200/80 bg-zinc-50/40 p-3.5 space-y-3 shadow-2xs'
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
                    <div className='w-7 h-7 rounded-lg bg-orange-100/90 border border-orange-200/80 flex items-center justify-center text-orange-700 shrink-0'>
                      {group.scene ? <Film className='w-4 h-4' /> : <Layers className='w-4 h-4' />}
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <h2 className='text-xs font-bold text-zinc-900 truncate'>{group.title}</h2>
                        <span className='px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white border border-zinc-200 text-zinc-700'>
                          {group.assignments.length} công việc
                        </span>
                      </div>
                      {group.summary && (
                        <p className='text-xs text-zinc-500 truncate max-w-xl'>{group.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className='flex items-center gap-2 shrink-0'>
                    <span className='text-xs font-semibold text-zinc-500'>
                      {isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                    </span>
                    <div className='p-1 rounded-md hover:bg-zinc-200/60 text-zinc-600 transition-colors'>
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
                            <span>{(a as any).seriesTitle}</span>
                            <span className='text-orange-400'>•</span>
                            <span>
                              Chương {(a as any).chapterNumber}
                              {(a as any).chapterTitle ? `: ${(a as any).chapterTitle}` : ''}
                            </span>
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
      )}
    </PageContainer>
  );
};
