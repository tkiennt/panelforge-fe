import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Key,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Edit3,
  AlertCircle,
  Lock,
  X,
  Check,
  Filter,
} from 'lucide-react';
import { adminService, AdminUserItem, MOCK_ADMIN_USERS } from '../../services/admin.service';

const ALL_ROLES = [
  {
    key: 'Admin',
    label: 'Administrator (Quản trị viên)',
    color: 'bg-[#171717] text-white',
    border: 'border-[#171717]',
  },
  {
    key: 'Producer',
    label: 'Producer (Giám đốc sản xuất)',
    color: 'bg-[#FFF7ED] text-[#F97316]',
    border: 'border-[#FDBA74]',
  },
  {
    key: 'Writer',
    label: 'Writer (Biên kịch kịch bản)',
    color: 'bg-indigo-50 text-indigo-700',
    border: 'border-indigo-200',
  },
  {
    key: 'Artist',
    label: 'Artist (Họa sĩ Manga/Genga)',
    color: 'bg-blue-50 text-blue-700',
    border: 'border-blue-200',
  },
  {
    key: 'Letterer',
    label: 'Letterer (Typesetting/Bóng thoại)',
    color: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200',
  },
  {
    key: 'Editor',
    label: 'Editor (Tổng biên tập)',
    color: 'bg-red-50 text-red-700',
    border: 'border-red-200',
  },
  {
    key: 'Reader',
    label: 'Reader (Độc giả trải nghiệm sớm)',
    color: 'bg-gray-100 text-gray-700',
    border: 'border-gray-300',
  },
  {
    key: 'Moderator',
    label: 'Moderator (Kiểm duyệt viên)',
    color: 'bg-purple-50 text-purple-700',
    border: 'border-purple-200',
  },
  {
    key: 'User',
    label: 'User (Người dùng tiêu chuẩn)',
    color: 'bg-neutral-100 text-neutral-600',
    border: 'border-neutral-300',
  },
];

