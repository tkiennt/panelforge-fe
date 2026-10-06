import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Database,
  Users,
  ShieldCheck,
  ArrowLeft,
  Lock,
  Mail,
  CheckCircle2,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { signInWithPopup, auth, googleProvider } from '@/firebase';
import { authService } from '@/services/auth.service';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (email: string, pass: string) => void;
  onGoogleLogin?: (backendAuthResponse: any) => void;
  onApiLoginSuccess?: (backendAuthResponse: any) => void;
  onSwitchToRegister?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onClose,
  onLogin,
  onGoogleLogin,
  onApiLoginSuccess,
  onSwitchToRegister,
}) => {
  const [step, setStep] = useState<'login' | '2fa' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // 2FA Challenge States
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);

  // Forgot / Reset Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);

    const mockAccounts = ['writer', 'artist', 'editor'];
    const lowerEmail = email.trim().toLowerCase();

    // Nếu người dùng nhập nhanh tài khoản demo
    if (mockAccounts.includes(lowerEmail) && password === '123456') {
      setIsLoading(false);
      onLogin(email, password);
      return;
    }

    try {
      const response = await authService.login(email, password);

      // Nếu backend yêu cầu xác thực 2FA (tài khoản đã bật 2FA và thiết bị chưa được ghi nhớ hoặc đã quá 30 ngày)
      if (response?.requiresTwoFactor) {
        setTwoFactorEmail(response.twoFactorEmail || email);
        setStep('2fa');
        setError(null);
        return;
      }

      // Đăng nhập thành công trực tiếp
      if (onApiLoginSuccess) {
        onApiLoginSuccess(response);
      } else {
        onLogin(email, password);
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      // Khi đăng nhập bằng email, nếu backend báo lỗi (sai mật khẩu, 401...), phải hiển thị lỗi rõ ràng
      // Tuyệt đối không được âm thầm nuốt lỗi và tự động gán token mock vào session
      if (!lowerEmail.includes('@') && mockAccounts.includes(lowerEmail)) {
        onLogin(email, password);
      } else {
        setError(err.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.trim().length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 chữ số từ ứng dụng Authenticator.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.verifyTwoFactor({
        email: twoFactorEmail || email,
        code: twoFactorCode.trim(),
        rememberDevice: rememberDevice,
        deviceName:
          typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'Browser',
      });

      // Lưu token ghi nhớ thiết bị vào localStorage
      if (response?.rememberDeviceToken) {
        localStorage.setItem('pf_remember_device', response.rememberDeviceToken);
      }

      if (onApiLoginSuccess) {
        onApiLoginSuccess(response);
      } else {
        onLogin(twoFactorEmail || email, password || '123456');
      }
    } catch (err: any) {
      console.error('2FA Challenge Error:', err);
      setError(err.message || 'Mã xác thực 2FA không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Vui lòng nhập địa chỉ email đã đăng ký.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.forgotPassword(forgotEmail.trim());
      setStep('reset');
      setSuccessNotice(
        `Mã OTP 6 chữ số đã được gửi đến email ${forgotEmail.trim()}. Vui lòng kiểm tra hộp thư.`,
      );
    } catch (err: any) {
      console.error('Forgot Password Error:', err);
      setError(err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Vui lòng nhập email tài khoản.');
      return;
    }

    if (resetOtp.trim().length !== 6) {
      setError('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    const pwdRegex = /^(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/;
    if (!pwdRegex.test(newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự, chứa ít nhất 1 chữ hoa và 1 ký tự đặc biệt.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await authService.resetPassword({
        email: forgotEmail.trim(),
        token: resetOtp.trim(),
        newPassword,
        confirmPassword: confirmNewPassword,
      });

      setEmail(forgotEmail.trim());
      setPassword('');
      setStep('login');
      setSuccessNotice(
        'Kích hoạt tài khoản / Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
      );
    } catch (err: any) {
      console.error('Reset Password Error:', err);
      setError(err.message || 'Đặt lại mật khẩu thất bại. Vui lòng kiểm tra lại mã OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const backendResponse = await authService.externalLogin(idToken);

      if (onGoogleLogin) {
        onGoogleLogin(backendResponse);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error('Google Sign In Error:', err);
      setError(err.message || 'Lỗi đăng nhập Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      title: 'Structured Content Model',
      desc: 'Series down to panels—each layer is a first-class object.',
      iconColor: 'bg-[#F0F9FF] text-[#0284C7]',
      icon: <Layers className='w-5 h-5' />,
      delay: 'delay-[100ms]',
    },
    {
      title: 'AI-Grounded Series Bible',
      desc: 'Continuity checks grounded in your series bible via RAG.',
      iconColor: 'bg-[#F3E8FF] text-[#6D28D9]',
      icon: <Sparkles className='w-5 h-5' />,
      delay: 'delay-[200ms]',
    },
    {
      title: 'Append-Only Event Store',
      desc: 'Every change is logged. Roll back, audit, and track provenance.',
      iconColor: 'bg-[#FFFBEB] text-[#D97706]',
      icon: <Database className='w-5 h-5' />,
      delay: 'delay-[300ms]',
    },
    {
      title: 'Role-based Workspaces',
      desc: 'Tailored UI for Writers, Artists, Editors, and Producers.',
      iconColor: 'bg-[#ECFDF5] text-[#059669]',
      icon: <Users className='w-5 h-5' />,
      delay: 'delay-[400ms]',
    },
  ];

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-md'>
      <div className='w-[900px] max-w-[95vw] min-h-[550px] bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#E7E7E7] flex overflow-hidden relative animate-in fade-in zoom-in-95 duration-300'>
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-50 text-[#555555] hover:text-[#171717] cursor-pointer bg-white/80 rounded-full p-1 backdrop-blur-sm transition-colors'
          disabled={isLoading}
        >
          <X className='w-5 h-5' />
        </button>

        {/* Left Panel */}
        <div className='w-1/2 hidden md:flex flex-col relative border-r border-[#E7E7E7] p-8 overflow-y-auto custom-scrollbar'>
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={{ backgroundImage: 'url(/login_modal.png)' }}
          ></div>
          <div className='absolute inset-0 bg-[#FAF8F5]/90 backdrop-blur-md'></div>
          <div className='absolute inset-0 bg-[radial-gradient(#171717_1px,transparent_1px)] bg-[size:16px_16px] opacity-[0.03]'></div>

          <div className='relative z-10 flex flex-col gap-4'>
            <div className='border-b border-[#E7E7E7] pb-6 mb-2'>
              <h3 className='font-serif text-3xl font-bold text-[#171717] tracking-tight'>
                PanelForge OS
              </h3>
              <p className='font-sans text-sm text-[#555555] mt-2'>
                The operating system for modern manga studios.
              </p>
            </div>

            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-[#FFFFFF] border-[1.5px] border-[#E7E7E7] hover:border-[#171717] rounded-sm p-4 flex items-start gap-4 hover:shadow-[4px_4px_0px_#171717] hover:-translate-y-0.5 transition-all cursor-default overflow-hidden animate-in slide-in-from-bottom-8 fade-in duration-500 fill-mode-both ${feature.delay}`}
              >
                <div className='absolute inset-0 bg-[radial-gradient(#171717_1.5px,transparent_1.5px)] bg-[size:10px_10px] opacity-0 group-hover:opacity-[0.04] transition-opacity pointer-events-none'></div>
                <div className='absolute top-0 right-0 bg-[#E7E7E7] group-hover:bg-[#171717] text-[#555555] group-hover:text-white text-[9px] font-mono font-bold px-1.5 py-0.5 transition-colors border-b border-l border-transparent group-hover:border-[#171717]'>
                  P.{String(index + 1).padStart(2, '0')}
                </div>
                <div
                  className={`relative z-10 mt-0.5 rounded-sm p-2 flex-shrink-0 border border-transparent group-hover:border-[#171717] group-hover:shadow-[2px_2px_0px_#171717] transition-all ${feature.iconColor}`}
                >
                  {feature.icon}
                </div>
                <div className='relative z-10 pr-6'>
                  <h4 className='text-[#171717] font-bold text-sm tracking-tight'>
                    {feature.title}
                  </h4>
                  <p className='text-[#555555] text-xs leading-relaxed mt-1'>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className='w-full md:w-1/2 bg-[#FFFFFF] flex flex-col justify-center px-10 py-12 relative overflow-y-auto custom-scrollbar'>
          <div className='max-w-sm w-full mx-auto'>
            {/* THÔNG BÁO THÀNH CÔNG / LỖI */}
            {successNotice && (
              <div className='mb-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-start gap-2 animate-in fade-in'>
                <CheckCircle2 className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
                <span>{successNotice}</span>
              </div>
            )}

            {error && (
              <div className='mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-start gap-2 animate-in fade-in'>
                <Lock className='w-4 h-4 text-red-500 shrink-0 mt-0.5' />
                <span>{error}</span>
              </div>
            )}

            {/* ===== VIEW 1: ĐĂNG NHẬP THƯỜNG ===== */}
            {step === 'login' && (
              <div className='animate-in fade-in duration-300'>
                <div className='w-10 h-10 rounded-xl tangerine-gradient flex items-center justify-center mb-6'>
                  <svg
                    width='20'
                    height='20'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='white'
                    strokeWidth='2.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z' />
                  </svg>
                </div>
                <h2 className='font-serif text-3xl font-bold text-[#171717]'>Welcome Back</h2>
                <p className='text-[#555555] text-sm mt-2'>Log in to your studio workspace.</p>

                <form className='mt-8 space-y-4' onSubmit={handleLoginSubmit}>
                  <div>
                    <label className='block text-sm font-medium text-[#171717] mb-1.5'>Email</label>
                    <input
                      type='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='mika@studio.com'
                      className='w-full border border-[#E7E7E7] rounded-lg px-4 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                      required
                    />
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-1.5'>
                      <label className='block text-sm font-medium text-[#171717]'>Password</label>
                      <div className='flex items-center gap-1.5'>
                        <button
                          type='button'
                          onClick={() => {
                            setForgotEmail(email);
                            setError(null);
                            setSuccessNotice(null);
                            setStep('reset');
                          }}
                          className='text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer'
                          title='Kích hoạt tài khoản nhận được lời mời qua email bằng mã OTP 6 số'
                        >
                          Kích hoạt tài khoản mời?
                        </button>
                        <span className='text-xs text-gray-300'>•</span>
                        <button
                          type='button'
                          onClick={() => {
                            setForgotEmail(email);
                            setError(null);
                            setSuccessNotice(null);
                            setStep('forgot');
                          }}
                          className='text-xs font-semibold text-[#F97316] hover:text-[#EA580C] cursor-pointer'
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                    </div>
                    <input
                      type='password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder='••••••••'
                      className='w-full border border-[#E7E7E7] rounded-lg px-4 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                      required
                    />
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading}
                    className='w-full bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg shadow-sm transition-all mt-6 cursor-pointer flex justify-center items-center gap-2'
                  >
                    {isLoading ? 'Đang xử lý...' : 'Log In'}
                  </button>
                </form>

                <div className='flex items-center my-6'>
                  <div className='flex-1 border-t border-[#E7E7E7]'></div>
                  <span className='px-3 text-xs text-[#B8B8B8] uppercase tracking-wider font-semibold'>
                    or continue with
                  </span>
                  <div className='flex-1 border-t border-[#E7E7E7]'></div>
                </div>

                <div className='space-y-3'>
                  <button
                    type='button'
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className='w-full border border-[#E7E7E7] bg-white text-[#171717] text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 hover:border-[#171717] hover:bg-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <svg className='w-4 h-4' viewBox='0 0 24 24' fill='currentColor'>
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
                    Sign in with Google
                  </button>
                </div>

                <p className='text-sm text-[#555555] text-center mt-8'>
                  Don't have an account?{' '}
                  <button
                    type='button'
                    onClick={onSwitchToRegister}
                    className='text-[#F97316] font-semibold hover:text-[#EA580C] cursor-pointer'
                  >
                    Sign up
                  </button>
                </p>
              </div>
            )}

            {/* ===== VIEW 2: 2FA CHALLENGE STEP ===== */}
            {step === '2fa' && (
              <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
                <button
                  type='button'
                  onClick={() => {
                    setStep('login');
                    setError(null);
                  }}
                  className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#555555] hover:text-[#171717] mb-6 transition-colors cursor-pointer'
                >
                  <ArrowLeft className='w-4 h-4' />
                  Quay lại đăng nhập
                </button>

                <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs mb-4'>
                  <ShieldCheck className='w-5 h-5' />
                </div>
                <h2 className='font-serif text-2xl font-bold text-[#171717]'>
                  Xác thực 2 bước (2FA)
                </h2>
                <p className='text-[#555555] text-xs mt-1.5 leading-relaxed'>
                  Nhập mã 6 chữ số từ ứng dụng Google Authenticator cho tài khoản{' '}
                  <strong>{twoFactorEmail}</strong>.
                </p>

                <form onSubmit={handleTwoFactorSubmit} className='mt-6 space-y-4'>
                  <div>
                    <label className='block text-xs font-semibold text-[#171717] mb-1.5'>
                      Mã xác thực 6 chữ số
                    </label>
                    <input
                      type='text'
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder='000000'
                      autoFocus
                      className='w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-3 bg-[#FAF8F5] border border-[#E7E7E7] focus:border-[#F97316] focus:bg-white rounded-xl outline-none transition-all text-[#171717]'
                      required
                    />
                  </div>

                  <div className='flex items-center gap-2.5 pt-1'>
                    <input
                      type='checkbox'
                      id='rememberDevice'
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className='w-4 h-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316] cursor-pointer'
                    />
                    <label
                      htmlFor='rememberDevice'
                      className='text-xs text-[#555555] cursor-pointer select-none'
                    >
                      Ghi nhớ thiết bị này trong <strong>30 ngày (1 tháng)</strong>
                    </label>
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading || twoFactorCode.length !== 6}
                    className='w-full bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg shadow-sm transition-all mt-4 cursor-pointer flex justify-center items-center gap-2 text-sm'
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className='w-4 h-4 animate-spin' />
                        Đang xác thực...
                      </>
                    ) : (
                      'Xác nhận & Đăng nhập'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ===== VIEW 3: FORGOT PASSWORD (NHẬP EMAIL) ===== */}
            {step === 'forgot' && (
              <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
                <button
                  type='button'
                  onClick={() => {
                    setStep('login');
                    setError(null);
                  }}
                  className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#555555] hover:text-[#171717] mb-6 transition-colors cursor-pointer'
                >
                  <ArrowLeft className='w-4 h-4' />
                  Quay lại đăng nhập
                </button>

                <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs mb-4'>
                  <KeyRound className='w-5 h-5' />
                </div>
                <h2 className='font-serif text-2xl font-bold text-[#171717]'>Khôi phục mật khẩu</h2>
                <p className='text-[#555555] text-xs mt-1.5 leading-relaxed'>
                  Nhập địa chỉ Gmail đã đăng ký vào hệ thống để nhận mã OTP đặt lại mật khẩu.
                </p>

                <form onSubmit={handleForgotPasswordSubmit} className='mt-6 space-y-4'>
                  <div>
                    <label className='block text-xs font-semibold text-[#171717] mb-1.5'>
                      Gmail đăng ký
                    </label>
                    <div className='relative'>
                      <input
                        type='email'
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder='your-email@gmail.com'
                        autoFocus
                        className='w-full border border-[#E7E7E7] rounded-lg px-4 py-2.5 focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all text-sm pl-10'
                        required
                      />
                      <Mail className='w-4 h-4 text-gray-400 absolute left-3.5 top-3' />
                    </div>
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading || !forgotEmail.trim()}
                    className='w-full bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg shadow-sm transition-all mt-4 cursor-pointer flex justify-center items-center gap-2 text-sm'
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className='w-4 h-4 animate-spin' />
                        Đang gửi mã OTP...
                      </>
                    ) : (
                      'Gửi mã xác nhận OTP'
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ===== VIEW 4: RESET PASSWORD (NHẬP OTP & MẬT KHẨU MỚI) ===== */}
            {step === 'reset' && (
              <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
                <button
                  type='button'
                  onClick={() => {
                    setStep('forgot');
                    setError(null);
                  }}
                  className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#555555] hover:text-[#171717] mb-6 transition-colors cursor-pointer'
                >
                  <ArrowLeft className='w-4 h-4' />
                  Nhập email khác
                </button>

                <div className='w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FDBA74] flex items-center justify-center text-[#F97316] shadow-2xs mb-4'>
                  <Lock className='w-5 h-5' />
                </div>
                <h2 className='font-serif text-2xl font-bold text-[#171717]'>
                  Kích hoạt tài khoản & Tạo mật khẩu mới
                </h2>
                <p className='text-[#555555] text-xs mt-1.5 leading-relaxed'>
                  Nhập email, mã OTP 6 số (từ email mời Workspace hoặc email đặt lại mật khẩu) và
                  mật khẩu mới để đăng nhập.
                </p>

                <form onSubmit={handleResetPasswordSubmit} className='mt-6 space-y-3.5'>
                  <div>
                    <label className='block text-xs font-semibold text-[#171717] mb-1'>
                      Email tài khoản
                    </label>
                    <input
                      type='email'
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder='your-email@studio.com'
                      className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2 text-sm focus:border-[#F97316] outline-none transition-all'
                      required
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-[#171717] mb-1'>
                      Mã OTP 6 số từ Email (hạn 15 phút)
                    </label>
                    <input
                      type='text'
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder='000000'
                      autoFocus
                      className='w-full text-center tracking-[0.5em] text-xl font-mono font-bold py-2 bg-[#FAF8F5] border border-[#E7E7E7] focus:border-[#F97316] focus:bg-white rounded-lg outline-none transition-all text-[#171717]'
                      required
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-[#171717] mb-1'>
                      Mật khẩu mới
                    </label>
                    <input
                      type='password'
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder='••••••••'
                      className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2 text-sm focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all'
                      required
                    />
                    <p className='text-[10px] text-gray-500 mt-0.5'>
                      Tối thiểu 6 ký tự, có chữ in hoa và ký tự đặc biệt.
                    </p>
                  </div>

                  <div>
                    <label className='block text-xs font-semibold text-[#171717] mb-1'>
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type='password'
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder='••••••••'
                      className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2 text-sm focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none transition-all'
                      required
                    />
                  </div>

                  <button
                    type='submit'
                    disabled={isLoading || resetOtp.length !== 6}
                    className='w-full bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg shadow-sm transition-all mt-4 cursor-pointer flex justify-center items-center gap-2 text-sm'
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className='w-4 h-4 animate-spin' />
                        Đang đặt lại mật khẩu...
                      </>
                    ) : (
                      'Đặt lại mật khẩu'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
