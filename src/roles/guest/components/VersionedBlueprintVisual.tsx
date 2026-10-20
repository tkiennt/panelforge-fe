import React from 'react';

export interface VersionedBlueprintVisualProps {
  mode: 'login' | 'register';
}

export const VersionedBlueprintVisual: React.FC<VersionedBlueprintVisualProps> = ({ mode }) => {
  const isLogin = mode === 'login';

  return (
    <div className='relative w-full h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 text-[#1F1B16] select-none overflow-hidden bg-[#F3F0E9]'>
      {/* 1. Subtle Paper Grain Texture (< 3.5% opacity, static) */}
      <div
        className='absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden='true'
      />

      {/* 2. Manga Drafting Desk Decorations (SVG, aria-hidden, pointer-events-none) */}
      {/* 2a. Top-Left Registration Mark (Dấu canh bản in 1 - Chì xám mảnh) */}
      <svg
        className='absolute top-7 left-7 w-6 h-6 pointer-events-none select-none opacity-40 text-[#78716C]'
        viewBox='0 0 24 24'
        fill='none'
        aria-hidden='true'
      >
        <line x1='12' y1='2' x2='12' y2='22' stroke='currentColor' strokeWidth='0.8' />
        <line x1='2' y1='12' x2='22' y2='12' stroke='currentColor' strokeWidth='0.8' />
        <circle cx='12' cy='12' r='6' stroke='currentColor' strokeWidth='0.8' fill='none' />
        <path d='M 4 8 L 4 4 L 8 4' stroke='currentColor' strokeWidth='0.8' fill='none' />
      </svg>

      {/* 2b. Bottom-Right Registration Mark (Dấu canh bản in 2 - Chì xám mảnh) */}
      <svg
        className='absolute bottom-7 right-8 w-6 h-6 pointer-events-none select-none opacity-40 text-[#78716C]'
        viewBox='0 0 24 24'
        fill='none'
        aria-hidden='true'
      >
        <line x1='12' y1='2' x2='12' y2='22' stroke='currentColor' strokeWidth='0.8' />
        <line x1='2' y1='12' x2='22' y2='12' stroke='currentColor' strokeWidth='0.8' />
        <circle cx='12' cy='12' r='6' stroke='currentColor' strokeWidth='0.8' fill='none' />
        <path d='M 20 16 L 20 20 L 16 20' stroke='currentColor' strokeWidth='0.8' fill='none' />
      </svg>

      {/* 2c. Bottom-Left Drafting Compass Arc (Cung compa dựng hình chì xanh nhạt) */}
      <svg
        className='absolute bottom-5 left-5 w-20 h-20 pointer-events-none select-none opacity-30 text-[#0284C7]'
        viewBox='0 0 80 80'
        fill='none'
        aria-hidden='true'
      >
        <line
          x1='10'
          y1='10'
          x2='10'
          y2='70'
          stroke='currentColor'
          strokeWidth='0.85'
          strokeDasharray='3 3'
        />
        <line
          x1='10'
          y1='70'
          x2='70'
          y2='70'
          stroke='currentColor'
          strokeWidth='0.85'
          strokeDasharray='3 3'
        />
        <path
          d='M 10 24 A 46 46 0 0 1 56 70'
          stroke='currentColor'
          strokeWidth='0.85'
          fill='none'
        />
      </svg>

      {/* 2d. Top-Right Short Orange Pencil Stroke (Nét chì cam ngắn tự nhiên) */}
      <svg
        className='absolute top-9 right-16 w-12 h-4 pointer-events-none select-none opacity-55'
        viewBox='0 0 48 16'
        fill='none'
        aria-hidden='true'
      >
        <path d='M 3 11 Q 22 4, 45 7' stroke='#EA580C' strokeWidth='2.6' strokeLinecap='round' />
      </svg>

      {/* 3. Scoped CSS for Interactive Manuscript Fanning */}
      <style>{`
        /* Staggered mount entry animation */
        @keyframes authFadeInUp {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .manga-mount-enter {
          animation: authFadeInUp 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        /* Default sheet transforms (subtle 12-14px offset, ±2.5° tilt) */
        .manga-sheet-script {
          transform-origin: 50% 95%;
          transform: translate(-14px, -6px) rotate(-2.5deg);
          transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }
        .manga-sheet-sketch {
          transform-origin: 50% 95%;
          transform: translate(14px, -6px) rotate(2.5deg);
          transition: transform 420ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }
        .manga-sheet-finished {
          transform-origin: 50% 95%;
          transform: translate(0, 0) rotate(0deg);
          will-change: transform;
        }

        /* Hover fan-out (hovering anywhere inside stable hover zone) */
        @media (hover: hover) and (pointer: fine) {
          .manga-hover-zone:hover .manga-sheet-script {
            transform: translate(-38px, -12px) rotate(-7deg);
          }
          .manga-hover-zone:hover .manga-sheet-sketch {
            transform: translate(38px, -10px) rotate(7deg);
          }
        }

        /* Accessibility: reduce motion keeps static elegant layout */
        @media (prefers-reduced-motion: reduce) {
          .manga-mount-enter {
            animation: none !important;
          }
          .manga-sheet-script,
          .manga-sheet-sketch {
            transition: none !important;
            transform: translate(-14px, -6px) rotate(-2.5deg) !important;
          }
        }
      `}</style>

      {/* 4. Stable Hover Zone (Encloses full fanned-out bounds to prevent jitter) */}
      <div className='manga-hover-zone manga-mount-enter relative w-full max-w-[430px] max-h-[540px] flex items-center justify-center p-4 sm:p-6 my-auto cursor-default'>
        {/* Aspect Container for the 3 Layered Manuscript Papers (Natural 3:4) */}
        <div className='relative w-full max-w-[365px] lg:max-w-[375px] aspect-[3/4] flex items-center justify-center'>
          {/* ============================================================== */}
          {/* SHEET 1 (Back Left): Kịch bản (auth-manga-script.jpg)          */}
          {/* With steel wire paperclip attached to top edge                 */}
          {/* ============================================================== */}
          <div className='manga-sheet-script absolute inset-0 pointer-events-none z-10'>
            <div
              className='relative w-full h-full rounded-lg sm:rounded-xl bg-[#FAF7F0] border border-[#D6CCBC] shadow-[0_8px_20px_rgba(28,25,23,0.08)] overflow-hidden motion-reduce:transform-none'
              aria-hidden='true'
            >
              {/* Metal Paperclip (Attached to top corner, rotates with script sheet) */}
              <svg
                className='absolute -top-1.5 left-5 w-4 h-9 pointer-events-none select-none z-30 drop-shadow-[0_2px_3px_rgba(28,25,23,0.22)]'
                viewBox='0 0 16 36'
                fill='none'
                aria-hidden='true'
              >
                {/* Outer loop and inner loop of wire paperclip */}
                <path
                  d='M 5 10 L 5 26 C 5 29.5, 11 29.5, 11 26 L 11 7 C 11 3.5, 2.5 3.5, 2.5 7 L 2.5 29 C 2.5 33.5, 13.5 33.5, 13.5 29 L 13.5 12'
                  stroke='#9CA3AF'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M 5 10 L 5 26 C 5 29.5, 11 29.5, 11 26 L 11 7 C 11 3.5, 2.5 3.5, 2.5 7 L 2.5 29 C 2.5 33.5, 13.5 33.5, 13.5 29 L 13.5 12'
                  stroke='#F3F4F6'
                  strokeWidth='0.75'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>

              <img
                src='/images/auth-manga-script.jpg'
                alt=''
                className='w-full h-full object-contain pointer-events-none select-none'
                width={768}
                height={1024}
                loading='eager'
                decoding='async'
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* SHEET 2 (Back Right): Phác thảo (auth-manga-sketch.jpg)        */}
          {/* ============================================================== */}
          <div className='manga-sheet-sketch absolute inset-0 pointer-events-none z-15'>
            <div
              className='relative w-full h-full rounded-lg sm:rounded-xl bg-[#FAF7F0] border border-[#D6CCBC] shadow-[0_10px_24px_rgba(28,25,23,0.1)] overflow-hidden motion-reduce:transform-none'
              aria-hidden='true'
            >
              <img
                src='/images/auth-manga-sketch.jpg'
                alt=''
                className='w-full h-full object-contain pointer-events-none select-none'
                width={768}
                height={1024}
                loading='eager'
                decoding='async'
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* SHEET 3 (Foreground Front): Hoàn thiện (auth-manga-finished.jpg)*/}
          {/* Large, stays in front and completely stationary               */}
          {/* ============================================================== */}
          <div className='manga-sheet-finished relative w-full h-full z-20 pointer-events-none'>
            <div
              className='relative w-full h-full rounded-lg sm:rounded-xl bg-[#FFFEFA] border border-[#D6CCBC] shadow-[0_18px_42px_rgba(28,25,23,0.15)] overflow-hidden motion-reduce:transform-none'
              role='region'
              aria-label='Bản thảo manga hoàn thiện: phân chia trắng đen và màu'
            >
              <img
                src='/images/auth-manga-finished.jpg'
                alt='Bản thảo manga hoàn thiện: phân chia trắng đen và màu'
                className='w-full h-full object-contain pointer-events-none select-none'
                width={768}
                height={1024}
                loading='eager'
                decoding='async'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
