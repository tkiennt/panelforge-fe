import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, RefreshCw } from 'lucide-react';
import { adminService, AdminUserItem } from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminUserTable } from './components/AdminUserTable';
import { AdminAssignRoleModal } from './components/AdminAssignRoleModal';
import { AdminBadge, AdminButton, AdminPageHeader, AdminToast } from './components/AdminUi';
import { adminFieldClass, adminFocusRing, useAdminToast } from './components/adminUiStyles';

const isAdminRole = (role: string) =>
  ['admin', 'administrator'].includes((role || '').toLowerCase());
const isProducer = (user: AdminUserItem) =>
  user.canCreateStudio === true && !isAdminRole(user.role);

/** onOpenUser: mở trang chi tiết tài khoản (OPS-30) thay cho hộp thoại xem nhanh cũ. */
export const AdminUserManagementView: React.FC<{ onOpenUser?: (userId: string) => void }> = ({
  onOpenUser,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const roleFilters = [
    { value: 'ALL', label: t('admin.users.roles.all') },
    { value: 'Admin', label: t('admin.users.roles.admin') },
    { value: 'Producer', label: t('admin.users.roles.producer') },
    { value: 'User', label: t('admin.users.roles.user') },
  ];
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [filter2faOnly, setFilter2faOnly] = useState(false);

  const [assigningUser, setAssigningUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRoles, setSelectedNewRoles] = useState<string[]>(['Producer']);
  const { toast, show: showToast, clear: clearToast } = useAdminToast(4000);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['adminUsers', page, pageSize],
    queryFn: () => adminService.getAllUsers(page, pageSize),
  });

  const users = useMemo(() => data?.items || [], [data?.items]);
  const total = data?.total || 0;

  const assignRoleMutation = useMutation({
    mutationFn: (variables: { userId: string; newRole: string }) =>
      adminService.assignProducer(variables),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      showToast(
        result.message ||
          (result.canCreateStudio
            ? t('admin.users.toast.producerGranted')
            : t('admin.users.toast.roleUpdated', { role: result.newRole || variables.newRole })),
      );
      setAssigningUser(null);
    },
    onError: (err: any) => {
      showToast(err.message || t('admin.users.toast.updateFailed'), 'error');
    },
  });

  const handleAssignRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser || assignRoleMutation.isPending) return;
    assignRoleMutation.mutate({
      userId: assigningUser.id,
      newRole: selectedNewRoles.join(', '),
    });
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const producer = isProducer(user);
      const roleDisplayName = producer ? 'producer' : user.role.toLowerCase();
      const matchesQuery =
        !q ||
        user.email.toLowerCase().includes(q) ||
        (user.fullName && user.fullName.toLowerCase().includes(q)) ||
        (user.phoneNumber && user.phoneNumber.includes(q)) ||
        user.role.toLowerCase().includes(q) ||
        roleDisplayName.includes(q);

      let matchesRole: boolean;
      if (selectedRoleFilter === 'ALL') matchesRole = true;
      else if (selectedRoleFilter === 'Producer') matchesRole = producer;
      else if (selectedRoleFilter === 'Admin') matchesRole = isAdminRole(user.role);
      else if (selectedRoleFilter === 'User')
        matchesRole = user.role.toLowerCase() === 'user' && !producer;
      else matchesRole = user.role.toLowerCase() === selectedRoleFilter.toLowerCase();

      const matches2fa = !filter2faOnly || user.twoFactorEnabled;
      return matchesQuery && matchesRole && matches2fa;
    });
  }, [users, searchQuery, selectedRoleFilter, filter2faOnly]);

  const isFiltered = searchQuery.trim() !== '' || selectedRoleFilter !== 'ALL' || filter2faOnly;

  const renderProjectRoles = (user: AdminUserItem) => {
    if (user.projectRoles && user.projectRoles.length > 0) {
      return (
        <div className='flex flex-wrap gap-1'>
          {user.projectRoles.flatMap((pr, idx) =>
            pr.roles.map((role) => <AdminBadge key={`${idx}-${role}`}>{role}</AdminBadge>),
          )}
        </div>
      );
    }
    // BR-07: User có canCreateStudio = true được hiển thị là có quyền tạo Studio
    if (isProducer(user))
      return <AdminBadge tone='accent'>{t('admin.users.roles.producer')}</AdminBadge>;
    if (isAdminRole(user.role))
      return <AdminBadge tone='info'>{t('admin.users.roles.admin')}</AdminBadge>;
    if (user.role.toLowerCase() === 'user')
      return <AdminBadge>{t('admin.users.roles.user')}</AdminBadge>;
    return <AdminBadge>{user.role}</AdminBadge>;
  };

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title={t('admin.users.title')}
        description={t('admin.users.description')}
        actions={
          <AdminButton
            onClick={() => refetch()}
            isLoading={isFetching}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            {t('admin.users.refresh')}
          </AdminButton>
        }
      />

      <div className='flex flex-wrap items-center gap-3'>
        <div className='relative flex-1 min-w-[240px] max-w-md'>
          <Search
            className='w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
            aria-hidden
          />
          <input
            type='search'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin.users.searchPlaceholder')}
            aria-label={t('admin.users.searchAriaLabel')}
            className={cn(adminFieldClass, 'pl-9')}
          />
        </div>
        <div
          className='flex items-center gap-1 p-1 max-w-full overflow-x-auto rounded-xl border border-admin-line bg-admin-card'
          role='group'
          aria-label={t('admin.users.roleFilterAriaLabel')}
        >
          {roleFilters.map((r) => {
            const active = selectedRoleFilter === r.value;
            return (
              <button
                key={r.value}
                type='button'
                aria-pressed={active}
                onClick={() => setSelectedRoleFilter(r.value)}
                className={cn(
                  'min-h-9 px-3 rounded-lg text-sm whitespace-nowrap transition-colors cursor-pointer',
                  adminFocusRing,
                  active
                    ? 'bg-admin-accent-soft text-admin-ink-strong font-semibold'
                    : 'text-admin-muted hover:text-admin-ink hover:bg-admin-hover',
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <label className='inline-flex items-center gap-2 whitespace-nowrap min-h-11 px-3 rounded-xl border border-admin-line bg-admin-card text-sm text-admin-ink cursor-pointer select-none'>
          <input
            type='checkbox'
            checked={filter2faOnly}
            onChange={(e) => setFilter2faOnly(e.target.checked)}
            className='w-4 h-4 accent-[#F97316]'
          />
          <Shield className='w-4 h-4 text-admin-muted' aria-hidden />
          {t('admin.users.filter2faOnly')}
        </label>
      </div>

      <AdminUserTable
        filteredUsers={filteredUsers}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        isError={isError}
        isFiltered={isFiltered}
        onRetry={() => refetch()}
        setPage={setPage}
        setAssigningUser={setAssigningUser}
        setSelectedNewRoles={setSelectedNewRoles}
        setInspectUser={(user) => onOpenUser?.(user.id)}
        renderProjectRoles={renderProjectRoles}
      />

      {assigningUser && (
        <AdminAssignRoleModal
          user={assigningUser}
          selectedNewRoles={selectedNewRoles}
          setSelectedNewRoles={setSelectedNewRoles}
          onClose={() => setAssigningUser(null)}
          onSubmit={handleAssignRoleSubmit}
          isSubmitting={assignRoleMutation.isPending}
        />
      )}
    </>
  );
};

// Export alias for UI Architecture compliance
export const AdminUserManagement = AdminUserManagementView;
