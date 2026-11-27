import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  aiAgentsService,
  type AiSuggestionDto,
  type BibleStubSuggestion,
} from '@/services/aiAgents.service';
import { SuggestionCard } from '@/shared/features/ai-agents/SuggestionCard';
import { useTranslation } from '@/lib/i18n';

interface BibleStubAiDraftSectionProps {
  seriesId?: string;
  entryId: string;
  canUseAi: boolean;
  onApplyDraft: (draft: { description: string; subtitle: string }) => void;
}

/**
 * Bible Stub Harvester: xin hồ sơ nháp có trích dẫn từ các dòng kịch bản nhắc tới mục stub (BR-02, BR-07, BR-10).
 * Bấm "Dùng làm nháp" chỉ ghi nhận Accept và đổ description + subtitle vào form để Writer tự sửa trước khi lưu.
 */
export const BibleStubAiDraftSection: React.FC<BibleStubAiDraftSectionProps> = ({
  seriesId,
  entryId,
  canUseAi,
  onApplyDraft,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSuggestion(null);
    setError(null);
  }, [entryId]);

  if (!canUseAi || !seriesId || !entryId) return null;

  const handleRequestDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiAgentsService.runBibleStubDraft(seriesId, entryId, undefined);
      setSuggestion(res);
    } catch (err: any) {
      setError(
        err?.message || t('bible.defineStub.aiDraftError', 'Không thể soạn nháp từ kịch bản.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDecide = async (
    decision: 'accept' | 'reject' | 'request-changes',
    reason?: string,
  ) => {
    if (!suggestion) return;
    setDeciding(true);
    setError(null);
    try {
      const res = await aiAgentsService.review(
        seriesId,
        suggestion.id,
        decision,
        reason ? { reason } : {},
      );
      if (decision === 'accept') {
        const payload = suggestion.payload as BibleStubSuggestion | undefined;
        const draft = payload?.draft;
        onApplyDraft({
          description: draft?.description ?? '',
          subtitle: draft?.subtitle ?? '',
        });
      }
      setSuggestion({
        ...suggestion,
        status: res.status,
        canDecide: false,
        canAccept: false,
      });
    } catch (err: any) {
      setError(err?.message || t('bible.defineStub.aiDecisionError', 'Không thể ghi quyết định.'));
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div
      data-testid={`bible-stub-ai-draft-${entryId}`}
      className='rounded-xl border border-orange-200/80 bg-[#FAF8F5] p-2.5 space-y-2'
    >
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <span className='text-xs text-stone-600'>
          {t('bible.defineStub.aiHint', 'Tổng hợp đặc tả kèm trích dẫn nguyên văn từ kịch bản')}
        </span>
        <button
          type='button'
          data-testid='bible-stub-ai-draft-btn'
          onClick={() => void handleRequestDraft()}
          disabled={loading || deciding}
          className='inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 text-xs font-semibold text-[#C2410C] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? (
            <Loader2 className='w-3.5 h-3.5 animate-spin' />
          ) : (
            <Sparkles className='w-3.5 h-3.5' />
          )}
          <span>{t('bible.defineStub.aiDraftBtn', 'Soạn nháp từ kịch bản')}</span>
        </button>
      </div>

      {error && (
        <div
          role='alert'
          className='rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800'
        >
          {error}
        </div>
      )}

      {suggestion && (
        <SuggestionCard
          suggestion={suggestion}
          seriesId={seriesId}
          busy={deciding}
          onDecide={(decision, reason) => void handleDecide(decision, reason)}
        />
      )}
    </div>
  );
};
