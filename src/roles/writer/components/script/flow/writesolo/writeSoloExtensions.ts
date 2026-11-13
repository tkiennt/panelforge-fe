// src/roles/writer/components/script/flow/writesolo/writeSoloExtensions.ts
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { TextSelection } from '@tiptap/pm/state';
import { BibleEntryDto } from '@/services/bible.service';

/**
 * 10 Loại dòng chuẩn WriteSolo (Screenplay + Graphic Novel)
 */
export type WriteSoloBlockType =
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition'
  | 'page_heading'
  | 'panel_heading'
  | 'caption'
  | 'sfx';

export const WRITESOLO_CYCLE_TYPES: WriteSoloBlockType[] = [
  'action',
  'character',
  'dialogue',
  'parenthetical',
  'scene_heading',
  'transition',
  'panel_heading',
  'page_heading',
  'caption',
  'sfx',
];

export interface DetectedEntityInfo {
  name: string;
  category: 'Character' | 'Location' | 'Item' | 'Lore';
  isRegistered: boolean;
  bibleEntry?: BibleEntryDto;
  firstMentionPos: number;
}

export const writeSoloEntityPluginKey = new PluginKey<{
  decorations: DecorationSet;
  detectedEntities: DetectedEntityInfo[];
  activeSpeakers: string[];
}>('writeSoloEntityPlugin');

/**
 * Lấy danh sách các nhân vật đã xuất hiện trong kịch bản trước vị trí con trỏ (Gần nhất xếp đầu)
 */
export function getRecentSpeakers(doc: any, currentPos: number): string[] {
  const speakers: string[] = [];
  doc.descendants((node: any, pos: number) => {
    if (pos >= currentPos) return false;
    const isWriteSolo = node.type?.name === 'writeSoloBlock' || node.type === 'writeSoloBlock';
    if (isWriteSolo) {
      if (node.attrs?.blockType === 'character') {
        const spk = node.textContent?.trim().toUpperCase();
        if (spk && !speakers.includes(spk)) {
          speakers.push(spk);
        }
      } else if (node.attrs?.blockType === 'dialogue' && node.attrs.speakerName) {
        const spk = node.attrs.speakerName.trim().toUpperCase();
        if (spk && !speakers.includes(spk)) {
          speakers.push(spk);
        }
      }
    }
    return true;
  });
  return speakers.reverse();
}

/**
 * Kiểm tra xem nhân vật này có phải vừa nói ngay trước đó không (để thêm CONT'D)
 */
export function shouldAddContd(doc: any, currentPos: number, characterName: string): boolean {
  let lastSpeaker: string | null = null;
  doc.descendants((node: any, pos: number) => {
    if (pos >= currentPos) return false;
    const isWriteSolo = node.type?.name === 'writeSoloBlock' || node.type === 'writeSoloBlock';
    if (isWriteSolo && (node.attrs?.blockType === 'character' || node.attrs?.blockType === 'dialogue')) {
      const spk = (node.attrs?.speakerName || node.textContent || '').trim().toUpperCase();
      if (spk) lastSpeaker = spk;
    }
    return true;
  });
  return lastSpeaker === characterName.trim().toUpperCase();
}

/**
 * Đếm số Panel trong một Trang
 */
export function countPanelsForPage(doc: any, pageNumber: number): number {
  let count = 0;
  doc.descendants((node: any) => {
    const isWriteSolo = node.type?.name === 'writeSoloBlock' || node.type === 'writeSoloBlock';
    if (
      isWriteSolo &&
      node.attrs?.blockType === 'panel_heading' &&
      node.attrs.pageNumber === pageNumber
    ) {
      count++;
    }
  });
  return count;
}

/**
 * WriteSolo Unified Screenplay & Graphic Novel Block Node
 */
