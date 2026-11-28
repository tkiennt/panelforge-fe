import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminUserManagementView } from './AdminUserManagementView';
import { AdminAuditLogView } from './AdminAuditLogView';
import { AIConfigurationView } from './modules/AIConfigurationView';
import { AdminResourcesView } from './modules/AdminResourcesView';
import { SessionPolicySettings } from './modules/SessionPolicySettings';
import { ReaderStatsView } from '@/shared/views/ReaderStatsView';

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'master-data'
  | 'ai-config'
  | 'storage'
  | 'session-policy'
  | 'audit'
  | 'analytics';

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

/**
 * Nội dung Admin Portal. Khung (header "Admin Portal" + sidebar điều hướng) do AppShell dựng,
 * giống Publisher Portal; tab hiện hành lấy từ `?tab=` để menu AppShell và nội dung luôn khớp.
 */
export const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab | null;
  const activeTab: AdminTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'dashboard';

  const go = (tab: AdminTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === 'dashboard') next.delete('tab');
      else next.set('tab', tab);
      return next;
    });
  };

  return (
    <div className='flex-1 bg-admin-bg text-admin-ink antialiased'>
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
        {activeTab === 'storage' && <AdminResourcesView />}
        {activeTab === 'session-policy' && <SessionPolicySettings />}
        {activeTab === 'audit' && <AdminAuditLogView />}
        {activeTab === 'analytics' && <ReaderStatsView />}
      </div>
    </div>
  );
};
