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
import { useTranslation } from '@/lib/i18n';

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
  Assigned: { label: 'Đã giao', className: 'bg-sky-50 text-sky-800 border-sky-300 font-semibold' },
  InProgress: {
    label: 'Đang làm',
    className: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
  },
  Submitted: {
    label: 'Đã nộp, chờ duyệt',
    className: 'bg-violet-50 text-violet-900 border-violet-300 font-semibold',
  },
  UnderReview: {
    label: 'Đang xét duyệt',
    className: 'bg-indigo-50 text-indigo-900 border-indigo-300 font-semibold',
  },
  Approved: {
    label: 'Đã duyệt',
    className: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold',
  },
  ReworkRequired: {
    label: 'Cần sửa lại',
    className: 'bg-rose-50 text-rose-900 border-rose-300 font-semibold',
  },
  Blocked: {
    label: 'Bị chặn',
    className: 'bg-stone-100 text-stone-600 border-stone-200 font-semibold',
  },
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
  const { t } = useTranslation();
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

  const getStatusLabel = (statusKey: string) => {
    const mapping: Record<string, string> = {
      Assigned: 'collaboration.card.status.assigned',
      InProgress: 'collaboration.card.status.inProgress',
      Submitted: 'collaboration.card.status.submitted',
      UnderReview: 'collaboration.card.status.underReview',
      Approved: 'collaboration.card.status.approved',
      ReworkRequired: 'collaboration.card.status.reworkRequired',
      Blocked: 'collaboration.card.status.blocked',
    };
    const key = mapping[statusKey];
    return key ? t(key) : (STATUS_STYLE[statusKey]?.label || statusKey);
  };

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
  // Việc Script (Writer) là kịch bản chữ, không có bản vẽ: dẫn tới trang kịch bản thay cho tổng quan ảnh
  const isScriptAssignment =
    isChapterAssignment && String(assignment.assignedRole).toUpperCase() === 'WRITER';
  const showChapterOverview =
    isChapterAssignment && !isScriptAssignment && (actions.isReviewer || actions.isAssignee);

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
      className={`p-5 md:p-6 bg-[#FCFBF8] border rounded-2xl space-y-4 shadow-xs transition-all font-sans ${
        status === 'ReworkRequired'
          ? 'border-rose-300 ring-2 ring-rose-200/50 bg-rose-50/20'
          : highlighted
            ? 'border-[#F97316] ring-2 ring-[#F97316]/30'
            : 'border-[#D8D2C5] hover:border-[#F97316]/60'
      }`}
    >
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <span className='px-2.5 py-1 rounded-md bg-[#F3F0E9] border border-[#D8D2C5] text-[#1C1917] font-mono text-xs font-bold shrink-0 shadow-2xs'>
            {String(assignment.entityType)}
          </span>
          <span className='font-bold text-base text-[#1C1917] truncate tracking-tight'>
            {stageName}
          </span>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full border text-xs font-mono font-semibold ${style.className}`}
        >
          {getStatusLabel(status)}
        </span>
      </div>

      <div className='text-xs md:text-sm text-[#292524] leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-[#F0ECE1] font-sans shadow-2xs'>
        {assignment.brief}
      </div>

      {status === 'ReworkRequired' && (
        <div className='p-4 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2 animate-in fade-in duration-150'>
          <div className='flex items-center gap-2 font-bold'>
            <AlertOctagon className='w-4 h-4 text-rose-600 shrink-0' />
            <span>{getStatusLabel('ReworkRequired')}</span>
          </div>
          {assignment.lastFeedbackComment && (
            <p className='text-xs md:text-sm text-rose-900 leading-relaxed font-sans bg-white/80 p-3 rounded-xl border border-rose-200/60 shadow-2xs'>
              <strong>Editor:</strong> {assignment.lastFeedbackComment}
            </p>
          )}
          {openCrCount > 0 && (
            <p className='text-xs font-semibold text-rose-800 font-medium'>
              {t('collaboration.card.changeRequests', { count: openCrCount })}
            </p>
          )}
        </div>
      )}

      <div className='flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-mono text-stone-500'>
        <span className='flex items-center gap-1.5'>
          <User className='w-3.5 h-3.5 text-[#F97316]' />
          <strong className='text-stone-700'>{t('collaboration.card.unassigned') !== assigneeName ? assigneeName : t('collaboration.card.unassigned')}</strong>
        </span>
        {assignment.dueDate && (
          <span className='flex items-center gap-1.5 font-mono'>
            <Calendar className='w-3.5 h-3.5 text-stone-400' />
            <strong className='text-stone-700'>
              {t('collaboration.card.deadline', {
                date: new Date(assignment.dueDate).toLocaleDateString(),
              })}
            </strong>
          </span>
        )}
      </div>

      {error && (
        <div
          role='alert'
          className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2'
        >
          <AlertTriangle className='w-4 h-4 shrink-0 text-red-500' />
          <span>{error}</span>
        </div>
      )}

      {(actions.canStart || actions.isAssignee) && status !== 'Approved' && (
        <div className='flex flex-wrap items-center gap-2.5 pt-1'>
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
              className='btn-cta-primary'
            >
              {busy ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Play className='w-3.5 h-3.5 text-white' />
              )}
              <span>{status === 'ReworkRequired' ? 'Bắt đầu sửa' : t('collaboration.card.start')}</span>
            </button>
          )}
          {actions.canStart && startLockedReason && (
            <span
              className='text-xs text-amber-700 flex items-center gap-1 font-medium'
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
                  className='h-9 px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <PenTool className='w-3.5 h-3.5 text-blue-600' />
                  <span>Script Editor</span>
                </Link>
              )}
              {String(assignment.assignedRole).toUpperCase() === 'ARTIST' && (
                <Link
                  to={`../artist?chapterId=${chapterId}&assignmentId=${assignment.id}`}
                  relative='path'
                  data-testid='open-artist-desk'
                  className='h-9 px-3.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <Palette className='w-3.5 h-3.5 text-amber-600' />
                  <span>Artist Desk</span>
                </Link>
              )}
              {String(assignment.assignedRole).toUpperCase() === 'LETTERER' && (
                <Link
                  to={`../letterer?chapterId=${chapterId}&assignmentId=${assignment.id}`}
                  relative='path'
                  data-testid='open-letterer-desk'
                  className='h-9 px-3.5 py-1.5 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                >
                  <Type className='w-3.5 h-3.5 text-pink-600' />
                  <span>Lettering Desk</span>
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
                className='h-9 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-[#0c0a09] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs transition-colors'
              >
                <Eye className='w-3.5 h-3.5 text-[#F97316]' />
                <span>{t('collaboration.card.viewArtwork')}</span>
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
              className='h-9 px-3.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors'
            >
              <BookOpen className='w-3.5 h-3.5 text-[#F97316]' />
              <span>{t('collaboration.card.openBible')}</span>
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
              className='btn-cta-success'
            >
              {busy ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Send className='w-3.5 h-3.5' />
              )}
              <span>{t('collaboration.card.submit')}</span>
            </button>
          )}
        </div>
      )}

      {status === 'InProgress' &&
        actions.isAssignee &&
        String(assignment.assignedRole).toUpperCase() === 'LETTERER' && (
          <div className='text-xs text-stone-600 bg-stone-50 border border-stone-200 p-3 rounded-xl flex items-start gap-2 leading-relaxed'>
            <Info className='w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5' />
            <span>
              <strong>Cổng nộp Lettering:</strong> Đảm bảo mọi dòng thoại đã neo vào panel đều có
              balloon/caption/SFX gắn dòng đó và đã xác nhận cảnh báo tràn chữ (nếu có).
            </span>
          </div>
        )}

      {actions.submitBlockedReason && (
        <p
          className='text-xs text-amber-700 flex items-start gap-1.5 font-medium'
          data-testid='submit-blocked-reason'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
          <span>{actions.submitBlockedReason}</span>
        </p>
      )}

      {isScriptAssignment && (
        <Link
          to={`../script?chapterId=${chapterId}`}
          relative='path'
          data-testid='open-chapter-script'
          className='h-9 px-3.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs w-fit'
        >
          <ScanSearch className='w-3.5 h-3.5 text-orange-600' />
          <span>Mở kịch bản chương</span>
        </Link>
      )}

      {actions.isReviewer && !actions.isAssignee && !showChapterOverview && !isScriptAssignment && (
        <Link
          to={`../review/${assignment.id}?chapterId=${chapterId}`}
          relative='path'
          data-testid='open-review-board'
          className='h-9 px-3.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
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
