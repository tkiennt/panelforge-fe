/* Lucian UX/UI Prompt #117 · Spacing ruler · (c) 2026 Seokwoo Lee · MIT License */
import React from 'react';
import { Ruler } from 'lucide-react';
import '@/styles/modules/lucian/lucian-117.css';

export interface GutterSpacingRulerProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  presets?: number[];
  disabled?: boolean;
  className?: string;
}

export const GutterSpacingRuler: React.FC<GutterSpacingRulerProps> = ({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.5,
  unit = '%',
  label = 'Khoảng cách rãnh ô tranh (Gutter)',
  presets = [0, 1, 2, 3, 5],
  disabled = false,
  className = '',
}) => {
  // Ánh xạ % hoặc giá trị sang px để mô phỏng thị giác (0 -> 4px, 10 -> 80px)
  const visualGapPx = Math.max(4, Math.min(80, Math.round(4 + (value / (max || 10)) * 76)));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    if (!Number.isNaN(nextVal)) {
      onChange(Math.max(min, Math.min(max, nextVal)));
    }
  };

  return (
    <div
      className={`pf-gutter-ruler ${className}`}
      data-testid='gutter-spacing-ruler-root'
      aria-label='Thước đo khoảng cách rãnh ô tranh (#117)'
    >
      {/* 1. Header & Live Value Display */}
      <div className='flex items-center justify-between'>
        <label className='flex items-center gap-1.5 text-xs font-semibold text-stone-800 select-none'>
          <Ruler className='w-3.5 h-3.5 text-[#F97316]' />
          <span>{label}</span>
        </label>
        <span
          className='font-mono text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-[#C2410C] border border-[#F97316]/30'
          data-testid='gutter-current-value'
        >
          {value}
          {unit}
        </span>
      </div>

      {/* 2. Visual Stage: 2 Khung tranh mô phỏng & Thước đo rãnh ở giữa (#117) */}
      <div
        className='pf-gutter-stage'
        style={{ '--gutter-gap': `${visualGapPx}px` } as React.CSSProperties}
        data-testid='gutter-visual-stage'
        aria-hidden='true'
      >
        <div className='flex items-center' style={{ gap: `${visualGapPx}px` }}>
          <div className='pf-gutter-panel-mock'>Khung 1</div>
          <div className='pf-gutter-panel-mock'>Khung 2</div>
        </div>

        {/* Dimension Line & Measurement Badge */}
        <div className='pf-gutter-measure-line' style={{ width: `${Math.max(16, visualGapPx)}px` }}>
          <span className='pf-gutter-badge'>
            {value}
            {unit}
          </span>
        </div>
      </div>

      {/* 3. Slider Control */}
      <div className='pf-gutter-slider-row'>
        <span className='text-xs font-mono text-stone-400 select-none'>
          {min}
          {unit}
        </span>
        <input
          type='range'
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleSliderChange}
          className='pf-gutter-slider'
          data-testid='gutter-slider-input'
          aria-label='Kéo thanh trượt để chỉnh rãnh ô tranh'
        />
        <span className='text-xs font-mono text-stone-400 select-none'>
          {max}
          {unit}
        </span>
      </div>

      {/* 4. Quick Preset Buttons */}
      {presets.length > 0 && (
        <div className='pf-gutter-presets' data-testid='gutter-presets-container'>
          <span className='text-xs text-stone-500 font-medium mr-1'>Mốc chuẩn:</span>
          {presets.map((presetVal) => {
            const isActive = Math.abs(value - presetVal) < 0.05;
            let presetName = `${presetVal}${unit}`;
            if (presetVal === 0) presetName = 'Dính liền (0%)';
            else if (presetVal === 1) presetName = 'Hẹp (1%)';
            else if (presetVal === 2) presetName = 'Vừa (2%)';
            else if (presetVal === 4 || presetVal === 5) presetName = 'Rộng';

            return (
              <button
                key={presetVal}
                type='button'
                disabled={disabled}
                className={`pf-gutter-preset-btn ${isActive ? 'active' : ''}`}
                data-testid={`gutter-preset-${presetVal}`}
                onClick={() => onChange(presetVal)}
              >
                {presetName}
              </button>
            );
          })}
        </div>
      )}

      <output className='sr-only' aria-live='polite' data-testid='gutter-live-output'>
        Khoảng cách rãnh ô tranh hiện tại là {value} {unit}
      </output>
    </div>
  );
};
