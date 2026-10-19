import React from 'react';
import { CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { AdminUserItem } from '@/services/admin.service';
import { AdminBadge, AdminButton, AdminPagination, AdminTableState } from './AdminUi';
import { adminTable } from './adminUiStyles';

interface AdminUserTableProps {
  filteredUsers: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  isError?: boolean;
  isFiltered?: boolean;
  onRetry?: () => void;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setAssigningUser: (user: AdminUserItem) => void;
  setSelectedNewRoles: (roles: string[]) => void;
  setInspectUser: (user: AdminUserItem) => void;
  renderProjectRoles: (user: AdminUserItem) => React.ReactNode;
}

const COLS = 6;

export const AdminUserTable: React.FC<AdminUserTableProps> = ({
  filteredUsers,
  total,
  page,
  pageSize,
  loading,
  isError,
  isFiltered,
  onRetry,
  setPage,
  setAssigningUser,
  setSelectedNewRoles,
  setInspectUser,
  renderProjectRoles,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const body = () => {
    if (loading)
      return <AdminTableState colSpan={COLS} kind='loading' message='Đang tải người dùng…' />;
    if (isError)
      return (
        <AdminTableState
          colSpan={COLS}
          kind='error'
          message='Không tải được danh sách người dùng.'
          action={
            onRetry && (
              <AdminButton size='sm' onClick={onRetry}>
                Thử lại
              </AdminButton>
            )
          }
        />
      );
    if (filteredUsers.length === 0)
      return isFiltered ? (
        <AdminTableState
          colSpan={COLS}
          kind='no-results'
          message='Không có người dùng phù hợp bộ lọc.'
          hint='Bộ lọc áp dụng cho trang hiện tại.'
        />
      ) : (
        <AdminTableState colSpan={COLS} kind='empty' message='Chưa có người dùng nào.' />
      );

    return filteredUsers.map((user) => (
      <tr key={user.id} className={adminTable.tr}>
        <td className={adminTable.td}>
          <div className='flex items-center gap-3 min-w-[240px]'>
            <div
              className='w-9 h-9 rounded-full bg-admin-subtle border border-admin-line text-admin-ink flex items-center justify-center font-semibold text-sm shrink-0'
              aria-hidden
            >
              {(user.fullName || user.email).charAt(0).toUpperCase()}
            </div>
            <div className='min-w-0'>
              <div className='font-semibold text-admin-ink-strong break-words'>
                {user.fullName || (
                  <span className='text-admin-muted font-normal'>Chưa đặt tên</span>
                )}
              </div>
              <div className='text-admin-muted break-all'>{user.email}</div>
            </div>
          </div>
        </td>
        <td className={adminTable.td}>{renderProjectRoles(user)}</td>
        <td className={adminTable.td}>
          {user.twoFactorEnabled ? (
            <AdminBadge tone='success'>
              <Shield className='w-3 h-3' aria-hidden />
              Đã bật
            </AdminBadge>
          ) : (
            <AdminBadge>Chưa bật</AdminBadge>
          )}
        </td>
        <td className={adminTable.td}>
          {user.isEmailConfirmed ? (
            <span className='inline-flex items-center gap-1 whitespace-nowrap text-emerald-800'>
              <CheckCircle2 className='w-4 h-4' aria-hidden /> Đã xác thực
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 whitespace-nowrap text-amber-800'>
              <AlertCircle className='w-4 h-4' aria-hidden /> Chưa xác thực
            </span>
          )}
        </td>
        <td className={`${adminTable.td} whitespace-nowrap tabular-nums text-admin-muted`}>
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
        </td>
        <td className={`${adminTable.td} text-right`}>
          <div className='flex justify-end gap-1'>
            <AdminButton
              size='sm'
              onClick={() => {
                setAssigningUser(user);
                setSelectedNewRoles(
                  user.canCreateStudio && user.role.toLowerCase() !== 'admin'
                    ? ['Producer']
                    : [user.role || 'User'],
                );
              }}
            >
              Phân quyền
            </AdminButton>
            <AdminButton size='sm' variant='ghost' onClick={() => setInspectUser(user)}>
              Chi tiết
            </AdminButton>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className='bg-admin-card rounded-2xl border border-admin-line overflow-hidden'>
      <div className={adminTable.wrap}>
        <table className={adminTable.table}>
          <thead className={adminTable.thead}>
            <tr>
              <th className={adminTable.th}>Người dùng</th>
              <th className={adminTable.th}>Vai trò</th>
              <th className={adminTable.th}>2FA</th>
              <th className={adminTable.th}>Email</th>
              <th className={adminTable.th}>Ngày đăng ký</th>
              <th className={`${adminTable.th} text-right`}>Thao tác</th>
            </tr>
          </thead>
          <tbody className={adminTable.tbody}>{body()}</tbody>
        </table>
      </div>
      <AdminPagination
        page={page}
        totalPages={totalPages}
        shown={filteredUsers.length}
        total={total}
        unit='tài khoản'
        disabled={loading}
        onPageChange={setPage}
      />
    </div>
  );
};
