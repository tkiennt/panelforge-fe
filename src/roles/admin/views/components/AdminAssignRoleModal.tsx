import React from 'react';
import { AdminUserItem } from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminModal } from './AdminUi';

interface AdminAssignRoleModalProps {
  user: AdminUserItem;
  selectedNewRoles: string[];
  setSelectedNewRoles: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const AdminAssignRoleModal: React.FC<AdminAssignRoleModalProps> = ({
  user,
  selectedNewRoles,
  setSelectedNewRoles,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const { t } = useTranslation();

  const options = [
    {
      key: 'Producer',
      label: t('admin.users.assignModal.producerLabel'),
      desc: t('admin.users.assignModal.producerDesc'),
    },
    {
      key: 'User',
      label: t('admin.users.assignModal.userLabel'),
      desc: t('admin.users.assignModal.userDesc'),
    },
    {
      key: 'Admin',
      label: t('admin.users.assignModal.adminLabel'),
      desc: t('admin.users.assignModal.adminDesc'),
    },
  ];

  const currentRoleLabel =
    user.canCreateStudio && user.role.toLowerCase() !== 'admin'
      ? t('admin.users.roles.producer')
      : user.role === 'Admin'
        ? t('admin.users.roles.admin')
        : t('admin.users.roles.user');

  return (
    <AdminModal
      title={t('admin.users.assignModal.title')}
      description={
        <span className='break-all'>
          {user.email} · {t('admin.users.assignModal.currentRolePrefix')}{' '}
          <strong className='text-admin-ink'>{currentRoleLabel}</strong>
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose} disabled={isSubmitting}>
            {t('admin.users.assignModal.cancel')}
          </AdminButton>
          <AdminButton
            type='submit'
            form='admin-assign-role-form'
            variant='primary'
            isLoading={isSubmitting}
          >
            {t('admin.users.assignModal.save')}
          </AdminButton>
        </>
      }
    >
      <form id='admin-assign-role-form' onSubmit={onSubmit} className='space-y-3'>
        <fieldset className='space-y-2'>
          <legend className='text-sm font-semibold text-admin-ink mb-2'>
            {t('admin.users.assignModal.systemPermission')}
          </legend>
          {options.map((r) => {
            const isSelected = selectedNewRoles.includes(r.key);
            return (
              <label
                key={r.key}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-admin-accent',
                  isSelected
                    ? 'border-admin-accent bg-admin-accent-soft'
                    : 'border-admin-line bg-admin-field hover:bg-admin-hover',
                )}
              >
                <input
                  type='radio'
                  name='roleOption'
                  className='mt-0.5 w-4 h-4 accent-[#F97316] cursor-pointer'
                  checked={isSelected}
                  onChange={() => setSelectedNewRoles([r.key])}
                />
                <span>
                  <span className='block text-sm font-semibold text-admin-ink-strong'>
                    {r.label}
                  </span>
                  <span className='block text-sm text-admin-muted'>{r.desc}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <p className='text-xs text-admin-muted'>{t('admin.users.assignModal.projectRolesNote')}</p>
      </form>
    </AdminModal>
  );
};
