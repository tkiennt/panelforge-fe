/* Lucian UX/UI Prompt #039 & #042 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#039 · https://lucianlabs.dev/uxui-prompt/#042 */
import React from 'react';
import {
  Edit3,
  PenTool,
  Type,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Loader2,
  Send,
} from 'lucide-react';
import { PipelineStageDto } from '@/services/pipeline.service';

interface Props {
  stages: PipelineStageDto[];
  activeStageId: string | null;
  onSelectStage: (stageId: string) => void;
  onHandoffStage: (stage: PipelineStageDto) => void;
  isSubmitting?: boolean;
  canEdit?: boolean;
  pencilArtworkAvailable?: boolean;
  inkArtworkAvailable?: boolean;
}

export const LucianArtistStageTabs: React.FC<Props> = ({
  stages,
  activeStageId,
  onSelectStage,
  onHandoffStage,
  isSubmitting = false,
  canEdit = true,
  pencilArtworkAvailable = false,
  inkArtworkAvailable = false,
}) => {
  // Chỉ lấy đúng 3 giai đoạn: Pencil ➔ Ink ➔ Lettering
  const stageList = stages.slice(0, 3);
  const activeIndex = stageList.findIndex((s) => s.id === activeStageId);
  const currentStage = activeIndex >= 0 ? stageList[activeIndex] : stageList[0];

  const getStageMeta = (stage: PipelineStageDto, index: number) => {
    const slug = (stage.slug || stage.name || '').toLowerCase();
    if (slug.includes('pencil') || slug.includes('chì') || index === 0) {
      return {
        step: 1,
        key: 'pencil',
        title: 'Nét chì (Pencil)',
        shortTitle: 'Pencil',
        subtitle: 'Phác thảo thô & bố cục',
        icon: Edit3,
        accentColor: '#F59E0B',
        accentBg: 'bg-amber-500',
        activeText: 'text-amber-900',
        activeBorder: 'border-amber-400',
        isDone: pencilArtworkAvailable || (activeIndex > 0),
      };
    }
    if (slug.includes('ink') || slug.includes('nét') || slug.includes('mực') || index === 1) {
      return {
        step: 2,
        key: 'ink',
        title: 'Đi nét & Trame (Ink)',
        shortTitle: 'Inking',
        subtitle: 'Line-art sạch & sắc độ',
        icon: PenTool,
        accentColor: '#0284C7',
        accentBg: 'bg-sky-600',
        activeText: 'text-sky-950',
        activeBorder: 'border-sky-400',
        isDone: inkArtworkAvailable || (activeIndex > 1),
      };
    }
    return {
      step: 3,
      key: 'lettering',
      title: 'Ráp thoại (Lettering)',
      shortTitle: 'Lettering',
      subtitle: 'Bóng thoại, Kiểu chữ & SFX',
      icon: Type,
      accentColor: '#8B5CF6',
      accentBg: 'bg-purple-600',
      activeText: 'text-purple-950',
      activeBorder: 'border-purple-400',
      isDone: false,
    };
  };

  return (
    <div
      data-testid='artist-stage-tabs-bar'
      className='bg-[#FCFBF8] border-b border-[#E6E1D6] px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs select-none'
    >
      {/* CỤM 1: LUCIAN SLIDING SEGMENTED TABS (PENCIL ➔ INK ➔ LETTERING) */}
      <div className='flex items-center gap-1.5 p-1 bg-[#F1EDE4] rounded-2xl border border-[#DFD9CD] shadow-inner max-w-full overflow-x-auto no-scrollbar'>
        {stageList.map((stage, idx) => {
          const meta = getStageMeta(stage, idx);
          const isSelected = stage.id === currentStage?.id;
          const IconComp = meta.icon;

          return (
            <button
              key={stage.id}
              type='button'
              onClick={() => onSelectStage(stage.id)}
              data-testid={`stage-tab-${stage.slug || stage.id || meta.key}`}
              data-stage-key={meta.key}
              aria-selected={isSelected}
              role='tab'
              title={`Chuyển sang công đoạn ${meta.title}`}
              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80 scale-[1.01]'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              {/* Step indicator / Checkmark */}
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold transition-colors ${
                  meta.isDone && !isSelected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isSelected
                      ? `${meta.accentBg} text-white shadow-2xs`
                      : 'bg-stone-200 text-stone-600'
                }`}
              >
                {meta.isDone && !isSelected ? (
                  <CheckCircle2 className='w-3.5 h-3.5 text-emerald-700' />
                ) : (
                  meta.step
                )}
              </span>

              {/* Stage Icon */}
              <IconComp
                className={`w-3.5 h-3.5 ${
                  isSelected ? 'text-stone-900' : 'text-stone-500'
                }`}
              />

              {/* Label */}
              <div className='flex flex-col text-left leading-tight'>
                <span className='font-bold tracking-tight'>{meta.shortTitle}</span>
                <span className='text-[10px] text-stone-400 font-normal hidden lg:inline'>
                  {meta.subtitle}
                </span>
              </div>

              {/* Status Badge */}
              {meta.isDone && (
                <span className='text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 hidden sm:inline uppercase'>
                  Xong
                </span>
              )}
              {isSelected && (
                <span className='w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse' />
              )}
            </button>
          );
        })}
      </div>

      {/* CỤM 2: ACTION BUTTONS (CHUYỂN TIẾP LIÊN TỤC VÀ KHÔNG BỊ CHẶN) */}
      {canEdit && currentStage && (
        <div className='flex items-center gap-2 shrink-0 ml-auto'>
          {(() => {
            const currentIdx = stageList.findIndex((s) => s.id === currentStage.id);

            // BƯỚC 1: PENCIL ➔ INK (Internal Handoff, không cần Editor duyệt)
            if (currentIdx === 0) {
              return (
                <button
                  type='button'
                  onClick={() => onHandoffStage(currentStage)}
                  disabled={isSubmitting}
                  data-testid='btn-handoff-pencil-ink'
                  title='Bàn giao nét chì sang Ink: Hoàn tất nội bộ, tự động mở task Ink ngay lập tức'
                  className='h-8 px-3.5 inline-flex items-center gap-2 rounded-xl text-xs font-bold bg-[#F97316] hover:bg-orange-600 active:scale-95 text-white shadow-xs cursor-pointer transition-all disabled:opacity-50'
                >
                  {isSubmitting ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <ArrowRight className='w-3.5 h-3.5' />
                  )}
                  <span>Bàn giao sang Inking ➔</span>
                  <span className='hidden sm:inline text-[10px] font-normal text-white/80 border-l border-white/30 pl-2'>
                    Tự động mở Ink
                  </span>
                </button>
              );
            }

            // BƯỚC 2: INK ➔ LETTERING (Chuyển giao mở task Letterer)
            if (currentIdx === 1) {
              return (
                <button
                  type='button'
                  onClick={() => onHandoffStage(currentStage)}
                  disabled={isSubmitting}
                  data-testid='btn-handoff-ink-lettering'
                  title='Chuyển giao sang Lettering: Đóng gói nét mực hoàn thiện và mở việc ráp thoại cho Letterer'
                  className='h-8 px-3.5 inline-flex items-center gap-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs cursor-pointer transition-all disabled:opacity-50'
                >
                  {isSubmitting ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Sparkles className='w-3.5 h-3.5' />
                  )}
                  <span>Chuyển giao ➔ Lettering</span>
                  <span className='hidden sm:inline text-[10px] font-normal text-white/80 border-l border-white/30 pl-2'>
                    Mở task Letterer
                  </span>
                </button>
              );
            }

            // BƯỚC 3: LETTERING ➔ DUYỆT GATE 2 (Editor / Producer duyệt)
            return (
              <button
                type='button'
                onClick={() => onHandoffStage(currentStage)}
                disabled={isSubmitting}
                data-testid='btn-handoff-lettering-gate2'
                title='Nộp bản thảo hoàn chỉnh (Tranh vẽ + Lời thoại) cho Editor thẩm định ở Gate 2'
                className='h-8 px-3.5 inline-flex items-center gap-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs cursor-pointer transition-all disabled:opacity-50'
              >
                {isSubmitting ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Send className='w-3.5 h-3.5' />
                )}
                <span>Nộp duyệt Gate 2 (Editor) ➔</span>
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
};
