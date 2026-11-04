// src/roles/writer/components/script/flow/comic-editor/nodes/DialogueBlockNode.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const DialogueBlockNode = Node.create({
  name: 'dialogueBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      character: {
        default: 'Nhân vật',
        parseHTML: (element) => element.getAttribute('data-character') || 'Nhân vật',
        renderHTML: (attributes) => ({
          'data-character': attributes.character,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="dialogue-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const character = HTMLAttributes['data-character'] || 'Nhân vật';

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'dialogue-block my-2 pl-4 py-1.5 flex items-start gap-2.5 transition-all group',
        'data-type': 'dialogue-block',
      }),
      [
        'span',
        {
          class:
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 select-none shrink-0 mt-0.5',
          contenteditable: 'false',
        },
        ['span', { class: 'w-1.5 h-1.5 rounded-full bg-indigo-500' }],
        `@${character}`,
      ],
      [
        'div',
        {
          class: 'dialogue-text italic font-serif text-slate-900 ml-1 text-base leading-relaxed flex-1 outline-none',
        },
        0,
      ],
    ];
  },
});
