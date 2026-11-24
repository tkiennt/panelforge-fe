import React from 'react';
import {
  User,
  MessageSquare,
  Clapperboard,
  BookOpen,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SceneScriptLineSummaryDto, NarrationMode } from '@/services/scriptLine.service';
import { BibleEntryDto } from '@/services/bible.service';
import { ConsistencyFindingDto } from '@/services/assignment.service';
import type { AiSuggestionDto } from '@/services/aiAgents.service';
import { SuggestionCard } from '@/shared/features/ai-agents/SuggestionCard';
import { useTranslation } from '@/lib/i18n';

interface ScriptLineItemProps {
  line: SceneScriptLineSummaryDto;
  index: number;
  speakerName: string | null;
  character?: BibleEntryDto;
  allBibleEntries: BibleEntryDto[];
  isFirst: boolean;
  isLast: boolean;
  canEditScript: boolean;
  isChapterLocked: boolean;
  isReorderingLines: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  isHighlighted: boolean;
  lineFinding?: ConsistencyFindingDto;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onMoveLine: (index: number, direction: 'up' | 'down') => void;
  onEditLine: (line: SceneScriptLineSummaryDto) => void;
  onDeleteLine: (line: SceneScriptLineSummaryDto) => void;
  onRewriteLine?: (line: SceneScriptLineSummaryDto) => void;
  isRewriting?: boolean;
  copilotSuggestion?: AiSuggestionDto | null;
  copilotBusy?: boolean;
  copilotError?: string | null;
  seriesId?: string;
  aiNameById?: Record<string, string>;
  onDecideCopilot?: (decision: 'accept' | 'reject' | 'request-changes', reason?: string) => void;
}

