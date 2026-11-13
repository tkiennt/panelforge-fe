// src/roles/writer/components/script/flow/nodes/ScriptLineBlockNode.ts
/**
 * Editor kịch bản Graphic Novel kiểu WriterSolo: mỗi dòng là một node `scriptLine` mang loại phần tử `el`.
 * Nhãn PAGE/PANEL/CAPTION/SFX không nằm trong dữ liệu mà vẽ bằng decoration, nên chữ người viết luôn sạch.
 */
import { Extension, Node, mergeAttributes } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { EditorState, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  GN_ELEMENTS,
  GnElement,
  GnMove,
  completeCharacterName,
  onEnter,
  onShiftTab,
  onTab,
} from '../grammar/scriptGrammar';

export const GN_LINE = 'scriptLine';

export interface GnLabels {
  page: (pageNumber: number, panelCount: number) => string;
  panel: (panelNumber: number) => string;
  caption: string;
  sfx: string;
  acceptHint: string;
}

/** Tài liệu chỉ gồm các dòng scriptLine. */
export const ScriptDocument = Node.create({
  name: 'doc',
  topNode: true,
  content: `${GN_LINE}+`,
});

export const ScriptLineBlockNode = Node.create({
  name: GN_LINE,
  group: 'block',
  content: 'text*',
  marks: '',
  defining: true,

  addAttributes() {
    return {
      el: {
        default: 'action' as GnElement,
        parseHTML: (e) => (e.getAttribute('data-el') as GnElement) || 'action',
        renderHTML: (a) => ({ 'data-el': a.el }),
      },
      /** Id ScriptLine trên máy chủ (dòng nội dung) hoặc Id Panel (dòng panel); null với dòng mới. */
      refId: {
        default: null,
        parseHTML: (e) => e.getAttribute('data-ref-id'),
        renderHTML: (a) => (a.refId ? { 'data-ref-id': a.refId } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-el]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: `gn-line gn-${node.attrs.el}` }), 0];
  },
});

// ───────────────────────── trợ giúp thao tác ─────────────────────────

interface CurrentLine {
  node: PMNode;
  pos: number;
  el: GnElement;
  isEmpty: boolean;
  atEnd: boolean;
}

function currentLine(state: EditorState): CurrentLine | null {
  const { $from } = state.selection;
  const node = $from.parent;
  if (node.type.name !== GN_LINE) return null;
  return {
    node,
    pos: $from.before(),
    el: node.attrs.el as GnElement,
    isEmpty: node.content.size === 0,
    atEnd: $from.parentOffset === node.content.size,
  };
}

function lineNode(state: EditorState, el: GnElement) {
  return state.schema.nodes[GN_LINE].create({ el, refId: null });
}

/** Chèn một dòng mới loại `el` ngay sau dòng hiện tại và đặt con trỏ vào đó. */
export function insertLineAfter(editor: Editor, el: GnElement): boolean {
  const { state, view } = editor;
  const line = currentLine(state);
  if (!line) return false;
  const after = line.pos + line.node.nodeSize;
  const tr = state.tr.insert(after, lineNode(state, el));
  tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView();
  view.dispatch(tr);
  return true;
}

/**
 * Đổi loại dòng hiện tại. Trang không mang chữ (không có chỗ lưu), nên đổi một dòng có chữ thành Trang
 * sẽ chèn Trang mới bên dưới thay vì xoá chữ.
 */
export function setLineElement(editor: Editor, el: GnElement): boolean {
  const { state, view } = editor;
  const line = currentLine(state);
  if (!line) return false;
  if (line.el === el) return true;
  if (el === 'page' && !line.isEmpty) return insertLineAfter(editor, 'page');
  // Dòng panel giữ Id panel; đổi sang loại khác thì bỏ liên kết, và ngược lại.
  const keepRef = (line.el === 'panel') === (el === 'panel');
  view.dispatch(
    state.tr.setNodeMarkup(line.pos, undefined, {
      ...line.node.attrs,
      el,
      refId: keepRef ? line.node.attrs.refId : null,
    }),
  );
  return true;
}

