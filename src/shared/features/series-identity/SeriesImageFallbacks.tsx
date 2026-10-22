import React from 'react';

/** Avatar mặc định khi Series chưa có avatar: phong cách bìa truyện Manga Tankōbon với gáy sách, screentone và con dấu Studio. */
export const SeriesAvatarFallback: React.FC<{ title: string; className?: string }> = ({
  title,
  className = '',
}) => {
  const initial = (title.trim()[0] || '?').toUpperCase();

  return (
    <div
      className={`relative w-full h-full rounded-[13px] bg-gradient-to-br from-[#FFF5EC] via-[#FFEADB] to-[#FDE1CD] border border-orange-200/80 overflow-hidden select-none flex flex-col justify-between p-2.5 shadow-inner ${className}`}
      data-testid='series-avatar-fallback'
      aria-hidden='true'
    >
      {/* Manga Book Spine Binding effect on the left edge */}
      <div className='absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-orange-400/25 via-orange-300/10 to-transparent border-r border-orange-300/30 pointer-events-none' />

      {/* Manga Halftone Screentone Texture (Chấm trame manga tinh tế) */}
      <div
        className='absolute inset-0 opacity-[0.14] pointer-events-none bg-[radial-gradient(#C2410C_1px,transparent_1px)] [background-size:6px_6px]'
        aria-hidden='true'
      />

      {/* Top Manga Studio Stamp */}
      <div className='relative z-10 flex items-center justify-between pl-2'>
        <span className='text-[8px] font-mono font-bold tracking-widest text-[#EA580C] uppercase'>
          MANGA VOL.1
        </span>
        <span className='w-1.5 h-1.5 rounded-full bg-[#F97316]/70' />
      </div>

      {/* Center Stylized Initial with Inked Comic Diamond Framing */}
      <div className='relative z-10 flex-1 flex items-center justify-center pl-1'>
        <div className='relative flex items-center justify-center w-13 h-13 sm:w-15 sm:h-15'>
          {/* Subtle manga diamond emblem in background */}
          <div className='absolute inset-0 rotate-45 border border-[#EA580C]/25 bg-white/45 rounded-sm shadow-2xs' />
          <span
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            className='relative text-3xl sm:text-4xl font-black text-[#C2410C] tracking-tight drop-shadow-xs'
          >
            {initial}
          </span>
        </div>
      </div>

      {/* Bottom Manga Edition Stamp */}
      <div className='relative z-10 text-center pl-1'>
        <span className='text-[7.5px] font-mono font-semibold tracking-widest text-[#9A3412]/80 uppercase block border-t border-orange-200/60 pt-0.5'>
          STUDIO EDITION
        </span>
      </div>
    </div>
  );
};

/** Banner mặc định: nền giấy ấm với họa tiết halftone manga, đường nét speedline và thước cữ bản thảo Tombo. */
export const SeriesBannerFallback: React.FC = () => (
  <div
    className='relative w-full h-full overflow-hidden bg-[radial-gradient(circle,rgba(194,65,12,0.14)_1px,transparent_1.5px),linear-gradient(120deg,#FFF2E6_0%,#FDF0E3_35%,#F8F3EA_100%)] [background-size:12px_12px,100%_100%]'
    data-testid='series-banner-fallback'
  >
    {/* Manga Manuscript Speedlines (Đường nét manga động lực ở góc trái) */}
    <svg
      className='absolute left-0 top-0 h-full w-2/3 pointer-events-none opacity-[0.08]'
      viewBox='0 0 600 240'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden='true'
    >
      <line x1='0' y1='20' x2='400' y2='120' stroke='#C2410C' strokeWidth='1.5' />
      <line x1='0' y1='50' x2='380' y2='120' stroke='#C2410C' strokeWidth='1' />
      <line x1='0' y1='90' x2='420' y2='120' stroke='#C2410C' strokeWidth='2' />
      <line x1='0' y1='140' x2='410' y2='120' stroke='#C2410C' strokeWidth='1.5' />
      <line x1='0' y1='180' x2='390' y2='120' stroke='#C2410C' strokeWidth='1' />
      <line x1='0' y1='220' x2='430' y2='120' stroke='#C2410C' strokeWidth='2' />
    </svg>

    {/* Tombo / Manuscript Registration Crop Marks (Thước cữ bản thảo manga ở các góc) */}
    <div className='absolute top-3.5 left-3.5 w-6 h-6 pointer-events-none opacity-30'>
      <div className='absolute top-0 left-0 w-3.5 h-[1.5px] bg-[#78716C]' />
      <div className='absolute top-0 left-0 w-[1.5px] h-3.5 bg-[#78716C]' />
    </div>
    <div className='absolute bottom-3.5 left-3.5 w-6 h-6 pointer-events-none opacity-30'>
      <div className='absolute bottom-0 left-0 w-3.5 h-[1.5px] bg-[#78716C]' />
      <div className='absolute bottom-0 left-0 w-[1.5px] h-3.5 bg-[#78716C]' />
    </div>
  </div>
);
