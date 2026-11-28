import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, HardDrive, Sparkles, ShoppingCart, Wallet, Crown } from 'lucide-react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  ProgressBar,
  SectionHeader,
} from '@/shared/ui';
import { PageContainer } from '@/shared/components/PageContainer';
import {
  BYTES_PER_GB,
  STUDIO_RESOURCES_QUERY_KEY,
  TOKENS_PER_UNIT,
  studioResourcesService,
  type ResourceBudgetDto,
  type StudioAllocationDto,
  type StudioResourcesDto,
} from '@/services/studioResources.service';
import { walletService } from '@/services/wallet.service';
import { useTranslation } from '@/lib/i18n';

const WALLET_QUERY_KEY = ['studioResourcesWallet'];

const inputClass =
  'w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs';

/**
 * D12: kho tài nguyên của Producer (dung lượng + token AI mua một lần). Chia cho từng Studio mình sở hữu,
 * xem phần còn lại, dùng hết thì mua thêm bằng Ví theo đơn giá Admin đặt.
 */
export const StudioResourcesView: React.FC = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const buyRef = useRef<HTMLElement>(null);

  const number = useMemo(() => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }), [lang]);
  const money = useMemo(
    () =>
      new Intl.NumberFormat(lang, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }),
    [lang],
  );
  const gb = (bytes: number) =>
    t('workspace.resources.gb', { value: number.format(bytes / BYTES_PER_GB) });
  const mt = (tokens: number) =>
    t('workspace.resources.millionTokens', { value: number.format(tokens / TOKENS_PER_UNIT) });

  const resources = useQuery({
    queryKey: STUDIO_RESOURCES_QUERY_KEY,
    queryFn: studioResourcesService.getMine,
  });
  const wallet = useQuery({ queryKey: WALLET_QUERY_KEY, queryFn: walletService.getMyWallet });

  const wantsBuy = searchParams.get('buy') === '1';
  const loaded = !!resources.data;
  useEffect(() => {
    if (wantsBuy && loaded) buyRef.current?.scrollIntoView({ block: 'start' });
  }, [wantsBuy, loaded]);

  const setData = (next: StudioResourcesDto) =>
    queryClient.setQueryData(STUDIO_RESOURCES_QUERY_KEY, next);

  const data = resources.data;

  return (
    <div className='min-h-screen bg-[#FAF9F5] text-stone-900 font-sans'>
      <PageContainer className='py-6 md:py-8 flex flex-col gap-6 max-w-6xl mx-auto'>
        <button
          type='button'
          onClick={() => navigate('/workspaces')}
          className='focus-ring self-start inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded cursor-pointer'
        >
          <ArrowLeft className='w-4 h-4' aria-hidden='true' />
          {t('workspace.resources.back')}
        </button>

        <PageHeader
          icon={<HardDrive className='w-5 h-5' aria-hidden='true' />}
          eyebrow={t('workspace.resources.eyebrow')}
          title={t('workspace.resources.title')}
          description={t('workspace.resources.subtitle')}
          actions={
            <Button
              variant='primary'
              size='sm'
              leadingIcon={<ShoppingCart className='w-4 h-4' />}
              onClick={() => buyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {t('workspace.resources.buyMore')}
            </Button>
          }
        />

        {resources.isError && <Alert tone='danger'>{(resources.error as Error).message}</Alert>}

        {resources.isLoading && (
          <div aria-busy='true' className='grid gap-4 md:grid-cols-2'>
            <span className='sr-only'>{t('workspace.loading')}</span>
            {[0, 1].map((i) => (
              <div key={i} className='h-36 rounded-xl bg-stone-200/60 animate-pulse' />
            ))}
          </div>
        )}

        {data && (
          <>
            {!data.hasPool && (
              <Alert tone='info' title={t('workspace.resources.legacyTitle')}>
                {t('workspace.resources.legacyDesc')}
              </Alert>
            )}

            {data.storage && data.tokens && (
              <div className='grid gap-4 md:grid-cols-2' data-testid='resource-budgets'>
                <BudgetCard
                  icon={<HardDrive className='w-4 h-4' aria-hidden='true' />}
                  title={t('workspace.resources.storageTitle')}
                  budget={data.storage}
                  format={gb}
                  tone='brand'
                />
                <BudgetCard
                  icon={<Sparkles className='w-4 h-4 text-violet-600' aria-hidden='true' />}
                  title={t('workspace.resources.tokensTitle')}
                  budget={data.tokens}
                  format={mt}
                  tone='ai'
                  note={t('workspace.resources.tokensNote')}
                />
              </div>
            )}

            <section aria-labelledby='resources-studios' className='flex flex-col gap-3'>
              <SectionHeader
                id='resources-studios'
                title={t('workspace.resources.studiosTitle')}
                count={data.studios.length}
              />
              {data.studios.length === 0 ? (
                <p className='rounded-xl border-2 border-dashed border-head-line bg-head-wash/50 p-6 text-center text-sm text-stone-600'>
                  {t('workspace.resources.noStudios')}
                </p>
              ) : (
                <ul className='flex flex-col gap-3'>
                  {data.studios.map((studio) => (
                    <AllocationRow
                      key={studio.workspaceId}
                      studio={studio}
                      resources={data}
                      gb={gb}
                      mt={mt}
                      onSaved={setData}
                    />
                  ))}
                </ul>
              )}
            </section>

            <BuyMoreCard
              ref={buyRef}
              resources={data}
              balanceVnd={wallet.data?.balanceVnd ?? null}
              money={money}
              onBought={(next, balance) => {
                setData(next);
                queryClient.setQueryData(WALLET_QUERY_KEY, (prev: unknown) =>
                  prev && typeof prev === 'object' ? { ...prev, balanceVnd: balance } : prev,
                );
              }}
            />
          </>
        )}
      </PageContainer>
    </div>
  );
};

const BudgetCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  budget: ResourceBudgetDto;
  format: (n: number) => string;
  tone: 'brand' | 'ai';
  note?: string;
}> = ({ icon, title, budget, format, tone, note }) => {
  const { t } = useTranslation();
  return (
    <Card as='section'>
      <CardHeader icon={icon} title={title} titleAs='h2' />
      <CardBody className='flex flex-col gap-3'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-xs text-stone-600'>{t('workspace.resources.remaining')}</span>
          <span className='font-mono text-2xl font-bold tabular-nums text-stone-900'>
            {format(budget.remaining)}
          </span>
        </div>
        <ProgressBar
          value={budget.allocated}
          max={budget.total}
          tone={budget.remaining <= 0 ? 'warning' : tone}
          label={title}
        />
        <dl className='grid grid-cols-2 gap-2 text-xs'>
          <div>
            <dt className='text-stone-500'>{t('workspace.resources.total')}</dt>
            <dd className='font-semibold tabular-nums text-stone-800'>{format(budget.total)}</dd>
          </div>
          <div>
            <dt className='text-stone-500'>{t('workspace.resources.allocated')}</dt>
            <dd className='font-semibold tabular-nums text-stone-800'>
              {format(budget.allocated)}
            </dd>
          </div>
        </dl>
        {note && <p className='text-xs text-stone-500'>{note}</p>}
      </CardBody>
    </Card>
  );
};

