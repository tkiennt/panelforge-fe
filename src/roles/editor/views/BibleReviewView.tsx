import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CornerUpLeft, ImageOff } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  bibleService,
  type BibleEntryDto,
  type BibleEntryRevisionDto,
  type BibleReviewStatus,
} from '@/services/bible.service';
import { errorMessage } from '@/shared/features/collaboration/collaborationRules';
import { ReasonForm } from './review-shared/ReasonForm';

interface BibleReviewViewProps {
  workspaceRole?: string | null;
  onShowToast?: (title: string, message: string) => void;
}

type ReviewStatus =
  'Draft' | 'ConceptSubmitted' | 'ReworkRequired' | 'WriterEndorsed' | 'CanonLocked';

const STATUS_BY_NUMBER: Record<number, ReviewStatus> = {
  1: 'Draft',
  2: 'ConceptSubmitted',
  3: 'ReworkRequired',
  4: 'WriterEndorsed',
  5: 'CanonLocked',
};

const statusOf = (rev?: BibleEntryRevisionDto | null): ReviewStatus | null => {
  if (!rev) return null;
  if (rev.isLocked) return 'CanonLocked';
  const s: BibleReviewStatus | undefined = rev.reviewStatus;
  if (typeof s === 'number') return STATUS_BY_NUMBER[s] ?? null;
  return (s as ReviewStatus) ?? null;
};

/** detailsJson là đặc tả do Writer nhập; chỉ hiện các cặp khoá–giá trị đơn giản. */
const parseDetails = (json?: string | null): [string, string][] => {
  if (!json) return [];
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    return Object.entries(obj)
      .filter(
        ([, v]) => ['string', 'number', 'boolean'].includes(typeof v) && String(v).trim() !== '',
      )
      .map(([k, v]) => [k, String(v)]);
  } catch {
    return [];
  }
};

/**
 * Duyệt thiết kế Series Bible của Editor (vòng đời V2.5, `domain/series-bible.md` mục 3.2):
 * Artist nộp concept (ConceptSubmitted) → Writer/Editor đối chiếu cốt truyện và xác nhận (WriterEndorsed)
 * hoặc yêu cầu vẽ lại kèm nhận xét (ReworkRequired) → Producer khoá canon. Editor không khoá canon.
 */
