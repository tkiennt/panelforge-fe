import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Copy, QrCode, RefreshCw, Wallet } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, EmptyState, Skeleton } from '@/shared/ui';
import {
  TOPUP_MAX_VND,
  TOPUP_MIN_VND,
  TopupResponseDto,
  UserWalletDto,
  walletService,
} from '@/services/wallet.service';
import { useTranslation } from '@/lib/i18n';

const PRESETS = [20_000, 50_000, 100_000, 200_000, 500_000];
const POLL_MS = 3000;
/** Quá thời gian này mà Publisher chưa duyệt thì ngừng hỏi; người dùng tự bấm kiểm tra lại. */
const POLL_LIMIT_MS = 15 * 60 * 1000;
/** Đơn đang chờ giữ trong tab: rời trang Ví rồi quay lại vẫn thấy mã QR và tiếp tục chờ. */
const PENDING_ORDER_KEY = 'panelforge.reader.pendingTopup';

type OrderState = 'pending' | 'stalled' | 'approved' | 'rejected';

interface StoredOrder {
  order: TopupResponseDto;
  startedAt: number;
}

const readStoredOrder = (): StoredOrder | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
    return raw ? (JSON.parse(raw) as StoredOrder) : null;
  } catch {
    return null;
  }
};

const writeStoredOrder = (value: StoredOrder | null) => {
  try {
    if (value) sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    // Không lưu được (chế độ riêng tư): đơn vẫn chờ bình thường khi còn ở trang này.
  }
};

const clampSuggestedAmount = (raw: string | null) => {
  const suggested = Number(raw);
  if (!Number.isFinite(suggested) || suggested < TOPUP_MIN_VND) return '';
  return String(Math.min(TOPUP_MAX_VND, Math.ceil(suggested / 1000) * 1000));
};

