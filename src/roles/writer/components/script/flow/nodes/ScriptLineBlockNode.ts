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

const ADD_BUTTON_CLASS =
  'cursor-pointer select-none text-xs font-semibold px-2 py-0.5 rounded-md border bg-white transition-colors shadow-2xs';

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
          attributes.sceneNumber
            ? { 'data-scene-number': attributes.sceneNumber }
            : {},
      },
      blockType: {
        default: 'stage_direction' as MangaBlockType,
        parseHTML: (element) => (element.getAttribute('data-block-type') as MangaBlockType) || 'stage_direction',
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
    return [
      {
        tag: 'div[data-script-line-id]',
      },
      {
        tag: 'div[data-block-type]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const blockType = (HTMLAttributes['data-block-type'] || 'caption') as MangaBlockType;
    const inPanel = HTMLAttributes['data-in-panel'] === 'true';

    const panelIndent = inPanel && blockType !== 'page_heading' && blockType !== 'panel_heading' && blockType !== 'scene_heading'
      ? 'pl-3 ml-1 '
      : '';
    let classNames = `script-block font-mono my-1 transition-all duration-150 outline-none ${panelIndent}`;

    switch (blockType) {
      case 'scene_heading':
        classNames += 'font-bold uppercase tracking-wider text-base text-gray-900 border-b border-gray-300 pb-1 mt-4 mb-2 flex items-center justify-between group';
        return [
          'div',
          mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }),
          ['span', { class: 'scene-heading-content flex-1' }, 0],
          [
            'button',
            {
              type: 'button',
              class:
                'scene-delete-btn ml-auto cursor-pointer select-none text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md transition-all shadow-2xs opacity-0 group-hover:opacity-100 focus:opacity-100',
              contenteditable: 'false',
              title: 'Xóa cảnh này',
            },
            '✕ Xóa cảnh',
          ],
        ];

      case 'page_heading':
        // A. KHỐI TIÊU ĐỀ TRANG (PAGE_HEADING): Viền cam #C2410C 2px, nền #FFF2E6, bo góc 12px
        classNames += 'font-bold uppercase tracking-wider text-xs sm:text-sm text-[#C2410C] bg-[#FFF2E6] border-2 border-[#C2410C] px-4 py-2.5 mt-6 mb-3 rounded-[12px] shadow-sm flex items-center justify-between gap-2.5 select-text group';
        return [
          'div',
          mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }),
          ['span', { class: 'page-heading-content flex-1' }, 0],
          [
            'button',
            {
              type: 'button',
              class: `page-add-panel-btn ${ADD_BUTTON_CLASS} text-[#C2410C] border-[#C2410C]/30 hover:bg-orange-50`,
              contenteditable: 'false',
              title: 'Thêm panel trống vào cuối trang này',
            },
            '+ Panel',
          ],
          [
            'button',
            {
              type: 'button',
              class:
                'page-delete-btn ml-auto cursor-pointer select-none text-[11px] font-semibold text-rose-600 bg-white/70 hover:bg-rose-50 hover:text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md transition-all shadow-2xs opacity-0 group-hover:opacity-100 focus:opacity-100',
              contenteditable: 'false',
              title: 'Xóa trang này',
            },
            '✕ Xóa trang',
          ],
          [
            'button',
            {
              type: 'button',
              class:
                'page-toggle-btn cursor-pointer select-none text-[11px] font-semibold text-[#C2410C] bg-white/70 hover:bg-white border border-[#C2410C]/30 px-2.5 py-0.5 rounded-md transition-all shadow-2xs',
              contenteditable: 'false',
            },
            '▼ Thu gọn',
          ],
        ];

      case 'panel_heading': {
        // B. KHỐI TIÊU ĐỀ KHUNG (PANEL_HEADING): Viền trái tím #4F46E5 4px, nền xám nhạt #F8FAFC
        classNames += 'font-bold text-xs uppercase tracking-wide text-slate-800 bg-[#F8FAFC] border-l-4 border-[#4F46E5] px-3.5 py-2 mt-4 mb-2 rounded-r-lg shadow-2xs flex items-center gap-2 select-text group';
        return [
          'div',
          mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }),
          ['span', { class: 'panel-heading-text flex-1' }, 0],
          [
            'button',
            {
              type: 'button',
              class: `panel-add-dialogue-btn ${ADD_BUTTON_CLASS} text-[#4F46E5] border-indigo-200 hover:bg-indigo-50`,
              contenteditable: 'false',
              title: 'Thêm bóng thoại vào cuối panel này',
            },
            '+ Thoại',
          ],
          [
            'button',
            {
              type: 'button',
              class:
                'panel-delete-btn ml-auto cursor-pointer select-none text-[11px] font-semibold text-rose-600 bg-white hover:bg-rose-50 hover:text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md transition-all shadow-2xs opacity-0 group-hover:opacity-100 focus:opacity-100',
              contenteditable: 'false',
              title: 'Xóa khung này',
            },
            '✕ Xóa khung',
          ],
        ];
      }

      case 'caption':
      case 'stage_direction':
        // C. LỜI DẪN TRUYỆN: Chữ thường đứng, màu #334155, 14px, gõ tự do bình thường
        classNames += 'font-sans text-[14px] text-[#334155] py-0.5 my-1 leading-relaxed not-italic outline-none';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'character':
        // D. TÊN NHÂN VẬT: Thẻ chip bo tròn, nền tím nhạt, chữ tím đậm #4338CA, có chấm màu đại diện
        classNames += 'font-sans font-bold text-xs uppercase tracking-wide text-[#4338CA] bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full shadow-2xs inline-flex items-center gap-1.5 ml-6 sm:ml-12 mt-3 mb-1';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'dialogue':
        // E. LỜI THOẠI: In nghiêng, màu #0F172A, 15px, thụt lề nhẹ vào trong giống bong bóng thoại
        classNames += 'font-sans italic text-[#0F172A] text-[15px] ml-6 sm:ml-12 pl-3.5 border-l-2 border-indigo-200 my-1.5 leading-relaxed';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'sfx':
        // F. HIỆU ỨNG ÂM THANH (SFX): Huy hiệu vàng hổ phách, tia chớp ⚡, font Monospace kỹ thuật nổi bật
        classNames += 'font-mono text-xs sm:text-sm my-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-[#FFFBEB] text-amber-950 flex items-center gap-2.5 shadow-2xs not-italic';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      case 'transition':
        classNames += 'font-semibold uppercase text-right text-gray-500 text-xs tracking-widest my-2';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];

      default:
        classNames += 'text-gray-800 text-sm';
        return ['div', mergeAttributes(HTMLAttributes, { class: classNames, 'data-block-type': blockType }), 0];
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

        if ((currentBlock.type.name !== this.name && currentBlock.type.name !== 'paragraph') || !empty) {
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
            state.schema.text(defaultText)
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
            state.schema.text(defaultText)
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
            state.schema.text(defaultText)
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
            state.schema.text(defaultText)
          );

          const tr = state.tr.replaceWith(from, to, newBlock);
          tr.setSelection(TextSelection.create(tr.doc, from + 1 + defaultText.length));
          view.dispatch(tr);
          return true;
        }

        // 2.3 Cho phép viết tự do: Không ép Tab chuyển sang character/dialogue
        return false;
      },

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

          // 3.0 Tiêu đề cảnh (scene_heading): Cho phép xóa cảnh nếu không phải cảnh đầu tiên
          if (currentType === 'scene_heading') {
            const isAtStartOrEmpty = (empty && $from.parentOffset === 0) || currentBlock.textContent.trim() === '';
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
            const isAtStartOrEmpty = (empty && $from.parentOffset === 0) || currentBlock.textContent.trim() === '';
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
            const isAtStartOrEmpty = (empty && $from.parentOffset === 0) || currentBlock.textContent.trim() === '';
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
            if (prevType === 'scene_heading' || prevType === 'page_heading' || prevType === 'panel_heading') {
              if (currentBlock.textContent.trim() === '') {
                const tr = state.tr.delete(from, to);
                const prevPos = Math.max(0, from - 1);
                tr.setSelection(TextSelection.create(tr.doc, Math.min(prevPos, tr.doc.content.size)));
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
            if (nextType === 'scene_heading' || nextType === 'page_heading' || nextType === 'panel_heading') {
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
          const dialogue = strictDialogueMatch[2].trim();
          const displayText = `@${speakerName} : "${dialogue}"`;

          const from = $from.before();
          const to = $from.after();
          const dialogueBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'dialogue',
              speakerName,
            },
            state.schema.text(displayText)
          );

          // Tạo một scriptLineBlock mặc định rỗng (caption) bên dưới cho phép viết tự do
          const nextBlock = state.schema.nodes.scriptLineBlock.create({
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: 'caption',
            narrationMode: 'Present',
          });

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
            state.schema.text(displayText)
          );

          // Dòng tiếp theo là caption cho phép viết tự do
          const nextBlock = state.schema.nodes.scriptLineBlock.create({
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: 'caption',
            narrationMode: 'Present',
          });

          return editor.commands.command(({ tr, dispatch }) => {
            tr.replaceWith(from, to, [sfxBlock, nextBlock]);
            const insertPos = from + sfxBlock.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, insertPos));
            if (dispatch) dispatch(tr);
            return true;
          });
        }

        // 4.3 Phân tích Caption: Caption: ... hoặc Lời dẫn truyện: ...
        const captionMatch = rawText.match(/^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện):\s*(.*)/i);
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
            state.schema.text(displayText)
          );

          // Dòng tiếp theo là caption cho phép viết tự do
          const nextBlock = state.schema.nodes.scriptLineBlock.create({
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: 'caption',
            narrationMode: 'Present',
          });

          return editor.commands.command(({ tr, dispatch }) => {
            tr.replaceWith(from, to, [captionBlock, nextBlock]);
            const insertPos = from + captionBlock.nodeSize + 1;
            tr.setSelection(TextSelection.create(tr.doc, insertPos));
            if (dispatch) dispatch(tr);
            return true;
          });
        }

        // 4.4 Khi nhấn Enter trên Page hoặc Panel: chèn 1 dòng caption rỗng bên dưới
        if (
          currentType === 'page_heading' ||
          currentType === 'panel_heading' ||
          currentBlock.type.name === 'pageBlock' ||
          currentBlock.type.name === 'panelBlock'
        ) {
          const emptyActionBlock = state.schema.nodes.scriptLineBlock.create({
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: 'caption',
            narrationMode: 'Present',
          });

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

        // 4.6 Nếu con trỏ ở cuối dòng: tạo khối caption tiếp theo bên dưới
        const emptyBlock = state.schema.nodes.scriptLineBlock.create({
          scriptLineId: generateGuid(),
          sceneId: currentBlock.attrs?.sceneId || null,
          blockType: 'caption',
          narrationMode: 'Present',
        });

        const insertPos = $from.after();
        const tr = state.tr.insert(insertPos, emptyBlock);
        tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        view.dispatch(tr);
        return true;
      },
    };
  },
});
