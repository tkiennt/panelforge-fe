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
import {
  nextKindOnEnter,
  nextKindOnTab,
  ScriptFocusLocation,
} from '../grammar/scriptGrammar';

export interface RecentSpeaker {
  name: string;
  characterId: string | null;
}

/** Lấy danh sách các nhân vật gần nhất xuất hiện trước con trỏ (kèm characterId) */
export function getRecentSpeakersFromDoc(doc: any, currentPos: number): RecentSpeaker[] {
  const speakers: RecentSpeaker[] = [];
  doc.descendants((node: any, pos: number) => {
    if (pos >= currentPos) return false;
    if (node.type?.name === 'scriptLineBlock') {
      const spk = node.attrs?.speakerName;
      const charId = node.attrs?.speakerCharacterId || null;
      if (spk && typeof spk === 'string' && spk.trim()) {
        const trimmed = spk.trim();
        const idx = speakers.findIndex((s) => s.name.toUpperCase() === trimmed.toUpperCase());
        if (idx !== -1) {
          const existingCharId = speakers[idx].characterId;
          speakers.splice(idx, 1);
          speakers.push({ name: trimmed, characterId: charId || existingCharId });
        } else {
          speakers.push({ name: trimmed, characterId: charId });
        }
      }
    }
    return true;
  });
  return speakers;
}

/** Luân phiên người nói A -> B -> A (bảo toàn speakerCharacterId cho Bible & Lettering) */
export function getAlternatingSpeaker(
  doc: any,
  currentPos: number,
  currentSpeaker?: string | null,
): RecentSpeaker | null {
  const recent = getRecentSpeakersFromDoc(doc, currentPos);
  if (recent.length === 0) return null;
  if (recent.length === 1) return recent[0];

  const lastSpeaker = currentSpeaker?.trim() || recent[recent.length - 1].name;
  if (lastSpeaker && lastSpeaker.toUpperCase() === recent[recent.length - 1].name.toUpperCase()) {
    return recent[recent.length - 2];
  }
  return recent[recent.length - 1];
}

function getFocusLocation(blockType: MangaBlockType): ScriptFocusLocation {
  switch (blockType) {
    case 'page_heading':
      return 'page';
    case 'panel_heading':
      return 'panel';
    case 'stage_direction':
      return 'action';
    case 'dialogue':
      return 'dialogue';
    case 'thought':
      return 'thought';
    case 'caption':
      return 'narration';
    case 'sfx':
      return 'sfx';
    default:
      return 'action';
  }
}

function getLocationBlockType(location: ScriptFocusLocation): MangaBlockType {
  switch (location) {
    case 'page':
      return 'page_heading';
    case 'panel':
      return 'panel_heading';
    case 'action':
      return 'stage_direction';
    case 'speaker':
    case 'dialogue':
      return 'dialogue';
    case 'thought':
      return 'thought';
    case 'narration':
      return 'caption';
    case 'sfx':
      return 'sfx';
    default:
      return 'stage_direction';
  }
}

