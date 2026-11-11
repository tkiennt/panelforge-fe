import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { VisualConsistencyReportDto, VisualDeviationDto } from '@/types/pipeline';
import { OPEN_FINDING_STATUSES } from '../review-shared/reviewModel';
import { ReasonForm } from '../review-shared/ReasonForm';

export type VisualDecision = 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification';

const SEVERITY_BADGE: Record<string, string> = {
  Blocking: 'bg-rose-50 text-rose-800 border-rose-200',
  Warning: 'bg-amber-50 text-amber-800 border-amber-200',
  Info: 'bg-stone-100 text-stone-600 border-stone-200',
};

/**
 * Nhất quán hình ảnh với character sheet đã khoá (CF3, phiếu V1.2): hệ thống nêu độ lệch, người quyết (BR-02, BR-21).
 * Chỉ hiện độ lệch của trang đang duyệt để Editor không phải lọc cả chương.
 */
export const VisualChecksTab: React.FC<{
  report: VisualConsistencyReportDto | null;
  pageId: string | null;
  canTriage: boolean;
  busy: string | null;
  onRun: () => void;
  onTriage: (d: VisualDeviationDto, decision: VisualDecision, note?: string) => void;
}> = ({ report, pageId, canTriage, busy, onRun, onTriage }) => {
  const { t } = useTranslation('review');
  const [noteFor, setNoteFor] = useState<{ id: string; decision: VisualDecision } | null>(null);

  const deviations = (report?.deviations ?? []).filter(
    (d) => d.isDeviation && (!pageId || !d.pageId || d.pageId === pageId),
  );
  const open = deviations.filter((d) => OPEN_FINDING_STATUSES.includes(String(d.status)));

  return (
    <div className='space-y-4 p-4'>
      <div className='flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-stone-800'>{t('artworkReview.checks.title')}</h3>
        <button
          type='button'
          onClick={onRun}
          disabled={busy === 'visual'}
          className='inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50'
        >
          <Sparkles className='h-3.5 w-3.5' aria-hidden='true' />
          {busy === 'visual' ? t('scriptReview.checks.running') : t('scriptReview.checks.run')}
        </button>
      </div>
      <p className='text-xs text-stone-500'>
        {!report
          ? t('artworkReview.checks.notRun')
          : t('artworkReview.checks.summary', {
              open: open.length,
              threshold: Math.round(report.threshold * 100),
            })}
      </p>

      {open.length > 0 && (
        <ul className='space-y-2'>
          {open.map((d) => {
            const severity = String(d.severity);
            return (
              <li
                key={d.findingId}
                className='rounded-lg border border-stone-200/80 border-l-2 border-l-violet-500 bg-white p-3'
              >
                <div className='flex items-start justify-between gap-2'>
                  <p className='text-sm font-semibold text-stone-900'>
                    {d.characterName}
                    {d.panelNumber ? (
                      <span className='ml-1 font-mono text-xs font-normal text-stone-500'>
                        {t('artworkReview.checks.panel', { number: d.panelNumber })}
                      </span>
                    ) : null}
                  </p>
                  <span
                    className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${
                      SEVERITY_BADGE[severity] ?? SEVERITY_BADGE.Info
                    }`}
                  >
                    {t(`scriptReview.severity.${severity}`, severity)}
                  </span>
                </div>
                <p className='mt-1 font-mono text-xs text-stone-600'>
                  {t('artworkReview.checks.similarity', {
                    score: Math.round(d.similarityScore * 100),
                    threshold: Math.round(d.threshold * 100),
                  })}
                </p>
                {(d.characterSheetImageUrl || d.artworkUrl) && (
                  <div className='mt-2 grid grid-cols-2 gap-2'>
                    {[
                      { url: d.characterSheetImageUrl, label: t('artworkReview.checks.sheet') },
                      { url: d.artworkUrl, label: t('artworkReview.checks.artwork') },
                    ].map((img) => (
                      <figure key={img.label} className='text-center'>
                        {img.url ? (
                          <img
                            src={img.url}
                            alt={img.label}
                            className='h-24 w-full rounded border border-stone-200 bg-stone-50 object-contain'
                          />
                        ) : (
                          <div className='h-24 rounded border border-dashed border-stone-300' />
                        )}
                        <figcaption className='mt-1 text-xs text-stone-500'>{img.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                <p className='mt-2 text-sm leading-relaxed text-stone-800'>{d.message}</p>
                {String(d.status) !== 'Open' && (
                  <p className='mt-1 text-xs text-stone-500'>
                    {t(`scriptReview.findingStatus.${String(d.status)}`, String(d.status))}
                    {d.triageNote ? ` · ${d.triageNote}` : ''}
                  </p>
                )}

                {canTriage && noteFor?.id !== d.findingId && (
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {String(d.status) !== 'Confirmed' && (
                      <button
                        type='button'
                        onClick={() => onTriage(d, 'Confirmed')}
                        className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                      >
                        {t('scriptReview.checks.confirm')}
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => onTriage(d, 'Rejected')}
                      className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                    >
                      {t('scriptReview.checks.notAnIssue')}
                    </button>
                    <button
                      type='button'
                      onClick={() => setNoteFor({ id: d.findingId, decision: 'Ignored' })}
                      className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                    >
                      {t('scriptReview.checks.ignore')}
                    </button>
                    <button
                      type='button'
                      onClick={() =>
                        setNoteFor({ id: d.findingId, decision: 'NeedsClarification' })
                      }
                      className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                    >
                      {t('scriptReview.checks.clarify')}
                    </button>
                  </div>
                )}
                {noteFor?.id === d.findingId && (
                  <ReasonForm
                    tone='neutral'
                    label={
                      noteFor.decision === 'Ignored'
                        ? t('scriptReview.checks.ignoreReason')
                        : t('artworkReview.checks.clarifyQuestion')
                    }
                    confirmLabel={
                      noteFor.decision === 'Ignored'
                        ? t('scriptReview.checks.ignore')
                        : t('scriptReview.checks.clarify')
                    }
                    onCancel={() => setNoteFor(null)}
                    onConfirm={(note) => {
                      onTriage(d, noteFor.decision, note);
                      setNoteFor(null);
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
