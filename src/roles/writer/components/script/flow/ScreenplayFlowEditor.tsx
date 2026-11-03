// src/roles/writer/components/script/flow/ScreenplayFlowEditor.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Lock,
  Save,
  CheckCircle2,
  AlertTriangle,
  Type,
  User,
  MessageSquare,
  Clapperboard,
  Film,
  RotateCcw,
  Trash2,
  Plus,
  Layers,
  LayoutGrid,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SceneDetailDto, NarrationMode } from '@/services/scriptLine.service';
import { BibleEntryDto } from '@/services/bible.service';
import { ConsistencyFindingDto } from '@/types/pipeline';
import { ScriptLineBlockNode } from './nodes/ScriptLineBlockNode';
import { BibleMention } from './extensions/BibleMention';
import { createMentionSuggestion } from './extensions/mentionSuggestion';
import { ConsistencyLinterExtension } from './plugins/consistencyLinterPlugin';
import {
  scenesToTipTapDoc,
  extractScriptLinesFromDoc,
  ExtractedScriptLinePayload,
  generateGuid,
} from './scriptFlowAdapter';
import { MangaBlockType } from './types';

interface ScreenplayFlowEditorProps {
  chapterId?: string;
  scenes: SceneDetailDto[];
  allBibleEntries: BibleEntryDto[];
  consistencyFindings: ConsistencyFindingDto[];
  canEditScript: boolean;
  isChapterLocked: boolean;
  getSpeakerName?: (id?: string | null) => string | null;
  onSaveLines: (lines: ExtractedScriptLinePayload[]) => Promise<void>;
  onCreateStub?: (name: string) => Promise<void> | void;
  onShowToast?: (title: string, desc: string) => void;
}

interface LocalScriptDraft {
  doc: any;
  timestamp: number;
}

