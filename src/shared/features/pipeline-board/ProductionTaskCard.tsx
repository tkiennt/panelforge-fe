import React from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
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
import { useTaskThumbnail } from './useTaskThumbnail';

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
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs ${style.cls}`}
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
      className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-landing-border shadow-2xs'
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
    className='inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-landing-border bg-[#F3F0E9] text-[11px] font-bold text-landing-ink'
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
        <p className='flex items-start gap-1.5 rounded-md border border-dashed border-stone-400 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-800'>
          <Ban className='mt-px h-3.5 w-3.5 shrink-0 text-stone-600' aria-hidden='true' />
          <span>Công đoạn đang tắt trong quy trình — không tính là hoàn tất.</span>
        </p>
      )}
      {card.impactReviewReason && (
        <p
          data-testid='production-task-impact-review'
          className='flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900'
        >
          <AlertTriangle className='mt-px h-3.5 w-3.5 shrink-0 text-amber-600' aria-hidden='true' />
          <span className='line-clamp-2'>
            <span className='font-semibold'>Cần kiểm tra ảnh hưởng: </span>
            {card.impactReviewReason}
          </span>
        </p>
      )}
      {st === 'Blocked' && blockedReason && (
        <p className='flex items-start gap-1.5 rounded-md border border-stone-300 bg-stone-100/80 px-2.5 py-1.5 text-xs text-stone-800'>
          <Lock className='mt-px h-3.5 w-3.5 shrink-0 text-stone-600' aria-hidden='true' />
          <span className='line-clamp-2'>
            <span className='font-semibold'>Bị khoá: </span>
            {blockedReason}
          </span>
        </p>
      )}
      {st === 'ReworkRequired' && (
        <p className='flex items-start gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-900'>
          <MessageSquareWarning
            className='mt-px h-3.5 w-3.5 shrink-0 text-rose-600'
            aria-hidden='true'
          />
          <span className='line-clamp-2'>
            <span className='font-semibold'>Có yêu cầu sửa</span>
            {card.lastFeedbackComment ? `: ${card.lastFeedbackComment}` : ''}
          </span>
        </p>
      )}
    </>
  );
};

// ── Thẻ "phiếu sản xuất manga/comic" ──

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
  const thumbnail = useTaskThumbnail(card);

  return (
    <article
      className='group relative flex h-full min-w-0 flex-col rounded-xl border border-landing-border bg-[#FCFBF8] shadow-[0_1px_3px_rgba(28,25,23,0.06)] hover:border-landing-ink-muted/50 hover:shadow-[0_4px_12px_rgba(28,25,23,0.08)] transition-all'
      data-testid='production-task-card'
      aria-label={card.brief}
    >
      {/* 1. Vùng Thumbnail bản thảo manga */}
      <div className='relative w-full h-38 bg-[#F3F0E9] rounded-t-xl overflow-hidden border-b border-landing-border flex items-center justify-center select-none'>
        {/* Floating Badges: Cấp đối tượng bên trái, Trạng thái bên phải */}
        <div className='absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5'>
          {card.entityType === 'Page' ? (
            <span className='inline-flex items-center px-2 py-0.5 rounded-md bg-[#1C1917]/85 backdrop-blur-xs text-[#FCFBF8] font-mono text-xs font-semibold shadow-xs'>
              {card.targetLabel || `Trang ${card.pageNumber ?? '?'}`}
            </span>
          ) : card.entityType === 'Panel' ? (
            <span className='inline-flex items-center px-2 py-0.5 rounded-md bg-stone-800/85 backdrop-blur-xs text-[#FCFBF8] font-mono text-xs font-semibold shadow-xs'>
              Khung tranh
            </span>
          ) : (
            <span className='inline-flex items-center px-2 py-0.5 rounded-md bg-amber-950/85 backdrop-blur-xs text-amber-200 font-mono text-xs font-semibold shadow-xs'>
              Toàn chương
            </span>
          )}
        </div>

        <div className='absolute top-2.5 right-2.5 z-10'>
          <StatusBadge status={card.status} />
        </div>

        {/* Nội dung Thumbnail: Ảnh thật (contain) HOẶC Khung bản thảo fallback */}
        {thumbnail.status === 'success' && thumbnail.url ? (
          <div className='w-full h-full p-2 flex items-center justify-center relative'>
            <img
              src={thumbnail.url}
              alt={card.brief}
              className='max-h-full max-w-full object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-[1.02]'
              loading='lazy'
            />
            {thumbnail.isPreviousStage && (
              <span className='absolute bottom-2 left-2 z-10 text-[10px] font-mono bg-stone-900/80 text-amber-200 px-1.5 py-0.5 rounded shadow-xs backdrop-blur-xs'>
                {thumbnail.label}
              </span>
            )}
          </div>
        ) : (
          <div className='w-full h-full flex flex-col items-center justify-center p-3 text-center'>
            {/* Manga manuscript page wireframe */}
            <div className='w-20 h-24 border border-dashed border-[#D8D2C5] rounded bg-[#FCFBF8]/90 shadow-2xs flex flex-col items-center justify-center gap-1.5 p-2'>
              <StageIcon stageName={card.stageName} className='w-5 h-5 text-stone-400 stroke-1' />
              <span className='text-[10px] leading-tight text-stone-500 font-medium'>
                {thumbnail.label ||
                  (card.entityType === 'Chapter' ? 'Kế hoạch chương' : 'Chưa có bản vẽ')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Nội dung thẻ */}
      <div className='flex flex-1 flex-col p-4'>
        {/* Công đoạn + Priority */}
        <div className='flex items-center justify-between gap-2 mb-2'>
          <StageLabel card={card} />
          {card.priority && ['High', 'Urgent', '2', '3'].includes(String(card.priority)) && (
            <span className='px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200'>
              {String(card.priority) === 'Urgent' || String(card.priority) === '3'
                ? 'Khẩn'
                : 'Ưu tiên'}
            </span>
          )}
        </div>

        {/* Tên công việc: nút mở chi tiết, không dùng stretched-link phủ thẻ */}
        <h3 className='text-[15px] leading-snug font-semibold text-landing-ink'>
          <button
            type='button'
            onClick={(e) => onOpenDetails(card, e.currentTarget)}
            className='w-full text-left hover:text-[#C2410C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink rounded transition-colors cursor-pointer'
          >
            <span className='line-clamp-2'>{card.brief}</span>
          </button>
        </h3>

        {/* Ghi chú tham chiếu */}
        {card.referenceNotes && (
          <p className='mt-2 line-clamp-2 text-xs leading-relaxed text-landing-ink-muted'>
            {card.referenceNotes}
          </p>
        )}

        {/* Cảnh báo / phản hồi đặc biệt */}
        <div className='mt-2.5 flex flex-col gap-1.5'>
          <StatusNotes card={card} blockedReason={blockedReason} />
        </div>

        {/* 3. Footer: Người phụ trách, hạn, hành động */}
        <div className='mt-auto pt-4'>
          <div className='flex items-center justify-between gap-2 border-t border-landing-border pt-3'>
            <span className='flex min-w-0 items-center gap-2'>
              <Avatar card={card} />
              <span
                className='truncate text-xs font-medium text-landing-ink'
                title={card.assigneeName}
              >
                {card.assigneeName}
              </span>
            </span>
            <DueInfo card={card} now={now} />
          </div>

          <div className='mt-3 flex items-center justify-between gap-2 flex-wrap'>
            {action.kind !== 'details' ? (
              <>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetails(card, e.currentTarget);
                  }}
                  className='inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-landing-border bg-[#FCFBF8] px-2.5 py-1.5 text-xs font-semibold text-landing-ink hover:bg-[#FFF2E6] hover:border-[#C2410C]/50 hover:text-[#C2410C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] transition-colors cursor-pointer shadow-2xs'
                  aria-label={`Xem chi tiết: ${card.brief}`}
                  title='Xem chi tiết phiếu công việc'
                >
                  <Eye className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
                  <span>Chi tiết</span>
                  <ChevronRight className='h-3 w-3 text-stone-400' aria-hidden='true' />
                </button>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(card, action, e.currentTarget);
                  }}
                  className={actionButtonClass(action)}
                  aria-label={`${action.label}: ${card.brief}`}
                >
                  {action.label}
                </button>
              </>
            ) : (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(card, e.currentTarget);
                }}
                className='inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-landing-border bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-semibold text-landing-ink hover:bg-[#FFF2E6] hover:border-[#C2410C]/50 hover:text-[#C2410C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] transition-colors cursor-pointer shadow-2xs'
                aria-label={`Xem chi tiết: ${card.brief}`}
                title='Xem chi tiết phiếu công việc'
              >
                <Eye className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
                <span>Xem chi tiết</span>
                <ChevronRight className='h-3.5 w-3.5 text-stone-400' aria-hidden='true' />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
