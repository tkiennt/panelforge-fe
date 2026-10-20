import React, { useState } from 'react';
import {
  Users,
  Shield,
  Cpu,
  List,
  HardDrive,
  LogOut,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { SidebarDrawer } from '@/shared/components/SidebarDrawer';
import { BrandMark } from '@/shared/components/BrandMark';
import { cn } from '@/lib/utils';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminUserManagementView } from './AdminUserManagementView';
import { AdminAuditLogView } from './AdminAuditLogView';
import { AIConfigurationView } from './modules/AIConfigurationView';
import { StorageBackupSettings } from './modules/StorageBackupSettings';
import { SessionPolicySettings } from './modules/SessionPolicySettings';
import { adminFocusRing } from './components/adminUiStyles';

export type AdminTab =
  'dashboard' | 'users' | 'master-data' | 'ai-config' | 'storage' | 'session-policy' | 'audit';

interface AdminDashboardProps {
  onLogout?: () => void;
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

const NAV_GROUPS: { label: string; items: { id: AdminTab; label: string; icon: LucideIcon }[] }[] =
  [
    {
      label: 'Tổng quan',
      items: [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'users', label: 'Người dùng & quyền', icon: Users },
      ],
    },
    {
      label: 'Cấu hình',
      items: [
        { id: 'ai-config', label: 'Cấu hình AI', icon: Cpu },
        { id: 'storage', label: 'Lưu trữ & quota', icon: HardDrive },
        { id: 'session-policy', label: 'Chính sách phiên', icon: Shield },
        // ponytail: 'master-data' hidden — MasterDataSettings is local mock data only;
        // re-add once wired to /api/Admin/pipeline-templates, element-types, export-presets.
      ],
    },
    {
      label: 'Giám sát',
      items: [{ id: 'audit', label: 'Nhật ký hệ thống', icon: List }],
    },
  ];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeLabel = NAV_ITEMS.find((i) => i.id === activeTab)?.label ?? '';
  const displayName = currentUser?.name || 'Administrator';
  const initial = (currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase();

  const go = (tab: AdminTab) => {
    setActiveTab(tab);
    setIsMobileDrawerOpen(false);
  };

  const renderSidebar = (isDrawer: boolean) => {
    const compact = !isDrawer && isCollapsed;
    return (
      <aside
        className={cn(
          'flex-col h-full select-none bg-admin-card text-admin-ink',
          isDrawer
            ? 'flex w-full'
            : cn(
                'hidden md:flex shrink-0 border-r border-admin-line transition-[width] duration-200',
                compact ? 'w-[76px]' : 'w-64',
              ),
        )}
        data-testid={isDrawer ? 'admin-mobile-sidebar' : 'admin-sidebar'}
      >
        <div
          className={cn(
            'h-16 flex items-center gap-3 border-b border-admin-line shrink-0',
            compact ? 'justify-center px-2' : 'px-4',
          )}
        >
          <BrandMark size={30} />
          {!compact && (
            <div className='min-w-0'>
              <div className='font-serif font-bold text-base text-admin-ink-strong leading-tight'>
                PanelForge
              </div>
              <div className='text-xs text-admin-muted'>Quản trị hệ thống</div>
            </div>
          )}
        </div>

        <nav
          className='flex-1 overflow-y-auto px-3 py-4 space-y-5'
          aria-label='Điều hướng quản trị'
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className='space-y-1'>
              {compact ? (
                <div className='mx-3 mb-2 border-t border-admin-line' aria-hidden />
              ) : (
                <div className='px-3 pb-1 text-xs font-semibold text-admin-muted'>
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => go(item.id)}
                    title={compact ? item.label : undefined}
                    aria-label={compact ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative w-full min-h-11 flex items-center gap-3 rounded-xl text-sm transition-colors cursor-pointer',
                      adminFocusRing,
                      compact ? 'justify-center px-0' : 'px-3',
                      isActive
                        ? 'bg-admin-accent-soft text-admin-ink-strong font-semibold'
                        : 'text-admin-ink hover:bg-admin-hover',
                    )}
                  >
                    {isActive && (
                      <span
                        className='absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-admin-accent'
                        aria-hidden
                      />
                    )}
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] shrink-0',
                        isActive ? 'text-admin-accent-text' : 'text-admin-muted',
                      )}
                      aria-hidden
                    />
                    {!compact && <span className='truncate'>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className='border-t border-admin-line p-3 space-y-2 shrink-0'>
          <div className={cn('flex items-center gap-3', compact ? 'justify-center' : 'px-1')}>
            <div
              className='w-9 h-9 rounded-full bg-admin-accent-soft border border-[#fdba74] text-admin-accent-text flex items-center justify-center font-semibold text-sm shrink-0'
              title={compact ? displayName : undefined}
              aria-hidden
            >
              {initial}
            </div>
            {!compact && (
              <div className='min-w-0'>
                <div className='text-sm font-semibold text-admin-ink-strong truncate'>
                  {displayName}
                </div>
                {currentUser?.email && (
                  <div className='text-xs text-admin-muted truncate' title={currentUser.email}>
                    {currentUser.email}
                  </div>
                )}
              </div>
            )}
          </div>
          {onLogout && (
            <button
              type='button'
              onClick={() => {
                setIsMobileDrawerOpen(false);
                onLogout();
              }}
              title={compact ? 'Đăng xuất' : undefined}
              aria-label='Đăng xuất'
              className={cn(
                'w-full min-h-11 flex items-center gap-2 rounded-xl text-sm font-medium text-admin-ink hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer',
                adminFocusRing,
                compact ? 'justify-center' : 'px-3',
              )}
            >
              <LogOut className='w-4 h-4 shrink-0' aria-hidden />
              {!compact && <span>Đăng xuất</span>}
            </button>
          )}
        </div>
      </aside>
    );
  };

  return (
    <div className='flex h-screen w-full bg-admin-bg text-admin-ink font-sans overflow-hidden antialiased'>
      <SidebarDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        title='Điều hướng quản trị'
      >
        {renderSidebar(true)}
      </SidebarDrawer>

      {renderSidebar(false)}

      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <header className='h-16 shrink-0 flex items-center gap-2 px-4 md:px-6 border-b border-admin-line bg-admin-card'>
          <button
            type='button'
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label='Mở menu điều hướng'
            aria-expanded={isMobileDrawerOpen}
            className={cn(
              'md:hidden h-11 w-11 -ml-2 inline-flex items-center justify-center rounded-xl text-admin-ink hover:bg-admin-hover cursor-pointer',
              adminFocusRing,
            )}
            data-testid='admin-hamburger-btn'
          >
            <Menu className='w-5 h-5' />
          </button>
          <button
            type='button'
            onClick={() => setIsCollapsed((v) => !v)}
            aria-label={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            className={cn(
              'hidden md:inline-flex h-11 w-11 -ml-2 items-center justify-center rounded-xl text-admin-muted hover:text-admin-ink hover:bg-admin-hover cursor-pointer',
              adminFocusRing,
            )}
            data-testid='admin-rail-toggle-btn'
          >
            {isCollapsed ? (
              <PanelLeftOpen className='w-5 h-5' />
            ) : (
              <PanelLeftClose className='w-5 h-5' />
            )}
          </button>
          <nav aria-label='Breadcrumb' className='min-w-0'>
            <ol className='flex items-center gap-1.5 text-sm'>
              <li className='text-admin-muted'>Quản trị</li>
              <li aria-hidden>
                <ChevronRight className='w-4 h-4 text-admin-muted' />
              </li>
              <li className='font-semibold text-admin-ink-strong truncate' aria-current='page'>
                {activeLabel}
              </li>
            </ol>
          </nav>
        </header>

        <main className='flex-1 overflow-y-auto custom-scrollbar'>
          <div className='w-full max-w-[1600px] mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6'>
            {activeTab === 'dashboard' && (
              <AdminDashboardView
                onNavigateToUsers={() => go('users')}
                onNavigateToSettings={() => go('ai-config')}
                onNavigateToAudit={() => go('audit')}
                onNavigateToSessionPolicy={() => go('session-policy')}
                onNavigateToStorage={() => go('storage')}
              />
            )}
            {activeTab === 'users' && <AdminUserManagementView />}
            {activeTab === 'ai-config' && <AIConfigurationView />}
            {activeTab === 'storage' && <StorageBackupSettings />}
            {activeTab === 'session-policy' && <SessionPolicySettings />}
            {activeTab === 'audit' && <AdminAuditLogView />}
          </div>
        </main>
      </div>
    </div>
  );
};