export const AdminUserManagementView: React.FC = () => {
  const [users, setUsers] = useState<AdminUserItem[]>(MOCK_ADMIN_USERS);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(MOCK_ADMIN_USERS.length);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [filter2faOnly, setFilter2faOnly] = useState(false);

  // Modals
  const [assigningUser, setAssigningUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('Writer');
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  const [inspectUser, setInspectUser] = useState<AdminUserItem | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string } | null>(null);

  const showToast = (title: string, desc: string) => {
    setToastMessage({ title, desc });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadUsers = React.useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const response = await adminService.getAllUsers(targetPage, pageSize);
        if (response && response.items) {
          setUsers(response.items);
          setTotal(response.total);
          setPage(response.page);
        }
      } catch (err: any) {
        console.error('Lỗi khi tải danh sách người dùng:', err);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    loadUsers(page);
  }, [loadUsers, page]);

  // Handle Assign Role Submit
  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUser) return;

    setIsSubmittingRole(true);
    try {
      const result = await adminService.assignRole({
        userId: assigningUser.id,
        newRole: selectedNewRole,
      });

      // Optimistic update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === assigningUser.id ? { ...u, role: result.newRole || selectedNewRole } : u,
        ),
      );

      showToast(
        'Phân quyền thành công',
        result.message || `Đã đổi vai trò của ${assigningUser.email} thành ${selectedNewRole}.`,
      );
      setAssigningUser(null);
    } catch (err: any) {
      showToast('Lỗi phân quyền', err.message || 'Không thể cập nhật vai trò');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Filter users locally if needed
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        user.email.toLowerCase().includes(q) ||
        (user.fullName && user.fullName.toLowerCase().includes(q)) ||
        (user.phoneNumber && user.phoneNumber.includes(q)) ||
        user.role.toLowerCase().includes(q);

      const matchesRole =
        selectedRoleFilter === 'ALL' ||
        user.role.toLowerCase() === selectedRoleFilter.toLowerCase();

      const matches2fa = !filter2faOnly || user.twoFactorEnabled;

      return matchesQuery && matchesRole && matches2fa;
    });
  }, [users, searchQuery, selectedRoleFilter, filter2faOnly]);

  const getRoleBadge = (roleName: string) => {
    const r = ALL_ROLES.find((x) => x.key.toLowerCase() === (roleName || '').toLowerCase());
    if (r) {
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${r.color} ${r.border}`}
        >
          {r.key}
        </span>
      );
    }
    return (
      <span className='inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-300'>
        {roleName}
      </span>
    );
  };

  return (
    <div className='flex-1 bg-[#FAF8F5] min-h-screen p-6 md:p-8 space-y-6 relative'>
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
              ADMIN // USERS
            </span>
            <span className='text-xs text-[#888888] font-mono'>
              Total: {total} Registered Accounts
            </span>
          </div>
          <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
            Quản Trị Người Dùng & Phân Quyền Hệ Thống
          </h1>
          <p className='text-xs text-[#737373]'>
            Trực tiếp gọi API <code>/api/Admin/users</code> và <code>/api/Admin/assign-role</code>.
          </p>
        </div>

        <button
          onClick={() => loadUsers(page)}
          disabled={loading}
          className='inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#171717] bg-[#F8F6F0] hover:bg-[#EAE6DF] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer shrink-0'
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className='bg-white p-4 rounded-xl border border-[#E7E7E7] shadow-xs space-y-3'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
          {/* Search Input */}
          <div className='relative flex-1 max-w-md'>
            <Search className='w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Tìm kiếm theo tên, email, vai trò...'
              className='w-full pl-9 pr-4 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg text-xs text-[#171717] placeholder:text-[#888888] focus:outline-none focus:border-[#F97316] transition-colors'
            />
          </div>

          {/* 2FA Toggle Filter */}
          <button
            onClick={() => setFilter2faOnly(!filter2faOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              filter2faOnly
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold'
                : 'bg-white text-[#555555] border-[#E7E7E7] hover:bg-[#FAF8F5]'
            }`}
          >
            <Shield className='w-3.5 h-3.5' />
            <span>Chỉ hiện đã bật 2FA</span>
            {filter2faOnly && <Check className='w-3 h-3 text-emerald-600' />}
          </button>
        </div>

        {/* Role Tabs */}
        <div className='flex items-center gap-1.5 overflow-x-auto pb-1 text-xs'>
          <span className='text-[11px] font-semibold text-[#888888] uppercase mr-1 flex items-center gap-1'>
            <Filter className='w-3 h-3' /> Lọc:
          </span>
          {['ALL', 'Admin', 'Producer', 'Writer', 'Artist', 'Letterer', 'Editor', 'Reader'].map(
            (role) => (
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
            ),
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-xs overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left text-xs'>
            <thead className='bg-[#F8F6F0] border-b border-[#E7E7E7] text-[#737373] font-semibold uppercase text-[10px] tracking-wider'>
              <tr>
                <th className='py-3.5 px-4'>Người Dùng / Email</th>
                <th className='py-3.5 px-4'>Họ & Tên</th>
                <th className='py-3.5 px-4'>Vai Trò Hiện Tại (RBAC)</th>
                <th className='py-3.5 px-4'>Bảo Mật 2FA</th>
                <th className='py-3.5 px-4'>Xác Thực Email</th>
                <th className='py-3.5 px-4'>Ngày Đăng Ký</th>
                <th className='py-3.5 px-4 text-right'>Thao Tác</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7]'>
              {loading ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-[#737373]'>
                    <RefreshCw className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
                    Đang tải danh sách người dùng...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-12 text-center text-[#737373]'>
                    Không tìm thấy người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className='hover:bg-[#FAF8F5] transition-colors'>
                    {/* User & Email */}
                    <td className='py-3.5 px-4'>
                      <div className='flex items-center gap-2.5'>
                        <div className='w-7 h-7 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-[11px] shrink-0'>
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className='overflow-hidden'>
                          <div className='font-semibold text-[#171717] truncate'>{user.email}</div>
                          <div className='text-[10px] text-[#888888] font-mono truncate'>
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Full Name */}
                    <td className='py-3.5 px-4 font-medium text-[#171717]'>
                      {user.fullName || <span className='text-[#888888] italic'>Chưa đặt tên</span>}
                    </td>

                    {/* Role */}
                    <td className='py-3.5 px-4'>{getRoleBadge(user.role)}</td>

                    {/* 2FA Status */}
                    <td className='py-3.5 px-4'>
                      {user.twoFactorEnabled ? (
                        <span className='inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'>
                          <Shield className='w-3 h-3 text-emerald-600' />
                          Bật (Active)
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1 text-[11px] font-medium text-[#888888] bg-gray-50 px-2 py-0.5 rounded border border-gray-200'>
                          Chưa bật
                        </span>
                      )}
                    </td>

                    {/* Email Confirmed */}
                    <td className='py-3.5 px-4'>
                      {user.isEmailConfirmed ? (
                        <span className='inline-flex items-center gap-1 text-emerald-600 font-medium'>
                          <CheckCircle2 className='w-3.5 h-3.5' /> Đã xác thực
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1 text-amber-600 font-medium'>
                          <AlertCircle className='w-3.5 h-3.5' /> Chờ mã PIN
                        </span>
                      )}
                    </td>

                    {/* Created At */}
                    <td className='py-3.5 px-4 text-[#737373] font-mono text-[11px]'>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>

                    {/* Actions */}
                    <td className='py-3.5 px-4 text-right space-x-2'>
                      <button
                        onClick={() => {
                          setAssigningUser(user);
                          setSelectedNewRole(user.role || 'Writer');
                        }}
                        className='inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#F8F6F0] hover:bg-[#EAE6DF] text-[#171717] border border-[#E7E7E7] font-semibold text-[11px] transition-colors cursor-pointer'
                        title='Phân quyền lại vai trò người dùng này'
                      >
                        <Edit3 className='w-3 h-3 text-[#F97316]' />
                        <span>Phân Quyền</span>
                      </button>

                      <button
                        onClick={() => setInspectUser(user)}
                        className='inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-[#F3F1EB] text-[#555555] font-medium text-[11px] transition-colors cursor-pointer'
                        title='Xem chi tiết'
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className='p-4 border-t border-[#E7E7E7] flex items-center justify-between text-xs text-[#737373]'>
          <div>
            Hiển thị <span className='font-semibold text-[#171717]'>{filteredUsers.length}</span> /{' '}
            <span className='font-semibold text-[#171717]'>{total}</span> tài khoản
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className='p-1.5 rounded-lg border border-[#E7E7E7] bg-white hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
            <span className='font-mono font-medium text-[#171717] px-2'>Trang {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= total || loading}
              className='p-1.5 rounded-lg border border-[#E7E7E7] bg-white hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Phân Quyền (Assign Role Modal) */}
      {assigningUser && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <div className='flex items-center gap-2 text-sm font-bold text-[#171717]'>
                <Shield className='w-4 h-4 text-[#F97316]' />
                <span>Phân Quyền Vai Trò Hệ Thống (RBAC)</span>
              </div>
              <button
                onClick={() => setAssigningUser(null)}
                className='text-[#888888] hover:text-[#171717] cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1 text-xs'>
              <div className='text-[#737373]'>Tài khoản áp dụng:</div>
              <div className='font-bold text-[#171717] text-sm'>{assigningUser.email}</div>
              <div className='text-[11px] text-[#888888] font-mono'>
                Vai trò hiện tại: <strong className='text-[#171717]'>{assigningUser.role}</strong>
              </div>
            </div>

            <form onSubmit={handleAssignRoleSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-[#171717] mb-2'>
                  Chọn vai trò mới (New Role):
                </label>
                <div className='grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-1'>
                  {ALL_ROLES.map((r) => (
                    <label
                      key={r.key}
                      onClick={() => setSelectedNewRole(r.key)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedNewRole === r.key
                          ? 'border-[#F97316] bg-[#FFF7ED] font-bold text-[#171717]'
                          : 'border-[#E7E7E7] hover:bg-[#FAF8F5] text-[#555555]'
                      }`}
                    >
                      <div className='flex items-center gap-2'>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            selectedNewRole === r.key ? 'bg-[#F97316]' : 'bg-[#CCCCCC]'
                          }`}
                        ></span>
                        <span>{r.label}</span>
                      </div>
                      <span className='font-mono text-[10px] text-[#888888] uppercase'>
                        {r.key}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className='p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1'>
                <div className='font-semibold flex items-center gap-1'>
                  <AlertCircle className='w-3.5 h-3.5 shrink-0' />
                  <span>Cảnh báo phân quyền</span>
                </div>
                <p>
                  Gán quyền <strong>Administrator</strong> sẽ cấp toàn quyền truy cập bảng điều
                  khiển này và quyền chỉnh sửa tài khoản khác.
                </p>
              </div>

              <div className='flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setAssigningUser(null)}
                  className='px-4 py-2 rounded-xl text-xs font-semibold text-[#555555] hover:bg-[#F3F1EB] cursor-pointer'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={isSubmittingRole}
                  className='px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] shadow-xs cursor-pointer transition-all disabled:opacity-50'
                >
                  {isSubmittingRole ? 'Đang lưu...' : 'Xác Nhận Cập Nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {inspectUser && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
              <h3 className='text-sm font-bold text-[#171717]'>Chi Tiết Tài Khoản</h3>
              <button
                onClick={() => setInspectUser(null)}
                className='text-[#888888] hover:text-[#171717] cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <div className='space-y-3 text-xs'>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  User ID
                </span>
                <span className='font-mono font-medium text-[#171717] select-all'>
                  {inspectUser.id}
                </span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>Email</span>
                <span className='font-semibold text-[#171717]'>{inspectUser.email}</span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Họ và tên
                </span>
                <span className='font-medium text-[#171717]'>{inspectUser.fullName || '—'}</span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Số điện thoại
                </span>
                <span className='font-mono text-[#171717]'>{inspectUser.phoneNumber || '—'}</span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Vai trò
                </span>
                <div className='mt-1'>{getRoleBadge(inspectUser.role)}</div>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Xác thực 2FA
                </span>
                <span
                  className={`font-semibold ${inspectUser.twoFactorEnabled ? 'text-emerald-600' : 'text-gray-500'}`}
                >
                  {inspectUser.twoFactorEnabled ? 'Đã kích hoạt RFC 6238 TOTP' : 'Chưa kích hoạt'}
                </span>
              </div>
              <div>
                <span className='text-[#888888] block text-[10px] uppercase font-mono'>
                  Ngày tạo
                </span>
                <span className='font-mono text-[#737373]'>
                  {inspectUser.createdAt ? new Date(inspectUser.createdAt).toLocaleString() : '—'}
                </span>
              </div>
            </div>

            <div className='pt-3 border-t border-[#E7E7E7] text-right'>
              <button
                onClick={() => setInspectUser(null)}
                className='px-4 py-2 bg-[#171717] text-white rounded-xl text-xs font-semibold cursor-pointer'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
