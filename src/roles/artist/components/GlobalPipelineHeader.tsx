/* Lucian UX/UI Prompt #039 & #042 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/ */
import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileImage,
  ArrowRight,
  Sparkles,
  Send,
  Loader2,
  Edit3,
  PenTool,
  Type,
  CheckCircle2,
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
  onHandoffStage?: (stage: PipelineStageDto) => void;
  isSubmittingHandoff?: boolean;
  canEdit?: boolean;
  onBackToChapters?: () => void;
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
  onHandoffStage,
  isSubmittingHandoff = false,
  canEdit = true,
  onBackToChapters,
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

  const stageList = stages.slice(0, 3);
  const activeIndex = stageList.findIndex((s) => s.id === (currentActiveStage?.id || selectedStageFilter));
  const activeStage = activeIndex >= 0 ? stageList[activeIndex] : stageList[0];

  return (
    <header
      data-testid='global-pipeline-header'
      className='bg-[#FCFBF8] border-b border-[#D8D2C5] px-3 py-1 min-h-[38px] h-[38px] flex items-center justify-between gap-2 shrink-0 select-none shadow-2xs'
    >
      {/* 1. KHỐI TRÁI: ĐIỀU HƯỚNG CHƯƠNG & TRANG */}
      <div className='flex items-center gap-2 text-xs shrink-0'>
        {onBackToChapters && (
          <button
            type='button'
            onClick={onBackToChapters}
            data-testid='switch-chapter-btn'
            title='Quay lại màn hình danh sách chọn chương'
            aria-label='Đổi chương'
            className='h-6 px-2 inline-flex items-center gap-1 rounded-md border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-[#F3F0E9] text-stone-700 hover:text-stone-900 transition-colors cursor-pointer text-[11px] font-semibold shrink-0'
          >
            <ChevronLeft className='w-3.5 h-3.5 text-stone-600' />
            <span className='hidden sm:inline'>Đổi chương</span>
          </button>
        )}

        {/* Tên truyện & Tên chương */}
        <div className='flex items-center gap-1.5 font-semibold text-stone-800'>
          <span className='font-bold text-[#1C1917] hidden md:inline truncate max-w-[120px]'>
            {seriesTitle}
          </span>
          <span className='text-stone-300 hidden md:inline'>/</span>
          <div className='flex items-center gap-1 text-[#C2410C] font-bold'>
            <BookOpen className='w-3.5 h-3.5' />
            <span className='truncate max-w-[140px]'>
              {chapter ? `Chương ${chapter.chapterNumber}` : 'Chương'}
            </span>
          </div>
        </div>

        {/* Bộ chọn trang: Prev [ Trang 01/12 ] Next */}
        <div className='flex items-center gap-1 bg-[#F3F0E9] p-0.5 rounded-lg border border-[#D8D2C5]'>
          <button
            type='button'
            data-testid='btn-prev-page'
            onClick={handlePrev}
            disabled={!hasPrev}
            title='Trang trước'
            className='p-1 rounded text-stone-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors'
          >
            <ChevronLeft className='w-3.5 h-3.5' />
          </button>

          <span
            data-testid='current-page-indicator'
            className='font-bold px-1.5 text-stone-800 text-[11px] whitespace-nowrap'
          >
            Trang {selectedPage ? String(selectedPage.pageNumber).padStart(2, '0') : '--'}/
            {String(pages.length).padStart(2, '0')}
          
            {selectedPage && (
              <span data-testid="toolbar-page-context" className="sr-only">
                Trang {selectedPage.pageNumber}
              </span>
            )}
          </span>

          <button
            type='button'
            data-testid='btn-next-page'
            onClick={handleNext}
            disabled={!hasNext}
            title='Trang sau'
            className='p-1 rounded text-stone-700 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors'
          >
            <ChevronRight className='w-3.5 h-3.5' />
          </button>
        </div>

        {/* Stage Tag */}
        <span
          data-testid='global-stage-tag'
          className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded border hidden xl:inline-block ${stageTagColor}`}
        >
          {stageTagLabel}
        </span>
      </div>

      {/* 2. KHỐI GIỮA: STAGE NAVIGATION BADGES SWITCHER [Pencil Stage] -> [Ink Stage] -> [Lettering Stage] */}
      <div
        data-testid='artist-stage-tabs-bar'
        className='flex items-center gap-1 p-0.5 bg-[#F1EDE4] rounded-xl border border-[#DFD9CD] shadow-inner shrink-0'
      >
        {stageList.map((stage, idx) => {
          const isSelected = stage.id === activeStage?.id;
          const slug = (stage.slug || stage.name || '').toLowerCase();
          const isPencilTab = slug.includes('pencil') || slug.includes('chì') || idx === 0;
          const isInkTab = slug.includes('ink') || slug.includes('nét') || slug.includes('mực') || idx === 1;

          const key = isPencilTab ? 'pencil' : isInkTab ? 'ink' : 'lettering';
          const label = isPencilTab ? 'Pencil Stage' : isInkTab ? 'Ink Stage' : 'Lettering Stage';
          const IconComp = isPencilTab ? Edit3 : isInkTab ? PenTool : Type;

          return (
            <React.Fragment key={stage.id}>
              {idx > 0 && <ChevronRight className='w-3 h-3 text-stone-400 shrink-0' aria-hidden='true' />}
              <button
                type='button'
                onClick={() => onSelectStageFilter(stage.id)}
                data-testid={`stage-tab-${stage.slug || stage.id || key}`}
                data-stage-key={key}
                aria-selected={isSelected}
                role='tab'
                title={`Chuyển sang ${stage.name}`}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
                }`}
              >
                <span className='font-mono text-[10px] text-stone-400'>{idx + 1}.</span>
                <IconComp className={`w-3 h-3 ${isSelected ? 'text-stone-900' : 'text-stone-500'}`} />
                <span>{label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* 3. KHỐI PHẢI: NÚT ACTION BÀN GIAO / HANDOFF THEO NGỮ CẢNH & CHỌN TRANG */}
      <div className='flex items-center gap-2 shrink-0'>
        {/* Dropdown chuyển trang */}
        {pages.length > 0 && (
          <select
            data-testid='header-page-dropdown'
            value={selectedPage?.id || ''}
            onChange={(e) => {
              const p = pages.find((pg) => pg.id === e.target.value);
              if (p) onSelectPage(p);
            }}
            aria-label='Chọn trang'
            className='h-6.5 px-2 rounded-md border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-white text-[11px] font-semibold text-stone-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500'
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                Trang {p.pageNumber} / {pages.length}
              </option>
            ))}
          </select>
        )}

        {canEdit && onHandoffStage && activeStage && (
          <>
            {(() => {
              const currentIdx = stageList.findIndex((s) => s.id === activeStage.id);

              // BƯỚC 1: PENCIL ➔ INK
              if (currentIdx === 0) {
                return (
                  <button
                    type='button'
                    onClick={() => onHandoffStage(activeStage)}
                    disabled={isSubmittingHandoff}
                    data-testid='btn-handoff-pencil-ink'
                    title='Bàn giao nét chì sang Ink: Tự động mở việc Ink'
                    className='h-6.5 px-2.5 inline-flex items-center gap-1 rounded-md text-[11px] font-bold bg-orange-600 hover:bg-orange-700 active:scale-95 text-white shadow-2xs cursor-pointer transition-all disabled:opacity-50'
                  >
                    {isSubmittingHandoff ? (
                      <Loader2 className='w-3 h-3 animate-spin' />
                    ) : (
                      <ArrowRight className='w-3 h-3' />
                    )}
                    <span>Hand over to Ink</span>
                  </button>
                );
              }

              // BƯỚC 2: INK ➔ LETTERING
              if (currentIdx === 1) {
                return (
                  <button
                    type='button'
                    onClick={() => onHandoffStage(activeStage)}
                    disabled={isSubmittingHandoff}
                    data-testid='btn-handoff-ink-lettering'
                    title='Chuyển giao nét vẽ sang Lettering: Tự động mở việc ráp thoại cho Letterer'
                    className='h-6.5 px-2.5 inline-flex items-center gap-1 rounded-md text-[11px] font-bold bg-orange-600 hover:bg-orange-700 active:scale-95 text-white shadow-2xs cursor-pointer transition-all disabled:opacity-50'
                  >
                    {isSubmittingHandoff ? (
                      <Loader2 className='w-3 h-3 animate-spin' />
                    ) : (
                      <Sparkles className='w-3 h-3' />
                    )}
                    <span>Submit for Review</span>
                  </button>
                );
              }

              // BƯỚC 3: LETTERING ➔ DUYỆT GATE 2
              return (
                <button
                  type='button'
                  onClick={() => onHandoffStage(activeStage)}
                  disabled={isSubmittingHandoff}
                  data-testid='btn-handoff-lettering-gate2'
                  title='Nộp bản thảo hoàn chỉnh cho Editor thẩm định ở Gate 2'
                  className='h-6.5 px-2.5 inline-flex items-center gap-1 rounded-md text-[11px] font-bold bg-orange-600 hover:bg-orange-700 active:scale-95 text-white shadow-2xs cursor-pointer transition-all disabled:opacity-50'
                >
                  {isSubmittingHandoff ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <Send className='w-3 h-3' />
                  )}
                  <span>Submit for Review</span>
                </button>
              );
            })()}
          </>
        )}
      </div>
    </header>
  );
};
