import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cpu, HardDrive, Inbox, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  AdminResourceOverviewDto,
  AdminWorkspaceResourceDto,
  formatBytes,
  quotaService,
} from '@/services/quota.service';
import { StorageReconcileCard } from '../StorageReconcileCard';
import {
  AdminBadge,
  AdminButton,
  AdminPageHeader,
  AdminStat,
  AdminTableState,
  AdminToast,
} from '../../components/AdminUi';
import {
  adminFieldClass,
  adminFocusRing,
  adminTable,
  useAdminToast,
} from '../../components/adminUiStyles';
import { HealthBadge, UsageBar } from './ResourceUi';
import { useLocale } from './resourceFormat';
import { ConfigureStudioModal } from './ConfigureStudioModal';
import { ResourcePolicyPanel } from './ResourcePolicyPanel';
import { ResourceRequestsPanel } from './ResourceRequestsPanel';

type View = 'allocation' | 'policy' | 'requests' | 'reconcile';
const VIEWS: View[] = ['allocation', 'policy', 'requests', 'reconcile'];
type HealthFilter = 'all' | 'attention';
const COLS = 8;

/**
 * Admin → Tài nguyên: cấp phát Storage + AI theo Studio, chính sách mặc định, duyệt yêu cầu tăng tài nguyên.
 * Tab Đối soát: quét kho file, tính lại dung lượng, xoá file mồ côi (OPS-22).
 * Thay màn "Lưu trữ & quota" cũ (?tab=storage chuyển hướng về đây) để không còn hai nơi sửa quota.
 */
