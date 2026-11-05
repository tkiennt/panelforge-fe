// src/roles/writer/components/script/flow/ScreenplayFlowEditor.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
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
  Zap,
  FileText,
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
import { getNextPageNumber, getNextPanelNumber } from './comic-editor/comicCounting';
import { AiScriptConvertModal, convertScriptTextToScreenplayBlocks } from './converter';

interface ScreenplayFlowEditorProps {
  chapterId?: string;
  chapterNumber?: number;
  chapterVersion?: number;
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
  chapterVersion,
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
  const justSavedRef = useRef(false);
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
  const [showAiConvertModal, setShowAiConvertModal] = useState(false);

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
        // A. Nhấn Space sau ký tự "#" / "!" hoặc "-" / '"' để chuyển đổi tức thì thành Trang hoặc Panel
        if (text === ' ') {
          const { state } = view;
          const { $from } = state.selection;
          const currentBlock = $from.parent;

          if (currentBlock.type.name === 'scriptLineBlock') {
            const textBefore = currentBlock.textBetween(0, $from.parentOffset).trim();

            // "# " hoặc "! " -> Biến thành Page Block
            const isPageSpace =
              textBefore === '#' ||
              textBefore === '!' ||
              /^(?:#|!)\s*(?:Trang|Page\s*\d*)?$/i.test(textBefore);

            if (isPageSpace) {
              const numMatch = textBefore.match(/\d+/);
              const explicitNum = numMatch ? parseInt(numMatch[0], 10) : undefined;
              const pageNum = getNextPageNumber(state.doc, $from.pos, explicitNum);
              const formattedPage = String(pageNum).padStart(2, '0');
              const defaultText = `Trang ${formattedPage} `;

              const blockStart = $from.start();
              const blockEnd = $from.end();
              const tr = state.tr.replaceWith(blockStart, blockEnd, state.schema.text(defaultText));
              tr.setNodeMarkup($from.before(), undefined, {
                ...currentBlock.attrs,
                blockType: 'page_heading',
              });
              tr.setSelection(TextSelection.create(tr.doc, blockStart + defaultText.length));
              view.dispatch(tr);
              return true;
            }

            // "- " hoặc '" ' -> Biến thành Panel Block
            const isPanelSpace =
              textBefore === '-' ||
              textBefore === '"' ||
              textBefore === '”' ||
              /^[-"”]\s*(?:Panel\s*[\d.]*)?$/i.test(textBefore);

            if (isPanelSpace) {
              const panelMatch = textBefore.match(/(\d+)\.(\d+)/);
              const explicit = panelMatch
                ? { pageNum: parseInt(panelMatch[1], 10), panelNum: parseInt(panelMatch[2], 10) }
                : undefined;
              const { pageNum, panelNum } = getNextPanelNumber(state.doc, $from.pos, explicit);
              const defaultText = `" Panel ${pageNum}.${panelNum}: [Toàn cảnh] `;

              const blockStart = $from.start();
              const blockEnd = $from.end();
              const tr = state.tr.replaceWith(blockStart, blockEnd, state.schema.text(defaultText));
              tr.setNodeMarkup($from.before(), undefined, {
                ...currentBlock.attrs,
                blockType: 'panel_heading',
              });
              tr.setSelection(TextSelection.create(tr.doc, blockStart + defaultText.length));
              view.dispatch(tr);
              return true;
            }
          }
        }

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

          // 2. Hoặc người dùng gõ text thủ công BẮT BUỘC bắt đầu bằng @Tên nhân vật (không khớp số hay từ thường)
          const textBefore = currentBlock.textBetween(0, $from.parentOffset);
          const isManualCharacterName = /^@[\w\p{L}_-]{1,30}\s*$/u.test(textBefore);

          if (isDirectlyAfterMention || isAfterSpaceMention || isManualCharacterName) {
            const endsWithSpace = textBefore.endsWith(' ') || (nodeBefore?.isText && nodeBefore.text?.endsWith(' '));
            const insertStr = endsWithSpace ? ': ""' : ' : ""';

            const tr = state.tr.insertText(insertStr, from, to);
            // Đặt con trỏ vào chính giữa 2 dấu ngoặc kép "" (vị trí trước dấu ngoặc đóng)
            const targetPos = from + insertStr.length - 1;
            tr.setSelection(TextSelection.create(tr.doc, targetPos));
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
        setActiveBlockType(currentBlock.attrs.blockType || 'stage_direction');
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

      // Cập nhật loại khối hiện tại để đồng bộ trạng thái thanh công cụ (không mutate document khi đang gõ)
      try {
        const currentType = editor.state.selection.$from.parent?.attrs?.blockType;
        if (currentType && currentType !== activeBlockType) {
          setActiveBlockType(currentType);
        }
      } catch {
        // Bỏ qua lỗi truy xuất trạng thái tức thời
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
        } catch { }
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
        } catch { }
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
    } catch { }
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
          (e) =>
            e.code?.toLowerCase() === code.toLowerCase() ||
            e.id === node.attrs.id ||
            e.name.toLowerCase() === code.toLowerCase() ||
            (node.attrs.label && e.name.toLowerCase() === String(node.attrs.label).toLowerCase())
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
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }
    if (editor && !editor.isDestroyed && !hasUnsavedChanges && !pendingDraft) {
      const newDoc = scenesToTipTapDoc(scenes, getSpeakerName, pages, panels, allBibleEntries, chapterNumber);
      const currentDoc = editor.getJSON();
      if (JSON.stringify(currentDoc) !== JSON.stringify(newDoc)) {
        editor.commands.setContent(newDoc, { emitUpdate: false });
      }
    }
  }, [editor, scenes, getSpeakerName, pages, panels, hasUnsavedChanges, pendingDraft]);

  // Đồng bộ tiêu đề phân cảnh khi được sửa từ Modal (Modal -> Giấy)
  useEffect(() => {
    if (!editor || editor.isDestroyed || !scenes || scenes.length === 0) return;

    try {
      let tr = editor.state.tr;
      let hasUpdate = false;

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'scriptLineBlock' && node.attrs.blockType === 'scene_heading') {
          const targetSceneId = node.attrs.sceneId;
          const currentText = node.textContent.trim().toUpperCase();
          const matchNum = currentText.match(/(?:CẢNH|SCENE)\s*(\d+)/i);
          const parsedNum = matchNum ? parseInt(matchNum[1], 10) : null;

          const matchingScene = scenes.find(
            (s) => s.id === targetSceneId || (parsedNum !== null && s.sceneNumber === parsedNum)
          );
          if (matchingScene && matchingScene.heading) {
            const expectedHeadingText = `CẢNH ${matchingScene.sceneNumber}: ${matchingScene.heading}`.toUpperCase();
            if (currentText !== expectedHeadingText) {
              const from = pos + 1;
              const to = pos + node.nodeSize - 1;
              tr = tr.replaceWith(from, to, editor.schema.text(expectedHeadingText));
              hasUpdate = true;
            }
          }
        }
      });

      if (hasUpdate) {
        editor.view.dispatch(tr);
      }
    } catch (syncErr) {
      console.error('Lỗi đồng bộ tiêu đề phân cảnh vào trình soạn thảo:', syncErr);
    }
  }, [editor, scenes]);

  // Xử lý Lưu Kịch Bản thủ công (Chỉ gọi Backend khi bấm Lưu hoặc Ctrl+S)
  const handleManualSave = useCallback(async () => {
    if (!editor || !hasUnsavedChanges || isSaving || !canEditScript || isChapterLocked) return;

    if (localDraftTimerRef.current) {
      clearTimeout(localDraftTimerRef.current);
    }

    setIsSaving(true);
    try {
      renumberEditorState(editor);
      const defaultSceneId = scenes[0]?.id || '';
      const extracted = extractScriptLinesFromDoc(editor.getJSON(), defaultSceneId);

      await onSaveLines(extracted);
      justSavedRef.current = true;
      setHasUnsavedChanges(false);
      try {
        localStorage.removeItem(draftStorageKey);
      } catch { }
      setPendingDraft(null);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      onShowToast?.(
        'Đã lưu kịch bản',
        `Nội dung kịch bản đã được lưu thành công vào bản thảo hiện tại (v${chapterVersion ?? 0}).`
      );
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
    } catch { }
    setPendingDraft(null);
  };

  const setBlockType = (type: MangaBlockType) => {
    if (!editor) return;
    editor.chain().focus().updateAttributes('scriptLineBlock', { blockType: type }).run();
    setActiveBlockType(type);
    setHasUnsavedChanges(true);
  };

  // Chèn nhanh Trang mới (! Trang X)
  const handleInsertPage = () => {
    if (!editor || !canEditScript || isChapterLocked) return;
    const { state, view } = editor;
    const { selection } = state;
    const { $from } = selection;

    const nextNum = getNextPageNumber(state.doc);
    const formattedPage = String(nextNum).padStart(2, '0');
    const pageText = `Trang ${formattedPage}`;

    // Chèn sau khối hiện tại nếu đang trong một khối, hoặc tại vị trí con trỏ
    const insertPos = $from.parent.type.name === 'doc' ? selection.from : $from.after();
    const newBlock = state.schema.nodes.scriptLineBlock.create(
      {
        scriptLineId: generateGuid(),
        blockType: 'page_heading',
        pageNumber: nextNum,
      },
      state.schema.text(pageText)
    );

    const tr = state.tr.insert(insertPos, newBlock);
    const targetPos = insertPos + 1 + pageText.length;
    tr.setSelection(TextSelection.create(tr.doc, targetPos));
    view.dispatch(tr);
    editor.commands.focus();
    setHasUnsavedChanges(true);

    onShowToast?.('Đã chèn Trang', `Đã thêm Trang ${formattedPage}`);
  };

  // Chèn nhanh Khung hình mới (" Panel X.Y: Cận cảnh) theo số trang hiện tại
  const handleInsertPanel = (shotName: string = 'Cận cảnh') => {
    if (!editor || !canEditScript || isChapterLocked) return;
    const { state, view } = editor;
    const { selection } = state;
    const { $from } = selection;

    // Lấy số trang và số panel tiếp theo dựa trên khối hiện tại con trỏ đang đứng
    const { pageNum, panelNum } = getNextPanelNumber(state.doc, $from.pos);
    const panelLabel = `" Panel ${pageNum}.${panelNum}: [${shotName}]`;

    // Chèn ngay sau khối hiện tại
    const insertPos = $from.parent.type.name === 'doc' ? selection.from : $from.after();
    const newBlock = state.schema.nodes.scriptLineBlock.create(
      {
        scriptLineId: generateGuid(),
        blockType: 'panel_heading',
        pageNumber: pageNum,
        panelNumber: panelNum,
      },
      state.schema.text(panelLabel)
    );

    const tr = state.tr.insert(insertPos, newBlock);
    const targetPos = insertPos + 1 + panelLabel.length;
    tr.setSelection(TextSelection.create(tr.doc, targetPos));
    view.dispatch(tr);
    editor.commands.focus();
    setHasUnsavedChanges(true);

    onShowToast?.('Đã chèn Panel', `Đã thêm khối Panel ${pageNum}.${panelNum} (${shotName})`);
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
          content: [{ type: 'text', text: 'Trang 01' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: '" Panel 1.1: [Toàn cảnh]' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'stage_direction' },
          content: [{ type: 'text', text: 'Thành phố Neo Tokyo về đêm rực rỡ ánh đèn neon dưới làn mưa phùn.' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'panel_heading' },
          content: [{ type: 'text', text: '" Panel 1.2: [Cận cảnh]' }],
        },
        {
          type: 'scriptLineBlock',
          attrs: { scriptLineId: generateGuid(), blockType: 'dialogue', speakerName: 'Minh' },
          content: [{ type: 'text', text: '@Minh : "Chúng ta không còn nhiều thời gian nữa..."' }],
        },
      ])
      .run();

    renumberEditorState(editor);
    onShowToast?.('Đã chèn mẫu', 'Đã thêm mẫu cấu trúc Trang 1 (Panel 1.1, Panel 1.2) và Thoại.');
  };

  // Áp dụng kịch bản sau khi chuyển đổi bằng Smart Heuristic / AI
  const handleApplyConvertedScript = (scriptText: string, mode: 'append' | 'insert' | 'replace') => {
    if (!editor) return;
    const defaultSceneId = scenes[0]?.id || '';

    if (mode === 'replace') {
      const blocks = convertScriptTextToScreenplayBlocks(scriptText, {
        startingPageNumber: 1,
        sceneId: defaultSceneId,
      });
      editor.commands.setContent({ type: 'doc', content: blocks });
      setHasUnsavedChanges(true);
      onShowToast?.('Đã ghi đè kịch bản', 'Toàn bộ nội dung đã được thay thế bằng kịch bản chuyển đổi mới.');
      return;
    }

    if (mode === 'append') {
      const nextNum = getNextPageNumber(editor.state.doc);
      const blocks = convertScriptTextToScreenplayBlocks(scriptText, {
        startingPageNumber: nextNum,
        sceneId: defaultSceneId,
      });
      const endPos = editor.state.doc.content.size;
      editor.chain().focus().insertContentAt(endPos, blocks).run();
      setHasUnsavedChanges(true);
      onShowToast?.('Đã chèn kịch bản', `Đã thêm các trang mới (từ Trang ${nextNum}) vào cuối kịch bản.`);
      return;
    }

    if (mode === 'insert') {
      const currentPos = editor.state.selection.$from.pos;
      const currentNum = getNextPageNumber(editor.state.doc, currentPos);
      const blocks = convertScriptTextToScreenplayBlocks(scriptText, {
        startingPageNumber: currentNum,
        sceneId: defaultSceneId,
      });
      editor.chain().focus().insertContent(blocks).run();
      setHasUnsavedChanges(true);
      onShowToast?.('Đã chèn kịch bản', 'Đã chèn nội dung kịch bản mới tại vị trí con trỏ.');
      return;
    }
  };
  const compactBlockButtons: { type: MangaBlockType; label: string; icon: any }[] = [
    { type: 'dialogue', label: 'Thoại', icon: MessageSquare },
    { type: 'character', label: 'Nhân vật', icon: User },
    { type: 'caption', label: 'Lời dẫn', icon: FileText },
    { type: 'stage_direction', label: 'Chỉ dẫn', icon: Film },
    { type: 'sfx', label: '⚡ SFX', icon: Zap },
    { type: 'scene_heading', label: 'Phân cảnh', icon: Clapperboard },
    { type: 'transition', label: 'Chuyển cảnh', icon: Type },
  ];

  const isReadOnly = !canEditScript || isChapterLocked;

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full py-6 px-2 sm:px-4 bg-[#F2EFE9] min-h-[calc(100vh-100px)]">
      {/* 1. KHUNG TRANG GIẤY SOẠN THẢO CHÍNH (CONTINUOUS LONG PAPER SHEET ~880px) */}
      <div
        className="max-w-[880px] w-full mx-auto bg-white border border-[#E0DCD3] shadow-md rounded-xs flex flex-col min-h-[1100px] relative text-gray-900 transition-shadow hover:shadow-lg"
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

            /* CSS Styling cho SFX và Character */
            .paper-editor-sheet .script-block[data-block-type="character"]::before {
              content: "";
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 9999px;
              background-color: #4F46E5;
              margin-right: 8px;
              vertical-align: middle;
            }
            .paper-editor-sheet .script-block[data-block-type="sfx"]::before {
              content: "⚡ SFX";
              display: inline-flex;
              align-items: center;
              font-family: inherit;
              font-size: 10px;
              font-weight: 900;
              letter-spacing: 0.05em;
              background-color: #F59E0B;
              color: white;
              padding: 1px 6px;
              border-radius: 4px;
              margin-right: 8px;
              user-select: none;
              vertical-align: middle;
            }
            .paper-editor-sheet .mention {
              user-select: text !important;
            }

            /* Hiệu ứng di chuột trực quan trên từng dòng kịch bản (Ambient Line Hover) */
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

            <button
              type="button"
              disabled={!canEditScript || isChapterLocked}
              onClick={() => setShowAiConvertModal(true)}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#C2410C] to-indigo-700 hover:from-[#9A3412] hover:to-indigo-800 shadow-2xs transition-all disabled:opacity-40 cursor-pointer"
              title="Chuyển đổi văn bản thô hoặc AI tạo kịch bản"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ AI Chuyển đổi</span>
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
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 w-full text-left ${activeBlockType === type
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

            {/* Thông tin phiên bản & cơ chế lưu Working Draft */}
            <div className="pt-2 border-t border-[#EBE7DF] text-[10px] text-gray-500 text-center leading-tight">
              <div className="font-semibold text-gray-700 flex items-center justify-center gap-1">
                <span>Bản thảo:</span>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  v{chapterVersion ?? 0}
                </span>
              </div>
              <p className="text-[9px] text-gray-400 mt-1">
                Writer lưu không tăng version. Chỉ tăng khi gửi Editor duyệt và Editor yêu cầu viết lại.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCheatSheet((prev) => !prev)}
              className={`flex items-center justify-center gap-1 w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${showCheatSheet
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

      {/* 4. MODAL SMART CONVERT & AI BIÊN KỊCH */}
      <AiScriptConvertModal
        isOpen={showAiConvertModal}
        onClose={() => setShowAiConvertModal(false)}
        onApplyScript={handleApplyConvertedScript}
        initialStartingPageNumber={editor ? getNextPageNumber(editor.state.doc) : 1}
        seriesBibleContext={{
          characters: allBibleEntries
            .filter((e) => e.category === 'Character')
            .map((e) => ({ name: e.name, role: e.subtitle || undefined })),
          locations: allBibleEntries.filter((e) => e.category === 'Location').map((e) => e.name),
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