const AllocationRow: React.FC<{
  studio: StudioAllocationDto;
  resources: StudioResourcesDto;
  gb: (n: number) => string;
  mt: (n: number) => string;
  onSaved: (next: StudioResourcesDto) => void;
}> = ({ studio, resources, gb, mt, onSaved }) => {
  const { t } = useTranslation();
  const [storageGb, setStorageGb] = useState(String(studio.storageQuotaBytes / BYTES_PER_GB));
  const [tokenMillions, setTokenMillions] = useState(String(studio.tokenQuota / TOKENS_PER_UNIT));
  const [error, setError] = useState<string | null>(null);

  const maxStorage = studio.storageQuotaBytes + (resources.storage?.remaining ?? 0);
  const maxTokens = studio.tokenQuota + (resources.tokens?.remaining ?? 0);
  const storageBytes = Math.round(Number(storageGb) * BYTES_PER_GB);
  const tokens = Math.round(Number(tokenMillions) * TOKENS_PER_UNIT);
  const unchanged = storageBytes === studio.storageQuotaBytes && tokens === studio.tokenQuota;
  const invalid =
    !(storageBytes > 0) ||
    !(tokens > 0) ||
    storageBytes > maxStorage ||
    tokens > maxTokens ||
    storageBytes < studio.usedStorageBytes ||
    tokens < studio.usedTokens;

  const save = useMutation({
    mutationFn: () => studioResourcesService.allocate(studio.workspaceId, storageBytes, tokens),
    onSuccess: (next) => {
      setError(null);
      onSaved(next);
    },
    onError: (err: Error) => setError(err.message),
  });

  const unlimited = studio.storageQuotaBytes <= 0 || studio.tokenQuota <= 0;

  return (
    <li>
      <Card>
        <CardBody className='flex flex-col gap-4 lg:flex-row lg:items-end'>
          <div className='min-w-0 lg:w-64 shrink-0'>
            <p className='inline-flex items-center gap-1.5 font-serif text-base font-bold text-stone-900'>
              <Crown className='w-3.5 h-3.5 text-accent-dark' aria-hidden='true' />
              <span className='truncate'>{studio.name}</span>
            </p>
            <p className='mt-1 text-xs text-stone-600 tabular-nums'>
              {t('workspace.resources.usedLine', {
                storage: gb(studio.usedStorageBytes),
                tokens: mt(studio.usedTokens),
              })}
            </p>
            {unlimited && (
              <p className='mt-1 text-xs text-amber-800'>{t('workspace.resources.unlimited')}</p>
            )}
          </div>
          <div className='grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2'>
            <label className='flex flex-col gap-1 text-xs font-medium text-stone-700'>
              {t('workspace.resources.create.storageGb')}
              <input
                type='number'
                inputMode='decimal'
                min={0.1}
                step={0.1}
                value={storageGb}
                onChange={(e) => setStorageGb(e.target.value)}
                className={inputClass}
                disabled={!resources.hasPool || save.isPending}
              />
              <span className='font-normal text-stone-500'>
                {t('workspace.resources.maxHint', { value: gb(maxStorage) })}
              </span>
            </label>
            <label className='flex flex-col gap-1 text-xs font-medium text-stone-700'>
              {t('workspace.resources.create.tokenMillions')}
              <input
                type='number'
                inputMode='decimal'
                min={0.1}
                step={0.1}
                value={tokenMillions}
                onChange={(e) => setTokenMillions(e.target.value)}
                className={inputClass}
                disabled={!resources.hasPool || save.isPending}
              />
              <span className='font-normal text-stone-500'>
                {t('workspace.resources.maxHint', { value: mt(maxTokens) })}
              </span>
            </label>
          </div>
          <Button
            variant='primary'
            size='sm'
            className='shrink-0 self-start lg:self-auto lg:mb-6'
            disabled={!resources.hasPool || unchanged || invalid}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {t('workspace.resources.save')}
          </Button>
        </CardBody>
        {error && (
          <div className='px-5 pb-4'>
            <Alert tone='danger' className='text-xs'>
              {error}
            </Alert>
          </div>
        )}
      </Card>
    </li>
  );
};

const MAX_UNITS = 1000;

const BuyMoreCard = React.forwardRef<
  HTMLElement,
  {
    resources: StudioResourcesDto;
    balanceVnd: number | null;
    money: Intl.NumberFormat;
    onBought: (next: StudioResourcesDto, balanceVnd: number) => void;
  }
