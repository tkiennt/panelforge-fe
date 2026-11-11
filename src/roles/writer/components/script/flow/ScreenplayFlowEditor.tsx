// src/roles/writer/components/script/flow/ScreenplayFlowEditor.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { TextSelection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { AlertTriangle, Check, ChevronDown, Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
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
  createStructuredMangaPageBlocks,
  createPanelSlotBlocks,
  getDefaultPanelShot,
} from './scriptFlowAdapter';
import { MangaBlockType } from './types';
import { getNextPageNumber, getNextPanelNumber } from './comic-editor/comicCounting';
import { AiScriptConvertModal, convertScriptTextToScreenplayBlocks, linkTypedSpeakers } from './converter';

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
  /** Mỗi lần tăng giá trị sẽ mở hộp thoại nhập kịch bản (gọi từ thanh biểu tượng bên trái) */
  importRequestKey?: number;
  /** Phần tử đặt ở đầu thanh đáy, ví dụ bộ chọn chế độ xem của màn hình cha */
  dockLeading?: React.ReactNode;
  /** Tiêu đề bản thảo in ở đầu tờ giấy, ví dụ "Chương 1: Khởi đầu" */
  manuscriptTitle?: string;
}

interface PageOutlineItem {
  pageNumber: number;
  pos: number;
  panels: number;
}

/** Danh sách Trang (vị trí + số panel) để hiển thị dải trang ở thanh đáy */
function buildPageOutline(doc: any): PageOutlineItem[] {
  const pages: PageOutlineItem[] = [];
  doc.forEach((node: any, offset: number) => {
    const type = node.attrs?.blockType;
    if (type === 'page_heading') {
      pages.push({ pageNumber: node.attrs.pageNumber || pages.length + 1, pos: offset, panels: 0 });
    } else if (type === 'panel_heading' && pages.length > 0) {
      pages[pages.length - 1].panels++;
    }
  });
  return pages;
}

function findActivePage(outline: PageOutlineItem[], pos: number): number | null {
  let active: number | null = null;
  for (const p of outline) {
    if (p.pos <= pos) active = p.pageNumber;
  }
  return active;
}

