import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Check,
  QrCode,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  paymentService,
  buildVietQrImageUrl,
  toBankAccountName,
  POPULAR_VIETNAM_BANKS,
  type PaymentStatusFilter,
  type PaymentTransactionDto,
} from '@/services/payment.service';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';

const SAMPLE_ORDER_CODE = 'PF123456';
const SAMPLE_AMOUNT_VND = 10000;
const STATUS_TABS: PaymentStatusFilter[] = ['All', 'Pending', 'Approved', 'Rejected'];
const formatVnd = (amount: number) => `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;

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

interface PublisherBankSettingsViewProps {
  onShowToast?: (title: string, desc: string, variant?: 'success' | 'error') => void;
}

export const PublisherBankSettingsView: React.FC<PublisherBankSettingsViewProps> = ({
  onShowToast,
}) => {
  const { t, lang } = useTranslation('payments');
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bankForm, setBankForm] = useState<BankForm>(EMPTY_BANK_FORM);

  // Danh sách giao dịch VietQR của Studio (Đối soát & Duyệt)
  const [txLoading, setTxLoading] = useState(false);
  const [transactions, setTransactions] = useState<PaymentTransactionDto[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatusFilter>('All');
  const [seriesIdFilter, setSeriesIdFilter] = useState<string>(
    () => searchParams.get('seriesId') ?? '',
  );
  const [searchInput, setSearchInput] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [previewQrTx, setPreviewQrTx] = useState<PaymentTransactionDto | null>(null);
  const [rejectTx, setRejectTx] = useState<PaymentTransactionDto | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchTransactions = useCallback(async () => {
    if (!workspaceId || typeof paymentService.getPayments !== 'function') return;
    setTxLoading(true);
    try {
      const res = await paymentService.getPayments(workspaceId, {
        status: selectedStatus,
        seriesId: seriesIdFilter || undefined,
        search: searchInput.trim() || undefined,
        pageIndex: 1,
        pageSize: 30,
      });
      setTransactions(res?.items ?? []);
      setPendingCount(res?.summary?.pendingCount ?? 0);
    } catch {
      // Giữ nguyên danh sách nếu lỗi mạng tạm thời
    } finally {
      setTxLoading(false);
    }
  }, [workspaceId, selectedStatus, seriesIdFilter, searchInput]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  const handleApproveTx = async (tx: PaymentTransactionDto) => {
    if (!workspaceId || typeof paymentService.approvePayment !== 'function') return;
    setActionLoadingId(tx.id);
    try {
      const res = await paymentService.approvePayment(workspaceId, tx.id);
      onShowToast?.(
        t('toast.approvedTitle'),
        res?.message || t('toast.approvedDesc', { orderCode: tx.orderCode }),
        'success',
      );
      await fetchTransactions();
    } catch (err) {
      const msg = getApiErrorMessage(err) || t('toast.approveErrorDesc');
      setError(msg);
      onShowToast?.(t('toast.approveErrorTitle'), msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectTx = async () => {
    if (
      !workspaceId ||
      !rejectTx ||
      !rejectionReason.trim() ||
      typeof paymentService.rejectPayment !== 'function'
    )
      return;
    setActionLoadingId(rejectTx.id);
    try {
      const res = await paymentService.rejectPayment(
        workspaceId,
        rejectTx.id,
        rejectionReason.trim(),
      );
      onShowToast?.(
        t('toast.rejectedTitle'),
        res?.message || t('toast.rejectedDesc', { orderCode: rejectTx.orderCode }),
        'success',
      );
      setRejectTx(null);
      await fetchTransactions();
    } catch (err) {
      const msg = getApiErrorMessage(err) || t('toast.rejectErrorDesc');
      setError(msg);
      onShowToast?.(t('toast.rejectErrorTitle'), msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchBankSettings = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await paymentService.getBankSettings(workspaceId);
      if (data?.bankBin && data?.bankAccountNo) {
        setBankForm({
          bankBin: data.bankBin,
          bankName:
            data.bankName || POPULAR_VIETNAM_BANKS.find((b) => b.bin === data.bankBin)?.name || '',
          bankAccountNo: data.bankAccountNo,
          bankAccountName: data.bankAccountName || '',
        });
      } else {
        setBankForm(EMPTY_BANK_FORM);
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || t('toast.loadErrorDesc'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, t]);

  useEffect(() => {
    void fetchBankSettings();
  }, [fetchBankSettings]);

  const bankFormValid =
    bankForm.bankBin &&
    /^\d{6,19}$/.test(bankForm.bankAccountNo.trim()) &&
    bankForm.bankAccountName.trim().length >= 3;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormValid || !workspaceId || saving) return;

    setSaving(true);
    setError(null);
    setSavedSuccess(false);

    try {
      await paymentService.updateBankSettings(workspaceId, {
        bankBin: bankForm.bankBin,
        bankName: bankForm.bankName,
        bankAccountNo: bankForm.bankAccountNo.trim(),
        bankAccountName: bankForm.bankAccountName.trim(),
      });
      setSavedSuccess(true);
      onShowToast?.(
        t('toast.bankSavedTitle'),
        t('toast.bankSavedDesc', {
          accountNo: bankForm.bankAccountNo,
          bankName: bankForm.bankName,
        }),
        'success',
      );
    } catch (err) {
      const msg = getApiErrorMessage(err) || t('toast.bankErrorDesc');
      setError(msg);
      onShowToast?.(t('toast.bankErrorTitle'), msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const bankPreviewUrl =
    bankForm.bankBin && bankForm.bankAccountNo && bankForm.bankAccountNo.length >= 6
      ? buildVietQrImageUrl({
          bankBin: bankForm.bankBin,
          bankAccountNo: bankForm.bankAccountNo,
          amount: SAMPLE_AMOUNT_VND,
          addInfo: SAMPLE_ORDER_CODE,
          accountName: bankForm.bankAccountName.trim() || 'STUDIO',
        })
      : '';

  return (
    <div className='p-6 max-w-4xl mx-auto space-y-6'>
      {/* ─── Header ─── */}
      <div className='pb-4 border-b border-[#E7E7E7] space-y-2'>
        <Link
          to='/publisher/revenue'
          className='inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#171717] font-medium transition-colors'
        >
          <ArrowLeft className='w-3.5 h-3.5' />
          {t('revenue.back')}
        </Link>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-xl bg-[#F97316]/10 text-[#F97316]'>
            <Building2 className='w-6 h-6' />
          </div>
          <div>
            <h1 className='text-xl font-bold text-[#171717] tracking-tight'>
              {t('bank.modalTitle')}
            </h1>
            <p className='text-xs text-[#737373] mt-0.5'>{t('bank.modalSubtitle')}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className='flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm'>
          <AlertTriangle className='w-4 h-4 shrink-0' />
          <span>{error}</span>
        </div>
      )}

      {savedSuccess && (
        <div className='flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm'>
          <Check className='w-4 h-4 text-emerald-600 shrink-0' />
          <span>
            {t('toast.bankSavedDesc', {
              accountNo: bankForm.bankAccountNo,
              bankName: bankForm.bankName,
            })}
          </span>
        </div>
      )}

      {loading ? (
        <div className='flex justify-center py-16 text-[#737373]'>
          <Loader2 className='w-5 h-5 animate-spin' />
        </div>
      ) : (
        <form onSubmit={handleSave} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Cột 1: Thông tin ngân hàng */}
            <div className='p-5 rounded-2xl bg-white border border-[#E7E7E7] space-y-4 shadow-xs'>
              <h2 className='text-sm font-bold text-[#171717] flex items-center gap-2'>
                <Building2 className='w-4 h-4 text-[#F97316]' />
                <span>{t('publisher.bank.accountInfo')}</span>
              </h2>

              {/* Ngân hàng */}
              <div>
                <label
                  htmlFor='pf-pub-bank-bin'
                  className='block text-xs font-semibold text-[#555555] mb-1.5'
                >
                  {t('bank.bankLabel')} *
                </label>
                <select
                  id='pf-pub-bank-bin'
                  value={bankForm.bankBin}
                  onChange={(e) => {
                    const found = POPULAR_VIETNAM_BANKS.find((b) => b.bin === e.target.value);
                    setBankForm((prev) => ({
                      ...prev,
                      bankBin: e.target.value,
                      bankName: found ? found.name : prev.bankName,
                    }));
                  }}
                  className='w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-sm bg-white focus:outline-none focus:border-[#F97316]'
                >
                  {!POPULAR_VIETNAM_BANKS.some((b) => b.bin === bankForm.bankBin) && (
                    <option value={bankForm.bankBin}>
                      {bankForm.bankName || bankForm.bankBin} ({bankForm.bankBin})
                    </option>
                  )}
                  {POPULAR_VIETNAM_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Số tài khoản */}
              <div>
                <label
                  htmlFor='pf-pub-bank-no'
                  className='block text-xs font-semibold text-[#555555] mb-1.5'
                >
                  {t('bank.accountNoLabel')} *
                </label>
                <input
                  id='pf-pub-bank-no'
                  type='text'
                  inputMode='numeric'
                  placeholder='0123456789'
                  value={bankForm.bankAccountNo}
                  onChange={(e) =>
                    setBankForm((prev) => ({
                      ...prev,
                      bankAccountNo: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  className='w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-sm font-mono tracking-wider focus:outline-none focus:border-[#F97316]'
                  required
                />
                {bankForm.bankAccountNo && !/^\d{6,19}$/.test(bankForm.bankAccountNo) && (
                  <p className='text-xs text-rose-600 mt-1'>{t('bank.accountNoInvalid')}</p>
                )}
              </div>

              {/* Tên chủ tài khoản */}
              <div>
                <label
                  htmlFor='pf-pub-bank-name'
                  className='block text-xs font-semibold text-[#555555] mb-1.5'
                >
                  {t('bank.accountNameLabel')} *
                </label>
                <input
                  id='pf-pub-bank-name'
                  type='text'
                  placeholder='NGUYEN VAN A'
                  value={bankForm.bankAccountName}
                  onChange={(e) =>
                    setBankForm((prev) => ({
                      ...prev,
                      bankAccountName: toBankAccountName(e.target.value),
                    }))
                  }
                  className='w-full px-3 py-2 rounded-xl border border-[#E7E7E7] text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-[#F97316]'
                  required
                />
                <p className='text-xs text-stone-500 mt-1'>{t('bank.accountNameHint')}</p>
              </div>
            </div>

            {/* Cột 2: Xem trước mã VietQR */}
            <div className='p-5 rounded-2xl bg-white border border-[#E7E7E7] space-y-3 shadow-xs flex flex-col items-center justify-center text-center'>
              <h2 className='text-sm font-bold text-[#171717] flex items-center gap-2 mb-2'>
                <QrCode className='w-4 h-4 text-[#F97316]' />
                <span>{t('bank.previewTitle')}</span>
              </h2>

              {bankPreviewUrl ? (
                <div className='p-3 rounded-2xl bg-[#FAF8F5] border border-[#E7E7E7] inline-block shadow-2xs'>
                  <img
                    src={bankPreviewUrl}
                    alt={t('bank.previewTitle')}
                    className='w-56 h-auto mx-auto rounded-lg'
                  />
                </div>
              ) : (
                <div className='w-56 h-56 rounded-2xl border-2 border-dashed border-[#E7E7E7] flex flex-col items-center justify-center text-xs text-[#A3A3A3] p-4 gap-2'>
                  <QrCode className='w-8 h-8 text-[#D4D4D4]' />
                  <span>{t('bank.previewEmpty')}</span>
                </div>
              )}

              <div className='text-xs text-[#555555] font-mono'>
                <div className='font-bold text-[#171717]'>
                  {bankForm.bankName} • {bankForm.bankAccountNo || '---'}
                </div>
                <div className='text-[#737373]'>{bankForm.bankAccountName || '---'}</div>
              </div>
              <p className='text-xs text-[#A3A3A3]'>
                {t('bank.previewSample', {
                  amount: `${SAMPLE_AMOUNT_VND.toLocaleString('vi-VN')} ₫`,
                  code: SAMPLE_ORDER_CODE,
                })}
              </p>
            </div>
          </div>

          <div className='flex items-center justify-end gap-3 pt-3'>
            <button
              type='button'
              onClick={() => navigate('/publisher/revenue')}
              className='px-4 py-2 rounded-xl border border-[#E7E7E7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#555555] transition-colors cursor-pointer'
            >
              {t('actions.cancel')}
            </button>
            <button
              type='submit'
              disabled={saving || !bankFormValid}
              className='inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 active:scale-98'
            >
              {saving ? (
                <>
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                  <span>{t('refreshing')}</span>
                </>
              ) : (
                <>
                  <Check className='w-3.5 h-3.5' />
                  <span>{t('bank.save')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ─── Danh sách Giao dịch & Đối soát VietQR ─── */}
      {typeof paymentService.getPayments === 'function' && (
        <div className='pt-6 border-t border-[#E7E7E7] space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex items-center gap-2.5'>
              <div className='p-2 rounded-xl bg-[#F97316]/10 text-[#F97316]'>
                <CreditCard className='w-5 h-5' />
              </div>
              <div>
                <h2 className='text-base font-bold text-[#171717] flex items-center gap-2'>
                  <span>{t('insights.transactions')}</span>
                  {pendingCount > 0 && (
                    <span className='px-2 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold'>
                      {pendingCount} {t('status.pending')}
                    </span>
                  )}
                </h2>
                <p className='text-xs text-[#737373]'>{t('subtitle')}</p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              {seriesIdFilter && (
                <button
                  type='button'
                  onClick={() => {
                    setSeriesIdFilter('');
                    searchParams.delete('seriesId');
                    setSearchParams(searchParams, { replace: true });
                  }}
                  className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer'
                >
                  <span>{t('publisher.bank.filteredBySeriesClear')}</span>
                  <X className='w-3.5 h-3.5' />
                </button>
              )}
              <button
                type='button'
                onClick={() => void fetchTransactions()}
                disabled={txLoading}
                className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E7E7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#555555] cursor-pointer disabled:opacity-50'
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${txLoading ? 'animate-spin text-[#F97316]' : ''}`}
                />
                <span>{t('refresh')}</span>
              </button>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E7E7E7]'>
            <div className='flex flex-wrap items-center gap-1.5'>
              {STATUS_TABS.map((tab) => {
                const active = selectedStatus === tab;
                const labelMap: Record<PaymentStatusFilter, string> = {
                  All: t('status.all'),
                  Pending: t('status.pending'),
                  Approved: t('status.approved'),
                  Rejected: t('status.rejected'),
                };
                return (
                  <button
                    key={tab}
                    type='button'
                    onClick={() => setSelectedStatus(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#171717] text-white'
                        : 'text-[#737373] hover:text-[#171717] hover:bg-[#FAF8F4]'
                    }`}
                  >
                    {labelMap[tab]}
                  </button>
                );
              })}
            </div>

            <div className='relative w-64'>
              <Search className='w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                type='text'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('filters.searchPlaceholder')}
                aria-label={t('filters.searchPlaceholder')}
                className='w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#E7E7E7] text-xs focus:outline-none focus:border-[#F97316]'
              />
            </div>
          </div>

          <div className='rounded-2xl border border-[#E7E7E7] bg-white overflow-x-auto'>
            <table className='w-full text-left text-xs min-w-[760px]'>
              <thead className='bg-[#FAF8F4] text-[#737373] border-b border-[#E7E7E7]'>
                <tr>
                  <th className='px-4 py-2.5 font-medium'>{t('table.orderCode')}</th>
                  <th className='px-4 py-2.5 font-medium'>{t('table.reader')}</th>
                  <th className='px-4 py-2.5 font-medium'>{t('table.content')}</th>
                  <th className='px-4 py-2.5 font-medium text-right'>{t('table.amount')}</th>
                  <th className='px-4 py-2.5 font-medium'>{t('table.createdAt')}</th>
                  <th className='px-4 py-2.5 font-medium'>{t('table.status')}</th>
                  <th className='px-4 py-2.5 font-medium text-right'>{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-[#F0F0F0]'>
                {txLoading ? (
                  <tr>
                    <td colSpan={7} className='py-10 text-center text-[#737373]'>
                      <Loader2 className='w-5 h-5 animate-spin mx-auto' />
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='py-10 text-center text-[#737373]'>
                      {t('table.emptyTitle')}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const busy = actionLoadingId === tx.id;
                    const typeName =
                      tx.type === 'Topup'
                        ? t('type.topup')
                        : tx.type === 'VipSubscription'
                          ? t('type.vipSubscription')
                          : t('type.chapterUnlock');
                    return (
                      <tr key={tx.id} className='hover:bg-[#FAF8F4]'>
                        <td className='px-4 py-3 font-mono font-bold text-[#171717]'>
                          <div className='inline-flex items-center gap-1.5'>
                            <span>{tx.orderCode}</span>
                            {tx.qrImageUrl && (
                              <button
                                type='button'
                                onClick={() => setPreviewQrTx(tx)}
                                title={t('actions.viewQr')}
                                aria-label={t('actions.viewQr')}
                                className='p-1 rounded hover:bg-[#F97316]/10 text-[#737373] hover:text-[#F97316] cursor-pointer'
                              >
                                <QrCode className='w-3.5 h-3.5' />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='font-semibold text-[#171717]'>
                            {tx.readerName || t('table.unknownReader')}
                          </div>
                          <div className='text-[11px] text-[#737373]'>{tx.readerEmail || '—'}</div>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='font-medium text-[#171717]'>{typeName}</div>
                          <div className='text-[11px] text-[#737373]'>
                            {tx.seriesTitle
                              ? `${tx.seriesTitle}${tx.chapterNumber != null ? ` · Ch. ${tx.chapterNumber}` : ''}`
                              : tx.type === 'Topup'
                                ? t('detail.topup')
                                : tx.type === 'VipSubscription'
                                  ? t('detail.vipSubscription')
                                  : '—'}
                          </div>
                        </td>
                        <td className='px-4 py-3 text-right font-mono font-bold text-[#171717]'>
                          {formatVnd(tx.amountVnd)}
                        </td>
                        <td className='px-4 py-3 font-mono text-[11px] text-[#737373]'>
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleString(
                                lang === 'en' ? 'en-US' : 'vi-VN',
                              )
                            : '—'}
                        </td>
                        <td className='px-4 py-3'>
                          {tx.status === 'Pending' ? (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold'>
                              <Clock className='w-3 h-3' />
                              {t('status.pending')}
                            </span>
                          ) : tx.status === 'Approved' ? (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'>
                              <CheckCircle2 className='w-3 h-3' />
                              {t('status.approved')}
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold'>
                              <XCircle className='w-3 h-3' />
                              {tx.status === 'Rejected'
                                ? t('status.rejected')
                                : t('status.expired')}
                            </span>
                          )}
                        </td>
                        <td className='px-4 py-3 text-right'>
                          {tx.status === 'Pending' ? (
                            <div className='inline-flex items-center gap-1.5'>
                              <button
                                type='button'
                                disabled={busy}
                                onClick={() => void handleApproveTx(tx)}
                                className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer disabled:opacity-50'
                              >
                                {busy ? (
                                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                                ) : (
                                  <Check className='w-3.5 h-3.5' />
                                )}
                                <span>{t('actions.approve')}</span>
                              </button>
                              <button
                                type='button'
                                disabled={busy}
                                onClick={() => {
                                  setRejectTx(tx);
                                  setRejectionReason(t('reject.defaultReason'));
                                }}
                                className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-medium cursor-pointer disabled:opacity-50'
                              >
                                <X className='w-3.5 h-3.5' />
                                <span>{t('actions.reject')}</span>
                              </button>
                            </div>
                          ) : (
                            <span className='text-[#A3A3A3]'>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal xem mã QR giao dịch */}
      {previewQrTx && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] max-w-sm w-full p-5 space-y-4 text-center shadow-xl'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-2'>
              <span className='font-bold text-sm text-[#171717]'>
                {t('qrModal.title', { orderCode: previewQrTx.orderCode })}
              </span>
              <button
                type='button'
                onClick={() => setPreviewQrTx(null)}
                aria-label={t('actions.close')}
                className='text-[#737373] hover:text-[#171717] cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <img
              src={previewQrTx.qrImageUrl}
              alt={`VietQR ${previewQrTx.orderCode}`}
              className='w-56 h-56 object-contain mx-auto rounded-xl border border-[#E7E7E7] p-2'
            />
            <div className='text-xs space-y-1 text-left bg-[#FAF8F4] p-3 rounded-xl border border-[#E7E7E7]'>
              <div className='flex justify-between'>
                <span className='text-[#737373]'>{t('qrModal.amount')}</span>
                <span className='font-mono font-bold text-emerald-700'>
                  {formatVnd(previewQrTx.amountVnd)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-[#737373]'>{t('qrModal.transferContent')}</span>
                <span className='font-mono font-bold text-[#F97316]'>{previewQrTx.orderCode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal từ chối giao dịch */}
      {rejectTx && (
        <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#E7E7E7] max-w-md w-full p-5 space-y-4 shadow-xl'>
            <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-2'>
              <span className='font-bold text-sm text-rose-600'>
                {t('reject.title', { orderCode: rejectTx.orderCode })}
              </span>
              <button
                type='button'
                onClick={() => setRejectTx(null)}
                aria-label={t('actions.close')}
                className='text-[#737373] hover:text-[#171717] cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <p className='text-xs text-[#555555]'>{t('reject.description')}</p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('reject.placeholder')}
              aria-label={t('reject.placeholder')}
              className='w-full p-3 rounded-xl border border-[#E7E7E7] text-xs focus:outline-none focus:border-rose-500'
            />
            <div className='flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setRejectTx(null)}
                className='px-3 py-1.5 rounded-xl border border-[#E7E7E7] text-xs font-semibold text-[#555555] cursor-pointer'
              >
                {t('actions.cancel')}
              </button>
              <button
                type='button'
                disabled={!rejectionReason.trim() || actionLoadingId === rejectTx.id}
                onClick={() => void handleRejectTx()}
                className='px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50'
              >
                {t('reject.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherBankSettingsView;
