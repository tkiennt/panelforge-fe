// src/roles/writer/components/script/flow/extensions/mentionSuggestion.ts
import { BibleEntryDto } from '@/services/bible.service';
import { MentionSuggestionItem } from '../types';

export function createMentionSuggestion(getBibleEntries: () => BibleEntryDto[]) {
  return {
    items: ({ query }: { query: string }): MentionSuggestionItem[] => {
      const entries = getBibleEntries();
      const q = (query || '').toLowerCase().trim();

      const filtered = entries.filter((e) => {
        return (
          e.name.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          (e.subtitle && e.subtitle.toLowerCase().includes(q))
        );
      });

      return filtered.slice(0, 8).map((e) => ({
        id: e.id,
        name: e.name,
        subtitle: e.subtitle || (e.effectiveRevision?.stageName ? `GĐ: ${e.effectiveRevision.stageName}` : null),
        category: e.category,
        code: e.code,
        isLocked: e.effectiveRevision?.reviewStatus === 'CanonLocked',
      }));
    },

    render: () => {
      let popup: HTMLDivElement | null = null;
      let selectedIndex = 0;
      let currentProps: any = null;

      const renderList = () => {
        if (!popup || !currentProps) return;
        popup.innerHTML = '';

        if (currentProps.items.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'px-3 py-2 text-xs text-gray-400 italic';
          empty.textContent = 'Không tìm thấy thực thể trong Bible';
          popup.appendChild(empty);
          return;
        }

        currentProps.items.forEach((item: MentionSuggestionItem, index: number) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          const isSelected = index === selectedIndex;

          btn.className = `w-full text-left px-3 py-1.5 flex items-center justify-between text-xs rounded transition-colors ${
            isSelected ? 'bg-orange-50 text-[#FF6F61] font-semibold' : 'text-gray-700 hover:bg-gray-50'
          }`;

          const nameContainer = document.createElement('div');
          nameContainer.className = 'flex items-center gap-1.5 truncate';

          const lockBadge = document.createElement('span');
          lockBadge.textContent = item.isLocked ? '🔒' : '⚠️';
          lockBadge.title = item.isLocked ? 'CanonLocked' : 'Chưa duyệt khóa Canon';

          const nameText = document.createElement('span');
          nameText.textContent = item.name;

          nameContainer.appendChild(lockBadge);
          nameContainer.appendChild(nameText);

          if (item.subtitle) {
            const sub = document.createElement('span');
            sub.className = 'text-[10px] text-gray-400 ml-1 font-normal';
            sub.textContent = `(${item.subtitle})`;
            nameContainer.appendChild(sub);
          }

          const catBadge = document.createElement('span');
          catBadge.className = 'text-[10px] px-1 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-tighter shrink-0';
          catBadge.textContent = String(item.category);

          btn.appendChild(nameContainer);
          btn.appendChild(catBadge);

          btn.addEventListener('click', () => {
            currentProps.command({
              id: item.id,
              label: item.name,
              category: String(item.category),
              isLocked: item.isLocked,
            });
          });

          popup.appendChild(btn);
        });
      };

      return {
        onStart: (props: any) => {
          currentProps = props;
          selectedIndex = 0;

          popup = document.createElement('div');
          popup.className =
            'fixed z-50 bg-white rounded-xl shadow-xl border border-gray-200 p-1 min-w-[220px] max-w-xs animate-in fade-in zoom-in-95 duration-100';

          document.body.appendChild(popup);
          const rect = props.clientRect?.();
          if (rect) {
            popup.style.top = `${rect.bottom + 6}px`;
            popup.style.left = `${rect.left}px`;
          }

          renderList();
        },

        onUpdate: (props: any) => {
          currentProps = props;
          const rect = props.clientRect?.();
          if (popup && rect) {
            popup.style.top = `${rect.bottom + 6}px`;
            popup.style.left = `${rect.left}px`;
          }
          renderList();
        },

        onKeyDown: (props: any) => {
          if (props.event.key === 'ArrowUp') {
            selectedIndex = (selectedIndex + currentProps.items.length - 1) % currentProps.items.length;
            renderList();
            return true;
          }

          if (props.event.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % currentProps.items.length;
            renderList();
            return true;
          }

          if (props.event.key === 'Enter') {
            const item = currentProps.items[selectedIndex];
            if (item) {
              currentProps.command({
                id: item.id,
                label: item.name,
                category: String(item.category),
                isLocked: item.isLocked,
              });
              return true;
            }
          }

          return false;
        },

        onExit: () => {
          if (popup && popup.parentNode) {
            popup.parentNode.removeChild(popup);
          }
          popup = null;
        },
      };
    },
  };
}
