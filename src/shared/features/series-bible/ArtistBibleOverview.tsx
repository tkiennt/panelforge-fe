import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ImageIcon,
  MapPin,
  Palette,
  ShieldCheck,
  User,
  Wrench,
} from 'lucide-react';
import type { BibleEntity } from '@/types';
import type {
  BibleDesignQueueItemDto,
  BibleEntryDto,
  BibleReviewStatus,
} from '@/services/bible.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';

interface ArtistBibleOverviewProps {
  role?: 'artist' | 'writer';
  entities: BibleEntity[];
  filteredEntities: BibleEntity[];
  rawEntries: Record<string, BibleEntryDto>;
  designQueue: BibleDesignQueueItemDto[];
  stats: {
    pending: number;
    rework: number;
    locked: number;
    drafts: number;
    total: number;
  };
  onOpenEntity: (entity: BibleEntity) => void;
}

const categoryIcon = (category: BibleEntity['category']) => {
  if (category === 'characters') return User;
  if (category === 'locations') return MapPin;
  if (category === 'terminology') return Wrench;
  return ShieldCheck;
};

const statusTone = (status?: BibleReviewStatus | null) => {
  if (status === 'CanonLocked') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (status === 'ConceptSubmitted') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  if (status === 'ReworkRequired') {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }
  return 'border-stone-200 bg-stone-100 text-stone-700';
};

