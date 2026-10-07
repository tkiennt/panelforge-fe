import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Loader2,
  Play,
  Send,
  User,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import { artworkService } from '@/services/artwork.service';
import type {
  AssetReferenceDto,
  AssignmentDto,
  ChangeRequestDto,
  StageProgressDto,
  SubmissionDto,
} from '@/types';
import { ArtworkPanel } from './ArtworkPanel';
import { ChangeRequestPanel } from './ChangeRequestPanel';
import { ReviewDecisionPanel } from './ReviewDecisionPanel';
import { SubmissionHistory } from './SubmissionHistory';
import {
  errorMessage,
  getWorkActions,
  hasCurrentArtwork,
  lastRejectedAt,
  needsArtwork,
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
}) => {
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [artworks, setArtworks] = useState<AssetReferenceDto[]>([]);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageId = resolvePageId(assignment, stageProgress);
  const artworkRelevant = needsArtwork(assignment);

  const loadDetails = useCallback(async () => {
    const [subs, crs, arts] = await Promise.all([
      assignmentService.getSubmissions(chapterId, assignment.id),
      assignmentService.getChangeRequests(chapterId, { assignmentId: assignment.id }),
      artworkRelevant && pageId
        ? artworkService.getArtworks(chapterId, pageId, assignment.pipelineStageId)
        : Promise.resolve([] as AssetReferenceDto[]),
    ]);
    setSubmissions(subs);
    setChangeRequests(crs);
    setArtworks(arts);
    setDetailsLoaded(true);
  }, [chapterId, assignment.id, assignment.pipelineStageId, artworkRelevant, pageId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails, assignment.status]);

  const artworkOk = artworkRelevant
    ? detailsLoaded
      ? hasCurrentArtwork(artworks, pageId, assignment.pipelineStageId, lastRejectedAt(submissions))
      : null
    : null;

  const actions = getWorkActions(assignment, {
    userId,
    workspaceRole,
    changeRequests,
    hasCurrentArtwork: artworkOk,
  });

  const changed = (updated?: AssignmentDto) => {
    onChanged(updated);
    void loadDetails();
  };

  const run = async (action: () => Promise<AssignmentDto>, doneTitle: string, doneDesc: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await action();
      onToast?.(doneTitle, doneDesc);
      changed(updated);
    } catch (err) {
      const msg = errorMessage(err, 'Thao tác thất bại.');
      setError(msg);
      onToast?.('Không thể thực hiện', msg);
    } finally {
      setBusy(false);
    }
  };

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
      className={`p-4 bg-white border rounded-xl space-y-3 shadow-2xs ${
        highlighted ? 'border-[#F97316] ring-2 ring-[#F97316]/30' : 'border-[#E7E7E7]'
      }`}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='px-2 py-0.5 rounded bg-zinc-800 text-white font-mono text-[9px] font-bold shrink-0'>
            {String(assignment.entityType)}
          </span>
          <span className='font-bold text-sm text-[#171717] truncate'>{stageName}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded border text-[10px] font-mono font-semibold ${style.className}`}
        >
          {style.label}
        </span>
      </div>

      <div className='text-xs text-[#333333] leading-relaxed bg-[#FAF8F5] p-3 rounded-lg border border-[#F0ECE1]'>
        {assignment.brief}
      </div>

      {assignment.lastFeedbackComment && status === 'ReworkRequired' && (
        <div className='text-xs p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800'>
          <strong>Editor trả về:</strong> {assignment.lastFeedbackComment}
          {openCrCount > 0 && (
            <span className='block mt-1 font-semibold'>
              Còn {openCrCount} yêu cầu sửa cần xử lý bên dưới.
            </span>
          )}
        </div>
      )}

      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#737373]'>
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
          className='p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] flex items-center gap-1.5'
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
              disabled={busy}
              onClick={() =>
                void run(
                  () => assignmentService.startAssignment(chapterId, assignment.id),
                  status === 'ReworkRequired' ? 'Đã bắt đầu sửa' : 'Đã bắt đầu làm',
                  stageName,
                )
              }
              className='px-3 py-1.5 rounded-lg bg-[#171717] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer'
            >
              {busy ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Play className='w-3 h-3 text-[#F97316]' />
              )}
              {status === 'ReworkRequired' ? 'Bắt đầu sửa' : 'Bắt đầu làm'}
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

      {actions.submitBlockedReason && (
        <p
          className='text-[11px] text-amber-700 flex items-start gap-1.5'
          data-testid='submit-blocked-reason'
        >
          <AlertTriangle className='w-3.5 h-3.5 shrink-0 mt-px' />
          <span>{actions.submitBlockedReason}</span>
        </p>
      )}

      <ReviewDecisionPanel
        chapterId={chapterId}
        assignment={assignment}
        actions={actions}
        onChanged={changed}
        onToast={onToast}
      />

      {artworkRelevant && (status === 'InProgress' || artworks.length > 0) && (
        <ArtworkPanel
          chapterId={chapterId}
          pageId={pageId}
          stageId={assignment.pipelineStageId}
          artworks={artworks}
          canUpload={actions.canUploadArtwork}
          onChanged={() => void loadDetails()}
          onToast={onToast}
        />
      )}

      <ChangeRequestPanel
        chapterId={chapterId}
        changeRequests={changeRequests}
        userId={userId}
        workspaceRole={workspaceRole}
        onChanged={() => changed()}
        onToast={onToast}
      />

      <div className='pt-2 border-t border-[#F3F3F3]'>
        <button
          type='button'
          onClick={() => setExpanded((e) => !e)}
          className='text-[11px] font-semibold text-[#555555] hover:text-[#171717] flex items-center gap-1 cursor-pointer'
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
    </article>
  );
};
