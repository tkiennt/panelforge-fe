import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { AdminWorkspaceResourceDto, formatBytes, GB, quotaService } from '@/services/quota.service';
import { AdminButton, AdminField, AdminModal } from '../../components/AdminUi';
import { adminFieldClass } from '../../components/adminUiStyles';
import { useLocale } from './resourceFormat';

const toGbInput = (bytes: number) => (bytes > 0 ? String(Number((bytes / GB).toFixed(2))) : '0');

/** Số nguyên/thập phân không âm; '' hoặc ký tự lạ → null. */
const parseNonNegative = (v: string) => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Cấu hình AI + Storage Quota của một Studio. 0 = không giới hạn. Lý do bắt buộc (ghi Audit). */
export const ConfigureStudioModal: React.FC<{
  studio: AdminWorkspaceResourceDto;
  onClose: () => void;
  onSaved: () => void;
}> = ({ studio, onClose, onSaved }) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [storageGb, setStorageGb] = useState(toGbInput(studio.storage.quota));
  const [tokens, setTokens] = useState(String(studio.aiTokens?.quota ?? 0));
  const [images, setImages] = useState(String(studio.aiImages?.quota ?? 0));
  const [aiEnabled, setAiEnabled] = useState(studio.aiEnabled);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const storageNum = parseNonNegative(storageGb);
  const storageBytes = storageNum === null ? null : Math.round(storageNum * GB);
  const belowUsage =
    storageBytes !== null && storageBytes > 0 && storageBytes < studio.storage.used;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const tokenNum = parseNonNegative(tokens);
    const imageNum = parseNonNegative(images);
    const next: Record<string, string> = {};
    if (storageBytes === null) next.storage = t('admin.resources.validation.nonNegative');
    if (tokenNum === null || !Number.isInteger(tokenNum))
      next.tokens = t('admin.resources.validation.nonNegativeInt');
    if (imageNum === null || !Number.isInteger(imageNum))
      next.images = t('admin.resources.validation.nonNegativeInt');
    if (!reason.trim()) next.reason = t('admin.resources.validation.reasonRequired');
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setServerError(null);
    try {
      await quotaService.updateResources(studio.workspaceId, {
        storageQuotaBytes: storageBytes!,
        monthlyTokenQuota: tokenNum!,
        monthlyImageQuota: imageNum!,
        aiEnabled,
        reason: reason.trim(),
      });
      onSaved();
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const current = (value: string) => (
    <span className='text-admin-muted'>
      {t('admin.resources.configure.current')}: <span className='tabular-nums'>{value}</span>
    </span>
  );
  const unlimitedOr = (quota: number, fmt: (n: number) => string) =>
    quota > 0 ? fmt(quota) : t('admin.resources.unlimited');

  return (
    <AdminModal
      title={t('admin.resources.configure.title')}
      description={studio.name}
      onClose={() => !saving && onClose()}
      size='lg'
      footer={
        <>
          <AdminButton onClick={onClose} disabled={saving}>
            {t('admin.resources.cancel')}
          </AdminButton>
          <AdminButton
            type='submit'
            form='studio-resources-form'
            variant='primary'
            isLoading={saving}
          >
            {t('admin.resources.save')}
          </AdminButton>
        </>
      }
    >
      <form id='studio-resources-form' noValidate onSubmit={submit} className='space-y-4'>
        <p className='text-xs text-admin-muted'>{t('admin.resources.configure.zeroHint')}</p>

        <fieldset className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <legend className='sr-only'>{t('admin.resources.configure.storageLegend')}</legend>
          <AdminField
            label={t('admin.resources.configure.storageQuota')}
            htmlFor='rq-storage'
            required
            error={errors.storage}
            hint={current(unlimitedOr(studio.storage.quota, (n) => formatBytes(n, locale)))}
          >
            <input
              id='rq-storage'
              type='number'
              min='0'
              step='0.5'
              inputMode='decimal'
              value={storageGb}
              onChange={(e) => setStorageGb(e.target.value)}
              aria-invalid={!!errors.storage}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
          <div className='text-sm self-end pb-2 text-admin-muted'>
            {t('admin.resources.configure.storageUsed', {
              used: formatBytes(studio.storage.used, locale),
            })}
          </div>
        </fieldset>
        {belowUsage && (
          <p
            role='alert'
            className='p-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900'
          >
            {t('admin.resources.configure.belowUsageWarning')}
          </p>
        )}

        <fieldset className='grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-admin-line'>
          <legend className='sr-only'>{t('admin.resources.configure.aiLegend')}</legend>
          <label className='sm:col-span-2 flex items-center gap-2 text-sm font-semibold text-admin-ink pt-3'>
            <input
              type='checkbox'
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className='w-4 h-4'
            />
            {t('admin.resources.configure.aiEnabled')}
          </label>
          <AdminField
            label={t('admin.resources.configure.tokenQuota')}
            htmlFor='rq-tokens'
            required
            error={errors.tokens}
            hint={current(
              unlimitedOr(studio.aiTokens?.quota ?? 0, (n) => n.toLocaleString(locale)),
            )}
          >
            <input
              id='rq-tokens'
              type='number'
              min='0'
              step='1000'
              inputMode='numeric'
              value={tokens}
              onChange={(e) => setTokens(e.target.value)}
              aria-invalid={!!errors.tokens}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
          <AdminField
            label={t('admin.resources.configure.imageQuota')}
            htmlFor='rq-images'
            required
            error={errors.images}
            hint={current(
              unlimitedOr(studio.aiImages?.quota ?? 0, (n) => n.toLocaleString(locale)),
            )}
          >
            <input
              id='rq-images'
              type='number'
              min='0'
              step='1'
              inputMode='numeric'
              value={images}
              onChange={(e) => setImages(e.target.value)}
              aria-invalid={!!errors.images}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
        </fieldset>

        <AdminField
          label={t('admin.resources.configure.reason')}
          htmlFor='rq-reason'
          required
          error={errors.reason}
          hint={t('admin.resources.configure.reasonHint')}
        >
          <textarea
            id='rq-reason'
            rows={2}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={!!errors.reason}
            className={adminFieldClass}
          />
        </AdminField>

        {serverError && (
          <p
            role='alert'
            className='p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800'
          >
            {serverError}
          </p>
        )}
      </form>
    </AdminModal>
  );
};
