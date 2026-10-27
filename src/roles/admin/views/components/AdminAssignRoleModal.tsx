import React from 'react';
import { AdminUserItem } from '@/services/admin.service';
import { cn } from '@/lib/utils';
import { AdminButton, AdminModal } from './AdminUi';

interface AdminAssignRoleModalProps {
  user: AdminUserItem;
  selectedNewRoles: string[];
  setSelectedNewRoles: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

const OPTIONS = [
  {
    key: 'Producer',
    label: 'Có quyền tạo Studio',
    desc: 'Có thể tạo Studio và quản lý dự án của mình.',
  },
  {
    key: 'User',
    label: 'Người dùng',
    desc: 'Chỉ tham gia các Studio được mời.',
  },
];

const currentRoleLabel = (user: AdminUserItem) =>
  user.canCreateStudio && user.role.toLowerCase() !== 'admin'
    ? 'Có quyền tạo Studio'
    : user.role === 'Admin'
      ? 'Quản trị viên'
      : 'Người dùng';

export const AdminAssignRoleModal: React.FC<AdminAssignRoleModalProps> = ({
  user,
  selectedNewRoles,
  setSelectedNewRoles,
  onClose,
  onSubmit,
  isSubmitting,
}) => (
  <AdminModal
    title='Phân quyền tài khoản'
    description={
      <span className='break-all'>
        {user.email} · Hiện tại:{' '}
        <strong className='text-admin-ink'>{currentRoleLabel(user)}</strong>
      </span>
    }
    onClose={onClose}
    footer={
      <>
        <AdminButton onClick={onClose} disabled={isSubmitting}>
          Hủy
        </AdminButton>
        <AdminButton
          type='submit'
          form='admin-assign-role-form'
          variant='primary'
          isLoading={isSubmitting}
        >
          Lưu thay đổi
        </AdminButton>
      </>
    }
  >
    <form id='admin-assign-role-form' onSubmit={onSubmit} className='space-y-3'>
      <fieldset className='space-y-2'>
        <legend className='text-sm font-semibold text-admin-ink mb-2'>Quyền hệ thống</legend>
        {OPTIONS.map((r) => {
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
                <span className='block text-sm font-semibold text-admin-ink-strong'>{r.label}</span>
                <span className='block text-sm text-admin-muted'>{r.desc}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <p className='text-xs text-admin-muted'>
        Vai trò trong từng dự án (Writer, Artist, Editor…) do Producer của Studio quản lý.
      </p>
    </form>
  </AdminModal>
);
