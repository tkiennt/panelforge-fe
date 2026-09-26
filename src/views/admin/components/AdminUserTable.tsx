import React from 'react';
import { Shield, CheckCircle2, AlertCircle, Edit3, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { AdminUserItem } from '../../../services/admin.service';

interface AdminUserTableProps {
  filteredUsers: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setAssigningUser: (user: AdminUserItem) => void;
  setSelectedNewRoles: (roles: string[]) => void;
  setInspectUser: (user: AdminUserItem) => void;
  renderProjectRoles: (user: AdminUserItem) => React.ReactNode;
}

export const AdminUserTable: React.FC<AdminUserTableProps> = ({
  filteredUsers,
  total,
  page,
  pageSize,
  loading,
  setPage,
  setAssigningUser,
  setSelectedNewRoles,
  setInspectUser,
  renderProjectRoles,
}) => {
  return (
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
                  <td className='py-3.5 px-4 font-medium text-[#171717]'>
                    {user.fullName || <span className='text-[#888888] italic'>Chưa đặt tên</span>}
                  </td>
                  <td className='py-3.5 px-4'>{renderProjectRoles(user)}</td>
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
                  <td className='py-3.5 px-4 text-[#737373] font-mono text-[11px]'>
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className='py-3.5 px-4 text-right space-x-2'>
                    <button
                      onClick={() => {
                        setAssigningUser(user);
                        setSelectedNewRoles(
                          user.canCreateStudio && user.role.toLowerCase() !== 'admin'
                            ? ['Producer']
                            : [user.role || 'User'],
                        );
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
  );
};
