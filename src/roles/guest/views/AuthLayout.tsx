import React, { useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { VersionedBlueprintVisual } from '../components/VersionedBlueprintVisual';
import { LandingPageView } from './LandingPageView';

export interface AuthLayoutProps {
  mode: 'login' | 'register';
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ mode, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  // Đóng dialog. Có ?redirect nghĩa là bị đẩy tới đây từ trang cần đăng nhập (hết phiên / đăng xuất):
  // quay lại (-1) sẽ gặp đúng trang đó và bị đẩy về /login lần nữa → vòng lặp. Khi đó về trang công khai.
  const handleClose = useCallback(() => {
    const redirect = new URLSearchParams(location.search).get('redirect');
    if (redirect) {
      const isPublic = /^\/(catalog|preview)(\/|$|\?)/.test(redirect);
      navigate(isPublic ? redirect : '/', { replace: true });
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate, location.search]);

  // Lock body scroll while modal is open, handle Esc key, and handle focus trap
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Auto-focus the first editable input inside the card
    const timer = setTimeout(() => {
      if (cardRef.current) {
        const firstInput = cardRef.current.querySelector<HTMLInputElement>(
          'input:not([type="hidden"]):not([disabled])',
        );
        firstInput?.focus();
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Esc key closes dialog
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      // 2. Focus trap inside card
      if (e.key === 'Tab' && cardRef.current) {
        const focusableElements = cardRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleClose]);

  return (
    <div className='relative min-h-screen w-full overflow-hidden'>
      {/* ============================================================== */}
      {/* 1. BACKGROUND: REAL LANDING PAGE (inert, pointer-events-none)  */}
      {/* ============================================================== */}
      <div
        className='fixed inset-0 overflow-y-auto pointer-events-none select-none z-0'
        aria-hidden='true'
        tabIndex={-1}
      >
        <LandingPageView onOpenLogin={() => {}} onOpenRegister={() => {}} />
      </div>

      {/* ============================================================== */}
      {/* 2. CHARCOAL BACKDROP OVERLAY (55-65% opacity, blur 6-10px)     */}
      {/* ============================================================== */}
      <div
        data-testid='auth-backdrop'
        className='fixed inset-0 z-40 bg-[#0C0A09]/60 backdrop-blur-[8px] transition-opacity duration-180 cursor-pointer'
        onClick={handleClose}
        aria-hidden='true'
      />

      {/* ============================================================== */}
      {/* 3. CENTERED DIALOG STAGE CONTAINER                             */}
      {/* ============================================================== */}
      <div className='fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto pointer-events-none'>
        {/* Floating Auth Card (Desktop: 1040-1120px max-width, height min(680px, 100vh-64px)) */}
        <div
          ref={cardRef}
          role='dialog'
          aria-modal='true'
          aria-labelledby='auth-dialog-title'
          className='pointer-events-auto relative w-full max-w-[1060px] h-[calc(100vh-24px)] md:h-[min(680px,calc(100vh-64px))] rounded-2xl border border-[#D6CCBC] shadow-2xl shadow-black/20 bg-[#FAF8F5] overflow-hidden flex flex-col md:flex-row animate-auth-dialog-in'
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button (X) at corner of card */}
          <button
            type='button'
            onClick={handleClose}
            aria-label='Đóng'
            data-testid='auth-close-btn'
            className='absolute top-3 right-3 sm:top-3.5 sm:right-3.5 z-40 p-1.5 rounded-full text-[#1F1B16] bg-[#EDE6DA]/80 hover:bg-[#DFD7C7] border border-[#D6CCBC] transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 shadow-xs'
            title='Đóng (Esc)'
          >
            <X className='w-4 h-4' />
          </button>

          {/* ============================================================== */}
          {/* LEFT COLUMN: AUTH FORM (45% on desktop, 100% on mobile)       */}
          {/* ============================================================== */}
          <div className='w-full md:w-[45%] h-full min-h-0 max-h-full flex flex-col justify-between p-5 sm:p-6 lg:p-7 overflow-y-auto custom-scrollbar bg-[#FAF8F5] relative z-20'>
            {/* Top bar: Back to Home Link */}
            <div className='w-full max-w-[360px] mx-auto flex items-center justify-between mb-3'>
              <Link
                to='/'
                onClick={(e) => {
                  e.preventDefault();
                  handleClose();
                }}
                className='inline-flex items-center gap-1.5 text-xs font-semibold text-[#777169] hover:text-[#0C0A09] transition-colors group py-1 px-2 -ml-2 rounded-lg hover:bg-[#F0EFED]'
                title='Quay lại'
              >
                <ArrowLeft className='w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5' />
                <span>Về trang chủ</span>
              </Link>
            </div>

            {/* Center: Form Container (340px - 380px) */}
            <div className='w-full max-w-[360px] mx-auto my-auto py-1'>{children}</div>

            {/* Bottom subtle copyright / studio stamp */}
            <div className='w-full max-w-[360px] mx-auto mt-4 pt-2.5 border-t border-[#E7E5E4] flex items-center justify-between text-[10.5px] text-[#A8A29E] font-mono'>
              <span>PanelForge Manga OS</span>
              <span>Bảo mật hệ thống v3</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: THE VERSIONED BLUEPRINT VISUAL (55% on desktop)  */}
          {/* ============================================================== */}
          <div className='hidden md:flex md:w-[55%] h-full min-h-0 max-h-full bg-[#EDE6DA] border-l border-[#D6CCBC] relative overflow-hidden items-center justify-center'>
            <VersionedBlueprintVisual mode={mode} />
          </div>
        </div>
      </div>
    </div>
  );
};