// ───────────────────────── menu chọn loại dòng (Enter trên dòng trống) ─────────────────────────

export interface ElementMenuState {
  open: boolean;
  /** Vị trí trong GN_ELEMENTS đang được chọn. */
  index: number;
}

export const elementMenuKey = new PluginKey<ElementMenuState>('scriptElementMenu');

export function getElementMenu(state: EditorState): ElementMenuState {
  return elementMenuKey.getState(state) ?? { open: false, index: 0 };
}

function setElementMenu(editor: Editor, next: ElementMenuState): boolean {
  editor.view.dispatch(editor.state.tr.setMeta(elementMenuKey, next));
  return true;
}

export function closeElementMenu(editor: Editor): boolean {
  return setElementMenu(editor, { open: false, index: 0 });
}

/** Chọn một loại dòng trong menu: đổi dòng trống hiện tại sang loại đó rồi đóng menu. */
export function chooseElement(editor: Editor, el: GnElement): boolean {
  setLineElement(editor, el);
  return closeElementMenu(editor);
}

const ElementMenuPlugin = new Plugin<ElementMenuState>({
  key: elementMenuKey,
  state: {
    init: () => ({ open: false, index: 0 }),
    apply(tr, value) {
      const meta = tr.getMeta(elementMenuKey) as ElementMenuState | undefined;
      if (meta) return meta;
      // Gõ chữ hoặc di chuyển con trỏ thì menu tự đóng.
      if (value.open && (tr.docChanged || tr.selectionSet)) return { open: false, index: 0 };
      return value;
    },
  },
});

function applyMove(editor: Editor, move: GnMove): boolean {
  if (move.op === 'morph') return setLineElement(editor, move.to);
  if (move.op === 'insert') return insertLineAfter(editor, move.to);
  if (move.op === 'menu') {
    const line = currentLine(editor.state);
    const index = Math.max(0, GN_ELEMENTS.indexOf(line?.el ?? 'action'));
    return setElementMenu(editor, { open: true, index });
  }
  return true; // 'none': vẫn nuốt phím để con trỏ không rời editor
}

/** Phím khi menu đang mở; trả null nếu menu đóng (để keymap thường xử lý). */
function handleMenuKey(editor: Editor, key: 'up' | 'down' | 'pick' | 'close'): boolean | null {
  const menu = getElementMenu(editor.state);
  if (!menu.open) return null;
  const n = GN_ELEMENTS.length;
  if (key === 'up') return setElementMenu(editor, { open: true, index: (menu.index - 1 + n) % n });
  if (key === 'down') return setElementMenu(editor, { open: true, index: (menu.index + 1) % n });
  if (key === 'pick') return chooseElement(editor, GN_ELEMENTS[menu.index]);
  return closeElementMenu(editor);
}

/** Tên nhân vật đã gõ trong kịch bản (trừ dòng đang sửa), tên dùng gần nhất đứng trước. */
export function characterNames(doc: PMNode, exceptPos?: number): string[] {
  const seen: string[] = [];
  doc.forEach((node, offset) => {
    if (node.attrs.el !== 'character' || offset === exceptPos) return;
    const name = node.textContent.replace(/:+$/, '').trim().toUpperCase();
    if (!name) return;
    const i = seen.indexOf(name);
    if (i !== -1) seen.splice(i, 1);
    seen.unshift(name);
  });
  return seen;
}

/** Hoàn thành tên nhân vật đang gợi ý (nếu có). Trả true khi đã chèn phần còn lại của tên. */
function acceptCharacterCompletion(editor: Editor): boolean {
  const { state, view } = editor;
  const line = currentLine(state);
  if (!line || line.el !== 'character' || !line.atEnd) return false;
  const typed = line.node.textContent.replace(/:+$/, '').trim();
  const full = completeCharacterName(typed, characterNames(state.doc, line.pos));
  if (!full) return false;
  // Thay cả chữ đã gõ bằng tên đầy đủ để tên lưu đúng như lần dùng trước ("k" → "KAI", không phải "kAI").
  const start = line.pos + 1;
  const end = start + line.node.content.size;
  view.dispatch(state.tr.insertText(full, start, end).scrollIntoView());
  return true;
}

