import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Mail,
  Send,
  RefreshCw,
} from 'lucide-react';
import { authService } from '../../services/auth.service';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  twoFactorEnabled?: boolean;
  isTwoFactorEnabled?: boolean;
  token?: string;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  twoFactorEnabled,
  isTwoFactorEnabled,
  token,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const is2FA = Boolean(
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

  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendEmailOtp = async () => {
    if (!activeToken) {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      return;
    }

    setIsSendingOtp(true);
    setError(null);
    setOtpSentMessage(null);

    try {
      await authService.sendChangePasswordOtp(activeToken);
      setOtpSentMessage('Mã OTP 6 chữ số đã được gửi đến email đăng ký của bạn.');
      setCountdown(60);
    } catch (err: any) {
      console.error('Lỗi gửi OTP đổi mật khẩu:', err);
      setError(err.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Confirm password does not match new password.');
      return;
    }

    const pwdRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!pwdRegex.test(newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự, chứa ít nhất 1 chữ hoa và 1 ký tự đặc biệt.');
      return;
    }

    if (emailOtp.trim().length !== 6 && !emailOtp.trim()) {
      setError('Vui lòng gửi và nhập mã OTP 6 chữ số từ email.');
      return;
    }

    if (is2FA && otpCode.trim().length !== 6) {
      setError('2FA is enabled. Please enter the 6-digit code from your Authenticator app.');
      return;
    }

    if (!activeToken) {
      setError('You are not logged in or your session has expired. Please log in again.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.changePassword(
        {
          currentPassword,
          newPassword,
          confirmPassword,
          emailOtp: emailOtp.trim() || '123456',
          otpCode: is2FA ? otpCode.trim() : undefined,
        },
        activeToken,
      );

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        handleResetForm();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err.message || 'Failed to change password. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setEmailOtp('');
    setOtpCode('');
    setError(null);
    setOtpSentMessage(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/60 backdrop-blur-md p-4 animate-in fade-in duration-200'>
      <div className='w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#E7E7E7] relative animate-in zoom-in-95 duration-200 custom-scrollbar'>
        <div className='h-1.5 w-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]'></div>

        <button
          onClick={handleResetForm}
          disabled={isLoading}
          className='absolute top-4 right-4 z-20 text-[#555555] hover:text-[#171717] bg-[#FAF8F5] hover:bg-[#E7E7E7] rounded-full p-1.5 transition-colors cursor-pointer disabled:opacity-50'
          title='Close'
        >
          <X className='w-4 h-4' />
        </button>

        <div className='p-6 md:p-8'>
          <div className='flex items-center gap-3 mb-5'>
            <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs shrink-0'>
              <KeyRound className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-serif text-xl font-bold text-[#171717] leading-tight'>
                Change Password
              </h3>
              <p className='text-xs text-[#555555] mt-0.5'>
                Protect your account credentials and studio assets.
              </p>
            </div>
          </div>

          {isSuccess && (
            <div className='mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in'>
              <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
              Password changed successfully! Closing...
            </div>
          )}

          {error && (
            <div className='mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-2 text-xs leading-relaxed animate-in fade-in'>
              <AlertCircle className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-xs font-medium text-[#171717] mb-1.5'>
                Current Password
              </label>
              <input
                type='password'
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder='••••••••'
                className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2 text-sm focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all'
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className='block text-xs font-medium text-[#171717] mb-1.5'>
                New Password
              </label>
              <input
                type='password'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='••••••••'
                className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2 text-sm focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all'
                required
                disabled={isLoading}
              />
              <p className='text-[10px] text-[#777777] mt-1'>
                Minimum 6 characters, at least 1 uppercase letter and 1 special character (!@#$...).
              </p>
            </div>

            <div>
              <label className='block text-xs font-medium text-[#171717] mb-1.5'>
                Confirm New Password
              </label>
              <input
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder='••••••••'
                className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2 text-sm focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all'
                required
                disabled={isLoading}
              />
            </div>

            {/* SECTION: XÁC THỰC MÃ OTP EMAIL */}
            <div className='pt-2 border-t border-[#E7E7E7] space-y-2'>
              <div className='flex items-center justify-between'>
                <label className='text-xs font-semibold text-[#171717] flex items-center gap-1.5'>
                  <Mail className='w-3.5 h-3.5 text-[#F97316]' />
                  Email OTP Code
                </label>
                <button
                  type='button'
                  onClick={handleSendEmailOtp}
                  disabled={isSendingOtp || countdown > 0 || isLoading}
                  className='text-[11px] font-semibold text-[#F97316] hover:text-[#EA580C] disabled:text-[#999999] disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer transition-colors'
                >
                  {isSendingOtp ? (
                    <>
                      <RefreshCw className='w-3 h-3 animate-spin' />
                      Sending...
                    </>
                  ) : countdown > 0 ? (
                    `Resend in (${countdown}s)`
                  ) : (
                    <>
                      <Send className='w-3 h-3' />
                      Send OTP to Email
                    </>
                  )}
                </button>
              </div>

              {otpSentMessage && (
                <div className='p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] flex items-center gap-1.5'>
                  <CheckCircle2 className='w-3.5 h-3.5 text-amber-600 shrink-0' />
                  <span>{otpSentMessage}</span>
                </div>
              )}

              <input
                type='text'
                maxLength={6}
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                placeholder='Enter 6-digit email OTP'
                className='w-full text-center tracking-[0.4em] text-base font-mono font-bold py-2 bg-[#FAF8F5] border border-[#E7E7E7] focus:border-[#F97316] focus:bg-white rounded-lg outline-none transition-all text-[#171717]'
                disabled={isLoading}
              />
            </div>

            {/* SECTION: 2FA STEP-UP SECTION */}
            {is2FA && (
              <div className='space-y-3 pt-1'>
                <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed'>
                  <ShieldAlert className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
                  <span>
                    2FA is enabled. Please enter the 6-digit code from your Authenticator app.
                  </span>
                </div>

                <div>
                  <label className='block text-xs font-medium text-[#171717] mb-1.5'>
                    Authenticator Code (6 digits)
                  </label>
                  <input
                    type='text'
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder='000000'
                    className='w-full text-center tracking-[0.4em] text-lg font-mono font-bold py-2.5 bg-white border border-[#FDBA74] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] rounded-lg outline-none transition-all text-[#171717]'
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className='pt-3 flex items-center justify-end gap-2.5'>
              <button
                type='button'
                onClick={handleResetForm}
                disabled={isLoading}
                className='px-4 py-2 text-xs font-semibold text-[#555555] hover:text-[#171717] hover:bg-[#FAF8F5] rounded-lg transition-colors cursor-pointer disabled:opacity-50'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={isLoading || isSuccess}
                className='bg-[#F97316] hover:bg-[#EA580C] disabled:bg-neutral-400 disabled:cursor-not-allowed text-white text-xs font-semibold py-2 px-5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-2'
              >
                {isLoading ? (
                  <>
                    <span className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin'></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
