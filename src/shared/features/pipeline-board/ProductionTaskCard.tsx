import React from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Circle,
  Eye,
  FileText,
  Layers,
  LayoutGrid,
  Lock,
  MessageSquareWarning,
  Palette,
  PenTool,
  Pencil,
  PlayCircle,
  RotateCcw,
  Send,
  Type,
} from 'lucide-react';
import type { BoardCard } from './pipelineBoard.types';
import {
  type PrimaryAction,
  type StageKind,
  type StatusKey,
  actionButtonClass,
  formatDate,
  isCardOverdue,
  isCompletedLate,
  stageKindOf,
  statusKey,
  statusLabel,
} from './productionBoard.utils';

// ── Mảnh hiển thị dùng chung cho Lưới và Danh sách ──

const STATUS_STYLE: Record<StatusKey, { cls: string; Icon: React.ElementType }> = {
  Assigned: { cls: 'bg-stone-100 text-stone-700 border-stone-300', Icon: Circle },
  InProgress: { cls: 'bg-amber-50 text-amber-900 border-amber-300', Icon: PlayCircle },
  Submitted: { cls: 'bg-sky-50 text-sky-900 border-sky-300', Icon: Send },
  UnderReview: { cls: 'bg-violet-50 text-violet-900 border-violet-300', Icon: Eye },
  ReworkRequired: { cls: 'bg-rose-50 text-rose-900 border-rose-300', Icon: RotateCcw },
  Approved: { cls: 'bg-emerald-50 text-emerald-900 border-emerald-300', Icon: CheckCircle2 },
  Blocked: { cls: 'bg-stone-200 text-stone-800 border-stone-400', Icon: Lock },
};

export const StatusBadge: React.FC<{ status: BoardCard['status'] }> = ({ status }) => {
  const key = statusKey(status);
  const style = key ? STATUS_STYLE[key] : STATUS_STYLE.Assigned;
  const { Icon } = style;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${style.cls}`}
    >
      <Icon className='h-3.5 w-3.5 shrink-0' aria-hidden='true' />
      {statusLabel(status)}
    </span>
  );
};

const STAGE_ICONS: Record<StageKind, React.ElementType> = {
  script: FileText,
  thumbnail: LayoutGrid,
  ink: PenTool,
  pencil: Pencil,
  color: Palette,
  letter: Type,
  other: Layers,
};

/** Icon theo công đoạn (Script/Thumbnail/Pencil/Ink/Color/Letter) suy từ tên stage thật. */
export const StageIcon: React.FC<{ stageName: string; className?: string }> = ({
  stageName,
  className,
}) => {
  const Icon = STAGE_ICONS[stageKindOf(stageName)];
  return <Icon className={className} aria-hidden='true' />;
};

export const StageLabel: React.FC<{ card: BoardCard }> = ({ card }) => (
  <span className='inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-landing-ink'>
    <span
      className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-landing-border'
      style={{ backgroundColor: card.stageColor || '#F3F0E9' }}
      aria-hidden='true'
    >
      <StageIcon stageName={card.stageName} className='h-3 w-3 text-landing-ink' />
    </span>
    <span className='truncate'>{card.stageName}</span>
  </span>
);

/** Hạn / thời điểm hoàn tất: việc đã xong không còn đếm "Quá hạn". */
export const DueInfo: React.FC<{ card: BoardCard; now: number }> = ({ card, now }) => {
  if (statusKey(card.status) === 'Approved') {
    if (!card.completedAt) {
      return <span className='text-xs text-landing-ink-muted'>Đã hoàn tất</span>;
    }
    const late = isCompletedLate(card);
    return (
      <span
        className={`text-xs ${late ? 'text-amber-900 font-semibold' : 'text-landing-ink-muted'}`}
      >
        {late ? 'Hoàn tất trễ' : 'Hoàn tất'} {formatDate(card.completedAt)}
      </span>
    );
  }
  if (!card.dueDate) return <span className='text-xs text-landing-ink-muted'>Chưa đặt hạn</span>;
  const overdue = isCardOverdue(card, now);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        overdue ? 'font-semibold text-rose-800' : 'text-landing-ink-muted'
      }`}
    >
      {overdue ? (
        <AlertTriangle className='h-3.5 w-3.5' aria-hidden='true' />
      ) : (
        <CalendarClock className='h-3.5 w-3.5' aria-hidden='true' />
      )}
      {overdue ? 'Quá hạn' : 'Hạn'} {formatDate(card.dueDate)}
    </span>
  );
};

export const Avatar: React.FC<{ card: BoardCard }> = ({ card }) => (
  <span
    className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-landing-border bg-landing-paper text-[11px] font-bold text-landing-ink'
    aria-hidden='true'
  >
    {card.assigneeAvatarInitials}
  </span>
);

