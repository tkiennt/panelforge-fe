// src/roles/writer/components/script/flow/nodes/ScriptLineBlockNode.ts
import { Node, mergeAttributes } from '@tiptap/core';
import { Selection, TextSelection } from '@tiptap/pm/state';
import {
  getNextPageNumber,
  getNextPanelNumber,
  extractPageNumber,
  extractPanelNumber,
} from '../comic-editor/comicCounting';
import { MangaBlockType } from '../types';
import { generateGuid, renumberEditorState } from '../scriptFlowAdapter';

/** Tab / Shift+Tab xoay vòng loại dòng nội dung (tiêu đề Trang/Panel/Cảnh không nằm trong vòng) */
const CYCLE_TYPES: MangaBlockType[] = ['stage_direction', 'dialogue', 'caption', 'sfx'];

/** Khối dòng nội dung mới khi nhấn Enter: luôn là hành động, giữ phân cảnh và vị trí Trang/Panel hiện tại */
function nextActionAttrs(current: Record<string, unknown>) {
  return {
    scriptLineId: generateGuid(),
    sceneId: current.sceneId ?? null,
    blockType: 'stage_direction' as MangaBlockType,
    narrationMode: 'Present',
    pageNumber: current.pageNumber ?? null,
    panelNumber: current.panelNumber ?? null,
    inPanel: current.inPanel ?? false,
  };
}

const HEADING_CONTROL_CLASS =
  'shrink-0 cursor-pointer select-none font-sans normal-case tracking-normal text-xs font-medium px-2 py-0.5 rounded-md transition-all';

