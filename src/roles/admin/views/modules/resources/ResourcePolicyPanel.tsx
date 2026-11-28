import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { GB, quotaService, QuotaPolicyDto } from '@/services/quota.service';
import { AdminButton, AdminCard, AdminField } from '../../components/AdminUi';
import { adminFieldClass } from '../../components/adminUiStyles';
import { useLocale } from './resourceFormat';

type Form = {
  storageGb: string;
  tokens: string;
  images: string;
  requests: string;
  perMinute: string;
  aiEnabled: boolean;
  warn: string;
};

const toForm = (p: QuotaPolicyDto): Form => ({
  storageGb: String(Number((p.storageQuotaBytes / GB).toFixed(2))),
  tokens: String(p.monthlyTokenQuota),
  images: String(p.monthlyImageQuota),
  requests: String(p.monthlyRequestQuota),
  perMinute: String(p.requestsPerMinute),
  aiEnabled: p.aiEnabledByDefault,
  warn: String(p.warningThresholdPercent),
});

/** Chính sách tài nguyên mặc định — chỉ áp cho Studio tạo mới; Studio đã có giữ nguyên quota. */
export const ResourcePolicyPanel: React.FC<{ onSaved: (message: string) => void }> = ({
  onSaved,
}) => {
  const { t } = useTranslation();
  const locale = useLocale();
  const [policy, setPolicy] = useState<QuotaPolicyDto | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const p = await quotaService.getPolicy();
      setPolicy(p);
      setForm(toForm(p));
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError)
    return (
      <AdminCard>
        <div
          role='alert'
          className='flex flex-wrap items-center justify-between gap-3 text-sm text-red-800'
        >
          {loadError}
          <AdminButton size='sm' onClick={load}>
            {t('admin.resources.retry')}
          </AdminButton>
        </div>
      </AdminCard>
    );
  if (!form || !policy)
    return (
      <AdminCard>
        <div className='h-40 animate-pulse bg-admin-hover rounded-xl' aria-busy='true' />
      </AdminCard>
    );

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(policy));
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const storage = Number(form.storageGb);
    const tokens = Number(form.tokens);
    const images = Number(form.images);
    const requests = Number(form.requests);
    const perMinute = Number(form.perMinute);
    const warn = Number(form.warn);
    const next: Record<string, string> = {};
    if (form.storageGb.trim() === '' || !Number.isFinite(storage) || storage <= 0)
      next.storage = t('admin.resources.validation.positive');
    if (form.tokens.trim() === '' || !Number.isInteger(tokens) || tokens <= 0)
      next.tokens = t('admin.resources.validation.positiveInt');
    if (form.images.trim() === '' || !Number.isInteger(images) || images <= 0)
      next.images = t('admin.resources.validation.positiveInt');
    if (form.requests.trim() === '' || !Number.isInteger(requests) || requests <= 0)
      next.requests = t('admin.resources.validation.positiveInt');
    if (form.perMinute.trim() === '' || !Number.isInteger(perMinute) || perMinute <= 0)
      next.perMinute = t('admin.resources.validation.positiveInt');
    if (!Number.isInteger(warn) || warn < 1 || warn > 99)
      next.warn = t('admin.resources.validation.threshold');
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setServerError(null);
    try {
      const saved = await quotaService.updatePolicy({
        storageQuotaBytes: Math.round(storage * GB),
        monthlyTokenQuota: tokens,
        monthlyImageQuota: images,
        monthlyRequestQuota: requests,
        requestsPerMinute: perMinute,
        aiEnabledByDefault: form.aiEnabled,
        warningThresholdPercent: warn,
      });
      setPolicy(saved);
      setForm(toForm(saved));
      onSaved(t('admin.resources.policy.saved'));
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminCard
      title={t('admin.resources.policy.title')}
      description={t('admin.resources.policy.description')}
    >
      {policy.isFromSettings && (
        <p className='mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-900'>
          {t('admin.resources.policy.notConfigured')}
        </p>
      )}
      <form noValidate onSubmit={submit} className='space-y-4 max-w-3xl'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <AdminField
            label={t('admin.resources.policy.storage')}
            htmlFor='pol-storage'
            required
            error={errors.storage}
            hint={t('admin.resources.policy.positiveHint')}
          >
            <input
              id='pol-storage'
              type='number'
              min='0.5'
              step='0.5'
              value={form.storageGb}
              onChange={(e) => set({ storageGb: e.target.value })}
              aria-invalid={!!errors.storage}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
          <AdminField
            label={t('admin.resources.policy.warn')}
            htmlFor='pol-warn'
            required
            error={errors.warn}
            hint={t('admin.resources.policy.warnHint')}
          >
            <input
              id='pol-warn'
              type='number'
              min='1'
              max='99'
              value={form.warn}
              onChange={(e) => set({ warn: e.target.value })}
              aria-invalid={!!errors.warn}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
          <AdminField
            label={t('admin.resources.policy.tokens')}
            htmlFor='pol-tokens'
            required
            error={errors.tokens}
          >
            <input
              id='pol-tokens'
              type='number'
              min='0'
              step='1000'
              value={form.tokens}
              onChange={(e) => set({ tokens: e.target.value })}
              aria-invalid={!!errors.tokens}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
          <AdminField
            label={t('admin.resources.policy.images')}
            htmlFor='pol-images'
            required
            error={errors.images}
          >
            <input
              id='pol-images'
              type='number'
              min='0'
              value={form.images}
              onChange={(e) => set({ images: e.target.value })}
              aria-invalid={!!errors.images}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
          <AdminField
            label={t('admin.resources.policy.requests')}
            htmlFor='pol-requests'
            required
            error={errors.requests}
          >
            <input
              id='pol-requests'
              type='number'
              min='1'
              value={form.requests}
              onChange={(e) => set({ requests: e.target.value })}
              aria-invalid={!!errors.requests}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
          <AdminField
            label={t('admin.resources.policy.perMinute')}
            htmlFor='pol-per-minute'
            required
            error={errors.perMinute}
          >
            <input
              id='pol-per-minute'
              type='number'
              min='1'
              value={form.perMinute}
              onChange={(e) => set({ perMinute: e.target.value })}
              aria-invalid={!!errors.perMinute}
              className={cn(adminFieldClass, 'tabular-nums')}
            />
          </AdminField>
        </div>
        <label className='flex items-center gap-2 text-sm font-semibold text-admin-ink'>
          <input
            type='checkbox'
            checked={form.aiEnabled}
            onChange={(e) => set({ aiEnabled: e.target.checked })}
            className='w-4 h-4'
          />
          {t('admin.resources.policy.aiEnabled')}
        </label>
        <p className='text-xs text-admin-muted'>{t('admin.resources.policy.resetNote')}</p>
        {serverError && (
          <p
            role='alert'
            className='p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800'
          >
            {serverError}
          </p>
        )}
        <div className='flex flex-wrap items-center gap-3'>
          <AdminButton type='submit' variant='primary' isLoading={saving} disabled={!dirty}>
            {t('admin.resources.save')}
          </AdminButton>
          {dirty && (
            <AdminButton onClick={() => setForm(toForm(policy))} disabled={saving}>
              {t('admin.resources.policy.discard')}
            </AdminButton>
          )}
          {policy.updatedAt && (
            <span className='text-xs text-admin-muted tabular-nums'>
              {t('admin.resources.policy.updatedAt', {
                time: new Date(policy.updatedAt).toLocaleString(locale),
                name: policy.updatedByName ?? '—',
              })}
            </span>
          )}
        </div>
      </form>
    </AdminCard>
  );
};
