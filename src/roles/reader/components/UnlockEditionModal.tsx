import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Wallet } from 'lucide-react';
import { Alert, Button, Modal } from '@/shared/ui';
import { walletService, WalletApiError } from '@/services/wallet.service';
import { formatContentLanguageName } from '@/shared/lib/multilingual';
import { useTranslation } from '@/lib/i18n';

export interface UnlockTarget {
  chapterId: string;
  language: string;
  priceVnd: number;
}

interface UnlockEditionModalProps {
  target: UnlockTarget | null;
  isSignedIn: boolean;
  onClose: () => void;
  /** Mở khóa xong, hoặc giá vừa đổi (409): tải lại chương để thấy trạng thái mới. */
  onChanged: () => void;
  onLogin: () => void;
  /** Ví không đủ: sang trang Ví, gợi ý nạp đúng số còn thiếu. */
  onTopup: (shortfallVnd: number) => void;
}

/** Mở khóa một ấn bản ngôn ngữ bằng Ví (BR-33): trừ đúng giá đang hiển thị, hiệu lực vĩnh viễn. */
export const UnlockEditionModal: React.FC<UnlockEditionModalProps> = ({
  target,
  isSignedIn,
  onClose,
  onChanged,
  onLogin,
  onTopup,
}) => {
  const { t, lang } = useTranslation();
  const price = useMemo(
    () =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
    [lang],
  );
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceChanged, setPriceChanged] = useState(false);

  // Tăng để đọc lại số dư (vd. Ví vừa bị trừ ở tab khác nên server báo không đủ).
  const [balanceKey, setBalanceKey] = useState(0);
  useEffect(() => {
    if (!target || !isSignedIn) return;
    let active = true;
    walletService
      .getMyWallet()
      .then((w) => active && setBalance(w.balanceVnd))
      .catch((err: Error) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, [target, isSignedIn, balanceKey]);

  const close = () => {
    setBalance(null);
    setError(null);
    setPriceChanged(false);
    onClose();
  };

  const shortfall = target && balance !== null ? Math.max(0, target.priceVnd - balance) : 0;

  const unlock = async () => {
    if (!target || busy) return;
    setBusy(true);
    setError(null);
    try {
      await walletService.unlockChapter({
        chapterId: target.chapterId,
        language: target.language,
        expectedPriceVnd: target.priceVnd,
      });
      close();
      onChanged();
    } catch (err) {
      const e = err as WalletApiError;
      setError(e.message);
      if (e.code === 'PRICE_CHANGED') setPriceChanged(true);
      // 400 = Ví không đủ: đọc lại số dư để hiện số còn thiếu và nút nạp.
      else if (e.status === 400) setBalanceKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  };

  const footer = !target ? null : !isSignedIn ? (
    <Button variant='primary' onClick={onLogin}>
      {t('workspace.reader.unlock.loginToUnlock')}
    </Button>
  ) : priceChanged ? (
    <Button
      variant='primary'
      onClick={() => {
        close();
        onChanged();
      }}
    >
      {t('workspace.reader.unlock.reload')}
    </Button>
  ) : shortfall > 0 ? (
    <Button
      variant='primary'
      leadingIcon={<Wallet className='w-4 h-4' />}
      onClick={() => onTopup(shortfall)}
    >
      {t('workspace.reader.unlock.topup', { amount: price.format(shortfall) })}
    </Button>
  ) : (
    <Button
      variant='primary'
      loading={busy}
      disabled={balance === null}
      leadingIcon={<Lock className='w-4 h-4' />}
      onClick={() => void unlock()}
    >
      {t('workspace.reader.unlock.confirm', { price: price.format(target.priceVnd) })}
    </Button>
  );

  return (
    <Modal
      isOpen={!!target}
      onClose={close}
      size='sm'
      title={t('workspace.reader.unlock.title')}
      closeLabel={t('workspace.reader.catalog.close')}
      footer={footer}
    >
      {target && (
        <div className='space-y-3 text-sm text-stone-700'>
          <p>
            {t('workspace.reader.unlock.desc', {
              language: formatContentLanguageName(target.language, lang),
            })}
          </p>
          <dl className='divide-y divide-stone-200/80 rounded-xl border border-stone-200/80 bg-[#FAF9F5]'>
            <div className='flex items-center justify-between px-3 py-2'>
              <dt className='text-xs text-stone-500'>{t('workspace.reader.unlock.price')}</dt>
              <dd className='font-semibold tabular-nums'>{price.format(target.priceVnd)}</dd>
            </div>
            {isSignedIn && (
              <div className='flex items-center justify-between px-3 py-2'>
                <dt className='text-xs text-stone-500'>{t('workspace.reader.unlock.balance')}</dt>
                <dd className='font-semibold tabular-nums'>
                  {balance === null ? '…' : price.format(balance)}
                </dd>
              </div>
            )}
          </dl>
          {!isSignedIn && (
            <p className='text-xs text-stone-500'>{t('workspace.reader.unlock.loginHint')}</p>
          )}
          {isSignedIn && shortfall > 0 && (
            <Alert tone='warning' className='text-xs'>
              {t('workspace.reader.unlock.shortfall', { amount: price.format(shortfall) })}
            </Alert>
          )}
          {error && (
            <Alert tone='danger' className='text-xs'>
              {error}
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
};
