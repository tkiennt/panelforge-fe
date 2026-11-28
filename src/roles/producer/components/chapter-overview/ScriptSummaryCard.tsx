import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, MessageSquare } from 'lucide-react';
import type { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';
import { buildScriptReviewUrl } from '@/app/routePaths';
import { useTranslation } from '@/lib/i18n';
import { Button, Card, CardBody, CardHeader, StatusBadge } from '@/shared/ui';

export interface ScriptSummaryCardProps {
  chapter: ChapterDto | null;
  readiness: ChapterReadinessDto | null;
  workspaceId: string;
  seriesId: string;
}

export const ScriptSummaryCard: React.FC<ScriptSummaryCardProps> = ({
  chapter,
  readiness,
  workspaceId,
  seriesId,
}) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation('production');

  const numberFormatter = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const formatNumber = (val: number) => numberFormatter.format(val);

  const script = readiness?.script;
  const scriptStatus = script?.scriptStatus || chapter?.scriptStatus || 'Draft';

  const latestVersion = script?.latestVersionNumber
    ? `v${script.latestVersionNumber}`
    : t('producer.chapterManagement.overview.notSaved');

  const submittedVersion = script?.approvedVersionNumber ? `v${script.approvedVersionNumber}` : '—';

  const productionVersion = script?.productionVersionNumber
    ? `v${script.productionVersionNumber}`
    : t('producer.chapterManagement.overview.notFrozen');

  const sceneCount = formatNumber(script?.sceneCount ?? 0);
  const pagesPanels = `${formatNumber(script?.pageCount ?? 0)} / ${formatNumber(script?.panelCount ?? 0)}`;
  const openComments = formatNumber(script?.unresolvedCommentsCount ?? 0);
  const consistencyAlerts = formatNumber(script?.openFindingsCount ?? 0);

  const lastUpdatedAtText = useMemo(() => {
    if (!script?.lastUpdatedAt) return '';
    const dateLocale = lang === 'en' ? 'en-US' : 'vi-VN';
    return t('producer.chapterManagement.overview.updatedAt', {
      date: new Date(script.lastUpdatedAt).toLocaleString(dateLocale),
    });
  }, [script?.lastUpdatedAt, lang, t]);

  return (
    <Card as='section' data-testid='overview-script-summary'>
      <CardHeader
        icon={<FileText aria-hidden='true' />}
        title={t('producer.chapterManagement.overview.scriptSummaryTitle')}
        actions={<StatusBadge kind='script' status={scriptStatus} />}
      />
      <CardBody className='space-y-3.5'>
        <dl className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs rounded-lg border border-stone-200/80 bg-[#FAF9F5] p-3'>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.latestVersion')}
            </dt>
            <dd className='font-mono font-bold text-stone-900 tabular-nums shrink-0'>
              {latestVersion}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.submittedVersion')}
            </dt>
            <dd className='font-mono font-bold text-stone-900 tabular-nums shrink-0'>
              {submittedVersion}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.productionVersion')}
            </dt>
            <dd className='font-mono font-bold text-accent-dark tabular-nums shrink-0'>
              {productionVersion}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.scenesLabel')}
            </dt>
            <dd className='font-mono font-bold text-stone-900 tabular-nums shrink-0'>
              {sceneCount}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.pagesPanelsLabel')}
            </dt>
            <dd className='font-mono font-bold text-stone-900 tabular-nums shrink-0'>
              {pagesPanels}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.openCommentsLabel')}
            </dt>
            <dd className='font-mono font-bold text-stone-900 tabular-nums shrink-0 flex items-center gap-1'>
              <MessageSquare className='w-3.5 h-3.5 text-stone-400' aria-hidden='true' />
              {openComments}
            </dd>
          </div>
          <div className='flex items-center justify-between py-1 border-b border-stone-100/80 gap-2 sm:col-span-2'>
            <dt className='text-stone-500 truncate'>
              {t('producer.chapterManagement.overview.consistencyAlertsLabel')}
            </dt>
            <dd className='font-mono font-bold text-stone-900 tabular-nums shrink-0'>
              {consistencyAlerts}
            </dd>
          </div>
        </dl>

        <div className='pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2'>
          <span className='text-xs text-stone-500'>{lastUpdatedAtText}</span>
          {chapter && (
            <Button
              variant='secondary'
              size='sm'
              data-testid='open-script-workspace-btn'
              trailingIcon={<ArrowRight aria-hidden='true' />}
              onClick={() => navigate(buildScriptReviewUrl(workspaceId, seriesId, chapter.id))}
            >
              {t('producer.chapterManagement.overview.openScriptBtn')}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
