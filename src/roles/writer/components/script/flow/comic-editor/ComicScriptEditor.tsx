// src/roles/writer/components/script/flow/comic-editor/ComicScriptEditor.tsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  FileText,
  Film,
  User,
  Volume2,
  Scroll,
  HelpCircle,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Zap,
  Layers,
  ChevronRight,
  Info,
  Download,
  History,
  GitCompare,
  Lock,
  Unlock,
  Send,
  ShieldCheck,
  Clock,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';

import {
  PageBlockNode,
  PanelBlockNode,
  DialogueBlockNode,
  SfxBlockNode,
  CaptionBlockNode,
} from './nodes';
import {
  ComicKeymapExtension,
  SeriesBibleMentionNode,
  createComicMentionSuggestion,
} from './extensions';
import { getNextPageNumber } from './comicCounting';
import { AiScriptConvertModal, convertScriptTextToComicBlocks } from '../converter';
import { INITIAL_COMIC_SCRIPT_DOC } from './sampleScript';
import {
  useScriptVersionStore,
  ScriptVersion,
  ScriptDiffViewer,
  VersionHistoryDrawer,
  VersionPreviewModal,
} from './versioning';

export interface ComicScriptEditorProps {
  initialContent?: any;
  onChange?: (json: any) => void;
  onShowToast?: (title: string, desc: string) => void;
  className?: string;
  chapterId?: string;
  userRole?: 'WRITER' | 'PRODUCER';
  userId?: string;
  readOnly?: boolean;
}

