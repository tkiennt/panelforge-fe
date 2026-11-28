import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Settings2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { adminDetailService } from '@/services/adminDetail.service';
import { quotaService } from '@/services/quota.service';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminPageHeader,
  AdminTableState,
  AdminToast,
} from '../../components/AdminUi';
import { adminTable, useAdminToast } from '../../components/adminUiStyles';
import { HealthBadge, RequestStatusBadge, UsageBar } from '../resources/ResourceUi';
import { formatAmount, useLocale } from '../resources/resourceFormat';
import { ConfigureStudioModal } from '../resources/ConfigureStudioModal';
import { ActivityList, BackButton, InfoRow, SummaryNumber } from './DetailUi';
import { formatDateTime } from './detailFormat';

/**
 * Admin → Tài nguyên → Chi tiết Studio (OPS-31). Số tài nguyên cùng nguồn với bảng Tài nguyên; nút "Cấu hình tài nguyên"
 * mở đúng hộp thoại của bảng đó (bắt lý do, ghi Nhật ký). Series chỉ hiện tên và số chương, không mở nội dung (BR-07).
 */
export const AdminStudioDetailView: React.FC<{
  workspaceId: string;
  onBack: () => void;
  onOpenUser: (userId: string) => void;
}> = ({ workspaceId, onBack, onOpenUser }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [configuring, setConfiguring] = useState(false);
  const { toast, show: showToast, clear: clearToast } = useAdminToast();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['adminStudioDetail', workspaceId],
    queryFn: () => adminDetailService.getWorkspace(workspaceId),
  });
  const { data: policy } = useQuery({
    queryKey: ['adminQuotaPolicy'],
    queryFn: () => quotaService.getPolicy(),
  });

  if (isLoading || error || !data) {
    return (
      <div className='space-y-4'>
        <BackButton label={t('admin.details.studio.back')} onClick={onBack} />
        <table className='w-full'>
          <tbody>
            <AdminTableState
              colSpan={1}
              kind={isLoading ? 'loading' : 'error'}
              message={isLoading ? t('admin.details.loading') : (error as Error)?.message}
              action={
                !isLoading && (
                  <AdminButton size='sm' onClick={() => refetch()}>
                    {t('admin.details.retry')}
                  </AdminButton>
                )
              }
            />
          </tbody>
        </table>
      </div>
    );
  }

  const r = data.resources;
  const warn = policy?.warningThresholdPercent ?? 80;
  const n = (v: number) => v.toLocaleString(locale);
  const minutes = (v: number | null) =>
    v == null
      ? t('admin.details.studio.defaultPolicy')
      : t('admin.details.studio.minutes', { n: v });

  return (
    <div className='space-y-6'>
      <BackButton label={t('admin.details.studio.back')} onClick={onBack} />
      <AdminPageHeader
        title={r.name}
        description={t('admin.details.studio.owner', { name: r.ownerName || r.ownerEmail })}
        actions={
          <>
            <AdminButton
              variant='primary'
              onClick={() => setConfiguring(true)}
              icon={<Settings2 className='w-4 h-4' />}
            >
              {t('admin.details.studio.configure')}
            </AdminButton>
            <AdminButton
              onClick={() => refetch()}
              isLoading={isFetching}
              icon={<RefreshCw className='w-4 h-4' />}
            >
              {t('admin.details.refresh')}
            </AdminButton>
          </>
        }
      />

      <AdminCard
        title={t('admin.details.studio.resources')}
        actions={<HealthBadge health={r.health} />}
      >
        <div className='grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4'>
          <div>
            <div className='text-sm font-semibold mb-2'>{t('admin.details.studio.storage')}</div>
            <UsageBar
              meter={r.storage}
              type='Storage'
              warningPercent={warn}
              label={t('admin.details.studio.storage')}
            />
          </div>
          <div>
            <div className='text-sm font-semibold mb-2'>{t('admin.details.studio.aiTokens')}</div>
            {r.aiTokens ? (
              <UsageBar
                meter={r.aiTokens}
                type='AiTokens'
                warningPercent={warn}
                label={t('admin.details.studio.aiTokens')}
              />
            ) : (
              <span className='text-sm text-admin-muted'>{t('admin.details.studio.noAi')}</span>
            )}
          </div>
          <div>
            <div className='text-sm font-semibold mb-2'>{t('admin.details.studio.aiImages')}</div>
            {r.aiImages ? (
              <UsageBar
                meter={r.aiImages}
                type='AiImages'
                warningPercent={warn}
                label={t('admin.details.studio.aiImages')}
              />
            ) : (
              <span className='text-sm text-admin-muted'>{t('admin.details.studio.noAi')}</span>
            )}
          </div>
          <div>
            <div className='text-sm font-semibold mb-2'>{t('admin.details.studio.aiRequests')}</div>
            {r.aiRequests ? (
              // Lượt gọi là số đếm như token nên định dạng giống AiTokens (OPS-24).
              <UsageBar
                meter={r.aiRequests}
                type='AiTokens'
                warningPercent={warn}
                label={t('admin.details.studio.aiRequests')}
              />
            ) : (
              <span className='text-sm text-admin-muted'>{t('admin.details.studio.noAi')}</span>
            )}
          </div>
        </div>
        <div className='mt-5 pt-4 border-t border-admin-line grid gap-4 grid-cols-2 md:grid-cols-4'>
          <SummaryNumber
            label={t('admin.details.studio.ai30Tokens')}
            value={n(data.aiLast30Days.tokens)}
          />
          <SummaryNumber
            label={t('admin.details.studio.ai30Calls')}
            value={n(data.aiLast30Days.calls)}
          />
          <SummaryNumber
            label={t('admin.details.studio.ai30Failed')}
            value={n(data.aiLast30Days.failedCalls)}
          />
          <SummaryNumber
            label={t('admin.details.studio.ai30FailedRuns')}
            value={n(data.aiLast30Days.failedWorkflowRuns)}
          />
        </div>
      </AdminCard>

      <div className='grid gap-6 grid-cols-1 xl:grid-cols-2'>
        <AdminCard title={t('admin.details.studio.settings')}>
          <dl className='divide-y divide-admin-line/70'>
            <InfoRow label={t('admin.details.studio.aiStatus')}>
              {r.aiEnabled ? (
                <AdminBadge tone='success'>{t('admin.details.studio.aiOn')}</AdminBadge>
              ) : (
                <AdminBadge>{t('admin.details.studio.aiOff')}</AdminBadge>
              )}
            </InfoRow>
            <InfoRow label={t('admin.details.studio.aiProvider')}>{data.aiProvider || '—'}</InfoRow>
            <InfoRow label={t('admin.details.studio.requestsPerMinute')}>
              {r.requestsPerMinuteLimit
                ? n(r.requestsPerMinuteLimit)
                : t('admin.resources.unlimited')}
            </InfoRow>
            <InfoRow label={t('admin.details.studio.aiReset')}>
              <span className='tabular-nums'>{formatDateTime(r.aiNextResetAt, locale)}</span>
            </InfoRow>
            <InfoRow label={t('admin.details.studio.sessionLifetime')}>
              {minutes(data.sessionLifetimeMinutes)}
            </InfoRow>
            <InfoRow label={t('admin.details.studio.sessionIdle')}>
              {minutes(data.sessionIdleTimeoutMinutes)}
            </InfoRow>
            <InfoRow label={t('admin.details.studio.maxSessions')}>
              {data.maxConcurrentSessions ?? t('admin.details.studio.defaultPolicy')}
            </InfoRow>
            <InfoRow label={t('admin.details.studio.createdAt')}>
              <span className='tabular-nums'>{formatDateTime(r.createdAt, locale)}</span>
            </InfoRow>
          </dl>
        </AdminCard>

        <AdminCard
          title={t('admin.details.studio.members', { n: data.members.length })}
          bodyClassName='p-0'
        >
          {data.members.length === 0 ? (
            <p className='p-5 text-sm text-admin-muted'>{t('admin.details.studio.noMembers')}</p>
          ) : (
            <ul className='divide-y divide-admin-line/70'>
              {data.members.map((m) => (
                <li key={m.userId} className='flex flex-wrap items-center gap-3 px-5 py-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='font-semibold text-admin-ink-strong truncate'>
                      {m.fullName || m.email}
                    </div>
                    <div className='text-xs text-admin-muted break-all'>{m.email}</div>
                  </div>
                  <AdminBadge>{t(`workspace.roles.${m.role.toLowerCase()}`)}</AdminBadge>
                  {m.userId === data.ownerId && (
                    <AdminBadge tone='accent'>{t('workspace.owner')}</AdminBadge>
                  )}
                  {m.status !== 'Active' && (
                    <AdminBadge tone='warning'>
                      {t(`admin.details.memberStatus.${m.status}`)}
                    </AdminBadge>
                  )}
                  {!m.userIsActive && (
                    <AdminBadge tone='danger'>{t('admin.details.user.locked')}</AdminBadge>
                  )}
                  <AdminButton size='sm' variant='ghost' onClick={() => onOpenUser(m.userId)}>
                    {t('admin.details.studio.openUser')}
                  </AdminButton>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      <AdminCard
        title={t('admin.details.studio.series', { n: data.series.length })}
        bodyClassName='p-0'
      >
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.details.studio.colTitle')}</th>
                <th className={adminTable.th}>{t('admin.details.studio.colChapters')}</th>
                <th className={adminTable.th}>{t('admin.details.studio.colPublished')}</th>
                <th className={adminTable.th}>{t('admin.details.studio.colStatus')}</th>
                <th className={adminTable.th}>{t('admin.details.studio.colCreated')}</th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {data.series.length === 0 ? (
                <AdminTableState
                  colSpan={5}
                  kind='empty'
                  message={t('admin.details.studio.noSeries')}
                />
              ) : (
                data.series.map((s) => (
                  <tr key={s.id} className={adminTable.tr}>
                    <td className={`${adminTable.td} font-semibold`}>{s.title}</td>
                    <td className={`${adminTable.td} tabular-nums`}>{n(s.chapterCount)}</td>
                    <td className={`${adminTable.td} tabular-nums`}>
                      {n(s.publishedChapterCount)}
                    </td>
                    <td className={adminTable.td}>
                      {s.isCompleted ? (
                        <AdminBadge tone='success'>
                          {t('admin.details.studio.completed')}
                        </AdminBadge>
                      ) : (
                        <AdminBadge tone='info'>{t('admin.details.studio.ongoing')}</AdminBadge>
                      )}
                    </td>
                    <td className={`${adminTable.td} tabular-nums whitespace-nowrap`}>
                      {formatDateTime(s.createdAt, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard title={t('admin.details.studio.requests')} bodyClassName='p-0'>
        {data.quotaRequests.length === 0 ? (
          <p className='p-5 text-sm text-admin-muted'>{t('admin.details.studio.noRequests')}</p>
        ) : (
          <ul className='divide-y divide-admin-line/70'>
            {data.quotaRequests.map((q) => (
              <li key={q.id} className='flex flex-wrap items-center gap-3 px-5 py-3'>
                <RequestStatusBadge status={q.status} />
                <span className='text-sm font-medium'>
                  {t(`admin.resources.type.${q.resourceType}`)}
                </span>
                <span className='text-sm tabular-nums'>
                  {formatAmount(q.resourceType, q.currentQuota, locale)} →{' '}
                  {formatAmount(q.resourceType, q.grantedQuota ?? q.requestedQuota, locale)}
                </span>
                <span className='text-xs text-admin-muted flex-1 min-w-0 truncate' title={q.reason}>
                  {q.reason}
                </span>
                <span className='text-xs text-admin-muted tabular-nums whitespace-nowrap'>
                  {formatDateTime(q.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title={t('admin.details.recentActivity')}>
        <ActivityList
          items={data.recentActivity}
          locale={locale}
          emptyLabel={t('admin.details.noActivity')}
          showActor
        />
      </AdminCard>

      {configuring && (
        <ConfigureStudioModal
          studio={r}
          onClose={() => setConfiguring(false)}
          onSaved={() => {
            setConfiguring(false);
            showToast(t('admin.details.studio.saved'));
            refetch();
          }}
        />
      )}
      <AdminToast toast={toast} onClose={clearToast} />
    </div>
  );
};
