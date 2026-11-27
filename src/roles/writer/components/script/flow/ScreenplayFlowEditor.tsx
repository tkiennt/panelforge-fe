// src/roles/writer/components/script/flow/ScreenplayFlowEditor.tsx
/**
 * Bàn viết kịch bản Graphic Novel kiểu WriterSolo.
 * Gõ liền mạch bằng bàn phím: Enter / Tab / Shift+Tab theo `grammar/scriptGrammar.ts`, Ctrl+1..8 đổi loại dòng,
 * Ctrl+S lưu. Kịch bản là chữ thuần, không liên kết Series Bible.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Extension, type JSONContent } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  ArrowRight,
  Clapperboard,
  FileDown,
  FileText,
  Loader2,
  MessageSquare,
  Save,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SceneDetailDto } from '@/services/scriptLine.service';
import type { NextLineKind } from '@/services/aiAgents.service';
import { PageDto } from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';
import { ScriptCommentDto } from '@/services/chapter.service';
import { BibleEntryDto } from '@/services/bible.service';
import { GN_ELEMENTS, GnElement } from './grammar/scriptGrammar';
import { ScriptActionGooeyMenu } from './ScriptActionGooeyMenu';
import {
  BibleRefMark,
  BibleSpeakerRef,
  GN_LINE,
  GnLabels,
  ScriptDocument,
  ScriptLineBlockNode,
  ScriptTypingBehavior,
  activeElement,
  chooseElement,
  getElementMenu,
  setLineElement,
} from './nodes/ScriptLineBlockNode';
import {
  ScriptDocSnapshot,
  docToScript,
  scriptToDoc,
  docToScriptTree,
  ChapterScriptBody,
} from './scriptFlowAdapter';
import { BibleRefFloatingMenu } from './BibleRefFloatingMenu';
import { mapCategoryToTab } from '@/shared/features/series-bible/bibleCategory';
import { ScriptImportModal } from './converter';

export interface ScreenplayFlowEditorProps {
  chapterId?: string;
  scenes: SceneDetailDto[];
  pages: PageDto[];
  panels: PanelDto[];
  canEditScript: boolean;
  isChapterLocked: boolean;
  onSave: (snapshot: ScriptDocSnapshot) => Promise<boolean | void>;
  onShowToast?: (title: string, description?: string) => void;
  /** Tăng giá trị để buộc đồng bộ nội dung mới từ máy chủ (sau khôi phục / duyệt AI / tải lại thủ công). */
  syncRevision?: number;
  /** Báo trạng thái có thay đổi chưa lưu lên màn cha để giữ thay đổi khi xung đột 409. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Nút chuyển chế độ xem của màn cha, đặt ở đầu thanh công cụ. */
  dockLeading?: React.ReactNode;
  manuscriptTitle?: string;
  /**
   * Đưa hàm lưu lên màn cha (vd lưu trước khi gửi duyệt). Hàm trả true khi đã lưu xong hoặc không có gì để lưu,
   * false khi lưu thất bại. Gọi lại với null khi bàn viết unmount.
   */
  registerSave?: (save: (() => Promise<boolean>) | null) => void;
  registerGetPayload?: (getPayload: (() => ChapterScriptBody) | null) => void;
  comments?: ScriptCommentDto[];
  canResolveComment?: boolean;
  onResolveComment?: (commentId: string) => Promise<void>;
  onToggleCommentsSidePanel?: () => void;
  isCommentsSidePanelOpen?: boolean;
  activeLineId?: string | null;
  activePanel?: { pageNumber?: number | null; panelNumber?: number | null } | null;
  allBibleEntries?: BibleEntryDto[];
  onRewriteLineId?: (lineId: string) => void;
  rewritingLineId?: string | null;
  flowAiSlot?: React.ReactNode;
  /** Bản xem thay đổi của đề xuất AI; khi có thì thay trang viết và khoá sửa. */
  diffPreview?: React.ReactNode;
  sceneCount?: number;
  onToggleSceneOutline?: () => void;
  isSceneOutlineOpen?: boolean;
  activeRightDrawer?: string | null;
  onToggleRightDrawer?: (drawer: any) => void;
  openFindingsCount?: number;
  onOpenAiPromptModal?: () => void;
  onOpenAiDraft?: () => void;
  onOpenAiStoryboard?: () => void;
  selectedSceneId?: string | null;
  selectedSceneHeading?: string | null;
  onCaretSceneChange?: (sceneId: string) => void;
  onRunNextLine?: (params: {
    sceneId: string;
    kind: NextLineKind;
    afterLineId: string | null;
  }) => void;
  runningNextLineKind?: NextLineKind | null;
  registerSetPanelStage?: (
    fn:
      | ((
          pageNumber: number,
          panelNumber: number,
          castRevisions:
            | {
                bibleEntryId: string;
                revisionId: string;
                entryName?: string;
                variantLabel?: string;
                versionNumber?: number;
              }[]
            | null,
        ) => void)
      | null,
  ) => void;
}

