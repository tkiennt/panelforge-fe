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
import { PageDto } from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';
import { BibleEntryDto } from '@/services/bible.service';
import { ConsistencyFindingDto } from '@/types/pipeline';
import { ScriptLineBlockNode } from './nodes/ScriptLineBlockNode';
import { BibleMention } from './extensions/BibleMention';
import { createMentionSuggestion, PanelSuggestionData } from './extensions/mentionSuggestion';
import { ConsistencyLinterExtension } from './plugins/consistencyLinterPlugin';
import { QuickViewCard, QuickViewCardData } from './QuickViewCard';
import {
  scenesToTipTapDoc,
  extractScriptLinesFromDoc,
  ExtractedScriptLinePayload,
  generateGuid,
  renumberEditorState,
} from './scriptFlowAdapter';
import { MangaBlockType } from './types';

interface ScreenplayFlowEditorProps {
  chapterId?: string;
  chapterNumber?: number;
  scenes: SceneDetailDto[];
  pages?: PageDto[];
  panels?: PanelDto[];
  allBibleEntries: BibleEntryDto[];
  consistencyFindings: ConsistencyFindingDto[];
  canEditScript: boolean;
  isChapterLocked: boolean;
  scriptContentHash?: string | null;
  getSpeakerName?: (id?: string | null) => string | null;
  onSaveLines: (lines: ExtractedScriptLinePayload[]) => Promise<void>;
  onCreateStub?: (name: string, tempCode: string) => Promise<void> | void;
  onOpenInBible?: (codeOrId: string) => void;
  onOpenInArtistDesk?: (pageNumber?: number, panelId?: string) => void;
  onCreateInBible?: (tempCode: string, name?: string) => void;
  onShowToast?: (title: string, desc: string) => void;
}

interface LocalScriptDraft {
  doc: any;
  timestamp: number;
}

