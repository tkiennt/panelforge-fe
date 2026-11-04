// src/roles/writer/components/script/flow/nodes/ScriptLineBlockNode.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { MangaBlockType } from '../types';
import { generateGuid } from '../scriptFlowAdapter';

export const ScriptLineBlockNode = Node.create({
  name: 'scriptLineBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      scriptLineId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-script-line-id'),
        renderHTML: (attributes) => ({
          'data-script-line-id': attributes.scriptLineId,
        }),
      },
      sceneId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-scene-id'),
        renderHTML: (attributes) => ({
          'data-scene-id': attributes.sceneId,
        }),
      },
      blockType: {
        default: 'dialogue' as MangaBlockType,
        parseHTML: (element) => (element.getAttribute('data-block-type') as MangaBlockType) || 'dialogue',
        renderHTML: (attributes) => ({
          'data-block-type': attributes.blockType,
        }),
      },
      speakerCharacterId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-speaker-id'),
        renderHTML: (attributes) => ({
          'data-speaker-id': attributes.speakerCharacterId,
        }),
      },
      speakerName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-speaker-name'),
        renderHTML: (attributes) => ({
          'data-speaker-name': attributes.speakerName,
        }),
      },
      narrationMode: {
        default: 'Present',
        parseHTML: (element) => element.getAttribute('data-narration-mode') || 'Present',
        renderHTML: (attributes) => ({
          'data-narration-mode': attributes.narrationMode,
        }),
      },
      lineOrder: {
        default: 1,
        parseHTML: (element) => parseInt(element.getAttribute('data-line-order') || '1', 10),
        renderHTML: (attributes) => ({
          'data-line-order': attributes.lineOrder,
        }),
      },
      panelId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-panel-id'),
        renderHTML: (attributes) => ({
          'data-panel-id': attributes.panelId, // Luôn null ở tầng kịch bản
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-script-line-id]',
      },
    ];
  },

    renderHTML({ HTMLAttributes }) {
    const blockType = (HTMLAttributes['data-block-type'] || 'dialogue') as MangaBlockType;

    let classNames = 'script-block font-mono my-1.5 transition-all duration-150 outline-none ';

    switch (blockType) {
      case 'scene_heading':
        classNames += 'font-bold uppercase tracking-wider text-base text-gray-900 border-b border-gray-300 pb-1 mt-4 mb-2';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'page_heading':
        // A. KHỐI TIÊU ĐỀ TRANG (PAGE_HEADING): Viền cam #C2410C 2px, nền #FFF2E6, bo góc 12px, icon trang giấy và nút thu gọn/mở rộng
        classNames += 'font-bold uppercase tracking-wider text-xs sm:text-sm text-[#C2410C] bg-[#FFF2E6] border-2 border-[#C2410C] px-4 py-2.5 mt-6 mb-3 rounded-[12px] shadow-sm flex items-center justify-between gap-2.5 select-text';
        return [
          'div',
          mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }),
          ['span', { class: 'inline-flex items-center gap-2 select-none pointer-events-none' }, '📄 '],
          ['span', { class: 'flex-1' }, 0],
          ['button', { type: 'button', class: 'page-toggle-btn ml-auto cursor-pointer select-none text-[11px] font-semibold text-[#C2410C] bg-white/70 hover:bg-white border border-[#C2410C]/30 px-2.5 py-0.5 rounded-md transition-all shadow-2xs' }, '▼ Thu gọn'],
        ];

      case 'panel_heading':
        // B. KHỐI TIÊU ĐỀ KHUNG (PANEL_HEADING): Viền trái tím #4F46E5 4px, nền xám nhạt #F8FAFC
        classNames += 'font-bold text-xs uppercase tracking-wide text-slate-800 bg-[#F8FAFC] border-l-4 border-[#4F46E5] px-3.5 py-2 mt-4 mb-2 rounded-r-lg shadow-2xs flex items-center gap-2';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'caption':
        // C. LỜI DẪN TRUYỆN (CAPTION): Chữ thường đứng, màu #334155, 14px, đường kẻ dọc mảnh màu xám ở đầu dòng
        classNames += 'font-sans text-[14px] text-[#334155] border-l-2 border-slate-300 pl-3.5 py-0.5 my-2 leading-relaxed not-italic';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'character':
        // D. TÊN NHÂN VẬT: Thẻ chip bo tròn, nền tím nhạt, chữ tím đậm #4338CA, có chấm màu đại diện
        classNames += 'font-sans font-bold text-xs uppercase tracking-wide text-[#4338CA] bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full shadow-2xs inline-flex items-center gap-1.5 ml-6 sm:ml-12 mt-3 mb-1';
        return [
          'div',
          mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }),
          ['span', { class: 'w-2 h-2 rounded-full bg-[#4F46E5] shrink-0' }],
          ['span', {}, 0],
        ];

      case 'dialogue':
        // E. LỜI THOẠI: In nghiêng, màu #0F172A, 15px, thụt lề nhẹ vào trong giống bong bóng thoại
        classNames += 'font-sans italic text-[#0F172A] text-[15px] ml-6 sm:ml-12 pl-3.5 border-l-2 border-indigo-200 my-1.5 leading-relaxed';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'sfx':
        // F. HIỆU ỨNG ÂM THANH (SFX): Huy hiệu vàng hổ phách, tia chớp ⚡, font Monospace kỹ thuật nổi bật
        classNames += 'font-mono text-xs sm:text-sm my-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-[#FFFBEB] text-amber-950 flex items-center gap-2.5 shadow-2xs not-italic';
        return [
          'div',
          mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }),
          ['span', { class: 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#F59E0B] text-white text-[10px] font-black uppercase tracking-wider select-none shrink-0 shadow-2xs' }, '⚡ SFX'],
          ['span', { class: 'flex-1 italic font-semibold text-amber-900 tracking-wide' }, 0],
        ];

      case 'stage_direction':
        // F. CHỈ DẪN ÂM THANH / BỐI CẢNH (SFX): In nghiêng, màu #64748B, font Monospace kỹ thuật
        classNames += 'font-mono italic text-[#64748B] text-xs sm:text-sm ml-4 pl-2 my-1 leading-normal';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'transition':
        classNames += 'font-semibold uppercase text-right text-gray-500 text-xs tracking-widest my-2';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      default:
        classNames += 'text-gray-800 text-sm';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];
    }
  },

  addKeyboardShortcuts() {
    return {
      // Enter: Grainery Block Cycling logic
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== this.name) {
          return false;
        }

        const currentType: MangaBlockType = currentBlock.attrs.blockType || 'dialogue';
        let nextType: MangaBlockType = 'dialogue';

        if (currentType === 'scene_heading') {
          nextType = 'page_heading';
        } else if (currentType === 'page_heading') {
          nextType = 'panel_heading';
        } else if (currentType === 'panel_heading') {
          nextType = 'stage_direction';
        } else if (currentType === 'character') {
          nextType = 'dialogue';
        } else if (currentType === 'dialogue') {
          // Nếu dòng thoại trống, chuyển thành stage direction
          if (currentBlock.textContent.trim() === '') {
            editor.commands.updateAttributes(this.name, { blockType: 'stage_direction' });
            return true;
          }
          nextType = 'stage_direction';
        } else if (currentType === 'stage_direction') {
          nextType = 'character';
        }

        // Tách block và gán blockType tiếp theo
        return editor
          .chain()
          .splitBlock()
          .updateAttributes(this.name, {
            scriptLineId: generateGuid(),
            blockType: nextType,
            panelId: null,
          })
          .run();
      },

      // Tab: Chuyển đổi linh hoạt giữa Stage Direction và Character
      Tab: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const currentBlock = selection.$from.parent;

        if (currentBlock.type.name !== this.name) {
          return false;
        }

        const currentType: MangaBlockType = currentBlock.attrs.blockType || 'dialogue';
        const newType: MangaBlockType = currentType === 'character' ? 'stage_direction' : 'character';

        return editor.commands.updateAttributes(this.name, { blockType: newType });
      },
    };
  },
});