export const WriteSoloBlockNode = Node.create({
  name: 'writeSoloBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      blockType: {
        default: 'action' as WriteSoloBlockType,
        parseHTML: (el) => (el.getAttribute('data-block-type') as WriteSoloBlockType) || 'action',
        renderHTML: (attrs) => ({ 'data-block-type': attrs.blockType }),
      },
      pageNumber: {
        default: 1,
        parseHTML: (el) => parseInt(el.getAttribute('data-page-number') || '1', 10),
        renderHTML: (attrs) => ({ 'data-page-number': attrs.pageNumber }),
      },
      panelNumber: {
        default: 1,
        parseHTML: (el) => parseInt(el.getAttribute('data-panel-number') || '1', 10),
        renderHTML: (attrs) => ({ 'data-panel-number': attrs.panelNumber }),
      },
      speakerName: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-speaker-name'),
        renderHTML: (attrs) =>
          attrs.speakerName ? { 'data-speaker-name': attrs.speakerName } : {},
      },
      shotType: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-shot-type'),
        renderHTML: (attrs) => (attrs.shotType ? { 'data-shot-type': attrs.shotType } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block-type]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const blockType = (HTMLAttributes['data-block-type'] || 'action') as WriteSoloBlockType;
    const pageNum = HTMLAttributes['data-page-number'] || 1;
    const panelNum = HTMLAttributes['data-panel-number'] || 1;
    const textContent = node.textContent || '';
    const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;

    switch (blockType) {
      // 1. SCENE HEADING / SLUGLINE (INT./EXT. LOCATION - TIME)
      case 'scene_heading': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-scene-heading my-5 pt-3 pb-1 border-b-2 border-stone-800 font-mono font-bold text-[16px] text-stone-900 uppercase tracking-wider select-text',
          }),
          0,
        ];
      }

      // 2. CHARACTER LINE (ALL-CAPS, Centered)
      case 'character': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-character-line mt-5 mb-1 text-center font-mono font-bold text-[15px] uppercase tracking-widest text-[#171717] select-text',
          }),
          0,
        ];
      }

      // 3. PARENTHETICAL (e.g. (lying poorly))
      case 'parenthetical': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-parenthetical-line my-0.5 text-center font-mono italic text-[14px] text-stone-600 select-text',
          }),
          0,
        ];
      }

      // 4. DIALOGUE (Centered block)
      case 'dialogue': {
        const isWordy = wordCount > 30;
        const meterColor = isWordy ? 'text-amber-600' : 'text-stone-300';
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-dialogue-line max-w-[440px] sm:max-w-[480px] mx-auto my-1 mb-4 font-mono text-[15px] leading-relaxed text-[#171717] text-left relative group',
          }),
          ['div', { class: 'focus:outline-none' }, 0],
          [
            'span',
            {
              class: `absolute -right-10 top-0 text-[10px] font-mono select-none opacity-0 group-hover:opacity-100 transition-opacity ${meterColor}`,
              contenteditable: 'false',
            },
            `${wordCount}w`,
          ],
        ];
      }

      // 5. TRANSITION (Flush Right, uppercase e.g. CUT TO:)
      case 'transition': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-transition-line my-4 text-right font-mono font-bold text-[14px] uppercase tracking-widest text-stone-600 select-text',
          }),
          0,
        ];
      }

      // 6. GRAPHIC NOVEL: PAGE HEADING
      case 'page_heading': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-page-line my-8 pt-4 pb-1 border-b border-stone-300 select-none flex items-center justify-between',
            contenteditable: 'false',
          }),
          [
            'span',
            {
              class:
                'font-mono font-black text-[17px] tracking-wider text-[#171717] uppercase flex items-center gap-3',
            },
            `PAGE ${pageNum}  -  PANELS: ${panelNum}`,
          ],
          [
            'span',
            {
              class:
                'text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-[#C2410C] font-bold border border-[#C2410C]/20',
            },
            'Manga / Graphic Novel',
          ],
        ];
      }

      // 7. GRAPHIC NOVEL: PANEL HEADING
      case 'panel_heading': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-panel-line my-4 font-mono font-black text-[15px] tracking-widest text-[#171717] uppercase select-none flex items-center gap-3',
            contenteditable: 'false',
          }),
          ['span', `PANEL ${panelNum}`],
          [
            'span',
            {
              class:
                'text-[10px] font-sans px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 lowercase tracking-normal',
            },
            node.attrs.shotType || 'khung tranh',
          ],
        ];
      }

      // 8. CAPTION
      case 'caption': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-caption-line my-2.5 px-4 py-2 border-l-2 border-stone-500 bg-stone-100/50 font-mono italic text-[14px] text-stone-700 select-text',
          }),
          0,
        ];
      }

      // 9. SFX (Sound Effects)
      case 'sfx': {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-sfx-line my-2.5 font-mono font-bold italic tracking-widest text-[#64748B] uppercase text-[15px] select-text',
          }),
          0,
        ];
      }

      // 10. ACTION (Narrative default)
      case 'action':
      default: {
        return [
          'div',
          mergeAttributes(HTMLAttributes, {
            class:
              'writesolo-action-line my-2.5 font-mono text-[15px] leading-relaxed text-[#171717] select-text focus:outline-none',
          }),
          0,
        ];
      }
    }
  },
});

