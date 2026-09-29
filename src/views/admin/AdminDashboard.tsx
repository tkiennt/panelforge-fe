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
} from 'lucide-react';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminUserManagementView } from './AdminUserManagementView';
import { AdminSystemSettingsView } from './AdminSystemSettingsView';
import { AdminAuditLogView } from './AdminAuditLogView';
import { MasterDataSettings } from './modules/MasterDataSettings';
import { AIConfigurationView } from './modules/AIConfigurationView';
import { StorageBackupSettings } from './modules/StorageBackupSettings';

export type AdminTab = 'dashboard' | 'users' | 'master-data' | 'ai-config' | 'storage' | 'audit';

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
      id: 'audit' as AdminTab,
      label: 'System Audit Log',
      icon: List,
    },
  ];

  return (
    <div className='flex h-screen w-full bg-[#FAF8F5] text-[#171717] font-sans overflow-hidden antialiased selection:bg-[#F97316]/20 selection:text-[#EA580C]'>
      {/* 1. Left Fixed Sidebar */}
      <aside className='w-64 bg-[#171717] text-white flex flex-col shrink-0 select-none border-r border-[#262626] shadow-xl relative z-20'>
        {/* Brand Logo Header */}
        <div className='p-5 border-b border-[#262626] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-lg bg-[#F97316] text-white flex items-center justify-center font-bold text-sm shadow-md font-serif'>
              PF
            </div>
            <div>
              <div className='font-serif font-bold text-sm tracking-tight text-white leading-none'>
                PanelForge
              </div>
              <div className='text-[10px] font-mono text-[#F97316] uppercase tracking-wider mt-1 font-semibold'>
                Global System Admin
              </div>
            </div>
          </div>
          <span className='px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#262626] text-emerald-400 border border-emerald-500/30'>
            v2.4
          </span>
        </div>

        {/* Sidebar Nav Items */}
        <nav className='flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar'>
          <div className='px-3 py-2 text-[10px] font-mono font-bold text-[#737373] uppercase tracking-widest'>
            System Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#F97316] text-white font-bold shadow-md shadow-[#F97316]/20'
                    : 'text-[#A3A3A3] hover:text-white hover:bg-[#262626]'
                }`}
              >
                <div className='flex items-center gap-3 min-w-0'>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#737373]'}`}
                  />
                  <span className='truncate'>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                      isActive ? 'bg-black/30 text-white' : 'bg-[#262626] text-[#F97316]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout Footer */}
        <div className='p-4 border-t border-[#262626] bg-[#121212] space-y-3'>
          <div className='flex items-center gap-3'>
            <div className='w-8 h-8 rounded-full bg-[#262626] border border-[#404040] flex items-center justify-center font-bold text-xs text-[#F97316]'>
              {(currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className='min-w-0 flex-1'>
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
              onClick={onLogout}
              className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 border border-red-900/30 transition-all cursor-pointer'
            >
              <LogOut className='w-3.5 h-3.5' />
              <span>Đăng xuất System Root</span>
            </button>
          )}
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className='flex-1 flex flex-col min-w-0 overflow-hidden bg-[#FAF8F5]'>
        {/* RBAC Constraint Explicit Warning Banner */}
        <div className='bg-[#171717] text-white px-6 py-2.5 border-b border-[#333333] flex items-center justify-between text-xs font-medium shrink-0'>
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
            />
          )}

          {activeTab === 'users' && <AdminUserManagementView />}

          {activeTab === 'master-data' && <MasterDataSettings />}

          {activeTab === 'ai-config' && <AIConfigurationView />}

          {activeTab === 'storage' && <StorageBackupSettings />}

          {activeTab === 'audit' && <AdminAuditLogView />}
        </main>
      </div>
    </div>
  );
};
