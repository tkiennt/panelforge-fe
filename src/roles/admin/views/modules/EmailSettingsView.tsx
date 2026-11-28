import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import {
  adminService,
  EMAIL_LOGS_QUERY_KEY,
  EmailDeliveryError,
  type AdminEmailSettingsDto,
  type UpdateEmailSettingsRequest,
} from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  AdminToast,
} from '../components/AdminUi';
import { adminFieldClass, useAdminToast } from '../components/adminUiStyles';
import { EmailDeliveryLogCard } from './EmailDeliveryLogCard';

const QUERY_KEY = ['adminEmailSettings'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Draft {
  smtpServer: string;
  smtpPort: string;
  senderName: string;
  senderEmail: string;
  password: string;
}

const toDraft = (s?: AdminEmailSettingsDto): Draft => ({
  smtpServer: s?.smtpServer ?? 'smtp.gmail.com',
  smtpPort: String(s?.smtpPort ?? 587),
  senderName: s?.senderName ?? 'PanelForge',
  senderEmail: s?.senderEmail ?? '',
  password: '',
});

/**
 * Admin cấu hình SMTP gửi email hệ thống (OTP xác thực tài khoản, đặt lại mật khẩu, lời mời Studio).
 * Mỗi lần lưu là một bản cấu hình mới (append-only, có audit); mật khẩu không bao giờ được trả về trình duyệt.
 */
export const EmailSettingsView: React.FC = () => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const { toast, show: showToast, clear: clearToast } = useAdminToast(5000);
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }),
    [lang],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminService.getEmailSettings,
  });

  // Bản nháp chỉ khởi tạo từ dữ liệu server một lần, sau đó người dùng sửa tự do.
  const [draft, setDraft] = useState<Draft | null>(null);
  const form = draft ?? toDraft(data);
  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft({ ...form, [key]: e.target.value });

  const port = Number(form.smtpPort);
  const errors = {
    smtpServer:
      form.smtpServer.trim() === '' || /\s|:\/\//.test(form.smtpServer.trim())
        ? t('admin.emailSettings.errors.server')
        : null,
    smtpPort:
      !Number.isInteger(port) || port < 1 || port > 65535
        ? t('admin.emailSettings.errors.port')
        : null,
    senderName: form.senderName.trim() === '' ? t('admin.emailSettings.errors.senderName') : null,
    senderEmail: !EMAIL_RE.test(form.senderEmail.trim())
      ? t('admin.emailSettings.errors.senderEmail')
      : null,
    password:
      !data?.hasPassword && form.password.trim() === ''
        ? t('admin.emailSettings.errors.passwordRequired')
        : null,
  };
  const valid = Object.values(errors).every((e) => e === null);

  const save = useMutation({
    mutationFn: (request: UpdateEmailSettingsRequest) => adminService.updateEmailSettings(request),
    onSuccess: (next) => {
      queryClient.setQueryData(QUERY_KEY, next);
      setDraft(null);
      showToast(t('admin.emailSettings.saved'));
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  // Lỗi gửi thử hiện ngay trong trang (không chỉ toast) để Admin đọc được phản hồi của máy chủ SMTP khi sửa cấu hình.
  const [testFailure, setTestFailure] = useState<EmailDeliveryError | null>(null);
  const sendTest = useMutation({
    mutationFn: adminService.sendTestEmail,
    onMutate: () => setTestFailure(null),
    onSuccess: ({ sentTo }) => showToast(t('admin.emailSettings.testSent', { email: sentTo })),
    onError: (err: Error) =>
      err instanceof EmailDeliveryError ? setTestFailure(err) : showToast(err.message, 'error'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: EMAIL_LOGS_QUERY_KEY }),
  });

  const [touched, setTouched] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    save.mutate({
      smtpServer: form.smtpServer.trim(),
      smtpPort: port,
      senderName: form.senderName.trim(),
      senderEmail: form.senderEmail.trim(),
      password: form.password.trim() === '' ? null : form.password,
    });
  };
  const err = (key: keyof typeof errors) => (touched ? errors[key] : null);

  return (
    <div className='space-y-6'>
      <AdminToast toast={toast} onClose={clearToast} />
      <AdminPageHeader
        title={t('admin.emailSettings.title')}
        description={t('admin.emailSettings.description')}
        actions={
          <AdminButton
            variant='secondary'
            onClick={() => sendTest.mutate()}
            isLoading={sendTest.isPending}
            disabled={isLoading || save.isPending}
          >
            {t('admin.emailSettings.sendTest')}
          </AdminButton>
        }
      />

      {testFailure && (
        <div
          role='alert'
          className='flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900'
        >
          <AlertCircle className='w-4 h-4 mt-0.5 shrink-0 text-rose-600' aria-hidden />
          <div className='min-w-0 space-y-1'>
            <p className='font-semibold'>{t('admin.emailSettings.testFailedTitle')}</p>
            <p>{t(`admin.emailSettings.reason.${testFailure.reason}`)}</p>
            {testFailure.detail && (
              <p className='text-xs text-rose-800 break-words'>
                {t('admin.emailSettings.smtpReply')}{' '}
                <code className='font-mono'>{testFailure.detail}</code>
              </p>
            )}
          </div>
        </div>
      )}

      {isError ? (
        <p className='text-sm text-red-700' role='alert'>
          {(error as Error).message}
        </p>
      ) : (
        <AdminCard
          title={t('admin.emailSettings.cardTitle')}
          description={t('admin.emailSettings.cardDescription')}
          actions={
            data && (
              <AdminBadge tone={data.isConfigured ? 'success' : 'warning'}>
                {data.isConfigured
                  ? t('admin.emailSettings.statusConfigured')
                  : t('admin.emailSettings.statusFallback')}
              </AdminBadge>
            )
          }
        >
          {data?.changedAt && (
            <p className='mb-4 text-xs text-admin-muted'>
              {t('admin.emailSettings.changed', {
                date: dateTime.format(new Date(data.changedAt)),
                name: data.changedByName ?? '—',
              })}
            </p>
          )}

          <form onSubmit={submit} noValidate className='grid gap-4 md:grid-cols-2'>
            <AdminField
              label={t('admin.emailSettings.server')}
              htmlFor='email-smtp-server'
              required
              hint={t('admin.emailSettings.serverHint')}
              error={err('smtpServer')}
            >
              <input
                id='email-smtp-server'
                value={form.smtpServer}
                onChange={set('smtpServer')}
                autoComplete='off'
                spellCheck={false}
                disabled={isLoading}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminField
              label={t('admin.emailSettings.port')}
              htmlFor='email-smtp-port'
              required
              hint={t('admin.emailSettings.portHint')}
              error={err('smtpPort')}
            >
              <input
                id='email-smtp-port'
                type='number'
                inputMode='numeric'
                min={1}
                max={65535}
                value={form.smtpPort}
                onChange={set('smtpPort')}
                disabled={isLoading}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminField
              label={t('admin.emailSettings.senderName')}
              htmlFor='email-sender-name'
              required
              error={err('senderName')}
            >
              <input
                id='email-sender-name'
                value={form.senderName}
                onChange={set('senderName')}
                maxLength={100}
                disabled={isLoading}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminField
              label={t('admin.emailSettings.senderEmail')}
              htmlFor='email-sender-email'
              required
              error={err('senderEmail')}
            >
              <input
                id='email-sender-email'
                type='email'
                value={form.senderEmail}
                onChange={set('senderEmail')}
                autoComplete='off'
                disabled={isLoading}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminField
              label={t('admin.emailSettings.password')}
              htmlFor='email-smtp-password'
              required={!data?.hasPassword}
              hint={
                data?.hasPassword
                  ? t('admin.emailSettings.passwordKeep')
                  : t('admin.emailSettings.passwordHint')
              }
              error={err('password')}
              className='md:col-span-2'
            >
              <input
                id='email-smtp-password'
                type='password'
                value={form.password}
                onChange={set('password')}
                autoComplete='new-password'
                disabled={isLoading}
                className={adminFieldClass}
              />
            </AdminField>
            <div className='md:col-span-2 flex justify-end'>
              <AdminButton
                type='submit'
                variant='primary'
                isLoading={save.isPending}
                disabled={isLoading}
              >
                {t('admin.emailSettings.save')}
              </AdminButton>
            </div>
          </form>
        </AdminCard>
      )}

      <EmailDeliveryLogCard />
    </div>
  );
};
