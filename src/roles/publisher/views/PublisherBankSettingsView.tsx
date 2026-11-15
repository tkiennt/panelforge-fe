import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Loader2, AlertTriangle, Check, QrCode } from 'lucide-react';
import {
  paymentService,
  buildVietQrImageUrl,
  toBankAccountName,
  POPULAR_VIETNAM_BANKS,
  type WorkspaceBankSettingsDto,
} from '@/services/payment.service';
import { useTranslation } from '@/lib/i18n';
import { getApiErrorMessage } from '@/lib/api-error';

const SAMPLE_ORDER_CODE = 'PF123456';
const SAMPLE_AMOUNT_VND = 10000;

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
  const { t } = useTranslation('payments');
  const { workspaceId = '' } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [bankForm, setBankForm] = useState<BankForm>(EMPTY_BANK_FORM);

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
                <span>Thông tin tài khoản</span>
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
    </div>
  );
};

export default PublisherBankSettingsView;