function morphCurrentBlock(editor: any, targetType: MangaBlockType): boolean {
  const { state, view } = editor;
  const { $from } = state.selection;
  const block = $from.parent;
  if (block.type.name !== 'scriptLineBlock') return false;
  if (block.attrs?.blockType === 'page_heading' || block.attrs?.blockType === 'panel_heading') return false;

  let speakerName: string | null = null;
  let speakerCharacterId: string | null = null;
  if (targetType === 'dialogue' || targetType === 'thought') {
    const alt = getAlternatingSpeaker(state.doc, $from.before(), null);
    speakerName = block.attrs?.speakerName || alt?.name || null;
    speakerCharacterId = block.attrs?.speakerCharacterId || alt?.characterId || null;
  }

  view.dispatch(
    state.tr.setNodeMarkup($from.before(), undefined, {
      ...block.attrs,
      blockType: targetType,
      speakerName,
      speakerCharacterId,
    }),
  );
  return true;
}

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

      // Định dạng graphic novel: Cột trái (Nhân vật / SFX / Lời dẫn) - Cột phải (Lời thoại / Nội dung)
      case 'dialogue':
      case 'thought':
      case 'caption':
      case 'sfx': {
        const speaker = node.attrs.speakerName as string | null;
        const label =
          blockType === 'sfx'
            ? 'SFX'
            : blockType === 'caption'
              ? 'Dẫn truyện'
              : blockType === 'thought'
                ? (speaker ? `${speaker} (Nghĩ)` : 'Suy nghĩ')
                : (speaker || 'Thoại');
        const textClass =
          blockType === 'sfx'
            ? 'dialogue-text font-studio text-[15px] leading-7 font-bold italic tracking-wide text-stone-900'
            : blockType === 'caption'
              ? 'dialogue-text font-serif italic text-[15px] leading-7 text-stone-800'
              : blockType === 'thought'
                ? 'dialogue-text font-studio text-[15px] leading-7 italic text-stone-700'
                : 'dialogue-text font-studio text-[15px] leading-7 text-stone-900';
        return [
          'div',
          attrs('script-line grid grid-cols-[minmax(7rem,11rem)_1fr] gap-x-4 my-1.5 items-baseline'),
          [
            'span',
            {
              class: `script-line-label font-studio text-sm leading-7 uppercase tracking-wide select-none cursor-pointer ${
                label ? 'font-semibold text-stone-700' : 'text-stone-400'
              }`,
              contenteditable: 'false',
              title: blockType === 'dialogue' || blockType === 'thought' ? 'Nhấp để đổi nhân vật' : undefined,
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
      // 1. Phím tắt số: Ctrl+1..5 đổi loại dòng trực tiếp
      'Mod-1': ({ editor }) => morphCurrentBlock(editor, 'stage_direction'),
      'Mod-2': ({ editor }) => morphCurrentBlock(editor, 'dialogue'),
      'Mod-3': ({ editor }) => morphCurrentBlock(editor, 'thought'),
      'Mod-4': ({ editor }) => morphCurrentBlock(editor, 'caption'),
      'Mod-5': ({ editor }) => morphCurrentBlock(editor, 'sfx'),

      // 2. Phím tắt cấu trúc: Ctrl+Enter (Panel mới), Ctrl+Shift+Enter (Trang mới)
      'Mod-Enter': ({ editor }) => {
        const { state, view } = editor;
        const { $from } = state.selection;
        const currentBlock = $from.parent;
        const to = $from.after();
        const { pageNum, panelNum } = getNextPanelNumber(state.doc, to);
        const defaultText = `" Panel ${pageNum}.${panelNum}: [Toàn cảnh] `;

        const panelBlock = state.schema.nodes.scriptLineBlock.create(
          {
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: 'panel_heading',
            pageNumber: pageNum,
            panelNumber: panelNum,
          },
          state.schema.text(defaultText),
        );
        const actionBlock = state.schema.nodes.scriptLineBlock.create(
          nextActionAttrs({ ...currentBlock.attrs, pageNumber: pageNum, panelNumber: panelNum, inPanel: true }),
        );
        const tr = state.tr.insert(to, [panelBlock, actionBlock]);
        tr.setSelection(TextSelection.create(tr.doc, to + panelBlock.nodeSize + 1));
        view.dispatch(tr);
        if (typeof setTimeout === 'function') {
          setTimeout(() => renumberEditorState(editor, to + 1), 0);
        }
        return true;
      },

      'Mod-Shift-Enter': ({ editor }) => {
        const { state, view } = editor;
        const { $from } = state.selection;
        const currentBlock = $from.parent;
        const to = $from.after();
        const nextPage = getNextPageNumber(state.doc, to);
        const pStr = String(nextPage).padStart(2, '0');
        const defaultPageText = `Trang ${pStr}`;
        const defaultPanelText = `" Panel ${nextPage}.1: [Toàn cảnh] `;

        const pageBlock = state.schema.nodes.scriptLineBlock.create(
          {
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: 'page_heading',
            pageNumber: nextPage,
            panelNumber: 0,
          },
          state.schema.text(defaultPageText),
        );
        const panelBlock = state.schema.nodes.scriptLineBlock.create(
          {
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: 'panel_heading',
            pageNumber: nextPage,
            panelNumber: 1,
          },
          state.schema.text(defaultPanelText),
        );
        const actionBlock = state.schema.nodes.scriptLineBlock.create(
          nextActionAttrs({ ...currentBlock.attrs, pageNumber: nextPage, panelNumber: 1, inPanel: true }),
        );
        const tr = state.tr.insert(to, [pageBlock, panelBlock, actionBlock]);
        tr.setSelection(TextSelection.create(tr.doc, to + pageBlock.nodeSize + panelBlock.nodeSize + 1));
        view.dispatch(tr);
        if (typeof setTimeout === 'function') {
          setTimeout(() => renumberEditorState(editor, to + 1), 0);
        }
        return true;
      },

      // 3. Tab: Luân chuyển loại dòng theo hàm thuần nextKindOnTab (Action -> Dialogue -> Narration -> SFX -> Action)
      Tab: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== this.name && currentBlock.type.name !== 'paragraph') {
          return false;
        }

        const currentType = (currentBlock.attrs?.blockType || 'stage_direction') as MangaBlockType;
        const location = getFocusLocation(currentType);

        const transition = nextKindOnTab(location, 'forward');
        if (!transition) return false;

        const targetType = getLocationBlockType(transition.target);
        const from = $from.before();

        if (targetType === 'dialogue') {
          const alternatingSpeaker = getAlternatingSpeaker(state.doc, from, null);
          view.dispatch(
            state.tr.setNodeMarkup(from, undefined, {
              ...currentBlock.attrs,
              blockType: 'dialogue',
              speakerName: currentBlock.attrs?.speakerName || alternatingSpeaker?.name || null,
              speakerCharacterId: currentBlock.attrs?.speakerCharacterId || alternatingSpeaker?.characterId || null,
            }),
          );
          return true;
        }

        view.dispatch(
          state.tr.setNodeMarkup(from, undefined, {
            ...currentBlock.attrs,
            blockType: targetType,
            speakerName: null,
            speakerCharacterId: null,
          }),
        );
        return true;
      },

      // 4. Shift+Tab: Luân chuyển ngược theo hàm thuần nextKindOnTab (Bảng H.1)
      'Shift-Tab': ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== this.name && currentBlock.type.name !== 'paragraph') {
          return false;
        }

        const currentType = (currentBlock.attrs?.blockType || 'stage_direction') as MangaBlockType;
        if (currentType === 'page_heading' || currentType === 'panel_heading' || currentType === 'scene_heading') {
          return false;
        }

        const from = $from.before();

        // 4.1 Dialogue hoặc Thought -> Lùi về ô người nói (Bảng H.1: Dialogue -> Shift+Tab -> Ô người nói)
        if (currentType === 'dialogue' || currentType === 'thought') {
          const domNode = view.nodeDOM(from) as HTMLElement | null;
          const labelEl = domNode?.querySelector('.script-line-label') as HTMLElement | null;
          const rect = labelEl ? labelEl.getBoundingClientRect() : null;
          view.dom.dispatchEvent(
            new CustomEvent('panelforge:open-speaker-picker', {
              detail: {
                nodePos: from,
                rect,
                currentName: currentBlock.attrs.speakerName || '',
                currentCharacterId: currentBlock.attrs.speakerCharacterId || null,
                blockType: currentType,
              },
            }),
          );
          return true;
        }

        // 4.2 Narration (caption) -> Shift+Tab -> Dialogue
        if (currentType === 'caption') {
          const alt = getAlternatingSpeaker(state.doc, from, null);
          view.dispatch(
            state.tr.setNodeMarkup(from, undefined, {
              ...currentBlock.attrs,
              blockType: 'dialogue',
              speakerName: alt?.name || null,
              speakerCharacterId: alt?.characterId || null,
            }),
          );
          return true;
        }

        // 4.3 SFX -> Shift+Tab -> Narration (caption)
        if (currentType === 'sfx') {
          view.dispatch(
            state.tr.setNodeMarkup(from, undefined, {
              ...currentBlock.attrs,
              blockType: 'caption',
              speakerName: null,
              speakerCharacterId: null,
            }),
          );
          return true;
        }

        // 4.4 Action -> Shift+Tab không làm gì (Bảng H.1)
        return false;
      },

      // 5. Backspace: Lùi một bậc theo bảng H.1 kèm tự động đánh số lại
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        const currentBlock = $from.parent;
        const from = $from.before();
        const to = $from.after();

        if (currentBlock.type.name === this.name) {
          const currentType = currentBlock.attrs.blockType || 'stage_direction';

          // 5.1 Backspace ở đầu lời thoại có tên người nói: bỏ nhãn người nói trước
          if (
            (currentType === 'dialogue' || currentType === 'thought') &&
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

          // 5.2 Backspace ở đầu lời thoại KHÔNG có tên người nói: lùi một bậc về Action
          if (
            (currentType === 'dialogue' || currentType === 'thought') &&
            !currentBlock.attrs.speakerName &&
            empty &&
            $from.parentOffset === 0
          ) {
            view.dispatch(
              state.tr.setNodeMarkup(from, undefined, {
                ...currentBlock.attrs,
                blockType: 'stage_direction',
                speakerName: null,
                speakerCharacterId: null,
              }),
            );
            return true;
          }

          // 5.3 Backspace ở đầu dòng SFX trống: lùi một bậc về Narration (caption)
          if (
            currentType === 'sfx' &&
            empty &&
            $from.parentOffset === 0 &&
            currentBlock.textContent.trim() === ''
          ) {
            view.dispatch(
              state.tr.setNodeMarkup(from, undefined, {
                ...currentBlock.attrs,
                blockType: 'caption',
                speakerName: null,
                speakerCharacterId: null,
              }),
            );
            return true;
          }

          // 5.4 Backspace ở đầu dòng Narration (caption) trống: lùi một bậc về Dialogue
          if (
            currentType === 'caption' &&
            empty &&
            $from.parentOffset === 0 &&
            currentBlock.textContent.trim() === ''
          ) {
            const alt = getAlternatingSpeaker(state.doc, from, null);
            view.dispatch(
              state.tr.setNodeMarkup(from, undefined, {
                ...currentBlock.attrs,
                blockType: 'dialogue',
                speakerName: alt?.name || null,
                speakerCharacterId: alt?.characterId || null,
              }),
            );
            return true;
          }

          // Tiêu đề cảnh: không thể xóa cảnh đầu tiên
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
              return true;
            } else {
              const tr = state.tr.delete(from, to);
              try {
                const targetPos = Math.max(0, Math.min(from - 1, tr.doc.content.size));
                tr.setSelection(Selection.near(tr.doc.resolve(targetPos), -1));
              } catch {
                // Vị trí vượt khỏi tài liệu: giữ selection mặc định
              }
              view.dispatch(tr);
              if (typeof setTimeout === 'function') {
                setTimeout(() => renumberEditorState(editor), 0);
              }
              return true;
            }
          }

          // Tiêu đề trang: không thể xóa trang đầu tiên
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
              return true;
            } else {
              const tr = state.tr.delete(from, to);
              try {
                const targetPos = Math.max(0, Math.min(from - 1, tr.doc.content.size));
                tr.setSelection(Selection.near(tr.doc.resolve(targetPos), -1));
              } catch {
                // giữ selection mặc định
              }
              view.dispatch(tr);
              if (typeof setTimeout === 'function') {
                setTimeout(() => renumberEditorState(editor), 0);
              }
              return true;
            }
          }

          // Cho phép xóa Panel bằng Backspace khi con trỏ ở đầu dòng hoặc khối trống
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
            } catch {
              // giữ selection mặc định
            }
            view.dispatch(tr);
            if (typeof setTimeout === 'function') {
              setTimeout(() => renumberEditorState(editor), 0);
            }
            return true;
          }

          // Hoàn nguyên SFX / Dialogue / Thought / Caption về Action (stage_direction)
          if (empty && $from.parentOffset === 0) {
            if (['sfx', 'dialogue', 'thought', 'caption'].includes(currentType)) {
              return editor.commands.updateAttributes(this.name, {
                blockType: 'stage_direction',
                speakerName: null,
                speakerCharacterId: null,
              });
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

      // 6. Delete: Cho phép xóa xuôi các khối heading rỗng và chặn joinForward làm hỏng heading
      Delete: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, empty } = selection;
        if (!empty) return false;

        const currentBlock = $from.parent;
        const from = $from.before();
        const to = $from.after();

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

      // 7. Enter: Xử lý theo hàm thuần nextKindOnEnter (Bảng H.1) - Không regex, không ký tự mồi
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== this.name && currentBlock.type.name !== 'paragraph') {
          return false;
        }

        const rawText = currentBlock.textContent.trim();
        const isEmpty = rawText.length === 0;
        const currentType = (currentBlock.attrs?.blockType || 'stage_direction') as MangaBlockType;
        const location = getFocusLocation(currentType);

        const transition = nextKindOnEnter(location, isEmpty);
        if (!transition) return false;

        const from = $from.before();
        const to = $from.after();

        // 7.1 Nếu transition là morph_block (Enter trên dòng trống của thoại/thought/caption/sfx -> quay về action)
        if (transition.action === 'morph_block') {
          const targetType = getLocationBlockType(transition.target);
          view.dispatch(
            state.tr.setNodeMarkup(from, undefined, {
              ...currentBlock.attrs,
              blockType: targetType,
              speakerName: null,
              speakerCharacterId: null,
            }),
          );
          return true;
        }

        // 7.15 Tách đôi dòng nếu con trỏ ở giữa chuỗi (parentOffset < content.size)
        if (
          $from.parentOffset < currentBlock.content.size &&
          !['page_heading', 'panel_heading', 'scene_heading'].includes(currentType)
        ) {
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

        // 7.2 Khi nhấn Enter trên Page: tạo Panel mới bên dưới
        if (currentType === 'page_heading') {
          const pageNum = currentBlock.attrs?.pageNumber || 1;
          const { panelNum } = getNextPanelNumber(state.doc, to);
          const defaultPanelText = `" Panel ${pageNum}.${panelNum}: [Toàn cảnh] `;
          const newPanelBlock = state.schema.nodes.scriptLineBlock.create(
            {
              scriptLineId: generateGuid(),
              sceneId: currentBlock.attrs?.sceneId || null,
              blockType: 'panel_heading',
              pageNumber: pageNum,
              panelNumber: panelNum,
              lineOrder: (currentBlock.attrs?.lineOrder || 0) + 1,
            },
            state.schema.text(defaultPanelText),
          );
          const tr = state.tr.insert(to, newPanelBlock);
          tr.setSelection(TextSelection.create(tr.doc, to + 1 + defaultPanelText.length));
          view.dispatch(tr);
          if (typeof setTimeout === 'function') {
            setTimeout(() => renumberEditorState(editor, to + 1), 0);
          }
          return true;
        }

        // 7.3 Khi nhấn Enter trên Panel: tạo dòng hành động (Action) bên dưới
        if (currentType === 'panel_heading') {
          const newActionBlock = state.schema.nodes.scriptLineBlock.create(
            nextActionAttrs(currentBlock.attrs),
          );
          const tr = state.tr.insert(to, newActionBlock);
          tr.setSelection(TextSelection.create(tr.doc, to + 1));
          view.dispatch(tr);
          return true;
        }

        // 7.4 Khi nhấn Enter trên Action (stage_direction):
        if (currentType === 'stage_direction') {
          if (isEmpty) {
            // Enter trên Action rỗng -> Tạo Panel mới! (Enter 2 lần tạo Panel)
            const { pageNum, panelNum } = getNextPanelNumber(state.doc, from);
            const defaultPanelText = `" Panel ${pageNum}.${panelNum}: [Toàn cảnh] `;
            const newPanelBlock = state.schema.nodes.scriptLineBlock.create(
              {
                scriptLineId: currentBlock.attrs?.scriptLineId || generateGuid(),
                sceneId: currentBlock.attrs?.sceneId || null,
                blockType: 'panel_heading',
                pageNumber: pageNum,
                panelNumber: panelNum,
                lineOrder: currentBlock.attrs?.lineOrder || 1,
              },
              state.schema.text(defaultPanelText),
            );
            const tr = state.tr.replaceWith(from, to, newPanelBlock);
            tr.setSelection(TextSelection.create(tr.doc, from + 1 + defaultPanelText.length));
            view.dispatch(tr);
            if (typeof setTimeout === 'function') {
              setTimeout(() => renumberEditorState(editor, from + 1), 0);
            }
            return true;
          }

          // Có chữ: nếu con trỏ ở giữa dòng -> tách dòng
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

          // Con trỏ ở cuối dòng -> tạo dòng hành động mới
          const emptyActionBlock = state.schema.nodes.scriptLineBlock.create(
            nextActionAttrs(currentBlock.attrs),
          );
          const tr = state.tr.insert(to, emptyActionBlock);
          tr.setSelection(TextSelection.create(tr.doc, to + 1));
          view.dispatch(tr);
          return true;
        }

        // 7.5 Khi nhấn Enter trên Dialogue hoặc Thought có chữ:
        // Tạo dòng thoại mới với người nói gợi ý luân phiên A -> B -> A kèm speakerCharacterId!
        if (currentType === 'dialogue' || currentType === 'thought') {
          const nextSpeaker = getAlternatingSpeaker(
            state.doc,
            $from.pos,
            currentBlock.attrs.speakerName,
          );
          const newDialogueBlock = state.schema.nodes.scriptLineBlock.create({
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: currentType,
            speakerName: nextSpeaker?.name || null,
            speakerCharacterId: nextSpeaker?.characterId || null,
            narrationMode: currentBlock.attrs?.narrationMode || 'Present',
            pageNumber: currentBlock.attrs?.pageNumber ?? null,
            panelNumber: currentBlock.attrs?.panelNumber ?? null,
            inPanel: currentBlock.attrs?.inPanel ?? false,
          });
          const tr = state.tr.insert(to, newDialogueBlock);
          tr.setSelection(TextSelection.create(tr.doc, to + 1));
          view.dispatch(tr);
          return true;
        }

        // 7.6 Khi nhấn Enter trên Caption hoặc SFX: tạo dòng mới cùng loại
        if (currentType === 'caption' || currentType === 'sfx') {
          const newBlock = state.schema.nodes.scriptLineBlock.create({
            scriptLineId: generateGuid(),
            sceneId: currentBlock.attrs?.sceneId || null,
            blockType: currentType,
            narrationMode: currentBlock.attrs?.narrationMode || 'Present',
            pageNumber: currentBlock.attrs?.pageNumber ?? null,
            panelNumber: currentBlock.attrs?.panelNumber ?? null,
            inPanel: currentBlock.attrs?.inPanel ?? false,
          });
          const tr = state.tr.insert(to, newBlock);
          tr.setSelection(TextSelection.create(tr.doc, to + 1));
          view.dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});

