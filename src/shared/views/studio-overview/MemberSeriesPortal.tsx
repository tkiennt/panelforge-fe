import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Layers,
  Search,
  Sliders,
  X,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import type { SeriesDto } from '@/services/series.service';
import type { AssignmentStatus, WorkspaceAssignmentDto } from '@/types/pipeline';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import {
  SeriesAvatarFallback,
  SeriesBannerFallback,
} from '@/shared/features/series-identity/SeriesImageFallbacks';
import { Card, CardBody, CardHeader, PageHeader, SectionHeader } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';
import { formatGenre, formatReadingDirection } from './formatters';

export interface MemberSeriesPortalProps {
  workspaceId?: string;
  workspaceName?: string;
  userName?: string;
  workspaceRole: string | null;
  seriesList: SeriesDto[];
  loading: boolean;
  onOpenSeries: (seriesId: string) => void;
  onOpenAutomation?: () => void;
}

const STATUS_KEYS = [
  'Assigned',
  'InProgress',
  'Submitted',
  'UnderReview',
  'Approved',
  'ReworkRequired',
  'Blocked',
] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

// Backend may serialise the enum as its numeric index.
const toStatusKey = (status: AssignmentStatus): StatusKey =>
  typeof status === 'number' ? (STATUS_KEYS[status] ?? 'Assigned') : (status as StatusKey);

const STATUS_PILL: Record<StatusKey, string> = {
  Assigned: 'bg-stone-100 text-stone-700 border-stone-200',
  InProgress: 'bg-blue-50 text-blue-800 border-blue-200',
  Submitted: 'bg-amber-50 text-amber-800 border-amber-200',
  UnderReview: 'bg-amber-50 text-amber-800 border-amber-200',
  Approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  ReworkRequired: 'bg-rose-50 text-rose-800 border-rose-200',
  Blocked: 'bg-rose-50 text-rose-800 border-rose-200',
};

const isOpenTask = (a: WorkspaceAssignmentDto) => toStatusKey(a.status) !== 'Approved';
const isUrgentTask = (a: WorkspaceAssignmentDto) => {
  const s = toStatusKey(a.status);
  return s === 'ReworkRequired' || s === 'Blocked' || a.priority === 'Urgent';
};

const getRoleBadgeClass = (role: string | null): string => {
  const upper = (role ?? '').toUpperCase();
  if (upper === 'EDITOR') return 'bg-blue-50 text-blue-800 border-blue-200';
  if (upper === 'PRODUCER') return 'bg-orange-50 text-orange-800 border-orange-200';
  return 'bg-kraft text-kraft-ink border-head-line';
};

const PortalSeriesCoverFallback: React.FC<{ title: string }> = ({ title }) => (
  <div className='relative w-full h-full flex items-center justify-center'>
    <SeriesBannerFallback />
    <div className='relative z-10 w-20 h-28 shadow-xs transition-studio-transform group-hover:scale-[1.03]'>
      <SeriesAvatarFallback title={title} />
    </div>
  </div>
);

