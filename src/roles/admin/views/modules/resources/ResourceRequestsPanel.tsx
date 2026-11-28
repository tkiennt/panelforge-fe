import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  quotaService,
  QuotaIncreaseRequestDto,
  QuotaIncreaseRequestStatus,
  QuotaResourceType,
} from '@/services/quota.service';
import { fromQuotaInput, toQuotaInput } from '@/shared/features/quota/quotaUnits';
import { AdminButton, AdminField, AdminModal, AdminTableState } from '../../components/AdminUi';
import { adminFieldClass, adminTable } from '../../components/adminUiStyles';
import { RequestStatusBadge } from './ResourceUi';
import { formatAmount, useLocale } from './resourceFormat';

const STATUSES: QuotaIncreaseRequestStatus[] = ['Pending', 'Approved', 'Rejected'];
const TYPES: QuotaResourceType[] = ['Storage', 'AiTokens', 'AiImages', 'AiRequests'];
const COLS = 6;

/** Duyệt / từ chối yêu cầu tăng tài nguyên. Từ chối bắt buộc lý do; mỗi yêu cầu chỉ xử lý một lần (server chặn 409). */
export const ResourceRequestsPanel: React.FC<{ onReviewed: (message: string) => void }> = ({
  onReviewed,
}) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [status, setStatus] = useState<QuotaIncreaseRequestStatus | ''>('Pending');
  const [type, setType] = useState<QuotaResourceType | ''>('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<QuotaIncreaseRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<{
    req: QuotaIncreaseRequestDto;
    approve: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await quotaService.getRequests({
          status: status || undefined,
          resourceType: type || undefined,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [status, type]);

  useEffect(() => {
    load();
  }, [load]);

  // Tìm kiếm lọc tại chỗ trên danh sách đã tải (đã lọc trạng thái/loại ở server) để không gọi API mỗi phím gõ.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.workspaceName.toLowerCase().includes(q) ||
        r.requestedByName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className='bg-admin-card rounded-2xl border border-admin-line overflow-hidden'>
      <div className='flex flex-wrap items-center gap-3 px-5 py-3 border-b border-admin-line'>
        <div className='relative w-full sm:max-w-xs'>
          <Search
            className='w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
            aria-hidden
          />
          <input
            type='search'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.resources.requests.searchPlaceholder')}
            aria-label={t('admin.resources.requests.searchPlaceholder')}
            className={cn(adminFieldClass, 'pl-9')}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as QuotaIncreaseRequestStatus | '')}
          aria-label={t('admin.resources.requests.statusFilter')}
          className={cn(adminFieldClass, 'w-auto')}
        >
          <option value=''>{t('admin.resources.requests.allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.resources.requestStatus.${s}`)}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuotaResourceType | '')}
          aria-label={t('admin.resources.requests.typeFilter')}
          className={cn(adminFieldClass, 'w-auto')}
        >
          <option value=''>{t('admin.resources.requests.allTypes')}</option>
          {TYPES.map((x) => (
            <option key={x} value={x}>
              {t(`admin.resources.type.${x}`)}
            </option>
          ))}
        </select>
      </div>
      <div className={adminTable.wrap}>
        <table className={adminTable.table}>
          <thead className={adminTable.thead}>
            <tr>
              <th className={adminTable.th}>{t('admin.resources.requests.colStudio')}</th>
              <th className={adminTable.th}>{t('admin.resources.requests.colChange')}</th>
              <th className={adminTable.th}>{t('admin.resources.requests.colReason')}</th>
              <th className={adminTable.th}>{t('admin.resources.requests.colRequested')}</th>
              <th className={adminTable.th}>{t('admin.resources.requests.colStatus')}</th>
              <th className={`${adminTable.th} text-right`}>
                {t('admin.resources.requests.colActions')}
              </th>
            </tr>
          </thead>
          <tbody className={adminTable.tbody}>
            {loading ? (
              <AdminTableState
                colSpan={COLS}
                kind='loading'
                message={t('admin.resources.loading')}
              />
            ) : error ? (
              <AdminTableState
                colSpan={COLS}
                kind='error'
                message={error}
                action={
                  <AdminButton size='sm' onClick={load}>
                    {t('admin.resources.retry')}
                  </AdminButton>
                }
              />
            ) : filtered.length === 0 ? (
              <AdminTableState
                colSpan={COLS}
                kind={rows.length === 0 ? 'empty' : 'no-results'}
                message={t(
                  rows.length === 0
                    ? 'admin.resources.requests.empty'
                    : 'admin.resources.requests.noResults',
                )}
              />
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className={adminTable.tr}>
                  <td className={cn(adminTable.td, 'max-w-[220px]')}>
                    <div
                      className='font-semibold text-admin-ink-strong truncate'
                      title={r.workspaceName}
                    >
                      {r.workspaceName}
                    </div>
                    <div className='text-xs text-admin-muted'>
                      {t(`admin.resources.type.${r.resourceType}`)}
                    </div>
                  </td>
                  <td className={`${adminTable.td} whitespace-nowrap tabular-nums text-sm`}>
                    {formatAmount(r.resourceType, r.currentQuota, locale)}
                    <ArrowRight className='inline w-3.5 h-3.5 mx-1 text-admin-muted' aria-hidden />
                    <span className='font-semibold'>
                      {formatAmount(r.resourceType, r.requestedQuota, locale)}
                    </span>
                    {r.grantedQuota != null && r.grantedQuota !== r.requestedQuota && (
                      <div className='text-xs text-admin-muted'>
                        {t('admin.resources.requests.granted', {
                          value: formatAmount(r.resourceType, r.grantedQuota, locale),
                        })}
                      </div>
                    )}
                  </td>
                  <td className={cn(adminTable.td, 'max-w-[320px] text-sm')}>
                    <p className='line-clamp-3 break-words' title={r.reason}>
                      {r.reason}
                    </p>
                    {r.reviewNote && (
                      <p className='mt-1 text-xs text-admin-muted break-words'>
                        {t('admin.resources.requests.reviewNote', {
                          name: r.reviewedByName ?? '—',
                          note: r.reviewNote,
                        })}
                      </p>
                    )}
                  </td>
                  <td className={`${adminTable.td} text-sm`}>
                    <div className='truncate max-w-[160px]' title={r.requestedByName}>
                      {r.requestedByName || '—'}
                    </div>
                    <div className='text-xs text-admin-muted tabular-nums'>
                      {new Date(r.createdAt).toLocaleString(locale)}
                    </div>
                  </td>
                  <td className={adminTable.td}>
                    <RequestStatusBadge status={r.status} />
                    {r.reviewedAt && (
                      <div className='mt-1 text-xs text-admin-muted tabular-nums'>
                        {new Date(r.reviewedAt).toLocaleDateString(locale)}
                      </div>
                    )}
                  </td>
                  <td className={`${adminTable.td} text-right whitespace-nowrap`}>
                    {r.status === 'Pending' && (
                      <div className='inline-flex gap-2'>
                        <AdminButton
                          size='sm'
                          variant='primary'
                          onClick={() => setReviewing({ req: r, approve: true })}
                        >
                          {t('admin.resources.requests.approve')}
                        </AdminButton>
                        <AdminButton
                          size='sm'
                          variant='danger'
                          onClick={() => setReviewing({ req: r, approve: false })}
                        >
                          {t('admin.resources.requests.reject')}
                        </AdminButton>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {reviewing && (
        <ReviewModal
          request={reviewing.req}
          approve={reviewing.approve}
          onClose={() => setReviewing(null)}
          onDone={(message) => {
            setReviewing(null);
            onReviewed(message);
            load();
          }}
        />
      )}
    </div>
  );
};

const ReviewModal: React.FC<{
  request: QuotaIncreaseRequestDto;
  approve: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}> = ({ request, approve, onClose, onDone }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [note, setNote] = useState('');
  const [granted, setGranted] = useState(
    toQuotaInput(request.resourceType, request.requestedQuota),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!approve && !note.trim()) {
      setError(t('admin.resources.validation.rejectNoteRequired'));
      return;
    }
    const grantedQuota = approve ? fromQuotaInput(request.resourceType, granted) : null;
    if (approve && (grantedQuota === null || grantedQuota <= request.currentQuota)) {
      setError(t('admin.resources.validation.grantedAboveCurrent'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (approve) {
        await quotaService.approveRequest(
          request.id,
          grantedQuota === request.requestedQuota ? null : grantedQuota,
          note.trim() || null,
        );
      } else {
        await quotaService.rejectRequest(request.id, note.trim());
      }
      onDone(
        t(approve ? 'admin.resources.requests.approved' : 'admin.resources.requests.rejected', {
          name: request.workspaceName,
        }),
      );
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <AdminModal
      title={t(
        approve ? 'admin.resources.requests.approveTitle' : 'admin.resources.requests.rejectTitle',
      )}
      description={request.workspaceName}
      onClose={() => !saving && onClose()}
      footer={
        <>
          <AdminButton onClick={onClose} disabled={saving}>
            {t('admin.resources.cancel')}
          </AdminButton>
          <AdminButton
            type='submit'
            form='review-request-form'
            variant={approve ? 'primary' : 'danger'}
            isLoading={saving}
          >
            {t(approve ? 'admin.resources.requests.approve' : 'admin.resources.requests.reject')}
          </AdminButton>
        </>
      }
    >
      <form id='review-request-form' noValidate onSubmit={submit} className='space-y-3'>
        <dl className='grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm'>
          <dt className='text-admin-muted'>{t('admin.resources.requests.colChange')}</dt>
          <dd className='tabular-nums'>
            {t(`admin.resources.type.${request.resourceType}`)}:{' '}
            {formatAmount(request.resourceType, request.currentQuota, locale)} →{' '}
            <strong>{formatAmount(request.resourceType, request.requestedQuota, locale)}</strong>
          </dd>
          <dt className='text-admin-muted'>{t('admin.resources.requests.colReason')}</dt>
          <dd className='break-words'>{request.reason}</dd>
          <dt className='text-admin-muted'>{t('admin.resources.requests.colRequested')}</dt>
          <dd>{request.requestedByName || '—'}</dd>
        </dl>
        {approve && (
          <>
            <AdminField
              label={t(
                request.resourceType === 'Storage'
                  ? 'admin.resources.requests.grantedGb'
                  : 'admin.resources.requests.grantedAmount',
              )}
              htmlFor='review-granted'
              hint={t('admin.resources.requests.approveHint')}
            >
              <input
                id='review-granted'
                type='number'
                min='0'
                inputMode='decimal'
                value={granted}
                onChange={(e) => setGranted(e.target.value)}
                className={cn(adminFieldClass, 'tabular-nums')}
              />
            </AdminField>
          </>
        )}
        <AdminField
          label={t('admin.resources.requests.note')}
          htmlFor='review-note'
          required={!approve}
          error={error}
        >
          <textarea
            id='review-note'
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-invalid={!!error}
            className={adminFieldClass}
          />
        </AdminField>
      </form>
    </AdminModal>
  );
};
