import React from 'react';
import { AlertCircle, AlertTriangle, BookOpen, Calendar, Layers, UserCheck } from 'lucide-react';
import type { ChapterProgressDto } from '@/services/series.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { StageProgressTimeline } from './StageProgressTimeline';
import { CHAPTER_STATUS_STYLE, NEUTRAL_BADGE, clampPercent, formatViDate } from './dashboardFormat';

interface ChapterStatusTableProps {
  chapters: ChapterProgressDto[];
  selectedChapterId?: string;
  onSelect: (chapterId: string) => void;
  onAssign: (chapter: ChapterProgressDto) => void;
}

const ChapterRow: React.FC<{
  chapter: ChapterProgressDto;
  isSelected: boolean;
  onSelect: () => void;
  onAssign: () => void;
}> = ({ chapter: ch, isSelected, onSelect, onAssign }) => {
  const statusStyle = CHAPTER_STATUS_STYLE[ch.status] || {
    label: ch.status,
    className: NEUTRAL_BADGE,
  };
  const release = formatViDate(ch.targetReleaseDate);
  const hasPanels = (ch.panelCount || 0) > 0;
  const barTone = isSelected
    ? 'bg-studio-accent'
    : ch.status === 'Approved' || ch.status === 'Published'
      ? 'bg-emerald-600'
      : 'bg-stone-400';

  return (
    <div
      onClick={onSelect}
      tabIndex={0}
      role='button'
      aria-pressed={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`focus-ring p-4 rounded-xl border transition-colors text-left cursor-pointer ${
        isSelected
          ? 'bg-orange-50/40 border-orange-300 ring-2 ring-orange-500/15'
          : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-stone-300'
      }`}
    >
      <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-3'>
        <div className='flex items-center gap-3.5 min-w-0 flex-1'>
          <div
            className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 text-white ${
              isSelected ? 'bg-studio-accent' : 'bg-stone-900'
            }`}
          >
            <span className='text-xs font-semibold opacity-80 leading-none'>TẬP</span>
            <span className='text-base font-bold font-mono leading-none mt-0.5'>
              {String(ch.chapterNumber).padStart(2, '0')}
            </span>
          </div>

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-base font-bold text-stone-900 tracking-tight truncate'>
                {formatChapterLabel(ch.chapterNumber, ch.title)}
              </span>
              {isSelected && (
                <span className='text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 shrink-0'>
                  Đang chọn
                </span>
              )}
            </div>
            <div className='text-xs text-stone-600 flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1'>
              {hasPanels ? (
                <span className='inline-flex items-center gap-1 font-medium'>
                  <Layers className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                  {ch.pageCount} trang · {ch.panelCount} panel
                </span>
              ) : (
                <span className='text-stone-500 italic'>Chưa có nội dung</span>
              )}
              {release && (
                <span className='inline-flex items-center gap-1 font-medium'>
                  <Calendar className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                  Hạn: {release}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className='hidden sm:flex items-center justify-center px-1'>
          <StageProgressTimeline percentComplete={ch.percentComplete || 0} status={ch.status} />
        </div>

        <div className='flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0'>
          {ch.overdueAssignments > 0 && (
            <span className='px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1'>
              <AlertTriangle className='w-3.5 h-3.5' aria-hidden='true' />
              {ch.overdueAssignments} Quá hạn
            </span>
          )}
          {(ch.overdueChangeRequests ?? 0) > 0 && (
            <span className='px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1'>
              <AlertCircle className='w-3.5 h-3.5' aria-hidden='true' />
              {ch.overdueChangeRequests} Sửa trễ
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium border ${statusStyle.className}`}
          >
            {statusStyle.label}
          </span>
          <span className='text-xs font-mono font-bold tabular-nums text-stone-900 min-w-10 text-right'>
            {hasPanels ? `${ch.percentComplete}%` : '–'}
          </span>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onAssign();
            }}
            className='focus-ring h-9 px-2.5 rounded-lg bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-800 border border-stone-200 hover:border-orange-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer'
            title={`Giao việc mới cho Chương ${ch.chapterNumber}`}
          >
            <UserCheck className='w-3.5 h-3.5' aria-hidden='true' />
            <span>Giao việc</span>
          </button>
        </div>
      </div>

      <div className='sm:hidden flex items-center overflow-x-auto pt-2 pb-0.5'>
        <StageProgressTimeline percentComplete={ch.percentComplete || 0} status={ch.status} />
      </div>

      <div className='w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-3'>
        <div
          className={`h-full rounded-full ${barTone}`}
          style={{ width: `${clampPercent(ch.percentComplete)}%` }}
        />
      </div>
    </div>
  );
};

export const ChapterStatusTable: React.FC<ChapterStatusTableProps> = ({
  chapters,
  selectedChapterId,
  onSelect,
  onAssign,
}) => {
  const selected = chapters.find((c) => c.chapterId === selectedChapterId);

  return (
    <section
      aria-label='Tiến độ chương'
      className='bg-white border border-stone-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4'
    >
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4'>
        <div>
          <h2 className='text-lg font-bold text-stone-900'>
            Tiến Độ Theo Từng Chương ({chapters.length})
          </h2>
          <p className='text-xs text-stone-600 mt-0.5'>
            {selected
              ? `Đang xem: Chương ${selected.chapterNumber} · Chọn chương để đối chiếu ma trận công đoạn bên dưới`
              : 'Chọn một chương để xem chi tiết ma trận công đoạn bên dưới'}
          </p>
        </div>
      </div>

      {chapters.length === 0 ? (
        <div className='border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col items-center text-center gap-2'>
          <div className='bg-orange-50 text-orange-600 p-3 rounded-xl'>
            <BookOpen className='w-6 h-6' aria-hidden='true' />
          </div>
          <p className='font-serif font-bold text-stone-900'>Chưa có chương nào trong Series này</p>
          <p className='text-xs text-stone-600'>
            Tạo chương mới từ nút "Quản Lý Chương (Duyệt)" ở đầu trang.
          </p>
        </div>
      ) : (
        <div className='space-y-3'>
          {chapters.map((ch) => (
            <ChapterRow
              key={ch.chapterId}
              chapter={ch}
              isSelected={ch.chapterId === selectedChapterId}
              onSelect={() => onSelect(ch.chapterId)}
              onAssign={() => onAssign(ch)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
