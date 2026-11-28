// src/shared/features/ai-agents/PanelAiTools.tsx
/**
 * AI trong bàn vẽ của Artist cho Panel đang chọn (FE #31): soạn mô tả vẽ (workflow Artist → đề xuất ImagePrompt)
 * và sinh Thumbnail từ mô tả vẽ đã duyệt. AI chỉ đề xuất: Thumbnail chỉ thành artwork mới khi người dùng Chấp nhận.
 * Quyền (vai trò, assignment, chương khoá) do Backend kiểm; lỗi hiện đúng lý do Backend trả.
 */
import React, { useState } from 'react';
import { ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  aiAgentsService,
  type AiSuggestionDto,
  type ReadingDirection,
} from '@/services/aiAgents.service';
import { AiAssistPanel } from './AiAssistPanel';
import { SuggestionCard } from './SuggestionCard';

interface PanelAiToolsProps {
  seriesId: string;
  chapterId: string;
  panelId: string;
  /** Scene của Panel; workflow Artist cần Scene có layout đã duyệt. */
  sceneId?: string | null;
  chapterVersion: number;
  readingDirection: ReadingDirection | number;
  nameById: Record<string, string>;
  /** Tải lại artwork / dữ liệu bàn vẽ sau khi Chấp nhận. */
  onReload: () => void | Promise<void>;
}

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export const PanelAiTools: React.FC<PanelAiToolsProps> = ({
  seriesId,
  chapterId,
  panelId,
  sceneId,
  chapterVersion,
  readingDirection,
  nameById,
  onReload,
}) => {
  const { t } = useTranslation('features');
  const [promptOpen, setPromptOpen] = useState(false);
  const [thumbnail, setThumbnail] = useState<AiSuggestionDto | null>(null);
  const [running, setRunning] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runThumbnail = async () => {
    setRunning(true);
    setError(null);
    try {
      setThumbnail(await aiAgentsService.runThumbnail(seriesId, { panelId }));
    } catch (e) {
      setError(errorMessage(e, t('aiAgents.panelTools.decideFailed')));
    } finally {
      setRunning(false);
    }
  };

  const decide = async (decision: 'accept' | 'reject' | 'request-changes', reason?: string) => {
    if (!thumbnail) return;
    setDeciding(true);
    setError(null);
    try {
      await aiAgentsService.review(seriesId, thumbnail.id, decision, reason ? { reason } : {});
      setThumbnail(null);
      if (decision === 'accept') await onReload();
    } catch (e) {
      setError(errorMessage(e, t('aiAgents.panelTools.decideFailed')));
    } finally {
      setDeciding(false);
    }
  };

  const buttonClass =
    'inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section
      data-testid='panel-ai-tools'
      aria-label={t('aiAgents.panelTools.title')}
      className='space-y-2 border-t border-stone-200 bg-[#FCFBF8] px-3 py-2'
    >
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-xs font-bold uppercase tracking-wide text-[#737373]'>
          {t('aiAgents.panelTools.title')}
        </span>
        <button
          type='button'
          data-testid='panel-ai-image-prompt'
          disabled={!sceneId}
          onClick={() => setPromptOpen(true)}
          className={buttonClass}
        >
          <Sparkles className='h-3.5 w-3.5 text-violet-600' aria-hidden='true' />
          {t('aiAgents.panelTools.imagePrompt')}
        </button>
        <button
          type='button'
          data-testid='panel-ai-thumbnail'
          disabled={running || deciding || !!thumbnail}
          onClick={() => void runThumbnail()}
          className={buttonClass}
        >
          {running ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
          ) : (
            <ImageIcon className='h-3.5 w-3.5 text-violet-600' aria-hidden='true' />
          )}
          {running ? t('aiAgents.panelTools.thumbnailRunning') : t('aiAgents.panelTools.thumbnail')}
        </button>
      </div>
      <p className='text-xs text-stone-500'>
        {sceneId ? t('aiAgents.panelTools.hint') : t('aiAgents.panelTools.noScene')}
      </p>
      {error && (
        <p role='alert' className='text-xs text-rose-700'>
          {error}
        </p>
      )}
      {thumbnail && (
        <SuggestionCard
          suggestion={thumbnail}
          seriesId={seriesId}
          busy={deciding}
          nameById={nameById}
          onDecide={(decision, reason) => void decide(decision, reason)}
        />
      )}
      {promptOpen && sceneId && (
        <AiAssistPanel
          key={`artist-${panelId}`}
          seriesId={seriesId}
          chapterId={chapterId}
          sceneId={sceneId}
          workflowType='Artist'
          suggestionKind='ImagePrompt'
          title={t('aiAgents.panelTools.promptTitle')}
          briefLabel={t('aiAgents.panelTools.promptBriefLabel')}
          briefPlaceholder={t('aiAgents.panelTools.promptBriefPlaceholder')}
          runLabel={t('aiAgents.panelTools.promptRunLabel')}
          readingDirection={readingDirection}
          chapterVersion={chapterVersion}
          nameById={nameById}
          hasPanels
          panelIds={[panelId]}
          onClose={() => setPromptOpen(false)}
          onReload={() => onReload()}
        />
      )}
    </section>
  );
};
