// src/roles/writer/components/script/flow/comic-editor/nodes/PanelBlockNode.ts
import { Node, mergeAttributes } from '@tiptap/core';

export const PanelBlockNode = Node.create({
  name: 'panelBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      panelNumber: {
        default: '1.1',
        parseHTML: (element) => element.getAttribute('data-panel-number') || '1.1',
        renderHTML: (attributes) => ({
          'data-panel-number': attributes.panelNumber,
        }),
      },
      cameraAngle: {
        default: 'Toàn cảnh',
        parseHTML: (element) => element.getAttribute('data-camera-angle') || 'Toàn cảnh',
        renderHTML: (attributes) => ({
          'data-camera-angle': attributes.cameraAngle,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="panel-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const panelNum = HTMLAttributes['data-panel-number'] || '1.1';
    const cameraAngle = HTMLAttributes['data-camera-angle'] || 'Toàn cảnh';

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'panel-block border-l-4 border-indigo-600 bg-slate-50/90 rounded-r-lg p-3 my-3 shadow-xs transition-all',
        'data-type': 'panel-block',
      }),
      [
        'div',
        {
          class: 'mb-1.5 flex items-center gap-2 select-none pointer-events-none',
          contenteditable: 'false',
        },
        [
          'span',
          {
            class: 'inline-block px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700',
          },
          `" Panel ${panelNum}`,
        ],
        [
          'span',
          {
            class: 'text-[11px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200',
          },
          `[${cameraAngle}]`,
        ],
      ],
      [
        'div',
        {
          class: 'panel-body font-sans text-slate-800 text-sm leading-relaxed outline-none',
        },
        0,
      ],
    ];
  },
});
