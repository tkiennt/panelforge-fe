// src/roles/writer/components/script/flow/nodes/ScriptLineBlockNode.test.ts
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ScriptLineBlockNode } from './ScriptLineBlockNode';

function createTestFlowEditor(initialHtml: string = '<p></p>') {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: false }),
      ScriptLineBlockNode,
    ],
    content: initialHtml,
  });
}

describe('ScriptLineBlockNode - Keyboard Triggers (Tab & Space)', () => {
  // 1. Space triggers
  it('chuyển đổi thành page_heading khi gõ "#" rồi nhấn Space', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">#</div>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Space');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const node = json.content?.[0];
    expect(node?.type).toBe('scriptLineBlock');
    expect(node?.attrs?.blockType).toBe('page_heading');
    expect((node?.content?.[0] as any)?.text).toContain('TRANG 01');
  });

  it('chuyển đổi thành panel_heading khi gõ "-" rồi nhấn Space', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">-</div>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Space');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const node = json.content?.[0];
    expect(node?.type).toBe('scriptLineBlock');
    expect(node?.attrs?.blockType).toBe('panel_heading');
    expect((node?.content?.[0] as any)?.text).toContain('Panel 1.1:');
  });

  // 2. Tab triggers
  it('chuyển đổi thành page_heading khi gõ "#" rồi nhấn Tab', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">#</div>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const node = json.content?.[0];
    expect(node?.type).toBe('scriptLineBlock');
    expect(node?.attrs?.blockType).toBe('page_heading');
    expect((node?.content?.[0] as any)?.text).toContain('TRANG 01');
  });

  it('chuyển đổi thành panel_heading khi gõ "-" rồi nhấn Tab', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">-</div>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const node = json.content?.[0];
    expect(node?.type).toBe('scriptLineBlock');
    expect(node?.attrs?.blockType).toBe('panel_heading');
    expect((node?.content?.[0] as any)?.text).toContain('Panel 1.1:');
  });

  // 3. Enter incremental parsing
  it('tự động nhận diện dòng thoại có @NhânVật: "Lời thoại" khi nhấn Enter', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">@Minh: "Mau chạy đi!"</div>');
    editor.commands.setTextSelection(23);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('dialogue');
    expect(json.content?.[0]?.attrs?.speakerName).toBe('Minh');
    expect(json.content?.[1]?.type).toBe('scriptLineBlock');
  });

  it('tự động nhận diện dòng SFX * TIẾNG NỔ * khi nhấn Enter', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">* BÙM! *</div>');
    editor.commands.setTextSelection(10);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('sfx');
  });

  it('tự động nhận diện dòng Caption: Lời dẫn khi nhấn Enter', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">Caption: Tokyo lúc nửa đêm</div>');
    editor.commands.setTextSelection(26);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('caption');
  });

  // 4. Backspace graceful demotion
  it('hoàn nguyên page_heading về "# " khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestFlowEditor('<div data-block-type="page_heading">TRANG 01</div>');
    editor.commands.setTextSelection(1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('dialogue');
    expect((json.content?.[0] as any)?.content?.[0]?.text).toContain('# TRANG 01');
  });

  it('hoàn nguyên panel_heading về "- " khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestFlowEditor('<div data-block-type="panel_heading">Panel 1.1</div>');
    editor.commands.setTextSelection(1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('dialogue');
    expect((json.content?.[0] as any)?.content?.[0]?.text).toContain('- Panel 1.1');
  });
});
