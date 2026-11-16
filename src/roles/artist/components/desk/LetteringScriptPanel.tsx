import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Info,
  Link2,
  MessageCircle,
  MessageSquare,
  Plus,
  Volume2,
} from 'lucide-react';
import type { ElementSnapshotDto } from '@/services/element.service';
import { BALLOON_TYPE_LABELS, suggestBalloonType } from '../../utils/letteringScript';
import type { BalloonType } from '../../hooks/useLetteringBalloons';
import type { ScriptLineItem } from './ArtistCanvaSidebar';
import { SpeakerAvatar } from './SpeakerAvatar';
const Avatar: React.FC<{ line: ScriptLineItem; size?: number }> = ({ line, size = 40 }) => (
  <SpeakerAvatar
    name={line.characterName}
    color={line.characterColor}
    url={line.characterAvatarUrl}
    size={size}
    testId={`lettering-speaker-avatar-${line.id}`}
  />
);

export interface LetteringScriptPanelProps {
  chapterTitle?: string;
  scriptLines: ScriptLineItem[];
  activePageNumber: number;
  /** Bóng chữ của trang đang mở. */
  elements: ElementSnapshotDto[];
  selectedElementId: string | null;
  onSelectElementId?: (id: string | null) => void;
  onAddElement?: (type: BalloonType, scriptLine?: ScriptLineItem) => void;
  /** Dòng script đã có bóng trên toàn chương; thiếu thì chỉ xét trang hiện tại. */
  linkedScriptLineIds?: ReadonlySet<string>;
  activeLang?: string;
  originalLang?: string;
  /** Bộ chọn ngôn ngữ đang soạn (đặt ở đầu cột, không đè lên trang). */
  headerSlot?: React.ReactNode;
}

/**
 * Cột trái của bàn Letter: "Script truyện" (dòng thoại của Writer, đánh số theo thứ tự kịch bản, kéo/bấm để đặt bóng)
 * và "Liên kết thoại trên trang" (bóng trên trang + trạng thái liên kết). BR-05: bóng tạo từ dòng giữ scriptLineId.
 */