export interface WriteSoloExtensionOptions {
  getBibleEntries: () => BibleEntryDto[];
  onActiveBlockChange?: (blockType: WriteSoloBlockType, speakerName?: string) => void;
  onEntitiesDetected?: (entities: DetectedEntityInfo[]) => void;
}

/**
 * WriteSolo Screenplay & Graphic Novel Keyboard Engine (Tab, Enter, Backspace State Machine)
 */
export const WriteSoloExtension = Extension.create<WriteSoloExtensionOptions>({
  name: 'writeSoloEngine',

  addOptions() {
    return {
      getBibleEntries: () => [],
      onActiveBlockChange: undefined,
      onEntitiesDetected: undefined,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: writeSoloEntityPluginKey,
        state: {
          init(_, state) {
            return scanEntitiesAndBuildDecorations(state.doc, extension.options.getBibleEntries());
          },
          apply(tr, oldPluginState, _, newState) {
            if (!tr.docChanged) return oldPluginState;
            const res = scanEntitiesAndBuildDecorations(
              newState.doc,
              extension.options.getBibleEntries(),
            );
            if (extension.options.onEntitiesDetected) {
              extension.options.onEntitiesDetected(res.detectedEntities);
            }
            return res;
          },
        },
        props: {
          decorations(state) {
            return writeSoloEntityPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
          },
          // Tự động nhận diện INT./EXT. khi gõ để chuyển thành Scene Heading
          handleTextInput(view, from, to, text) {
            if (text === ' ' || text === '.') {
              const { state } = view;
              const { $from } = state.selection;
              const currentBlock = $from.parent;
              if (
                currentBlock.type.name === 'writeSoloBlock' &&
                currentBlock.attrs.blockType === 'action'
              ) {
                const currentText = currentBlock.textContent.toUpperCase().trim();
                if (
                  currentText === 'INT' ||
                  currentText === 'EXT' ||
                  currentText === 'INT.' ||
                  currentText === 'EXT.' ||
                  currentText === 'I/E'
                ) {
                  const blockPos = $from.before();
                  view.dispatch(
                    state.tr.setNodeMarkup(blockPos, undefined, {
                      ...currentBlock.attrs,
                      blockType: 'scene_heading',
                    }),
                  );
                  extension.options.onActiveBlockChange?.('scene_heading');
                }
              }
            }
            return false;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // =========================================================================
      // 1. PHÍM TAB: "The WriteSolo Tab Flow"
      // - Trên Action trống -> chuyển thành Character (hoặc luân chuyển các kiểu dòng)
      // - Trên Character -> Luân chuyển qua các nhân vật có sẵn trong kịch bản
      // =========================================================================
      Tab: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== 'writeSoloBlock') return false;

        const blockType = (currentBlock.attrs.blockType || 'action') as WriteSoloBlockType;
        const text = currentBlock.textContent.trim();
        const fromPos = $from.before();

        // 1A. DÒNG TRỐNG: Luân chuyển kiểu dòng hoặc chuyển nhanh Action -> Character
        if (text.length === 0) {
          // Action trống bấm Tab -> Trở thành Character (với nhân vật đối thoại gần nhất gợi ý)
          if (blockType === 'action') {
            const recent = getRecentSpeakers(state.doc, fromPos);
            const target = recent.length > 0 ? recent[0] : 'NANCY';

            const tr = state.tr
              .setNodeMarkup(fromPos, undefined, {
                ...currentBlock.attrs,
                blockType: 'character',
                speakerName: target,
              })
              .insertText(target, fromPos + 1);

            view.dispatch(tr);
            this.options.onActiveBlockChange?.('character', target);
            return true;
          }

          // Nếu đang ở kiểu khác -> Luân chuyển theo vòng lặp
          const currentIndex = WRITESOLO_CYCLE_TYPES.indexOf(blockType);
          const nextIndex = (currentIndex + 1) % WRITESOLO_CYCLE_TYPES.length;
          const nextType = WRITESOLO_CYCLE_TYPES[nextIndex];

          view.dispatch(
            state.tr.setNodeMarkup(fromPos, undefined, {
              ...currentBlock.attrs,
              blockType: nextType,
            }),
          );
          this.options.onActiveBlockChange?.(nextType);
          return true;
        }

        // 1B. DÒNG CHARACTER CÓ CHỮ: Tab xoay vòng danh sách nhân vật đã có trong kịch bản
        if (blockType === 'character') {
          const recent = getRecentSpeakers(state.doc, state.doc.content.size);
          const defaultPool = ['NANCY', 'FRED', 'AKIRA', 'KURO'];
          const speakerPool = Array.from(new Set([...recent, ...defaultPool]));

          const curText = text.toUpperCase();
          const idx = speakerPool.indexOf(curText);
          const nextSpeaker = speakerPool[(idx + 1) % speakerPool.length];

          // Thay thế toàn bộ text bằng nextSpeaker
          const tr = state.tr
            .delete(fromPos + 1, fromPos + 1 + currentBlock.content.size)
            .insertText(nextSpeaker, fromPos + 1);

          view.dispatch(tr);
          this.options.onActiveBlockChange?.('character', nextSpeaker);
          return true;
        }

        return false;
      },

      // Shift-Tab: Luân chuyển ngược
      'Shift-Tab': ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== 'writeSoloBlock') return false;
        if (currentBlock.textContent.trim().length > 0) return false;

        const blockType = (currentBlock.attrs.blockType || 'action') as WriteSoloBlockType;
        const fromPos = $from.before();

        const currentIndex = WRITESOLO_CYCLE_TYPES.indexOf(blockType);
        const prevIndex =
          (currentIndex - 1 + WRITESOLO_CYCLE_TYPES.length) % WRITESOLO_CYCLE_TYPES.length;
        const prevType = WRITESOLO_CYCLE_TYPES[prevIndex];

        view.dispatch(
          state.tr.setNodeMarkup(fromPos, undefined, {
            ...currentBlock.attrs,
            blockType: prevType,
          }),
        );
        this.options.onActiveBlockChange?.(prevType);
        return true;
      },

      // =========================================================================
      // 2. PHÍM ENTER: "The WriteSolo Forward Progression State Machine"
      // - Scene Heading -> Enter -> Action
      // - Character -> Enter -> Dialogue
      // - Parenthetical -> Enter -> Dialogue
      // - Dialogue -> Enter -> Action (hoặc Tab tiếp để sang Character)
      // - Page -> Enter -> Panel -> Enter -> Action
      // =========================================================================
      Enter: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;
        const currentBlock = $from.parent;

        if (currentBlock.type.name !== 'writeSoloBlock') return false;

        const blockType = (currentBlock.attrs.blockType || 'action') as WriteSoloBlockType;
        const text = currentBlock.textContent.trim();
        const fromPos = $from.before();
        const afterPos = $from.after();
        const pageNum = currentBlock.attrs.pageNumber || 1;
        const panelNum = currentBlock.attrs.panelNumber || 1;

        // 2A. Nếu đang ở dòng Dialogue rỗng -> Nhấn Enter unwraps về Action
        if (blockType === 'dialogue' && text.length === 0) {
          view.dispatch(
            state.tr.setNodeMarkup(fromPos, undefined, {
              ...currentBlock.attrs,
              blockType: 'action',
              speakerName: null,
            }),
          );
          return true;
        }

        // 2B. Sau Scene Heading -> Tự động sang Action
        if (blockType === 'scene_heading') {
          const actionNode = state.schema.nodes.writeSoloBlock.create({
            blockType: 'action',
            pageNumber: pageNum,
            panelNumber: panelNum,
          });
          const tr = state.tr.insert(afterPos, actionNode);
          tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          view.dispatch(tr);
          return true;
        }

        // 2C. Sau Character -> Tự động sang Dialogue! (Hoặc nếu gõ '(' thì sang Parenthetical)
        if (blockType === 'character') {
          // Bắt buộc Character Name viết hoa chuẩn Screenplay
          const upperName = text.toUpperCase();
          let tr = state.tr;
          if (text !== upperName && text.length > 0) {
            tr = tr
              .delete(fromPos + 1, fromPos + 1 + currentBlock.content.size)
              .insertText(upperName, fromPos + 1);
          }

          const dialogueNode = state.schema.nodes.writeSoloBlock.create({
            blockType: 'dialogue',
            speakerName: upperName,
            pageNumber: pageNum,
            panelNumber: panelNum,
          });

          tr = tr.insert(afterPos, dialogueNode);
          tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          view.dispatch(tr);
          return true;
        }

        // 2D. Sau Parenthetical -> Tự động sang Dialogue
        if (blockType === 'parenthetical') {
          // Tự động bọc ngoặc đơn nếu người viết chưa đóng
          let formatted = text;
          if (!formatted.startsWith('(')) formatted = `(${formatted}`;
          if (!formatted.endsWith(')')) formatted = `${formatted})`;

          let tr = state.tr;
          if (formatted !== text) {
            tr = tr
              .delete(fromPos + 1, fromPos + 1 + currentBlock.content.size)
              .insertText(formatted, fromPos + 1);
          }

          const dialogueNode = state.schema.nodes.writeSoloBlock.create({
            blockType: 'dialogue',
            pageNumber: pageNum,
            panelNumber: panelNum,
          });

          tr = tr.insert(afterPos, dialogueNode);
          tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          view.dispatch(tr);
          return true;
        }

        // 2E. Sau Dialogue -> Tự động sang Action (Nếu muốn đối thoại tiếp, người viết chỉ cần nhấn Tab)
        if (blockType === 'dialogue') {
          const actionNode = state.schema.nodes.writeSoloBlock.create({
            blockType: 'action',
            pageNumber: pageNum,
            panelNumber: panelNum,
            speakerName: null,
          });
          const tr = state.tr.insert(afterPos, actionNode);
          tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          view.dispatch(tr);
          return true;
        }

        // 2F. Graphic Novel: Page -> Panel -> Action
        if (blockType === 'page_heading') {
          const panelNode = state.schema.nodes.writeSoloBlock.create({
            blockType: 'panel_heading',
            pageNumber: pageNum,
            panelNumber: 1,
            shotType: '[Toàn cảnh]',
          });
          const tr = state.tr.insert(afterPos, panelNode);
          tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          view.dispatch(tr);
          return true;
        }

        if (blockType === 'panel_heading') {
          const actionNode = state.schema.nodes.writeSoloBlock.create({
            blockType: 'action',
            pageNumber: pageNum,
            panelNumber: panelNum,
          });
          const tr = state.tr.insert(afterPos, actionNode);
          tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
          view.dispatch(tr);
          return true;
        }

        // Mặc định: Tạo dòng Action mới
        const nextNode = state.schema.nodes.writeSoloBlock.create({
          blockType: 'action',
          pageNumber: pageNum,
          panelNumber: panelNum,
        });
        const tr = state.tr.insert(afterPos, nextNode);
        tr.setSelection(TextSelection.create(tr.doc, afterPos + 1));
        view.dispatch(tr);
        return true;
      },

      // Shift-Enter: Xuống dòng mềm trong cùng đoạn Action hoặc Dialogue
      'Shift-Enter': ({ editor }) => {
        return editor.commands.insertContent('<br>');
      },

      // Alt-Enter: Tách/thêm Panel mới tức thì
      'Alt-Enter': ({ editor }) => {
        const { state, view } = editor;
        const { $from } = state.selection;
        const currentBlock = $from.parent;
        const pageNum = currentBlock.attrs.pageNumber || 1;
        const nextPanelNum = (currentBlock.attrs.panelNumber || 1) + 1;
        const afterPos = $from.after();

        const panelNode = state.schema.nodes.writeSoloBlock.create({
          blockType: 'panel_heading',
          pageNumber: pageNum,
          panelNumber: nextPanelNum,
          shotType: '[Trung cảnh]',
        });

        const actionNode = state.schema.nodes.writeSoloBlock.create({
          blockType: 'action',
          pageNumber: pageNum,
          panelNumber: nextPanelNum,
        });

        const tr = state.tr.insert(afterPos, [panelNode, actionNode]);
        tr.setSelection(TextSelection.create(tr.doc, afterPos + panelNode.nodeSize + 1));
        view.dispatch(tr);
        return true;
      },

      // Ctrl-Enter / Cmd-Enter: Tách/thêm Trang mới tức thì
      'Mod-Enter': ({ editor }) => {
        const { state, view } = editor;
        const { $from } = state.selection;
        const currentBlock = $from.parent;
        const nextPageNum = (currentBlock.attrs.pageNumber || 1) + 1;
        const afterPos = $from.after();

        const pageNode = state.schema.nodes.writeSoloBlock.create({
          blockType: 'page_heading',
          pageNumber: nextPageNum,
          panelNumber: 1,
        });

        const panelNode = state.schema.nodes.writeSoloBlock.create({
          blockType: 'panel_heading',
          pageNumber: nextPageNum,
          panelNumber: 1,
          shotType: '[Toàn cảnh]',
        });

        const actionNode = state.schema.nodes.writeSoloBlock.create({
          blockType: 'action',
          pageNumber: nextPageNum,
          panelNumber: 1,
        });

        const tr = state.tr.insert(afterPos, [pageNode, panelNode, actionNode]);
        tr.setSelection(
          TextSelection.create(tr.doc, afterPos + pageNode.nodeSize + panelNode.nodeSize + 1),
        );
        view.dispatch(tr);
        return true;
      },

      // =========================================================================
      // 3. PHÍM BACKSPACE: "WriteSolo Graceful Unwrap"
      // Tại vị trí offset 0 của bất kỳ block nào (Character, Dialogue, Scene Heading...)
      // Nhấn Backspace -> Chuyển đổi an toàn về Action mà không xóa nội dung chữ!
      // =========================================================================
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;
        if ($from.parentOffset !== 0) return false;

        const currentBlock = $from.parent;
        if (currentBlock.type.name !== 'writeSoloBlock') return false;

        const blockType = currentBlock.attrs.blockType;
        if (blockType !== 'action') {
          const fromPos = $from.before();
          view.dispatch(
            state.tr.setNodeMarkup(fromPos, undefined, {
              ...currentBlock.attrs,
              blockType: 'action',
              speakerName: null,
            }),
          );
          this.options.onActiveBlockChange?.('action');
          return true;
        }

        return false;
      },
    };
  },
});

