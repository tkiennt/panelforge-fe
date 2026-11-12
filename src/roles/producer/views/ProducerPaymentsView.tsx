import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  QrCode,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  Sparkles,
  Building2,
  BookOpen,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  paymentService,
  buildVietQrImageUrl,
  toBankAccountName,
  PaymentStatusFilter,
  PaymentTransactionDto,
  PaymentTransactionStatus,
  WorkspacePaymentSummaryDto,
} from '@/services/payment.service';
import { seriesService, SeriesDto } from '@/services/series.service';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { useToast } from '@/shared/context/ToastContext';
import { useTranslation } from '@/lib/i18n';

const POPULAR_VIETNAM_BANKS = [
  { bin: '970422', code: 'MB', name: 'MB Bank' },
  { bin: '970436', code: 'VCB', name: 'Vietcombank' },
  { bin: '970407', code: 'TCB', name: 'Techcombank' },
  { bin: '970416', code: 'ACB', name: 'ACB' },
  { bin: '970418', code: 'BIDV', name: 'BIDV' },
  { bin: '970415', code: 'CTG', name: 'VietinBank' },
  { bin: '970423', code: 'TPB', name: 'TPBank' },
  { bin: '970432', code: 'VPB', name: 'VPBank' },
  { bin: '970405', code: 'VBA', name: 'Agribank' },
  { bin: '970403', code: 'STB', name: 'Sacombank' },
  { bin: '970448', code: 'OCB', name: 'OCB' },
  { bin: '970443', code: 'SHB', name: 'SHB' },
  { bin: '970437', code: 'HDB', name: 'HDBank' },
  { bin: '970441', code: 'VIB', name: 'VIB' },
];

/** Mã đơn mẫu dùng cho ảnh xem trước VietQR trong modal cấu hình. */
const SAMPLE_ORDER_CODE = 'PF123456';
const SAMPLE_AMOUNT_VND = 10000;
const PAGE_SIZE = 15;
const STATUS_TABS: PaymentStatusFilter[] = ['All', 'Pending', 'Approved', 'Rejected'];

interface BankForm {
  bankBin: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}

const EMPTY_BANK_FORM: BankForm = {
  bankBin: POPULAR_VIETNAM_BANKS[0].bin,
  bankName: POPULAR_VIETNAM_BANKS[0].name,
  bankAccountNo: '',
  bankAccountName: '',
};

const formatVnd = (amount: number) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;

const getErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
};

interface ProducerPaymentsViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

