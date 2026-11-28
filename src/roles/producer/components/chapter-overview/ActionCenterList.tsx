import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';
import { Badge, Button, Card, CardBody, CardHeader } from '@/shared/ui';
import { buildReadinessResolutionUrl } from '@/shared/features/production-workspace/useChapterProductionHub';
import { buildProductionWorkspaceUrl } from '@/app/routePaths';

export interface ActionCenterListProps {
  workspaceId: string;
  seriesId: string;
  chapter: ChapterDto | null;
  readiness: ChapterReadinessDto | null;
  isPreProduction?: boolean;
  onNavigate?: (url: string) => void;
}

interface ActionCenterItem {
  id: string;
  testId: string;
  badgeTone: 'danger' | 'warning';
  badgeText: string;
  message: string;
  buttonVariant: 'danger' | 'warning';
  buttonText: string;
  onClick?: () => void;
  rowClassName: string;
}

const COLLAPSED_ITEM_LIMIT = 3;

export const ActionCenterList: React.FC<ActionCenterListProps> = ({
  workspaceId,
  seriesId,
  chapter,
  readiness,
  isPreProduction,
  onNavigate,
}) => {
  const { t, lang } = useTranslation('production');
  const routerNavigate = useNavigate();
  const navigate = onNavigate ?? routerNavigate;
  const [isExpanded, setIsExpanded] = useState(false);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(lang), [lang]);
  const formatNumber = React.useCallback(
    (val: number) => numberFormatter.format(val),
    [numberFormatter],
  );

  const isPreProd = isPreProduction ?? chapter?.status === 'PreProduction';

  const blockerCount = readiness?.blockers.length ?? 0;
  const warningCount = readiness?.warnings.length ?? 0;

  // 1. Blockers
  const blockerItems: ActionCenterItem[] = useMemo(() => {
    return (readiness?.blockers ?? []).map((issue, idx) => ({
      id: `blocker-${issue.code}-${issue.resourceId || idx}`,
      testId: `action-blocker-${issue.code}`,
      badgeTone: 'danger' as const,
      badgeText: t('producer.chapterManagement.overview.blockerTag'),
      message: issue.message,
      buttonVariant: 'danger' as const,
      buttonText: t('producer.chapterManagement.overview.openResolveBtn'),
      onClick: chapter
        ? () =>
            navigate(
              buildReadinessResolutionUrl(
                workspaceId,
                seriesId,
                chapter.id,
                issue.resolutionTarget,
              ),
            )
        : undefined,
      rowClassName: 'border-rose-200/80 bg-rose-50/40',
    }));
  }, [readiness?.blockers, chapter, navigate, t, workspaceId, seriesId]);

  // 2. Production Actions
  const productionActionItems: ActionCenterItem[] = useMemo(() => {
    const items: ActionCenterItem[] = [];
    if (!readiness?.production) return items;

    if ((readiness.production.overdueTasks ?? 0) > 0) {
      items.push({
        id: 'prod-overdue',
        testId: 'action-production-overdue',
        badgeTone: 'danger',
        badgeText: t('producer.chapterManagement.overview.overdueTag'),
        message: t('producer.chapterManagement.overview.actionOverdueDesc', {
          count: formatNumber(readiness.production.overdueTasks),
        }),
        buttonVariant: 'danger',
        buttonText: t('producer.chapterManagement.overview.openProdBoard'),
        onClick: chapter
          ? () =>
              navigate(
                buildProductionWorkspaceUrl(workspaceId, seriesId, {
                  chapterId: chapter.id,
                  tab: 'progress',
                }),
              )
          : undefined,
        rowClassName: 'border-rose-200/80 bg-rose-50/40',
      });
    }

    if ((readiness.production.reworkTasks ?? 0) > 0) {
      items.push({
        id: 'prod-rework',
        testId: 'action-production-rework',
        badgeTone: 'danger',
        badgeText: t('producer.chapterManagement.overview.reworkTag'),
        message: t('producer.chapterManagement.overview.actionReworkDesc', {
          count: formatNumber(readiness.production.reworkTasks),
        }),
        buttonVariant: 'danger',
        buttonText: t('producer.chapterManagement.overview.openProdBoard'),
        onClick: chapter
          ? () =>
              navigate(
                buildProductionWorkspaceUrl(workspaceId, seriesId, {
                  chapterId: chapter.id,
                  tab: 'progress',
                }),
              )
          : undefined,
        rowClassName: 'border-rose-200/80 bg-rose-50/40',
      });
    }

    if ((readiness.production.submittedTasks ?? 0) > 0) {
      items.push({
        id: 'prod-submitted',
        testId: 'action-production-submitted',
        badgeTone: 'warning',
        badgeText: t('producer.chapterManagement.overview.submittedTag'),
        message: t('producer.chapterManagement.overview.actionSubmittedDesc', {
          count: formatNumber(readiness.production.submittedTasks),
        }),
        buttonVariant: 'warning',
        buttonText: t('producer.chapterManagement.overview.openProdBoard'),
        onClick: chapter
          ? () =>
              navigate(
                buildProductionWorkspaceUrl(workspaceId, seriesId, {
                  chapterId: chapter.id,
                  tab: 'progress',
                }),
              )
          : undefined,
        rowClassName: 'border-amber-200/80 bg-amber-50/40',
      });
    }

    if ((readiness.production.unassignedTasks ?? 0) > 0) {
      items.push({
        id: 'prod-unassigned',
        testId: 'action-production-unassigned',
        badgeTone: 'warning',
        badgeText: t('producer.chapterManagement.overview.unassignedTag'),
        message: t('producer.chapterManagement.overview.actionUnassignedDesc', {
          count: formatNumber(readiness.production.unassignedTasks),
        }),
        buttonVariant: 'warning',
        buttonText: t('producer.chapterManagement.overview.openProdBoard'),
        onClick: chapter
          ? () =>
              navigate(
                buildProductionWorkspaceUrl(workspaceId, seriesId, {
                  chapterId: chapter.id,
                  tab: 'progress',
                }),
              )
          : undefined,
        rowClassName: 'border-amber-200/80 bg-amber-50/40',
      });
    }

    return items;
  }, [readiness?.production, chapter, navigate, t, workspaceId, seriesId, formatNumber]);

  // 3. Warnings
  const warningItems: ActionCenterItem[] = useMemo(() => {
    return (readiness?.warnings ?? []).map((issue, idx) => ({
      id: `warning-${issue.code}-${issue.resourceId || idx}`,
      testId: `action-warning-${issue.code}`,
      badgeTone: 'warning' as const,
      badgeText: t('producer.chapterManagement.overview.warningTag'),
      message: issue.message,
      buttonVariant: 'warning' as const,
      buttonText: t('producer.chapterManagement.overview.viewDetails'),
      onClick: chapter
        ? () =>
            navigate(
              buildReadinessResolutionUrl(
                workspaceId,
                seriesId,
                chapter.id,
                issue.resolutionTarget,
              ),
            )
        : undefined,
      rowClassName: 'border-amber-200/80 bg-amber-50/40',
    }));
  }, [readiness?.warnings, chapter, navigate, t, workspaceId, seriesId]);

  // Combined order: blockers -> production actions -> warnings
  const allActions = useMemo(
    () => [...blockerItems, ...productionActionItems, ...warningItems],
    [blockerItems, productionActionItems, warningItems],
  );

  const hasDangerProductionAction = productionActionItems.some(
    (item) => item.badgeTone === 'danger',
  );
  const totalActionCount = allActions.length;

  if (totalActionCount === 0) {
    return (
      <div
        data-testid='overview-action-center'
        className='rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2'
      >
        <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' aria-hidden='true' />
        <span className='font-medium'>
          {isPreProd
            ? t('producer.chapterManagement.overview.noBlockersPreProd')
            : t('producer.chapterManagement.overview.noPendingActions')}
        </span>
      </div>
    );
  }

  const visibleActions = isExpanded ? allActions : allActions.slice(0, COLLAPSED_ITEM_LIMIT);
  const remainingCount = totalActionCount - COLLAPSED_ITEM_LIMIT;

  return (
    <Card
      as='section'
      tone={blockerCount > 0 || hasDangerProductionAction ? 'danger' : 'warning'}
      data-testid='overview-action-center'
    >
      <CardHeader
        icon={<AlertTriangle aria-hidden='true' />}
        title={t('producer.chapterManagement.overview.actionCenterTitle')}
        actions={
          <div className='flex flex-wrap items-center gap-1.5'>
            {blockerCount > 0 && (
              <Badge tone='danger' className='tabular-nums'>
                {t('producer.chapterManagement.overview.blockerCountBadge', {
                  count: formatNumber(blockerCount),
                })}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge tone='warning' className='tabular-nums'>
                {t('producer.chapterManagement.overview.warningCountBadge', {
                  count: formatNumber(warningCount),
                })}
              </Badge>
            )}
            {productionActionItems.length > 0 && (
              <Badge
                tone={hasDangerProductionAction ? 'danger' : 'warning'}
                className='tabular-nums'
              >
                {t('producer.chapterManagement.overview.productionActionsCountBadge', {
                  count: formatNumber(productionActionItems.length),
                })}
              </Badge>
            )}
          </div>
        }
      />
      <CardBody className='space-y-2'>
        {visibleActions.map((item) => (
          <div
            key={item.id}
            data-testid={item.testId}
            className={`rounded-lg border px-3.5 py-2 flex items-center justify-between gap-3 ${item.rowClassName}`}
          >
            <div className='flex items-center gap-2.5 min-w-0'>
              <Badge tone={item.badgeTone}>{item.badgeText}</Badge>
              <p className='text-xs text-stone-800 min-w-0'>{item.message}</p>
            </div>
            {chapter && item.onClick && (
              <Button variant={item.buttonVariant} size='sm' onClick={item.onClick}>
                {item.buttonText}
              </Button>
            )}
          </div>
        ))}

        {totalActionCount > COLLAPSED_ITEM_LIMIT && (
          <div className='flex justify-center pt-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setIsExpanded((prev) => !prev)}
              trailingIcon={
                isExpanded ? (
                  <ChevronUp className='w-3.5 h-3.5' aria-hidden='true' />
                ) : (
                  <ChevronDown className='w-3.5 h-3.5' aria-hidden='true' />
                )
              }
            >
              {isExpanded
                ? t('producer.chapterManagement.overview.actionCenterShowLess')
                : t('producer.chapterManagement.overview.actionCenterShowMore', {
                    count: formatNumber(remainingCount),
                  })}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
