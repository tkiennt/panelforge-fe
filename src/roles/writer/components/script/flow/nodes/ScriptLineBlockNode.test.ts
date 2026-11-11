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
    expect((json.content?.[0]?.content?.[0] as any)?.text).toBe('Mau chạy đi!');
    expect(json.content?.[1]?.type).toBe('scriptLineBlock');
    expect(json.content?.[1]?.attrs?.blockType).toBe('stage_direction');
  });

  it('tự động nhận diện dòng SFX * TIẾNG NỔ * khi nhấn Enter', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">* BÙM! *</div>');
    editor.commands.setTextSelection(10);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('sfx');
    expect(json.content?.[1]?.attrs?.blockType).toBe('stage_direction');
  });

  it('tự động nhận diện dòng Caption: Lời dẫn khi nhấn Enter', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">Caption: Tokyo lúc nửa đêm</div>');
    editor.commands.setTextSelection(26);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.[0]?.attrs?.blockType).toBe('caption');
    expect(json.content?.[1]?.attrs?.blockType).toBe('stage_direction');
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
    const posTrang2 = editor.state.doc.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posTrang2);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const scriptBlocks = json.content?.filter((n) => n.type === 'scriptLineBlock') || [];
    expect(scriptBlocks.length).toBe(1);
    expect(scriptBlocks[0]?.attrs?.blockType).toBe('page_heading');
    expect((scriptBlocks[0] as any)?.content?.[0]?.text).toContain('Trang 01');
    expect(json.content?.some((n) => (n as any)?.content?.[0]?.text?.includes('Trang 02'))).toBe(false);
  });

  it('cho phép xóa panel_heading khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestFlowEditor(
      '<div data-block-type="page_heading">Trang 01</div><div data-block-type="panel_heading">Panel 1.1</div>'
    );
    const posPanel = editor.state.doc.child(0).nodeSize + 1;
    editor.commands.setTextSelection(posPanel);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    expect(json.content?.some((n) => n.attrs?.blockType === 'panel_heading')).toBe(false);
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

    it('nhấn Enter sau panel_heading tạo dòng hành động cho phép viết tự do, KHÔNG tự chuyển thành dialogue', () => {
      const editor = createTestFlowEditor('<div data-block-type="panel_heading">Panel 1.1: [Cận cảnh]</div>');
      editor.commands.setTextSelection(2);
      const handled = editor.commands.keyboardShortcut('Enter');
      expect(handled).toBe(true);

      const json = editor.getJSON();
      expect(json.content?.[0]?.attrs?.blockType).toBe('panel_heading');
      expect(json.content?.[1]?.type).toBe('scriptLineBlock');
      expect(json.content?.[1]?.attrs?.blockType).toBe('stage_direction');
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

    it('không xóa panel_heading khi nhấn Backspace ở giữa dòng (parentOffset > 0)', () => {
      const editor = createTestFlowEditor('<div data-block-type="panel_heading">Panel 1.1: [Cận cảnh]</div>');
      // Đặt con trỏ ở ký tự thứ 6 (sau "Panel")
      editor.commands.setTextSelection(6);
      editor.commands.keyboardShortcut('Backspace');
      const json = editor.getJSON();
      expect(json.content?.[0]?.attrs?.blockType).toBe('panel_heading');
    });

    it('tách đôi dòng văn bản khi nhấn Enter ở giữa dòng', () => {
      const editor = createTestFlowEditor('<div data-block-type="caption">Dòng một và dòng hai</div>');
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
  });
});

describe('ScriptLineBlockNode - gõ kịch bản đơn giản', () => {
  const typeOf = (editor: Editor, i = 0) => editor.getJSON().content?.[i]?.attrs?.blockType;

  it('Tab / Shift+Tab xoay vòng Hành động → Thoại → Lời dẫn → SFX', () => {
    const editor = createTestFlowEditor('<div data-block-type="stage_direction">Bùm</div>');
    editor.commands.setTextSelection(4);
    const seen = [1, 2, 3, 4].map(() => {
      editor.commands.keyboardShortcut('Tab');
      return typeOf(editor);
    });
    expect(seen).toEqual(['dialogue', 'caption', 'sfx', 'stage_direction']);
    editor.commands.keyboardShortcut('Shift-Tab');
    expect(typeOf(editor)).toBe('sfx');
  });

  it('Tab không đổi tiêu đề Trang / Panel', () => {
    const editor = createTestFlowEditor('<div data-block-type="panel_heading">Panel 1.1</div>');
    editor.commands.setTextSelection(3);
    editor.commands.keyboardShortcut('Tab');
    expect(typeOf(editor)).toBe('panel_heading');
  });

  it('Enter trên dòng thoại trống quay về dòng hành động', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue" data-speaker-name="Minh"></div>');
    editor.commands.setTextSelection(1);
    expect(editor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(typeOf(editor)).toBe('stage_direction');
    expect(editor.getJSON().content?.[0]?.attrs?.speakerName).toBeNull();
    // Không sinh thêm dòng kịch bản (StarterKit chỉ giữ một paragraph đuôi)
    expect(editor.getJSON().content?.filter((n) => n.type === 'scriptLineBlock')).toHaveLength(1);
  });

  it('Backspace ở đầu lời thoại bỏ nhãn người nói, giữ lời thoại', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue" data-speaker-name="Minh">Chạy đi</div>');
    editor.commands.setTextSelection(1);
    expect(editor.commands.keyboardShortcut('Backspace')).toBe(true);
    const node = editor.getJSON().content?.[0];
    expect(node?.attrs?.speakerName).toBeNull();
    expect((node?.content?.[0] as any)?.text).toBe('Chạy đi');
  });

  it('đọc lại HTML của thoại có nhãn: tên không lẫn vào lời thoại', () => {
    const editor = createTestFlowEditor('<div data-block-type="dialogue" data-speaker-name="Minh">Chạy đi</div>');
    const reparsed = createTestFlowEditor(editor.getHTML());
    const node = reparsed.getJSON().content?.[0];
    expect(node?.attrs?.speakerName).toBe('Minh');
    expect((node?.content?.[0] as any)?.text).toBe('Chạy đi');
  });
});
