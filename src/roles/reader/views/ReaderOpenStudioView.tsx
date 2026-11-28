import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Wallet } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, Modal, Skeleton } from '@/shared/ui';
import { StudioPackageDto, WalletApiError, walletService } from '@/services/wallet.service';
import { useTranslation } from '@/lib/i18n';
import { useReaderContext } from '../layout/readerContext';

interface ReaderOpenStudioViewProps {
  /** Tài khoản đã có quyền tạo Studio (đã mua hoặc được Admin cấp): không bán lại. */
  canCreateStudio: boolean;
  /** Mua xong (hoặc đã có quyền): cập nhật tài khoản rồi sang màn tạo Studio. */
  onStudioUnlocked: () => Promise<void> | void;
}

const BENEFIT_KEYS = ['benefitCreate', 'benefitTeam', 'benefitPipeline'] as const;

/**
 * Gói mở Studio (spec D11): độc giả mua một lần bằng Ví, được quyền tạo Studio và làm Producer vĩnh viễn.
 * Giá do Admin đặt; gửi kèm giá đang thấy để server từ chối (409) nếu giá vừa đổi.
 */
export const ReaderOpenStudioView: React.FC<ReaderOpenStudioViewProps> = ({
  canCreateStudio,
  onStudioUnlocked,
}) => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { isSignedIn, requestLogin } = useReaderContext();
  const money = useMemo(
    () =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
    [lang],
  );

  const [pkg, setPkg] = useState<StudioPackageDto | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [priceChanged, setPriceChanged] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    setPriceChanged(false);
    try {
      const [nextPkg, wallet] = await Promise.all([
        walletService.getStudioPackage(),
        isSignedIn && !canCreateStudio ? walletService.getMyWallet() : Promise.resolve(null),
      ]);
      setPkg(nextPkg);
      setBalance(wallet?.balanceVnd ?? null);
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, [isSignedIn, canCreateStudio]);

  useEffect(() => {
    void load();
  }, [load]);

  const price = pkg?.isOnSale ? pkg.priceVnd : null;
  const shortfall = price !== null && balance !== null ? Math.max(0, price - balance) : 0;

  const buy = async () => {
    if (price === null) return;
    setBuying(true);
    setBuyError(null);
    try {
      await walletService.purchaseStudioPackage(price);
      setConfirming(false);
      await onStudioUnlocked();
    } catch (err) {
      const e = err as WalletApiError;
      if (e.code === 'ALREADY_OWNED') {
        setConfirming(false);
        await onStudioUnlocked();
        return;
      }
      setBuyError(e.message);
      if (e.code === 'PRICE_CHANGED') setPriceChanged(true);
    } finally {
      setBuying(false);
    }
  };

  const action = (() => {
    if (canCreateStudio) {
      return (
        <div className='space-y-3'>
          <Alert tone='success' className='text-sm'>
            {t('workspace.reader.openStudio.alreadyOwned')}
          </Alert>
          <Button variant='primary' onClick={() => void onStudioUnlocked()}>
            {t('workspace.reader.openStudio.goCreate')}
          </Button>
        </div>
      );
    }
    if (!pkg) return <Skeleton className='h-10 w-48 rounded-full' />;
    if (price === null) {
      return (
        <Alert tone='info' className='text-sm'>
          {t('workspace.reader.openStudio.notOnSale')}
        </Alert>
      );
    }
    if (!isSignedIn) {
      return (
        <div className='space-y-2'>
          <Button variant='primary' onClick={requestLogin}>
            {t('workspace.reader.openStudio.loginToBuy')}
          </Button>
          <p className='text-xs text-stone-500'>{t('workspace.reader.openStudio.loginHint')}</p>
        </div>
      );
    }
    if (balance === null) return <Skeleton className='h-10 w-48 rounded-full' />;
    if (shortfall > 0) {
      return (
        <div className='space-y-3'>
          <Alert tone='warning' className='text-sm'>
            {t('workspace.reader.openStudio.shortfall', { amount: money.format(shortfall) })}
          </Alert>
          <Button
            variant='primary'
            leadingIcon={<Wallet className='w-4 h-4' />}
            onClick={() => navigate(`/catalog/wallet?amount=${shortfall}`)}
          >
            {t('workspace.reader.openStudio.topup', { amount: money.format(shortfall) })}
          </Button>
        </div>
      );
    }
    return (
      <Button
        variant='primary'
        leadingIcon={<Building2 className='w-4 h-4' />}
        onClick={() => {
          setBuyError(null);
          setConfirming(true);
        }}
      >
        {t('workspace.reader.openStudio.buy', { price: money.format(price) })}
      </Button>
    );
  })();

  return (
    <main className='mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6'>
      <div>
        <h1 className='font-serif text-2xl font-bold text-stone-900'>
          {t('workspace.reader.openStudio.title')}
        </h1>
        <p className='mt-1 text-sm text-stone-600'>{t('workspace.reader.openStudio.subtitle')}</p>
      </div>

      {loadError && (
        <Alert tone='danger' className='text-sm'>
          {loadError}
        </Alert>
      )}

      <Card>
        <CardHeader
          icon={<Building2 className='w-4 h-4' />}
          title={t('workspace.reader.openStudio.packageTitle')}
          subtitle={t('workspace.reader.openStudio.packageSubtitle')}
        />
        <CardBody className='grid gap-6 md:grid-cols-[1fr_auto] md:items-start'>
          <ul className='space-y-2 text-sm text-stone-700'>
            {BENEFIT_KEYS.map((key) => (
              <li key={key} className='flex gap-2'>
                <Check className='mt-0.5 w-4 h-4 shrink-0 text-emerald-600' aria-hidden='true' />
                <span>{t(`workspace.reader.openStudio.${key}`)}</span>
              </li>
            ))}
          </ul>

          <div className='min-w-64 space-y-4 rounded-xl border border-stone-200/80 bg-[#FAF9F5] p-4'>
            {!canCreateStudio && (
              <dl className='space-y-2 text-sm'>
                <div className='flex items-baseline justify-between gap-4'>
                  <dt className='text-xs text-stone-500'>
                    {t('workspace.reader.openStudio.price')}
                  </dt>
                  <dd className='font-mono text-xl font-bold tabular-nums text-stone-900'>
                    {pkg ? (price !== null ? money.format(price) : '—') : '…'}
                  </dd>
                </div>
                {isSignedIn && (
                  <div className='flex items-baseline justify-between gap-4'>
                    <dt className='text-xs text-stone-500'>
                      {t('workspace.reader.openStudio.balance')}
                    </dt>
                    <dd className='font-semibold tabular-nums'>
                      {balance === null ? '…' : money.format(balance)}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            {action}
          </div>
        </CardBody>
      </Card>

      <Modal
        isOpen={confirming}
        onClose={() => !buying && setConfirming(false)}
        size='sm'
        title={t('workspace.reader.openStudio.confirmTitle')}
        closeLabel={t('workspace.reader.catalog.close')}
        footer={
          priceChanged ? (
            <Button
              variant='primary'
              onClick={() => {
                setConfirming(false);
                void load();
              }}
            >
              {t('workspace.reader.openStudio.reload')}
            </Button>
          ) : (
            <>
              <Button variant='secondary' disabled={buying} onClick={() => setConfirming(false)}>
                {t('workspace.reader.openStudio.cancel')}
              </Button>
              <Button variant='primary' loading={buying} onClick={() => void buy()}>
                {t('workspace.reader.openStudio.confirm')}
              </Button>
            </>
          )
        }
      >
        <div className='space-y-3 text-sm text-stone-700'>
          {price !== null && (
            <p>{t('workspace.reader.openStudio.confirmDesc', { price: money.format(price) })}</p>
          )}
          {buyError && (
            <Alert tone='danger' className='text-xs'>
              {buyError}
            </Alert>
          )}
        </div>
      </Modal>
    </main>
  );
};
