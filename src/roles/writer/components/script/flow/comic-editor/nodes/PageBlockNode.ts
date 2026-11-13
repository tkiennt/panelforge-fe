// src/roles/writer/components/script/flow/comic-editor/nodes/PageBlockNode.ts
import { Node, mergeAttributes } from '@tiptap/core';

export interface PageBlockAttributes {
  pageNumber?: string;
  label?: string;
}

export const PageBlockNode = Node.create({
  name: 'pageBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      pageNumber: {
        default: '01',
        parseHTML: (element) => element.getAttribute('data-page-number') || '01',
        renderHTML: (attributes) => ({
          'data-page-number': attributes.pageNumber,
        }),
      },
      label: {
        default: 'Trang 01',
        parseHTML: (element) => element.getAttribute('data-label') || 'Trang 01',
        renderHTML: (attributes) => ({
          'data-label': attributes.label,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="page-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const pageNum = HTMLAttributes['data-page-number'] || '01';
    const displayLabel = HTMLAttributes['data-label'] || `Trang ${pageNum}`;

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class:
          'page-block border-2 border-[#C2410C] bg-[#FFF2E6] rounded-xl p-4 my-6 shadow-sm transition-all',
        'data-type': 'page-block',
      }),
      [
        'div',
        {
          class:
            'text-xs font-bold text-[#C2410C] uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none pointer-events-none',
          contenteditable: 'false',
        },
        [
          'span',
          {
            class:
              'inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#C2410C] text-white text-[11px] font-black mr-1',
          },
          '!',
        ],
        ['span', { class: 'page-badge tracking-widest' }, displayLabel],
      ],
      [
        'div',
        {
          class:
            'page-content font-sans font-semibold text-[#1C1917] text-sm leading-relaxed outline-none',
        },
        0,
      ],
    ];
  },
});
