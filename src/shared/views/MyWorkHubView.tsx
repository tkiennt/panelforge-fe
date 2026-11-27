import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { assignmentService } from '@/services/assignment.service';
import type { MyWorkStudioDto } from '@/types/pipeline';
import { flattenMyWork, type WorkBucket } from './myWorkItems';
import { Badge, Card, EmptyState, PageHeader } from '@/shared/ui';
import { PageContainer } from '@/shared/components/PageContainer';
import { StudioDirectoryHeader, type StudioDirectoryHeaderProps } from './StudioDirectoryHeader';

type MyWorkHubViewProps = Pick<StudioDirectoryHeaderProps, 'currentUser' | 'onLogout'>;

/** UIQ-11q: "Việc của tôi" xuyên mọi Studio cho Writer / Artist / Letterer / Editor. */
export const MyWorkHubView: React.FC<MyWorkHubViewProps> = ({ currentUser, onLogout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [studios, setStudios] = useState<MyWorkStudioDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<WorkBucket>('inProgress');
  const [studioFilter, setStudioFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    let active = true;
    assignmentService
      .getMyWork()
      .then((data) => active && setStudios(data))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => flattenMyWork(studios ?? []), [studios]);
  const roles = useMemo(() => [...new Set(items.map((i) => i.role))].sort(), [items]);
  const visible = items.filter(
    (i) =>
      (!studioFilter || i.workspaceId === studioFilter) && (!roleFilter || i.role === roleFilter),
  );
  const counts: Record<WorkBucket, number> = {
    inProgress: visible.filter((i) => i.bucket === 'inProgress').length,
    rework: visible.filter((i) => i.bucket === 'rework').length,
    toReview: visible.filter((i) => i.bucket === 'toReview').length,
  };
  const shown = visible
    .filter((i) => i.bucket === bucket)
    .sort(
      (a, b) =>
        Number(b.isOverdue) - Number(a.isOverdue) ||
        (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'),
    );

  const selectClass =
    'h-8 rounded-lg border border-stone-200 bg-white px-2 text-xs font-semibold text-stone-800';

  return (
    <div className='h-screen w-full overflow-y-auto custom-scrollbar bg-[#FAF9F5]'>
      <StudioDirectoryHeader
        currentUser={currentUser}
        onLogout={onLogout}
        current={t('workspace.myWorkHub.title')}
      />
      <PageContainer className='max-w-7xl mx-auto space-y-5 py-6 md:py-8'>
        <PageHeader
          icon={<ClipboardList className='h-5 w-5' aria-hidden='true' />}
          title={t('workspace.myWorkHub.title')}
          description={t('workspace.myWorkHub.description')}
        />

        <div className='flex flex-wrap items-center gap-2'>
          {(['inProgress', 'rework', 'toReview'] as WorkBucket[]).map((b) => (
            <button
              key={b}
              type='button'
              onClick={() => setBucket(b)}
              aria-pressed={bucket === b}
              data-testid={`my-work-bucket-${b}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
                bucket === b
                  ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-orange-300'
              }`}
            >
              {t(`workspace.myWorkHub.bucket.${b}`)} ({counts[b]})
            </button>
          ))}
          <span className='ml-auto flex items-center gap-2'>
            <select
              aria-label={t('workspace.myWorkHub.filterStudio')}
              value={studioFilter}
              onChange={(e) => setStudioFilter(e.target.value)}
              className={selectClass}
            >
              <option value=''>{t('workspace.myWorkHub.allStudios')}</option>
              {(studios ?? []).map((s) => (
                <option key={s.workspaceId} value={s.workspaceId}>
                  {s.workspaceName}
                </option>
              ))}
            </select>
            <select
              aria-label={t('workspace.myWorkHub.filterRole')}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className={selectClass}
            >
              <option value=''>{t('workspace.myWorkHub.allRoles')}</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </span>
        </div>

        {error ? (
          <EmptyState title={t('workspace.myWorkHub.loadError')} description={error} />
        ) : studios === null ? (
          <p className='text-xs text-stone-500'>{t('workspace.myWorkHub.loading')}</p>
        ) : shown.length === 0 ? (
          <EmptyState title={t('workspace.myWorkHub.empty')} />
        ) : (
          <ul className='space-y-2' data-testid='my-work-list'>
            {shown.map((item) => (
              <li key={item.key}>
                <Card
                  as='article'
                  interactive
                  role='link'
                  tabIndex={0}
                  onClick={() => navigate(item.href)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(item.href)}
                  className='flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 cursor-pointer'
                  data-testid={`my-work-item-${item.key}`}
                >
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-bold text-stone-900'>
                      {item.seriesTitle} ·{' '}
                      {t('workspace.myWorkHub.chapter', { n: item.chapterNumber })}
                      {item.chapterTitle ? `: ${item.chapterTitle}` : ''}
                    </p>
                    <p className='text-xs text-stone-500'>
                      {item.workspaceName} · {item.stageName}
                      {item.pages.length > 0
                        ? ` · ${t('workspace.myWorkHub.pages', { pages: item.pages.join(', ') })}`
                        : ''}
                    </p>
                  </div>
                  <Badge tone='neutral'>{item.role}</Badge>
                  {item.isOverdue ? (
                    <Badge tone='danger'>{t('workspace.myWorkHub.overdue')}</Badge>
                  ) : item.dueDate ? (
                    <span className='text-xs text-stone-500'>
                      {t('workspace.myWorkHub.due', {
                        date: new Date(item.dueDate).toLocaleDateString(),
                      })}
                    </span>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </div>
  );
};