/**
 * Quét thụ động thực thể và trang trí inline highlight
 */
function scanEntitiesAndBuildDecorations(
  doc: any,
  bibleEntries: BibleEntryDto[],
): {
  decorations: DecorationSet;
  detectedEntities: DetectedEntityInfo[];
  activeSpeakers: string[];
} {
  const decos: Decoration[] = [];
  const detectedMap = new Map<string, DetectedEntityInfo>();
  const activeSpeakers: string[] = [];

  const bibleMap = new Map<string, BibleEntryDto>();
  for (const entry of bibleEntries) {
    bibleMap.set(entry.name.toLowerCase().trim(), entry);
    if (entry.code) bibleMap.set(entry.code.toLowerCase().trim(), entry);
  }

  doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'writeSoloBlock') {
      const isCharacter = node.attrs.blockType === 'character';
      const text = node.textContent?.trim() || '';

      if (isCharacter && text) {
        const spk = text.toUpperCase();
        if (!activeSpeakers.includes(spk)) activeSpeakers.push(spk);
        const lowerSpk = spk.toLowerCase();
        const matched = bibleMap.get(lowerSpk);
        if (!detectedMap.has(spk)) {
          detectedMap.set(spk, {
            name: spk,
            category: 'Character',
            isRegistered: Boolean(matched),
            bibleEntry: matched,
            firstMentionPos: pos,
          });
        }
      }

      if (node.isText) {
        const str = node.text || '';
        const nameRegex = /\b[A-ZÀ-Ỹ][a-zà-ỹA-Z0-9_-]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹA-Z0-9_-]+)*\b/g;
        let match;
        while ((match = nameRegex.exec(str)) !== null) {
          const rawName = match[0];
          const lower = rawName.toLowerCase();
          const from = pos + match.index;
          const to = from + rawName.length;

          const bibleMatch = bibleMap.get(lower);
          if (bibleMatch) {
            decos.push(
              Decoration.inline(from, to, {
                class:
                  'writesolo-entity-canon bg-[#FFF1F2] text-[#E11D48] px-1 py-0.5 rounded border-b border-[#E11D48]/40 font-semibold cursor-pointer',
                title: `${bibleMatch.name} (${bibleMatch.category}) - Canon Series Bible`,
              }),
            );

            if (!detectedMap.has(rawName)) {
              detectedMap.set(rawName, {
                name: rawName,
                category: bibleMatch.category as any,
                isRegistered: true,
                bibleEntry: bibleMatch,
                firstMentionPos: from,
              });
            }
          } else if (
            rawName.length >= 3 &&
            !['PANEL', 'TRANG', 'PAGE', 'SFX', 'THOẠI', 'CAPTION', 'INT', 'EXT', 'DAY', 'NIGHT'].includes(
              rawName.toUpperCase(),
            )
          ) {
            decos.push(
              Decoration.inline(from, to, {
                class:
                  'writesolo-entity-unregistered border-b-2 border-dashed border-[#D97706] text-[#B45309] px-0.5 cursor-pointer',
                title: `${rawName}: Tên mới chưa có trong Series Bible`,
              }),
            );

            if (!detectedMap.has(rawName)) {
              detectedMap.set(rawName, {
                name: rawName,
                category: 'Character',
                isRegistered: false,
                firstMentionPos: from,
              });
            }
          }
        }
      }
    }
  });

  return {
    decorations: DecorationSet.create(doc, decos),
    detectedEntities: Array.from(detectedMap.values()),
    activeSpeakers,
  };
}
