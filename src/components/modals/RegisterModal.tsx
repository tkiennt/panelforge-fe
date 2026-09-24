import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Database,
  Users,
  KeyRound,
  MailCheck,
  ArrowRight,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { signInWithPopup, auth, googleProvider } from '../../firebase';
import { authService } from '../../services/auth.service';

interface RegisterModalProps {
  onClose: () => void;
  onSuccess: (authResponse: any) => void;
  onSwitchToLogin?: () => void;
  initialEmail?: string;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  onClose,
  onSuccess,
  onSwitchToLogin,
  initialEmail = '',
}) => {
  // Mode: 'register' (Form nhập thông tin) hoặc 'verify_pin' (Form nhập mã OTP 6 số)
  const [step, setStep] = useState<'register' | 'verify_pin'>('register');

  // Register form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // PIN verification states
  const [pinCode, setPinCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Đếm ngược cho nút gửi lại mã PIN
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Xử lý gửi form đăng ký tài khoản
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Kiểm tra mật khẩu cơ bản
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.register(
        email.trim(),
        password,
        fullName.trim(),
        phoneNumber.trim() || undefined,
      );

      setSuccessMsg(
        res.message || 'Đăng ký thành công! Vui lòng nhập mã PIN 6 số đã được gửi đến email.',
      );
      setStep('verify_pin');
      setResendCooldown(60); // Đặt 60s trước khi cho phép gửi lại
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý xác thực mã PIN
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPin = pinCode.trim();
    if (cleanPin.length !== 6) {
      setError('Vui lòng nhập đầy đủ mã PIN gồm 6 chữ số.');
      return;
    }

    try {
      setIsLoading(true);
      const authResponse = await authService.verifyEmail(email.trim(), cleanPin);
      setSuccessMsg('Xác thực tài khoản thành công! Đang chuyển hướng...');

      setTimeout(() => {
        onSuccess(authResponse);
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Mã PIN không chính xác hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý gửi lại mã PIN
  const handleResendPin = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setError(null);
    setSuccessMsg(null);

    try {
      setIsLoading(true);
      const res = await authService.resendVerification(email.trim());
      setSuccessMsg(res.message || 'Mã PIN mới đã được gửi tới email của bạn!');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi lại mã PIN. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng nhập nhanh bằng Google
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const backendResponse = await authService.externalLogin(idToken);
      onSuccess(backendResponse);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error('Google Sign In Error:', err);
      setError(err.message || 'Lỗi đăng nhập qua Google.');
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
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#171717]/40 backdrop-blur-md animate-in fade-in duration-200'>
      <div className='w-[900px] max-w-[95vw] min-h-[580px] bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#E7E7E7] flex overflow-hidden relative animate-in zoom-in-95 duration-300'>
        {/* Nút đóng modal */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-50 text-[#555555] hover:text-[#171717] cursor-pointer bg-white/80 rounded-full p-1 backdrop-blur-sm transition-colors'
          disabled={isLoading}
          aria-label='Close'
        >
          <X className='w-5 h-5' />
        </button>

        {/* LEFT PANEL: Concept Manga Studio OS */}
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

        {/* RIGHT PANEL: GIAO DIỆN REGISTER HOẶC NHẬP MÃ PIN */}
        <div className='w-full md:w-1/2 bg-[#FFFFFF] flex flex-col justify-center px-8 md:px-10 py-10 relative overflow-y-auto custom-scrollbar'>
          <div className='max-w-sm w-full mx-auto'>
            {/* Header Icon */}
            <div className='w-10 h-10 rounded-xl tangerine-gradient flex items-center justify-center mb-5 shadow-xs'>
              {step === 'register' ? (
                <KeyRound className='w-5 h-5 text-white' />
              ) : (
                <MailCheck className='w-5 h-5 text-white' />
              )}
            </div>

            {/* Title & Subtitle */}
            {step === 'register' ? (
              <>
                <h2 className='font-serif text-3xl font-bold text-[#171717]'>Create Account</h2>
                <p className='text-[#555555] text-sm mt-1.5'>
                  Join PanelForge studio to start serializing.
                </p>
              </>
            ) : (
              <>
                <div className='flex items-center gap-2 mb-1'>
                  <button
                    onClick={() => setStep('register')}
                    className='text-[#888888] hover:text-[#171717] transition-colors p-1 -ml-1 rounded-md hover:bg-[#FAF8F5]'
                    title='Quay lại form đăng ký'
                  >
                    <ArrowLeft className='w-4 h-4' />
                  </button>
                  <h2 className='font-serif text-3xl font-bold text-[#171717]'>Verify PIN</h2>
                </div>
                <p className='text-[#555555] text-sm mt-1 leading-relaxed'>
                  Nhập mã PIN 6 số đã gửi tới <br />
                  <span className='font-semibold text-[#171717] font-mono'>{email}</span>
                </p>
              </>
            )}

            {/* Thông báo lỗi nếu có */}
            {error && (
              <div className='mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-start gap-2 animate-in fade-in duration-200'>
                <span className='font-bold mt-0.5'>•</span>
                <span>{error}</span>
              </div>
            )}

            {/* Thông báo thành công nếu có */}
            {successMsg && (
              <div className='mt-4 p-3 bg-emerald-50 text-emerald-700 text-xs rounded-lg border border-emerald-100 flex items-start gap-2 animate-in fade-in duration-200'>
                <CheckCircle2 className='w-4 h-4 shrink-0 text-emerald-600 mt-0.5' />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ================= STEP 1: FORM ĐĂNG KÝ ================= */}
            {step === 'register' ? (
              <form className='mt-6 space-y-3.5' onSubmit={handleRegister}>
                <div>
                  <label className='block text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1'>
                    Full Name
                  </label>
                  <input
                    type='text'
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder='Eiichiro Oda'
                    className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                    required
                  />
                </div>

                <div>
                  <label className='block text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1'>
                    Email
                  </label>
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder='creator@studio.com'
                    className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                    required
                  />
                </div>

                <div>
                  <label className='block text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1'>
                    Password
                  </label>
                  <input
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder='•••••••• (Tối thiểu 6 ký tự)'
                    className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                    required
                  />
                </div>

                <div>
                  <label className='block text-xs font-semibold uppercase tracking-wider text-[#555555] mb-1'>
                    Phone Number <span className='text-gray-400 font-normal'>(Tùy chọn)</span>
                  </label>
                  <input
                    type='tel'
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder='+84 901 234 567'
                    className='w-full border border-[#E7E7E7] rounded-lg px-3.5 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                  />
                </div>

                <button
                  type='submit'
                  disabled={isLoading}
                  className='w-full bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg shadow-sm transition-all mt-5 cursor-pointer flex justify-center items-center gap-2 text-sm'
                >
                  {isLoading ? 'Đang gửi mã PIN...' : 'Register & Receive PIN'}
                  {!isLoading && <ArrowRight className='w-4 h-4' />}
                </button>

                <div className='flex items-center my-4'>
                  <div className='flex-1 border-t border-[#E7E7E7]'></div>
                  <span className='px-3 text-[11px] text-[#B8B8B8] uppercase tracking-wider font-semibold'>
                    or continue with
                  </span>
                  <div className='flex-1 border-t border-[#E7E7E7]'></div>
                </div>

                <button
                  type='button'
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className='w-full border border-[#E7E7E7] bg-white text-[#171717] text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 hover:border-[#171717] hover:bg-[#FAF8F5] transition-colors cursor-pointer disabled:opacity-50'
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

                <p className='text-xs text-[#555555] text-center mt-5'>
                  Already have an account?{' '}
                  <button
                    type='button'
                    onClick={onSwitchToLogin}
                    className='text-[#F97316] font-semibold hover:text-[#EA580C] cursor-pointer'
                  >
                    Log In
                  </button>
                </p>
              </form>
            ) : (
              /* ================= STEP 2: FORM NHẬP MÃ PIN ================= */
              <form className='mt-6 space-y-5' onSubmit={handleVerifyPin}>
                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <label className='block text-xs font-semibold uppercase tracking-wider text-[#555555]'>
                      6-Digit Security PIN
                    </label>
                    <span className='text-[11px] text-[#888888] font-mono'>Hạn: 15 phút</span>
                  </div>

                  {/* Ô nhập PIN 6 số phong cách Manga Studio / Terminal Key */}
                  <input
                    type='text'
                    inputMode='numeric'
                    pattern='[0-9]*'
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPinCode(val);
                    }}
                    placeholder='••••••'
                    autoFocus
                    className='w-full text-center text-3xl font-mono font-bold tracking-[0.5em] py-3 px-4 bg-[#FAF8F5] border-2 border-[#E7E7E7] focus:border-[#F97316] focus:bg-white rounded-xl outline-none transition-all shadow-inner'
                    required
                  />
                  <p className='text-[11px] text-[#888888] text-center mt-2'>
                    Kiểm tra hộp thư đến (Inbox) hoặc thư rác (Spam)
                  </p>
                </div>

                <button
                  type='submit'
                  disabled={isLoading || pinCode.length !== 6}
                  className='w-full bg-[#F97316] hover:bg-[#EA580C] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg shadow-sm transition-all cursor-pointer flex justify-center items-center gap-2 text-sm'
                >
                  {isLoading ? 'Đang xác thực mã PIN...' : 'Verify PIN & Enter Studio'}
                  {!isLoading && <CheckCircle2 className='w-4 h-4' />}
                </button>

                {/* Gửi lại mã PIN */}
                <div className='pt-2 flex items-center justify-between text-xs text-[#555555] border-t border-[#E7E7E7]'>
                  <span>Chưa nhận được mã?</span>
                  <button
                    type='button'
                    onClick={handleResendPin}
                    disabled={resendCooldown > 0 || isLoading}
                    className='font-semibold text-[#F97316] hover:text-[#EA580C] disabled:text-[#888888] disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer'
                  >
                    <RotateCw
                      className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`}
                    />
                    {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : 'Gửi lại mã PIN'}
                  </button>
                </div>

                <div className='text-center pt-2'>
                  <button
                    type='button'
                    onClick={() => {
                      setStep('register');
                      setPinCode('');
                    }}
                    className='text-xs text-[#888888] hover:text-[#171717] underline cursor-pointer'
                  >
                    Đổi email khác
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
