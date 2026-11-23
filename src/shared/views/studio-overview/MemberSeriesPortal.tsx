import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ClipboardList,
  Filter,
  Layers,
  Search,
  X,
} from 'lucide-react';
import { assignmentService } from '@/services/assignment.service';
import type { SeriesDto } from '@/services/series.service';
import type { AssignmentStatus, WorkspaceAssignmentDto } from '@/types/pipeline';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';
import { formatReadingDirection } from './formatters';

interface MemberSeriesPortalProps {
  workspaceId?: string;
  workspaceName?: string;
  userName?: string;
  workspaceRole: string | null;
  seriesList: SeriesDto[];
  loading: boolean;
  onOpenSeries: (seriesId: string) => void;
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
  Assigned: 'bg-stone-100 text-stone-600',
  InProgress: 'bg-blue-50 text-blue-700',
  Submitted: 'bg-amber-50 text-amber-700',
  UnderReview: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  ReworkRequired: 'bg-rose-50 text-rose-700',
  Blocked: 'bg-rose-50 text-rose-700',
};

const isOpenTask = (a: WorkspaceAssignmentDto) => toStatusKey(a.status) !== 'Approved';
const isUrgentTask = (a: WorkspaceAssignmentDto) => {
  const s = toStatusKey(a.status);
  return s === 'ReworkRequired' || s === 'Blocked' || a.priority === 'Urgent';
};

