import React from 'react';

interface StudioCoverFallbackProps {
  name: string;
  tone?: string;
  id?: string;
  className?: string;
}

/**
 * Fallback ảnh bìa Studio dạng bản thảo manga / khung truyện (genkō yōshi).
 * Thuần SVG + CSS, ổn định theo ID, không gọi dịch vụ ngoài, tỉ lệ 2:1.
 */
export const StudioCoverFallback: React.FC<StudioCoverFallbackProps> = ({
  name,
  tone = '#F97316',
  id = 'default',
  className = '',
}) => {
  // Sanitize id for SVG element IDs
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  return (
    <svg
      viewBox='0 0 400 200'
      preserveAspectRatio='xMidYMid slice'
      className={`w-full h-full block ${className}`}
      aria-hidden='true'
      focusable='false'
    >
      <defs>
        {/* Warm paper gradient */}
        <linearGradient id={`paper-grad-${safeId}`} x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#FAF7F0' />
          <stop offset='100%' stopColor='#EFEAE0' />
        </linearGradient>

        {/* Halftone dot pattern in studio tone */}
        <pattern id={`halftone-${safeId}`} width='8' height='8' patternUnits='userSpaceOnUse'>
          <circle cx='4' cy='4' r='1.2' fill={tone} fillOpacity='0.16' />
        </pattern>

        {/* Soft edge fade mask for halftone dots */}
        <linearGradient id={`fade-${safeId}`} x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='20%' stopColor='#ffffff' stopOpacity='0.9' />
          <stop offset='100%' stopColor='#ffffff' stopOpacity='0.1' />
        </linearGradient>
        <mask id={`halftone-mask-${safeId}`}>
          <rect width='400' height='200' fill={`url(#fade-${safeId})`} />
        </mask>
      </defs>

      {/* Paper background */}
      <rect width='400' height='200' fill={`url(#paper-grad-${safeId})`} />

      {/* Halftone quadrant */}
      <rect
        x='210'
        y='16'
        width='174'
        height='168'
        fill={`url(#halftone-${safeId})`}
        mask={`url(#halftone-mask-${safeId})`}
      />

      {/* Manga manuscript paper outer guide / trim marks */}
      <rect
        x='14'
        y='14'
        width='372'
        height='172'
        fill='none'
        stroke='#D8D2C5'
        strokeWidth='1'
        strokeDasharray='3 3'
        opacity='0.7'
      />

      {/* Registration crosshairs (manga manuscript corners) */}
      <g stroke='#B8B0A2' strokeWidth='1' opacity='0.8'>
        {/* Top-left */}
        <path d='M10 14h8 M14 10v8' />
        {/* Top-right */}
        <path d='M382 14h8 M386 10v8' />
        {/* Bottom-left */}
        <path d='M10 186h8 M14 182v8' />
        {/* Bottom-right */}
        <path d='M382 186h8 M386 182v8' />
      </g>

      {/* Manga Panels (Koma) layout */}
      {/* Panel 1 (Large left frame) */}
      <rect
        x='26'
        y='24'
        width='186'
        height='152'
        rx='3'
        fill='#FCFBF8'
        fillOpacity='0.85'
        stroke='#D1C7B7'
        strokeWidth='1.5'
      />

      {/* Panel 2 (Top right) */}
      <rect
        x='222'
        y='24'
        width='152'
        height='70'
        rx='3'
        fill='#FCFBF8'
        fillOpacity='0.75'
        stroke='#D1C7B7'
        strokeWidth='1.5'
      />

      {/* Panel 3 (Bottom right) */}
      <rect
        x='222'
        y='104'
        width='152'
        height='72'
        rx='3'
        fill='#FCFBF8'
        fillOpacity='0.75'
        stroke='#D1C7B7'
        strokeWidth='1.5'
      />

      {/* Speedlines / perspective accent in Panel 1 */}
      <g stroke={tone} strokeWidth='1' opacity='0.18'>
        <line x1='26' y1='100' x2='119' y2='100' />
        <line x1='34' y1='36' x2='119' y2='100' />
        <line x1='34' y1='164' x2='119' y2='100' />
      </g>

      {/* Watermark / Manga Panel Studio Monogram in Panel 1 */}
      <g transform='translate(119, 100)'>
        <circle r='32' fill={tone} fillOpacity='0.12' />
        <circle r='28' fill='none' stroke={tone} strokeWidth='1.2' strokeOpacity='0.25' />
        <text
          textAnchor='middle'
          dominantBaseline='central'
          fontFamily='Georgia, serif'
          fontSize='28'
          fontWeight='700'
          fill={tone}
          fillOpacity='0.45'
        >
          {initial}
        </text>
      </g>

      {/* Small comic panel ink icon in Panel 2 */}
      <g transform='translate(298, 59)' opacity='0.28'>
        <rect
          x='-16'
          y='-10'
          width='32'
          height='20'
          rx='2'
          fill='none'
          stroke='#1C1917'
          strokeWidth='1.5'
        />
        <path d='M-10 -4h20 M-10 0h14 M-10 4h8' stroke='#1C1917' strokeWidth='1' />
      </g>

      {/* Subtle speech bubble silhouette in Panel 3 */}
      <g transform='translate(298, 140)' opacity='0.25'>
        <path
          d='M-16 -10 h32 a4 4 0 0 1 4 4 v10 a4 4 0 0 1 -4 4 h-18 l-6 5 v-5 h-8 a4 4 0 0 1 -4 -4 v-10 a4 4 0 0 1 4 -4 z'
          fill='none'
          stroke={tone}
          strokeWidth='1.5'
        />
      </g>
    </svg>
  );
};
