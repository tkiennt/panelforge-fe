// src/roles/writer/components/script/flow/comic-editor/ComicScriptEditor.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  FileText,
  Film,
  User,
  Volume2,
  Scroll,
  HelpCircle,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Layers,
  ChevronRight,
  Info,
  Download,
} from 'lucide-react';

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
import { getNextPageNumber } from './comicCounting';
import { AiScriptConvertModal, convertScriptTextToComicBlocks } from '../converter';
import { INITIAL_COMIC_SCRIPT_DOC } from './sampleScript';

export interface ComicScriptEditorProps {
  initialContent?: any;
  onChange?: (json: any) => void;
  onShowToast?: (title: string, desc: string) => void;
  className?: string;
}

export const ComicScriptEditor: React.FC<ComicScriptEditorProps> = ({
  initialContent = INITIAL_COMIC_SCRIPT_DOC,
  onChange,
  onShowToast,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Thống kê tài liệu theo thời gian thực
  const [stats, setStats] = useState({
    pages: 1,
    panels: 2,
    dialogues: 3,
    sfx: 2,
    words: 78,
  });

  const notify = useCallback(
    (title: string, desc: string) => {
      onShowToast?.(title, desc);
    },
    [onShowToast]
  );

  const updateDocumentStats = useCallback((editorInstance: any) => {
    try {
      const json = editorInstance.getJSON();
      let pages = 0;
      let panels = 0;
      let dialogues = 0;
      let sfx = 0;
      let words = 0;

      const traverse = (node: any) => {
        if (!node) return;
        if (node.type === 'pageBlock') pages++;
        if (node.type === 'panelBlock') panels++;
        if (node.type === 'dialogueBlock') dialogues++;
        if (node.type === 'sfxBlock') sfx++;
        if (node.text) {
          const w = node.text.trim().split(/\s+/).filter(Boolean).length;
          words += w;
        }
        if (Array.isArray(node.content)) {
          node.content.forEach(traverse);
        }
      };

      traverse(json);
      setStats({
        pages: Math.max(pages, 1),
        panels,
        dialogues,
        sfx,
        words,
      });
    } catch {
      // Bỏ qua lỗi tính toán thống kê
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      PageBlockNode,
      PanelBlockNode,
      DialogueBlockNode,
      SfxBlockNode,
      CaptionBlockNode,
      SeriesBibleMentionNode.configure({
        suggestion: createComicMentionSuggestion(),
      }),
      ComicKeymapExtension.configure({
        onBlockTransformed: (type, detail) => {
          setLastAction(`${type} (${detail || ''})`);
          setTimeout(() => setLastAction(null), 2500);
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[550px] px-8 py-10 font-sans text-base leading-relaxed text-slate-900 bg-[#FCFBF8] selection:bg-orange-100 selection:text-orange-950 caret-[#C2410C]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateDocumentStats(ed);
      onChange?.(ed.getJSON());
    },
  });

  // Chèn nhanh block từ Toolbar
  const insertPageBlock = () => {
    if (!editor) return;
    const nextNum = String(stats.pages + 1).padStart(2, '0');
    const label = `TRANG ${nextNum}`;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'pageBlock',
        attrs: { pageNumber: nextNum, label },
        content: [{ type: 'text', text: `${label} - Bối cảnh mới` }],
      })
      .run();
  };

  const insertPanelBlock = () => {
    if (!editor) return;
    const nextPanel = `${stats.pages}.${stats.panels + 1}`;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'panelBlock',
        attrs: { panelNumber: nextPanel, cameraAngle: 'Trung cảnh' },
        content: [{ type: 'text', text: `Panel ${nextPanel}: ` }],
      })
      .run();
  };

  const insertCaptionBlock = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'captionBlock',
        content: [{ type: 'text', text: 'Lời dẫn truyện tiếp theo...' }],
      })
      .run();
  };

  const insertSfxBlock = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'sfxBlock',
        content: [{ type: 'text', text: 'BÙM! (Tiếng va chạm mạnh)' }],
      })
      .run();
  };

  const triggerMention = () => {
    if (!editor) return;
    editor.chain().focus().insertContent('@').run();
  };

  const handleCopyMarkdown = () => {
    if (!editor) return;
    const text = editor.getText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    notify('Đã sao chép kịch bản', 'Toàn bộ nội dung văn bản kịch bản đã được sao chép vào bộ nhớ tạm.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetSample = () => {
    if (!editor) return;
    editor.commands.setContent(INITIAL_COMIC_SCRIPT_DOC);
    updateDocumentStats(editor);
    notify('Đã khôi phục', 'Đã nạp lại kịch bản mẫu Comic Script.');
  };

  const handleApplyConvertedScript = (scriptText: string, mode: 'append' | 'insert' | 'replace') => {
    if (!editor) return;

    if (mode === 'replace') {
      const blocks = convertScriptTextToComicBlocks(scriptText, { startingPageNumber: 1 });
      editor.commands.setContent({ type: 'doc', content: blocks });
      updateDocumentStats(editor);
      notify('Đã ghi đè kịch bản', 'Toàn bộ nội dung đã được thay thế bằng kịch bản mới.');
      return;
    }

    if (mode === 'append') {
      const nextNum = getNextPageNumber(editor.state.doc);
      const blocks = convertScriptTextToComicBlocks(scriptText, { startingPageNumber: nextNum });
      const endPos = editor.state.doc.content.size;
      editor.chain().focus().insertContentAt(endPos, blocks).run();
      updateDocumentStats(editor);
      notify('Đã chèn kịch bản', `Đã thêm các trang mới (từ Trang ${nextNum}) vào cuối kịch bản.`);
      return;
    }

    if (mode === 'insert') {
      const currentPos = editor.state.selection.$from.pos;
      const currentNum = getNextPageNumber(editor.state.doc, currentPos);
      const blocks = convertScriptTextToComicBlocks(scriptText, { startingPageNumber: currentNum });
      editor.chain().focus().insertContent(blocks).run();
      updateDocumentStats(editor);
      notify('Đã chèn kịch bản', 'Đã chèn nội dung kịch bản mới tại vị trí con trỏ.');
      return;
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#F3F0E9] rounded-2xl border border-[#D8D2C5] shadow-lg overflow-hidden text-[#1C1917] ${className}`}
    >
      {/* 1. TOP HEADER TOOLBAR: KEYBOARD-FIRST EDITORIAL COCKPIT */}
      <header className="shrink-0 bg-[#FCFBF8] border-b border-[#EBE7DF] px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs z-30">
        {/* Nhóm nút Chèn Nhanh & Gợi Ý Phím Tắt */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-[#F3F0E9]/80 p-1 rounded-xl border border-[#E5E0D8]">
            {/* Nút Trang */}
            <button
              type="button"
              onClick={insertPageBlock}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#C2410C] bg-[#FFF2E6] hover:bg-[#FFE5D0] border border-[#F97316]/30 rounded-lg transition-all cursor-pointer shadow-2xs group"
              title="Chèn Trang mới (Phím tắt: gõ '#' rồi nhấn Tab)"
            >
              <FileText className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>+ Trang</span>
              <kbd className="hidden sm:inline text-[9px] font-mono bg-white/70 px-1 py-0.5 rounded text-[#C2410C] border border-[#C2410C]/20">
                # Tab
              </kbd>
            </button>

            {/* Nút Panel */}
            <button
              type="button"
              onClick={insertPanelBlock}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all cursor-pointer shadow-2xs group"
              title="Chèn Panel mới (Phím tắt: gõ '-' rồi nhấn Tab)"
            >
              <Film className="w-3.5 h-3.5 text-indigo-600" />
              <span>+ Panel</span>
              <kbd className="hidden sm:inline text-[9px] font-mono bg-white/70 px-1 py-0.5 rounded text-indigo-700 border border-indigo-200">
                - Tab
              </kbd>
            </button>

            {/* Nút Nhân vật (@) */}
            <button
              type="button"
              onClick={triggerMention}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer shadow-2xs"
              title="Chèn thực thể Bible (Phím tắt: gõ '@')"
            >
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>@ Nhân vật</span>
            </button>

            {/* Nút SFX */}
            <button
              type="button"
              onClick={insertSfxBlock}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-lg transition-all cursor-pointer"
              title="Chèn hiệu ứng âm thanh (Gõ * hoặc SFX: rồi Enter)"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">SFX</span>
            </button>

            {/* Nút Caption */}
            <button
              type="button"
              onClick={insertCaptionBlock}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
              title="Chèn lời dẫn truyện (Gõ Caption: rồi Enter)"
            >
              <Scroll className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Lời dẫn</span>
            </button>

            {/* Nút Smart Convert / Gen AI */}
            <button
              type="button"
              onClick={() => setShowConvertModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r from-[#C2410C] to-indigo-700 hover:from-[#9A3412] hover:to-indigo-800 rounded-lg transition-all cursor-pointer shadow-2xs group ml-1"
              title="Chuyển đổi văn bản thô hoặc AI viết phân cảnh kịch bản"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>⚡ Chuyển đổi / Gen AI</span>
            </button>
          </div>

          {/* Phản hồi trạng thái biến đổi O(1) Transaction */}
          {lastAction && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md animate-in fade-in slide-in-from-left-2">
              <Zap className="w-3 h-3 text-emerald-600" />
              <span>Đã chuyển thành {lastAction}</span>
            </div>
          )}
        </div>

        {/* Nhóm Tiện Ích: Thống Kê, Sao Chép, Phím Tắt */}
        <div className="flex items-center gap-2">
          {/* Nút Bảng Phím Tắt (Cheat Sheet) */}
          <button
            type="button"
            onClick={() => setShowCheatsheet((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              showCheatsheet
                ? 'bg-[#C2410C] text-white border-transparent shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border-[#E5E0D8] hover:bg-[#F3F0E9]'
            }`}
            title="Xem danh sách phím tắt gõ kịch bản tức thì"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phím tắt</span>
          </button>

          {/* Nút Nạp lại kịch bản mẫu */}
          <button
            type="button"
            onClick={handleResetSample}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white cursor-pointer"
            title="Nạp lại kịch bản mẫu ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Nút Sao chép kịch bản */}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#1C1917] hover:bg-[#C2410C] rounded-lg transition-all cursor-pointer shadow-xs"
            title="Sao chép toàn bộ văn bản kịch bản"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>
        </div>
      </header>

      {/* 2. CHEATSHEET BANNER EXPANDABLE */}
      {showCheatsheet && (
        <div className="bg-[#FFF8F2] border-b border-[#FDBA74] px-6 py-3 text-xs text-[#7C2D12] flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold">1. Tạo Trang:</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs">
                #
              </kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs">
                Tab
              </kbd>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold">2. Tạo Panel:</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs">
                -
              </kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs">
                Tab
              </kbd>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold">3. Thoại Nhân vật:</span>
              <span className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-[#FDBA74]">
                @Tên: "Thoại" + ↵
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold">4. Âm thanh (SFX):</span>
              <span className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-[#FDBA74]">
                * BÙM * hoặc SFX: TIẾNG NỔ + ↵
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold">5. Lời dẫn:</span>
              <span className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-[#FDBA74]">
                Caption: Lời dẫn + ↵
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold">6. Hoàn nguyên:</span>
              <kbd className="px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs">
                Backspace
              </kbd>
              <span>ở đầu dòng</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCheatsheet(false)}
            className="text-[#9A3412] hover:text-[#7C2D12] text-xs font-bold cursor-pointer"
          >
            ✕ Đóng
          </button>
        </div>
      )}

      {/* 3. MAIN EDITOR SURFACE (PAPER SHEET LAYOUT) */}
      <div className="flex-1 overflow-y-auto px-4 py-8 flex justify-center bg-[#F3F0E9]">
        <div className="w-full max-w-4xl bg-[#FCFBF8] rounded-2xl shadow-xl border border-[#D8D2C5] overflow-hidden">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 4. BOTTOM METRIC FOOTER BAR (60 FPS REAL-TIME STATS) */}
      <footer className="shrink-0 bg-[#FCFBF8] border-t border-[#EBE7DF] px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 font-mono shadow-2xs">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C2410C]" />
            <span className="font-bold text-slate-800">{stats.pages}</span>
            <span className="text-slate-500">Trang</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="font-bold text-slate-800">{stats.panels}</span>
            <span className="text-slate-500">Panels</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-bold text-slate-800">{stats.dialogues}</span>
            <span className="text-slate-500">Thoại</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-bold text-slate-800">{stats.sfx}</span>
            <span className="text-slate-500">SFX</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-4">
            <span className="font-semibold text-slate-700">{stats.words}</span>
            <span className="text-slate-500">từ</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Tiptap ProseMirror 60 FPS Engine · Keyboard-First</span>
        </div>
      </footer>

      {/* 5. MODAL SMART CONVERT & AI BIÊN KỊCH */}
      <AiScriptConvertModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onApplyScript={handleApplyConvertedScript}
        initialStartingPageNumber={editor ? getNextPageNumber(editor.state.doc) : 1}
        seriesBibleContext={{
          characters: [
            { name: 'Minh', role: 'Nam chính' },
            { name: 'Lan', role: 'Nữ chính' },
            { name: 'Người lạ mặt', role: 'Phản diện bí ẩn' },
          ],
          locations: ['Ngã tư Shibuya', 'Hẻm tối Shinjuku', 'Tòa nhà bỏ hoang'],
        }}
        onShowToast={notify}
      />
    </div>
  );
};