export const LetteringScriptPanel: React.FC<LetteringScriptPanelProps> = ({
  chapterTitle,
  scriptLines,
  activePageNumber,
  elements,
  selectedElementId,
  onSelectElementId,
  onAddElement,
  linkedScriptLineIds,
  activeLang,
  originalLang = 'vi',
  headerSlot,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [linkFilter, setLinkFilter] = useState<'all' | 'unlinked' | 'linked'>('all');
  const [showAllElements, setShowAllElements] = useState(false);

  // Chỉ dòng có chữ để đặt (bỏ chỉ dẫn cảnh), đánh số theo thứ tự trong kịch bản
  const lines = useMemo(
    () =>
      scriptLines
        .map((line) => ({ line, ...suggestBalloonType(line) }))
        .filter((x) => x.letterable)
        .map((x, i) => ({ ...x, number: i + 1 })),
    [scriptLines],
  );
  const numberByLineId = useMemo(() => new Map(lines.map((x) => [x.line.id, x.number])), [lines]);

  const isLinked = (lineId: string) =>
    linkedScriptLineIds
      ? linkedScriptLineIds.has(lineId)
      : elements.some((el) => el.scriptLineId === lineId);

  const visibleLines = lines.filter((x) =>
    linkFilter === 'all'
      ? true
      : linkFilter === 'linked'
        ? isLinked(x.line.id)
        : !isLinked(x.line.id),
  );

  const selectedLineId =
    elements.find((el) => el.elementId === selectedElementId)?.scriptLineId ?? null;

  useEffect(() => {
    if (!selectedLineId) return;
    document
      .querySelector(`[data-testid="lettering-script-line-${selectedLineId}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedLineId]);

  const isTranslating = !!activeLang && activeLang.toLowerCase() !== originalLang.toLowerCase();
  const missingTranslations = isTranslating
    ? elements.filter((el) => !el.texts?.[activeLang!]?.trim()).length
    : 0;

  const shownElements = showAllElements ? elements : elements.slice(0, 4);

  return (
    <div
      data-testid='canva-drawer-lettering'
      className='w-full h-full flex flex-col gap-4 p-3 overflow-y-auto custom-scrollbar bg-stone-50/60'
    >
      {headerSlot && <div className='flex justify-end'>{headerSlot}</div>}
      {/* ── Script truyện ── */}
      <section className='rounded-xl border border-stone-200 bg-white shadow-2xs overflow-hidden'>
        <header className='flex items-center justify-between gap-2 px-3 py-2.5 border-b border-stone-100'>
          <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
            <BookOpen className='w-4 h-4 text-stone-600' aria-hidden='true' />
            Script truyện
          </h3>
          <span
            data-testid='lettering-script-total'
            className='px-2 py-0.5 rounded-full bg-stone-100 text-[11px] text-stone-600'
          >
            Tổng: {lines.length} dòng
          </span>
        </header>

        <button
          type='button'
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className='w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-stone-800 hover:bg-stone-50 cursor-pointer'
        >
          <ChevronDown
            className={`w-4 h-4 text-stone-500 transition-transform ${expanded ? '' : '-rotate-90'}`}
            aria-hidden='true'
          />
          <span className='truncate'>{chapterTitle || 'Chương hiện tại'}</span>
        </button>

        {expanded && (
          <div className='px-2 pb-2 space-y-2'>
            <div
              role='group'
              aria-label='Lọc theo trạng thái liên kết'
              className='grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-stone-100'
            >
              {(
                [
                  ['all', 'Tất cả'],
                  ['unlinked', 'Chưa liên kết'],
                  ['linked', 'Đã liên kết'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type='button'
                  data-testid={`lettering-link-filter-${key}`}
                  aria-pressed={linkFilter === key}
                  onClick={() => setLinkFilter(key)}
                  className={`py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                    linkFilter === key
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <ul className='space-y-1.5 max-h-[42vh] overflow-y-auto custom-scrollbar'>
              {visibleLines.length === 0 && (
                <li className='text-xs text-stone-500 italic px-2 py-3 text-center'>
                  Không có dòng thoại nào.
                </li>
              )}
              {visibleLines.map(({ line, type, text, number }) => {
                const linked = isLinked(line.id);
                const selected = selectedLineId === line.id;
                const isNarration = type === 'NARRATION_BOX';
                return (
                  <li key={line.id}>
                    <div
                      role='button'
                      tabIndex={0}
                      draggable
                      data-testid={`lettering-script-line-${line.id}`}
                      data-selected={selected || undefined}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({ type, scriptLine: line }),
                        );
                        e.dataTransfer.setData('text/plain', text);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAddElement?.(type, line)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onAddElement?.(type, line);
                        }
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-grab active:cursor-grabbing transition-colors ${
                        selected
                          ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-400'
                          : 'border-stone-200 bg-white hover:border-orange-300 hover:bg-orange-50/40'
                      }`}
                    >
                      <span className='w-6 h-6 rounded-full border border-stone-300 bg-white text-[11px] font-bold text-stone-700 flex items-center justify-center shrink-0'>
                        {number}
                      </span>
                      {isNarration ? (
                        <span className='w-10 h-10 rounded-full bg-stone-100 text-stone-500 flex items-center justify-center shrink-0'>
                          <BookOpen className='w-4 h-4' aria-hidden='true' />
                        </span>
                      ) : (
                        <Avatar line={line} />
                      )}
                      <div className='min-w-0 flex-1'>
                        <p
                          className='text-xs font-bold truncate'
                          style={{ color: line.characterColor || '#C2410C' }}
                        >
                          {isNarration ? 'Dẫn truyện' : line.characterName || 'Nhân vật'}
                          <span
                            data-testid={`lettering-script-kind-${line.id}`}
                            className='ml-1.5 font-normal text-[10px] text-stone-400'
                          >
                            {BALLOON_TYPE_LABELS[type]} · Trang {line.pageNumber ?? '?'}
                          </span>
                        </p>
                        <p className='text-[13px] text-stone-800 line-clamp-2'>{text}</p>
                      </div>
                      {type === 'SOUND_EFFECT' && (
                        <Volume2 className='w-4 h-4 text-stone-400 shrink-0' aria-hidden='true' />
                      )}
                      {linked && (
                        <CheckCircle2
                          data-testid={`lettering-script-linked-${line.id}`}
                          className='w-5 h-5 text-orange-500 shrink-0'
                          aria-label='Đã liên kết'
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className='flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2 text-[11px] text-orange-900'>
              <Info className='w-3.5 h-3.5 mt-0.5 shrink-0' aria-hidden='true' />
              Chọn hoặc kéo dòng thoại để đặt vào bóng thoại trên trang truyện.
            </p>
          </div>
        )}
      </section>

      {/* ── Liên kết thoại trên trang ── */}
      <section className='space-y-2'>
        <div className='flex items-center justify-between gap-2 px-1'>
          <h3 className='text-sm font-bold text-stone-900 flex items-center gap-2'>
            <Link2 className='w-4 h-4 text-stone-600' aria-hidden='true' />
            Liên kết thoại trên trang {activePageNumber}
          </h3>
          {elements.length > 4 && (
            <button
              type='button'
              onClick={() => setShowAllElements((v) => !v)}
              className='text-[11px] font-semibold text-orange-600 hover:underline cursor-pointer'
            >
              {showAllElements ? 'Thu gọn' : 'Hiển thị tất cả'}
            </button>
          )}
        </div>

        {isTranslating && (
          <p
            data-testid='lettering-missing-translations'
            className='px-1 text-[11px] font-semibold text-amber-700'
          >
            Thiếu bản dịch {activeLang!.toUpperCase()}: {missingTranslations}
          </p>
        )}

        {elements.length === 0 ? (
          <p className='text-xs text-stone-500 italic rounded-lg bg-white border border-dashed border-stone-200 p-3 text-center'>
            Trang chưa có bóng thoại.
          </p>
        ) : (
          <ul className='space-y-1.5'>
            {shownElements.map((el, idx) => {
              const lineNo = el.scriptLineId ? numberByLineId.get(el.scriptLineId) : undefined;
              const selected = el.elementId === selectedElementId;
              return (
                <li key={el.elementId}>
                  <button
                    type='button'
                    data-testid={`lettering-item-${el.elementId}`}
                    onClick={() => onSelectElementId?.(el.elementId)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left cursor-pointer transition-colors ${
                      selected
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <span className='w-14 h-10 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0'>
                      <span className='w-9 h-6 rounded-[50%] border-2 border-stone-700 bg-white' />
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block text-xs font-bold text-stone-900'>
                        Thoại {el.readingOrder ?? idx + 1}
                      </span>
                      <span
                        className={`block text-[11px] ${el.scriptLineId ? 'text-emerald-700' : 'text-stone-500'}`}
                      >
                        {el.scriptLineId
                          ? `Đã liên kết với dòng ${lineNo ?? '?'}`
                          : 'Chưa liên kết'}
                      </span>
                    </span>
                    {el.scriptLineId ? (
                      <CheckCircle2
                        className='w-5 h-5 text-emerald-600 shrink-0'
                        aria-hidden='true'
                      />
                    ) : (
                      <CircleAlert className='w-5 h-5 text-stone-400 shrink-0' aria-hidden='true' />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Bóng không theo kịch bản (SFX, chữ tự do) */}
        <div className='pt-1'>
          <p className='px-1 pb-1.5 text-[11px] font-semibold text-stone-500 flex items-center gap-1'>
            <Plus className='w-3 h-3' aria-hidden='true' /> Thêm bóng trống
          </p>
          <div className='grid grid-cols-4 gap-1.5'>
            {(
              [
                ['SPEECH_BALLOON', MessageSquare, 'lettering-drag-speech'],
                ['THOUGHT_BALLOON', MessageCircle, 'lettering-drag-thought'],
                ['NARRATION_BOX', BookOpen, 'lettering-drag-narration'],
                ['SOUND_EFFECT', Volume2, 'lettering-drag-sfx'],
              ] as const
            ).map(([type, Icon, testId]) => (
              <button
                key={type}
                type='button'
                draggable
                data-testid={testId}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({ type }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onAddElement?.(type)}
                className='flex flex-col items-center gap-0.5 py-1.5 rounded-lg border border-stone-200 bg-white text-[10px] text-stone-700 hover:border-orange-400 cursor-pointer'
              >
                <Icon className='w-4 h-4' aria-hidden='true' />
                {BALLOON_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