const SHEET_CSS = `
.gn-sheet .ProseMirror { outline: none; font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 14px; line-height: 1.75rem; color: #18181B; caret-color: #EA580C; min-height: auto; }
.gn-sheet .gn-line { clear: both; min-height: 1.75rem; white-space: pre-wrap; word-break: break-word; }
.gn-sheet .gn-comment-highlight { background-color: #FDE047; border-radius: 2px; padding: 1px 2px; color: #0c0a09; }
.gn-sheet .gn-page { margin-top: 3.5rem; padding-top: 1rem; border-top: 2px solid #D4CBBF;
  font-weight: 800; font-size: 16px; letter-spacing: .05em; color: #18181B; }
.gn-sheet .gn-page:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.gn-sheet .gn-page::before { content: attr(data-label); font-weight: 800; color: #18181B; }
.gn-sheet .gn-panel { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed #E7E5E4;
  font-weight: 800; font-size: 14px; letter-spacing: .03em; color: #18181B; text-transform: uppercase; }
.gn-sheet .gn-panel:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.gn-sheet .gn-panel::before { content: attr(data-label) "\\00a0\\00a0"; font-weight: 800; color: #18181B; }
.gn-sheet .gn-action { margin-top: .5rem; color: #18181B; }
.gn-sheet .gn-action.is-empty::before { content: attr(data-placeholder); color: #a8a29e; pointer-events: none; font-style: italic; float: left; height: 0; }
.gn-sheet .gn-character { float: left; clear: both; width: 10rem; margin-top: .5rem; text-transform: uppercase; font-weight: 700; color: #18181B; }
.gn-sheet .gn-character.gn-char-tone-approved_artwork { color: #15803d !important; }
.gn-sheet .gn-character.gn-char-tone-defined_no_artwork { color: #b45309 !important; }
.gn-sheet .gn-character.gn-char-tone-undefined_no_artwork { color: #c2410c !important; }
.gn-sheet .gn-character.gn-char-tone-crowd { color: #78716c !important; opacity: 0.85; }
.gn-sheet .gn-dialogue { clear: none; margin-left: 11rem; color: #18181B; }
.gn-sheet .gn-parens { clear: none; margin-left: 14rem; font-style: italic; color: #57534E; }
.gn-sheet .gn-parens::before { content: '('; }
.gn-sheet .gn-parens::after { content: ')'; }
.gn-sheet .gn-character + .gn-dialogue, .gn-sheet .gn-character + .gn-parens { margin-top: .5rem; }
.gn-sheet .gn-caption, .gn-sheet .gn-sfx { display: grid; grid-template-columns: 11rem 1fr; margin-top: .5rem; }
.gn-sheet .gn-caption::before, .gn-sheet .gn-sfx::before { content: attr(data-label); grid-column: 1; }
.gn-sheet .gn-sfx { font-weight: 700; color: #EA580C; }
.gn-sheet .gn-sfx::before { color: #EA580C; font-weight: 800; }
.gn-sheet .gn-diff .ProseMirror { min-height: 0; }
.gn-sheet .gn-diff .gn-character { float: none; width: auto; }
.gn-sheet .gn-diff .gn-dialogue { margin-left: 4rem; }
.gn-sheet .gn-diff .gn-parens { margin-left: 2rem; }
.gn-sheet .gn-diff [data-diff='added'] { background: #dcfce7; box-shadow: inset 3px 0 #16a34a; }
.gn-sheet .gn-diff [data-diff='removed'] { background: #fee2e2; box-shadow: inset 3px 0 #dc2626; text-decoration: line-through; color: #7f1d1d; }
.gn-sheet .gn-ghost { color: #a8a29e; pointer-events: none; user-select: none; }
`;

