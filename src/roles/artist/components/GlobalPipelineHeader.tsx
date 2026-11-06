/* Lucian UX/UI Prompt #039 & #042 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/ */
import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Sparkles,
  Send,
  Loader2,
  Edit3,
  PenTool,
  Type,
  CheckCircle2,
  Clock,
  Layers,
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
  hasArtworkForCurrentStage?: boolean;
  uploadedArtworksCount?: number;
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
  onHandoffStage,
  isSubmittingHandoff = false,
  canEdit = true,
  onBackToChapters,
  hasArtworkForCurrentStage = true,
  uploadedArtworksCount = 0,
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

  const stageList = stages.slice(0, 3);
  const activeIndex = stageList.findIndex((s) => s.id === (currentActiveStage?.id || selectedStageFilter));
  const activeStage = activeIndex >= 0 ? stageList[activeIndex] : stageList[0];

  const currentStageSlug = (activeStage?.slug || activeStage?.name || '').toLowerCase();
  const isPencil = currentStageSlug.includes('pencil') || currentStageSlug.includes('chì') || activeIndex === 0;
  const isInk = currentStageSlug.includes('ink') || currentStageSlug.includes('nét') || currentStageSlug.includes('mực') || activeIndex === 1;
  const isLettering = currentStageSlug.includes('letter') || activeStage?.allowedRole === 'Letterer' || activeIndex === 2;

  const stageProgressLabel = isPencil
    ? 'PENCIL IN PROGRESS'
    : isInk
      ? 'INK IN PROGRESS'
      : isLettering
        ? 'LETTERING IN PROGRESS'
        : `${(activeStage?.name || 'STAGE').toUpperCase()} IN PROGRESS`;

  const stageBadgeTone = isPencil
    ? 'bg-amber-500/10 text-amber-900 border-amber-300'
    : isInk
      ? 'bg-indigo-500/10 text-indigo-900 border-indigo-300'
      : 'bg-purple-500/10 text-purple-900 border-purple-300';

  const dotColor = isPencil
    ? 'bg-amber-600'
    : isInk
      ? 'bg-indigo-600'
      : 'bg-purple-600';

  return (
    <header
      data-testid='global-pipeline-header'
      className='bg-[#FCFBF8] border-b border-[#D8D2C5] px-3 py-1.5 min-h-[46px] flex items-center justify-between gap-3 shrink-0 select-none shadow-2xs z-40'
    >
      {/* =========================================================================
          TẦNG 2 - KHỐI TRÁI: CHAPTER NAVIGATION & CURRENT WORKFLOW BADGE
         ========================================================================= */}
      <div className='flex items-center gap-2.5 text-xs shrink-0'>
        {onBackToChapters && (
          <button
            type='button'
            onClick={onBackToChapters}
            data-testid='switch-chapter-btn'
            title='Quay lại màn hình danh sách chọn chương'
            aria-label='Đổi chương'
            className='h-7 px-2.5 inline-flex items-center gap-1.5 rounded-lg border border-[#D8D2C5] bg-[#FAF8F5] hover:bg-[#F3F0E9] text-stone-700 hover:text-stone-900 transition-colors cursor-pointer text-xs font-semibold shrink-0'
          >
            <ChevronLeft className='w-3.5 h-3.5 text-stone-600' />
            <span className='hidden sm:inline'>Đổi chương</span>
          </button>
        )}

        {/* Tên truyện / Tên chương */}
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

        {/* Current Workflow Stage Badge */}
        <div
          data-testid='global-stage-tag'
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold font-mono tracking-wide ${stageBadgeTone}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
          <span>{stageProgressLabel}</span>
        </div>
      </div>

      {/* =========================================================================
          TẦNG 2 - KHỐI GIỮA: PRODUCTION STAGE PROGRESS NAVIGATION (1. Pencil -> 2. Ink -> 3. Lettering)
         ========================================================================= */}
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
          const label = isPencilTab ? 'Pencil' : isInkTab ? 'Ink' : 'Lettering';
          const IconComp = isPencilTab ? Edit3 : isInkTab ? PenTool : Type;

          // Subtitle phản ánh trạng thái chuẩn theo user proposal:
          // 1. Pencil: "Đang thực hiện" hoặc "Hoàn thành"
          // 2. Ink: "Chờ tiếp nhận" hoặc "Đang thực hiện" hoặc "Hoàn thành"
          // 3. Lettering: "Chưa bắt đầu" hoặc "Đang thực hiện"
          let statusText = 'Chưa bắt đầu';
          if (idx === activeIndex) {
            statusText = 'Đang thực hiện';
          } else if (idx < activeIndex) {
            statusText = 'Hoàn thành';
          } else if (idx === activeIndex + 1) {
            statusText = 'Chờ tiếp nhận';
          }

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
                title={`Chuyển sang công đoạn ${stage.name} (${statusText})`}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-2xs font-bold border border-stone-200/60'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
                }`}
              >
                <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-mono font-bold ${
                  isSelected ? 'bg-orange-600 text-white' : idx < activeIndex ? 'bg-emerald-600 text-white' : 'bg-stone-300 text-stone-700'
                }`}>
                  {idx < activeIndex ? '✓' : idx + 1}
                </span>

                <div className='flex flex-col text-left leading-tight'>
                  <div className='flex items-center gap-1'>
                    <IconComp className={`w-3 h-3 ${isSelected ? 'text-orange-600' : 'text-stone-500'}`} />
                    <span className='font-bold'>{label}</span>
                  </div>
                  <span className={`text-[9px] font-medium ${
                    isSelected ? 'text-orange-700' : idx < activeIndex ? 'text-emerald-700' : 'text-stone-400'
                  }`}>
                    {statusText}
                  </span>
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* =========================================================================
          TẦNG 2 - KHỐI PHẢI: UNIFIED PAGE NAVIGATOR & STAGE HANDOVER ACTION
         ========================================================================= */}
      <div className='flex items-center gap-3 shrink-0'>
        {/* Unified Page Navigator: Gộp trang thành 1 bộ điều hướng duy nhất */}
        <div className='flex items-center gap-1.5'>
          <div className='flex items-center gap-0.5 bg-[#F3F0E9] p-0.5 rounded-lg border border-[#D8D2C5]'>
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
              className='font-bold px-2 text-stone-800 text-xs whitespace-nowrap'
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

          {/* Badge số ảnh đã upload */}
          <div
            data-testid='uploaded-assets-count-badge'
            className='hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-[#FAF8F5] border border-[#D8D2C5] text-[11px] font-semibold text-stone-600'
            title={`Trang này có ${uploadedArtworksCount} ảnh/bản vẽ đã tải lên`}
          >
            <Layers className='w-3 h-3 text-stone-400' />
            <span>{uploadedArtworksCount} ảnh đã upload</span>
          </div>
        </div>

        {/* Nút Submit chuyển giao Stage (Production Handover Action) */}
        {canEdit && onHandoffStage && activeStage && (
          <>
            {(() => {
              const currentIdx = stageList.findIndex((s) => s.id === activeStage.id);
              const canSubmit = hasArtworkForCurrentStage && !isSubmittingHandoff;

              // BƯỚC 1: PENCIL ➔ INK: Submit to Ink
              if (currentIdx === 0) {
                return (
                  <button
                    type='button'
                    onClick={() => canSubmit && onHandoffStage(activeStage)}
                    disabled={!canSubmit}
                    data-testid='btn-handoff-pencil-ink'
                    title={
                      !hasArtworkForCurrentStage
                        ? 'Vui lòng upload ảnh nét chì trước khi bàn giao sang Ink'
                        : 'Kiểm tra ảnh nét chì và bàn giao sang Ink Stage'
                    }
                    className={`h-7 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                      canSubmit
                        ? 'bg-orange-600 hover:bg-orange-700 active:scale-95 text-white cursor-pointer'
                        : 'bg-orange-600/40 text-white/80 cursor-not-allowed border border-orange-600/30'
                    }`}
                  >
                    {isSubmittingHandoff ? (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <ArrowRight className='w-3.5 h-3.5' />
                    )}
                    <span>{isSubmittingHandoff ? 'Đang bàn giao...' : 'Submit to Ink'}</span>
                  </button>
                );
              }

              // BƯỚC 2: INK ➔ LETTERING: Submit to Lettering
              if (currentIdx === 1) {
                return (
                  <button
                    type='button'
                    onClick={() => canSubmit && onHandoffStage(activeStage)}
                    disabled={!canSubmit}
                    data-testid='btn-handoff-ink-lettering'
                    title={
                      !hasArtworkForCurrentStage
                        ? 'Vui lòng upload ảnh Line-art trước khi chuyển sang Lettering'
                        : 'Xác nhận bàn giao nét mực hoàn thiện cho Letterer'
                    }
                    className={`h-7 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                      canSubmit
                        ? 'bg-orange-600 hover:bg-orange-700 active:scale-95 text-white cursor-pointer'
                        : 'bg-orange-600/40 text-white/80 cursor-not-allowed border border-orange-600/30'
                    }`}
                  >
                    {isSubmittingHandoff ? (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <Sparkles className='w-3.5 h-3.5' />
                    )}
                    <span>{isSubmittingHandoff ? 'Đang bàn giao...' : 'Submit to Lettering'}</span>
                  </button>
                );
              }

              // BƯỚC 3: LETTERING ➔ DUYỆT GATE 2: Submit for Review
              return (
                <button
                  type='button'
                  onClick={() => canSubmit && onHandoffStage(activeStage)}
                  disabled={!canSubmit}
                  data-testid='btn-handoff-lettering-gate2'
                  title={
                    !hasArtworkForCurrentStage
                      ? 'Vui lòng hoàn thiện bản vẽ & thoại trước khi nộp duyệt'
                      : 'Nộp bản thảo hoàn chỉnh cho Editor thẩm định ở Gate 2'
                  }
                  className={`h-7 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                    canSubmit
                      ? 'bg-orange-600 hover:bg-orange-700 active:scale-95 text-white cursor-pointer'
                      : 'bg-orange-600/40 text-white/80 cursor-not-allowed border border-orange-600/30'
                  }`}
                >
                  {isSubmittingHandoff ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Send className='w-3.5 h-3.5' />
                  )}
                  <span>{isSubmittingHandoff ? 'Đang nộp...' : 'Submit for Review'}</span>
                </button>
              );
            })()}
          </>
        )}
      </div>
    </header>
  );
};