export const MemberSeriesPortal: React.FC<MemberSeriesPortalProps> = ({
  workspaceId,
  workspaceName,
  userName,
  workspaceRole,
  seriesList,
  loading,
  onOpenSeries,
  onOpenAutomation,
}) => {
  const { t, lang } = useTranslation();
  const [assignments, setAssignments] = useState<WorkspaceAssignmentDto[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    assignmentService
      .getMyWorkspaceAssignments(workspaceId)
      .then((list) => {
        if (!cancelled) setAssignments(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setAssignments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const openTasks = useMemo(() => assignments.filter(isOpenTask), [assignments]);

  const tasksBySeries = useMemo(() => {
    const map = new Map<string, WorkspaceAssignmentDto[]>();
    for (const a of openTasks) {
      const list = map.get(a.seriesId) ?? [];
      list.push(a);
      map.set(a.seriesId, list);
    }
    // Urgent first, then nearest deadline.
    for (const list of map.values()) {
      list.sort((x, y) => {
        const u = Number(isUrgentTask(y)) - Number(isUrgentTask(x));
        if (u !== 0) return u;
        return (x.dueDate ?? '9999').localeCompare(y.dueDate ?? '9999');
      });
    }
    return map;
  }, [openTasks]);

  const visibleSeries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seriesList;
    return seriesList.filter((s) =>
      [s.title, s.synopsis, s.genre, s.format].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [seriesList, query]);

  // DESIGN_RULES §4.8.4: at most 1 featured card per view (urgent > has open tasks > sole series).
  const featuredSeriesId = useMemo(() => {
    const urgentSeries = visibleSeries.find((s) =>
      (tasksBySeries.get(s.id) ?? []).some(isUrgentTask),
    );
    if (urgentSeries) return urgentSeries.id;
    const activeSeries = visibleSeries.find((s) => (tasksBySeries.get(s.id) ?? []).length > 0);
    if (activeSeries) return activeSeries.id;
    return visibleSeries.length === 1 ? (visibleSeries[0]?.id ?? null) : null;
  }, [visibleSeries, tasksBySeries]);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit' }),
    [lang],
  );
  const roleKey = workspaceRole ?? 'default';
  const roleBadgeClass = getRoleBadgeClass(workspaceRole);
  const gridClass = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch';

  const getSeriesStatusBadge = (s: SeriesDto) => {
    if (s.isCompleted) {
      return {
        label: t('workspace.studioHub.series.statusCompleted'),
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' aria-hidden='true' />,
      };
    }
    if ((s.chaptersCount ?? 0) === 0) {
      return {
        label: t('workspace.studioHub.series.statusPreProd'),
        badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
        icon: <Clock className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />,
      };
    }
    return {
      label: t('workspace.studioHub.series.statusInProd'),
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: <Layers className='w-3.5 h-3.5 text-blue-600' aria-hidden='true' />,
    };
  };

  return (
    <div
      data-testid='member-series-portal'
      className='flex-1 bg-[#FAF9F5] min-h-full px-4 md:px-8 xl:px-12 py-6 space-y-6 text-stone-900 font-sans'
    >
      <PageHeader
        icon={<BookOpen className='w-5 h-5' aria-hidden='true' />}
        eyebrow={workspaceName || t('workspace.hub')}
        title={t('workspace.portal.title')}
        description={
          userName
            ? t('workspace.portal.greeting', { name: userName })
            : t(`workspace.library.subtitle.${roleKey}`, t('workspace.library.subtitle.default'))
        }
        actions={
          onOpenAutomation ? (
            <button
              type='button'
              onClick={onOpenAutomation}
              className='focus-ring inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800 shadow-2xs transition-colors cursor-pointer'
            >
              <Sliders className='w-4 h-4 text-accent-dark' aria-hidden='true' />
              <span>{t('workspace.automationTab.openAutomation')}</span>
            </button>
          ) : undefined
        }
      />

      {seriesList.length > 0 && (
        <SectionHeader
          title={t('workspace.studioHub.series.title')}
          count={t('workspace.portal.showing', {
            shown: visibleSeries.length,
            total: seriesList.length,
          })}
          actions={
            <label className='relative w-full sm:w-72'>
              <span className='sr-only'>{t('workspace.portal.searchLabel')}</span>
              <Search
                className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none'
                aria-hidden='true'
              />
              <input
                type='search'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('workspace.portal.searchPlaceholder')}
                className='w-full bg-white pl-9 pr-8 py-2 rounded-xl border border-stone-200 text-stone-800 text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium'
              />
              {query && (
                <button
                  type='button'
                  onClick={() => setQuery('')}
                  aria-label={t('workspace.portal.clearSearch')}
                  className='focus-ring absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-stone-700 cursor-pointer'
                >
                  <X className='w-3.5 h-3.5' aria-hidden='true' />
                </button>
              )}
            </label>
          }
        />
      )}

      {loading && seriesList.length === 0 ? (
        <div
          className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
          aria-busy='true'
          aria-label={t('workspace.seriesShelf.loadingAria')}
        >
          {[0, 1, 2].map((i) => (
            <Card key={i} className='animate-pulse'>
              <div className='h-12 bg-head-wash border-b border-head-line' />
              <CardBody className='space-y-3'>
                <div className='h-40 rounded-xl bg-stone-200/70' />
                <div className='h-20 rounded-xl bg-stone-200/70' />
                <div className='h-8 w-1/3 ml-auto rounded-lg bg-stone-200/70' />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : visibleSeries.length === 0 ? (
        <div className='border-2 border-dashed border-head-line bg-head-wash/60 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center'>
          <div
            className='bg-accent-soft text-accent-dark p-3 rounded-xl shadow-2xs'
            aria-hidden='true'
          >
            {seriesList.length === 0 ? (
              <BookOpen className='w-6 h-6' />
            ) : (
              <Search className='w-6 h-6' />
            )}
          </div>
          <p className='font-serif text-base font-bold text-stone-900'>
            {seriesList.length === 0
              ? t('workspace.portal.emptyTitle')
              : t('workspace.portal.noResults')}
          </p>
          {query && (
            <button
              type='button'
              onClick={() => setQuery('')}
              className='focus-ring inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-200 hover:bg-orange-100 text-xs font-semibold text-orange-800 transition-colors cursor-pointer'
            >
              <X className='w-3.5 h-3.5' aria-hidden='true' />
              <span>{t('workspace.portal.resetSearch')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className={gridClass}>
          {visibleSeries.map((s) => {
            const tasks = tasksBySeries.get(s.id) ?? [];
            const lead = tasks[0];
            const hasUrgent = tasks.some(isUrgentTask);
            const isFeatured = s.id === featuredSeriesId;
            const isPrimaryCta = isFeatured && tasks.length > 0;
            const displayCoverUrl = s.coverUrl || s.avatarUrl;
            const readingDir = formatReadingDirection(s.readingDirection);
            const seriesStatus = getSeriesStatusBadge(s);
            const openCoverAria = `${t('workspace.library.open.default')}: ${s.title}`;

            return (
              <Card
                key={s.id}
                as='article'
                featured={isFeatured}
                tone={hasUrgent ? 'danger' : 'brand'}
                data-testid={`portal-series-${s.id}`}
                className='flex flex-col h-full transition-shadow hover:shadow-md min-w-0'
              >
                <CardHeader
                  icon={<BookOpen className='w-4 h-4' aria-hidden='true' />}
                  titleAs='h3'
                  title={s.title}
                  subtitle={`${formatGenre(s.genre)} · ${readingDir.label}`}
                  actions={
                    <div className='flex flex-wrap items-center justify-end gap-1.5'>
                      {workspaceRole && (
                        <span
                          data-testid={`portal-role-chip-${s.id}`}
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${roleBadgeClass}`}
                        >
                          {t(`workspace.portal.role.${workspaceRole}`, workspaceRole)}
                        </span>
                      )}
                      <span
                        data-testid={`portal-status-chip-${s.id}`}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${seriesStatus.badgeClass}`}
                      >
                        {seriesStatus.icon}
                        <span>{seriesStatus.label}</span>
                      </span>
                    </div>
                  }
                />

                <CardBody className='flex-1 flex flex-col gap-4'>
                  <button
                    type='button'
                    onClick={() => onOpenSeries(s.id)}
                    aria-label={openCoverAria}
                    title={openCoverAria}
                    className={`focus-ring group relative overflow-hidden rounded-xl border border-head-line bg-head-wash text-left cursor-pointer w-full h-44 shrink-0`}
                  >
                    {displayCoverUrl ? (
                      <AuthenticatedImage
                        src={displayCoverUrl}
                        alt=''
                        width={640}
                        height={320}
                        loading='lazy'
                        className='w-full h-full object-cover transition-studio-transform group-hover:scale-[1.03]'
                        fallback={<PortalSeriesCoverFallback title={s.title} />}
                      />
                    ) : (
                      <PortalSeriesCoverFallback title={s.title} />
                    )}
                  </button>

                  <div className='flex-1 flex flex-col justify-between gap-4 min-w-0'>
                    <div className='space-y-3 min-w-0'>
                      <p className='text-sm text-stone-600 line-clamp-2 leading-relaxed'>
                        {s.synopsis?.trim() || t('workspace.studioHub.series.defaultSynopsis')}
                      </p>

                      <div className='rounded-xl border border-stone-200/80 bg-[#FAF9F5] p-3.5 space-y-2.5'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-2 min-w-0'>
                            <ClipboardList
                              className='w-4 h-4 text-accent-dark shrink-0'
                              aria-hidden='true'
                            />
                            <span className='text-xs font-semibold text-stone-800'>
                              {t('workspace.portal.tasksHeading')}
                            </span>
                            <span
                              data-testid={`portal-task-count-${s.id}`}
                              className='rounded-full bg-kraft px-2 py-0.5 font-mono text-xs font-semibold text-kraft-ink'
                            >
                              {tasks.length}
                            </span>
                          </div>
                          {hasUrgent && (
                            <span className='inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800'>
                              <AlertCircle className='w-3.5 h-3.5' aria-hidden='true' />
                              <span>{t('workspace.portal.priority')}</span>
                            </span>
                          )}
                        </div>

                        {tasks.length === 0 ? (
                          <p className='text-xs text-stone-500 leading-relaxed'>
                            {t('workspace.portal.noTasks')}
                          </p>
                        ) : (
                          <ul className='divide-y divide-stone-200/70' role='list'>
                            {tasks.slice(0, 3).map((a) => {
                              const status = toStatusKey(a.status);
                              const urgent = isUrgentTask(a);
                              return (
                                <li
                                  key={a.id}
                                  className='py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs'
                                >
                                  <span
                                    className={`truncate ${
                                      urgent ? 'font-semibold text-rose-800' : 'text-stone-700'
                                    }`}
                                  >
                                    <span className='font-semibold'>
                                      {a.scopeLabel || a.stageName}
                                    </span>
                                    {a.brief ? ` · ${a.brief}` : ''}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_PILL[status]}`}
                                  >
                                    {t(`workspace.portal.status.${status}`)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {tasks.length > 3 && (
                          <p className='text-xs text-stone-500'>
                            {t('workspace.portal.moreTasks', { count: tasks.length - 3 })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className='pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3'>
                      <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 min-w-0'>
                        <span className='truncate font-medium text-stone-700'>
                          {lead
                            ? lead.chapterTitle?.trim()
                              ? t('workspace.portal.chapterLabel', {
                                  number: lead.chapterNumber,
                                  title: lead.chapterTitle.trim(),
                                })
                              : t('workspace.automationTab.activityChapter', {
                                  number: lead.chapterNumber,
                                })
                            : t('workspace.portal.chapterCount', { count: s.chaptersCount ?? 0 })}
                        </span>
                        {lead?.dueDate && (
                          <span className='inline-flex items-center gap-1 shrink-0 font-medium text-amber-800'>
                            <Clock className='w-3.5 h-3.5 text-amber-600' aria-hidden='true' />
                            {t('workspace.portal.dueOn', {
                              date: dateFmt.format(new Date(lead.dueDate)),
                            })}
                          </span>
                        )}
                      </div>

                      <button
                        type='button'
                        onClick={() => onOpenSeries(s.id)}
                        data-testid={`open-series-btn-${s.id}`}
                        className={`focus-ring inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                          isPrimaryCta
                            ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
                            : 'bg-white hover:bg-orange-50 text-stone-800 hover:text-orange-800 border border-stone-200 hover:border-orange-300 shadow-2xs'
                        }`}
                      >
                        <span>{t('workspace.portal.openMyWork')}</span>
                        <ArrowRight className='w-4 h-4' aria-hidden='true' />
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
