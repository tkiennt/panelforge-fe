import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  Globe,
  Info,
  Link2,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  RefreshCw,
  Volume2,
} from 'lucide-react';
import { updateElementTranslation, type ElementSnapshotDto } from '@/services/element.service';
import {
  SUPPORTED_AUTO_TRANSLATE_LANGUAGES,
  isAutoTranslateSupportedPair,
  translateText,
} from '@/services/translation.service';
import { BALLOON_TYPE_LABELS, suggestBalloonType } from '../../utils/letteringScript';
import type { BalloonType } from '../../hooks/useLetteringBalloons';
import type { ScriptLineItem } from './ArtistCanvaSidebar';
import { SpeakerAvatar } from './SpeakerAvatar';
import { useTranslation } from '@/lib/i18n';

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
  /** ID của trang đang mở. */
  pageId?: string;
  /** Bóng chữ của trang đang mở. */
  elements: ElementSnapshotDto[];
  selectedElementId: string | null;
  onSelectElementId?: (id: string | null) => void;
  onAddElement?: (type: BalloonType, scriptLine?: ScriptLineItem) => void;
  /** Callback cập nhật bản dịch bóng thoại (fallback gọi updateElementTranslation). */
  onUpdateElementTranslation?: (
    pageId: string,
    elementId: string,
    lang: string,
    text: string,
  ) => Promise<void> | void;
  /** Dòng script đã có bóng trên toàn chương; thiếu thì chỉ xét trang hiện tại. */
  linkedScriptLineIds?: ReadonlySet<string>;
  activeLang?: string;
  originalLang?: string;
  /** Khóa thao tác dịch/đổ bản dịch khi ấn bản ngôn ngữ không ở trạng thái cho phép sửa (vd InReview/Approved/Published). */
  translationReadOnly?: boolean;
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
  pageId,
  elements,
  selectedElementId,
  onSelectElementId,
  onAddElement,
  onUpdateElementTranslation,
  linkedScriptLineIds,
  activeLang,
  originalLang = 'vi',
  translationReadOnly = false,
  headerSlot,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [linkFilter, setLinkFilter] = useState<'all' | 'unlinked' | 'linked'>('all');
  const [showAllElements, setShowAllElements] = useState(false);

  // Trạng thái dịch hội thoại
  const { t } = useTranslation('production');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslatingLine, setIsTranslatingLine] = useState<Record<string, boolean>>({});
  const [lineError, setLineError] = useState<Record<string, string | null>>({});
  const [lineFallbackWarning, setLineFallbackWarning] = useState<Record<string, string | null>>({});
  const [isApplyingLine, setIsApplyingLine] = useState<Record<string, boolean>>({});
  const [applySuccessLine, setApplySuccessLine] = useState<Record<string, boolean>>({});
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchFallbackWarning, setBatchFallbackWarning] = useState<string | null>(null);

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
  const canAutoTranslate = useMemo(() => {
    if (typeof isAutoTranslateSupportedPair === 'function') {
      return isAutoTranslateSupportedPair(originalLang, activeLang);
    }
    const supported = new Set<string>(SUPPORTED_AUTO_TRANSLATE_LANGUAGES ?? ['en', 'vi']);
    const src = (originalLang || '').trim().toLowerCase();
    const tgt = (activeLang || '').trim().toLowerCase();
    return supported.has(src) && supported.has(tgt) && src !== tgt;
  }, [originalLang, activeLang]);
  const unsupportedPairTooltip = t(
    'lettering.translate.unsupportedPairTooltip',
    'Dịch tự động chỉ hỗ trợ Anh ↔ Việt',
  );
  const fallbackWarningMessage = t(
    'lettering.translate.fallbackWarning',
    'Dịch vụ dịch chưa sẵn sàng — chưa dịch được, hãy thử lại sau',
  );
  const missingTranslations = isTranslating
    ? elements.filter((el) => !el.texts?.[activeLang!]?.trim()).length
    : 0;

  const shownElements = showAllElements ? elements : elements.slice(0, 4);

  // Các dòng có thể dịch thuộc trang hiện tại
  const currentPageLines = useMemo(() => {
    const hasPageNumbers = lines.some((x) => x.line.pageNumber != null);
    if (!hasPageNumbers) {
      return lines;
    }
    return lines.filter(
      (x) =>
        x.line.pageNumber === activePageNumber ||
        elements.some((el) => el.scriptLineId === x.line.id),
    );
  }, [lines, activePageNumber, elements]);

  // Tìm bóng thoại tương ứng cho 1 dòng kịch bản (ưu tiên bóng liên kết dòng đó, nếu không có lấy bóng đang chọn)
  const getTargetElementForLine = (lineId: string): ElementSnapshotDto | null => {
    return (
      elements.find((el) => el.scriptLineId === lineId) ||
      (selectedElementId ? elements.find((el) => el.elementId === selectedElementId) : null) ||
      null
    );
  };

  // Dịch 1 dòng kịch bản
  const handleTranslateLine = async (lineId: string, textToTranslate: string) => {
    if (
      !activeLang ||
      !originalLang ||
      !textToTranslate.trim() ||
      !canAutoTranslate ||
      translationReadOnly
    )
      return;
    setIsTranslatingLine((prev) => ({ ...prev, [lineId]: true }));
    setLineError((prev) => ({ ...prev, [lineId]: null }));
    setLineFallbackWarning((prev) => ({ ...prev, [lineId]: null }));
    try {
      const raw = await translateText(textToTranslate, originalLang, activeLang);
      const result = typeof raw === 'string' ? { text: raw, isFallback: false } : raw;
      if (result.isFallback) {
        setLineFallbackWarning((prev) => ({ ...prev, [lineId]: fallbackWarningMessage }));
      } else {
        setTranslations((prev) => ({ ...prev, [lineId]: result.text }));
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        t('lettering.translate.error');
      setLineError((prev) => ({ ...prev, [lineId]: msg }));
    } finally {
      setIsTranslatingLine((prev) => ({ ...prev, [lineId]: false }));
    }
  };

  // Dịch toàn bộ thoại của trang hiện tại
  const handleBatchTranslatePage = async () => {
    if (
      !activeLang ||
      !originalLang ||
      currentPageLines.length === 0 ||
      !canAutoTranslate ||
      translationReadOnly
    )
      return;
    setIsBatchTranslating(true);
    setBatchError(null);
    setBatchFallbackWarning(null);

    try {
      const results = await Promise.all(
        currentPageLines.map(async ({ line, text }) => {
          try {
            const raw = await translateText(text, originalLang, activeLang);
            const res = typeof raw === 'string' ? { text: raw, isFallback: false } : raw;
            return { id: line.id, text: res.text, isFallback: res.isFallback, error: null };
          } catch (err: any) {
            const msg =
              err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.message ||
              t('lettering.translate.error');
            return { id: line.id, text: null, isFallback: false, error: msg };
          }
        }),
      );

      const nextTranslations = { ...translations };
      const nextErrors = { ...lineError };
      const nextFallbacks = { ...lineFallbackWarning };
      let hasFailure = false;
      let hasFallback = false;

      for (const r of results) {
        if (r.isFallback) {
          hasFallback = true;
          nextFallbacks[r.id] = null;
          nextErrors[r.id] = null;
        } else if (r.text != null) {
          nextTranslations[r.id] = r.text;
          nextErrors[r.id] = null;
          nextFallbacks[r.id] = null;
        } else {
          nextErrors[r.id] = r.error;
          hasFailure = true;
        }
      }

      setTranslations(nextTranslations);
      setLineError(nextErrors);
      setLineFallbackWarning(nextFallbacks);
      if (hasFallback) {
        setBatchFallbackWarning(fallbackWarningMessage);
      }
      if (hasFailure) {
        setBatchError(t('lettering.translate.batchPartial'));
      }
    } catch (err: any) {
      setBatchError(t('lettering.translate.batchFailed'));
    } finally {
      setIsBatchTranslating(false);
    }
  };

  // Đổ bản dịch vào bóng thoại
  const handleApplyTranslation = async (lineId: string) => {
    if (!activeLang || translationReadOnly) return;
    const targetElement = getTargetElementForLine(lineId);
    if (!targetElement) return;

    const translatedText = translations[lineId];
    if (translatedText === undefined) return;

    setIsApplyingLine((prev) => ({ ...prev, [lineId]: true }));
    setLineError((prev) => ({ ...prev, [lineId]: null }));
    setApplySuccessLine((prev) => ({ ...prev, [lineId]: false }));

    try {
      const targetPageId = pageId || '';
      if (onUpdateElementTranslation) {
        await onUpdateElementTranslation(
          targetPageId,
          targetElement.elementId,
          activeLang,
          translatedText,
        );
      } else {
        await updateElementTranslation(
          targetPageId,
          targetElement.elementId,
          activeLang,
          translatedText,
          targetElement.version,
        );
      }
      setApplySuccessLine((prev) => ({ ...prev, [lineId]: true }));
      setTimeout(() => {
        setApplySuccessLine((prev) => ({ ...prev, [lineId]: false }));
      }, 3000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        t('lettering.translate.applyError');
      setLineError((prev) => ({ ...prev, [lineId]: msg }));
    } finally {
      setIsApplyingLine((prev) => ({ ...prev, [lineId]: false }));
    }
  };

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
            className='px-2 py-0.5 rounded-full bg-stone-100 text-xs text-stone-600'
          >
            Tổng: {lines.length} dòng
          </span>
        </header>

        {/* Nút dịch toàn bộ thoại của trang (chỉ khi đang ở chế độ ngôn ngữ dịch) */}
        {isTranslating && (
          <div className='px-3 py-2 bg-orange-50/60 border-b border-stone-100 flex flex-col gap-1.5'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-xs text-stone-600 font-medium'>
                {t('lettering.translate.pageLabel', {
                  page: activePageNumber,
                  from: originalLang.toUpperCase(),
                  to: activeLang!.toUpperCase(),
                })}
              </span>
              <button
                type='button'
                data-testid='lettering-batch-translate-page'
                onClick={handleBatchTranslatePage}
                disabled={
                  isBatchTranslating ||
                  currentPageLines.length === 0 ||
                  !canAutoTranslate ||
                  translationReadOnly
                }
                title={!canAutoTranslate ? unsupportedPairTooltip : undefined}
                className='inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:text-stone-500 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs'
              >
                {isBatchTranslating ? (
                  <>
                    <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
                    <span>{t('lettering.translate.translating')}</span>
                  </>
                ) : (
                  <>
                    <Globe className='w-3.5 h-3.5' aria-hidden='true' />
                    <span>{t('lettering.translate.batch')}</span>
                  </>
                )}
              </button>
            </div>
            {!canAutoTranslate && (
              <p
                data-testid='lettering-auto-translate-unsupported'
                className='text-xs text-stone-500 italic'
              >
                {unsupportedPairTooltip}
              </p>
            )}
            {batchFallbackWarning && (
              <p
                data-testid='lettering-batch-translate-fallback'
                className='text-xs text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200'
              >
                {batchFallbackWarning}
              </p>
            )}
            {batchError && (
              <p
                data-testid='lettering-batch-translate-error'
                className='text-xs text-red-600 bg-red-50 p-1.5 rounded border border-red-200'
              >
                {batchError}
              </p>
            )}
          </div>
        )}

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
                  className={`py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    linkFilter === key
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <ul className='space-y-2 max-h-[42vh] overflow-y-auto custom-scrollbar'>
              {visibleLines.length === 0 && (
                <li className='text-xs text-stone-500 italic px-2 py-3 text-center'>
                  Không có dòng thoại nào.
                </li>
              )}
              {visibleLines.map(({ line, type, text, number }) => {
                const linked = isLinked(line.id);
                const selected = selectedLineId === line.id;
                const isNarration = type === 'NARRATION_BOX';
                const targetElement = getTargetElementForLine(line.id);
                const hasTranslation = translations[line.id] !== undefined;

                return (
                  <li key={line.id} className='space-y-1'>
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
                          if (e.nativeEvent?.isComposing || (e as any).keyCode === 229) return;
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
                      <span className='w-6 h-6 rounded-full border border-stone-300 bg-white text-xs font-bold text-stone-700 flex items-center justify-center shrink-0'>
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
                            className='ml-1.5 font-normal text-xs text-stone-400'
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

                    {/* Vùng dịch hội thoại khi activeLang !== originalLang */}
                    {isTranslating && (
                      <div className='pl-2 pr-1 pt-0.5 pb-1'>
                        {!hasTranslation ? (
                          <div className='flex flex-wrap items-center gap-2'>
                            <button
                              type='button'
                              data-testid={`lettering-translate-line-${line.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTranslateLine(line.id, text);
                              }}
                              disabled={
                                isTranslatingLine[line.id] ||
                                !canAutoTranslate ||
                                translationReadOnly
                              }
                              title={!canAutoTranslate ? unsupportedPairTooltip : undefined}
                              className='inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              {isTranslatingLine[line.id] ? (
                                <>
                                  <Loader2 className='w-3 h-3 animate-spin' aria-hidden='true' />
                                  <span>{t('lettering.translate.translating')}</span>
                                </>
                              ) : (
                                <>
                                  <Globe className='w-3 h-3' aria-hidden='true' />
                                  <span>{t('lettering.translate.translate')}</span>
                                </>
                              )}
                            </button>
                            {lineFallbackWarning[line.id] && (
                              <span
                                data-testid={`lettering-translate-fallback-${line.id}`}
                                className='text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium'
                              >
                                {lineFallbackWarning[line.id]}
                              </span>
                            )}
                            {lineError[line.id] && (
                              <span
                                data-testid={`lettering-translate-error-${line.id}`}
                                className='text-xs text-red-600 font-medium truncate'
                              >
                                {lineError[line.id]}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className='p-2 bg-stone-50 rounded-lg border border-stone-200 space-y-1.5'>
                            <div className='flex items-center justify-between text-xs text-stone-500 font-medium'>
                              <span>
                                {t('lettering.translate.translationLabel', {
                                  lang: activeLang!.toUpperCase(),
                                })}
                              </span>
                              <button
                                type='button'
                                data-testid={`lettering-retranslate-line-${line.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTranslateLine(line.id, text);
                                }}
                                disabled={
                                  isTranslatingLine[line.id] ||
                                  !canAutoTranslate ||
                                  translationReadOnly
                                }
                                className='hover:text-stone-800 text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                                title={
                                  !canAutoTranslate
                                    ? unsupportedPairTooltip
                                    : t('lettering.translate.retranslate')
                                }
                              >
                                <RefreshCw
                                  className={`w-2.5 h-2.5 ${isTranslatingLine[line.id] ? 'animate-spin' : ''}`}
                                />
                                <span>{t('lettering.translate.retranslate')}</span>
                              </button>
                            </div>
                            <textarea
                              data-testid={`lettering-preview-input-${line.id}`}
                              value={translations[line.id]}
                              readOnly={translationReadOnly}
                              onChange={(e) => {
                                if (translationReadOnly) return;
                                const val = e.target.value;
                                setTranslations((prev) => ({ ...prev, [line.id]: val }));
                              }}
                              rows={2}
                              className='w-full text-xs p-1.5 border border-stone-300 rounded bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none read-only:bg-stone-100 read-only:text-stone-500'
                              placeholder={t('lettering.translate.previewPlaceholder')}
                            />
                            <div className='flex items-center justify-between gap-2 pt-0.5'>
                              <button
                                type='button'
                                data-testid={`lettering-apply-line-${line.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyTranslation(line.id);
                                }}
                                disabled={
                                  translationReadOnly || isApplyingLine[line.id] || !targetElement
                                }
                                title={
                                  !targetElement ? t('lettering.translate.needBalloon') : undefined
                                }
                                className='inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:text-stone-500 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs'
                              >
                                {isApplyingLine[line.id] ? (
                                  <>
                                    <Loader2 className='w-3 h-3 animate-spin' />
                                    <span>{t('lettering.translate.applying')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className='w-3 h-3' />
                                    <span>{t('lettering.translate.apply')}</span>
                                  </>
                                )}
                              </button>
                              {applySuccessLine[line.id] && (
                                <span
                                  data-testid={`lettering-apply-success-${line.id}`}
                                  className='text-xs text-emerald-600 font-medium flex items-center gap-0.5'
                                >
                                  <CheckCircle2 className='w-3 h-3' />{' '}
                                  {t('lettering.translate.applied')}
                                </span>
                              )}
                              {!targetElement && (
                                <span className='text-xs text-amber-700 italic'>
                                  {t('lettering.translate.noBalloon')}
                                </span>
                              )}
                            </div>
                            {lineError[line.id] && (
                              <p
                                data-testid={`lettering-apply-error-${line.id}`}
                                className='text-xs text-red-600'
                              >
                                {lineError[line.id]}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className='flex items-start gap-2 rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-900'>
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
              className='text-xs font-semibold text-orange-600 hover:underline cursor-pointer'
            >
              {showAllElements ? 'Thu gọn' : 'Hiển thị tất cả'}
            </button>
          )}
        </div>

        {isTranslating && (
          <p
            data-testid='lettering-missing-translations'
            className='px-1 text-xs font-semibold text-amber-700'
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
                        className={`block text-xs ${el.scriptLineId ? 'text-emerald-700' : 'text-stone-500'}`}
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
          <p className='px-1 pb-1.5 text-xs font-semibold text-stone-500 flex items-center gap-1'>
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
                className='flex flex-col items-center gap-0.5 py-1.5 rounded-lg border border-stone-200 bg-white text-xs text-stone-700 hover:border-orange-400 cursor-pointer'
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