/** Ghi chú trạng thái đặc biệt: bị chặn, cần sửa, công đoạn tắt. */
export const StatusNotes: React.FC<{ card: BoardCard; blockedReason: string | null }> = ({
  card,
  blockedReason,
}) => {
  const st = statusKey(card.status);
  return (
    <>
      {card.isStageEnabled === false && (
        <p className='flex items-start gap-1.5 rounded-md border border-dashed border-stone-400 bg-stone-50 px-2 py-1.5 text-xs text-stone-800'>
          <Ban className='mt-px h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          <span>Công đoạn đang tắt trong quy trình — không tính là hoàn tất.</span>
        </p>
      )}
      {st === 'Blocked' && blockedReason && (
        <p className='flex items-start gap-1.5 text-xs text-stone-800'>
          <Lock className='mt-px h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          <span className='line-clamp-2'>
            <span className='font-semibold'>Bị khoá: </span>
            {blockedReason}
          </span>
        </p>
      )}
      {st === 'ReworkRequired' && (
        <p className='flex items-start gap-1.5 text-xs text-rose-900'>
          <MessageSquareWarning className='mt-px h-3.5 w-3.5 shrink-0' aria-hidden='true' />
          <span className='line-clamp-2'>
            <span className='font-semibold'>Có yêu cầu sửa</span>
            {card.lastFeedbackComment ? `: ${card.lastFeedbackComment}` : ''}
          </span>
        </p>
      )}
    </>
  );
};

// ── Thẻ "phiếu sản xuất" ──

interface ProductionTaskCardProps {
  card: BoardCard;
  now: number;
  action: PrimaryAction;
  blockedReason: string | null;
  onOpenDetails: (card: BoardCard, trigger: HTMLElement) => void;
  onAction: (card: BoardCard, action: PrimaryAction, trigger: HTMLElement) => void;
}

export const ProductionTaskCard: React.FC<ProductionTaskCardProps> = ({
  card,
  now,
  action,
  blockedReason,
  onOpenDetails,
  onAction,
}) => {
  return (
    <article
      className='relative flex h-full min-w-0 flex-col rounded-xl border border-landing-border bg-landing-paper-light p-4 shadow-[0_1px_2px_rgba(28,25,23,0.06)]'
      data-testid='production-task-card'
      aria-label={card.brief}
    >
      {/* 1. Công đoạn + trạng thái */}
      <div className='flex items-start justify-between gap-2'>
        <StageLabel card={card} />
        <StatusBadge status={card.status} />
      </div>

      {/* 2. Tên công việc: nút phủ toàn thẻ (stretched), không lồng nút */}
      <h3 className='mt-3 text-[15px] leading-snug font-semibold text-landing-ink'>
        <button
          type='button'
          onClick={(e) => onOpenDetails(card, e.currentTarget)}
          className='block w-full text-left after:absolute after:inset-0 after:rounded-xl after:content-[""] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-landing-ink cursor-pointer'
        >
          <span className='line-clamp-2'>{card.brief}</span>
        </button>
      </h3>

      {/* 3. Phạm vi */}
      <p className='mt-1 text-xs font-medium text-landing-ink-muted'>{card.targetLabel}</p>

      {/* 4. Đoạn trích / icon công đoạn (không có thumbnail giả) */}
      <div className='mt-3 flex flex-col gap-2'>
        {card.referenceNotes ? (
          <p className='line-clamp-3 text-sm leading-relaxed text-landing-ink-muted'>
            {card.referenceNotes}
          </p>
        ) : (
          <p className='flex items-center gap-1.5 text-sm text-landing-ink-muted'>
            <StageIcon stageName={card.stageName} className='h-4 w-4 shrink-0' />
            Chưa có ghi chú tham chiếu
          </p>
        )}
        <StatusNotes card={card} blockedReason={blockedReason} />
      </div>

      {/* 5 + 6. Người phụ trách, hạn, hành động: luôn neo đáy thẻ */}
      <div className='mt-auto pt-4'>
        <div className='flex items-center justify-between gap-2 border-t border-landing-border pt-3'>
          <span className='flex min-w-0 items-center gap-2'>
            <Avatar card={card} />
            <span className='truncate text-sm text-landing-ink' title={card.assigneeName}>
              {card.assigneeName}
            </span>
          </span>
          <DueInfo card={card} now={now} />
        </div>
        <div className='mt-3 flex justify-end'>
          <button
            type='button'
            onClick={(e) => onAction(card, action, e.currentTarget)}
            className={actionButtonClass(action)}
            aria-label={`${action.label}: ${card.brief}`}
          >
            {action.label}
          </button>
        </div>
      </div>
    </article>
  );
};
