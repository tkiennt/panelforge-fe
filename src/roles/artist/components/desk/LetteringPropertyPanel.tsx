import React, { useEffect, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileText,
  Italic,
  MessageCircle,
  Minus,
  Plus,
  Shapes,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import type { ElementSnapshotDto, TextStyleDto } from '@/services/element.service';
import {
  BALLOON_SHAPES,
  resolveAppearance,
  appearanceFromStyle,
} from '@/shared/utils/balloonRender';
import {
  MAX_TEXT_FONT_PX,
  MIN_LETTERING_FONT_PX,
  TEXT_FONTS,
  clampFontSize,
  resolveTextStyle,
} from '@/shared/utils/textStyle';
import type { ScriptLineItem } from './ArtistCanvaSidebar';
import { BalloonTextEditor } from './BalloonTextEditor';
import { SpeakerAvatar } from './SpeakerAvatar';

export interface LetteringPropertyPanelProps {
  element: ElementSnapshotDto;
  /** Dòng kịch bản đang gắn (tra theo element.scriptLineId); undefined = không gắn hoặc không tìm thấy. */
  scriptLine?: ScriptLineItem;
  /** Số thứ tự dòng trong kịch bản (như cột "Script truyện"). */
  lineNumber?: number;
  /** Số thứ tự hiển thị của bóng ("Thoại N"). */
  displayNumber?: number;
  activeLang?: string;
  originalLang?: string;
  /** Khóa ô nhập chữ (chữ gốc khi trang readOnly, hoặc bản dịch khi ấn bản không ở trạng thái Draft). */
  textReadOnly?: boolean;
  onCommitText: (text: string) => void;
  onChangeStyle: (patch: Partial<TextStyleDto> | null) => void;
  onDelete?: () => void;
  onViewScript?: () => void;
  onClose?: () => void;
}

const SECTION_TITLE = 'text-xs font-semibold text-stone-800 flex items-center gap-1.5';
const ICON_BTN = (active: boolean) =>
  `h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-lg border text-xs cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    active
      ? 'bg-orange-50 border-orange-400 text-orange-700'
      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
  }`;

/**
 * "Thuộc tính thoại" — cột phải của bàn Letter cho bóng đang chọn:
 * liên kết + tham chiếu kịch bản (BR-05, chỉ đọc — không bao giờ sửa dữ liệu Writer), nội dung hiển thị (gốc / bản dịch — BR-34),
 * kiểu hiển thị (hình bóng, màu), kiểu chữ (font, cỡ 14–160px, màu, đậm/nghiêng, căn lề — theo TextStyle BE) và xóa.
 */
export const LetteringPropertyPanel: React.FC<LetteringPropertyPanelProps> = ({
  element,
  scriptLine,
  lineNumber,
  displayNumber,
  activeLang,
  originalLang = 'vi',
  textReadOnly = false,
  onCommitText,
  onChangeStyle,
  onDelete,
  onViewScript,
  onClose,
}) => {
  const isOriginal = !activeLang || activeLang.toLowerCase() === originalLang.toLowerCase();
  const appearance = resolveAppearance(element.elementType, appearanceFromStyle(element.style));
  const text = resolveTextStyle(element);
  const linked = Boolean(element.scriptLineId);
  // Thoại hiện hành của Writer (currentLineText) — chỉ đọc
  const scriptText = element.currentLineText ?? scriptLine?.dialogueText ?? null;
  const name = `Thoại ${displayNumber ?? element.readingOrder ?? ''}`.trim();

  const [sizeDraft, setSizeDraft] = useState(String(text.fontSize));
  useEffect(() => setSizeDraft(String(text.fontSize)), [text.fontSize]);
  const commitSize = () => {
    const n = Number(sizeDraft);
    const next = Number.isFinite(n) && n > 0 ? clampFontSize(n) : text.fontSize;
    setSizeDraft(String(next));
    if (next !== text.fontSize) onChangeStyle({ fontSize: next });
  };
  const align = text.align ?? 'center';

  return (
    <aside
      data-testid='lettering-property-panel'
      aria-label='Thuộc tính thoại'
      className='w-80 shrink-0 h-full overflow-y-auto custom-scrollbar p-3'
    >
      <div className='rounded-2xl border border-stone-200 bg-white shadow-sm p-4 space-y-5'>
        <header className='flex items-center justify-between'>
          <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
            <MessageCircle className='w-4 h-4' aria-hidden='true' />
            Thuộc tính thoại
          </h3>
          {onClose && (
            <button
              type='button'
              aria-label='Đóng thuộc tính'
              onClick={onClose}
              className='p-1 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </header>

        {/* Tên + trạng thái liên kết */}
        <div className='flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/60 p-2.5'>
          <span className='w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center'>
            <MessageCircle className='w-4 h-4' aria-hidden='true' />
          </span>
          <span
            data-testid='lettering-property-name'
            className='flex-1 text-sm font-bold text-stone-900'
          >
            {name}
          </span>
          <span
            data-testid='lettering-property-link-status'
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              linked ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'
            }`}
          >
            {linked ? (
              <CheckCircle2 className='w-3 h-3' aria-hidden='true' />
            ) : (
              <CircleAlert className='w-3 h-3' aria-hidden='true' />
            )}
            {linked ? 'Đã liên kết' : 'Chưa liên kết'}
          </span>
        </div>

        {/* Tham chiếu Script */}
        <section className='space-y-2'>
          <h4 className={SECTION_TITLE}>
            <FileText className='w-3.5 h-3.5' aria-hidden='true' /> Tham chiếu Script
          </h4>
          {linked ? (
            <div
              data-testid='lettering-property-script'
              className='rounded-xl border border-stone-200 p-3 space-y-2'
            >
              <div className='flex items-start gap-3'>
                <SpeakerAvatar
                  name={scriptLine?.characterName}
                  color={scriptLine?.characterColor}
                  url={scriptLine?.characterAvatarUrl}
                  size={44}
                />
                <div className='min-w-0'>
                  <p className='text-xs font-semibold text-stone-900'>
                    Dòng {lineNumber ?? '?'}: “{scriptText ?? '…'}”
                  </p>
                  <p
                    data-testid='lettering-property-speaker'
                    className='text-[11px] text-stone-500'
                  >
                    Nhân vật: {scriptLine?.characterName || 'Người dẫn'}
                    {scriptLine?.pageNumber ? ` · Trang ${scriptLine.pageNumber}` : ''}
                  </p>
                </div>
              </div>
              {element.isStale && (
                <p className='text-[11px] font-semibold text-amber-700'>
                  Writer đã sửa thoại — cần cập nhật chữ.
                </p>
              )}
              {onViewScript && (
                <div className='flex justify-end'>
                  <button
                    type='button'
                    onClick={onViewScript}
                    className='inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer'
                  >
                    Xem script <ExternalLink className='w-3 h-3' aria-hidden='true' />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className='text-xs text-stone-500 rounded-xl border border-dashed border-stone-200 p-3'>
              Bóng chưa gắn dòng kịch bản (chữ tự do).
            </p>
          )}
        </section>

        {/* Nội dung hiển thị */}
        <BalloonTextEditor
          key={`${element.elementId}-${activeLang ?? originalLang}`}
          element={element}
          isOriginal={isOriginal}
          langLabel={(activeLang ?? originalLang).toUpperCase()}
          readOnly={textReadOnly}
          onCommit={onCommitText}
        />

        {/* Kiểu hiển thị */}
        <section className='space-y-2'>
          <h4 className={SECTION_TITLE}>
            <Shapes className='w-3.5 h-3.5' aria-hidden='true' /> Kiểu hiển thị
          </h4>
          <div className='flex items-center gap-2'>
            <span
              aria-hidden='true'
              className='w-11 h-9 rounded-lg border border-stone-200 flex items-center justify-center shrink-0'
            >
              <span
                className={`w-7 h-5 border-2 ${appearance.shape === 'box' ? 'rounded-sm' : 'rounded-[50%]'} ${
                  appearance.shape === 'cloud' ? 'border-dashed' : ''
                } ${appearance.shape === 'none' ? 'border-transparent' : ''}`}
                style={{
                  borderColor: appearance.shape === 'none' ? undefined : appearance.borderColor,
                  backgroundColor: appearance.fillColor,
                }}
              />
            </span>
            <select
              data-testid='lettering-property-shape'
              aria-label='Hình bóng'
              value={appearance.shape}
              onChange={(e) =>
                onChangeStyle({ balloonShape: e.target.value as TextStyleDto['balloonShape'] })
              }
              className='flex-1 h-9 px-2 rounded-lg border border-stone-200 bg-white text-xs focus:outline-none focus:border-orange-500 cursor-pointer'
            >
              {BALLOON_SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <label className='flex items-center justify-between gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-600'>
              Nền
              <input
                type='color'
                data-testid='lettering-property-fill'
                value={appearance.fillColor}
                onChange={(e) => onChangeStyle({ fillColor: e.target.value.toUpperCase() })}
                className='w-6 h-6 p-0 border-0 bg-transparent cursor-pointer'
              />
            </label>
            <label className='flex items-center justify-between gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs text-stone-600'>
              Viền
              <input
                type='color'
                data-testid='lettering-property-border'
                value={appearance.borderColor}
                onChange={(e) => onChangeStyle({ borderColor: e.target.value.toUpperCase() })}
                className='w-6 h-6 p-0 border-0 bg-transparent cursor-pointer'
              />
            </label>
          </div>
        </section>

        {/* Kiểu chữ */}
        <section className='space-y-2'>
          <h4 className={SECTION_TITLE}>
            <Type className='w-3.5 h-3.5' aria-hidden='true' /> Kiểu chữ
          </h4>
          <select
            data-testid='lettering-font-family'
            aria-label='Phông chữ'
            value={text.fontFamily}
            onChange={(e) => onChangeStyle({ fontFamily: e.target.value })}
            className='w-full h-9 px-2 rounded-lg border border-stone-200 bg-white text-xs focus:outline-none focus:border-orange-500 cursor-pointer'
            style={{ fontFamily: `'${text.fontFamily}', sans-serif` }}
          >
            {TEXT_FONTS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.label}
              </option>
            ))}
          </select>
          <div className='flex items-center gap-1.5 flex-wrap'>
            <button
              type='button'
              data-testid='lettering-font-size-dec'
              aria-label='Giảm cỡ chữ'
              disabled={text.fontSize <= MIN_LETTERING_FONT_PX}
              onClick={() => onChangeStyle({ fontSize: clampFontSize(text.fontSize - 2) })}
              className={ICON_BTN(false)}
            >
              <Minus className='w-3.5 h-3.5' />
            </button>
            <input
              data-testid='lettering-font-size-input'
              aria-label='Cỡ chữ (px)'
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
              className='w-12 h-8 text-center rounded-lg border border-stone-200 text-xs font-bold focus:outline-none focus:border-orange-500'
            />
            <button
              type='button'
              data-testid='lettering-font-size-inc'
              aria-label='Tăng cỡ chữ'
              disabled={text.fontSize >= MAX_TEXT_FONT_PX}
              onClick={() => onChangeStyle({ fontSize: clampFontSize(text.fontSize + 2) })}
              className={ICON_BTN(false)}
            >
              <Plus className='w-3.5 h-3.5' />
            </button>
            <input
              type='color'
              data-testid='lettering-color-picker'
              aria-label='Màu chữ'
              value={text.color ?? '#171717'}
              onChange={(e) => onChangeStyle({ color: e.target.value.toUpperCase() })}
              className='w-8 h-8 p-0.5 rounded-lg border border-stone-200 cursor-pointer'
            />
          </div>
          <div className='flex items-center gap-1.5'>
            <button
              type='button'
              data-testid='lettering-btn-bold'
              aria-label='In đậm'
              aria-pressed={Boolean(text.bold)}
              onClick={() => onChangeStyle({ bold: !text.bold })}
              className={ICON_BTN(Boolean(text.bold))}
            >
              <Bold className='w-3.5 h-3.5' />
            </button>
            <button
              type='button'
              data-testid='lettering-btn-italic'
              aria-label='In nghiêng'
              aria-pressed={Boolean(text.italic)}
              onClick={() => onChangeStyle({ italic: !text.italic })}
              className={ICON_BTN(Boolean(text.italic))}
            >
              <Italic className='w-3.5 h-3.5' />
            </button>
            <span className='w-px h-5 bg-stone-200 mx-1' aria-hidden='true' />
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
                data-testid={`lettering-align-${value}`}
                aria-label={label}
                aria-pressed={align === value}
                onClick={() => onChangeStyle({ align: value })}
                className={ICON_BTN(align === value)}
              >
                <Icon className='w-3.5 h-3.5' />
              </button>
            ))}
          </div>
        </section>

        {onDelete && (
          <div className='flex justify-end pt-1'>
            <button
              type='button'
              data-testid='lettering-property-delete'
              onClick={onDelete}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 cursor-pointer'
            >
              <Trash2 className='w-3.5 h-3.5' aria-hidden='true' /> Xóa thoại
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