>(function BuyMoreCard({ resources, balanceVnd, money, onBought }, ref) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [storageGb, setStorageGb] = useState('5');
  const [tokenMillions, setTokenMillions] = useState('1');
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const priceGb = resources.pricePerGbVnd;
  const priceTokens = resources.pricePerMillionTokensVnd;
  const onSale = priceGb != null && priceTokens != null;
  const gbUnits = Math.max(0, Math.floor(Number(storageGb) || 0));
  const tokenUnits = Math.max(0, Math.floor(Number(tokenMillions) || 0));
  const total = onSale ? gbUnits * priceGb + tokenUnits * priceTokens : 0;
  const invalid = gbUnits + tokenUnits === 0 || gbUnits > MAX_UNITS || tokenUnits > MAX_UNITS;
  const shortfall = balanceVnd != null ? Math.max(0, total - balanceVnd) : 0;

  const buy = useMutation({
    mutationFn: () =>
      studioResourcesService.purchase({
        storageGb: gbUnits,
        tokenMillions: tokenUnits,
        expectedTotalVnd: total,
      }),
    onSuccess: (res) => {
      setMessage({
        tone: 'success',
        text: t('workspace.resources.buy.done', { total: money.format(res.totalVnd) }),
      });
      onBought(res.resources, res.remainingBalanceVnd);
    },
    onError: (err: Error) => setMessage({ tone: 'danger', text: err.message }),
  });

  return (
    <Card as='section' ref={ref as React.Ref<HTMLDivElement>} id='buy-studio-resources'>
      <CardHeader
        icon={<ShoppingCart className='w-4 h-4' aria-hidden='true' />}
        title={t('workspace.resources.buy.title')}
        subtitle={t('workspace.resources.buy.subtitle')}
        titleAs='h2'
      />
      <CardBody className='flex flex-col gap-4'>
        {!onSale ? (
          <Alert tone='info'>{t('workspace.resources.buy.notOnSale')}</Alert>
        ) : (
          <>
            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='flex flex-col gap-1 text-xs font-medium text-stone-700'>
                <span className='inline-flex items-center gap-1'>
                  <HardDrive className='w-3.5 h-3.5 text-stone-500' aria-hidden='true' />
                  {t('workspace.resources.buy.storage')}
                </span>
                <input
                  type='number'
                  inputMode='numeric'
                  min={0}
                  max={MAX_UNITS}
                  step={1}
                  value={storageGb}
                  onChange={(e) => {
                    setStorageGb(e.target.value);
                    setMessage(null);
                  }}
                  className={inputClass}
                />
                <span className='font-normal text-stone-500'>
                  {t('workspace.resources.buy.unitPriceGb', { price: money.format(priceGb) })}
                </span>
              </label>
              <label className='flex flex-col gap-1 text-xs font-medium text-stone-700'>
                <span className='inline-flex items-center gap-1'>
                  <Sparkles className='w-3.5 h-3.5 text-violet-600' aria-hidden='true' />
                  {t('workspace.resources.buy.tokens')}
                </span>
                <input
                  type='number'
                  inputMode='numeric'
                  min={0}
                  max={MAX_UNITS}
                  step={1}
                  value={tokenMillions}
                  onChange={(e) => {
                    setTokenMillions(e.target.value);
                    setMessage(null);
                  }}
                  className={inputClass}
                />
                <span className='font-normal text-stone-500'>
                  {t('workspace.resources.buy.unitPriceTokens', {
                    price: money.format(priceTokens),
                  })}
                </span>
              </label>
            </div>

            <div className='flex flex-col gap-3 rounded-xl bg-[#FAF9F5] border border-stone-200/80 p-4 sm:flex-row sm:items-center sm:justify-between'>
              <dl className='flex flex-wrap gap-x-8 gap-y-1 text-xs'>
                <div>
                  <dt className='text-stone-500'>{t('workspace.resources.buy.total')}</dt>
                  <dd
                    className='font-mono text-xl font-bold tabular-nums text-stone-900'
                    data-testid='buy-resources-total'
                  >
                    {money.format(total)}
                  </dd>
                </div>
                <div>
                  <dt className='inline-flex items-center gap-1 text-stone-500'>
                    <Wallet className='w-3.5 h-3.5' aria-hidden='true' />
                    {t('workspace.resources.buy.balance')}
                  </dt>
                  <dd className='font-mono text-xl font-bold tabular-nums text-stone-900'>
                    {balanceVnd == null ? '…' : money.format(balanceVnd)}
                  </dd>
                </div>
              </dl>
              {shortfall > 0 ? (
                <Button
                  variant='secondary'
                  size='sm'
                  leadingIcon={<Wallet className='w-4 h-4' />}
                  onClick={() => navigate(`/catalog/wallet?amount=${shortfall}`)}
                >
                  {t('workspace.resources.buy.topup', { amount: money.format(shortfall) })}
                </Button>
              ) : (
                <Button
                  variant='primary'
                  size='sm'
                  leadingIcon={<ShoppingCart className='w-4 h-4' />}
                  disabled={invalid}
                  loading={buy.isPending}
                  onClick={() => buy.mutate()}
                >
                  {t('workspace.resources.buy.submit')}
                </Button>
              )}
            </div>
          </>
        )}
        {message && (
          <Alert tone={message.tone} announce className='text-xs'>
            {message.text}
          </Alert>
        )}
        <p className='text-xs text-stone-500'>{t('workspace.resources.buy.adminNote')}</p>
      </CardBody>
    </Card>
  );
});
