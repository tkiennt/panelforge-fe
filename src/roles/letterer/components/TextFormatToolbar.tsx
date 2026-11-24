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
} from '@/shared/lib/lettering/textStyle';
import { MIN_LETTERING_FONT_PX } from '../lib/lettererView';
import { useTranslation } from '@/lib/i18n';

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
      ? 'bg-[#FFF2E6] border-[#C2410C] text-[#C2410C] font-semibold'
      : 'bg-[#FCFBF8] border-[#D8D2C5] text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
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
  const { t } = useTranslation();
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
        <label className='font-semibold text-[#1C1917]'>
          {t('production.lettering.textFormat.title')}
        </label>
        <button
          type='button'
          disabled={disabled || !isCustom}
          onClick={() => onChange(null)}
          className='text-xs text-[#57534E] hover:text-[#1C1917] inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors'
          title={t('production.lettering.textFormat.resetTitle')}
        >
          <RotateCcw className='w-3 h-3' /> {t('production.lettering.textFormat.resetLabel')}
        </button>
      </div>

      {/* Kiểu có sẵn: như ô "Kiểu" của Word */}
      <select
        aria-label={t('production.lettering.textFormat.presetAria')}
        disabled={disabled}
        value={style.preset ?? ''}
        onChange={(e) => {
          const preset = TEXT_PRESETS.find((p) => p.name === e.target.value);
          if (preset) onChange(preset.style);
        }}
        className='w-full h-8 px-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg text-xs text-[#1C1917] focus:border-[#F97316] focus:outline-none'
      >
        <option value='' disabled>
          {t('production.lettering.textFormat.customOption')}
        </option>
        {TEXT_PRESETS.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>

      <div className='flex items-center gap-1.5'>
        <select
          aria-label={t('production.lettering.textFormat.fontAria')}
          disabled={disabled}
          value={style.fontFamily}
          onChange={(e) => apply({ fontFamily: e.target.value })}
          className='flex-1 min-w-0 h-8 px-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg text-xs text-[#1C1917] focus:border-[#F97316] focus:outline-none'
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
          aria-label={t('production.lettering.textFormat.decreaseFontAria')}
          disabled={disabled || style.fontSize <= MIN_LETTERING_FONT_PX}
          onClick={() => apply({ fontSize: style.fontSize - 2 })}
          className={btn(false)}
        >
          <Minus className='w-3 h-3' />
        </button>
        <input
          aria-label={t('production.lettering.textFormat.fontSizeAria')}
          disabled={disabled}
          inputMode='numeric'
          value={sizeDraft}
          onChange={(e) => setSizeDraft(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={commitSize}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) return;
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          className='w-11 h-7 text-center bg-[#FCFBF8] border border-[#D8D2C5] rounded-md text-xs font-mono text-[#1C1917] focus:border-[#F97316] focus:outline-none'
        />
        <button
          type='button'
          aria-label={t('production.lettering.textFormat.increaseFontAria')}
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
          aria-label={t('production.lettering.textFormat.boldAria')}
          aria-pressed={!!style.bold}
          disabled={disabled}
          onClick={() => apply({ bold: !style.bold })}
          className={btn(!!style.bold)}
        >
          <Bold className='w-3.5 h-3.5' />
        </button>
        <button
          type='button'
          aria-label={t('production.lettering.textFormat.italicAria')}
          aria-pressed={!!style.italic}
          disabled={disabled}
          onClick={() => apply({ italic: !style.italic })}
          className={btn(!!style.italic)}
        >
          <Italic className='w-3.5 h-3.5' />
        </button>
        <span className='w-px h-5 bg-[#D8D2C5] mx-0.5' />
        {(
          [
            ['left', AlignLeft, t('production.lettering.textFormat.alignLeft')],
            ['center', AlignCenter, t('production.lettering.textFormat.alignCenter')],
            ['right', AlignRight, t('production.lettering.textFormat.alignRight')],
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
        <span className='w-px h-5 bg-[#D8D2C5] mx-0.5' />
        <select
          aria-label={t('production.lettering.textFormat.lineHeightAria')}
          disabled={disabled}
          value={String(style.lineHeight ?? 1.3)}
          onChange={(e) => apply({ lineHeight: Number(e.target.value) })}
          className='h-7 px-1 bg-[#FCFBF8] border border-[#D8D2C5] rounded-md text-xs text-[#1C1917] focus:border-[#F97316] focus:outline-none'
          title={t('production.lettering.textFormat.lineHeightAria')}
        >
          {LINE_HEIGHTS.map((h) => (
            <option key={h} value={String(h)}>
              ↕ {h}
            </option>
          ))}
        </select>
      </div>

      <div className='flex items-center gap-3 text-[#57534E]'>
        <label className='inline-flex items-center gap-1.5'>
          {t('production.lettering.textFormat.colorLabel')}
          <input
            type='color'
            aria-label={t('production.lettering.textFormat.colorAria')}
            disabled={disabled}
            value={style.color ?? '#171717'}
            onChange={(e) => apply({ color: e.target.value.toUpperCase() })}
            className='w-7 h-7 p-0.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-md cursor-pointer'
          />
        </label>
        <label className='inline-flex items-center gap-1.5'>
          {t('production.lettering.textFormat.strokeLabel')}
          <input
            type='color'
            aria-label={t('production.lettering.textFormat.strokeColorAria')}
            disabled={disabled}
            value={style.strokeColor ?? '#FFFFFF'}
            onChange={(e) =>
              apply({
                strokeColor: e.target.value.toUpperCase(),
                strokeWidth: style.strokeWidth || 2,
              })
            }
            className='w-7 h-7 p-0.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-md cursor-pointer'
          />
          <select
            aria-label={t('production.lettering.textFormat.strokeWidthAria')}
            disabled={disabled}
            value={String(style.strokeWidth ?? 0)}
            onChange={(e) => {
              const w = Number(e.target.value);
              apply({ strokeWidth: w, strokeColor: w ? (style.strokeColor ?? '#FFFFFF') : null });
            }}
            className='h-7 px-1 bg-[#FCFBF8] border border-[#D8D2C5] rounded-md text-xs text-[#1C1917] focus:border-[#F97316] focus:outline-none'
          >
            {[0, 2, 4, 6].map((w) => (
              <option key={w} value={String(w)}>
                {w === 0 ? t('production.lettering.textFormat.noneOption') : `${w}px`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
};
