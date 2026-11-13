import React, { useState } from 'react';
import { CheckCircle2, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ChangeRequestDto } from '@/types/pipeline';
import {
  CR_STATUS_BADGE,
  crStatus,
  type CrStatus,
} from '@/shared/features/script-review/reviewModel';
import { ReasonForm } from '@/shared/components/ReasonForm';
import type { Box } from './artworkModel';

/** Vùng khoanh nháp; thành một ChangeRequest khi Editor trả bài (CF3 bước 7). */
export interface ArtworkDraft {
  id: string;
  box: Box;
  text: string;
  /** Phiên bản artwork thật; undefined với ảnh ghép (không có AssetReference riêng). */
  assetReferenceId?: string;
  panelId?: string;
}

export const ArtworkNotesTab: React.FC<{
  drafts: ArtworkDraft[];
  changeRequests: ChangeRequestDto[];
  regionLabel: (crId: string) => string | null;
  activeId: string | null;
  onSelect: (id: string) => void;
  canDecide: boolean;
  busyId: string | null;
  onDraftText: (id: string, text: string) => void;
  onDeleteDraft: (id: string) => void;
  onVerify: (cr: ChangeRequestDto) => void;
  onReopen: (cr: ChangeRequestDto, comment: string) => void;
  onReject: (cr: ChangeRequestDto, reason: string) => void;
}> = ({
  drafts,
  changeRequests,
  regionLabel,
  activeId,
  onSelect,
  canDecide,
  busyId,
  onDraftText,
  onDeleteDraft,
  onVerify,
  onReopen,
  onReject,
}) => {
  const { t } = useTranslation('review');
  const [reasonFor, setReasonFor] = useState<{ id: string; kind: 'reopen' | 'reject' } | null>(
    null,
  );
  const [showClosed, setShowClosed] = useState(false);

  const byStatus = (s: CrStatus) => changeRequests.filter((c) => crStatus(c.status) === s);
  const closed = [...byStatus('Verified'), ...byStatus('Rejected')];

  const renderCr = (cr: ChangeRequestDto) => {
    const s = crStatus(cr.status);
    const busy = busyId === cr.id;
    const label = regionLabel(cr.id);
    return (
      <li
        key={cr.id}
        className={`rounded-lg border bg-white p-3 ${
          activeId === cr.id ? 'border-orange-300' : 'border-stone-200/80'
        }`}
      >
        <div className='flex items-start justify-between gap-2'>
          <button
            type='button'
            onClick={() => onSelect(cr.id)}
            className='text-left font-mono text-xs font-semibold text-stone-600 hover:text-orange-700 hover:underline'
          >
            {label ? t('artworkReview.notes.region', { label }) : t('artworkReview.notes.whole')}
          </button>
          <span
            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${CR_STATUS_BADGE[s]}`}
          >
            {t(`scriptReview.crStatus.${s}`)}
          </span>
        </div>
        <p className='mt-1.5 text-sm leading-relaxed text-stone-800'>{cr.description}</p>
        {cr.resolutionNote && (
          <p className='mt-2 text-xs text-stone-600'>
            <span className='font-semibold text-stone-700'>
              {t('artworkReview.notes.assigneeReply')}
            </span>{' '}
            {cr.resolutionNote}
          </p>
        )}
        {cr.reviewerComment && (
          <p className='mt-1 text-xs text-stone-600'>
            <span className='font-semibold text-stone-700'>
              {t('scriptReview.notes.reviewerReply')}
            </span>{' '}
            {cr.reviewerComment}
          </p>
        )}

        {canDecide && s === 'Resolved' && reasonFor?.id !== cr.id && (
          <div className='mt-2.5 flex gap-2'>
            <button
              type='button'
              disabled={busy}
              onClick={() => onVerify(cr)}
              className='inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
            >
              <CheckCircle2 className='h-3.5 w-3.5' aria-hidden='true' />
              {t('scriptReview.notes.verify')}
            </button>
            <button
              type='button'
              disabled={busy}
              onClick={() => setReasonFor({ id: cr.id, kind: 'reopen' })}
              className='inline-flex items-center gap-1 rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50'
            >
              <RotateCcw className='h-3.5 w-3.5' aria-hidden='true' />
              {t('scriptReview.notes.reopen')}
            </button>
          </div>
        )}
        {canDecide && s === 'Open' && reasonFor?.id !== cr.id && (
          <button
            type='button'
            disabled={busy}
            onClick={() => setReasonFor({ id: cr.id, kind: 'reject' })}
            className='mt-2.5 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50'
            title={t('artworkReview.notes.rejectTitle')}
          >
            <XCircle className='h-3.5 w-3.5' aria-hidden='true' />
            {t('scriptReview.notes.reject')}
          </button>
        )}
        {reasonFor?.id === cr.id && (
          <ReasonForm
            label={
              reasonFor.kind === 'reopen'
                ? t('artworkReview.notes.reopenReason')
                : t('scriptReview.notes.rejectReason')
            }
            confirmLabel={
              reasonFor.kind === 'reopen'
                ? t('scriptReview.notes.reopen')
                : t('scriptReview.notes.reject')
            }
            busy={busy}
            onCancel={() => setReasonFor(null)}
            onConfirm={(text) => {
              if (reasonFor.kind === 'reopen') onReopen(cr, text);
              else onReject(cr, text);
              setReasonFor(null);
            }}
          />
        )}
      </li>
    );
  };

  const section = (title: string, items: ChangeRequestDto[], hint?: string) =>
    items.length > 0 && (
      <section>
        <h3 className='text-sm font-semibold text-stone-800'>
          {title} <span className='font-mono text-stone-500'>({items.length})</span>
        </h3>
        {hint && <p className='mt-0.5 text-xs text-stone-500'>{hint}</p>}
        <ul className='mt-2 space-y-2'>{items.map(renderCr)}</ul>
      </section>
    );

  return (
    <div className='space-y-5 p-4'>
      {drafts.length > 0 && (
        <section>
          <h3 className='text-sm font-semibold text-stone-800'>
            {t('scriptReview.notes.draftsTitle')}{' '}
            <span className='font-mono text-stone-500'>({drafts.length})</span>
          </h3>
          <p className='mt-0.5 text-xs text-stone-500'>{t('artworkReview.notes.draftsHint')}</p>
          <ul className='mt-2 space-y-2'>
            {drafts.map((d, i) => (
              <li
                key={d.id}
                className={`rounded-lg border border-l-2 border-l-orange-500 bg-white p-3 ${
                  activeId === d.id ? 'border-orange-300' : 'border-orange-200'
                }`}
              >
                <div className='flex items-center justify-between gap-2'>
                  <button
                    type='button'
                    onClick={() => onSelect(d.id)}
                    className='font-mono text-xs font-semibold text-stone-600 hover:text-orange-700'
                  >
                    {t('artworkReview.notes.region', { label: `M${i + 1}` })}
                  </button>
                  <button
                    type='button'
                    onClick={() => onDeleteDraft(d.id)}
                    className='rounded-md p-1 text-stone-500 hover:bg-rose-50 hover:text-rose-700'
                    aria-label={t('scriptReview.notes.deleteDraft')}
                    title={t('scriptReview.notes.deleteDraft')}
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </button>
                </div>
                <label className='sr-only' htmlFor={`draft-${d.id}`}>
                  {t('artworkReview.notes.describe')}
                </label>
                <textarea
                  id={`draft-${d.id}`}
                  value={d.text}
                  autoFocus={activeId === d.id && !d.text}
                  onChange={(e) => onDraftText(d.id, e.target.value)}
                  rows={2}
                  placeholder={t('scriptReview.composer.placeholder')}
                  className='mt-1.5 w-full resize-y rounded-md border border-stone-200 bg-[#FAF9F5] px-2 py-1.5 text-sm text-stone-800 focus:border-orange-500 focus:outline-none'
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {section(
        t('artworkReview.notes.resolvedTitle'),
        byStatus('Resolved'),
        canDecide ? t('artworkReview.notes.resolvedHint') : undefined,
      )}
      {section(t('scriptReview.notes.openTitle'), byStatus('Open'))}

      {closed.length > 0 && (
        <section>
          <button
            type='button'
            onClick={() => setShowClosed((v) => !v)}
            aria-expanded={showClosed}
            className='text-sm font-semibold text-stone-700 hover:text-stone-900'
          >
            {t('scriptReview.notes.closedTitle')}{' '}
            <span className='font-mono text-stone-500'>({closed.length})</span>
          </button>
          {showClosed && <ul className='mt-2 space-y-2'>{closed.map(renderCr)}</ul>}
        </section>
      )}

      {drafts.length === 0 && changeRequests.length === 0 && (
        <p className='rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs leading-normal text-stone-500'>
          {canDecide ? t('artworkReview.notes.emptyCanDraw') : t('scriptReview.notes.empty')}
        </p>
      )}
    </div>
  );
};
