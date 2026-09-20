import React, { useState } from 'react';
import { X, KeyRound, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
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
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Hỗ trợ cả hai tên biến twoFactorEnabled và isTwoFactorEnabled
  const is2FA = Boolean(twoFactorEnabled ?? isTwoFactorEnabled);

  // Lấy JWT token từ props hoặc localStorage
  const activeToken =
    token || (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Kiểm tra xác nhận mật khẩu
    if (newPassword !== confirmPassword) {
      setError('Confirm password does not match new password.');
      return;
    }

    // 2. Kiểm tra mã OTP nếu tài khoản bật 2FA
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
      // Payload gửi đi bao gồm đủ currentPassword, newPassword, confirmPassword và otpCode
      await authService.changePassword(
        {
          currentPassword,
          newPassword,
          confirmPassword,
          otpCode: is2FA ? otpCode.trim() : undefined,
        },
        activeToken,
      );

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
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
    setOtpCode('');
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/60 backdrop-blur-md p-4 animate-in fade-in duration-200'>
      <div className='w-[460px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-[#E7E7E7] overflow-hidden relative animate-in zoom-in-95 duration-200'>
        {/* Top Accent Stripe */}
        <div className='h-1.5 w-full bg-gradient-to-r from-[#F97316] via-[#EA580C] to-[#C2410C]'></div>

        {/* Close Button */}
        <button
          onClick={handleResetForm}
          disabled={isLoading}
          className='absolute top-4 right-4 z-20 text-[#555555] hover:text-[#171717] bg-[#FAF8F5] hover:bg-[#E7E7E7] rounded-full p-1.5 transition-colors cursor-pointer disabled:opacity-50'
          title='Close'
        >
          <X className='w-4 h-4' />
        </button>

        <div className='p-6 md:p-8'>
          {/* Header */}
          <div className='flex items-center gap-3 mb-6'>
            <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs'>
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

          {/* Success Alert */}
          {isSuccess && (
            <div className='mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in'>
              <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0' />
              Password changed successfully! Closing...
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className='mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-2 text-xs leading-relaxed animate-in fade-in'>
              <AlertCircle className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-4'>
            {/* Current Password */}
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

            {/* New Password */}
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
            </div>

            {/* Confirm New Password */}
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

            {/* 2FA STEP-UP SECTION: Thông báo đỏ & Input OTP đặt ngay dưới Confirm New Password (CHỈ xuất hiện khi twoFactorEnabled === true) */}
            {is2FA && (
              <div className='space-y-3 pt-1'>
                {/* Thông báo đỏ yêu cầu 2FA */}
                <div className='p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed'>
                  <ShieldAlert className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
                  <span>2FA is enabled. Please enter the 6-digit code from your Authenticator app.</span>
                </div>

                {/* Input OTP Authenticator Code (6 digits) */}
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

            {/* Action Buttons */}
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
