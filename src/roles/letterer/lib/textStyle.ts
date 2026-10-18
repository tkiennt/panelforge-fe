// Kiểu chữ của element chữ (thanh định dạng Letterer). Khớp TextStyle.cs ở Backend: cùng danh sách font và giới hạn.
import type { CSSProperties } from 'react';
import type { TextStyleDto } from '@/services/element.service';
import { LETTERING_FONT_PX, LETTERING_LINE_HEIGHT_EM, MIN_LETTERING_FONT_PX } from './lettererView';

export const TEXT_FONTS = [
  { family: 'Mali', label: 'Mali (thoại)' },
  { family: 'Patrick Hand', label: 'Patrick Hand (viết tay)' },
  { family: 'Be Vietnam Pro', label: 'Be Vietnam Pro (dẫn truyện)' },
  { family: 'Bangers', label: 'Bangers (hét / SFX)' },
] as const;

export const MAX_TEXT_FONT_PX = 160;
export const LINE_HEIGHTS = [1.0, 1.15, 1.3] as const;

/** Kiểu có sẵn (như "Kiểu" của Word): Letterer chọn kiểu thay vì chỉnh từng thông số, cả chương đồng nhất. */
const PRESET_STYLES: { name: string; style: TextStyleDto }[] = [
  {
    name: 'Thoại thường',
    style: { fontFamily: 'Mali', fontSize: 26, align: 'center', color: '#171717', lineHeight: 1.3 },
  },
  {
    name: 'Hét',
    style: {
      fontFamily: 'Bangers',
      fontSize: 40,
      bold: true,
      align: 'center',
      color: '#171717',
      lineHeight: 1.15,
    },
  },
  {
    name: 'Thì thầm',
    style: {
      fontFamily: 'Patrick Hand',
      fontSize: 22,
      italic: true,
      align: 'center',
      color: '#52525B',
      lineHeight: 1.3,
    },
  },
  {
    name: 'Suy nghĩ',
    style: {
      fontFamily: 'Patrick Hand',
      fontSize: 24,
      italic: true,
      align: 'center',
      color: '#171717',
      lineHeight: 1.3,
    },
  },
  {
    name: 'Dẫn truyện',
    style: {
      fontFamily: 'Be Vietnam Pro',
      fontSize: 22,
      italic: true,
      align: 'left',
      color: '#171717',
      lineHeight: 1.3,
    },
  },
  {
    name: 'Hồi tưởng',
    style: {
      fontFamily: 'Be Vietnam Pro',
      fontSize: 22,
      italic: true,
      align: 'left',
      color: '#FFFFFF',
      lineHeight: 1.3,
    },
  },
  {
    name: 'SFX',
    style: {
      fontFamily: 'Bangers',
      fontSize: 56,
      bold: true,
      align: 'center',
      color: '#DC2626',
      strokeColor: '#FFFFFF',
      strokeWidth: 4,
      lineHeight: 1.0,
    },
  },
];
export const TEXT_PRESETS = PRESET_STYLES.map((p) => ({
  ...p,
  style: { ...p.style, preset: p.name },
}));

const DEFAULT_PRESET_BY_TYPE: Record<string, string> = {
  NARRATION_BOX: 'Dẫn truyện',
  THOUGHT_BALLOON: 'Suy nghĩ',
  SOUND_EFFECT: 'SFX',
};

/** Kiểu đang áp dụng: kiểu Letterer đã lưu, không có thì kiểu mặc định theo loại element. */
export function resolveTextStyle(el: {
  elementType: string;
  style?: TextStyleDto | null;
}): TextStyleDto {
  if (el.style) return el.style;
  const name = DEFAULT_PRESET_BY_TYPE[el.elementType] ?? 'Thoại thường';
  return TEXT_PRESETS.find((p) => p.name === name)!.style;
}

export const clampFontSize = (px: number): number =>
  Math.min(MAX_TEXT_FONT_PX, Math.max(MIN_LETTERING_FONT_PX, Math.round(px)));

/** Đổi một phần kiểu; sửa tay thì không còn là kiểu có sẵn nữa nên bỏ nhãn preset. */
export function patchTextStyle(base: TextStyleDto, patch: Partial<TextStyleDto>): TextStyleDto {
  const next = { ...base, ...patch, preset: patch.preset ?? null };
  return { ...next, fontSize: clampFontSize(next.fontSize) };
}

export function textStyleCss(style: TextStyleDto): CSSProperties {
  return {
    fontFamily: `'${style.fontFamily}', sans-serif`,
    fontSize: style.fontSize || LETTERING_FONT_PX,
    fontWeight: style.bold ? 700 : 400,
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.align ?? 'center',
    color: style.color ?? '#171717',
    lineHeight: style.lineHeight ?? LETTERING_LINE_HEIGHT_EM,
    WebkitTextStroke:
      style.strokeColor && style.strokeWidth
        ? `${style.strokeWidth}px ${style.strokeColor}`
        : undefined,
    paintOrder: 'stroke fill',
  };
}

/** Chuỗi `font` cho canvas 2D (màn duyệt Letter vẽ lại chữ). */
export function canvasFont(style: TextStyleDto, sizePx = style.fontSize): string {
  return `${style.italic ? 'italic ' : ''}${style.bold ? '700 ' : '400 '}${sizePx}px '${style.fontFamily}', sans-serif`;
}