export const ScreenplayFlowEditor: React.FC<ScreenplayFlowEditorProps> = ({
  chapterId,
  chapterNumber,
  scenes,
  pages,
  panels,
  allBibleEntries,
  consistencyFindings,
  canEditScript,
  isChapterLocked,
  scriptContentHash,
  getSpeakerName,
  onSaveLines,
  onCreateStub,
  onOpenInBible,
  onOpenInArtistDesk,
  onCreateInBible,
  onShowToast,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeBlockType, setActiveBlockType] = useState<MangaBlockType>('dialogue');
  const [activeNarrationMode, setActiveNarrationMode] = useState<NarrationMode>('Present');
  const [pendingDraft, setPendingDraft] = useState<LocalScriptDraft | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  // Quick View Card State
  const [quickViewCardData, setQuickViewCardData] = useState<QuickViewCardData | null>(null);
  const [quickViewPos, setQuickViewPos] = useState<{ top: number; left: number } | null>(null);
  const hoverOpenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Đóng gói danh sách Panel của chương cho mention popover
  const panelsRef = useRef<PanelSuggestionData[]>([]);
  useEffect(() => {
    panelsRef.current = (panels || []).map((p) => ({
      id: p.id,
      pageNumber: (p as any).pageNumber || 1,
      panelNumber: p.panelNumber,
      hasThumbnail: !!((p as any).hasArtwork || (p as any).thumbnailUrl),
      thumbnailUrl: (p as any).thumbnailUrl || null,
    }));
  }, [panels]);

  // Đóng gói danh sách Consistency Findings cho linter plugin
  const findingsRef = useRef<ConsistencyFindingDto[]>(consistencyFindings);
  useEffect(() => {
    findingsRef.current = consistencyFindings;
  }, [consistencyFindings]);

  const initialContent = useMemo(() => {
    return scenesToTipTapDoc(scenes, getSpeakerName, pages, panels, allBibleEntries, chapterNumber);
  }, [scenes, getSpeakerName, pages, panels, allBibleEntries, chapterNumber]);

  // Hàm chuyển đổi DOM target thành dữ liệu QuickViewCard
  const resolveQuickViewData = useCallback(
    (target: HTMLElement): { data: QuickViewCardData; pos: { top: number; left: number } } | null => {
      const rect = target.getBoundingClientRect();
      const pos = {
        top: rect.bottom + 6,
        left: Math.max(16, Math.min(window.innerWidth - 320, rect.left)),
      };

      // 1. Thẻ QuickView cho Panel Heading
      if (target.hasAttribute('data-panel-badge') || target.closest('[data-panel-badge]')) {
        const badgeEl = (target.hasAttribute('data-panel-badge')
          ? target
          : target.closest('[data-panel-badge]')) as HTMLElement;
        const pageNum = parseInt(badgeEl.getAttribute('data-page-number') || '1', 10);
        const panelNum = parseInt(badgeEl.getAttribute('data-panel-number') || '1', 10);
        const panelId = badgeEl.getAttribute('data-panel-id') || undefined;
        const hasThumbnail = badgeEl.getAttribute('data-has-thumbnail') === 'true';

        const associatedPanel = (panels || []).find(
          (p) =>
            p.id === panelId ||
            (p.panelNumber === panelNum && ((p as any).pageNumber === pageNum || !panelId))
        );
        const imageUrl = (associatedPanel as any)?.thumbnailUrl || (associatedPanel as any)?.artworkUrl || null;

        return {
          pos,
          data: {
            type: 'panel',
            id: panelId || `panel-${pageNum}-${panelNum}`,
            code: `P${pageNum}.${panelNum}`,
            name: `Trang ${pageNum} · Khung #${panelNum}`,
            pageNumber: pageNum,
            panelNumber: panelNum,
            panelId,
            imageUrl: hasThumbnail || imageUrl ? imageUrl : null,
            onOpenInArtistDesk,
          },
        };
      }

      // 2. Thẻ QuickView cho Mention Chip (@PRP..., @P1.1, @CHR...)
      const chipEl = (target.hasAttribute('data-mention-chip')
        ? target
        : target.closest('[data-mention-chip]')) as HTMLElement;
      if (!chipEl) return null;

      const code = chipEl.getAttribute('data-code') || chipEl.getAttribute('data-label') || '';
      const isStub = chipEl.getAttribute('data-is-stub') === 'true';
      const category = chipEl.getAttribute('data-category') || 'Character';

      if (isStub) {
        return {
          pos,
          data: {
            type: 'stub',
            id: code,
            code,
            name: code,
            category: 'Mã tạm',
            onCreateInBible,
          },
        };
      }

      if (category.toLowerCase().includes('panel')) {
        const pageNum = parseInt(chipEl.getAttribute('data-page-number') || '1', 10);
        const panelNum = parseInt(chipEl.getAttribute('data-panel-number') || '1', 10);
        const panelId = chipEl.getAttribute('data-panel-id') || undefined;
        const associatedPanel = (panels || []).find(
          (p) =>
            p.id === panelId ||
            (p.panelNumber === panelNum && ((p as any).pageNumber === pageNum || !panelId))
        );
        const imageUrl = (associatedPanel as any)?.thumbnailUrl || (associatedPanel as any)?.artworkUrl || null;

        return {
          pos,
          data: {
            type: 'panel',
            id: panelId || code,
            code,
            name: `Trang ${pageNum} · Khung #${panelNum}`,
            pageNumber: pageNum,
            panelNumber: panelNum,
            panelId,
            imageUrl,
            onOpenInArtistDesk,
          },
        };
      }

      const entry = (allBibleEntries || []).find(
        (e) => e.code?.toLowerCase() === code.toLowerCase() || e.id === chipEl.getAttribute('data-id')
      );

      return {
        pos,
        data: {
          type: 'bible',
          id: entry?.id || code,
          code: entry?.code || code,
          name: entry?.name || code,
          category: entry?.category ? String(entry.category) : category,
          description: entry?.description || entry?.effectiveRevision?.summary || null,
          imageUrl: entry?.referenceImageUrl || entry?.effectiveRevision?.referenceImageUrl || null,
          isLocked: entry?.effectiveRevision?.reviewStatus === 'CanonLocked',
          stageName: entry?.effectiveRevision?.stageName || null,
          onOpenInBible,
        },
      };
    },
    [allBibleEntries, panels, onOpenInBible, onOpenInArtistDesk, onCreateInBible]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      ScriptLineBlockNode,
      BibleMention.configure({
        suggestion: createMentionSuggestion(
          () => bibleEntriesRef.current,
          () => panelsRef.current,
          onCreateStub,
          onOpenInBible,
          onOpenInArtistDesk
        ),
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
          'focus:outline-none min-h-[700px] font-mono text-sm leading-relaxed text-gray-900 bg-transparent selection:bg-orange-100 selection:text-orange-900 caret-[#C2410C]',
      },
    },
    onSelectionUpdate: ({ editor }) => {
      const currentBlock = editor.state.selection.$from.parent;
      if (currentBlock && currentBlock.type.name === 'scriptLineBlock') {
        setActiveBlockType(currentBlock.attrs.blockType || 'dialogue');
        setActiveNarrationMode(currentBlock.attrs.narrationMode || 'Present');
      }
    },
    onUpdate: ({ editor, transaction }) => {
      if (transaction?.getMeta('preventUnsavedChanges')) return;
      // Chế độ chỉ đọc (đóng băng / không có quyền): transaction do hệ thống (chip, đánh số lại, nạp nội dung)
      // không phải chỉnh sửa của người dùng → không đánh dấu chưa lưu, không ghi bản nháp.
      if (!editor.isEditable) return;
      setHasUnsavedChanges(true);

      // Khi người dùng gõ phím, thẻ QuickView tự đóng ngay lập tức
      if (quickViewCardData) {
        setQuickViewCardData(null);
        setQuickViewPos(null);
      }
      if (hoverOpenTimerRef.current) {
        clearTimeout(hoverOpenTimerRef.current);
        hoverOpenTimerRef.current = null;
      }

      // Tự động nhận diện cú pháp khi gõ # hoặc - ở đầu dòng
      try {
        const { state } = editor;
        const { selection } = state;
        const currentBlock = selection.$from.parent;

        if (currentBlock && currentBlock.type.name === 'scriptLineBlock') {
          const rawText = currentBlock.textContent.trim();
          const currentType: MangaBlockType = currentBlock.attrs.blockType || 'dialogue';
          let detectedType: MangaBlockType | null = null;
          let detectedSpeaker: string | null = null;

          // 1. Nhận diện Trang: gõ # ở đầu dòng hoặc # Page, Trang 1
          if (/^#(?:\s.*)?$/i.test(rawText) || /^(?:Trang|Page)\s+\d+(?:\.\d+)?/i.test(rawText)) {
            detectedType = 'page_heading';
          }
          // 2. Nhận diện Panel: gõ - ở đầu dòng hoặc - Panel, Khung 1.1
          else if (
            /^-(?:\s.*)?$/i.test(rawText) ||
            /^(?:(?:-\s*)?(?:Panel|Khung)\s*\d+(?:\.\d+)?|-\s*\d+(?:\.\d+)?|#panel\s*\d+(?:\.\d+)?)/i.test(
              rawText
            )
          ) {
            detectedType = 'panel_heading';
          }
          // 3. Nhận diện Tiêu đề phân cảnh: CẢNH 1, INT., EXT., SCENE 1
          else if (/^(?:CẢNH\s+\d+|INT\.|EXT\.|SCENE\s+\d+)/i.test(rawText)) {
            detectedType = 'scene_heading';
          }
          // 4. Nhận diện Âm thanh / Chỉ dẫn: * BÙM!, SFX: TIẾNG NỔ
          else if (/^(?:\*|SFX\s*:)/i.test(rawText)) {
            detectedType = 'stage_direction';
          }
          // 5. Nhận diện Chuyển cảnh: CUT TO:, FADE OUT:
          else if (/^(?:CUT TO:|FADE OUT:|CHUYỂN CẢNH:)/i.test(rawText)) {
            detectedType = 'transition';
          }
          // 6. Nhận diện Thoại có tên nhân vật: MINH: Cậu đi đâu thế?
          else if (/^([A-ZÀ-Ỹ0-9_\s]{2,30})(?:\/([a-zA-ZÀ-ỹ]+))?:\s*(.*)$/.test(rawText)) {
            const match = rawText.match(/^([A-ZÀ-Ỹ0-9_\s]{2,30})(?:\/([a-zA-ZÀ-ỹ]+))?:\s*(.*)$/);
            if (match) {
              detectedType = 'dialogue';
              detectedSpeaker = match[1].trim();
            }
          }
          // 7. Nhận diện Tên nhân vật viết hoa đứng riêng một dòng: MINH, LUFFY
          else if (
            rawText.length >= 2 &&
            rawText.length <= 30 &&
            rawText === rawText.toUpperCase() &&
            !rawText.includes('.') &&
            !rawText.includes(':') &&
            !rawText.includes('-') &&
            !/^\d+$/.test(rawText)
          ) {
            detectedType = 'character';
            detectedSpeaker = rawText;
          }

          if (detectedType && detectedType !== currentType) {
            const updates: Record<string, any> = { blockType: detectedType };
            if (detectedSpeaker) {
              updates.speakerName = detectedSpeaker;
            }
            editor.commands.updateAttributes('scriptLineBlock', updates);
            setActiveBlockType(detectedType);
          }

          // Tự động đánh số lại toàn bộ Trang và Panel theo thứ tự tài liệu
          renumberEditorState(editor);
        }
      } catch {
        // Bỏ qua lỗi cú pháp tức thời
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
        } catch {}
      }, 1000);
    },
  });

  // Bắt sự kiện bàn phím: Ctrl+. mở thẻ xem nhanh, Esc đóng thẻ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (quickViewCardData) {
          setQuickViewCardData(null);
          setQuickViewPos(null);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        if (!editor) return;
        const { $from } = editor.state.selection;
        try {
          const dom = editor.view.domAtPos($from.pos).node as HTMLElement;
          const el = dom?.nodeType === Node.ELEMENT_NODE ? dom : dom?.parentElement;
          const target = el?.closest('[data-mention-chip], [data-panel-badge]') as HTMLElement | null;
          if (target) {
            const resolved = resolveQuickViewData(target);
            if (resolved) {
              setQuickViewCardData(resolved.data);
              setQuickViewPos(resolved.pos);
            }
          }
        } catch {}
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, quickViewCardData, resolveQuickViewData]);

  // Xử lý di chuột mở thẻ xem nhanh (hover trễ 300ms, rời chuột trễ 150ms)
  const handleSheetMouseOver = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest(
      '[data-mention-chip], [data-panel-badge]'
    ) as HTMLElement | null;
    if (!target) return;

    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }

    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
    }

    hoverOpenTimerRef.current = setTimeout(() => {
      const resolved = resolveQuickViewData(target);
      if (resolved) {
        setQuickViewCardData(resolved.data);
        setQuickViewPos(resolved.pos);
      }
    }, 300);
  };

  const handleSheetMouseOut = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-mention-chip], [data-panel-badge]');
    if (!target) return;

    if (hoverOpenTimerRef.current) {
      clearTimeout(hoverOpenTimerRef.current);
      hoverOpenTimerRef.current = null;
    }

    hoverCloseTimerRef.current = setTimeout(() => {
      setQuickViewCardData(null);
      setQuickViewPos(null);
    }, 150);
  };

  const handleCardMouseEnter = () => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  const handleCardMouseLeave = () => {
    hoverCloseTimerRef.current = setTimeout(() => {
      setQuickViewCardData(null);
      setQuickViewPos(null);
    }, 150);
  };

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
    } catch {}
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

  // Khi danh mục Series Bible nạp xong sau editor: cập nhật attrs của các chip (stub -> chính thức)
  // Giữ nguyên vị trí con trỏ và không đánh dấu kịch bản là chưa lưu
  useEffect(() => {
    if (!editor || editor.isDestroyed || !allBibleEntries || allBibleEntries.length === 0) return;

    const { doc } = editor.state;
    const tr = editor.state.tr;
    let hasChanges = false;

    doc.descendants((node, pos) => {
      if (node.type.name === 'bibleMention') {
        const code = node.attrs.code || node.attrs.label;
        if (!code) return;
        const entry = allBibleEntries.find(
          (e) => e.code?.toLowerCase() === code.toLowerCase()
        );
        if (entry) {
          const isStubCurrent = Boolean(node.attrs.isStub);
          const needsUpdate =
            isStubCurrent ||
            node.attrs.id !== entry.id ||
            node.attrs.label !== entry.name ||
            node.attrs.category !== String(entry.category);

          if (needsUpdate) {
            hasChanges = true;
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              id: entry.id,
              label: entry.name,
              code: entry.code,
              category: entry.category ? String(entry.category) : node.attrs.category,
              isLocked: entry.effectiveRevision?.reviewStatus === 'CanonLocked',
              isStub: false,
            });
          }
        }
      }
    });

    if (hasChanges) {
      tr.setMeta('addToHistory', false);
      tr.setMeta('preventUnsavedChanges', true);
      editor.view.dispatch(tr);
    }
  }, [editor, allBibleEntries]);

  // Đồng bộ nội dung TipTap khi danh sách phân cảnh được nạp từ máy chủ
  useEffect(() => {
    if (editor && !editor.isDestroyed && !hasUnsavedChanges && !pendingDraft) {
      const newDoc = scenesToTipTapDoc(scenes, getSpeakerName, pages, panels, allBibleEntries, chapterNumber);
      const currentDoc = editor.getJSON();
      if (JSON.stringify(currentDoc) !== JSON.stringify(newDoc)) {
        editor.commands.setContent(newDoc, { emitUpdate: false });
      }
    }
  }, [editor, scenes, getSpeakerName, pages, panels, hasUnsavedChanges, pendingDraft]);

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
  }, [
    editor,
    hasUnsavedChanges,
    isSaving,
    canEditScript,
    isChapterLocked,
    scenes,
    onSaveLines,
    onShowToast,
    draftStorageKey,
  ]);

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
    renumberEditorState(editor);
  };

  // Chèn nhanh Trang mới (# Trang N)
  const handleInsertPage = () => {
    if (!editor || !canEditScript || isChapterLocked) return;
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
          content: [{ type: 'text', text: 'TRANG' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'panel_heading',
          },
          content: [{ type: 'text', text: 'PANEL: Toàn cảnh' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'stage_direction',
          },
          content: [{ type: 'text', text: 'Mô tả bối cảnh hoặc hành động...' }],
        },
      ])
      .run();

    renumberEditorState(editor);
    onShowToast?.('Đã chèn Trang', 'Đã thêm khối Trang mới và tự động đánh lại số trang.');
  };

  // Chèn nhanh Khung hình mới (- Panel X.Y: Cận cảnh)
  const handleInsertPanel = (shotName: string = 'Cận cảnh') => {
    if (!editor || !canEditScript || isChapterLocked) return;
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
          content: [{ type: 'text', text: `PANEL: ${shotName}` }],
        },
        {
          type: 'scriptLineBlock',
          attrs: {
            scriptLineId: generateGuid(),
            blockType: 'stage_direction',
          },
          content: [{ type: 'text', text: 'Mô tả hành động của khung hình...' }],
        },
      ])
      .run();

    renumberEditorState(editor);
    onShowToast?.('Đã chèn Panel', `Đã thêm khối Panel (${shotName})`);
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
          content: [{ type: 'text', text: 'TRANG 1' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: 'PANEL 1.1: Toàn cảnh' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'stage_direction' },
          content: [{ type: 'text', text: 'Thành phố Neo Tokyo về đêm rực rỡ ánh đèn neon dưới làn mưa phùn.' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: 'PANEL 1.2: Cận cảnh' }],
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

    renumberEditorState(editor);
    onShowToast?.('Đã chèn mẫu', 'Đã thêm mẫu cấu trúc Trang 1 (Panel 1.1, Panel 1.2) và Thoại.');
  };

  const compactBlockButtons: { type: MangaBlockType; label: string; icon: any }[] = [
    { type: 'page_heading', label: 'Trang', icon: Layers },
    { type: 'panel_heading', label: 'Panel', icon: LayoutGrid },
    { type: 'scene_heading', label: 'Cảnh', icon: Clapperboard },
    { type: 'stage_direction', label: 'Chỉ dẫn', icon: Film },
    { type: 'character', label: 'Nhân vật', icon: User },
    { type: 'dialogue', label: 'Thoại', icon: MessageSquare },
    { type: 'transition', label: 'Chuyển cảnh', icon: Type },
  ];

  const isReadOnly = !canEditScript || isChapterLocked;

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full py-6 px-2 sm:px-4 bg-[#F2EFE9] min-h-[calc(100vh-100px)]">
      {/* 1. KHUNG TRANG GIẤY SOẠN THẢO CHÍNH (CONTINUOUS LONG PAPER SHEET ~880px) */}
      <div className="max-w-[880px] w-full mx-auto bg-white border border-[#E0DCD3] shadow-md rounded-xs flex flex-col min-h-[1100px] relative text-gray-900 transition-shadow hover:shadow-lg">
        {/* Banner Khôi phục Bản Nháp Cục Bộ */}
        {pendingDraft && !isReadOnly && (
          <div className="flex items-center justify-between gap-3 px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bản nháp lúc{' '}
                <strong>
                  {new Date(pendingDraft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </strong>{' '}
                chưa lưu.
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

        {/* Bảng Cẩm Nang Cú Pháp Rút Gọn */}
        {showCheatSheet && (
          <div className="bg-[#FAF8F5] border-b border-[#E5E0D8] p-4 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#C2410C] flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                Cú pháp phân đoạn Screenplay (Trang giấy liền mạch):
              </span>
              <button
                type="button"
                onClick={() => setShowCheatSheet(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-[#EA580C]"># (gõ đầu dòng)</strong>
                <p className="text-gray-500">Tạo Trang cam tự đánh số</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-purple-700">- (gõ đầu dòng)</strong>
                <p className="text-gray-500">Tạo Panel tím tự đánh số</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-amber-800">LUFFY: Thoại</strong>
                <p className="text-gray-500">Lời thoại nhân vật</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-[#E5E0D8]">
                <strong className="text-stone-700">@...</strong>
                <p className="text-gray-500">Chèn chip Bible & Panel</p>
              </div>
            </div>
          </div>
        )}

        {/* VÙNG SOẠN THẢO TRANG GIẤY TIPTAP — CHỈ CÓ CHỮ, KHÔNG CÓ ẢNH CỐ ĐỊNH NÀO */}
        <div
          data-testid="paper-editor-sheet"
          className="relative paper-editor-sheet flex-1 px-8 sm:px-14 py-10 transition-colors"
          onMouseOver={handleSheetMouseOver}
          onMouseOut={handleSheetMouseOut}
          onClick={() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
        >
          <style>{`
            /* Con trỏ chuột tương phản cao (Screenplay I-Beam & Stylus Cursor) */
            .paper-editor-sheet,
            .paper-editor-sheet .tiptap,
            .paper-editor-sheet .ProseMirror,
            .paper-editor-sheet .script-block {
              cursor: text !important;
              caret-color: #C2410C !important;
            }

            .paper-editor-sheet .script-block {
              position: relative;
              border-radius: 4px;
              transition: background-color 0.1s ease;
            }
            .paper-editor-sheet .script-block:hover {
              background-color: rgba(234, 88, 12, 0.03);
            }
            .paper-editor-sheet .ProseMirror-focused .script-block:focus,
            .paper-editor-sheet .script-block.ProseMirror-selectednode {
              outline: none;
              background-color: rgba(234, 88, 12, 0.05);
            }
          `}</style>
          <EditorContent editor={editor} />
        </div>

        {/* Thẻ xem nhanh hợp nhất (QuickViewCard) hiển thị dạng tooltip nổi */}
        {quickViewCardData && quickViewPos && (
          <QuickViewCard
            data={quickViewCardData}
            position={quickViewPos}
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
          />
        )}

        {/* Footer thông tin rút gọn */}
        <div className="flex items-center justify-between px-8 py-3 bg-[#FAF8F5] border-t border-[#EBE7DF] text-[11px] text-gray-500 font-mono">
          <div className="flex items-center gap-3">
            <span>Gõ # tạo Trang · Gõ - tạo Panel · Gõ @ gợi ý Bible/Panel</span>
          </div>
          <div>
            Khối: <strong className="text-amber-700 uppercase">{activeBlockType}</strong>
          </div>
        </div>
      </div>

      {/* 2. THANH CÔNG CỤ TINH GỌN BÊN TAY PHẢI (RIGHT COMPACT TOOL PALETTE) */}
      {/* Chỉ đọc: toàn bộ nút đều bị khoá nên ẩn bảng, chỉ giữ Cú pháp để trang giấy rộng chỗ */}
      {isReadOnly ? (
        <aside className="w-full lg:w-auto shrink-0 lg:sticky lg:top-4 font-sans" data-testid="flow-readonly-palette">
          <button
            type="button"
            onClick={() => setShowCheatSheet((prev) => !prev)}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-white text-stone-600 border border-gray-200 hover:text-stone-900 cursor-pointer"
            title="Xem bảng hướng dẫn cú pháp gõ Trang & Khung hình"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>Cú pháp</span>
          </button>
        </aside>
      ) : (
      <aside className="w-full lg:w-48 shrink-0 lg:sticky lg:top-4 space-y-2.5 font-sans">
        {/* Nhóm 1: Tạo Nhanh Trang & Panel */}
        <div className="bg-white border border-[#D8D2C5] rounded-xl p-3 shadow-xs space-y-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
            Cấu trúc phân đoạn
          </div>

          <button
            type="button"
            disabled={!canEditScript || isChapterLocked}
            onClick={handleInsertPage}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-[#EA580C] hover:bg-[#C2410C] shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
            title="Chèn Trang mới: # Trang N"
          >
            <Plus className="w-3.5 h-3.5" />
            <Layers className="w-3.5 h-3.5" />
            <span>+ Trang (cam)</span>
          </button>

          <button
            type="button"
            disabled={!canEditScript || isChapterLocked}
            onClick={() => handleInsertPanel('Cận cảnh')}
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-bold text-purple-950 bg-purple-100 hover:bg-purple-200 border border-purple-300 shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
            title="Chèn Khung hình mới: - Panel X.Y"
          >
            <Plus className="w-3.5 h-3.5" />
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>+ Panel (tím)</span>
          </button>

          <button
            type="button"
            disabled={!canEditScript || isChapterLocked}
            onClick={handleInsertComicTemplate}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all disabled:opacity-40 cursor-pointer"
            title="Chèn mẫu cấu trúc Trang & Panel"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Mẫu truyện</span>
          </button>
        </div>

        {/* Nhóm 2: Định Dạng Khối (Blocks) */}
        <div className="bg-white border border-[#D8D2C5] rounded-xl p-3 shadow-xs space-y-1.5">
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
        <div className="bg-white border border-[#D8D2C5] rounded-xl p-3 shadow-xs space-y-2">
          <button
            type="button"
            disabled={!hasUnsavedChanges || isSaving || !canEditScript || isChapterLocked}
            onClick={handleManualSave}
            title="Lưu kịch bản lên máy chủ (Ctrl + S)"
            className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg text-xs font-bold bg-[#EA580C] text-white hover:bg-[#C2410C] shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
            <span>Cú pháp Screenplay</span>
            {showCheatSheet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </aside>
      )}
    </div>
  );
};
