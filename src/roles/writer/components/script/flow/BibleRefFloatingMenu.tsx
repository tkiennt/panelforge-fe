import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { Plus, Search, Tag, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { BibleCategory, BibleEntryDto } from '@/services/bible.service';
import {
  getCategoryIcon,
  getCategoryLabel,
  mapCategoryToTab,
} from '@/shared/features/series-bible/bibleCategory';
import { getBibleArtworkStatus, BIBLE_STATUS_STYLES } from '@/shared/lib/bibleColoring';
import { applyBibleRefToLine, removeBibleRefFromLine } from './nodes/ScriptLineBlockNode';
import {
  DRAFT_CATEGORIES,
  findEntryAtOffset,
  isValidBibleSelection,
  normalizeEntryName,
  snapSelectionToWords,
  toBibleDraftCategory,
} from './bibleRefSelection';

interface BibleRefFloatingMenuProps {
  editor: Editor | null;
  allBibleEntries: BibleEntryDto[];
  canEditScript: boolean;
  t?: (key: string, defaultVal?: string) => string;
}

export const BibleRefFloatingMenu: React.FC<BibleRefFloatingMenuProps> = ({
  editor,
  allBibleEntries,
  canEditScript,
  t: propT,
}) => {
  const { t: i18nT } = useTranslation();
  const t = (key: string, fallback: string) => propT?.(key, fallback) ?? i18nT(key, fallback);
  const [anchor, setAnchor] = useState<{
    top: number;
    left: number;
    recognizedEntry?: BibleEntryDto;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof DRAFT_CATEGORIES)[number]>('Character');
  const [hoveredRef, setHoveredRef] = useState<{
    entryId?: string | null;
    surfaceText: string;
    newDraft?: { name: string; category?: BibleCategory } | null;
    top: number;
    left: number;
  } | null>(null);

  const chipRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);

  const closeSelectionUi = () => {
    setAnchor(null);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!editor || !canEditScript) {
      closeSelectionUi();
      return;
    }

    const showSelection = (
      from: number,
      to: number,
      text: string,
      recognizedEntry?: BibleEntryDto,
    ) => {
      const { state, view } = editor;
      if (state.selection.from !== from || state.selection.to !== to) {
        view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
      }
      try {
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        setAnchor({
          top: Math.min(start.top, end.top) - 8,
          left: (start.left + end.right) / 2,
          recognizedEntry,
        });
        setMenuOpen(false);
        setSelectedText(text);
        setSearchQuery(recognizedEntry?.name ?? text);
      } catch {
        closeSelectionUi();
      }
    };

    const settleSelection = () => {
      const { state } = editor;
      const { selection } = state;
      if (selection.empty) {
        closeSelectionUi();
        return;
      }

      const { $from, $to } = selection;
      const node = $from.parent;
      const allowedLine = ['action', 'caption', 'sfx'].includes(String(node.attrs.el));
      if (node.type.name !== 'scriptLine' || $from.parent !== $to.parent || !allowedLine) {
        closeSelectionUi();
        return;
      }

      const snapped = snapSelectionToWords(
        node.textContent,
        selection.from - $from.start(),
        selection.to - $from.start(),
      );
      if (!snapped || !isValidBibleSelection(snapped.text)) {
        closeSelectionUi();
        return;
      }
      showSelection($from.start() + snapped.from, $from.start() + snapped.to, snapped.text);
    };

    const handleMouseUp = (event: MouseEvent) => {
      window.requestAnimationFrame(() => {
        if (!editor.state.selection.empty) {
          settleSelection();
          return;
        }

        const target = event.target as HTMLElement;
        const marked = target.closest('.gn-bible-ref') as HTMLElement | null;
        if (marked) {
          const text = marked.getAttribute('data-surface-text') || marked.textContent || '';
          const entryId = marked.getAttribute('data-entry-id');
          const from = editor.view.posAtDOM(marked, 0);
          const entry = allBibleEntries.find((item) => item.id === entryId);
          showSelection(from, from + text.length, text, entry);
          return;
        }

        const point = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (!point) return;
        const $point = editor.state.doc.resolve(point.pos);
        const node = $point.parent;
        if (
          node.type.name !== 'scriptLine' ||
          !['action', 'caption', 'sfx'].includes(String(node.attrs.el))
        ) {
          closeSelectionUi();
          return;
        }
        const match = findEntryAtOffset(node.textContent, $point.parentOffset, allBibleEntries);
        if (!match) {
          closeSelectionUi();
          return;
        }
        showSelection(
          $point.start() + match.from,
          $point.start() + match.to,
          match.text,
          match.entry,
        );
      });
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!event.shiftKey) window.requestAnimationFrame(settleSelection);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeSelectionUi();
        setHoveredRef(null);
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.altKey &&
        event.key.toLowerCase() === 'b'
      ) {
        event.preventDefault();
        settleSelection();
        setMenuOpen(true);
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      dom.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, canEditScript, allBibleEntries]);

  useEffect(() => {
    if (!editor) return;
    const handleMouseOver = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest('.gn-bible-ref') as HTMLElement | null;
      if (!target) return;
      const rawDraft = target.getAttribute('data-new-draft');
      let newDraft = null;
      try {
        newDraft = rawDraft ? JSON.parse(rawDraft) : null;
      } catch {
        newDraft = null;
      }
      const rect = target.getBoundingClientRect();
      setHoveredRef({
        entryId: target.getAttribute('data-entry-id'),
        surfaceText: target.getAttribute('data-surface-text') || target.textContent || '',
        newDraft,
        top: rect.bottom + 4,
        left: rect.left,
      });
    };
    const handleMouseOut = (event: MouseEvent) => {
      const related = event.relatedTarget as HTMLElement | null;
      if (related?.closest('.gn-bible-ref, .gn-ref-popover')) return;
      setHoveredRef(null);
    };
    const dom = editor.view.dom;
    dom.addEventListener('mouseover', handleMouseOver);
    dom.addEventListener('mouseout', handleMouseOut);
    return () => {
      dom.removeEventListener('mouseover', handleMouseOver);
      dom.removeEventListener('mouseout', handleMouseOut);
    };
  }, [editor]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !chipRef.current?.contains(target) &&
        !hoverRef.current?.contains(target)
      ) {
        closeSelectionUi();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  if (!editor) return null;

  const normalizedQuery = normalizeEntryName(searchQuery);
  const filteredEntries = allBibleEntries.filter((entry) => {
    if (!normalizedQuery) return true;
    return (
      normalizeEntryName(entry.name).includes(normalizedQuery) ||
      entry.code?.toLocaleLowerCase().includes(normalizedQuery)
    );
  });

  const handleSelectEntry = (entry: BibleEntryDto) => {
    applyBibleRefToLine(editor, selectedText, { entryId: entry.id, newDraft: null });
    closeSelectionUi();
  };

  const handleCreateDraft = () => {
    applyBibleRefToLine(editor, selectedText, {
      entryId: null,
      newDraft: { name: selectedText, category: toBibleDraftCategory(selectedCategory) },
    });
    closeSelectionUi();
  };

  const handleRemoveRef = () => {
    if (!hoveredRef) return;
    removeBibleRefFromLine(editor, hoveredRef.surfaceText, hoveredRef.entryId);
    setHoveredRef(null);
    closeSelectionUi();
  };

  // UIQ-11f: portal ra body để khung editor (overflow/transform) không cắt hoặc che menu.
  return createPortal(
    <>
      {anchor && !menuOpen && (
        <button
          ref={chipRef}
          type='button'
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setMenuOpen(true)}
          title={i18nT('writer.bibleRefMenu.openTooltip')}
          style={{ position: 'fixed', top: anchor.top, left: anchor.left }}
          className='z-40 -translate-x-1/2 -translate-y-full inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-xs font-semibold text-orange-700 shadow-md hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'
        >
          <Tag className='h-3 w-3' aria-hidden='true' />
          {anchor.recognizedEntry
            ? i18nT('writer.bibleRefMenu.attachNamed', { name: anchor.recognizedEntry.name })
            : t('production.cast.attachBible', 'Gắn Series Bible')}
        </button>
      )}

      {anchor && menuOpen && (
        <div
          ref={menuRef}
          role='dialog'
          aria-label={t('production.cast.referenceTitle', 'Tham chiếu Series Bible')}
          style={{
            position: 'fixed',
            // Giữ menu (w-80, cao tối đa ~320px) trong màn hình khi bôi đen sát mép.
            top: Math.max(8, Math.min(anchor.top + 12, window.innerHeight - 328)),
            left: Math.min(Math.max(anchor.left, 168), window.innerWidth - 168),
          }}
          className='z-50 w-80 -translate-x-1/2 rounded-xl border border-stone-200/90 bg-white p-3 text-stone-900 shadow-xl animate-in fade-in zoom-in-95 duration-150'
        >
          <div className='flex items-center justify-between border-b border-stone-100 pb-2'>
            <div className='flex items-center gap-1.5'>
              <Tag className='h-4 w-4 text-orange-600' aria-hidden='true' />
              <span className='font-serif text-xs font-bold'>
                {t('production.cast.referenceTitle', 'Tham chiếu Series Bible')}
              </span>
            </div>
            <button
              type='button'
              onClick={closeSelectionUi}
              aria-label={t('common.close', 'Đóng')}
              className='rounded p-0.5 text-stone-400 hover:text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'
            >
              <X className='h-3.5 w-3.5' aria-hidden='true' />
            </button>
          </div>

          <div className='relative mt-2'>
            <Search
              className='absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400'
              aria-hidden='true'
            />
            <input
              type='text'
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label={t('production.cast.searchPlaceholder', 'Tìm theo tên')}
              placeholder={t('production.cast.searchPlaceholder', 'Tìm theo tên...')}
              className='w-full rounded-lg border border-stone-200 bg-stone-50 py-1 pl-8 pr-2 text-xs text-stone-800 outline-none focus:border-orange-500'
              autoFocus
            />
          </div>

          <div className='custom-scrollbar mt-2 max-h-40 space-y-1 overflow-y-auto'>
            {filteredEntries.slice(0, 8).map((entry) => {
              const statusTone = getBibleArtworkStatus(entry);
              const style = BIBLE_STATUS_STYLES[statusTone];
              return (
                <button
                  key={entry.id}
                  type='button'
                  onClick={() => handleSelectEntry(entry)}
                  className='flex w-full items-center justify-between gap-2 rounded-lg border border-transparent p-1.5 text-left transition-colors hover:border-orange-200/60 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'
                >
                  <span className='flex min-w-0 items-center gap-2'>
                    {getCategoryIcon(mapCategoryToTab(entry.category), 'h-3.5 w-3.5 text-orange-600')}
                    <span className='truncate text-xs font-semibold'>{entry.name}</span>
                  </span>
                  <span className='shrink-0 flex items-center gap-1.5'>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} title={style.label} />
                    <span className='font-mono text-xs text-stone-400'>
                      {entry.code || getCategoryLabel(entry.category)}
                    </span>
                  </span>
                </button>
              );
            })}
            {filteredEntries.length === 0 && (
              <p className='py-2 text-center text-xs text-stone-400'>
                {t('production.cast.noMatchingEntry', 'Không tìm thấy mục trùng khớp')}
              </p>
            )}
          </div>

          <div className='mt-2.5 border-t border-stone-100 pt-2'>
            <div className='mb-2 flex items-center justify-between gap-1'>
              <span className='text-xs font-medium text-stone-500'>
                {t('production.cast.createDraftType', 'Loại bản nháp:')}
              </span>
              <div className='flex items-center gap-1'>
                {DRAFT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type='button'
                    onClick={() => setSelectedCategory(category)}
                    aria-pressed={selectedCategory === category}
                    className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      selectedCategory === category
                        ? 'bg-orange-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {getCategoryLabel(category)}
                  </button>
                ))}
              </div>
            </div>
            <button
              type='button'
              onClick={handleCreateDraft}
              className='flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-2 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2'
            >
              <Plus className='h-3.5 w-3.5' aria-hidden='true' />
              <span>
                {t('production.cast.createDraftBtn', 'Tạo bản nháp cho')} “{selectedText}”
              </span>
            </button>
          </div>
        </div>
      )}

      {hoveredRef && !menuOpen && (
        <div
          ref={hoverRef}
          style={{ position: 'fixed', top: hoveredRef.top, left: hoveredRef.left }}
          className='gn-ref-popover z-40 flex items-center gap-2 rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs text-white shadow-lg animate-in fade-in duration-100'
        >
          <span className='flex items-center gap-1.5 font-semibold'>
            <Tag className='h-3 w-3 text-orange-400' aria-hidden='true' />
            {hoveredRef.newDraft
              ? `${t('production.cast.draftBadge', '[Bản nháp]')} ${hoveredRef.newDraft.name}`
              : allBibleEntries.find((entry) => entry.id === hoveredRef.entryId)?.name ||
                hoveredRef.surfaceText}
          </span>
          {canEditScript && (
            <button
              type='button'
              onClick={handleRemoveRef}
              className='ml-1 rounded border border-rose-500/20 bg-stone-800 px-1.5 py-0.5 text-xs text-rose-300 transition-colors hover:bg-rose-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400'
            >
              {t('production.cast.removeRef', 'Gỡ')}
            </button>
          )}
        </div>
      )}
    </>,
    document.body,
  );
};
