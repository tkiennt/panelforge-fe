import React, { useState } from 'react';
import {
  Users,
  Shield,
  Cpu,
  Database,
  List,
  HardDrive,
  LogOut,
  AlertTriangle,
  Layers,
  ChevronRight,
  Server,
  Lock,
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  Clock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { SidebarDrawer } from '@/shared/components/SidebarDrawer';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminUserManagementView } from './AdminUserManagementView';
import { AdminSystemSettingsView } from './AdminSystemSettingsView';
import { AdminAuditLogView } from './AdminAuditLogView';
import { MasterDataSettings } from './modules/MasterDataSettings';
import { AIConfigurationView } from './modules/AIConfigurationView';
import { StorageBackupSettings } from './modules/StorageBackupSettings';
import { SessionPolicySettings } from './modules/SessionPolicySettings';

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

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Overview & Health',
      icon: Layers,
      badge: 'Live',
    },
    {
      id: 'users' as AdminTab,
      label: 'Global User Management',
      icon: Users,
    },
    {
      id: 'master-data' as AdminTab,
      label: 'Master Data & Presets',
      icon: Sliders,
    },
    {
      id: 'ai-config' as AdminTab,
      label: 'AI Credentials & Quotas',
      icon: Cpu,
      badge: 'Active',
    },
    {
      id: 'storage' as AdminTab,
      label: 'Storage & Backup',
      icon: HardDrive,
    },
    {
      id: 'session-policy' as AdminTab,
      label: 'Session & Auth Policy',
      icon: Shield,
      badge: 'V1.2',
    },
    {
      id: 'audit' as AdminTab,
      label: 'System Audit Log',
      icon: List,
    },
  ];

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isRailExpanded, setIsRailExpanded] = useState(false);

  const renderAdminSidebar = (isDrawer = false) => {
    const showFull = isDrawer || isRailExpanded;
    return (
      <aside
        className={
          isDrawer
            ? 'w-full bg-[#171717] text-white flex flex-col select-none h-full overflow-hidden'
            : `hidden md:flex flex-col shrink-0 select-none border-r border-[#262626] bg-[#171717] text-white transition-all duration-200 shadow-xl relative z-20 h-full ${
                isRailExpanded ? 'w-64' : 'w-16 lg:w-64'
              }`
        }
        data-testid={isDrawer ? 'admin-mobile-sidebar' : 'admin-sidebar'}
      >
        {/* Brand Logo Header */}
        <div
          className={`p-4 border-b border-[#262626] flex items-center ${
            showFull ? 'justify-between' : 'justify-center lg:justify-between'
          }`}
        >
          <div className='flex items-center gap-3 min-w-0'>
            <div className='w-8 h-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold text-sm shadow-md font-serif shrink-0'>
              PF
            </div>
            <div className={showFull ? 'block' : 'hidden lg:block'}>
              <div className='font-serif font-bold text-sm tracking-tight text-white leading-none truncate'>
                PanelForge
              </div>
              <div className='text-[10px] font-mono text-[#F97316] uppercase tracking-wider mt-1 font-semibold truncate'>
                Global System Admin
              </div>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#262626] text-emerald-400 border border-emerald-500/30 ${
                showFull ? 'inline' : 'hidden lg:inline'
              }`}
            >
              v2.4
            </span>
            {!isDrawer && (
              <button
                type='button'
                onClick={() => setIsRailExpanded((prev) => !prev)}
                aria-label={isRailExpanded ? 'Collapse admin sidebar' : 'Expand admin sidebar'}
                title={isRailExpanded ? 'Collapse admin sidebar' : 'Expand admin sidebar'}
                className='hidden md:flex lg:hidden p-1 rounded hover:bg-[#262626] text-[#A3A3A3] hover:text-white transition-colors cursor-pointer'
                data-testid='admin-rail-toggle-btn'
              >
                {isRailExpanded ? (
                  <PanelLeftClose className='w-4 h-4' />
                ) : (
                  <PanelLeftOpen className='w-4 h-4' />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className='flex-1 p-2 space-y-1 overflow-y-auto custom-scrollbar'>
          <div
            className={`px-3 py-2 text-[10px] font-mono font-bold text-[#737373] uppercase tracking-widest ${
              showFull ? 'block' : 'hidden lg:block'
            }`}
          >
            System Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isDrawer) setIsMobileDrawerOpen(false);
                }}
                title={item.label}
                aria-label={item.label}
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  showFull ? 'justify-between' : 'justify-center lg:justify-between'
                } ${
                  isActive
                    ? 'bg-[#F97316] text-white font-bold shadow-md shadow-[#F97316]/20'
                    : 'text-[#A3A3A3] hover:text-white hover:bg-[#262626]'
                }`}
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#737373]'}`}
                  />
                  <span className={`truncate ${showFull ? 'inline' : 'hidden lg:inline'}`}>
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                      showFull ? 'inline' : 'hidden lg:inline'
                    } ${isActive ? 'bg-black/30 text-white' : 'bg-[#262626] text-[#F97316]'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div className='p-3 border-t border-[#262626] bg-[#121212] space-y-3'>
          <div
            className={`flex items-center gap-3 ${
              showFull ? 'justify-start' : 'justify-center lg:justify-start'
            }`}
          >
            <div className='w-8 h-8 rounded-full bg-[#262626] border border-[#404040] flex items-center justify-center font-bold text-xs text-[#F97316] shrink-0'>
              {(currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className={`min-w-0 flex-1 ${showFull ? 'block' : 'hidden lg:block'}`}>
              <div className='text-xs font-bold text-white truncate'>
                {currentUser?.name || 'Administrator'}
              </div>
              <div className='text-[10px] font-mono text-[#737373] truncate'>
                {currentUser?.email || 'root@panelforge.sys'}
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={() => {
                if (isDrawer) setIsMobileDrawerOpen(false);
                onLogout();
              }}
              title='Đăng xuất System Root'
              aria-label='Đăng xuất System Root'
              className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-red-900/30 transition-all cursor-pointer'
            >
              <LogOut className='w-3.5 h-3.5 shrink-0' />
              <span className={showFull ? 'inline' : 'hidden lg:inline'}>Đăng xuất</span>
            </button>
          )}
        </div>
      </aside>
    );
  };

  return (
    <div className='flex h-screen w-full bg-[#FAF8F5] text-[#171717] font-sans overflow-hidden antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C]'>
      {/* Mobile Drawer */}
      <SidebarDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        title='Admin Navigation Menu'
      >
        {renderAdminSidebar(true)}
      </SidebarDrawer>

      {/* 1. Left Fixed / Rail Sidebar */}
      {renderAdminSidebar(false)}

      {/* 2. Main Content Area */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAF8F5]'>
        {/* RBAC Constraint Explicit Warning Banner with Mobile Hamburger */}
        <div className='bg-[#171717] text-white px-4 md:px-6 py-2.5 border-b border-[#333333] flex items-center justify-between text-xs font-medium shrink-0'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label='Open admin navigation menu'
              aria-expanded={isMobileDrawerOpen}
              className='md:hidden p-1.5 -ml-1 rounded-lg text-white hover:bg-[#262626] transition-colors cursor-pointer'
              data-testid='admin-hamburger-btn'
            >
              <Menu className='w-5 h-5' />
            </button>
            <div className='flex items-center gap-2 text-amber-400'>
              <Shield className='w-4 h-4 text-[#F97316] shrink-0' />
              <span className='font-mono font-bold text-[11px] uppercase tracking-wider text-amber-300'>
                RBAC Scope Boundary Constraint:
              </span>
              <span className='text-[#E5E5E5] text-[11px] hidden sm:inline'>
                Administrators possess global system control but cannot access or read individual
                project `/workspace` routes unless explicitly invited as a project member.
              </span>
            </div>
          </div>
          <span className='text-[10px] font-mono text-[#737373] shrink-0 bg-[#262626] px-2 py-0.5 rounded border border-[#404040]'>
            ENFORCED // SYSTEM DECREE
          </span>
        </div>

        {/* Dynamic Content View */}
        <main className='flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6'>
          {activeTab === 'dashboard' && (
            <AdminDashboardView
              onNavigateToUsers={() => setActiveTab('users')}
              onNavigateToSettings={() => setActiveTab('ai-config')}
              onNavigateToAudit={() => setActiveTab('audit')}
              onNavigateToSessionPolicy={() => setActiveTab('session-policy')}
            />
          )}

          {activeTab === 'users' && <AdminUserManagementView />}

          {activeTab === 'master-data' && <MasterDataSettings />}

          {activeTab === 'ai-config' && <AIConfigurationView />}

          {activeTab === 'storage' && <StorageBackupSettings />}

          {activeTab === 'session-policy' && <SessionPolicySettings />}

          {activeTab === 'audit' && <AdminAuditLogView />}
        </main>
      </div>
    </div>
  );
};
