import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Play,
  Send,
  User,
  ScanSearch,
  Eye,
  PenTool,
  Palette,
  Type,
  AlertOctagon,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { artworkService } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';
import type {
  AssetReferenceDto,
  AssignmentDto,
  ChangeRequestDto,
  PanelDto,
  StageProgressDto,
  SubmissionDto,
} from '@/types';
import { ArtworkPanel } from './ArtworkPanel';
import { ChangeRequestPanel } from './ChangeRequestPanel';
import { ReviewDecisionPanel } from './ReviewDecisionPanel';
import { SubmitPreviewModal } from './SubmitPreviewModal';
import { SubmissionHistory } from './SubmissionHistory';
import { BibleReferenceDrawer } from './BibleReferenceDrawer';
import { ChapterReviewArtworkOverview } from './ChapterReviewArtworkOverview';
import {
  describeStartError,
  errorMessage,
  getWorkActions,
  hasCurrentArtwork,
  lastRejectedAt,
  needsArtwork,
  pendingDependencyCount,
  resolvePageId,
} from './collaborationRules';

interface AssignmentWorkCardProps {
  chapterId: string;
  assignment: AssignmentDto;
  stageName: string;
  assigneeName: string;
  userId?: string | null;
  workspaceRole?: string | null;
  stageProgress: StageProgressDto[];
  highlighted?: boolean;
  /** Gọi sau mỗi thao tác đổi dữ liệu; cha nên nạp lại danh sách việc và tiến độ. */
  onChanged: (updated?: AssignmentDto) => void;
  onToast?: (title: string, desc: string) => void;
  /** Các việc cùng chương (nếu cha có), để khoá nút Bắt đầu khi việc phụ thuộc chưa Approved. */
  relatedAssignments?: Pick<AssignmentDto, 'id' | 'status'>[];
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  Assigned: { label: 'Đã giao', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  InProgress: { label: 'Đang làm', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Submitted: {
    label: 'Đã nộp, chờ duyệt',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  UnderReview: {
    label: 'Đang xét duyệt',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  Approved: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ReworkRequired: { label: 'Cần sửa lại', className: 'bg-red-50 text-red-700 border-red-200' },
  Blocked: { label: 'Bị chặn', className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
};

/**
 * Một việc được giao cùng mọi thao tác theo vai trò (CF2 + CF3): bắt đầu, tải artwork, nộp, mở xét duyệt, duyệt/trả về,
 * xử lý yêu cầu sửa và xem lịch sử nộp. Nút hiện theo `getWorkActions`; Backend vẫn là nơi kiểm quyền và cổng thật.
 */
export const AssignmentWorkCard: React.FC<AssignmentWorkCardProps> = ({
  chapterId,
  assignment,
  stageName,
  assigneeName,
  userId,
  workspaceRole,
  stageProgress,
  highlighted,
  onChanged,
  onToast,
  relatedAssignments,
}) => {
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [artworks, setArtworks] = useState<AssetReferenceDto[]>([]);
  const [panels, setPanels] = useState<PanelDto[]>([]);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCrId, setHighlightedCrId] = useState<string | null>(null);
  const [targetArtworkId, setTargetArtworkId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bibleDrawerOpen, setBibleDrawerOpen] = useState(false);
  const [selectedBiblePanelId, setSelectedBiblePanelId] = useState<string | null>(null);

  const pageId = resolvePageId(assignment, stageProgress);
  const artworkRelevant = needsArtwork(assignment);

  const handleSelectChangeRequest = (cr: ChangeRequestDto) => {
    setHighlightedCrId(cr.id);
    let artId = cr.assetReferenceId;
    if (!artId && cr.submissionId && submissions.length > 0) {
      const sub = submissions.find((s) => s.id === cr.submissionId);
      if (sub?.artworkReferenceIds?.length) {
        artId = sub.artworkReferenceIds[0];
      }
    }
    if (artId) {
      setTargetArtworkId(artId);
    }
  };

  const loadDetails = useCallback(async () => {
    const [subs, crs, arts, pagePanels] = await Promise.all([
      assignmentService.getSubmissions(chapterId, assignment.id),
      assignmentService.getChangeRequests(chapterId, { assignmentId: assignment.id }),
      artworkRelevant && pageId
        ? artworkService.getArtworks(chapterId, pageId, assignment.pipelineStageId)
        : Promise.resolve([] as AssetReferenceDto[]),
      artworkRelevant && pageId
        ? panelService.getPanelsByPage(pageId).catch(() => [] as PanelDto[])
        : Promise.resolve([] as PanelDto[]),
    ]);
    setSubmissions(subs);
    setChangeRequests(crs);
    setArtworks(arts);
    setPanels(pagePanels);
    setDetailsLoaded(true);
  }, [chapterId, assignment.id, assignment.pipelineStageId, artworkRelevant, pageId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails, assignment.status]);

  const artworkOk = artworkRelevant
    ? detailsLoaded
      ? hasCurrentArtwork(
          artworks,
          pageId,
          assignment.pipelineStageId,
          lastRejectedAt(submissions),
          panels.map((p) => p.id),
        )
      : null
    : null;

  const actions = getWorkActions(assignment, {
    userId,
    workspaceRole,
    changeRequests,
    hasCurrentArtwork: artworkOk,
  });

  const isChapterAssignment = String(assignment.entityType) === 'Chapter';
  const showChapterOverview = isChapterAssignment && (actions.isReviewer || actions.isAssignee);

  const changed = (updated?: AssignmentDto) => {
    onChanged(updated);
    void loadDetails();
  };

  const run = async (
    action: () => Promise<AssignmentDto>,
    doneTitle: string,
    doneDesc: string,
    describeError?: (err: unknown) => { title: string; message: string },
  ) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      onToast?.(doneTitle, doneDesc);
      changed(updated);
    } catch (err) {
      const { title, message } = describeError
        ? describeError(err)
        : { title: 'Không thể thực hiện', message: errorMessage(err, 'Thao tác thất bại.') };
      setError(message);
      onToast?.(title, message);
      // 409: trạng thái trên máy đã cũ (vd. việc đã được bắt đầu) → nạp lại để hiện đúng trạng thái
      if ((err as { status?: number })?.status === 409) changed();
    } finally {
      setBusy(false);
    }
  };

  const pendingDeps = pendingDependencyCount(assignment, relatedAssignments);
  const startLockedReason =
    pendingDeps > 0 ? `Chờ ${pendingDeps} việc phụ thuộc được duyệt (Approved).` : null;

  const status = String(assignment.status);
  const style = STATUS_STYLE[status] ?? {
    label: status,
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };
  const openCrCount = changeRequests.filter((c) => String(c.status) === 'Open').length;

  return (
    <article
      id={`assignment-${assignment.id}`}
      data-testid={`assignment-card-${assignment.id}`}
      className={`p-4 bg-white border rounded-xl space-y-3 shadow-2xs transition-all ${
        status === 'ReworkRequired'
          ? 'border-red-400 ring-2 ring-red-300/40 bg-red-50/10'
          : highlighted
            ? 'border-[#F97316] ring-2 ring-[#F97316]/30'
            : 'border-[#E7E7E7]'
      }`}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='px-2 py-0.5 rounded bg-zinc-800 text-white font-mono text-xs font-bold shrink-0'>
            {String(assignment.entityType)}
          </span>
          <span className='font-bold text-sm text-[#171717] truncate'>{stageName}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold ${style.className}`}
        >
          {style.label}
        </span>
      </div>

      <div className='text-xs text-[#333333] leading-relaxed bg-[#FAF8F5] p-3 rounded-lg border border-[#F0ECE1]'>
        {assignment.brief}
      </div>

      {status === 'ReworkRequired' && (
        <div className='p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1.5 animate-in fade-in duration-150'>
          <div className='flex items-center gap-2 font-bold'>
            <AlertOctagon className='w-4 h-4 text-red-600 shrink-0' />
            <span>Yêu cầu sửa lại (Rework Required)</span>
          </div>
          {assignment.lastFeedbackComment && (
            <p className='text-xs text-red-700 leading-relaxed font-serif bg-white/70 p-2.5 rounded-lg border border-red-200/60'>
              <strong>Editor phản hồi:</strong> {assignment.lastFeedbackComment}
            </p>
          )}
          {openCrCount > 0 && (
            <p className='text-xs font-semibold text-red-700'>
              Có {openCrCount} yêu cầu sửa cần xử lý bên dưới trước khi nộp lại.
            </p>
          )}
        </div>
      )}

      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[#737373]'>
        <span className='flex items-center gap-1'>
          <User className='w-3 h-3 text-[#F97316]' />
          <strong>Người làm:</strong> {assigneeName}
        </span>
        {assignment.dueDate && (
          <span className='flex items-center gap-1 font-mono'>
            <Calendar className='w-3 h-3' />
            <strong>Hạn:</strong> {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
          </span>
        )}
      </div>

      {error && (
        <div
          role='alert'
          className='p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-1.5'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
          <span>{error}</span>
        </div>
      )}

      {(actions.canStart || actions.isAssignee) && status !== 'Approved' && (
        <div className='flex flex-wrap items-center gap-2'>
          {actions.canStart && (
            <button
              type='button'
              disabled={busy || !!startLockedReason}
              data-testid='start-assignment-btn'
              title={startLockedReason ?? undefined}
              onClick={() =>
                void run(
                  () => assignmentService.startAssignment(chapterId, assignment.id),
                  status === 'ReworkRequired' ? 'Đã bắt đầu sửa' : 'Đã bắt đầu làm',
                  stageName,
                  describeStartError,
                )
              }
              className='px-3 py-1.5 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {busy ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Play className='w-3 h-3 text-[#F97316]' />
              )}
              {status === 'ReworkRequired' ? 'Bắt đầu sửa' : 'Bắt đầu làm'}
            </button>
          )}
          {actions.canStart && startLockedReason && (
            <span
              className='text-xs text-amber-700 flex items-center gap-1'
              data-testid='start-blocked-reason'
            >
              <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
              {startLockedReason}
            </span>
          )}

          {/* Context-aware direct jump CTA buttons */}
          {actions.isAssignee && (
            <>
              {String(assignment.assignedRole).toUpperCase() === 'WRITER' && (
                <Link
                  to={`../script?chapterId=${chapterId}&assignmentId=${assignment.id}`}
                  relative='path'
                  data-testid='open-writer-desk'
                  className='px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <PenTool className='w-3.5 h-3.5 text-blue-600' />
                  <span>Mở Script Editor</span>
                </Link>
              )}
              {String(assignment.assignedRole).toUpperCase() === 'ARTIST' && (
                <Link
                  to={`../artist?chapterId=${chapterId}&assignmentId=${assignment.id}`}
                  relative='path'
                  data-testid='open-artist-desk'
                  className='px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <Palette className='w-3.5 h-3.5 text-amber-600' />
                  <span>Mở Bàn Vẽ</span>
                </Link>
              )}
              {String(assignment.assignedRole).toUpperCase() === 'LETTERER' && (
                <Link
                  to={`../letterer?chapterId=${chapterId}&assignmentId=${assignment.id}`}
                  relative='path'
                  data-testid='open-letterer-desk'
                  className='px-3 py-1.5 rounded-lg border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <Type className='w-3.5 h-3.5 text-pink-600' />
                  <span>Mở Lettering Canvas</span>
                </Link>
              )}
            </>
          )}

          {status === 'InProgress' &&
            actions.isAssignee &&
            artworkRelevant &&
            pageId &&
            String(assignment.assignedRole).toUpperCase() === 'ARTIST' && (
              <button
                type='button'
                disabled={busy || !detailsLoaded}
                data-testid='open-submit-preview'
                onClick={() => setPreviewOpen(true)}
                className='px-3 py-1.5 rounded-lg border border-[#E7E7E7] bg-white hover:bg-zinc-50 text-[#171717] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
              >
                <Eye className='w-3 h-3 text-[#F97316]' />
                Xem trước trang truyện
              </button>
            )}

          {(artworkRelevant || assignment.entityType === 'Panel') && (
            <button
              type='button'
              data-testid='open-bible-reference'
              onClick={() => {
                setSelectedBiblePanelId(null);
                setBibleDrawerOpen(true);
              }}
              className='px-3 py-1.5 rounded-lg border border-[#E7E7E7] bg-white hover:bg-zinc-50 text-[#171717] text-xs font-semibold flex items-center gap-1.5 cursor-pointer'
            >
              <BookOpen className='w-3.5 h-3.5 text-[#F97316]' />
              Tham chiếu Bible
            </button>
          )}

          {status === 'InProgress' && actions.isAssignee && (
            <button
              type='button'
              disabled={busy || !detailsLoaded || !actions.canSubmit}
              title={actions.submitBlockedReason ?? 'Nộp để Editor xét duyệt'}
              onClick={() =>
                void run(
                  () => assignmentService.submitAssignment(chapterId, assignment.id),
                  'Đã nộp bài',
                  `${stageName}: chờ xét duyệt.`,
                )
              }
              className='px-3 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              {busy ? <Loader2 className='w-3 h-3 animate-spin' /> : <Send className='w-3 h-3' />}
              Nộp bài
            </button>
          )}
        </div>
      )}

      {status === 'InProgress' &&
        actions.isAssignee &&
        String(assignment.assignedRole).toUpperCase() === 'LETTERER' && (
          <div className='text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 p-2.5 rounded-lg flex items-start gap-1.5'>
            <Info className='w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5' />
            <span>
              <strong>Cổng nộp Lettering:</strong> Đảm bảo mọi dòng thoại đã neo vào panel đều có
              balloon/caption/SFX gắn dòng đó và đã xác nhận cảnh báo tràn chữ (nếu có).
            </span>
          </div>
        )}

      {actions.submitBlockedReason && (
        <p
          className='text-xs text-amber-700 flex items-start gap-1.5'
          data-testid='submit-blocked-reason'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
          <span>{actions.submitBlockedReason}</span>
        </p>
      )}

      {actions.isReviewer && !actions.isAssignee && !showChapterOverview && (
        <Link
          to={`../review/${assignment.id}?chapterId=${chapterId}`}
          relative='path'
          data-testid='open-review-board'
          className='px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
        >
          <ScanSearch className='w-3.5 h-3.5 text-orange-600' />
          <span>Mở Màn Duyệt (Review View)</span>
        </Link>
      )}

      {showChapterOverview && (
        <ChapterReviewArtworkOverview
          chapterId={chapterId}
          seriesId={assignment.seriesId}
          assignmentId={assignment.id}
          onToast={onToast}
        />
      )}

      <ReviewDecisionPanel
        chapterId={chapterId}
        assignment={assignment}
        actions={actions}
        onChanged={changed}
        onToast={onToast}
      />

      {(() => {
        const prioritizeChangeRequests =
          status === 'ReworkRequired' || changeRequests.some((c) => String(c.status) === 'Open');

        const artworkPanelElement = artworkRelevant &&
          (status === 'InProgress' || artworks.length > 0) && (
            <ArtworkPanel
              chapterId={chapterId}
              pageId={pageId}
              stageId={assignment.pipelineStageId}
              artworks={artworks}
              panels={panels}
              submissions={submissions}
              changeRequests={changeRequests}
              highlightedChangeRequestId={highlightedCrId}
              targetArtworkId={targetArtworkId}
              canUpload={actions.canUploadArtwork}
              onChanged={() => void loadDetails()}
              onToast={onToast}
              onOpenBible={(pid) => {
                setSelectedBiblePanelId(pid);
                setBibleDrawerOpen(true);
              }}
            />
          );

        const changeRequestPanelElement = (
          <ChangeRequestPanel
            chapterId={chapterId}
            changeRequests={changeRequests}
            artworks={artworks}
            panels={panels}
            submissions={submissions}
            userId={userId}
            workspaceRole={workspaceRole}
            onSelectChangeRequest={handleSelectChangeRequest}
            onChanged={() => changed()}
            onToast={onToast}
          />
        );

        return prioritizeChangeRequests ? (
          <>
            {changeRequestPanelElement}
            {artworkPanelElement}
          </>
        ) : (
          <>
            {artworkPanelElement}
            {changeRequestPanelElement}
          </>
        );
      })()}

      <div className='pt-2 border-t border-[#F3F3F3]'>
        <button
          type='button'
          onClick={() => setExpanded((e) => !e)}
          className='text-xs font-mono font-medium text-[#555555] hover:text-[#171717] flex items-center gap-1 cursor-pointer'
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className='w-3 h-3' /> : <ChevronRight className='w-3 h-3' />}
          Lịch sử nộp ({submissions.length})
        </button>
        {expanded && (
          <div className='mt-2'>
            <SubmissionHistory submissions={submissions} />
          </div>
        )}
      </div>

      {previewOpen && pageId && (
        <SubmitPreviewModal
          chapterId={chapterId}
          pageId={pageId}
          stageId={assignment.pipelineStageId}
          stageName={stageName}
          panels={panels}
          artworks={artworks}
          rejectedAt={lastRejectedAt(submissions)}
          canSubmit={actions.canSubmit}
          submitBlockedReason={actions.submitBlockedReason}
          busy={busy}
          onClose={() => setPreviewOpen(false)}
          onConfirm={() => {
            setPreviewOpen(false);
            void run(
              () => assignmentService.submitAssignment(chapterId, assignment.id),
              'Đã nộp bài',
              `${stageName}: chờ xét duyệt.`,
            );
          }}
        />
      )}

      <BibleReferenceDrawer
        isOpen={bibleDrawerOpen}
        onClose={() => setBibleDrawerOpen(false)}
        seriesId={assignment.seriesId}
        chapterId={chapterId}
        panelId={
          selectedBiblePanelId ||
          (assignment.entityType === 'Panel' ? assignment.targetEntityId : panels[0]?.id || null)
        }
        panelNumber={
          selectedBiblePanelId
            ? panels.find((p) => p.id === selectedBiblePanelId)?.panelNumber || null
            : assignment.entityType === 'Panel'
              ? panels.find((p) => p.id === assignment.targetEntityId)?.panelNumber || null
              : panels[0]?.panelNumber || null
        }
        availablePanels={panels.map((p) => ({
          id: p.id,
          panelNumber: p.panelNumber,
          readingOrder: p.readingOrder,
        }))}
        onSelectPanel={(pid) => setSelectedBiblePanelId(pid)}
      />
    </article>
  );
};
