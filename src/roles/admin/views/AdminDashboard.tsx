import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminUserManagementView } from './AdminUserManagementView';
import { AdminAuditLogView } from './AdminAuditLogView';
import { AIConfigurationView } from './modules/AIConfigurationView';
import { ResourcesView } from './modules/resources/ResourcesView';
import { SessionPolicySettings } from './modules/SessionPolicySettings';
import { EmailSettingsView } from './modules/EmailSettingsView';
import { EmailLogsView } from './modules/EmailLogsView';
import { ReaderStatsView } from '@/shared/views/ReaderStatsView';
import { AdminUserDetailView } from './modules/details/AdminUserDetailView';
import { AdminStudioDetailView } from './modules/details/AdminStudioDetailView';
import { SystemHealthView } from './modules/details/SystemHealthView';

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'master-data'
  | 'ai-config'
  | 'resources'
  | 'session-policy'
  | 'email-settings'
  | 'email-logs'
  | 'audit'
  | 'analytics'
  | 'system-health';

const VALID_TABS: AdminTab[] = [
  'dashboard',
  'users',
  'master-data',
  'ai-config',
  'resources',
  'session-policy',
  'email-settings',
  'email-logs',
  'audit',
  'analytics',
  'system-health',
];

/**
 * Nội dung Admin Portal. Khung (header "Admin Portal" + sidebar điều hướng) do AppShell dựng,
 * giống Publisher Portal; tab hiện hành lấy từ `?tab=` để menu AppShell và nội dung luôn khớp.
 */
export const AdminDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // ?tab=storage (màn "Lưu trữ & quota" cũ) đã gộp vào Tài nguyên.
  const rawTab = searchParams.get('tab');
  const tabParam = (rawTab === 'storage' ? 'resources' : rawTab) as AdminTab | null;
  const activeTab: AdminTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'dashboard';

  // Trang chi tiết là tham số con của tab danh sách để menu vẫn sáng đúng mục (OPS-30, OPS-31).
  const userId = activeTab === 'users' ? searchParams.get('user') : null;
  const studioId = activeTab === 'resources' ? searchParams.get('studio') : null;
  const openParams = (params: Record<string, string>) =>
    setSearchParams(new URLSearchParams(params));

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
            onNavigateToEmailSettings={() => go('email-settings')}
            onNavigateToEmailLogs={() => go('email-logs')}
            onNavigateToStorage={() => go('resources')}
            onNavigateToResources={(extra) =>
              setSearchParams(new URLSearchParams({ tab: 'resources', ...extra }))
            }
            onNavigateToAnalytics={() => go('analytics')}
          />
        )}
        {activeTab === 'users' &&
          (userId ? (
            <AdminUserDetailView
              userId={userId}
              onBack={() => openParams({ tab: 'users' })}
              onOpenStudio={(id) => openParams({ tab: 'resources', studio: id })}
              onOpenAudit={(email) => openParams({ tab: 'audit', userEmail: email })}
            />
          ) : (
            <AdminUserManagementView onOpenUser={(id) => openParams({ tab: 'users', user: id })} />
          ))}
        {activeTab === 'ai-config' && <AIConfigurationView />}
        {activeTab === 'resources' &&
          (studioId ? (
            <AdminStudioDetailView
              workspaceId={studioId}
              onBack={() => openParams({ tab: 'resources' })}
              onOpenUser={(id) => openParams({ tab: 'users', user: id })}
            />
          ) : (
            <ResourcesView />
          ))}
        {activeTab === 'session-policy' && <SessionPolicySettings />}
        {activeTab === 'email-settings' && <EmailSettingsView />}
        {activeTab === 'email-logs' && <EmailLogsView />}
        {activeTab === 'audit' && (
          <AdminAuditLogView
            key={searchParams.get('userEmail') ?? ''}
            initialUserEmail={searchParams.get('userEmail') ?? ''}
          />
        )}
        {activeTab === 'analytics' && <ReaderStatsView />}
        {activeTab === 'system-health' && <SystemHealthView onNavigate={openParams} />}
      </div>
    </div>
  );
};
