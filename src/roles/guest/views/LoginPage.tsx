import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { signInWithPopup, auth, googleProvider } from '@/config/firebase';
import { authService } from '@/services/auth.service';
import { AuthResponse, SystemRole, normalizeSystemRole } from '@/types';

export interface LoginPageProps {
  onLoginSuccess?: (authResponse: AuthResponse) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Search parameters for maintaining redirect query
  const queryParams = new URLSearchParams(location.search);
  const redirectTarget = queryParams.get('redirect') || queryParams.get('returnUrl');

  // Multi-step modes: 'login' | '2fa' | 'forgot' | 'reset'
  const [step, setStep] = useState<'login' | '2fa' | 'forgot' | 'reset'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Field validation errors
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // 2FA state
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Forgot & Reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // General loading & notification states
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Handle successful login routing
  const handleAuthTransition = async (response: AuthResponse) => {
    if (onLoginSuccess) {
      onLoginSuccess(response);
      return;
    }

    // Default standalone auth handling if not provided by App wrapper
    const role: SystemRole = normalizeSystemRole(response.user?.role);
    localStorage.setItem('userRole', role);
    if (response.user) {
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    if (response.token) {
      localStorage.setItem('token', response.token);
    }
    if (response.refreshToken) {
      localStorage.setItem('refreshToken', response.refreshToken);
    }

    if (redirectTarget) {
      navigate(redirectTarget);
      return;
    }

    try {
      const landing = await authService.getLandingContext();
      if (landing?.suggestedLanding === 'AdminDashboard') {
        navigate('/admin');
      } else if (landing?.suggestedLanding === 'YourWorkspaces') {
        navigate('/workspaces');
      } else if (landing?.suggestedLanding === 'StudioCreation') {
        navigate(landing.canCreateStudio ? '/producer' : '/workspaces');
      } else if (landing?.suggestedLanding === 'PublicCatalog') {
        navigate('/catalog');
      } else {
        navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
      }
    } catch {
      navigate(role === 'ADMINISTRATOR' ? '/admin' : '/workspaces');
    }
  };

  // 1. Submit login credentials
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessNotice(null);

    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Định dạng email không hợp lệ.';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);

    try {
      const response = await authService.login(trimmedEmail, password);

      // Handle 2FA Challenge requirement
      if (response?.requiresTwoFactor) {
        setTwoFactorEmail(response.twoFactorEmail || trimmedEmail);
        setStep('2fa');
        setServerError(null);
        return;
      }

      await handleAuthTransition(response);
    } catch (err: any) {
      console.error('Lỗi đăng nhập:', err);
      setServerError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit 2FA TOTP code
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = twoFactorCode.trim();
    if (cleanCode.length !== 6) {
      setServerError('Vui lòng nhập đầy đủ mã xác thực gồm 6 chữ số.');
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      const response = await authService.verifyTwoFactor({
        email: twoFactorEmail || email.trim(),
        code: cleanCode,
        rememberDevice,
        deviceName:
          typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'Browser',
      });

      if (response?.rememberDeviceToken) {
        localStorage.setItem('pf_remember_device', response.rememberDeviceToken);
      }

      await handleAuthTransition(response);
    } catch (err: any) {
      console.error('Lỗi xác thực 2FA:', err);
      setServerError(err.message || 'Mã xác thực 2FA không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Submit Forgot Password request
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail.trim() || email.trim();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setServerError('Vui lòng nhập địa chỉ email hợp lệ để nhận mã OTP.');
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      await authService.forgotPassword(targetEmail);
      setForgotEmail(targetEmail);
      setStep('reset');
      setSuccessNotice(
        `Mã OTP 6 chữ số đã được gửi đến email ${targetEmail}. Vui lòng kiểm tra hộp thư.`,
      );
    } catch (err: any) {
      console.error('Lỗi yêu cầu quên mật khẩu:', err);
      setServerError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Submit Reset Password & Activate Account
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail.trim() || email.trim();
    if (!targetEmail) {
      setServerError('Vui lòng nhập email tài khoản.');
      return;
    }

    if (resetOtp.trim().length !== 6) {
      setServerError('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setServerError('Mật khẩu xác nhận không khớp.');
      return;
    }

    const pwdRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!pwdRegex.test(newPassword)) {
      setServerError(
        'Mật khẩu mới phải có ít nhất 6 ký tự, chứa ít nhất 1 chữ hoa và 1 ký tự đặc biệt.',
      );
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      await authService.resetPassword({
        email: targetEmail,
        token: resetOtp.trim(),
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      setEmail(targetEmail);
      setPassword('');
      setStep('login');
      setSuccessNotice(
        'Kích hoạt tài khoản / Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
      );
    } catch (err: any) {
      console.error('Lỗi đặt lại mật khẩu:', err);
      setServerError(err.message || 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Google Sign In via Firebase OAuth
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setServerError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const backendResponse = await authService.externalLogin(idToken);
      await handleAuthTransition(backendResponse);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setIsLoading(false);
        return;
      }
      console.error('Lỗi đăng nhập Google:', err);
      setServerError(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full'>
      {/* Brand Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 rounded-xl bg-[#171717] flex items-center justify-center text-white shadow-sm'>
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='white'
              strokeWidth='2.2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' />
            </svg>
          </div>
          <div>
            <span className='font-serif text-2xl font-bold tracking-tight text-[#171717]'>
              PanelForge
            </span>
            <p className='text-xs text-[#777169] font-medium'>Không gian sản xuất truyện tranh</p>
          </div>
        </div>

        {step === 'login' && (
          <div>
            <h1
              id='auth-dialog-title'
              className='text-2xl sm:text-3xl font-serif font-light text-[#0c0a09] tracking-tight'
            >
              Chào mừng <em className='font-light italic text-[#292524]'>trở lại</em>
            </h1>
            <p className='text-xs sm:text-sm text-[#777169] mt-1'>
              Tiếp tục câu chuyện của bạn cùng studio.
            </p>
          </div>
        )}

        {step === '2fa' && (
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <button
                type='button'
                onClick={() => setStep('login')}
                className='text-[#777169] hover:text-[#171717] transition-colors p-1 -ml-1 rounded-md'
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
              <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
                Xác thực hai bước (2FA)
              </h1>
            </div>
            <p className='text-xs text-[#777169] mt-1'>
              Nhập mã 6 chữ số từ ứng dụng Authenticator của bạn.
            </p>
          </div>
        )}

        {step === 'forgot' && (
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <button
                type='button'
                onClick={() => setStep('login')}
                className='text-[#777169] hover:text-[#171717] transition-colors p-1 -ml-1 rounded-md'
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
              <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
                Quên mật khẩu
              </h1>
            </div>
            <p className='text-xs text-[#777169] mt-1'>
              Nhập email để nhận mã xác nhận đặt lại mật khẩu.
            </p>
          </div>
        )}

        {step === 'reset' && (
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <button
                type='button'
                onClick={() => setStep('login')}
                className='text-[#777169] hover:text-[#171717] transition-colors p-1 -ml-1 rounded-md'
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
              <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
                Kích hoạt & Đặt lại mật khẩu
              </h1>
            </div>
            <p className='text-xs text-[#777169] mt-1'>
              Nhập mã OTP 6 số và thiết lập mật khẩu mới.
            </p>
          </div>
        )}
      </div>

      {/* Global Server Alerts */}
      {successNotice && (
        <div
          role='status'
          className='mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in'
        >
          <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
          <span>{successNotice}</span>
        </div>
      )}

      {serverError && (
        <div
          role='alert'
          className='mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in'
        >
          <AlertCircle className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
          <span>{serverError}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW 1: FORM ĐĂNG NHẬP CHÍNH                                      */}
      {/* ================================================================ */}
      {step === 'login' && (
        <form onSubmit={handleLoginSubmit} className='space-y-4'>
          {/* Email field */}
          <div>
            <label
              htmlFor='login-email'
              className='block text-xs font-semibold text-[#171717] mb-1.5'
            >
              Email <span className='text-red-500'>*</span>
            </label>
            <div className='relative'>
              <input
                id='login-email'
                type='email'
                autoComplete='email'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder='creator@studio.com'
                required
                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                aria-invalid={!!fieldErrors.email}
                disabled={isLoading}
                className={`w-full px-3.5 py-2.5 bg-white border ${
                  fieldErrors.email
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-[#E7E5E4] focus:border-[#F97316] focus:ring-[#F97316]/20'
                } rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A8A29E] outline-none focus:ring-2 transition-all shadow-xs`}
              />
            </div>
            {fieldErrors.email && (
              <p id='login-email-error' className='mt-1 text-xs text-red-600'>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Password field with Show/Hide toggle */}
          <div>
            <div className='flex items-center justify-between mb-1.5'>
              <label
                htmlFor='login-password'
                className='block text-xs font-semibold text-[#171717]'
              >
                Mật khẩu <span className='text-red-500'>*</span>
              </label>
              <button
                type='button'
                onClick={() => {
                  setForgotEmail(email);
                  setServerError(null);
                  setSuccessNotice(null);
                  setStep('forgot');
                }}
                className='text-xs font-medium text-[#F97316] hover:text-[#EA580C] hover:underline cursor-pointer'
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className='relative'>
              <input
                id='login-password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='current-password'
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password)
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder='••••••••'
                required
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                aria-invalid={!!fieldErrors.password}
                disabled={isLoading}
                className={`w-full pl-3.5 pr-10 py-2.5 bg-white border ${
                  fieldErrors.password
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-[#E7E5E4] focus:border-[#F97316] focus:ring-[#F97316]/20'
                } rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A8A29E] outline-none focus:ring-2 transition-all shadow-xs`}
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#777169] hover:text-[#171717] transition-colors cursor-pointer rounded-md'
              >
                {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id='login-password-error' className='mt-1 text-xs text-red-600'>
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type='submit'
            disabled={isLoading}
            className='w-full mt-2 py-3 px-4 bg-[#292524] hover:bg-[#0c0a09] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-soft-sm flex items-center justify-center gap-2 cursor-pointer'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang đăng nhập…</span>
              </>
            ) : (
              <span>Đăng nhập</span>
            )}
          </button>

          {/* Divider: "hoặc" */}
          <div className='relative flex items-center justify-center my-4'>
            <div className='w-full border-t border-[#E7E5E4]' />
            <span className='absolute bg-[#FAF8F5] px-3 text-[11px] font-mono text-[#777169] uppercase tracking-wider'>
              hoặc
            </span>
          </div>

          {/* Google OAuth Button */}
          <button
            type='button'
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className='w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-[#E7E5E4] hover:border-[#171717] text-[#171717] text-xs sm:text-sm font-medium rounded-xl transition-all shadow-xs flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50'
          >
            <svg className='w-4 h-4 shrink-0' viewBox='0 0 24 24'>
              <path
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                fill='#4285F4'
              />
              <path
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                fill='#34A853'
              />
              <path
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                fill='#FBBC05'
              />
              <path
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                fill='#EA4335'
              />
            </svg>
            <span>Tiếp tục với Google</span>
          </button>

          {/* Register switch link */}
          <div className='text-center pt-3'>
            <p className='text-xs text-[#777169]'>
              Chưa có tài khoản?{' '}
              <Link
                to={`/register${location.search}`}
                replace
                className='font-semibold text-[#171717] hover:text-[#F97316] hover:underline'
              >
                Tạo tài khoản
              </Link>
            </p>
          </div>

          {/* Secondary link: Kích hoạt tài khoản (at the bottom, NOT next to password label) */}
          <div className='pt-4 border-t border-[#E7E5E4] text-center'>
            <button
              type='button'
              onClick={() => {
                setForgotEmail(email);
                setServerError(null);
                setSuccessNotice(null);
                setStep('reset');
              }}
              className='text-xs text-[#777169] hover:text-[#171717] font-medium underline underline-offset-4 cursor-pointer transition-colors'
            >
              Kích hoạt tài khoản được mời hoặc chưa xác thực?
            </button>
          </div>
        </form>
      )}

      {/* ================================================================ */}
      {/* VIEW 2: 2FA TOTP CHALLENGE                                      */}
      {/* ================================================================ */}
      {step === '2fa' && (
        <form onSubmit={handleTwoFactorSubmit} className='space-y-4'>
          <div>
            <label
              htmlFor='two-factor-code'
              className='block text-xs font-semibold text-[#171717] mb-1.5'
            >
              Mã xác thực 6 chữ số
            </label>
            <input
              id='two-factor-code'
              type='text'
              inputMode='numeric'
              pattern='[0-9]*'
              maxLength={6}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              placeholder='000000'
              autoFocus
              required
              disabled={isLoading}
              className='w-full text-center text-2xl font-mono font-bold tracking-[0.4em] py-3 px-4 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl outline-none transition-all shadow-xs'
            />
          </div>

          <div className='flex items-center gap-2 pt-1'>
            <input
              id='remember-device'
              type='checkbox'
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className='w-4 h-4 rounded border-stone-300 text-[#F97316] focus:ring-[#F97316]'
            />
            <label htmlFor='remember-device' className='text-xs text-[#777169] cursor-pointer'>
              Ghi nhớ thiết bị này trong 30 ngày
            </label>
          </div>

          <button
            type='submit'
            disabled={isLoading || twoFactorCode.trim().length !== 6}
            className='w-full py-3 px-4 bg-[#F97316] hover:bg-[#EA580C] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang kiểm tra mã 2FA…</span>
              </>
            ) : (
              <span>Xác nhận & Vào Studio</span>
            )}
          </button>
        </form>
      )}

      {/* ================================================================ */}
      {/* VIEW 3: QUÊN MẬT KHẨU (GỬI OTP)                                 */}
      {/* ================================================================ */}
      {step === 'forgot' && (
        <form onSubmit={handleForgotPasswordSubmit} className='space-y-4'>
          <div>
            <label
              htmlFor='forgot-email'
              className='block text-xs font-semibold text-[#171717] mb-1.5'
            >
              Email tài khoản
            </label>
            <input
              id='forgot-email'
              type='email'
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder='creator@studio.com'
              required
              disabled={isLoading}
              className='w-full px-3.5 py-2.5 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A8A29E] outline-none transition-all shadow-xs'
            />
          </div>

          <button
            type='submit'
            disabled={isLoading}
            className='w-full py-3 px-4 bg-[#171717] hover:bg-black disabled:bg-stone-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang gửi mã…</span>
              </>
            ) : (
              <span>Gửi mã xác nhận OTP</span>
            )}
          </button>
        </form>
      )}

      {/* ================================================================ */}
      {/* VIEW 4: ĐẶT LẠI MẬT KHẨU & KÍCH HOẠT VỚI OTP                   */}
      {/* ================================================================ */}
      {step === 'reset' && (
        <form onSubmit={handleResetPasswordSubmit} className='space-y-3.5'>
          <div>
            <label
              htmlFor='reset-email'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Email
            </label>
            <input
              id='reset-email'
              type='email'
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder='creator@studio.com'
              required
              disabled={isLoading}
              className='w-full px-3.5 py-2 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl text-xs text-[#171717] outline-none'
            />
          </div>

          <div>
            <label htmlFor='reset-otp' className='block text-xs font-semibold text-[#171717] mb-1'>
              Mã OTP (6 số)
            </label>
            <input
              id='reset-otp'
              type='text'
              maxLength={6}
              value={resetOtp}
              onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
              placeholder='123456'
              required
              disabled={isLoading}
              className='w-full px-3.5 py-2 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl text-xs font-mono font-bold tracking-widest text-[#171717] outline-none'
            />
          </div>

          <div>
            <label
              htmlFor='reset-new-password'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Mật khẩu mới
            </label>
            <div className='relative'>
              <input
                id='reset-new-password'
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder='Tối thiểu 6 ký tự, 1 hoa, 1 ký tự đặc biệt'
                required
                disabled={isLoading}
                className='w-full pl-3.5 pr-10 py-2 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl text-xs text-[#171717] outline-none'
              />
              <button
                type='button'
                onClick={() => setShowNewPassword(!showNewPassword)}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600'
              >
                {showNewPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor='reset-confirm-password'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Xác nhận mật khẩu mới
            </label>
            <input
              id='reset-confirm-password'
              type={showNewPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder='Nhập lại mật khẩu mới'
              required
              disabled={isLoading}
              className='w-full px-3.5 py-2 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl text-xs text-[#171717] outline-none'
            />
          </div>

          <button
            type='submit'
            disabled={isLoading}
            className='w-full py-2.5 px-4 bg-[#F97316] hover:bg-[#EA580C] disabled:bg-stone-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang xử lý…</span>
              </>
            ) : (
              <span>Xác nhận & Cập nhật mật khẩu</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
