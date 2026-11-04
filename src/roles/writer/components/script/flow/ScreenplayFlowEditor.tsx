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
  FileText,
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
  const [hoveredMention, setHoveredMention] = useState<{
    x: number;
    y: number;
    entry: BibleEntryDto;
  } | null>(null);
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
          'focus:outline-none min-h-[600px] px-8 py-10 font-mono text-sm leading-relaxed text-gray-900 bg-[#FCFBF8] selection:bg-orange-100 selection:text-orange-900 caret-[#C2410C]',
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const toggleBtn = target.closest('.page-toggle-btn');
        if (toggleBtn) {
          const pageHeader = toggleBtn.closest('[data-block-type="page_heading"]');
          if (pageHeader) {
            let sibling = pageHeader.nextElementSibling as HTMLElement | null;
            const isCurrentlyCollapsed = toggleBtn.getAttribute('data-collapsed') === 'true';
            const willCollapse = !isCurrentlyCollapsed;
            toggleBtn.setAttribute('data-collapsed', willCollapse ? 'true' : 'false');
            toggleBtn.textContent = willCollapse ? '▶ Mở rộng' : '▼ Thu gọn';

            while (sibling) {
              if (sibling.getAttribute('data-block-type') === 'page_heading') {
                break;
              }
              sibling.style.display = willCollapse ? 'none' : '';
              sibling = sibling.nextElementSibling as HTMLElement | null;
            }
            return true;
          }
        }
        return false;
      },
      handleTextInput: (view, from, to, text) => {
        if (text === ':') {
          const { state } = view;
          const { $from } = state.selection;
          const currentBlock = $from.parent;

          // 1. Phía trước con trỏ là node bibleMention (hoặc có khoảng trắng sau mention)
          const nodeBefore = $from.nodeBefore;
          const isDirectlyAfterMention = nodeBefore?.type.name === 'bibleMention';
          const spaceLen = nodeBefore?.isText ? nodeBefore.text?.length || 0 : 0;
          const isAfterSpaceMention =
            nodeBefore?.isText &&
            nodeBefore.text?.trim() === '' &&
            from - spaceLen > 0 &&
            $from.doc.resolve(from - spaceLen).nodeBefore?.type.name === 'bibleMention';

          // 2. Hoặc người dùng gõ text thủ công bắt đầu dòng bằng @Tên hoặc TÊN_IN_HOA
          const textBefore = currentBlock.textBetween(0, $from.parentOffset);
          const isManualCharacterName = /^@?[a-zA-ZÀ-Ỹ0-9_]{2,30}\s*$/.test(textBefore);

          if (isDirectlyAfterMention || isAfterSpaceMention || isManualCharacterName) {
            const endsWithSpace = textBefore.endsWith(' ') || (nodeBefore?.isText && nodeBefore.text?.endsWith(' '));
            const insertStr = endsWithSpace ? ': ""' : ' : ""';

            const tr = state.tr.insertText(insertStr, from, to);
            // Đặt con trỏ vào chính giữa 2 dấu ngoặc kép "" (vị trí trước dấu ngoặc đóng)
            const targetPos = from + insertStr.length - 1;
            const targetResolved = tr.doc.resolve(targetPos);
            tr.setSelection(state.selection.constructor.near(targetResolved));
            view.dispatch(tr);
            return true;
          }
        }
        return false;
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

      // Tự động nhận diện cú pháp phân đoạn khi người dùng gõ thủ công (Auto-detect Markdown/Screenplay Tokens)
      try {
        const { state } = editor;
        const { selection } = state;
        const currentBlock = selection.$from.parent;

        if (currentBlock && currentBlock.type.name === 'scriptLineBlock') {
          const rawText = currentBlock.textContent.trim();
          const currentType: MangaBlockType = currentBlock.attrs.blockType || 'dialogue';
          let detectedType: MangaBlockType | null = null;
          let detectedSpeaker: string | null = null;

          // 1. Nhận diện Trang: # Page 1, #Page 1, Trang 1, Page 1
          if (/^(?:#\s*(?:Page\s*)?\d+(?:\.\d+)?|(?:Trang|Page)\s+\d+(?:\.\d+)?)/i.test(rawText)) {
            detectedType = 'page_heading';
          }
          // 2. Nhận diện Panel: - Panel 1.1, Panel 1.1, Khung 1.1, #panel 1.1, - 1.1, - Panel 1
          else if (/^(?:(?:-\s*)?(?:Panel|Khung)\s*\d+(?:\.\d+)?|-\s*\d+(?:\.\d+)?|#panel\s*\d+(?:\.\d+)?)/i.test(rawText)) {
            detectedType = 'panel_heading';
          }
          // 3. Nhận diện Tiêu đề phân cảnh: CẢNH 1, INT., EXT., SCENE 1
          else if (/^(?:CẢNH\s+\d+|INT\.|EXT\.|SCENE\s+\d+)/i.test(rawText)) {
            detectedType = 'scene_heading';
          }
          // 4. Nhận diện Âm thanh / Chỉ dẫn: * BÙM!, SFX: TIẾNG NỔ, * SCREECH *
          else if (/^(?:\*|SFX\s*:)/i.test(rawText)) {
            detectedType = 'stage_direction';
          }
          // 5. Nhận diện Chuyển cảnh: CUT TO:, FADE OUT:, CHUYỂN CẢNH:
          else if (/^(?:CUT TO:|FADE OUT:|CHUYỂN CẢNH:)/i.test(rawText)) {
            detectedType = 'transition';
          }
          // 2b. Nhận diện Lời dẫn truyện (Caption): "Lời dẫn truyện: ...", "Lời dẫn: ...", "Caption: ..."
          else if (/^(?:Lời dẫn truyện|Lời dẫn|Caption|Dẫn chuyện)\s*:\s*([^"“].*)$/i.test(rawText)) {
            detectedType = 'caption';
          }
          // 6. Nhận diện Thoại có cú pháp @SeriesBible : "LỜI THOẠI" hoặc NHÂN VẬT : "LỜI THOẠI" (Bắt buộc có ngoặc kép)
          else if (/^@?([a-zA-ZÀ-Ỹ0-9_\s]{2,30})\s*:\s*["“](.*?)["”]?$/.test(rawText)) {
            const match = rawText.match(/^@?([a-zA-ZÀ-Ỹ0-9_\s]{2,30})\s*:\s*["“](.*?)["”]?$/);
            if (match) {
              detectedType = 'dialogue';
              detectedSpeaker = match[1].trim();
            }
          }
          // 6b. Nhận diện Lời dẫn chuyện có tên người dẫn/nhân vật (không có ngoặc kép)
          else if (/^@?([a-zA-ZÀ-Ỹ0-9_\s]{2,30})\s*:\s*([^"“\s].*)$/.test(rawText)) {
            detectedType = 'stage_direction';
          }
          // 7. Nhận diện Tên nhân vật: @MINH hoặc TÊN VIẾT HOA đứng riêng một dòng
          else if (
            /^@([a-zA-ZÀ-Ỹ0-9_\s]{2,30})$/.test(rawText) ||
            (rawText.length >= 2 &&
            rawText.length <= 30 &&
            rawText === rawText.toUpperCase() &&
            !rawText.includes('.') &&
            !rawText.includes(':') &&
            !rawText.includes('-') &&
            !/^\d+$/.test(rawText))
          ) {
            detectedType = 'character';
            detectedSpeaker = rawText.replace(/^@/, '');
          }

          if (detectedType && detectedType !== currentType) {
            const updates: Record<string, any> = { blockType: detectedType };
            if (detectedSpeaker) {
              updates.speakerName = detectedSpeaker;
            }
            editor.commands.updateAttributes('scriptLineBlock', updates);
            setActiveBlockType(detectedType);
          }
        }
      } catch {
        // Bỏ qua nếu có lỗi xử lý chuỗi tạm thời
      }

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
          content: [{ type: 'text', text: `- Panel ${nextNum}.1: Toàn cảnh` }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'stage_direction',
          },
          content: [{ type: 'text', text: `Mô tả bối cảnh hoặc hành động của khung hình ${nextNum}.1...` }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn Trang', `Đã thêm # Page ${nextNum} (với Panel ${nextNum}.1)`);
  };

  // Chèn nhanh Khung hình mới (- Panel X.Y: Cận cảnh) theo số trang hiện tại
  const handleInsertPanel = (shotName: string = 'Cận cảnh') => {
    if (!editor || !canEditScript || isChapterLocked) return;
    const json = editor.getJSON();
    const content = json.content || [];

    // Xác định vị trí block hiện tại theo con trỏ soạn thảo
    const currentBlockIndex = editor.state.selection.$from.index(0);

    // Tìm số trang hiện tại (quét ngược từ vị trí con trỏ về đầu tài liệu)
    let currentPageNum = 1;
    let pageBlockIndex = -1;

    for (let i = Math.min(currentBlockIndex, content.length - 1); i >= 0; i--) {
      const block = content[i];
      const text = ((block.content?.[0] as any)?.text || '').trim();
      const match = text.match(/^(?:#\s*Page|Trang)\s*(\d+(?:\.\d+)?)/i);
      if (block.attrs?.blockType === 'page_heading' || match) {
        if (match) {
          currentPageNum = parseFloat(match[1]) || 1;
        }
        pageBlockIndex = i;
        break;
      }
    }

    // Nếu không tìm thấy trang trước con trỏ, tìm trang đầu tiên trong tài liệu
    if (pageBlockIndex === -1) {
      for (let i = 0; i < content.length; i++) {
        const block = content[i];
        const text = ((block.content?.[0] as any)?.text || '').trim();
        const match = text.match(/^(?:#\s*Page|Trang)\s*(\d+(?:\.\d+)?)/i);
        if (block.attrs?.blockType === 'page_heading' || match) {
          if (match) {
            currentPageNum = parseFloat(match[1]) || 1;
          }
          pageBlockIndex = i;
          break;
        }
      }
    }

    // Đếm số panel hiện có trong trang này để tính số thứ tự panel tiếp theo (ví dụ 1.1, 1.2, 1.3...)
    let panelCountInPage = 0;
    const startIndex = pageBlockIndex >= 0 ? pageBlockIndex + 1 : 0;
    for (let i = startIndex; i < content.length; i++) {
      const block = content[i];
      const text = ((block.content?.[0] as any)?.text || '').trim();
      // Nếu gặp trang tiếp theo sau vị trí con trỏ thì dừng
      if (i > currentBlockIndex && (block.attrs?.blockType === 'page_heading' || /^(?:#\s*Page|Trang)\s*\d+/i.test(text))) {
        break;
      }
      const isPanel =
        block.attrs?.blockType === 'panel_heading' ||
        /^(?:(?:-\s*)?(?:Panel|Khung)\s*\d+|-\s*\d+(?:\.\d+)?|#panel\s*\d+)/i.test(text);
      if (isPanel) {
        panelCountInPage++;
      }
    }

    const nextPanelIndex = panelCountInPage + 1;
    const panelLabel = `- Panel ${currentPageNum}.${nextPanelIndex}: ${shotName}`;

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
          content: [{ type: 'text', text: panelLabel }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'stage_direction',
          },
          content: [{ type: 'text', text: `Mô tả hành động của khung hình ${currentPageNum}.${nextPanelIndex}...` }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn Panel', `Đã thêm ${panelLabel}`);
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
          content: [{ type: 'text', text: '- Panel 1.1: Toàn cảnh' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'stage_direction' },
          content: [{ type: 'text', text: 'Thành phố Neo Tokyo về đêm rực rỡ ánh đèn neon dưới làn mưa phùn.' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: '- Panel 1.2: Cận cảnh' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'dialogue', speakerName: 'Minh' },
          content: [{ type: 'text', text: '@Minh : "Chúng ta không còn nhiều thời gian nữa..."' }],
        },
      ])
      .run();

    onShowToast?.('Đã chèn mẫu', 'Đã thêm mẫu cấu trúc Trang 1 (Panel 1.1, Panel 1.2) và Thoại.');
  };

  // Danh sách các nút định dạng khối rút gọn
  const compactBlockButtons: { type: MangaBlockType; label: string; icon: any }[] = [
    { type: 'page_heading', label: 'Trang', icon: Layers },
    { type: 'panel_heading', label: 'Panel', icon: LayoutGrid },
    { type: 'scene_heading', label: 'Cảnh', icon: Clapperboard },
    { type: 'caption', label: 'Lời dẫn', icon: FileText },
    { type: 'stage_direction', label: 'Chỉ dẫn', icon: Film },
    { type: 'character', label: 'Nhân vật', icon: User },
    { type: 'dialogue', label: 'Thoại', icon: MessageSquare },
    { type: 'transition', label: 'Chuyển cảnh', icon: Type },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-start gap-4 w-full">
      {/* 1. KHUNG TRANG GIẤY SOẠN THẢO CHÍNH (CENTER PAPER SHEET) */}
      <div 
        className="flex-1 w-full bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-xs overflow-hidden flex flex-col min-w-0"
        onMouseOver={(e) => {
          const target = e.target as HTMLElement;
          const mentionEl = target.closest('.mention') as HTMLElement | null;
          if (mentionEl) {
            const label = mentionEl.getAttribute('data-label') || '';
            const id = mentionEl.getAttribute('data-id') || '';
            const entry = allBibleEntries.find((b) => b.id === id || b.name.toLowerCase() === label.toLowerCase());
            if (entry) {
              const rect = mentionEl.getBoundingClientRect();
              setHoveredMention({
                x: rect.left,
                y: rect.bottom + 8,
                entry,
              });
              return;
            }
          }
        }}
        onMouseOut={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest('.mention')) {
            setHoveredMention(null);
          }
        }}
      >
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

        {/* VÙNG SOẠN THẢO TRANG GIẤY TIPTAP KÈM CON TRỎ CHUỘT TƯƠNG PHẢN CAO */}
        <div
          data-testid="paper-editor-sheet"
          className="relative paper-editor-sheet transition-colors"
          onClick={() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
        >
          <style>{`
            /* Con trỏ chuột tương phản cao (High-contrast Screenplay I-Beam & Stylus Cursor) */
            .paper-editor-sheet,
            .paper-editor-sheet .tiptap,
            .paper-editor-sheet .ProseMirror,
            .paper-editor-sheet .script-block {
              cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='26' viewBox='0 0 18 26' fill='none'%3E%3Cpath d='M3 3h12M9 3v20M3 23h12' stroke='%23000000' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M3 3h12M9 3v20M3 23h12' stroke='%23C2410C' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='9' cy='13' r='1.5' fill='%23FFFFFF' stroke='%23000000' stroke-width='0.5'/%3E%3C/svg%3E") 9 13, text !important;
              caret-color: #C2410C !important;
            }

            /* Hiệu ứng di chuột trực quan trên từng dòng kịch bản (Ambient Line Hover) */
            .paper-editor-sheet .script-block {
              position: relative;
              border-radius: 6px;
              transition: background-color 0.12s ease;
            }
            .paper-editor-sheet .script-block:hover {
              background-color: rgba(194, 65, 12, 0.04);
            }
            .paper-editor-sheet .ProseMirror-focused .script-block:focus,
            .paper-editor-sheet .script-block.ProseMirror-selectednode {
              outline: none;
              background-color: rgba(194, 65, 12, 0.06);
            }
          `}</style>
          <EditorContent editor={editor} />

          {/* D. Hovercard hiển thị chân dung & tóm tắt tiểu sử nhân vật */}
          {hoveredMention && (
            <div
              style={{ top: hoveredMention.y, left: hoveredMention.x }}
              className="fixed z-50 bg-white rounded-xl shadow-2xl border border-indigo-100 p-3 w-72 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="flex items-center gap-2.5">
                {hoveredMention.entry.referenceImageUrl || hoveredMention.entry.effectiveRevision?.referenceImageUrl ? (
                  <img
                    src={hoveredMention.entry.referenceImageUrl || hoveredMention.entry.effectiveRevision?.referenceImageUrl || ''}
                    alt={hoveredMention.entry.name}
                    className="w-10 h-10 rounded-full object-cover border border-indigo-200 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-[#4338CA] font-bold text-sm flex items-center justify-center shrink-0">
                    {hoveredMention.entry.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-gray-900 truncate">{hoveredMention.entry.name}</span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-[#4338CA] border border-indigo-200 shrink-0">
                      {hoveredMention.entry.category === 'Location' ? '📍 Địa danh' : hoveredMention.entry.category === 'Prop' ? '📦 Đạo cụ' : '👤 Nhân vật'}
                    </span>
                  </div>
                  {hoveredMention.entry.subtitle && (
                    <p className="text-[10px] text-gray-500 truncate">{hoveredMention.entry.subtitle}</p>
                  )}
                </div>
              </div>
              {(hoveredMention.entry.description || hoveredMention.entry.effectiveRevision?.summary) && (
                <p className="mt-2 text-[11px] text-gray-600 line-clamp-2 leading-relaxed border-t border-gray-100 pt-1.5">
                  {hoveredMention.entry.description || hoveredMention.entry.effectiveRevision?.summary}
                </p>
              )}
            </div>
          )}
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