export const ScreenplayFlowEditor: React.FC<ScreenplayFlowEditorProps> = ({
  chapterId,
  scenes,
  pages,
  panels,
  canEditScript,
  isChapterLocked,
  onSave,
  onShowToast,
  syncRevision,
  onDirtyChange,
  dockLeading,
  manuscriptTitle,
  registerSave,
  registerGetPayload,
  comments,
  canResolveComment,
  onResolveComment,
  onToggleCommentsSidePanel,
  isCommentsSidePanelOpen,
  activeLineId,
  activePanel,
  allBibleEntries,
  onRewriteLineId,
  rewritingLineId,
  flowAiSlot,
  diffPreview,
  sceneCount,
  onToggleSceneOutline,
  isSceneOutlineOpen,
  activeRightDrawer,
  onToggleRightDrawer,
  openFindingsCount,
  onOpenAiPromptModal,
  onOpenAiDraft,
  onOpenAiStoryboard,
  selectedSceneId,
  selectedSceneHeading,
  onCaretSceneChange,
  onRunNextLine,
  runningNextLineKind,
  registerSetPanelStage,
}) => {
  const { t } = useTranslation('production');
  const isReadOnly = !canEditScript || isChapterLocked || Boolean(diffPreview);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [active, setActive] = useState<GnElement | null>(null);
  const [showAiPopover, setShowAiPopover] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  /** Menu chọn loại dòng (Enter trên dòng trống): vị trí neo theo con trỏ + mục đang chọn. */
  const [menu, setMenu] = useState<{ index: number; top: number; left: number } | null>(null);
  const [cursorAnchor, setCursorAnchor] = useState<{
    sceneId: string | null;
    afterLineId: string | null;
    rewriteLineId: string | null;
  }>({ sceneId: null, afterLineId: null, rewriteLineId: null });
  const dirtyRef = useRef(false);
  const loadingRef = useRef(false);
  const savingRef = useRef(false);

  const lineSceneMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const sc of scenes) {
      for (const l of sc.scriptLines ?? []) {
        if (l.id && !l.id.startsWith('wc-')) map.set(l.id, sc.id);
      }
    }
    return map;
  }, [scenes]);

  const lineSceneMapRef = useRef(lineSceneMap);
  lineSceneMapRef.current = lineSceneMap;
  const onCaretSceneChangeRef = useRef(onCaretSceneChange);
  onCaretSceneChangeRef.current = onCaretSceneChange;
  /** Dòng con trỏ đứng lần báo gần nhất: chỉ báo đổi cảnh khi con trỏ thật sự sang dòng khác, để Writer chọn được
   * cảnh khác từ ngăn kéo (vd. cảnh mới còn trống) mà không bị kéo về cảnh cũ ở lần cập nhật chọn kế tiếp. */
  const lastCaretLineRef = useRef<string | null>(null);

  const firstSavedLineId = useMemo(() => {
    const first = lineSceneMap.keys().next();
    return first.done ? null : first.value;
  }, [lineSceneMap]);

  const bibleSpeakers = useMemo<BibleSpeakerRef[]>(() => {
    return (allBibleEntries || [])
      .filter((entry) => mapCategoryToTab(entry.category) === 'characters')
      .map((e) => ({ name: e.name }));
  }, [allBibleEntries]);

  const commentsRef = useRef<ScriptCommentDto[]>([]);
  commentsRef.current = comments || [];

  const commentsPlugin = useMemo(() => {
    return new Plugin({
      key: new PluginKey('commentHighlights'),
      props: {
        decorations(state) {
          const currentList = commentsRef.current;
          if (!currentList || currentList.length === 0) return null;
          const open = currentList.filter((c) => !c.resolvedAt && c.scriptLineId);
          if (open.length === 0) return null;

          const byLine = new Map<string, ScriptCommentDto[]>();
          for (const c of open) {
            if (!c.scriptLineId) continue;
            const arr = byLine.get(c.scriptLineId) ?? [];
            arr.push(c);
            byLine.set(c.scriptLineId, arr);
          }

          const decos: Decoration[] = [];
          state.doc.forEach((node, offset) => {
            const refId = node.attrs.refId as string | null;
            if (!refId) return;
            const matches = byLine.get(refId);
            if (!matches || matches.length === 0) return;

            const text = node.textContent;
            for (const c of matches) {
              const quote = c.quotedText?.trim();
              if (quote && text.includes(quote)) {
                const startIdx = text.indexOf(quote);
                const from = offset + 1 + startIdx;
                const to = from + quote.length;
                decos.push(Decoration.inline(from, to, { class: 'gn-comment-highlight' }));
              } else if (node.content.size > 0) {
                decos.push(
                  Decoration.inline(offset + 1, offset + 1 + node.content.size, {
                    class: 'gn-comment-highlight',
                  }),
                );
              }
            }
          });
          return DecorationSet.create(state.doc, decos);
        },
      },
    });
  }, []);

  // Một object cố định đưa vào extension; nội dung cập nhật theo ngôn ngữ hiện tại ở mỗi lần render,
  // nên nhãn PAGE/PANEL đổi theo ngôn ngữ mà không phải tạo lại editor.
  const labelsRef = useRef<GnLabels>({
    page: () => '',
    panel: () => '',
    caption: '',
    sfx: '',
    acceptHint: '',
  });
  Object.assign(labelsRef.current, {
    page: (n: number, k: number) => t('scriptStudio.gn.page', { n, k }),
    panel: (n: number) => t('scriptStudio.gn.panel', { n }),
    caption: t('scriptStudio.gn.caption'),
    sfx: t('scriptStudio.gn.sfx'),
    acceptHint: t('scriptStudio.gn.accept'),
  });
  const labels = labelsRef.current;

  const markDirty = useCallback(
    (value: boolean) => {
      dirtyRef.current = value;
      setIsDirty(value);
      onDirtyChange?.(value);
    },
    [onDirtyChange],
  );

  const editor = useEditor(
    {
      editable: !isReadOnly,
      extensions: [
        StarterKit.configure({
          document: false,
          paragraph: false,
          heading: false,
          blockquote: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          listKeymap: false,
          codeBlock: false,
          horizontalRule: false,
          hardBreak: false,
          bold: false,
          italic: false,
          strike: false,
          underline: false,
          code: false,
          link: false,
          dropcursor: false,
          trailingNode: false,
        }),
        ScriptDocument,
        BibleRefMark,
        ScriptLineBlockNode,
        ScriptTypingBehavior.configure({ labels, bibleSpeakers, bibleEntries: allBibleEntries }),
        Extension.create({
          name: 'scriptCommentHighlights',
          addProseMirrorPlugins() {
            return [commentsPlugin];
          },
        }),
      ],
      content: scriptToDoc(scenes, pages, panels),
      editorProps: {
        attributes: {
          'aria-label': t('scriptStudio.gn.sheet'),
          spellcheck: 'false',
        },
      },
      onCreate: ({ editor: ed }) => {
        setActive(activeElement(ed));
      },
      onUpdate: ({ transaction }) => {
        if (transaction.docChanged && !loadingRef.current) markDirty(true);
      },
      onSelectionUpdate: ({ editor: ed }) => {
        setActive(activeElement(ed));
      },
      onTransaction: ({ editor: ed }) => {
        setActive(activeElement(ed));
        const map = lineSceneMapRef.current;
        const doc = ed.state.doc;
        if (doc.childCount > 0) {
          const curIdx = Math.min(ed.state.selection.$from.index(0), doc.childCount - 1);
          const cur = doc.child(curIdx);
          let rewriteLineId: string | null = null;
          const curRef = cur.attrs.refId as string | null;
          if (curRef && map.has(curRef)) {
            rewriteLineId = curRef;
          } else if (cur.attrs.el === 'character' || cur.attrs.el === 'parens') {
            for (let j = curIdx + 1; j < doc.childCount; j += 1) {
              const next = doc.child(j);
              if (next.attrs.el === 'parens') continue;
              if (next.attrs.el === 'dialogue' && next.attrs.refId && map.has(next.attrs.refId)) {
                rewriteLineId = next.attrs.refId as string;
              }
              break;
            }
          }

          let afterLineId: string | null = rewriteLineId;
          let matchedSceneId: string | null = rewriteLineId
            ? (map.get(rewriteLineId) ?? null)
            : null;
          if (!afterLineId) {
            for (let j = curIdx; j >= 0; j -= 1) {
              const r = doc.child(j).attrs.refId as string | null;
              if (r && map.has(r)) {
                afterLineId = r;
                matchedSceneId = map.get(r) ?? null;
                break;
              }
            }
          }
          setCursorAnchor((prev) =>
            prev.sceneId === matchedSceneId &&
            prev.afterLineId === afterLineId &&
            prev.rewriteLineId === rewriteLineId
              ? prev
              : { sceneId: matchedSceneId, afterLineId, rewriteLineId },
          );
          if (
            !loadingRef.current &&
            rewriteLineId &&
            matchedSceneId &&
            rewriteLineId !== lastCaretLineRef.current
          ) {
            lastCaretLineRef.current = rewriteLineId;
            onCaretSceneChangeRef.current?.(matchedSceneId);
          }
        }

        const m = getElementMenu(ed.state);
        if (!m.open) {
          setMenu(null);
          return;
        }
        const c = ed.view.coordsAtPos(ed.state.selection.from);
        setMenu({ index: m.index, top: c.bottom + 4, left: c.left });
      },
    },
    [chapterId],
  );

  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  // Đổi ngôn ngữ: vẽ lại nhãn (decoration tính lại ở mỗi transaction).
  useEffect(() => {
    if (editor && !editor.isDestroyed)
      editor.view.dispatch(editor.state.tr.setMeta('labels', true));
  }, [editor, t]);

  // Cập nhật highlights khi danh sách comments thay đổi
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr.setMeta('commentsUpdated', true));
    }
  }, [editor, comments]);

  const scrollToLine = (scriptLineId?: string | null) => {
    if (!editor || !scriptLineId) return;
    let targetPos: number | null = null;
    editor.state.doc.forEach((node, pos) => {
      if (node.attrs.refId === scriptLineId) {
        targetPos = pos;
      }
    });
    if (targetPos !== null) {
      try {
        editor.commands.setTextSelection(targetPos + 1);
        const dom = editor.view.nodeDOM(targetPos);
        if (dom instanceof HTMLElement) {
          dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {
        // fallback
      }
    }
  };

  useEffect(() => {
    if (activeLineId) {
      scrollToLine(activeLineId);
    }
  }, [activeLineId]);

  useEffect(() => {
    if (activePanel?.pageNumber && activePanel?.panelNumber && editor) {
      let targetPos: number | null = null;
      let curPage = 0;
      let curPanel = 0;
      editor.state.doc.forEach((node, pos) => {
        if (node.attrs.el === 'page') {
          curPage += 1;
          curPanel = 0;
        } else if (node.attrs.el === 'panel') {
          curPanel += 1;
          if (curPage === activePanel.pageNumber && curPanel === activePanel.panelNumber) {
            targetPos = pos;
          }
        }
      });
      if (targetPos !== null) {
        try {
          editor.commands.setTextSelection(targetPos + 1);
          const dom = editor.view.nodeDOM(targetPos);
          if (dom instanceof HTMLElement) {
            dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } catch {
          // ignore
        }
      }
    }
  }, [activePanel, editor]);

  useEffect(() => {
    if (!registerSetPanelStage) return;
    const fn = (
      pageNumber: number,
      panelNumber: number,
      castRevisions:
        | {
            bibleEntryId: string;
            revisionId: string;
            entryName?: string;
            variantLabel?: string;
            versionNumber?: number;
          }[]
        | null,
    ) => {
      if (!editor) return;
      let targetPos: number | null = null;
      let targetNode: any = null;
      let curPage = 0;
      let curPanel = 0;
      editor.state.doc.forEach((node, pos) => {
        if (node.attrs.el === 'page') {
          curPage += 1;
          curPanel = 0;
        } else if (node.attrs.el === 'panel') {
          curPanel += 1;
          if (curPage === pageNumber && curPanel === panelNumber) {
            targetPos = pos;
            targetNode = node;
          }
        }
      });

      if (targetPos !== null && targetNode) {
        const tr = editor.state.tr.setNodeMarkup(targetPos, undefined, {
          ...targetNode.attrs,
          castRevisions: castRevisions && castRevisions.length > 0 ? castRevisions : null,
        });
        editor.view.dispatch(tr);
        markDirty(true);
      }
    };
    registerSetPanelStage(fn);
    return () => registerSetPanelStage(null);
  }, [editor, registerSetPanelStage, markDirty]);

  // Màn cha có thể truyền mảng mới mỗi lần render: chỉ nạp lại khi nội dung máy chủ thực sự đổi.
  const serverDocJson = useMemo(
    () => JSON.stringify(scriptToDoc(scenes, pages, panels)),
    [scenes, pages, panels],
  );

  const lastSyncRevisionRef = useRef(syncRevision);

  // Nạp lại từ máy chủ khi dữ liệu đổi (sau khi lưu, đổi chương, khôi phục hoặc duyệt AI) — giữ nguyên khi còn chữ chưa lưu trừ lúc buộc đồng bộ.
  useEffect(() => {
    if (!editor) return;
    const forced = syncRevision !== undefined && syncRevision !== lastSyncRevisionRef.current;
    if (forced) {
      lastSyncRevisionRef.current = syncRevision;
      markDirty(false);
    }
    if (dirtyRef.current) return;
    if (JSON.stringify(editor.getJSON()) === serverDocJson) return;
    const keepPos = editor.state.selection.from;
    // Cờ nạp bật suốt lúc thay nội dung và khôi phục con trỏ: các transaction này không phải Writer gõ hay di chuyển
    loadingRef.current = true;
    try {
      editor.commands.setContent(JSON.parse(serverDocJson), { emitUpdate: false });
      const max = editor.state.doc.content.size;
      try {
        editor.view.dispatch(
          editor.state.tr.setSelection(
            TextSelection.near(editor.state.doc.resolve(Math.min(keepPos, max))),
          ),
        );
      } catch {
        // Tài liệu mới ngắn hơn: giữ vị trí mặc định
      }
    } finally {
      loadingRef.current = false;
    }
  }, [editor, serverDocJson, syncRevision, markDirty]);

  const handleSave = useCallback(
    async (force = false): Promise<boolean> => {
      if (!editor || isReadOnly || (!force && !dirtyRef.current)) return true;
      if (savingRef.current || isSaving) return false;
      savingRef.current = true;
      setIsSaving(true);
      try {
        const snapshot = docToScript(editor.state.doc, scenes[0]?.id ?? '');
        const saved = await onSave(snapshot);
        if (saved === false) {
          markDirty(true);
          return false;
        }
        markDirty(false);
        return true;
      } catch (err: any) {
        markDirty(true);
        onShowToast?.(t('scriptStudio.gn.saveFailed'), err?.message ?? '');
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [editor, isReadOnly, isSaving, scenes, onSave, onShowToast, t, markDirty],
  );

  useEffect(() => {
    if (!registerSave) return;
    // Nút Lưu / Ctrl+S của view là thao tác lưu chủ động: luôn lưu như Ctrl+S trong editor
    registerSave(() => handleSave(true));
    return () => registerSave(null);
  }, [registerSave, handleSave]);

  useEffect(() => {
    if (!registerGetPayload || !editor) return;
    registerGetPayload(() => docToScriptTree(editor.state.doc));
    return () => registerGetPayload(null);
  }, [registerGetPayload, editor]);

  // Ctrl+S / Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSave(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  const insertQuickTemplate = useCallback(
    (kind: 'dialogue' | 'sfx' | 'action') => {
      if (!editor || isReadOnly) return;
      if (editor.state.selection.$from.parent.type.name !== GN_LINE) {
        editor.commands.focus('end');
      }
      const { state, view } = editor;
      const { $from } = state.selection;
      if ($from.parent.type.name !== GN_LINE) return;
      const after = $from.before() + $from.parent.nodeSize;
      const lineType = state.schema.nodes[GN_LINE];
      const nodes =
        kind === 'dialogue'
          ? [
              lineType.create({ el: 'character', refId: null }),
              lineType.create({ el: 'dialogue', refId: null }),
            ]
          : [lineType.create({ el: kind, refId: null })];
      const tr = state.tr.insert(after, nodes);
      tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView();
      view.dispatch(tr);
      editor.view.focus();
      setShowAiPopover(false);
    },
    [editor, isReadOnly],
  );

  const handleApplyImportedScript = useCallback(
    (nodes: JSONContent[], mode: 'append' | 'insert' | 'replace') => {
      if (!editor || isReadOnly) return;

      if (mode === 'replace') {
        editor.commands.setContent({ type: 'doc', content: nodes }, { emitUpdate: true });
        editor.commands.focus('start');
      } else if (mode === 'append') {
        const endPos = editor.state.doc.content.size;
        editor.commands.insertContentAt(endPos, nodes);
        editor.commands.focus('end');
      } else {
        editor.commands.insertContent(nodes);
      }

      onShowToast?.(
        t('writer.scriptEditor.importSuccessTitle', 'Đã nhập kịch bản'),
        t(
          'writer.scriptEditor.importSuccessDesc',
          'Đã chuyển đổi và chèn nội dung vào kịch bản thành công.',
        ),
      );
    },
    [editor, isReadOnly, onShowToast, t],
  );

  const effectiveRewriteLineId = cursorAnchor.rewriteLineId ?? firstSavedLineId;
  const targetSceneId = cursorAnchor.sceneId ?? selectedSceneId ?? scenes[0]?.id ?? null;
  const targetAfterLineId =
    cursorAnchor.sceneId && cursorAnchor.sceneId === targetSceneId
      ? cursorAnchor.afterLineId
      : null;
  const hasRealAi = Boolean(
    onRunNextLine || onOpenAiDraft || onOpenAiStoryboard || onOpenAiPromptModal,
  );

  // Cảnh báo khi rời trang còn chữ chưa lưu
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  return (
    <div className='relative flex-1 min-h-0 flex flex-col bg-[#FAF9F5]'>
      <style>{SHEET_CSS}</style>

      {/* Header thanh định dạng loại dòng (Trang, Panel, Hành động, Nhân vật, Thoại, ...) */}
      <div
        className='shrink-0 flex items-center justify-between border-b border-stone-200/90 bg-[#FAF9F5] px-4 py-2 overflow-x-auto custom-scrollbar select-none z-20 shadow-2xs'
        id='script-flow-editor-toolbar'
      >
        <div className='flex items-center gap-2 shrink-0'>
          {dockLeading}
          {dockLeading && <div className='h-4 w-px bg-stone-300 mx-1' />}
          <div
            role='toolbar'
            aria-label={t('scriptStudio.gn.toolbar')}
            className='flex items-center gap-1 shrink-0'
          >
            {GN_ELEMENTS.map((el, i) => {
              const isActive = active === el;
              return (
                <button
                  key={el}
                  type='button'
                  disabled={isReadOnly}
                  aria-pressed={isActive}
                  data-element={el}
                  title={`${t(`scriptStudio.gn.el.${el}`)} · Ctrl+${i + 1}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor && setLineElement(editor, el)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer disabled:cursor-default disabled:opacity-50 ${
                    isActive
                      ? 'border border-[#EA580C] bg-[#EA580C]/10 text-[#EA580C] shadow-2xs font-bold'
                      : 'text-stone-600 hover:bg-stone-200/60'
                  }`}
                >
                  {t(`scriptStudio.gn.el.${el}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {flowAiSlot && (
        <div className='shrink-0 border-b border-[#D4CBBF] bg-[#FAF8F5] px-4 py-3'>
          <div className='mx-auto max-w-[760px]'>{flowAiSlot}</div>
        </div>
      )}

      {/* Center Paper Sheet Surface: Nền bàn làm việc #F4EFE8/70, Trang giấy trắng tinh bg-white với viền & đổ bóng */}
      <main
        id='script-editor-content'
        className='flex-1 min-h-0 overflow-y-auto bg-[#F4EFE8]/70 px-4 sm:px-8 py-6 sm:py-8 flex flex-col items-center pb-32 custom-scrollbar'
        onClick={() => {
          if (editor && !editor.isFocused) editor.commands.focus();
        }}
      >
        <div
          data-testid='paper-editor-sheet'
          className='gn-sheet paper-editor-sheet w-full max-w-3xl shrink-0 bg-white rounded-lg shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-[#E8E3DA] px-6 sm:px-14 py-12 sm:py-16 my-2 sm:my-4 transition-all duration-150 min-h-[960px] cursor-text'
        >
          <div className='border-b border-stone-200/80 pb-3 mb-6 select-none w-full space-y-1.5'>
            <div className='flex flex-wrap items-center justify-between gap-2 font-sans'>
              <div className='flex flex-wrap items-center gap-2 min-w-0 text-xs text-stone-700'>
                {manuscriptTitle && (
                  <span className='font-serif font-semibold text-stone-900'>{manuscriptTitle}</span>
                )}
                {selectedSceneHeading && (
                  <>
                    {manuscriptTitle && <span className='text-stone-300'>·</span>}
                    <span className='text-stone-600 truncate'>{selectedSceneHeading}</span>
                  </>
                )}
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                {isDirty && (
                  <span className='px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium'>
                    {t('collaboration.writerStudio.unsavedBadge', 'Chưa lưu')}
                  </span>
                )}
              </div>
            </div>
            {!isReadOnly && (
              <p className='font-sans text-xs text-stone-500'>
                {t(
                  'scriptStudio.gn.keyboardHint',
                  'Enter: dòng kế tiếp · Tab: nhân vật / ( ) · Ctrl+1..8: đổi loại dòng · Ctrl+S: lưu',
                )}
              </p>
            )}
          </div>
          {diffPreview}
          <div className={diffPreview ? 'hidden' : undefined}>
            <EditorContent editor={editor} />
          </div>
          <BibleRefFloatingMenu
            editor={editor}
            allBibleEntries={allBibleEntries || []}
            canEditScript={!isReadOnly}
            t={t}
          />
        </div>
      </main>

      {/* Persistent script actions rail: stays outside the paper while the script scrolls */}
      {!isReadOnly && (
        <div
          className='fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 select-none'
          id='ai-script-assistant-wrapper'
        >
          <ScriptActionGooeyMenu
            label={t('writer.scriptEditor.scriptActions', 'Thao tác kịch bản')}
            openLabel={t('writer.scriptEditor.openScriptActions', 'Mở thao tác kịch bản')}
            closeLabel={t('writer.scriptEditor.closeScriptActions', 'Đóng thao tác kịch bản')}
            triggerTestId='script-actions-trigger'
            actions={[
              {
                id: 'save',
                label: isSaving
                  ? t('scriptStudio.gn.saving', 'Đang lưu...')
                  : t('scriptStudio.gn.saveTooltip', 'Lưu kịch bản (Ctrl+S)'),
                icon: isSaving ? (
                  <Loader2 className='animate-spin' aria-hidden='true' />
                ) : (
                  <Save aria-hidden='true' />
                ),
                disabled: isSaving,
                testId: 'flow-sheet-save-btn',
                color: 'var(--u460-save)',
                onSelect: () => void handleSave(true),
              },
              {
                id: 'import',
                label: t(
                  'writer.scriptEditor.importScriptTooltip',
                  'Nhập văn bản thô / kịch bản bên ngoài và tự parse',
                ),
                icon: <FileDown aria-hidden='true' />,
                testId: 'flow-sheet-import-btn',
                color: 'var(--u460-import)',
                onSelect: () => setShowImportModal(true),
              },
              {
                id: 'ai',
                label: hasRealAi
                  ? t('collaboration.writerStudio.templatesAndAi', 'Mẫu & AI')
                  : t('collaboration.writerStudio.quickTemplatesTitle', 'Mẫu nhanh'),
                icon: hasRealAi ? <Sparkles aria-hidden='true' /> : <FileText aria-hidden='true' />,
                testId: 'rail-ai-btn',
                color: 'var(--u460-ai)',
                onSelect: () => setShowAiPopover(true),
              },
            ]}
          />

          {showAiPopover && (
            <div
              id='ai-script-suggestions-popover'
              className='absolute bottom-20 right-20 w-80 overflow-hidden rounded-xl border border-stone-200/90 bg-[#FFFDF9] font-sans shadow-xl'
            >
              <div className='px-4 py-3 bg-[#FBF9F4] border-b border-stone-200/80 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  {hasRealAi ? (
                    <Sparkles className='w-4 h-4 text-violet-600' />
                  ) : (
                    <FileText className='w-4 h-4 text-stone-700' />
                  )}
                  <span className='font-headline-sm text-xs font-bold text-stone-900'>
                    {hasRealAi
                      ? t('collaboration.writerStudio.templatesAndAi', 'Mẫu & AI')
                      : t('collaboration.writerStudio.quickTemplatesTitle', 'Mẫu nhanh')}
                  </span>
                </div>
                <button
                  type='button'
                  className='p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer'
                  onClick={() => setShowAiPopover(false)}
                  title={t('common.actions.close')}
                >
                  <X className='w-4 h-4' />
                </button>
              </div>

              <div className='p-3 space-y-3 text-xs'>
                <div className='space-y-1.5'>
                  <div className='flex items-center justify-between px-0.5'>
                    <span className='text-xs font-bold uppercase tracking-wider text-stone-500'>
                      {t('collaboration.writerStudio.quickTemplatesTitle', 'Mẫu nhanh')}
                    </span>
                    <span className='text-xs text-stone-400'>
                      {t(
                        'collaboration.writerStudio.quickTemplatesHint',
                        'Chèn khung định dạng trống vào kịch bản',
                      )}
                    </span>
                  </div>
                  <div className='grid grid-cols-3 gap-1.5'>
                    <button
                      type='button'
                      data-testid='quick-template-dialogue'
                      onClick={() => insertQuickTemplate('dialogue')}
                      title={t(
                        'collaboration.writerStudio.templateDialogueDesc',
                        'Dòng Nhân vật + Thoại trống',
                      )}
                      className='flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200/90 bg-white hover:border-stone-400 hover:bg-stone-50 text-stone-800 font-semibold transition-colors cursor-pointer'
                    >
                      <MessageSquare className='w-3.5 h-3.5 text-stone-600' />
                      <span>{t('collaboration.writerStudio.templateDialogue', 'Thoại')}</span>
                    </button>
                    <button
                      type='button'
                      data-testid='quick-template-sfx'
                      onClick={() => insertQuickTemplate('sfx')}
                      title={t(
                        'collaboration.writerStudio.templateSfxDesc',
                        'Dòng hiệu ứng âm thanh trống',
                      )}
                      className='flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200/90 bg-white hover:border-stone-400 hover:bg-stone-50 text-stone-800 font-semibold transition-colors cursor-pointer'
                    >
                      <Zap className='w-3.5 h-3.5 text-amber-600' />
                      <span>{t('collaboration.writerStudio.templateSfx', 'SFX')}</span>
                    </button>
                    <button
                      type='button'
                      data-testid='quick-template-action'
                      onClick={() => insertQuickTemplate('action')}
                      title={t(
                        'collaboration.writerStudio.templateActionDesc',
                        'Dòng mô tả hành động trống',
                      )}
                      className='flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-stone-200/90 bg-white hover:border-stone-400 hover:bg-stone-50 text-stone-800 font-semibold transition-colors cursor-pointer'
                    >
                      <Clapperboard className='w-3.5 h-3.5 text-emerald-600' />
                      <span>{t('collaboration.writerStudio.templateAction', 'Hành động')}</span>
                    </button>
                  </div>

                  <button
                    type='button'
                    data-testid='quick-import-plain-text'
                    onClick={() => {
                      setShowAiPopover(false);
                      setShowImportModal(true);
                    }}
                    className='w-full flex items-center justify-between p-2 rounded-lg border border-stone-200/90 bg-white hover:border-orange-300 hover:bg-orange-50/50 text-stone-800 font-semibold transition-colors cursor-pointer mt-1'
                  >
                    <div className='flex items-center gap-2'>
                      <FileDown className='w-4 h-4 text-orange-600' />
                      <div className='text-left'>
                        <div className='text-xs font-bold'>
                          {t('writer.scriptEditor.importScriptBtn', 'Nhập văn bản thô')}
                        </div>
                        <div className='text-xs text-stone-500 font-normal'>
                          {t(
                            'writer.scriptEditor.importScriptSub',
                            'Tự parse văn xuôi thành kịch bản',
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400' />
                  </button>
                </div>

                {onRewriteLineId && effectiveRewriteLineId && (
                  <div className='border-t border-stone-200/70 pt-2'>
                    <button
                      type='button'
                      data-testid={`ai-rewrite-line-${effectiveRewriteLineId}`}
                      onClick={() => {
                        setShowAiPopover(false);
                        onRewriteLineId(effectiveRewriteLineId);
                      }}
                      disabled={rewritingLineId === effectiveRewriteLineId}
                      className='flex w-full items-center justify-between rounded-lg border border-violet-200 bg-violet-50/80 p-2.5 text-left text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100 disabled:opacity-60'
                    >
                      <span className='flex items-center gap-2'>
                        {rewritingLineId === effectiveRewriteLineId ? (
                          <Loader2 className='size-4 animate-spin' aria-hidden='true' />
                        ) : (
                          <Sparkles className='size-4' aria-hidden='true' />
                        )}
                        {t('collaboration.writerStudio.rewriteLineAiBtn', 'Viết lại bằng AI')}
                      </span>
                      <ArrowRight className='size-3.5' aria-hidden='true' />
                    </button>
                  </div>
                )}

                {onRunNextLine && targetSceneId && (
                  <div className='space-y-1.5 pt-2 border-t border-stone-200/70'>
                    <div className='text-xs font-bold uppercase tracking-wider text-violet-700 px-0.5 flex items-center gap-1'>
                      <Sparkles className='w-3 h-3' />
                      <span>
                        {t(
                          'collaboration.writerStudio.aiNextLineSection',
                          'Gợi ý dòng tiếp theo (AI)',
                        )}
                      </span>
                    </div>

                    {(
                      [
                        {
                          kind: 'Dialogue' as NextLineKind,
                          icon: <MessageSquare className='w-3.5 h-3.5 text-violet-600' />,
                          label: t(
                            'collaboration.writerStudio.aiNextDialogue',
                            'Dòng Thoại tiếp theo',
                          ),
                          desc: t(
                            'collaboration.writerStudio.aiNextDialogueDesc',
                            'AI đề xuất 1 câu thoại mới (chờ Nhận/Bỏ)',
                          ),
                        },
                        {
                          kind: 'Sfx' as NextLineKind,
                          icon: <Zap className='w-3.5 h-3.5 text-amber-600' />,
                          label: t('collaboration.writerStudio.aiNextSfx', 'SFX tiếp theo'),
                          desc: t(
                            'collaboration.writerStudio.aiNextSfxDesc',
                            'AI đề xuất âm thanh ≤ 40 ký tự (chờ Nhận/Bỏ)',
                          ),
                        },
                        {
                          kind: 'Action' as NextLineKind,
                          icon: <Clapperboard className='w-3.5 h-3.5 text-emerald-600' />,
                          label: t(
                            'collaboration.writerStudio.aiNextAction',
                            'Hành động tiếp theo',
                          ),
                          desc: t(
                            'collaboration.writerStudio.aiNextActionDesc',
                            'AI đề xuất mô tả hành động kế tiếp (chờ Nhận/Bỏ)',
                          ),
                        },
                      ] as const
                    ).map((item) => {
                      const busy = runningNextLineKind === item.kind;
                      return (
                        <button
                          key={item.kind}
                          type='button'
                          data-testid={`ai-next-line-${item.kind}`}
                          disabled={Boolean(runningNextLineKind)}
                          onClick={() => {
                            setShowAiPopover(false);
                            onRunNextLine({
                              sceneId: targetSceneId,
                              kind: item.kind,
                              afterLineId: targetAfterLineId,
                            });
                          }}
                          className='w-full text-left p-2.5 rounded-lg border border-stone-200/80 bg-white hover:border-violet-500 hover:bg-violet-50/40 disabled:opacity-60 cursor-pointer transition-colors shadow-2xs group'
                        >
                          <div className='flex items-center justify-between mb-0.5'>
                            <span className='font-semibold text-stone-900 group-hover:text-violet-700 flex items-center gap-1.5'>
                              {busy ? (
                                <Loader2 className='w-3.5 h-3.5 animate-spin text-violet-600' />
                              ) : (
                                item.icon
                              )}
                              {item.label}
                            </span>
                            <ArrowRight className='w-3.5 h-3.5 text-stone-400 group-hover:text-violet-600' />
                          </div>
                          <p className='text-xs text-stone-500 line-clamp-1'>{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {(onOpenAiDraft || onOpenAiStoryboard) && (
                  <div className='pt-2 border-t border-stone-200/70 flex items-center justify-between gap-1'>
                    {onOpenAiDraft && (
                      <button
                        type='button'
                        data-testid='open-ai-draft-btn'
                        onClick={() => {
                          setShowAiPopover(false);
                          onOpenAiDraft();
                        }}
                        className='flex-1 text-left px-2 py-1.5 rounded text-xs font-semibold text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer'
                      >
                        {t('collaboration.writerStudio.aiDraftBtn')}
                      </button>
                    )}
                    {onOpenAiStoryboard && (
                      <button
                        type='button'
                        data-testid='open-ai-storyboard-btn'
                        onClick={() => {
                          setShowAiPopover(false);
                          onOpenAiStoryboard();
                        }}
                        className='flex-1 text-left px-2 py-1.5 rounded text-xs font-semibold text-stone-700 hover:bg-violet-50 hover:text-violet-700 transition-colors cursor-pointer'
                      >
                        {t('collaboration.writerStudio.aiStoryboardBtn')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className='p-2.5 bg-[#FAF9F5] border-t border-stone-200/80 flex items-center justify-between text-xs'>
                <span className='text-stone-500 flex items-center gap-1'>
                  <FileText className='w-3 h-3 text-stone-400' />
                  {t(
                    'collaboration.writerStudio.clickToInsert',
                    'Chọn mẫu trống hoặc gọi AI đề xuất',
                  )}
                </span>
                {onOpenAiPromptModal && (
                  <button
                    type='button'
                    className='text-violet-700 hover:underline font-semibold cursor-pointer'
                    onClick={() => {
                      setShowAiPopover(false);
                      onOpenAiPromptModal();
                    }}
                  >
                    AI Prompt →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {menu && editor && (
        <ul
          role='listbox'
          aria-label={t('scriptStudio.gn.toolbar')}
          style={{ top: menu.top, left: menu.left }}
          className='fixed z-50 w-48 rounded-lg border border-stone-200 bg-white py-1 shadow-lg text-sm'
        >
          {GN_ELEMENTS.map((el, i) => (
            <li
              key={el}
              role='option'
              aria-selected={i === menu.index}
              onMouseDown={(e) => {
                e.preventDefault();
                chooseElement(editor, el);
              }}
              className={`flex items-center justify-between px-3 py-1.5 cursor-pointer ${
                i === menu.index ? 'bg-orange-50 text-primary' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{t(`scriptStudio.gn.el.${el}`)}</span>
              <span className='text-xs text-stone-400 font-mono'>Ctrl+{i + 1}</span>
            </li>
          ))}
        </ul>
      )}

      {showImportModal && (
        <ScriptImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onApplyScript={handleApplyImportedScript}
          initialStartingPageNumber={pages.length > 0 ? pages.length + 1 : 1}
          characters={allBibleEntries
            ?.filter((e) => e.category === 'Character')
            .map((c) => ({
              id: c.id,
              name: c.name,
              code: c.code,
            }))}
          seriesBibleContext={{
            characters: allBibleEntries
              ?.filter((e) => e.category === 'Character')
              .map((c) => ({
                name: c.name,
              })),
            locations: allBibleEntries?.filter((e) => e.category === 'Location').map((l) => l.name),
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
