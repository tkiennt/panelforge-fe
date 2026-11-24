import React from 'react';
import { AlertCircle, AlertTriangle, BookOpen, Calendar, Layers, UserCheck } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ChapterProgressDto } from '@/services/series.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { StageProgressTimeline } from './StageProgressTimeline';
import { CHAPTER_STATUS_STYLE, NEUTRAL_BADGE, clampPercent, formatViDate } from './dashboardFormat';

interface ChapterStatusTableProps {
  chapters: ChapterProgressDto[];
  selectedChapterId?: string;
  onSelect: (chapterId: string) => void;
  onAssign: (chapter: ChapterProgressDto) => void;
  onManageChapter?: (chapter: ChapterProgressDto) => void;
}

const ChapterRow: React.FC<{
  chapter: ChapterProgressDto;
  isSelected: boolean;
  onSelect: () => void;
  onAssign: () => void;
  onManage?: () => void;
}> = ({ chapter: ch, isSelected, onSelect, onAssign, onManage }) => {
  const { t, lang } = useTranslation('production');
  const statusDef = CHAPTER_STATUS_STYLE[ch.status];
  const statusStyle = statusDef
    ? { label: t(statusDef.labelKey), className: statusDef.className }
    : { label: ch.status, className: NEUTRAL_BADGE };
  const release = formatViDate(ch.targetReleaseDate, lang);
  const hasPanels = (ch.panelCount || 0) > 0;
  const barTone = isSelected
    ? 'bg-studio-accent'
    : ch.status === 'ChapterApproved' || ch.status === 'HandedOffAndPublished'
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
          if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) return;
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
            <span className='text-xs font-semibold opacity-80 leading-none'>
              {t('dashboard.chapters.episodeLabel')}
            </span>
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
                  {t('dashboard.chapters.selected')}
                </span>
              )}
            </div>
            <div className='text-xs text-stone-600 flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1'>
              {hasPanels ? (
                <span className='inline-flex items-center gap-1 font-medium'>
                  <Layers className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                  {t('dashboard.chapters.pagesAndPanels', {
                    pages: ch.pageCount,
                    panels: ch.panelCount,
                  })}
                </span>
              ) : (
                <span className='text-stone-500 italic'>{t('dashboard.chapters.noContent')}</span>
              )}
              {release && (
                <span className='inline-flex items-center gap-1 font-medium'>
                  <Calendar className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                  {t('dashboard.chapters.due', { date: release })}
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
              {t('dashboard.chapters.overdueBadge', { count: ch.overdueAssignments })}
            </span>
          )}
          {(ch.overdueChangeRequests ?? 0) > 0 && (
            <span className='px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1'>
              <AlertCircle className='w-3.5 h-3.5' aria-hidden='true' />
              {t('dashboard.chapters.lateReworkBadge', { count: ch.overdueChangeRequests ?? 0 })}
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
          {onManage && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onManage();
              }}
              className='focus-ring h-9 px-2.5 rounded-lg bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer'
              title={t('dashboard.chapters.manageTooltip', { number: ch.chapterNumber })}
            >
              <BookOpen className='w-3.5 h-3.5 text-orange-600' aria-hidden='true' />
              <span>{t('dashboard.chapters.manageBtn')}</span>
            </button>
          )}
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              onAssign();
            }}
            className='focus-ring h-9 px-2.5 rounded-lg bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-800 border border-stone-200 hover:border-orange-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer'
            title={t('dashboard.chapters.assignTooltip', { number: ch.chapterNumber })}
          >
            <UserCheck className='w-3.5 h-3.5' aria-hidden='true' />
            <span>{t('dashboard.chapters.assignBtn')}</span>
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
  onManageChapter,
}) => {
  const { t } = useTranslation('production');
  const selected = chapters.find((c) => c.chapterId === selectedChapterId);

  return (
    <section
      aria-label={t('dashboard.chapters.sectionAria')}
      className='bg-white border border-stone-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4'
    >
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4'>
        <div>
          <h2 className='text-lg font-bold text-stone-900'>
            {t('dashboard.chapters.title', { count: chapters.length })}
          </h2>
          <p className='text-xs text-stone-600 mt-0.5'>
            {selected
              ? t('dashboard.chapters.viewingSelected', { number: selected.chapterNumber })
              : t('dashboard.chapters.viewingHint')}
          </p>
        </div>
      </div>

      {chapters.length === 0 ? (
        <div className='border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col items-center text-center gap-2'>
          <div className='bg-orange-50 text-orange-600 p-3 rounded-xl'>
            <BookOpen className='w-6 h-6' aria-hidden='true' />
          </div>
          <p className='font-serif font-bold text-stone-900'>{t('dashboard.chapters.empty')}</p>
          <p className='text-xs text-stone-600'>{t('dashboard.chapters.emptyHintHeader')}</p>
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
              onManage={onManageChapter ? () => onManageChapter(ch) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
};
