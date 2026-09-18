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
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { authService } from '../../services/auth.service';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  onSuccess?: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  token,
  onSuccess,
}) => {
  const [step, setStep] = useState<'loading' | 'setup' | 'success' | 'error'>('loading');
  const [qrUri, setQrUri] = useState('');
  const [backupKey, setBackupKey] = useState('');
  const [formattedKey, setFormattedKey] = useState('');
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lấy token từ props hoặc localStorage
  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

  const loadTwoFactorData = useCallback(async () => {
    setStep('loading');
    setErrorMessage(null);
    setCode('');

    try {
      if (!activeToken) {
        // Mock data nếu đang chạy demo offline không có token JWT thật
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

      const data = await authService.enableTwoFactor(activeToken);
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
      loadTwoFactorData();
    }
  }, [isOpen, loadTwoFactorData]);

  const handleCopyKey = () => {
    if (!backupKey) return;
    navigator.clipboard.writeText(backupKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      if (!activeToken) {
        // Mock verify nếu chạy offline demo
        await new Promise((resolve) => setTimeout(resolve, 600));
        setStep('success');
        if (onSuccess) onSuccess();
        return;
      }

      await authService.verifyTwoFactor({ code: code.trim() }, activeToken);
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
      <div className='w-[650px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-[#E7E7E7] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200'>
        {/* Top Accent Stripe */}
        <div className='h-1.5 w-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]'></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isVerifying}
          className='absolute top-4 right-4 z-20 text-[#555555] hover:text-[#171717] bg-[#FAF8F5] hover:bg-[#E7E7E7] rounded-full p-1.5 transition-colors cursor-pointer disabled:opacity-50'
          title='Đóng'
        >
          <X className='w-5 h-5' />
        </button>

        {/* Modal Header */}
        <div className='px-8 pt-6 pb-4 border-b border-[#E7E7E7] flex items-center gap-3.5 bg-[#FAF8F5]/80'>
          <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-xs'>
            <ShieldCheck className='w-5 h-5' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-xl font-bold font-serif text-[#171717]'>
                Xác thực 2 yếu tố (2FA)
              </h2>
              <span className='text-[10px] font-mono font-bold bg-[#171717] text-white px-2 py-0.5 rounded'>
                RFC 6238 TOTP
              </span>
            </div>
            <p className='text-xs text-[#555555] mt-0.5'>
              Bảo vệ tài khoản và bản thảo manga với Google Authenticator hoặc Microsoft
              Authenticator
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className='p-8 overflow-y-auto max-h-[75vh]'>
          {step === 'loading' && (
            <div className='py-16 flex flex-col items-center justify-center gap-3'>
              <RefreshCw className='w-8 h-8 text-[#F97316] animate-spin' />
              <p className='text-sm font-medium text-[#555555]'>
                Đang tạo mã bí mật và QR Code bảo mật...
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className='py-8 text-center space-y-4'>
              <div className='w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200'>
                <AlertCircle className='w-6 h-6' />
              </div>
              <div>
                <h3 className='text-base font-bold text-[#171717]'>Không thể kích hoạt 2FA</h3>
                <p className='text-sm text-red-600 mt-1 max-w-sm mx-auto'>{errorMessage}</p>
              </div>
              <button
                onClick={loadTwoFactorData}
                className='px-5 py-2.5 rounded-lg bg-[#171717] text-white text-sm font-medium hover:bg-[#262626] transition-colors inline-flex items-center gap-2 cursor-pointer'
              >
                <RefreshCw className='w-4 h-4' /> Thử lại
              </button>
            </div>
          )}

          {step === 'setup' && (
            <div className='space-y-6'>
              {/* Báo lỗi nếu nhập sai OTP */}
              {errorMessage && (
                <div className='p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center gap-2'>
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
                  Tài khoản của bạn hiện đã được bảo vệ với tiêu chuẩn quốc tế RFC 6238 TOTP. Từ lần
                  đăng nhập tới, hệ thống sẽ yêu cầu mã xác nhận 6 chữ số trên ứng dụng
                  Authenticator của bạn.
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
