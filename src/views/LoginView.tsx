import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface LoginViewProps {
  mode: 'login' | 'register';
  onLogin: (username: string, pass: string) => void;
  onBack: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ mode, onLogin, onBack }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState('writer'); // Default to writer for demo
  const [password, setPassword] = useState('123456');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin(email, password);
      setIsLoggingIn(false);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F6F0] relative">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-[#555555] hover:text-[#171717] transition-colors cursor-pointer z-20"
      >
        <ArrowLeft className="w-4 h-4" /> Back to home
      </button>

      {/* Auth Card */}
      <div className="w-96 bg-[#FFFFFF] border border-[#E7E7E7] shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-8 rounded-xl z-10 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-[#171717] text-white font-bold text-xl rounded-lg flex items-center justify-center shadow-sm">
            PF
          </div>
          <h1 className="text-[#171717] font-serif font-bold text-2xl text-center mt-4 mb-8">
            {mode === 'login' ? 'Welcome to PanelForge' : 'Create an Account'}
          </h1>
        </div>

        {/* Social Logins */}
        <div className="space-y-3 mb-6">
          <button className="w-full border border-[#E7E7E7] hover:border-[#171717] text-[#171717] font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
            Continue with Discord
          </button>
          
          <button className="w-full border border-[#E7E7E7] hover:border-[#171717] text-[#171717] font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[#E7E7E7]"></div>
          <span className="text-xs text-[#555555] uppercase tracking-wider">or continue with email</span>
          <div className="flex-1 h-px bg-[#E7E7E7]"></div>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#171717] font-medium mb-1">
              Email Address
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. writer@studio.com"
              className="w-full border border-[#B8B8B8] rounded-lg px-3.5 py-2.5 text-[#171717] placeholder-[#B8B8B8] focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-[#171717] font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-[#B8B8B8] rounded-lg px-3.5 py-2.5 text-[#171717] placeholder-[#B8B8B8] focus:border-[#171717] focus:ring-1 focus:ring-[#171717] outline-none transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-medium py-2.5 rounded-lg mt-6 shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
          >
            {isLoggingIn ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            <span>
              {isLoggingIn
                ? 'Authenticating...'
                : mode === 'login'
                  ? 'Log In'
                  : 'Sign Up'}
            </span>
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#555555]">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button className="text-[#F97316] hover:underline font-medium cursor-pointer">
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
