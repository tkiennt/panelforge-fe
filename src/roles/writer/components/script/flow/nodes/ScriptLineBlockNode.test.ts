// src/roles/writer/components/script/flow/nodes/ScriptLineBlockNode.test.ts
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  ScriptDocument,
  ScriptLineBlockNode,
  ScriptTypingBehavior,
  characterNames,
} from './ScriptLineBlockNode';
import type { GnElement } from '../grammar/scriptGrammar';

const line = (el: GnElement, text = ''): JSONContent => ({
  type: 'scriptLine',
  attrs: { el, refId: null },
  ...(text ? { content: [{ type: 'text', text }] } : {}),
});

function createEditor(lines: JSONContent[]) {
  return new Editor({
    extensions: [
      StarterKit.configure({
        document: false,
        paragraph: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        trailingNode: false,
      }),
      ScriptDocument,
      ScriptLineBlockNode,
      ScriptTypingBehavior,
    ],
    content: { type: 'doc', content: lines },
  });
}

/** Đặt con trỏ ở cuối dòng thứ `index`. */
function caretAtEndOf(editor: Editor, index: number) {
  let pos = 0;
  editor.state.doc.forEach((node, offset, i) => {
    if (i === index) pos = offset + 1 + node.content.size;
  });
  editor.commands.setTextSelection(pos);
}

const els = (editor: Editor) =>
  (editor.getJSON().content ?? []).map((n) => n.attrs?.el as GnElement);
const texts = (editor: Editor) => {
  const out: string[] = [];
  editor.state.doc.forEach((node) => out.push(node.textContent));
  return out;
};
const activeEl = (editor: Editor) => editor.state.selection.$from.parent.attrs.el as GnElement;

describe('ScriptLineBlockNode — gõ kịch bản kiểu WriterSolo', () => {
  it('Enter đi đúng chuỗi Page → Panel → Action', () => {
    const editor = createEditor([line('page')]);
    caretAtEndOf(editor, 0);
    editor.commands.keyboardShortcut('Enter');
    expect(activeEl(editor)).toBe('panel');
    editor.commands.insertContent('Toàn cảnh mái nhà');
    editor.commands.keyboardShortcut('Enter');
    expect(activeEl(editor)).toBe('action');
    expect(els(editor)).toEqual(['page', 'panel', 'action']);
  });

  it('Tab trên Action có chữ chèn Character; Enter sang Dialogue; Enter tiếp về Action', () => {
    const editor = createEditor([line('page'), line('panel'), line('action', 'Kai đứng ở mép')]);
    caretAtEndOf(editor, 2);
    editor.commands.keyboardShortcut('Tab');
    expect(activeEl(editor)).toBe('character');
    editor.commands.insertContent('Kai');
    editor.commands.keyboardShortcut('Enter');
    expect(activeEl(editor)).toBe('dialogue');
    editor.commands.insertContent('Thành phố này không ngủ.');
    editor.commands.keyboardShortcut('Enter');
    expect(activeEl(editor)).toBe('action');
    expect(els(editor)).toEqual(['page', 'panel', 'action', 'character', 'dialogue', 'action']);
  });

  it('Tab trên dòng trống đổi loại tại chỗ; Shift+Tab lùi lại', () => {
    const editor = createEditor([line('page'), line('panel'), line('action')]);
    caretAtEndOf(editor, 2);
    editor.commands.keyboardShortcut('Tab');
    expect(els(editor)).toEqual(['page', 'panel', 'character']);
    editor.commands.keyboardShortcut('Shift-Tab');
    expect(els(editor)).toEqual(['page', 'panel', 'action']);
  });

  it('Tab trên Dialogue trống thành Parens, Enter từ Parens sang Dialogue', () => {
    const editor = createEditor([line('character', 'MIA'), line('dialogue')]);
    caretAtEndOf(editor, 1);
    editor.commands.keyboardShortcut('Tab');
    expect(activeEl(editor)).toBe('parens');
    editor.commands.insertContent('thì thầm');
    editor.commands.keyboardShortcut('Enter');
    expect(activeEl(editor)).toBe('dialogue');
    expect(els(editor)).toEqual(['character', 'parens', 'dialogue']);
  });

  it('Enter / Tab nhận tên nhân vật đang gợi ý', () => {
    const editor = createEditor([
      line('character', 'KAI'),
      line('dialogue', 'A'),
      line('character', 'k'),
    ]);
    caretAtEndOf(editor, 2);
    editor.commands.keyboardShortcut('Enter');
    expect(texts(editor)[2]).toBe('KAI');
    expect(activeEl(editor)).toBe('dialogue');
  });

  it('Ctrl+1..8 đổi loại dòng; đổi dòng có chữ thành Trang thì chèn Trang mới, không mất chữ', () => {
    const editor = createEditor([line('action', 'BÙM')]);
    caretAtEndOf(editor, 0);
    editor.commands.keyboardShortcut('Mod-8');
    expect(els(editor)).toEqual(['sfx']);
    editor.commands.keyboardShortcut('Mod-1');
    expect(els(editor)).toEqual(['sfx', 'page']);
    expect(texts(editor)[0]).toBe('BÙM');
  });

  it('Enter giữa dòng tách dòng, nửa sau giữ cùng loại', () => {
    const editor = createEditor([line('action', 'AB')]);
    editor.commands.setTextSelection(2);
    editor.commands.keyboardShortcut('Enter');
    expect(texts(editor)).toEqual(['A', 'B']);
    expect(els(editor)).toEqual(['action', 'action']);
  });

  it('characterNames trả tên đã dùng, gần nhất trước, không trùng', () => {
    const editor = createEditor([
      line('character', 'Kai'),
      line('character', 'Mia'),
      line('character', 'KAI'),
    ]);
    expect(characterNames(editor.state.doc)).toEqual(['KAI', 'MIA']);
  });
});