export const MemberSeriesPortal: React.FC<MemberSeriesPortalProps> = ({
  workspaceId,
  workspaceName,
  userName,
  workspaceRole,
  seriesList,
  loading,
  onOpenSeries,
}) => {
  const { t, lang } = useTranslation();
  const [assignments, setAssignments] = useState<WorkspaceAssignmentDto[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    assignmentService.getMyWorkspaceAssignments(workspaceId).then((list) => {
      if (!cancelled) setAssignments(list);
    });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const openTasks = useMemo(() => assignments.filter(isOpenTask), [assignments]);
  const urgentCount = useMemo(() => openTasks.filter(isUrgentTask).length, [openTasks]);

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
      [s.title, s.genre, s.format].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [seriesList, query]);

  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit' }),
    [lang],
  );
  const roleKey = workspaceRole ?? 'default';

  return (
    <div className='flex-1 bg-[#FAF9F5] min-h-screen font-sans text-stone-900'>
      <div className='max-w-6xl mx-auto px-4 md:px-6 py-10 space-y-6'>
        <header className='flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
          <div>
            <p className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-500'>
              <span className='w-2 h-2 rounded-full bg-orange-500' aria-hidden />
              {workspaceName ?? t('workspace.portal.eyebrow')}
            </p>
            <h1 className='mt-2 text-3xl font-semibold tracking-tight text-stone-900'>
              {t('workspace.portal.title')}
            </h1>
            <p className='mt-2 text-sm text-stone-600 max-w-2xl'>
              {userName
                ? t('workspace.portal.greeting', { name: userName })
                : t(
                    `workspace.library.subtitle.${roleKey}`,
                    t('workspace.library.subtitle.default'),
                  )}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            <span className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200/80 bg-white text-sm text-stone-700 shadow-xs'>
              <ClipboardList className='w-4 h-4 text-orange-600' />
              {t('workspace.portal.openTasks', { count: openTasks.length })}
            </span>
            {urgentCount > 0 && (
              <span className='inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700'>
                <AlertCircle className='w-4 h-4' />
                {t('workspace.portal.urgentTasks', { count: urgentCount })}
              </span>
            )}
          </div>
        </header>

        <div className='flex flex-col sm:flex-row gap-3 p-3 bg-white border border-stone-200/80 rounded-xl shadow-xs'>
          <label className='relative flex-1'>
            <span className='sr-only'>{t('workspace.portal.searchLabel')}</span>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
            <input
              type='search'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('workspace.portal.searchPlaceholder')}
              className='w-full pl-9 pr-9 py-2.5 rounded-lg border border-stone-200 bg-stone-50 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400'
            />
            {query && (
              <button
                type='button'
                onClick={() => setQuery('')}
                aria-label={t('workspace.portal.clearSearch')}
                className='absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-stone-400 hover:text-stone-600'
              >
                <X className='w-4 h-4' />
              </button>
            )}
          </label>
          <span className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 shrink-0'>
            <Filter className='w-4 h-4 text-stone-500' />
            {t('workspace.portal.showing', {
              shown: visibleSeries.length,
              total: seriesList.length,
            })}
          </span>
        </div>

        {loading && seriesList.length === 0 ? (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' aria-busy>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className='h-96 rounded-xl border border-stone-200/80 bg-white animate-pulse'
              />
            ))}
          </div>
        ) : visibleSeries.length === 0 ? (
          <div className='flex flex-col items-center justify-center gap-3 py-16 bg-white border border-dashed border-stone-300 rounded-xl text-center'>
            <BookOpen className='w-6 h-6 text-stone-400' />
            <p className='text-sm font-medium text-stone-700'>
              {seriesList.length === 0
                ? t('workspace.portal.emptyTitle')
                : t('workspace.portal.noResults')}
            </p>
            {query && (
              <button
                type='button'
                onClick={() => setQuery('')}
                className='text-sm font-medium text-orange-600 hover:text-orange-700'
              >
                {t('workspace.portal.resetSearch')}
              </button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {visibleSeries.map((s) => {
              const tasks = tasksBySeries.get(s.id) ?? [];
              const lead = tasks[0];
              const isWebtoon = String(s.format).toUpperCase().includes('WEBTOON');
              const formatLabel = isWebtoon
                ? t('workspace.portal.formatWebtoon')
                : `${s.format} · ${formatReadingDirection(s.readingDirection).label}`;
              const hasUrgent = tasks.some(isUrgentTask);
              return (
                <article
                  key={s.id}
                  data-testid={`portal-series-${s.id}`}
                  className='flex flex-col bg-white border border-stone-200/80 rounded-xl shadow-xs overflow-hidden'
                >
                  <div className='relative aspect-[2/1] bg-stone-900'>
                    {s.coverUrl ? (
                      <AuthenticatedImage
                        src={s.coverUrl}
                        alt=''
                        width={640}
                        height={320}
                        loading='lazy'
                        className='absolute inset-0 w-full h-full object-cover'
                      />
                    ) : (
                      <div className='absolute inset-0 flex items-center justify-center'>
                        <Layers className='w-8 h-8 text-stone-600' />
                      </div>
                    )}
                    <div className='absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent' />
                    <div className='absolute top-3 left-3 right-3 flex items-start justify-between gap-2'>
                      <span className='px-2 py-0.5 rounded bg-stone-950/80 font-mono text-xs text-white uppercase'>
                        {formatLabel}
                      </span>
                      {workspaceRole && (
                        <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-xs font-medium text-stone-700'>
                          <span className='w-1.5 h-1.5 rounded-full bg-orange-500' aria-hidden />
                          {t(`workspace.portal.role.${workspaceRole}`, workspaceRole)}
                        </span>
                      )}
                    </div>
                    <div className='absolute bottom-3 left-4 right-4'>
                      <h2 className='text-lg font-bold text-white truncate'>{s.title}</h2>
                      <p className='mt-0.5 flex items-center gap-2 text-sm text-white/85'>
                        <span className='truncate'>
                          {lead
                            ? t('workspace.portal.chapterLabel', {
                                number: lead.chapterNumber,
                                title: lead.chapterTitle ?? '',
                              })
                            : t('workspace.portal.chapterCount', { count: s.chaptersCount })}
                        </span>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${
                            s.isCompleted
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {s.isCompleted
                            ? t('workspace.portal.completed')
                            : t('workspace.portal.inProduction')}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className='flex-1 flex flex-col gap-3 p-4'>
                    <div className='flex items-center justify-between gap-2 text-sm text-stone-600'>
                      <span className='truncate'>{s.genre || '—'}</span>
                      {lead?.dueDate && (
                        <span className='shrink-0 text-sm font-medium text-amber-700'>
                          {t('workspace.portal.dueOn', {
                            date: dateFmt.format(new Date(lead.dueDate)),
                          })}
                        </span>
                      )}
                    </div>

                    <div className='flex-1 rounded-lg border border-stone-200/80 bg-stone-50 p-3'>
                      <div className='flex items-center justify-between gap-2 mb-2'>
                        <p className='flex items-center gap-2 text-sm font-medium text-stone-800'>
                          <ClipboardList className='w-4 h-4 text-orange-600' />
                          {t('workspace.portal.tasksForYou', { count: tasks.length })}
                        </p>
                        {hasUrgent && (
                          <span className='px-2 py-0.5 rounded-md bg-rose-50 text-xs font-semibold uppercase text-rose-700'>
                            {t('workspace.portal.priority')}
                          </span>
                        )}
                      </div>
                      {tasks.length === 0 ? (
                        <p className='text-sm text-stone-500'>{t('workspace.portal.noTasks')}</p>
                      ) : (
                        <ul className='space-y-1.5'>
                          {tasks.slice(0, 3).map((a) => {
                            const status = toStatusKey(a.status);
                            return (
                              <li
                                key={a.id}
                                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-white text-sm ${
                                  isUrgentTask(a)
                                    ? 'border-rose-200 text-rose-800'
                                    : 'border-stone-200/80 text-stone-700'
                                }`}
                              >
                                <span className='truncate'>
                                  <span className='font-medium'>{a.scopeLabel || a.stageName}</span>
                                  {a.brief ? `: ${a.brief}` : ''}
                                </span>
                                <span
                                  className={`shrink-0 px-1.5 py-0.5 rounded font-mono text-xs ${STATUS_PILL[status]}`}
                                >
                                  {t(`workspace.portal.status.${status}`)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>

                    <button
                      type='button'
                      onClick={() => onOpenSeries(s.id)}
                      className='w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-xs transition-colors'
                    >
                      {t('workspace.portal.openMyWork')}
                      <ArrowRight className='w-4 h-4' />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
