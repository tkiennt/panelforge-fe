import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { setUploadLimits } from '@/hooks/useUploadLimit';
import { formatMb, MIB } from '@/lib/uploadLimits';
import { uploadLimitService, type UploadLimitsDto } from '@/services/uploadLimit.service';
import { AdminButton, AdminCard, AdminField } from '../../components/AdminUi';
import { adminFieldClass } from '../../components/adminUiStyles';
import { useLocale } from './resourceFormat';

type Field = 'artwork' | 'reference' | 'cover';
type Form = Record<Field, string>;

const toMb = (bytes: number) => String(Number((bytes / MIB).toFixed(1)));
const toForm = (l: UploadLimitsDto): Form => ({
  artwork: toMb(l.artworkMaxBytes),
  reference: toMb(l.referenceImageMaxBytes),
  cover: toMb(l.coverImageMaxBytes),
});

/** Giới hạn kích thước một file tải lên — áp ngay cho mọi Studio, khác chính sách hạn mức chỉ áp cho Studio mới. */
export const UploadLimitsPanel: React.FC<{ onSaved: (message: string) => void }> = ({
  onSaved,
}) => {
  const { t, lang } = useTranslation();
  const locale = useLocale();
  const [limits, setLimits] = useState<UploadLimitsDto | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const l = await uploadLimitService.get();
      setLimits(l);
      setForm(toForm(l));
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
  if (!form || !limits)
    return (
      <AdminCard>
        <div className='h-32 animate-pulse bg-admin-hover rounded-xl' aria-busy='true' />
      </AdminCard>
    );

  const ceiling: Record<Field, number> = {
    artwork: limits.artworkCeilingBytes,
    reference: limits.imageCeilingBytes,
    cover: limits.imageCeilingBytes,
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(limits));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next: Partial<Record<Field, string>> = {};
    const bytes = {} as Record<Field, number>;
    (Object.keys(form) as Field[]).forEach((f) => {
      const mb = Number(form[f]);
      bytes[f] = Math.round(mb * MIB);
      if (form[f].trim() === '' || !Number.isFinite(mb) || bytes[f] <= 0 || bytes[f] > ceiling[f])
        next[f] = t('admin.resources.uploadLimits.range', { max: formatMb(ceiling[f], lang) });
    });
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setServerError(null);
    try {
      const saved = await uploadLimitService.update({
        artworkMaxBytes: bytes.artwork,
        referenceImageMaxBytes: bytes.reference,
        coverImageMaxBytes: bytes.cover,
      });
      setLimits(saved);
      setForm(toForm(saved));
      setUploadLimits(saved);
      onSaved(t('admin.resources.uploadLimits.saved'));
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const field = (f: Field) => (
    <AdminField
      key={f}
      label={t(`admin.resources.uploadLimits.${f}`)}
      htmlFor={`upl-${f}`}
      required
      error={errors[f]}
      hint={t(`admin.resources.uploadLimits.${f}Hint`, { max: formatMb(ceiling[f], lang) })}
    >
      <input
        id={`upl-${f}`}
        type='number'
        min='0.1'
        step='0.5'
        max={ceiling[f] / MIB}
        value={form[f]}
        onChange={(e) => setForm({ ...form, [f]: e.target.value })}
        aria-invalid={!!errors[f]}
        className={cn(adminFieldClass, 'tabular-nums')}
      />
    </AdminField>
  );

  return (
    <AdminCard
      title={t('admin.resources.uploadLimits.title')}
      description={t('admin.resources.uploadLimits.description')}
    >
      {limits.isDefault && (
        <p className='mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-900'>
          {t('admin.resources.uploadLimits.notConfigured')}
        </p>
      )}
      <form noValidate onSubmit={submit} className='space-y-4 max-w-3xl'>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
          {field('artwork')}
          {field('reference')}
          {field('cover')}
        </div>
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
            <AdminButton onClick={() => setForm(toForm(limits))} disabled={saving}>
              {t('admin.resources.policy.discard')}
            </AdminButton>
          )}
          {limits.updatedAt && (
            <span className='text-xs text-admin-muted tabular-nums'>
              {t('admin.resources.policy.updatedAt', {
                time: new Date(limits.updatedAt).toLocaleString(locale),
                name: limits.updatedByName ?? '—',
              })}
            </span>
          )}
        </div>
      </form>
    </AdminCard>
  );
};
