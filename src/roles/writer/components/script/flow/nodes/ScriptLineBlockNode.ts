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
          'data-panel-id': attributes.panelId,
        }),
      },
      pageNumber: {
        default: null,
        parseHTML: (element) => (element.getAttribute('data-page-number') ? parseInt(element.getAttribute('data-page-number')!, 10) : null),
        renderHTML: (attributes) => ({
          'data-page-number': attributes.pageNumber,
        }),
      },
      panelNumber: {
        default: null,
        parseHTML: (element) => (element.getAttribute('data-panel-number') ? parseInt(element.getAttribute('data-panel-number')!, 10) : null),
        renderHTML: (attributes) => ({
          'data-panel-number': attributes.panelNumber,
        }),
      },
      hasThumbnail: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-has-thumbnail') === 'true',
        renderHTML: (attributes) => ({
          'data-has-thumbnail': attributes.hasThumbnail ? 'true' : 'false',
        }),
      },
      inPanel: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-in-panel') === 'true',
        renderHTML: (attributes) => ({
          'data-in-panel': attributes.inPanel ? 'true' : 'false',
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
    const blockType = HTMLAttributes['data-block-type'] || 'dialogue';
    const inPanel = HTMLAttributes['data-in-panel'] === 'true';

    // 1. Block Trang: Thanh tiêu đề màu cam, chữ trắng đậm, full width
    if (blockType === 'page_heading') {
      return [
        'div',
        mergeAttributes(HTMLAttributes, {
          class:
            'script-block page-header-bar font-mono font-bold uppercase tracking-wider text-xs sm:text-sm text-white bg-[#EA580C] px-4 py-2 mt-6 mb-3 rounded-lg shadow-sm flex items-center justify-between w-full outline-none',
          'data-page-header': 'true',
        }),
        0,
      ];
    }

    // 2. Block Panel: Nhãn pill màu tím, có chấm trạng thái xanh (đã có phác thảo) hoặc xám (chưa có)
    if (blockType === 'panel_heading') {
      const hasThumb = HTMLAttributes['data-has-thumbnail'] === 'true';
      const dotColor = hasThumb ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-gray-400 ring-2 ring-gray-200';

      return [
        'div',
        mergeAttributes(HTMLAttributes, {
          class:
            'script-block panel-pill-badge inline-flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wide text-purple-950 bg-purple-100 border border-purple-300 px-3 py-1 mt-4 mb-2 rounded-full shadow-2xs outline-none cursor-pointer hover:bg-purple-200/80 transition-colors',
          'data-panel-badge': 'true',
        }),
        [
          'span',
          {
            class: `w-2 h-2 rounded-full ${dotColor} shrink-0 inline-block`,
            'data-status-dot': hasThumb ? 'has-sketch' : 'no-sketch',
            title: hasThumb ? 'Khung đã có phác thảo' : 'Khung chưa có phác thảo',
          },
        ],
        ['span', { class: 'panel-heading-text' }, 0],
      ];
    }

    // 3. Các block kịch bản thông thường (nếu nằm dưới panel thì thụt vào và có viền trái tím mảnh)
    const panelIndent = inPanel ? 'border-l-2 border-purple-300/80 pl-4 ml-2 ' : '';
    let classNames = `script-block font-mono my-1.5 transition-all duration-150 outline-none ${panelIndent}`;

    switch (blockType) {
      case 'scene_heading':
        classNames += 'font-bold uppercase tracking-wider text-base text-gray-900 border-b border-gray-300 pb-1 mt-6 mb-3';
        break;
      case 'character':
        classNames += 'font-bold uppercase tracking-wide text-amber-700 max-w-md ml-12 sm:ml-20 mt-3 mb-0.5';
        break;
      case 'dialogue':
        classNames += 'text-gray-800 ml-6 sm:ml-14 max-w-xl text-sm leading-relaxed mb-2';
        break;
      case 'stage_direction':
        classNames += 'italic text-gray-600 ml-4 max-w-2xl text-xs sm:text-sm my-1';
        break;
      case 'transition':
        classNames += 'font-semibold uppercase text-right text-gray-500 text-xs tracking-widest my-2';
        break;
      default:
        classNames += 'text-gray-800 text-sm';
    }

    return ['div', mergeAttributes(HTMLAttributes, { class: classNames }), 0];
  },

  addKeyboardShortcuts() {
    return {
      // Backspace ở đầu block Trang/Panel -> trở lại đoạn văn thường
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;
        if (!empty) return false;

        const currentBlock = $from.parent;
        if (currentBlock.type.name !== this.name) return false;

        const currentType: MangaBlockType = currentBlock.attrs.blockType || 'dialogue';
        if (
          (currentType === 'page_heading' || currentType === 'panel_heading') &&
          $from.parentOffset === 0
        ) {
          editor.commands.updateAttributes(this.name, { blockType: 'dialogue' });
          return true;
        }
        return false;
      },

      // Enter: Chuyển block tuần tự theo format kịch bản
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
          if (currentBlock.textContent.trim() === '') {
            editor.commands.updateAttributes(this.name, { blockType: 'stage_direction' });
            return true;
          }
          nextType = 'stage_direction';
        } else if (currentType === 'stage_direction') {
          nextType = 'character';
        }

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
