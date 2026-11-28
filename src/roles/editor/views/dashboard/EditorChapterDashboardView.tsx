import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, FileWarning, Gauge, ListChecks } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Alert, Badge, Card, CardBody, CardHeader, PageHeader } from '@/shared/ui';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import {
  buildEditorDashboardUrl,
  buildEditorDeskUrl,
  buildScriptReviewUrl,
} from '@/app/routePaths';
import type {
  ChangeRequestDto,
  ChapterReviewStatsDto,
  ConsistencyFindingDto,
  SeriesReviewStatsDto,
  StageProgressDto,
} from '@/types';
import { StatBarChart, type StatBarDatum } from '@/shared/ui/charts/StatBarChart';
import { hasAnyValue } from '@/shared/ui/charts/chartData';
import { ReviewKpiStrip } from './ReviewKpiStrip';
import { sumReviewStats } from './reviewStats';

const LIST_LIMIT = 8;
const isStatus = (cr: ChangeRequestDto, name: 'Open' | 'Resolved', num: number) =>
  cr.status === name || cr.status === num;

/** Tổng quan duyệt cấp chương cho Editor (CF3): yêu cầu sửa cần xác minh, còn mở, phát hiện nhất quán. */
export const EditorChapterDashboardView: React.FC = () => {
  const { t, lang } = useTranslation('review');
  const { workspaceId = '', seriesId = '', chapterId = '' } = useParams();
  const [stats, setStats] = useState<SeriesReviewStatsDto | null>(null);
  const [requests, setRequests] = useState<ChangeRequestDto[]>([]);
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [stageProgress, setStageProgress] = useState<StageProgressDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    if (!seriesId || !chapterId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      assignmentService.getSeriesReviewStats(seriesId),
      assignmentService.getChangeRequests(chapterId),
      assignmentService
        .getConsistencyFindings(chapterId)
        .catch(() => [] as ConsistencyFindingDto[]),
      assignmentService.getStageProgress(chapterId).catch(() => [] as StageProgressDto[]),
      pipelineService.getPipelineStages(seriesId).catch(() => [] as PipelineStageDto[]),
    ])
      .then(([s, crs, fs, sps, pss]) => {
        if (!mounted) return;
        setStats(s);
        setRequests(crs);
        setFindings(fs);
        setStageProgress(sps);
        setStages(pss);
        setLoadedAt(Date.now());
      })
      .catch((e: unknown) => mounted && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [seriesId, chapterId]);

  const n = new Intl.NumberFormat(lang);
  const dateFmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' });
  const row: ChapterReviewStatsDto | undefined = stats?.chapters.find(
    (c) => c.chapterId === chapterId,
  );
  const toVerify = requests.filter((cr) => isStatus(cr, 'Resolved', 2));
  const open = requests
    .filter((cr) => isStatus(cr, 'Open', 1))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
  const openFindings = findings
    .filter((f) => f.status === 'Open' || f.status === 'NeedsClarification')
    .sort((a, b) => Number(b.severity === 'Blocking') - Number(a.severity === 'Blocking'));

  const stageApprovedCounts = new Map<string, number>();
  for (const sp of stageProgress) {
    if (sp.status === 'Approved') {
      stageApprovedCounts.set(
        sp.pipelineStageId,
        (stageApprovedCounts.get(sp.pipelineStageId) ?? 0) + 1,
      );
    }
  }

  const stageApprovedData: StatBarDatum[] = stages
    .filter((st) => !st.isTerminal)
    .sort((a, b) => a.stageOrder - b.stageOrder)
    .map((st) => ({
      key: st.id,
      label: st.name,
      value: stageApprovedCounts.get(st.id) ?? 0,
    }));
  const hasStageApproved = hasAnyValue(stageApprovedData);

  const deskUrl = buildEditorDeskUrl(workspaceId, seriesId, { chapterId });

  const linkClass =
    'focus-ring text-xs font-semibold text-orange-700 hover:text-orange-800 whitespace-nowrap';
  const more = (total: number) =>
    total > LIST_LIMIT && (
      <div className='px-4 py-2 text-xs text-stone-500 border-t border-stone-100'>
        {t('dashboard.chapter.more', { count: total - LIST_LIMIT })}
      </div>
    );
  const empty = (text: string) => <p className='px-4 py-3 text-sm text-stone-500'>{text}</p>;

  return (
    <div className='p-6 max-w-[1440px] mx-auto space-y-5' data-testid='editor-chapter-dashboard'>
      <Link
        to={buildEditorDashboardUrl(workspaceId, seriesId)}
        className='focus-ring inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900'
      >
        <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
        {t('dashboard.chapter.back')}
      </Link>
      <PageHeader
        icon={<Gauge className='w-5 h-5' aria-hidden='true' />}
        eyebrow={row ? t('dashboard.chapterNumber', { number: row.chapterNumber }) : undefined}
        title={row?.title || t('dashboard.chapter.title')}
        actions={
          <div className='flex items-center gap-3'>
            {row?.scriptStatus === 'InReview' && (
              <Link
                to={buildScriptReviewUrl(workspaceId, seriesId, chapterId)}
                className={linkClass}
              >
                {t('dashboard.chapter.reviewScript')}
              </Link>
            )}
            <Link
              to={deskUrl}
              className='focus-ring btn-cta-primary text-sm px-3 py-1.5 rounded-lg'
            >
              {t('dashboard.openDesk')}
            </Link>
          </div>
        }
      />

      {loading && (
        <div className='space-y-4 animate-pulse' aria-busy='true'>
          <div className='h-20 rounded-xl bg-stone-200/70' />
          <div className='h-48 rounded-xl bg-stone-200/70' />
        </div>
      )}
      {error && <Alert tone='danger'>{error}</Alert>}
      {stats && !loading && !row && <Alert tone='warning'>{t('dashboard.chapter.notFound')}</Alert>}

      {row && !loading && (
        <>
          <ReviewKpiStrip totals={sumReviewStats([row])} />

          {hasStageApproved && (
            <Card>
              <CardHeader title={t('dashboard.chart.stageApproved')} />
              <CardBody>
                <StatBarChart
                  variant='sequence'
                  data={stageApprovedData}
                  valueLabel={t('dashboard.chart.approvedPanels')}
                  formatValue={n.format}
                  ariaLabel={t('dashboard.chart.stageApproved')}
                />
              </CardBody>
            </Card>
          )}

          <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
            <Card data-testid='editor-dash-to-verify'>
              <CardHeader
                icon={<ClipboardCheck aria-hidden='true' />}
                title={t('dashboard.chapter.toVerifyTitle', { count: toVerify.length })}
                actions={
                  toVerify.length > 0 && (
                    <Link to={deskUrl} className={linkClass}>
                      {t('dashboard.chapter.verifyAction')}
                    </Link>
                  )
                }
              />
              <CardBody className='p-0'>
                {toVerify.length === 0 ? (
                  empty(t('dashboard.chapter.toVerifyEmpty'))
                ) : (
                  <ul className='divide-y divide-stone-100'>
                    {toVerify.slice(0, LIST_LIMIT).map((cr) => (
                      <li key={cr.id} className='px-4 py-2.5 text-sm'>
                        <div className='text-stone-900 line-clamp-1'>{cr.description}</div>
                        <div className='text-xs text-stone-500 line-clamp-1'>
                          {cr.resolutionNote || '—'}
                          {cr.resolvedAt && ` · ${dateFmt.format(new Date(cr.resolvedAt))}`}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {more(toVerify.length)}
              </CardBody>
            </Card>

            <Card data-testid='editor-dash-open-requests'>
              <CardHeader
                icon={<ListChecks aria-hidden='true' />}
                title={t('dashboard.chapter.openTitle', { count: open.length })}
              />
              <CardBody className='p-0'>
                {open.length === 0 ? (
                  empty(t('dashboard.chapter.openEmpty'))
                ) : (
                  <ul className='divide-y divide-stone-100'>
                    {open.slice(0, LIST_LIMIT).map((cr) => {
                      const overdue = !!cr.dueDate && new Date(cr.dueDate).getTime() < loadedAt;
                      return (
                        <li key={cr.id} className='px-4 py-2.5 text-sm flex items-start gap-3'>
                          <span className='flex-1 min-w-0 text-stone-900 line-clamp-1'>
                            {cr.description}
                          </span>
                          {cr.dueDate && (
                            <span
                              className={`text-xs whitespace-nowrap ${
                                overdue ? 'font-semibold text-rose-700' : 'text-stone-500'
                              }`}
                            >
                              {dateFmt.format(new Date(cr.dueDate))}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {more(open.length)}
              </CardBody>
            </Card>

            <Card data-testid='editor-dash-findings' className='xl:col-span-2'>
              <CardHeader
                icon={<FileWarning aria-hidden='true' />}
                title={t('dashboard.chapter.findingsTitle', { count: openFindings.length })}
              />
              <CardBody className='p-0'>
                {openFindings.length === 0 ? (
                  empty(t('dashboard.chapter.findingsEmpty'))
                ) : (
                  <ul className='divide-y divide-stone-100'>
                    {openFindings.slice(0, LIST_LIMIT).map((f) => (
                      <li key={f.id} className='px-4 py-2.5 text-sm flex items-start gap-3'>
                        <Badge
                          tone={
                            f.severity === 'Blocking'
                              ? 'danger'
                              : f.severity === 'Warning'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {t(`dashboard.severity.${f.severity}`)}
                        </Badge>
                        <span className='flex-1 min-w-0 text-stone-900 line-clamp-1'>
                          {f.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {more(openFindings.length)}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default EditorChapterDashboardView;
