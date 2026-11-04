// src/roles/writer/components/script/flow/extensions/mentionSuggestion.ts
import { BibleEntryDto } from '@/services/bible.service';
import { MentionSuggestionItem } from '../types';

export function createMentionSuggestion(
  getBibleEntries: () => BibleEntryDto[],
  onCreateStub?: (name: string) => Promise<void> | void
) {
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
        avatarUrl: e.referenceImageUrl || e.effectiveRevision?.referenceImageUrl || null,
        stageName: e.effectiveRevision?.stageName || null,
      }));
    },

    render: () => {
      let popup: HTMLDivElement | null = null;
      let selectedIndex = 0;
      let currentProps: any = null;

      const renderList = () => {
        if (!popup || !currentProps) return;
        popup.innerHTML = '';

        const rawQuery = (currentProps.query || '').trim();
        const hasQuery = rawQuery.length > 0;
        const exactMatch = currentProps.items.some(
          (i: MentionSuggestionItem) => i.name.toLowerCase() === rawQuery.toLowerCase()
        );
        const showStubButton = hasQuery && !exactMatch;
        const totalCount = currentProps.items.length + (showStubButton ? 1 : 0);

        if (totalCount === 0) {
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

          btn.className = `w-full text-left px-3 py-2 flex items-center justify-between text-xs rounded-lg transition-colors cursor-pointer ${
            isSelected ? 'bg-orange-50 text-[#FF6F61] font-semibold' : 'text-gray-700 hover:bg-gray-50'
          }`;

          const leftContainer = document.createElement('div');
          leftContainer.className = 'flex items-center gap-2 truncate min-w-0';

          // Avatar chân dung hoặc chữ viết tắt
          if (item.avatarUrl) {
            const img = document.createElement('img');
            img.src = item.avatarUrl;
            img.alt = item.name;
            img.className = 'w-5 h-5 rounded-full object-cover shrink-0 border border-gray-200';
            leftContainer.appendChild(img);
          } else {
            const placeholder = document.createElement('span');
            placeholder.className =
              'w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center shrink-0';
            placeholder.textContent = item.name.charAt(0).toUpperCase();
            leftContainer.appendChild(placeholder);
          }

          const lockBadge = document.createElement('span');
          lockBadge.textContent = item.isLocked ? '🔒' : '⚠️';
          lockBadge.title = item.isLocked ? 'CanonLocked' : 'Chưa duyệt khóa Canon';
          lockBadge.className = 'text-xs shrink-0';
          leftContainer.appendChild(lockBadge);

          const nameText = document.createElement('span');
          nameText.textContent = item.name;
          nameText.className = 'truncate';
          leftContainer.appendChild(nameText);

          // Huy hiệu Era (Ví dụ: Tuổi thơ, Cyber-Form, v.v.)
          if (item.stageName) {
            const eraBadge = document.createElement('span');
            eraBadge.className =
              'text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0 font-medium ml-1';
            eraBadge.textContent = item.stageName;
            leftContainer.appendChild(eraBadge);
          }

          if (item.subtitle) {
            const sub = document.createElement('span');
            sub.className = 'text-[10px] text-gray-400 ml-1 font-normal truncate';
            sub.textContent = `(${item.subtitle})`;
            leftContainer.appendChild(sub);
          }

          const catBadge = document.createElement('span');
          const catStr = String(item.category);
          let catBg = 'bg-indigo-100 text-indigo-700';
          let catLabel = '👤 Nhân vật';
          if (catStr === 'Location') {
            catBg = 'bg-emerald-100 text-emerald-700';
            catLabel = '📍 Địa danh';
          } else if (catStr === 'Prop') {
            catBg = 'bg-amber-100 text-amber-700';
            catLabel = '📦 Đạo cụ';
          }
          catBadge.className = `text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${catBg}`;
          catBadge.textContent = catLabel;

          btn.appendChild(leftContainer);
          btn.appendChild(catBadge);

          btn.addEventListener('click', () => {
            currentProps.command({
              id: item.id,
              label: item.name,
              category: String(item.category),
              isLocked: item.isLocked,
              isStub: false,
            });
            if (currentProps.editor) {
              setTimeout(() => {
                currentProps.editor
                  .chain()
                  .focus()
                  .insertContent(' : ""')
                  .setTextSelection(currentProps.editor.state.selection.to - 1)
                  .run();
              }, 10);
            }
          });

          popup.appendChild(btn);
        });

        // Nút tự sinh Stub Entity nếu chưa có trong hồ sơ Bible
        if (showStubButton) {
          const stubIndex = currentProps.items.length;
          const isStubSelected = selectedIndex === stubIndex;

          const stubBtn = document.createElement('button');
          stubBtn.type = 'button';
          stubBtn.className = `w-full text-left px-3 py-2 flex items-center gap-2 text-xs font-semibold rounded-lg border-t border-gray-100 transition-colors cursor-pointer mt-1 ${
            isStubSelected
              ? 'bg-[#FFF2E6] text-[#C2410C] font-bold'
              : 'text-[#C2410C] hover:bg-[#FFF2E6]/60'
          }`;

          const plusIcon = document.createElement('span');
          plusIcon.className =
            'w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold shrink-0';
          plusIcon.textContent = '+';

          const stubText = document.createElement('span');
          stubText.className = 'truncate';
          stubText.textContent = `Tạo thực thể mới "${rawQuery}"`;

          stubBtn.appendChild(plusIcon);
          stubBtn.appendChild(stubText);

          stubBtn.addEventListener('click', () => {
            currentProps.command({
              id: `stub_${Date.now()}`,
              label: rawQuery,
              category: 'Character',
              isLocked: false,
              isStub: true,
            });
            onCreateStub?.(rawQuery);
          });

          popup.appendChild(stubBtn);
        }
      };

      return {
        onStart: (props: any) => {
          currentProps = props;
          selectedIndex = 0;

          popup = document.createElement('div');
          popup.className =
            'fixed z-50 bg-[#FCFBF8] rounded-xl shadow-xl border border-[#D8D2C5] p-1.5 min-w-[240px] max-w-sm animate-in fade-in zoom-in-95 duration-100';

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
          const rawQuery = (currentProps.query || '').trim();
          const hasQuery = rawQuery.length > 0;
          const exactMatch = currentProps.items.some(
            (i: MentionSuggestionItem) => i.name.toLowerCase() === rawQuery.toLowerCase()
          );
          const showStubButton = hasQuery && !exactMatch;
          const totalCount = currentProps.items.length + (showStubButton ? 1 : 0);

          if (totalCount === 0) return false;

          if (props.event.key === 'ArrowUp') {
            selectedIndex = (selectedIndex + totalCount - 1) % totalCount;
            renderList();
            return true;
          }

          if (props.event.key === 'ArrowDown') {
            selectedIndex = (selectedIndex + 1) % totalCount;
            renderList();
            return true;
          }

          if (props.event.key === 'Enter') {
            if (showStubButton && selectedIndex === currentProps.items.length) {
              currentProps.command({
                id: `stub_${Date.now()}`,
                label: rawQuery,
                category: 'Character',
                isLocked: false,
                isStub: true,
              });
              onCreateStub?.(rawQuery);
              return true;
            }

            const item = currentProps.items[selectedIndex];
            if (item) {
              currentProps.command({
                id: item.id,
                label: item.name,
                category: String(item.category),
                isLocked: item.isLocked,
                isStub: false,
              });
              if (currentProps.editor) {
                setTimeout(() => {
                  currentProps.editor
                    .chain()
                    .focus()
                    .insertContent(' : ""')
                    .setTextSelection(currentProps.editor.state.selection.to - 1)
                    .run();
                }, 10);
              }
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
