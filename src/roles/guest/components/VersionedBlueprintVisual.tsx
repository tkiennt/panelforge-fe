import React from 'react';
import { Layers, MessageSquare, History } from 'lucide-react';

export interface VersionedBlueprintVisualProps {
  mode: 'login' | 'register';
}

export const VersionedBlueprintVisual: React.FC<VersionedBlueprintVisualProps> = ({ mode }) => {
  const isLogin = mode === 'login';

  return (
    <div className='relative w-full h-full flex flex-col justify-between p-4 sm:p-5 lg:p-6 text-[#1F1B16] select-none overflow-hidden bg-[#EDE6DA]'>
      {/* Subtle paper noise texture (< 4% opacity, no blueprint grid) */}
      <div
        className='absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden='true'
      />

      {/* Scoped CSS animations for gentle floating & staggered entry */}
      <style>{`
        @keyframes authFadeInUp {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes authFloat1 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2.5px);
          }
        }
        @keyframes authFloat2 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(2.5px);
          }
        }
        @keyframes authFloatMain {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        .auth-sheet-enter-1 {
          animation: authFadeInUp 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 80ms;
        }
        .auth-sheet-enter-2 {
          animation: authFadeInUp 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 180ms;
        }
        .auth-sheet-enter-main {
          animation: authFadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 280ms;
        }
        .auth-float-1 {
          animation: authFloat1 8s ease-in-out infinite;
        }
        .auth-float-2 {
          animation: authFloat2 7.5s ease-in-out infinite;
          animation-delay: 1.2s;
        }
        .auth-float-main {
          animation: authFloatMain 8.2s ease-in-out infinite;
          animation-delay: 0.6s;
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-sheet-enter-1,
          .auth-sheet-enter-2,
          .auth-sheet-enter-main,
          .auth-float-1,
          .auth-float-2,
          .auth-float-main {
            animation: none !important;
          }
        }
      `}</style>

      {/* Top Header: Badge "Minh họa quy trình" */}
      <div className='relative z-20 flex items-center justify-between pb-1.5'>
        <div className='flex items-center gap-2'>
          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#D6CCBC] shadow-xs text-xs font-mono font-medium text-[#1F1B16] tracking-wide'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#F97316]' />
            Minh họa quy trình
          </span>
        </div>
        <span className='text-[10px] text-[#6B6257] font-mono'>
          {isLogin ? 'Bản thảo hoàn thiện' : 'Bản thảo sáng tác'}
        </span>
      </div>

      {/* Center Drawing Desk: 3 Layered Manuscript Papers (Natural aspect 3:4) */}
      <div className='relative z-10 flex-1 my-auto flex items-center justify-center min-h-[300px] w-full py-2'>
        <div className='group relative w-full max-w-[275px] sm:max-w-[295px] lg:max-w-[315px] aspect-[3/4]'>
          {isLogin ? (
            /* ============================================================== */
            /* /login LAYOUT:                                                */
            /* - Sheet 1 (back left): Kịch bản (auth-manga-script.jpg)        */
            /* - Sheet 2 (back right): Phác thảo (auth-manga-sketch.jpg)      */
            /* - Sheet 3 (front center): Hoàn thiện (auth-manga-finished.jpg) */
            /* ============================================================== */
            <>
              {/* SHEET 1: KỊCH BẢN (Back Left) */}
              <div className='auth-sheet-enter-1 absolute inset-0 pointer-events-none z-10'>
                <div className='auth-float-1 w-full h-full group-hover:[animation-play-state:paused]'>
                  <div
                    className='w-full h-full rounded-lg sm:rounded-xl bg-[#FAF7F0] border border-[#D6CCBC] shadow-md overflow-hidden transition-transform duration-500 ease-out transform -translate-x-5 sm:-translate-x-7 -translate-y-2 sm:-translate-y-2.5 -rotate-[3.5deg] group-hover:-translate-x-8 sm:group-hover:-translate-x-10 group-hover:-translate-y-3 group-hover:-rotate-[5deg] motion-reduce:transform-none'
                    aria-hidden='true'
                  >
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
              </div>

              {/* SHEET 2: PHÁC THẢO (Back Right) */}
              <div className='auth-sheet-enter-2 absolute inset-0 pointer-events-none z-15'>
                <div className='auth-float-2 w-full h-full group-hover:[animation-play-state:paused]'>
                  <div
                    className='w-full h-full rounded-lg sm:rounded-xl bg-[#FAF7F0] border border-[#D6CCBC] shadow-md overflow-hidden transition-transform duration-500 ease-out transform translate-x-4 sm:translate-x-6 -translate-y-1.5 sm:-translate-y-2 rotate-[2.8deg] group-hover:translate-x-7 sm:group-hover:translate-x-9 group-hover:-translate-y-2 group-hover:rotate-[4deg] motion-reduce:transform-none'
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
              </div>

              {/* SHEET 3: HOÀN THIỆN (Foreground Front) */}
              <div className='auth-sheet-enter-main relative w-full h-full z-20'>
                <div className='auth-float-main w-full h-full group-hover:[animation-play-state:paused]'>
                  <div
                    className='relative w-full h-full rounded-lg sm:rounded-xl bg-[#FFFEFA] border border-[#D6CCBC] shadow-[0_16px_40px_rgba(28,25,23,0.18)] overflow-hidden transition-transform duration-300 ease-out transform hover:-translate-y-1 motion-reduce:transform-none'
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
            </>
          ) : (
            /* ============================================================== */
            /* /register LAYOUT:                                             */
            /* - Sheet 1 (back left): Kịch bản (auth-manga-script.jpg)        */
            /* - Sheet 2 (middle right): Hoàn thiện (auth-manga-finished.jpg) */
            /* - Sheet 3 (front center): Phác thảo (auth-manga-sketch.jpg)    */
            /* ============================================================== */
            <>
              {/* SHEET 1: KỊCH BẢN (Back Left - Fanned wide) */}
              <div className='auth-sheet-enter-1 absolute inset-0 pointer-events-none z-10'>
                <div className='auth-float-1 w-full h-full group-hover:[animation-play-state:paused]'>
                  <div
                    className='w-full h-full rounded-lg sm:rounded-xl bg-[#FAF7F0] border border-[#D6CCBC] shadow-md overflow-hidden transition-transform duration-500 ease-out transform -translate-x-6 sm:-translate-x-9 -translate-y-2 sm:-translate-y-2.5 -rotate-[4deg] group-hover:-translate-x-9 sm:group-hover:-translate-x-12 group-hover:-translate-y-3 group-hover:-rotate-[5.5deg] motion-reduce:transform-none'
                    aria-hidden='true'
                  >
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
              </div>

              {/* SHEET 2: HOÀN THIỆN (Middle Right - Clearly visible art, colors, speech bubble) */}
              <div className='auth-sheet-enter-2 absolute inset-0 pointer-events-none z-15'>
                <div className='auth-float-2 w-full h-full group-hover:[animation-play-state:paused]'>
                  <div
                    className='w-full h-full rounded-lg sm:rounded-xl bg-[#FAF7F0] border border-[#D6CCBC] shadow-md overflow-hidden transition-transform duration-500 ease-out transform translate-x-6 sm:translate-x-9 translate-y-1 sm:translate-y-1.5 rotate-[3.2deg] group-hover:translate-x-9 sm:group-hover:translate-x-12 group-hover:translate-y-2 group-hover:rotate-[4.5deg] motion-reduce:transform-none'
                    aria-hidden='true'
                  >
                    <img
                      src='/images/auth-manga-finished.jpg'
                      alt=''
                      className='w-full h-full object-contain pointer-events-none select-none'
                      width={768}
                      height={1024}
                      loading='eager'
                      decoding='async'
                    />
                  </div>
                </div>
              </div>

              {/* SHEET 3: PHÁC THẢO (Foreground Front - Where creation begins) */}
              <div className='auth-sheet-enter-main relative w-full h-full z-20'>
                <div className='auth-float-main w-full h-full group-hover:[animation-play-state:paused]'>
                  <div
                    className='relative w-full h-full rounded-lg sm:rounded-xl bg-[#FFFEFA] border border-[#D6CCBC] shadow-[0_16px_40px_rgba(28,25,23,0.18)] overflow-hidden transition-transform duration-300 ease-out transform -rotate-[1deg] hover:-translate-y-1 motion-reduce:transform-none'
                    role='region'
                    aria-label='Bản thảo manga phác thảo: nét vẽ chì xanh và dựng khung'
                  >
                    <img
                      src='/images/auth-manga-sketch.jpg'
                      alt='Bản thảo manga phác thảo: nét vẽ chì xanh và dựng khung'
                      className='w-full h-full object-contain pointer-events-none select-none'
                      width={768}
                      height={1024}
                      loading='eager'
                      decoding='async'
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Showcase: Title, Description, and 3 subtle badges (Fits cleanly inside card) */}
      <div className='relative z-20 pt-2.5 border-t border-[#D6CCBC] text-left space-y-1.5'>
        <div>
          <h3 className='font-serif text-xs sm:text-sm font-semibold text-[#1F1B16] tracking-tight'>
            Mỗi khung truyện, một lịch sử sáng tạo.
          </h3>
          <p className='text-[10.5px] text-[#6B6257] leading-relaxed mt-0.5'>
            Kết nối kịch bản, bản vẽ và phản hồi. Theo dõi từng phiên bản trong cùng một không gian.
          </p>
        </div>

        {/* 3 Badges: Clean, minimal pills without glow */}
        <div className='flex items-center gap-1.5 flex-wrap pt-0.5'>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF7F0] border border-[#D6CCBC] text-[10px] font-medium text-[#1F1B16] shadow-2xs'>
            <Layers className='w-3 h-3 text-[#EA580C]' />
            Nội dung có cấu trúc
          </span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF7F0] border border-[#D6CCBC] text-[10px] font-medium text-[#1F1B16] shadow-2xs'>
            <MessageSquare className='w-3 h-3 text-[#0369A1]' />
            Cộng tác theo khung truyện
          </span>
          <span className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF7F0] border border-[#D6CCBC] text-[10px] font-medium text-[#1F1B16] shadow-2xs'>
            <History className='w-3 h-3 text-[#15803D]' />
            Truy vết phiên bản
          </span>
        </div>
      </div>
    </div>
  );
};