/** Ví VNĐ của độc giả (BR-33, Q13): số dư, nạp qua VietQR vào tài khoản nền tảng, lịch sử giao dịch. */
export const ReaderWalletView: React.FC = () => {
  const { t, lang } = useTranslation();
  const money = useMemo(
    () =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
    [lang],
  );
  const dateTime = useMemo(
    () => new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }),
    [lang],
  );
  const [params] = useSearchParams();

  const [wallet, setWallet] = useState<UserWalletDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [amount, setAmount] = useState(() => clampSuggestedAmount(params.get('amount')));
  const [creating, setCreating] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [stored] = useState(readStoredOrder);
  const [order, setOrder] = useState<TopupResponseDto | null>(stored?.order ?? null);
  const [pollStartedAt, setPollStartedAt] = useState(stored?.startedAt ?? 0);
  const [orderState, setOrderState] = useState<OrderState>('pending');
  const [orderNote, setOrderNote] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoadError(null);
    try {
      setWallet(await walletService.getMyWallet());
    } catch (err) {
      setLoadError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  // Chờ Publisher duyệt / webhook xác nhận: hỏi lần lượt (không chồng request) tới khi đơn kết thúc,
  // rời trang hoặc quá POLL_LIMIT_MS.
  useEffect(() => {
    if (!order || orderState !== 'pending') return;
    let active = true;
    let timer: number | undefined;
    const tick = async () => {
      if (Date.now() - pollStartedAt > POLL_LIMIT_MS) {
        setOrderState('stalled');
        return;
      }
      try {
        const status = await walletService.getTransactionStatus(order.orderId);
        if (!active) return;
        setPollError(null);
        if (status.isCompleted || status.status === 'Approved') {
          writeStoredOrder(null);
          setOrderState('approved');
          void loadWallet();
          return;
        }
        if (status.status === 'Rejected' || status.status === 'Expired') {
          writeStoredOrder(null);
          setOrderState('rejected');
          setOrderNote(status.rejectionReason ?? null);
          return;
        }
      } catch (err) {
        if (!active) return;
        setPollError((err as Error).message);
      }
      timer = window.setTimeout(() => void tick(), POLL_MS);
    };
    timer = window.setTimeout(() => void tick(), POLL_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [order, orderState, pollStartedAt, loadWallet]);

  const checkAgain = () => {
    const now = Date.now();
    setPollStartedAt(now);
    if (order) writeStoredOrder({ order, startedAt: now });
    setPollError(null);
    setOrderState('pending');
  };

  const amountVnd = Number(amount);
  const amountValid =
    Number.isInteger(amountVnd) && amountVnd >= TOPUP_MIN_VND && amountVnd <= TOPUP_MAX_VND;

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountValid) return;
    setCreating(true);
    setTopupError(null);
    try {
      const created = await walletService.createTopup(amountVnd);
      const now = Date.now();
      setOrder(created);
      setPollStartedAt(now);
      setOrderNote(null);
      setPollError(null);
      setOrderState(created.isCompleted ? 'approved' : 'pending');
      writeStoredOrder(created.isCompleted ? null : { order: created, startedAt: now });
      if (created.isCompleted) void loadWallet();
    } catch (err) {
      setTopupError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const copy = (text?: string | null) => {
    if (text) navigator.clipboard?.writeText(text).catch(() => undefined);
  };

  const infoRow = (label: string, value?: string | null, copyable = false) =>
    value ? (
      <div className='flex items-center justify-between gap-3 px-3 py-2'>
        <dt className='text-xs text-stone-500'>{label}</dt>
        <dd className='flex min-w-0 items-center gap-1.5 text-sm font-semibold text-stone-900'>
          <span className='truncate'>{value}</span>
          {copyable && (
            <button
              type='button'
              onClick={() => copy(value)}
              className='grid size-7 shrink-0 place-items-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              aria-label={t('workspace.reader.wallet.copy', { label })}
            >
              <Copy className='w-3.5 h-3.5' aria-hidden='true' />
            </button>
          )}
        </dd>
      </div>
    ) : null;

  return (
    <main className='mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='font-serif text-2xl font-bold text-stone-900'>
            {t('workspace.reader.wallet.title')}
          </h1>
          <p className='mt-1 text-sm text-stone-600'>{t('workspace.reader.wallet.subtitle')}</p>
        </div>
        <div className='rounded-2xl border border-stone-200/80 bg-white px-5 py-3 text-right shadow-xs'>
          <p className='text-xs text-stone-500'>{t('workspace.reader.wallet.balance')}</p>
          <p className='font-mono text-2xl font-bold tabular-nums text-stone-900'>
            {wallet ? money.format(wallet.balanceVnd) : '…'}
          </p>
        </div>
      </div>

      {loadError && (
        <Alert tone='danger' className='text-sm'>
          {loadError}
        </Alert>
      )}

      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        <Card>
          <CardHeader
            icon={<Wallet className='w-4 h-4' aria-hidden='true' />}
            title={t('workspace.reader.wallet.topupTitle')}
            subtitle={t('workspace.reader.wallet.topupDesc', {
              min: money.format(TOPUP_MIN_VND),
              max: money.format(TOPUP_MAX_VND),
            })}
          />
          <CardBody>
            <form onSubmit={(e) => void createOrder(e)} className='space-y-4'>
              <div className='flex flex-wrap gap-2'>
                {PRESETS.map((value) => (
                  <button
                    key={value}
                    type='button'
                    aria-pressed={amountVnd === value}
                    onClick={() => setAmount(String(value))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold tabular-nums ${
                      amountVnd === value
                        ? 'border-[#EA580C] bg-orange-50 text-[#C2410C]'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {money.format(value)}
                  </button>
                ))}
              </div>
              <label className='block space-y-1'>
                <span className='text-xs font-medium text-stone-600'>
                  {t('workspace.reader.wallet.amountLabel')}
                </span>
                <input
                  type='number'
                  inputMode='numeric'
                  min={TOPUP_MIN_VND}
                  max={TOPUP_MAX_VND}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className='w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-sm tabular-nums focus:border-orange-400 focus:outline-none'
                />
              </label>
              {topupError && (
                <Alert tone='danger' className='text-xs'>
                  {topupError}
                </Alert>
              )}
              <Button
                type='submit'
                variant='primary'
                loading={creating}
                disabled={!amountValid}
                leadingIcon={<QrCode className='w-4 h-4' />}
              >
                {t('workspace.reader.wallet.createOrder')}
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            icon={<QrCode className='w-4 h-4' aria-hidden='true' />}
            title={t('workspace.reader.wallet.orderTitle')}
          />
          <CardBody>
            {!order ? (
              <p className='py-8 text-center text-xs text-stone-500'>
                {t('workspace.reader.wallet.orderEmpty')}
              </p>
            ) : orderState === 'approved' ? (
              <div className='flex flex-col items-center gap-2 py-8 text-center'>
                <CheckCircle2 className='w-8 h-8 text-emerald-600' aria-hidden='true' />
                <p className='text-sm font-semibold text-emerald-800'>
                  {t('workspace.reader.wallet.orderApproved', {
                    amount: money.format(order.amountVnd),
                  })}
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {order.qrCodeUrl && (
                  <img
                    src={order.qrCodeUrl}
                    alt={t('workspace.reader.wallet.qrAlt')}
                    width={240}
                    height={240}
                    className='mx-auto size-60 rounded-xl border border-stone-200/80 bg-white object-contain'
                  />
                )}
                <dl className='divide-y divide-stone-200/80 rounded-xl border border-stone-200/80 bg-[#FAF9F5]'>
                  {infoRow(t('workspace.reader.wallet.amount'), money.format(order.amountVnd))}
                  {infoRow(t('workspace.reader.wallet.bank'), order.bankName)}
                  {infoRow(t('workspace.reader.wallet.accountNumber'), order.accountNumber, true)}
                  {infoRow(t('workspace.reader.wallet.accountName'), order.accountName)}
                  {infoRow(
                    t('workspace.reader.wallet.transferContent'),
                    order.transferContent,
                    true,
                  )}
                </dl>
                {orderState === 'pending' ? (
                  <>
                    <p className='flex items-center gap-2 text-xs text-amber-800'>
                      <RefreshCw className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
                      {t('workspace.reader.wallet.orderPending')}
                    </p>
                    {pollError && (
                      <Alert tone='warning' className='text-xs'>
                        {t('workspace.reader.wallet.orderPollError', { message: pollError })}
                      </Alert>
                    )}
                  </>
                ) : orderState === 'stalled' ? (
                  <div className='space-y-2'>
                    <Alert tone='warning' className='text-xs'>
                      {t('workspace.reader.wallet.orderStalled')}
                    </Alert>
                    <Button
                      variant='secondary'
                      leadingIcon={<RefreshCw className='w-4 h-4' />}
                      onClick={checkAgain}
                    >
                      {t('workspace.reader.wallet.orderCheckAgain')}
                    </Button>
                  </div>
                ) : (
                  <Alert tone='danger' className='text-xs'>
                    {t('workspace.reader.wallet.orderRejected')}
                    {orderNote ? ` ${orderNote}` : ''}
                  </Alert>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card as='section'>
        <CardHeader title={t('workspace.reader.wallet.historyTitle')} />
        <CardBody>
          {!wallet && !loadError ? (
            <Skeleton className='h-24 w-full' />
          ) : !wallet || wallet.transactions.length === 0 ? (
            <EmptyState title={t('workspace.reader.wallet.historyEmpty')} />
          ) : (
            <ul className='divide-y divide-stone-200/80'>
              {wallet.transactions.map((tx) => (
                <li key={tx.id} className='flex items-center justify-between gap-3 py-2.5'>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-stone-900'>{tx.title}</p>
                    <p className='text-xs text-stone-500'>
                      <time dateTime={tx.createdAt}>{dateTime.format(new Date(tx.createdAt))}</time>
                    </p>
                  </div>
                  <div className='shrink-0 text-right'>
                    <p
                      className={`font-mono text-sm font-semibold tabular-nums ${
                        tx.amountVnd >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.amountVnd >= 0 ? '+' : ''}
                      {money.format(tx.amountVnd)}
                    </p>
                    <p className='font-mono text-xs text-stone-500 tabular-nums'>
                      {money.format(tx.balanceAfter)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </main>
  );
};