const DOCK_BLOCK_TYPES: MangaBlockType[] = [
  'stage_direction',
  'dialogue',
  'character',
  'caption',
  'sfx',
  'transition',
  'scene_heading',
];

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
  importRequestKey = 0,
  dockLeading,
  manuscriptTitle,
}) => {
  const { t } = useTranslation('production');
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
  const [showAiConvertModal, setShowAiConvertModal] = useState(false);
  const [pageOutline, setPageOutline] = useState<PageOutlineItem[]>([]);
  const [activePageNumber, setActivePageNumber] = useState<number | null>(null);
  const [addPageMenuOpen, setAddPageMenuOpen] = useState(false);

  const syncPageOutline = (doc: any, selectionPos: number) => {
    const outline = buildPageOutline(doc);
    // Giữ nguyên mảng cũ khi cấu trúc trang không đổi để không render lại thanh đáy mỗi lần gõ phím
    setPageOutline((prev) =>
      prev.length === outline.length &&
      prev.every((p, i) => p.pos === outline[i].pos && p.panels === outline[i].panels && p.pageNumber === outline[i].pageNumber)
        ? prev
        : outline
    );
    setActivePageNumber(findActivePage(outline, selectionPos));
  };

  useEffect(() => {
    if (importRequestKey > 0) setShowAiConvertModal(true);
  }, [importRequestKey]);

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
          'focus:outline-none min-h-[60vh] font-studio text-[15px] leading-7 text-stone-900 bg-transparent selection:bg-orange-100 selection:text-orange-900 caret-[#C2410C]',
      },
      handleClick: (view, _pos, event) => {
        const target = event.target as HTMLElement;

        // 1. Thu gọn / Mở rộng trang
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

        // 1b. "+ Thoại" trên tiêu đề Panel: thêm bóng thoại trống ở cuối Panel đó
        // 1c. "+ Panel" trên tiêu đề Trang: thêm Panel trống ở cuối Trang đó
        const addDialogueBtn = target.closest('.panel-add-dialogue-btn');
        const addPanelBtn = target.closest('.page-add-panel-btn');
        if (addDialogueBtn || addPanelBtn) {
          const isPanelAction = Boolean(addDialogueBtn);
          const headingEl = (addDialogueBtn || addPanelBtn)!.closest(
            isPanelAction ? '[data-block-type="panel_heading"]' : '[data-block-type="page_heading"]'
          );
          if (!headingEl || !view.editable) return true;
          const { doc } = view.state;
          const $heading = doc.resolve(view.posAtDOM(headingEl, 0));
          let depth = $heading.depth;
          while (depth > 0 && $heading.node(depth).type.name !== 'scriptLineBlock') depth--;
          if (depth === 0) return true;
          const headingPos = $heading.before(depth);
          const heading = $heading.node(depth);

          // Panel kết thúc ở tiêu đề Panel/Trang/Cảnh kế tiếp; Trang kết thúc ở tiêu đề Trang/Cảnh kế tiếp
          const stopTypes = isPanelAction
            ? ['panel_heading', 'page_heading', 'scene_heading']
            : ['page_heading', 'scene_heading'];
          let insertPos = doc.content.size;
          let panelsInPage = 0;
          doc.forEach((node, offset) => {
            if (offset <= headingPos || insertPos !== doc.content.size) return;
            if (stopTypes.includes(node.attrs?.blockType)) {
              insertPos = offset;
              return;
            }
            if (node.attrs?.blockType === 'panel_heading') panelsInPage++;
          });

          const pageNumber = heading.attrs.pageNumber || 1;
          const sceneId = heading.attrs.sceneId || null;
          const json = isPanelAction
            ? [
                {
                  type: 'scriptLineBlock',
                  attrs: {
                    scriptLineId: generateGuid(),
                    sceneId,
                    blockType: 'dialogue',
                    narrationMode: 'Present',
                    pageNumber,
                    panelNumber: heading.attrs.panelNumber,
                    inPanel: true,
                  },
                },
              ]
            : createPanelSlotBlocks(pageNumber, panelsInPage + 1, getDefaultPanelShot(panelsInPage + 1), sceneId);

          const nodes = json.map((n) => view.state.schema.nodeFromJSON(n));
          const tr = view.state.tr.insert(insertPos, nodes);
          // Panel mới: con trỏ vào ô mô tả (bỏ qua tiêu đề panel). Thoại mới: con trỏ vào chính nó.
          const cursorPos = isPanelAction ? insertPos + 1 : insertPos + nodes[0].nodeSize + 1;
          tr.setSelection(TextSelection.create(tr.doc, cursorPos)).scrollIntoView();
          view.dispatch(tr);
          view.focus();
          if (!isPanelAction) renumberEditorState(editor, cursorPos);
          setHasUnsavedChanges(true);
          return true;
        }

        // 2. Nút Xóa khung (Panel Delete Button)
        const panelDeleteBtn = target.closest('.panel-delete-btn');
        if (panelDeleteBtn) {
          const panelBlockEl = panelDeleteBtn.closest('[data-block-type="panel_heading"]');
          if (panelBlockEl) {
            try {
              const domPos = view.posAtDOM(panelBlockEl, 0);
              const $pos = view.state.doc.resolve(domPos);
              let d = $pos.depth;
              while (d > 0 && $pos.node(d).type.name !== 'scriptLineBlock') d--;
              if (d > 0) {
                const from = $pos.before(d);
                const to = $pos.after(d);
                const tr = view.state.tr.delete(from, to);
                view.dispatch(tr);
                renumberEditorState(editor);
                return true;
              }
            } catch (err) {
              console.error('Lỗi khi xóa panel:', err);
            }
          }
          return true;
        }

        // 3. Nút Xóa trang (Page Delete Button)
        const pageDeleteBtn = target.closest('.page-delete-btn');
        if (pageDeleteBtn) {
          const pageBlockEl = pageDeleteBtn.closest('[data-block-type="page_heading"]');
          if (pageBlockEl) {
            let pageCount = 0;
            view.state.doc.descendants((node) => {
              if (node.type.name === 'scriptLineBlock' && node.attrs?.blockType === 'page_heading') {
                pageCount++;
              }
            });
            if (pageCount <= 1) {
              return true;
            }

            try {
              const domPos = view.posAtDOM(pageBlockEl, 0);
              const $pos = view.state.doc.resolve(domPos);
              let d = $pos.depth;
              while (d > 0 && $pos.node(d).type.name !== 'scriptLineBlock') d--;
              if (d > 0) {
                const from = $pos.before(d);
                const to = $pos.after(d);
                const tr = view.state.tr.delete(from, to);
                view.dispatch(tr);
                renumberEditorState(editor);
                return true;
              }
            } catch (err) {
              console.error('Lỗi khi xóa trang:', err);
            }
          }
          return true;
        }

        // 4. Nút Xóa cảnh (Scene Delete Button)
        const sceneDeleteBtn = target.closest('.scene-delete-btn');
        if (sceneDeleteBtn) {
          const sceneBlockEl = sceneDeleteBtn.closest('[data-block-type="scene_heading"]');
          if (sceneBlockEl) {
            let sceneCount = 0;
            view.state.doc.descendants((node) => {
              if (node.type.name === 'scriptLineBlock' && node.attrs?.blockType === 'scene_heading') {
                sceneCount++;
              }
            });
            if (sceneCount <= 1) {
              return true;
            }

            try {
              const domPos = view.posAtDOM(sceneBlockEl, 0);
              const $pos = view.state.doc.resolve(domPos);
              let d = $pos.depth;
              while (d > 0 && $pos.node(d).type.name !== 'scriptLineBlock') d--;
              if (d > 0) {
                const from = $pos.before(d);
                const to = $pos.after(d);
                const tr = view.state.tr.delete(from, to);
                view.dispatch(tr);
                renumberEditorState(editor);
                return true;
              }
            } catch (err) {
              console.error('Lỗi khi xóa cảnh:', err);
            }
          }
          return true;
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
    onCreate: ({ editor }) => {
      syncPageOutline(editor.state.doc, editor.state.selection.from);
    },
    onSelectionUpdate: ({ editor }) => {
      syncPageOutline(editor.state.doc, editor.state.selection.from);
      const currentBlock = editor.state.selection.$from.parent;
      if (currentBlock && currentBlock.type.name === 'scriptLineBlock') {
        setActiveBlockType(currentBlock.attrs.blockType || 'stage_direction');
        setActiveNarrationMode(currentBlock.attrs.narrationMode || 'Present');
      }
    },
    onUpdate: ({ editor, transaction }) => {
      syncPageOutline(editor.state.doc, editor.state.selection.from);
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
      // emitUpdate=false: đổi quyền sửa không phải là chỉnh sửa nội dung, không được đánh dấu "chưa lưu"
      editor.setEditable(canEditScript && !isChapterLocked, false);
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
        tr.setMeta('addToHistory', false);
        tr.setMeta('preventUnsavedChanges', true);
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
      const characters = allBibleEntries
        .filter((e) => e.category === 'Character' && e.isActive)
        .map((e) => ({ id: e.id, name: e.name, code: e.code }));
      const extracted = linkTypedSpeakers(extractScriptLinesFromDoc(editor.getJSON(), defaultSceneId), characters);

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
    allBibleEntries,
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

  // Thêm Trang mới ở cuối kịch bản, có sẵn 4 hoặc 5 Panel trống
  const handleInsertStructuredPage = (panelsCount: 4 | 5 = 4) => {
    if (!editor || !canEditScript || isChapterLocked) return;
    const nextNum = getNextPageNumber(editor.state.doc);
    const newBlocks = createStructuredMangaPageBlocks(nextNum, panelsCount, scenes[0]?.id || null);
    const endPos = editor.state.doc.content.size;
    // Con trỏ đặt vào ô mô tả của Panel đầu tiên: sau page heading và panel heading
    editor.chain().insertContentAt(endPos, newBlocks).run();
    renumberEditorState(editor);
    focusFirstEmptySlotAfter(endPos);
    setHasUnsavedChanges(true);
    onShowToast?.(`Đã thêm Trang ${nextNum}`, `Trang ${nextNum} có sẵn ${panelsCount} Panel trống.`);
  };

  // Đặt con trỏ vào khối scriptLineBlock rỗng đầu tiên kể từ vị trí `fromPos`
  const focusFirstEmptySlotAfter = (fromPos: number) => {
    if (!editor) return;
    let target: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (target !== null) return false;
      if (pos >= fromPos && node.type.name === 'scriptLineBlock' && node.content.size === 0) {
        target = pos + 1;
      }
      return false;
    });
    if (target !== null) {
      editor.chain().focus().setTextSelection(target).scrollIntoView().run();
    }
  };

  // Áp dụng kịch bản sau khi chuyển đổi bằng Smart Heuristic / AI
  const handleApplyConvertedScript = (scriptText: string, mode: 'append' | 'insert' | 'replace') => {
    if (!editor) return;
    const defaultSceneId = scenes[0]?.id || '';
    const characters = allBibleEntries
      .filter((e) => e.category === 'Character' && e.isActive)
      .map((e) => ({ id: e.id, name: e.name, code: e.code }));

    if (mode === 'replace') {
      const blocks = convertScriptTextToScreenplayBlocks(scriptText, {
        startingPageNumber: 1,
        sceneId: defaultSceneId,
        characters,
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
        characters,
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
        characters,
      });
      editor.chain().focus().insertContent(blocks).run();
      setHasUnsavedChanges(true);
      onShowToast?.('Đã chèn kịch bản', 'Đã chèn nội dung kịch bản mới tại vị trí con trỏ.');
      return;
    }
  };
  const isReadOnly = !canEditScript || isChapterLocked;
  const activeBlockIsHeading = activeBlockType === 'page_heading' || activeBlockType === 'panel_heading';

  const scrollToPage = (pos: number) => {
    if (!editor) return;
    const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
    dom?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    editor.chain().focus().setTextSelection(pos + 1).run();
  };

  const saveStatus = isSaving
    ? t('scriptStudio.dock.saving')
    : hasUnsavedChanges
      ? t('scriptStudio.dock.unsaved')
      : lastSavedTime
        ? t('scriptStudio.dock.saved', { time: lastSavedTime })
        : t('scriptStudio.dock.idle');

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F3F0E9]">
      {/* Bàn viết: tờ giấy đặt giữa nền giấy ấm, không có thanh công cụ chen vào vùng viết */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-8">
        <div
          className="max-w-[820px] mx-auto bg-white rounded-sm border border-stone-200/80 shadow-[0_1px_2px_rgba(28,25,23,0.05),0_12px_32px_-16px_rgba(28,25,23,0.22)] relative"
          onMouseOver={(e) => {
            const target = e.target as HTMLElement;
            const mentionEl = target.closest('.mention') as HTMLElement | null;
            if (mentionEl) {
              const label = mentionEl.getAttribute('data-label') || '';
              const id = mentionEl.getAttribute('data-id') || '';
              const entry = allBibleEntries.find((b) => b.id === id || b.name.toLowerCase() === label.toLowerCase());
              if (entry) {
                const rect = mentionEl.getBoundingClientRect();
                setHoveredMention({ x: rect.left, y: rect.bottom + 8, entry });
              }
            }
          }}
          onMouseOut={(e) => {
            if ((e.target as HTMLElement).closest('.mention')) setHoveredMention(null);
          }}
        >
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
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Bỏ qua
                </button>
              </div>
            </div>
          )}

          <div
            data-testid="paper-editor-sheet"
            className="relative paper-editor-sheet px-8 sm:px-16 lg:px-20 py-12 sm:py-16"
            onMouseOver={handleSheetMouseOver}
            onMouseOut={handleSheetMouseOut}
            onClick={() => {
              if (editor && !editor.isFocused) editor.commands.focus();
            }}
          >
            <style>{`
              .paper-editor-sheet .ProseMirror,
              .paper-editor-sheet .script-block {
                cursor: text;
                caret-color: #C2410C;
              }
              .paper-editor-sheet .mention { user-select: text !important; }
              .paper-editor-sheet .script-block { position: relative; border-radius: 4px; }
              .paper-editor-sheet .script-block[data-block-type="sfx"]::before {
                content: "SFX";
                display: inline-block;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.08em;
                color: #B45309;
                margin-right: 10px;
              }
            `}</style>
            {manuscriptTitle && (
              <h2 className="font-serif text-3xl sm:text-4xl text-stone-900 text-center mb-12 select-none">
                {manuscriptTitle}
              </h2>
            )}
            <EditorContent editor={editor} />

            {hoveredMention && (
              <div
                style={{ top: hoveredMention.y, left: hoveredMention.x }}
                className="fixed z-50 bg-white rounded-xl shadow-xl border border-stone-200/80 p-3 w-72 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center gap-2.5">
                  {hoveredMention.entry.referenceImageUrl || hoveredMention.entry.effectiveRevision?.referenceImageUrl ? (
                    <img
                      src={hoveredMention.entry.referenceImageUrl || hoveredMention.entry.effectiveRevision?.referenceImageUrl || ''}
                      alt={hoveredMention.entry.name}
                      className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-[#C2410C] font-serif text-base flex items-center justify-center shrink-0">
                      {hoveredMention.entry.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold text-sm text-stone-900 truncate">{hoveredMention.entry.name}</span>
                    {hoveredMention.entry.subtitle && (
                      <span className="block text-xs text-stone-500 truncate">{hoveredMention.entry.subtitle}</span>
                    )}
                  </div>
                </div>
                {(hoveredMention.entry.description || hoveredMention.entry.effectiveRevision?.summary) && (
                  <p className="mt-2 text-xs text-stone-600 line-clamp-3 leading-relaxed border-t border-stone-100 pt-2">
                    {hoveredMention.entry.description || hoveredMention.entry.effectiveRevision?.summary}
                  </p>
                )}
              </div>
            )}
          </div>

          {quickViewCardData && quickViewPos && (
            <QuickViewCard
              data={quickViewCardData}
              position={quickViewPos}
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
            />
          )}
        </div>
      </div>

      {/* Thanh đáy kiểu Bàn vẽ: loại dòng · dải trang · trạng thái lưu */}
      <div
        data-testid="script-bottom-dock"
        className="shrink-0 border-t border-stone-200/80 bg-[#FCFBF8]/95 px-3 sm:px-5 py-2 flex items-center gap-3 sm:gap-4"
      >
        {dockLeading}

        {!isReadOnly && (
          <label className="hidden md:flex items-center gap-2 text-xs text-stone-500 shrink-0">
            <span className="hidden 2xl:inline">{t('scriptStudio.dock.blockType')}</span>
            <select
              data-testid="dock-block-type-select"
              value={activeBlockIsHeading ? '' : activeBlockType}
              disabled={activeBlockIsHeading}
              onChange={(e) => setBlockType(e.target.value as MangaBlockType)}
              className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800 outline-none focus:border-orange-400 disabled:opacity-50 cursor-pointer"
            >
              {activeBlockIsHeading && <option value="">{t(`scriptStudio.blocks.${activeBlockType}`)}</option>}
              {DOCK_BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`scriptStudio.blocks.${type}`)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex-1 min-w-0 flex items-center justify-center-safe gap-1.5">
        <nav
          aria-label={t('scriptStudio.dock.pages')}
          className="min-w-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5"
        >
          {pageOutline.map((p) => {
            const isActive = p.pageNumber === activePageNumber;
            return (
              <button
                key={`${p.pageNumber}-${p.pos}`}
                type="button"
                onClick={() => scrollToPage(p.pos)}
                title={t('scriptStudio.dock.page', { n: p.pageNumber })}
                aria-current={isActive ? 'page' : undefined}
                className={`shrink-0 w-9 h-11 rounded-[3px] border flex flex-col items-center justify-end pb-1 gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#EA580C] bg-white shadow-sm ring-1 ring-[#EA580C]/30'
                    : 'border-stone-200 bg-white hover:border-stone-400'
                }`}
              >
                <span className="flex flex-col gap-[2px] w-5">
                  {Array.from({ length: Math.min(p.panels, 5) }).map((_, idx) => (
                    <span key={idx} className={`h-[3px] rounded-full ${isActive ? 'bg-orange-300' : 'bg-stone-200'}`} />
                  ))}
                </span>
                <span className={`text-xs font-mono leading-none ${isActive ? 'text-[#C2410C] font-bold' : 'text-stone-500'}`}>
                  {p.pageNumber}
                </span>
              </button>
            );
          })}
        </nav>

          {!isReadOnly && (
            <div className="relative shrink-0">
              <button
                type="button"
                data-testid="dock-add-page-btn"
                onClick={() => setAddPageMenuOpen((v) => !v)}
                aria-expanded={addPageMenuOpen}
                className="h-11 px-3 rounded-[3px] border border-dashed border-stone-300 text-stone-500 hover:text-[#C2410C] hover:border-[#EA580C] flex items-center gap-1 text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('scriptStudio.dock.addPage')}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {addPageMenuOpen && (
                <div
                  role="menu"
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 rounded-xl border border-stone-200/80 bg-white p-1.5 shadow-lg z-40"
                >
                  {([4, 5] as const).map((count) => (
                    <button
                      key={count}
                      type="button"
                      role="menuitem"
                      data-testid={`dock-add-page-${count}`}
                      onClick={() => {
                        setAddPageMenuOpen(false);
                        handleInsertStructuredPage(count);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-stone-800 hover:bg-orange-50 cursor-pointer"
                    >
                      {t(count === 4 ? 'scriptStudio.dock.fourPanels' : 'scriptStudio.dock.fivePanels')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isReadOnly && (
            <span className="hidden 2xl:inline text-xs text-stone-400 font-mono">{t('scriptStudio.dock.syntaxHint')}</span>
          )}
          {!isReadOnly && (
            <button
              type="button"
              data-testid="dock-save-btn"
              disabled={!hasUnsavedChanges || isSaving}
              onClick={handleManualSave}
              title="Ctrl + S"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default ${
                hasUnsavedChanges
                  ? 'bg-[#EA580C] text-white hover:bg-[#C2410C]'
                  : 'text-stone-500 bg-transparent'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : hasUnsavedChanges ? (
                <Save className="w-3.5 h-3.5" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{saveStatus}</span>
            </button>
          )}
        </div>
      </div>

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
