// src/roles/writer/components/script/flow/comic-editor/ComicScriptEditor.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

import {
  PageBlockNode,
  PanelBlockNode,
  DialogueBlockNode,
  SfxBlockNode,
  CaptionBlockNode,
} from './nodes';
import {
  ComicKeymapExtension,
  SeriesBibleMentionNode,
  createComicMentionSuggestion,
} from './extensions';
import { ComicScriptEditor } from './ComicScriptEditor';

function createTestEditor(initialContent: any = '<p></p>') {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: false }),
      PageBlockNode,
      PanelBlockNode,
      DialogueBlockNode,
      SfxBlockNode,
      CaptionBlockNode,
      SeriesBibleMentionNode.configure({
        suggestion: createComicMentionSuggestion(),
      }),
      ComicKeymapExtension,
    ],
    content: initialContent,
  });
}

describe('ComicScriptEditor - Tiptap Keyboard-First Engine', () => {
  // 0. Space Triggers (# + Space, - + Space, ! + Space, " + Space)
  it('biến đổi dòng chứa "#" hoặc "!" thành pageBlock khi nhấn Space', () => {
    const editor = createTestEditor('<p>#</p>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Space');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('pageBlock');
    expect(firstNode?.attrs?.pageNumber).toBe('01');
  });

  it('biến đổi dòng chứa "-" hoặc \'"\' thành panelBlock khi nhấn Space', () => {
    const editor = createTestEditor('<p>-</p>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Space');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('panelBlock');
    expect(firstNode?.attrs?.panelNumber).toBe('1.1');
  });

  // 1. Page Trigger (# + Tab)
  it('biến đổi dòng chứa "#" thành pageBlock khi nhấn Tab', () => {
    const editor = createTestEditor('<p>#</p>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('pageBlock');
    expect(firstNode?.attrs?.pageNumber).toBe('01');
    expect((firstNode?.content?.[0] as any)?.text).toContain('Trang 01');
  });

  it('biến đổi dòng chứa "# Page 2" thành pageBlock Trang 02 khi nhấn Tab', () => {
    const editor = createTestEditor('<p># Page 2</p>');
    editor.commands.setTextSelection(9);

    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('pageBlock');
    expect(firstNode?.attrs?.pageNumber).toBe('02');
  });

  // 2. Panel Trigger (- + Tab)
  it('biến đổi dòng chứa "-" thành panelBlock khi nhấn Tab', () => {
    const editor = createTestEditor('<p>-</p>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('panelBlock');
    expect(firstNode?.attrs?.panelNumber).toBe('1.1');
    expect((firstNode?.content?.[0] as any)?.text).toContain('Panel 1.1:');
  });

  it('biến đổi dòng chứa "- Panel 2.3" thành panelBlock 2.3 khi nhấn Tab', () => {
    const editor = createTestEditor('<p>- Panel 2.3</p>');
    editor.commands.setTextSelection(12);

    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('panelBlock');
    expect(firstNode?.attrs?.panelNumber).toBe('2.3');
  });

  // 3. Line Completion on Enter (Incremental O(1) Parsing)
  it('tự động biến đổi dòng thoại @Minh: "Cẩn thận đấy!" thành dialogueBlock khi nhấn Enter', () => {
    const editor = createTestEditor('<p>@Minh: "Cẩn thận đấy!"</p>');
    editor.commands.setTextSelection(26);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const dialogueNode = (json.content?.[0] as any);
    expect(dialogueNode?.type).toBe('dialogueBlock');
    expect(dialogueNode?.attrs?.character).toBe('Minh');
    expect((dialogueNode?.content?.[0] as any)?.text).toBe('Cẩn thận đấy!');

    // Tự động tạo dòng trống tiếp theo để gõ tiếp
    expect(json.content?.[1]?.type).toBe('paragraph');
  });

  it('tự động biến đổi dòng SFX * BÙM * thành sfxBlock khi nhấn Enter', () => {
    const editor = createTestEditor('<p>* BÙM *</p>');
    editor.commands.setTextSelection(8);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const sfxNode = (json.content?.[0] as any);
    expect(sfxNode?.type).toBe('sfxBlock');
    expect((sfxNode?.content?.[0] as any)?.text).toBe('BÙM');
    expect(json.content?.[1]?.type).toBe('paragraph');
  });

  it('tự động biến đổi dòng SFX: TIẾNG NỔ thành sfxBlock khi nhấn Enter', () => {
    const editor = createTestEditor('<p>SFX: TIẾNG NỔ LỚN</p>');
    editor.commands.setTextSelection(18);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const sfxNode = (json.content?.[0] as any);
    expect(sfxNode?.type).toBe('sfxBlock');
    expect((sfxNode?.content?.[0] as any)?.text).toBe('TIẾNG NỔ LỚN');
  });

  it('tự động biến đổi dòng Caption: Lời dẫn thành captionBlock khi nhấn Enter', () => {
    const editor = createTestEditor('<p>Caption: Đêm đã về khuya trên thành phố.</p>');
    editor.commands.setTextSelection(42);

    const handled = editor.commands.keyboardShortcut('Enter');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const captionNode = (json.content?.[0] as any);
    expect(captionNode?.type).toBe('captionBlock');
    expect((captionNode?.content?.[0] as any)?.text).toBe('Đêm đã về khuya trên thành phố.');
    expect(json.content?.[1]?.type).toBe('paragraph');
  });

  // 4. Backspace: Cho phép xóa Panel và Page, không thể xóa tiêu đề trang
  it('không thể xóa pageBlock đầu tiên (tiêu đề trang) khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestEditor({
      type: 'doc',
      content: [
        {
          type: 'pageBlock',
          attrs: { pageNumber: '01', label: 'Trang 01' },
          content: [{ type: 'text', text: 'Trang 01 - Mở đầu' }],
        },
      ],
    });

    editor.commands.setTextSelection(1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('pageBlock');
  });

  it('cho phép xóa pageBlock thứ hai khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestEditor({
      type: 'doc',
      content: [
        {
          type: 'pageBlock',
          attrs: { pageNumber: '01', label: 'Trang 01' },
          content: [{ type: 'text', text: 'Trang 01' }],
        },
        {
          type: 'pageBlock',
          attrs: { pageNumber: '02', label: 'Trang 02' },
          content: [{ type: 'text', text: 'Trang 02' }],
        },
      ],
    });

    // Vị trí đầu khối pageBlock thứ 2
    const secondPagePos = editor.state.doc.resolve(editor.state.doc.content.size - 2).before();
    editor.commands.setTextSelection(secondPagePos + 1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const pageBlocks = json.content?.filter((n: any) => n.type === 'pageBlock');
    expect(pageBlocks?.length).toBe(1);
    expect((pageBlocks?.[0] as any)?.attrs?.pageNumber).toBe('01');
  });

  it('cho phép xóa panelBlock khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestEditor({
      type: 'doc',
      content: [
        {
          type: 'panelBlock',
          attrs: { panelNumber: '1.1' },
          content: [{ type: 'text', text: 'Panel 1.1: Cận cảnh' }],
        },
      ],
    });

    editor.commands.setTextSelection(1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const panelBlocks = json.content?.filter((n: any) => n.type === 'panelBlock');
    expect(panelBlocks?.length).toBe(0);
  });

  // 5. Render Editor Component
  it('hiển thị đầy đủ giao diện ComicScriptEditor kèm Toolbar và thống kê theo thời gian thực', async () => {
    render(<ComicScriptEditor />);

    // Kiểm tra các nút chèn nhanh
    expect(screen.getByText('+ Trang')).toBeInTheDocument();
    expect(screen.getByText('+ Panel')).toBeInTheDocument();
    expect(screen.getByText('@ Nhân vật')).toBeInTheDocument();
    expect(screen.getByText('⚡ Chuyển đổi / Gen AI')).toBeInTheDocument();
    expect(screen.getByText('Phím tắt')).toBeInTheDocument();
    expect(screen.getByText('Sao chép')).toBeInTheDocument();

    // Mở Modal Smart Convert & AI
    fireEvent.click(screen.getByText('⚡ Chuyển đổi / Gen AI'));
    expect(screen.getByText('Smart Convert & AI Biên Kịch')).toBeInTheDocument();
    expect(screen.getByText('1. Chuyển đổi văn bản thô (Paste & Convert)')).toBeInTheDocument();

    // Đóng modal
    fireEvent.click(screen.getByText('Đóng'));

    // Mở bảng Cheat Sheet phím tắt
    fireEvent.click(screen.getByText('Phím tắt'));
    expect(screen.getByText(/1\. Tạo Trang:/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Tạo Panel:/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Thoại Nhân vật:/)).toBeInTheDocument();
  });

  // 6. Quy chuẩn Tăng Tự Động & Enter-Key Propagation Rules
  describe('Auto-Increment & Enter-Key Propagation Rules', () => {
    it('tăng số trang tuần tự Page 1 -> Page 2 -> Page 3 khi gõ "#" rồi nhấn Tab hoặc Space', () => {
      const editor = createTestEditor('<p></p>');

      // Tạo Page 1
      editor.commands.setContent('<p>#</p>');
      editor.commands.setTextSelection(2);
      editor.commands.keyboardShortcut('Space');

      // Nhấn Enter tạo paragraph rỗng, gõ "#" rồi nhấn Space
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('#');
      editor.commands.keyboardShortcut('Space');

      // Nhấn Enter tạo paragraph rỗng, gõ "#" rồi nhấn Tab
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('#');
      editor.commands.keyboardShortcut('Tab');

      const pages = (editor.getJSON().content || []).filter((n: any) => n.type === 'pageBlock');
      expect(pages.length).toBe(3);
      expect(pages[0]?.attrs?.pageNumber).toBe('01');
      expect(pages[1]?.attrs?.pageNumber).toBe('02');
      expect(pages[2]?.attrs?.pageNumber).toBe('03');
    });

    it('tăng số khung hình Panel 1.1 -> Panel 1.2 -> Panel 1.3 và tự động reset về Panel 2.1 khi qua Trang 2', () => {
      const editor = createTestEditor('<p>#</p>');
      editor.commands.setTextSelection(2);
      editor.commands.keyboardShortcut('Space'); // Page 01

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

      // Panel 1.3
      editor.commands.keyboardShortcut('Enter');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      editor.commands.insertContent('-');
      editor.commands.keyboardShortcut('Space');

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

      const pages = (editor.getJSON().content || []).filter((n: any) => n.type === 'pageBlock');
      expect(pages[0]?.attrs?.pageNumber).toBe('01');
      expect(pages[1]?.attrs?.pageNumber).toBe('02');

      const panels = (editor.getJSON().content || []).filter((n: any) => n.type === 'panelBlock');
      expect(panels.length).toBe(4);
      expect(panels[0]?.attrs?.panelNumber).toBe('1.1');
      expect(panels[1]?.attrs?.panelNumber).toBe('1.2');
      expect(panels[2]?.attrs?.panelNumber).toBe('1.3');
      expect(panels[3]?.attrs?.panelNumber).toBe('2.1');
    });

    it('nhấn Enter sau một Panel tạo một paragraph rỗng, TUYỆT ĐỐI KHÔNG tự biến thành dialogue', () => {
      const editor = createTestEditor('<div data-type="panel-block">Panel 1.1: [Cận cảnh]</div>');

      // Đặt con trỏ bên trong panelBlock
      editor.commands.setTextSelection(2);
      const handled = editor.commands.keyboardShortcut('Enter');
      expect(handled).toBe(true);

      const json = editor.getJSON();
      expect(json.content?.[0]?.type).toBe('panelBlock');
      // Node tiếp theo phải là paragraph thông thường
      expect(json.content?.[1]?.type).toBe('paragraph');
      expect(json.content?.[1]?.attrs?.blockType).toBeUndefined();
    });

    it('chuyển @Minh: "Hello" thành dialogue, nhưng giữ nguyên @Minh walks away dạng paragraph', () => {
      const editor = createTestEditor('<p>@Minh: "Hello"</p>');
      editor.commands.setTextSelection(editor.state.doc.content.size - 1);
      const handled1 = editor.commands.keyboardShortcut('Enter');
      expect(handled1).toBe(true);

      const json1 = editor.getJSON();
      expect(json1.content?.[0]?.type).toBe('dialogueBlock');
      expect(json1.content?.[0]?.attrs?.character).toBe('Minh');
      expect((json1.content?.[0] as any)?.content?.[0]?.text).toBe('Hello');
      // Dòng tiếp theo được chèn sẵn là paragraph rỗng cho phép viết tự do
      expect(json1.content?.[1]?.type).toBe('paragraph');

      // Kiểm tra dòng không có dấu ngoặc kép: @Minh walks away
      const editor2 = createTestEditor('<p>@Minh walks away</p>');
      editor2.commands.setTextSelection(editor2.state.doc.content.size - 1);
      editor2.commands.keyboardShortcut('Enter');

      const json2 = editor2.getJSON();
      expect(json2.content?.[0]?.type).toBe('paragraph');
      expect(json2.content?.[0]?.type).not.toBe('dialogueBlock');
      expect((json2.content?.[0] as any)?.attrs?.character).toBeUndefined();
    });
  });
});
