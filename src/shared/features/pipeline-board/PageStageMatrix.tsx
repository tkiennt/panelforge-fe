import React from 'react';
import type { BoardCard } from './pipelineBoard.types';
import { isCardOverdue, statusKey, statusLabel, type StatusKey } from './productionBoard.utils';
import { cellLead, type MatrixColumn, type MatrixRow } from './pageStageMatrix.utils';

/** Màu trạng thái theo DESIGN_RULES §1.5 (Mực Ngọc / Lam / Hổ Phách / Đỏ / Tro). */
const CELL_TONE: Record<StatusKey, string> = {
  Assigned: 'bg-white text-stone-700 border-stone-300',
  InProgress: 'bg-blue-50 text-blue-900 border-blue-200',
  Submitted: 'bg-amber-50 text-amber-900 border-amber-300',
  UnderReview: 'bg-amber-50 text-amber-900 border-amber-300',
  ReworkRequired: 'bg-rose-50 text-rose-900 border-rose-300',
  Approved: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  Blocked: 'bg-stone-200 text-stone-800 border-stone-400',
};

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-landing-ink';

export const PageStageMatrix: React.FC<{
  columns: MatrixColumn[];
  rows: MatrixRow[];
  now: number;
  onOpen: (card: BoardCard, trigger: HTMLElement) => void;
}> = ({ columns, rows, now, onOpen }) => (
  <div
    className='min-w-0 overflow-x-auto rounded-xl border border-landing-border bg-white shadow-2xs'
    data-testid='page-stage-matrix'
  >
    <table className='w-full border-collapse text-sm'>
      <caption className='sr-only'>
        Bảng trang: tiến độ từng trang qua các công đoạn sản xuất
      </caption>
      <thead>
        <tr className='border-b border-landing-border bg-[#FAF8F5]'>
          <th
            scope='col'
            className='sticky left-0 z-10 bg-[#FAF8F5] px-4 py-2.5 text-left font-semibold text-landing-ink'
          >
            Trang
          </th>
          {columns.map((col, i) => (
            <th
              key={col.id}
              scope='col'
              className='min-w-28 px-2 py-2.5 text-left font-semibold text-landing-ink whitespace-nowrap'
            >
              <span className='mr-1.5 font-mono text-xs text-landing-ink-muted'>{i + 1}</span>
              {col.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className='border-b border-stone-100 last:border-b-0'>
            <th
              scope='row'
              className='sticky left-0 z-10 bg-white px-4 py-2 text-left align-middle whitespace-nowrap'
            >
              <span className='block font-serif text-base font-bold text-landing-ink'>
                {row.label}
              </span>
              <span className='block text-xs text-landing-ink-muted tabular-nums'>
                {row.total > 0 ? `${row.done}/${row.total} công đoạn xong` : 'Chưa giao việc'}
              </span>
            </th>
            {columns.map((col) => {
              const cards = row.cells[col.id] ?? [];
              const lead = cellLead(cards);
              if (!lead) {
                return (
                  <td key={col.id} className='px-2 py-2 align-middle'>
                    <span
                      className='block h-11 rounded-lg border border-dashed border-stone-200'
                      aria-label={`${row.label}, ${col.name}: chưa giao`}
                    />
                  </td>
                );
              }
              const key = (statusKey(lead.status) ?? 'Assigned') as StatusKey;
              const overdue = isCardOverdue(lead, now);
              const label = `${row.label}, ${col.name}: ${statusLabel(lead.status)}, ${lead.assigneeName}${
                overdue ? ', quá hạn' : ''
              }${cards.length > 1 ? `, và ${cards.length - 1} việc khác` : ''}`;
              return (
                <td key={col.id} className='px-2 py-2 align-middle'>
                  <button
                    type='button'
                    onClick={(e) => onOpen(lead, e.currentTarget)}
                    aria-label={label}
                    title={label}
                    className={`flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-2.5 text-left transition-colors duration-150 hover:border-landing-ink cursor-pointer ${CELL_TONE[key]} ${focusRing}`}
                  >
                    <span className='min-w-0'>
                      <span className='block truncate text-xs font-semibold'>
                        {statusLabel(lead.status)}
                      </span>
                      {overdue && (
                        <span className='block text-xs font-medium text-rose-700'>Quá hạn</span>
                      )}
                    </span>
                    <span className='flex shrink-0 items-center gap-1'>
                      {cards.length > 1 && (
                        <span className='text-xs font-mono tabular-nums'>+{cards.length - 1}</span>
                      )}
                      <span
                        className='flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-landing-ink ring-1 ring-black/10'
                        aria-hidden='true'
                      >
                        {lead.assigneeAvatarInitials}
                      </span>
                    </span>
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
