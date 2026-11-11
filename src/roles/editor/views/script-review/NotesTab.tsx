import React, { useState } from 'react';
import { CheckCircle2, Pencil, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ChangeRequestDto } from '@/types/pipeline';
import { anchorKey, type ReviewDraft } from './scriptReviewModel';
import { CR_STATUS_BADGE, crStatus, type CrStatus } from '../review-shared/reviewModel';
import { ReasonForm } from '../review-shared/ReasonForm';

export interface LineLocation {
  label: string;
  /** Nội dung dòng hiện tại, để so với nguyên văn lúc nhận xét */
  currentText: string | null;
}

interface NotesTabProps {
  drafts: ReviewDraft[];
  changeRequests: ChangeRequestDto[];
  locate: (sceneId: string | null | undefined, lineId: string | null | undefined) => LineLocation;
  onSelectAnchor: (key: string) => void;
  canDecide: boolean;
  busyId: string | null;
  onEditDraft: (draft: ReviewDraft) => void;
  onDeleteDraft: (id: string) => void;
  onVerify: (cr: ChangeRequestDto) => void;
  onReopen: (cr: ChangeRequestDto, comment: string) => void;
  onReject: (cr: ChangeRequestDto, reason: string) => void;
}

const Quote: React.FC<{ text: string }> = ({ text }) => (
  <p className='mt-1.5 line-clamp-2 border-l-2 border-stone-200 pl-2 text-xs italic text-stone-600'>
    {text}
  </p>
);

export const NotesTab: React.FC<NotesTabProps> = ({
  drafts,
  changeRequests,
  locate,
  onSelectAnchor,
  canDecide,
  busyId,
  onEditDraft,
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
  const resolved = byStatus('Resolved');
  const open = byStatus('Open');
  const closed = [...byStatus('Verified'), ...byStatus('Rejected')];

  const renderCr = (cr: ChangeRequestDto) => {
    const s = crStatus(cr.status);
    const loc = locate(cr.sceneId, cr.scriptLineId);
    const changed =
      !!cr.quotedText && loc.currentText !== null && loc.currentText !== cr.quotedText;
    const deleted = !!cr.scriptLineId && loc.currentText === null;
    const busy = busyId === cr.id;

    return (
      <li key={cr.id} className='rounded-lg border border-stone-200/80 bg-white p-3'>
        <div className='flex items-start justify-between gap-2'>
          <button
            type='button'
            onClick={() => onSelectAnchor(anchorKey(cr.sceneId, cr.scriptLineId))}
            className='text-left font-mono text-xs font-semibold text-stone-600 hover:text-orange-700 hover:underline'
          >
            {loc.label}
          </button>
          <span
            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${CR_STATUS_BADGE[s]}`}
          >
            {t(`scriptReview.crStatus.${s}`)}
          </span>
        </div>
        <p className='mt-1.5 text-sm leading-relaxed text-stone-800'>{cr.description}</p>

        {cr.quotedText && !changed && !deleted && <Quote text={cr.quotedText} />}
        {(changed || deleted) && (
          <div className='mt-2 space-y-1 rounded-md bg-stone-50 p-2 text-xs'>
            <p className='text-stone-500'>{t('scriptReview.notes.quotedAtReview')}</p>
            <p className='italic text-stone-600 line-through decoration-stone-400'>
              {cr.quotedText}
            </p>
            <p className='pt-1 text-stone-500'>{t('scriptReview.notes.currentText')}</p>
            <p className='text-stone-900'>
              {deleted ? t('scriptReview.notes.lineRemoved') : loc.currentText}
            </p>
          </div>
        )}

        {cr.resolutionNote && (
          <p className='mt-2 text-xs text-stone-600'>
            <span className='font-semibold text-stone-700'>
              {t('scriptReview.notes.writerReply')}
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
          <div className='mt-2.5'>
            <button
              type='button'
              disabled={busy}
              onClick={() => setReasonFor({ id: cr.id, kind: 'reject' })}
              className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50'
              title={t('scriptReview.notes.rejectTitle')}
            >
              <XCircle className='h-3.5 w-3.5' aria-hidden='true' />
              {t('scriptReview.notes.reject')}
            </button>
          </div>
        )}
        {reasonFor?.id === cr.id && (
          <ReasonForm
            label={
              reasonFor.kind === 'reopen'
                ? t('scriptReview.notes.reopenReason')
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

  const nothing = drafts.length === 0 && changeRequests.length === 0;

  return (
    <div className='space-y-5 p-4'>
      {drafts.length > 0 && (
        <section>
          <h3 className='text-sm font-semibold text-stone-800'>
            {t('scriptReview.notes.draftsTitle')}{' '}
            <span className='font-mono text-stone-500'>({drafts.length})</span>
          </h3>
          <p className='mt-0.5 text-xs text-stone-500'>{t('scriptReview.notes.draftsHint')}</p>
          <ul className='mt-2 space-y-2'>
            {drafts.map((d) => (
              <li
                key={d.id}
                className='rounded-lg border border-orange-200 border-l-2 border-l-orange-500 bg-white p-3'
              >
                <div className='flex items-start justify-between gap-2'>
                  <button
                    type='button'
                    onClick={() => onSelectAnchor(anchorKey(d.sceneId, d.scriptLineId))}
                    className='text-left font-mono text-xs font-semibold text-stone-600 hover:text-orange-700 hover:underline'
                  >
                    {locate(d.sceneId, d.scriptLineId).label}
                  </button>
                  <div className='flex gap-1'>
                    <button
                      type='button'
                      onClick={() => onEditDraft(d)}
                      className='rounded-md p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                      aria-label={t('scriptReview.notes.editDraft')}
                      title={t('scriptReview.notes.editDraft')}
                    >
                      <Pencil className='h-3.5 w-3.5' />
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
                </div>
                <p className='mt-1.5 text-sm leading-relaxed text-stone-800'>{d.text}</p>
                {d.quotedText && <Quote text={d.quotedText} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {section(
        t('scriptReview.notes.resolvedTitle'),
        resolved,
        canDecide ? t('scriptReview.notes.resolvedHint') : undefined,
      )}
      {section(t('scriptReview.notes.openTitle'), open)}

      {closed.length > 0 && (
        <section>
          <button
            type='button'
            onClick={() => setShowClosed((v) => !v)}
            className='text-sm font-semibold text-stone-700 hover:text-stone-900'
            aria-expanded={showClosed}
          >
            {t('scriptReview.notes.closedTitle')}{' '}
            <span className='font-mono text-stone-500'>({closed.length})</span>
          </button>
          {showClosed && <ul className='mt-2 space-y-2'>{closed.map(renderCr)}</ul>}
        </section>
      )}

      {nothing && (
        <p className='rounded-lg border border-dashed border-stone-300 p-4 text-center text-xs leading-normal text-stone-500'>
          {canDecide ? t('scriptReview.notes.emptyCanComment') : t('scriptReview.notes.empty')}
        </p>
      )}
    </div>
  );
};
