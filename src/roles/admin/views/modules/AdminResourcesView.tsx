import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Search, X } from 'lucide-react';
import {
  quotaService,
  type AdminWorkspaceResourceDto,
  type QuotaIncreaseRequestDto,
  type QuotaPolicyDto,
  type QuotaResourceType,
} from '@/services/quota.service';
import {
  QUOTA_RESOURCE_TYPES,
  formatQuotaValue,
  fromQuotaInput,
  toQuotaInput,
} from '@/shared/features/quota/quotaUnits';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminField,
  AdminModal,
  AdminPageHeader,
  AdminTableState,
  AdminToast,
} from '../components/AdminUi';
import { adminFieldClass, adminTable, useAdminToast } from '../components/adminUiStyles';

type QuotaInputs = Record<QuotaResourceType, string>;

const policyValue = (p: QuotaPolicyDto, type: QuotaResourceType) =>
  type === 'Storage'
    ? p.storageQuotaBytes
    : type === 'AiTokens'
      ? p.monthlyTokenQuota
      : p.monthlyImageQuota;

const resourceValues = (r: AdminWorkspaceResourceDto) => ({
  Storage: { used: r.usedStorageBytes, quota: r.storageQuotaBytes },
  AiTokens: { used: r.usedTokensCurrentMonth, quota: r.monthlyTokenQuota },
  AiImages: { used: r.usedImagesCurrentMonth, quota: r.monthlyImageQuota },
});

