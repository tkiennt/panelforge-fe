import React, { useState } from 'react';
import { Shield, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

interface LoginViewProps {
  mode: 'login' | 'register';
  onLogin: () => void;
  onBack: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ mode, onLogin, onBack }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin();
    }, 1000);
  };

  return (
    <div className='h-screen w-full bg-[#FAF8F4] flex flex-col items-center justify-center relative overflow-hidden'>
      <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F97316] via-[#8B5CF6] to-[#10B981]'></div>

      <button
        onClick={onBack}
        className='absolute top-6 left-6 flex items-center gap-2 text-xs font-bold text-[#888888] hover:text-[#171717] transition-colors cursor-pointer z-20'
      >
        <ArrowLeft className='w-4 h-4' /> Quay lại trang chủ
      </button>

      <div className='bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-[#E7E7E7] max-w-md w-full w-[90%] text-center z-10 animate-in fade-in zoom-in-95 duration-500'>
        <div className='w-16 h-16 bg-[#171717] text-white font-bold text-2xl rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md ring-4 ring-gray-50'>
          PF
        </div>
        <h1 className='text-2xl font-display font-bold text-[#171717] mb-1'>
          {mode === 'login' ? 'Đăng nhập PanelForge' : 'Đăng ký Tài khoản'}
        </h1>
        <p className='text-xs text-[#888888] mb-8 font-mono tracking-wider'>
          STUDIO PRODUCTION HUB
        </p>

        <form onSubmit={handleLoginSubmit} className='space-y-4 mb-8 text-left'>
          <div>
            <label className='block text-[10px] font-mono font-bold text-[#888888] uppercase mb-1.5 ml-1'>
              Mã Studio (Studio ID)
            </label>
            <input
              type='text'
              defaultValue='mappa_studio_01'
              className='w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E7E7E7] rounded-xl text-sm font-mono text-[#555555] outline-none'
            />
          </div>
          <div>
            <label className='block text-[10px] font-mono font-bold text-[#888888] uppercase mb-1.5 ml-1'>
              Khóa truy cập (Passkey)
            </label>
            <input
              type='password'
              defaultValue='••••••••••••'
              className='w-full px-4 py-2.5 bg-[#F8F6F0] border border-[#E7E7E7] rounded-xl text-sm outline-none tracking-widest'
            />
          </div>

          <button
            type='submit'
            disabled={isLoggingIn}
            className='w-full py-3 mt-4 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-80'
          >
            {isLoggingIn ? (
              <Loader2 className='w-4 h-4 animate-spin' />
            ) : (
              <Shield className='w-4 h-4' />
            )}
            {isLoggingIn
              ? 'Đang xác thực...'
              : mode === 'login'
                ? 'Đăng nhập vào Hệ thống'
                : 'Hoàn tất Đăng ký'}
            {!isLoggingIn && <ArrowRight className='w-4 h-4 ml-1' />}
          </button>
        </form>
      </div>
    </div>
  );
};
