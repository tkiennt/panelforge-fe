// src/roles/writer/components/script/flow/extensions/BibleMention.ts
import Mention from '@tiptap/extension-mention';
import { mergeAttributes } from '@tiptap/core';

export const BibleMention = Mention.extend({
  name: 'bibleMention',

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({
          'data-id': attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => ({
          'data-label': attributes.label,
        }),
      },
      category: {
        default: 'Character',
        parseHTML: (element) => element.getAttribute('data-category') || 'Character',
        renderHTML: (attributes) => ({
          'data-category': attributes.category,
        }),
      },
      isLocked: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-is-locked') === 'true',
        renderHTML: (attributes) => ({
          'data-is-locked': attributes.isLocked ? 'true' : 'false',
        }),
      },
      isStub: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-is-stub') === 'true',
        renderHTML: (attributes) => ({
          'data-is-stub': attributes.isStub ? 'true' : 'false',
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const isStub = HTMLAttributes['data-is-stub'] === 'true';
    const isLocked = HTMLAttributes['data-is-locked'] !== 'false';
    const borderStyle = isStub
      ? 'border-amber-500 border-dashed bg-amber-50 text-amber-800'
      : isLocked
        ? 'border-[#FF6F61]/40 bg-[#FFF1F0] text-[#FF6F61]'
        : 'border-amber-400 border-dashed bg-[#FFF1F0] text-[#FF6F61]';

    return [
      'span',
      mergeAttributes(
        {
          class: `mention inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold tracking-wide border ${borderStyle} shadow-2xs select-none mx-0.5 cursor-pointer`,
        },
        HTMLAttributes
      ),
      `@${HTMLAttributes['data-label'] || HTMLAttributes.label || ''}${isStub ? ' (Stub)' : ''}`,
    ];
  },
});

