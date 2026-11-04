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
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">#</div>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Space');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const node = json.content?.[0];
    expect(node?.type).toBe('scriptLineBlock');
    expect(node?.attrs?.blockType).toBe('page_heading');
    expect((node?.content?.[0] as any)?.text).toContain('Trang 01');
  });

  it('chuyển đổi thành panel_heading khi gõ "-" rồi nhấn Space', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">-</div>');
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
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">#</div>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const node = json.content?.[0];
    expect(node?.type).toBe('scriptLineBlock');
    expect(node?.attrs?.blockType).toBe('page_heading');
    expect((node?.content?.[0] as any)?.text).toContain('Trang 01');
  });

  it('chuyển đổi thành panel_heading khi gõ "-" rồi nhấn Tab', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">-</div>');
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
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">@Minh: "Mau chạy đi!"</div>');
    editor.commands.setTextSelection(23);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('dialogue');
    expect(json.content?.[0]?.attrs?.speakerName).toBe('Minh');
    expect(json.content?.[1]?.type).toBe('scriptLineBlock');
    expect(json.content?.[1]?.attrs?.blockType).toBe('caption');
  });

  it('tự động nhận diện dòng SFX * TIẾNG NỔ * khi nhấn Enter', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">* BÙM! *</div>');
    editor.commands.setTextSelection(10);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('sfx');
    expect(json.content?.[1]?.attrs?.blockType).toBe('caption');
  });

  it('tự động nhận diện dòng Caption: Lời dẫn khi nhấn Enter', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">Caption: Tokyo lúc nửa đêm</div>');
    editor.commands.setTextSelection(26);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('caption');
    expect(json.content?.[1]?.attrs?.blockType).toBe('caption');
  });

  // 4. Backspace: Cho phép xóa Panel và Page, không thể xóa tiêu đề trang
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
      '<div data-block-type="page_heading">Trang 01</div><div data-block-type="page_heading">Trang 02</div>'
    );
    // Đặt con trỏ vào đầu khối Trang 02 (sau Trang 01)
    const jsonBefore = editor.getJSON();
    const posTrang2 = (jsonBefore.content?.[0] as any)?.content?.[0]?.text?.length + 3; // vị trí đầu trang 2
    editor.commands.setTextSelection(posTrang2);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.length).toBe(1);
    expect(json.content?.[0]?.attrs?.blockType).toBe('page_heading');
    expect((json.content?.[0] as any)?.content?.[0]?.text).toContain('Trang 01');
  });

  it('cho phép xóa panel_heading khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestFlowEditor('<div data-block-type="panel_heading">Panel 1.1</div>');
    editor.commands.setTextSelection(1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.length).toBe(0);
  });

  describe('Auto-Increment & Enter Rules in ScriptLineBlockNode', () => {
    it('tự động tăng Page 1 -> Page 2 -> Page 3 khi gõ "#" rồi nhấn Space', () => {
      const editor = createTestFlowEditor('<div data-block-type="stage_direction">#</div>');
      editor.commands.setTextSelection(2);
      editor.commands.keyboardShortcut('Space');

      // Nhấn Enter tạo dòng tiếp theo, gõ "#" rồi nhấn Space
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('#');
      editor.commands.keyboardShortcut('Space');

      // Nhấn Enter tạo dòng tiếp theo, gõ "#" rồi nhấn Tab
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('#');
      editor.commands.keyboardShortcut('Tab');

      const pages = (editor.getJSON().content || []).filter(
        (n: any) => n.attrs?.blockType === 'page_heading'
      );
      expect(pages.length).toBe(3);
      expect((pages[0]?.content?.[0] as any)?.text).toContain('Trang 01');
      expect((pages[1]?.content?.[0] as any)?.text).toContain('Trang 02');
      expect((pages[2]?.content?.[0] as any)?.text).toContain('Trang 03');
    });

    it('tự động tăng Panel 1.1 -> Panel 1.2 -> Panel 1.3 và reset về Panel 2.1 khi sang Trang 2', () => {
      const editor = createTestFlowEditor('<div data-block-type="stage_direction">#</div>');
      editor.commands.setTextSelection(2);
      editor.commands.keyboardShortcut('Space'); // Trang 01

      // Panel 1.1
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('-');
      editor.commands.keyboardShortcut('Space');

      // Panel 1.2
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('-');
      editor.commands.keyboardShortcut('Tab');

      // Page 02
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('#');
      editor.commands.keyboardShortcut('Space');

      // Panel 2.1 (reset về 1)
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('-');
      editor.commands.keyboardShortcut('Space');

      const pages = (editor.getJSON().content || []).filter(
        (n: any) => n.attrs?.blockType === 'page_heading'
      );
      expect(pages.length).toBe(2);

      const panels = (editor.getJSON().content || []).filter(
        (n: any) => n.attrs?.blockType === 'panel_heading'
      );
      expect(panels.length).toBe(3);
      expect((panels[0]?.content?.[0] as any)?.text).toContain('Panel 1.1:');
      expect((panels[1]?.content?.[0] as any)?.text).toContain('Panel 1.2:');
      expect((panels[2]?.content?.[0] as any)?.text).toContain('Panel 2.1:');
    });

    it('nhấn Enter sau panel_heading tạo dòng caption cho phép viết tự do, KHÔNG tự chuyển thành dialogue', () => {
      const editor = createTestFlowEditor('<div data-block-type="panel_heading">Panel 1.1: [Cận cảnh]</div>');
      editor.commands.setTextSelection(2);
      const handled = editor.commands.keyboardShortcut('Enter');
      expect(handled).toBe(true);

      const json = editor.getJSON();
      expect(json.content?.[0]?.attrs?.blockType).toBe('panel_heading');
      expect(json.content?.[1]?.type).toBe('scriptLineBlock');
      expect(json.content?.[1]?.attrs?.blockType).toBe('caption');
    });

    it('chuyển @Minh: "Hello" thành dialogue, nhưng giữ nguyên @Minh walks away ở dạng tự do', () => {
      const editor1 = createTestFlowEditor('<div data-block-type="caption">@Minh: "Hello"</div>');
      editor1.commands.setTextSelection(editor1.state.doc.content.size - 1);
      const handled1 = editor1.commands.keyboardShortcut('Enter');
      expect(handled1).toBe(true);
      expect(editor1.getJSON().content?.[0]?.attrs?.speakerName).toBe('Minh');

      const editor2 = createTestFlowEditor('<div data-block-type="caption">@Minh walks away</div>');
      editor2.commands.setTextSelection(editor2.state.doc.content.size - 1);
      editor2.commands.keyboardShortcut('Enter');
      expect(editor2.getJSON().content?.[0]?.attrs?.speakerName).toBeNull();
      expect(editor2.getJSON().content?.[0]?.attrs?.blockType).toBe('caption');
    });
  });
});
