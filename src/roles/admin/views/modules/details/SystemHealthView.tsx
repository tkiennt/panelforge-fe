import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  adminDetailService,
  DependencyKey,
  HealthStatus,
  SignalKey,
} from '@/services/adminDetail.service';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminPageHeader,
  AdminTableState,
} from '../../components/AdminUi';
import { adminTable } from '../../components/adminUiStyles';
import { useLocale } from '../resources/resourceFormat';
import { formatDateTime } from './detailFormat';

const STATUS_TONE: Record<HealthStatus, 'success' | 'warning' | 'danger'> = {
  Healthy: 'success',
  Degraded: 'warning',
  Down: 'danger',
};
const STATUS_ICON: Record<HealthStatus, React.FC<{ className?: string }>> = {
  Healthy: CheckCircle2,
  Degraded: AlertTriangle,
  Down: XCircle,
};
const DEP_ICON: Record<DependencyKey, React.FC<{ className?: string }>> = {
  database: Database,
  storage: HardDrive,
  ai: Cpu,
};

/** Một việc nền kẹt hay lỗi thì Admin mở màn nào để xử lý. */
const SIGNAL_TARGET: Partial<Record<SignalKey, Record<string, string>>> = {
  aiCallsFailed24h: { tab: 'ai-config' },
  aiRunsFailed24h: { tab: 'ai-config' },
  aiRunsStuck: { tab: 'ai-config' },
  pendingQuotaRequests: { tab: 'resources', view: 'requests' },
};

export const HealthStatusBadge: React.FC<{ status: HealthStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const Icon = STATUS_ICON[status];
  return (
    <AdminBadge tone={STATUS_TONE[status]}>
      <Icon className='w-3.5 h-3.5' aria-hidden />
      {t(`admin.health.status.${status}`)}
    </AdminBadge>
  );
};

/**
 * Admin → System Health (OPS-32): gọi thử DB, kho file, service AI và đếm việc nền bị kẹt / lỗi.
 * Mỗi lần mở trang hoặc bấm "Kiểm tra lại" là một lần đo thật; tự làm mới mỗi phút khi đang mở.
 */
export const SystemHealthView: React.FC<{
  onNavigate: (params: Record<string, string>) => void;
}> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['adminSystemHealth'],
    queryFn: () => adminDetailService.getSystemHealth(),
    refetchInterval: 60_000,
  });

  return (
    <div className='space-y-6'>
      <AdminPageHeader
        title={t('admin.health.title')}
        description={t('admin.health.description')}
        actions={
          <AdminButton
            onClick={() => refetch()}
            isLoading={isFetching}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            {t('admin.health.recheck')}
          </AdminButton>
        }
      />

      {isLoading || error || !data ? (
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
      ) : (
        <>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-admin-muted'>
            <HealthStatusBadge status={data.status} />
            <span>
              {t('admin.health.checkedAt', { time: formatDateTime(data.checkedAt, locale) })}
            </span>
            <span>
              {t('admin.health.startedAt', { time: formatDateTime(data.serverStartedAt, locale) })}
            </span>
            {data.version && (
              <span className='font-mono text-xs'>
                {t('admin.health.version', { version: data.version })}
              </span>
            )}
          </div>

          <div className='grid gap-4 grid-cols-1 md:grid-cols-3'>
            {data.dependencies.map((d) => {
              const Icon = DEP_ICON[d.key] ?? Database;
              return (
                <AdminCard key={d.key}>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex items-center gap-2 min-w-0'>
                      <Icon className='w-4 h-4 text-admin-accent-text shrink-0' aria-hidden />
                      <div className='min-w-0'>
                        <div className='font-semibold text-admin-ink-strong'>
                          {t(`admin.health.dependency.${d.key}`)}
                        </div>
                        <div className='text-xs text-admin-muted truncate'>{d.provider}</div>
                      </div>
                    </div>
                    <HealthStatusBadge status={d.status} />
                  </div>
                  <dl className='mt-4 grid grid-cols-2 gap-3 text-sm'>
                    <div>
                      <dt className='text-xs text-admin-muted'>{t('admin.health.latency')}</dt>
                      <dd className='font-semibold tabular-nums'>
                        {d.latencyMs == null ? '—' : `${d.latencyMs.toLocaleString(locale)} ms`}
                      </dd>
                    </div>
                    {d.queueDepth != null && (
                      <div>
                        <dt className='text-xs text-admin-muted'>{t('admin.health.queueDepth')}</dt>
                        <dd className='font-semibold tabular-nums'>
                          {d.queueDepth.toLocaleString(locale)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {d.reason && (
                    <p className='mt-3 text-sm text-admin-ink'>
                      {t(`admin.health.reason.${d.reason}`)}
                    </p>
                  )}
                </AdminCard>
              );
            })}
          </div>

          <AdminCard
            title={t('admin.health.signalsTitle')}
            description={t('admin.health.signalsDescription')}
            bodyClassName='p-0'
          >
            {data.signals.length === 0 ? (
              <p className='p-5 text-sm text-admin-muted'>{t('admin.health.noSignals')}</p>
            ) : (
              <div className={adminTable.wrap}>
                <table className={adminTable.table}>
                  <thead className={adminTable.thead}>
                    <tr>
                      <th className={adminTable.th}>{t('admin.health.colSignal')}</th>
                      <th className={adminTable.th}>{t('admin.health.colCount')}</th>
                      <th className={adminTable.th}>{t('admin.health.colOldest')}</th>
                      <th className={`${adminTable.th} text-right`}>
                        <span className='sr-only'>{t('admin.health.colAction')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className={adminTable.tbody}>
                    {data.signals.map((s) => {
                      const target = SIGNAL_TARGET[s.key];
                      return (
                        <tr key={s.key} className={adminTable.tr}>
                          <td className={adminTable.td}>
                            <div className='font-medium'>
                              {t(`admin.health.signal.${s.key}.label`)}
                            </div>
                            <div className='text-xs text-admin-muted'>
                              {t(`admin.health.signal.${s.key}.hint`)}
                            </div>
                          </td>
                          <td className={adminTable.td}>
                            {s.warning ? (
                              <AdminBadge tone='warning'>
                                <AlertTriangle className='w-3.5 h-3.5' aria-hidden />
                                {s.count.toLocaleString(locale)}
                              </AdminBadge>
                            ) : (
                              <span className='tabular-nums'>{s.count.toLocaleString(locale)}</span>
                            )}
                          </td>
                          <td className={`${adminTable.td} tabular-nums whitespace-nowrap`}>
                            {formatDateTime(s.oldestAt, locale)}
                          </td>
                          <td className={`${adminTable.td} text-right`}>
                            {target && s.count > 0 && (
                              <AdminButton size='sm' onClick={() => onNavigate(target)}>
                                {t('admin.health.open')}
                              </AdminButton>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
};
