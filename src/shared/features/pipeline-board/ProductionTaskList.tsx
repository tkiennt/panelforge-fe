import React from 'react';
import { Eye, ChevronRight } from 'lucide-react';
import type { BoardCard } from './pipelineBoard.types';
import { type PrimaryAction, actionButtonClass, statusKey } from './productionBoard.utils';
import { Avatar, DueInfo, StageLabel, StatusBadge, StatusNotes } from './ProductionTaskCard';

interface ProductionTaskListProps {
  cards: BoardCard[];
  now: number;
  actionFor: (card: BoardCard) => PrimaryAction;
  blockedReasonFor: (card: BoardCard) => string | null;
  onOpenDetails: (card: BoardCard, trigger: HTMLElement) => void;
  onAction: (card: BoardCard, action: PrimaryAction, trigger: HTMLElement) => void;
}

/**
 * Danh sách quét nhanh: Tên việc | Công đoạn | Phạm vi | Trạng thái | Người phụ trách | Hạn.
 * Responsive theo chiều rộng vùng nội dung (container query): hẹp thì mỗi việc là một khối xếp dọc.
 */
const ROW_GRID =
  '@3xl:grid @3xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto] @3xl:items-center @3xl:gap-4';

const CellLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className='w-28 shrink-0 text-xs text-landing-ink-muted @3xl:sr-only'>{children}</span>
);

export const ProductionTaskList: React.FC<ProductionTaskListProps> = ({
  cards,
  now,
  actionFor,
  blockedReasonFor,
  onOpenDetails,
  onAction,
}) => (
  <div className='@container min-w-0 overflow-hidden rounded-xl border border-landing-border bg-landing-paper-light'>
    <div
      className={`hidden border-b border-landing-border bg-landing-paper px-4 py-2.5 text-xs font-semibold text-landing-ink-muted ${ROW_GRID}`}
      aria-hidden='true'
    >
      <span>Tên việc</span>
      <span>Công đoạn</span>
      <span>Phạm vi</span>
      <span>Trạng thái</span>
      <span>Người phụ trách</span>
      <span>Hạn</span>
      <span className='w-28' />
    </div>
    <ul className='divide-y divide-landing-border' aria-label='Danh sách công việc'>
      {cards.map((card) => {
        const action = actionFor(card);
        const reason = blockedReasonFor(card);
        return (
          <li
            key={card.id}
            className={`flex flex-col gap-2 px-4 py-3 ${ROW_GRID}`}
            data-testid='production-task-row'
          >
            <div className='min-w-0'>
              <button
                type='button'
                onClick={(e) => onOpenDetails(card, e.currentTarget)}
                className='min-h-11 w-full rounded text-left text-[15px] font-semibold text-landing-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink cursor-pointer @3xl:min-h-0'
              >
                <span className='line-clamp-2'>{card.brief}</span>
              </button>
              {(reason ||
                card.isStageEnabled === false ||
                statusKey(card.status) === 'ReworkRequired') && (
                <div className='mt-1 flex flex-col gap-1'>
                  <StatusNotes card={card} blockedReason={reason} />
                </div>
              )}
            </div>
            <div className='flex min-w-0 items-center'>
              <CellLabel>Công đoạn</CellLabel>
              <StageLabel card={card} />
            </div>
            <div className='flex min-w-0 items-center text-sm text-landing-ink'>
              <CellLabel>Phạm vi</CellLabel>
              <span className='truncate'>{card.targetLabel}</span>
            </div>
            <div className='flex min-w-0 items-center'>
              <CellLabel>Trạng thái</CellLabel>
              <StatusBadge status={card.status} />
            </div>
            <div className='flex min-w-0 items-center gap-2'>
              <CellLabel>Người phụ trách</CellLabel>
              <Avatar card={card} />
              <span className='truncate text-sm text-landing-ink' title={card.assigneeName}>
                {card.assigneeName}
              </span>
            </div>
            <div className='flex min-w-0 items-center'>
              <CellLabel>Hạn</CellLabel>
              <DueInfo card={card} now={now} />
            </div>
            <div className='flex @3xl:w-40 @3xl:justify-end items-center gap-1.5'>
              {action.kind !== 'details' ? (
                <>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(card, e.currentTarget);
                    }}
                    className='inline-flex min-h-9 items-center gap-1 rounded-lg border border-landing-border bg-[#FCFBF8] px-2.5 py-1 text-xs font-semibold text-landing-ink hover:bg-[#FFF2E6] hover:border-[#C2410C]/50 hover:text-[#C2410C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] transition-colors cursor-pointer shadow-2xs'
                    aria-label={`Xem chi tiết: ${card.brief}`}
                    title='Xem chi tiết phiếu công việc'
                  >
                    <Eye className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
                    <span className='hidden sm:inline'>Chi tiết</span>
                    <ChevronRight className='h-3 w-3 text-stone-400' aria-hidden='true' />
                  </button>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(card, action, e.currentTarget);
                    }}
                    className={`${actionButtonClass(action)} w-full @3xl:w-auto`}
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
                  className='inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-landing-border bg-[#FCFBF8] px-3 py-1 text-xs font-semibold text-landing-ink hover:bg-[#FFF2E6] hover:border-[#C2410C]/50 hover:text-[#C2410C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C] transition-colors cursor-pointer shadow-2xs w-full @3xl:w-auto'
                  aria-label={`Xem chi tiết: ${card.brief}`}
                  title='Xem chi tiết phiếu công việc'
                >
                  <Eye className='h-3.5 w-3.5 text-stone-500' aria-hidden='true' />
                  <span>Xem chi tiết</span>
                  <ChevronRight className='h-3.5 w-3.5 text-stone-400' aria-hidden='true' />
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);
