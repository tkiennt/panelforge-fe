// src/roles/writer/components/script/flow/extensions/mentionSuggestion.ts
import { BibleEntryDto } from '@/services/bible.service';
import { MentionSuggestionItem } from '../types';
import { generateTempCode, saveTempBibleCode } from '../tempBibleCodes';
import { QuickViewCardData } from '../QuickViewCard';

export interface PanelSuggestionData {
  id: string;
  pageNumber: number;
  panelNumber: number;
  hasThumbnail?: boolean;
  thumbnailUrl?: string | null;
}

export function createMentionSuggestion(
  getBibleEntries: () => BibleEntryDto[],
  getPanels?: () => PanelSuggestionData[],
  onCreateStub?: (name: string, tempCode: string) => Promise<void> | void,
  onOpenInBible?: (codeOrId: string) => void,
  onOpenInArtistDesk?: (pageNumber?: number, panelId?: string) => void
) {
  return {
    items: ({ query }: { query: string }): MentionSuggestionItem[] => {
      const entries = getBibleEntries();
      const panels = getPanels ? getPanels() : [];
      const q = (query || '').toLowerCase().trim();

      // 1. Lọc thực thể Bible
      const filteredBible: MentionSuggestionItem[] = entries
        .filter((e) => {
          return (
            e.name.toLowerCase().includes(q) ||
            e.code.toLowerCase().includes(q) ||
            (e.subtitle && e.subtitle.toLowerCase().includes(q))
          );
        })
        .slice(0, 6)
        .map((e) => ({
          id: e.id,
          name: e.name,
          subtitle: e.subtitle || (e.effectiveRevision?.stageName ? `GĐ: ${e.effectiveRevision.stageName}` : null),
          category: e.category,
          code: e.code,
          description: e.description || e.effectiveRevision?.summary || null,
          isLocked: e.effectiveRevision?.reviewStatus === 'CanonLocked',
          avatarUrl: e.referenceImageUrl || e.effectiveRevision?.referenceImageUrl || null,
          stageName: e.effectiveRevision?.stageName || null,
        }));

      // 2. Lọc danh sách Panel của chương (@P1.1, @Panel 1.1)
      const filteredPanels: MentionSuggestionItem[] = panels
        .filter((p) => {
          const panelCode = `P${p.pageNumber}.${p.panelNumber}`.toLowerCase();
          const panelText = `panel ${p.pageNumber}.${p.panelNumber}`.toLowerCase();
          const khungText = `khung ${p.pageNumber}.${p.panelNumber}`.toLowerCase();
          return (
            panelCode.includes(q) ||
            panelText.includes(q) ||
            khungText.includes(q) ||
            q.startsWith('p') ||
            q.startsWith('k')
          );
        })
        .slice(0, 4)
        .map((p) => ({
          id: p.id,
          name: `Khung ${p.pageNumber}.${p.panelNumber}`,
          subtitle: `Trang ${p.pageNumber} · Khung #${p.panelNumber}`,
          category: 'Panel',
          code: `P${p.pageNumber}.${p.panelNumber}`,
          description: `Khung tranh ${p.panelNumber} trên Trang ${p.pageNumber}`,
          isLocked: false,
          avatarUrl: p.thumbnailUrl || null,
          pageNumber: p.pageNumber,
          panelNumber: p.panelNumber,
          panelId: p.id,
          hasThumbnail: p.hasThumbnail,
        }));

      return [...filteredBible, ...filteredPanels];
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
          (i: MentionSuggestionItem) =>
            i.name.toLowerCase() === rawQuery.toLowerCase() ||
            i.code.toLowerCase() === rawQuery.toLowerCase()
        );
        const tempCode = hasQuery ? generateTempCode(rawQuery, 'Character') : '';
        const showStubButton = hasQuery && !exactMatch;
        const totalCount = currentProps.items.length + (showStubButton ? 1 : 0);

        if (totalCount === 0) {
          const empty = document.createElement('div');
          empty.className = 'px-3 py-2 text-xs text-gray-400 italic';
          empty.textContent = 'Không tìm thấy thực thể hoặc panel phù hợp';
          popup.appendChild(empty);
          return;
        }

        // Layout Flex 2 cột: Cột trái là danh sách gợi ý, Cột phải là Preview thẻ xem nhanh lớn hơn
        const container = document.createElement('div');
        container.className = 'flex items-start gap-2';

        const listCol = document.createElement('div');
        listCol.className = 'w-64 max-h-72 overflow-y-auto space-y-0.5 custom-scrollbar';
        listCol.setAttribute('role', 'listbox');
        listCol.setAttribute('aria-label', 'Gợi ý thực thể Bible và Khung tranh');

        currentProps.items.forEach((item: MentionSuggestionItem, index: number) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('role', 'option');
          const isSelected = index === selectedIndex;
          btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');

          btn.className = `w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs rounded-lg transition-colors cursor-pointer ${
            isSelected ? 'bg-orange-50 text-[#C2410C] font-semibold ring-1 ring-[#F97316]/30' : 'text-gray-700 hover:bg-gray-50'
          }`;

          const leftContainer = document.createElement('div');
          leftContainer.className = 'flex items-center gap-2 truncate min-w-0';

          // Ảnh nhỏ hoặc placeholder
          if (item.avatarUrl) {
            const img = document.createElement('img');
            img.src = item.avatarUrl;
            img.alt = item.name;
            img.className = 'w-5 h-5 rounded object-cover shrink-0 border border-gray-200';
            leftContainer.appendChild(img);
          } else {
            const placeholder = document.createElement('span');
            placeholder.className = `w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
              item.category === 'Panel'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-orange-100 text-orange-700'
            }`;
            placeholder.textContent = item.category === 'Panel' ? '#' : item.name.charAt(0).toUpperCase();
            leftContainer.appendChild(placeholder);
          }

          // Mã định danh
          const codeText = document.createElement('span');
          codeText.className = 'font-mono font-bold text-[11px] shrink-0 text-zinc-900';
          codeText.textContent = `@${item.code}`;
          leftContainer.appendChild(codeText);

          // Tên thực thể
          const nameText = document.createElement('span');
          nameText.textContent = item.name;
          nameText.className = 'truncate text-[11px] text-zinc-600';
          leftContainer.appendChild(nameText);

          // Huy hiệu loại
          const catBadge = document.createElement('span');
          const catStr = String(item.category);
          let catBg = 'bg-indigo-100 text-indigo-700';
          let catLabel = '👤 Nhân vật';
          if (catStr === 'Panel' || catStr.toLowerCase().includes('panel')) {
            catBg = 'bg-purple-100 text-purple-700 border border-purple-200';
            catLabel = '🖼️ Khung';
          } else if (catStr === 'Location' || catStr.toLowerCase().includes('địa')) {
            catBg = 'bg-emerald-100 text-emerald-700';
            catLabel = '📍 Địa danh';
          } else if (catStr === 'Prop' || catStr.toLowerCase().includes('đạo')) {
            catBg = 'bg-amber-100 text-amber-700';
            catLabel = '📦 Đạo cụ';
          } else if (catStr === 'Term' || catStr.toLowerCase().includes('thuật')) {
            catBg = 'bg-cyan-100 text-cyan-700';
            catLabel = '📖 Thuật ngữ';
          }
          catBadge.className = `text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ml-1.5 ${catBg}`;
          catBadge.textContent = catLabel;

          btn.appendChild(leftContainer);
          btn.appendChild(catBadge);

          btn.addEventListener('click', () => {
            selectItem(item);
          });

          listCol.appendChild(btn);
        });

        // Nút Tạo Mã Tạm nếu chưa có trong Bible
        if (showStubButton) {
          const stubIndex = currentProps.items.length;
          const isStubSelected = selectedIndex === stubIndex;

          const stubBtn = document.createElement('button');
          stubBtn.type = 'button';
          stubBtn.setAttribute('role', 'option');
          stubBtn.setAttribute('aria-selected', isStubSelected ? 'true' : 'false');
          stubBtn.className = `w-full text-left px-2.5 py-2 flex items-center gap-2 text-xs font-semibold rounded-lg border-t border-gray-100 transition-colors cursor-pointer mt-1 ${
            isStubSelected
              ? 'bg-[#FFF2E6] text-[#C2410C] font-bold ring-1 ring-[#F97316]/40'
              : 'text-[#C2410C] hover:bg-[#FFF2E6]/60'
          }`;

          const plusIcon = document.createElement('span');
          plusIcon.className =
            'w-4 h-4 rounded-full bg-[#F97316] text-white flex items-center justify-center text-[10px] font-bold shrink-0';
          plusIcon.textContent = '+';

          const stubContent = document.createElement('div');
          stubContent.className = 'truncate min-w-0';

          const titleLine = document.createElement('div');
          titleLine.className = 'truncate';
          titleLine.innerHTML = `＋ Tạo mã tạm <code class="font-mono bg-white px-1 py-0.2 rounded border border-[#FDBA74]">${tempCode}</code>`;

          stubContent.appendChild(titleLine);
          stubBtn.appendChild(plusIcon);
          stubBtn.appendChild(stubContent);

          stubBtn.addEventListener('click', () => {
            selectStub(rawQuery, tempCode);
          });

          listCol.appendChild(stubBtn);
        }

        container.appendChild(listCol);

        // Cột phải: Preview lớn hơn ở bên cạnh cho mục đang chọn bằng phím mũi tên
        const previewCol = document.createElement('div');
        previewCol.className = 'w-64 border-l border-[#E5E0D8] pl-3 py-1 space-y-2 text-xs';

        const selectedItem = currentProps.items[selectedIndex];
        if (selectedItem) {
          // Tiêu đề & Loại
          const header = document.createElement('div');
          header.className = 'flex items-center justify-between';
          header.innerHTML = `
            <span class="font-mono font-bold text-zinc-900">@${selectedItem.code}</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
              selectedItem.category === 'Panel'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-amber-100 text-amber-800'
            }">${selectedItem.category}</span>
          `;
          previewCol.appendChild(header);

          // Ảnh lớn hơn nếu có
          if (selectedItem.avatarUrl) {
            const bigImg = document.createElement('img');
            bigImg.src = selectedItem.avatarUrl;
            bigImg.alt = selectedItem.name;
            bigImg.className = 'w-full h-24 rounded-lg object-contain bg-zinc-900 border border-zinc-200';
            previewCol.appendChild(bigImg);
          } else if (selectedItem.category === 'Panel') {
            const noSketch = document.createElement('div');
            noSketch.className = 'h-20 rounded-lg bg-zinc-100 border border-dashed border-zinc-300 flex items-center justify-center text-zinc-400 text-[11px]';
            noSketch.textContent = 'Chưa có phác thảo';
            previewCol.appendChild(noSketch);
          }

          const nameLine = document.createElement('div');
          nameLine.className = 'font-bold text-zinc-900 text-sm';
          nameLine.textContent = selectedItem.name;
          previewCol.appendChild(nameLine);

          if (selectedItem.description) {
            const desc = document.createElement('p');
            desc.className = 'text-[11px] text-zinc-600 line-clamp-2 italic';
            desc.textContent = selectedItem.description;
            previewCol.appendChild(desc);
          }
        } else if (showStubButton && selectedIndex === currentProps.items.length) {
          // Preview cho mục Tạo mã tạm
          previewCol.innerHTML = `
            <div class="space-y-1.5">
              <span class="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-800 border border-dashed border-amber-300">Mã tạm</span>
              <div class="font-mono font-bold text-amber-900 text-sm">@${tempCode}</div>
              <p class="text-[11px] text-zinc-600">Thực thể <strong>"${rawQuery}"</strong> chưa có trong Series Bible. Khi chọn, kịch bản sẽ gắn mã tạm viền nét đứt.</p>
            </div>
          `;
        }

        container.appendChild(previewCol);
        popup.appendChild(container);
      };

      const selectItem = (item: MentionSuggestionItem) => {
        currentProps.command({
          id: item.id,
          label: item.code,
          code: item.code,
          category: String(item.category),
          isLocked: item.isLocked,
          isStub: false,
          panelId: item.panelId || null,
          pageNumber: item.pageNumber || null,
          panelNumber: item.panelNumber || null,
        });
      };

      const selectStub = (name: string, tempCode: string) => {
        saveTempBibleCode({
          code: tempCode,
          name,
          category: 'Character',
        });
        currentProps.command({
          id: `stub_${Date.now()}`,
          label: tempCode,
          code: tempCode,
          category: 'Character',
          isLocked: false,
          isStub: true,
        });
        onCreateStub?.(name, tempCode);
      };

      return {
        onStart: (props: any) => {
          currentProps = props;
          selectedIndex = 0;

          popup = document.createElement('div');
          popup.className =
            'fixed z-50 bg-[#FCFBF8] rounded-xl shadow-2xl border border-[#D8D2C5] p-2.5 min-w-[500px] max-w-xl animate-in fade-in zoom-in-95 duration-100 font-sans';

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
            (i: MentionSuggestionItem) =>
              i.name.toLowerCase() === rawQuery.toLowerCase() ||
              i.code.toLowerCase() === rawQuery.toLowerCase()
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
              const tempCode = generateTempCode(rawQuery, 'Character');
              selectStub(rawQuery, tempCode);
              return true;
            }

            const item = currentProps.items[selectedIndex];
            if (item) {
              selectItem(item);
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
