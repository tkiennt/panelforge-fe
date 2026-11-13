// src/roles/writer/components/script/flow/ScreenplayFlowEditor.tsx
/**
 * Bàn viết kịch bản Graphic Novel kiểu WriterSolo.
 * Gõ liền mạch bằng bàn phím: Enter / Tab / Shift+Tab theo `grammar/scriptGrammar.ts`, Ctrl+1..8 đổi loại dòng,
 * Ctrl+S lưu. Kịch bản là chữ thuần, không liên kết Series Bible.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextSelection } from '@tiptap/pm/state';
import { Loader2, Save } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { SceneDetailDto } from '@/services/scriptLine.service';
import { PageDto } from '@/services/page.service';
import { PanelDto } from '@/types/pipeline';
import { GN_ELEMENTS, GnElement } from './grammar/scriptGrammar';
import {
  ScriptDocument,
  ScriptLineBlockNode,
  ScriptTypingBehavior,
  activeElement,
  setLineElement,
} from './nodes/ScriptLineBlockNode';
import { ScriptDocSnapshot, docToScript, scriptToDoc } from './scriptFlowAdapter';

export interface ScreenplayFlowEditorProps {
  chapterId?: string;
  scenes: SceneDetailDto[];
  pages: PageDto[];
  panels: PanelDto[];
  canEditScript: boolean;
  isChapterLocked: boolean;
  onSave: (snapshot: ScriptDocSnapshot) => Promise<void>;
  onShowToast?: (title: string, description?: string) => void;
  /** Nút chuyển chế độ xem của màn cha, đặt ở đầu thanh công cụ. */
  dockLeading?: React.ReactNode;
  manuscriptTitle?: string;
}