/** Kiểm tra chuỗi nhập vào có phải là tên nhân vật hợp lệ trước dấu ":" (1-4 từ, <= 40 ký tự, không chứa dấu câu). */
export function isValidCharacterNameInput(text: string): boolean {
  const trimmed = text.replace(/:+$/, '').trim();
  if (!trimmed || trimmed.length > 40) return false;
  if (/[.!?;"\\]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  return words.length <= 4;
}

/**
 * Kết thúc dòng Nhân vật khi người dùng gõ ":" hoặc nhấn Enter:
 * Nhận tên đang gợi ý (nếu có), thêm dấu ":" vào cuối tên, rồi chèn dòng Thoại (dialogue).
 */
export function characterToDialogue(editor: Editor): boolean {
  const line = currentLine(editor.state);
  if (!line || line.el !== 'character') return false;

  acceptCharacterCompletion(editor);

  const freshLine = currentLine(editor.state);
  if (!freshLine) return false;

  const currentText = freshLine.node.textContent.trim();
  let tr = editor.state.tr;
  let end = freshLine.pos + 1 + freshLine.node.content.size;
  if (!currentText.endsWith(':')) {
    tr = tr.insertText(':', end);
    end += 1;
  }
  tr = tr.setSelection(TextSelection.create(tr.doc, end));
  editor.view.dispatch(tr);

  return applyMove(editor, onEnter('character'));
}

/**
 * Khi gõ "TÊN:" trên dòng Hành động (action): tự động đổi dòng thành Nhân vật (character)
 * và chuyển tiếp sang dòng Thoại (dialogue).
 */
export function actionToCharacterAndDialogue(editor: Editor, name: string): boolean {
  const line = currentLine(editor.state);
  if (!line || line.el !== 'action') return false;

  const cleanName = name.replace(/:+$/, '').trim().toUpperCase();
  if (!cleanName) return false;

  let tr = editor.state.tr;
  const start = line.pos + 1;
  const end = start + line.node.content.size;

  tr = tr.setNodeMarkup(line.pos, undefined, { ...line.node.attrs, el: 'character' });
  tr = tr.insertText(`${cleanName}:`, start, end);
  const newEnd = start + cleanName.length + 1;
  tr = tr.setSelection(TextSelection.create(tr.doc, newEnd));
  editor.view.dispatch(tr);

  return applyMove(editor, onEnter('character'));
}

// ───────────────────────── tự dựng lại khung Trang / Panel ─────────────────────────

/** Thời gian không gõ trước khi dựng lại dòng Trang / Panel bị xoá (như WriterSolo). */
export const STRUCTURE_IDLE_MS = 1500;

/**
 * Transaction dựng lại khung: tài liệu luôn bắt đầu bằng một Trang, và mỗi Trang có ít nhất một Panel
 * (chèn ngay sau dòng Trang). Trả null khi khung đã đủ. Không ghi vào lịch sử Undo.
 */
export function structureFixTransaction(state: EditorState) {
  const lines: { el: GnElement; pos: number; end: number }[] = [];
  state.doc.forEach((node, offset) => {
    lines.push({ el: node.attrs.el as GnElement, pos: offset, end: offset + node.nodeSize });
  });
  if (lines.length === 0) return null;

  const inserts: { pos: number; els: GnElement[] }[] = [];
  const hasPanelBefore = (from: number) => {
    for (let i = from; i < lines.length && lines[i].el !== 'page'; i++) {
      if (lines[i].el === 'panel') return true;
    }
    return false;
  };

  if (lines[0].el !== 'page') {
    inserts.push({ pos: 0, els: hasPanelBefore(0) ? ['page'] : ['page', 'panel'] });
  }
  lines.forEach((line, i) => {
    if (line.el === 'page' && !hasPanelBefore(i + 1))
      inserts.push({ pos: line.end, els: ['panel'] });
  });
  if (inserts.length === 0) return null;

  const tr = state.tr;
  // Chèn từ cuối lên đầu để vị trí các điểm chèn phía trước không bị lệch.
  for (const ins of [...inserts].sort((a, b) => b.pos - a.pos)) {
    tr.insert(
      ins.pos,
      ins.els.map((el) => lineNode(state, el)),
    );
  }
  return tr.setMeta('addToHistory', false).setMeta(structureKey, true);
}

const structureKey = new PluginKey('scriptStructureRestore');

// ───────────────────────── extension chính ─────────────────────────

const labelsKey = new PluginKey('scriptLineLabels');
const ghostKey = new PluginKey('scriptCharacterGhost');

export interface ScriptTypingOptions {
  labels: GnLabels;
}

export const ScriptTypingBehavior = Extension.create<ScriptTypingOptions>({
  name: 'scriptTypingBehavior',

  addOptions() {
    return {
      labels: {
        page: (n: number, k: number) => `PAGE ${n} - PANELS: ${k}`,
        panel: (n: number) => `PANEL ${n}`,
        caption: 'CAPTION:',
        sfx: 'SFX:',
        acceptHint: '(Enter)',
      },
    };
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<string, (props: { editor: Editor }) => boolean> = {
      Enter: ({ editor }) => {
        const menuHandled = handleMenuKey(editor, 'pick');
        if (menuHandled !== null) return menuHandled;
        if (!currentLine(editor.state)) return false;
        if (!editor.state.selection.empty) editor.commands.deleteSelection();
        acceptCharacterCompletion(editor);
        const line = currentLine(editor.state);
        if (!line) return false;
        // Con trỏ giữa dòng có chữ: tách dòng; nửa sau giữ cùng loại (nửa sau của Panel thành Action).
        if (!line.atEnd && !line.isEmpty) {
          const { state, view } = editor;
          const nextEl: GnElement = line.el === 'panel' ? 'action' : line.el;
          view.dispatch(
            state.tr
              .split(state.selection.from, 1, [
                { type: state.schema.nodes[GN_LINE], attrs: { el: nextEl, refId: null } },
              ])
              .scrollIntoView(),
          );
          return true;
        }
        return applyMove(editor, onEnter(line.el, line.isEmpty));
      },
      ArrowUp: ({ editor }) => handleMenuKey(editor, 'up') ?? false,
      ArrowDown: ({ editor }) => handleMenuKey(editor, 'down') ?? false,
      Escape: ({ editor }) => handleMenuKey(editor, 'close') ?? false,
      Tab: ({ editor }) => {
        const menuHandled = handleMenuKey(editor, 'pick');
        if (menuHandled !== null) return menuHandled;
        const line = currentLine(editor.state);
        if (!line) return true;
        if (line.el === 'character' && acceptCharacterCompletion(editor)) {
          return applyMove(editor, onTab('character', false));
        }
        return applyMove(editor, onTab(line.el, line.isEmpty));
      },
      'Shift-Tab': ({ editor }) => {
        const line = currentLine(editor.state);
        if (!line) return true;
        return applyMove(editor, onShiftTab(line.el, line.isEmpty));
      },
    };
    GN_ELEMENTS.forEach((el, i) => {
      shortcuts[`Mod-${i + 1}`] = ({ editor }) => setLineElement(editor, el);
    });
    return shortcuts;
  },

  addProseMirrorPlugins() {
    const labels = this.options.labels;
    const editor = this.editor;
    return [
      ElementMenuPlugin,
      // Gõ ":" sau tên nhân vật: không tự sinh dấu hai chấm trước đó,
      // khi người dùng gõ ":" thủ công thì hoàn thành tên (kèm ":") rồi sang dòng Thoại.
      new Plugin({
        key: new PluginKey('scriptCharacterColon'),
        props: {
          handleTextInput(view, _from, _to, text) {
            if (text !== ':') return false;
            const line = currentLine(view.state);
            if (!line) return false;

            // Đang ở dòng Nhân vật (character)
            if (line.el === 'character') {
              if (line.isEmpty) return false;
              return characterToDialogue(editor);
            }

            // Đang ở dòng Hành động (action) mà gõ tên nhân vật rồi gõ ":"
            if (line.el === 'action') {
              const typed = line.node.textContent.trim();
              if (isValidCharacterNameInput(typed)) {
                return actionToCharacterAndDialogue(editor, typed);
              }
            }

            return false;
          },
        },
      }),
      // Xoá dòng Trang / Panel rồi ngừng gõ một lúc thì dòng đó tự hiện lại (như WriterSolo).
      new Plugin({
        key: structureKey,
        view(view) {
          let timer: ReturnType<typeof setTimeout> | null = null;
          const schedule = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
              timer = null;
              if (!view.editable || view.isDestroyed) return;
              const tr = structureFixTransaction(view.state);
              if (tr) view.dispatch(tr);
            }, STRUCTURE_IDLE_MS);
          };
          schedule();
          return {
            update(v, prevState) {
              if (!v.state.doc.eq(prevState.doc)) schedule();
            },
            destroy() {
              if (timer) clearTimeout(timer);
            },
          };
        },
      }),
      // Nhãn tự sinh: PAGE n - PANELS: k, PANEL n (đếm lại mỗi trang), CAPTION:, SFX:
      new Plugin({
        key: labelsKey,
        props: {
          decorations(state) {
            const decos: Decoration[] = [];
            const pages: { pos: number; size: number; n: number; panels: number }[] = [];
            let pageNo = 0;
            let panelNo = 0;
            state.doc.forEach((node, offset) => {
              const el = node.attrs.el as GnElement;
              const range = (label: string) =>
                Decoration.node(offset, offset + node.nodeSize, { 'data-label': label });
              if (el === 'page') {
                pageNo += 1;
                panelNo = 0;
                pages.push({ pos: offset, size: node.nodeSize, n: pageNo, panels: 0 });
              } else if (el === 'panel') {
                panelNo += 1;
                if (pages.length) pages[pages.length - 1].panels += 1;
                decos.push(range(labels.panel(panelNo)));
              } else if (el === 'caption') {
                decos.push(range(labels.caption));
              } else if (el === 'sfx') {
                decos.push(range(labels.sfx));
              }
            });
            for (const p of pages) {
              decos.push(
                Decoration.node(p.pos, p.pos + p.size, {
                  'data-label': labels.page(p.n, p.panels),
                }),
              );
            }
            return DecorationSet.create(state.doc, decos);
          },
          // Dòng Trang chỉ là nhãn: không nhận chữ gõ hay dán.
          handleTextInput(view) {
            return currentLine(view.state)?.el === 'page';
          },
          handlePaste(view) {
            return currentLine(view.state)?.el === 'page';
          },
        },
      }),
      // Gợi ý tên nhân vật: chữ mờ phần còn lại của tên + "(Enter)"; Enter/Tab để nhận.
      new Plugin({
        key: ghostKey,
        props: {
          decorations(state) {
            if (!state.selection.empty) return null;
            const line = currentLine(state);
            if (!line || line.el !== 'character' || !line.atEnd || line.isEmpty) return null;
            const typed = line.node.textContent.replace(/:+$/, '').trim();
            const full = completeCharacterName(typed, characterNames(state.doc, line.pos));
            if (!full) return null;
            const widget = document.createElement('span');
            widget.className = 'gn-ghost';
            widget.setAttribute('contenteditable', 'false');
            widget.textContent = `${full.slice(typed.trim().length)} ${labels.acceptHint}`;
            return DecorationSet.create(state.doc, [
              Decoration.widget(line.pos + 1 + line.node.content.size, widget, { side: 1 }),
            ]);
          },
        },
      }),
    ];
  },
});

/** Loại phần tử tại con trỏ (cho thanh loại dòng). */
export function activeElement(editor: Editor | null): GnElement | null {
  if (!editor) return null;
  return currentLine(editor.state)?.el ?? null;
}
