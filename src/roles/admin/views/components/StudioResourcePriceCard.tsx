import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminUserItem } from '@/services/admin.service';
import { BYTES_PER_GB, TOKENS_PER_UNIT } from '@/services/studioResources.service';
import { useTranslation } from '@/lib/i18n';
import { AdminButton, AdminCard, AdminField } from './AdminUi';
import { adminFieldClass } from './adminUiStyles';

const QUERY_KEY = ['adminStudioResourcePrice'];

/**
 * D12: Admin bán dung lượng và token AI (mua một lần) cho Producer. Đặt đơn giá để Producer tự mua bằng Ví,
 * hoặc cộng thẳng vào kho của một Producer (bán ngoài hệ thống, bù, tặng).
 */
export const StudioResourcePriceCard: React.FC<{
  producers: AdminUserItem[];
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}> = ({ producers, onSaved, onError }) => {
  const { t, lang } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMemo(
    () =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
    [lang],
  );
  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: adminService.getStudioResourcePrice,
  });

  const [gbDraft, setGbDraft] = useState('');
  const [tokenDraft, setTokenDraft] = useState('');
  const min = data?.minPriceVnd ?? 1000;
  const max = data?.maxPriceVnd ?? 50_000_000;
  const gbPrice = Number(gbDraft);
  const tokenPrice = Number(tokenDraft);
  const inRange = (v: number) => Number.isInteger(v) && v >= min && v <= max;
  const priceValid = gbDraft !== '' && tokenDraft !== '' && inRange(gbPrice) && inRange(tokenPrice);

  const savePrice = useMutation({
    mutationFn: () => adminService.setStudioResourcePrice(gbPrice, tokenPrice),
    onSuccess: (next) => {
      queryClient.setQueryData(QUERY_KEY, next);
      setGbDraft('');
      setTokenDraft('');
      onSaved(t('admin.studioResources.saved'));
    },
    onError: (err: Error) => onError(err.message),
  });

  const [producerId, setProducerId] = useState('');
  const [grantGb, setGrantGb] = useState('');
  const [grantTokens, setGrantTokens] = useState('');
  const grantGbValue = Math.max(0, Number(grantGb) || 0);
  const grantTokenValue = Math.max(0, Number(grantTokens) || 0);
  const grantValid = !!producerId && grantGbValue + grantTokenValue > 0;

  const grant = useMutation({
    mutationFn: () =>
      adminService.grantStudioResources(
        producerId,
        Math.round(grantGbValue * BYTES_PER_GB),
        Math.round(grantTokenValue * TOKENS_PER_UNIT),
      ),
    onSuccess: () => {
      const who = producers.find((p) => p.id === producerId);
      setGrantGb('');
      setGrantTokens('');
      onSaved(t('admin.studioResources.granted', { email: who?.email ?? '' }));
    },
    onError: (err: Error) => onError(err.message),
  });

  const priceText = (v: number | null | undefined) =>
    v != null ? money.format(v) : t('admin.studioPackage.notOnSale');

  return (
    <AdminCard
      title={t('admin.studioResources.title')}
      description={t('admin.studioResources.description')}
    >
      {isError ? (
        <p className='text-sm text-red-700' role='alert'>
          {(error as Error).message}
        </p>
      ) : (
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
            <dl className='grid grid-cols-2 gap-x-8 gap-y-1 text-sm'>
              <div>
                <dt className='text-xs text-admin-muted'>{t('admin.studioResources.perGb')}</dt>
                <dd className='font-mono text-lg font-bold tabular-nums text-admin-ink-strong'>
                  {isLoading ? '…' : priceText(data?.pricePerGbVnd)}
                </dd>
              </div>
              <div>
                <dt className='text-xs text-admin-muted'>
                  {t('admin.studioResources.perMillion')}
                </dt>
                <dd className='font-mono text-lg font-bold tabular-nums text-admin-ink-strong'>
                  {isLoading ? '…' : priceText(data?.pricePerMillionTokensVnd)}
                </dd>
              </div>
            </dl>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (priceValid) savePrice.mutate();
              }}
              className='flex flex-wrap items-end gap-2'
            >
              <AdminField
                label={t('admin.studioResources.newPerGb')}
                htmlFor='studio-resource-price-gb'
                hint={t('admin.studioPackage.range', {
                  min: money.format(min),
                  max: money.format(max),
                })}
                className='w-48'
              >
                <input
                  id='studio-resource-price-gb'
                  type='number'
                  inputMode='numeric'
                  min={min}
                  max={max}
                  step={1000}
                  value={gbDraft}
                  onChange={(e) => setGbDraft(e.target.value)}
                  className={adminFieldClass}
                />
              </AdminField>
              <AdminField
                label={t('admin.studioResources.newPerMillion')}
                htmlFor='studio-resource-price-tokens'
                className='w-48'
              >
                <input
                  id='studio-resource-price-tokens'
                  type='number'
                  inputMode='numeric'
                  min={min}
                  max={max}
                  step={1000}
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  className={adminFieldClass}
                />
              </AdminField>
              <AdminButton
                type='submit'
                variant='primary'
                isLoading={savePrice.isPending}
                disabled={!priceValid || isLoading}
                className='mb-6'
              >
                {t('admin.studioPackage.save')}
              </AdminButton>
            </form>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (grantValid) grant.mutate();
            }}
            className='flex flex-wrap items-end gap-2 border-t border-admin-line pt-4'
          >
            <AdminField
              label={t('admin.studioResources.producer')}
              htmlFor='studio-resource-grant-user'
              hint={t('admin.studioResources.producerHint')}
              className='w-64'
            >
              <select
                id='studio-resource-grant-user'
                value={producerId}
                onChange={(e) => setProducerId(e.target.value)}
                className={adminFieldClass}
              >
                <option value=''>{t('admin.studioResources.pickProducer')}</option>
                {producers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName ? `${p.fullName} · ${p.email}` : p.email}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField
              label={t('admin.studioResources.addGb')}
              htmlFor='studio-resource-grant-gb'
              className='w-32'
            >
              <input
                id='studio-resource-grant-gb'
                type='number'
                inputMode='decimal'
                min={0}
                step={1}
                value={grantGb}
                onChange={(e) => setGrantGb(e.target.value)}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminField
              label={t('admin.studioResources.addMillions')}
              htmlFor='studio-resource-grant-tokens'
              className='w-40'
            >
              <input
                id='studio-resource-grant-tokens'
                type='number'
                inputMode='decimal'
                min={0}
                step={0.5}
                value={grantTokens}
                onChange={(e) => setGrantTokens(e.target.value)}
                className={adminFieldClass}
              />
            </AdminField>
            <AdminButton
              type='submit'
              isLoading={grant.isPending}
              disabled={!grantValid}
              className='mb-6'
            >
              {t('admin.studioResources.grant')}
            </AdminButton>
          </form>
        </div>
      )}
    </AdminCard>
  );
};
