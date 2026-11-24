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
} from 'lucide-react';
import { adminService, SystemStatsResponse } from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminCard, AdminPageHeader, AdminStat } from './components/AdminUi';
import { adminFocusRing } from './components/adminUiStyles';

interface AdminDashboardViewProps {
  onNavigateToUsers?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToAudit?: () => void;
  onNavigateToSessionPolicy?: () => void;
  onNavigateToStorage?: () => void;
  onNavigateToAnalytics?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToUsers,
  onNavigateToSettings,
  onNavigateToAudit,
  onNavigateToSessionPolicy,
  onNavigateToStorage,
  onNavigateToAnalytics,
}) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const [stats, setStats] = useState<SystemStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.getSystemStats();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

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
