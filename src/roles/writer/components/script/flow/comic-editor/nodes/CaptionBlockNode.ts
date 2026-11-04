// src/roles/writer/components/script/flow/comic-editor/nodes/CaptionBlockNode.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const CaptionBlockNode = Node.create({
  name: 'captionBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="caption-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class:
          'caption-block text-slate-700 text-sm leading-normal pl-3 my-1.5 border-l-2 border-slate-400 bg-slate-50/70 py-1 rounded-r transition-all',
        'data-type': 'caption-block',
      }),
      [
        'div',
        {
          class:
            'text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 select-none pointer-events-none flex items-center gap-1.5',
          contenteditable: 'false',
        },
        ['span', {}, '📜'],
        ['span', {}, 'Lời dẫn truyện (Caption):'],
      ],
      [
        'div',
        {
          class: 'caption-body font-sans text-slate-700 text-sm leading-relaxed outline-none',
        },
        0,
      ],
    ];
  },
});
