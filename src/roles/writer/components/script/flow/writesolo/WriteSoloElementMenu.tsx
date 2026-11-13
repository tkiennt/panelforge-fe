// src/roles/writer/components/script/flow/writesolo/WriteSoloElementMenu.tsx
import React, { useEffect, useRef, useState } from 'react';
import { WriteSoloBlockType } from './writeSoloExtensions';

export interface ElementMenuItem {
  type: WriteSoloBlockType | 'blank' | 'text' | 'note' | 'outline' | 'image' | 'sequence';
  label: string;
  shortcut: string;
}

export const ELEMENT_MENU_ITEMS: ElementMenuItem[] = [
  { type: 'blank', label: 'Blank', shortcut: ' ' },
  { type: 'page_heading', label: 'Page', shortcut: ' ' },
  { type: 'panel_heading', label: 'Panel', shortcut: ' ' },
  { type: 'action', label: 'Action', shortcut: 'A' },
  { type: 'character', label: 'Character', shortcut: 'C' },
  { type: 'parenthetical', label: 'Parens', shortcut: 'P' },
  { type: 'dialogue', label: 'Dialogue', shortcut: 'D' },
  { type: 'text', label: 'Text', shortcut: 'T' },
  { type: 'note', label: 'Note', shortcut: '!' },
  { type: 'caption', label: 'Caption', shortcut: 'CC' },
  { type: 'outline', label: 'Outline', shortcut: 'O' },
  { type: 'sfx', label: 'SFX', shortcut: 'S' },
  { type: 'image', label: 'Image', shortcut: 'I' },
  { type: 'sequence', label: 'Sequence', shortcut: 'Q' },
];

export interface WriteSoloElementMenuProps {
  isOpen: boolean;
  activeType: string;
  position?: { top: number; left: number } | null;
  onSelect: (itemType: string) => void;
  onClose: () => void;
}

export const WriteSoloElementMenu: React.FC<WriteSoloElementMenuProps> = ({
  isOpen,
  activeType,
  position,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const idx = ELEMENT_MENU_ITEMS.findIndex((item) => item.type === activeType);
    setSelectedIndex(idx >= 0 ? idx : 3); // default to Action
  }, [isOpen, activeType]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % ELEMENT_MENU_ITEMS.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + ELEMENT_MENU_ITEMS.length) % ELEMENT_MENU_ITEMS.length);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const item = ELEMENT_MENU_ITEMS[selectedIndex];
        if (item) {
          onSelect(item.type);
          onClose();
        }
        return;
      }

      // Check single shortcut key
      const pressedKey = e.key.toUpperCase();
      const matched = ELEMENT_MENU_ITEMS.find((it) => it.shortcut === pressedKey);
      if (matched) {
        e.preventDefault();
        onSelect(matched.type);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const stylePos: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }
    : {
        position: 'absolute',
        bottom: '3rem',
        left: '2rem',
        zIndex: 9999,
      };

  return (
    <div
      ref={containerRef}
      style={stylePos}
      className='w-56 max-h-72 overflow-y-auto bg-white/95 backdrop-blur-md rounded-md shadow-2xl border border-stone-300 py-1 font-mono text-[13px] text-stone-800 select-none'
    >
      {ELEMENT_MENU_ITEMS.map((item, idx) => {
        const isSelected = idx === selectedIndex;
        return (
          <div
            key={item.type + item.label}
            onClick={() => {
              onSelect(item.type);
              onClose();
            }}
            onMouseEnter={() => setSelectedIndex(idx)}
            className={`px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors ${
              isSelected ? 'bg-[#BAE6FD] text-stone-900 font-semibold' : 'hover:bg-stone-100 text-stone-700'
            }`}
          >
            <span className='w-7 text-stone-500 font-mono text-[12px]'>
              [{item.shortcut.trim() ? item.shortcut : ' '}]
            </span>
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};
