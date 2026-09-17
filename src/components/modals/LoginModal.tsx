import React, { useState } from 'react';
import { X, Sparkles, Layers, Database, Users } from 'lucide-react';

import { signInWithPopup, auth, googleProvider } from '../../firebase';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (email: string, pass: string) => void;
  onGoogleLogin?: (user: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, onGoogleLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (onGoogleLogin) {
        onGoogleLogin(result.user);
      }
    } catch (error) {
      console.error('Google Sign In Error:', error);
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
        >
          <X className='w-5 h-5' />
        </button>

        {/* Left Panel */}
        <div className='w-1/2 hidden md:flex flex-col relative border-r border-[#E7E7E7] p-8 overflow-y-auto custom-scrollbar'>
          {/* Background Image & Blur Overlay */}
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
                {/* Halftone Hover Screentone */}
                <div className='absolute inset-0 bg-[radial-gradient(#171717_1.5px,transparent_1.5px)] bg-[size:10px_10px] opacity-0 group-hover:opacity-[0.04] transition-opacity pointer-events-none'></div>

                {/* Manga Panel Marker */}
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
        <div className='w-full md:w-1/2 bg-[#FFFFFF] flex flex-col justify-center px-10 py-12 relative'>
          <div className='max-w-sm w-full mx-auto'>
            {/* Header */}
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

            {/* Form */}
            <form
              className='mt-8 space-y-4'
              onSubmit={(e) => {
                e.preventDefault();
                onLogin(email, password);
              }}
            >
              <div>
                <label className='block text-sm font-medium text-[#171717] mb-1.5'>Email</label>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='mika@studio.com (try: writer/artist/editor)'
                  className='w-full border border-[#E7E7E7] rounded-lg px-4 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                  required
                />
              </div>
              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <label className='block text-sm font-medium text-[#171717]'>Password</label>
                  <a href='#' className='text-xs font-semibold text-[#F97316] hover:text-[#EA580C]'>
                    Forgot Password?
                  </a>
                </div>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='•••••••• (123456)'
                  className='w-full border border-[#E7E7E7] rounded-lg px-4 py-2.5 focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-all text-sm'
                  required
                />
              </div>

              <button
                type='submit'
                className='w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-medium py-2.5 rounded-lg shadow-sm transition-all mt-6 cursor-pointer'
              >
                Log In
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
                className='w-full border border-[#E7E7E7] bg-white text-[#171717] text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 hover:border-[#171717] hover:bg-[#FAF8F5] transition-colors cursor-pointer'
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
              <button
                type='button'
                className='w-full border border-[#E7E7E7] bg-white text-[#171717] text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 hover:border-[#171717] hover:bg-[#FAF8F5] transition-colors cursor-pointer'
              >
                <svg className='w-4 h-4 text-[#5865F2]' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z' />
                </svg>
                Sign in with Discord
              </button>
            </div>

            <p className='text-sm text-[#555555] text-center mt-8'>
              Don't have an account?{' '}
              <a href='#' className='text-[#F97316] font-semibold hover:text-[#EA580C]'>
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
