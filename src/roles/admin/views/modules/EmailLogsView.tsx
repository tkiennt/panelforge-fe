import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { AdminPageHeader } from '../components/AdminUi';
import { EmailDeliveryLogCard } from './EmailDeliveryLogCard';

/** Mục menu riêng "Lịch sử email" (tab email-logs): cùng nhật ký gửi email đang có trong Cấu hình email. */
export const EmailLogsView: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className='space-y-6'>
      <AdminPageHeader
        title={t('admin.emailLogs.pageTitle')}
        description={t('admin.emailLogs.pageDescription')}
      />
      <EmailDeliveryLogCard />
    </div>
  );
};
