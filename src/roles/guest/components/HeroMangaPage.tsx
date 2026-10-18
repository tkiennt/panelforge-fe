import React from 'react';
import { History } from 'lucide-react';

interface HeroMangaPageProps {
  highlightTarget?: 'editor' | 'artist' | null;
}

export const HeroMangaPage: React.FC<HeroMangaPageProps> = ({ highlightTarget = null }) => {
  return (
    <div className='relative w-full flex flex-col items-center select-none py-1 px-1'>
      {/* Scoped CSS animations for gentle floating & staggered entry */}
      <style>{`
        @keyframes heroFadeInUp {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes heroFloatLayer1 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3.5px);
          }
        }
        @keyframes heroFloatLayer2 {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(3px);
          }
        }
        @keyframes heroFloatMain {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2.5px);
          }
        }
        .hero-sheet-enter-1 {
          animation: heroFadeInUp 600ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 120ms;
        }
        .hero-sheet-enter-2 {
          animation: heroFadeInUp 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 240ms;
        }
        .hero-sheet-enter-main {
          animation: heroFadeInUp 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: 380ms;
        }
        .hero-float-1 {
          animation: heroFloatLayer1 8.4s ease-in-out infinite;
        }
        .hero-float-2 {
          animation: heroFloatLayer2 7.6s ease-in-out infinite;
          animation-delay: 1.5s;
        }
        .hero-float-main {
          animation: heroFloatMain 8s ease-in-out infinite;
          animation-delay: 0.8s;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-sheet-enter-1,
          .hero-sheet-enter-2,
          .hero-sheet-enter-main,
          .hero-float-1,
          .hero-float-2,
          .hero-float-main {
            animation: none !important;
          }
        }
      `}</style>

      {/* Main Manga Manuscript Stack Wrapper */}
      <div className='group relative w-full max-w-[390px] sm:max-w-[420px] lg:max-w-none lg:w-auto lg:h-[min(calc(83svh-4.2rem),715px)] aspect-[3/4]'>
        {/* ============================================================== */}
        {/* SHEET 1 (BACK): BẢN THẢO PHÁC THẢO (ROUGH SKETCH SHEET)       */}
        {/* Lệch phải 12–20px, xoay +3.2°, không trễ xuống dưới mép chính  */}
        {/* ============================================================== */}
        <div className='hero-sheet-enter-1 absolute inset-0 pointer-events-none z-0'>
          <div className='hero-float-1 w-full h-full group-hover:[animation-play-state:paused]'>
            <div
              className='w-full h-full rounded-xl bg-[#FAF7F0] border border-[#E2D9C5] shadow-md overflow-hidden transition-transform duration-500 ease-out transform translate-x-3 sm:translate-x-5 -translate-y-1 sm:-translate-y-1.5 rotate-[3.2deg] group-hover:translate-x-5 sm:group-hover:translate-x-6 group-hover:translate-y-0 group-hover:rotate-[4.5deg] motion-reduce:transform-none'
              aria-hidden='true'
            >
              <img
                src='/images/hero-manga-sketch.jpg'
                alt=''
                className='w-full h-full object-cover opacity-85 select-none'
                loading='eager'
                decoding='async'
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SHEET 2 (MIDDLE): BẢN TRUYỆN MÀU (FULL COLOR COMIC SHEET)       */}
        {/* Lệch trái 10–16px, xoay ngược chiều -2.5°, không trễ xuống     */}
        {/* ============================================================== */}
        <div className='hero-sheet-enter-2 absolute inset-0 pointer-events-none z-10'>
          <div className='hero-float-2 w-full h-full group-hover:[animation-play-state:paused]'>
            <div
              className='w-full h-full rounded-xl bg-[#FAF7F0] border border-[#E2D9C5] shadow-lg overflow-hidden transition-transform duration-500 ease-out transform -translate-x-2.5 sm:-translate-x-4 -translate-y-1.5 sm:-translate-y-2 -rotate-[2.5deg] group-hover:-translate-x-4 sm:group-hover:-translate-x-5 group-hover:translate-y-0 group-hover:-rotate-[3.5deg] motion-reduce:transform-none'
              aria-hidden='true'
            >
              <img
                src='/images/hero-manga-color.jpg'
                alt=''
                className='w-full h-full object-cover opacity-90 select-none'
                loading='eager'
                decoding='async'
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SHEET 3 (FOREGROUND): TRANG MANGA CHÍNH (HD B&W / COLOR SPLIT) */}
        {/* Nằm trên cùng, chuẩn tỷ lệ 3:4                                */}
        {/* ============================================================== */}
        <div className='hero-sheet-enter-main relative w-full h-full z-20'>
          <div className='hero-float-main w-full h-full group-hover:[animation-play-state:paused]'>
            <div
              id='hero-manuscript-card'
              className='relative w-full h-full rounded-xl bg-[#FFFEFA] border border-stone-300 shadow-[0_20px_50px_rgba(28,25,23,0.14)] overflow-hidden transition-transform duration-300 ease-out transform hover:-translate-y-1 motion-reduce:transform-none'
              role='region'
              aria-label='Bản thảo manga PanelForge: Trắng đen và Truyện màu'
            >
              {/* Main HD Artwork Image */}
              <img
                src='/images/hero-manga-main.jpg'
                alt='Bản thảo truyện tranh PanelForge phân chia chéo trắng đen và truyện màu hoàn chỉnh. Lời thoại: Câu chuyện vẫn tiếp diễn. Họa sĩ: v3'
                className='w-full h-full object-contain pointer-events-none select-none'
                width={896}
                height={1200}
                loading='eager'
                decoding='async'
              />

              {/* Yellow sticky note: v1.3 Cập nhật cảnh thành phố (đêm) */}
              <div
                id='hero-sticky-note'
                className='absolute top-2.5 right-2.5 sm:top-3 sm:right-3.5 w-[92px] sm:w-[104px] bg-[#FEF08A] rounded-[2px] p-2 shadow-md border border-amber-300/80 rotate-[3deg] z-30 select-none pointer-events-none'
                aria-hidden='true'
              >
                {/* Red pushpin */}
                <div className='absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-600 border border-white shadow-xs flex items-center justify-center'>
                  <div className='w-1 h-1 rounded-full bg-red-200' />
                </div>
                <div className='text-right font-mono font-bold text-[9px] sm:text-[10px] text-stone-900'>
                  v1.3
                </div>
                <div className='text-[8px] sm:text-[9px] text-stone-800 font-sans font-medium leading-tight mt-0.5'>
                  Cập nhật cảnh thành phố (đêm)
                </div>
                <div className='text-right text-[7px] sm:text-[8px] text-stone-500 font-mono mt-0.5'>
                  12/06/2024
                </div>
              </div>

              {/* Đường nối mảnh từ khung truyện tới Ghim Editor (chỉ hiển thị desktop để giữ ổn định) */}
              <div
                className='hidden sm:block absolute top-[57%] right-[19%] z-25 pointer-events-none select-none'
                aria-hidden='true'
              >
                <div className='relative'>
                  <span className='block w-2 h-2 rounded-full bg-amber-500 border border-white shadow-xs' />
                  <svg
                    className='absolute top-1 left-1 w-9 h-7 overflow-visible pointer-events-none'
                    viewBox='0 0 36 28'
                    fill='none'
                  >
                    <path
                      d='M 0 0 L 22 20 H 32'
                      stroke='#D97706'
                      strokeWidth='1.2'
                      strokeDasharray='2.5 2'
                    />
                  </svg>
                </div>
              </div>

              {/* Ghim nhỏ biên tập: “Biên tập · Góp ý theo khung” */}
              <div
                id='hero-editor-pin'
                className={`absolute top-[63%] right-3 sm:right-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] sm:text-[12px] font-sans font-medium pointer-events-none z-30 select-none backdrop-blur-xs transition-all duration-200 motion-reduce:transform-none ${
                  highlightTarget === 'editor'
                    ? 'bg-[#FEF08A] border-2 border-amber-400 shadow-md -translate-y-0.5 ring-2 ring-amber-300/80 rotate-0'
                    : 'bg-[#FEF9C3]/95 border border-[#FDE047] shadow-sm rotate-1'
                } text-stone-900`}
                title='Góp ý theo khung'
              >
                <div className='w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0' />
                <span className='font-semibold text-stone-900'>Biên tập · Góp ý theo khung</span>
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

        {/* ============================================================== */}
        {/* THẺ MINH HỌA LỊCH SỬ PHIÊN BẢN (DESKTOP)                      */}
        {/* Đặt ở mép trái phía dưới trang manga, liên kết tính năng PB    */}
        {/* ============================================================== */}
        <div
          id='hero-version-card-desktop'
          className='hidden sm:block absolute bottom-4 -left-4 lg:-left-6 z-30 w-auto min-w-[250px] max-w-[280px] bg-[#FFFEFA]/98 border border-[#D8D2C5] rounded-[11px] p-2.5 shadow-[0_4px_16px_rgba(28,25,23,0.08)] select-none pointer-events-none transition-transform duration-300'
          aria-label='Minh họa lịch sử khung truyện'
        >
          {/* Tiêu đề & tag Minh họa */}
          <div className='flex items-center justify-between gap-2 mb-2'>
            <div className='flex items-center gap-1.5 shrink-0'>
              <History className='w-3.5 h-3.5 text-[#57534E] shrink-0' />
              <span className='font-sans font-semibold text-[12.5px] text-[#1C1917] whitespace-nowrap'>
                Lịch sử khung truyện
              </span>
            </div>
            <span className='text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] font-medium border border-[#D8D2C5] shrink-0'>
              Minh họa
            </span>
          </div>

          {/* Danh sách các phiên bản */}
          <div className='flex flex-col gap-1.5 pt-1.5 border-t border-[#D8D2C5]/60'>
            {/* v2: màu xám nhưng vẫn đủ tương phản */}
            <div className='flex items-center gap-2 text-[11.5px] font-sans text-[#57534E] pl-1'>
              <span className='w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0' />
              <span>v2 · Phác thảo</span>
            </div>

            {/* v3: nhấn mạnh bằng điểm cam */}
            <div className='flex items-center gap-2 text-[12px] font-sans font-medium text-[#1C1917] pl-1'>
              <span className='w-1.5 h-1.5 rounded-full bg-[#F97316] ring-2 ring-orange-100 shrink-0' />
              <span className='text-[#1C1917] font-semibold'>v3 · Bổ sung màu và ánh sáng</span>
            </div>
          </div>
        </div>
      </div>

      {/* THẺ MINH HỌA LỊCH SỬ PHIÊN BẢN TRÊN MOBILE (Normal Flow dưới tranh) */}
      <div
        id='hero-version-card-mobile'
        className='sm:hidden mt-3.5 w-full max-w-[290px] bg-[#FFFEFA] border border-[#D8D2C5] rounded-[11px] p-2.5 shadow-xs select-none'
        aria-label='Minh họa lịch sử khung truyện'
      >
        <div className='flex items-center justify-between gap-2 mb-1.5'>
          <div className='flex items-center gap-1.5 shrink-0'>
            <History className='w-3.5 h-3.5 text-[#57534E] shrink-0' />
            <span className='font-sans font-semibold text-[12px] text-[#1C1917] whitespace-nowrap'>
              Lịch sử khung truyện
            </span>
          </div>
          <span className='text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#57534E] font-medium border border-[#D8D2C5] shrink-0'>
            Minh họa
          </span>
        </div>
        <div className='flex flex-col gap-1 pt-1.5 border-t border-[#D8D2C5]/60 text-[11.5px] font-sans'>
          <div className='flex items-center gap-2 text-[#57534E] pl-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0' />
            <span>v2 · Phác thảo</span>
          </div>
          <div className='flex items-center gap-2 text-[#1C1917] font-medium pl-1'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#F97316] ring-2 ring-orange-100 shrink-0' />
            <span className='font-semibold'>v3 · Bổ sung màu và ánh sáng</span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CAPTION & TIẾN TRÌNH: HOÀN TOÀN TRONG NORMAL FLOW BÊN DƯỚI     */}
      {/* Cách mép thấp nhất của chồng giấy tối thiểu 24px (mt-7 sm:mt-8)  */}
      {/* Không dùng transform chồng lấn hay z-index che đè              */}
      {/* ============================================================== */}
      <div
        id='hero-pipeline-strip'
        className='mt-6 sm:mt-7 flex flex-col items-center gap-1.5 text-center'
      >
        <div className='flex items-center justify-center gap-2 text-[13px] sm:text-[14px] font-sans text-[#57534E]'>
          <span className='font-serif italic font-medium text-[#1C1917]'>
            Một câu chuyện. Hai sắc thái.
          </span>
          <span className='text-stone-300 select-none'>·</span>
          <span className='text-[#57534E] text-xs sm:text-[13px] font-sans'>Manga & Webtoon</span>
        </div>

        <div className='flex items-center justify-center gap-2.5 text-[12px] sm:text-[13px] font-sans text-[#57534E]'>
          <span className='text-[#57534E] font-medium'>Kịch bản</span>
          <span className='text-stone-300 select-none'>→</span>
          <span className='text-[#57534E] font-medium'>Phác thảo</span>
          <span className='text-stone-300 select-none'>→</span>
          <span className='inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#FAF8F5] text-[#1C1917] font-semibold border border-[#D8D2C5] shadow-xs'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#F97316]' />
            Hoàn thiện
          </span>
        </div>
      </div>
    </div>
  );
};
