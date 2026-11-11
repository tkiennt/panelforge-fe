import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface HeroMangaPageProps {
  highlightTarget?: 'editor' | 'artist' | null;
}

export const HeroMangaPage: React.FC<HeroMangaPageProps> = ({ highlightTarget = null }) => {
  const { t } = useTranslation('landing');
  return (
    <div className='relative w-full flex flex-col items-center select-none py-1 px-1 overflow-visible'>
      {/* Scoped CSS animations for entrance and manuscript fanning */}
      <style>{`
        @keyframes heroFadeInUp {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hero-sheet-enter-1 {
          animation: heroFadeInUp 550ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 100ms;
        }
        .hero-sheet-enter-center {
          animation: heroFadeInUp 580ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 160ms;
        }
        .hero-sheet-enter-2 {
          animation: heroFadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 220ms;
        }
        .hero-sheet-enter-main {
          animation: heroFadeInUp 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 320ms;
        }

        /* Default resting state: slight offsets to reveal manuscript paper edges */
        .hero-fanning-sheet {
          transform-origin: 50% 95%;
          transition: transform 440ms cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform;
        }

        #hero-sheet-left {
          transform: translate3d(-14px, 0, 0) rotate(-3.2deg);
        }
        #hero-sheet-center {
          transform: translate3d(0, -6px, 0) rotate(0deg);
        }
        #hero-sheet-right {
          transform: translate3d(14px, 0, 0) rotate(3.2deg);
        }

        /* Hover on pointer devices: fan out wider, pivoting near bottom center */
        @media (hover: hover) and (pointer: fine) {
          /* Ultrawide screens: full wide fanning (-11deg, +11deg, offset up to 64px) */
          @media (min-width: 1600px) {
            #hero-manga-sheet-wrapper:hover #hero-sheet-left {
              transform: translate3d(-54px, 0, 0) rotate(-11deg);
            }
            #hero-manga-sheet-wrapper:hover #hero-sheet-center {
              transform: translate3d(0, -18px, 0) rotate(-0.5deg);
            }
            #hero-manga-sheet-wrapper:hover #hero-sheet-right {
              transform: translate3d(54px, 0, 0) rotate(11deg);
            }
          }

          /* Standard desktop (1366px - 1599px): scaled fanning adapted to available clearance */
          @media (min-width: 1201px) and (max-width: 1599px) {
            #hero-manga-sheet-wrapper:hover #hero-sheet-left {
              transform: translate3d(-24px, 0, 0) rotate(-6.5deg);
            }
            #hero-manga-sheet-wrapper:hover #hero-sheet-center {
              transform: translate3d(0, -15px, 0) rotate(0deg);
            }
            #hero-manga-sheet-wrapper:hover #hero-sheet-right {
              transform: translate3d(24px, 0, 0) rotate(6.5deg);
            }
          }

          /* Tablet landscape / compact desktop (769px - 1200px) */
          @media (min-width: 769px) and (max-width: 1200px) {
            #hero-manga-sheet-wrapper:hover #hero-sheet-left {
              transform: translate3d(-18px, 0, 0) rotate(-4.5deg);
            }
            #hero-manga-sheet-wrapper:hover #hero-sheet-center {
              transform: translate3d(0, -12px, 0) rotate(0deg);
            }
            #hero-manga-sheet-wrapper:hover #hero-sheet-right {
              transform: translate3d(18px, 0, 0) rotate(4.5deg);
            }
          }
        }

        /* prefers-reduced-motion: zero hover movement, keep static stacked manuscript */
        @media (prefers-reduced-motion: reduce) {
          .hero-sheet-enter-1,
          .hero-sheet-enter-center,
          .hero-sheet-enter-2,
          .hero-sheet-enter-main {
            animation: none !important;
          }
          .hero-fanning-sheet {
            transition: none !important;
          }
          #hero-manga-sheet-wrapper:hover #hero-sheet-left {
            transform: translate3d(-14px, 0, 0) rotate(-3.2deg) !important;
          }
          #hero-manga-sheet-wrapper:hover #hero-sheet-center {
            transform: translate3d(0, -6px, 0) rotate(0deg) !important;
          }
          #hero-manga-sheet-wrapper:hover #hero-sheet-right {
            transform: translate3d(14px, 0, 0) rotate(3.2deg) !important;
          }
        }
      `}</style>

      {/* Main Manga Manuscript Stack Wrapper (Hover target for fanning) */}
      <div
        id='hero-manga-sheet-wrapper'
        className='group relative w-full max-w-[390px] sm:max-w-[420px] lg:max-w-none lg:w-auto lg:h-[min(calc(83svh-4.2rem),715px)] aspect-[3/4]'
      >
        {/* Expanded stable hover hit-zone covering the fanning spread to prevent flutter */}
        <div
          className='absolute -inset-x-12 sm:-inset-x-16 -top-6 bottom-0 -z-10 pointer-events-auto'
          aria-hidden='true'
        />

        {/* ============================================================== */}
        {/* SHEET 1 (BACK LEFT): BẢN THẢO PHÁC THẢO (ROUGH SKETCH)         */}
        {/* ============================================================== */}
        <div className='hero-sheet-enter-1 absolute inset-0 pointer-events-none z-[4]'>
          <div
            id='hero-sheet-left'
            className='hero-fanning-sheet w-full h-full rounded-xl bg-[#FAF7F0] border border-[#E2D9C5] shadow-md overflow-hidden motion-reduce:transform-none'
            aria-hidden='true'
          >
            <img
              src='/images/hero-manga-sketch.jpg'
              alt=''
              className='w-full h-full object-cover opacity-90 select-none'
              loading='eager'
              decoding='async'
              draggable={false}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* SHEET 2 (BACK CENTER): BẢN THẢO ĐI NÉT (INKING / REFERENCE)    */}
        {/* ============================================================== */}
        <div className='hero-sheet-enter-center absolute inset-0 pointer-events-none z-[2]'>
          <div
            id='hero-sheet-center'
            className='hero-fanning-sheet w-full h-full rounded-xl bg-[#FAF7F0] border border-[#E2D9C5] shadow-sm overflow-hidden motion-reduce:transform-none'
            aria-hidden='true'
          >
            <img
              src='/images/landing/journey-ink.webp'
              alt=''
              className='w-full h-full object-cover opacity-85 select-none'
              loading='eager'
              decoding='async'
              draggable={false}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* SHEET 3 (BACK RIGHT): BẢN MÀU / HOÀN THIỆN (COLOR FINISHED)    */}
        {/* ============================================================== */}
        <div className='hero-sheet-enter-2 absolute inset-0 pointer-events-none z-[6]'>
          <div
            id='hero-sheet-right'
            className='hero-fanning-sheet w-full h-full rounded-xl bg-[#FAF7F0] border border-[#E2D9C5] shadow-lg overflow-hidden motion-reduce:transform-none'
            aria-hidden='true'
          >
            <img
              src='/images/hero-manga-color.jpg'
              alt=''
              className='w-full h-full object-cover opacity-90 select-none'
              loading='eager'
              decoding='async'
              draggable={false}
            />
          </div>
        </div>

        {/* ============================================================== */}
        {/* SHEET 4 (FOREGROUND): TRANG MANGA CHÍNH (HD B&W / COLOR SPLIT) */}
        {/* Nằm trên cùng, chuẩn tỷ lệ 3:4, đứng yên hoàn toàn khi hover   */}
        {/* ============================================================== */}
        <div className='hero-sheet-enter-main relative w-full h-full z-20 pointer-events-none'>
          <div
            id='hero-manuscript-card'
            className='relative w-full h-full rounded-xl bg-[#FFFEFA] border border-stone-300 shadow-[0_20px_50px_rgba(28,25,23,0.14)] overflow-hidden motion-reduce:transform-none'
            role='region'
            aria-label={t('hero.manuscriptRegionAria', 'Bản thảo manga PanelForge: Trắng đen và Truyện màu')}
          >
            {/* Main HD Artwork Image */}
            <img
              src='/images/hero-manga-main.jpg'
              alt={t(
                'hero.manuscriptImageAlt',
                'Bản thảo truyện tranh PanelForge phân chia chéo trắng đen và truyện màu hoàn chỉnh. Lời thoại: Câu chuyện vẫn tiếp diễn. Họa sĩ: v3',
              )}
              className='w-full h-full object-contain pointer-events-none select-none'
              width={896}
              height={1200}
              loading='eager'
              decoding='async'
              draggable={false}
            />

            {/* Editorial feedback note: Giữ ánh sáng nhất quán ở khung 3 */}
            <div
              id='hero-sticky-note'
              className='absolute top-2.5 right-2.5 sm:top-3 sm:right-3.5 w-[126px] sm:w-[142px] bg-[#FAF8F2] rounded-[3px] p-2.5 shadow-[0_4px_12px_rgba(28,25,23,0.08)] border border-[#D8D2C5] rotate-[2.5deg] z-30 select-none pointer-events-none'
              aria-hidden='true'
            >
              {/* Subtle ink pushpin */}
              <div className='absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#EA580C] border border-white shadow-2xs flex items-center justify-center'>
                <div className='w-0.5 h-0.5 rounded-full bg-white' />
              </div>
              <div className='text-right font-mono font-bold text-[10px] sm:text-[11px] text-[#1C1917]'>
                v1.3
              </div>
              <div className='text-[9.5px] sm:text-[10.5px] text-[#57534E] font-sans font-medium leading-snug mt-0.5'>
                {t('hero.stickyNoteText', 'Biên tập · Giữ ánh sáng nhất quán ở khung 3')}
              </div>
              <div className='text-right text-[8.5px] sm:text-[9.5px] text-[#78716C] font-mono mt-0.5'>
                12/06/2024
              </div>
            </div>

            {/* Đường nối mảnh từ khung truyện tới Ghim Editor */}
            <div
              className='hidden sm:block absolute top-[57%] right-[19%] z-25 pointer-events-none select-none'
              aria-hidden='true'
            >
              <div className='relative'>
                <span className='block w-2 h-2 rounded-full bg-[#EA580C] border border-white shadow-2xs' />
                <svg
                  className='absolute top-1 left-1 w-9 h-7 overflow-visible pointer-events-none'
                  viewBox='0 0 36 28'
                  fill='none'
                >
                  <path
                    d='M 0 0 L 22 20 H 32'
                    stroke='#EA580C'
                    strokeWidth='1.2'
                    strokeDasharray='2.5 2'
                  />
                </svg>
              </div>
            </div>

            {/* Ghim nhỏ biên tập: “Biên tập · Góp ý theo khung” */}
            <div
              id='hero-editor-pin'
              className={`absolute top-[63%] right-3 sm:right-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] sm:text-[11.5px] font-sans font-medium pointer-events-none z-30 select-none backdrop-blur-md transition-all duration-200 motion-reduce:transform-none ${
                highlightTarget === 'editor'
                  ? 'bg-[#1C1917] text-white border border-[#1C1917] shadow-md -translate-y-0.5 rotate-0'
                  : 'bg-white/95 text-[#1C1917] border border-[#D8D2C5] shadow-xs rotate-1'
              }`}
              title={t('hero.editorPinTitle', 'Góp ý theo khung')}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${highlightTarget === 'editor' ? 'bg-[#F97316]' : 'bg-[#EA580C]'}`}
              />
              <span className='font-medium'>{t('hero.editorPinLabel', 'Biên tập · Góp ý khung')}</span>
            </div>

            {/* Điểm nhấn nổi nhẹ quanh nhãn Artist · v3 khi hover nhãn Truy vết phiên bản */}
            {highlightTarget === 'artist' && (
              <div
                id='hero-artist-highlight'
                className='absolute bottom-2.5 sm:bottom-3 left-3 sm:left-3.5 w-[114px] h-[30px] rounded-md border-2 border-[#F97316] ring-2 ring-orange-400/50 -translate-y-0.5 pointer-events-none z-30 transition-all duration-200 motion-reduce:transform-none'
                aria-hidden='true'
              />
            )}
          </div>
        </div>
      </div>

      {/* CAPTION & TIẾN TRÌNH: TRONG NORMAL FLOW BÊN DƯỚI */}
      <div
        id='hero-pipeline-strip'
        className='mt-6 sm:mt-7 flex flex-col items-center gap-1.5 text-center'
      >
        <div className='flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-sans text-[#57534E]'>
          <span className='font-serif italic font-medium text-[#1C1917]'>
            {t('hero.pipelineStoryTag', 'Một câu chuyện. Hai sắc thái.')}
          </span>
          <span className='text-stone-300 select-none'>·</span>
          <span className='text-[#57534E] text-xs sm:text-[13px] font-sans'>Manga & Webtoon</span>
        </div>

        <div className='flex items-center justify-center gap-2.5 text-[12px] sm:text-[13px] font-sans text-[#57534E]'>
          <span className='text-[#57534E] font-medium'>{t('hero.pipelineStages.script', 'Kịch bản')}</span>
          <span className='text-stone-300 select-none'>→</span>
          <span className='text-[#57534E] font-medium'>{t('hero.pipelineStages.sketch', 'Phác thảo')}</span>
          <span className='text-stone-300 select-none'>→</span>
          <span className='inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FAF8F5] text-[#1C1917] font-semibold border border-[#D8D2C5] shadow-xs'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#F97316]' />
            {t('hero.pipelineStages.finish', 'Hoàn thiện')}
          </span>
        </div>
      </div>
    </div>
  );
};
