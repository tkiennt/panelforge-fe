// src/roles/writer/components/script/flow/comic-editor/ComicScriptEditor.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  // 0. Space Triggers (# + Space, - + Space)
  it('biến đổi dòng chứa "#" thành pageBlock khi nhấn Space', () => {
    const editor = createTestEditor('<p>#</p>');
    editor.commands.setTextSelection(2);

    const handled = editor.commands.keyboardShortcut('Space');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('pageBlock');
    expect(firstNode?.attrs?.pageNumber).toBe('01');
  });

  it('biến đổi dòng chứa "-" thành panelBlock khi nhấn Space', () => {
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
    editor.commands.setTextSelection(2); // Đặt con trỏ sau ký tự '#'

    // Giả lập phím Tab
    const handled = editor.commands.keyboardShortcut('Tab');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('pageBlock');
    expect(firstNode?.attrs?.pageNumber).toBe('01');
    expect((firstNode?.content?.[0] as any)?.text).toContain('TRANG 01');
  });

  it('biến đổi dòng chứa "# Page 2" thành pageBlock TRANG 02 khi nhấn Tab', () => {
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

  // 4. Graceful Backspace (Undo Formatting Without Content Loss)
  it('hoàn nguyên pageBlock về paragraph dạng "# [text]" khi nhấn Backspace ở đầu khối', () => {
    const editor = createTestEditor({
      type: 'doc',
      content: [
        {
          type: 'pageBlock',
          attrs: { pageNumber: '01', label: 'TRANG 01' },
          content: [{ type: 'text', text: 'TRANG 01 - Mở đầu' }],
        },
      ],
    });

    // Đặt con trỏ ở vị trí 0 (đầu khối)
    editor.commands.setTextSelection(1);

    const handled = editor.commands.keyboardShortcut('Backspace');
    expect(handled).toBe(true);

    const json = editor.getJSON();
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('paragraph');
    expect((firstNode?.content?.[0] as any)?.text).toContain('# TRANG 01 - Mở đầu');
  });

  it('hoàn nguyên panelBlock về paragraph dạng "- [text]" khi nhấn Backspace ở đầu khối', () => {
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
    const firstNode = (json.content?.[0] as any);
    expect(firstNode?.type).toBe('paragraph');
    expect((firstNode?.content?.[0] as any)?.text).toContain('- Panel 1.1: Cận cảnh');
  });

  // 5. Render Editor Component
  it('hiển thị đầy đủ giao diện ComicScriptEditor kèm Toolbar và thống kê theo thời gian thực', async () => {
    render(<ComicScriptEditor />);

    // Kiểm tra các nút chèn nhanh
    expect(screen.getByText('+ Trang')).toBeInTheDocument();
    expect(screen.getByText('+ Panel')).toBeInTheDocument();
    expect(screen.getByText('@ Nhân vật')).toBeInTheDocument();
    expect(screen.getByText('Phím tắt')).toBeInTheDocument();
    expect(screen.getByText('Sao chép')).toBeInTheDocument();

    // Mở bảng Cheat Sheet phím tắt
    fireEvent.click(screen.getByText('Phím tắt'));
    expect(screen.getByText(/1\. Tạo Trang:/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Tạo Panel:/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Thoại Nhân vật:/)).toBeInTheDocument();
  });
});
