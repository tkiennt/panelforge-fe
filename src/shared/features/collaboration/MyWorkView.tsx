import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { chapterService, type ChapterDto } from '@/services/chapter.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
import type { AssignmentDto, StageProgressDto } from '@/types';
import { AssignmentWorkCard } from './AssignmentWorkCard';
import { errorMessage, isReviewerRole } from './collaborationRules';
import { PageContainer } from '@/shared/components/PageContainer';

interface MyWorkViewProps {
  currentUserId?: string | null;
  workspaceRole?: string | null;
  onShowToast?: (title: string, desc: string) => void;
}

type Tab = 'mine' | 'review' | 'all';

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
  const [chapterId, setChapterId] = useState<string>(searchParams.get('chapterId') ?? '');
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [progress, setProgress] = useState<StageProgressDto[]>([]);
  const [tab, setTab] = useState<Tab>(() => (reviewer ? 'review' : 'mine'));
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loadingWork, setLoadingWork] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        const [list, prog] = await Promise.all([
          assignmentService.getAssignments(chapterId),
          assignmentService.getStageProgress(chapterId),
        ]);
        setAssignments(list);
        setProgress(prog);
      }
    } finally {
      setLoadingWork(false);
    }
  }, [chapterId, workspaceId, seriesId]);

  useEffect(() => {
    void loadWork();
  }, [loadWork]);

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
  };

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
    document
      .getElementById(`assignment-${highlightedId}`)
      ?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [highlightedId, loadingWork, assignments]);

  const selectChapter = (id: string) => {
    setChapterId(id);
    setSearchParams(id && id !== 'ALL_STUDIO' ? { chapterId: id } : id === 'ALL_STUDIO' ? { view: 'all' } : {});
  };

  const tabs: { key: Tab; label: string; badgeAlert?: boolean }[] = reviewer
    ? [
        { key: 'review', label: 'Chờ duyệt', badgeAlert: counts.review > 0 },
        { key: 'all', label: 'Tất cả công việc' },
        { key: 'mine', label: 'Việc của tôi' },
      ]
    : [
        { key: 'mine', label: 'Việc của tôi' },
        { key: 'all', label: 'Tất cả' },
      ];

  return (
    <PageContainer className='space-y-5 py-6' data-testid='my-work-view'>
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316]'>
            <ClipboardList className='w-5 h-5' />
          </div>
          <div>
            <h1 className='text-lg font-bold text-[#171717]'>Công việc của tôi</h1>
            <p className='text-xs text-[#737373]'>
              Bắt đầu, tải artwork, nộp bài và xử lý yêu cầu sửa của từng chương.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <select
            value={chapterId}
            onChange={(e) => selectChapter(e.target.value)}
            aria-label='Chọn chương'
            disabled={loadingChapters && chapters.length === 0}
            className='px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-lg text-xs font-semibold'
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
            onClick={() => void loadWork()}
            aria-label='Tải lại'
            className='p-2 rounded-lg border border-[#E7E7E7] bg-white hover:bg-zinc-50 cursor-pointer'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingWork ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <nav className='flex gap-1.5' aria-label='Bộ lọc việc'>
        {tabs.map((t) => (
          <button
            key={t.key}
            type='button'
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
              tab === t.key
                ? 'bg-[#171717] text-white border-[#171717]'
                : 'bg-white text-[#555555] border-[#E7E7E7] hover:bg-zinc-50'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                t.badgeAlert
                  ? tab === t.key
                    ? 'bg-amber-500 text-white font-bold'
                    : 'bg-amber-100 text-amber-800 font-bold border border-amber-300'
                  : tab === t.key
                    ? 'bg-zinc-700 text-zinc-200'
                    : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </nav>

      {error && (
        <div
          role='alert'
          className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs'
        >
          {error}
        </div>
      )}

      {loadingChapters || loadingWork ? (
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
      ) : (
        <div className='space-y-3'>
          {visible.map((a) => (
            <div key={a.id} className='space-y-1.5'>
              {(a as any).seriesTitle && (
                <div className='flex items-center gap-1.5 text-[11px] font-semibold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200/80 w-fit'>
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
              />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
};
