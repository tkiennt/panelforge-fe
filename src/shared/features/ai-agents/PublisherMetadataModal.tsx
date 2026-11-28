// src/shared/features/ai-agents/PublisherMetadataModal.tsx
/**
 * FE #31: Producer xin AI gợi ý metadata phát hành từ một chương (tóm tắt, thể loại, teaser, độ tuổi).
 * Theo AiWorkflowPolicy chỉ Producer chạy được (Publisher chỉ kiểm duyệt, không dùng AI). Đề xuất qua
 * Chấp nhận / Từ chối; Chấp nhận ghi tóm tắt + thể loại vào Series (BR-02), phần còn lại để tham khảo khi đăng.
 */
import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Modal } from '@/shared/ui/Modal';
import { aiAgentsService, type AiSuggestionDto } from '@/services/aiAgents.service';
import { SuggestionCard } from './SuggestionCard';

interface PublisherMetadataModalProps {
  seriesId: string;
  chapterId: string;
  chapterLabel: string;
  onClose: () => void;
  /** Sau khi Chấp nhận: màn hình tải lại Series để thấy tóm tắt/thể loại mới. */
  onAccepted?: () => void | Promise<void>;
}

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error && e.message ? e.message : fallback;

export const PublisherMetadataModal: React.FC<PublisherMetadataModalProps> = ({
  seriesId,
  chapterId,
  chapterLabel,
  onClose,
  onAccepted,
}) => {
  const { t } = useTranslation('features');
  const [instruction, setInstruction] = useState('');
  const [suggestion, setSuggestion] = useState<AiSuggestionDto | null>(null);
  const [running, setRunning] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setNotice(null);
    try {
      setSuggestion(
        await aiAgentsService.runPublisherMetadata(seriesId, {
          chapterId,
          instruction: instruction.trim() || null,
        }),
      );
    } catch (e) {
      setError(errorMessage(e, t('aiAgents.metadata.decideFailed')));
    } finally {
      setRunning(false);
    }
  };

  const decide = async (decision: 'accept' | 'reject' | 'request-changes', reason?: string) => {
    if (!suggestion) return;
    setDeciding(true);
    setError(null);
    try {
      await aiAgentsService.review(seriesId, suggestion.id, decision, reason ? { reason } : {});
      setSuggestion(null);
      if (decision === 'accept') {
        setNotice(t('aiAgents.metadata.accepted'));
        await onAccepted?.();
      }
    } catch (e) {
      setError(errorMessage(e, t('aiAgents.metadata.decideFailed')));
    } finally {
      setDeciding(false);
    }
  };

  return (
    <Modal
      isOpen
      size='lg'
      title={`${t('aiAgents.metadata.title')} · ${chapterLabel}`}
      description={t('aiAgents.metadata.description')}
      closeLabel={t('aiAgents.metadata.close')}
      onClose={onClose}
    >
      <div data-testid='publisher-metadata-modal' className='space-y-3'>
        <label className='flex flex-col gap-1 text-xs font-medium text-stone-700'>
          {t('aiAgents.metadata.instructionLabel')}
          <textarea
            data-testid='publisher-metadata-instruction'
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={t('aiAgents.metadata.instructionPlaceholder')}
            rows={2}
            maxLength={500}
            className='rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none'
          />
        </label>
        <button
          type='button'
          data-testid='publisher-metadata-run'
          disabled={running || deciding || !!suggestion}
          onClick={() => void run()}
          className='inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50'
        >
          {running ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden='true' />
          ) : (
            <Sparkles className='h-3.5 w-3.5' aria-hidden='true' />
          )}
          {running ? t('aiAgents.metadata.running') : t('aiAgents.metadata.run')}
        </button>
        {error && (
          <p role='alert' className='text-xs text-rose-700'>
            {error}
          </p>
        )}
        {notice && (
          <p role='status' className='text-xs text-emerald-700'>
            {notice}
          </p>
        )}
        {suggestion && (
          <SuggestionCard
            suggestion={suggestion}
            seriesId={seriesId}
            busy={deciding}
            onDecide={(decision, reason) => void decide(decision, reason)}
          />
        )}
      </div>
    </Modal>
  );
};