export const BibleReviewView: React.FC<BibleReviewViewProps> = ({ workspaceRole, onShowToast }) => {
  const { seriesId = '' } = useParams<{ seriesId: string }>();
  const { t } = useTranslation('review');

  const [entries, setEntries] = useState<BibleEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reworking, setReworking] = useState(false);
  const [busy, setBusy] = useState(false);

  const role = (workspaceRole ?? '').toUpperCase();
  const canReview = role === 'EDITOR' || role === 'WRITER' || role === 'PRODUCER';

  const load = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const bible = await bibleService.getSeriesBible(seriesId);
      setEntries(bible.entries.filter((e) => e.isActive));
    } catch (err) {
      setLoadError(errorMessage(err, t('bibleReview.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [seriesId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const by = (s: ReviewStatus) => entries.filter((e) => statusOf(e.effectiveRevision) === s);
    return {
      pending: by('ConceptSubmitted'),
      endorsed: by('WriterEndorsed'),
      rework: by('ReworkRequired'),
    };
  }, [entries]);

  useEffect(() => {
    const all = [...groups.pending, ...groups.endorsed, ...groups.rework];
    if (!selectedId || !all.some((e) => e.id === selectedId)) {
      setSelectedId(all[0]?.id ?? null);
    }
  }, [groups, selectedId]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;
  const rev = selected?.effectiveRevision ?? null;
  const status = statusOf(rev);
  const canDecide = canReview && status === 'ConceptSubmitted';

  const decide = async (action: () => Promise<unknown>, title: string) => {
    setBusy(true);
    try {
      await action();
      onShowToast?.(title, selected?.name ?? '');
      setReworking(false);
      await load();
    } catch (err) {
      onShowToast?.(
        t('bibleReview.toast.failed'),
        errorMessage(err, t('scriptReview.errors.generic')),
      );
    } finally {
      setBusy(false);
    }
  };

  const endorse = () =>
    selected &&
    rev &&
    decide(
      () => bibleService.endorseRevision(seriesId, selected.id, rev.id),
      t('bibleReview.toast.endorsed'),
    );

  const requestRework = (reason: string) =>
    selected &&
    rev &&
    decide(
      () => bibleService.requestReworkRevision(seriesId, selected.id, rev.id, { reason }),
      t('bibleReview.toast.reworkRequested'),
    );

  const renderGroup = (title: string, list: BibleEntryDto[], hint: string) =>
    list.length > 0 && (
      <section className='pb-2'>
        <p className='px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-stone-500'>
          {title} <span className='font-mono'>({list.length})</span>
        </p>
        <p className='px-4 pb-2 text-xs text-stone-500'>{hint}</p>
        <ul>
          {list.map((e) => (
            <li key={e.id}>
              <button
                type='button'
                onClick={() => {
                  setSelectedId(e.id);
                  setReworking(false);
                }}
                aria-current={e.id === selectedId}
                className={`flex w-full items-center gap-3 border-l-2 px-4 py-2 text-left transition-colors duration-150 ${
                  e.id === selectedId
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-transparent hover:bg-stone-50'
                }`}
              >
                <span className='min-w-0'>
                  <span className='block truncate text-sm font-medium text-stone-900'>
                    {e.name}
                  </span>
                  <span className='block font-mono text-xs text-stone-500'>
                    {e.code}
                    {e.effectiveRevision?.stageName ? ` · ${e.effectiveRevision.stageName}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );

  if (loading && entries.length === 0) {
    return (
      <div className='flex flex-1 gap-6 bg-[#FAF9F5] p-6' aria-busy='true'>
        <div className='hidden h-[70vh] w-64 animate-pulse rounded-xl bg-stone-200/70 md:block' />
        <div className='h-[70vh] flex-1 animate-pulse rounded-xl bg-stone-200/70' />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className='flex flex-1 items-center justify-center bg-[#FAF9F5] p-6'>
        <div className='max-w-md rounded-xl border border-stone-200/80 bg-white p-6 text-center shadow-xs'>
          <AlertTriangle className='mx-auto h-8 w-8 text-rose-600' aria-hidden='true' />
          <p className='mt-2 text-xs text-stone-600'>{loadError}</p>
          <button
            type='button'
            onClick={load}
            className='mt-4 rounded-full bg-[#EA580C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C]'
          >
            {t('scriptReview.common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const total = groups.pending.length + groups.endorsed.length + groups.rework.length;
  const imageUrl = rev?.conceptImageUrl || rev?.referenceImageUrl || selected?.referenceImageUrl;
  const details = parseDetails(selected?.detailsJson);
  const feedbackHistory = (rev?.events ?? []).filter(
    (ev) => (ev.type === 'ReworkRequested' || ev.type === 'ConceptSubmitted') && ev.comment,
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col bg-[#FAF9F5] font-sans text-stone-900'>
      <header className='shrink-0 border-b border-stone-200 bg-white px-4 py-3'>
        <h1 className='font-serif text-lg font-bold tracking-tight text-stone-900'>
          {t('bibleReview.title')}
        </h1>
        <p className='text-xs text-stone-500'>{t('bibleReview.subtitle')}</p>
      </header>

      {total === 0 ? (
        <div className='m-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 p-8 text-center'>
          <p className='font-serif text-base font-bold text-stone-900'>
            {t('bibleReview.emptyTitle')}
          </p>
          <p className='mt-1 max-w-md text-xs text-stone-500'>{t('bibleReview.emptyBody')}</p>
        </div>
      ) : (
        <div className='flex min-h-0 flex-1 flex-col md:flex-row'>
          <nav
            aria-label={t('bibleReview.listLabel')}
            className='max-h-56 shrink-0 overflow-y-auto border-b border-stone-200 bg-white md:max-h-none md:w-64 md:border-b-0 md:border-r'
          >
            {renderGroup(
              t('bibleReview.groups.pending'),
              groups.pending,
              t('bibleReview.groups.pendingHint'),
            )}
            {renderGroup(
              t('bibleReview.groups.rework'),
              groups.rework,
              t('bibleReview.groups.reworkHint'),
            )}
            {renderGroup(
              t('bibleReview.groups.endorsed'),
              groups.endorsed,
              t('bibleReview.groups.endorsedHint'),
            )}
          </nav>

          <main className='flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-auto p-6'>
            {imageUrl ? (
              <a
                href={imageUrl}
                target='_blank'
                rel='noreferrer'
                title={t('bibleReview.openImage')}
              >
                <img
                  src={imageUrl}
                  alt={selected?.name ?? ''}
                  className='max-h-[calc(100vh-12rem)] w-auto border border-stone-200 bg-white object-contain shadow-xs'
                />
              </a>
            ) : (
              <div className='flex h-80 w-60 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 text-xs text-stone-500'>
                <ImageOff className='h-8 w-8' aria-hidden='true' />
                {t('bibleReview.noImage')}
              </div>
            )}
          </main>

          {selected && rev && (
            <aside className='flex max-h-[50vh] w-full shrink-0 flex-col border-t border-stone-200 bg-white md:max-h-none md:w-96 md:border-l md:border-t-0'>
              <div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-4'>
                <div>
                  <p className='font-mono text-xs text-stone-500'>
                    {selected.code} ·{' '}
                    {t(
                      `bibleReview.category.${String(selected.category)}`,
                      String(selected.category),
                    )}
                  </p>
                  <h2 className='mt-0.5 text-base font-bold text-stone-900'>{selected.name}</h2>
                  <p className='mt-1 text-xs text-stone-600'>
                    {[
                      rev.stageName,
                      t('bibleReview.chapters', {
                        from: rev.effectiveFromChapterNumber,
                        to: rev.effectiveToChapterNumber ?? '…',
                      }),
                      t('bibleReview.version', { version: rev.versionNumber }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <section>
                  <h3 className='text-sm font-semibold text-stone-800'>{t('bibleReview.spec')}</h3>
                  <p className='mt-1 whitespace-pre-line text-sm leading-relaxed text-stone-700'>
                    {selected.description || t('bibleReview.noSpec')}
                  </p>
                  {rev.summary && (
                    <p className='mt-2 border-l-2 border-stone-200 pl-2 text-xs italic text-stone-600'>
                      {rev.summary}
                    </p>
                  )}
                  {details.length > 0 && (
                    <dl className='mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs'>
                      {details.map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt className='font-semibold text-stone-600'>{k}</dt>
                          <dd className='text-stone-800'>{v}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  )}
                </section>

                {rev.reworkFeedback && (
                  <section className='rounded-lg border border-rose-200 bg-rose-50 p-3'>
                    <h3 className='text-xs font-semibold text-rose-800'>
                      {t('bibleReview.currentFeedback')}
                    </h3>
                    <p className='mt-1 text-sm text-rose-900'>{rev.reworkFeedback}</p>
                  </section>
                )}

                {feedbackHistory.length > 0 && (
                  <section>
                    <h3 className='text-sm font-semibold text-stone-800'>
                      {t('bibleReview.history')}
                    </h3>
                    <ol className='mt-1 space-y-1.5'>
                      {feedbackHistory.map((ev) => (
                        <li key={ev.id} className='text-xs text-stone-600'>
                          <span className='font-semibold text-stone-700'>
                            {t(`bibleReview.event.${ev.type}`, ev.type)}
                          </span>{' '}
                          · {new Date(ev.createdAt).toLocaleDateString()} · {ev.comment}
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>

              <div className='shrink-0 space-y-2 border-t border-stone-200 bg-[#FAF9F5] p-4'>
                {status === 'ConceptSubmitted' && !canReview && (
                  <p className='text-xs text-stone-600'>{t('bibleReview.notReviewer')}</p>
                )}
                {status === 'WriterEndorsed' && (
                  <p className='text-xs text-stone-600'>{t('bibleReview.waitingProducer')}</p>
                )}
                {status === 'ReworkRequired' && (
                  <p className='text-xs text-stone-600'>{t('bibleReview.waitingArtist')}</p>
                )}
                {canDecide && !reworking && (
                  <>
                    <p className='text-xs text-stone-500'>{t('bibleReview.decisionHint')}</p>
                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() => setReworking(true)}
                        disabled={busy}
                        className='inline-flex min-w-40 flex-1 items-center justify-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50'
                      >
                        <CornerUpLeft className='h-4 w-4' aria-hidden='true' />
                        {t('bibleReview.requestRework')}
                      </button>
                      <button
                        type='button'
                        onClick={endorse}
                        disabled={busy}
                        className='inline-flex min-w-40 flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50'
                      >
                        <CheckCircle2 className='h-4 w-4' aria-hidden='true' />
                        {t('bibleReview.endorse')}
                      </button>
                    </div>
                  </>
                )}
                {canDecide && reworking && (
                  <ReasonForm
                    label={t('bibleReview.reworkReason')}
                    confirmLabel={t('bibleReview.requestRework')}
                    busy={busy}
                    onCancel={() => setReworking(false)}
                    onConfirm={requestRework}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
};
