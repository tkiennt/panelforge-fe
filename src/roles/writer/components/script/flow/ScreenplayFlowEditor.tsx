// src/roles/writer/components/script/flow/ScreenplayFlowEditor.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Lock,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Type,
  User,
  MessageSquare,
  Clapperboard,
  Film,
  Compass,
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
  scenes: SceneDetailDto[];
  allBibleEntries: BibleEntryDto[];
  consistencyFindings: ConsistencyFindingDto[];
  canEditScript: boolean;
  isChapterLocked: boolean;
  getSpeakerName?: (id?: string | null) => string | null;
  onSaveLines: (lines: ExtractedScriptLinePayload[]) => Promise<void>;
  onShowToast?: (title: string, desc: string) => void;
}

export const ScreenplayFlowEditor: React.FC<ScreenplayFlowEditorProps> = ({
  scenes,
  allBibleEntries,
  consistencyFindings,
  canEditScript,
  isChapterLocked,
  getSpeakerName,
  onSaveLines,
  onShowToast,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeBlockType, setActiveBlockType] = useState<MangaBlockType>('dialogue');
  const [activeNarrationMode, setActiveNarrationMode] = useState<NarrationMode>('Present');

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestLinesRef = useRef<ExtractedScriptLinePayload[]>([]);

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
        paragraph: false,
      }),
      ScriptLineBlockNode,
      BibleMention.configure({
        suggestion: createMentionSuggestion(() => bibleEntriesRef.current),
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
      const defaultSceneId = scenes[0]?.id || '';
      const extracted = extractScriptLinesFromDoc(editor.getJSON(), defaultSceneId);
      latestLinesRef.current = extracted;

      // Debounce autosave 2000ms
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          await onSaveLines(latestLinesRef.current);
          setHasUnsavedChanges(false);
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch {
          // Lỗi lưu tự động
        } finally {
          setIsSaving(false);
        }
      }, 2000);
    },
  });

  // Cập nhật trạng thái chỉ đọc khi quyền hạn hoặc chương bị đóng băng
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEditScript && !isChapterLocked);
    }
  }, [editor, canEditScript, isChapterLocked]);

  const handleManualSave = useCallback(async () => {
    if (!editor || !hasUnsavedChanges) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setIsSaving(true);
    try {
      const defaultSceneId = scenes[0]?.id || '';
      const extracted = extractScriptLinesFromDoc(editor.getJSON(), defaultSceneId);
      await onSaveLines(extracted);
      setHasUnsavedChanges(false);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      onShowToast?.('Đã lưu kịch bản', 'Toàn bộ nội dung văn bản kịch bản dòng chảy đã được cập nhật.');
    } catch {
      onShowToast?.('Lỗi lưu kịch bản', 'Không thể đồng bộ thay đổi về máy chủ.');
    } finally {
      setIsSaving(false);
    }
  }, [editor, hasUnsavedChanges, scenes, onSaveLines, onShowToast]);

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
              <span className="flex items-center gap-1.5 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Đang lưu...
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-700 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Có thay đổi chưa lưu
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu ngay</span>
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
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-700 shadow-2xs">Enter</kbd> Chuyển đổi khối thông minh (Grainery Cycling)
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-700 shadow-2xs">Tab</kbd> Đổi nhanh giữa Chỉ dẫn & Nhân vật
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-rose-600 border-rose-200 shadow-2xs font-bold">@</kbd> Gắn thẻ Series Bible (Coral Pink)
          </span>
        </div>

        <div className="text-gray-400">
          Chế độ dòng chảy ProseMirror • Single Source of Truth
        </div>
      </div>
    </div>
  );
};
