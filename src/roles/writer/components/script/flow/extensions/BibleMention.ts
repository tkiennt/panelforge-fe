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
    const label = HTMLAttributes['data-label'] || HTMLAttributes.label || '';
    const category = HTMLAttributes['data-category'] || HTMLAttributes.category || 'Character';

    // D. TÊN NHÂN VẬT: Thẻ chip bo tròn, nền màu tím nhạt, chữ tím đậm #4338CA, có chấm màu đại diện
    const dotColor = category === 'Location'
      ? 'bg-emerald-500'
      : category === 'Prop'
        ? 'bg-amber-500'
        : 'bg-[#4F46E5]';

    return [
      'span',
      mergeAttributes(
        {
          class: `mention inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border border-indigo-200 bg-indigo-50 text-[#4338CA] shadow-2xs select-none mx-1 cursor-pointer transition-colors hover:bg-indigo-100 hover:border-indigo-300`,
          'data-id': HTMLAttributes['data-id'],
          'data-label': label,
          'data-category': category,
          title: `@${label} (${category}) - Rê chuột để xem thông tin`,
        },
        HTMLAttributes
      ),
      ['span', { class: `w-2 h-2 rounded-full shrink-0 ${dotColor}` }],
      `@${label}${isStub ? ' (Stub)' : ''}`,
    ];
  },
});

