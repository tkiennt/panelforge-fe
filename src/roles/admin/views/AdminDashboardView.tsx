import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  Cpu,
  Layers,
  RefreshCw,
  HardDrive,
  List,
  UserCheck,
  ChevronRight,
  AlertCircle,
  Eye,
  Inbox,
} from 'lucide-react';
import { adminService, SystemStatsResponse } from '@/services/admin.service';
import { formatBytes, quotaService, AdminResourceOverviewDto } from '@/services/quota.service';
import { HealthBadge } from './modules/resources/ResourceUi';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminCard, AdminPageHeader, AdminStat } from './components/AdminUi';
import { adminFocusRing } from './components/adminUiStyles';
import { EmailHealthAlert } from './modules/EmailHealthAlert';

interface AdminDashboardViewProps {
  onNavigateToUsers?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToAudit?: () => void;
  onNavigateToSessionPolicy?: () => void;
  onNavigateToStorage?: () => void;
  onNavigateToAnalytics?: () => void;
  /** Mở Tài nguyên với query phụ (view=requests, filter=attention…). */
  onNavigateToResources?: (extra?: Record<string, string>) => void;
  onNavigateToEmailSettings?: () => void;
  onNavigateToEmailLogs?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToUsers,
  onNavigateToSettings,
  onNavigateToAudit,
  onNavigateToSessionPolicy,
  onNavigateToStorage,
  onNavigateToAnalytics,
  onNavigateToResources,
  onNavigateToEmailSettings,
  onNavigateToEmailLogs,
}) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [stats, setStats] = useState<SystemStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [resources, setResources] = useState<AdminResourceOverviewDto | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    // Hai nguồn độc lập: một bên lỗi vẫn hiện bên còn lại.
    const [statsResult, resourceResult] = await Promise.allSettled([
      adminService.getSystemStats(),
      quotaService.getResources(),
    ]);
    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    if (resourceResult.status === 'fulfilled') setResources(resourceResult.value);
    if (statsResult.status === 'rejected' || resourceResult.status === 'rejected') {
      console.error('Failed to load admin overview:', statsResult, resourceResult);
      setError(true);
    } else {
      setLastRefreshed(new Date());
    }
    setLoading(false);
  }, []);

  const attention = (resources?.studios ?? [])
    .filter((s) => s.health !== 'Ok')
    .sort((a, b) => (a.health === b.health ? 0 : a.health === 'Exhausted' ? -1 : 1))
    .slice(0, 6);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const value = (n?: number) => (stats ? (n ?? 0).toLocaleString(locale) : loading ? '…' : '—');

  const shortcuts = [
    {
      label: t('admin.overview.shortcuts.users.label'),
      desc: t('admin.overview.shortcuts.users.desc'),
      icon: Users,
      onClick: onNavigateToUsers,
    },
    {
      label: t('admin.overview.shortcuts.aiConfig.label'),
      desc: t('admin.overview.shortcuts.aiConfig.desc'),
      icon: Cpu,
      onClick: onNavigateToSettings,
    },
    {
      label: t('admin.overview.shortcuts.storage.label'),
      desc: t('admin.overview.shortcuts.storage.desc'),
      icon: HardDrive,
      onClick: onNavigateToStorage,
    },
    {
      label: t('admin.overview.shortcuts.sessionPolicy.label'),
      desc: t('admin.overview.shortcuts.sessionPolicy.desc'),
      icon: Shield,
      onClick: onNavigateToSessionPolicy,
    },
    {
      label: t('admin.overview.shortcuts.audit.label'),
      desc: t('admin.overview.shortcuts.audit.desc'),
      icon: List,
      onClick: onNavigateToAudit,
    },
    {
      label: t('admin.overview.shortcuts.analytics.label'),
      desc: t('admin.overview.shortcuts.analytics.desc'),
      icon: Eye,
      onClick: onNavigateToAnalytics,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('admin.overview.title')}
        actions={
          <>
            {lastRefreshed && (
              <span className='text-xs text-admin-muted tabular-nums'>
                {t('admin.overview.updatedAt', { time: lastRefreshed.toLocaleTimeString(locale) })}
              </span>
            )}
            <AdminButton
              onClick={fetchStats}
              isLoading={loading}
              icon={<RefreshCw className='w-4 h-4' />}
            >
              {t('admin.overview.refresh')}
            </AdminButton>
          </>
        }
      />

      {error && (
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-red-200 bg-red-50 text-sm text-red-800'
        >
          <span className='flex items-center gap-2'>
            <AlertCircle className='w-4 h-4 shrink-0' aria-hidden />
            {t('admin.overview.errorLoading')}
          </span>
          <AdminButton size='sm' variant='danger' onClick={fetchStats}>
            {t('admin.overview.retry')}
          </AdminButton>
        </div>
      )}

      <EmailHealthAlert
        onOpenSettings={onNavigateToEmailSettings}
        onOpenLogs={onNavigateToEmailLogs}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <AdminStat
          label={t('admin.overview.totalUsers')}
          value={value(stats?.totalUsers)}
          icon={<Users className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.overview.registeredUsers')}
          value={value(stats?.registeredUsers)}
          icon={<UserCheck className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.overview.admins')}
          value={value(stats?.admins)}
          icon={<Shield className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.overview.studios')}
          value={value(stats?.totalWorkspaces)}
          hint={
            stats
              ? t('admin.overview.membersCount', {
                  count: stats.totalWorkspaceMembers.toLocaleString(locale),
                })
              : undefined
          }
          icon={<Layers className='w-5 h-5' />}
        />
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <AdminStat
          label={t('admin.overview.resources.storageUsed')}
          value={resources ? formatBytes(resources.totalStorageUsedBytes, locale) : value()}
          icon={<HardDrive className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.overview.resources.tokensMonth')}
          value={resources ? resources.totalTokensUsedThisMonth.toLocaleString(locale) : value()}
          hint={
            resources
              ? t('admin.overview.resources.imagesMonth', {
                  count: resources.totalImagesThisMonth.toLocaleString(locale),
                })
              : undefined
          }
          icon={<Cpu className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.overview.resources.attention')}
          value={
            resources
              ? (resources.nearLimitStudios + resources.exhaustedStudios).toLocaleString(locale)
              : value()
          }
          icon={<AlertCircle className='w-5 h-5' />}
        />
        <AdminStat
          label={t('admin.overview.resources.pendingRequests')}
          value={resources ? resources.pendingRequests.toLocaleString(locale) : value()}
          icon={<Inbox className='w-5 h-5' />}
        />
      </div>

      <AdminCard
        title={t('admin.overview.attention.title')}
        actions={
          <AdminButton size='sm' onClick={() => onNavigateToResources?.({ filter: 'attention' })}>
            {t('admin.overview.attention.viewAll')}
          </AdminButton>
        }
        bodyClassName='p-2'
      >
        {!resources ? (
          <p className='px-3 py-4 text-sm text-admin-muted'>
            {loading ? t('admin.overview.attention.loading') : '—'}
          </p>
        ) : attention.length === 0 && resources.pendingRequests === 0 ? (
          <p className='px-3 py-4 text-sm text-admin-muted'>{t('admin.overview.attention.none')}</p>
        ) : (
          <ul className='divide-y divide-admin-line'>
            {resources.pendingRequests > 0 && (
              <li>
                <button
                  type='button'
                  onClick={() => onNavigateToResources?.({ view: 'requests' })}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm hover:bg-admin-hover cursor-pointer',
                    adminFocusRing,
                  )}
                >
                  <Inbox className='w-4 h-4 text-admin-accent-text shrink-0' aria-hidden />
                  <span className='flex-1 min-w-0'>
                    {t('admin.overview.attention.pending', { count: resources.pendingRequests })}
                  </span>
                  <ChevronRight className='w-4 h-4 text-admin-muted shrink-0' aria-hidden />
                </button>
              </li>
            )}
            {attention.map((s) => (
              <li key={s.workspaceId}>
                <button
                  type='button'
                  onClick={() => onNavigateToResources?.({ filter: 'attention' })}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm hover:bg-admin-hover cursor-pointer',
                    adminFocusRing,
                  )}
                >
                  <HealthBadge health={s.health} />
                  <span className='flex-1 min-w-0 truncate font-medium' title={s.name}>
                    {s.name}
                  </span>
                  <span className='text-xs text-admin-muted tabular-nums shrink-0'>
                    {[
                      s.storage.percentUsed != null &&
                        `${t('admin.overview.attention.storage')} ${Math.round(s.storage.percentUsed)}%`,
                      s.aiTokens?.percentUsed != null &&
                        `${t('admin.overview.attention.tokens')} ${Math.round(s.aiTokens.percentUsed)}%`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  <ChevronRight className='w-4 h-4 text-admin-muted shrink-0' aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard title={t('admin.overview.actionsTitle')} bodyClassName='p-2'>
        <ul className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-1'>
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.label}>
                <button
                  type='button'
                  onClick={s.onClick}
                  className={cn(
                    'w-full min-h-16 flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-admin-hover transition-colors cursor-pointer group',
                    adminFocusRing,
                  )}
                >
                  <span className='w-10 h-10 rounded-xl bg-admin-accent-soft text-admin-accent-text flex items-center justify-center shrink-0'>
                    <Icon className='w-5 h-5' aria-hidden />
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block text-sm font-semibold text-admin-ink-strong'>
                      {s.label}
                    </span>
                    <span className='block text-sm text-admin-muted'>{s.desc}</span>
                  </span>
                  <ChevronRight
                    className='w-4 h-4 text-admin-muted group-hover:text-admin-accent-text shrink-0'
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </AdminCard>
    </>
  );
};
