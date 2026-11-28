import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  Check,
  ShieldCheck,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, Modal, Skeleton } from '@/shared/ui';
import { StudioPackageDto, WalletApiError, walletService } from '@/services/wallet.service';
import { useTranslation } from '@/lib/i18n';
import { useReaderContext } from '../layout/readerContext';
import { STUDIO_ROLES } from '../components/studioRoles';

interface ReaderOpenStudioViewProps {
  /** Tài khoản đã có quyền tạo Studio (đã mua hoặc được Admin cấp): không bán lại. */
  canCreateStudio: boolean;
  /** Mua xong (hoặc đã có quyền): cập nhật tài khoản rồi sang màn tạo Studio. */
  onStudioUnlocked: () => Promise<void> | void;
}

const BENEFIT_KEYS = ['benefitCreate', 'benefitTeam', 'benefitPipeline'] as const;

/** Các bước sau khi mua: đúng luồng thật (mua bằng Ví → tạo Studio → mời đội → sản xuất & bàn giao phát hành). */
const STEPS = [
  { key: 'stepBuy', Icon: Wallet },
  { key: 'stepCreate', Icon: Building2 },
  { key: 'stepInvite', Icon: UserPlus },
  { key: 'stepPublish', Icon: BookOpenCheck },
] as const;

/** Chặng sản xuất của một chương trong Studio (pipeline Script → Bible → Pencil/Ink/Color → Lettering → Editor). */
const PIPELINE_KEYS = ['script', 'pencil', 'ink', 'color', 'lettering', 'review'] as const;

