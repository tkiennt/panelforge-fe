import React, { useState, useEffect } from 'react';
import { BrandMark } from '@/shared/components/BrandMark';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  MailCheck,
  RotateCw,
} from 'lucide-react';
import { signInWithPopup, auth, googleProvider } from '@/config/firebase';
import { authService } from '@/services/auth.service';
import { AuthResponse, SystemRole, normalizeSystemRole } from '@/types';

export interface RegisterPageProps {
  onRegisterSuccess?: (authResponse: AuthResponse) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Search parameters for maintaining redirect query
  const queryParams = new URLSearchParams(location.search);
  const redirectTarget = queryParams.get('redirect') || queryParams.get('returnUrl');

  // Step: 'register' | 'verify_pin'
  const [step, setStep] = useState<'register' | 'verify_pin'>('register');

  // Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field validation and blur tracking
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phoneNumber?: string;
  }>({});
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  // PIN verification state
  const [pinCode, setPinCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Loading & alerts
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Password validation rules according to backend regex: ^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasSpecialChar;

  // Handle countdown for resend PIN
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Validate confirmPassword immediately on blur
  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordTouched(true);
    if (!confirmPassword) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Vui lòng xác nhận mật khẩu.' }));
    } else if (confirmPassword !== password) {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Mật khẩu xác nhận không khớp.' }));
    } else {
      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
    }
  };

  // Re-check confirmPassword when password changes if touched
  useEffect(() => {
    if (confirmPasswordTouched && confirmPassword) {
      if (confirmPassword !== password) {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: 'Mật khẩu xác nhận không khớp.' }));
      } else {
        setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      }
    }
  }, [password, confirmPassword, confirmPasswordTouched]);

  // Auth transition after PIN verification or Google Sign-In
  const handleAuthTransition = async (response: AuthResponse) => {
    if (onRegisterSuccess) {
      onRegisterSuccess(response);
      return;
    }

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

  // 1. Submit Register form
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setSuccessNotice(null);

    const errors: {
      fullName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      phoneNumber?: string;
    } = {};

    const cleanFullName = fullName.trim();
    if (!cleanFullName) {
      errors.fullName = 'Họ và tên là bắt buộc.';
    } else if (cleanFullName.length > 100) {
      errors.fullName = 'Họ và tên không được vượt quá 100 ký tự.';
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      errors.email = 'Email là bắt buộc.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Email không đúng định dạng.';
    }

    if (!password) {
      errors.password = 'Mật khẩu là bắt buộc.';
    } else if (!isPasswordValid) {
      errors.password = 'Mật khẩu chưa đáp ứng đủ 3 tiêu chuẩn bên dưới.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    if (phoneNumber.trim() && !/^[0-9+() -]{8,16}$/.test(phoneNumber.trim())) {
      errors.phoneNumber = 'Số điện thoại không hợp lệ.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);

    try {
      const res = await authService.register(
        cleanEmail,
        password,
        cleanFullName,
        phoneNumber.trim() || undefined,
      );

      setSuccessNotice(
        res.message || 'Đăng ký thành công! Vui lòng nhập mã PIN 6 số đã được gửi đến email.',
      );
      setStep('verify_pin');
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      setServerError(err.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit PIN Verification
  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const cleanPin = pinCode.trim();
    if (cleanPin.length !== 6) {
      setServerError('Vui lòng nhập đầy đủ mã PIN gồm 6 chữ số.');
      return;
    }

    setIsLoading(true);

    try {
      const authResponse = await authService.verifyEmail(email.trim(), cleanPin);
      setSuccessNotice('Xác thực tài khoản thành công! Đang chuyển hướng vào studio…');
      setTimeout(() => {
        handleAuthTransition(authResponse);
      }, 600);
    } catch (err: any) {
      console.error('Lỗi xác thực mã PIN:', err);
      setServerError(err.message || 'Mã PIN không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Resend Verification PIN
  const handleResendPin = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setServerError(null);
    setSuccessNotice(null);

    setIsLoading(true);
    try {
      const res = await authService.resendVerification(email.trim());
      setSuccessNotice(res.message || 'Mã PIN mới đã được gửi tới email của bạn!');
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Lỗi gửi lại PIN:', err);
      setServerError(err.message || 'Không thể gửi lại mã PIN. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Google Sign In (Auto registers new user on backend)
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
      console.error('Lỗi đăng ký qua Google:', err);
      setServerError(err.message || 'Đăng ký qua Google thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='w-full'>
      {/* Brand Header */}
      <div className='mb-7'>
        <div className='flex items-center gap-3 mb-3'>
          <BrandMark size={36} className='shrink-0' />
          <div>
            <span className='font-serif text-2xl font-bold tracking-tight text-[#171717]'>
              PanelForge
            </span>
            <p className='text-xs text-[#777169] font-medium'>Không gian sản xuất truyện tranh</p>
          </div>
        </div>

        {step === 'register' ? (
          <div>
            <h1
              id='auth-dialog-title'
              className='text-2xl sm:text-3xl font-serif font-light text-[#0c0a09] tracking-tight'
            >
              Bắt đầu câu chuyện <em className='font-light italic text-[#292524]'>mới</em>
            </h1>
            <p className='text-xs sm:text-sm text-[#777169] mt-1'>
              Tạo tài khoản để cộng tác cùng studio của bạn.
            </p>
          </div>
        ) : (
          <div>
            <div className='flex items-center gap-2 mb-1'>
              <button
                type='button'
                onClick={() => setStep('register')}
                className='text-[#777169] hover:text-[#171717] transition-colors p-1 -ml-1 rounded-md'
                title='Quay lại form đăng ký'
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
              <h1 className='text-2xl font-serif font-bold text-[#171717] tracking-tight'>
                Kiểm tra email để kích hoạt
              </h1>
            </div>
            <p className='text-xs text-[#777169] mt-1 leading-relaxed'>
              Nhập mã PIN 6 số đã được gửi đến hộp thư:{' '}
              <span className='font-mono font-bold text-[#171717]'>{email}</span>
            </p>
          </div>
        )}
      </div>

      {/* Global Alerts */}
      {successNotice && (
        <div
          role='status'
          className='mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in'
        >
          <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
          <span>{successNotice}</span>
        </div>
      )}

      {serverError && (
        <div
          role='alert'
          className='mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in'
        >
          <AlertCircle className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
          <span>{serverError}</span>
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 1: FORM ĐĂNG KÝ                                            */}
      {/* ================================================================ */}
      {step === 'register' && (
        <form onSubmit={handleRegisterSubmit} className='space-y-3.5'>
          {/* Họ và tên */}
          <div>
            <label
              htmlFor='register-fullname'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Họ và tên <span className='text-red-500'>*</span>
            </label>
            <input
              id='register-fullname'
              type='text'
              autoComplete='name'
              maxLength={100}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
              }}
              placeholder='Eiichiro Oda'
              required
              aria-describedby={fieldErrors.fullName ? 'register-fullname-error' : undefined}
              aria-invalid={!!fieldErrors.fullName}
              disabled={isLoading}
              className={`w-full px-3.5 py-2.5 bg-white border ${
                fieldErrors.fullName
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-[#E7E5E4] focus:border-[#F97316] focus:ring-[#F97316]/20'
              } rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A8A29E] outline-none focus:ring-2 transition-all shadow-xs`}
            />
            {fieldErrors.fullName && (
              <p id='register-fullname-error' className='mt-1 text-xs text-red-600'>
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor='register-email'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Email <span className='text-red-500'>*</span>
            </label>
            <input
              id='register-email'
              type='email'
              autoComplete='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              placeholder='creator@studio.com'
              required
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              aria-invalid={!!fieldErrors.email}
              disabled={isLoading}
              className={`w-full px-3.5 py-2.5 bg-white border ${
                fieldErrors.email
                  ? 'border-red-400 focus:ring-red-400'
                  : 'border-[#E7E5E4] focus:border-[#F97316] focus:ring-[#F97316]/20'
              } rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A8A29E] outline-none focus:ring-2 transition-all shadow-xs`}
            />
            {fieldErrors.email && (
              <p id='register-email-error' className='mt-1 text-xs text-red-600'>
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Mật khẩu */}
          <div>
            <label
              htmlFor='register-password'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Mật khẩu <span className='text-red-500'>*</span>
            </label>
            <div className='relative'>
              <input
                id='register-password'
                type={showPassword ? 'text' : 'password'}
                autoComplete='new-password'
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder='••••••••'
                required
                aria-describedby='register-password-requirements'
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

            {/* Password checklist (tick dần khi gõ) */}
            <div
              id='register-password-requirements'
              className='mt-2 p-2.5 rounded-lg bg-stone-100/70 border border-stone-200/80 space-y-1'
            >
              <div className='text-[10px] font-mono uppercase font-semibold text-stone-500 mb-1'>
                Yêu cầu mật khẩu:
              </div>
              <div className='flex items-center gap-2 text-xs'>
                {hasMinLength ? (
                  <Check className='w-3.5 h-3.5 text-emerald-600 shrink-0' />
                ) : (
                  <span className='w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0 inline-block' />
                )}
                <span className={hasMinLength ? 'text-emerald-700 font-medium' : 'text-stone-500'}>
                  Ít nhất 6 ký tự
                </span>
              </div>

              <div className='flex items-center gap-2 text-xs'>
                {hasUppercase ? (
                  <Check className='w-3.5 h-3.5 text-emerald-600 shrink-0' />
                ) : (
                  <span className='w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0 inline-block' />
                )}
                <span className={hasUppercase ? 'text-emerald-700 font-medium' : 'text-stone-500'}>
                  Ít nhất 1 chữ cái viết hoa (A-Z)
                </span>
              </div>

              <div className='flex items-center gap-2 text-xs'>
                {hasSpecialChar ? (
                  <Check className='w-3.5 h-3.5 text-emerald-600 shrink-0' />
                ) : (
                  <span className='w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0 inline-block' />
                )}
                <span
                  className={hasSpecialChar ? 'text-emerald-700 font-medium' : 'text-stone-500'}
                >
                  Ít nhất 1 ký tự đặc biệt (ví dụ: !@#$%^&*...)
                </span>
              </div>
            </div>
            {fieldErrors.password && (
              <p className='mt-1 text-xs text-red-600'>{fieldErrors.password}</p>
            )}
          </div>

          {/* Xác nhận mật khẩu (báo lệch ngay khi blur) */}
          <div>
            <label
              htmlFor='register-confirm-password'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Xác nhận mật khẩu <span className='text-red-500'>*</span>
            </label>
            <div className='relative'>
              <input
                id='register-confirm-password'
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete='new-password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={handleConfirmPasswordBlur}
                placeholder='Nhập lại mật khẩu vừa tạo'
                required
                aria-describedby={
                  fieldErrors.confirmPassword ? 'register-confirm-error' : undefined
                }
                aria-invalid={!!fieldErrors.confirmPassword}
                disabled={isLoading}
                className={`w-full pl-3.5 pr-10 py-2.5 bg-white border ${
                  fieldErrors.confirmPassword
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-[#E7E5E4] focus:border-[#F97316] focus:ring-[#F97316]/20'
                } rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A8A29E] outline-none focus:ring-2 transition-all shadow-xs`}
              />
              <button
                type='button'
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className='absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#777169] hover:text-[#171717] transition-colors cursor-pointer rounded-md'
              >
                {showConfirmPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p id='register-confirm-error' className='mt-1 text-xs text-red-600'>
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          {/* Số điện thoại (tùy chọn) */}
          <div>
            <label
              htmlFor='register-phone'
              className='block text-xs font-semibold text-[#171717] mb-1'
            >
              Số điện thoại <span className='text-stone-400 font-normal'>(Tùy chọn)</span>
            </label>
            <input
              id='register-phone'
              type='tel'
              autoComplete='tel'
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (fieldErrors.phoneNumber)
                  setFieldErrors((p) => ({ ...p, phoneNumber: undefined }));
              }}
              placeholder='+84 901 234 567'
              disabled={isLoading}
              className='w-full px-3.5 py-2.5 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl text-xs sm:text-sm text-[#171717] placeholder:text-[#A8A29E] outline-none transition-all shadow-xs'
            />
            {fieldErrors.phoneNumber && (
              <p className='mt-1 text-xs text-red-600'>{fieldErrors.phoneNumber}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type='submit'
            disabled={isLoading}
            className='w-full mt-3 py-3 px-4 bg-[#292524] hover:bg-[#0c0a09] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-soft-sm flex items-center justify-center gap-2 cursor-pointer'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang tạo tài khoản…</span>
              </>
            ) : (
              <span>Đăng ký tài khoản</span>
            )}
          </button>

          {/* Divider "hoặc" */}
          <div className='relative flex items-center justify-center my-3.5'>
            <div className='w-full border-t border-[#E7E5E4]' />
            <span className='absolute bg-[#FAF8F5] px-3 text-[11px] font-mono text-[#777169] uppercase tracking-wider'>
              hoặc
            </span>
          </div>

          {/* Google Sign In Button */}
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
            <span>Đăng ký với Google</span>
          </button>

          {/* Switch to login */}
          <div className='text-center pt-3'>
            <p className='text-xs text-[#777169]'>
              Đã có tài khoản?{' '}
              <Link
                to={`/login${location.search}`}
                replace
                className='font-semibold text-[#171717] hover:text-[#F97316] hover:underline'
              >
                Đăng nhập
              </Link>
            </p>
          </div>
        </form>
      )}

      {/* ================================================================ */}
      {/* STEP 2: NHẬP MÃ PIN XÁC THỰC EMAIL                              */}
      {/* ================================================================ */}
      {step === 'verify_pin' && (
        <form onSubmit={handleVerifyPinSubmit} className='space-y-4'>
          <div>
            <div className='flex items-center justify-between mb-1.5'>
              <label htmlFor='register-pin' className='block text-xs font-semibold text-[#171717]'>
                Mã PIN bảo mật 6 số
              </label>
              <span className='text-[11px] font-mono text-stone-500'>Hạn 15 phút</span>
            </div>
            <input
              id='register-pin'
              type='text'
              inputMode='numeric'
              pattern='[0-9]*'
              maxLength={6}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
              placeholder='••••••'
              autoFocus
              required
              disabled={isLoading}
              className='w-full text-center text-3xl font-mono font-bold tracking-[0.5em] py-3.5 px-4 bg-white border border-[#E7E5E4] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 rounded-xl outline-none transition-all shadow-xs'
            />
            <p className='text-[11px] text-[#777169] text-center mt-2'>
              Kiểm tra hộp thư chính hoặc thư rác (Spam).
            </p>
          </div>

          <button
            type='submit'
            disabled={isLoading || pinCode.trim().length !== 6}
            className='w-full py-3 px-4 bg-[#292524] hover:bg-[#0c0a09] disabled:bg-stone-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-soft-sm flex items-center justify-center gap-2 cursor-pointer'
          >
            {isLoading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Đang xác thực mã PIN…</span>
              </>
            ) : (
              <span>Xác thực & Vào Studio</span>
            )}
          </button>

          {/* Gửi lại mã PIN */}
          <div className='pt-2 text-center'>
            <button
              type='button'
              onClick={handleResendPin}
              disabled={resendCooldown > 0 || isLoading}
              className='inline-flex items-center gap-1.5 text-xs text-[#777169] hover:text-[#171717] disabled:text-stone-400 font-medium cursor-pointer transition-colors'
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>
                {resendCooldown > 0
                  ? `Gửi lại mã sau (${resendCooldown}s)`
                  : 'Chưa nhận được mã? Gửi lại'}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
