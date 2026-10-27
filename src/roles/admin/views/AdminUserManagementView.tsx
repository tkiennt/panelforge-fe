import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, RefreshCw } from 'lucide-react';
import { adminService, AdminUserItem } from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { AdminUserTable } from './components/AdminUserTable';
import { AdminAssignRoleModal } from './components/AdminAssignRoleModal';
import { AdminUserDetailsModal } from './components/AdminUserDetailsModal';
import { AdminBadge, AdminButton, AdminPageHeader, AdminToast } from './components/AdminUi';
import { adminFieldClass, adminFocusRing, useAdminToast } from './components/adminUiStyles';

const ROLE_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'Admin', label: 'Quản trị viên' },
  { value: 'Producer', label: 'Có quyền tạo Studio' },
  { value: 'User', label: 'Người dùng' },
];

const isAdminRole = (role: string) =>
  ['admin', 'administrator'].includes((role || '').toLowerCase());
const isProducer = (user: AdminUserItem) =>
  user.canCreateStudio === true && !isAdminRole(user.role);

export const AdminUserManagementView: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [filter2faOnly, setFilter2faOnly] = useState(false);

  const [assigningUser, setAssigningUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRoles, setSelectedNewRoles] = useState<string[]>(['Producer']);
  const [inspectUser, setInspectUser] = useState<AdminUserItem | null>(null);
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
            ? 'Đã cấp quyền tạo Studio.'
            : `Đã cập nhật vai trò thành ${result.newRole || variables.newRole}.`),
      );
      setAssigningUser(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Không thể cập nhật vai trò người dùng.', 'error');
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
    if (isProducer(user)) return <AdminBadge tone='accent'>Có quyền tạo Studio</AdminBadge>;
    if (isAdminRole(user.role)) return <AdminBadge tone='info'>Quản trị viên</AdminBadge>;
    if (user.role.toLowerCase() === 'user') return <AdminBadge>Người dùng</AdminBadge>;
    return <AdminBadge>{user.role}</AdminBadge>;
  };

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title='Người dùng & quyền'
        description='Cấp quyền tạo Studio cho người dùng cần mở dự án mới.'
        actions={
          <AdminButton
            onClick={() => refetch()}
            isLoading={isFetching}
            icon={<RefreshCw className='w-4 h-4' />}
          >
            Làm mới
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
            placeholder='Tìm theo tên, email, số điện thoại'
            aria-label='Tìm người dùng'
            className={cn(adminFieldClass, 'pl-9')}
          />
        </div>
        <div
          className='flex items-center gap-1 p-1 max-w-full overflow-x-auto rounded-xl border border-admin-line bg-admin-card'
          role='group'
          aria-label='Lọc theo vai trò'
        >
          {ROLE_FILTERS.map((r) => {
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
          Chỉ tài khoản đã bật 2FA
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
        setInspectUser={setInspectUser}
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

      {inspectUser && (
        <AdminUserDetailsModal
          user={inspectUser}
          onClose={() => setInspectUser(null)}
          renderProjectRoles={renderProjectRoles}
        />
      )}
    </>
  );
};

// Export alias for UI Architecture compliance
export const AdminUserManagement = AdminUserManagementView;
