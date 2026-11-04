// src/roles/writer/components/script/flow/comic-editor/nodes/SfxBlockNode.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const SfxBlockNode = Node.create({
  name: 'sfxBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div[data-type="sfx-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class:
          'sfx-block flex items-center gap-2 italic text-slate-500 font-mono text-sm my-1 pl-2 transition-all',
        'data-type': 'sfx-block',
      }),
      [
        'span',
        {
          class:
            'select-none pointer-events-none font-bold text-amber-700 bg-amber-100/80 border border-amber-300/80 px-2 py-0.5 rounded text-xs not-italic shrink-0 shadow-2xs',
          contenteditable: 'false',
        },
        '🔊 SFX:',
      ],
      [
        'div',
        {
          class: 'sfx-body flex-1 outline-none text-slate-600 font-mono font-medium',
        },
        0,
      ],
    ];
  },
});
