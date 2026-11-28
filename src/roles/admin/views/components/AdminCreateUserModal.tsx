import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { adminService, type AdminUserItem, type CreateUserPayload } from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminField, AdminModal } from './AdminUi';
import { adminFieldClass } from './adminUiStyles';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

interface Draft {
  email: string;
  fullName: string;
  password: string;
  role: CreateUserPayload['role'];
}

/**
 * Admin tạo tài khoản trong app (UC-01). Admin đầu tiên tạo thẳng trong DB; các Admin sau tạo tại đây.
 * Tài khoản tạo bởi Admin được kích hoạt và xác thực email sẵn, Admin tự gửi mật khẩu cho người nhận.
 */
export const AdminCreateUserModal: React.FC<{
  onClose: () => void;
  onCreated: (user: AdminUserItem) => void;
}> = ({ onClose, onCreated }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>({
    email: '',
    fullName: '',
    password: '',
    role: 'User',
  });
  const [touched, setTouched] = useState(false);
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...draft, [key]: e.target.value });

  const errors = {
    email: EMAIL_RE.test(draft.email.trim()) ? null : t('admin.users.createModal.errors.email'),
    fullName: draft.fullName.trim() ? null : t('admin.users.createModal.errors.fullName'),
    password:
      draft.password.length >= MIN_PASSWORD
        ? null
        : t('admin.users.createModal.errors.password', { min: MIN_PASSWORD }),
  };
  const err = (key: keyof typeof errors) => (touched ? errors[key] : null);

  const create = useMutation({
    mutationFn: (payload: CreateUserPayload) => adminService.createUser(payload),
    onSuccess: (user) => onCreated(user),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean) || create.isPending) return;
    create.mutate({
      email: draft.email.trim(),
      fullName: draft.fullName.trim(),
      password: draft.password,
      role: draft.role,
      isActive: true,
    });
  };

  const roles: { key: Draft['role']; label: string; desc: string }[] = [
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

  return (
    <AdminModal
      title={t('admin.users.createModal.title')}
      description={t('admin.users.createModal.description')}
      onClose={onClose}
      footer={
        <>
          <AdminButton onClick={onClose} disabled={create.isPending}>
            {t('admin.users.assignModal.cancel')}
          </AdminButton>
          <AdminButton
            type='submit'
            form='admin-create-user-form'
            variant='primary'
            isLoading={create.isPending}
          >
            {t('admin.users.createModal.submit')}
          </AdminButton>
        </>
      }
    >
      <form id='admin-create-user-form' onSubmit={submit} noValidate className='space-y-4'>
        <AdminField
          label={t('admin.users.createModal.email')}
          htmlFor='create-user-email'
          required
          error={err('email')}
        >
          <input
            id='create-user-email'
            type='email'
            value={draft.email}
            onChange={set('email')}
            autoComplete='off'
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField
          label={t('admin.users.createModal.fullName')}
          htmlFor='create-user-name'
          required
          error={err('fullName')}
        >
          <input
            id='create-user-name'
            value={draft.fullName}
            onChange={set('fullName')}
            maxLength={100}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField
          label={t('admin.users.createModal.password')}
          htmlFor='create-user-password'
          required
          hint={t('admin.users.createModal.passwordHint')}
          error={err('password')}
        >
          <input
            id='create-user-password'
            type='password'
            value={draft.password}
            onChange={set('password')}
            autoComplete='new-password'
            className={adminFieldClass}
          />
        </AdminField>
        <fieldset className='space-y-2'>
          <legend className='text-sm font-semibold text-admin-ink mb-2'>
            {t('admin.users.assignModal.systemPermission')}
          </legend>
          {roles.map((r) => (
            <label
              key={r.key}
              className='flex items-start gap-3 p-3 rounded-xl border border-admin-line bg-admin-field cursor-pointer has-[:checked]:border-admin-accent has-[:checked]:bg-admin-accent-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-admin-accent'
            >
              <input
                type='radio'
                name='createUserRole'
                className='mt-0.5 w-4 h-4 accent-[#F97316] cursor-pointer'
                checked={draft.role === r.key}
                onChange={() => setDraft({ ...draft, role: r.key })}
              />
              <span>
                <span className='block text-sm font-semibold text-admin-ink-strong'>{r.label}</span>
                <span className='block text-sm text-admin-muted'>{r.desc}</span>
              </span>
            </label>
          ))}
        </fieldset>
        {create.isError && (
          <p className='text-sm text-red-700' role='alert'>
            {(create.error as Error).message}
          </p>
        )}
      </form>
    </AdminModal>
  );
};