const FAQ_KEYS = ['faqRefund', 'faqRoles', 'faqPublish', 'faqReader'] as const;

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

  // Chỉ nhận kết quả của lần tải mới nhất: đổi tài khoản / bấm tải lại nhanh không để response cũ đè lên.
  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoadError(null);
    setPriceChanged(false);
    try {
      const [nextPkg, wallet] = await Promise.all([
        walletService.getStudioPackage(),
        isSignedIn && !canCreateStudio ? walletService.getMyWallet() : Promise.resolve(null),
      ]);
      if (seq !== loadSeq.current) return;
      setPkg(nextPkg);
      setBalance(wallet?.balanceVnd ?? null);
    } catch (err) {
      if (seq === loadSeq.current) setLoadError((err as Error).message);
    }
  }, [isSignedIn, canCreateStudio]);

  useEffect(() => {
    void load();
    const seq = loadSeq;
    return () => {
      seq.current++;
    };
  }, [load]);

  const price = pkg?.isOnSale ? pkg.priceVnd : null;
  const shortfall = price !== null && balance !== null ? Math.max(0, price - balance) : 0;

  const buy = async () => {
    if (price === null || buying) return;
    setBuying(true);
    setBuyError(null);
    let owned = false;
    try {
      await walletService.purchaseStudioPackage(price);
      owned = true;
    } catch (err) {
      const e = err as WalletApiError;
      if (e.code === 'ALREADY_OWNED') {
        owned = true;
      } else {
        setBuyError(e.message);
        if (e.code === 'PRICE_CHANGED') setPriceChanged(true);
        // 400 = Ví không đủ (số dư vừa đổi ở nơi khác): tải lại để hiện số còn thiếu và nút nạp.
        else if (e.status === 400) void load();
      }
    } finally {
      setBuying(false);
    }
    // Tiền đã trừ: đóng hộp thoại rồi mới chuyển trang, nên lỗi ở bước sau không bị báo thành "mua thất bại".
    if (owned) {
      setConfirming(false);
      try {
        await onStudioUnlocked();
      } catch {
        setLoadError(t('workspace.reader.openStudio.ownedButRedirectFailed'));
      }
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
    <main className='w-full flex-1'>
      <section className='border-b border-stone-200/80 bg-stone-900 text-white'>
        <div className='mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:py-14'>
          <div>
            <p className='text-xs font-bold uppercase tracking-widest text-orange-300'>
              {t('workspace.reader.openStudio.eyebrow')}
            </p>
            <h1 className='mt-2 font-serif text-3xl font-bold leading-tight sm:text-4xl'>
              {t('workspace.reader.openStudio.heroTitle')}
            </h1>
            <p className='mt-3 max-w-xl text-sm leading-relaxed text-stone-300'>
              {t('workspace.reader.openStudio.subtitle')}
            </p>
            <ul className='mt-5 space-y-2 text-sm text-stone-200'>
              {BENEFIT_KEYS.map((key) => (
                <li key={key} className='flex gap-2'>
                  <Check className='mt-0.5 w-4 h-4 shrink-0 text-emerald-400' aria-hidden='true' />
                  <span>{t(`workspace.reader.openStudio.${key}`)}</span>
                </li>
              ))}
            </ul>
            <a
              href='#open-studio-package'
              className='mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-stone-900 hover:bg-orange-50'
            >
              {t('workspace.reader.openStudio.seePackage')}
              <ArrowRight className='w-4 h-4' aria-hidden='true' />
            </a>
          </div>

          {/* Minh hoạ bảng tiến độ một chương: các chặng thật của pipeline, không phải số liệu. */}
          <div
            aria-hidden='true'
            className='rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg'
          >
            <div className='mb-3 flex items-center justify-between text-xs text-stone-400'>
              <span className='font-semibold text-stone-200'>
                {t('workspace.reader.openStudio.boardTitle')}
              </span>
              <span className='font-mono'>CH.01</span>
            </div>
            <div className='grid grid-cols-3 gap-2 sm:grid-cols-6'>
              {PIPELINE_KEYS.map((key, i) => (
                <div key={key} className='flex flex-col gap-2'>
                  <span className='truncate text-xs font-semibold text-stone-300'>
                    {t(`workspace.reader.openStudio.pipeline.${key}`)}
                  </span>
                  {Array.from({ length: 3 - (i % 3) }, (_, j) => (
                    <span
                      key={j}
                      className={`h-9 rounded-md ${
                        i < 2 ? 'bg-emerald-400/70' : i < 4 ? 'bg-blue-400/70' : 'bg-white/15'
                      } ${j === 0 && i === 3 ? 'ring-2 ring-orange-400' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className='mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_22rem] lg:items-start'>
        <div className='space-y-10'>
          {loadError && (
            <Alert tone='danger' className='text-sm'>
              {loadError}
            </Alert>
          )}

          <section aria-labelledby='open-studio-steps'>
            <h2 id='open-studio-steps' className='font-serif text-xl font-bold text-stone-900'>
              {t('workspace.reader.openStudio.stepsTitle')}
            </h2>
            <ol className='mt-4 grid gap-3 sm:grid-cols-2'>
              {STEPS.map(({ key, Icon }, i) => (
                <li
                  key={key}
                  className='flex gap-3 rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs'
                >
                  <span className='grid size-9 shrink-0 place-items-center rounded-lg bg-orange-50 text-[#EA580C]'>
                    <Icon className='w-4 h-4' aria-hidden='true' />
                  </span>
                  <div>
                    <p className='text-sm font-semibold text-stone-900'>
                      <span className='mr-1 font-mono text-stone-400'>{i + 1}.</span>
                      {t(`workspace.reader.openStudio.${key}`)}
                    </p>
                    <p className='mt-1 text-xs leading-relaxed text-stone-600'>
                      {t(`workspace.reader.openStudio.${key}Desc`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby='open-studio-team'>
            <h2 id='open-studio-team' className='font-serif text-xl font-bold text-stone-900'>
              {t('workspace.reader.openStudio.teamTitle')}
            </h2>
            <p className='mt-1 text-sm text-stone-600'>
              {t('workspace.reader.openStudio.teamSubtitle')}
            </p>
            <ul className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
              {STUDIO_ROLES.map(({ id, Icon, tone }) => (
                <li
                  key={id}
                  className='rounded-xl border border-stone-200/80 bg-white p-4 shadow-xs'
                >
                  <div className='flex items-center gap-2'>
                    <span className={`grid size-8 place-items-center rounded-lg ring-1 ${tone}`}>
                      <Icon className='w-4 h-4' aria-hidden='true' />
                    </span>
                    <p className='text-sm font-bold text-stone-900'>
                      {t(`workspace.shelf.role.${id}`)}
                    </p>
                    {id === 'producer' && (
                      <span className='ml-auto rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-[#EA580C]'>
                        {t('workspace.reader.openStudio.youBadge')}
                      </span>
                    )}
                  </div>
                  <p className='mt-2 text-xs leading-relaxed text-stone-600'>
                    {t(`workspace.reader.studioRoles.${id}.summary`)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby='open-studio-faq'>
            <h2 id='open-studio-faq' className='font-serif text-xl font-bold text-stone-900'>
              {t('workspace.reader.openStudio.faqTitle')}
            </h2>
            <div className='mt-4 divide-y divide-stone-200/80 rounded-xl border border-stone-200/80 bg-white'>
              {FAQ_KEYS.map((key) => (
                <details key={key} className='group px-4 py-3'>
                  <summary className='cursor-pointer list-none text-sm font-semibold text-stone-900 marker:hidden'>
                    <span className='flex items-center justify-between gap-3'>
                      {t(`workspace.reader.openStudio.${key}Q`)}
                      <ArrowRight
                        className='w-4 h-4 shrink-0 text-stone-400 transition-transform group-open:rotate-90'
                        aria-hidden='true'
                      />
                    </span>
                  </summary>
                  <p className='mt-2 text-sm leading-relaxed text-stone-600'>
                    {t(`workspace.reader.openStudio.${key}A`)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        <Card as='section' id='open-studio-package' className='scroll-mt-20 lg:sticky lg:top-20'>
          <CardHeader
            icon={<Building2 className='w-4 h-4' />}
            title={t('workspace.reader.openStudio.packageTitle')}
            subtitle={t('workspace.reader.openStudio.packageSubtitle')}
          />
          <CardBody className='space-y-4'>
            {!canCreateStudio && (
              <dl className='space-y-2 text-sm'>
                <div className='flex items-baseline justify-between gap-4'>
                  <dt className='text-xs text-stone-500'>
                    {t('workspace.reader.openStudio.price')}
                  </dt>
                  <dd className='font-mono text-2xl font-bold tabular-nums text-stone-900'>
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
            <p className='flex gap-2 border-t border-stone-200/80 pt-3 text-xs leading-relaxed text-stone-500'>
              <ShieldCheck className='w-4 h-4 shrink-0 text-emerald-600' aria-hidden='true' />
              {t('workspace.reader.openStudio.guarantee')}
            </p>
          </CardBody>
        </Card>
      </div>

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
