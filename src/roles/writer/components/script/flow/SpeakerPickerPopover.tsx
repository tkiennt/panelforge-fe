// src/roles/writer/components/script/flow/SpeakerPickerPopover.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, BookOpen, Clock, Plus, Brain } from 'lucide-react';
import { BibleEntryDto } from '@/services/bible.service';
import { RecentSpeaker } from './nodes/ScriptLineBlockNode';
import { MangaBlockType } from './types';

export interface SpeakerPickerResult {
  name: string;
  characterId: string | null;
  blockType: 'dialogue' | 'thought';
}

export interface SpeakerPickerPopoverProps {
  initialName?: string;
  initialBlockType?: MangaBlockType;
  anchorRect: DOMRect | null;
  allBibleEntries: BibleEntryDto[];
  recentSpeakers: RecentSpeaker[];
  onSelect: (result: SpeakerPickerResult) => void;
  onClose: () => void;
  onMorphToAction?: () => void;
}

interface SuggestionItem {
  id: string;
  type: 'bible' | 'recent' | 'custom';
  name: string;
  characterId: string | null;
  subtitle?: string;
}

export const SpeakerPickerPopover: React.FC<SpeakerPickerPopoverProps> = ({
  initialName = '',
  initialBlockType = 'dialogue',
  anchorRect,
  allBibleEntries,
  recentSpeakers,
  onSelect,
  onClose,
  onMorphToAction,
}) => {
  const [query, setQuery] = useState(initialName);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus và chọn toàn bộ văn bản khi mở popover
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  // Đóng khi nhấp bên ngoài
  useEffect(() => {
    const handlePointerDownOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handlePointerDownOutside);
    return () => document.removeEventListener('mousedown', handlePointerDownOutside);
  }, [onClose]);

  // Nhận diện hậu tố D7: (nghĩ) hoặc (thought)
  const isThoughtInput = useMemo(() => {
    return /\((?:nghĩ|thought)\)/i.test(query) || initialBlockType === 'thought';
  }, [query, initialBlockType]);

  const cleanQuery = useMemo(() => {
    return query.replace(/\s*\((?:nghĩ|thought)\)/i, '').trim();
  }, [query]);

  // Lọc gợi ý từ Series Bible & Recent Speakers
  const suggestions = useMemo<SuggestionItem[]>(() => {
    const list: SuggestionItem[] = [];
    const lowerClean = cleanQuery.toLowerCase();

    // 1. Nhân vật từ Series Bible
    const bibleCharacters = (allBibleEntries || []).filter(
      (e) => e.category === 'Character' && e.name,
    );

    const matchedBible = bibleCharacters.filter(
      (c) => !lowerClean || c.name.toLowerCase().includes(lowerClean),
    );

    for (const b of matchedBible) {
      list.push({
        id: `bible_${b.id}`,
        type: 'bible',
        name: b.name,
        characterId: b.id,
        subtitle: b.subtitle || 'Series Bible',
      });
    }

    // 2. Nhân vật xuất hiện gần đây trong kịch bản (không trùng Bible)
    for (const r of recentSpeakers || []) {
      if (
        (!lowerClean || r.name.toLowerCase().includes(lowerClean)) &&
        !list.some((item) => item.name.toLowerCase() === r.name.toLowerCase())
      ) {
        list.push({
          id: `recent_${r.name}`,
          type: 'recent',
          name: r.name,
          characterId: r.characterId,
          subtitle: 'Gần đây',
        });
      }
    }

    // 3. Nhân vật quần chúng / Tự do khi gõ tên mới không có trong danh sách
    if (lowerClean && !list.some((item) => item.name.toLowerCase() === lowerClean)) {
      list.unshift({
        id: `custom_${lowerClean}`,
        type: 'custom',
        name: cleanQuery,
        characterId: null,
        subtitle: 'Nhân vật quần chúng',
      });
    }

    return list;
  }, [allBibleEntries, recentSpeakers, cleanQuery]);

  // Đảm bảo selectedIndex hợp lệ
  useEffect(() => {
    if (selectedIndex >= suggestions.length) {
      setSelectedIndex(Math.max(0, suggestions.length - 1));
    }
  }, [suggestions.length, selectedIndex]);

  const handleCommitItem = (item?: SuggestionItem) => {
    let nameToUse = cleanQuery;
    let charIdToUse: string | null = null;

    if (item) {
      nameToUse = item.name;
      charIdToUse = item.characterId;
    } else if (suggestions.length > 0 && suggestions[selectedIndex]) {
      nameToUse = suggestions[selectedIndex].name;
      charIdToUse = suggestions[selectedIndex].characterId;
    } else {
      // Tìm lại trong Bible nếu người dùng gõ tên chính xác
      const matched = (allBibleEntries || []).find(
        (e) => e.category === 'Character' && e.name.toLowerCase() === cleanQuery.toLowerCase(),
      );
      if (matched) {
        charIdToUse = matched.id;
      }
    }

    if (!nameToUse) {
      onClose();
      return;
    }

    onSelect({
      name: nameToUse.toUpperCase(),
      characterId: charIdToUse,
      blockType: isThoughtInput ? 'thought' : 'dialogue',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + Math.max(1, suggestions.length)) % Math.max(1, suggestions.length),
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (!e.shiftKey) {
        e.preventDefault();
        handleCommitItem(suggestions[selectedIndex]);
      } else {
        // Shift + Tab: Đổi về Action (Bảng H.1)
        e.preventDefault();
        if (onMorphToAction) {
          onMorphToAction();
        } else {
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Tính toán vị trí hiển thị neo theo anchorRect
  const positionStyle: React.CSSProperties = useMemo(() => {
    if (!anchorRect) {
      return { top: '20%', left: '50%', transform: 'translateX(-50%)' };
    }
    const popoverWidth = 280;
    const popoverHeight = 260;

    let left = anchorRect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) left = 16;

    let top = anchorRect.bottom + 6;
    if (top + popoverHeight > window.innerHeight - 16) {
      top = Math.max(16, anchorRect.top - popoverHeight - 6);
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
    };
  }, [anchorRect]);

  return (
    <div
      ref={containerRef}
      style={positionStyle}
      className="fixed z-50 bg-[#FFFEFA] border border-[#E7E7E7] rounded-lg shadow-2xl p-2 font-sans text-stone-900 animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-stone-100 px-1">
        <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span className="text-xs font-semibold text-stone-700">Người nói (Character)</span>
        {isThoughtInput && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
            <Brain className="w-3 h-3 text-amber-700" />
            Nghĩ
          </span>
        )}
      </div>

      <div className="relative mb-2">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tên nhân vật... (gõ (nghĩ))"
          className="w-full px-2.5 py-1.5 text-xs font-mono uppercase bg-white border border-stone-300 rounded shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-stone-900 placeholder:text-stone-400 placeholder:normal-case"
        />
      </div>

      <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
        {suggestions.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs text-stone-400 italic">
            Không tìm thấy nhân vật phù hợp
          </div>
        ) : (
          suggestions.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={item.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleCommitItem(item)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors text-xs ${
                  isSelected ? 'bg-indigo-50 text-indigo-900 font-medium' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.type === 'bible' && (
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  )}
                  {item.type === 'recent' && (
                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  )}
                  {item.type === 'custom' && (
                    <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  )}
                  <span className="truncate font-mono uppercase text-xs">{item.name}</span>
                </div>
                {item.subtitle && (
                  <span
                    className={`text-[10px] shrink-0 ml-2 ${
                      item.type === 'custom'
                        ? 'text-amber-600 font-medium'
                        : isSelected
                          ? 'text-indigo-600'
                          : 'text-stone-400'
                    }`}
                  >
                    {item.subtitle}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 px-1 select-none">
        <span>Enter/Tab: Chọn & gõ thoại</span>
        <span>Shift+Tab: Về Action</span>
      </div>
    </div>
  );
};
