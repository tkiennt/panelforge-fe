// src/roles/writer/components/script/flow/ScreenplayFlowEditor.tsx
/**
 * Bàn viết kịch bản Graphic Novel kiểu WriterSolo.
 * Gõ liền mạch bằng bàn phím: Enter / Tab / Shift+Tab theo `grammar/scriptGrammar.ts`, Ctrl+1..8 đổi loại dòng,
 * Ctrl+S lưu. Kịch bản là chữ thuần, không liên kết Series Bible.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Extension } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  History,
  Loader2,
  MessageSquare,
  PanelLeft,
  Save,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SceneDetailDto } from '@/services/scriptLine.service';
import { PageDto } from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';
import { ScriptCommentDto } from '@/services/chapter.service';
import { BibleEntryDto } from '@/services/bible.service';
import { GN_ELEMENTS, GnElement } from './grammar/scriptGrammar';
import {
  BibleRefMark,
  BibleSpeakerRef,
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
  font-size: 14px; line-height: 1.75rem; color: #18181B; caret-color: #EA580C; min-height: 900px; }
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
.gn-sheet .gn-character { float: left; clear: both; width: 10rem; margin-top: .5rem; text-transform: uppercase; font-weight: 700; color: #18181B; }
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
  registerSetPanelStage,
}) => {
  const { t } = useTranslation('production');
  const isReadOnly = !canEditScript || isChapterLocked || Boolean(diffPreview);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [active, setActive] = useState<GnElement | null>(null);
  const [activeDialogueLineId, setActiveDialogueLineId] = useState<string | null>(null);
  const [showAiPopover, setShowAiPopover] = useState(false);
  /** Menu chọn loại dòng (Enter trên dòng trống): vị trí neo theo con trỏ + mục đang chọn. */
  const [menu, setMenu] = useState<{ index: number; top: number; left: number } | null>(null);
  const dirtyRef = useRef(false);
  const loadingRef = useRef(false);
  const savingRef = useRef(false);

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
        ScriptTypingBehavior.configure({ labels, bibleSpeakers }),
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
      onUpdate: ({ transaction }) => {
        if (transaction.docChanged && !loadingRef.current) markDirty(true);
      },
      onSelectionUpdate: ({ editor: ed }) => {
        setActive(activeElement(ed));
        const parent = ed.state.selection.$from.parent;
        const refId = parent.attrs?.refId ? String(parent.attrs.refId) : '';
        setActiveDialogueLineId(
          parent.attrs?.el === 'dialogue' &&
            Boolean(parent.textContent.trim()) &&
            Boolean(refId) &&
            !refId.startsWith('wc-')
            ? refId
            : null,
        );
      },
      onTransaction: ({ editor: ed }) => {
        setActive(activeElement(ed));
        const parent = ed.state.selection.$from.parent;
        const refId = parent.attrs?.refId ? String(parent.attrs.refId) : '';
        setActiveDialogueLineId(
          parent.attrs?.el === 'dialogue' &&
            Boolean(parent.textContent.trim()) &&
            Boolean(refId) &&
            !refId.startsWith('wc-')
            ? refId
            : null,
        );
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
    loadingRef.current = true;
    editor.commands.setContent(JSON.parse(serverDocJson), { emitUpdate: false });
    loadingRef.current = false;
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
  }, [editor, serverDocJson, syncRevision, markDirty]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!editor || isReadOnly || !dirtyRef.current) return true;
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
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch (err: any) {
      markDirty(true);
      onShowToast?.(t('scriptStudio.gn.saveFailed'), err?.message ?? '');
      return false;
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [editor, isReadOnly, isSaving, scenes, onSave, onShowToast, t, markDirty]);

  useEffect(() => {
    if (!registerSave) return;
    registerSave(handleSave);
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
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSave]);

  // Cảnh báo khi rời trang còn chữ chưa lưu
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const saveStatus = isSaving
    ? t('scriptStudio.dock.saving')
    : isDirty
      ? t('scriptStudio.dock.unsaved')
      : lastSavedTime
        ? t('scriptStudio.dock.saved', { time: lastSavedTime })
        : t('scriptStudio.dock.idle');

  return (
    <div className='relative flex-1 min-h-0 flex flex-col bg-[#FAF9F5]'>
      <style>{SHEET_CSS}</style>

      {/* Toolbar row: Chuẩn Stitch Writer Studio (Phân cảnh toggle + Line Types + Right Drawer Pills + Ctrl+S + Lưu) */}
      <div className='w-full bg-[#FBF9F4] border-b border-[#E8E3DA] px-4 py-2 flex items-center justify-between text-[13px] select-none shrink-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'>
        {/* Left: Phân cảnh toggle chip + dockLeading */}
        <div className='flex items-center gap-2 shrink-0'>
          {dockLeading}
          {onToggleSceneOutline && (
            <button
              id='btn-toggle-scene-drawer'
              data-testid='rail-scenes-btn'
              type='button'
              onClick={onToggleSceneOutline}
              title={t('collaboration.writerStudio.sceneOutline', 'Phân cảnh')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors shadow-2xs mr-1 cursor-pointer text-xs font-semibold ${
                isSceneOutlineOpen
                  ? 'border-primary/40 bg-orange-50 text-primary'
                  : 'border-stone-200/80 hover:border-primary/40 bg-white text-stone-900'
              }`}
            >
              <Clapperboard className='w-4 h-4 text-primary' />
              <span>{t('collaboration.writerStudio.sceneOutline', 'Phân cảnh')}</span>
              {sceneCount !== undefined && (
                <span className='px-1.5 py-0.2 rounded-full text-xs font-bold bg-primary/10 text-primary font-mono'>
                  {sceneCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Center: Segmented line-type tabs */}
        <div className='flex-1 flex items-center justify-center'>
          <div
            role='toolbar'
            aria-label={t('scriptStudio.gn.toolbar')}
            className='flex items-center justify-center gap-1 bg-[#FAF9F5]/70 p-0.5 rounded-lg border border-stone-200/80 shadow-2xs'
          >
            {GN_ELEMENTS.map((el, i) => {
              const isActive = active === el;
              return (
                <button
                  key={el}
                  type='button'
                  disabled={isReadOnly}
                  aria-pressed={isActive}
                  title={`${t(`scriptStudio.gn.el.${el}`)} · Ctrl+${i + 1}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => editor && setLineElement(editor, el)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50 whitespace-nowrap ${
                    isActive
                      ? 'border border-primary bg-primary/10 text-primary font-semibold shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-200/60 text-stone-700'
                  }`}
                >
                  {t(`scriptStudio.gn.el.${el}`)}
                </button>
              );
            })}
          </div>

          {!isReadOnly && activeDialogueLineId && onRewriteLineId && (
            <button
              type='button'
              data-testid={`ai-rewrite-line-${activeDialogueLineId}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onRewriteLineId(activeDialogueLineId)}
              disabled={rewritingLineId === activeDialogueLineId}
              className='ml-2 shrink-0 inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 cursor-pointer disabled:opacity-50'
            >
              {rewritingLineId === activeDialogueLineId ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Sparkles className='w-3.5 h-3.5' />
              )}
              Viết lại bằng AI
            </button>
          )}
        </div>

        {/* Right: Drawer tabs + Ctrl+S hint + Save */}
        <div className='flex items-center gap-2 shrink-0 text-stone-600 text-xs'>
          <div
            className='flex items-center gap-1 bg-[#FAF9F5] p-0.5 rounded-lg border border-stone-200/80 shadow-2xs mr-1 select-none'
            id='toolbar-drawer-tabs'
          >
            {onToggleRightDrawer && (
              <>
                <button
                  type='button'
                  id='right-tab-btn-bible'
                  data-testid='rail-characters-btn'
                  onClick={() => onToggleRightDrawer('characters')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activeRightDrawer === 'characters'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-200/60 font-medium'
                  }`}
                >
                  <BookOpen className='w-3.5 h-3.5' />
                  <span>Series Bible</span>
                </button>

                <button
                  type='button'
                  id='right-tab-btn-feedback'
                  data-testid='rail-comments-btn'
                  onClick={() => onToggleRightDrawer('comments')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeRightDrawer === 'comments'
                      ? 'bg-primary text-white shadow-2xs font-semibold'
                      : 'text-stone-600 hover:bg-stone-200/60'
                  }`}
                >
                  <MessageSquare className='w-3.5 h-3.5' />
                  <span>Góp ý ({comments ? comments.filter((c) => !c.resolvedAt).length : 0})</span>
                </button>

                <button
                  type='button'
                  id='right-tab-btn-history'
                  data-testid='open-script-history-btn'
                  onClick={() => onToggleRightDrawer('versions')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    activeRightDrawer === 'versions'
                      ? 'bg-primary text-white shadow-2xs font-semibold'
                      : 'text-stone-600 hover:bg-stone-200/60'
                  }`}
                >
                  <History className='w-3.5 h-3.5' />
                  <span>Version</span>
                </button>

                {openFindingsCount !== undefined && (
                  <button
                    type='button'
                    data-testid='rail-consistency-btn'
                    onClick={() => onToggleRightDrawer('consistency')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      activeRightDrawer === 'consistency'
                        ? 'bg-primary text-white shadow-2xs font-semibold'
                        : 'text-stone-600 hover:bg-stone-200/60'
                    }`}
                    title='Kiểm tra nhất quán'
                  >
                    <ShieldCheck className='w-3.5 h-3.5' />
                    {openFindingsCount > 0 && (
                      <span className='px-1 py-0.2 rounded-full text-xs font-bold bg-amber-500 text-white font-mono'>
                        {openFindingsCount}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          <div className='h-4 w-px bg-stone-300 mx-1' />

          <span className='font-mono text-stone-400 text-xs hidden sm:inline'>Ctrl+S</span>

          {!isReadOnly && (
            <button
              type='button'
              id='btn-save'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void handleSave()}
              disabled={!isDirty || isSaving}
              title='Ctrl + S'
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default ${
                isDirty
                  ? 'bg-primary text-white hover:bg-secondary shadow-xs'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {isSaving ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Save className='w-3.5 h-3.5' />
              )}
              <span>{t('scriptStudio.gn.save', 'Lưu')}</span>
            </button>
          )}
        </div>
      </div>

      {flowAiSlot && (
        <div className='shrink-0 border-b border-[#D4CBBF] bg-[#FAF8F5] px-4 py-3'>
          <div className='mx-auto max-w-[760px]'>{flowAiSlot}</div>
        </div>
      )}

      {/* Center Paper Sheet */}
      <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#F4EFE8]/70 px-4 sm:px-8 py-6 sm:py-8 flex flex-col items-center pb-32'>
        <div
          data-testid='paper-editor-sheet'
          className='gn-sheet paper-editor-sheet w-full max-w-3xl shrink-0 bg-white rounded-lg shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-[#E8E3DA] px-6 sm:px-14 py-12 sm:py-16 my-2 sm:my-4 transition-all duration-150 min-h-[960px] cursor-text'
          onClick={() => {
            if (editor && !editor.isFocused) editor.commands.focus();
          }}
        >
          {manuscriptTitle && (
            <header className='text-center mb-10 select-none'>
              <h1 className='font-serif text-2xl font-medium tracking-tight text-stone-900 mb-2'>
                {manuscriptTitle}
              </h1>
              {!isReadOnly && (
                <p className='font-sans text-xs text-stone-500'>
                  Enter: dòng kế tiếp · Tab: nhân vật / ( ) · Shift+Tab: lùi loại dòng · Ctrl+1..8:
                  đổi loại dòng · Ctrl+S: lưu
                </p>
              )}
            </header>
          )}
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
      </div>

      {/* AI script assistant floating button & popover */}
      {!isReadOnly && (
        <div
          className='fixed bottom-6 right-20 sm:right-88 z-40 flex flex-col items-end select-none'
          id='ai-script-assistant-wrapper'
        >
          {showAiPopover && (
            <div
              id='ai-script-suggestions-popover'
              className='mb-3 w-80 bg-[#FFFDF9] rounded-xl border border-stone-200/90 shadow-xl overflow-hidden font-sans transition-all duration-300'
            >
              <div className='px-4 py-3 bg-[#FBF9F4] border-b border-stone-200/80 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Sparkles className='w-4 h-4 text-violet-600' />
                  <span className='font-headline-sm text-xs font-bold text-stone-900'>
                    {t('collaboration.writerStudio.aiAssistantTitle', 'Trợ lý Kịch bản AI')}
                  </span>
                  <span className='px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-violet-50 text-violet-700 border border-violet-200'>
                    {t('collaboration.writerStudio.beta', 'Beta')}
                  </span>
                </div>
                <button
                  type='button'
                  className='p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer'
                  onClick={() => setShowAiPopover(false)}
                  title='Đóng'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>

              <div className='p-3 space-y-2 text-xs'>
                <div className='text-xs font-bold uppercase tracking-wider text-stone-400 px-1'>
                  {t('collaboration.writerStudio.quickSuggestions', 'GỢI Ý NHANH THEO NGỮ CẢNH')}
                </div>

                <div
                  className='p-2.5 rounded-lg border border-stone-200/80 bg-white hover:border-violet-500 hover:bg-violet-50/40 cursor-pointer transition-colors shadow-2xs group'
                  onClick={() => {
                    if (editor) {
                      editor.commands.insertContent(
                        '<p class="gn-dialogue">"Cổng đã đồng bộ 90%. Cho dù ngươi có gọi cả sư đoàn tới cũng quá muộn."</p>',
                      );
                      setShowAiPopover(false);
                    }
                  }}
                >
                  <div className='flex items-center justify-between mb-1'>
                    <span className='font-semibold text-stone-900 group-hover:text-violet-700 flex items-center gap-1.5'>
                      <MessageSquare className='w-3.5 h-3.5 text-violet-600' />
                      {t('collaboration.writerStudio.nextDialogue', 'Thoại đối kháng kế tiếp')}
                    </span>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400 group-hover:text-violet-600' />
                  </div>
                  <p className='text-xs text-stone-500 line-clamp-2'>
                    Kael: "Cổng đã đồng bộ 90%. Cho dù ngươi có gọi cả sư đoàn tới cũng quá muộn."
                  </p>
                </div>

                <div
                  className='p-2.5 rounded-lg border border-stone-200/80 bg-white hover:border-violet-500 hover:bg-violet-50/40 cursor-pointer transition-colors shadow-2xs group'
                  onClick={() => {
                    if (editor) {
                      editor.commands.insertContent('<p class="gn-sfx">SHAKIIIIN!!</p>');
                      setShowAiPopover(false);
                    }
                  }}
                >
                  <div className='flex items-center justify-between mb-1'>
                    <span className='font-semibold text-stone-900 group-hover:text-violet-700 flex items-center gap-1.5'>
                      <Zap className='w-3.5 h-3.5 text-amber-600' />
                      {t('collaboration.writerStudio.climaxSfx', 'SFX cao trào cho Panel')}
                    </span>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400 group-hover:text-violet-600' />
                  </div>
                  <p className='text-xs text-stone-500 line-clamp-2'>
                    SHAKIIIIN!! Âm thanh chấn động không gian làm vỡ vụn các mảnh kính neon.
                  </p>
                </div>

                <div
                  className='p-2.5 rounded-lg border border-stone-200/80 bg-white hover:border-violet-500 hover:bg-violet-50/40 cursor-pointer transition-colors shadow-2xs group'
                  onClick={() => {
                    if (editor) {
                      editor.commands.insertContent(
                        '<p class="gn-action">Akira đạp mạnh lên biển hiệu vỡ, phóng vút người về phía lõi năng lượng với tốc độ mắt thường không bắt kịp.</p>',
                      );
                      setShowAiPopover(false);
                    }
                  }}
                >
                  <div className='flex items-center justify-between mb-1'>
                    <span className='font-semibold text-stone-900 group-hover:text-violet-700 flex items-center gap-1.5'>
                      <Sparkles className='w-3.5 h-3.5 text-emerald-600' />
                      {t('collaboration.writerStudio.reflexAction', 'Hành động phản xạ nhân vật')}
                    </span>
                    <ArrowRight className='w-3.5 h-3.5 text-stone-400 group-hover:text-violet-600' />
                  </div>
                  <p className='text-xs text-stone-500 line-clamp-2'>
                    Akira đạp mạnh lên biển hiệu vỡ, phóng vút người về phía lõi năng lượng với tốc
                    độ mắt thường không bắt kịp.
                  </p>
                </div>
                {(onOpenAiDraft || onOpenAiStoryboard) && (
                  <div className='p-2 bg-stone-50/80 border-t border-stone-200/60 flex items-center justify-between gap-1'>
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
                        Viết nháp kịch bản
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
                        Phân khung bằng AI
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className='p-2.5 bg-[#FAF9F5] border-t border-stone-200/80 flex items-center justify-between text-xs'>
                <span className='text-stone-500 flex items-center gap-1'>
                  <Zap className='w-3 h-3 text-stone-400' />
                  {t('collaboration.writerStudio.clickToInsert', 'Nhấn để chèn vào kịch bản')}
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

          <button
            type='button'
            id='btn-ai-script-assistant'
            data-testid='rail-ai-btn'
            onClick={() => setShowAiPopover(!showAiPopover)}
            className='flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs shadow-lg hover:shadow-xl transition-all duration-300 border border-white/20 hover:scale-105 active:scale-95 cursor-pointer'
          >
            <Sparkles className='w-4 h-4 animate-pulse' />
            <span>{t('collaboration.writerStudio.scriptSuggestions', 'Gợi ý kịch bản')}</span>
            <span className='px-1.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-mono font-bold'>
              AI
            </span>
          </button>
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
    </div>
  );
};
