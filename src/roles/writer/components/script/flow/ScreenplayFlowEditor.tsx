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
  Compass,
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
          'focus:outline-none min-h-[500px] px-8 py-10 font-mono text-sm leading-relaxed text-gray-900 bg-[#FCFBF8] selection:bg-orange-100 selection:text-orange-900',
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

      // Lưu nháp an toàn vào localStorage (Debounce 1000ms - Hoàn toàn ở Client, KHÔNG gọi Backend)
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
          // Chỉ báo nháp nếu bản nháp mới hơn 10 giây trước
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

      // Gửi toàn bộ dòng kịch bản lên Backend
      await onSaveLines(extracted);

      // Lưu thành công: Dọn dẹp bản nháp cục bộ
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
          content: [{ type: 'text', text: `Mô tả bối cảnh hoặc cử chỉ nhân vật trong khung 1...` }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn Trang mới', `Đã thêm khối # Page ${nextNum} kèm khung hình 1.`);
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
          content: [{ type: 'text', text: `Mô tả góc nhìn hoặc hành động của khung hình ${nextNum}...` }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn Khung hình', `Đã thêm khối - Panel ${nextNum}: ${shotName}`);
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
          content: [{ type: 'text', text: '- Panel 1: Toàn cảnh (Wide Shot)' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'stage_direction' },
          content: [{ type: 'text', text: 'Thành phố Neo Tokyo về đêm rực rỡ ánh đèn neon dưới làn mưa phùn.' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: '- Panel 2: Cận cảnh (Close-up)' }],
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
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'stage_direction' },
          content: [{ type: 'text', text: '* SFX: TIẾNG SẤM RỀN *' }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn mẫu Trang & Khung hình', 'Đã thêm mẫu cấu trúc chuẩn gồm Trang, Panel, Thoại và SFX.');
  };

  const blockButtons: { type: MangaBlockType; label: string; icon: any }[] = [
    { type: 'page_heading', label: 'Trang (# Page)', icon: Layers },
    { type: 'panel_heading', label: 'Khung (- Panel)', icon: LayoutGrid },
    { type: 'scene_heading', label: 'Cảnh (H)', icon: Clapperboard },
    { type: 'stage_direction', label: 'Chỉ dẫn (Action)', icon: Film },
    { type: 'character', label: 'Nhân vật', icon: User },
    { type: 'dialogue', label: 'Thoại', icon: MessageSquare },
    { type: 'transition', label: 'Chuyển cảnh', icon: Type },
  ];

  return (
    <div className="flex flex-col rounded-2xl border border-[#D8D2C5] bg-[#FCFBF8] shadow-xs overflow-hidden">
      {/* Banner Khôi phục Bản Nháp Cục Bộ (Local Draft Recovery Banner) */}
      {pendingDraft && (
        <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Phát hiện bản nháp chưa lưu trên máy lúc{' '}
              <strong>{new Date(pendingDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>.
              Bạn có muốn khôi phục không?
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

      {/* Thanh công cụ định dạng khối (Toolbar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#EBE7DF] bg-[#F7F5EE]/70">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Nút chèn cấu trúc Comic/Manga nhanh */}
          <div className="flex items-center gap-1 pr-2 border-r border-[#E5E0D8]">
            <button
              type="button"
              disabled={!canEditScript || isChapterLocked}
              onClick={handleInsertPage}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#C2410C] hover:bg-[#9A3412] shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
              title="Chèn Khung hình mới: - Panel N: Cận cảnh"
            >
              <Plus className="w-3.5 h-3.5" />
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>+ Panel</span>
            </button>

            <button
              type="button"
              disabled={!canEditScript || isChapterLocked}
              onClick={handleInsertComicTemplate}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-all disabled:opacity-40 cursor-pointer"
              title="Chèn mẫu kịch bản gồm Trang, Panel, Thoại và SFX"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Chèn mẫu</span>
            </button>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1 ml-1 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Khối:
          </span>

          {blockButtons.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              disabled={!canEditScript || isChapterLocked}
              onClick={() => setBlockType(type)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                activeBlockType === type
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-400 hover:text-amber-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowCheatSheet((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ml-1 ${
              showCheatSheet
                ? 'bg-[#EFECE6] text-[#C2410C] border border-[#FDBA74]'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
            title="Xem bảng hướng dẫn cú pháp gõ Trang & Khung hình"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>Cú pháp Comic</span>
            {showCheatSheet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Trạng thái lưu & Nút lưu thủ công */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
            {isSaving ? (
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Đang lưu lên máy chủ...
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Chưa lưu (Ctrl+S)
              </span>
            ) : lastSavedTime ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Đã lưu lúc {lastSavedTime}
              </span>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!hasUnsavedChanges || isSaving || !canEditScript || isChapterLocked}
            onClick={handleManualSave}
            title="Lưu kịch bản lên máy chủ (Ctrl + S)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#F97316] text-white hover:bg-[#EA580C] shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu kịch bản</span>
          </button>
        </div>
      </div>

      {/* Bảng Cẩm Nang Cú Pháp Soạn Thảo (Collapsible Comic Markdown Cheat Sheet) */}
      {showCheatSheet && (
        <div className="bg-[#FAF8F5] border-b border-[#E5E0D8] p-4 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#C2410C] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              CẨM NANG CÚ PHÁP TẠO TRANG & KHUNG HÌNH (COMIC MARKDOWN):
            </span>
            <span className="text-[11px] text-[#78716C] italic">
              Khi lưu và chuyển sang tab <strong>[🎞️ Thumbnail]</strong>, hệ thống sẽ tự động bóc tách từng Trang và Khung hình trực quan.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="bg-white p-3 rounded-xl border border-[#E5E0D8] space-y-1">
              <div className="font-bold text-[#C2410C] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> 1. Tạo Trang mới
              </div>
              <code className="block bg-[#FFF2E6] text-[#C2410C] px-2 py-1 rounded text-[11px] font-bold">
                # Page 1
              </code>
              <p className="text-[11px] text-gray-500">
                Hoặc gõ <code className="bg-stone-100 px-1">Trang 1</code>, <code className="bg-stone-100 px-1"># 1</code>
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#E5E0D8] space-y-1">
              <div className="font-bold text-indigo-700 flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5" /> 2. Tạo Khung hình & Góc máy
              </div>
              <code className="block bg-indigo-50 text-indigo-800 px-2 py-1 rounded text-[11px] font-bold">
                - Panel 1: Cận cảnh
              </code>
              <p className="text-[11px] text-gray-500">
                Góc máy: <span className="font-semibold text-stone-700">Toàn cảnh, Trung cảnh, Đặc tả, POV</span>
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#E5E0D8] space-y-1">
              <div className="font-bold text-amber-800 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> 3. Lời thoại & Suy nghĩ
              </div>
              <code className="block bg-amber-50 text-amber-900 px-2 py-1 rounded text-[11px]">
                LUFFY: Ra khơi thôi!
              </code>
              <p className="text-[11px] text-gray-500">
                Suy nghĩ / hét: <code className="bg-stone-100 px-1">ZORO/Thought: Chờ đã...</code>
              </p>
            </div>

            <div className="bg-white p-3 rounded-xl border border-[#E5E0D8] space-y-1">
              <div className="font-bold text-stone-700 flex items-center gap-1">
                <Film className="w-3.5 h-3.5" /> 4. Hành động & Hiệu ứng âm
              </div>
              <code className="block bg-stone-100 text-stone-800 px-2 py-1 rounded text-[11px]">
                * BÙM! * hoặc SFX: RẦM!
              </code>
              <p className="text-[11px] text-gray-500">
                Các dòng văn bản dưới Panel là mô tả hành động bối cảnh.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner kịch bản đã đóng băng (Read-only status banner) */}
      {isChapterLocked && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            🔒 Kịch bản chương này đã được duyệt đóng băng. Hiện đang ở chế độ xem an toàn để chuyển giao cho bộ phận dựng layout hình ảnh.
          </span>
        </div>
      )}

      {/* Khung tài liệu soạn thảo kịch bản TipTap */}
      <div className="relative">
        <EditorContent editor={editor} />
      </div>

      {/* Footer thanh trạng thái & Phím tắt */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-[#F7F5EE]/60 border-t border-[#EBE7DF] text-xs text-gray-500 font-mono">
        <div className="flex items-center gap-4">
          <span>Gõ <strong># Page N</strong> để tạo Trang</span>
          <span>Gõ <strong>- Panel N: [Góc máy]</strong> để tạo Khung</span>
          <span>Phím <strong>Tab</strong>: Đổi giữa Nhân vật & Chỉ dẫn</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Khối hiện tại: <strong className="text-amber-700 uppercase">{activeBlockType}</strong></span>
          <span>Chế độ: <strong className="text-gray-700">{activeNarrationMode}</strong></span>
        </div>
      </div>
    </div>
  );
};
