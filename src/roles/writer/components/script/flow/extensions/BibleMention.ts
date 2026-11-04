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
      code: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-code'),
        renderHTML: (attributes) => ({
          'data-code': attributes.code,
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
    };
  },

  renderHTML({ HTMLAttributes }) {
    const isStub = HTMLAttributes['data-is-stub'] === 'true';
    const category = (HTMLAttributes['data-category'] || HTMLAttributes.category || 'Character').toLowerCase();
    const code = HTMLAttributes['data-code'] || HTMLAttributes['data-label'] || HTMLAttributes.label || '';
    const label = HTMLAttributes['data-label'] || HTMLAttributes.label || code;

    let colorStyle = 'border-amber-300 bg-amber-50 text-amber-800'; // Default: Character
    if (category.includes('panel')) {
      colorStyle = 'border-purple-300 bg-purple-50 text-purple-800';
    } else if (category.includes('loc') || category.includes('địa danh') || category.includes('location')) {
      colorStyle = 'border-emerald-300 bg-emerald-50 text-emerald-800';
    } else if (category.includes('prop') || category.includes('đạo cụ')) {
      colorStyle = 'border-cyan-300 bg-cyan-50 text-cyan-800';
    } else if (category.includes('term') || category.includes('thuật ngữ')) {
      colorStyle = 'border-indigo-300 bg-indigo-50 text-indigo-800';
    }

    if (isStub) {
      colorStyle = 'border-amber-500 border-dashed bg-amber-50/90 text-amber-900';
    }

    const displayText = `@${code || label}${isStub ? ' (Chưa có trong Bible)' : ''}`;

    return [
      'span',
      mergeAttributes(
        {
          class: `mention inline-flex items-center gap-1 whitespace-nowrap align-baseline px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono tracking-tight border ${colorStyle} shadow-2xs select-none mx-0.5 cursor-pointer transition-all hover:scale-[1.02]`,
          'data-id': HTMLAttributes['data-id'],
          'data-label': label,
          'data-category': category,
          'data-mention-chip': 'true',
          'aria-haspopup': 'dialog',
          title: `@${label} (${category}) - Bấm để xem thông tin Bible`,
          contenteditable: 'false',
        },
        HTMLAttributes
      ),
      displayText,
    ];
  },
});
