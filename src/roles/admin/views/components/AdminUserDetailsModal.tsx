import React from 'react';
import { AdminUserItem } from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminModal } from './AdminUi';

interface AdminUserDetailsModalProps {
  user: AdminUserItem;
  onClose: () => void;
  renderProjectRoles: (user: AdminUserItem) => React.ReactNode;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className='grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 py-2.5'>
    <dt className='text-sm text-admin-muted'>{label}</dt>
    <dd className='text-sm text-admin-ink min-w-0 break-words'>{children}</dd>
  </div>
);

export const AdminUserDetailsModal: React.FC<AdminUserDetailsModalProps> = ({
  user,
  onClose,
  renderProjectRoles,
}) => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';

  return (
    <AdminModal
      title={t('admin.users.detailsModal.title')}
      onClose={onClose}
      footer={<AdminButton onClick={onClose}>{t('admin.users.detailsModal.close')}</AdminButton>}
    >
      <dl className='divide-y divide-admin-line/70'>
        <Row label={t('admin.users.detailsModal.fullName')}>{user.fullName || '—'}</Row>
        <Row label={t('admin.users.detailsModal.email')}>
          <span className='break-all'>{user.email}</span>
        </Row>
        <Row label={t('admin.users.detailsModal.phoneNumber')}>
          <span className='tabular-nums'>{user.phoneNumber || '—'}</span>
        </Row>
        <Row label={t('admin.users.detailsModal.role')}>{renderProjectRoles(user)}</Row>
        <Row label={t('admin.users.detailsModal.twoFactor')}>
          {user.twoFactorEnabled ? (
            <span className='text-emerald-800 font-medium'>
              {t('admin.users.table.twoFactorEnabled')}
            </span>
          ) : (
            t('admin.users.table.twoFactorDisabled')
          )}
        </Row>
        <Row label={t('admin.users.detailsModal.emailVerification')}>
          {user.isEmailConfirmed
            ? t('admin.users.table.emailVerified')
            : t('admin.users.table.emailUnverified')}
        </Row>
        <Row label={t('admin.users.detailsModal.createdAt')}>
          <span className='tabular-nums'>
            {user.createdAt ? new Date(user.createdAt).toLocaleString(locale) : '—'}
          </span>
        </Row>
        <Row label={t('admin.users.detailsModal.accountId')}>
          <span className='font-mono text-xs break-all select-all'>{user.id}</span>
        </Row>
      </dl>
    </AdminModal>
  );
};
