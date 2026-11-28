import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, FileWarning, ListChecks } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Alert, Badge, Card, CardBody, CardHeader, ProgressBar } from '@/shared/ui';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { buildEditorDeskUrl } from '@/app/routePaths';
import type {
  ChangeRequestDto,
  ChapterReviewStatsDto,
  ConsistencyFindingDto,
  StageProgressDto,
} from '@/types';
import { StatBarChart, type StatBarDatum } from '@/shared/ui/charts/StatBarChart';
import { hasAnyValue } from '@/shared/ui/charts/chartData';
import { ReviewKpiStrip } from './ReviewKpiStrip';
import { sumReviewStats } from './reviewStats';

const LIST_LIMIT = 8;
const isStatus = (cr: ChangeRequestDto, name: 'Open' | 'Resolved', num: number) =>
  cr.status === name || cr.status === num;

export interface EditorChapterDetailProps {
  workspaceId: string;
  seriesId: string;
  row: ChapterReviewStatsDto;
}

/**
 * Chi tiết duyệt một chương cho Editor (AG-12):
 * Dải KPI, biểu đồ khung đã duyệt theo công đoạn, tiến độ sản xuất, 3 danh sách công việc.
 */
export const EditorChapterDetail: React.FC<EditorChapterDetailProps> = ({
  workspaceId,
  seriesId,
  row,
}) => {
  const { t, lang } = useTranslation('review');
  const [requests, setRequests] = useState<ChangeRequestDto[]>([]);
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [stageProgress, setStageProgress] = useState<StageProgressDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    if (!seriesId || !row.chapterId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([
      assignmentService.getChangeRequests(row.chapterId),
      assignmentService
        .getConsistencyFindings(row.chapterId)
        .catch(() => [] as ConsistencyFindingDto[]),
      assignmentService.getStageProgress(row.chapterId).catch(() => [] as StageProgressDto[]),
      pipelineService.getPipelineStages(seriesId).catch(() => [] as PipelineStageDto[]),
    ])
      .then(([crs, fs, sps, pss]) => {
        if (!mounted) return;
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
  }, [seriesId, row.chapterId]);

  const n = new Intl.NumberFormat(lang);
  const dateFmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' });

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

  const deskUrl = buildEditorDeskUrl(workspaceId, seriesId, { chapterId: row.chapterId });

  const tasksTotal = row.tasksTotal ?? 0;
  const tasksApproved = row.tasksApproved ?? 0;
  const tasksInProgress = row.tasksInProgress ?? 0;
  const tasksRework = row.tasksRework ?? 0;
  const tasksOverdue = row.tasksOverdue ?? 0;

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
    <div className='space-y-4' data-testid='editor-chapter-detail'>
      {loading && (
        <div className='space-y-4 animate-pulse' aria-busy='true'>
          <div className='h-20 rounded-xl bg-stone-200/70' />
          <div className='h-48 rounded-xl bg-stone-200/70' />
        </div>
      )}
      {error && <Alert tone='danger'>{error}</Alert>}

      {!loading && (
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

          {tasksTotal > 0 && (
            <div className='space-y-1.5' data-testid='editor-dash-production-progress'>
              <ProgressBar
                value={tasksApproved}
                max={tasksTotal}
                label={t('dashboard.chapter.productionProgressLabel')}
              />
              <p className='text-xs text-stone-600'>
                {t('dashboard.chapter.productionProgress', {
                  approved: n.format(tasksApproved),
                  total: n.format(tasksTotal),
                  inProgress: n.format(tasksInProgress),
                  rework: n.format(tasksRework),
                  overdue: n.format(tasksOverdue),
                })}
              </p>
            </div>
          )}

          <div className='flex flex-col gap-4'>
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

            <Card data-testid='editor-dash-findings'>
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

export default EditorChapterDetail;
