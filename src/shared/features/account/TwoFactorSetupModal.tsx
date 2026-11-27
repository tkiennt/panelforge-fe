import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  Smartphone,
  KeyRound,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '@/services/auth.service';
import { Alert, Button, Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  twoFactorEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
  token?: string;
  onSuccess?: () => void;
  /** Gọi khi người dùng đóng modal sau khi đã tắt 2FA thành công */
  onDisabled?: () => void;
}

type Step = 'status' | 'loading' | 'setup' | 'success' | 'error' | 'disabled';

const SETUP_FORM_ID = 'pf-2fa-setup-form';
const DISABLE_FORM_ID = 'pf-2fa-disable-form';

const otpInputClass =
  'w-full rounded-xl border border-stone-300 bg-white py-3 text-center font-mono font-bold tracking-[0.5em] text-stone-900 outline-none placeholder:text-stone-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:ring-rose-100';

/** Chỉ giữ chữ số, tối đa 6 (dán "123 456" hay "123-456" vẫn được). */
const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 6);

const StepBadge: React.FC<{ n: number }> = ({ n }) => (
  <span
    aria-hidden='true'
    className='grid size-6 shrink-0 place-items-center rounded-full bg-stone-900 font-mono text-xs font-bold text-white'
  >
    {n}
  </span>
);

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  twoFactorEnabled,
  isTwoFactorEnabled,
  token,
  onSuccess,
  onDisabled,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('loading');
  const [qrUri, setQrUri] = useState('');
  const [backupKey, setBackupKey] = useState('');
  const [formattedKey, setFormattedKey] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const justDisabledRef = useRef(false);
  const wasOpenRef = useRef(false);

  // Token chỉ dùng cho chế độ demo 'mock-...'; phiên thật nằm ở cookie HttpOnly
  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

  const is2faActive = Boolean(twoFactorEnabled ?? isTwoFactorEnabled);

  const loadTwoFactorData = useCallback(async () => {
    setStep('loading');
    setErrorMessage(null);
    setCode('');

    try {
      if (activeToken.startsWith('mock-')) {
        // Dữ liệu giả khi chạy demo offline, không có phiên thật
        const mockKey = 'JBSWY3DPEHPK3PXP';
        setBackupKey(mockKey);
        setFormattedKey('JBSW Y3DP EHPK 3PXP');
        setQrUri(
          `otpauth://totp/PanelForge:studio-artist?secret=${mockKey}&issuer=PanelForge&digits=6&period=30`,
        );
        setStep('setup');
        return;
      }

      const data = await authService.enableTwoFactor(activeToken || undefined);
      setBackupKey(data.sharedKey);
      setFormattedKey(data.formattedKey || data.sharedKey);
      setQrUri(data.authenticatorUri);
      setStep('setup');
    } catch (err: any) {
      setErrorMessage(err.message || t('profile.twoFactorModal.initError'));
      setStep('error');
    }
  }, [activeToken, t]);

  // Chỉ khởi tạo khi modal vừa MỞ. Không chạy lại khi cha đổi trạng thái 2FA lúc modal còn mở
  // (vd. onSuccess bật cờ 2FA → trước đây nhảy sang màn "trạng thái", mất màn "thành công").
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      justDisabledRef.current = false;
      setShowDisableForm(false);
      setDisableCode('');
      setDisablePassword('');
      setStatusMessage(null);
      setErrorMessage(null);
      setCopied(false);
      if (is2faActive) {
        setStep('status');
      } else {
        void loadTwoFactorData();
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, is2faActive, loadTwoFactorData]);

  const handleCopyKey = async () => {
    if (!backupKey) return;
    try {
      await navigator.clipboard.writeText(backupKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard: khoá vẫn hiển thị và chọn được để chép tay
    }
  };

  const handleForgetCurrentDevice = async () => {
    try {
      await authService.forgetDevice();
      localStorage.removeItem('pf_remember_device');
      setStatusMessage(t('profile.twoFactorModal.forgetSuccess'));
    } catch (err: any) {
      setStatusMessage(
        t('profile.twoFactorModal.forgetErrorPrefix') +
          (err.message || t('profile.twoFactorModal.unknownError')),
      );
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMessage(t('profile.twoFactorModal.otpLengthError'));
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      if (!activeToken.startsWith('mock-')) {
        await authService.verifyTwoFactor({ code }, activeToken || undefined);
      }
      setStep('success');
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(err.message || t('profile.twoFactorModal.verifyError'));
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disableCode.length !== 6) {
      setErrorMessage(t('profile.twoFactorModal.otpLengthError'));
      return;
    }
    setIsDisabling(true);
    setErrorMessage(null);
    try {
      if (!activeToken.startsWith('mock-')) {
        await authService.disableTwoFactor({
          code: disableCode,
          currentPassword: disablePassword || undefined,
        });
      }
      justDisabledRef.current = true;
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          parsed.isTwoFactorEnabled = false;
          parsed.twoFactorEnabled = false;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      } catch {
        // bỏ qua
      }
      localStorage.removeItem('pf_remember_device');
      setDisableCode('');
      setDisablePassword('');
      setShowDisableForm(false);
      setStep('disabled');
    } catch (err: any) {
      setErrorMessage(err.message || t('profile.twoFactorModal.disableError'));
      setDisableCode('');
    } finally {
      setIsDisabling(false);
    }
  };

  // Đóng sau khi tắt 2FA: báo cho component cha cập nhật trạng thái
  const handleClose = () => {
    if (justDisabledRef.current) {
      justDisabledRef.current = false;
      onDisabled?.();
    }
    onClose();
  };

  if (!isOpen) return null;

  const errorAlert = errorMessage ? (
    <Alert tone='danger' role='alert' className='text-xs'>
      {errorMessage}
    </Alert>
  ) : null;

  const footer = (() => {
    switch (step) {
      case 'setup':
        return (
          <>
            <Button variant='ghost' size='sm' onClick={handleClose} disabled={isVerifying}>
              {t('profile.twoFactorModal.cancelFull')}
            </Button>
            <Button
              type='submit'
              form={SETUP_FORM_ID}
              variant='primary'
              size='sm'
              disabled={isVerifying || code.length !== 6}
              leadingIcon={isVerifying ? <RefreshCw className='animate-spin' /> : undefined}
            >
              {isVerifying
                ? t('profile.twoFactorModal.verifying')
                : t('profile.twoFactorModal.confirmEnable')}
            </Button>
          </>
        );
      case 'status':
        return showDisableForm ? (
          <>
            <Button
              variant='ghost'
              size='sm'
              disabled={isDisabling}
              onClick={() => {
                setShowDisableForm(false);
                setErrorMessage(null);
              }}
            >
              {t('profile.twoFactorModal.cancel')}
            </Button>
            <Button
              type='submit'
              form={DISABLE_FORM_ID}
              variant='danger'
              size='sm'
              disabled={isDisabling || disableCode.length !== 6}
              leadingIcon={isDisabling ? <RefreshCw className='animate-spin' /> : undefined}
            >
              {isDisabling
                ? t('profile.twoFactorModal.disabling')
                : t('profile.twoFactorModal.confirmDisable')}
            </Button>
          </>
        ) : (
          <div className='flex w-full flex-wrap items-center justify-between gap-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleForgetCurrentDevice}
                leadingIcon={<Trash2 />}
              >
                {t('profile.twoFactorModal.forgetDeviceBtn')}
              </Button>
              <Button
                variant='danger'
                size='sm'
                leadingIcon={<ShieldOff />}
                onClick={() => {
                  setErrorMessage(null);
                  setShowDisableForm(true);
                }}
              >
                {t('profile.twoFactorModal.disableBtn')}
              </Button>
            </div>
            <Button variant='secondary' size='sm' onClick={handleClose}>
              {t('profile.twoFactorModal.close')}
            </Button>
          </div>
        );
      case 'success':
        return (
          <Button variant='primary' size='sm' onClick={handleClose}>
            {t('profile.twoFactorModal.doneAndClose')}
          </Button>
        );
      case 'disabled':
        return (
          <Button variant='secondary' size='sm' onClick={handleClose}>
            {t('profile.twoFactorModal.close')}
          </Button>
        );
      default:
        return undefined;
    }
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeLabel={t('profile.twoFactorModal.close')}
      size='md'
      title={
        <span className='flex items-center gap-2'>
          <ShieldCheck className='size-5 text-orange-600' aria-hidden='true' />
          {t('profile.twoFactorModal.heading')}
        </span>
      }
      description={t('profile.twoFactorModal.subheading')}
      footer={footer}
    >
      {/* Đã bật 2FA: trạng thái + tắt 2FA */}
      {step === 'status' && (
        <div className='space-y-4'>
          <Alert tone='success' title={t('profile.twoFactorModal.activeTitle')}>
            {t('profile.twoFactorModal.activeDesc')}
          </Alert>

          {statusMessage && (
            <Alert tone='info' role='status' className='text-xs'>
              {statusMessage}
            </Alert>
          )}

          <dl className='divide-y divide-stone-200 rounded-xl border border-stone-200 bg-stone-50 px-4 text-xs'>
            <div className='flex items-center justify-between gap-3 py-2.5'>
              <dt className='font-medium text-stone-900'>
                {t('profile.twoFactorModal.securityStatusLabel')}
              </dt>
              <dd className='inline-flex items-center gap-1.5 font-semibold text-emerald-700'>
                <span aria-hidden='true' className='size-2 rounded-full bg-emerald-500' />
                {t('profile.twoFactorModal.securityStatusActive')}
              </dd>
            </div>
            <div className='flex items-center justify-between gap-3 py-2.5'>
              <dt className='font-medium text-stone-900'>
                {t('profile.twoFactorModal.trustedDeviceLabel')}
              </dt>
              <dd className='text-stone-700'>{t('profile.twoFactorModal.trustedDeviceValue')}</dd>
            </div>
            <div className='flex items-center justify-between gap-3 py-2.5'>
              <dt className='font-medium text-stone-900'>
                {t('profile.twoFactorModal.supportedAppsLabel')}
              </dt>
              <dd className='text-stone-700'>Google / Microsoft Authenticator</dd>
            </div>
          </dl>

          {showDisableForm && (
            <form
              id={DISABLE_FORM_ID}
              onSubmit={handleDisable}
              className='space-y-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4'
            >
              <h3 className='flex items-center gap-1.5 text-sm font-bold text-rose-800'>
                <ShieldOff className='size-4' aria-hidden='true' />
                {t('profile.twoFactorModal.disableHeading')}
              </h3>
              {errorAlert}
              <div className='space-y-1.5'>
                <label
                  htmlFor='pf-2fa-disable-password'
                  className='block text-xs font-semibold text-stone-800'
                >
                  {t('profile.twoFactorModal.currentPasswordLabel')}{' '}
                  <span className='font-normal text-stone-500'>
                    {t('profile.twoFactorModal.socialLoginHint')}
                  </span>
                </label>
                <input
                  id='pf-2fa-disable-password'
                  type='password'
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  autoComplete='current-password'
                  className='w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100'
                />
              </div>
              <div className='space-y-1.5'>
                <label
                  htmlFor='pf-2fa-disable-code'
                  className='block text-xs font-semibold text-stone-800'
                >
                  {t('profile.twoFactorModal.currentOtpLabel')}
                </label>
                <input
                  id='pf-2fa-disable-code'
                  type='text'
                  inputMode='numeric'
                  autoComplete='one-time-code'
                  pattern='[0-9]{6}'
                  value={disableCode}
                  onChange={(e) => setDisableCode(onlyDigits(e.target.value))}
                  placeholder='000000'
                  aria-invalid={Boolean(errorMessage) || undefined}
                  className={`${otpInputClass} text-xl`}
                />
              </div>
            </form>
          )}
        </div>
      )}

      {step === 'loading' && (
        <div
          role='status'
          className='flex flex-col items-center justify-center gap-3 py-12 text-stone-600'
        >
          <RefreshCw className='size-8 animate-spin text-orange-600' aria-hidden='true' />
          <p className='text-xs font-medium'>{t('profile.twoFactorModal.loadingKey')}</p>
        </div>
      )}

      {step === 'error' && (
        <div className='space-y-4 py-4 text-center'>
          <Alert tone='danger' title={t('profile.twoFactorModal.errorTitle')} className='text-left'>
            {errorMessage}
          </Alert>
          <Button
            variant='secondary'
            size='sm'
            leadingIcon={<RefreshCw />}
            onClick={() => void loadTwoFactorData()}
          >
            {t('profile.twoFactorModal.retry')}
          </Button>
        </div>
      )}

      {/* Thiết lập: quét QR rồi nhập mã */}
      {step === 'setup' && (
        <div className='space-y-5'>
          <section aria-labelledby='pf-2fa-step1' className='space-y-3'>
            <h3
              id='pf-2fa-step1'
              className='flex items-center gap-2 text-sm font-bold text-stone-900'
            >
              <StepBadge n={1} />
              <Smartphone className='size-4 text-orange-600' aria-hidden='true' />
              {t('profile.twoFactorModal.step1Title')}
            </h3>
            <div className='flex flex-col items-center gap-5 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-start'>
              <div className='shrink-0 rounded-xl border border-stone-200 bg-white p-3'>
                {qrUri ? (
                  <QRCodeSVG
                    value={qrUri}
                    size={148}
                    level='M'
                    title={t('profile.twoFactorModal.qrPlaceholder')}
                  />
                ) : (
                  <div className='grid size-[148px] place-items-center bg-stone-100 text-xs text-stone-400'>
                    {t('profile.twoFactorModal.qrPlaceholder')}
                  </div>
                )}
              </div>

              <div className='min-w-0 flex-1 space-y-3 text-xs leading-relaxed text-stone-600'>
                <p>
                  {t('profile.twoFactorModal.step1GuidePrefix')}{' '}
                  <strong className='text-stone-900'>Google Authenticator</strong>{' '}
                  {t('profile.twoFactorModal.step1GuideOr')}{' '}
                  <strong className='text-stone-900'>Microsoft Authenticator</strong>{' '}
                  {t('profile.twoFactorModal.step1GuideMiddle')}{' '}
                  <strong className='text-stone-900'>+</strong>{' '}
                  {t('profile.twoFactorModal.step1GuideAndSelect')}{' '}
                  <strong className='text-stone-900'>
                    {t('profile.twoFactorModal.step1GuideScanQr')}
                  </strong>
                  .
                </p>
                <div className='space-y-1.5 border-t border-stone-200 pt-3'>
                  <p className='flex items-center gap-1 font-semibold text-stone-900'>
                    <KeyRound className='size-3.5 text-stone-500' aria-hidden='true' />
                    {t('profile.twoFactorModal.backupKeyLabel')}
                  </p>
                  <div className='flex items-start gap-2'>
                    {/* Nhóm 4 ký tự, chỉ xuống dòng giữa các nhóm (không cắt đôi một nhóm) */}
                    <code className='min-w-0 flex-1 select-all rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold leading-6 tracking-wider text-stone-900'>
                      {formattedKey || backupKey}
                    </code>
                    <button
                      type='button'
                      onClick={() => void handleCopyKey()}
                      aria-label={t('profile.twoFactorModal.copyKeyTitle')}
                      title={t('profile.twoFactorModal.copyKeyTitle')}
                      className='grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500'
                    >
                      {copied ? (
                        <Check className='size-4 text-emerald-600' aria-hidden='true' />
                      ) : (
                        <Copy className='size-4' aria-hidden='true' />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <form id={SETUP_FORM_ID} onSubmit={handleVerify} className='space-y-2'>
            <h3 className='flex items-center gap-2 text-sm font-bold text-stone-900'>
              <StepBadge n={2} />
              <label htmlFor='pf-2fa-setup-code'>{t('profile.twoFactorModal.step2Title')}</label>
            </h3>
            {errorAlert}
            <input
              id='pf-2fa-setup-code'
              type='text'
              inputMode='numeric'
              autoComplete='one-time-code'
              pattern='[0-9]{6}'
              value={code}
              onChange={(e) => {
                setCode(onlyDigits(e.target.value));
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder='000000'
              aria-describedby='pf-2fa-setup-hint'
              aria-invalid={Boolean(errorMessage) || undefined}
              className={`${otpInputClass} text-2xl`}
              autoFocus
            />
            <p id='pf-2fa-setup-hint' className='text-center text-xs text-stone-500'>
              {t('profile.twoFactorModal.otpRefreshHint')}
            </p>
          </form>
        </div>
      )}

      {step === 'disabled' && (
        <div className='space-y-3 py-6 text-center'>
          <div className='mx-auto grid size-14 place-items-center rounded-2xl border border-stone-200 bg-stone-50 text-stone-600'>
            <ShieldOff className='size-8' aria-hidden='true' />
          </div>
          <h3 className='font-serif text-xl font-bold text-stone-900'>
            {t('profile.twoFactorModal.disabledTitle')}
          </h3>
          <p className='mx-auto max-w-md text-xs leading-relaxed text-stone-600'>
            {t('profile.twoFactorModal.disabledDesc')}
          </p>
        </div>
      )}

      {step === 'success' && (
        <div className='space-y-4 py-6 text-center'>
          <div className='mx-auto grid size-14 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600'>
            <ShieldCheck className='size-8' aria-hidden='true' />
          </div>
          <div>
            <h3 className='font-serif text-xl font-bold text-stone-900'>
              {t('profile.twoFactorModal.successTitle')}
            </h3>
            <p className='mx-auto mt-2 max-w-md text-xs leading-relaxed text-stone-600'>
              {t('profile.twoFactorModal.successDesc')}
            </p>
          </div>
          <p className='mx-auto inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600'>
            <Check className='size-4 shrink-0 text-emerald-600' aria-hidden='true' />
            {t('profile.twoFactorModal.protectionStatusLabel')}{' '}
            <strong className='text-stone-900'>
              {t('profile.twoFactorModal.protectionStatusActive')}
            </strong>
          </p>
        </div>
      )}
    </Modal>
  );
};