export const ArtistBibleOverview: React.FC<ArtistBibleOverviewProps> = ({
  role = 'artist',
  entities,
  filteredEntities,
  rawEntries,
  designQueue,
  stats,
  onOpenEntity,
}) => {
  const { t } = useTranslation();
  const copyKey = role === 'writer' ? 'writerOverview' : 'artistOverview';
  const copy = (key: string, values?: Record<string, string | number>) =>
    t(`bible.view.${copyKey}.${key}`, values);
  const queueEntityIds = new Set(designQueue.map((item) => item.entryId));
  const referenceEntities = filteredEntities.filter((entity) => !queueEntityIds.has(entity.id));

  const statusLabel = (status?: BibleReviewStatus | null) => {
    if (status === 'CanonLocked') return t('bible.view.cardCanonLocked');
    if (status === 'ConceptSubmitted') return t('bible.view.cardConceptSubmitted');
    if (status === 'ReworkRequired') return t('bible.view.cardReworkRequired');
    return t('bible.view.cardDraft');
  };

  return (
    <div className='space-y-6' data-testid={`${role}-bible-overview`}>
      <section
        className='flex flex-col gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between'
        aria-label={copy('summaryAria')}
      >
        <h2 className='text-base font-bold text-stone-900'>
          {copy('overviewTitle')}
        </h2>
        <div className='flex flex-wrap items-center gap-2 text-xs font-semibold'>
          <span className='rounded-full bg-orange-50 px-2.5 py-1 text-orange-800'>
            {copy('todoCompact', {
              count: role === 'writer' ? stats.pending : designQueue.length,
            })}
          </span>
          <span className='rounded-full bg-amber-50 px-2.5 py-1 text-amber-800'>
            {copy('reviewCompact', {
              count: role === 'writer' ? designQueue.length : stats.pending,
            })}
          </span>
          <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800'>
            {copy('canonCompact', { count: stats.locked })}
          </span>
        </div>
      </section>

      <section className='rounded-xl border border-stone-200 bg-white shadow-xs'>
        <div className='flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3'>
          <h2 className='flex items-center gap-2 text-sm font-bold text-stone-900'>
            <Palette className='h-4 w-4 text-orange-600' />
            {copy('queueTitle')}
          </h2>
          <span className='text-xs font-semibold text-stone-500'>
            {copy('queueCount', { count: designQueue.length })}
          </span>
        </div>

        <div className='space-y-2 p-3'>
          {designQueue.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center'>
              <CheckCircle2 className='h-8 w-8 text-emerald-600' />
              <h3 className='mt-3 text-base font-bold text-stone-900'>
                {copy('queueEmptyTitle')}
              </h3>
              <p className='mt-1 max-w-md text-sm text-stone-500'>
                {copy('queueEmptyBody')}
              </p>
            </div>
          ) : (
            designQueue.map((item) => {
              const entity = entities.find((candidate) => candidate.id === item.entryId);
              const needsRework = item.isPriorityRework || item.reviewStatus === 'ReworkRequired';
              const queueKey = item.revisionId || item.entryId;
              return (
                <article
                  key={queueKey}
                  className={`rounded-lg border px-3 py-2.5 ${needsRework ? 'border-rose-200 bg-rose-50/40' : 'border-stone-200 bg-white'}`}
                >
                  <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3 className='text-base font-bold text-stone-900'>{item.name}</h3>
                        <span className='rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-600'>
                          {item.code}
                        </span>
                        {needsRework && (
                          <span
                            className='inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700'
                            data-testid={`queue-priority-rework-${queueKey}`}
                          >
                            <AlertTriangle className='h-3.5 w-3.5' />
                            {t('bible.view.queuePriorityRework')}
                          </span>
                        )}
                      </div>
                      <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600'>
                        <span>
                          {copy('variantLabel', {
                            variant:
                              item.variantLabel ||
                              copy('defaultVariant'),
                          })}
                        </span>
                        {item.waitingChapterNumbers?.length ? (
                          <span className='rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800'>
                            {t('bible.view.queueWaitingChapters', {
                              chapters: item.waitingChapterNumbers.join(', '),
                            })}
                          </span>
                        ) : null}
                      </div>
                      {item.reworkFeedback && (
                        <p className='mt-2 line-clamp-2 text-sm leading-relaxed text-rose-800'>
                          {copy('feedbackPrefix')} “{item.reworkFeedback}”
                        </p>
                      )}
                    </div>
                    <div className='flex shrink-0'>
                      {entity && (
                        <button
                          type='button'
                          onClick={() => onOpenEntity(entity)}
                          className='inline-flex items-center justify-center gap-1.5 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-orange-700'
                          data-testid={`open-concept-${item.entryId}`}
                        >
                          <BookOpen className='h-4 w-4' />
                          {copy('openBrief')}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className='space-y-3'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <h2 className='text-lg font-bold text-stone-900'>
            {copy('libraryTitle')}
          </h2>
          <span className='text-xs font-semibold text-stone-500'>
            {copy('libraryCount', { count: referenceEntities.length })}
          </span>
        </div>

        {referenceEntities.length === 0 ? (
          <div className='rounded-xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center text-sm text-stone-500'>
            {copy('libraryEmpty')}
          </div>
        ) : (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {referenceEntities.map((entity) => {
              const CategoryIcon = categoryIcon(entity.category);
              const revision = rawEntries[entity.id]?.effectiveRevision;
              const status = revision?.reviewStatus;
              return (
                <button
                  type='button'
                  key={entity.id}
                  onClick={() => onOpenEntity(entity)}
                  data-testid={
                    role === 'writer'
                      ? `bible-card-${entity.id}`
                      : `artist-bible-entry-${entity.id}`
                  }
                  className='group flex min-h-32 flex-col overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500'
                >
                  <div className='flex flex-1 gap-3 p-4'>
                    <div className='flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-100'>
                      {entity.imageUrl ? (
                        <AuthenticatedImage
                          src={entity.imageUrl}
                          alt={entity.name}
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <ImageIcon className='h-6 w-6 text-stone-400' />
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <h3 className='truncate text-base font-bold text-stone-900'>
                            {entity.name}
                          </h3>
                          <p className='mt-0.5 font-mono text-xs text-stone-500'>
                            {entity.code}
                            {revision?.stageName ? ` · ${revision.stageName}` : ''}
                          </p>
                          {entity.latestDraftVersionNumber ? (
                            <span
                              className='mt-1 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800'
                              data-testid={`pending-draft-badge-${entity.id}`}
                            >
                              {t('bible.view.pendingDraftBadge', {
                                n: entity.latestDraftVersionNumber,
                              })}
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone(status)}`}
                        >
                          {statusLabel(status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center justify-between border-t border-stone-100 px-4 py-2.5'>
                    <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600'>
                      <CategoryIcon className='h-3.5 w-3.5 text-orange-600' />
                      {t(`bible.categories.${entity.category}`, String(entity.category))}
                    </span>
                    <span className='inline-flex items-center gap-1 text-xs font-bold text-orange-700'>
                      {copy('openEntity')}
                      <ArrowRight className='h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5' />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
