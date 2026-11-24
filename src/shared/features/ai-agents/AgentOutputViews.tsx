import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Link2,
  Link2Off,
  Scissors,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  ArtistPromptSet,
  LetteringSuggestionSet,
  ProductionReport,
  ReviewReport,
} from '@/services/aiAgents.service';
import { SEVERITY_STYLE, wordDiff } from './aiViewUtils';

/** Prompt ảnh theo panel (Artist). Chỉ là văn bản để hoạ sĩ/công cụ dùng sau — chưa sinh ảnh. */
export const ArtistPromptsView: React.FC<{
  set: ArtistPromptSet;
  nameById: Record<string, string>;
}> = ({ set, nameById }) => {
  const { t } = useTranslation('features');
  return (
    <div className='space-y-2 text-xs'>
      <div className='flex items-start gap-2 rounded-lg border border-pink-300 bg-pink-50 p-2 text-pink-800'>
        <ImageIcon size={14} className='mt-0.5 shrink-0' />
        <div>
          <b>{t('aiAgents.output.artistPromptsCount', { count: set.panels.length })}</b> —{' '}
          {t('aiAgents.output.artistPromptsOnlyDraft')}{' '}
          <b>{t('aiAgents.output.artistPromptsNoImage')}</b>.{' '}
          {t('aiAgents.output.artistPromptsRefNote')}
          {set.styleSummary && (
            <div className='mt-0.5 font-normal'>
              {t('aiAgents.output.styleSummary', { style: set.styleSummary })}
            </div>
          )}
        </div>
      </div>
      {set.panels.map((p) => (
        <div key={p.panelId} className='rounded-lg border-[1.5px] border-[#171717] bg-white p-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='rounded bg-[#171717] px-1.5 py-0.5 text-[10px] font-bold text-white'>
              {t('aiAgents.output.pagePanel', { page: p.pageNumber, panel: p.panelNumber })}
            </span>
            <span className='font-mono text-[10px] text-[#737373]'>
              panel {p.panelId.slice(0, 8)}
            </span>
          </div>
          <p className='mt-2 whitespace-pre-wrap rounded bg-[#FAF8F5] p-2 font-mono text-[11px] leading-relaxed'>
            {p.prompt}
          </p>
          <div className='mt-2 flex flex-wrap items-center gap-1'>
            <span className='text-[10px] font-bold uppercase tracking-wide text-[#737373]'>
              {t('aiAgents.output.referenceBible')}
            </span>
            {p.referenceIds.length === 0 && (
              <span className='text-[#737373]'>{t('aiAgents.output.none')}</span>
            )}
            {p.referenceIds.map((id) => (
              <span
                key={id}
                title={id}
                className='rounded border border-[#DDD6FE] bg-[#F5F3FF] px-1.5 py-0.5 text-[10px] font-semibold text-[#6D28D9]'
              >
                {nameById[id] ?? id.slice(0, 8)}
              </span>
            ))}
          </div>
          {p.consistencyNotes && (
            <p className='mt-1 text-[11px] text-[#065F46]'>
              <b>{t('aiAgents.output.consistencyNotes')}</b> {p.consistencyNotes}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * So sánh thoại trước/sau của Letterer. Giới hạn chữ là ƯỚC LƯỢNG do hệ thống tính; không có kết luận "chắc chắn vừa bubble".
 */
export const LetteringDiffView: React.FC<{ set: LetteringSuggestionSet }> = ({ set }) => {
  const { t } = useTranslation('features');
  return (
    <div className='space-y-2 text-xs'>
      <div className='flex items-start gap-2 rounded-lg border border-teal-300 bg-teal-50 p-2 text-teal-800'>
        <Scissors size={14} className='mt-0.5 shrink-0' />
        <div>
          <b>{t('aiAgents.output.letteringCount', { count: set.suggestions.length })}</b>{' '}
          {t('aiAgents.output.letteringNotePrefix')}{' '}
          <b>{t('aiAgents.output.letteringNoteEstimate')}</b>{' '}
          {t('aiAgents.output.letteringNoteSuffix')}
          {set.summary && <div className='mt-0.5 font-normal'>{set.summary}</div>}
        </div>
      </div>
      {set.suggestions.length === 0 && (
        <p className='rounded border border-dashed border-[#A3A3A3] p-3 text-center text-[#737373]'>
          {t('aiAgents.output.noLetteringSuggestions')}
        </p>
      )}
      {set.suggestions.map((s) => {
        const segments = wordDiff(s.originalText, s.suggestedText);
        const limitSource =
          s.limitSource === 'element-estimate' || s.limitSource === 'panel-estimate'
            ? t(`aiAgents.output.limitSource.${s.limitSource}`)
            : s.limitSource;
        return (
          <div
            key={s.sourceScriptLineId}
            className='rounded-lg border-[1.5px] border-[#171717] bg-white p-3'
          >
            <div className='flex flex-wrap items-center gap-2'>
              <span className='font-mono text-[10px] text-[#737373]'>
                {t('aiAgents.output.linePrefix', { id: s.sourceScriptLineId.slice(0, 8) })}
              </span>
              <span
                className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                  s.targetElementId
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-[#E7E7E7] bg-[#FAF8F5] text-[#525252]'
                }`}
                title={s.targetElementId ?? undefined}
              >
                {s.targetElementId ? <Link2 size={10} /> : <Link2Off size={10} />}
                {s.targetElementId
                  ? t('aiAgents.output.bubblePrefix', { id: s.targetElementId.slice(0, 8) })
                  : t('aiAgents.output.noBubble')}
              </span>
              <span
                className='rounded border border-[#E7E7E7] bg-[#FAF8F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#525252]'
                title={t('aiAgents.output.estimatedLimitTitle')}
              >
                {t('aiAgents.output.estimatedLimit', {
                  maxChars: s.maxChars,
                  source: limitSource,
                })}
              </span>
            </div>
            <div className='mt-2 grid gap-2 md:grid-cols-2'>
              <div className='rounded border border-red-200 bg-red-50/60 p-2'>
                <div className='text-[10px] font-bold uppercase tracking-wide text-red-700'>
                  {t('aiAgents.output.originalChars', { count: s.originalText.length })}
                </div>
                <p className='mt-1'>
                  {segments.map((seg, i) => (
                    <span
                      key={i}
                      className={seg.kind === 'removed' ? 'bg-red-200/70 line-through' : undefined}
                    >
                      {i > 0 ? ' ' : ''}
                      {seg.text}
                    </span>
                  ))}
                </p>
              </div>
              <div className='rounded border border-emerald-200 bg-emerald-50/60 p-2'>
                <div className='text-[10px] font-bold uppercase tracking-wide text-emerald-700'>
                  {t('aiAgents.output.suggestedChars', { count: s.suggestedText.length })} ·{' '}
                  {s.withinEstimatedLimit
                    ? t('aiAgents.output.withinLimit')
                    : t('aiAgents.output.overLimit')}
                </div>
                <p className='mt-1 font-medium'>{s.suggestedText}</p>
              </div>
            </div>
            <p className='mt-2 text-[11px] text-[#404040]'>
              <b>{t('aiAgents.output.reasonLabel')}</b> {s.reason}
            </p>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Báo cáo tiến độ (Producer) — tham khảo, không phải đề xuất áp dụng. Mọi số liệu do Backend tính (facts);
 * rủi ro/đề xuất phải trích khoá fact làm nguồn; phần thiếu dữ liệu được nêu rõ.
 */
export const ProductionReportView: React.FC<{ report: ProductionReport }> = ({ report }) => {
  const { t } = useTranslation('features');
  const [showFacts, setShowFacts] = useState(true);
  const factText = (key: string) => report.facts.find((f) => f.key === key)?.text ?? '';
  const Sources: React.FC<{ keys: string[] }> = ({ keys }) => (
    <span className='ml-1 inline-flex flex-wrap gap-1 align-middle'>
      {keys.map((k) => (
        <span
          key={k}
          title={factText(k)}
          className='rounded border border-[#FDE68A] bg-[#FFFBEB] px-1 font-mono text-[10px] font-bold text-[#92400E]'
        >
          {k}
        </span>
      ))}
    </span>
  );

  return (
    <div className='space-y-2 text-xs'>
      <div className='rounded-lg border-[1.5px] border-[#171717] bg-white p-3'>
        <div className='flex items-center gap-2 text-sm font-bold'>
          <TrendingUp size={15} className='text-[#CA8A04]' />
          {report.headline}
        </div>
        <p className='mt-1'>{report.summary}</p>
        <p className='mt-1 text-[10px] text-[#737373]'>
          {t('aiAgents.output.productionDisclaimer')}
        </p>
      </div>

      {report.dataGaps.length > 0 && (
        <div className='flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-amber-800'>
          <AlertTriangle size={14} className='mt-0.5 shrink-0' />
          <div>
            <b>{t('aiAgents.output.dataGapsTitle')}</b>
            <ul className='ml-4 list-disc'>
              {report.dataGaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <div className='mb-1 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
          {t('aiAgents.output.risksTitle', { count: report.risks.length })}
        </div>
        {report.risks.length === 0 && (
          <p className='rounded border border-dashed border-[#A3A3A3] p-2 text-[#737373]'>
            {t('aiAgents.output.noRisks')}
          </p>
        )}
        {report.risks.map((r, i) => (
          <div key={i} className='mb-1 rounded border border-[#E7E7E7] bg-white p-2'>
            <span
              className={`mr-1 rounded border px-1 text-[10px] font-bold ${SEVERITY_STYLE[r.severity] ?? ''}`}
            >
              {r.severity}
            </span>
            {r.description}
            <Sources keys={r.sourceFactKeys} />
          </div>
        ))}
      </div>

      <div>
        <div className='mb-1 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
          {t('aiAgents.output.recommendationsTitle', { count: report.recommendations.length })}
        </div>
        {report.recommendations.map((r, i) => (
          <div key={i} className='mb-1 rounded border border-[#E7E7E7] bg-white p-2'>
            <b>{r.action}</b>
            {r.suggestedOwnerRole && (
              <span className='ml-1 rounded bg-[#F5F3FF] px-1.5 py-0.5 text-[10px] font-bold text-[#6D28D9]'>
                {r.suggestedOwnerRole}
              </span>
            )}
            <Sources keys={r.sourceFactKeys} />
            <div className='text-[11px] text-[#525252]'>{r.rationale}</div>
          </div>
        ))}
      </div>

      <div>
        <button
          type='button'
          onClick={() => setShowFacts((v) => !v)}
          className='flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#737373]'
        >
          {showFacts ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {t('aiAgents.output.factsTitle', { count: report.facts.length })}
        </button>
        {showFacts && (
          <ul className='mt-1 space-y-0.5'>
            {report.facts.map((f) => (
              <li key={f.key} className='flex gap-2 rounded bg-[#FAF8F5] p-1.5'>
                <span className='font-mono text-[10px] font-bold text-[#92400E]'>{f.key}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/** Báo cáo review của Editor (tham khảo): checklist do code tính + nhận xét; verdict chỉ là khuyến nghị. */
export const ReviewReportView: React.FC<{ report: ReviewReport }> = ({ report: r }) => {
  const { t } = useTranslation('features');
  const verdictStyle =
    r.verdict === 'Approve'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
      : r.verdict === 'RequestChanges'
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-amber-300 bg-amber-50 text-amber-700';
  return (
    <div className='space-y-2 text-xs'>
      <div className={`rounded-lg border p-2 ${verdictStyle}`}>
        <b>{t('aiAgents.output.reviewVerdict', { verdict: r.verdict })}</b> —{' '}
        {t('aiAgents.output.reviewVerdictDisclaimer')}
        <p className='mt-1 font-normal'>{r.summary}</p>
      </div>
      <div className='grid gap-1 sm:grid-cols-2'>
        {r.checklist.map((c) => (
          <div
            key={c.name}
            className='flex items-start gap-1.5 rounded border border-[#E7E7E7] bg-white p-1.5'
          >
            {c.passed ? (
              <CheckCircle2 size={13} className='mt-0.5 shrink-0 text-emerald-600' />
            ) : (
              <XCircle size={13} className='mt-0.5 shrink-0 text-red-600' />
            )}
            <div>
              {c.name}
              <div className='text-[10px] text-[#737373]'>
                {t('aiAgents.output.computedByCode', { detail: c.detail })}
              </div>
            </div>
          </div>
        ))}
      </div>
      {r.items.map((it, i) => (
        <div key={i} className='rounded border border-[#E7E7E7] bg-white p-2'>
          <span
            className={`mr-1 rounded border px-1 text-[10px] font-bold ${SEVERITY_STYLE[it.severity] ?? ''}`}
          >
            {it.severity}
          </span>
          <b>{it.target}</b>: {it.comment}
        </div>
      ))}
      {r.draftRejectComment && (
        <div className='rounded border border-dashed border-[#A3A3A3] p-2 text-[#525252]'>
          <b>{t('aiAgents.output.draftRejectComment')}</b> {r.draftRejectComment}
        </div>
      )}
    </div>
  );
};
