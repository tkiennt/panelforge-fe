// src/roles/writer/components/script/flow/nodes/ScriptLineBlockNode.test.ts
import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { ScriptLineBlockNode } from './ScriptLineBlockNode';

function createTestFlowEditor(initialHtml: string = '<p></p>') {
  return new Editor({
    extensions: [StarterKit.configure({ heading: false }), ScriptLineBlockNode],
    content: initialHtml,
  });
}

describe('ScriptLineBlockNode - Zero-Syntax Keyboard Engine (WriteSolo Pure Flow)', () => {
  const typeOf = (editor: Editor, i = 0) => editor.getJSON().content?.[i]?.attrs?.blockType;

  // 1. Phím tắt số: Ctrl+1..5 đổi loại dòng trực tiếp
  it('Ctrl+1..5 chuyển đổi chính xác giữa Action, Dialogue, Thought, Caption, SFX', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">Hành động</div>');
    editor.commands.setTextSelection(3);

    // Ctrl+2 -> Dialogue
    editor.commands.keyboardShortcut('Mod-2');
    expect(typeOf(editor)).toBe('dialogue');

    // Ctrl+3 -> Thought
    editor.commands.keyboardShortcut('Mod-3');
    expect(typeOf(editor)).toBe('thought');

    // Ctrl+4 -> Caption (Narration)
    editor.commands.keyboardShortcut('Mod-4');
    expect(typeOf(editor)).toBe('caption');

    // Ctrl+5 -> SFX
    editor.commands.keyboardShortcut('Mod-5');
    expect(typeOf(editor)).toBe('sfx');

    // Ctrl+1 -> Action (Stage Direction)
    editor.commands.keyboardShortcut('Mod-1');
    expect(typeOf(editor)).toBe('stage_direction');
  });

  // 2. Phím tắt cấu trúc: Ctrl+Enter (Panel mới), Ctrl+Shift+Enter (Trang mới)
  it('Ctrl+Enter tạo Panel mới cùng dòng Action bên dưới', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="page_heading">Trang 01</div><div data-block-type="panel_heading">Panel 1.1: [Toàn cảnh]</div><div data-block-type="stage_direction">Nhìn ra cửa</div>',
    );
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);

    const handled = editor.commands.keyboardShortcut('Mod-Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const blocks = json.content || [];
    const panelHeadings = blocks.filter((b) => b.attrs?.blockType === 'panel_heading');
    expect(panelHeadings.length).toBe(2);
    expect((panelHeadings[1]?.content?.[0] as any)?.text).toContain('Panel 1.2');
  });

  it('Ctrl+Shift+Enter tạo Trang mới cùng Panel 1 bên dưới', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="page_heading">Trang 01</div><div data-block-type="panel_heading">Panel 1.1: [Toàn cảnh]</div><div data-block-type="stage_direction">Nội dung</div>',
    );
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);

    const handled = editor.commands.keyboardShortcut('Mod-Shift-Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const pageHeadings = (json.content || []).filter((b) => b.attrs?.blockType === 'page_heading');
    expect(pageHeadings.length).toBe(2);
    expect((pageHeadings[1]?.content?.[0] as any)?.text).toContain('Trang 02');
  });

  // 3. Tab và Shift-Tab theo hàm thuần nextKindOnTab (Bảng H.1)
  it('Tab xoay vòng Action → Dialogue → Caption → SFX → Action', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">Bùm</div>');
    editor.commands.setTextSelection(4);

    const seen = [1, 2, 3, 4].map(() => {
      editor.commands.keyboardShortcut('Tab');
      return typeOf(editor);
    });
    expect(seen).toEqual(['dialogue', 'caption', 'sfx', 'stage_direction']);
  });

  it('Shift-Tab luân chuyển ngược chuẩn bảng H.1 (SFX → Narration → Dialogue)', () => {
    const editor = createTestFlowEditor('<div data-block-type="sfx">Bùm</div>');
    editor.commands.setTextSelection(4);

    // SFX -> Shift+Tab -> Narration (caption)
    editor.commands.keyboardShortcut('Shift-Tab');
    expect(typeOf(editor)).toBe('caption');

    // Caption -> Shift+Tab -> Dialogue
    editor.commands.keyboardShortcut('Shift-Tab');
    expect(typeOf(editor)).toBe('dialogue');
  });

  it('Tab không đổi tiêu đề Trang / Panel', () => {
    const editor = createTestFlowEditor('<div data-block-type="panel_heading">Panel 1.1</div>');
    editor.commands.setTextSelection(3);
    editor.commands.keyboardShortcut('Tab');
    expect(typeOf(editor)).toBe('panel_heading');
  });

  // 4. Enter Rules theo hàm thuần nextKindOnEnter (Bảng H.1)
  it('Enter trên dòng Action rỗng tự động tạo Panel mới (Enter 2 lần tạo Panel)', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="page_heading">Trang 01</div><div data-block-type="panel_heading">Panel 1.1: [Toàn cảnh]</div><div data-block-type="stage_direction"></div>',
    );
    // Đặt con trỏ vào dòng action rỗng
    const pos = editor.state.doc.content.size - 1;
    editor.commands.setTextSelection(pos);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const panels = (json.content || []).filter((b) => b.attrs?.blockType === 'panel_heading');
    expect(panels.length).toBe(2);
    expect((panels[1]?.content?.[0] as any)?.text).toContain('Panel 1.2');
  });

  it('Enter trên dòng Dialogue có chữ tạo dòng Dialogue mới với người nói luân phiên A -> B -> A', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="dialogue" data-speaker-name="NARUTO">Chào cậu!</div>' +
        '<div data-block-type="dialogue" data-speaker-name="SASUKE">Đi đâu đấy?</div>',
    );
    // Đặt con trỏ ở cuối dòng của SASUKE
    const pos = editor.state.doc.content.size - 1;
    editor.commands.setTextSelection(pos);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const blocks = (json.content || []).filter((b) => b.type === 'scriptLineBlock');
    expect(blocks.length).toBe(3);
    expect(blocks[2]?.attrs?.blockType).toBe('dialogue');
    // Người nói luân phiên: sau SASUKE thì người nói tiếp theo là NARUTO!
    expect(blocks[2]?.attrs?.speakerName).toBe('NARUTO');
  });

  it('Enter trên dòng Dialogue trống quay về dòng Action (stage_direction)', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="dialogue" data-speaker-name="Minh"></div>',
    );
    editor.commands.setTextSelection(1);
    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(typeOf(editor)).toBe('stage_direction');
    expect(editor.getJSON().content?.[0]?.attrs?.speakerName).toBeNull();
  });

  it('Enter trên dòng SFX trống quay về dòng Action', () => {
    const editor = createTestFlowEditor('<div data-block-type="sfx"></div>');
    editor.commands.setTextSelection(1);
    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(typeOf(editor)).toBe('stage_direction');
  });

  it('Enter trên dòng Caption trống quay về dòng Action', () => {
    const editor = createTestFlowEditor('<div data-block-type="caption"></div>');
    editor.commands.setTextSelection(1);
    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(typeOf(editor)).toBe('stage_direction');
  });

  it('Enter trên panel_heading tạo dòng Action bên dưới', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="panel_heading">Panel 1.1: [Cận cảnh]</div>',
    );
    editor.commands.setTextSelection(2);
    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('panel_heading');
    expect(json.content?.[1]?.type).toBe('scriptLineBlock');
    expect(json.content?.[1]?.attrs?.blockType).toBe('stage_direction');
  });

  it('Enter trên page_heading tạo panel_heading bên dưới', () => {
    const editor = createTestFlowEditor('<div data-block-type="page_heading">Trang 01</div>');
    editor.commands.setTextSelection(2);
    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('page_heading');
    expect(json.content?.[1]?.attrs?.blockType).toBe('panel_heading');
  });

  it('tách đôi dòng văn bản khi nhấn Enter ở giữa dòng', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="caption">Dòng một và dòng hai</div>',
    );
    // Đặt con trỏ ở giữa chuỗi (sau "Dòng một ")
    editor.commands.setTextSelection(10);
    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const scriptBlocks = (json.content || []).filter((n: any) => n.type === 'scriptLineBlock');
    expect(scriptBlocks.length).toBe(2);
    expect(scriptBlocks[0]?.attrs?.blockType).toBe('caption');
    expect((scriptBlocks[0] as any)?.content?.[0]?.text).toBe('Dòng một ');
    expect(scriptBlocks[1]?.attrs?.blockType).toBe('caption');
    expect((scriptBlocks[1] as any)?.content?.[0]?.text).toBe('và dòng hai');
  });

  // 5. Backspace & Delete Rules
  it('không thể xóa tiêu đề trang đầu tiên khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestFlowEditor('<div data-block-type="page_heading">Trang 01</div>');
    editor.commands.setTextSelection(1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('page_heading');
    expect((json.content?.[0] as any)?.content?.[0]?.text).toContain('Trang 01');
  });

  it('cho phép xóa page_heading thứ hai (Page 02) khi nhấn Backspace', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="page_heading">Trang 01</div><div data-block-type="page_heading">Trang 02</div>',
    );
    const posTrang2 = editor.state.doc.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posTrang2);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const scriptBlocks = json.content?.filter((n) => n.type === 'scriptLineBlock') || [];
    expect(scriptBlocks.length).toBe(1);
    expect(scriptBlocks[0]?.attrs?.blockType).toBe('page_heading');
  });

  it('cho phép xóa panel_heading khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="page_heading">Trang 01</div><div data-block-type="panel_heading">Panel 1.1</div>',
    );
    const posPanel = editor.state.doc.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posPanel);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.some((n) => n.attrs?.blockType === 'panel_heading')).toBe(false);
  });

  it('không xóa panel_heading khi nhấn Backspace ở giữa dòng (parentOffset > 0)', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="panel_heading">Panel 1.1: [Cận cảnh]</div>',
    );
    editor.commands.setTextSelection(6);
    editor.commands.keyboardShortcut('Backspace');
    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('panel_heading');
  });

  it('Backspace ở đầu lời thoại bỏ nhãn người nói, lần nhấn tiếp theo lùi về Action', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="dialogue" data-speaker-name="Minh">Chạy đi</div>',
    );
    editor.commands.setTextSelection(1);
    editor.commands.keyboardShortcut('Backspace');
    expect(editor.getJSON().content?.[0]?.attrs?.speakerName).toBeNull();
    expect(editor.getJSON().content?.[0]?.attrs?.blockType).toBe('dialogue');

    // Lần Backspace tiếp theo ở đầu dòng khi không còn speaker: lùi về Action (stage_direction)
    editor.commands.keyboardShortcut('Backspace');
    expect(editor.getJSON().content?.[0]?.attrs?.blockType).toBe('stage_direction');
  });

  it('Backspace ở đầu dòng SFX trống lùi về Narration, dòng Narration trống lùi về Dialogue', () => {
    const editor = createTestFlowEditor('<div data-block-type="sfx"></div>');
    editor.commands.setTextSelection(1);

    // SFX trống -> Backspace -> Narration (caption)
    editor.commands.keyboardShortcut('Backspace');
    expect(typeOf(editor)).toBe('caption');

    // Narration trống -> Backspace -> Dialogue
    editor.commands.keyboardShortcut('Backspace');
    expect(typeOf(editor)).toBe('dialogue');
  });

  it('Enter trên dòng Dialogue bảo toàn speakerCharacterId của người nói luân phiên', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="dialogue" data-speaker-name="NARUTO" data-speaker-id="chr-naruto">Chào!</div>' +
        '<div data-block-type="dialogue" data-speaker-name="SASUKE" data-speaker-id="chr-sasuke">Đi đâu đấy?</div>',
    );
    const pos = editor.state.doc.content.size - 1;
    editor.commands.setTextSelection(pos);

    editor.commands.keyboardShortcut('Enter');
    const json = editor.getJSON();
    const blocks = (json.content || []).filter((b) => b.type === 'scriptLineBlock');
    expect(blocks.length).toBe(3);
    // Luân phiên sang NARUTO và giữ nguyên speakerCharacterId = chr-naruto!
    expect(blocks[2]?.attrs?.speakerName).toBe('NARUTO');
    expect(blocks[2]?.attrs?.speakerCharacterId).toBe('chr-naruto');
  });

  // 6. Định dạng 2 cột Graphic Novel
  it('thoại, thought, dẫn truyện và SFX hiển thị cột nhãn bên trái', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="dialogue" data-speaker-name="MALANDRO">Hello</div>' +
        '<div data-block-type="thought" data-speaker-name="NARUTO">Thinking</div>' +
        '<div data-block-type="caption">Lời dẫn</div>' +
        '<div data-block-type="sfx">BÙM!</div>',
    );
    const html = editor.getHTML();
    expect(html).toContain('MALANDRO');
    expect(html).toContain('NARUTO (Nghĩ)');
    expect(html).toContain('Dẫn truyện');
    expect(html).toContain('SFX');
  });

  it('thoại chưa có người nói vẫn hiện nhãn "Thoại"', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue">Nói gì đó</div>');
    const html = editor.getHTML();
    expect(html).toContain('Thoại');
    expect(html).toContain('Nói gì đó');
  });
});
