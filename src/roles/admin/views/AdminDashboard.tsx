import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Eye,
  type LucideIcon,
} from 'lucide-react';
import { SidebarDrawer } from '@/shared/components/SidebarDrawer';
import { BrandMark } from '@/shared/components/BrandMark';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminUserManagementView } from './AdminUserManagementView';
import { AdminAuditLogView } from './AdminAuditLogView';
import { AIConfigurationView } from './modules/AIConfigurationView';
import { StorageBackupSettings } from './modules/StorageBackupSettings';
import { SessionPolicySettings } from './modules/SessionPolicySettings';
import { ReaderStatsView } from '@/shared/views/ReaderStatsView';
import { adminFocusRing } from './components/adminUiStyles';

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'master-data'
  | 'ai-config'
  | 'storage'
  | 'session-policy'
  | 'audit'
  | 'analytics';

interface AdminDashboardProps {
  onLogout?: () => void;
  currentUser?: {
    name?: string;
    email?: string;
    role?: string;
  };
}

const NAV_GROUPS: {
  labelKey: string;
  items: { id: AdminTab; labelKey: string; icon: LucideIcon }[];
}[] = [
  {
    labelKey: 'admin.nav.groups.overview',
    items: [
      { id: 'dashboard', labelKey: 'admin.nav.items.dashboard', icon: LayoutDashboard },
      { id: 'users', labelKey: 'admin.nav.items.users', icon: Users },
    ],
  },
  {
    labelKey: 'admin.nav.groups.config',
    items: [
      { id: 'ai-config', labelKey: 'admin.nav.items.aiConfig', icon: Cpu },
      { id: 'storage', labelKey: 'admin.nav.items.storage', icon: HardDrive },
      { id: 'session-policy', labelKey: 'admin.nav.items.sessionPolicy', icon: Shield },
      // ponytail: 'master-data' hidden — MasterDataSettings is local mock data only;
      // re-add once wired to /api/Admin/pipeline-templates, element-types, export-presets.
    ],
  },
  {
    labelKey: 'admin.nav.groups.monitoring',
    items: [
      { id: 'audit', labelKey: 'admin.nav.items.audit', icon: List },
      { id: 'analytics', labelKey: 'admin.nav.items.analytics', icon: Eye },
    ],
  },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const VALID_TABS: AdminTab[] = [
  'dashboard',
  'users',
  'master-data',
  'ai-config',
  'storage',
  'session-policy',
  'audit',
  'analytics',
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'dashboard';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('dashboard');
    }
  }, [tabParam]);

  const activeItem = NAV_ITEMS.find((i) => i.id === activeTab);
  const activeLabel = activeItem ? t(activeItem.labelKey) : '';
  const displayName = currentUser?.name || 'Administrator';
  const initial = (currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase();

  const go = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'dashboard') {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        return next;
      },
      { replace: true },
    );
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
              <div className='text-xs text-admin-muted'>{t('admin.nav.subtitle')}</div>
            </div>
          )}
        </div>

        <nav
          className='flex-1 overflow-y-auto px-3 py-4 space-y-5'
          aria-label={t('admin.nav.ariaLabel')}
        >
          {NAV_GROUPS.map((group) => {
            const groupLabel = t(group.labelKey);
            return (
              <div key={group.labelKey} className='space-y-1'>
                {compact ? (
                  <div className='mx-3 mb-2 border-t border-admin-line' aria-hidden />
                ) : (
                  <div className='px-3 pb-1 text-xs font-semibold text-admin-muted'>
                    {groupLabel}
                  </div>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const itemLabel = t(item.labelKey);
                  return (
                    <button
                      key={item.id}
                      type='button'
                      onClick={() => go(item.id)}
                      title={compact ? itemLabel : undefined}
                      aria-label={compact ? itemLabel : undefined}
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
                      {!compact && <span className='truncate'>{itemLabel}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
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
              title={compact ? t('admin.nav.logout') : undefined}
              aria-label={t('admin.nav.logout')}
              className={cn(
                'w-full min-h-11 flex items-center gap-2 rounded-xl text-sm font-medium text-admin-ink hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer',
                adminFocusRing,
                compact ? 'justify-center' : 'px-3',
              )}
            >
              <LogOut className='w-4 h-4 shrink-0' aria-hidden />
              {!compact && <span>{t('admin.nav.logout')}</span>}
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
        title={t('admin.nav.ariaLabel')}
      >
        {renderSidebar(true)}
      </SidebarDrawer>

      {renderSidebar(false)}

      <div className='flex-1 flex flex-col min-w-0 overflow-hidden'>
        <header className='h-16 shrink-0 flex items-center gap-2 px-4 md:px-6 border-b border-admin-line bg-admin-card'>
          <button
            type='button'
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label={t('admin.nav.openMenu')}
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
            aria-label={isCollapsed ? t('admin.nav.expandSidebar') : t('admin.nav.collapseSidebar')}
            title={isCollapsed ? t('admin.nav.expandSidebar') : t('admin.nav.collapseSidebar')}
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
              <li className='text-admin-muted'>{t('admin.nav.breadcrumbRoot')}</li>
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
                onNavigateToAnalytics={() => go('analytics')}
              />
            )}
            {activeTab === 'users' && <AdminUserManagementView />}
            {activeTab === 'ai-config' && <AIConfigurationView />}
            {activeTab === 'storage' && <StorageBackupSettings />}
            {activeTab === 'session-policy' && <SessionPolicySettings />}
            {activeTab === 'audit' && <AdminAuditLogView />}
            {activeTab === 'analytics' && <ReaderStatsView />}
          </div>
        </main>
      </div>
    </div>
  );
};
