import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminCard, AdminField } from './AdminUi';
import { adminFieldClass } from './adminUiStyles';

const QUERY_KEY = ['adminStudioPackage'];

/**
 * Giá gói mở Studio (spec D11). Mỗi lần lưu là một mức giá mới (append-only, có audit);
 * chưa đặt giá thì độc giả không mua được.
 */
export const StudioPackagePriceCard: React.FC<{
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}> = ({ onSaved, onError }) => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMemo(
    () =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
    [lang],
  );
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }),
    [lang],
  );
  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminService.getStudioPackage,
  });
  const [draft, setDraft] = useState('');

  const save = useMutation({
    mutationFn: (priceVnd: number) => adminService.setStudioPackagePrice(priceVnd),
    onSuccess: (next) => {
      queryClient.setQueryData(QUERY_KEY, next);
      setDraft('');
      onSaved(t('admin.studioPackage.saved', { price: money.format(next.priceVnd ?? 0) }));
    },
    onError: (err: Error) => onError(err.message),
  });

  const min = data?.minPriceVnd ?? 1000;
  const max = data?.maxPriceVnd ?? 50_000_000;
  const value = Number(draft);
  const valid = draft !== '' && Number.isInteger(value) && value >= min && value <= max;
  const unchanged = valid && value === data?.priceVnd;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid && !unchanged) save.mutate(value);
  };

  const current =
    data?.priceVnd != null ? money.format(data.priceVnd) : t('admin.studioPackage.notOnSale');

  return (
    <AdminCard
      title={t('admin.studioPackage.title')}
      description={t('admin.studioPackage.description')}
    >
      {isError ? (
        <p className='text-sm text-red-700' role='alert'>
          {(error as Error).message}
        </p>
      ) : (
        <div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
          <dl className='grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-3'>
            <div>
              <dt className='text-xs text-admin-muted'>{t('admin.studioPackage.currentPrice')}</dt>
              <dd className='font-mono text-lg font-bold tabular-nums text-admin-ink-strong'>
                {isLoading ? '…' : current}
              </dd>
            </div>
            <div>
              <dt className='text-xs text-admin-muted'>{t('admin.studioPackage.purchases')}</dt>
              <dd className='font-mono text-lg font-bold tabular-nums text-admin-ink-strong'>
                {isLoading ? '…' : (data?.purchaseCount ?? 0)}
              </dd>
            </div>
            {data?.changedAt && (
              <div className='col-span-2 sm:col-span-1'>
                <dt className='text-xs text-admin-muted'>{t('admin.studioPackage.changed')}</dt>
                <dd className='text-admin-ink'>
                  {dateTime.format(new Date(data.changedAt))}
                  {data.changedByName ? ` · ${data.changedByName}` : ''}
                </dd>
              </div>
            )}
          </dl>

          <form onSubmit={submit} className='flex flex-wrap items-end gap-2'>
            <AdminField
              label={t('admin.studioPackage.newPrice')}
              htmlFor='studio-package-price'
              hint={t('admin.studioPackage.range', {
                min: money.format(min),
                max: money.format(max),
              })}
              error={draft !== '' && !valid ? t('admin.studioPackage.invalid') : null}
              className='w-56'
            >
              <input
                id='studio-package-price'
                type='number'
                inputMode='numeric'
                min={min}
                max={max}
                step={1000}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminButton
              type='submit'
              variant='primary'
              isLoading={save.isPending}
              disabled={!valid || unchanged || isLoading}
              className='mb-6'
            >
              {t('admin.studioPackage.save')}
            </AdminButton>
          </form>
        </div>
      )}
    </AdminCard>
  );
};
