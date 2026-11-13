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
  GnLabels,
  ScriptDocument,
  ScriptLineBlockNode,
  ScriptTypingBehavior,
  activeElement,
  chooseElement,
  getElementMenu,
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
  /**
   * Đưa hàm lưu lên màn cha (vd lưu trước khi gửi duyệt). Hàm trả true khi đã lưu xong hoặc không có gì để lưu,
   * false khi lưu thất bại. Gọi lại với null khi bàn viết unmount.
   */
  registerSave?: (save: (() => Promise<boolean>) | null) => void;
}

const SHEET_CSS = `
.gn-sheet .ProseMirror { outline: none; font-family: 'Courier Prime', 'Courier New', ui-monospace, monospace;
  font-size: 15px; line-height: 1.75rem; color: #1c1917; caret-color: #c2410c; min-height: 900px; }
.gn-sheet .gn-line { clear: both; min-height: 1.75rem; white-space: pre-wrap; word-break: break-word; }
.gn-sheet .gn-page { margin-top: 3rem; padding-top: .75rem; border-top: 1px solid #e7e5e4;
  font-weight: 700; font-size: 17px; letter-spacing: .04em; }
.gn-sheet .gn-page:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
.gn-sheet .gn-page::before { content: attr(data-label); }
.gn-sheet .gn-panel { margin-top: 1.25rem; font-weight: 700; text-transform: uppercase; }
.gn-sheet .gn-panel::before { content: attr(data-label) "\\00a0\\00a0"; }
.gn-sheet .gn-action { margin-top: .5rem; }
.gn-sheet .gn-character { float: left; clear: both; width: 10rem; margin-top: .5rem; text-transform: uppercase; }
.gn-sheet .gn-character.gn-filled::after { content: ':'; }
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
  registerSave,
}) => {
  const { t } = useTranslation('production');
  const isReadOnly = !canEditScript || isChapterLocked;
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [active, setActive] = useState<GnElement | null>(null);
  /** Menu chọn loại dòng (Enter trên dòng trống): vị trí neo theo con trỏ + mục đang chọn. */
  const [menu, setMenu] = useState<{ index: number; top: number; left: number } | null>(null);
  const dirtyRef = useRef(false);
  const loadingRef = useRef(false);

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
      onTransaction: ({ editor: ed }) => {
        setActive(activeElement(ed));
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

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!editor || isReadOnly || !dirtyRef.current) return true;
    if (isSaving) return false;
    setIsSaving(true);
    try {
      const snapshot = docToScript(editor.state.doc, scenes[0]?.id ?? '');
      markDirty(false);
      await onSave(snapshot);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch (err: any) {
      markDirty(true);
      onShowToast?.(t('scriptStudio.gn.saveFailed'), err?.message ?? '');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [editor, isReadOnly, isSaving, scenes, onSave, onShowToast, t]);

  useEffect(() => {
    if (!registerSave) return;
    registerSave(handleSave);
    return () => registerSave(null);
  }, [registerSave, handleSave]);

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
    <div className='relative flex-1 min-h-0 flex flex-col bg-[#DDD5C7]'>
      <style>{SHEET_CSS}</style>

      {/* Thanh loại dòng: bấm không làm mất con trỏ trong trang */}
      <div className='shrink-0 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#D4CBBF] bg-[#F4EFEA]/95 text-stone-900 px-3 py-1.5'>
        {dockLeading}
        {dockLeading && <span className='w-px h-6 bg-[#D4CBBF] shrink-0' aria-hidden='true' />}
        <div
          role='toolbar'
          aria-label={t('scriptStudio.gn.toolbar')}
          className='flex flex-wrap items-center gap-0.5 min-w-0'
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
                  isActive
                    ? 'bg-orange-100 text-[#C2410C] font-semibold ring-1 ring-orange-300'
                    : 'text-stone-700 hover:bg-stone-200/80 hover:text-stone-900'
                }`}
              >
                {t(`scriptStudio.gn.el.${el}`)}
              </button>
            );
          })}
        </div>

        <span
          className='ml-auto shrink-0 text-xs text-stone-600 whitespace-nowrap'
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
              isDirty ? 'bg-[#EA580C] text-white hover:bg-[#C2410C]' : 'text-stone-400'
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

      <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-6 sm:py-10 pb-32'>
        <div
          data-testid='paper-editor-sheet'
          className='gn-sheet paper-editor-sheet max-w-[760px] mx-auto bg-white rounded-md border border-[#C5BDAF] shadow-[0_8px_30px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)] px-6 sm:px-16 lg:px-20 pt-14 pb-48 my-2 sm:my-4 transition-all duration-150 min-h-[1100px] sm:min-h-[1200px] cursor-text'
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
                i === menu.index
                  ? 'bg-orange-50 text-[#C2410C]'
                  : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span>{t(`scriptStudio.gn.el.${el}`)}</span>
              <span className='text-xs text-stone-400'>Ctrl+{i + 1}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
