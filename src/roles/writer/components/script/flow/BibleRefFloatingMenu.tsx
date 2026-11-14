// src/roles/writer/components/script/flow/BibleRefFloatingMenu.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { Search, Plus, X, Tag, User, MapPin, Box, FileText } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { BibleEntryDto } from '@/services/bible.service';
import { applyBibleRefToLine, removeBibleRefFromLine } from './nodes/ScriptLineBlockNode';

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
  const t = (key: string, fallbackOrParams?: any, explicitFallback?: string) => {
    return i18nT(key, fallbackOrParams, explicitFallback);
  };

  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0); // 0 = Character, 1 = Location, 2 = Item
  const [hoveredRef, setHoveredRef] = useState<{
    entryId?: string | null;
    surfaceText: string;
    newDraft?: { name: string; category?: number } | null;
    top: number;
    left: number;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef<HTMLDivElement>(null);

  // 1. Theo dõi lựa chọn văn bản (Text selection) để hiện Floating Menu
  useEffect(() => {
    if (!editor || !canEditScript) {
      setMenuPos(null);
      return;
    }

    const updateMenu = () => {
      const { state, view } = editor;
      const { selection } = state;

      if (selection.empty) {
        setMenuPos(null);
        setSelectedText('');
        return;
      }

      const { $from, from, to } = selection;
      const node = $from.parent;
      if (node.type.name !== 'scriptLine') {
        setMenuPos(null);
        return;
      }

      const el = node.attrs.el;
      // BIB-16 & 1A: chỉ cho phép bôi đen trên action, caption (narration), sfx
      if (el !== 'action' && el !== 'caption' && el !== 'sfx') {
        setMenuPos(null);
        return;
      }

      const text = state.doc.textBetween(from, to).trim();
      if (!text || text.length > 100) {
        setMenuPos(null);
        return;
      }

      try {
        const startCoords = view.coordsAtPos(from);
        const endCoords = view.coordsAtPos(to);
        const top = startCoords.top - 10;
        const left = (startCoords.left + endCoords.right) / 2;
        setMenuPos({ top, left });
        setSelectedText(text);
        setSearchQuery(text);
      } catch {
        setMenuPos(null);
      }
    };

    editor.on('selectionUpdate', updateMenu);
    editor.on('transaction', updateMenu);

    return () => {
      editor.off('selectionUpdate', updateMenu);
      editor.off('transaction', updateMenu);
    };
  }, [editor, canEditScript]);

  // 2. Theo dõi di chuột vào các span.gn-bible-ref để hiện Hover Tooltip
  useEffect(() => {
    if (!editor) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.gn-bible-ref') as HTMLElement | null;
      if (!target) return;

      const entryId = target.getAttribute('data-entry-id');
      const surfaceText = target.getAttribute('data-surface-text') || target.textContent || '';
      const rawDraft = target.getAttribute('data-new-draft');
      let newDraft = null;
      if (rawDraft) {
        try {
          newDraft = JSON.parse(rawDraft);
        } catch {
          newDraft = null;
        }
      }

      const rect = target.getBoundingClientRect();
      setHoveredRef({
        entryId,
        surfaceText,
        newDraft,
        top: rect.bottom + 4,
        left: rect.left,
      });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (related && (related.closest('.gn-bible-ref') || related.closest('.gn-ref-popover'))) {
        return;
      }
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

  if (!editor) return null;

  // Lọc mục Bible theo từ khoá
  const filteredEntries = allBibleEntries.filter((entry) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = entry.name.toLowerCase().includes(q);
    const codeMatch = entry.code?.toLowerCase().includes(q);
    return nameMatch || codeMatch;
  });

  const handleSelectEntry = (entry: BibleEntryDto) => {
    applyBibleRefToLine(editor, selectedText, {
      entryId: entry.id,
      newDraft: null,
    });
    setMenuPos(null);
  };

  const handleCreateDraft = () => {
    applyBibleRefToLine(editor, selectedText, {
      entryId: null,
      newDraft: {
        name: selectedText,
        category: selectedCategory,
      },
    });
    setMenuPos(null);
  };

  const handleRemoveRef = () => {
    if (!hoveredRef) return;
    removeBibleRefFromLine(editor, hoveredRef.surfaceText, hoveredRef.entryId);
    setHoveredRef(null);
  };

  const getCategoryIcon = (cat: number | string) => {
    const c = String(cat).toLowerCase();
    if (c === '0' || c === 'character') return <User className='w-3.5 h-3.5 text-orange-600' />;
    if (c === '1' || c === 'location') return <MapPin className='w-3.5 h-3.5 text-blue-600' />;
    if (c === '2' || c === 'item') return <Box className='w-3.5 h-3.5 text-emerald-600' />;
    return <FileText className='w-3.5 h-3.5 text-stone-600' />;
  };

  return (
    <>
      {/* 1. Floating Menu khi bôi đen */}
      {menuPos && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${Math.max(10, menuPos.top - 240)}px`,
            left: `${Math.max(10, menuPos.left - 160)}px`,
            zIndex: 9999,
          }}
          className='w-80 bg-white rounded-xl shadow-xl border border-stone-200/90 p-3 text-stone-900 animate-in fade-in zoom-in-95 duration-150'
        >
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <div className='flex items-center gap-1.5'>
              <Tag className='w-4 h-4 text-orange-600' />
              <span className='text-xs font-bold text-stone-900 font-serif'>
                {t('production.cast.referenceTitle', 'Tham chiếu Series Bible')}
              </span>
            </div>
            <button
              type='button'
              onClick={() => setMenuPos(null)}
              className='text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer'
            >
              <X className='w-3.5 h-3.5' />
            </button>
          </div>

          <div className='mt-2'>
            <div className='relative'>
              <Search className='w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('production.cast.searchPlaceholder', 'Tìm theo tên...')}
                className='w-full pl-8 pr-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded-lg outline-none focus:border-orange-500 text-stone-800'
                autoFocus
              />
            </div>
          </div>

          <div className='mt-2 max-h-40 overflow-y-auto space-y-1 custom-scrollbar'>
            {filteredEntries.slice(0, 8).map((entry) => (
              <button
                key={entry.id}
                type='button'
                onClick={() => handleSelectEntry(entry)}
                className='w-full text-left p-1.5 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-200/60 flex items-center justify-between gap-2 transition-colors cursor-pointer'
              >
                <div className='flex items-center gap-2 min-w-0'>
                  {getCategoryIcon(entry.category)}
                  <span className='text-xs font-semibold text-stone-800 truncate'>
                    {entry.name}
                  </span>
                </div>
                <span className='text-[10px] font-mono text-stone-400 shrink-0'>
                  {entry.code || 'BIBLE'}
                </span>
              </button>
            ))}

            {filteredEntries.length === 0 && (
              <p className='text-xs text-stone-400 text-center py-2'>
                {t('production.cast.noMatchingEntry', 'Không tìm thấy mục trùng khớp')}
              </p>
            )}
          </div>

          {/* Quick Create Draft Button */}
          <div className='mt-2.5 pt-2 border-t border-stone-100'>
            <div className='flex items-center justify-between gap-1 mb-2'>
              <span className='text-[11px] text-stone-500 font-medium'>
                {t('production.cast.createDraftType', 'Loại bản nháp:')}
              </span>
              <div className='flex items-center gap-1'>
                {[
                  { id: 0, label: t('bible.categories.character', 'Nhân vật') },
                  { id: 1, label: t('bible.categories.location', 'Địa điểm') },
                  { id: 2, label: t('bible.categories.item', 'Đạo cụ') },
                ].map((c) => (
                  <button
                    key={c.id}
                    type='button'
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-medium cursor-pointer transition-colors ${
                      selectedCategory === c.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type='button'
              onClick={handleCreateDraft}
              className='w-full py-1.5 px-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>
                {t('production.cast.createDraftBtn', 'Tạo bản nháp cho')} "{selectedText}"
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Hover Tooltip trên mark bibleRef */}
      {hoveredRef && !menuPos && (
        <div
          ref={hoverRef}
          style={{
            position: 'fixed',
            top: `${hoveredRef.top}px`,
            left: `${hoveredRef.left}px`,
            zIndex: 9998,
          }}
          className='gn-ref-popover bg-stone-900 text-white rounded-lg shadow-lg px-2.5 py-1.5 text-xs flex items-center gap-2 animate-in fade-in duration-100 pointer-events-auto'
        >
          <div className='flex items-center gap-1.5'>
            <Tag className='w-3 h-3 text-orange-400' />
            <span className='font-semibold'>
              {hoveredRef.newDraft
                ? `${t('production.cast.draftBadge', '[Bản nháp]')} ${hoveredRef.newDraft.name}`
                : allBibleEntries.find((e) => e.id === hoveredRef.entryId)?.name ||
                  hoveredRef.surfaceText}
            </span>
          </div>

          {canEditScript && (
            <button
              type='button'
              onClick={handleRemoveRef}
              className='ml-1 px-1.5 py-0.5 text-[10px] bg-stone-800 hover:bg-rose-900/80 text-rose-300 rounded cursor-pointer transition-colors border border-rose-500/20'
            >
              {t('production.cast.removeRef', 'Gỡ')}
            </button>
          )}
        </div>
      )}
    </>
  );
};
