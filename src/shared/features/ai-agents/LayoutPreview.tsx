import React, { useState } from 'react';
import { StoryboardLayout } from '@/services/aiAgents.service';
import { LineInfo } from './aiViewUtils';

const PAGE_W = 600;
const PAGE_H = 900; // tỉ lệ Page 1200×1800

/** Vẽ bố cục Storyboard: bbox page-normalized (0..1) → hình chữ nhật, số lớn = thứ tự đọc. */
export const LayoutPreview: React.FC<{
  layout: StoryboardLayout;
  lines: Record<string, LineInfo>;
  nameById: Record<string, string>;
}> = ({ layout, lines, nameById }) => {
  const [pageIdx, setPageIdx] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const page = layout.pages[pageIdx] ?? layout.pages[0];
  if (!page) return null;
  const rtl = layout.readingDirection === 'RightToLeft';

  return (
    <div className='flex flex-col gap-3 md:flex-row'>
      <div className='shrink-0'>
        {layout.pages.length > 1 && (
          <div className='mb-2 flex gap-1'>
            {layout.pages.map((p, i) => (
              <button
                key={p.pageNumber}
                type='button'
                onClick={() => setPageIdx(i)}
                className={`rounded border-[1.5px] border-[#171717] px-2 py-0.5 text-xs font-semibold ${
                  i === pageIdx ? 'bg-[#171717] text-white' : 'bg-white'
                }`}
              >
                Trang {p.pageNumber}
              </button>
            ))}
          </div>
        )}
        <svg
          viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
          className='w-[240px] rounded border-[1.5px] border-[#171717] bg-[#FFFDF8]'
          role='img'
          aria-label={`Bố cục trang ${page.pageNumber}`}
        >
          {page.panels.map((p) => {
            const x = p.bbox.x * PAGE_W + 3;
            const y = p.bbox.y * PAGE_H + 3;
            const w = p.bbox.w * PAGE_W - 6;
            const h = p.bbox.h * PAGE_H - 6;
            const active = hover === p.readingOrder;
            return (
              <g
                key={p.panelNumber}
                onMouseEnter={() => setHover(p.readingOrder)}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  rx={4}
                  fill={active ? '#FED7AA' : '#FFF7ED'}
                  stroke='#171717'
                  strokeWidth={3}
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 22}
                  textAnchor='middle'
                  fontSize={Math.min(w, h) * 0.5}
                  fontWeight={800}
                  fill='#171717'
                  opacity={0.85}
                >
                  {p.readingOrder}
                </text>
                <text x={x + 8} y={y + 20} fontSize={15} fill='#525252'>
                  {p.camera ? (p.camera.length > 22 ? `${p.camera.slice(0, 21)}…` : p.camera) : null}
                </text>
              </g>
            );
          })}
        </svg>
        <div className='mt-1 text-center text-[11px] font-semibold text-[#525252]'>
          Hướng đọc: {rtl ? 'phải → trái (RTL)' : 'trái → phải (LTR)'} · số = thứ tự đọc
        </div>
      </div>

      <ul className='flex-1 space-y-2'>
        {[...page.panels]
          .sort((a, b) => a.readingOrder - b.readingOrder)
          .map((p) => (
            <li
              key={p.panelNumber}
              onMouseEnter={() => setHover(p.readingOrder)}
              onMouseLeave={() => setHover(null)}
              className={`rounded-lg border-[1.5px] p-2 text-xs ${
                hover === p.readingOrder
                  ? 'border-[#F97316] bg-[#FFF7ED]'
                  : 'border-[#E7E7E7] bg-white'
              }`}
            >
              <div className='flex flex-wrap items-center gap-2'>
                <span className='flex h-5 w-5 items-center justify-center rounded-full bg-[#171717] text-[11px] font-bold text-white'>
                  {p.readingOrder}
                </span>
                <span className='font-semibold'>Panel {p.panelNumber}</span>
                <span className='rounded bg-[#EAE6DF] px-1.5 py-0.5 text-[10px] font-semibold'>
                  {p.camera}
                </span>
                <span className='font-mono text-[10px] text-[#737373]'>
                  bbox {p.bbox.x.toFixed(2)}, {p.bbox.y.toFixed(2)}, {p.bbox.w.toFixed(2)}×
                  {p.bbox.h.toFixed(2)}
                </span>
              </div>
              <p className='mt-1 text-[#404040]'>{p.description}</p>
              <div className='mt-1 flex flex-wrap gap-1'>
                {(p.sourceScriptLineIds || []).map((id) => (
                  <span
                    key={id}
                    title={lines[id]?.text}
                    className='rounded border border-[#FDBA74] bg-[#FFF7ED] px-1 text-[10px] text-[#C2410C]'
                  >
                    dòng {lines[id]?.order ?? '?'}
                  </span>
                ))}
                {(p.characterIds || []).map((id) => (
                  <span
                    key={id}
                    className='rounded border border-[#DDD6FE] bg-[#F5F3FF] px-1 text-[10px] text-[#6D28D9]'
                  >
                    {nameById[id] ?? 'nhân vật'}
                  </span>
                ))}
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
};
