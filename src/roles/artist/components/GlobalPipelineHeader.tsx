import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  FileImage,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { PageDto } from '@/services/page.service';
import { ChapterDto } from '@/services/chapter.service';
import { PipelineStageDto } from '@/services/pipeline.service';

interface Props {
  seriesTitle?: string;
  chapter?: ChapterDto | null;
  pages: PageDto[];
  selectedPage: PageDto | null;
  onSelectPage: (page: PageDto) => void;
  currentActiveStage: PipelineStageDto | null;
  selectedStageFilter: string;
  onSelectStageFilter: (stageId: string) => void;
  stages: PipelineStageDto[];
  pageProgressPercent?: number;
}

export const GlobalPipelineHeader: React.FC<Props> = ({
  seriesTitle = 'PanelForge Studio',
  chapter,
  pages,
  selectedPage,
  onSelectPage,
  currentActiveStage,
  selectedStageFilter,
  onSelectStageFilter,
  stages,
  pageProgressPercent = 0,
}) => {
  const currentIndex = selectedPage ? pages.findIndex((p) => p.id === selectedPage.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < pages.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectPage(pages[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectPage(pages[currentIndex + 1]);
  };

  const currentStageSlug = (currentActiveStage?.slug || currentActiveStage?.name || '').toLowerCase();
  const isPencil = currentStageSlug.includes('pencil') || currentStageSlug.includes('chì');
  const isInk = currentStageSlug.includes('ink') || currentStageSlug.includes('nét');
  const isLettering = currentStageSlug.includes('letter') || currentActiveStage?.allowedRole === 'Letterer';

  const stageTagLabel = isPencil
    ? '[PENCIL]'
    : isInk
      ? '[INK]'
      : isLettering
        ? '[LETTERING]'
        : `[${(currentActiveStage?.name || 'STAGE').toUpperCase()}]`;

  const stageTagColor = isPencil
    ? 'bg-amber-100 text-amber-900 border-amber-300'
    : isInk
      ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
      : isLettering
        ? 'bg-sky-100 text-sky-900 border-sky-300'
        : 'bg-stone-100 text-stone-800 border-stone-300';

  return (
    <header
      data-testid='global-pipeline-header'
      className='bg-[#FCFBF8] border-b border-[#D8D2C5] px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-soft-sm select-none'
    >
      {/* 1. Breadcrumb & Project Name */}
      <div className='flex items-center gap-2 text-xs'>
        <span className='font-serif font-black tracking-tight text-[#1C1917] text-sm'>
          {seriesTitle}
        </span>
        <span className='text-stone-300'>/</span>
        <div className='flex items-center gap-1.5 text-stone-700 font-semibold'>
          <BookOpen className='w-3.5 h-3.5 text-orange-600' />
          <span>
            {chapter ? `Chương ${chapter.chapterNumber}${chapter.title ? `: ${chapter.title}` : ''}` : 'Chương'}
          </span>
        </div>
        <span className='text-stone-300'>/</span>

        {/* Stage Tag */}
        <span
          data-testid='global-stage-tag'
          className={`font-mono text-[11px] font-black px-2 py-0.5 rounded border ${stageTagColor}`}
        >
          {stageTagLabel}
        </span>
      </div>

      {/* 2. Page Selector & Prev/Next Navigation */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          data-testid='btn-prev-page'
          onClick={handlePrev}
          disabled={!hasPrev}
          title='Trang trước (Phím tắt: [ hoặc ◄)'
          className='p-1.5 rounded-lg border border-[#D8D2C5] bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs'
        >
          <ChevronLeft className='w-4 h-4' />
        </button>

        <div className='flex items-center gap-2 bg-[#F3F0E9] px-3 py-1 rounded-xl border border-[#D8D2C5] text-xs font-semibold'>
          <FileImage className='w-3.5 h-3.5 text-stone-600' />
          <span data-testid='current-page-indicator'>
            Trang {selectedPage ? String(selectedPage.pageNumber).padStart(2, '0') : '--'}/
            {String(pages.length).padStart(2, '0')}
          </span>
          {selectedPage && (
            <span className='text-[10px] font-mono text-stone-500'>
              ({selectedPage.widthPx || 1200}×{selectedPage.heightPx || 1800}px)
            </span>
          )}
        </div>

        <button
          type='button'
          data-testid='btn-next-page'
          onClick={handleNext}
          disabled={!hasNext}
          title='Trang sau (Phím tắt: ] hoặc ►)'
          className='p-1.5 rounded-lg border border-[#D8D2C5] bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs'
        >
          <ChevronRight className='w-4 h-4' />
        </button>
      </div>

      {/* 3. Stage Selector Pills & Progress Indicator */}
      <div className='flex items-center gap-3'>
        {/* Progress Bar của Trang */}
        <div className='hidden md:flex items-center gap-2 text-xs'>
          <span className='text-[11px] text-stone-500 font-medium'>Tiến độ trang:</span>
          <div className='w-24 h-2 bg-stone-200 rounded-full overflow-hidden'>
            <div
              className='h-full bg-orange-500 transition-all duration-300'
              style={{ width: `${Math.min(100, Math.max(0, pageProgressPercent))}%` }}
            />
          </div>
          <span className='font-mono font-bold text-[10px] text-stone-600'>
            {Math.round(pageProgressPercent)}%
          </span>
        </div>

        {/* 3-Stage Lucian Indicators (Pencil ➔ Ink ➔ Lettering) */}
        <div className='flex items-center gap-1 bg-[#F1EDE4] p-0.5 rounded-xl border border-[#DFD9CD] text-xs font-semibold'>
          {stages.slice(0, 3).map((s, idx) => {
            const isSelected = selectedStageFilter === s.id || (selectedStageFilter === 'AUTO' && currentActiveStage?.id === s.id);
            const slug = (s.slug || s.name || '').toLowerCase();
            const label = slug.includes('pencil') || slug.includes('chì')
              ? 'Pencil'
              : slug.includes('ink') || slug.includes('nét')
                ? 'Ink'
                : 'Lettering';

            return (
              <button
                key={s.id}
                type='button'
                data-testid={`header-stage-${s.slug || s.id}`}
                onClick={() => onSelectStageFilter(s.id)}
                title={`Chuyển sang ${s.name}`}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span className='font-mono text-[10px] text-stone-400'>{idx + 1}.</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
