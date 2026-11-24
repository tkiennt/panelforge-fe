import React from 'react';
import { CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { AdminUserItem } from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
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
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const body = () => {
    if (loading)
      return (
        <AdminTableState colSpan={COLS} kind='loading' message={t('admin.users.table.loading')} />
      );
    if (isError)
      return (
        <AdminTableState
          colSpan={COLS}
          kind='error'
          message={t('admin.users.table.loadError')}
          action={
            onRetry && (
              <AdminButton size='sm' onClick={onRetry}>
                {t('admin.users.table.retry')}
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
          message={t('admin.users.table.noResults')}
          hint={t('admin.users.table.noResultsHint')}
        />
      ) : (
        <AdminTableState colSpan={COLS} kind='empty' message={t('admin.users.table.empty')} />
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
                  <span className='text-admin-muted font-normal'>
                    {t('admin.users.table.unnamed')}
                  </span>
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
              {t('admin.users.table.twoFactorEnabled')}
            </AdminBadge>
          ) : (
            <AdminBadge>{t('admin.users.table.twoFactorDisabled')}</AdminBadge>
          )}
        </td>
        <td className={adminTable.td}>
          {user.isEmailConfirmed ? (
            <span className='inline-flex items-center gap-1 whitespace-nowrap text-emerald-800'>
              <CheckCircle2 className='w-4 h-4' aria-hidden />{' '}
              {t('admin.users.table.emailVerified')}
            </span>
          ) : (
            <span className='inline-flex items-center gap-1 whitespace-nowrap text-amber-800'>
              <AlertCircle className='w-4 h-4' aria-hidden />{' '}
              {t('admin.users.table.emailUnverified')}
            </span>
          )}
        </td>
        <td className={`${adminTable.td} whitespace-nowrap tabular-nums text-admin-muted`}>
          {user.createdAt ? new Date(user.createdAt).toLocaleDateString(locale) : '—'}
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
              {t('admin.users.table.assignRole')}
            </AdminButton>
            <AdminButton size='sm' variant='ghost' onClick={() => setInspectUser(user)}>
              {t('admin.users.table.details')}
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
              <th className={adminTable.th}>{t('admin.users.table.colUser')}</th>
              <th className={adminTable.th}>{t('admin.users.table.colRole')}</th>
              <th className={adminTable.th}>{t('admin.users.table.col2fa')}</th>
              <th className={adminTable.th}>{t('admin.users.table.colEmail')}</th>
              <th className={adminTable.th}>{t('admin.users.table.colRegisteredAt')}</th>
              <th className={`${adminTable.th} text-right`}>{t('admin.users.table.colActions')}</th>
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
        unit={t('admin.users.table.unit')}
        disabled={loading}
        onPageChange={setPage}
      />
    </div>
  );
};
