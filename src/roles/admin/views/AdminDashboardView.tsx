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
} from 'lucide-react';
import { adminService, SystemStatsResponse } from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { AdminButton, AdminCard, AdminPageHeader, AdminStat } from './components/AdminUi';
import { adminFocusRing } from './components/adminUiStyles';

interface AdminDashboardViewProps {
  onNavigateToUsers?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToAudit?: () => void;
  onNavigateToSessionPolicy?: () => void;
  onNavigateToStorage?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToUsers,
  onNavigateToSettings,
  onNavigateToAudit,
  onNavigateToSessionPolicy,
  onNavigateToStorage,
}) => {
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
      console.error('Lỗi khi tải thống kê admin:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const value = (n?: number) => (stats ? (n ?? 0).toLocaleString('vi-VN') : loading ? '…' : '—');

  const shortcuts = [
    {
      label: 'Người dùng & quyền',
      desc: 'Cấp hoặc thu hồi quyền tạo Studio',
      icon: Users,
      onClick: onNavigateToUsers,
    },
    {
      label: 'Cấu hình AI',
      desc: 'Model, quota và lịch sử sử dụng AI',
      icon: Cpu,
      onClick: onNavigateToSettings,
    },
    {
      label: 'Lưu trữ & quota',
      desc: 'Dung lượng và hạn mức từng Studio',
      icon: HardDrive,
      onClick: onNavigateToStorage,
    },
    {
      label: 'Chính sách phiên',
      desc: 'Thời hạn phiên, idle timeout, số thiết bị',
      icon: Shield,
      onClick: onNavigateToSessionPolicy,
    },
    {
      label: 'Nhật ký hệ thống',
      desc: 'Tra cứu và xuất lịch sử thao tác',
      icon: List,
      onClick: onNavigateToAudit,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title='Tổng quan hệ thống'
        actions={
          <>
            {lastRefreshed && (
              <span className='text-xs text-admin-muted tabular-nums'>
                Cập nhật lúc {lastRefreshed.toLocaleTimeString('vi-VN')}
              </span>
            )}
            <AdminButton
              onClick={fetchStats}
              isLoading={loading}
              icon={<RefreshCw className='w-4 h-4' />}
            >
              Làm mới
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
            Không tải được số liệu hệ thống.
          </span>
          <AdminButton size='sm' variant='danger' onClick={fetchStats}>
            Thử lại
          </AdminButton>
        </div>
      )}

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
        <AdminStat
          label='Tổng người dùng'
          value={value(stats?.totalUsers)}
          icon={<Users className='w-5 h-5' />}
        />
        <AdminStat
          label='Người dùng thường'
          value={value(stats?.registeredUsers)}
          icon={<UserCheck className='w-5 h-5' />}
        />
        <AdminStat
          label='Quản trị viên'
          value={value(stats?.admins)}
          icon={<Shield className='w-5 h-5' />}
        />
        <AdminStat
          label='Studio'
          value={value(stats?.totalWorkspaces)}
          hint={
            stats ? `${stats.totalWorkspaceMembers.toLocaleString('vi-VN')} thành viên` : undefined
          }
          icon={<Layers className='w-5 h-5' />}
        />
      </div>

      <AdminCard title='Tác vụ quản trị' bodyClassName='p-2'>
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
