import React from 'react';

// Line-art manga page with three empty panels and one balloon; used where a studio or series has nothing yet.
export const BlankPageSketch: React.FC<{ className?: string }> = ({ className = 'w-16 h-20' }) => (
  <svg
    viewBox='0 0 96 128'
    className={`${className} text-stone-400 shrink-0`}
    fill='none'
    aria-hidden='true'
  >
    <rect x='4' y='4' width='88' height='120' rx='2' stroke='currentColor' strokeWidth='2' />
    <path d='M12 12h72v38H12z' stroke='currentColor' strokeWidth='1.5' strokeDasharray='4 3' />
    <path
      d='M12 58h34v58H12zM54 58h30v58H54z'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeDasharray='4 3'
    />
    <path
      d='M62 22c8 0 14 4 14 9s-6 9-14 9l-4 6 1-6c-6-1-10-5-10-9 0-5 6-9 13-9z'
      stroke='#EA580C'
      strokeWidth='1.5'
    />
  </svg>
);