/** Mức đã dùng so với mức cấp; quota 0 = không giới hạn. */
const UsageMeter: React.FC<{
  type: QuotaResourceType;
  used: number;
  quota: number;
  locale: string;
  label: string;
}> = ({ type, used, quota, locale, label }) => {
  const { t } = useTranslation();
  const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
  return (
    <div className='min-w-[150px]'>
      <div className='flex items-baseline justify-between gap-2 text-sm tabular-nums'>
        <span className='font-medium'>{formatQuotaValue(type, used, locale)}</span>
        <span className='text-admin-muted'>
          {quota > 0 ? formatQuotaValue(type, quota, locale) : t('admin.resources.unlimited')}
        </span>
      </div>
      {quota > 0 && (
        <div
          className='mt-1.5 w-full bg-admin-hover h-1.5 rounded-full overflow-hidden'
          role='progressbar'
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('admin.resources.table.progressAria', { label, percent })}
        >
          <div
            className={cn(
              'h-full rounded-full',
              percent >= 90 ? 'bg-red-500' : percent >= 75 ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
};

/** OPS-23: chính sách mặc định, hàng chờ yêu cầu tăng hạn mức và mức dùng của từng Studio. */
export const AdminResourcesView: React.FC = () => {
  const { t, lang } = useTranslation();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const { toast, show: showToast, clear: clearToast } = useAdminToast();

  const [policy, setPolicy] = useState<QuotaPolicyDto | null>(null);
  const [requests, setRequests] = useState<QuotaIncreaseRequestDto[]>([]);
  const [resources, setResources] = useState<AdminWorkspaceResourceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [policyForm, setPolicyForm] = useState<QuotaInputs | null>(null);
  const [editing, setEditing] = useState<{
    row: AdminWorkspaceResourceDto;
    inputs: QuotaInputs;
  } | null>(null);
  const [review, setReview] = useState<{
    request: QuotaIncreaseRequestDto;
    mode: 'approve' | 'reject';
    granted: string;
    note: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const typeLabel = (type: QuotaResourceType) => t(`admin.resources.types.${type}`);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [p, r, res] = await Promise.all([
        quotaService.getPolicy(),
        quotaService.getRequests('Pending'),
        quotaService.getResources(),
      ]);
      setPolicy(p);
      setRequests(r);
      setResources(res);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.ownerEmail.toLowerCase().includes(q),
    );
  }, [resources, search]);

  const closeForms = () => {
    if (saving) return;
    setPolicyForm(null);
    setEditing(null);
    setReview(null);
    setFormError(null);
  };

  const parseInputs = (inputs: QuotaInputs, allowZero: boolean) => {
    const values = {} as Record<QuotaResourceType, number>;
    for (const type of QUOTA_RESOURCE_TYPES) {
      const v = fromQuotaInput(type, inputs[type]);
      if (v === null || (!allowZero && v === 0)) return null;
      values[type] = v;
    }
    return values;
  };

  const savePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm || saving) return;
    const values = parseInputs(policyForm, false);
    if (!values) {
      setFormError(t('admin.resources.policy.invalid'));
      return;
    }
    setSaving(true);
    try {
      setPolicy(
        await quotaService.updatePolicy({
          storageQuotaBytes: values.Storage,
          monthlyTokenQuota: values.AiTokens,
          monthlyImageQuota: values.AiImages,
        }),
      );
      setPolicyForm(null);
      showToast(t('admin.resources.policy.saved'));
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveResources = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || saving) return;
    const values = parseInputs(editing.inputs, true);
    if (!values) {
      setFormError(t('admin.resources.edit.invalid'));
      return;
    }
    setSaving(true);
    try {
      const updated = await quotaService.updateResources(editing.row.workspaceId, {
        storageQuotaBytes: values.Storage,
        monthlyTokenQuota: values.AiTokens,
        monthlyImageQuota: values.AiImages,
      });
      setResources((prev) =>
        prev.map((r) => (r.workspaceId === updated.workspaceId ? updated : r)),
      );
      setEditing(null);
      showToast(t('admin.resources.edit.saved', { name: updated.name }));
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!review || saving) return;
    const { request, mode } = review;
    const note = review.note.trim();
    let granted: number | null = null;
    if (mode === 'approve') {
      granted = fromQuotaInput(request.resourceType, review.granted);
      if (!granted) {
        setFormError(t('admin.resources.review.invalidGranted'));
        return;
      }
    } else if (!note) {
      setFormError(t('admin.resources.review.noteRequired'));
      return;
    }

    setSaving(true);
    try {
      if (mode === 'approve') await quotaService.approveRequest(request.id, granted, note || null);
      else await quotaService.rejectRequest(request.id, note);
      setReview(null);
      showToast(
        t(
          mode === 'approve'
            ? 'admin.resources.review.approved'
            : 'admin.resources.review.rejected',
          {
            name: request.workspaceName,
          },
        ),
      );
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const quotaInputs = (
    inputs: QuotaInputs,
    onChange: (next: QuotaInputs) => void,
    hint: string,
  ) => (
    <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
      {QUOTA_RESOURCE_TYPES.map((type) => (
        <AdminField
          key={type}
          label={t(`admin.resources.inputLabels.${type}`)}
          htmlFor={`quota-${type}`}
          required
        >
          <input
            id={`quota-${type}`}
            type='number'
            min='0'
            step={type === 'Storage' ? '0.5' : '1'}
            inputMode='decimal'
            value={inputs[type]}
            onChange={(e) => onChange({ ...inputs, [type]: e.target.value })}
            className={cn(adminFieldClass, 'tabular-nums')}
          />
        </AdminField>
      ))}
      <p className='sm:col-span-3 text-xs text-admin-muted'>{hint}</p>
    </div>
  );

  const COLS = 6;

  return (
    <>
      <AdminToast toast={toast} onClose={clearToast} />

      <AdminPageHeader
        title={t('admin.resources.title')}
        description={t('admin.resources.description')}
        actions={
          <AdminButton onClick={load} isLoading={loading} icon={<RefreshCw className='w-4 h-4' />}>
            {t('admin.resources.refresh')}
          </AdminButton>
        }
      />

      {loadError && (
        <p
          className='p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800'
          role='alert'
        >
          {loadError}
        </p>
      )}

      {/* Hàng chờ duyệt */}
      <AdminCard
        title={t('admin.resources.requests.title')}
        description={t('admin.resources.requests.description')}
        bodyClassName='p-0'
      >
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.resources.requests.colStudio')}</th>
                <th className={adminTable.th}>{t('admin.resources.requests.colType')}</th>
                <th className={adminTable.th}>{t('admin.resources.requests.colChange')}</th>
                <th className={adminTable.th}>{t('admin.resources.requests.colReason')}</th>
                <th className={adminTable.th}>{t('admin.resources.requests.colRequester')}</th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.resources.requests.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loading && requests.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='loading'
                  message={t('admin.resources.loading')}
                />
              ) : requests.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='empty'
                  message={t('admin.resources.requests.empty')}
                />
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className={adminTable.tr}>
                    <td
                      className={`${adminTable.td} font-semibold text-admin-ink-strong break-words`}
                    >
                      {r.workspaceName}
                    </td>
                    <td className={adminTable.td}>{typeLabel(r.resourceType)}</td>
                    <td className={`${adminTable.td} tabular-nums whitespace-nowrap`}>
                      {formatQuotaValue(r.resourceType, r.currentQuota, locale)} →{' '}
                      <span className='font-semibold'>
                        {formatQuotaValue(r.resourceType, r.requestedQuota, locale)}
                      </span>
                    </td>
                    <td className={`${adminTable.td} max-w-[320px] break-words`}>{r.reason}</td>
                    <td className={adminTable.td}>
                      <div className='font-medium'>{r.requestedByName || '—'}</div>
                      <div className='text-xs text-admin-muted tabular-nums'>
                        {new Date(r.createdAt).toLocaleString(locale)}
                      </div>
                    </td>
                    <td className={`${adminTable.td} text-right`}>
                      <div className='flex justify-end gap-2'>
                        <AdminButton
                          size='sm'
                          variant='primary'
                          icon={<Check className='w-4 h-4' />}
                          onClick={() => {
                            setFormError(null);
                            setReview({
                              request: r,
                              mode: 'approve',
                              granted: toQuotaInput(r.resourceType, r.requestedQuota),
                              note: '',
                            });
                          }}
                        >
                          {t('admin.resources.requests.approve')}
                        </AdminButton>
                        <AdminButton
                          size='sm'
                          variant='danger'
                          icon={<X className='w-4 h-4' />}
                          onClick={() => {
                            setFormError(null);
                            setReview({ request: r, mode: 'reject', granted: '', note: '' });
                          }}
                        >
                          {t('admin.resources.requests.reject')}
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Chính sách cho Studio mới */}
      <AdminCard
        title={t('admin.resources.policy.title')}
        description={t('admin.resources.policy.description')}
        actions={
          policy && (
            <AdminButton
              size='sm'
              onClick={() => {
                setFormError(null);
                setPolicyForm({
                  Storage: toQuotaInput('Storage', policy.storageQuotaBytes),
                  AiTokens: toQuotaInput('AiTokens', policy.monthlyTokenQuota),
                  AiImages: toQuotaInput('AiImages', policy.monthlyImageQuota),
                });
              }}
            >
              {t('admin.resources.policy.edit')}
            </AdminButton>
          )
        }
      >
        {policy ? (
          <div className='space-y-3'>
            <dl className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              {QUOTA_RESOURCE_TYPES.map((type) => {
                const value = policyValue(policy, type);
                return (
                  <div key={type}>
                    <dt className='text-sm text-admin-muted'>{typeLabel(type)}</dt>
                    <dd className='mt-1 text-xl font-semibold text-admin-ink-strong tabular-nums'>
                      {value > 0
                        ? formatQuotaValue(type, value, locale)
                        : t('admin.resources.unlimited')}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className='text-xs text-admin-muted'>
              {policy.isFromSettings
                ? t('admin.resources.policy.fromSettings')
                : t('admin.resources.policy.updatedBy', {
                    name: policy.updatedByName ?? '—',
                    date: policy.updatedAt
                      ? new Date(policy.updatedAt).toLocaleString(locale)
                      : '—',
                  })}
            </p>
          </div>
        ) : (
          <p className='text-sm text-admin-muted'>{loading ? t('admin.resources.loading') : '—'}</p>
        )}
      </AdminCard>

      {/* Mức dùng từng Studio */}
      <div className='bg-admin-card rounded-2xl border border-admin-line overflow-hidden'>
        <div className='flex flex-wrap items-center gap-3 px-5 py-3 border-b border-admin-line'>
          <h2 className='text-base font-semibold text-admin-ink-strong'>
            {t('admin.resources.table.title')}
          </h2>
          <div className='relative w-full sm:max-w-xs sm:ml-auto'>
            <Search
              className='w-4 h-4 text-admin-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
              aria-hidden
            />
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.resources.table.searchPlaceholder')}
              aria-label={t('admin.resources.table.searchPlaceholder')}
              className={cn(adminFieldClass, 'pl-9')}
            />
          </div>
        </div>
        <div className={adminTable.wrap}>
          <table className={adminTable.table}>
            <thead className={adminTable.thead}>
              <tr>
                <th className={adminTable.th}>{t('admin.resources.table.colStudio')}</th>
                {QUOTA_RESOURCE_TYPES.map((type) => (
                  <th key={type} className={adminTable.th}>
                    {typeLabel(type)}
                  </th>
                ))}
                <th className={adminTable.th}>{t('admin.resources.table.colPending')}</th>
                <th className={`${adminTable.th} text-right`}>
                  {t('admin.resources.table.colActions')}
                </th>
              </tr>
            </thead>
            <tbody className={adminTable.tbody}>
              {loading && resources.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='loading'
                  message={t('admin.resources.loading')}
                />
              ) : resources.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='empty'
                  message={t('admin.resources.table.empty')}
                />
              ) : filtered.length === 0 ? (
                <AdminTableState
                  colSpan={COLS}
                  kind='no-results'
                  message={t('admin.resources.table.noResults')}
                  action={
                    <AdminButton size='sm' onClick={() => setSearch('')}>
                      {t('admin.resources.table.clearSearch')}
                    </AdminButton>
                  }
                />
              ) : (
                filtered.map((r) => {
                  const values = resourceValues(r);
                  return (
                    <tr key={r.workspaceId} className={adminTable.tr}>
                      <td className={adminTable.td}>
                        <div className='font-semibold text-admin-ink-strong break-words'>
                          {r.name}
                        </div>
                        <div className='text-xs text-admin-muted break-all'>
                          {r.ownerName} · {r.ownerEmail}
                        </div>
                      </td>
                      {QUOTA_RESOURCE_TYPES.map((type) => (
                        <td key={type} className={adminTable.td}>
                          {type !== 'Storage' && !r.hasAiConfig ? (
                            <span className='text-sm text-admin-muted'>
                              {t('admin.resources.table.noAiConfig')}
                            </span>
                          ) : (
                            <>
                              <UsageMeter
                                type={type}
                                used={values[type].used}
                                quota={values[type].quota}
                                locale={locale}
                                label={`${r.name} ${typeLabel(type)}`}
                              />
                              {type !== 'Storage' && !r.aiEnabled && (
                                <AdminBadge tone='neutral' className='mt-1.5'>
                                  {t('admin.resources.table.aiOff')}
                                </AdminBadge>
                              )}
                            </>
                          )}
                        </td>
                      ))}
                      <td className={adminTable.td}>
                        {r.pendingRequestCount > 0 ? (
                          <AdminBadge tone='warning'>
                            {t('admin.resources.table.pendingCount', {
                              count: r.pendingRequestCount,
                            })}
                          </AdminBadge>
                        ) : (
                          <span className='text-admin-muted'>—</span>
                        )}
                      </td>
                      <td className={`${adminTable.td} text-right`}>
                        <AdminButton
                          size='sm'
                          onClick={() => {
                            setFormError(null);
                            setEditing({
                              row: r,
                              inputs: {
                                Storage: toQuotaInput('Storage', r.storageQuotaBytes),
                                AiTokens: toQuotaInput('AiTokens', r.monthlyTokenQuota),
                                AiImages: toQuotaInput('AiImages', r.monthlyImageQuota),
                              },
                            });
                          }}
                        >
                          {t('admin.resources.table.edit')}
                        </AdminButton>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {policyForm && (
        <AdminModal
          title={t('admin.resources.policy.modalTitle')}
          description={t('admin.resources.policy.description')}
          onClose={closeForms}
          size='lg'
          footer={
            <>
              <AdminButton onClick={closeForms} disabled={saving}>
                {t('admin.resources.cancel')}
              </AdminButton>
              <AdminButton
                type='submit'
                form='quota-policy-form'
                variant='primary'
                isLoading={saving}
              >
                {t('admin.resources.save')}
              </AdminButton>
            </>
          }
        >
          <form id='quota-policy-form' noValidate onSubmit={savePolicy} className='space-y-3'>
            {quotaInputs(policyForm, setPolicyForm, t('admin.resources.policy.hint'))}
            {formError && (
              <p className='text-sm text-red-700' role='alert'>
                {formError}
              </p>
            )}
          </form>
        </AdminModal>
      )}

      {editing && (
        <AdminModal
          title={t('admin.resources.edit.title', { name: editing.row.name })}
          onClose={closeForms}
          size='lg'
          footer={
            <>
              <AdminButton onClick={closeForms} disabled={saving}>
                {t('admin.resources.cancel')}
              </AdminButton>
              <AdminButton
                type='submit'
                form='quota-edit-form'
                variant='primary'
                isLoading={saving}
              >
                {t('admin.resources.save')}
              </AdminButton>
            </>
          }
        >
          <form id='quota-edit-form' noValidate onSubmit={saveResources} className='space-y-3'>
            {quotaInputs(
              editing.inputs,
              (inputs) => setEditing({ ...editing, inputs }),
              t('admin.resources.edit.hint'),
            )}
            {formError && (
              <p className='text-sm text-red-700' role='alert'>
                {formError}
              </p>
            )}
          </form>
        </AdminModal>
      )}

      {review && (
        <AdminModal
          title={t(
            review.mode === 'approve'
              ? 'admin.resources.review.approveTitle'
              : 'admin.resources.review.rejectTitle',
          )}
          description={`${review.request.workspaceName} · ${typeLabel(review.request.resourceType)}`}
          onClose={closeForms}
          footer={
            <>
              <AdminButton onClick={closeForms} disabled={saving}>
                {t('admin.resources.cancel')}
              </AdminButton>
              <AdminButton
                type='submit'
                form='quota-review-form'
                variant={review.mode === 'approve' ? 'primary' : 'danger'}
                isLoading={saving}
              >
                {t(
                  review.mode === 'approve'
                    ? 'admin.resources.requests.approve'
                    : 'admin.resources.requests.reject',
                )}
              </AdminButton>
            </>
          }
        >
          <form id='quota-review-form' noValidate onSubmit={submitReview} className='space-y-3'>
            <p className='text-sm text-admin-ink'>
              {t('admin.resources.review.summary', {
                current: formatQuotaValue(
                  review.request.resourceType,
                  review.request.currentQuota,
                  locale,
                ),
                requested: formatQuotaValue(
                  review.request.resourceType,
                  review.request.requestedQuota,
                  locale,
                ),
              })}
            </p>
            <p className='p-3 rounded-xl border border-admin-line bg-admin-subtle text-sm break-words'>
              {review.request.reason}
            </p>
            {review.mode === 'approve' && (
              <AdminField
                label={t(`admin.resources.inputLabels.${review.request.resourceType}`)}
                htmlFor='quota-granted'
                required
                hint={t('admin.resources.review.grantedHint')}
              >
                <input
                  id='quota-granted'
                  type='number'
                  min='0'
                  step={review.request.resourceType === 'Storage' ? '0.5' : '1'}
                  value={review.granted}
                  onChange={(e) => setReview({ ...review, granted: e.target.value })}
                  className={cn(adminFieldClass, 'tabular-nums')}
                />
              </AdminField>
            )}
            <AdminField
              label={t('admin.resources.review.noteLabel')}
              htmlFor='quota-review-note'
              required={review.mode === 'reject'}
            >
              <textarea
                id='quota-review-note'
                rows={3}
                maxLength={1000}
                value={review.note}
                onChange={(e) => setReview({ ...review, note: e.target.value })}
                className={cn(adminFieldClass, 'py-2')}
              />
            </AdminField>
            {formError && (
              <p className='text-sm text-red-700' role='alert'>
                {formError}
              </p>
            )}
          </form>
        </AdminModal>
      )}
    </>
  );
};
