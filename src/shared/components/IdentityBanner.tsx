import React, { useEffect, useRef } from 'react';

interface IdentityBannerProps {
  /** Lớp ảnh nền (img/AuthenticatedImage có object-cover) hoặc fallback; component lo phủ kem + chuyển động. */
  background: React.ReactNode;
  avatar: React.ReactNode;
  children: React.ReactNode;
  /** Nút góc trên trái (vd "Đổi banner"). */
  topLeft?: React.ReactNode;
  /** 'profile' cao ~320px; 'compact' cho Series Dashboard để vùng công việc vẫn hiện ở màn đầu. */
  size?: 'profile' | 'compact';
  ariaLabel: string;
  testId?: string;
}

/**
 * Banner nhận diện dùng chung (Series Dashboard; cùng ngôn ngữ với Profile): ảnh phủ toàn khối,
 * lớp phủ kem tăng dần sang phải (dọc trên mobile), avatar trái, nội dung thật bên phải.
 * Chỉ lớp ảnh dịch nhẹ theo chuột (±6px), tắt khi reduced-motion/cảm ứng. Không opacity/filter trên lớp nội dung.
 */
export const IdentityBanner: React.FC<IdentityBannerProps> = ({
  background,
  avatar,
  children,
  topLeft,
  size = 'profile',
  ariaLabel,
  testId,
}) => {
  const rootRef = useRef<HTMLElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === 'undefined') return;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;
    let raf: number | null = null;
    const shift = (x: number, y: number) => {
      if (bgRef.current)
        bgRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.04)`;
    };
    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = root.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        shift(-x * 6, -y * 4);
      });
    };
    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      shift(0, 0);
    };
    root.addEventListener('mousemove', onMove, { passive: true });
    root.addEventListener('mouseleave', onLeave, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const compact = size === 'compact';
  return (
    <section
      ref={rootRef}
      aria-label={ariaLabel}
      data-testid={testId}
      className='relative isolate w-full min-w-0 overflow-hidden rounded-2xl border border-[#D8D2C5] bg-[#FCFBF8] shadow-[0_12px_36px_rgba(68,64,60,0.08)]'
    >
      {/* Lớp 1: ảnh (mobile: dải trên; md+: phủ toàn khối) */}
      <div
        className={`absolute inset-x-0 top-0 ${compact ? 'h-40 sm:h-48' : 'h-48 sm:h-56'} md:h-full overflow-hidden bg-[#ECE7DC] -z-20`}
        aria-hidden='true'
        data-testid={testId ? `${testId}-bg` : undefined}
      >
        <div
          ref={bgRef}
          className='w-full h-full motion-safe:transition-transform motion-safe:duration-500'
          style={{ transform: 'scale(1.04)' }}
        >
          {background}
        </div>
      </div>

      {/* Lớp 2: phủ kem — ngang trên desktop, dọc trên mobile */}
      <div
        aria-hidden='true'
        data-testid={testId ? `${testId}-scrim` : undefined}
        className={`absolute inset-0 -z-10 pointer-events-none ${
          compact
            ? 'bg-[linear-gradient(180deg,rgba(252,251,248,0)_0px,rgba(252,251,248,0)_104px,rgba(252,251,248,0.9)_152px,#FCFBF8_164px)] sm:bg-[linear-gradient(180deg,rgba(252,251,248,0)_0px,rgba(252,251,248,0)_128px,rgba(252,251,248,0.9)_184px,#FCFBF8_196px)]'
            : 'bg-[linear-gradient(180deg,rgba(252,251,248,0)_0px,rgba(252,251,248,0)_128px,rgba(252,251,248,0.9)_184px,#FCFBF8_196px)] sm:bg-[linear-gradient(180deg,rgba(252,251,248,0)_0px,rgba(252,251,248,0)_160px,rgba(252,251,248,0.9)_216px,#FCFBF8_228px)]'
        } md:bg-[linear-gradient(90deg,rgba(252,251,248,0)_0%,rgba(252,251,248,0.06)_30%,rgba(252,251,248,0.8)_46%,rgba(252,251,248,0.93)_60%,rgba(252,251,248,0.96)_100%)]`}
      />

      {topLeft && <div className='absolute top-3 left-3 z-20 flex flex-wrap gap-2'>{topLeft}</div>}

      {/* Lớp 3: nội dung */}
      <div
        className={`relative z-10 grid grid-cols-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-x-6 ${
          compact ? 'md:min-h-[240px]' : 'md:min-h-[300px] lg:min-h-[320px]'
        }`}
      >
        <div
          className={`flex items-end px-5 ${compact ? 'pt-24 sm:pt-32' : 'pt-32 sm:pt-40'} md:pt-14 md:pb-6 md:px-7`}
        >
          {avatar}
        </div>
        <div
          className='min-w-0 flex flex-col justify-center gap-3 px-5 pb-5 pt-4 md:py-6 md:pr-7 md:pl-2'
          data-testid={testId ? `${testId}-info` : undefined}
        >
          {children}
        </div>
      </div>
    </section>
  );
};
