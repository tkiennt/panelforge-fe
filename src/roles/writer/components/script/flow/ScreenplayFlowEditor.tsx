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
} from 'lucide-react';
import { SceneDetailDto, NarrationMode } from '@/services/scriptLine.service';
import { BibleEntryDto } from '@/services/bible.service';
import { ConsistencyFindingDto } from '@/types/pipeline';
import { ScriptLineBlockNode } from './nodes/ScriptLineBlockNode';
import { BibleMention } from './extensions/BibleMention';
import { createMentionSuggestion } from './extensions/mentionSuggestion';
import { ConsistencyLinterExtension } from './plugins/consistencyLinterPlugin';
import { scenesToTipTapDoc, extractScriptLinesFromDoc, ExtractedScriptLinePayload } from './scriptFlowAdapter';
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

  const setNarration = (mode: NarrationMode) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes('scriptLineBlock', { narrationMode: mode }).run();
    setActiveNarrationMode(mode);
  };

  const blockButtons: { type: MangaBlockType; label: string; icon: any }[] = [
    { type: 'scene_heading', label: 'Cảnh (H)', icon: Clapperboard },
    { type: 'stage_direction', label: 'Chỉ dẫn (Action)', icon: Film },
    { type: 'character', label: 'Nhân vật (Character)', icon: User },
    { type: 'dialogue', label: 'Thoại (Dialogue)', icon: MessageSquare },
    { type: 'transition', label: 'Chuyển cảnh (Trans)', icon: Type },
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
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Khối:
          </span>

          {blockButtons.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              disabled={!canEditScript || isChapterLocked}
              onClick={() => setBlockType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                activeBlockType === type
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-400 hover:text-amber-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
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

      {/* Banner kịch bản đã đóng băng (Read-only status banner) */}
      {isChapterLocked && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Kịch bản đang ở chế độ Đóng Băng (Read-Only):</strong> Producer đã khóa kịch bản để đưa vào sản xuất hình ảnh. Để sửa, Writer cần gửi yêu cầu mở lại kịch bản (Request Reopen).
          </span>
        </div>
      )}

      {/* Editor Content Area (Khung soạn thảo JetBrains Mono phong cách kịch bản phim) */}
      <div className="relative min-h-[600px] overflow-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Thanh footer hướng dẫn phím tắt (Keyboard shortcuts guide) */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-[#F7F5EE]/50 border-t border-[#EBE7DF] text-[11px] text-gray-500 font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-700 shadow-2xs">Ctrl + S</kbd> Lưu kịch bản lên máy chủ
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-700 shadow-2xs">Enter</kbd> Chuyển đổi khối thông minh
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-700 shadow-2xs">Tab</kbd> Đổi nhanh giữa Chỉ dẫn & Nhân vật
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-rose-600 border-rose-200 shadow-2xs font-bold">@</kbd> Gắn thẻ Series Bible
          </span>
        </div>

        <div className="text-gray-400">
          Chế độ dòng chảy ProseMirror • Single Source of Truth
        </div>
      </div>
    </div>
  );
};
