import React, { useState } from 'react';
import { Layers, MessageSquare, History } from 'lucide-react';

export interface VersionedBlueprintVisualProps {
  mode: 'login' | 'register';
}

export const VersionedBlueprintVisual: React.FC<VersionedBlueprintVisualProps> = ({ mode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isFinalActive = mode === 'login';
  const isScriptActive = mode === 'register';

  return (
    <div className='relative w-full h-full flex flex-col justify-between p-5 lg:p-7 text-[#1F1B16] select-none overflow-hidden bg-[#EDE6DA]'>
      {/* Subtle paper noise texture (< 4% opacity, no blueprint grid) */}
      <div
        className='absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-multiply'
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden='true'
      />

      {/* Top Header: Badge "Minh họa quy trình" */}
      <div className='relative z-20 flex items-center justify-between pb-2'>
        <div className='flex items-center gap-2'>
          <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#D6CCBC] shadow-xs text-xs font-mono font-medium text-[#1F1B16] tracking-wide'>
            <span className='w-1.5 h-1.5 rounded-full bg-[#F97316]' />
            Minh họa quy trình
          </span>
        </div>
        <span className='text-[10px] text-[#6B6257] font-mono'>Bàn vẽ bản thảo</span>
      </div>

      {/* Center Drawing Desk: 3 Layered Manuscript Papers (Natural tilt ±1-3°, neutral soft shadow) */}
      <div className='relative z-10 flex-1 my-auto flex items-center justify-center min-h-[340px]'>
        <div
          className='relative w-full max-w-[460px] h-[320px] transition-transform duration-300 ease-out cursor-default'
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Subtle dashed orange connecting arrows between physical sheets */}
          <svg
            className='absolute inset-0 w-full h-full pointer-events-none z-25 overflow-visible'
            aria-hidden='true'
          >
            <defs>
              <marker
                id='inkArrow'
                viewBox='0 0 6 6'
                refX='5'
                refY='3'
                markerWidth='5'
                markerHeight='5'
                orient='auto-start-reverse'
              >
                <path d='M 0 1 L 5 3 L 0 5 z' fill='#EA580C' />
              </marker>
            </defs>
            {/* Arrow from Script note to Sketch pin */}
            <path
              d='M 120 70 Q 160 100, 200 85'
              fill='none'
              stroke='#EA580C'
              strokeWidth='1.2'
              strokeDasharray='3 3'
              markerEnd='url(#inkArrow)'
              opacity='0.75'
            />
            {/* Arrow from Sketch pin to Final Speech Balloon */}
            <path
              d='M 270 95 Q 300 130, 290 160'
              fill='none'
              stroke='#EA580C'
              strokeWidth='1.2'
              strokeDasharray='3 3'
              markerEnd='url(#inkArrow)'
              opacity='0.75'
            />
          </svg>

          {/* ============================================================== */}
          {/* SHEET 1: KỊCH BẢN (SCRIPT SHEET)                               */}
          {/* Warm cream ruled paper, normal font, handwritten note          */}
          {/* ============================================================== */}
          <div
            className={`absolute top-0 left-2 w-[86%] h-[240px] rounded-xl p-4 border transition-all duration-300 ease-out flex flex-col justify-between ${
              isScriptActive
                ? 'bg-[#FAF7F0] text-[#1F1B16] border-[#D6CCBC] shadow-[0_8px_24px_rgba(31,27,22,0.16)] z-30 opacity-100'
                : 'bg-[#F4EFE3] text-[#6B6257] border-[#D6CCBC] shadow-[0_4px_12px_rgba(31,27,22,0.08)] z-10 opacity-80 hover:opacity-95'
            }`}
            style={{
              transform: `translate(${isHovered ? '-8px' : '0px'}, ${
                isHovered ? '-6px' : '0px'
              }) rotate(-2.2deg)`,
              backgroundImage: 'repeating-linear-gradient(#FAF7F0, #FAF7F0 23px, #E8E2D5 24px)',
            }}
          >
            {/* Sheet Title */}
            <div className='flex items-center justify-between border-b border-[#D6CCBC] pb-1.5 bg-[#FAF7F0]/90'>
              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-serif font-bold uppercase tracking-wider text-[#6B6257]'>
                  Lớp 1: Kịch bản (Script)
                </span>
              </div>
              <span className='text-[9px] font-mono text-[#6B6257]'>Cảnh #04 · Đoạn II</span>
            </div>

            {/* Script Text: Action & Dialogue */}
            <div className='space-y-1.5 my-1 text-left bg-[#FAF7F0]/80 p-1.5 rounded'>
              <div className='text-[11px] leading-relaxed text-[#1F1B16] font-sans'>
                <span className='font-semibold text-[#1F1B16]'>Chỉ dẫn hành động: </span>
                An quay đầu nhìn lại giữa gió lốc, tay siết chặt bút vẽ G-Pen. Ánh mắt kiên định
                hướng về xưởng vẽ cũ.
              </div>
              <div className='text-[11px] text-[#1F1B16] italic font-serif'>
                <span className='font-bold not-italic text-[#6B6257]'>Thoại: </span>« "Bản thảo
                này... câu chuyện của chúng ta bắt đầu từ đây." »
              </div>
            </div>

            {/* Series Bible tag & AI suggestion note */}
            <div className='space-y-1 bg-[#FAF7F0]/95 pt-1 border-t border-[#D6CCBC]'>
              <div className='flex items-center justify-between'>
                <span className='inline-flex items-center px-2 py-0.5 rounded bg-[#EDE8DB] text-[#1F1B16] text-[9.5px] font-medium border border-[#D6CCBC]'>
                  CHR-AN · Trang phục: áo khoác xám
                </span>
                <span className='text-[9.5px] text-[#EA580C] italic font-serif'>
                  * Cận cảnh góc 3/4
                </span>
              </div>
              <div className='text-[9.5px] text-[#6B6257] bg-[#F5F0E6] px-2 py-1 rounded border border-[#D6CCBC] flex items-start gap-1.5'>
                <span className='text-[#EA580C] font-semibold shrink-0'>AI gợi ý:</span>
                <span>
                  kiểm tra trang phục theo hồ sơ nhân vật (áo khoác xám dài có ghim cài studio).
                  <span className='text-[8.5px] text-[#8C8275] block italic'>
                    * Quyết định sáng tạo thuộc về tác giả.
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SHEET 2: PHÁC THẢO (ROUGH SKETCH SHEET)                        */}
          {/* Non-photo blue / soft graphite pencil, sticky note review pin  */}
          {/* Giấy can bản vẽ phối #E8EEF2                                  */}
          {/* ============================================================== */}
          <div
            className={`absolute top-7 left-7 w-[86%] h-[240px] rounded-xl p-4 border transition-all duration-300 ease-out flex flex-col justify-between ${
              isHovered
                ? 'bg-[#E8EEF2] border-[#D6CCBC] shadow-[0_8px_20px_rgba(31,27,22,0.14)] opacity-95 z-20'
                : 'bg-[#E8EEF2] border-[#D6CCBC] shadow-[0_4px_14px_rgba(31,27,22,0.1)] opacity-90 z-20'
            }`}
            style={{
              transform: `translate(0px, 0px) rotate(0.8deg)`,
            }}
          >
            {/* Header */}
            <div className='flex items-center justify-between border-b border-[#D6CCBC] pb-1.5'>
              <span className='text-[10px] font-serif font-bold uppercase tracking-wider text-[#355B7D]'>
                Lớp 2: Phác thảo (Rough Sketch)
              </span>
              <span className='text-[9px] font-mono text-[#355B7D]'>Chì xanh phác thảo</span>
            </div>

            {/* Sketch Illustration: Non-photo blue manga rough drawing */}
            <div className='relative flex-1 my-1 flex items-center justify-center overflow-hidden rounded bg-[#F0F4F7] border border-[#D6CCBC]'>
              <svg
                viewBox='0 0 380 180'
                className='w-full h-full object-contain'
                fill='none'
                stroke='#4D728A'
                aria-label='Bản vẽ phác thảo chì xanh'
              >
                {/* Soft drafting guidelines */}
                <line
                  x1='30'
                  y1='160'
                  x2='350'
                  y2='160'
                  stroke='#8BA7BA'
                  strokeWidth='0.6'
                  strokeDasharray='2 2'
                />
                <line
                  x1='110'
                  y1='20'
                  x2='190'
                  y2='160'
                  stroke='#8BA7BA'
                  strokeWidth='0.6'
                  strokeDasharray='3 3'
                />
                <line
                  x1='270'
                  y1='20'
                  x2='190'
                  y2='160'
                  stroke='#8BA7BA'
                  strokeWidth='0.6'
                  strokeDasharray='3 3'
                />

                {/* Head circle & facial axes */}
                <circle cx='180' cy='65' r='32' stroke='#4D728A' strokeWidth='1' />
                <ellipse cx='182' cy='66' rx='28' ry='14' stroke='#8BA7BA' strokeWidth='0.7' />
                <line x1='182' y1='34' x2='182' y2='98' stroke='#8BA7BA' strokeWidth='0.7' />

                {/* Rough hair draft tufts */}
                <path
                  d='M 152 54 Q 142 34 172 32 Q 212 30 220 54 Q 232 68 214 84'
                  stroke='#4D728A'
                  strokeWidth='1.3'
                />

                {/* Rough eyes looking back with determination */}
                <ellipse cx='172' cy='65' rx='3.5' ry='4.5' stroke='#4D728A' strokeWidth='1' />
                <ellipse cx='194' cy='64' rx='3.5' ry='4.5' stroke='#4D728A' strokeWidth='1' />

                {/* Coat collar & shoulders */}
                <path d='M 160 95 L 140 125 L 115 170' stroke='#4D728A' strokeWidth='1.3' />
                <path d='M 200 95 L 220 125 L 250 170' stroke='#4D728A' strokeWidth='1.3' />
                <path d='M 140 125 L 180 142 L 220 125' stroke='#4D728A' strokeWidth='1' />

                {/* Hand holding G-pen draft */}
                <circle cx='255' cy='128' r='10' stroke='#4D728A' strokeWidth='1' />
                <line
                  x1='262'
                  y1='120'
                  x2='290'
                  y2='95'
                  stroke='#4D728A'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>

              {/* Sticky Note Pin: Editor feedback */}
              <div
                className='absolute top-2 right-2 bg-[#FEF9C3] text-[#1F1B16] px-2.5 py-1.5 rounded shadow-sm border border-[#FDE047]/60 max-w-[170px] text-left'
                style={{ transform: 'rotate(2deg)' }}
              >
                {/* Washi tape strip */}
                <div className='absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-stone-300/60 rounded-xs' />
                <span className='block text-[9.5px] font-bold text-[#1F1B16]'>
                  Editor · Điều chỉnh góc nhìn
                </span>
                <span className='block text-[8.5px] text-[#6B6257] mt-0.5 leading-tight'>
                  « Hạ góc máy xuống một chút để tôn ánh mắt kiên định. »
                </span>
              </div>
            </div>

            {/* Bottom note */}
            <div className='flex items-center justify-between text-[9px] text-[#6B6257] font-mono pt-0.5'>
              <span>Nét phác chì graphite</span>
              <span className='text-emerald-800 font-semibold'>Artist · Đã sửa nét chì</span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SHEET 3: HOÀN THIỆN (FINAL INK & SCREENTONE v3 SHEET)          */}
          {/* Crisp manga paper, ink line variation, real halftone screentone */}
          {/* ============================================================== */}
          <div
            className={`absolute top-14 left-12 w-[86%] h-[240px] rounded-xl p-4 border transition-all duration-300 ease-out flex flex-col justify-between ${
              isFinalActive
                ? 'bg-[#FFFFFF] text-[#1F1B16] border-[#1F1B16] shadow-[0_10px_28px_rgba(31,27,22,0.22)] z-30 opacity-100'
                : 'bg-[#FAF9F7] text-[#1F1B16] border-[#D6CCBC] shadow-[0_4px_14px_rgba(31,27,22,0.12)] z-10 opacity-80 hover:opacity-95'
            }`}
            style={{
              transform: `translate(${isHovered ? '8px' : '0px'}, ${
                isHovered ? '6px' : '0px'
              }) rotate(2.4deg)`,
            }}
          >
            {/* Header: Minimal metadata as strictly required */}
            <div className='flex items-center justify-between border-b border-[#1F1B16] pb-1.5'>
              <div className='flex items-center gap-2'>
                <span className='inline-flex items-center px-2 py-0.5 rounded-full bg-[#F97316] text-[#1F1B16] text-[10px] font-bold font-mono tracking-wide'>
                  Khung truyện · v3
                </span>
                <span className='text-[10px] font-mono text-[#6B6257]'>Lưu bởi Artist · 14:32</span>
              </div>
              <span className='text-[9.5px] font-serif text-[#6B6257] italic'>Bản hoàn thiện</span>
            </div>

            {/* Finished Artwork Graphic (Inked manga drawing + authentic halftone dots) */}
            <div className='relative flex-1 my-1 flex items-center justify-center overflow-hidden rounded bg-[#FFFFFF] border border-[#1F1B16]'>
              <svg
                viewBox='0 0 380 180'
                className='w-full h-full object-contain'
                fill='none'
                aria-label='Bản vẽ manga mực hoàn thiện v3'
              >
                <defs>
                  {/* Real halftone screentone pattern */}
                  <pattern
                    id='mangaHalftoneDesk'
                    width='4'
                    height='4'
                    patternUnits='userSpaceOnUse'
                  >
                    <circle cx='1.5' cy='1.5' r='0.8' fill='#262626' />
                  </pattern>
                </defs>

                {/* Subtle dynamic background lines */}
                <g stroke='#262626' strokeWidth='0.8' opacity='0.3'>
                  <line x1='10' y1='10' x2='90' y2='50' />
                  <line x1='10' y1='40' x2='100' y2='70' />
                  <line x1='370' y1='10' x2='290' y2='50' />
                </g>

                {/* Coat shoulder fills with Screentone */}
                <path d='M 140 120 L 160 92 L 180 102 L 140 170 Z' fill='url(#mangaHalftoneDesk)' />
                <path d='M 220 120 L 200 92 L 180 102 L 220 170 Z' fill='url(#mangaHalftoneDesk)' />

                {/* Inked Character: Strong line weight, solid blacks */}
                {/* Hair in solid black ink */}
                <path
                  d='M 154 50 Q 144 30 174 28 Q 212 26 220 48 Q 232 62 216 78 Q 200 86 182 86 Q 166 84 154 50 Z'
                  fill='#171717'
                />

                {/* Face contour and chin */}
                <path
                  d='M 160 56 Q 160 84 182 92 Q 204 84 204 56'
                  stroke='#171717'
                  strokeWidth='1.8'
                  fill='#FFFFFF'
                />

                {/* Eyes with resolute gaze and catchlight */}
                <ellipse cx='174' cy='64' rx='3.5' ry='4.5' fill='#171717' />
                <circle cx='173' cy='63' r='1.2' fill='#FFFFFF' />
                <ellipse cx='192' cy='64' rx='3.5' ry='4.5' fill='#171717' />
                <circle cx='191' cy='63' r='1.2' fill='#FFFFFF' />

                {/* Eyebrows with determined expression */}
                <path
                  d='M 168 57 L 178 59'
                  stroke='#171717'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                />
                <path
                  d='M 198 57 L 188 59'
                  stroke='#171717'
                  strokeWidth='1.8'
                  strokeLinecap='round'
                />

                {/* Coat Lapels & High Collar */}
                <path
                  d='M 158 92 L 138 122 L 112 170'
                  stroke='#171717'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
                <path
                  d='M 204 92 L 224 122 L 250 170'
                  stroke='#171717'
                  strokeWidth='2'
                  strokeLinecap='round'
                />
                <path d='M 138 122 L 182 142 L 224 122' stroke='#171717' strokeWidth='1.6' />

                {/* Hand holding G-pen (inked) */}
                <path
                  d='M 248 116 Q 262 116 266 128 Q 262 136 248 136 Z'
                  fill='#FFFFFF'
                  stroke='#171717'
                  strokeWidth='1.6'
                />
                <line
                  x1='264'
                  y1='120'
                  x2='296'
                  y2='90'
                  stroke='#171717'
                  strokeWidth='2.2'
                  strokeLinecap='round'
                />
                <polygon points='294,92 304,82 300,98' fill='#EA580C' />

                {/* Hand-drawn manga speech balloon */}
                <g>
                  <path
                    d='M 40 18 Q 30 18 30 36 Q 30 54 50 54 L 60 54 L 56 66 L 76 54 L 140 54 Q 150 54 150 36 Q 150 18 140 18 Z'
                    fill='#FFFFFF'
                    stroke='#171717'
                    strokeWidth='1.6'
                  />
                  <text
                    x='42'
                    y='34'
                    className='text-[9.5px] font-serif font-semibold fill-[#1F1B16]'
                  >
                    Bản thảo này...
                  </text>
                  <text x='42' y='46' className='text-[9px] font-serif italic fill-[#6B6257]'>
                    câu chuyện bắt đầu ở đây.
                  </text>
                </g>
              </svg>
            </div>

            {/* Bottom bar */}
            <div className='flex items-center justify-between text-[9px] font-mono text-[#6B6257] pt-0.5 border-t border-[#D6CCBC]'>
              <span>Nét mực G-pen · Bản hoàn thiện</span>
              <span className='text-[#1F1B16] font-semibold'>Đã duyệt lưu trữ</span>
            </div>
          </div>
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
