import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Shield,
  CheckCircle2,
  X,
  Check,
  Filter,
  RefreshCw,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { adminService, AdminUserItem } from '../../services/admin.service';
import { AdminUserTable } from './components/AdminUserTable';
import { AdminAssignRoleModal } from './components/AdminAssignRoleModal';
import { ALL_ROLES } from './constants';
import { AdminUserDetailsModal } from './components/AdminUserDetailsModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

export const AdminUserManagementView: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [filter2faOnly, setFilter2faOnly] = useState(false);

  // Modals
  const [assigningUser, setAssigningUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRoles, setSelectedNewRoles] = useState<string[]>(['Producer']);
  const [inspectUser, setInspectUser] = useState<AdminUserItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- React Query for Fetching Users ---
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminUsers', page, pageSize],
    queryFn: () => adminService.getAllUsers(page, pageSize),
  });

  const users = useMemo(() => data?.items || [], [data?.items]);
  const total = data?.total || 0;

  // --- React Query for Role Assignment Mutation ---
  const assignRoleMutation = useMutation({
    mutationFn: (variables: { userId: string; newRole: string }) =>
      adminService.assignProducer(variables),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });

      showToast(
        'Phân quyền thành công',
        result.message ||
          (result.canCreateStudio
            ? 'Đã cấp quyền Producer (Tạo Studio).'
            : `Đã cập nhật vai trò hệ thống thành ${result.newRole || variables.newRole}.`),
      );
      setAssigningUser(null);
    },
    onError: (err: any) => {
      showToast('Lỗi phân quyền', err.message || 'Không thể cập nhật vai trò người dùng');
    },
  });

  const handleAssignRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;

    assignRoleMutation.mutate({
      userId: assigningUser.id,
      newRole: selectedNewRoles.join(', '),
    });
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase().trim();
      const isProducer = user.canCreateStudio === true && user.role.toLowerCase() !== 'admin';
      const roleDisplayName = isProducer ? 'producer' : user.role.toLowerCase();
      const matchesQuery =
        !q ||
        user.email.toLowerCase().includes(q) ||
        (user.fullName && user.fullName.toLowerCase().includes(q)) ||
        (user.phoneNumber && user.phoneNumber.includes(q)) ||
        user.role.toLowerCase().includes(q) ||
        roleDisplayName.includes(q);

      let matchesRole = false;
      if (selectedRoleFilter === 'ALL') {
        matchesRole = true;
      } else if (selectedRoleFilter === 'Producer') {
        matchesRole = isProducer;
      } else if (selectedRoleFilter === 'Admin') {
        matchesRole =
          user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'administrator';
      } else if (selectedRoleFilter === 'User') {
        matchesRole = user.role.toLowerCase() === 'user' && !isProducer;
      } else {
        matchesRole = user.role.toLowerCase() === selectedRoleFilter.toLowerCase();
      }

      const matches2fa = !filter2faOnly || user.twoFactorEnabled;

      return matchesQuery && matchesRole && matches2fa;
    });
  }, [users, searchQuery, selectedRoleFilter, filter2faOnly]);

  const getRoleBadge = (roleName: string) => {
    const r = ALL_ROLES.find((x) => x.key.toLowerCase() === (roleName || '').toLowerCase());
    if (r) {
      return <Badge className={`border ${r.color} ${r.border}`}>{r.key}</Badge>;
    }
    return (
      <Badge variant='outline' className='bg-gray-100 text-gray-700 border-gray-300'>
        {roleName}
      </Badge>
    );
  };

  const renderProjectRoles = (user: AdminUserItem) => {
    if (user.projectRoles && user.projectRoles.length > 0) {
      return (
        <div className='flex flex-col gap-1'>
          {user.projectRoles.map((pr, idx) => (
            <div key={idx} className='flex flex-wrap gap-1'>
              {pr.roles.map((role) => (
                <span key={role}>{getRoleBadge(role)}</span>
              ))}
            </div>
          ))}
        </div>
      );
    }
    // BR-07: Nếu role là User nhưng có canCreateStudio = true, hiển thị Producer badge
    if (user.canCreateStudio && user.role.toLowerCase() !== 'admin') {
      return (
        <div className='flex items-center gap-1.5 flex-wrap'>
          {getRoleBadge('Producer')}
          <span className='text-[10px] text-gray-500 font-mono'>(User + Studio Creator)</span>
        </div>
      );
    }
    return getRoleBadge(user.role);
  };

  return (
    <div className='flex-1 bg-[#F8F6F0] min-h-screen p-6 md:p-8 space-y-6 relative text-[#171717] font-sans'>
      {/* Toast Alert */}
      {toastMessage && (
        <div className='fixed top-6 right-6 z-50 bg-[#171717] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200'>
          <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          <div>
            <div className='text-xs font-bold'>{toastMessage.title}</div>
            <div className='text-[11px] text-[#A3A3A3]'>{toastMessage.desc}</div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className='ml-2 text-[#737373] hover:text-white cursor-pointer'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E7E7E7] shadow-xs'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <span className='px-2 py-0.5 rounded bg-[#171717] text-white font-mono text-[10px] font-bold'>
              ADMIN // USERS & PRODUCER ASSIGNMENT
            </span>
            <span className='text-xs text-[#737373] font-mono'>
              Total: {total} Registered Accounts
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Quản Trị Người Dùng & Phân Quyền Hệ Thống
          </h1>
          <p className='text-xs text-[#737373] mt-1'>
            Cấp quyền Producer để người dùng có thể tạo và quản lý các dự án Manga/Webtoon mới.
          </p>
        </div>

        <Button
          onClick={() => refetch()}
          isLoading={isFetching}
          variant='secondary'
          className='gap-2 shrink-0 bg-[#F8F6F0]'
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className='bg-white p-4 rounded-xl border border-[#E7E7E7] shadow-xs space-y-3'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          <div className='relative flex-1 max-w-md'>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Tìm kiếm theo tên, email, vai trò...'
              icon={<Search className='w-4 h-4' />}
            />
          </div>

          <Button
            onClick={() => setFilter2faOnly(!filter2faOnly)}
            variant={filter2faOnly ? 'primary' : 'secondary'}
            className={cn(
              'gap-1.5',
              filter2faOnly
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-300'
                : 'text-[#555555] border-[#E7E7E7] hover:bg-[#FAF8F5]',
            )}
          >
            <Shield className='w-3.5 h-3.5' />
            <span>Chỉ hiện đã bật 2FA</span>
            {filter2faOnly && <Check className='w-3 h-3 text-emerald-600' />}
          </Button>
        </div>

        <div className='flex items-center gap-1.5 overflow-x-auto pb-1 text-xs'>
          <span className='text-[11px] font-semibold text-[#888888] uppercase mr-1 flex items-center gap-1'>
            <Filter className='w-3 h-3' /> Lọc:
          </span>
          {['ALL', 'Admin', 'Producer', 'User'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedRoleFilter === role
                  ? 'bg-[#171717] text-white shadow-2xs'
                  : 'bg-[#F8F6F0] text-[#737373] hover:text-[#171717] hover:bg-[#EAE6DF]'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <AdminUserTable
        filteredUsers={filteredUsers}
        total={total}
        page={page}
        pageSize={pageSize}
        loading={isLoading}
        setPage={setPage}
        setAssigningUser={setAssigningUser}
        setSelectedNewRoles={setSelectedNewRoles}
        setInspectUser={setInspectUser}
        renderProjectRoles={renderProjectRoles}
      />

      {/* Modals */}
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
    </div>
  );
};

// Export alias for UI Architecture compliance
export const AdminUserManagement = AdminUserManagementView;
