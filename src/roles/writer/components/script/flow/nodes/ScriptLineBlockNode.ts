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

function applyMove(editor: Editor, move: GnMove): boolean {
  if (move.op === 'morph') return setLineElement(editor, move.to);
  if (move.op === 'insert') return insertLineAfter(editor, move.to);
  return true; // 'none': vẫn nuốt phím để con trỏ không rời editor
}

/** Tên nhân vật đã gõ trong kịch bản (trừ dòng đang sửa), tên dùng gần nhất đứng trước. */
export function characterNames(doc: PMNode, exceptPos?: number): string[] {
  const seen: string[] = [];
  doc.forEach((node, offset) => {
    if (node.attrs.el !== 'character' || offset === exceptPos) return;
    const name = node.textContent.trim().toUpperCase();
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
  const typed = line.node.textContent;
  const full = completeCharacterName(typed, characterNames(state.doc, line.pos));
  if (!full) return false;
  const end = line.pos + 1 + line.node.content.size;
  view.dispatch(state.tr.insertText(full.slice(typed.trim().length), end).scrollIntoView());
  return true;
}

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
        return applyMove(editor, onEnter(line.el));
      },
      Tab: ({ editor }) => {
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
    return [
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
            const typed = line.node.textContent;
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
