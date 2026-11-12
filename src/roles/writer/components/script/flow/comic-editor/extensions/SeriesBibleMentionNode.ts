// src/roles/writer/components/script/flow/comic-editor/extensions/SeriesBibleMentionNode.ts
import Mention from '@tiptap/extension-mention';
import { mergeAttributes } from '@tiptap/core';

export const SeriesBibleMentionNode = Mention.extend({
  name: 'seriesBibleMention',

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
    };
  },

  renderHTML({ HTMLAttributes }) {
    const label = HTMLAttributes['data-label'] || HTMLAttributes.label || '';
    const category = HTMLAttributes['data-category'] || HTMLAttributes.category || 'Character';

    const dotColor = category === 'Location' ? 'bg-emerald-500' : 'bg-indigo-600';

    return [
      'span',
      mergeAttributes(
        {
          class:
            'mention inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 select-none mx-0.5 shadow-2xs',
          'data-id': HTMLAttributes['data-id'],
          'data-label': label,
          'data-category': category,
        },
        HTMLAttributes,
      ),
      ['span', { class: `w-1.5 h-1.5 rounded-full ${dotColor}` }],
      `@${label}`,
    ];
  },
});
