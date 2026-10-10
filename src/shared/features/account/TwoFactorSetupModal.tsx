import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  Smartphone,
  Key,
  AlertCircle,
  RefreshCw,
  Lock,
  Trash2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '@/services/auth.service';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  twoFactorEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
  token?: string;
  onSuccess?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  twoFactorEnabled,
  isTwoFactorEnabled,
  token,
  onSuccess,
}) => {
  const [step, setStep] = useState<'status' | 'loading' | 'setup' | 'success' | 'error'>('loading');
  const [qrUri, setQrUri] = useState('');
  const [backupKey, setBackupKey] = useState('');
  const [formattedKey, setFormattedKey] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Lay token tu props hoac localStorage
  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

  // Kiem tra trang thai da kich hoat 2FA hay chua
  const is2faActive = Boolean(
    twoFactorEnabled ??
    isTwoFactorEnabled ??
    (() => {
      try {
        const savedUser = localStorage.getItem('user');
        return savedUser ? Boolean(JSON.parse(savedUser).isTwoFactorEnabled) : false;
      } catch {
        return false;
      }
    })(),
  );

  const loadTwoFactorData = useCallback(async () => {
    setStep('loading');
    setErrorMessage(null);
    setCode('');

    try {
      if (activeToken.startsWith('mock-')) {
        // Mock data neu chay demo offline khong co JWT that
        setTimeout(() => {
          const mockKey = 'JBSWY3DPEHPK3PXP';
          setBackupKey(mockKey);
          setFormattedKey('JBSW Y3DP EHPK 3PXP');
          setQrUri(
            `otpauth://totp/PanelForge:studio-artist?secret=${mockKey}&issuer=PanelForge&digits=6&period=30`,
          );
          setStep('setup');
        }, 500);
        return;
      }

      const data = await authService.enableTwoFactor(activeToken || undefined);
      setBackupKey(data.sharedKey);
      setFormattedKey(data.formattedKey || data.sharedKey);
      setQrUri(data.authenticatorUri);
      setStep('setup');
    } catch (err: any) {
      console.error('Lỗi khởi tạo 2FA:', err);
      setErrorMessage(err.message || 'Không thể liên lạc với server để tạo mã 2FA');
      setStep('error');
    }
  }, [activeToken]);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setErrorMessage(null);
      if (is2faActive) {
        setStep('status');
      } else {
        loadTwoFactorData();
      }
    }
  }, [isOpen, is2faActive, loadTwoFactorData]);

  const handleCopyKey = () => {
    if (!backupKey) return;
    navigator.clipboard.writeText(backupKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleForgetCurrentDevice = async () => {
    try {
      await authService.forgetDevice();
      localStorage.removeItem('pf_remember_device');
      setStatusMessage(
        'Đã xóa thiết bị tin cậy khỏi máy này. Lần đăng nhập tới hệ thống sẽ yêu cầu nhập mã 2FA.',
      );
    } catch (err: any) {
      setStatusMessage('Không thể xóa thiết bị: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số OTP');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      if (activeToken.startsWith('mock-')) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setStep('success');
        if (onSuccess) onSuccess();
        return;
      }

      await authService.verifyTwoFactor({ code: code.trim() }, activeToken || undefined);
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Lỗi xác thực 2FA:', err);
      setErrorMessage(err.message || 'Mã xác thực 2FA không đúng hoặc đã hết hạn. Hãy thử lại.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/60 backdrop-blur-md p-4'>
      <div className='w-[540px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-[#E7E7E7] overflow-hidden relative animate-in zoom-in-95 duration-200'>
        {/* Top Accent Stripe */}
        <div className='h-1.5 w-full bg-gradient-to-r from-[#F97316] to-[#E11D48]'></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-20 text-[#555555] hover:text-[#171717] bg-[#FAF8F5] hover:bg-[#E7E7E7] rounded-full p-1.5 transition-colors cursor-pointer'
          title='Đóng'
        >
          <X className='w-4 h-4' />
        </button>

        <div className='p-6 md:p-8'>
          {/* Header */}
          <div className='flex items-center gap-3 mb-6'>
            <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
              <ShieldCheck className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-serif text-xl font-bold text-[#171717] leading-tight'>
                Bảo Mật 2 Lớp (2FA Authenticator)
              </h3>
              <p className='text-xs text-[#555555] mt-0.5'>
                Bảo vệ tài khoản và tài sản studio theo tiêu chuẩn RFC 6238 TOTP.
              </p>
            </div>
          </div>

          {/* TRƯỜNG HỢP 1: ĐÃ KÍCH HOẠT 2FA - HIỂN THỊ TRẠNG THÁI ACTIVE */}
          {step === 'status' && (
            <div className='space-y-5 animate-in fade-in duration-300'>
              <div className='p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3'>
                <div className='w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5'>
                  <ShieldCheck className='w-5 h-5 text-emerald-600' />
                </div>
                <div>
                  <h4 className='text-sm font-bold text-emerald-900'>
                    2FA đang hoạt động và bảo vệ tài khoản
                  </h4>
                  <p className='text-xs text-emerald-700 mt-1 leading-relaxed'>
                    Tài khoản của bạn đã được liên kết với ứng dụng Google / Microsoft
                    Authenticator. Mỗi khi đăng nhập trên thiết bị mới, bạn sẽ được yêu cầu mã 6 số
                    từ ứng dụng.
                  </p>
                </div>
              </div>

              {statusMessage && (
                <div className='p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-xs flex items-center gap-2'>
                  <Check className='w-4 h-4 text-blue-600 shrink-0' />
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-4 space-y-2.5 text-xs text-[#555555]'>
                <div className='flex items-center justify-between py-1 border-b border-[#E7E7E7]'>
                  <span className='font-medium text-[#171717]'>Trạng thái bảo mật:</span>
                  <span className='inline-flex items-center gap-1 font-semibold text-emerald-600'>
                    <span className='w-2 h-2 rounded-full bg-emerald-500'></span>
                    Đang bật (Active)
                  </span>
                </div>
                <div className='flex items-center justify-between py-1 border-b border-[#E7E7E7]'>
                  <span className='font-medium text-[#171717]'>Ghi nhớ thiết bị tin cậy:</span>
                  <span className='font-medium text-[#171717]'>30 ngày (1 tháng)</span>
                </div>
                <div className='flex items-center justify-between py-1'>
                  <span className='font-medium text-[#171717]'>Ứng dụng hỗ trợ:</span>
                  <span className='text-[#555555]'>Google / Microsoft Authenticator</span>
                </div>
              </div>

              <div className='pt-2 flex flex-col sm:flex-row items-center justify-between gap-3'>
                <div className='flex items-center gap-2 w-full sm:w-auto'>
                  <button
                    type='button'
                    onClick={handleForgetCurrentDevice}
                    className='w-full sm:w-auto px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 flex items-center justify-center gap-1.5 cursor-pointer'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                    Quên thiết bị này
                  </button>
                  <button
                    type='button'
                    onClick={() => loadTwoFactorData()}
                    className='w-full sm:w-auto px-3 py-2 text-xs font-medium text-[#555555] hover:text-[#171717] hover:bg-gray-100 rounded-lg transition-colors border border-[#E7E7E7] flex items-center justify-center gap-1.5 cursor-pointer'
                  >
                    <RefreshCw className='w-3.5 h-3.5' />
                    Quét lại mã QR mới
                  </button>
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  className='w-full sm:w-auto bg-[#171717] hover:bg-[#262626] text-white text-xs font-semibold px-6 py-2 rounded-lg transition-colors cursor-pointer'
                >
                  Đóng
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {step === 'loading' && (
            <div className='py-12 flex flex-col items-center justify-center gap-3 text-[#555555]'>
              <RefreshCw className='w-8 h-8 text-[#F97316] animate-spin' />
              <p className='text-xs font-medium'>Đang chuẩn bị khóa bảo mật 2FA...</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className='py-8 text-center space-y-4'>
              <div className='w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto'>
                <AlertCircle className='w-6 h-6' />
              </div>
              <div>
                <h4 className='font-bold text-sm text-[#171717]'>Không thể tạo mã 2FA</h4>
                <p className='text-xs text-red-600 mt-1'>{errorMessage}</p>
              </div>
              <button
                type='button'
                onClick={loadTwoFactorData}
                className='px-4 py-2 bg-[#171717] text-white rounded-lg text-xs font-medium hover:bg-[#262626] transition-colors cursor-pointer'
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Setup (Quét QR + Nhập mã) */}
          {step === 'setup' && (
            <div className='space-y-6 animate-in fade-in duration-300'>
              {errorMessage && (
                <div className='p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center gap-2'>
                  <AlertCircle className='w-4 h-4 shrink-0' />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Bước 1: Quét mã QR */}
              <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-5'>
                <div className='flex items-center gap-2 mb-3'>
                  <span className='w-5 h-5 rounded-full bg-[#171717] text-white font-mono text-xs font-bold flex items-center justify-center'>
                    1
                  </span>
                  <h4 className='text-sm font-bold text-[#171717] flex items-center gap-1.5'>
                    <Smartphone className='w-4 h-4 text-[#F97316]' />
                    Quét mã QR bằng ứng dụng Authenticator
                  </h4>
                </div>

                <div className='flex flex-col sm:flex-row items-center gap-6'>
                  <div className='bg-white p-3 rounded-xl border border-[#E7E7E7] shadow-sm flex items-center justify-center shrink-0'>
                    {qrUri ? (
                      <QRCodeSVG value={qrUri} size={150} level='M' />
                    ) : (
                      <div className='w-[150px] h-[150px] bg-gray-100 flex items-center justify-center text-xs text-gray-400'>
                        Mã QR
                      </div>
                    )}
                  </div>

                  <div className='space-y-3 flex-1 text-xs text-[#555555]'>
                    <p>
                      Mở ứng dụng <strong>Google Authenticator</strong> hoặc{' '}
                      <strong>Microsoft Authenticator</strong> trên điện thoại, bấm dấu{' '}
                      <strong>+</strong> và chọn <strong>Quét mã QR</strong>.
                    </p>
                    <div className='pt-2 border-t border-[#E7E7E7]'>
                      <span className='text-[11px] font-semibold text-[#171717] block mb-1 flex items-center gap-1'>
                        <Key className='w-3.5 h-3.5 text-[#888888]' />
                        Khóa dự phòng (nhập thủ công):
                      </span>
                      <div className='flex items-center gap-2'>
                        <code className='bg-white px-2.5 py-1.5 rounded border border-[#E7E7E7] font-mono text-[11px] text-[#171717] tracking-wider font-semibold select-all break-all'>
                          {formattedKey || backupKey}
                        </code>
                        <button
                          type='button'
                          onClick={handleCopyKey}
                          className='p-1.5 rounded bg-white hover:bg-gray-100 border border-[#E7E7E7] text-[#555555] hover:text-[#171717] transition-colors cursor-pointer shrink-0'
                          title='Sao chép khóa'
                        >
                          {copied ? (
                            <Check className='w-3.5 h-3.5 text-green-600' />
                          ) : (
                            <Copy className='w-3.5 h-3.5' />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bước 2: Nhập mã xác nhận */}
              <form onSubmit={handleVerify} className='space-y-4'>
                <div className='flex items-center gap-2 mb-2'>
                  <span className='w-5 h-5 rounded-full bg-[#171717] text-white font-mono text-xs font-bold flex items-center justify-center'>
                    2
                  </span>
                  <h4 className='text-sm font-bold text-[#171717] flex items-center gap-1.5'>
                    <Lock className='w-4 h-4 text-[#F97316]' />
                    Nhập mã 6 chữ số để kích hoạt
                  </h4>
                </div>

                <div>
                  <input
                    type='text'
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder='000000'
                    className='w-full text-center tracking-[0.6em] text-2xl font-mono font-bold py-3 bg-[#FAF8F5] border border-[#E7E7E7] focus:border-[#F97316] focus:bg-white rounded-xl outline-none transition-all'
                    autoFocus
                  />
                  <p className='text-center text-[11px] text-[#888888] mt-1.5'>
                    Mã 6 chữ số nhảy mới mỗi 30 giây trong ứng dụng Authenticator
                  </p>
                </div>

                <div className='flex items-center justify-end gap-3 pt-2'>
                  <button
                    type='button'
                    onClick={onClose}
                    disabled={isVerifying}
                    className='px-4 py-2 text-xs font-semibold text-[#555555] hover:text-[#171717] transition-colors cursor-pointer'
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type='submit'
                    disabled={isVerifying || code.length !== 6}
                    className='bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer'
                  >
                    {isVerifying ? (
                      <>
                        <RefreshCw className='w-3.5 h-3.5 animate-spin' />
                        Đang xác thực...
                      </>
                    ) : (
                      'Xác nhận kích hoạt 2FA'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 'success' && (
            <div className='py-8 text-center space-y-5'>
              <div className='w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm'>
                <ShieldCheck className='w-10 h-10' />
              </div>

              <div>
                <h3 className='text-xl font-bold font-serif text-[#171717]'>
                  Đã kích hoạt 2FA thành công!
                </h3>
                <p className='text-xs text-[#555555] mt-2 max-w-md mx-auto leading-relaxed'>
                  Tài khoản của bạn hiện đã được bảo vệ với tiêu chuẩn quốc tế RFC 6238 TOTP. Thiết
                  bị này sẽ được ghi nhớ trong vòng 30 ngày (1 tháng) trước khi cần nhập lại mã 2FA.
                </p>
              </div>

              <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-3 max-w-sm mx-auto text-[11px] text-[#555555] flex items-center justify-center gap-2'>
                <Check className='w-4 h-4 text-emerald-600 shrink-0' />
                <span>
                  Trạng thái bảo vệ: <strong>Đang hoạt động (Active)</strong>
                </span>
              </div>

              <div className='pt-2'>
                <button
                  type='button'
                  onClick={onClose}
                  className='bg-[#171717] hover:bg-[#262626] text-white text-xs font-semibold px-8 py-2.5 rounded-lg transition-colors cursor-pointer'
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