export const ScreenplayFlowEditor: React.FC<ScreenplayFlowEditorProps> = ({
  chapterId,
  scenes,
  allBibleEntries,
  consistencyFindings,
  canEditScript,
  isChapterLocked,
  getSpeakerName,
  onSaveLines,
  onCreateStub,
  onShowToast,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeBlockType, setActiveBlockType] = useState<MangaBlockType>('dialogue');
  const [activeNarrationMode, setActiveNarrationMode] = useState<NarrationMode>('Present');
  const [pendingDraft, setPendingDraft] = useState<LocalScriptDraft | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const localDraftTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draftStorageKey = useMemo(
    () => (chapterId ? `panelforge_draft_script_${chapterId}` : 'panelforge_draft_script_default'),
    [chapterId]
  );

  // Đóng gói danh sách BibleEntries cho mention popover
  const bibleEntriesRef = useRef<BibleEntryDto[]>(allBibleEntries);
  useEffect(() => {
    bibleEntriesRef.current = allBibleEntries;
  }, [allBibleEntries]);

  // Đóng gói danh sách Consistency Findings cho linter plugin
  const findingsRef = useRef<ConsistencyFindingDto[]>(consistencyFindings);
  useEffect(() => {
    findingsRef.current = consistencyFindings;
  }, [consistencyFindings]);

  const initialContent = useMemo(() => {
    return scenesToTipTapDoc(scenes, getSpeakerName);
  }, [scenes, getSpeakerName]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      ScriptLineBlockNode,
      BibleMention.configure({
        suggestion: createMentionSuggestion(() => bibleEntriesRef.current, onCreateStub),
      }),
      ConsistencyLinterExtension.configure({
        getFindings: () => findingsRef.current,
      }),
    ],
    content: initialContent,
    editable: canEditScript && !isChapterLocked,
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[600px] px-8 py-10 font-mono text-sm leading-relaxed text-gray-900 bg-[#FCFBF8] selection:bg-orange-100 selection:text-orange-900',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const currentBlock = editor.state.selection.$from.parent;
      if (currentBlock && currentBlock.type.name === 'scriptLineBlock') {
        setActiveBlockType(currentBlock.attrs.blockType || 'dialogue');
        setActiveNarrationMode(currentBlock.attrs.narrationMode || 'Present');
      }
    },
    onUpdate: ({ editor }) => {
      setHasUnsavedChanges(true);

      if (localDraftTimerRef.current) {
        clearTimeout(localDraftTimerRef.current);
      }
      localDraftTimerRef.current = setTimeout(() => {
        try {
          const draftData: LocalScriptDraft = {
            doc: editor.getJSON(),
            timestamp: Date.now(),
          };
          localStorage.setItem(draftStorageKey, JSON.stringify(draftData));
        } catch {
          // Bỏ qua lỗi quota localStorage nếu có
        }
      }, 1000);
    },
  });

  // Kiểm tra bản nháp chưa lưu trong localStorage khi mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed: LocalScriptDraft = JSON.parse(saved);
        if (parsed && parsed.doc && parsed.timestamp) {
          if (Date.now() - parsed.timestamp > 10000) {
            setPendingDraft(parsed);
          }
        }
      }
    } catch {
      // Bỏ qua nếu dữ liệu lỗi
    }
  }, [draftStorageKey]);

  // Cảnh báo người dùng khi cố đóng tab / tải lại trang mà chưa bấm Lưu
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Cập nhật trạng thái chỉ đọc khi quyền hạn hoặc chương bị đóng băng
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEditScript && !isChapterLocked);
    }
  }, [editor, canEditScript, isChapterLocked]);

  // Đồng bộ nội dung TipTap khi danh sách phân cảnh được nạp từ máy chủ
  useEffect(() => {
    if (editor && !editor.isDestroyed && !hasUnsavedChanges && !pendingDraft) {
      const newDoc = scenesToTipTapDoc(scenes, getSpeakerName);
      const currentDoc = editor.getJSON();
      if (JSON.stringify(currentDoc) !== JSON.stringify(newDoc)) {
        editor.commands.setContent(newDoc);
      }
    }
  }, [editor, scenes, getSpeakerName, hasUnsavedChanges, pendingDraft]);

  // Xử lý Lưu Kịch Bản thủ công (Chỉ gọi Backend khi bấm Lưu hoặc Ctrl+S)
  const handleManualSave = useCallback(async () => {
    if (!editor || !hasUnsavedChanges || isSaving || !canEditScript || isChapterLocked) return;

    if (localDraftTimerRef.current) {
      clearTimeout(localDraftTimerRef.current);
    }

    setIsSaving(true);
    try {
      const defaultSceneId = scenes[0]?.id || '';
      const extracted = extractScriptLinesFromDoc(editor.getJSON(), defaultSceneId);

      await onSaveLines(extracted);

      setHasUnsavedChanges(false);
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
      setPendingDraft(null);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      onShowToast?.('Đã lưu kịch bản', 'Toàn bộ nội dung kịch bản dòng chảy đã được cập nhật lên máy chủ.');
    } catch (err: any) {
      onShowToast?.('Lỗi lưu kịch bản', err.message || 'Không thể đồng bộ thay đổi về máy chủ.');
    } finally {
      setIsSaving(false);
    }
  }, [editor, hasUnsavedChanges, isSaving, canEditScript, isChapterLocked, scenes, onSaveLines, onShowToast, draftStorageKey]);

  // Phím tắt toàn cục: Ctrl + S / Cmd + S để lưu kịch bản
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (canEditScript && !isChapterLocked && hasUnsavedChanges && !isSaving) {
          void handleManualSave();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canEditScript, isChapterLocked, hasUnsavedChanges, isSaving, handleManualSave]);

  // Phục hồi bản nháp cục bộ
  const handleRestoreDraft = () => {
    if (!editor || !pendingDraft) return;
    editor.commands.setContent(pendingDraft.doc);
    setHasUnsavedChanges(true);
    setPendingDraft(null);
    onShowToast?.('Đã khôi phục bản nháp', 'Nội dung chưa lưu trước đó đã được nạp lại vào trình soạn thảo.');
  };

  // Huỷ bản nháp cục bộ
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
    setPendingDraft(null);
  };

  const setBlockType = (type: MangaBlockType) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes('scriptLineBlock', { blockType: type }).run();
    setActiveBlockType(type);
  };

  // Chèn nhanh Trang mới (# Page X)
  const handleInsertPage = () => {
    if (!editor || !canEditScript || isChapterLocked) return;
    const json = editor.getJSON();
    const existingPageCount = (json.content || []).filter((c: any) => {
      const t = c.content?.[0]?.text || '';
      return c.attrs?.blockType === 'page_heading' || /^(?:#\s*Page|Trang)/i.test(t);
    }).length;
    const nextNum = existingPageCount + 1;

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'page_heading',
          },
          content: [{ type: 'text', text: `# Page ${nextNum}` }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'panel_heading',
          },
          content: [{ type: 'text', text: `- Panel 1: Toàn cảnh` }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'stage_direction',
          },
          content: [{ type: 'text', text: `Mô tả bối cảnh hoặc hành động của khung hình 1...` }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn Trang', `Đã thêm # Page ${nextNum}`);
  };

  // Chèn nhanh Khung hình mới (- Panel Y: Cận cảnh)
  const handleInsertPanel = (shotName: string = 'Cận cảnh') => {
    if (!editor || !canEditScript || isChapterLocked) return;
    const json = editor.getJSON();
    const existingPanels = (json.content || []).filter((c: any) => {
      const t = c.content?.[0]?.text || '';
      return c.attrs?.blockType === 'panel_heading' || /^(?:-\s*Panel|#panel)/i.test(t);
    }).length;
    const nextNum = (existingPanels % 6) + 1;

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'panel_heading',
          },
          content: [{ type: 'text', text: `- Panel ${nextNum}: ${shotName}` }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'stage_direction',
          },
          content: [{ type: 'text', text: `Mô tả hành động của khung hình ${nextNum}...` }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn Panel', `Đã thêm - Panel ${nextNum}: ${shotName}`);
  };

  // Chèn mẫu cấu trúc Manga/Webtoon hoàn chỉnh
  const handleInsertComicTemplate = () => {
    if (!editor || !canEditScript || isChapterLocked) return;
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'page_heading' },
          content: [{ type: 'text', text: '# Page 1' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: '- Panel 1: Toàn cảnh' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'stage_direction' },
          content: [{ type: 'text', text: 'Thành phố Neo Tokyo về đêm rực rỡ ánh đèn neon dưới làn mưa phùn.' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: '- Panel 2: Cận cảnh' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'character', speakerName: 'MINH' },
          content: [{ type: 'text', text: 'MINH' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'dialogue' },
          content: [{ type: 'text', text: 'Chúng ta không còn nhiều thời gian nữa...' }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn mẫu', 'Đã thêm mẫu cấu trúc Trang, Panel và Thoại.');
  };

  // Danh sách các nút định dạng khối rút gọn
  const compactBlockButtons: { type: MangaBlockType; label: string; icon: any }[] = [
    { type: 'page_heading', label: 'Trang', icon: Layers },
    { type: 'panel_heading', label: 'Panel', icon: LayoutGrid },
    { type: 'scene_heading', label: 'Cảnh', icon: Clapperboard },
    { type: 'stage_direction', label: 'Chỉ dẫn', icon: Film },
    { type: 'character', label: 'Nhân vật', icon: User },
    { type: 'dialogue', label: 'Thoại', icon: MessageSquare },
    { type: 'transition', label: 'Chuyển cảnh', icon: Type },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-start gap-4 w-full">
      {/* 1. KHUNG TRANG GIẤY SOẠN THẢO CHÍNH (CENTER PAPER SHEET) */}
      <div className="flex-1 w-full bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-xs overflow-hidden flex flex-col min-w-0">
        {/* Banner Khôi phục Bản Nháp Cục Bộ (Local Draft Recovery Banner) */}
        {pendingDraft && (
          <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bản nháp lúc{' '}
                <strong>{new Date(pendingDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> chưa lưu.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRestoreDraft}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-200/80 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Khôi phục
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Bỏ qua
              </button>
            </div>
          </div>
        )}

        {/* Banner kịch bản đã đóng băng (Read-only status banner) */}
        {isChapterLocked && (
          <div className="flex items-center gap-2 px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Kịch bản đã đóng băng (chế độ xem).</span>
          </div>
        )}

        {/* Bảng Cẩm Nang Cú Pháp Rút Gọn */}
        {showCheatSheet && (
          <div className="bg-[#FAF8F5] border-b border-[#E5E0D8] p-3 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#C2410C] flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Cú pháp tách Trang & Panel (Comic Markdown):
              </span>
              <button
                type="button"
                onClick={() => setShowCheatSheet(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-[#C2410C]"># Page 1</strong>
                <p className="text-gray-500">Tạo trang mới</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-indigo-700">- Panel 1: Cận cảnh</strong>
                <p className="text-gray-500">Tạo khung & góc máy</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-amber-800">LUFFY: Thoại</strong>
                <p className="text-gray-500">Lời thoại nhân vật</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-stone-700">* BÙM! *</strong>
                <p className="text-gray-500">Âm thanh / SFX</p>
              </div>
            </div>
          </div>
        )}

        {/* VÙNG SOẠN THẢO TRANG GIẤY TIPTAP */}
        <div className="relative">
          <EditorContent editor={editor} />
        </div>

        {/* Footer thông tin rút gọn */}
        <div className="flex items-center justify-between px-6 py-2 bg-[#F7F5EE]/60 border-t border-[#EBE7DF] text-[11px] text-gray-500 font-mono">
          <div className="flex items-center gap-3">
            <span>Tab: Đổi Nhân vật / Chỉ dẫn</span>
            <span>Enter: Xuống dòng phân khối</span>
          </div>
          <div>
            Khối: <strong className="text-amber-700 uppercase">{activeBlockType}</strong>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TINH GỌN BÊN TAY PHẢI (RIGHT COMPACT TOOL PALETTE) */}
      <aside className="w-full lg:w-44 shrink-0 lg:sticky lg:top-4 space-y-2.5 font-sans">
        {/* Nhóm 1: Tạo Nhanh Trang & Panel */}
        <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-2.5 shadow-2xs space-y-1.5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
            Tạo cấu trúc
          </div>

          <button
            type="button"
            disabled={!canEditScript || isChapterLocked}
            onClick={handleInsertPage}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
            title="Chèn Trang mới: # Page N"
          >
            <Plus className="w-3.5 h-3.5" />
            <Layers className="w-3.5 h-3.5" />
            <span>+ Trang</span>
          </button>

          <button
            type="button"
            disabled={!canEditScript || isChapterLocked}
            onClick={() => handleInsertPanel('Cận cảnh')}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
            title="Chèn Khung hình mới: - Panel N"
          >
            <Plus className="w-3.5 h-3.5" />
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>+ Panel</span>
          </button>

          <button
            type="button"
            disabled={!canEditScript || isChapterLocked}
            onClick={handleInsertComicTemplate}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all disabled:opacity-40 cursor-pointer"
            title="Chèn mẫu Trang & Panel"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Mẫu truyện</span>
          </button>
        </div>

        {/* Nhóm 2: Định Dạng Khối (Blocks) */}
        <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-2.5 shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
            Khối kịch bản
          </div>

          <div className="grid grid-cols-1 gap-1">
            {compactBlockButtons.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                disabled={!canEditScript || isChapterLocked}
                onClick={() => setBlockType(type)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 w-full text-left ${
                  activeBlockType === type
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'bg-white text-gray-700 border border-gray-200/80 hover:border-amber-400 hover:text-amber-700'
                } disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Nhóm 3: Lưu & Cú Pháp */}
        <div className="bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl p-2.5 shadow-2xs space-y-2">
          <button
            type="button"
            disabled={!hasUnsavedChanges || isSaving || !canEditScript || isChapterLocked}
            onClick={handleManualSave}
            title="Lưu kịch bản lên máy chủ (Ctrl + S)"
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-bold bg-[#F97316] text-white hover:bg-[#EA580C] shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu kịch bản'}</span>
          </button>

          {/* Trạng thái lưu gọn */}
          <div className="text-[11px] text-center font-mono py-0.5">
            {isSaving ? (
              <span className="text-amber-600 font-medium">Đang lưu...</span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-700 font-medium flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Chưa lưu (Ctrl+S)
              </span>
            ) : lastSavedTime ? (
              <span className="text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Đã lưu {lastSavedTime}
              </span>
            ) : (
              <span className="text-gray-400">Ctrl + S để lưu</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCheatSheet((prev) => !prev)}
            className={`flex items-center justify-center gap-1 w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              showCheatSheet
                ? 'bg-[#FFF2E6] text-[#C2410C] border-[#FDBA74]'
                : 'bg-white text-stone-600 border-gray-200 hover:text-stone-900'
            }`}
            title="Xem bảng hướng dẫn cú pháp gõ Trang & Khung hình"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>Cú pháp Comic</span>
            {showCheatSheet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </aside>
    </div>
  );
};