export const ComicScriptEditor: React.FC<ComicScriptEditorProps> = ({
  initialContent = INITIAL_COMIC_SCRIPT_DOC,
  onChange,
  onShowToast,
  className = '',
  chapterId = 'chapter-current',
  userRole: propUserRole = 'WRITER',
  userId = 'user-writer',
  readOnly = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Modal yêu cầu sửa của Producer
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');

  // Versioning Store
  const {
    versions,
    currentVersionId,
    activeDiffVersionId,
    previewVersionId,
    isDrawerOpen,
    isDiffViewerOpen,
    userRole,
    initialize,
    updateDraftText,
    submitForReview,
    requestChanges,
    approveScript,
    unlockScript,
    restoreVersion,
    openDrawer,
    closeDrawer,
    openDiff,
    closeDiff,
    setPreviewVersion,
    setUserRole,
    getCurrentVersion,
    getActiveDiffVersion,
    getPreviewVersion,
  } = useScriptVersionStore();

  // Thống kê tài liệu theo thời gian thực
  const [stats, setStats] = useState({
    pages: 1,
    panels: 2,
    dialogues: 3,
    sfx: 2,
    words: 78,
  });

  const notify = useCallback(
    (title: string, desc: string) => {
      onShowToast?.(title, desc);
    },
    [onShowToast],
  );

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateDocumentStats = useCallback((editorInstance: any) => {
    try {
      const json = editorInstance.getJSON();
      let pages = 0;
      let panels = 0;
      let dialogues = 0;
      let sfx = 0;
      let words = 0;

      const traverse = (node: any) => {
        if (!node) return;
        if (node.type === 'pageBlock') pages++;
        if (node.type === 'panelBlock') panels++;
        if (node.type === 'dialogueBlock') dialogues++;
        if (node.type === 'sfxBlock') sfx++;
        if (node.text) {
          const w = node.text.trim().split(/\s+/).filter(Boolean).length;
          words += w;
        }
        if (Array.isArray(node.content)) {
          node.content.forEach(traverse);
        }
      };

      traverse(json);
      setStats({
        pages: Math.max(pages, 1),
        panels,
        dialogues,
        sfx,
        words,
      });
    } catch {
      // Bỏ qua lỗi tính toán thống kê
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      PageBlockNode,
      PanelBlockNode,
      DialogueBlockNode,
      SfxBlockNode,
      CaptionBlockNode,
      SeriesBibleMentionNode.configure({
        suggestion: createComicMentionSuggestion(),
      }),
      ComicKeymapExtension.configure({
        onBlockTransformed: (type, detail) => {
          setLastAction(`${type} (${detail || ''})`);
          setTimeout(() => setLastAction(null), 2500);
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[550px] px-8 py-10 font-sans text-base leading-relaxed text-slate-900 bg-[#FCFBF8] selection:bg-orange-100 selection:text-orange-950 caret-[#C2410C]',
      },
    },
    onUpdate: ({ editor: ed }) => {
      updateDocumentStats(ed);
      const json = ed.getJSON();
      const text = ed.getText();
      onChange?.(json);

      // QUY TẮC A: Autosave (1.2s debounce) chỉ ghi nhận rawText của DRAFT, KHÔNG TĂNG SỐ PHIÊN BẢN
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = setTimeout(() => {
        updateDraftText(text, json);
      }, 1200);
    },
  });

  // Khởi tạo Versioning Store
  useEffect(() => {
    const raw = editor ? editor.getText() : '';
    initialize(chapterId, raw, initialContent, propUserRole, userId);
  }, [chapterId, propUserRole, userId, initialize]);

  const currentVersion = getCurrentVersion();
  const isLockedOrReadOnly = Boolean(
    readOnly ||
    currentVersion?.isLocked ||
    currentVersion?.status === 'APPROVED' ||
    currentVersion?.status === 'IN_REVIEW',
  );

  // Đồng bộ trạng thái editable của Tiptap
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isLockedOrReadOnly);
    }
  }, [editor, isLockedOrReadOnly]);

  // Dọn dẹp timer
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Chèn nhanh block từ Toolbar
  const insertPageBlock = () => {
    if (!editor || isLockedOrReadOnly) return;
    const nextNum = String(stats.pages + 1).padStart(2, '0');
    const label = `TRANG ${nextNum}`;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'pageBlock',
        attrs: { pageNumber: nextNum, label },
        content: [{ type: 'text', text: `${label} - Bối cảnh mới` }],
      })
      .run();
  };

  const insertPanelBlock = () => {
    if (!editor || isLockedOrReadOnly) return;
    const nextPanel = `${stats.pages}.${stats.panels + 1}`;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'panelBlock',
        attrs: { panelNumber: nextPanel, cameraAngle: 'Trung cảnh' },
        content: [{ type: 'text', text: `Panel ${nextPanel}: ` }],
      })
      .run();
  };

  const insertCaptionBlock = () => {
    if (!editor || isLockedOrReadOnly) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'captionBlock',
        content: [{ type: 'text', text: 'Lời dẫn truyện tiếp theo...' }],
      })
      .run();
  };

  const insertSfxBlock = () => {
    if (!editor || isLockedOrReadOnly) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'sfxBlock',
        content: [{ type: 'text', text: 'BÙM! (Tiếng va chạm mạnh)' }],
      })
      .run();
  };

  const triggerMention = () => {
    if (!editor || isLockedOrReadOnly) return;
    editor.chain().focus().insertContent('@').run();
  };

  const handleCopyMarkdown = () => {
    if (!editor) return;
    const text = editor.getText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    notify(
      'Đã sao chép kịch bản',
      'Toàn bộ nội dung văn bản kịch bản đã được sao chép vào bộ nhớ tạm.',
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetSample = () => {
    if (!editor || isLockedOrReadOnly) return;
    editor.commands.setContent(INITIAL_COMIC_SCRIPT_DOC);
    updateDocumentStats(editor);
    notify('Đã khôi phục', 'Đã nạp lại kịch bản mẫu Comic Script.');
  };

  const handleApplyConvertedScript = (
    scriptText: string,
    mode: 'append' | 'insert' | 'replace',
  ) => {
    if (!editor || isLockedOrReadOnly) return;

    if (mode === 'replace') {
      const blocks = convertScriptTextToComicBlocks(scriptText, { startingPageNumber: 1 });
      editor.commands.setContent({ type: 'doc', content: blocks });
      updateDocumentStats(editor);
      notify('Đã ghi đè kịch bản', 'Toàn bộ nội dung đã được thay thế bằng kịch bản mới.');
      return;
    }

    if (mode === 'append') {
      const nextNum = getNextPageNumber(editor.state.doc);
      const blocks = convertScriptTextToComicBlocks(scriptText, { startingPageNumber: nextNum });
      const endPos = editor.state.doc.content.size;
      editor.chain().focus().insertContentAt(endPos, blocks).run();
      updateDocumentStats(editor);
      notify('Đã chèn kịch bản', `Đã thêm các trang mới (từ Trang ${nextNum}) vào cuối kịch bản.`);
      return;
    }

    if (mode === 'insert') {
      const currentPos = editor.state.selection.$from.pos;
      const currentNum = getNextPageNumber(editor.state.doc, currentPos);
      const blocks = convertScriptTextToComicBlocks(scriptText, { startingPageNumber: currentNum });
      editor.chain().focus().insertContent(blocks).run();
      updateDocumentStats(editor);
      notify('Đã chèn kịch bản', 'Đã chèn nội dung kịch bản mới tại vị trí con trỏ.');
      return;
    }
  };

  // --- VERSIONING LIFECYCLE HANDLERS ---

  // QUY TẮC B: Submit for Review
  const handleSubmitForReview = () => {
    if (!currentVersion) return;
    submitForReview();
    notify(
      'Đã gửi duyệt kịch bản',
      `Phiên bản v${currentVersion.versionNumber} đã được khóa chờ Producer duyệt.`,
    );
  };

  // QUY TẮC C: Producer Request Changes
  const handleConfirmRequestChanges = () => {
    if (!feedbackNotes.trim()) {
      notify('Lỗi', 'Vui lòng nhập ghi chú phản hồi cho biên kịch.');
      return;
    }
    requestChanges(feedbackNotes.trim());
    setShowFeedbackModal(false);
    setFeedbackNotes('');
    notify('Đã yêu cầu chỉnh sửa', 'Đã tạo bản nháp mới kế thừa kèm ghi chú phản hồi.');
  };

  // QUY TẮC D.1: Approve Script
  const handleApproveScript = () => {
    if (!currentVersion) return;
    approveScript();
    notify(
      'Kịch bản đã được duyệt!',
      `Phiên bản v${currentVersion.versionNumber} đã được phê duyệt và đóng băng sản xuất.`,
    );
  };

  // QUY TẮC D.2: Post-Approval Unlock (Major bump v1.x -> v2.0)
  const handleUnlockScript = () => {
    if (!currentVersion) return;
    unlockScript();
    notify('Đã mở khóa sửa lại', 'Đã nâng cấp lên phiên bản lớn tiếp theo (v2.0) để sửa kịch bản.');
  };

  // Khôi phục nội dung từ phiên bản lịch sử
  const handleRestoreVersion = (target: ScriptVersion) => {
    try {
      restoreVersion(target.id);
      if (editor) {
        if (target.snapshotAST) {
          editor.commands.setContent(target.snapshotAST);
        } else if (target.rawText) {
          const blocks = convertScriptTextToComicBlocks(target.rawText, { startingPageNumber: 1 });
          editor.commands.setContent({ type: 'doc', content: blocks });
        }
        updateDocumentStats(editor);
      }
      notify(
        'Đã khôi phục phiên bản',
        `Nội dung kịch bản đã được hoàn nguyên từ v${target.versionNumber}.`,
      );
    } catch (err: any) {
      notify('Lỗi khôi phục', err?.message || 'Không thể khôi phục kịch bản.');
    }
  };

  const activeDiffVersion = getActiveDiffVersion();
  const previewVersion = getPreviewVersion();

  return (
    <div
      className={`flex flex-col bg-[#F3F0E9] rounded-2xl border border-[#D8D2C5] shadow-lg overflow-hidden text-[#1C1917] ${className}`}
    >
      {/* 0. EDITORIAL LIFECYCLE STATUS & ACTION BAR */}
      <div className='shrink-0 bg-[#292524] text-white px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#1C1917] z-40'>
        {/* Left: Version Tag Chip */}
        <div className='flex items-center gap-2.5'>
          <button
            type='button'
            onClick={openDrawer}
            className='inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-mono font-bold text-orange-400 border border-stone-700 transition-colors cursor-pointer group shadow-2xs'
            title='Nhấn để xem toàn bộ lịch sử phiên bản snapshot'
          >
            <Clock className='w-3.5 h-3.5 text-orange-400 group-hover:rotate-45 transition-transform' />
            <span>
              🕒 v{currentVersion?.versionNumber || '1.0'} -{' '}
              {currentVersion?.status === 'APPROVED'
                ? 'Đã duyệt (Khóa)'
                : currentVersion?.status === 'IN_REVIEW'
                  ? 'Đang chờ duyệt'
                  : 'Bản nháp'}
            </span>
            <span className='text-[10px] text-stone-400 font-sans group-hover:text-white'>
              (Lịch sử)
            </span>
          </button>

          {/* Quick Diff Action if versions exist */}
          {versions.length > 1 && (
            <button
              type='button'
              onClick={() => openDiff()}
              className='inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/50 cursor-pointer shadow-2xs transition-colors'
              title='So sánh với bản trước đó'
            >
              <GitCompare className='w-3.5 h-3.5 text-indigo-400' />
              <span className='hidden sm:inline'>So sánh (Diff)</span>
            </button>
          )}
        </div>

        {/* Right: Dynamic Role Actions & Role Toggle */}
        <div className='flex items-center gap-2.5 flex-wrap'>
          {/* Role switcher toggle */}
          <div className='flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700 text-[11px] font-sans'>
            <button
              type='button'
              onClick={() => setUserRole('WRITER')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                userRole === 'WRITER'
                  ? 'bg-[#C2410C] text-white font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Writer
            </button>
            <button
              type='button'
              onClick={() => setUserRole('PRODUCER')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                userRole === 'PRODUCER'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Producer
            </button>
          </div>

          {/* WRITER ACTIONS */}
          {userRole === 'WRITER' && (
            <button
              type='button'
              onClick={handleSubmitForReview}
              disabled={currentVersion?.status !== 'DRAFT' || currentVersion?.isLocked}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all shadow-xs ${
                currentVersion?.status === 'DRAFT' && !currentVersion?.isLocked
                  ? 'bg-[#C2410C] hover:bg-[#9A3412] text-white cursor-pointer active:scale-95'
                  : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed opacity-60'
              }`}
              title={
                currentVersion?.status === 'DRAFT'
                  ? 'Gửi kịch bản cho Producer duyệt'
                  : 'Kịch bản đã gửi duyệt hoặc đã được khóa'
              }
            >
              <Send className='w-3.5 h-3.5' />
              <span>Gửi duyệt</span>
            </button>
          )}

          {/* PRODUCER ACTIONS */}
          {userRole === 'PRODUCER' && (
            <div className='flex items-center gap-1.5'>
              {currentVersion?.status === 'IN_REVIEW' && (
                <>
                  <button
                    type='button'
                    onClick={() => setShowFeedbackModal(true)}
                    className='inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg cursor-pointer transition-all shadow-xs'
                    title='Yêu cầu Biên kịch sửa lại kèm ghi chú (tăng minor v1.1)'
                  >
                    <MessageSquare className='w-3.5 h-3.5' />
                    <span>Yêu cầu sửa</span>
                  </button>

                  <button
                    type='button'
                    onClick={handleApproveScript}
                    className='inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer transition-all shadow-xs'
                    title='Duyệt và khóa kịch bản cho Artist vẽ phân cảnh'
                  >
                    <CheckCircle2 className='w-3.5 h-3.5' />
                    <span>Duyệt kịch bản</span>
                  </button>
                </>
              )}

              {currentVersion?.status === 'APPROVED' && (
                <button
                  type='button'
                  onClick={handleUnlockScript}
                  className='inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-lg cursor-pointer transition-all shadow-xs'
                  title='Mở khóa và nâng cấp lên phiên bản lớn tiếp theo (v2.0)'
                >
                  <Unlock className='w-3.5 h-3.5' />
                  <span>Mở khóa sửa lại (v2.0)</span>
                </button>
              )}

              {currentVersion?.status === 'DRAFT' && (
                <span className='text-[11px] text-stone-400 italic'>
                  Đang chờ Biên kịch soạn thảo...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* READ-ONLY BANNER WHEN LOCKED OR IN REVIEW */}
      {isLockedOrReadOnly && (
        <div className='bg-amber-500/10 border-b border-amber-500/30 px-6 py-2 flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in'>
          <div className='flex items-center gap-2'>
            <Lock className='w-4 h-4 text-amber-700 shrink-0' />
            <span className='font-semibold'>
              {currentVersion?.status === 'APPROVED'
                ? '🔒 Kịch bản đã được Producer duyệt và khóa để sản xuất Storyboard / Drawing. (Chỉ đọc)'
                : '🔒 Kịch bản đang trong quá trình Producer duyệt. (Chỉ đọc)'}
            </span>
          </div>
          {userRole === 'PRODUCER' && currentVersion?.status === 'APPROVED' && (
            <button
              type='button'
              onClick={handleUnlockScript}
              className='text-xs font-bold text-amber-900 underline hover:text-amber-700 cursor-pointer'
            >
              Mở khóa ngay (v2.0)
            </button>
          )}
        </div>
      )}

      {/* 1. TOP HEADER TOOLBAR: KEYBOARD-FIRST EDITORIAL COCKPIT */}
      <header className='shrink-0 bg-[#FCFBF8] border-b border-[#EBE7DF] px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs z-30'>
        {/* Nhóm nút Chèn Nhanh & Gợi Ý Phím Tắt */}
        <div className='flex items-center gap-1.5 flex-wrap'>
          <div className='flex items-center gap-1 bg-[#F3F0E9]/80 p-1 rounded-xl border border-[#E5E0D8]'>
            {/* Nút Trang */}
            <button
              type='button'
              disabled={isLockedOrReadOnly}
              onClick={insertPageBlock}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all shadow-2xs group ${
                isLockedOrReadOnly
                  ? 'opacity-50 cursor-not-allowed bg-stone-100 text-stone-400'
                  : 'text-[#C2410C] bg-[#FFF2E6] hover:bg-[#FFE5D0] border border-[#F97316]/30 cursor-pointer'
              }`}
              title="Chèn Trang mới (Phím tắt: gõ '#' rồi nhấn Tab)"
            >
              <FileText className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>+ Trang</span>
              <kbd className='hidden sm:inline text-[9px] font-mono bg-white/70 px-1 py-0.5 rounded text-[#C2410C] border border-[#C2410C]/20'>
                # Tab
              </kbd>
            </button>

            {/* Nút Panel */}
            <button
              type='button'
              disabled={isLockedOrReadOnly}
              onClick={insertPanelBlock}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all shadow-2xs group ${
                isLockedOrReadOnly
                  ? 'opacity-50 cursor-not-allowed bg-stone-100 text-stone-400'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer'
              }`}
              title="Chèn Panel mới (Phím tắt: gõ '-' rồi nhấn Tab)"
            >
              <Film className='w-3.5 h-3.5 text-indigo-600' />
              <span>+ Panel</span>
              <kbd className='hidden sm:inline text-[9px] font-mono bg-white/70 px-1 py-0.5 rounded text-indigo-700 border border-indigo-200'>
                - Tab
              </kbd>
            </button>

            {/* Nút Nhân vật (@) */}
            <button
              type='button'
              disabled={isLockedOrReadOnly}
              onClick={triggerMention}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all shadow-2xs ${
                isLockedOrReadOnly
                  ? 'opacity-50 cursor-not-allowed bg-stone-100 text-stone-400'
                  : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer'
              }`}
              title="Chèn thực thể Bible (Phím tắt: gõ '@')"
            >
              <User className='w-3.5 h-3.5 text-indigo-600' />
              <span>@ Nhân vật</span>
            </button>

            {/* Nút SFX */}
            <button
              type='button'
              disabled={isLockedOrReadOnly}
              onClick={insertSfxBlock}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                isLockedOrReadOnly
                  ? 'opacity-50 cursor-not-allowed bg-stone-100 text-stone-400'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 cursor-pointer'
              }`}
              title='Chèn hiệu ứng âm thanh (Gõ * hoặc SFX: rồi Enter)'
            >
              <Volume2 className='w-3.5 h-3.5 text-amber-600' />
              <span className='hidden md:inline'>SFX</span>
            </button>

            {/* Nút Caption */}
            <button
              type='button'
              disabled={isLockedOrReadOnly}
              onClick={insertCaptionBlock}
              className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${
                isLockedOrReadOnly
                  ? 'opacity-50 cursor-not-allowed bg-stone-100 text-stone-400'
                  : 'text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer'
              }`}
              title='Chèn lời dẫn truyện (Gõ Caption: rồi Enter)'
            >
              <Scroll className='w-3.5 h-3.5 text-slate-500' />
              <span className='hidden md:inline'>Lời dẫn</span>
            </button>

            {/* Nút Smart Convert / Gen AI */}
            <button
              type='button'
              disabled={isLockedOrReadOnly}
              onClick={() => setShowConvertModal(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-white rounded-lg transition-all shadow-2xs group ml-1 ${
                isLockedOrReadOnly
                  ? 'opacity-50 cursor-not-allowed bg-stone-400'
                  : 'bg-gradient-to-r from-[#C2410C] to-indigo-700 hover:from-[#9A3412] hover:to-indigo-800 cursor-pointer'
              }`}
              title='Chuyển đổi văn bản thô hoặc AI viết phân cảnh kịch bản'
            >
              <Sparkles className='w-3.5 h-3.5 animate-pulse' />
              <span>⚡ Chuyển đổi / Gen AI</span>
            </button>
          </div>

          {/* Phản hồi trạng thái biến đổi O(1) Transaction */}
          {lastAction && (
            <div className='flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-md animate-in fade-in slide-in-from-left-2'>
              <Zap className='w-3 h-3 text-emerald-600' />
              <span>Đã chuyển thành {lastAction}</span>
            </div>
          )}
        </div>

        {/* Nhóm Tiện Ích: Thống Kê, Sao Chép, Phím Tắt */}
        <div className='flex items-center gap-2'>
          {/* Nút Bảng Phím Tắt (Cheat Sheet) */}
          <button
            type='button'
            onClick={() => setShowCheatsheet((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              showCheatsheet
                ? 'bg-[#C2410C] text-white border-transparent shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border-[#E5E0D8] hover:bg-[#F3F0E9]'
            }`}
            title='Xem danh sách phím tắt gõ kịch bản tức thì'
          >
            <HelpCircle className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>Phím tắt</span>
          </button>

          {/* Nút Nạp lại kịch bản mẫu */}
          <button
            type='button'
            disabled={isLockedOrReadOnly}
            onClick={handleResetSample}
            className={`p-1.5 rounded-lg transition-colors border border-slate-200 bg-white ${
              isLockedOrReadOnly
                ? 'opacity-40 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer'
            }`}
            title='Nạp lại kịch bản mẫu ban đầu'
          >
            <RotateCcw className='w-3.5 h-3.5' />
          </button>

          {/* Nút Sao chép kịch bản */}
          <button
            type='button'
            onClick={handleCopyMarkdown}
            className='inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#1C1917] hover:bg-[#C2410C] rounded-lg transition-all cursor-pointer shadow-xs'
            title='Sao chép toàn bộ văn bản kịch bản'
          >
            {copied ? (
              <Check className='w-3.5 h-3.5 text-emerald-400' />
            ) : (
              <Copy className='w-3.5 h-3.5' />
            )}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>
        </div>
      </header>

      {/* 2. CHEATSHEET BANNER EXPANDABLE */}
      {showCheatsheet && (
        <div className='bg-[#FFF8F2] border-b border-[#FDBA74] px-6 py-3 text-xs text-[#7C2D12] flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-150'>
          <div className='flex items-center gap-6 flex-wrap'>
            <div className='flex items-center gap-1.5'>
              <span className='font-bold'>1. Tạo Trang:</span>
              <kbd className='px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs'>
                #
              </kbd>
              <span>+</span>
              <kbd className='px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs'>
                Tab
              </kbd>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='font-bold'>2. Tạo Panel:</span>
              <kbd className='px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs'>
                -
              </kbd>
              <span>+</span>
              <kbd className='px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs'>
                Tab
              </kbd>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='font-bold'>3. Thoại Nhân vật:</span>
              <span className='font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-[#FDBA74]'>
                @Tên: "Thoại" + ↵
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='font-bold'>4. Âm thanh (SFX):</span>
              <span className='font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-[#FDBA74]'>
                * BÙM * hoặc SFX: TIẾNG NỔ + ↵
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='font-bold'>5. Lời dẫn:</span>
              <span className='font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-[#FDBA74]'>
                Caption: Lời dẫn + ↵
              </span>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='font-bold'>6. Hoàn nguyên:</span>
              <kbd className='px-1.5 py-0.5 bg-white border border-[#FDBA74] rounded font-mono text-[11px] shadow-2xs'>
                Backspace
              </kbd>
              <span>ở đầu dòng</span>
            </div>
          </div>

          <button
            type='button'
            onClick={() => setShowCheatsheet(false)}
            className='text-[#9A3412] hover:text-[#7C2D12] text-xs font-bold cursor-pointer'
          >
            ✕ Đóng
          </button>
        </div>
      )}

      {/* 3. MAIN EDITOR SURFACE (PAPER SHEET LAYOUT) */}
      <div className='flex-1 overflow-y-auto px-4 py-8 flex justify-center bg-[#F3F0E9]'>
        <div className='w-full max-w-4xl bg-[#FCFBF8] rounded-2xl shadow-xl border border-[#D8D2C5] overflow-hidden'>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* 4. BOTTOM METRIC FOOTER BAR (60 FPS REAL-TIME STATS) */}
      <footer className='shrink-0 bg-[#FCFBF8] border-t border-[#EBE7DF] px-6 py-2.5 flex items-center justify-between text-xs text-slate-600 font-mono shadow-2xs'>
        <div className='flex items-center gap-5'>
          <div className='flex items-center gap-1.5'>
            <span className='w-2 h-2 rounded-full bg-[#C2410C]' />
            <span className='font-bold text-slate-800'>{stats.pages}</span>
            <span className='text-slate-500'>Trang</span>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='w-2 h-2 rounded-full bg-indigo-600' />
            <span className='font-bold text-slate-800'>{stats.panels}</span>
            <span className='text-slate-500'>Panels</span>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='w-2 h-2 rounded-full bg-purple-500' />
            <span className='font-bold text-slate-800'>{stats.dialogues}</span>
            <span className='text-slate-500'>Thoại</span>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='w-2 h-2 rounded-full bg-amber-500' />
            <span className='font-bold text-slate-800'>{stats.sfx}</span>
            <span className='text-slate-500'>SFX</span>
          </div>

          <div className='hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-4'>
            <span className='font-semibold text-slate-700'>{stats.words}</span>
            <span className='text-slate-500'>từ</span>
          </div>
        </div>

        <div className='flex items-center gap-2 text-[11px] text-slate-400'>
          <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
          <span>Tiptap ProseMirror 60 FPS Engine · Keyboard-First</span>
        </div>
      </footer>

      {/* 5. MODAL SMART CONVERT & AI BIÊN KỊCH */}
      <AiScriptConvertModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onApplyScript={handleApplyConvertedScript}
        initialStartingPageNumber={editor ? getNextPageNumber(editor.state.doc) : 1}
        seriesBibleContext={{
          characters: [
            { name: 'Minh', role: 'Nam chính' },
            { name: 'Lan', role: 'Nữ chính' },
            { name: 'Người lạ mặt', role: 'Phản diện bí ẩn' },
          ],
          locations: ['Ngã tư Shibuya', 'Hẻm tối Shinjuku', 'Tòa nhà bỏ hoang'],
        }}
        onShowToast={notify}
      />

      {/* 6. VERSION HISTORY DRAWER */}
      <VersionHistoryDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        versions={versions}
        currentVersionId={currentVersionId}
        onViewVersion={(v) => setPreviewVersion(v.id)}
        onCompareVersion={(v) => openDiff(v.id)}
        onRestoreVersion={handleRestoreVersion}
        canRestore={!isLockedOrReadOnly}
      />

      {/* 7. SCRIPT DIFF VIEWER MODAL */}
      {isDiffViewerOpen && currentVersion && activeDiffVersion && (
        <ScriptDiffViewer
          baseVersion={activeDiffVersion}
          compareVersion={currentVersion}
          allVersions={versions}
          onSelectBaseVersion={(id) => openDiff(id)}
          onClose={closeDiff}
        />
      )}

      {/* 8. VERSION PREVIEW MODAL */}
      {previewVersion && (
        <VersionPreviewModal
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
          onRestore={handleRestoreVersion}
          canRestore={!isLockedOrReadOnly}
        />
      )}

      {/* 9. PRODUCER REQUEST CHANGES MODAL */}
      {showFeedbackModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 animate-in fade-in'>
          <div className='bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full max-w-lg flex flex-col gap-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700'>
                <MessageSquare className='w-5 h-5' />
              </div>
              <div>
                <h3 className='font-bold text-slate-900 text-base'>
                  Yêu cầu Biên kịch sửa đổi kịch bản
                </h3>
                <p className='text-xs text-slate-500'>
                  Hệ thống sẽ tạo bản nháp mới (v1.1) kế thừa nội dung kèm ghi chú phản hồi của bạn.
                </p>
              </div>
            </div>

            <textarea
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder='Nhập chi tiết các phân cảnh cần sửa (ví dụ: Tăng nhịp độ căng thẳng ở trang 1, sửa lại lời thoại của Minh)...'
              rows={4}
              className='w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500'
            />

            <div className='flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackNotes('');
                }}
                className='px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer'
              >
                Hủy bỏ
              </button>
              <button
                type='button'
                onClick={handleConfirmRequestChanges}
                className='px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg cursor-pointer shadow-xs'
              >
                Gửi yêu cầu (Tạo v1.1)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
