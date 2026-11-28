import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MailWarning } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import { AdminButton } from '../components/AdminUi';

interface EmailHealthAlertProps {
  onOpenSettings?: () => void;
  onOpenLogs?: () => void;
}

/**
 * Cảnh báo trên Tổng quan Admin khi email hệ thống không gửi được (chưa cấu hình SMTP dùng được,
 * hoặc lần gửi gần nhất lỗi), để người dùng không âm thầm mất OTP xác thực / đặt lại mật khẩu.
 * Không hiện gì khi bình thường, đang tải, hoặc khi không lấy được trạng thái.
 */
export const EmailHealthAlert: React.FC<EmailHealthAlertProps> = ({
  onOpenSettings,
  onOpenLogs,
}) => {
  const { t, lang } = useTranslation();
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }),
    [lang],
  );
  const { data } = useQuery({
    queryKey: ['adminEmailHealth'],
    queryFn: adminService.getEmailHealth,
    refetchInterval: 60_000,
  });

  if (!data || data.status === 'OK') return null;

  const notConfigured = data.status === 'NOT_CONFIGURED';
  return (
    <div
      role='alert'
      className='flex flex-wrap items-start justify-between gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50 text-sm text-amber-900'
    >
      <div className='flex items-start gap-2 min-w-0'>
        <MailWarning className='w-4 h-4 mt-0.5 shrink-0' aria-hidden />
        <div className='min-w-0 space-y-1'>
          <p className='font-semibold'>
            {notConfigured
              ? t('admin.emailHealth.notConfiguredTitle')
              : t('admin.emailHealth.lastFailedTitle')}
          </p>
          <p>
            {notConfigured
              ? t('admin.emailHealth.notConfiguredBody')
              : t('admin.emailHealth.lastFailedBody', {
                  date: data.lastSentAt ? dateTime.format(new Date(data.lastSentAt)) : '—',
                  failed: data.recentFailed,
                  total: data.recentTotal,
                  hours: data.windowHours,
                })}
          </p>
          {!notConfigured && data.lastFailureReason && (
            <p className='text-xs'>{t(`admin.emailSettings.reason.${data.lastFailureReason}`)}</p>
          )}
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {!notConfigured && onOpenLogs && (
          <AdminButton size='sm' variant='secondary' onClick={onOpenLogs}>
            {t('admin.emailHealth.openLogs')}
          </AdminButton>
        )}
        {onOpenSettings && (
          <AdminButton size='sm' variant='primary' onClick={onOpenSettings}>
            {t('admin.emailHealth.openSettings')}
          </AdminButton>
        )}
      </div>
    </div>
  );
};