export const ScriptLineItem: React.FC<ScriptLineItemProps> = ({
  line,
  index,
  speakerName,
  character,
  allBibleEntries,
  isFirst,
  isLast,
  canEditScript,
  isChapterLocked,
  isReorderingLines,
  isDragging,
  isDragOver,
  isHighlighted,
  lineFinding,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onMoveLine,
  onEditLine,
  onDeleteLine,
  onRewriteLine,
  isRewriting = false,
  copilotSuggestion,
  copilotBusy = false,
  copilotError,
  seriesId,
  aiNameById,
  onDecideCopilot,
}) => {
  const { t } = useTranslation('writer');
  const getBibleEntry = (id?: string | null) => {
    if (!id) return null;
    return allBibleEntries.find((e) => e.id === id);
  };

  const narrationModeLabel: Record<NarrationMode, { label: string; icon: string }> = {
    Present: { label: t('scriptLineItem.narration.Present'), icon: '⏱️' },
    Flashback: { label: t('scriptLineItem.narration.Flashback'), icon: '⏪' },
    Dream: { label: t('scriptLineItem.narration.Dream'), icon: '💭' },
    Imagination: { label: t('scriptLineItem.narration.Imagination'), icon: '✨' },
    Lie: { label: t('scriptLineItem.narration.Lie'), icon: '🤥' },
    Rumor: { label: t('scriptLineItem.narration.Rumor'), icon: '🗣️' },
    UnreliableNarrator: { label: t('scriptLineItem.narration.UnreliableNarrator'), icon: '🎭' },
  };

  return (
    <div
      id={`script-line-${line.id}`}
      data-testid={`script-line-${line.id}`}
      draggable={canEditScript && !isChapterLocked && !isReorderingLines}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 group relative ${
        isDragging
          ? 'opacity-40 border-dashed border-[#F97316] bg-[#FFF2E6]/40'
          : isDragOver
            ? 'border-[#F97316] ring-2 ring-[#F97316]/30 bg-[#FFF2E6]/60 scale-[1.01]'
            : isHighlighted
              ? 'border-[#F97316] ring-3 ring-[#F97316]/40 bg-[#FFF2E6]/80 shadow-md scale-[1.01]'
              : 'border-[#D8D2C5] bg-[#FCFBF8] hover:border-[#F97316]/60 shadow-2xs hover:shadow-xs'
      }`}
    >
      {/* Header bar of script line */}
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2 flex-wrap min-w-0'>
          {canEditScript && !isChapterLocked && (
            <div
              className='cursor-grab active:cursor-grabbing text-[#57534E] hover:text-[#C2410C] p-1 rounded-md hover:bg-[#F3F0E9] transition-colors'
              title={t('scriptLineItem.dragTooltip')}
            >
              <GripVertical className='w-4 h-4' />
            </div>
          )}

          <span className='font-mono text-xs font-bold text-[#57534E] bg-[#F3F0E9] px-2 py-0.5 rounded-md border border-[#D8D2C5]'>
            #{line.lineOrder}
          </span>

          {/* Speaker pill: Character name if present, else distinct Narration pill */}
          {speakerName ? (
            <span className='inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1917] bg-[#FFF2E6] border border-[#F97316]/40 px-2.5 py-0.5 rounded-full shadow-2xs'>
              <User className='w-3 h-3 text-[#C2410C]' />
              <span>{speakerName}</span>
            </span>
          ) : (
            <span className='inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] bg-[#F3F0E9] border border-[#D8D2C5] px-2.5 py-0.5 rounded-full'>
              <Clapperboard className='w-3 h-3 text-[#57534E]' />
              <span>{t('scriptLineItem.narrationActionPill')}</span>
            </span>
          )}

          {/* Panel ID pill if attached */}
          {line.panelId && (
            <span className='text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md flex items-center gap-1'>
              <Layers className='w-3 h-3' />
              <span>Panel</span>
            </span>
          )}

          {/* Narration Mode badge (if not default Present) */}
          {line.narrationMode && line.narrationMode !== 'Present' && (
            <span
              data-testid={`narration-mode-badge-${line.id}`}
              className='text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1'
              title={t('scriptLineItem.narrationExceptionTooltip', { mode: line.narrationMode })}
            >
              <span>{narrationModeLabel[line.narrationMode]?.icon || '✨'}</span>
              <span>{narrationModeLabel[line.narrationMode]?.label || line.narrationMode}</span>
            </span>
          )}

          {/* Highlight indicator badge */}
          {isHighlighted && (
            <span className='text-xs font-bold text-orange-700 bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full animate-pulse'>
              {t('scriptLineItem.viewingThisLine')}
            </span>
          )}
        </div>

        {/* Action buttons (AI Rewrite, Move Up, Move Down, Edit, Delete) */}
        {canEditScript && !isChapterLocked && (
          <div className='flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0'>
            {onRewriteLine && Boolean(line.dialogueText?.trim()) && !line.id.startsWith('wc-') && (
              <button
                type='button'
                data-testid={`ai-rewrite-line-${line.id}`}
                onClick={() => onRewriteLine(line)}
                disabled={isRewriting || copilotBusy}
                className='mr-1 inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-[#C2410C] hover:bg-orange-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                title={t('scriptLineItem.aiRewriteTooltip')}
              >
                {isRewriting ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <Sparkles className='w-3.5 h-3.5' />
                )}
                <span>{t('scriptLineItem.aiRewriteBtn')}</span>
              </button>
            )}
            <button
              type='button'
              onClick={() => onMoveLine(index, 'up')}
              disabled={isFirst || isReorderingLines}
              className='p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              title={t('scriptLineItem.moveUpTooltip')}
            >
              <ChevronUp className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={() => onMoveLine(index, 'down')}
              disabled={isLast || isReorderingLines}
              className='p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              title={t('scriptLineItem.moveDownTooltip')}
            >
              <ChevronDown className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={() => onEditLine(line)}
              className='p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg cursor-pointer transition-colors'
              title={t('scriptLineItem.editLineTooltip')}
            >
              <Edit2 className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              onClick={() => onDeleteLine(line)}
              className='p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors'
              title={t('scriptLineItem.deleteLineTooltip')}
            >
              <Trash2 className='w-3.5 h-3.5' />
            </button>
          </div>
        )}
      </div>

      {/* Stage Direction (Chỉ dẫn hành động/bối cảnh) */}
      {line.stageDirection && (
        <div className='mt-2.5 text-xs md:text-sm italic text-[#57534E] bg-[#F8F6F0] p-2.5 rounded-xl border-l-3 border-[#C2410C] font-sans leading-relaxed break-words whitespace-pre-wrap border border-[#D8D2C5]/50'>
          <span className='font-semibold not-italic text-[#C2410C] mr-1.5'>
            {t('scriptLineItem.stageDirectionPrefix')}
          </span>
          {line.stageDirection}
        </div>
      )}

      {/* Dialogue (Lời thoại nhân vật) */}
      {line.dialogueText && (
        <div className='mt-3 text-[15px] md:text-base text-[#1C1917] font-serif leading-relaxed tracking-wide break-words whitespace-pre-wrap'>
          &ldquo;{line.dialogueText}&rdquo;
        </div>
      )}

      {/* Line Consistency Finding Badge (Chỉ xem, không có triage) */}
      {lineFinding && (
        <div
          data-testid={`line-finding-${line.id}`}
          className={`mt-3 p-2.5 rounded-xl text-xs md:text-sm flex items-start gap-2.5 border ${
            lineFinding.severity === 'Blocking'
              ? 'bg-rose-50/90 border-rose-200 text-rose-900'
              : lineFinding.severity === 'Warning'
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-blue-50/90 border-blue-200 text-blue-900'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 shrink-0 mt-0.5 ${
              lineFinding.severity === 'Blocking'
                ? 'text-rose-600'
                : lineFinding.severity === 'Warning'
                  ? 'text-amber-600'
                  : 'text-blue-600'
            }`}
          />
          <div className='flex-1 min-w-0'>
            <div className='font-bold flex items-center gap-1.5 flex-wrap'>
              <span>
                [
                {lineFinding.severity === 'Blocking'
                  ? t('consistencyDrawer.severityBlocking')
                  : lineFinding.severity === 'Warning'
                    ? t('consistencyDrawer.severityWarning')
                    : t('consistencyDrawer.severityInfo')}
                ]
              </span>
              <span className='font-mono text-xs opacity-75'>{lineFinding.ruleCode}</span>
            </div>
            <p className='mt-0.5 break-words'>{lineFinding.message}</p>
            {lineFinding.evidence && (
              <p className='mt-1 font-mono text-xs opacity-90 break-words bg-white/80 p-1.5 rounded'>
                {t('consistencyDrawer.evidenceLabel')} &ldquo;{lineFinding.evidence}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {copilotError && (
        <div
          role='alert'
          className='mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800'
        >
          {copilotError}
        </div>
      )}

      {copilotSuggestion && canEditScript && !isChapterLocked && onDecideCopilot && (
        <div className='mt-3'>
          <SuggestionCard
            suggestion={copilotSuggestion}
            seriesId={seriesId}
            busy={copilotBusy}
            nameById={aiNameById}
            onDecide={onDecideCopilot}
          />
        </div>
      )}
    </div>
  );
};
