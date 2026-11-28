import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Palette } from 'lucide-react';
import type { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';
import { buildBibleUrl, buildScriptReviewUrl } from '@/app/routePaths';
import { useTranslation } from '@/lib/i18n';
import { Badge, Button, Card, CardBody, CardHeader, ProgressBar } from '@/shared/ui';

const CATEGORY_LABELS: Record<string, string> = {
  Character: 'Nhân vật',
  Location: 'Bối cảnh',
  Prop: 'Đạo cụ',
  Costume: 'Trang phục',
  Term: 'Thuật ngữ',
  Rule: 'Quy tắc',
  Event: 'Sự kiện',
};

export interface BibleSummaryEntity {
  bibleEntryId: string;
  name: string;
}

export interface BibleSummaryCardProps {
  chapter: ChapterDto | null;
  readiness: ChapterReadinessDto | null;
  missingBibleEntities: BibleSummaryEntity[];
  workspaceId: string;
  seriesId: string;
}

export const BibleSummaryCard: React.FC<BibleSummaryCardProps> = ({
  chapter,
  readiness,
  missingBibleEntities,
  workspaceId,
  seriesId,
}) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation('production');

  const numberFormatter = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const formatNumber = (val: number) => numberFormatter.format(val);

  const bible = readiness?.bible;
  const readyCount = bible?.readyCount ?? 0;
  const requiredTotal = bible?.requiredTotal ?? 0;
  const missingArtCount = bible?.missingArtCount ?? 0;
  const missingDefinitionCount = bible?.missingDefinitionCount ?? 0;
  const missingCount = missingArtCount + missingDefinitionCount;
  const pendingApprovalCount = bible?.pendingApprovalCount ?? 0;
  const crowdOptionalCount = bible?.crowdOptionalCount ?? 0;
  const byCategory = bible?.byCategory ?? [];

  const moreMissingCount = Math.max(0, missingBibleEntities.length - 3);

  return (
    <Card as='section' tone='ai' data-testid='overview-bible-summary'>
      <CardHeader
        icon={<Palette aria-hidden='true' />}
        title={t('producer.chapterManagement.overview.bibleSummaryTitle')}
        actions={
          requiredTotal > 0 ? (
            <span className='text-xs font-mono font-bold text-stone-800'>
              {t('producer.chapterManagement.overview.bibleRequiredCount', {
                ready: formatNumber(readyCount),
                total: formatNumber(requiredTotal),
              })}
            </span>
          ) : (
            <span className='text-xs font-medium text-stone-500'>
              {t('producer.chapterManagement.overview.bibleNoRequired')}
            </span>
          )
        }
      />
      <CardBody className='space-y-3.5'>
        {requiredTotal > 0 && (
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between text-xs'>
              <span className='font-medium text-stone-700'>
                {t('producer.chapterManagement.overview.bibleReadyOf', {
                  ready: formatNumber(readyCount),
                  total: formatNumber(requiredTotal),
                })}
              </span>
              <span className='font-mono font-bold text-stone-700 tabular-nums'>
                {Math.round((readyCount / requiredTotal) * 100)}%
              </span>
            </div>
            <ProgressBar
              value={readyCount}
              max={requiredTotal}
              tone='success'
              label={t('producer.chapterManagement.overview.bibleReadyOf', {
                ready: formatNumber(readyCount),
                total: formatNumber(requiredTotal),
              })}
            />
          </div>
        )}

        <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3'>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.bibleLockedLabel')}
            </dt>
            <dd className='font-mono font-bold text-emerald-700 tabular-nums shrink-0'>
              {formatNumber(readyCount)}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.bibleMissingLabel')}
            </dt>
            <dd className='font-mono font-bold text-rose-700 tabular-nums shrink-0'>
              {formatNumber(missingCount)}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.biblePendingLabel')}
            </dt>
            <dd className='font-mono font-bold text-amber-700 tabular-nums shrink-0'>
              {formatNumber(pendingApprovalCount)}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.bibleCrowdLabel')}
            </dt>
            <dd className='font-mono font-bold text-stone-700 tabular-nums shrink-0'>
              {formatNumber(crowdOptionalCount)}
            </dd>
          </div>
        </dl>

        {byCategory.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {byCategory.map((cat) => (
              <Badge key={cat.category} tone='neutral'>
                {CATEGORY_LABELS[cat.category] || cat.category}:{' '}
                {cat.required > 0
                  ? `${formatNumber(cat.ready)}/${formatNumber(cat.required)}`
                  : t('producer.chapterManagement.overview.bibleNoRequiredShort')}
              </Badge>
            ))}
          </div>
        )}

        {missingBibleEntities.length > 0 && chapter && (
          <div className='space-y-1.5 pt-1'>
            <div className='text-xs font-semibold text-stone-500 uppercase tracking-wide'>
              {t('producer.chapterManagement.overview.bibleNeedsLockHeading')}
            </div>
            <div className='flex flex-wrap items-center gap-1.5'>
              {missingBibleEntities.slice(0, 3).map((ent) => (
                <button
                  key={ent.bibleEntryId}
                  type='button'
                  onClick={() =>
                    navigate(
                      `${buildScriptReviewUrl(workspaceId, seriesId, chapter.id)}?tab=entities&entityId=${encodeURIComponent(ent.bibleEntryId)}`,
                    )
                  }
                  className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 hover:bg-rose-100 cursor-pointer'
                >
                  <span>{ent.name}</span>
                  <ArrowRight className='w-3 h-3' aria-hidden='true' />
                </button>
              ))}
              {moreMissingCount > 0 && (
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      `${buildScriptReviewUrl(workspaceId, seriesId, chapter.id)}?tab=entities`,
                    )
                  }
                  className='inline-flex items-center px-2 py-1 rounded-md bg-stone-100 border border-stone-200 text-xs font-mono font-medium text-stone-600 hover:bg-stone-200 hover:text-stone-900 cursor-pointer'
                >
                  {t('producer.chapterManagement.overview.bibleMoreMissing', {
                    count: moreMissingCount,
                  })}
                </button>
              )}
            </div>
          </div>
        )}

        <div className='pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2'>
          <button
            type='button'
            onClick={() => navigate(buildBibleUrl(workspaceId, seriesId))}
            className='text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer'
          >
            {t('producer.chapterManagement.overview.seriesBibleLibraryLink')}
          </button>
          {chapter && (
            <Button
              variant='secondary'
              size='sm'
              data-testid='open-chapter-references-btn'
              trailingIcon={<ArrowRight aria-hidden='true' />}
              onClick={() =>
                navigate(`${buildScriptReviewUrl(workspaceId, seriesId, chapter.id)}?tab=entities`)
              }
            >
              {t('producer.chapterManagement.overview.viewChapterReferencesBtn')}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