export const ResourcesView: React.FC = () => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [params, setParams] = useSearchParams();
  const viewParam = params.get('view') as View | null;
  const view: View = viewParam && VIEWS.includes(viewParam) ? viewParam : 'allocation';
  const healthFilter: HealthFilter = params.get('filter') === 'attention' ? 'attention' : 'all';

  const [overview, setOverview] = useState<AdminResourceOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<AdminWorkspaceResourceDto | null>(null);
  const { toast, show: showToast, clear: clearToast } = useAdminToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await quotaService.getResources());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setParam = (key: string, value: string | null) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  const studios = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (overview?.studios ?? []).filter(
      (s) =>
        (healthFilter === 'all' || s.health !== 'Ok' || s.pendingRequestCount > 0) &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q) ||
          s.ownerEmail.toLowerCase().includes(q)),
    );
  }, [overview, search, healthFilter]);

  const warn = overview?.warningThresholdPercent ?? 80;
  const statValue = (v: string | number | undefined) => (overview ? v : loading ? '…' : '—');

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />
      <AdminPageHeader
        title={t('admin.resources.title')}
        description={t('admin.resources.description')}
        actions={
          <AdminButton onClick={load} isLoading={loading} icon={<RefreshCw className='w-4 h-4' />}>
            {t('admin.resources.refresh')}
          </AdminButton>
        }
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <AdminStat
          label={t('admin.resources.stats.storageUsed')}
          value={statValue(overview && formatBytes(overview.totalStorageUsedBytes, locale))}
          hint={t('admin.resources.stats.storageHint')}
          icon={<HardDrive className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.resources.stats.tokensMonth')}
          value={statValue(overview?.totalTokensUsedThisMonth.toLocaleString(locale))}
          hint={
            overview
              ? t('admin.resources.stats.aiEnabledHint', {
                  enabled: overview.aiEnabledStudios,
                  total: overview.totalStudios,
                })
              : undefined
          }
          icon={<Cpu className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.resources.stats.attention')}
          value={statValue(
            overview &&
              (overview.nearLimitStudios + overview.exhaustedStudios).toLocaleString(locale),
          )}
          hint={
            overview
              ? t('admin.resources.stats.attentionHint', {
                  near: overview.nearLimitStudios,
                  exhausted: overview.exhaustedStudios,
                })
              : undefined
          }
          icon={<AlertTriangle className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.resources.stats.pendingRequests')}
          value={statValue(overview?.pendingRequests.toLocaleString(locale))}
          icon={<Inbox className='w-5 h-5' />}
        />
      </div>

      <div
        role='tablist'
        aria-label={t('admin.resources.tabsAria')}
        className='flex flex-wrap gap-1 p-1 bg-admin-card border border-admin-line rounded-xl w-fit max-w-full'
      >
        {VIEWS.map((v) => (
          <button
            key={v}
            type='button'
            role='tab'
            aria-selected={view === v}
            onClick={() => setParam('view', v === 'allocation' ? null : v)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
              adminFocusRing,
              view === v
                ? 'bg-admin-accent-soft text-admin-accent-text'
                : 'text-admin-muted hover:bg-admin-hover',
            )}
          >
            {t(`admin.resources.tabs.${v}`)}
            {v === 'requests' && !!overview?.pendingRequests && (
              <span className='ml-1.5 tabular-nums'>({overview.pendingRequests})</span>
            )}
          </button>
        ))}
      </div>

      {view === 'policy' && <ResourcePolicyPanel onSaved={(m) => showToast(m)} />}

      {view === 'reconcile' && <StorageReconcileCard onApplied={load} />}

      {view === 'requests' && (
        <ResourceRequestsPanel
          onReviewed={(m) => {
            showToast(m);
            load();
          }}
        />
      )}

      {view === 'allocation' && (
        <div className='bg-admin-card rounded-2xl border border-admin-line overflow-hidden'>
          <div className='flex flex-wrap items-center gap-3 px-5 py-3 border-b border-admin-line'>
            <div className='relative w-full sm:max-w-xs'>
              <Search
                className='w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
                aria-hidden
              />
              <input
                type='search'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.resources.allocation.searchPlaceholder')}
                aria-label={t('admin.resources.allocation.searchPlaceholder')}
                className={cn(adminFieldClass, 'pl-9')}
              />
            </div>
            <select
              value={healthFilter}
              onChange={(e) => setParam('filter', e.target.value === 'all' ? null : e.target.value)}
              aria-label={t('admin.resources.allocation.filterAria')}
              className={cn(adminFieldClass, 'w-auto')}
            >
              <option value='all'>{t('admin.resources.allocation.filterAll')}</option>
              <option value='attention'>{t('admin.resources.allocation.filterAttention')}</option>
            </select>
            <span className='text-sm text-admin-muted sm:ml-auto tabular-nums'>
              {t('admin.resources.allocation.count', {
                filtered: studios.length,
                total: overview?.studios.length ?? 0,
              })}
            </span>
          </div>
          <div className={adminTable.wrap}>
            <table className={adminTable.table}>
              <thead className={adminTable.thead}>
                <tr>
                  <th className={adminTable.th}>{t('admin.resources.allocation.colStudio')}</th>
                  <th className={adminTable.th}>{t('admin.resources.allocation.colStorage')}</th>
                  <th className={adminTable.th}>{t('admin.resources.allocation.colTokens')}</th>
                  <th className={adminTable.th}>{t('admin.resources.allocation.colImages')}</th>
                  <th className={adminTable.th}>{t('admin.resources.allocation.colRequests')}</th>
                  <th className={adminTable.th}>{t('admin.resources.allocation.colReset')}</th>
                  <th className={adminTable.th}>{t('admin.resources.allocation.colStatus')}</th>
                  <th className={`${adminTable.th} text-right`}>
                    {t('admin.resources.allocation.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className={adminTable.tbody}>
                {loading && !overview ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='loading'
                    message={t('admin.resources.loading')}
                  />
                ) : error ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='error'
                    message={error}
                    action={
                      <AdminButton size='sm' onClick={load}>
                        {t('admin.resources.retry')}
                      </AdminButton>
                    }
                  />
                ) : !overview?.studios.length ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='empty'
                    message={t('admin.resources.allocation.empty')}
                  />
                ) : studios.length === 0 ? (
                  <AdminTableState
                    colSpan={COLS}
                    kind='no-results'
                    message={t('admin.resources.allocation.noResults')}
                    action={
                      <AdminButton
                        size='sm'
                        onClick={() => {
                          setSearch('');
                          setParam('filter', null);
                        }}
                      >
                        {t('admin.resources.allocation.clearFilters')}
                      </AdminButton>
                    }
                  />
                ) : (
                  studios.map((s) => (
                    <tr key={s.workspaceId} className={adminTable.tr}>
                      <td className={cn(adminTable.td, 'max-w-[260px]')}>
                        <button
                          type='button'
                          onClick={() => setParam('studio', s.workspaceId)}
                          className={cn(
                            'block max-w-full font-semibold text-admin-ink-strong truncate text-left hover:text-admin-accent-text hover:underline rounded',
                            adminFocusRing,
                          )}
                          title={t('admin.resources.allocation.openDetail', { name: s.name })}
                        >
                          {s.name}
                        </button>
                        <div className='text-xs text-admin-muted truncate' title={s.ownerEmail}>
                          {s.ownerName || s.ownerEmail}
                        </div>
                        <div className='text-xs text-admin-muted tabular-nums'>
                          {t('admin.resources.allocation.membersSeries', {
                            members: s.memberCount,
                            series: s.seriesCount,
                          })}
                        </div>
                      </td>
                      <td className={adminTable.td}>
                        <UsageBar
                          meter={s.storage}
                          type='Storage'
                          warningPercent={warn}
                          label={t('admin.resources.allocation.storageAria', { name: s.name })}
                        />
                      </td>
                      <td className={adminTable.td}>
                        {!s.aiEnabled ? (
                          <AdminBadge>{t('admin.resources.aiDisabled')}</AdminBadge>
                        ) : s.aiTokens ? (
                          <UsageBar
                            meter={s.aiTokens}
                            type='AiTokens'
                            warningPercent={warn}
                            label={t('admin.resources.allocation.tokensAria', { name: s.name })}
                          />
                        ) : (
                          <span className='text-admin-muted text-sm'>—</span>
                        )}
                      </td>
                      <td className={adminTable.td}>
                        {s.aiEnabled && s.aiImages ? (
                          <UsageBar
                            meter={s.aiImages}
                            type='AiImages'
                            warningPercent={warn}
                            label={t('admin.resources.allocation.imagesAria', { name: s.name })}
                          />
                        ) : (
                          <span className='text-admin-muted text-sm'>—</span>
                        )}
                      </td>
                      <td className={adminTable.td}>
                        {s.aiEnabled && s.aiRequests ? (
                          <>
                            <UsageBar
                              meter={s.aiRequests}
                              type='AiTokens'
                              warningPercent={warn}
                              label={t('admin.resources.allocation.requestsAria', { name: s.name })}
                            />
                            <div className='mt-1 text-xs text-admin-muted tabular-nums'>
                              {s.requestsPerMinuteLimit
                                ? t('admin.resources.allocation.perMinute', {
                                    count: s.requestsPerMinuteLimit,
                                  })
                                : t('admin.resources.allocation.perMinuteUnlimited')}
                            </div>
                          </>
                        ) : (
                          <span className='text-admin-muted text-sm'>—</span>
                        )}
                      </td>
                      <td className={`${adminTable.td} text-sm tabular-nums whitespace-nowrap`}>
                        {new Date(s.aiNextResetAt).toLocaleDateString(locale)}
                      </td>
                      <td className={adminTable.td}>
                        <div className='flex flex-col items-start gap-1'>
                          <HealthBadge health={s.health} />
                          {s.pendingRequestCount > 0 && (
                            <button
                              type='button'
                              onClick={() => setParam('view', 'requests')}
                              className={cn(
                                'text-xs text-admin-accent-text underline',
                                adminFocusRing,
                              )}
                            >
                              {t('admin.resources.allocation.pendingLink', {
                                count: s.pendingRequestCount,
                              })}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className={`${adminTable.td} text-right`}>
                        <AdminButton size='sm' onClick={() => setEditing(s)}>
                          {t('admin.resources.allocation.configure')}
                        </AdminButton>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <ConfigureStudioModal
          studio={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            showToast(t('admin.resources.configure.saved', { name: editing.name }));
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
};
