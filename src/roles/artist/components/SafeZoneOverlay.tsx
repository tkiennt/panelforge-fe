import React from 'react';

interface Props {
  widthPx: number;
  heightPx: number;
  visible: boolean;
}

/**
 * Hiển thị khung viền an toàn in ấn chuẩn Manga/Webtoon:
 * - Bleed Line (Tràn lề): Vùng ngoài cùng (3mm ~ 36px)
 * - Trim Line (Vết xén): Ranh giới giấy sau khi cắt xén
 * - Live Area / Safe Zone (Vùng nội dung an toàn): Đảm bảo text & hình vẽ quan trọng không bị cắt mất
 */
export const SafeZoneOverlay: React.FC<Props> = ({ widthPx, heightPx, visible }) => {
  if (!visible) return null;

  // Tính margin an toàn theo tỷ lệ chuẩn
  const bleedMarginPct = 2.5; // ~3mm
  const safeMarginPct = 6.0; // ~10mm

  return (
    <div
      data-testid='safe-zone-overlay'
      className='absolute inset-0 pointer-events-none z-30 select-none'
    >
      {/* 1. Trim Line (Đường cắt xén viền đỏ nét đứt) */}
      <div
        className='absolute border border-dashed border-rose-500/80 transition-all'
        style={{
          left: `${bleedMarginPct}%`,
          top: `${bleedMarginPct}%`,
          right: `${bleedMarginPct}%`,
          bottom: `${bleedMarginPct}%`,
        }}
      >
        <span className='absolute top-1 left-1 font-mono text-[9px] uppercase tracking-wider bg-rose-500 text-white px-1 py-0.2 rounded opacity-80'>
          Trim Line (Cắt)
        </span>
      </div>

      {/* 2. Live Area / Safe Zone (Vùng an toàn nét xanh lá) */}
      <div
        className='absolute border-2 border-emerald-500/70 transition-all'
        style={{
          left: `${safeMarginPct}%`,
          top: `${safeMarginPct}%`,
          right: `${safeMarginPct}%`,
          bottom: `${safeMarginPct}%`,
        }}
      >
        <span className='absolute bottom-1 right-1 font-mono text-[9px] uppercase tracking-wider bg-emerald-600 text-white px-1 py-0.2 rounded opacity-80'>
          Live Safe Zone (Nội dung an toàn)
        </span>
      </div>
    </div>
  );
};
