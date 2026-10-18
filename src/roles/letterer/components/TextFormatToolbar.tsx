import React, { useEffect, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import type { TextStyleDto } from '@/services/element.service';
import {
  LINE_HEIGHTS,
  MAX_TEXT_FONT_PX,
  TEXT_FONTS,
  TEXT_PRESETS,
  clampFontSize,
  patchTextStyle,
} from '../lib/textStyle';
import { MIN_LETTERING_FONT_PX } from '../lib/lettererView';

interface TextFormatToolbarProps {
  /** Kiểu đang áp dụng (đã resolve mặc định theo loại element). */
  style: TextStyleDto;
  /** Đã lưu kiểu riêng hay đang dùng mặc định. */
  isCustom: boolean;
  disabled?: boolean;
  onChange: (style: TextStyleDto | null) => void;
}

const btn = (active: boolean) =>
  `h-7 min-w-7 px-1.5 inline-flex items-center justify-center rounded-md border text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
    active
      ? 'bg-emerald-600 border-emerald-600 text-white'
      : 'bg-white border-[#E7E7E7] text-zinc-700 hover:bg-[#F0EFED]'
  }`;

/**
 * Thanh định dạng chữ kiểu Word nhưng gọn cho manga: chọn kiểu có sẵn trước, chỉnh từng thông số khi cần.
 * Mỗi thay đổi lưu ngay (một event ElementStyleUpdated); cỡ chữ không xuống dưới mức tối thiểu khi in.
 */
export const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({
  style,
  isCustom,
  disabled,
  onChange,
}) => {
  const [sizeDraft, setSizeDraft] = useState(String(style.fontSize));
  useEffect(() => setSizeDraft(String(style.fontSize)), [style.fontSize]);

  const apply = (patch: Partial<TextStyleDto>) => onChange(patchTextStyle(style, patch));
  const commitSize = () => {
    const n = Number(sizeDraft);
    if (!Number.isFinite(n) || n <= 0) return setSizeDraft(String(style.fontSize));
    const next = clampFontSize(n);
    setSizeDraft(String(next));
    if (next !== style.fontSize) apply({ fontSize: next });
  };
  const align = style.align ?? 'center';

  return (
    <div className='space-y-2' data-testid='text-format-toolbar'>
      <div className='flex items-center justify-between'>
        <label className='font-semibold text-zinc-700'>Định dạng chữ</label>
        <button
          type='button'
          disabled={disabled || !isCustom}
          onClick={() => onChange(null)}
          className='text-xs text-zinc-500 hover:text-zinc-900 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed'
          title='Về kiểu mặc định theo loại bóng'
        >
          <RotateCcw className='w-3 h-3' /> Mặc định
        </button>
      </div>

      {/* Kiểu có sẵn: như ô "Kiểu" của Word */}
      <select
        aria-label='Kiểu có sẵn'
        disabled={disabled}
        value={style.preset ?? ''}
        onChange={(e) => {
          const preset = TEXT_PRESETS.find((p) => p.name === e.target.value);
          if (preset) onChange(preset.style);
        }}
        className='w-full h-8 px-2 bg-white border border-[#E7E7E7] rounded-lg text-xs'
      >
        <option value='' disabled>
          (Tuỳ chỉnh)
        </option>
        {TEXT_PRESETS.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>

      <div className='flex items-center gap-1.5'>
        <select
          aria-label='Phông chữ'
          disabled={disabled}
          value={style.fontFamily}
          onChange={(e) => apply({ fontFamily: e.target.value })}
          className='flex-1 min-w-0 h-8 px-2 bg-white border border-[#E7E7E7] rounded-lg text-xs'
          style={{ fontFamily: `'${style.fontFamily}', sans-serif` }}
        >
          {TEXT_FONTS.map((f) => (
            <option
              key={f.family}
              value={f.family}
              style={{ fontFamily: `'${f.family}', sans-serif` }}
            >
              {f.label}
            </option>
          ))}
        </select>
        <button
          type='button'
          aria-label='Giảm cỡ chữ'
          disabled={disabled || style.fontSize <= MIN_LETTERING_FONT_PX}
          onClick={() => apply({ fontSize: style.fontSize - 2 })}
          className={btn(false)}
        >
          <Minus className='w-3 h-3' />
        </button>
        <input
          aria-label='Cỡ chữ (px)'
          disabled={disabled}
          inputMode='numeric'
          value={sizeDraft}
          onChange={(e) => setSizeDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commitSize}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
          className='w-11 h-7 text-center bg-white border border-[#E7E7E7] rounded-md text-xs font-mono'
        />
        <button
          type='button'
          aria-label='Tăng cỡ chữ'
          disabled={disabled || style.fontSize >= MAX_TEXT_FONT_PX}
          onClick={() => apply({ fontSize: style.fontSize + 2 })}
          className={btn(false)}
        >
          <Plus className='w-3 h-3' />
        </button>
      </div>

      <div className='flex items-center gap-1.5 flex-wrap'>
        <button
          type='button'
          aria-label='In đậm'
          aria-pressed={!!style.bold}
          disabled={disabled}
          onClick={() => apply({ bold: !style.bold })}
          className={btn(!!style.bold)}
        >
          <Bold className='w-3.5 h-3.5' />
        </button>
        <button
          type='button'
          aria-label='In nghiêng'
          aria-pressed={!!style.italic}
          disabled={disabled}
          onClick={() => apply({ italic: !style.italic })}
          className={btn(!!style.italic)}
        >
          <Italic className='w-3.5 h-3.5' />
        </button>
        <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
        {(
          [
            ['left', AlignLeft, 'Căn trái'],
            ['center', AlignCenter, 'Căn giữa'],
            ['right', AlignRight, 'Căn phải'],
          ] as const
        ).map(([value, Icon, label]) => (
          <button
            key={value}
            type='button'
            aria-label={label}
            aria-pressed={align === value}
            disabled={disabled}
            onClick={() => apply({ align: value })}
            className={btn(align === value)}
          >
            <Icon className='w-3.5 h-3.5' />
          </button>
        ))}
        <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
        <select
          aria-label='Giãn dòng'
          disabled={disabled}
          value={String(style.lineHeight ?? 1.3)}
          onChange={(e) => apply({ lineHeight: Number(e.target.value) })}
          className='h-7 px-1 bg-white border border-[#E7E7E7] rounded-md text-xs'
          title='Giãn dòng'
        >
          {LINE_HEIGHTS.map((h) => (
            <option key={h} value={String(h)}>
              ↕ {h}
            </option>
          ))}
        </select>
      </div>

      <div className='flex items-center gap-3 text-zinc-600'>
        <label className='inline-flex items-center gap-1.5'>
          Màu
          <input
            type='color'
            aria-label='Màu chữ'
            disabled={disabled}
            value={style.color ?? '#171717'}
            onChange={(e) => apply({ color: e.target.value.toUpperCase() })}
            className='w-7 h-7 p-0.5 bg-white border border-[#E7E7E7] rounded-md cursor-pointer'
          />
        </label>
        <label className='inline-flex items-center gap-1.5'>
          Viền
          <input
            type='color'
            aria-label='Màu viền chữ'
            disabled={disabled}
            value={style.strokeColor ?? '#FFFFFF'}
            onChange={(e) =>
              apply({
                strokeColor: e.target.value.toUpperCase(),
                strokeWidth: style.strokeWidth || 2,
              })
            }
            className='w-7 h-7 p-0.5 bg-white border border-[#E7E7E7] rounded-md cursor-pointer'
          />
          <select
            aria-label='Độ dày viền chữ'
            disabled={disabled}
            value={String(style.strokeWidth ?? 0)}
            onChange={(e) => {
              const w = Number(e.target.value);
              apply({ strokeWidth: w, strokeColor: w ? (style.strokeColor ?? '#FFFFFF') : null });
            }}
            className='h-7 px-1 bg-white border border-[#E7E7E7] rounded-md text-xs'
          >
            {[0, 2, 4, 6].map((w) => (
              <option key={w} value={String(w)}>
                {w === 0 ? 'Không' : `${w}px`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};
