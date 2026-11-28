import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminService, type AdminEmailSettingsDto } from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import { AdminBadge, AdminButton, AdminCard } from '../components/AdminUi';

export const EMAIL_SETTINGS_HISTORY_KEY = ['adminEmailSettingsHistory'];

/**
 * Lịch sử cấu hình SMTP (append-only). Khôi phục không sửa bản cũ mà lưu một bản mới chép nguyên giá trị,
 * nên cần bấm xác nhận lần hai trước khi gửi.
 */
export const EmailSettingsHistoryCard: React.FC<{
  onRestored: (settings: AdminEmailSettingsDto, changedAt: string) => void;
  onError: (message: string) => void;
}> = ({ onRestored, onError }) => {
  const { t, lang } = useTranslation();
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }),
    [lang],
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: EMAIL_SETTINGS_HISTORY_KEY,
    queryFn: adminService.getEmailSettingsHistory,
  });

  const restore = useMutation({
    mutationFn: (version: { id: string; changedAt: string }) =>
      adminService.restoreEmailSettings(version.id),
    onSuccess: (settings, version) => {
      setConfirmingId(null);
      onRestored(settings, dateTime.format(new Date(version.changedAt)));
    },
    onError: (err: Error) => onError(err.message),
  });

  return (
    <AdminCard
      title={t('admin.emailSettings.history.title')}
      description={t('admin.emailSettings.history.description')}
    >
      {isLoading ? (
        <p className='text-sm text-admin-muted'>{t('admin.emailSettings.history.loading')}</p>
      ) : isError ? (
        <div className='flex flex-wrap items-center gap-3' role='alert'>
          <p className='text-sm text-red-700'>{(error as Error).message}</p>
          <AdminButton size='sm' onClick={() => refetch()}>
            {t('admin.emailSettings.history.retry')}
          </AdminButton>
        </div>
      ) : !data?.length ? (
        <p className='text-sm text-admin-muted'>{t('admin.emailSettings.history.empty')}</p>
      ) : (
        <ul className='divide-y divide-admin-line'>
          {data.map((v) => (
            <li key={v.id} className='flex flex-wrap items-center justify-between gap-3 py-3'>
              <div className='min-w-0'>
                <p className='text-sm font-semibold text-admin-ink-strong break-all'>
                  {t('admin.emailSettings.history.entry', {
                    sender: v.senderEmail,
                    server: v.smtpServer,
                    port: v.smtpPort,
                  })}
                </p>
                <p className='text-xs text-admin-muted'>
                  {t('admin.emailSettings.history.by', {
                    date: dateTime.format(new Date(v.changedAt)),
                    name: v.changedByName ?? '—',
                  })}
                </p>
              </div>
              {v.isCurrent ? (
                <AdminBadge tone='success'>{t('admin.emailSettings.history.current')}</AdminBadge>
              ) : confirmingId === v.id ? (
                <div className='flex gap-2'>
                  <AdminButton
                    size='sm'
                    onClick={() => setConfirmingId(null)}
                    disabled={restore.isPending}
                  >
                    {t('admin.emailSettings.history.cancel')}
                  </AdminButton>
                  <AdminButton
                    size='sm'
                    variant='primary'
                    isLoading={restore.isPending}
                    onClick={() => restore.mutate(v)}
                  >
                    {t('admin.emailSettings.history.confirmRestore')}
                  </AdminButton>
                </div>
              ) : (
                <AdminButton
                  size='sm'
                  onClick={() => setConfirmingId(v.id)}
                  disabled={restore.isPending}
                >
                  {t('admin.emailSettings.history.restore')}
                </AdminButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
};