export const ScriptLineBlockNode = Node.create({
  name: 'scriptLineBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      scriptLineId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-script-line-id'),
        renderHTML: (attributes) => ({
          'data-script-line-id': attributes.scriptLineId,
        }),
      },
      sceneId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-scene-id'),
        renderHTML: (attributes) => ({
          'data-scene-id': attributes.sceneId,
        }),
      },
      sceneNumber: {
        default: null,
        parseHTML: (element) => {
          const val = element.getAttribute('data-scene-number');
          return val ? parseInt(val, 10) : null;
        },
        renderHTML: (attributes) =>
          attributes.sceneNumber ? { 'data-scene-number': attributes.sceneNumber } : {},
      },
      blockType: {
        default: 'stage_direction' as MangaBlockType,
        parseHTML: (element) =>
          (element.getAttribute('data-block-type') as MangaBlockType) || 'stage_direction',
        renderHTML: (attributes) => ({
          'data-block-type': attributes.blockType,
        }),
      },
      speakerCharacterId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-speaker-id'),
        renderHTML: (attributes) => ({
          'data-speaker-id': attributes.speakerCharacterId,
        }),
      },
      speakerName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-speaker-name'),
        renderHTML: (attributes) => ({
          'data-speaker-name': attributes.speakerName,
        }),
      },
      narrationMode: {
        default: 'Present',
        parseHTML: (element) => element.getAttribute('data-narration-mode') || 'Present',
        renderHTML: (attributes) => ({
          'data-narration-mode': attributes.narrationMode,
        }),
      },
      lineOrder: {
        default: 1,
        parseHTML: (element) => parseInt(element.getAttribute('data-line-order') || '1', 10),
        renderHTML: (attributes) => ({
          'data-line-order': attributes.lineOrder,
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
      hasThumbnail: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-has-thumbnail') === 'true',
        renderHTML: (attributes) => ({
          'data-has-thumbnail': attributes.hasThumbnail ? 'true' : 'false',
        }),
      },
      inPanel: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-in-panel') === 'true',
        renderHTML: (attributes) => ({
          'data-in-panel': attributes.inPanel ? 'true' : 'false',
        }),
      },
    };
  },

  parseHTML() {
    // Thoại có nhãn người nói: nội dung nằm trong .dialogue-text, nhãn tên không được đọc lại thành chữ (copy/dán)
    const contentElement = (el: HTMLElement) =>
      (el.querySelector(':scope > .dialogue-text') as HTMLElement | null) ?? el;
    return [
      { tag: 'div[data-script-line-id]', contentElement },
      { tag: 'div[data-block-type]', contentElement },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const blockType = (HTMLAttributes['data-block-type'] || 'caption') as MangaBlockType;
    const attrs = (extra: string) =>
      mergeAttributes(HTMLAttributes, {
        class: `script-block outline-none transition-colors duration-150 ${extra}`,
        'data-block-type': blockType,
      });
    const control = (cls: string, title: string, label: string) => [
      'button',
      { type: 'button', class: `${cls} ${HEADING_CONTROL_CLASS}`, contenteditable: 'false', title },
      label,
    ];
    // Nút của tiêu đề nằm chồng lên mép phải, chỉ hiện khi rê chuột / focus để trang giấy luôn yên tĩnh
    const controls = (...buttons: unknown[]) => [
      'span',
      {
        class:
          'absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-md bg-white pl-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity',
        contenteditable: 'false',
      },
      ...buttons,
    ];
    const rule = () => ['span', { class: 'h-px flex-1 bg-stone-200', contenteditable: 'false' }];

    switch (blockType) {
      case 'scene_heading':
        // Cảnh là mốc tự sự, không phải đơn vị trình bày của kịch bản truyện tranh: chỉ là đường phân cách nhẹ
        return [
          'div',
          attrs('group relative flex items-center gap-3 mt-12 first:mt-0 mb-2 select-text'),
          [
            'span',
            {
              class:
                'scene-heading-content text-xs font-medium uppercase tracking-[0.2em] text-stone-500',
            },
            0,
          ],
          rule(),
          controls(
            control('scene-delete-btn text-rose-700 hover:bg-rose-50', 'Xóa cảnh này', 'Xóa cảnh'),
          ),
        ] as any;

      case 'page_heading':
        return [
          'div',
          attrs('group relative flex items-center gap-4 mt-14 mb-6 select-text'),
          rule(),
          [
            'span',
            {
              class:
                'page-heading-content font-serif text-lg uppercase tracking-[0.2em] text-stone-900',
            },
            0,
          ],
          rule(),
          controls(
            control(
              'page-add-panel-btn text-stone-600 hover:text-stone-900 hover:bg-stone-100',
              'Thêm panel trống vào cuối trang này',
              '+ Panel',
            ),
            control(
              'page-toggle-btn text-stone-600 hover:text-stone-900 hover:bg-stone-100',
              'Thu gọn / mở rộng trang',
              '▼ Thu gọn',
            ),
            control('page-delete-btn text-rose-700 hover:bg-rose-50', 'Xóa trang này', 'Xóa trang'),
          ),
        ] as any;

      case 'panel_heading':
        return [
          'div',
          attrs(
            'group relative mt-7 mb-1 text-sm font-semibold uppercase tracking-wide text-stone-900 select-text',
          ),
          ['span', { class: 'panel-heading-text' }, 0],
          controls(
            control(
              'panel-add-dialogue-btn text-stone-600 hover:text-stone-900 hover:bg-stone-100',
              'Thêm bóng thoại vào cuối panel này',
              '+ Thoại',
            ),
            control(
              'panel-delete-btn text-rose-700 hover:bg-rose-50',
              'Xóa khung này',
              'Xóa khung',
            ),
          ),
        ] as any;

      case 'stage_direction':
        return ['div', attrs('font-studio text-[15px] leading-7 text-stone-800 my-2'), 0];

      case 'character':
        return [
          'div',
          attrs(
            'font-studio text-xs font-semibold uppercase tracking-[0.16em] text-stone-600 mt-4 mb-0.5',
          ),
          0,
        ];

      // Định dạng full script: "1. TÊN (OFF):   lời thoại" — số thứ tự đếm lại mỗi trang bằng CSS counter
      case 'dialogue':
      case 'caption':
      case 'sfx': {
        const speaker = node.attrs.speakerName as string | null;
        const label =
          blockType === 'sfx' ? 'SFX' : blockType === 'caption' ? 'Dẫn truyện' : speaker;
        const textClass =
          blockType === 'sfx'
            ? 'dialogue-text font-studio text-[15px] leading-7 font-bold italic tracking-wide text-stone-900'
            : blockType === 'caption'
              ? 'dialogue-text font-serif italic text-[15px] leading-7 text-stone-800'
              : 'dialogue-text font-studio text-[15px] leading-7 text-stone-900';
        return [
          'div',
          attrs('script-line grid grid-cols-[minmax(7rem,11rem)_1fr] gap-x-4 my-1.5'),
          [
            'span',
            {
              class: `script-line-label font-studio text-sm leading-7 uppercase tracking-wide select-none ${
                label ? 'font-semibold text-stone-700' : 'text-stone-400'
              }`,
              contenteditable: 'false',
            },
            label || 'Thoại',
          ],
          ['div', { class: textClass }, 0],
        ];
      }

      case 'transition':
        return [
          'div',
          attrs('text-right text-xs font-semibold uppercase tracking-[0.2em] text-stone-500 my-4'),
          0,
        ];

      default:
        return ['div', attrs('font-studio text-[15px] leading-7 text-stone-800 my-2'), 0];
    }
  },

  addKeyboardShortcuts() {
    return {
      // 1. Space Trigger: # / ! + Space -> Trang, - / " + Space -> Panel (Look-behind Counting)
      Space: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, empty } = selection;
        const currentBlock = $from.parent;

        if (
          (currentBlock.type.name !== this.name && currentBlock.type.name !== 'paragraph') ||
          !empty
        ) {
          return false;
        }

        const textBefore = currentBlock.textBetween(0, $from.parentOffset, '\n', '\0').trim();

        // 1.1 Gõ "# " hoặc "! " -> Biến thành Tiêu đề trang với số tăng tự động
        const isPageSpace =
          textBefore === '#' ||
          textBefore === '!' ||
          /^(?:#|!)\s*(?:Trang|Page\s*\d*)?$/i.test(textBefore);

        if (isPageSpace) {
          const explicitNum = extractPageNumber(textBefore) ?? undefined;
          const from = $from.before();
          const to = $from.after();
          const nextPage = getNextPageNumber(state.doc, from, explicitNum);
          const pageNum = String(nextPage).padStart(2, '0');
          const defaultText = `Trang ${pageNum} `;

          const newBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'page_heading',
              lineOrder: currentBlock.attrs?.lineOrder || 1,
            },
            state.schema.text(defaultText),
          );

          const tr = state.tr.replaceWith(from, to, newBlock);
          tr.setSelection(TextSelection.create(tr.doc, from + 1 + defaultText.length));
          view.dispatch(tr);
          return true;
        }

        // 1.2 Gõ "- " hoặc '" ' -> Biến thành Tiêu đề panel với số tăng tự động theo trang
        const isPanelSpace =
          textBefore === '-' ||
          textBefore === '"' ||
          textBefore === '”' ||
          /^[-"”]\s*(?:Panel\s*[\d.]*)?$/i.test(textBefore);

        if (isPanelSpace) {
          const explicit = extractPanelNumber(textBefore) ?? undefined;
          const from = $from.before();
          const to = $from.after();
          const { pageNum, panelNum } = getNextPanelNumber(state.doc, from, explicit);
          const defaultText = `" Panel ${pageNum}.${panelNum}: [Toàn cảnh] `;

          const newBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'panel_heading',
              lineOrder: currentBlock.attrs?.lineOrder || 1,
            },
            state.schema.text(defaultText),
          );

          const tr = state.tr.replaceWith(from, to, newBlock);
          tr.setSelection(TextSelection.create(tr.doc, from + 1 + defaultText.length));
          view.dispatch(tr);
          return true;
        }

        return false;
      },

      // 2. Tab Trigger: # / ! + Tab -> Trang, - / " + Tab -> Panel
      Tab: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== this.name && currentBlock.type.name !== 'paragraph') {
          return false;
        }

        const textBefore = currentBlock.textBetween(0, $from.parentOffset, '\n', '\0').trim();
        const fullLineText = currentBlock.textContent.trim();

        // 2.1 Kiểm tra Page Trigger (# / ! + Tab)
        const isPageTrigger =
          textBefore === '#' ||
          textBefore === '!' ||
          fullLineText === '#' ||
          fullLineText === '!' ||
          /^(?:#|!)\s*(?:Trang|Page\s*\d*)?$/i.test(textBefore) ||
          /^(?:#|!)\s*(?:Trang|Page\s*\d*)?$/i.test(fullLineText);

        if (isPageTrigger) {
          const explicitNum = extractPageNumber(fullLineText || textBefore) ?? undefined;
          const from = $from.before();
          const to = $from.after();
          const nextPage = getNextPageNumber(state.doc, from, explicitNum);
          const pageNum = String(nextPage).padStart(2, '0');
          const defaultText = `Trang ${pageNum}`;

          const newBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'page_heading',
              lineOrder: currentBlock.attrs?.lineOrder || 1,
            },
            state.schema.text(defaultText),
          );

          const tr = state.tr.replaceWith(from, to, newBlock);
          tr.setSelection(TextSelection.create(tr.doc, from + 1 + defaultText.length));
          view.dispatch(tr);
          return true;
        }

        // 2.2 Kiểm tra Panel Trigger (- / " + Tab)
        const isPanelTrigger =
          textBefore === '-' ||
          textBefore === '"' ||
          textBefore === '”' ||
          fullLineText === '-' ||
          fullLineText === '"' ||
          fullLineText === '”' ||
          /^[-"”]\s*(?:Panel\s*[\d.]*)?$/i.test(textBefore) ||
          /^[-"”]\s*(?:Panel\s*[\d.]*)?$/i.test(fullLineText);

        if (isPanelTrigger) {
          const explicit = extractPanelNumber(fullLineText || textBefore) ?? undefined;
          const from = $from.before();
          const to = $from.after();
          const { pageNum, panelNum } = getNextPanelNumber(state.doc, from, explicit);
          const defaultText = `" Panel ${pageNum}.${panelNum}: [Toàn cảnh] `;

          const newBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'panel_heading',
              lineOrder: currentBlock.attrs?.lineOrder || 1,
            },
            state.schema.text(defaultText),
          );

          const tr = state.tr.replaceWith(from, to, newBlock);
          tr.setSelection(TextSelection.create(tr.doc, from + 1 + defaultText.length));
          view.dispatch(tr);
          return true;
        }

        // 2.3 Tab đổi loại dòng: Hành động → Thoại → Lời dẫn → SFX
        return cycleBlockType(editor, 1);
      },

      'Shift-Tab': ({ editor }) => cycleBlockType(editor, -1),

      // 3. Backspace: Cho phép xóa Scene, Page, Panel mượt mà kèm tự động đánh số lại
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        const currentBlock = $from.parent;
        const from = $from.before();
        const to = $from.after();

        if (currentBlock.type.name === this.name) {
          const currentType = currentBlock.attrs.blockType || 'stage_direction';

          // 3.-1 Backspace ở đầu lời thoại: bỏ nhãn người nói trước (lần sau mới nối dòng)
          if (
            currentType === 'dialogue' &&
            currentBlock.attrs.speakerName &&
            empty &&
            $from.parentOffset === 0
          ) {
            view.dispatch(
              state.tr.setNodeMarkup(from, undefined, {
                ...currentBlock.attrs,
                speakerName: null,
                speakerCharacterId: null,
              }),
            );
            return true;
          }

          // 3.0 Tiêu đề cảnh (scene_heading): Cho phép xóa cảnh nếu không phải cảnh đầu tiên
          if (currentType === 'scene_heading') {
            const isAtStartOrEmpty =
              (empty && $from.parentOffset === 0) || currentBlock.textContent.trim() === '';
            if (!isAtStartOrEmpty) {
              return false;
            }

            let isFirstScene = true;
            state.doc.descendants((node, pos) => {
              if (node.type.name === this.name && node.attrs?.blockType === 'scene_heading') {
                if (pos < from) {
                  isFirstScene = false;
                  return false;
                }
              }
            });

            if (isFirstScene) {
              // Tiêu đề cảnh đầu tiên trong chương: Không xóa bằng Backspace để giữ cấu trúc kịch bản
              return true;
            } else {
              const tr = state.tr.delete(from, to);
              try {
                const targetPos = Math.max(0, Math.min(from - 1, tr.doc.content.size));
                tr.setSelection(Selection.near(tr.doc.resolve(targetPos), -1));
              } catch {}
              view.dispatch(tr);
              if (typeof setTimeout === 'function') {
                setTimeout(() => renumberEditorState(editor), 0);
              }
              return true;
            }
          }

          // 3.1 Tiêu đề trang (page_heading): Không thể xóa tiêu đề trang đầu tiên bằng backspace
          if (currentType === 'page_heading') {
            const isAtStartOrEmpty =
              (empty && $from.parentOffset === 0) || currentBlock.textContent.trim() === '';
            if (!isAtStartOrEmpty) {
              return false;
            }

            let isFirstPage = true;
            state.doc.descendants((node, pos) => {
              if (node.type.name === this.name && node.attrs?.blockType === 'page_heading') {
                if (pos < from) {
                  isFirstPage = false;
                  return false;
                }
              }
            });

            if (isFirstPage) {
              // Tiêu đề trang đầu tiên: KHÔNG THỂ XÓA BẰNG BACKSPACE
              return true;
            } else {
              // Các trang tiếp theo (Page 2, 3...): Cho phép xóa Page bằng Backspace
              const tr = state.tr.delete(from, to);
              try {
                const targetPos = Math.max(0, Math.min(from - 1, tr.doc.content.size));
                tr.setSelection(Selection.near(tr.doc.resolve(targetPos), -1));
              } catch {}
              view.dispatch(tr);
              if (typeof setTimeout === 'function') {
                setTimeout(() => renumberEditorState(editor), 0);
              }
              return true;
            }
          }

          // 3.2 Cho phép xóa Panel bằng Backspace khi con trỏ ở đầu dòng hoặc khối trống
          if (currentType === 'panel_heading') {
            const isAtStartOrEmpty =
              (empty && $from.parentOffset === 0) || currentBlock.textContent.trim() === '';
            if (!isAtStartOrEmpty) {
              return false;
            }

            const tr = state.tr.delete(from, to);
            try {
              const targetPos = Math.max(0, Math.min(from - 1, tr.doc.content.size));
              tr.setSelection(Selection.near(tr.doc.resolve(targetPos), -1));
            } catch {}
            view.dispatch(tr);
            if (typeof setTimeout === 'function') {
              setTimeout(() => renumberEditorState(editor), 0);
            }
            return true;
          }

          // 3.3 Hoàn nguyên SFX / Dialogue về Lời dẫn truyện (caption)
          if (empty && $from.parentOffset === 0) {
            if (currentType === 'sfx' || currentType === 'dialogue') {
              return editor.commands.updateAttributes(this.name, { blockType: 'caption' });
            }
          }
        }

        // Chặn joinBackward làm hỏng heading khi nhấn Backspace ở đầu khối kế tiếp
        if (empty && $from.parentOffset === 0) {
          const $beforePos = state.doc.resolve(from);
          const prevNode = $beforePos.nodeBefore;
          if (prevNode && prevNode.type.name === this.name) {
            const prevType = prevNode.attrs?.blockType;
            if (
              prevType === 'scene_heading' ||
              prevType === 'page_heading' ||
              prevType === 'panel_heading'
            ) {
              if (currentBlock.textContent.trim() === '') {
                const tr = state.tr.delete(from, to);
                const prevPos = Math.max(0, from - 1);
                tr.setSelection(
                  TextSelection.create(tr.doc, Math.min(prevPos, tr.doc.content.size)),
                );
                view.dispatch(tr);
                return true;
              }
              return true;
            }
          }
        }

        return false;
      },

      // 3.5 Delete: Cho phép xóa xuôi các khối heading rỗng và chặn joinForward làm hỏng heading
      Delete: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, empty } = selection;
        if (!empty) return false;

        const currentBlock = $from.parent;
        const from = $from.before();
        const to = $from.after();

        // Nếu khối hiện tại là heading rỗng, cho phép Delete xóa xuôi
        if (currentBlock.type.name === this.name) {
          const currentType = currentBlock.attrs?.blockType;
          if (currentBlock.textContent.trim() === '') {
            if (currentType === 'scene_heading') {
              let isFirstScene = true;
              state.doc.descendants((node, pos) => {
                if (node.type.name === this.name && node.attrs?.blockType === 'scene_heading') {
                  if (pos < from) {
                    isFirstScene = false;
                    return false;
                  }
                }
              });
              if (!isFirstScene) {
                const tr = state.tr.delete(from, to);
                view.dispatch(tr);
                if (typeof setTimeout === 'function') {
                  setTimeout(() => renumberEditorState(editor), 0);
                }
                return true;
              }
            } else if (currentType === 'page_heading') {
              let isFirstPage = true;
              state.doc.descendants((node, pos) => {
                if (node.type.name === this.name && node.attrs?.blockType === 'page_heading') {
                  if (pos < from) {
                    isFirstPage = false;
                    return false;
                  }
                }
              });
              if (!isFirstPage) {
                const tr = state.tr.delete(from, to);
                view.dispatch(tr);
                if (typeof setTimeout === 'function') {
                  setTimeout(() => renumberEditorState(editor), 0);
                }
                return true;
              }
            } else if (currentType === 'panel_heading') {
              const tr = state.tr.delete(from, to);
              view.dispatch(tr);
              if (typeof setTimeout === 'function') {
                setTimeout(() => renumberEditorState(editor), 0);
              }
              return true;
            }
          }
        }

        // Chặn joinForward làm hỏng heading khi nhấn Delete ở cuối dòng trước
        if ($from.parentOffset === currentBlock.content.size) {
          const $afterPos = state.doc.resolve(to);
          const nextNode = $afterPos.nodeAfter;
          if (nextNode && nextNode.type.name === this.name) {
            const nextType = nextNode.attrs?.blockType;
            if (
              nextType === 'scene_heading' ||
              nextType === 'page_heading' ||
              nextType === 'panel_heading'
            ) {
              return true;
            }
          }
        }

        return false;
      },

      // 4. Enter: Incremental Line Completion & Paragraph Creation
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== this.name && currentBlock.type.name !== 'paragraph') {
          return false;
        }

        const rawText = currentBlock.textContent.trim();
        const currentType = currentBlock.attrs?.blockType || 'caption';

        // 4.1 Cú pháp thoại NGHIÊM NGẶT CÓ DẤU NGOẶC KÉP:
        // Chỉ chuyển thành thoại nếu có CẢ @Character: VÀ "Lời thoại"!
        // Nếu không có dấu ngoặc kép (như "@Minh walks away" hoặc viết tự do), coi là lời dẫn bình thường!
        const strictDialogueMatch = rawText.match(/^@([\w\p{L}_-]+)\s*:\s*["“]([^"”]*?)["”]$/u);
        if (strictDialogueMatch) {
          const speakerName = strictDialogueMatch[1].trim();
          const displayText = strictDialogueMatch[2].trim();

          const from = $from.before();
          const to = $from.after();
          const dialogueBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'dialogue',
              speakerName,
            },
            displayText ? state.schema.text(displayText) : undefined,
          );

          // Tạo một scriptLineBlock mặc định rỗng (caption) bên dưới cho phép viết tự do
          const nextBlock = state.schema.nodes.scriptLineBlock.create(
            nextActionAttrs(currentBlock.attrs),
          );

          return editor.commands.command(({ tr, dispatch }) => {
            tr.replaceWith(from, to, [dialogueBlock, nextBlock]);
            const insertPos = from + dialogueBlock.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, insertPos));
            if (dispatch) dispatch(tr);
            return true;
          });
        }

        // 4.2 Phân tích SFX: SFX: ... hoặc * TIẾNG NỔ *
        const sfxMatch = rawText.match(/^(?:SFX:|\*)\s*(.*)/i);
        if (sfxMatch) {
          const sfxBody = sfxMatch[1].replace(/\*$/, '').trim() || 'TIẾNG ĐỘNG';
          const displayText = `* ${sfxBody} *`;

          const from = $from.before();
          const to = $from.after();
          const sfxBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'sfx',
            },
            state.schema.text(displayText),
          );

          // Dòng tiếp theo là caption cho phép viết tự do
          const nextBlock = state.schema.nodes.scriptLineBlock.create(
            nextActionAttrs(currentBlock.attrs),
          );

          return editor.commands.command(({ tr, dispatch }) => {
            tr.replaceWith(from, to, [sfxBlock, nextBlock]);
            const insertPos = from + sfxBlock.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, insertPos));
            if (dispatch) dispatch(tr);
            return true;
          });
        }

        // 4.3 Phân tích Caption: Caption: ... hoặc Lời dẫn truyện: ...
        const captionMatch = rawText.match(
          /^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện):\s*(.*)/i,
        );
        if (captionMatch) {
          const captionBody = captionMatch[1].trim();
          const displayText = captionBody;

          const from = $from.before();
          const to = $from.after();
          const captionBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'caption',
            },
            state.schema.text(displayText),
          );

          // Dòng tiếp theo là caption cho phép viết tự do
          const nextBlock = state.schema.nodes.scriptLineBlock.create(
            nextActionAttrs(currentBlock.attrs),
          );

          return editor.commands.command(({ tr, dispatch }) => {
            tr.replaceWith(from, to, [captionBlock, nextBlock]);
            const insertPos = from + captionBlock.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, insertPos));
            if (dispatch) dispatch(tr);
            return true;
          });
        }

        // 4.35 Enter trên dòng thoại / lời dẫn / SFX còn trống: quay về dòng hành động thay vì thêm dòng trống
        if (!rawText && ['dialogue', 'caption', 'sfx', 'character'].includes(currentType)) {
          view.dispatch(
            state.tr.setNodeMarkup($from.before(), undefined, {
              ...currentBlock.attrs,
              blockType: 'stage_direction',
              speakerName: null,
              speakerCharacterId: null,
            }),
          );
          return true;
        }

        // 4.4 Khi nhấn Enter trên Page hoặc Panel: chèn 1 dòng hành động rỗng bên dưới
        if (
          currentType === 'page_heading' ||
          currentType === 'panel_heading' ||
          currentBlock.type.name === 'pageBlock' ||
          currentBlock.type.name === 'panelBlock'
        ) {
          const emptyActionBlock = state.schema.nodes.scriptLineBlock.create(
            nextActionAttrs(currentBlock.attrs),
          );

          const insertPos = $from.after();
          return editor.commands.command(({ tr, dispatch }) => {
            tr.insert(insertPos, emptyActionBlock);
            tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
            if (dispatch) dispatch(tr);
            return true;
          });
        }

        // 4.5 Đối với các dòng văn bản (caption, stage_direction, dialogue, sfx...):
        // Nếu con trỏ ở giữa dòng: tách dòng chính xác tại vị trí con trỏ
        if ($from.parentOffset < currentBlock.content.size) {
          const nextAttrs = {
            ...currentBlock.attrs,
            scriptLineId: generateGuid(),
          };
          const tr = state.tr.split($from.pos, 1, [
            { type: state.schema.nodes.scriptLineBlock, attrs: nextAttrs },
          ]);
          view.dispatch(tr);
          return true;
        }

        // 4.6 Con trỏ ở cuối dòng: dòng mới luôn là hành động (sau lời thoại cũng vậy, như kịch bản phim)
        const emptyBlock = state.schema.nodes.scriptLineBlock.create(
          nextActionAttrs(currentBlock.attrs),
        );

        const insertPos = $from.after();
        const tr = state.tr.insert(insertPos, emptyBlock);
        tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        view.dispatch(tr);
        return true;
      },
    };
  },
});

function cycleBlockType(editor: any, step: 1 | -1): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  const block = $from.parent;
  if (block.type.name !== 'scriptLineBlock') return false;
  const index = CYCLE_TYPES.indexOf(block.attrs.blockType);
  if (index === -1) return false; // tiêu đề Trang / Panel / Cảnh giữ nguyên
  const nextType = CYCLE_TYPES[(index + step + CYCLE_TYPES.length) % CYCLE_TYPES.length];
  view.dispatch(
    state.tr.setNodeMarkup($from.before(), undefined, {
      ...block.attrs,
      blockType: nextType,
      ...(nextType === 'dialogue' ? {} : { speakerName: null, speakerCharacterId: null }),
    }),
  );
  return true;
}
