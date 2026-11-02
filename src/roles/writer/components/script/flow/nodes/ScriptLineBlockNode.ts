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
    const blockType = HTMLAttributes['data-block-type'] || 'dialogue';

    let classNames = 'script-block font-mono my-1.5 transition-all duration-150 outline-none ';

    switch (blockType) {
      case 'scene_heading':
        classNames += 'font-bold uppercase tracking-wider text-base text-gray-900 border-b border-gray-300 pb-1 mt-4 mb-2';
        break;
      case 'character':
        classNames += 'font-bold uppercase tracking-wide text-amber-700 max-w-md ml-12 sm:ml-24 mt-3 mb-0.5';
        break;
      case 'dialogue':
        classNames += 'text-gray-800 ml-6 sm:ml-16 max-w-xl text-sm leading-relaxed mb-2';
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

