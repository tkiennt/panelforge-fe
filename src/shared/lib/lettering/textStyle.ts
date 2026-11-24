// Kiểu chữ của element chữ (thanh định dạng Letterer). Khớp TextStyle.cs ở Backend: cùng danh sách font và giới hạn.
import type { CSSProperties } from 'react';
import type { TextStyleDto } from '@/services/element.service';
import { translate } from '@/lib/i18n';
import {
  LETTERING_FONT_PX,
  LETTERING_LINE_HEIGHT_EM,
  MIN_LETTERING_FONT_PX,
} from './letteringPrimitives';

export const TEXT_FONTS = [
  {
    family: 'Mali' as const,
    get label() {
      return translate('shared.lettering.fonts.mali');
    },
  },
  {
    family: 'Patrick Hand' as const,
    get label() {
      return translate('shared.lettering.fonts.patrickHand');
    },
  },
  {
    family: 'Be Vietnam Pro' as const,
    get label() {
      return translate('shared.lettering.fonts.beVietnamPro');
    },
  },
  {
    family: 'Bangers' as const,
    get label() {
      return translate('shared.lettering.fonts.bangers');
    },
  },
];

export const MAX_TEXT_FONT_PX = 160;
export const LINE_HEIGHTS = [1.0, 1.15, 1.3] as const;

/** Kiểu có sẵn (như "Kiểu" của Word): Letterer chọn kiểu thay vì chỉnh từng thông số, cả chương đồng nhất. */
const PRESET_DEFS: { key: string; style: TextStyleDto }[] = [
  {
    key: 'normalSpeech',
    style: { fontFamily: 'Mali', fontSize: 26, align: 'center', color: '#171717', lineHeight: 1.3 },
  },
  {
    key: 'shout',
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
    key: 'whisper',
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
    key: 'thought',
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
    key: 'narration',
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
    key: 'flashback',
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
    key: 'sfx',
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

export const TEXT_PRESETS: { name: string; style: TextStyleDto }[] = PRESET_DEFS.map((p) => ({
  get name() {
    return translate(`shared.lettering.presets.${p.key}`);
  },
  get style(): TextStyleDto {
    return { ...p.style, preset: translate(`shared.lettering.presets.${p.key}`) };
  },
}));

const DEFAULT_PRESET_KEY_BY_TYPE: Record<string, string> = {
  NARRATION_BOX: 'narration',
  THOUGHT_BALLOON: 'thought',
  SOUND_EFFECT: 'sfx',
};

/** Kiểu đang áp dụng: kiểu Letterer đã lưu, không có thì kiểu mặc định theo loại element. */
export function resolveTextStyle(el: {
  elementType: string;
  style?: TextStyleDto | null;
}): TextStyleDto {
  if (el.style) return el.style;
  const key = DEFAULT_PRESET_KEY_BY_TYPE[el.elementType] ?? 'normalSpeech';
  const def = PRESET_DEFS.find((p) => p.key === key)!;
  return { ...def.style, preset: translate(`shared.lettering.presets.${def.key}`) };
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

export type ScriptLineKind = 'SPEECH' | 'NARRATION' | 'SFX' | 'DIRECTION';

export interface ScriptLineClassification {
  kind: ScriptLineKind;
  isLetterable: boolean;
  suggestedElementType: string;
  label: string;
  cleanText: string;
}

/**
 * Phân loại dòng kịch bản cho Letterer Desk:
 * 1. dialogueText bắt đầu bằng 'SFX:' (không phân biệt hoa/thường) -> SFX (SOUND_EFFECT), bỏ tiền tố khi đặt chữ
 * 2. dialogueText rỗng (chỉ có stageDirection) -> Chỉ dẫn (DIRECTION): không phải chữ của Letterer, không kéo thả
 * 3. dialogueText có nội dung, có người nói -> Bóng thoại (SPEECH / SPEECH_BALLOON hoặc THOUGHT_BALLOON)
 * 4. dialogueText có nội dung, không có người nói -> Hộp dẫn truyện (NARRATION / NARRATION_BOX)
 */
export function classifyScriptLine(
  line: {
    dialogueText?: string | null;
    stageDirection?: string | null;
    speakerName?: string | null;
    speakerLabel?: string | null;
    narrationMode?: string | null;
  },
  toolMode: string = 'bubble',
): ScriptLineClassification {
  const rawDialogue = (line.dialogueText ?? '').trim();
  const speakerName =
    (line as { speakerName?: string | null; speakerLabel?: string | null }).speakerName ||
    (line as any).speakerLabel;
  const hasSpeaker = Boolean(speakerName);

  // SFX: dialogueText bắt đầu bằng 'SFX:' (case-insensitive)
  if (/^sfx\s*:/i.test(rawDialogue)) {
    const cleanText = rawDialogue.replace(/^sfx\s*:\s*/i, '').trim();
    return {
      kind: 'SFX',
      isLetterable: true,
      suggestedElementType: 'SOUND_EFFECT',
      label: translate('shared.lettering.scriptKinds.sfx'),
      cleanText: cleanText || rawDialogue,
    };
  }

  // dialogueText rỗng (chỉ có stageDirection) -> Chỉ dẫn
  if (!rawDialogue) {
    return {
      kind: 'DIRECTION',
      isLetterable: false,
      suggestedElementType: '',
      label: translate('shared.lettering.scriptKinds.direction'),
      cleanText: '',
    };
  }

  // dialogueText có nội dung, có người nói -> Bóng thoại
  if (hasSpeaker) {
    const isThought = toolMode === 'thought' || line.narrationMode === 'Thought';
    return {
      kind: 'SPEECH',
      isLetterable: true,
      suggestedElementType: isThought ? 'THOUGHT_BALLOON' : 'SPEECH_BALLOON',
      label: translate('shared.lettering.scriptKinds.speech'),
      cleanText: rawDialogue,
    };
  }

  // dialogueText có nội dung, không có người nói -> Hộp dẫn truyện
  return {
    kind: 'NARRATION',
    isLetterable: true,
    suggestedElementType: 'NARRATION_BOX',
    label: translate('shared.lettering.scriptKinds.narration'),
    cleanText: rawDialogue,
  };
}
