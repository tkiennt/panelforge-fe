import React, { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import {
  adminService,
  EMAIL_LOGS_QUERY_KEY,
  EMAIL_MAIL_TYPES,
  type EmailLogsQuery,
  type EmailMailType,
} from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminPagination,
  AdminTableState,
} from '../components/AdminUi';
import { adminFieldClass, adminTable } from '../components/adminUiStyles';

const PAGE_SIZE = 20;

type ResultFilter = 'all' | 'failed' | 'sent';

// Ô date là ngày địa phương: từ đầu ngày "Từ" tới hết ngày "Đến", gửi lên dạng UTC.
const startOfDay = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const endOfDay = (d: string) => new Date(`${d}T23:59:59.999`).toISOString();

/**
 * Nhật ký gửi email (GET /api/admin/email-logs): mỗi lần hệ thống gửi OTP, đặt lại mật khẩu, lời mời Studio
 * hay email thử đều có một dòng, kèm lý do và phản hồi của SMTP khi lỗi. Nội dung thư không được lưu.
 */
export const EmailDeliveryLogCard: React.FC = () => {
  const { t, lang } = useTranslation();
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'medium' }),
    [lang],
  );

  const [result, setResult] = useState<ResultFilter>('all');
  const [mailType, setMailType] = useState<EmailMailType | ''>('');
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const params: EmailLogsQuery = {
    succeeded: result === 'all' ? undefined : result === 'sent',
    mailType: mailType || undefined,
    search: search || undefined,
    from: fromDate ? startOfDay(fromDate) : undefined,
    to: toDate ? endOfDay(toDate) : undefined,
    page,
    pageSize: PAGE_SIZE,
  };
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: [...EMAIL_LOGS_QUERY_KEY, params],
    queryFn: () => adminService.getEmailLogs(params),
    placeholderData: keepPreviousData,
  });

  const filtered =
    result !== 'all' || mailType !== '' || search !== '' || fromDate !== '' || toDate !== '';
  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 1;

  return (
    <AdminCard
      title={t('admin.emailLogs.title')}
      description={t('admin.emailLogs.description')}
      bodyClassName='p-0'
      actions={
        data && (
          <AdminBadge tone={data.failedLast24h > 0 ? 'danger' : 'success'}>
            {t('admin.emailLogs.failed24h', { count: data.failedLast24h })}
          </AdminBadge>
        )
      }
    >
      <form
        role='search'
        className='flex flex-col gap-3 px-5 py-4 border-b border-admin-line md:flex-row md:items-center'
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchDraft.trim());
          setPage(1);
        }}
      >
        <label className='sr-only' htmlFor='email-log-result'>
          {t('admin.emailLogs.filterResult')}
        </label>
        <select
          id='email-log-result'
          value={result}
          onChange={(e) => {
            setResult(e.target.value as ResultFilter);
            setPage(1);
          }}
          className={`${adminFieldClass} md:w-44`}
        >
          <option value='all'>{t('admin.emailLogs.resultAll')}</option>
          <option value='failed'>{t('admin.emailLogs.resultFailed')}</option>
          <option value='sent'>{t('admin.emailLogs.resultSent')}</option>
        </select>
        <label className='sr-only' htmlFor='email-log-type'>
          {t('admin.emailLogs.filterType')}
        </label>
        <select
          id='email-log-type'
          value={mailType}
          onChange={(e) => {
            setMailType(e.target.value as EmailMailType | '');
            setPage(1);
          }}
          className={`${adminFieldClass} md:w-56`}
        >
          <option value=''>{t('admin.emailLogs.typeAll')}</option>
          {EMAIL_MAIL_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`admin.emailLogs.type.${type}`)}
            </option>
          ))}
        </select>
        <label className='sr-only' htmlFor='email-log-from'>
          {t('admin.emailLogs.filterFrom')}
        </label>
        <input
          id='email-log-from'
          type='date'
          value={fromDate}
          max={toDate || undefined}
          title={t('admin.emailLogs.filterFrom')}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          className={`${adminFieldClass} md:w-40`}
        />
        <label className='sr-only' htmlFor='email-log-to'>
          {t('admin.emailLogs.filterTo')}
        </label>
        <input
          id='email-log-to'
          type='date'
          value={toDate}
          min={fromDate || undefined}
          title={t('admin.emailLogs.filterTo')}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
          className={`${adminFieldClass} md:w-40`}
        />
        <div className='flex flex-1 gap-2 min-w-0'>
          <label className='sr-only' htmlFor='email-log-search'>
            {t('admin.emailLogs.searchLabel')}
          </label>
          <input
            id='email-log-search'
            type='search'
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={t('admin.emailLogs.searchPlaceholder')}
            className={adminFieldClass}
          />
          <AdminButton
            type='submit'
            variant='secondary'
            size='icon'
            aria-label={t('admin.emailLogs.searchLabel')}
            icon={<Search className='w-4 h-4' />}
          />
        </div>
      </form>

      <div className={adminTable.wrap}>
        <table className={adminTable.table}>
          <thead className={adminTable.thead}>
            <tr>
              <th className={adminTable.th}>{t('admin.emailLogs.colTime')}</th>
              <th className={adminTable.th}>{t('admin.emailLogs.colRecipient')}</th>
              <th className={adminTable.th}>{t('admin.emailLogs.colType')}</th>
              <th className={adminTable.th}>{t('admin.emailLogs.colResult')}</th>
              <th className={adminTable.th}>{t('admin.emailLogs.colReason')}</th>
            </tr>
          </thead>
          <tbody className={adminTable.tbody}>
            {isLoading ? (
              <AdminTableState colSpan={5} kind='loading' message={t('admin.emailLogs.loading')} />
            ) : isError ? (
              <AdminTableState
                colSpan={5}
                kind='error'
                message={(error as Error).message}
                action={
                  <AdminButton size='sm' onClick={() => refetch()}>
                    {t('admin.emailLogs.retry')}
                  </AdminButton>
                }
              />
            ) : !data || data.items.length === 0 ? (
              <AdminTableState
                colSpan={5}
                kind={filtered ? 'no-results' : 'empty'}
                message={filtered ? t('admin.emailLogs.noResults') : t('admin.emailLogs.empty')}
              />
            ) : (
              data.items.map((log) => (
                <tr key={log.id} className={adminTable.tr}>
                  <td className={`${adminTable.td} whitespace-nowrap tabular-nums`}>
                    {dateTime.format(new Date(log.createdAt))}
                  </td>
                  <td className={`${adminTable.td} break-all`}>{log.toEmail}</td>
                  <td className={`${adminTable.td} whitespace-nowrap`}>
                    {t(`admin.emailLogs.type.${log.mailType}`)}
                  </td>
                  <td className={adminTable.td}>
                    <AdminBadge tone={log.succeeded ? 'success' : 'danger'}>
                      {log.succeeded ? t('admin.emailLogs.sent') : t('admin.emailLogs.failed')}
                    </AdminBadge>
                  </td>
                  <td className={`${adminTable.td} max-w-md`}>
                    {log.failureReason ? (
                      <div className='space-y-1'>
                        <div>{t(`admin.emailSettings.reason.${log.failureReason}`)}</div>
                        {log.errorDetail && (
                          <code className='block font-mono text-xs text-admin-muted break-words'>
                            {log.errorDetail}
                          </code>
                        )}
                      </div>
                    ) : (
                      <span className='text-admin-muted'>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalCount > 0 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          shown={data.items.length}
          total={data.totalCount}
          unit={t('admin.emailLogs.unit')}
          disabled={isFetching}
          onPageChange={setPage}
        />
      )}
    </AdminCard>
  );
};
