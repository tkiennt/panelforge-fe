import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MailCheck, Send } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { adminDetailService, type AdminUserDetailDto } from '@/services/adminDetail.service';
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminModal,
  AdminToast,
} from '../../components/AdminUi';
import { adminFieldClass, useAdminToast } from '../../components/adminUiStyles';

const REASON_MAX = 500;

/**
 * Tài khoản chưa xác thực email: Admin gửi lại OTP hoặc xác thực thủ công kèm lý do (BE ghi audit log, BR-18).
 * Tài khoản đang chờ nhận lời mời Studio xác thực qua lời mời nên không có thao tác ở đây; BE cũng chặn (409).
 */
export const EmailVerificationCard: React.FC<{ user: AdminUserDetailDto }> = ({ user }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast, show: showToast, clear: clearToast } = useAdminToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adminUserDetail', user.id] });

  const resend = useMutation({
    mutationFn: () => adminDetailService.resendVerification(user.id),
    onSuccess: () => {
      showToast(t('admin.details.user.resendVerificationSent', { email: user.email }));
      refresh();
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const confirm = useMutation({
    mutationFn: (r: string) => adminDetailService.confirmEmail(user.id, r),
    onSuccess: () => {
      setConfirmOpen(false);
      setReason('');
      setTouched(false);
      showToast(t('admin.details.user.confirmEmailDone', { email: user.email }));
      refresh();
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const reasonError =
    touched && reason.trim() === '' ? t('admin.details.user.confirmEmailReasonRequired') : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (reason.trim() === '') return;
    confirm.mutate(reason.trim());
  };

  const busy = resend.isPending || confirm.isPending;
  const hint = user.isPendingInvitation
    ? t('admin.details.user.emailUnverifiedInvitationHint')
    : !user.isActive
      ? t('admin.details.user.emailUnverifiedLockedHint')
      : t('admin.details.user.emailUnverifiedHint', { email: user.email });

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />
      <AdminCard
        title={t('admin.details.user.emailUnverifiedTitle')}
        className='border-amber-200 bg-amber-50/60'
        actions={
          !user.isPendingInvitation && (
            <>
              <AdminButton
                size='sm'
                onClick={() => resend.mutate()}
                isLoading={resend.isPending}
                disabled={busy || !user.isActive}
                icon={<Send className='w-4 h-4' />}
              >
                {t('admin.details.user.resendVerification')}
              </AdminButton>
              <AdminButton
                size='sm'
                variant='primary'
                onClick={() => setConfirmOpen(true)}
                disabled={busy}
                icon={<MailCheck className='w-4 h-4' />}
              >
                {t('admin.details.user.confirmEmail')}
              </AdminButton>
            </>
          )
        }
      >
        <p className='text-sm text-admin-ink'>{hint}</p>
      </AdminCard>

      {confirmOpen && (
        <AdminModal
          title={t('admin.details.user.confirmEmailTitle')}
          description={t('admin.details.user.confirmEmailDescription', { email: user.email })}
          onClose={() => !confirm.isPending && setConfirmOpen(false)}
          footer={
            <>
              <AdminButton onClick={() => setConfirmOpen(false)} disabled={confirm.isPending}>
                {t('admin.details.user.confirmEmailCancel')}
              </AdminButton>
              <AdminButton
                type='submit'
                form='admin-confirm-email-form'
                variant='primary'
                isLoading={confirm.isPending}
              >
                {t('admin.details.user.confirmEmailSubmit')}
              </AdminButton>
            </>
          }
        >
          <form id='admin-confirm-email-form' onSubmit={submit} noValidate>
            <AdminField
              label={t('admin.details.user.confirmEmailReason')}
              htmlFor='admin-confirm-email-reason'
              required
              error={reasonError}
              hint={t('admin.details.user.confirmEmailReasonHint')}
            >
              <textarea
                id='admin-confirm-email-reason'
                rows={3}
                maxLength={REASON_MAX}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={!!reasonError}
                className={adminFieldClass}
              />
            </AdminField>
          </form>
        </AdminModal>
      )}
    </>
  );
};
