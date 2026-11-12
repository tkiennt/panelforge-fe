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
        parseHTML: (element) =>
          element.getAttribute('data-page-number')
            ? parseInt(element.getAttribute('data-page-number')!, 10)
            : null,
        renderHTML: (attributes) => ({
          'data-page-number': attributes.pageNumber,
        }),
      },
      panelNumber: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute('data-panel-number')
            ? parseInt(element.getAttribute('data-panel-number')!, 10)
            : null,
        renderHTML: (attributes) => ({
          'data-panel-number': attributes.panelNumber,
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const isStub = HTMLAttributes['data-is-stub'] === 'true';
    const category = (
      HTMLAttributes['data-category'] ||
      HTMLAttributes.category ||
      'Character'
    ).toLowerCase();
    const code =
      HTMLAttributes['data-code'] || HTMLAttributes['data-label'] || HTMLAttributes.label || '';
    const label = HTMLAttributes['data-label'] || HTMLAttributes.label || code;

    // Mục Series Bible = tím (theo DESIGN_RULES); tham chiếu Panel trung tính; mã chưa có trong Bible = hổ phách (cảnh báo)
    const isPanel = category.includes('panel');
    const colorStyle = isStub
      ? 'text-amber-800 decoration-amber-500 decoration-dashed'
      : isPanel
        ? 'text-stone-700 decoration-stone-300'
        : 'text-violet-800 decoration-violet-300 hover:decoration-violet-600';

    // Trên trang giấy hiển thị tên như chữ viết; mã chỉ dùng cho khung tranh và mục chưa có trong Bible
    const displayText = isPanel
      ? `@${code || label}`
      : isStub
        ? `@${code || label}`
        : label || code;
    const tooltipText = isPanel
      ? `@${code || label} (Khung tranh)`
      : isStub
        ? `@${code || label}: chưa có trong Series Bible`
        : `${label || code}${code && code !== label ? ` [${code}]` : ''} (${category}) - Bấm để xem thông tin Bible`;

    return [
      'span',
      mergeAttributes(
        {
          class: `mention whitespace-nowrap font-semibold underline decoration-2 underline-offset-4 select-none cursor-pointer transition-colors ${colorStyle}`,
          'data-id': HTMLAttributes['data-id'],
          'data-label': label,
          'data-code': code,
          'data-category': category,
          'data-mention-chip': 'true',
          'aria-haspopup': 'dialog',
          title: tooltipText,
          contenteditable: 'false',
        },
        HTMLAttributes,
      ),
      displayText,
    ];
  },
});
