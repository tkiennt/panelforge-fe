// src/roles/writer/components/script/flow/comic-editor/extensions/MentionListPopover.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { User, MapPin, Sparkles } from 'lucide-react';

export interface BibleMentionItem {
  id: string;
  name: string;
  subtitle?: string;
  category: 'Character' | 'Location' | 'Prop';
  avatarUrl?: string | null;
}

export interface MentionListPopoverProps {
  items: BibleMentionItem[];
  command: (item: { id: string; label: string; category: string }) => void;
  editor: any;
}

export interface MentionListPopoverRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionListPopover = forwardRef<MentionListPopoverRef, MentionListPopoverProps>(
  ({ items, command, editor }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({
          id: item.id,
          label: item.name,
          category: item.category,
        });

        // Tự động thêm: : "" và đặt con trỏ ở giữa dấu ngoặc kép
        if (editor) {
          setTimeout(() => {
            editor
              .chain()
              .focus()
              .insertContent(' : ""')
              .setTextSelection(editor.state.selection.to - 1)
              .run();
          }, 10);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));
          return true;
        }

        if (event.key === 'Enter' || event.key === 'Tab') {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-xl p-3 min-w-[240px] text-xs text-slate-400 italic flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Không tìm thấy thực thể trong Bible...</span>
        </div>
      );
    }

    return (
      <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-2xl p-1.5 min-w-[280px] max-w-sm flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 select-none z-50">
        <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
          <span>Series Bible Auto-Complete</span>
          <span className="text-[9px] text-slate-400 font-mono">@ Mention</span>
        </div>

        <div className="max-h-60 overflow-y-auto py-1 flex flex-col gap-0.5">
          {items.map((item, index) => {
            const isSelected = index === selectedIndex;
            const isLocation = item.category === 'Location';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-indigo-50/90 text-indigo-950 font-semibold border border-indigo-200/80 shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100/70 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  {/* Icon hoặc Avatar */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isLocation
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {isLocation ? (
                      <MapPin className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <User className="w-3 h-3 text-indigo-600" />
                    )}
                  </div>

                  <span className="truncate">{item.name}</span>

                  {item.subtitle && (
                    <span className="text-[10px] text-slate-400 font-normal truncate">
                      ({item.subtitle})
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-1.5 ${
                    isLocation
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  }`}
                >
                  {isLocation ? 'Địa danh' : 'Nhân vật'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-mono">
          <span>↑↓ Di chuyển</span>
          <span>↵ / Tab Chọn</span>
          <span>Esc Đóng</span>
        </div>
      </div>
    );
  }
);

MentionListPopover.displayName = 'MentionListPopover';