export const ProducerPaymentsView: React.FC<ProducerPaymentsViewProps> = ({ onShowToast }) => {
  const { t, lang } = useTranslation('payments');
  const { workspaceId: paramWorkspaceId } = useParams();
  const confirm = useConfirm();
  const toast = useToast();
  const dateLocale = lang === 'en' ? 'en-US' : 'vi-VN';
  const formatDate = useCallback(
    (iso?: string | null) => (iso ? new Date(iso).toLocaleString(dateLocale) : '—'),
    [dateLocale],
  );

  const showToast = useCallback(
    (title: string, desc: string, variant: 'success' | 'error' = 'success') => {
      if (onShowToast) {
        onShowToast(title, desc);
      } else if (variant === 'error') {
        toast.error(title, desc);
      } else {
        toast.success(title, desc);
      }
    },
    [onShowToast, toast],
  );

  const effectiveWorkspaceId = useMemo(() => {
    if (paramWorkspaceId && paramWorkspaceId !== 'undefined' && paramWorkspaceId !== 'null') {
      return paramWorkspaceId;
    }
    try {
      const stored = localStorage.getItem('activeWorkspace');
      if (stored && stored !== 'undefined' && stored !== 'null') {
        return JSON.parse(stored)?.id || '';
      }
    } catch {
      // Ignore parse error
    }
    return '';
  }, [paramWorkspaceId]);

  // Data
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransactionDto[]>([]);
  const [summary, setSummary] = useState<WorkspacePaymentSummaryDto>({
    totalRevenueVnd: 0,
    pendingCount: 0,
    totalUnlockedChapters: 0,
    paidTransactionsCount: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatusFilter>('All');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [seriesList, setSeriesList] = useState<SeriesDto[]>([]);

  // Bank settings
  const [showBankModal, setShowBankModal] = useState(false);
  const [savedBank, setSavedBank] = useState<BankForm | null>(null);
  const [bankForm, setBankForm] = useState<BankForm>(EMPTY_BANK_FORM);
  const [bankFormLoading, setBankFormLoading] = useState(false);

  // QR preview / reject modals
  const [previewQrTx, setPreviewQrTx] = useState<PaymentTransactionDto | null>(null);
  const [rejectTx, setRejectTx] = useState<PaymentTransactionDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Debounce search input → query
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPageIndex(1);
    }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!effectiveWorkspaceId) return;
    seriesService
      .getSeriesList(effectiveWorkspaceId)
      .then((data) => setSeriesList(data || []))
      .catch(() => setSeriesList([]));
  }, [effectiveWorkspaceId]);

  const fetchBankSettings = useCallback(async () => {
    if (!effectiveWorkspaceId) return;
    try {
      const data = await paymentService.getBankSettings(effectiveWorkspaceId);
      if (data?.bankBin && data?.bankAccountNo) {
        setSavedBank({
          bankBin: data.bankBin,
          bankName:
            data.bankName || POPULAR_VIETNAM_BANKS.find((b) => b.bin === data.bankBin)?.name || '',
          bankAccountNo: data.bankAccountNo,
          bankAccountName: data.bankAccountName || '',
        });
      } else {
        setSavedBank(null);
      }
    } catch {
      setSavedBank(null);
    }
  }, [effectiveWorkspaceId]);

  useEffect(() => {
    fetchBankSettings();
  }, [fetchBankSettings]);

  const fetchPayments = useCallback(
    async (isManualRefresh = false) => {
      if (!effectiveWorkspaceId) {
        setLoading(false);
        return;
      }
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await paymentService.getPayments(effectiveWorkspaceId, {
          status: selectedStatus,
          seriesId: selectedSeriesId || undefined,
          search: searchQuery || undefined,
          pageIndex,
          pageSize: PAGE_SIZE,
        });
        setTransactions(res.items);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setSummary(res.summary);
      } catch (err) {
        showToast(
          t('toast.loadErrorTitle'),
          getErrorMessage(err, t('toast.loadErrorDesc')),
          'error',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [effectiveWorkspaceId, selectedStatus, selectedSeriesId, searchQuery, pageIndex, showToast, t],
  );

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const typeLabel = (tx: PaymentTransactionDto) => {
    switch (tx.type) {
      case 'ChapterUnlock':
        return t('type.chapterUnlock');
      case 'Topup':
        return t('type.topup');
      case 'VipSubscription':
        return t('type.vipSubscription');
      default:
        return tx.type;
    }
  };

  const handleApprove = async (tx: PaymentTransactionDto) => {
    const ok = await confirm({
      title: t('approveConfirm.title', { orderCode: tx.orderCode }),
      description: t('approveConfirm.description', {
        reader: tx.readerName || tx.readerEmail || '—',
        amount: formatVnd(tx.amountVnd),
        benefit: typeLabel(tx),
      }),
      confirmText: t('actions.approve'),
      cancelText: t('actions.review'),
      variant: 'info',
    });
    if (!ok) return;

    setActionLoadingId(tx.id);
    try {
      const res = await paymentService.approvePayment(effectiveWorkspaceId, tx.id);
      showToast(
        t('toast.approvedTitle'),
        res?.message || t('toast.approvedDesc', { orderCode: tx.orderCode }),
      );
      await fetchPayments(true);
    } catch (err) {
      showToast(
        t('toast.approveErrorTitle'),
        getErrorMessage(err, t('toast.approveErrorDesc')),
        'error',
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReject = (tx: PaymentTransactionDto) => {
    setRejectTx(tx);
    setRejectionReason(t('reject.defaultReason'));
  };

  const handleSubmitReject = async () => {
    if (!rejectTx || !rejectionReason.trim()) return;
    setIsRejecting(true);
    try {
      const res = await paymentService.rejectPayment(
        effectiveWorkspaceId,
        rejectTx.id,
        rejectionReason,
      );
      showToast(
        t('toast.rejectedTitle'),
        res?.message || t('toast.rejectedDesc', { orderCode: rejectTx.orderCode }),
      );
      setRejectTx(null);
      await fetchPayments(true);
    } catch (err) {
      showToast(
        t('toast.rejectErrorTitle'),
        getErrorMessage(err, t('toast.rejectErrorDesc')),
        'error',
      );
    } finally {
      setIsRejecting(false);
    }
  };

  const openBankModal = () => {
    setBankForm(savedBank ?? EMPTY_BANK_FORM);
    setShowBankModal(true);
  };

  const bankFormValid =
    !!bankForm.bankBin &&
    /^\d{6,19}$/.test(bankForm.bankAccountNo) &&
    bankForm.bankAccountName.trim().length > 0;

  const handleSaveBankSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormValid) return;
    setBankFormLoading(true);
    try {
      const payload = { ...bankForm, bankAccountName: bankForm.bankAccountName.trim() };
      const updated = await paymentService.updateBankSettings(effectiveWorkspaceId, payload);
      setSavedBank({
        bankBin: updated?.bankBin || payload.bankBin,
        bankName: updated?.bankName || payload.bankName,
        bankAccountNo: updated?.bankAccountNo || payload.bankAccountNo,
        bankAccountName: updated?.bankAccountName || payload.bankAccountName,
      });
      showToast(
        t('toast.bankSavedTitle'),
        t('toast.bankSavedDesc', { accountNo: payload.bankAccountNo, bankName: payload.bankName }),
      );
      setShowBankModal(false);
    } catch (err) {
      showToast(t('toast.bankErrorTitle'), getErrorMessage(err, t('toast.bankErrorDesc')), 'error');
    } finally {
      setBankFormLoading(false);
    }
  };

  const renderContent = (tx: PaymentTransactionDto) => {
    const styles: Record<string, { cls: string; icon: React.ReactNode }> = {
      ChapterUnlock: {
        cls: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: <BookOpen className='w-3 h-3 text-blue-600' />,
      },
      Topup: {
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <Wallet className='w-3 h-3 text-emerald-600' />,
      },
      VipSubscription: {
        cls: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: <Sparkles className='w-3 h-3 text-purple-600' />,
      },
    };
    const style = styles[tx.type] ?? {
      cls: 'bg-stone-100 text-stone-600 border-stone-200',
      icon: null,
    };
    const chapterLabel =
      tx.chapterNumber != null
        ? t('table.chapterShort', { number: tx.chapterNumber }) +
          (tx.chapterTitle ? ` · ${tx.chapterTitle}` : '')
        : '';
    return (
      <div className='flex flex-col gap-0.5 items-start'>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${style.cls}`}
        >
          {style.icon}
          {typeLabel(tx)}
        </span>
        {tx.seriesTitle && (
          <span
            className='text-[11px] text-stone-700 font-semibold line-clamp-1'
            title={tx.seriesTitle}
          >
            {tx.seriesTitle}
            {chapterLabel && <span className='font-normal text-stone-500'> • {chapterLabel}</span>}
          </span>
        )}
        {!tx.seriesTitle && (
          <span className='text-[11px] text-stone-500'>
            {tx.type === 'Topup'
              ? t('detail.topup')
              : tx.type === 'VipSubscription'
                ? t('detail.vipSubscription')
                : chapterLabel || t('detail.chapterUnknown')}
          </span>
        )}
      </div>
    );
  };

  const renderStatusBadge = (status: PaymentTransactionStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300'>
            <Clock className='w-3.5 h-3.5 text-amber-600' />
            {t('status.pending')}
          </span>
        );
      case 'Approved':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'>
            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
            {t('status.approved')}
          </span>
        );
      case 'Rejected':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200'>
            <XCircle className='w-3.5 h-3.5 text-rose-600' />
            {t('status.rejected')}
          </span>
        );
      case 'Expired':
        return (
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200'>
            <Clock className='w-3.5 h-3.5 text-stone-500' />
            {t('status.expired')}
          </span>
        );
      default:
        return <span className='text-xs text-stone-500'>{status}</span>;
    }
  };

  const bankPreviewUrl =
    bankForm.bankBin && bankForm.bankAccountNo
      ? buildVietQrImageUrl({
          bankBin: bankForm.bankBin,
          bankAccountNo: bankForm.bankAccountNo,
          amount: SAMPLE_AMOUNT_VND,
          addInfo: SAMPLE_ORDER_CODE,
          accountName: bankForm.bankAccountName.trim() || 'STUDIO',
        })
      : '';

  const statusTabLabel: Record<PaymentStatusFilter, string> = {
    All: t('status.all'),
    Pending: t('status.pending'),
    Approved: t('status.approved'),
    Rejected: t('status.rejected'),
  };

  const kpiCardBase =
    'p-4.5 rounded-2xl bg-white border shadow-xs relative overflow-hidden transition-colors';

  return (
    <div className='p-6 max-w-7xl mx-auto space-y-6'>
      {/* ─── 1. Header ─── */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E7E7E7]'>
        <div className='flex items-center gap-2.5'>
          <div className='p-2 rounded-xl bg-[#F97316]/10 text-[#F97316]'>
            <CreditCard className='w-6 h-6' />
          </div>
          <div>
            <h1 className='text-xl font-bold text-[#171717] tracking-tight'>{t('title')}</h1>
            <p className='text-xs text-[#737373] mt-0.5'>{t('subtitle')}</p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2.5'>
          {savedBank ? (
            <span className='hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium'>
              <Building2 className='w-3.5 h-3.5' />
              {savedBank.bankName} • <span className='font-mono'>{savedBank.bankAccountNo}</span>
            </span>
          ) : (
            <span className='hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium'>
              <Building2 className='w-3.5 h-3.5' />
              {t('bank.notConfigured')}
            </span>
          )}
          <button
            type='button'
            onClick={() => fetchPayments(true)}
            disabled={refreshing || loading}
            className='inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E7E7E7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#555555] transition-colors shadow-2xs cursor-pointer disabled:opacity-50'
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#F97316]' : ''}`}
            />
            <span>{refreshing ? t('refreshing') : t('refresh')}</span>
          </button>
          <button
            type='button'
            onClick={openBankModal}
            className='inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer'
          >
            <Building2 className='w-4 h-4 text-[#F97316]' />
            <span>{t('configBank')}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. KPI Cards ─── */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className={`${kpiCardBase} border-[#E7E7E7] hover:border-[#F97316]/40`}>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-[#737373] uppercase tracking-wider'>
              {t('kpi.totalRevenue')}
            </span>
            <div className='p-2 rounded-xl bg-emerald-50 text-emerald-600'>
              <DollarSign className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-2 text-2xl font-black font-mono text-[#171717] tracking-tight'>
            {formatVnd(summary.totalRevenueVnd)}
          </div>
          <div className='mt-1 text-[11px] text-emerald-700 font-medium'>
            {t('kpi.totalRevenueSub')}
          </div>
        </div>

        <button
          type='button'
          onClick={() => {
            setSelectedStatus('Pending');
            setPageIndex(1);
          }}
          className={`${kpiCardBase} text-left cursor-pointer ${
            summary.pendingCount > 0
              ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-200'
              : 'border-[#E7E7E7] hover:border-amber-200'
          }`}
        >
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-[#737373] uppercase tracking-wider'>
              {t('kpi.pendingCount')}
            </span>
            <div className='p-2 rounded-xl bg-amber-100 text-amber-600'>
              <Clock className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-2 flex items-baseline gap-2'>
            <span className='text-2xl font-black font-mono text-amber-700 tracking-tight'>
              {summary.pendingCount}
            </span>
            {summary.pendingCount > 0 && (
              <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse'>
                {t('kpi.needsReview')}
              </span>
            )}
          </div>
          <div className='mt-1 text-[11px] text-stone-500'>
            {summary.pendingCount > 0 ? t('kpi.pendingCountSub') : t('kpi.pendingNone')}
          </div>
        </button>

        <div className={`${kpiCardBase} border-[#E7E7E7] hover:border-blue-200`}>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-[#737373] uppercase tracking-wider'>
              {t('kpi.unlockedChapters')}
            </span>
            <div className='p-2 rounded-xl bg-blue-50 text-blue-600'>
              <BookOpen className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-2 text-2xl font-black font-mono text-[#171717] tracking-tight'>
            {summary.totalUnlockedChapters.toLocaleString('vi-VN')}
          </div>
          <div className='mt-1 text-[11px] text-blue-700 font-medium'>
            {t('kpi.unlockedChaptersSub')}
          </div>
        </div>

        <div className={`${kpiCardBase} border-[#E7E7E7] hover:border-purple-200`}>
          <div className='flex items-center justify-between'>
            <span className='text-xs font-semibold text-[#737373] uppercase tracking-wider'>
              {t('kpi.paidTransactions')}
            </span>
            <div className='p-2 rounded-xl bg-purple-50 text-purple-600'>
              <ShieldCheck className='w-4 h-4' />
            </div>
          </div>
          <div className='mt-2 text-2xl font-black font-mono text-[#171717] tracking-tight'>
            {summary.paidTransactionsCount.toLocaleString('vi-VN')}
          </div>
          <div className='mt-1 text-[11px] text-purple-700 font-medium'>
            {t('kpi.paidTransactionsSub')}
          </div>
        </div>
      </div>

      {/* ─── 3. Filters ─── */}
      <div className='bg-white p-3.5 rounded-2xl border border-[#E7E7E7] shadow-2xs'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div
            role='tablist'
            className='flex flex-wrap items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs font-semibold'
          >
            {STATUS_TABS.map((tab) => {
              const active = selectedStatus === tab;
              const showCount = tab === 'Pending' && summary.pendingCount > 0;
              return (
                <button
                  key={tab}
                  type='button'
                  role='tab'
                  aria-selected={active}
                  onClick={() => {
                    setSelectedStatus(tab);
                    setPageIndex(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-white text-[#171717] shadow-xs font-bold'
                      : 'text-[#737373] hover:text-[#171717] hover:bg-white/50'
                  }`}
                >
                  <span>{statusTabLabel[tab]}</span>
                  {showCount && (
                    <span
                      className={`px-1.5 rounded-full text-[10px] font-mono ${
                        active ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {summary.pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className='flex flex-wrap items-center gap-2.5 flex-1 justify-end'>
            <select
              value={selectedSeriesId}
              onChange={(e) => {
                setSelectedSeriesId(e.target.value);
                setPageIndex(1);
              }}
              aria-label={t('filters.series')}
              className='w-48 sm:w-56 px-3 py-1.5 bg-white border border-[#E7E7E7] rounded-xl text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F97316] shadow-2xs'
            >
              <option value=''>{t('filters.allSeries')}</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>

            <div className='relative w-64 sm:w-72'>
              <Search className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                type='text'
                placeholder={t('filters.searchPlaceholder')}
                aria-label={t('filters.searchPlaceholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className='w-full pl-9 pr-7 py-1.5 bg-white border border-[#E7E7E7] rounded-xl text-xs text-[#171717] placeholder:text-[#888888] focus:outline-none focus:border-[#F97316] shadow-2xs'
              />
              {searchInput && (
                <button
                  type='button'
                  onClick={() => setSearchInput('')}
                  aria-label={t('filters.clearSearch')}
                  className='absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600'
                >
                  <X className='w-3 h-3' />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. Transactions table ─── */}
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-xs overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse min-w-[1050px]'>
            <thead className='bg-[#FAF8F5] border-b border-[#E7E7E7] text-[10px] font-mono text-[#737373] uppercase tracking-wider'>
              <tr>
                <th className='py-3 px-4'>{t('table.orderCode')}</th>
                <th className='py-3 px-4'>{t('table.reader')}</th>
                <th className='py-3 px-4'>{t('table.content')}</th>
                <th className='py-3 px-4'>{t('table.amount')}</th>
                <th className='py-3 px-4'>{t('table.createdAt')}</th>
                <th className='py-3 px-4'>{t('table.status')}</th>
                <th className='py-3 px-4'>{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-[#E7E7E7] text-xs'>
              {loading ? (
                <tr>
                  <td colSpan={7} className='py-16 text-center text-[#888888]'>
                    <Loader2 className='w-6 h-6 animate-spin mx-auto mb-2 text-[#F97316]' />
                    <span className='font-medium'>{t('table.loading')}</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className='py-16 text-center text-[#888888] space-y-1'>
                    <CreditCard className='w-8 h-8 mx-auto text-stone-300' />
                    <div className='font-bold text-[#171717]'>{t('table.emptyTitle')}</div>
                    <div className='text-xs text-[#737373] max-w-sm mx-auto'>
                      {t('table.emptyDesc')}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isActionLoading = actionLoadingId === tx.id;
                  return (
                    <tr key={tx.id} className='hover:bg-[#FAF8F5]/80 transition-colors align-top'>
                      <td className='py-3.5 px-4'>
                        <div className='flex items-center gap-1.5'>
                          <span className='px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-stone-100 text-[#171717] border border-stone-200'>
                            {tx.orderCode}
                          </span>
                          {tx.qrImageUrl && (
                            <button
                              type='button'
                              onClick={() => setPreviewQrTx(tx)}
                              className='p-1 rounded-md text-stone-400 hover:text-[#F97316] hover:bg-[#F97316]/10 transition-colors cursor-pointer'
                              title={t('actions.viewQr')}
                              aria-label={t('actions.viewQr')}
                            >
                              <QrCode className='w-3.5 h-3.5' />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className='py-3.5 px-4'>
                        <div className='flex items-center gap-2.5'>
                          <div className='w-7 h-7 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[11px] font-bold text-stone-600 shrink-0 uppercase overflow-hidden'>
                            {tx.readerAvatarUrl ? (
                              <img
                                src={tx.readerAvatarUrl}
                                alt=''
                                className='w-full h-full object-cover'
                              />
                            ) : (
                              (tx.readerName || tx.readerEmail || 'U')[0]
                            )}
                          </div>
                          <div className='min-w-0'>
                            <div className='font-semibold text-[#171717] truncate max-w-[180px]'>
                              {tx.readerName || t('table.unknownReader')}
                            </div>
                            <div className='text-[10px] text-stone-400 truncate max-w-[180px]'>
                              {tx.readerEmail || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className='py-3.5 px-4 max-w-[240px]'>{renderContent(tx)}</td>

                      <td className='py-3.5 px-4 font-mono font-bold text-sm text-[#171717] whitespace-nowrap'>
                        {formatVnd(tx.amountVnd)}
                      </td>

                      <td className='py-3.5 px-4 text-[11px] text-stone-500 font-mono whitespace-nowrap'>
                        {formatDate(tx.createdAt)}
                      </td>

                      <td className='py-3.5 px-4'>{renderStatusBadge(tx.status)}</td>

                      <td className='py-3.5 px-4'>
                        {tx.status === 'Pending' ? (
                          <div className='flex flex-wrap items-center gap-2'>
                            <button
                              type='button'
                              onClick={() => handleApprove(tx)}
                              disabled={isActionLoading}
                              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50'
                            >
                              {isActionLoading ? (
                                <Loader2 className='w-3.5 h-3.5 animate-spin' />
                              ) : (
                                <Check className='w-3.5 h-3.5' />
                              )}
                              <span>{t('actions.approve')}</span>
                            </button>
                            <button
                              type='button'
                              onClick={() => handleOpenReject(tx)}
                              disabled={isActionLoading}
                              className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50'
                            >
                              <X className='w-3.5 h-3.5' />
                              <span>{t('actions.reject')}</span>
                            </button>
                          </div>
                        ) : tx.status === 'Approved' ? (
                          <div className='space-y-1'>
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200'>
                              <CheckCircle2 className='w-3 h-3' />
                              {t('status.approved')}
                            </span>
                            <div className='text-[10px] text-stone-500 font-mono'>
                              {t('table.confirmedAt', { time: formatDate(tx.confirmedAt) })}
                            </div>
                            {tx.confirmedByName && (
                              <div className='text-[10px] text-stone-500'>
                                {t('table.confirmedBy', { name: tx.confirmedByName })}
                              </div>
                            )}
                          </div>
                        ) : tx.status === 'Rejected' ? (
                          <div className='space-y-1'>
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200'>
                              <XCircle className='w-3 h-3' />
                              {t('status.rejected')}
                            </span>
                            {tx.rejectionReason && (
                              <div
                                className='text-[10px] text-rose-600 font-medium line-clamp-2 max-w-[220px]'
                                title={tx.rejectionReason}
                              >
                                {t('table.reason', { reason: tx.rejectionReason })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className='text-[11px] text-stone-400'>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className='p-3.5 border-t border-[#E7E7E7] flex items-center justify-between text-xs text-[#737373]'>
            <div>{t('pagination.showing', { shown: transactions.length, total: totalCount })}</div>
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                disabled={pageIndex <= 1 || loading}
                aria-label={t('pagination.prev')}
                className='p-1.5 rounded-lg border border-[#E7E7E7] hover:bg-[#FAF8F5] disabled:opacity-40 cursor-pointer'
              >
                <ChevronLeft className='w-4 h-4' />
              </button>
              <span className='px-2 font-mono'>
                {t('pagination.page', { page: pageIndex, total: totalPages })}
              </span>
              <button
                type='button'
                onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                disabled={pageIndex >= totalPages || loading}
                aria-label={t('pagination.next')}
                className='p-1.5 rounded-lg border border-[#E7E7E7] hover:bg-[#FAF8F5] disabled:opacity-40 cursor-pointer'
              >
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODAL: VietQR bank settings ─── */}
      {showBankModal && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
          <div
            role='dialog'
            aria-modal='true'
            className='bg-white w-full max-w-2xl rounded-2xl border border-[#E7E7E7] shadow-2xl overflow-hidden'
          >
            <div className='p-5 border-b border-[#E7E7E7] flex items-center justify-between bg-[#FAF8F5]'>
              <div className='flex items-center gap-2'>
                <div className='p-1.5 rounded-lg bg-[#F97316]/10 text-[#F97316]'>
                  <Building2 className='w-5 h-5' />
                </div>
                <div>
                  <h3 className='font-bold text-sm text-[#171717]'>{t('bank.modalTitle')}</h3>
                  <p className='text-xs text-[#737373]'>{t('bank.modalSubtitle')}</p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setShowBankModal(false)}
                aria-label={t('actions.close')}
                className='p-1 text-[#888888] hover:text-[#171717] rounded-lg cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleSaveBankSettings} className='p-6 space-y-5'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-4'>
                  <div>
                    <label
                      htmlFor='pf-bank-bin'
                      className='block text-xs font-semibold text-[#171717] mb-1'
                    >
                      {t('bank.bankLabel')} *
                    </label>
                    <select
                      id='pf-bank-bin'
                      value={bankForm.bankBin}
                      onChange={(e) => {
                        const found = POPULAR_VIETNAM_BANKS.find((b) => b.bin === e.target.value);
                        setBankForm((prev) => ({
                          ...prev,
                          bankBin: e.target.value,
                          bankName: found ? found.name : prev.bankName,
                        }));
                      }}
                      className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-xl text-xs focus:outline-none focus:border-[#F97316]'
                    >
                      {!POPULAR_VIETNAM_BANKS.some((b) => b.bin === bankForm.bankBin) && (
                        <option value={bankForm.bankBin}>
                          {bankForm.bankName || bankForm.bankBin} ({bankForm.bankBin})
                        </option>
                      )}
                      {POPULAR_VIETNAM_BANKS.map((b) => (
                        <option key={b.bin} value={b.bin}>
                          {b.name} ({b.code}) — {b.bin}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor='pf-bank-no'
                      className='block text-xs font-semibold text-[#171717] mb-1'
                    >
                      {t('bank.accountNoLabel')} *
                    </label>
                    <input
                      id='pf-bank-no'
                      type='text'
                      inputMode='numeric'
                      required
                      placeholder='0123456789'
                      value={bankForm.bankAccountNo}
                      onChange={(e) =>
                        setBankForm((prev) => ({
                          ...prev,
                          bankAccountNo: e.target.value.replace(/\D/g, ''),
                        }))
                      }
                      className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-xl font-mono text-xs focus:outline-none focus:border-[#F97316]'
                    />
                    {bankForm.bankAccountNo && !/^\d{6,19}$/.test(bankForm.bankAccountNo) && (
                      <p className='text-[10px] text-rose-600 mt-1'>{t('bank.accountNoInvalid')}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor='pf-bank-name'
                      className='block text-xs font-semibold text-[#171717] mb-1'
                    >
                      {t('bank.accountNameLabel')} *
                    </label>
                    <input
                      id='pf-bank-name'
                      type='text'
                      required
                      placeholder='NGUYEN VAN A'
                      value={bankForm.bankAccountName}
                      onChange={(e) =>
                        setBankForm((prev) => ({
                          ...prev,
                          bankAccountName: toBankAccountName(e.target.value),
                        }))
                      }
                      className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-xl font-mono uppercase text-xs focus:outline-none focus:border-[#F97316]'
                    />
                    <p className='text-[10px] text-stone-500 mt-1'>{t('bank.accountNameHint')}</p>
                  </div>
                </div>

                <div className='p-4 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl flex flex-col items-center justify-center text-center space-y-2'>
                  <span className='text-[11px] font-bold text-stone-600 uppercase tracking-wider'>
                    {t('bank.previewTitle')}
                  </span>
                  <div className='w-44 h-44 bg-white p-2 rounded-xl border border-stone-200 shadow-xs flex items-center justify-center overflow-hidden'>
                    {bankPreviewUrl ? (
                      <img
                        src={bankPreviewUrl}
                        alt={t('bank.previewTitle')}
                        className='w-full h-full object-contain'
                      />
                    ) : (
                      <div className='text-stone-400 text-xs flex flex-col items-center gap-1'>
                        <QrCode className='w-8 h-8' />
                        <span>{t('bank.previewEmpty')}</span>
                      </div>
                    )}
                  </div>
                  <div className='text-[11px] text-stone-600 font-mono'>
                    {bankForm.bankName} • {bankForm.bankAccountNo || '---'}
                  </div>
                  <div className='text-[11px] font-bold text-[#171717] uppercase'>
                    {bankForm.bankAccountName || '---'}
                  </div>
                  <div className='text-[10px] text-stone-500'>
                    {t('bank.previewSample', {
                      amount: formatVnd(SAMPLE_AMOUNT_VND),
                      code: SAMPLE_ORDER_CODE,
                    })}
                  </div>
                </div>
              </div>

              <div className='flex justify-end gap-2.5 pt-3 border-t border-[#E7E7E7]'>
                <button
                  type='button'
                  onClick={() => setShowBankModal(false)}
                  className='px-4 py-2 rounded-xl border border-[#E7E7E7] bg-white text-xs font-semibold text-[#555555] hover:bg-[#FAF8F5] cursor-pointer'
                >
                  {t('actions.cancel')}
                </button>
                <button
                  type='submit'
                  disabled={bankFormLoading || !bankFormValid}
                  className='px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer'
                >
                  {bankFormLoading ? (
                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  ) : (
                    <Check className='w-3.5 h-3.5' />
                  )}
                  <span>{t('bank.save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: Transaction QR preview ─── */}
      {previewQrTx && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
          <div
            role='dialog'
            aria-modal='true'
            className='bg-white w-full max-w-sm rounded-2xl border border-[#E7E7E7] shadow-2xl p-6 text-center space-y-4'
          >
            <div className='flex items-center justify-between pb-2 border-b border-[#E7E7E7]'>
              <div className='text-left'>
                <div className='font-bold text-sm text-[#171717]'>
                  {t('qrModal.title', { orderCode: previewQrTx.orderCode })}
                </div>
                <div className='text-[11px] text-stone-500'>{previewQrTx.readerName}</div>
              </div>
              <button
                type='button'
                onClick={() => setPreviewQrTx(null)}
                aria-label={t('actions.close')}
                className='text-stone-400 hover:text-stone-700 cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <div className='w-64 h-64 mx-auto bg-stone-50 p-2 rounded-xl border border-stone-200 flex items-center justify-center'>
              <img
                src={previewQrTx.qrImageUrl}
                alt={`VietQR ${previewQrTx.orderCode}`}
                className='w-full h-full object-contain'
              />
            </div>
            <div className='bg-[#FAF8F5] p-3 rounded-xl border border-[#E7E7E7] text-left text-xs space-y-1.5'>
              <div className='flex justify-between'>
                <span className='text-stone-500'>{t('qrModal.amount')}</span>
                <span className='font-bold font-mono text-emerald-700'>
                  {formatVnd(previewQrTx.amountVnd)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-stone-500'>{t('qrModal.transferContent')}</span>
                <span className='font-mono font-bold text-[#F97316]'>{previewQrTx.orderCode}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-stone-500'>{t('qrModal.status')}</span>
                {renderStatusBadge(previewQrTx.status)}
              </div>
            </div>
            <button
              type='button'
              onClick={() => setPreviewQrTx(null)}
              className='w-full py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl cursor-pointer'
            >
              {t('actions.close')}
            </button>
          </div>
        </div>
      )}

      {/* ─── MODAL: Reject transaction ─── */}
      {rejectTx && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
          <div
            role='dialog'
            aria-modal='true'
            className='bg-white w-full max-w-md rounded-2xl border border-[#E7E7E7] shadow-2xl p-6 space-y-4'
          >
            <div className='flex items-center justify-between pb-2 border-b border-[#E7E7E7]'>
              <div className='flex items-center gap-2 text-rose-600 font-bold text-sm'>
                <XCircle className='w-4 h-4' />
                <span>{t('reject.title', { orderCode: rejectTx.orderCode })}</span>
              </div>
              <button
                type='button'
                onClick={() => setRejectTx(null)}
                aria-label={t('actions.close')}
                className='text-stone-400 hover:text-stone-700 cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <p className='text-xs text-stone-600'>{t('reject.description')}</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('reject.placeholder')}
              aria-label={t('reject.placeholder')}
              className='w-full p-3 bg-white border border-[#E7E7E7] rounded-xl text-xs focus:outline-none focus:border-rose-500'
            />
            <div className='flex justify-end gap-2.5 pt-2'>
              <button
                type='button'
                onClick={() => setRejectTx(null)}
                className='px-3.5 py-1.5 rounded-xl border border-[#E7E7E7] text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer'
              >
                {t('actions.cancel')}
              </button>
              <button
                type='button'
                onClick={handleSubmitReject}
                disabled={isRejecting || !rejectionReason.trim()}
                className='px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer'
              >
                {isRejecting ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  <X className='w-3.5 h-3.5' />
                )}
                <span>{t('reject.submit')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProducerPaymentsView;
