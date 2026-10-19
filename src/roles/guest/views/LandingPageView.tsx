import React, { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/shared/components/BrandMark';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  FolderTree,
  History,
  Sparkles,
  Database,
  GitCommit,
  KanbanSquare,
  FileText,
  Lock,
  Menu,
  X,
  Palette,
  BookMarked,
  Users,
  ChevronDown,
} from 'lucide-react';
import { HeroMangaPage } from '../components/HeroMangaPage';

interface LandingPageViewProps {
  onOpenLogin?: () => void;
  onOpenRegister?: () => void;
}

// Shared by the scroll-reveal observer: classic fade-ins plus the hero→intro ink transition and card frames.
const REVEAL_SELECTOR = '.animate-on-scroll, [data-reveal]';

// Thin ink outline traced over a value card's border once, then faded out (see .frame-ink CSS).
const FrameInk = () => (
  <svg className='frame-ink' aria-hidden='true' focusable='false'>
    <rect className='frame-ink-rect' x='0.5' y='0.5' rx='15.5' pathLength={1} />
  </svg>
);

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenLogin,
  onOpenRegister,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [heroHighlight, setHeroHighlight] = useState<'editor' | 'artist' | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Showcase Tabs state: 'pipeline' | 'script' | 'bible' | 'events' | 'references'
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<
    'pipeline' | 'script' | 'bible' | 'events' | 'references'
  >('pipeline');

  // Comparison Slider state (Phác thảo vs Hoàn thiện): 0 to 100%
  const [comparisonSliderPos, setComparisonSliderPos] = useState<number>(50);

  // Pushpin drop animation trigger state (runs once)
  const [isPinDropped, setIsPinDropped] = useState<boolean>(false);
  const introSectionRef = useRef<HTMLDivElement | null>(null);

  const tabKeys: Array<'pipeline' | 'script' | 'bible' | 'events' | 'references'> = [
    'pipeline',
    'script',
    'bible',
    'events',
    'references',
  ];

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentKey: typeof activeShowcaseTab,
  ) => {
    const currentIndex = tabKeys.indexOf(currentKey);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % tabKeys.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + tabKeys.length) % tabKeys.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = tabKeys.length - 1;
    } else {
      return;
    }

    const nextKey = tabKeys[nextIndex];
    setActiveShowcaseTab(nextKey);
    document.getElementById(`showcase-tab-${nextKey}`)?.focus();
  };

  const handleLoginClick = () => {
    if (onOpenLogin) {
      onOpenLogin();
    } else {
      navigate(`/login${location.search}`);
    }
  };

  const handleRegisterClick = () => {
    if (onOpenRegister) {
      onOpenRegister();
    } else {
      navigate(`/register${location.search}`);
    }
  };

  const handleScrollToWorkflow = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('block-workflow');
    if (!target) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    window.history.pushState(null, '', '#block-workflow');
  };

  const handleNavScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const target = document.getElementById(targetId);
    if (!target) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    window.history.pushState(null, '', `#${targetId}`);
  };

  // Close mobile drawer on Escape key and restore focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        document.getElementById('mobile-nav-toggle')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Reset mobile menu and scroll lock when resized to desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  // Lock body scroll when mobile menu modal drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Manage page title and description for landing page
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'PanelForge — Không gian cộng tác sản xuất manga';
    const metaDesc = document.querySelector('meta[name="description"]');
    const previousDesc = metaDesc ? metaDesc.getAttribute('content') : null;
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'PanelForge — Nền tảng cộng tác sản xuất truyện tranh có cấu trúc. Đồng bộ kịch bản, nét vẽ, xét duyệt và lịch sử phiên bản trong một không gian duy nhất.',
      );
    }
    return () => {
      document.title = previousTitle;
      if (metaDesc && previousDesc) {
        metaDesc.setAttribute('content', previousDesc);
      }
    };
  }, []);

  // Progressive enhancement scroll reveal observer and Pushpin observer
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fallback: If observer not supported or reduced motion preferred, make everything visible immediately
    if (!('IntersectionObserver' in window) || prefersReduced) {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        el.classList.add('is-visible');
      });
      setIsPinDropped(true);
      return;
    }

    // Signal CSS that JS observer is active
    document.documentElement.classList.add('js-observer-ready');

    try {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              if (
                entry.target.id === 'block-intro' ||
                entry.target.getAttribute('data-reveal') === 'ink'
              ) {
                setIsPinDropped(true);
              }
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -50px 0px' },
      );

      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        observerRef.current?.observe(el);
      });
    } catch {
      // Fallback on initialization error
      document.documentElement.classList.remove('js-observer-ready');
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        el.classList.add('is-visible');
      });
      setIsPinDropped(true);
    }

    return () => {
      observerRef.current?.disconnect();
      document.documentElement.classList.remove('js-observer-ready');
    };
  }, []);

  return (
    <div className='antialiased text-[#1C1917] bg-[#F3F0E9] overflow-x-hidden min-h-screen flex flex-col justify-between font-sans'>
      {/* Scoped CSS for Comic Typography, Speech Balloon CTA, Brush Underline, and Pushpin Drop */}
      <style>{`
        @keyframes heroFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes heroStrokeDraw {
          0% {
            stroke-dashoffset: 280;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes pushpinDropAnim {
          0% {
            opacity: 0;
            transform: translateY(-24px) scale(1.22);
          }
          65% {
            opacity: 1;
            transform: translateY(2px) scale(0.98);
          }
          85% {
            transform: translateY(-1px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0px) scale(1);
          }
        }
        .hero-stagger-1 {
          animation: heroFadeIn 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 40ms;
        }
        .hero-stagger-2 {
          animation: heroFadeIn 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 140ms;
        }
        .hero-stagger-3 {
          animation: heroFadeIn 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 260ms;
        }
        .hero-stagger-4 {
          animation: heroFadeIn 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 380ms;
        }
        .hero-stagger-5 {
          animation: heroFadeIn 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 500ms;
        }
        .hero-brush-path {
          stroke-dasharray: 280;
          stroke-dashoffset: 280;
          animation: heroStrokeDraw 550ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 480ms;
        }
        .pin-drop-effect,
        .pin-drop-left {
          animation: pushpinDropAnim 520ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pin-drop-right {
          animation: pushpinDropAnim 520ms cubic-bezier(0.16, 1, 0.3, 1) 140ms forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-stagger-1,
          .hero-stagger-2,
          .hero-stagger-3,
          .hero-stagger-4,
          .hero-stagger-5 {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
          .hero-brush-path {
            animation: none !important;
            stroke-dashoffset: 0 !important;
          }
          .pin-drop-effect,
          .pin-drop-left,
          .pin-drop-right {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        @media (min-width: 1024px) {
          #block-intro-note-left {
            transform: rotate(-1deg);
          }
          #block-intro-note-right {
            transform: rotate(1deg);
          }
          #block-intro-note-left .note-content {
            transform: rotate(1deg);
          }
          #block-intro-note-right .note-content {
            transform: rotate(-1deg);
          }
        }
      `}</style>

      {/* ===== HEADER / NAVBAR ===== */}
      <header className='sticky top-0 z-40 bg-[#F3F0E9]/95 backdrop-blur-md border-b border-[#D8D2C5]'>
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] h-16 flex items-center justify-between'>
          {/* Logo */}
          <a
            href='#hero-section'
            onClick={(e) => handleNavScroll(e, 'hero-section')}
            className='flex items-center gap-2 group shrink-0'
            aria-label='PanelForge - Về đầu trang'
          >
            <BrandMark
              size={30}
              className='shrink-0 group-hover:scale-105 transition-transform motion-reduce:transform-none'
            />
            <span className='font-serif text-lg sm:text-xl font-medium tracking-tight text-[#1C1917]'>
              PanelForge
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav
            aria-label='Điều hướng chính'
            className='hidden md:flex items-center gap-8 text-xs font-medium text-[#57534E]'
          >
            <a
              href='#block-features'
              onClick={(e) => handleNavScroll(e, 'block-features')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              Tính năng
            </a>
            <a
              href='#block-workflow'
              onClick={(e) => handleNavScroll(e, 'block-workflow')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              Quy trình
            </a>
            <a
              href='#block-showcase'
              onClick={(e) => handleNavScroll(e, 'block-showcase')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              Trưng bày
            </a>
            <a
              href='#block-faq'
              onClick={(e) => handleNavScroll(e, 'block-faq')}
              className='hover:text-[#1C1917] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xs py-1'
            >
              Hỏi đáp
            </a>
          </nav>

          {/* Right: Auth buttons & Mobile menu toggle */}
          <div className='flex items-center gap-2 sm:gap-3 shrink-0'>
            <button
              onClick={handleLoginClick}
              aria-label='Đăng nhập'
              className='text-xs sm:text-sm text-[#1C1917] font-medium hover:bg-[#EAE5DC] border border-[#D8D2C5] hover:border-[#1C1917] active:scale-[0.98] motion-reduce:transform-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
            >
              Đăng nhập
            </button>
            <button
              onClick={handleRegisterClick}
              aria-label='Tạo tài khoản'
              className='inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#1C1917] text-white text-xs sm:text-sm font-medium hover:bg-black active:scale-[0.98] motion-reduce:transform-none shadow-soft-sm transition-all duration-200 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
            >
              <span>Tạo tài khoản</span>
              <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
            </button>

            {/* Mobile Nav Toggle */}
            <button
              id='mobile-nav-toggle'
              type='button'
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-controls='mobile-nav-drawer'
              aria-label={isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
              className='md:hidden p-2 rounded-lg text-stone-700 hover:text-stone-900 hover:bg-stone-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
            >
              {isMobileMenuOpen ? (
                <X className='w-5 h-5' aria-hidden='true' />
              ) : (
                <Menu className='w-5 h-5' aria-hidden='true' />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            id='mobile-nav-drawer'
            role='dialog'
            aria-modal='true'
            aria-label='Menu điều hướng trên điện thoại'
            className='md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-[#F3F0E9]/98 backdrop-blur-md border-b border-[#D8D2C5] flex flex-col justify-between p-6 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200'
          >
            <nav className='flex flex-col gap-3 text-base font-medium text-stone-800 pt-2'>
              <a
                href='#block-features'
                onClick={(e) => handleNavScroll(e, 'block-features')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>Tính năng</span>
                <span className='text-stone-400'>→</span>
              </a>
              <a
                href='#block-workflow'
                onClick={(e) => handleNavScroll(e, 'block-workflow')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>Quy trình sản xuất</span>
                <span className='text-stone-400'>→</span>
              </a>
              <a
                href='#block-showcase'
                onClick={(e) => handleNavScroll(e, 'block-showcase')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>Trưng bày không gian làm việc</span>
                <span className='text-stone-400'>→</span>
              </a>
              <a
                href='#block-faq'
                onClick={(e) => handleNavScroll(e, 'block-faq')}
                className='py-2.5 px-3 rounded-xl hover:bg-[#EAE5DC] transition-colors flex items-center justify-between'
              >
                <span>Hỏi đáp thường gặp</span>
                <span className='text-stone-400'>→</span>
              </a>
            </nav>

            <div className='flex flex-col gap-3 pb-8 pt-4 border-t border-[#D8D2C5]'>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLoginClick();
                }}
                className='w-full py-3 rounded-full border border-[#D8D2C5] text-[#1C1917] font-medium hover:bg-[#EAE5DC] transition-colors active:scale-[0.98] motion-reduce:transform-none'
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleRegisterClick();
                }}
                className='w-full py-3 rounded-full bg-[#1C1917] text-white font-medium hover:bg-black transition-colors active:scale-[0.98] motion-reduce:transform-none'
              >
                Tạo tài khoản
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ===== HERO SECTION ===== */}
      <section
        id='hero-section'
        className='hero-desktop-screen scroll-mt-20 relative w-full bg-[#FCFBF8] flex flex-col justify-between overflow-hidden'
      >
        {/* Subtle Studio Drafting Grid on the right canvas (< 3.5% opacity) */}
        <div
          className='absolute inset-0 pointer-events-none opacity-[0.035] manuscript-grid z-0'
          aria-hidden='true'
        />

        {/* Left margin guideline indicator (as seen in Reference Image 2) */}
        <div
          className='hidden 2xl:flex absolute left-4 sm:left-7 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180 text-[11px] font-mono tracking-[0.2em] text-[#0284C7]/75 select-none pointer-events-none items-center gap-2 z-10'
          aria-hidden='true'
        >
          <span>01 / Bắt đầu một câu chuyện</span>
        </div>

        {/* ============================================================== */}
        {/* DESKTOP TORN PAPER SHEET (LEFT ~54% WIDTH) — ASYMMETRIC TORN EDGE */}
        {/* ============================================================== */}
        <div
          className='hidden lg:block absolute inset-0 w-full h-full pointer-events-none select-none z-0'
          aria-hidden='true'
        >
          <svg
            className='w-full h-full'
            viewBox='0 0 1000 800'
            preserveAspectRatio='none'
            style={{
              filter:
                'drop-shadow(2.5px 0px 3px rgba(45, 34, 24, 0.13)) drop-shadow(8px 0px 20px rgba(45, 34, 24, 0.06))',
            }}
          >
            {/* Main torn paper body */}
            <path
              d='M 0 0 L 575.8 0 Q 575.8 0, 576.6 4.5 Q 577.4 8.9, 577.3 13.4 Q 577.3 17.8, 577.4 22.3 Q 577.5 26.7, 579.2 31.2 Q 580.8 35.6, 580.4 40 Q 580 44.4, 579.9 48.8 Q 579.7 53.3, 580.9 57.8 Q 582 62.2, 582.1 66.7 Q 582.2 71.1, 581.2 75.6 Q 580.1 80, 581.7 84.5 Q 583.2 88.9, 581 93.4 Q 578.8 97.8, 579.6 102.3 Q 580.3 106.7, 578.3 111.2 Q 576.3 115.6, 575.3 120 Q 574.2 124.4, 574.3 128.9 Q 574.3 133.3, 573.6 137.8 Q 572.9 142.2, 573.5 146.6 Q 574.1 151.1, 574.3 155.6 Q 574.4 160, 571.2 164.5 Q 568 168.9, 568.2 173.4 Q 568.3 177.8, 566.3 182.3 Q 564.3 186.7, 564.5 191.1 Q 564.6 195.6, 562.8 200 Q 560.9 204.4, 557.3 208.9 Q 553.7 213.3, 552.4 217.8 Q 551 222.2, 549.4 226.7 Q 547.8 231.1, 548.2 235.6 Q 548.5 240, 549.5 244.5 Q 550.5 248.9, 550 253.4 Q 549.4 257.8, 548.6 262.3 Q 547.8 266.7, 548.2 271.2 Q 548.6 275.6, 544.6 280 Q 540.5 284.4, 541.1 288.9 Q 541.6 293.3, 540.4 297.8 Q 539.1 302.2, 541.2 306.7 Q 543.3 311.1, 538.8 315.6 Q 534.2 320, 535.9 324.5 Q 537.5 328.9, 536.6 333.4 Q 535.6 337.8, 540.3 342.3 Q 545 346.7, 543.9 351.2 Q 542.7 355.6, 541.1 360 Q 539.4 364.4, 541.4 368.9 Q 543.4 373.3, 544.6 377.8 Q 545.8 382.2, 544.7 386.7 Q 543.5 391.1, 543.6 395.6 Q 543.7 400, 544.3 404.5 Q 544.9 408.9, 545.3 413.4 Q 545.6 417.8, 546.5 422.3 Q 547.4 426.7, 548.2 431.2 Q 548.9 435.6, 550.5 440 Q 552.1 444.4, 551.7 448.9 Q 551.3 453.3, 551.6 457.8 Q 551.9 462.2, 552.2 466.7 Q 552.4 471.1, 550.3 475.6 Q 548.1 480, 551.2 484.5 Q 554.2 488.9, 553.2 493.4 Q 552.1 497.8, 554.7 502.3 Q 557.3 506.7, 556.7 511.2 Q 556 515.6, 556.9 520 Q 557.7 524.4, 559.2 528.8 Q 560.6 533.3, 563.3 537.8 Q 565.9 542.2, 564.1 546.7 Q 562.3 551.1, 562.6 555.6 Q 562.8 560, 565.1 564.5 Q 567.3 568.9, 567.4 573.3 Q 567.5 577.8, 568.6 582.3 Q 569.6 586.7, 570 591.2 Q 570.3 595.6, 569.3 600 Q 568.4 604.4, 569 608.8 Q 569.5 613.3, 569.6 617.8 Q 569.6 622.2, 570.6 626.7 Q 571.5 631.1, 571.8 635.6 Q 572.1 640, 573.5 644.5 Q 574.8 648.9, 573.2 653.3 Q 571.6 657.8, 572.3 662.3 Q 573 666.7, 572 671.2 Q 571 675.6, 570.9 680 Q 570.7 684.4, 569.7 688.8 Q 568.6 693.3, 566.9 697.8 Q 565.1 702.2, 565.3 706.7 Q 565.4 711.1, 565.8 715.6 Q 566.2 720, 566.6 724.5 Q 566.9 728.9, 568.3 733.3 Q 569.8 737.8, 569.8 742.3 Q 569.9 746.7, 569.3 751.2 Q 568.6 755.6, 569 760 Q 569.4 764.4, 569.1 768.8 Q 568.8 773.3, 568.8 777.8 Q 568.7 782.2, 569.7 786.7 Q 570.7 791.1, 570.5 795.6 L 570.3 800 L 0 800 Z'
              fill='#F3F0E9'
            />
            {/* Exposed inner pulp deckle ribbon */}
            <path
              d='M 575.8 0 L 576.9 0 Q 576.9 0, 577.7 4.5 Q 578.5 8.9, 578.5 13.4 Q 578.4 17.8, 579.2 22.3 Q 579.9 26.7, 580.9 31.2 Q 581.9 35.6, 582.3 40 Q 582.6 44.4, 582.3 48.8 Q 582 53.3, 583.2 57.8 Q 584.4 62.2, 584.5 66.7 Q 584.6 71.1, 584 75.6 Q 583.3 80, 584.3 84.5 Q 585.2 88.9, 583.4 93.4 Q 581.6 97.8, 582.3 102.3 Q 582.9 106.7, 581.3 111.2 Q 579.8 115.6, 578.7 120 Q 577.5 124.4, 577.5 128.9 Q 577.4 133.3, 577.4 137.8 Q 577.4 142.2, 577.1 146.6 Q 576.7 151.1, 577.2 155.6 Q 577.7 160, 574.1 164.5 Q 570.4 168.9, 571.2 173.4 Q 572 177.8, 569.9 182.3 Q 567.7 186.7, 567 191.1 Q 566.2 195.6, 564.7 200 Q 563.1 204.4, 559.7 208.9 Q 556.3 213.3, 554.7 217.8 Q 553 222.2, 551.6 226.7 Q 550.1 231.1, 549.9 235.6 Q 549.6 240, 551 244.5 Q 552.4 248.9, 552.3 253.4 Q 552.3 257.8, 551.3 262.3 Q 550.3 266.7, 550.1 271.2 Q 549.9 275.6, 547 280 Q 544 284.4, 544.1 288.9 Q 544.1 293.3, 542.9 297.8 Q 541.7 302.2, 544.1 306.7 Q 546.4 311.1, 542.8 315.6 Q 539.1 320, 540.6 324.5 Q 542.1 328.9, 540.4 333.4 Q 538.7 337.8, 542.8 342.3 Q 546.8 346.7, 545.7 351.2 Q 544.5 355.6, 543.4 360 Q 542.3 364.4, 544.2 368.9 Q 546.1 373.3, 546.9 377.8 Q 547.6 382.2, 546.4 386.7 Q 545.2 391.1, 545.4 395.6 Q 545.6 400, 546.1 404.5 Q 546.6 408.9, 547.2 413.4 Q 547.7 417.8, 548.2 422.3 Q 548.7 426.7, 549.6 431.2 Q 550.4 435.6, 551.9 440 Q 553.4 444.4, 553.7 448.9 Q 553.9 453.3, 554.2 457.8 Q 554.4 462.2, 554.8 466.7 Q 555.1 471.1, 553.1 475.6 Q 551.1 480, 553.5 484.5 Q 555.8 488.9, 555.7 493.4 Q 555.5 497.8, 558 502.3 Q 560.4 506.7, 559.1 511.2 Q 557.7 515.6, 558.8 520 Q 559.8 524.4, 561.1 528.8 Q 562.3 533.3, 565.9 537.8 Q 569.5 542.2, 567.6 546.7 Q 565.7 551.1, 566 555.6 Q 566.3 560, 567.9 564.5 Q 569.5 568.9, 569.7 573.3 Q 569.8 577.8, 571 582.3 Q 572.2 586.7, 572.5 591.2 Q 572.8 595.6, 571.9 600 Q 571 604.4, 571.2 608.8 Q 571.3 613.3, 571.3 617.8 Q 571.4 622.2, 572.6 626.7 Q 573.8 631.1, 573.7 635.6 Q 573.6 640, 574.8 644.5 Q 575.9 648.9, 574.8 653.3 Q 573.7 657.8, 574.1 662.3 Q 574.5 666.7, 573.5 671.2 Q 572.5 675.6, 572.1 680 Q 571.7 684.4, 571.3 688.8 Q 570.9 693.3, 569 697.8 Q 567.1 702.2, 567.5 706.7 Q 567.9 711.1, 568.3 715.6 Q 568.8 720, 568.3 724.5 Q 567.9 728.9, 569.7 733.3 Q 571.4 737.8, 571.7 742.3 Q 571.9 746.7, 570.8 751.2 Q 569.8 755.6, 570.1 760 Q 570.3 764.4, 570.6 768.8 Q 570.9 773.3, 570.5 777.8 Q 570.1 782.2, 571.2 786.7 Q 572.2 791.1, 571.9 795.6 L 571.5 800 L 570.3 800 Z'
              fill='#FAF7F0'
              opacity='0.96'
            />
            {/* Fine outer tear contour */}
            <path
              d='M 576.9 0 Q 576.9 0, 577.7 4.5 Q 578.5 8.9, 578.5 13.4 Q 578.4 17.8, 579.2 22.3 Q 579.9 26.7, 580.9 31.2 Q 581.9 35.6, 582.3 40 Q 582.6 44.4, 582.3 48.8 Q 582 53.3, 583.2 57.8 Q 584.4 62.2, 584.5 66.7 Q 584.6 71.1, 584 75.6 Q 583.3 80, 584.3 84.5 Q 585.2 88.9, 583.4 93.4 Q 581.6 97.8, 582.3 102.3 Q 582.9 106.7, 581.3 111.2 Q 579.8 115.6, 578.7 120 Q 577.5 124.4, 577.5 128.9 Q 577.4 133.3, 577.4 137.8 Q 577.4 142.2, 577.1 146.6 Q 576.7 151.1, 577.2 155.6 Q 577.7 160, 574.1 164.5 Q 570.4 168.9, 571.2 173.4 Q 572 177.8, 569.9 182.3 Q 567.7 186.7, 567 191.1 Q 566.2 195.6, 564.7 200 Q 563.1 204.4, 559.7 208.9 Q 556.3 213.3, 554.7 217.8 Q 553 222.2, 551.6 226.7 Q 550.1 231.1, 549.9 235.6 Q 549.6 240, 551 244.5 Q 552.4 248.9, 552.3 253.4 Q 552.3 257.8, 551.3 262.3 Q 550.3 266.7, 550.1 271.2 Q 549.9 275.6, 547 280 Q 544 284.4, 544.1 288.9 Q 544.1 293.3, 542.9 297.8 Q 541.7 302.2, 544.1 306.7 Q 546.4 311.1, 542.8 315.6 Q 539.1 320, 540.6 324.5 Q 542.1 328.9, 540.4 333.4 Q 538.7 337.8, 542.8 342.3 Q 546.8 346.7, 545.7 351.2 Q 544.5 355.6, 543.4 360 Q 542.3 364.4, 544.2 368.9 Q 546.1 373.3, 546.9 377.8 Q 547.6 382.2, 546.4 386.7 Q 545.2 391.1, 545.4 395.6 Q 545.6 400, 546.1 404.5 Q 546.6 408.9, 547.2 413.4 Q 547.7 417.8, 548.2 422.3 Q 548.7 426.7, 549.6 431.2 Q 550.4 435.6, 551.9 440 Q 553.4 444.4, 553.7 448.9 Q 553.9 453.3, 554.2 457.8 Q 554.4 462.2, 554.8 466.7 Q 555.1 471.1, 553.1 475.6 Q 551.1 480, 553.5 484.5 Q 555.8 488.9, 555.7 493.4 Q 555.5 497.8, 558 502.3 Q 560.4 506.7, 559.1 511.2 Q 557.7 515.6, 558.8 520 Q 559.8 524.4, 561.1 528.8 Q 562.3 533.3, 565.9 537.8 Q 569.5 542.2, 567.6 546.7 Q 565.7 551.1, 566 555.6 Q 566.3 560, 567.9 564.5 Q 569.5 568.9, 569.7 573.3 Q 569.8 577.8, 571 582.3 Q 572.2 586.7, 572.5 591.2 Q 572.8 595.6, 571.9 600 Q 571 604.4, 571.2 608.8 Q 571.3 613.3, 571.3 617.8 Q 571.4 622.2, 572.6 626.7 Q 573.8 631.1, 573.7 635.6 Q 573.6 640, 574.8 644.5 Q 575.9 648.9, 574.8 653.3 Q 573.7 657.8, 574.1 662.3 Q 574.5 666.7, 573.5 671.2 Q 572.5 675.6, 572.1 680 Q 571.7 684.4, 571.3 688.8 Q 570.9 693.3, 569 697.8 Q 567.1 702.2, 567.5 706.7 Q 567.9 711.1, 568.3 715.6 Q 568.8 720, 568.3 724.5 Q 567.9 728.9, 569.7 733.3 Q 571.4 737.8, 571.7 742.3 Q 571.9 746.7, 570.8 751.2 Q 569.8 755.6, 570.1 760 Q 570.3 764.4, 570.6 768.8 Q 570.9 773.3, 570.5 777.8 Q 570.1 782.2, 571.2 786.7 Q 572.2 791.1, 571.9 795.6'
              fill='none'
              stroke='#FFFDF8'
              strokeWidth='1.2'
              strokeLinecap='round'
              strokeLinejoin='round'
              opacity='0.9'
            />
          </svg>
        </div>

        {/* Content Container (Shared max-width and horizontal padding: 90-92% viewport width) */}
        <div className='flex-1 flex items-center max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full relative z-20 py-4 sm:py-6 lg:py-8'>
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,52%)_minmax(0,48%)] hero-grid-layout gap-8 lg:gap-12 xl:gap-16 items-center w-full'>
            {/* Left Column: Overline, Comic Headline, Description, Speech CTAs, Feature Badges */}
            <div className='flex flex-col items-start text-left w-full max-w-[680px] bg-[#F3F0E9] lg:bg-transparent -mx-[clamp(20px,4.2vw,72px)] px-[clamp(20px,4.2vw,72px)] pt-6 sm:pt-8 pb-4 lg:p-0 lg:m-0 relative z-10'>
              {/* Overline Docket Header (No capsule pill, no status dot) */}
              <div className='hero-stagger-1 inline-flex items-center gap-2 text-xs sm:text-[13px] font-medium text-[#78716C] mb-[clamp(14px,2.2vh,24px)] select-none'>
                <span className='font-mono font-bold text-[#1C1917] tracking-wider'>PF / 01</span>
                <span className='text-[#D8D2C5]' aria-hidden='true'>
                  —
                </span>
                <span className='font-sans uppercase tracking-[0.16em] text-[#57534E] font-semibold'>
                  XƯỞNG SÁNG TÁC TRUYỆN TRANH
                </span>
              </div>

              {/* Bold Comic Headline with Full Vietnamese Diacritics Support */}
              <h1
                style={{
                  fontFamily:
                    "'Patrick Hand SC', 'Patrick Hand', 'Be Vietnam Pro', cursive, sans-serif",
                }}
                className='hero-stagger-2 font-black text-[#1C1917] tracking-normal leading-[1.08] text-[clamp(2.9rem,5.6vw+0.2rem,5.65rem)] mb-[clamp(16px,2.2vh,26px)] select-none overflow-visible uppercase'
              >
                <span className='block whitespace-nowrap transform -skew-x-[3.5deg]'>
                  TỪ Ý TƯỞNG ĐẾN
                </span>
                <span className='block whitespace-nowrap transform -skew-x-[3.5deg] mt-1'>
                  <span className='relative inline-block'>
                    <span>TỪNG KHUNG TRUYỆN.</span>
                    {/* Natural ink-brush underline in signature orange — positioned clear of diacritic dot under Ệ */}
                    <svg
                      className='absolute -bottom-2.5 sm:-bottom-3.5 left-0 w-[96%] h-[12px] sm:h-[14px] pointer-events-none overflow-visible'
                      viewBox='0 0 280 12'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      aria-hidden='true'
                    >
                      <path
                        d='M 2 6 Q 70 10 140 7 T 276 5'
                        stroke='#F97316'
                        strokeWidth='4.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='hero-brush-path'
                      />
                    </svg>
                  </span>
                </span>
              </h1>

              {/* Description (Warm Gray with mild emphasis on first sentence) */}
              <p className='hero-stagger-3 text-[#57534E] font-sans text-[clamp(1.02rem,0.35vw+0.92rem,1.22rem)] max-w-[50ch] font-normal tracking-normal leading-[1.62] mb-7 [text-wrap:pretty]'>
                <strong className='font-semibold text-[#1C1917]'>
                  Cùng viết, vẽ và duyệt truyện trong một không gian.
                </strong>{' '}
                <span>
                  Gắn phản hồi vào đúng khung truyện, theo dõi từng phiên bản và kiểm tra tính nhất
                  quán với AI.
                </span>
              </p>

              {/* Speech-Balloon Styled CTAs */}
              <div
                id='hero-cta-group'
                className='hero-stagger-4 flex flex-wrap items-center gap-4 mb-3'
              >
                {/* Primary CTA: Black Ink Speech Balloon */}
                <button
                  onClick={handleLoginClick}
                  aria-label='Đăng nhập'
                  className='relative group inline-flex items-center justify-center gap-2 min-h-[50px] px-8 sm:px-9 text-[15px] sm:text-[16px] font-semibold bg-[#1C1917] text-white rounded-[18px] shadow-[3px_3px_0px_#1C1917] hover:shadow-[4px_4px_0px_#1C1917] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 transition-all duration-150 cursor-pointer motion-reduce:transform-none select-none'
                >
                  <span className='font-sans'>Đăng nhập</span>
                  <span className='text-sm' aria-hidden='true'>
                    ↗
                  </span>
                  {/* Speech balloon notch tail */}
                  <span
                    className='absolute -bottom-2 left-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#1C1917] pointer-events-none'
                    aria-hidden='true'
                  />
                </button>

                {/* Secondary CTA: Ivory Paper Speech Balloon with 2px Ink Border */}
                <button
                  onClick={handleRegisterClick}
                  aria-label='Tạo tài khoản'
                  className='relative group inline-flex items-center justify-center gap-2 min-h-[50px] px-8 sm:px-9 text-[15px] sm:text-[16px] font-semibold bg-[#FAF8F5] text-[#1C1917] border-2 border-[#1C1917] rounded-[18px] shadow-[3px_3px_0px_#1C1917] hover:shadow-[4px_4px_0px_#1C1917] hover:-translate-y-0.5 hover:bg-[#F3F0E9] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#1C1917] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 transition-all duration-150 cursor-pointer motion-reduce:transform-none select-none'
                >
                  <span className='font-sans'>Tạo tài khoản</span>
                  {/* Speech balloon notch tail (outer border) */}
                  <span
                    className='absolute -bottom-[9px] left-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-[#1C1917] pointer-events-none'
                    aria-hidden='true'
                  />
                  {/* Speech balloon notch tail (inner fill) */}
                  <span
                    className='absolute -bottom-[6px] left-[25px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px] border-t-[#FAF8F5] pointer-events-none group-hover:border-t-[#F3F0E9]'
                    aria-hidden='true'
                  />
                </button>
              </div>

              {/* Discovery Link to Workflow Section */}
              <div className='hero-stagger-4 mb-6'>
                <a
                  id='hero-workflow-link'
                  href='#block-workflow'
                  onClick={handleScrollToWorkflow}
                  className='inline-flex items-center gap-1.5 text-xs sm:text-[13.5px] font-sans text-stone-500 hover:text-stone-900 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 rounded-xs'
                >
                  <span>Khám phá quy trình hoạt động</span>
                  <span aria-hidden='true'>↓</span>
                </a>
              </div>

              {/* Three Feature Highlights (Clean inline row with badge hover bindings) */}
              <div className='hero-stagger-5 flex flex-wrap items-center gap-y-2 gap-x-5 sm:gap-x-6 text-[13px] sm:text-[14px] font-medium text-stone-700 select-none'>
                <div className='flex items-center gap-2'>
                  <FileText className='w-4 h-4 text-[#1C1917] shrink-0' />
                  <span>Kịch bản có cấu trúc</span>
                </div>
                <span
                  className='hidden sm:inline-block w-px h-3.5 bg-stone-300'
                  aria-hidden='true'
                />
                <div
                  id='hero-badge-feedback'
                  onMouseEnter={() => setHeroHighlight('editor')}
                  onMouseLeave={() => setHeroHighlight(null)}
                  className='flex items-center gap-2 cursor-default hover:text-[#C2410C] transition-colors'
                >
                  <Users className='w-4 h-4 text-[#1C1917] shrink-0' />
                  <span>Cộng tác</span>
                </div>
                <span
                  className='hidden sm:inline-block w-px h-3.5 bg-stone-300'
                  aria-hidden='true'
                />
                <div
                  id='hero-badge-version'
                  onMouseEnter={() => setHeroHighlight('artist')}
                  onMouseLeave={() => setHeroHighlight(null)}
                  className='flex items-center gap-2 cursor-default hover:text-[#C2410C] transition-colors'
                >
                  <History className='w-4 h-4 text-[#1C1917] shrink-0' />
                  <span>Truy vết phiên bản</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Manga Manuscript Pages Stack (Fanning on hover only) */}
            <div className='flex items-center justify-center w-full overflow-visible relative z-10'>
              <HeroMangaPage highlightTarget={heroHighlight} />
            </div>
          </div>
        </div>
      </section>

      {/* Decorative Ink Guide for scroll transition and test compatibility */}
      <svg
        className='ink-guide pointer-events-none sr-only'
        viewBox='0 0 40 140'
        fill='none'
        aria-hidden='true'
        focusable='false'
      >
        <path
          className='ink-guide-path'
          d='M 22 2 C 14 26, 30 46, 20 70 C 12 92, 26 112, 19 138'
          pathLength={1}
          stroke='#F97316'
          strokeWidth='2.5'
          strokeLinecap='round'
        />
      </svg>

      {/* ===== BRAND PURPOSE INTRO SECTION (EXPANSIVE LIGHT IVORY PINNED SHEET) ===== */}
      <section
        id='block-intro'
        ref={introSectionRef}
        data-reveal='ink'
        className='py-12 sm:py-16 lg:py-20 relative bg-[#F3F0E9] transition-all'
        aria-label='Mục tiêu sản phẩm'
      >
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          {/* Two Separate Manuscript Notes on Manga Drafting Desk */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,45%)_minmax(0,55%)] gap-7 sm:gap-8 lg:gap-10 xl:gap-12 items-start w-full'>
            {/* NOTE 1 (LEFT): Tờ giấy kem nhạt #FFF8DF - Góc -1° desktop, Ghim riêng */}
            <div id='block-intro-note-left' className='w-full transition-transform'>
              <article
                className={`relative w-full p-7 sm:p-9 lg:p-10 bg-[#FFF8DF] rounded-lg sm:rounded-[10px] border border-[#E6DCB8] transition-transform duration-300 ${
                  isPinDropped ? 'translate-y-[1.5px]' : 'translate-y-0'
                }`}
                style={{
                  filter: 'drop-shadow(0 6px 18px rgba(28,25,23,0.06))',
                  clipPath:
                    'polygon(0% 0%, 100% 0%, 100% calc(100% - 5px), 94% 100%, 78% calc(100% - 3px), 62% calc(100% - 6px), 46% calc(100% - 2px), 30% calc(100% - 5px), 14% 100%, 0% calc(100% - 4px))',
                }}
              >
                {/* Pushpin 1: Đâm xuyên mép trên, lệch tâm 28%, đầu màu đất nung */}
                <div
                  className='absolute -top-4 left-[28%] -translate-x-1/2 flex flex-col items-center pointer-events-none select-none z-20'
                  aria-hidden='true'
                >
                  <div className={isPinDropped ? 'pin-drop-left' : 'opacity-0 -translate-y-6'}>
                    <svg
                      width='28'
                      height='34'
                      viewBox='0 0 28 34'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      className='drop-shadow-[0_3px_5px_rgba(28,25,23,0.3)]'
                    >
                      <path
                        d='M14 23 L14 32'
                        stroke='#78716C'
                        strokeWidth='2'
                        strokeLinecap='round'
                      />
                      <path
                        d='M13.5 24 L13.5 30'
                        stroke='#E7E5E4'
                        strokeWidth='0.8'
                        strokeLinecap='round'
                      />
                      <ellipse cx='14' cy='22.5' rx='6' ry='2' fill='#9A3412' />
                      <path
                        d='M9 11.5 C9 16, 11 21.5, 14 22.5 C17 21.5, 19 16, 19 11.5 Z'
                        fill='#C2410C'
                      />
                      <ellipse cx='14' cy='11' rx='9' ry='3' fill='#EA580C' />
                      <ellipse cx='14' cy='7.5' rx='5.5' ry='2.2' fill='#F97316' />
                      <ellipse cx='12.5' cy='6.8' rx='2' ry='0.8' fill='white' opacity='0.75' />
                    </svg>
                  </div>
                  <div
                    className={`w-2 h-1 rounded-full bg-[#1C1917]/75 -mt-1 transition-opacity duration-300 ${
                      isPinDropped ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>

                {/* Decorative draft pencil lines in corner */}
                <svg
                  className='absolute bottom-3 right-4 w-12 h-6 pointer-events-none opacity-40 select-none'
                  viewBox='0 0 48 24'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='M2 18 C14 16, 28 20, 44 14'
                    stroke='#9DB4C8'
                    strokeWidth='1'
                    strokeLinecap='round'
                    strokeDasharray='3 2'
                  />
                  <path
                    d='M8 22 C20 20, 32 23, 46 19'
                    stroke='#9DB4C8'
                    strokeWidth='0.8'
                    strokeLinecap='round'
                  />
                </svg>

                {/* Inner Content (Kept level and upright) */}
                <div className='note-content relative z-10 w-full pt-2 transition-transform'>
                  <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-3 select-none'>
                    <span className='w-7 h-px bg-[#F97316]' aria-hidden='true' />
                    Dành cho đội ngũ sáng tác truyện tranh
                  </div>
                  <h2
                    style={{
                      fontFamily: "'Patrick Hand', 'Be Vietnam Pro', cursive, sans-serif",
                    }}
                    className='text-2xl sm:text-3xl lg:text-[2.45rem] text-[#1C1917] leading-[1.22] font-medium [text-wrap:balance] max-w-[28ch]'
                  >
                    Để đội ngũ tập trung vào câu chuyện.
                  </h2>
                </div>
              </article>
            </div>

            {/* NOTE 2 (RIGHT): Tờ giấy trắng ngà #FCFBF8 - Góc +1° desktop, Ghim riêng */}
            <div id='block-intro-note-right' className='w-full transition-transform'>
              <article
                className={`relative w-full p-7 sm:p-9 lg:p-10 bg-[#FCFBF8] rounded-lg sm:rounded-[10px] border border-[#E2DDD5] transition-transform duration-300 delay-150 ${
                  isPinDropped ? 'translate-y-[1.5px]' : 'translate-y-0'
                }`}
                style={{
                  filter: 'drop-shadow(0 6px 18px rgba(28,25,23,0.06))',
                  clipPath:
                    'polygon(0% 0%, 100% 0%, 100% calc(100% - 4px), 88% calc(100% - 7px), 72% 100%, 56% calc(100% - 3px), 38% calc(100% - 6px), 22% 100%, 10% calc(100% - 4px), 0% calc(100% - 6px))',
                }}
              >
                {/* Pushpin 2: Đâm xuyên mép trên, lệch tâm 70%, rơi sau 140ms */}
                <div
                  className='absolute -top-4 left-[70%] -translate-x-1/2 flex flex-col items-center pointer-events-none select-none z-20'
                  aria-hidden='true'
                >
                  <div className={isPinDropped ? 'pin-drop-right' : 'opacity-0 -translate-y-6'}>
                    <svg
                      width='28'
                      height='34'
                      viewBox='0 0 28 34'
                      fill='none'
                      xmlns='http://www.w3.org/2000/svg'
                      className='drop-shadow-[0_3px_5px_rgba(28,25,23,0.3)]'
                    >
                      <path
                        d='M14 23 L14 32'
                        stroke='#78716C'
                        strokeWidth='2'
                        strokeLinecap='round'
                      />
                      <path
                        d='M13.5 24 L13.5 30'
                        stroke='#E7E5E4'
                        strokeWidth='0.8'
                        strokeLinecap='round'
                      />
                      <ellipse cx='14' cy='22.5' rx='6' ry='2' fill='#9A3412' />
                      <path
                        d='M9 11.5 C9 16, 11 21.5, 14 22.5 C17 21.5, 19 16, 19 11.5 Z'
                        fill='#C2410C'
                      />
                      <ellipse cx='14' cy='11' rx='9' ry='3' fill='#EA580C' />
                      <ellipse cx='14' cy='7.5' rx='5.5' ry='2.2' fill='#F97316' />
                      <ellipse cx='12.5' cy='6.8' rx='2' ry='0.8' fill='white' opacity='0.75' />
                    </svg>
                  </div>
                  <div
                    className={`w-2 h-1 rounded-full bg-[#1C1917]/75 -mt-1 transition-opacity duration-300 delay-150 ${
                      isPinDropped ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </div>

                {/* Decorative guide line in corner */}
                <svg
                  className='absolute top-3.5 right-4 w-8 h-8 pointer-events-none opacity-40 select-none'
                  viewBox='0 0 32 32'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='M4 6 L28 6 M28 6 L28 26'
                    stroke='#9DB4C8'
                    strokeWidth='0.9'
                    strokeDasharray='3 2'
                  />
                </svg>

                {/* Inner Content (Kept level and upright) */}
                <div className='note-content relative z-10 w-full pt-2 transition-transform'>
                  <p className='text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[55ch]'>
                    Kết nối kịch bản, bản vẽ và phản hồi trong cùng một quy trình sản xuất có cấu
                    trúc và đáng tin cậy. Loại bỏ trao đổi rải rác và thất lạc ý tưởng qua từng
                    chương truyện.
                  </p>
                  <div className='mt-5 flex items-center gap-2 text-xs font-mono text-[#78716C]'>
                    <span className='w-2 h-2 rounded-full bg-[#F97316]' />
                    <span>Bản thảo đồng bộ · Không ghi đè</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== VALUE PROPOSITION & EDITORIAL FEATURE SUITE ===== */}
      <section
        id='block-features'
        className='scroll-mt-20 py-16 md:py-24 relative bg-[#F3F0E9]'
        aria-label='Tính năng nổi bật'
      >
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          {/* Section Lead */}
          <div className='text-center w-full max-w-4xl mx-auto animate-on-scroll mb-14'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              02 / Vì sao chọn PanelForge
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.08] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              Sản xuất truyện tranh là dữ liệu,
              <br />
              <em className='font-normal text-[#57534E] italic'>không phải sự hỗn loạn.</em>
            </h2>
            <p className='mt-5 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[65ch] mx-auto'>
              Thay thế trao đổi rải rác qua tin nhắn và email bằng một không gian lưu trữ có cấu
              trúc cho từng quyết định sáng tạo của studio.
            </p>
          </div>

          {/* 3 Clean Docket Cards Spanning the Full Container Width */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch w-full mb-16 lg:mb-24'>
            {/* Docket Card 1 */}
            <div
              data-reveal='frame'
              className='frame-card relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs hover:border-[#1C1917]/40 transition-all duration-200 hover:shadow-soft-sm h-full'
            >
              <FrameInk />
              <div>
                <div className='w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917] mb-5'>
                  <FolderTree className='w-5 h-5 text-[#1C1917]' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.16em] text-[#78716C] font-semibold font-mono mb-2'>
                  01 / Phân cấp
                </div>
                <h3 className='font-serif text-xl sm:text-2xl font-medium text-[#1C1917] leading-snug [text-wrap:balance]'>
                  Nội dung có cấu trúc
                </h3>
                <p className='mt-3 text-sm text-[#57534E] leading-relaxed [text-wrap:pretty]'>
                  Tổ chức bộ truyện theo từng cấp độ rõ ràng: bộ truyện, tập, chương, phân cảnh và
                  khung tranh.
                </p>
              </div>
            </div>

            {/* Docket Card 2 */}
            <div
              data-reveal='frame'
              className='frame-card frame-card-2 relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs hover:border-[#1C1917]/40 transition-all duration-200 hover:shadow-soft-sm h-full'
            >
              <FrameInk />
              <div>
                <div className='w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917] mb-5'>
                  <History className='w-5 h-5 text-[#1C1917]' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.16em] text-[#78716C] font-semibold font-mono mb-2'>
                  02 / Minh bạch
                </div>
                <h3 className='font-serif text-xl sm:text-2xl font-medium text-[#1C1917] leading-snug [text-wrap:balance]'>
                  Lịch sử phiên bản
                </h3>
                <p className='mt-3 text-sm text-[#57534E] leading-relaxed [text-wrap:pretty]'>
                  Ghi nhận mọi chỉnh sửa kèm người thực hiện và mốc thời gian, tránh ghi đè nhầm bản
                  vẽ.
                </p>
              </div>
            </div>

            {/* Docket Card 3 */}
            <div
              data-reveal='frame'
              className='frame-card frame-card-3 relative flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs hover:border-[#1C1917]/40 transition-all duration-200 hover:shadow-soft-sm h-full'
            >
              <FrameInk />
              <div>
                <div className='w-11 h-11 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917] mb-5'>
                  <Sparkles className='w-5 h-5 text-[#F97316]' />
                </div>
                <div className='text-[10px] uppercase tracking-[0.16em] text-[#78716C] font-semibold font-mono mb-2'>
                  03 / Nhất quán
                </div>
                <h3 className='font-serif text-xl sm:text-2xl font-medium text-[#1C1917] leading-snug [text-wrap:balance]'>
                  Hồ sơ bộ truyện
                </h3>
                <p className='mt-3 text-sm text-[#57534E] leading-relaxed [text-wrap:pretty]'>
                  Quản lý nhân vật, đạo cụ và bối cảnh tập trung; hỗ trợ rà soát tính nhất quán khi
                  sáng tác.
                </p>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 01: NỘI DUNG CÓ CẤU TRÚC (Full Width 2-Column Spread) */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                01 / Nội dung có cấu trúc
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Mô hình dữ liệu hiểu đúng{' '}
                <em className='font-normal text-[#57534E] italic'>tư duy làm manga.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Phân cấp từ bộ truyện, tập, chương, phân cảnh đến khung truyện — liên kết kịch bản,
                hình ảnh tham chiếu và trạng thái xét duyệt mà không bị thất lạc trong thư mục.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Dữ liệu chi tiết từng khung truyện',
                    rest: '— quản lý lời thoại, hiệu ứng âm thanh (SFX) và trạng thái sản xuất.',
                  },
                  {
                    bold: 'Phân cấp trực quan',
                    rest: '— liên kết mạch lạc giữa tập, chương, phân cảnh và khung tranh.',
                  },
                  {
                    bold: 'Phân công trách nhiệm rõ ràng',
                    rest: '— nắm rõ ai đang phụ trách bản vẽ và khâu nào cần xét duyệt.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 1 Visual Preview */}
            <div className='animate-on-scroll delay-100 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 border-b border-[#E2DDD2]'>
                  <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                    Mô hình phân cấp truyện
                  </div>
                  <div className='flex items-center gap-1.5 text-[10.5px] text-[#57534E] font-mono'>
                    <Database className='w-3 h-3 text-[#1C1917]' /> Minh họa cấu trúc
                  </div>
                </div>

                <div className='pt-3.5 space-y-2.5 text-xs'>
                  {[
                    { level: 'Bộ truyện: Biên Niên Sử Aria', count: '1 bộ', indent: 0 },
                    { level: 'Tập 3: Hoàng Hôn Thành Phố', count: 'Tập hiện tại', indent: 1 },
                    { level: 'Chương 14: Lựa Chọn Đêm', count: 'Đang sản xuất', indent: 2 },
                    { level: 'Phân cảnh 04: Studio về đêm', count: '6 khung', indent: 3 },
                  ].map(({ level, count, indent }) => (
                    <div key={level} style={{ marginLeft: `${indent * 16}px` }}>
                      <div
                        className={`${indent > 0 ? 'pl-3.5 border-l border-dashed border-[#D8D2C5]' : ''} flex items-center gap-2 text-stone-700 py-1`}
                      >
                        <span className='text-stone-400 text-[10px] w-3 inline-block'>
                          {indent < 3 ? '▾' : '▸'}
                        </span>
                        <span>{level}</span>
                        <span className='ml-auto text-[10px] text-[#57534E] font-mono tabular-nums'>
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div
                    style={{ marginLeft: '64px' }}
                    className='pl-3.5 border-l border-dashed border-[#D8D2C5]'
                  >
                    <div className='flex items-center gap-2 text-[#C2410C] font-medium py-1'>
                      <span className='w-3 inline-block'>·</span>
                      <span>Khung truyện #14.3.2</span>
                      <span className='ml-auto text-[10px] text-[#C2410C] font-mono font-semibold'>
                        Đang đi nét
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-panel details */}
                <div className='mt-4 pt-4 border-t border-[#E2DDD2]'>
                  <div className='grid grid-cols-3 gap-3 text-[11px]'>
                    <div className='bg-[#FAF8F5] rounded-lg p-3 border border-[#D8D2C5]'>
                      <div className='text-[#57534E] uppercase tracking-wider text-[9px] font-semibold font-mono'>
                        Lời thoại
                      </div>
                      <div className='text-[#1C1917] mt-1 font-medium leading-snug'>
                        « Câu chuyện vẫn tiếp diễn. »
                      </div>
                    </div>
                    <div className='bg-[#FAF8F5] rounded-lg p-3 border border-[#D8D2C5]'>
                      <div className='text-[#57534E] uppercase tracking-wider text-[9px] font-semibold font-mono'>
                        Âm thanh (SFX)
                      </div>
                      <div className='text-[#1C1917] mt-1 font-medium leading-snug'>— vút nhẹ</div>
                    </div>
                    <div className='bg-[#FAF8F5] rounded-lg p-3 border border-[#D8D2C5]'>
                      <div className='text-[#57534E] uppercase tracking-wider text-[9px] font-semibold font-mono'>
                        Họa sĩ
                      </div>
                      <div className='text-[#1C1917] mt-1 font-medium leading-snug flex items-center gap-1.5'>
                        <span className='w-4 h-4 rounded-full bg-orange-100 text-[#C2410C] text-[8.5px] font-bold flex items-center justify-center font-mono'>
                          A
                        </span>
                        An (Họa sĩ)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 02: LỊCH SỬ PHIÊN BẢN (Full Width 2-Column Spread)     */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll lg:order-2'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                02 / Lịch sử phiên bản
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Mọi quyết định sáng tác đều được{' '}
                <em className='font-normal text-[#57534E] italic'>lưu dấu minh bạch.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Ghi nhận mốc thời gian và thành viên thực hiện cho từng lượt cập nhật kịch bản hoặc
                nộp bản vẽ, hỗ trợ đối chiếu dễ dàng khi duyệt trang.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Nhật ký thay đổi theo mốc thời gian',
                    rest: '— nắm rõ ai đã chỉnh sửa và vào thời điểm nào.',
                  },
                  {
                    bold: 'Đối chiếu các lượt cập nhật',
                    rest: '— so sánh bản nháp và bản đi nét để đánh giá tiến độ.',
                  },
                  {
                    bold: 'Giữ an toàn tài nguyên',
                    rest: '— hạn chế thất lạc ý tưởng hoặc ghi đè nhầm bản vẽ.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 2 Visual Preview */}
            <div className='animate-on-scroll delay-100 lg:order-1 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 border-b border-[#E2DDD2]'>
                  <div className='flex items-center gap-2'>
                    <div className='w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917]'>
                      <GitCommit className='w-4 h-4' />
                    </div>
                    <div>
                      <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                        Nhật ký thay đổi
                      </div>
                      <div className='text-[10px] text-stone-600 font-mono'>
                        Chương 14 / Phân cảnh 04
                      </div>
                    </div>
                  </div>
                  <span className='text-[9.5px] px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#1C1917] font-semibold font-mono tracking-wider border border-[#D8D2C5]'>
                    DỮ LIỆU MINH HỌA
                  </span>
                </div>

                <div className='relative pt-4 pl-6'>
                  <div className='absolute left-[10px] top-5 bottom-3 w-px bg-[#D8D2C5]' />
                  <div className='space-y-4 text-[12px]'>
                    {[
                      {
                        time: '14:42 · Jiro (Biên tập)',
                        hash: 'rev-7a3f',
                        title: 'Đã xét duyệt trang 14.1',
                        desc: 'Đối chiếu hồ sơ bộ truyện · 4 khung truyện đạt chuẩn',
                        dot: 'bg-[#F97316]',
                      },
                      {
                        time: '14:38 · An (Họa sĩ)',
                        hash: 'rev-9c12',
                        title: 'Hoàn thành bản đi nét trang 14.3',
                        desc: 'Cập nhật 3 khung truyện · Đã gắn tài liệu tham chiếu',
                        dot: 'bg-stone-400',
                      },
                      {
                        time: '14:21 · AI Trợ lý',
                        hash: 'ai-chk-2f',
                        title: 'Gợi ý kiểm tra phân cảnh 04',
                        desc: 'Nhắc nhở đối chiếu chi tiết nhân vật theo hồ sơ đã lưu',
                        dot: 'bg-[#F97316]',
                      },
                      {
                        time: '10:04 · Mai (Biên kịch)',
                        hash: 'rev-5b41',
                        title: 'Thêm phân cảnh 05 vào chương 14',
                        desc: '6 khung truyện · Kịch bản và phân cảnh ban đầu',
                        dot: 'bg-stone-400',
                      },
                    ].map((ev, i) => (
                      <div key={i} className='relative'>
                        <div
                          className={`absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full ${ev.dot} border-2 border-white ring-1 ring-stone-300`}
                        />
                        <div className='flex items-center justify-between'>
                          <div className='font-mono text-[10.5px] text-[#57534E]'>{ev.time}</div>
                          <div className='font-mono text-[9.5px] text-stone-400'>{ev.hash}</div>
                        </div>
                        <div className='mt-0.5 text-[#1C1917] font-medium'>{ev.title}</div>
                        <div className='text-[#57534E] text-[11.5px] leading-snug'>{ev.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 03: HỒ SƠ BỘ TRUYỆN (Full Width 2-Column Spread)       */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                03 / Hồ sơ bộ truyện
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Hồ sơ bộ truyện hỗ trợ{' '}
                <em className='font-normal text-[#57534E] italic'>duy trì tính nhất quán.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Lưu trữ thông tin nhân vật, đạo cụ và bối cảnh chuẩn; kết hợp AI gợi ý rà soát chi
                tiết kịch bản theo hồ sơ đã thiết lập.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Quản lý tư liệu tập trung',
                    rest: '— tra cứu nhanh đặc điểm nhận diện, trang phục và bối cảnh.',
                  },
                  {
                    bold: 'Gợi ý rà soát kịch bản',
                    rest: '— AI hỗ trợ nhắc nhở các quy tắc nhân vật đã ghi trong hồ sơ.',
                  },
                  {
                    bold: 'Giảm thiểu sai sót tiếp nối',
                    rest: '— giúp thành viên mới nắm bắt nhanh thiết lập thế giới truyện.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-white' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature 3 Visual Preview */}
            <div className='animate-on-scroll delay-100 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 border-b border-[#E2DDD2]'>
                  <div className='flex items-center gap-2'>
                    <div className='w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-center text-[#1C1917]'>
                      <Sparkles className='w-4 h-4 text-[#F97316]' />
                    </div>
                    <div>
                      <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                        Hồ sơ bộ truyện
                      </div>
                      <div className='text-[10px] text-stone-500 font-mono'>
                        Biên Niên Sử Aria · Dữ liệu minh họa
                      </div>
                    </div>
                  </div>
                  <div className='text-[10px] text-emerald-700 font-mono flex items-center gap-1.5'>
                    <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' /> Đã liên kết
                  </div>
                </div>

                <div className='pt-3.5 space-y-2.5'>
                  {/* Character card */}
                  <div className='p-3 sm:p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-2'>
                        <span className='w-5 h-5 rounded-full bg-[#EAE5DC] text-[#1C1917] text-[10px] font-bold flex items-center justify-center font-mono'>
                          A
                        </span>
                        <span className='text-sm font-semibold text-[#1C1917]'>Aria</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-[#EAE5DC] text-[#1C1917] font-semibold font-mono tracking-wider'>
                          NHÂN VẬT CHÍNH
                        </span>
                      </div>
                      <span className='text-[9px] text-stone-500 font-mono'>v3.2</span>
                    </div>
                    <div className='text-[11.5px] text-stone-700 leading-relaxed'>
                      Trầm tĩnh, kiên định · Vết sẹo mày trái giấu kín từ Tập 1 · Thoại ngắn gọn ·
                      Luôn mang huy hiệu studio.
                    </div>
                  </div>

                  {/* Relic card */}
                  <div className='p-3 sm:p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                    <div className='flex items-center justify-between mb-1'>
                      <div className='flex items-center gap-2'>
                        <span className='w-5 h-5 rounded-full bg-[#EAE5DC] text-[#1C1917] text-[10px] font-bold flex items-center justify-center font-mono'>
                          ◇
                        </span>
                        <span className='text-sm font-semibold text-[#1C1917]'>Vương Miện Cổ</span>
                        <span className='text-[9px] px-1.5 py-0.5 rounded bg-[#EAE5DC] text-[#1C1917] font-semibold font-mono tracking-wider'>
                          ĐẠO CỤ
                        </span>
                      </div>
                    </div>
                    <div className='text-[11.5px] text-stone-600 leading-relaxed'>
                      Di vật từ chương mở đầu · Nguồn cơn biến cố ở Tập 2.
                    </div>
                  </div>
                </div>

                {/* AI Notification Card */}
                <div className='mt-3.5 p-3 sm:p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                  <div className='flex items-center gap-2 mb-1'>
                    <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                    <span className='text-[10px] font-bold uppercase tracking-[0.14em] text-[#1C1917] font-mono'>
                      Gợi ý rà soát kịch bản (AI)
                    </span>
                  </div>
                  <div className='text-[11.5px] text-stone-800 leading-relaxed'>
                    Phân cảnh 04: Nhắc nhở quy tắc{' '}
                    <strong className='font-semibold text-[#1C1917]'>vết sẹo giấu kín</strong> của
                    Aria. Đảm bảo góc nghiêng phù hợp với hồ sơ nhân vật.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* FEATURE 04: QUY TRÌNH SẢN XUẤT KANBAN (Full Width Spread)      */}
          {/* ============================================================== */}
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-10 lg:gap-16 xl:gap-20 items-center w-full'>
            <div className='animate-on-scroll lg:order-2'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#1C1917] uppercase tracking-[0.2em] font-mono mb-4'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                04 / Quy trình sản xuất
              </div>
              <h3 className='font-serif text-3xl sm:text-4xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[28ch]'>
                Tiến độ liền mạch theo{' '}
                <em className='font-normal text-[#57534E] italic'>từng công đoạn.</em>
              </h3>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[52ch]'>
                Theo dõi phân cảnh qua các bước kịch bản, đi nét, xét duyệt và hoàn tất để cả đội
                ngũ cùng nắm rõ tiến độ mà không cần trao đổi thủ công dồn dập.
              </p>
              <ul className='mt-6 space-y-3.5 text-sm text-[#1C1917] max-w-[55ch]'>
                {[
                  {
                    bold: 'Bảng tiến độ trực quan',
                    rest: '— nắm bắt số lượng phân cảnh và trang trong từng khâu sản xuất.',
                  },
                  {
                    bold: 'Phối hợp liền mạch giữa các khâu',
                    rest: '— chuyển giao kịch bản sang bản vẽ và xét duyệt thuận tiện.',
                  },
                  {
                    bold: 'Giảm bớt trao đổi rời rạc',
                    rest: '— kiểm tra trạng thái trên bảng thay vì hỏi dồn qua tin nhắn.',
                  },
                ].map((item, i) => (
                  <li key={i} className='flex items-start gap-3'>
                    <span className='mt-0.5 w-5 h-5 rounded-full bg-[#1C1917] flex items-center justify-center shrink-0 shadow-xs'>
                      <Check className='w-3 h-3 text-[#FAF8F5]' />
                    </span>
                    <span>
                      <strong className='text-[#1C1917] font-semibold'>{item.bold}</strong>{' '}
                      <span className='text-[#57534E]'>{item.rest}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kanban Preview with responsive mobile horizontal scroll */}
            <div className='animate-on-scroll delay-100 lg:order-1 relative w-full'>
              <div className='relative bg-[#FFFEFA] rounded-2xl shadow-sm border border-[#D8D2C5] p-5 sm:p-6 overflow-hidden w-full'>
                <div className='flex items-center justify-between pb-3 mb-3.5 border-b border-[#D8D2C5]'>
                  <div className='text-[11px] uppercase tracking-[0.14em] text-[#57534E] font-semibold font-mono'>
                    Chương 14 · Bảng tiến độ
                  </div>
                  <div className='flex items-center gap-1.5 text-[10px] text-[#57534E] font-mono'>
                    <KanbanSquare className='w-3.5 h-3.5 text-[#1C1917]' /> Minh họa 4 công đoạn
                  </div>
                </div>

                {/* Mobile scrollable columns container */}
                <div className='flex md:grid md:grid-cols-4 gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory -mx-1 px-1'>
                  {/* Column 1: Kịch bản */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                        Kịch bản
                      </span>
                      <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                        3
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      {['Cảnh 04: Studio', 'Cảnh 05: Phố đêm', 'Cảnh 06: Bến tàu'].map((s, i) => (
                        <div
                          key={s}
                          className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'
                        >
                          <div className='text-[11px] font-semibold text-[#1C1917]'>{s}</div>
                          {i === 2 && (
                            <div className='text-[9px] text-[#57534E] mt-0.5 italic'>Bản nháp</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 2: Đi nét */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#F97316] uppercase tracking-wider font-mono'>
                        Đi nét
                      </span>
                      <span className='text-[10px] text-[#F97316] font-mono font-bold tabular-nums'>
                        5
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#F97316]/40 shadow-xs'>
                        <div className='text-[11px] font-semibold text-[#1C1917]'>Trang 14.3</div>
                        <div className='mt-1 text-[9px] text-[#F97316] font-medium'>
                          2/3 khung xong
                        </div>
                      </div>
                      {['Trang 14.4', 'Trang 14.5'].map((p) => (
                        <div
                          key={p}
                          className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'
                        >
                          <div className='text-[11px] font-semibold text-[#1C1917]'>{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Column 3: Xét duyệt */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider font-mono'>
                        Xét duyệt
                      </span>
                      <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                        2
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                        <div className='text-[11px] font-semibold text-[#1C1917]'>Trang 14.1</div>
                        <div className='text-[9px] text-[#1C1917] mt-0.5 font-medium inline-block bg-[#EAE5DC] px-1.5 py-0.5 rounded'>
                          1 lưu ý AI
                        </div>
                      </div>
                      <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                        <div className='text-[11px] font-semibold text-[#1C1917]'>Trang 14.2</div>
                      </div>
                    </div>
                  </div>

                  {/* Column 4: Hoàn tất */}
                  <div className='min-w-[190px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='text-[10px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                        Hoàn tất
                      </span>
                      <span className='text-[10px] text-[#1C1917] font-mono font-bold tabular-nums'>
                        24
                      </span>
                    </div>
                    <div className='space-y-1.5'>
                      {['Trang 13.8', 'Trang 13.7', 'Trang 13.6'].map((p) => (
                        <div
                          key={p}
                          className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'
                        >
                          <div className='text-[11px] font-semibold text-[#57534E]'>{p}</div>
                          <div className='text-[9px] text-[#1C1917] mt-0.5 flex items-center gap-1 font-medium'>
                            <Check className='w-2.5 h-2.5 text-[#F97316]' /> Đã duyệt
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile scroll hint */}
                <div className='md:hidden mt-2 text-center text-[10.5px] text-[#57534E] flex items-center justify-center gap-1.5'>
                  <span>Vuốt ngang để xem đủ 4 công đoạn</span>
                  <span aria-hidden='true'>→</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== SECTION: QUY TRÌNH 4 CÔNG ĐOẠN & THANH SO SÁNH ===== */}
      <section
        id='block-workflow'
        className='py-16 md:py-24 relative scroll-mt-20 bg-[#F3F0E9]'
        aria-label='Quy trình sản xuất'
      >
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          <div className='text-center w-full max-w-4xl mx-auto mb-14 animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              03 / Quy trình sản xuất
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.1] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              Từ kịch bản đến trang truyện hoàn thiện.
            </h2>
            <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[65ch] mx-auto'>
              Bốn công đoạn nối tiếp nhịp nhàng, trực quan hóa tiến trình sáng tạo từ văn bản phác
              thảo đến ấn phẩm màu sắc.
            </p>
          </div>

          {/* 4-Stage Manga Journey Strip Spanning the Full Container Width */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 w-full mb-16 lg:mb-24'>
            {/* Step 01: Kịch bản (Biên kịch - Structured HTML/CSS Docket) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#1C1917] font-mono uppercase tracking-wider'>
                  01 / Kịch bản
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] border border-[#D8D2C5]'>
                  Biên kịch
                </span>
              </div>

              {/* Manuscript Docket Card Preview */}
              <div className='aspect-[4/5] w-full rounded-xl bg-[#FAF8F5] border border-[#D8D2C5] p-4 sm:p-5 flex flex-col justify-between overflow-hidden relative shadow-2xs'>
                <div className='space-y-2.5 text-left'>
                  <div className='flex items-center justify-between pb-2 border-b border-[#E2DDD2]'>
                    <span className='text-[10px] font-mono text-[#57534E]'>Cảnh 04 · Khung 02</span>
                    <span className='text-[9px] font-mono font-bold text-[#F97316]'>TẬP 3</span>
                  </div>
                  <div className='text-xs text-[#57534E] leading-relaxed'>
                    <span className='font-semibold text-[#1C1917]'>[Bối cảnh]:</span> Xưởng vẽ gác
                    mái về đêm. Đèn bàn vàng ấm soi rọi trang bản thảo.
                  </div>
                  <div className='text-xs text-[#1C1917] font-serif italic bg-[#FFFEFA] p-2.5 rounded-lg border border-[#D8D2C5]'>
                    « Bản thảo này... câu chuyện bắt đầu ở đây. »
                  </div>
                  <div className='text-[10.5px] font-mono text-stone-500'>
                    SFX: — xoẹt nhẹ ngòi bút G-Pen
                  </div>
                </div>

                <div className='pt-2 border-t border-[#E2DDD2] flex items-center justify-between text-[10px] font-mono text-[#78716C]'>
                  <span>Trạng thái: Đã duyệt thoại</span>
                  <span>v1.0</span>
                </div>
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Soạn kịch bản phân khung có cấu trúc, gắn lời thoại, SFX và ghi chú mỹ thuật cho họa
                sĩ.
              </div>
            </div>

            {/* Step 02: Phác thảo (journey-sketch.webp) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#1C1917] font-mono uppercase tracking-wider'>
                  02 / Phác thảo
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] border border-[#D8D2C5]'>
                  Họa sĩ
                </span>
              </div>

              {/* Real Local WebP: journey-sketch.webp */}
              <div className='aspect-[4/5] w-full rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#FAF8F5] relative shadow-2xs'>
                <img
                  src='/images/landing/journey-sketch.webp'
                  alt='Công đoạn phác thảo khung truyện (Sketch)'
                  loading='lazy'
                  className='w-full h-full object-cover object-center'
                />
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Dựng bố cục khung tranh thô, góc nhìn phối cảnh và cử chỉ nhân vật theo mạch kịch
                bản.
              </div>
            </div>

            {/* Step 03: Đi nét (journey-ink.webp) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#1C1917] font-mono uppercase tracking-wider'>
                  03 / Đi nét
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] border border-[#D8D2C5]'>
                  Họa sĩ
                </span>
              </div>

              {/* Real Local WebP: journey-ink.webp */}
              <div className='aspect-[4/5] w-full rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#FAF8F5] relative shadow-2xs'>
                <img
                  src='/images/landing/journey-ink.webp'
                  alt='Công đoạn đi nét mực đen (Inking)'
                  loading='lazy'
                  className='w-full h-full object-cover object-center'
                />
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Đi nét mực đen chi tiết, tả chất liệu vải áo, nếp gấp, tóc và các đường speedline
                manga.
              </div>
            </div>

            {/* Step 04: Hoàn thiện (journey-color.webp) */}
            <div className='flex flex-col rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] shadow-xs p-5 sm:p-6 select-none hover:border-[#1C1917]/40 transition-colors'>
              <div className='flex items-center justify-between mb-3.5'>
                <span className='text-[11px] font-bold text-[#F97316] font-mono uppercase tracking-wider'>
                  04 / Hoàn thiện
                </span>
                <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#F97316] border border-[#F97316]/30 font-semibold'>
                  Biên tập & Màu
                </span>
              </div>

              {/* Real Local WebP: journey-color.webp */}
              <div className='aspect-[4/5] w-full rounded-xl overflow-hidden border border-[#D8D2C5] bg-[#FAF8F5] relative shadow-2xs'>
                <img
                  src='/images/landing/journey-color.webp'
                  alt='Công đoạn hoàn thiện màu sắc và ánh sáng (Color)'
                  loading='lazy'
                  className='w-full h-full object-cover object-center'
                />
              </div>

              <div className='mt-3.5 text-xs text-[#57534E] leading-relaxed'>
                Đổ màu, chiếu sáng ấm áp góc đèn bàn, trau chuốt biểu cảm và kiểm tra tính nhất
                quán.
              </div>
            </div>
          </div>

          {/* Unified Hairline Separator */}
          <div className='w-full h-px bg-[#D8D2C5]/70 my-16 lg:my-20' aria-hidden='true' />

          {/* ============================================================== */}
          {/* THANH SO SÁNH: BỐ CỤC 2 CỘT RỘNG THEO CONTAINER (BỎ CARD HẸP) */}
          {/* ============================================================== */}
          <div id='block-comparison' className='w-full py-4'>
            <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,48%)_minmax(0,52%)] gap-10 lg:gap-14 xl:gap-20 items-center w-full'>
              {/* Left Column (48%): Comparison Visual Viewport - Centered in column with ~4:5 ratio matching card 04 */}
              <div className='flex flex-col items-center justify-center w-full'>
                <div className='relative w-full max-w-[420px] xl:max-w-[440px] aspect-[4/5] rounded-2xl overflow-hidden border-2 border-[#1C1917] shadow-[4px_4px_0px_#1C1917] select-none bg-[#FFFEFA]'>
                  {/* Bottom Layer: Hoàn thiện (Color) */}
                  <img
                    src='/images/landing/journey-color.webp'
                    alt='Bản màu hoàn thiện'
                    className='absolute inset-0 w-full h-full object-contain object-center pointer-events-none select-none'
                    loading='lazy'
                    draggable={false}
                  />

                  {/* Top Layer: Phác thảo (Sketch) clipped by slider position */}
                  <div
                    className='absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none'
                    style={{
                      clipPath: `inset(0 ${100 - comparisonSliderPos}% 0 0)`,
                    }}
                  >
                    <img
                      src='/images/landing/journey-sketch.webp'
                      alt='Bản phác thảo thô'
                      className='absolute inset-0 w-full h-full object-contain object-center select-none'
                      loading='lazy'
                      draggable={false}
                    />
                  </div>

                  {/* Divider Line & Handle */}
                  <div
                    className='absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.6)] z-10 pointer-events-none'
                    style={{ left: `${comparisonSliderPos}%` }}
                  >
                    <div className='absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[#1C1917] border-2 border-white shadow-md flex items-center justify-center text-white text-[11px] font-bold font-mono'>
                      ↔
                    </div>
                  </div>

                  {/* Badges on Top of Slider */}
                  <div className='absolute top-3.5 left-3.5 z-10 pointer-events-none'>
                    <span className='px-3 py-1 rounded-md bg-[#1C1917]/85 backdrop-blur-xs text-white text-[11px] font-mono font-medium shadow-xs'>
                      Phác thảo (Sketch)
                    </span>
                  </div>
                  <div className='absolute top-3.5 right-3.5 z-10 pointer-events-none'>
                    <span className='px-3 py-1 rounded-md bg-[#F97316]/90 backdrop-blur-xs text-white text-[11px] font-mono font-medium shadow-xs'>
                      Hoàn thiện (Color)
                    </span>
                  </div>

                  {/* Accessible Range Input Overlaid for Drag, Touch & Keyboard */}
                  <input
                    type='range'
                    min='0'
                    max='100'
                    value={comparisonSliderPos}
                    onChange={(e) => setComparisonSliderPos(Number(e.target.value))}
                    aria-label='Thanh so sánh bản phác thảo và bản hoàn thiện'
                    className='absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20 focus-visible:opacity-20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-stone-900'
                  />
                </div>

                {/* Sub-label aligned with image width */}
                <div className='w-full max-w-[420px] xl:max-w-[440px] flex items-center justify-between text-xs font-mono text-stone-500 mt-3 px-1'>
                  <span>← Kéo sang trái (xem màu)</span>
                  <span className='tabular-nums font-semibold text-stone-700'>
                    {comparisonSliderPos}%
                  </span>
                  <span>Kéo sang phải (xem phác thảo) →</span>
                </div>
              </div>

              {/* Right Column (52%): Overline, Heading, Description, Interactive Controls */}
              <div className='flex flex-col items-start text-left w-full'>
                <div className='inline-flex items-center gap-2 text-[11px] font-mono font-semibold text-[#F97316] uppercase tracking-[0.2em] mb-3 select-none'>
                  <span className='w-7 h-px bg-[#F97316]' aria-hidden='true' />
                  Đối chiếu công đoạn
                </div>
                <h3 className='font-serif text-3xl sm:text-4xl font-medium text-[#1C1917] leading-tight mb-4 [text-wrap:balance] max-w-[28ch]'>
                  Thanh so sánh: Phác thảo & Hoàn thiện
                </h3>
                <p className='text-base text-[#57534E] leading-relaxed mb-6 [text-wrap:pretty] max-w-[55ch]'>
                  Kéo con trượt để trực tiếp quan sát sự chuyển dịch từ nét vẽ phác thảo thô sơ sang
                  bản màu hoàn thiện. Hai công đoạn minh họa cùng một phân cảnh với ánh sáng và chi
                  tiết được trau chuốt tỉ mỉ.
                </p>

                {/* Preset Quick Buttons */}
                <div className='flex flex-wrap items-center gap-2.5 mb-6 select-none'>
                  <span className='text-xs font-mono text-[#78716C] mr-1'>Chế độ xem:</span>
                  <button
                    type='button'
                    onClick={() => setComparisonSliderPos(100)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      comparisonSliderPos === 100
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-[#FFFEFA] text-[#57534E] border-[#D8D2C5] hover:border-[#1C1917]'
                    }`}
                  >
                    100% Phác thảo
                  </button>
                  <button
                    type='button'
                    onClick={() => setComparisonSliderPos(50)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      comparisonSliderPos === 50
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-[#FFFEFA] text-[#57534E] border-[#D8D2C5] hover:border-[#1C1917]'
                    }`}
                  >
                    50 / 50 Đối chiếu
                  </button>
                  <button
                    type='button'
                    onClick={() => setComparisonSliderPos(0)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all cursor-pointer ${
                      comparisonSliderPos === 0
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-xs'
                        : 'bg-[#FFFEFA] text-[#57534E] border-[#D8D2C5] hover:border-[#1C1917]'
                    }`}
                  >
                    100% Hoàn thiện
                  </button>
                </div>

                {/* Three Editorial Verification Bullet Points */}
                <div className='space-y-3 w-full max-w-[55ch] pt-5 border-t border-[#D8D2C5]/80 text-xs sm:text-[13px] text-[#57534E]'>
                  <div className='flex items-start gap-2.5'>
                    <Check className='w-4 h-4 text-[#F97316] shrink-0 mt-0.5' />
                    <span>
                      Bản phác thảo định hình chuyển động nhân vật và góc nhìn phối cảnh ban đầu.
                    </span>
                  </div>
                  <div className='flex items-start gap-2.5'>
                    <Check className='w-4 h-4 text-[#F97316] shrink-0 mt-0.5' />
                    <span>
                      Bản hoàn thiện phủ màu điện ảnh, ánh sáng vàng ấm và tả chất liệu chi tiết.
                    </span>
                  </div>
                  <div className='flex items-start gap-2.5'>
                    <Check className='w-4 h-4 text-[#F97316] shrink-0 mt-0.5' />
                    <span>
                      Trực quan hóa tiến trình sáng tác, giúp biên tập viên đối chiếu nhanh khi xét
                      duyệt.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== SECTION: TRƯNG BÀY KHÔNG GIAN LÀM VIỆC (SHOWCASE WITH ACCESSIBLE TABS) ===== */}
      <section
        id='block-showcase'
        className='py-16 md:py-24 relative overflow-hidden scroll-mt-20 bg-[#F3F0E9]'
        aria-label='Trưng bày không gian làm việc'
      >
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          <div className='text-center w-full max-w-4xl mx-auto mb-12 animate-on-scroll'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              04 / Không gian làm việc
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.08] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              Một không gian cho mọi vai trò.
            </h2>
            <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[65ch] mx-auto'>
              Biên kịch, họa sĩ, biên tập viên và đội ngũ quản lý cùng làm việc trên một nguồn dữ
              liệu có cấu trúc.
            </p>
          </div>

          {/* Interactive Workspace Window Spanning the Full Container Width */}
          <div className='relative animate-on-scroll w-full'>
            <div className='relative bg-[#FFFEFA] rounded-2xl sm:rounded-3xl shadow-sm border border-[#D8D2C5] overflow-hidden w-full'>
              {/* Window Chrome Header */}
              <div className='flex items-center gap-2 px-4 sm:px-6 py-3 border-b border-[#D8D2C5] bg-[#F3F0E9]'>
                <div className='flex items-center gap-1.5' aria-hidden='true'>
                  <div className='w-2.5 h-2.5 rounded-full bg-[#D8D2C5]' />
                  <div className='w-2.5 h-2.5 rounded-full bg-[#D8D2C5]' />
                  <div className='w-2.5 h-2.5 rounded-full bg-[#D8D2C5]' />
                </div>
                <div className='ml-2 flex items-center gap-1.5 text-[10.5px] text-[#57534E] font-mono truncate'>
                  <Lock className='w-3 h-3 text-[#78716C]' />
                  <span className='truncate'>
                    panelforge.studio / bien-nien-su-aria / chuong-14
                  </span>
                </div>
                <div className='ml-auto flex items-center gap-2'>
                  <span className='text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] font-medium border border-[#D8D2C5]'>
                    Dữ liệu minh họa
                  </span>
                </div>
              </div>

              {/* Accessible Tab Bar */}
              <div
                role='tablist'
                aria-label='Không gian làm việc minh họa'
                className='flex items-center gap-2 px-4 sm:px-6 py-2.5 border-b border-[#D8D2C5] bg-[#F3F0E9]/80 overflow-x-auto scrollbar-thin'
              >
                {[
                  { key: 'pipeline', label: 'Quy trình sản xuất' },
                  { key: 'script', label: 'Kịch bản phân khung' },
                  { key: 'bible', label: 'Hồ sơ bộ truyện' },
                  { key: 'events', label: 'Nhật ký thay đổi' },
                  { key: 'references', label: 'Tài liệu tham chiếu' },
                ].map(({ key, label }) => {
                  const isActive = activeShowcaseTab === key;
                  return (
                    <button
                      key={key}
                      id={`showcase-tab-${key}`}
                      role='tab'
                      type='button'
                      aria-controls={`showcase-panel-${key}`}
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActiveShowcaseTab(key as typeof activeShowcaseTab)}
                      onKeyDown={(e) => handleTabKeyDown(e, key as typeof activeShowcaseTab)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C1917] ${
                        isActive
                          ? 'bg-[#1C1917] text-[#FAF8F5] shadow-xs font-semibold'
                          : 'bg-[#FCFBF8] text-[#57534E] border border-[#D8D2C5] hover:border-[#1C1917] hover:text-[#1C1917]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Panels */}
              <div className='p-4 sm:p-6 bg-[#FFFEFA] transition-opacity duration-150 ease-out motion-reduce:transition-none'>
                {/* 1. PIPELINE TAB */}
                {activeShowcaseTab === 'pipeline' && (
                  <div
                    id='showcase-panel-pipeline'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-pipeline'
                    tabIndex={0}
                    className='focus-visible:outline-none'
                  >
                    <div className='flex md:grid md:grid-cols-4 gap-3.5 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory'>
                      {/* Script Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                            Kịch bản
                          </span>
                          <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                            3
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Cảnh 04: Studio về đêm
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              « Bối cảnh: Thành phố lên đèn »
                            </div>
                          </div>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Cảnh 05: Phố mưa
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              « Hành động: An nhìn lại »
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inking Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#F97316] uppercase tracking-wider font-mono'>
                            Đi nét
                          </span>
                          <span className='text-[10px] text-[#F97316] font-mono font-bold tabular-nums'>
                            5
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#F97316]/40 shadow-xs'>
                            <div className='flex items-center justify-between'>
                              <div className='text-[11px] font-semibold text-[#1C1917]'>
                                Trang 14.3
                              </div>
                              <span className='text-[8.5px] px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#F97316] font-bold border border-[#F97316]/30'>
                                Đang vẽ
                              </span>
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              Họa sĩ: An · 3/4 khung hoàn tất
                            </div>
                          </div>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Trang 14.4
                            </div>
                            <div className='text-[9.5px] text-[#57534E] mt-0.5'>
                              Chờ dựng phối cảnh
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Review Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#57534E] uppercase tracking-wider font-mono'>
                            Xét duyệt
                          </span>
                          <span className='text-[10px] text-[#57534E] font-mono font-bold tabular-nums'>
                            2
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Trang 14.1
                            </div>
                            <div className='text-[9.5px] text-[#1C1917] mt-0.5 font-medium inline-flex items-center gap-1 bg-[#EAE5DC] px-1.5 py-0.5 rounded'>
                              <Sparkles className='w-2.5 h-2.5 text-[#F97316]' /> AI: Kiểm tra vết
                              sẹo
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Done Column */}
                      <div className='min-w-[210px] md:min-w-0 snap-start flex-1 shrink-0 bg-[#FAF8F5] rounded-xl p-3 border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-2.5'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] uppercase tracking-wider font-mono'>
                            Đã duyệt
                          </span>
                          <span className='text-[10px] text-[#1C1917] font-mono font-bold tabular-nums'>
                            24
                          </span>
                        </div>
                        <div className='space-y-2'>
                          <div className='bg-[#FFFEFA] rounded-lg p-2.5 border border-[#D8D2C5] shadow-xs'>
                            <div className='text-[11px] font-semibold text-[#1C1917]'>
                              Trang 13.8
                            </div>
                            <div className='text-[9.5px] text-[#1C1917] mt-0.5 flex items-center gap-1 font-medium'>
                              <Check className='w-2.5 h-2.5 text-[#F97316]' /> Đã đóng gói xuất bản
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='md:hidden mt-2 text-center text-[10.5px] text-[#57534E]'>
                      Vuốt ngang để xem đủ 4 công đoạn →
                    </div>
                  </div>
                )}

                {/* 2. SCRIPT TAB */}
                {activeShowcaseTab === 'script' && (
                  <div
                    id='showcase-panel-script'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-script'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>
                          Phân cảnh 04: Studio về đêm
                        </span>
                        <span className='text-[#57534E] ml-2'>· Tập 3, Chương 14</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#57534E]'>
                        Soạn thảo kịch bản phân khung
                      </span>
                    </div>

                    <div className='grid md:grid-cols-3 gap-3'>
                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] font-mono'>
                            Khung #01 (Toàn cảnh)
                          </span>
                          <span className='text-[9.5px] font-mono text-[#57534E]'>1/3 trang</span>
                        </div>
                        <p className='text-xs text-[#57534E] leading-relaxed'>
                          <strong className='text-[#1C1917]'>Bối cảnh:</strong> Thành phố lên đèn từ
                          góc cao. Một ô cửa sổ xưởng vẽ gác mái vẫn sáng ánh đèn vàng.
                        </p>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] font-mono'>
                            Khung #02 (Cận cảnh)
                          </span>
                          <span className='text-[9.5px] font-mono text-[#57534E]'>1/3 trang</span>
                        </div>
                        <p className='text-xs text-[#57534E] leading-relaxed'>
                          <strong className='text-[#1C1917]'>Hành động:</strong> An cúi xuống bản
                          thảo, tay cầm bút vẽ G-Pen. Ánh mắt kiên định.
                        </p>
                        <p className='text-xs text-[#1C1917] mt-1 italic'>
                          « Thoại: "Bản thảo này... câu chuyện bắt đầu ở đây." »
                        </p>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='flex items-center justify-between mb-1'>
                          <span className='text-[10.5px] font-bold text-[#1C1917] font-mono'>
                            Khung #03 (Chi tiết tay)
                          </span>
                          <span className='text-[9.5px] font-mono text-[#57534E]'>1/3 trang</span>
                        </div>
                        <p className='text-xs text-[#57534E] leading-relaxed'>
                          <strong className='text-[#1C1917]'>Chi tiết:</strong> Ngòi bút chạm nhẹ
                          trang giấy bản thảo. Lọ mực đen mở nắp phản chiếu ánh đèn bàn.
                        </p>
                        <div className='text-[10.5px] text-[#57534E] mt-1 font-mono'>
                          SFX: — xoẹt nhẹ
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. BIBLE TAB */}
                {activeShowcaseTab === 'bible' && (
                  <div
                    id='showcase-panel-bible'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-bible'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>
                          Hồ sơ bộ truyện đã khóa
                        </span>
                        <span className='text-[#57534E] ml-2'>· Chuẩn mực tác phẩm</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#1C1917] bg-[#EAE5DC] px-2 py-0.5 rounded border border-[#D8D2C5]'>
                        Quy tắc nhất quán v3.2
                      </span>
                    </div>

                    <div className='grid md:grid-cols-2 gap-3'>
                      <div className='p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                        <div className='flex items-center gap-2 mb-2'>
                          <span className='w-6 h-6 rounded-full bg-[#1C1917] text-[#FAF8F5] text-[10px] font-bold flex items-center justify-center font-mono'>
                            A
                          </span>
                          <div>
                            <div className='text-xs font-bold text-[#1C1917]'>
                              Nhân vật: An (Họa sĩ chính)
                            </div>
                            <div className='text-[10px] text-[#57534E]'>
                              Đặc điểm nhận diện & trang phục
                            </div>
                          </div>
                        </div>
                        <ul className='text-xs text-[#57534E] space-y-1 list-disc list-inside'>
                          <li>Trang phục: Áo khoác xám dài có ghim cài studio ở vạt trái.</li>
                          <li>Tóc đen đánh rối tự nhiên, ánh mắt tập trung cao độ.</li>
                          <li>Dụng cụ quen thuộc: Bút vẽ G-Pen ngòi vàng thủ công.</li>
                        </ul>
                      </div>

                      <div className='p-3.5 rounded-xl border border-[#D8D2C5] bg-[#FAF8F5]'>
                        <div className='flex items-center gap-2 mb-2'>
                          <span className='w-6 h-6 rounded-full bg-[#EAE5DC] text-[#1C1917] text-[10px] font-bold flex items-center justify-center border border-[#D8D2C5]'>
                            <Sparkles className='w-3 h-3 text-[#F97316]' />
                          </span>
                          <div>
                            <div className='text-xs font-bold text-[#1C1917]'>
                              Quy tắc AI đối chiếu nhất quán
                            </div>
                            <div className='text-[10px] text-[#57534E]'>
                              Gợi ý rà soát khi nộp trang vẽ
                            </div>
                          </div>
                        </div>
                        <ul className='text-xs text-[#57534E] space-y-1 list-disc list-inside'>
                          <li>Kiểm tra hướng nguồn sáng đèn bàn vàng ấm góc 45 độ.</li>
                          <li>Đối chiếu cấu trúc bàn tay cầm bút đúng tư thế manga thực tế.</li>
                          <li>Cảnh báo ngay nếu phục trang nhân vật lệch khỏi hồ sơ.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. EVENTS TAB */}
                {activeShowcaseTab === 'events' && (
                  <div
                    id='showcase-panel-events'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-events'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>Nhật ký thay đổi</span>
                        <span className='text-[#57534E] ml-2'>· Lưu trữ từng phiên bản</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#57534E]'>Không thể ghi đè</span>
                    </div>

                    <div className='space-y-2 text-xs'>
                      {[
                        {
                          time: '14:42 · Jiro (Biên tập)',
                          action: 'Đã phê duyệt trang 14.1',
                          detail: 'Đối chiếu hồ sơ nhân vật An đạt chuẩn',
                          tag: 'Phê duyệt',
                        },
                        {
                          time: '14:38 · An (Họa sĩ)',
                          action: 'Nộp bản vẽ v3 cho khung #02 và #03',
                          detail: 'Bổ sung màu và ánh sáng đổ bóng',
                          tag: 'Cập nhật',
                        },
                        {
                          time: '14:21 · AI Trợ lý',
                          action: 'Gợi ý kiểm tra chi tiết nhân vật',
                          detail: 'Nhắc nhở đối chiếu vết sẹo theo hồ sơ v3.2',
                          tag: 'AI Gợi ý',
                        },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className='p-2.5 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex items-center justify-between'
                        >
                          <div>
                            <div className='font-medium text-[#1C1917]'>{item.action}</div>
                            <div className='text-[11px] text-[#57534E]'>
                              {item.time} · {item.detail}
                            </div>
                          </div>
                          <span className='text-[9.5px] px-2 py-0.5 rounded bg-[#EAE5DC] text-[#1C1917] font-mono border border-[#D8D2C5]'>
                            {item.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. REFERENCES TAB */}
                {activeShowcaseTab === 'references' && (
                  <div
                    id='showcase-panel-references'
                    role='tabpanel'
                    aria-labelledby='showcase-tab-references'
                    tabIndex={0}
                    className='focus-visible:outline-none space-y-3'
                  >
                    <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-2 text-xs'>
                      <div>
                        <span className='font-semibold text-[#1C1917]'>
                          Tài liệu tham chiếu chương 14
                        </span>
                        <span className='text-[#57534E] ml-2'>· Bảng màu & tư liệu phối cảnh</span>
                      </div>
                      <span className='text-[10px] font-mono text-[#57534E]'>
                        Đã gắn vào kịch bản
                      </span>
                    </div>

                    <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs'>
                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 flex items-center gap-1 font-mono'>
                          <Palette className='w-3 h-3 text-[#F97316]' /> Bảng màu chính
                        </div>
                        <div className='flex gap-1.5 mt-2'>
                          <div
                            className='w-6 h-6 rounded-md bg-[#1C1917]'
                            title='Đen mực #1C1917'
                          />
                          <div
                            className='w-6 h-6 rounded-md bg-[#F97316]'
                            title='Cam PanelForge #F97316'
                          />
                          <div
                            className='w-6 h-6 rounded-md bg-[#FAF8F5] border border-[#D8D2C5]'
                            title='Giấy ngà #FAF8F5'
                          />
                          <div
                            className='w-6 h-6 rounded-md bg-[#57534E]'
                            title='Xám chì #57534E'
                          />
                        </div>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 flex items-center gap-1 font-mono'>
                          <BookMarked className='w-3 h-3 text-[#1C1917]' /> Bối cảnh
                        </div>
                        <div className='font-semibold text-[#1C1917] mt-1'>Studio gác mái</div>
                        <div className='text-[10.5px] text-[#57534E] mt-0.5'>
                          Cửa sổ nhìn ra đường chân trời đô thị
                        </div>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 font-mono'>
                          Đạo cụ tham chiếu
                        </div>
                        <div className='font-semibold text-[#1C1917] mt-1'>Bút vẽ G-Pen</div>
                        <div className='text-[10.5px] text-[#57534E] mt-0.5'>
                          Góc cầm 45 độ, ngòi kim loại ánh vàng
                        </div>
                      </div>

                      <div className='p-3 rounded-xl bg-[#FAF8F5] border border-[#D8D2C5]'>
                        <div className='text-[10px] font-bold text-[#57534E] uppercase tracking-wider mb-1 font-mono'>
                          Ánh sáng chủ đạo
                        </div>
                        <div className='font-semibold text-[#1C1917] mt-1'>Đèn bàn ấm</div>
                        <div className='text-[10.5px] text-[#57534E] mt-0.5'>
                          Tương phản cao với bầu trời đêm ngoài cửa
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subtle Hairline Section Divider on Continuous Paper */}
      <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full' aria-hidden='true'>
        <div className='w-full h-px bg-[#D8D2C5]/80' />
      </div>

      {/* ===== FAQ SECTION (DESKTOP TWO-COLUMN EDITORIAL SPREAD: LEFT HEADING, RIGHT ACCORDIONS) ===== */}
      <section
        id='block-faq'
        className='py-16 md:py-24 relative scroll-mt-20 bg-[#F3F0E9]'
        aria-label='Hỏi đáp thường gặp'
      >
        <div className='max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full'>
          <div className='grid grid-cols-1 lg:grid-cols-[minmax(0,38%)_minmax(0,62%)] gap-10 lg:gap-14 xl:gap-20 items-start w-full animate-on-scroll'>
            {/* Left Column (38%): Overline, Heading & Editorial Description */}
            <div className='text-left w-full'>
              <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
                <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
                05 / Giải đáp thắc mắc
              </div>
              <h2 className='font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance] max-w-[22ch]'>
                Câu hỏi thường gặp về PanelForge.
              </h2>
              <p className='mt-4 text-base sm:text-lg text-[#57534E] leading-relaxed [text-wrap:pretty] max-w-[42ch]'>
                Những thắc mắc phổ biến về vai trò thành viên, quy trình studio và lưu trữ dữ liệu
                bản thảo trong quá trình sáng tác.
              </p>

              <div className='mt-8 p-5 rounded-2xl bg-[#FFFEFA] border border-[#D8D2C5] max-w-[42ch]'>
                <div className='text-xs font-mono font-semibold text-[#1C1917] uppercase tracking-wider mb-1'>
                  Hỗ trợ studio trực tiếp
                </div>
                <div className='text-xs text-[#57534E] leading-relaxed'>
                  Bạn đang xây dựng quy trình sáng tác cho đội ngũ lớn? Các quản trị viên có thể
                  thiết lập phân quyền và lưu vết theo yêu cầu của từng bộ truyện.
                </div>
              </div>
            </div>

            {/* Right Column (62%): Accordion List */}
            <div className='space-y-4 w-full'>
              {[
                {
                  question: 'Ai có thể sử dụng PanelForge?',
                  answer:
                    'PanelForge được thiết kế cho các đội ngũ sáng tác truyện tranh, studio và nhóm tác giả độc lập gồm biên kịch, họa sĩ, biên tập viên và trưởng dự án. Nền tảng phân quyền rõ ràng theo từng vai trò công việc để việc cộng tác luôn trật tự.',
                },
                {
                  question: 'Tài khoản mới có thể tự tạo studio không?',
                  answer:
                    'Có. Sau khi đăng ký tài khoản, bạn có thể tự khởi tạo studio sản xuất mới của riêng mình hoặc được thêm vào studio của đội ngũ khác qua email mời của thành viên quản trị.',
                },
                {
                  question: 'AI hỗ trợ đội ngũ ở bước nào?',
                  answer:
                    'AI đóng vai trò như một trợ lý rà soát kịch bản và phân cảnh, đối chiếu các chi tiết trong kịch bản với thông tin đã thiết lập trong Hồ sơ bộ truyện (đặc điểm nhân vật, trang phục, quy tắc thế giới) để nhắc nhở đội ngũ giữ tính nhất quán.',
                },
                {
                  question: 'Các phiên bản cũ được quản lý thế nào?',
                  answer:
                    'Mỗi lượt cập nhật kịch bản hoặc gửi bản vẽ mới đều được hệ thống ghi nhận thành các mốc riêng kèm thời gian và người thực hiện. Đội ngũ có thể xem lại lịch sử các lần nộp để đối chiếu và theo dõi tiến độ hoàn thiện của từng trang.',
                },
              ].map(({ question, answer }, idx) => (
                <details
                  key={idx}
                  className='group rounded-xl border border-[#D8D2C5] bg-[#FFFEFA] shadow-2xs transition-all duration-200 open:border-[#1C1917]/40 open:shadow-xs w-full'
                >
                  <summary className='flex items-center justify-between gap-4 p-4 sm:p-5 text-left font-serif text-lg font-medium text-[#1C1917] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 rounded-xl'>
                    <span>{question}</span>
                    <ChevronDown className='w-4 h-4 text-[#57534E] shrink-0 transition-transform duration-200 group-open:rotate-180' />
                  </summary>
                  <div className='px-4 sm:px-5 pb-5 pt-1 text-sm text-[#57534E] leading-relaxed border-t border-[#D8D2C5]/50'>
                    {answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== FINAL CALL TO ACTION (CTA) ===== */}
      <section
        id='block-cta'
        className='py-16 md:py-24 relative scroll-mt-20 bg-[#F3F0E9] border-t border-[#D8D2C5]'
        aria-label='Bắt đầu sáng tác'
      >
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] w-full text-center'>
          <div className='animate-on-scroll max-w-3xl mx-auto'>
            <div className='inline-flex items-center gap-2 text-[11px] font-semibold text-[#F97316] uppercase tracking-[0.2em] font-mono mb-4 select-none'>
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
              Bắt đầu sáng tác
              <span className='w-8 h-px bg-[#F97316]' aria-hidden='true' />
            </div>
            <h2 className='font-serif text-3xl sm:text-4xl md:text-5xl font-medium leading-[1.12] tracking-tight text-[#1C1917] [text-wrap:balance]'>
              Cùng tạo nên câu chuyện{' '}
              <span className='relative inline-block'>
                <span>tiếp theo.</span>
                <span className='absolute bottom-1 left-0 w-full h-[3px] bg-[#F97316]/40 -z-10 rounded-full' />
              </span>
            </h2>
            <p className='mt-5 text-base sm:text-lg text-[#57534E] max-w-xl mx-auto leading-relaxed [text-wrap:pretty]'>
              Đưa đội ngũ, kịch bản và quy trình của bạn vào PanelForge. Biến những tháng ngày làm
              việc rời rạc thành một chu trình sáng tác có cấu trúc và đáng tin cậy.
            </p>

            {/* Action buttons */}
            <div className='mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5'>
              <button
                onClick={handleRegisterClick}
                className='w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#1C1917] hover:bg-black active:scale-[0.98] motion-reduce:transform-none text-[#FAF8F5] font-medium text-base shadow-soft-sm hover:-translate-y-0.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
              >
                <span>Tạo tài khoản ngay</span>
                <ArrowRight className='w-4 h-4' />
              </button>
              <a
                href='#block-workflow'
                onClick={handleScrollToWorkflow}
                className='w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#FFFEFA] border border-[#D8D2C5] text-[#1C1917] font-medium text-base hover:border-[#1C1917] hover:bg-[#F3F0E9] active:scale-[0.98] motion-reduce:transform-none transition-all shadow-soft-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900'
              >
                <span>Xem quy trình hoạt động</span>
                <ArrowRight className='w-4 h-4' />
              </a>
            </div>

            {/* Trust feature pills */}
            <div className='mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#57534E]'>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#F97316]' /> Kịch bản phân khung có cấu trúc
              </div>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#F97316]' /> Lưu dấu toàn bộ lịch sử phiên bản
              </div>
              <div className='flex items-center gap-1.5'>
                <Check className='w-3.5 h-3.5 text-[#F97316]' /> Đối chiếu nhất quán với AI
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className='bg-[#1C1917] text-[#FAF8F5] relative border-t border-[#292524]'>
        <div className='relative max-w-[1780px] mx-auto px-[clamp(20px,4.2vw,72px)] py-12'>
          <div className='grid grid-cols-1 md:grid-cols-12 gap-10 mb-10'>
            {/* Brand column */}
            <div className='md:col-span-6'>
              <a
                href='#hero-section'
                onClick={(e) => handleNavScroll(e, 'hero-section')}
                className='inline-flex items-center gap-2.5 group'
                aria-label='PanelForge - Về đầu trang'
              >
                <BrandMark
                  size={30}
                  tone='paper'
                  className='shrink-0 group-hover:scale-105 transition-transform motion-reduce:transform-none'
                />
                <span className='font-serif text-xl font-bold tracking-tight text-[#FAF8F5]'>
                  PanelForge
                </span>
              </a>
              <p className='mt-4 text-sm text-[#A8A29E] max-w-md leading-relaxed [text-wrap:pretty]'>
                Nền tảng cộng tác sản xuất truyện tranh có cấu trúc. Đồng bộ kịch bản, nét vẽ, xét
                duyệt và lịch sử phiên bản trong một không gian duy nhất.
              </p>
            </div>

            {/* Navigation links */}
            <div className='md:col-span-3'>
              <div className='text-xs uppercase tracking-[0.18em] text-[#D6D3D1] font-semibold mb-4 font-mono'>
                Khám phá
              </div>
              <ul className='space-y-2.5 text-sm text-[#A8A29E]'>
                <li>
                  <a
                    href='#block-features'
                    onClick={(e) => handleNavScroll(e, 'block-features')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Tính năng nổi bật
                  </a>
                </li>
                <li>
                  <a
                    href='#block-workflow'
                    onClick={(e) => handleNavScroll(e, 'block-workflow')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Quy trình 4 công đoạn
                  </a>
                </li>
                <li>
                  <a
                    href='#block-showcase'
                    onClick={(e) => handleNavScroll(e, 'block-showcase')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Trưng bày không gian làm việc
                  </a>
                </li>
                <li>
                  <a
                    href='#block-faq'
                    onClick={(e) => handleNavScroll(e, 'block-faq')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Hỏi đáp thường gặp
                  </a>
                </li>
                <li>
                  <a
                    href='#hero-section'
                    onClick={(e) => handleNavScroll(e, 'hero-section')}
                    className='hover:text-[#FAF8F5] transition-colors focus-visible:outline-none focus-visible:underline'
                  >
                    Về đầu trang ↑
                  </a>
                </li>
              </ul>
            </div>

            {/* Account links */}
            <div className='md:col-span-3'>
              <div className='text-xs uppercase tracking-[0.18em] text-[#D6D3D1] font-semibold mb-4 font-mono'>
                Tài khoản
              </div>
              <ul className='space-y-2.5 text-sm text-[#A8A29E]'>
                <li>
                  <button
                    onClick={handleLoginClick}
                    className='hover:text-[#FAF8F5] transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:underline'
                  >
                    Đăng nhập
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleRegisterClick}
                    className='hover:text-[#FAF8F5] transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:underline'
                  >
                    Tạo tài khoản mới
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className='pt-6 border-t border-[#292524] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#78716C]'>
            <div>© 2026 PanelForge. Nền tảng hỗ trợ sáng tác truyện tranh.</div>
            <div className='text-[#78716C]'>Bản quyền thuộc về PanelForge Studio</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
