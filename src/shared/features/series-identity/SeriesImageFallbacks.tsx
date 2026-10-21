import React from 'react';

/** Avatar mặc định khi Series chưa có avatar: chữ cái đầu trên nền cam nhạt (không ghi dữ liệu). */
export const SeriesAvatarFallback: React.FC<{ title: string; className?: string }> = ({
  title,
  className = '',
}) => (
  <div
    className={`w-full h-full rounded-[13px] bg-[#FFF2E6] text-[#C2410C] font-serif font-black flex items-center justify-center select-none text-[2.5em] ${className}`}
    data-testid='series-avatar-fallback'
    aria-hidden='true'
  >
    {(title.trim()[0] || '?').toUpperCase()}
  </div>
);

/** Banner mặc định: nền kem–cam với họa tiết halftone nhẹ, không phải ảnh giả. */
export const SeriesBannerFallback: React.FC = () => (
  <div
    className='w-full h-full bg-[radial-gradient(circle,rgba(194,65,12,0.18)_1px,transparent_1.5px),linear-gradient(120deg,#FFE4CC_0%,#FFF2E6_40%,#F3F0E9_100%)] [background-size:12px_12px,100%_100%]'
    data-testid='series-banner-fallback'
  />
);