const SHEET_CSS = `
.gn-sheet .ProseMirror { outline: none; font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 15px; line-height: 1.75rem; color: #1c1917; caret-color: #c2410c; }
.gn-sheet .gn-line { clear: both; min-height: 1.75rem; white-space: pre-wrap; word-break: break-word; }
.gn-sheet .gn-page { margin-top: 3rem; padding-top: .75rem; border-top: 1px solid #e7e5e4;
  font-weight: 700; font-size: 17px; letter-spacing: .04em; }
.gn-sheet .gn-page:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.gn-sheet .gn-page::before { content: attr(data-label); }
.gn-sheet .gn-panel { margin-top: 1.25rem; font-weight: 700; text-transform: uppercase; }
.gn-sheet .gn-panel::before { content: attr(data-label) "\\00a0\\00a0"; }
.gn-sheet .gn-action { margin-top: .5rem; }
.gn-sheet .gn-character { float: left; clear: both; width: 10rem; margin-top: .5rem; text-transform: uppercase; }
.gn-sheet .gn-dialogue { clear: none; margin-left: 11rem; }
.gn-sheet .gn-parens { clear: none; margin-left: 14rem; text-transform: uppercase; }
.gn-sheet .gn-parens::before { content: '('; }
.gn-sheet .gn-parens::after { content: ')'; }
.gn-sheet .gn-character + .gn-dialogue, .gn-sheet .gn-character + .gn-parens { margin-top: .5rem; }
.gn-sheet .gn-caption, .gn-sheet .gn-sfx { display: grid; grid-template-columns: 11rem 1fr; margin-top: .5rem; }
.gn-sheet .gn-caption::before, .gn-sheet .gn-sfx::before { content: attr(data-label); grid-column: 1; }
.gn-sheet .gn-sfx { font-weight: 700; }
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
  dockLeading,
  manuscriptTitle,
}) => {
  const { t } = useTranslation();
  const isReadOnly = !canEditScript || isChapterLocked;
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [active, setActive] = useState<GnElement | null>(null);
  const dirtyRef = useRef(false);
  const loadingRef = useRef(false);

  const labels = useMemo(
    () => ({
      page: (n: number, k: number) => t('scriptStudio.gn.page', { n, k }),
      panel: (n: number) => t('scriptStudio.gn.panel', { n }),
      caption: t('scriptStudio.gn.caption'),
      sfx: t('scriptStudio.gn.sfx'),
      acceptHint: t('scriptStudio.gn.accept'),
    }),
    [t],
  );

  const markDirty = (value: boolean) => {
    dirtyRef.current = value;
    setIsDirty(value);
  };

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
        ScriptLineBlockNode,
        ScriptTypingBehavior.configure({ labels }),
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
      onSelectionUpdate: ({ editor: ed }) => setActive(activeElement(ed)),
      onTransaction: ({ editor: ed }) => setActive(activeElement(ed)),
    },
    [chapterId],
  );

  useEffect(() => {
    editor?.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  // Màn cha có thể truyền mảng mới mỗi lần render: chỉ nạp lại khi nội dung máy chủ thực sự đổi.
  const serverDocJson = useMemo(
    () => JSON.stringify(scriptToDoc(scenes, pages, panels)),
    [scenes, pages, panels],
  );

  // Nạp lại từ máy chủ khi dữ liệu đổi (sau khi lưu hoặc đổi chương) — chỉ khi không có chữ chưa lưu.
  useEffect(() => {
    if (!editor || dirtyRef.current) return;
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
  }, [editor, serverDocJson]);

  const handleSave = useCallback(async () => {
    if (!editor || isReadOnly || isSaving || !dirtyRef.current) return;
    setIsSaving(true);
    try {
      const snapshot = docToScript(editor.state.doc, scenes[0]?.id ?? '');
      markDirty(false);
      await onSave(snapshot);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      markDirty(true);
      onShowToast?.(t('scriptStudio.gn.saveFailed'), err?.message ?? '');
    } finally {
      setIsSaving(false);
    }
  }, [editor, isReadOnly, isSaving, scenes, onSave, onShowToast, t]);

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

      {/* Thanh loại dòng: bấm không làm mất con trỏ trong trang */}
      <div className='shrink-0 flex items-center gap-2 border-b border-stone-200 bg-white/95 px-3 py-1.5 overflow-x-auto custom-scrollbar'>
        {dockLeading}
        {dockLeading && <span className='w-px h-6 bg-stone-200 shrink-0' aria-hidden='true' />}
        <div
          role='toolbar'
          aria-label={t('scriptStudio.gn.toolbar')}
          className='flex items-center gap-0.5'
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
                className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50 ${
                  isActive ? 'bg-orange-50 text-[#C2410C]' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {t(`scriptStudio.gn.el.${el}`)}
              </button>
            );
          })}
        </div>
        <span
          className='ml-auto shrink-0 text-xs text-stone-500 whitespace-nowrap'
          aria-live='polite'
        >
          {saveStatus}
        </span>
        {!isReadOnly && (
          <button
            type='button'
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void handleSave()}
            disabled={!isDirty || isSaving}
            title='Ctrl + S'
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default ${
              isDirty ? 'bg-[#EA580C] text-white hover:bg-[#C2410C]' : 'text-stone-500'
            }`}
          >
            {isSaving ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <Save className='w-3.5 h-3.5' />
            )}
            {t('scriptStudio.gn.save')}
          </button>
        )}
      </div>

      <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-10'>
        <div
          className='gn-sheet max-w-[760px] mx-auto bg-white rounded-sm border border-stone-200/80 shadow-xs px-6 sm:px-16 lg:px-20 py-14'
          onClick={() => {
            if (editor && !editor.isFocused) editor.commands.focus();
          }}
        >
          {manuscriptTitle && (
            <header className='text-center mb-12 select-none'>
              <h2 className='font-serif text-3xl text-stone-900'>{manuscriptTitle}</h2>
              {!isReadOnly && (
                <p className='mt-3 text-xs text-stone-500'>{t('scriptStudio.gn.help')}</p>
              )}
            </header>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
