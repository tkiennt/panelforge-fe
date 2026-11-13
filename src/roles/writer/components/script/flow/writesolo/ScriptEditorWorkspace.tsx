// src/roles/writer/components/script/flow/writesolo/ScriptEditorWorkspace.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  FileText,
  Plus,
  BookOpen,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronDown,
  Layers,
  Film,
  Volume2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCcw,
  MessageSquare,
  StickyNote,
  Image,
  ListTree,
  Type,
  HelpCircle,
  Hash,
  Compass,
  ArrowRight,
  Smile,
} from 'lucide-react';
import { BibleEntryDto } from '@/services/bible.service';
import {
  WriteSoloBlockNode,
  WriteSoloExtension,
  WriteSoloBlockType,
  DetectedEntityInfo,
  WRITESOLO_CYCLE_TYPES,
} from './writeSoloExtensions';
import { SeriesBibleContextSidebar } from './SeriesBibleContextSidebar';
import { INITIAL_WRITESOLO_DOC, SAMPLE_BIBLE_ENTRIES } from './sampleScript';

export const WRITESOLO_SCREENPLAY_MENU = [
  { key: 'S', type: 'scene_heading' as WriteSoloBlockType, label: 'Scene Heading (Slugline)' },
  { key: 'A', type: 'action' as WriteSoloBlockType, label: 'Action (Mô tả hành động)' },
  { key: 'C', type: 'character' as WriteSoloBlockType, label: 'Character (Tên nhân vật)' },
  { key: 'P', type: 'parenthetical' as WriteSoloBlockType, label: 'Parenthetical (Sắc thái)' },
  { key: 'D', type: 'dialogue' as WriteSoloBlockType, label: 'Dialogue (Lời thoại)' },
  { key: 'T', type: 'transition' as WriteSoloBlockType, label: 'Transition (Chuyển cảnh)' },
  { key: 'Pg', type: 'page_heading' as WriteSoloBlockType, label: 'Page (Trang truyện)' },
  { key: 'Pn', type: 'panel_heading' as WriteSoloBlockType, label: 'Panel (Khung tranh)' },
  { key: 'Cp', type: 'caption' as WriteSoloBlockType, label: 'Caption (Dẫn truyện)' },
  { key: 'Fx', type: 'sfx' as WriteSoloBlockType, label: 'SFX (Âm thanh)' },
];

export interface ScriptEditorWorkspaceProps {
  initialContent?: any;
  allBibleEntries?: BibleEntryDto[];
  onSave?: (json: any) => void;
  onCreateStub?: (name: string, tempCode: string) => void;
  onOpenInBible?: (codeOrId: string) => void;
  className?: string;
}

export const ScriptEditorWorkspace: React.FC<ScriptEditorWorkspaceProps> = ({
  initialContent = INITIAL_WRITESOLO_DOC,
  allBibleEntries = SAMPLE_BIBLE_ENTRIES,
  onSave,
  onCreateStub,
  onOpenInBible,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'pad'>('document');
  const [isBibleSidebarOpen, setIsBibleSidebarOpen] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [activeBlockType, setActiveBlockType] = useState<WriteSoloBlockType>('action');
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntityInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPanel, setCurrentPanel] = useState(1);
  const [showFloatingPicker, setShowFloatingPicker] = useState(false);

  // Metrics thời gian thực
  const [stats, setStats] = useState({
    scenes: 1,
    characters: 2,
    words: 110,
  });

  const bibleEntriesRef = useRef(allBibleEntries);
  bibleEntriesRef.current = allBibleEntries;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        paragraph: false,
      }),
      WriteSoloBlockNode,
      WriteSoloExtension.configure({
        getBibleEntries: () => bibleEntriesRef.current,
        onActiveBlockChange: (type, spk) => {
          setActiveBlockType(type);
          if (spk) setActiveSpeaker(spk);
        },
        onEntitiesDetected: (entities) => {
          setDetectedEntities(entities);
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[75vh] font-mono text-[15px] leading-relaxed text-[#171717]',
      },
    },
    onUpdate: ({ editor }) => {
      let sceneCount = 0;
      let characterCount = 0;
      let wordCount = 0;

      editor.state.doc.descendants((node) => {
        if (node.type.name === 'writeSoloBlock') {
          if (node.attrs.blockType === 'scene_heading') sceneCount++;
          if (node.attrs.blockType === 'character') characterCount++;
          const text = node.textContent?.trim() || '';
          if (text) {
            wordCount += text.split(/\s+/).length;
          }
        }
      });

      setStats({
        scenes: Math.max(1, sceneCount),
        characters: Math.max(1, characterCount),
        words: wordCount,
      });

      const { $from } = editor.state.selection;
      const cur = $from.parent;
      if (cur.type.name === 'writeSoloBlock') {
        setActiveBlockType(cur.attrs.blockType || 'action');
        setActiveSpeaker(cur.attrs.speakerName || null);
        setCurrentPage(cur.attrs.pageNumber || 1);
        setCurrentPanel(cur.attrs.panelNumber || 1);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { $from } = editor.state.selection;
      const cur = $from.parent;
      if (cur.type.name === 'writeSoloBlock') {
        setActiveBlockType(cur.attrs.blockType || 'action');
        setActiveSpeaker(cur.attrs.speakerName || null);
        setCurrentPage(cur.attrs.pageNumber || 1);
        setCurrentPanel(cur.attrs.panelNumber || 1);
      }
    },
  });

  // Hotkey Zen Focus Mode (Ctrl+\)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInsertBlock = useCallback(
    (type: WriteSoloBlockType) => {
      if (!editor) return;
      const { state, view } = editor;
      const { $from } = state.selection;
      const fromPos = $from.before();

      if (type === 'page_heading') {
        editor.commands.keyboardShortcut('Mod-Enter');
        return;
      }
      if (type === 'panel_heading') {
        editor.commands.keyboardShortcut('Alt-Enter');
        return;
      }

      view.dispatch(
        state.tr.setNodeMarkup(fromPos, undefined, {
          ...$from.parent.attrs,
          blockType: type,
          speakerName: type === 'character' ? activeSpeaker || 'NANCY' : null,
        }),
      );
      editor.commands.focus();
      setShowFloatingPicker(false);
    },
    [editor, activeSpeaker],
  );

  return (
    <div
      className={`flex flex-col h-full bg-[#1F2937] text-[#171717] font-sans overflow-hidden select-none ${className}`}
    >
      {/* High-Contrast SVG Cursor & Active Line Highlight */}
      <style>{`
        .writesolo-sheet,
        .writesolo-sheet .ProseMirror,
        .writesolo-sheet .writesolo-action-line,
        .writesolo-sheet .writesolo-dialogue-line {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='24' viewBox='0 0 16 24'%3E%3Cpath d='M4 2h8M8 2v20M4 22h8' stroke='%23ffffff' stroke-width='3' stroke-linecap='round'/%3E%3Cpath d='M4 2h8M8 2v20M4 22h8' stroke='%23C2410C' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E") 8 12, text !important;
          caret-color: #C2410C;
        }
        .writesolo-sheet .ProseMirror > div:focus-within {
          background-color: #EBF3FE !important;
          border-radius: 2px;
        }
      `}</style>

      {/* 1. TOP WRITESOLO / WRITERDUET TOOLBAR */}
      {!isZenMode && (
        <header className='shrink-0 bg-[#2D3748] text-stone-200 px-3 py-1 flex items-center justify-between border-b border-[#1A202C] text-xs z-30'>
          <div className='flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5'>
            {/* Scene Heading */}
            <button
              onClick={() => handleInsertBlock('scene_heading')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer ${
                activeBlockType === 'scene_heading' ? 'bg-stone-700 text-yellow-400 font-bold' : ''
              }`}
              title='Scene Heading (INT./EXT.)'
            >
              <Compass className='w-4 h-4 text-yellow-400' />
              <span className='text-[10px]'>Scene</span>
            </button>

            {/* Action */}
            <button
              onClick={() => handleInsertBlock('action')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer ${
                activeBlockType === 'action' ? 'bg-stone-700 text-white font-bold' : ''
              }`}
              title='Action (Thì hiện tại đơn)'
            >
              <Film className='w-4 h-4 text-emerald-400' />
              <span className='text-[10px]'>Action</span>
            </button>

            {/* Character */}
            <button
              onClick={() => handleInsertBlock('character')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer ${
                activeBlockType === 'character' ? 'bg-stone-700 text-rose-400 font-bold' : ''
              }`}
              title='Character (Tab để sang)'
            >
              <Type className='w-4 h-4 text-rose-400' />
              <span className='text-[10px]'>Character</span>
            </button>

            {/* Parenthetical */}
            <button
              onClick={() => handleInsertBlock('parenthetical')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer ${
                activeBlockType === 'parenthetical' ? 'bg-stone-700 text-purple-400 font-bold' : ''
              }`}
              title='Parenthetical (Ghi chú cảm xúc / ngữ điệu)'
            >
              <Smile className='w-4 h-4 text-purple-400' />
              <span className='text-[10px]'>Parens</span>
            </button>

            {/* Dialogue */}
            <button
              onClick={() => handleInsertBlock('dialogue')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer ${
                activeBlockType === 'dialogue' ? 'bg-stone-700 text-sky-400 font-bold' : ''
              }`}
              title='Dialogue (Enter từ Character)'
            >
              <MessageSquare className='w-4 h-4 text-sky-400' />
              <span className='text-[10px]'>Dialogue</span>
            </button>

            {/* Transition */}
            <button
              onClick={() => handleInsertBlock('transition')}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer ${
                activeBlockType === 'transition' ? 'bg-stone-700 text-orange-400 font-bold' : ''
              }`}
              title='Transition (CUT TO:, FADE OUT.)'
            >
              <ArrowRight className='w-4 h-4 text-orange-400' />
              <span className='text-[10px]'>Transition</span>
            </button>

            <span className='w-px h-6 bg-stone-600 mx-1' />

            {/* Manga / Graphic Novel Tools */}
            <button
              onClick={() => handleInsertBlock('page_heading')}
              className='flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer'
              title='Page (Ctrl + Enter)'
            >
              <FileText className='w-4 h-4 text-orange-400' />
              <span className='text-[10px]'>Page</span>
            </button>
            <button
              onClick={() => handleInsertBlock('panel_heading')}
              className='flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer'
              title='Panel (Alt + Enter)'
            >
              <LayoutGrid className='w-4 h-4 text-indigo-400' />
              <span className='text-[10px]'>Panel</span>
            </button>
            <button
              onClick={() => handleInsertBlock('sfx')}
              className='flex flex-col items-center gap-0.5 px-2 py-1 rounded hover:bg-stone-700/70 transition-colors cursor-pointer'
              title='SFX'
            >
              <Volume2 className='w-4 h-4 text-amber-400' />
              <span className='text-[10px]'>SFX</span>
            </button>
          </div>

          {/* Right Toolbar Controls */}
          <div className='flex items-center gap-2'>
            <div className='hidden md:flex items-center gap-2 text-[11px] font-mono text-stone-400 border-r border-stone-600 pr-3'>
              <span>Cảnh: {stats.scenes}</span>
              <span>•</span>
              <span>Nhân vật: {stats.characters}</span>
              <span>•</span>
              <span>{stats.words} từ</span>
            </div>

            <button
              onClick={() => setIsBibleSidebarOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                isBibleSidebarOpen
                  ? 'bg-[#E11D48] text-white shadow-2xs'
                  : 'bg-stone-700 text-stone-200 hover:bg-stone-600'
              }`}
            >
              <BookOpen className='w-3.5 h-3.5' />
              <span>Series Bible ({detectedEntities.length})</span>
            </button>

            <button
              onClick={() => setIsZenMode(true)}
              className='p-1.5 text-stone-400 hover:text-white rounded hover:bg-stone-700 transition-colors cursor-pointer'
              title='Zen Focus Mode (Ctrl+\)'
            >
              <Maximize2 className='w-4 h-4' />
            </button>
          </div>
        </header>
      )}

      {/* 2. SUB-TABS */}
      {!isZenMode && (
        <div className='shrink-0 bg-[#1E2530] px-4 pt-1.5 flex items-center justify-between border-b border-[#2D3748] text-xs text-stone-400'>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => setActiveTab('document')}
              className={`px-3 py-1 rounded-t-md font-mono text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'document'
                  ? 'bg-white text-stone-900 font-bold'
                  : 'bg-[#283141] text-stone-400 hover:bg-[#323D4F]'
              }`}
            >
              <FileText className='w-3.5 h-3.5 text-[#C2410C]' />
              Default Document
            </button>
            <button
              onClick={() => setActiveTab('pad')}
              className={`px-3 py-1 rounded-t-md font-mono text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'pad'
                  ? 'bg-white text-stone-900 font-bold'
                  : 'bg-[#283141] text-stone-400 hover:bg-[#323D4F]'
              }`}
            >
              <StickyNote className='w-3.5 h-3.5 text-indigo-400' />
              Private Pad
            </button>
          </div>

          <div className='flex items-center gap-3 text-[11px] font-sans pb-1'>
            <button
              onClick={() => setShowFloatingPicker((prev) => !prev)}
              className='text-stone-300 hover:text-white flex items-center gap-1 cursor-pointer'
            >
              <span>Menu phần tử</span>
              <kbd className='px-1 py-0.2 rounded bg-stone-700 text-[10px] font-mono'>Tab</kbd>
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <div className='flex-1 flex overflow-hidden relative'>
        {/* Manuscript Paper Container */}
        <div className='flex-1 overflow-y-auto px-4 sm:px-12 py-8 custom-scrollbar flex justify-center bg-[#4B5563]/40'>
          <div className='w-full max-w-4xl bg-white shadow-2xl px-12 sm:px-20 py-16 relative writesolo-sheet min-h-[92vh] text-[#171717] font-mono text-[15px] leading-relaxed'>
            {/* Floating Element Picker Popover */}
            {showFloatingPicker && (
              <div className='absolute top-6 right-6 z-50 w-56 rounded-md bg-white border border-stone-300 shadow-2xl p-1 text-xs font-mono animate-in fade-in zoom-in-95 duration-100 select-none'>
                <div className='px-2 py-1 text-[10px] text-stone-400 border-b border-stone-100 uppercase tracking-wider mb-1'>
                  Chọn loại dòng kịch bản
                </div>
                {WRITESOLO_SCREENPLAY_MENU.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleInsertBlock(item.type)}
                    className={`w-full text-left px-2.5 py-1.5 rounded flex items-center justify-between hover:bg-stone-100 cursor-pointer ${
                      activeBlockType === item.type ? 'bg-[#BAE6FD] text-sky-950 font-bold' : ''
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className='text-[10px] font-bold text-stone-500'>[{item.key}]</span>
                  </button>
                ))}
              </div>
            )}

            {/* TipTap Editor */}
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right Series Bible Context Sidebar */}
        {!isZenMode && (
          <SeriesBibleContextSidebar
            isOpen={isBibleSidebarOpen}
            onClose={() => setIsBibleSidebarOpen(false)}
            detectedEntities={detectedEntities}
            allBibleEntries={allBibleEntries}
            currentPageNumber={currentPage}
            currentPanelNumber={currentPanel}
            onCreateStub={onCreateStub}
            onOpenInBible={onOpenInBible}
          />
        )}

        {/* Zen Mode Exit Button */}
        {isZenMode && (
          <button
            onClick={() => setIsZenMode(false)}
            className='fixed top-4 right-4 z-50 p-2 bg-stone-900/80 hover:bg-stone-900 text-white rounded-full shadow-lg transition-all cursor-pointer backdrop-blur-md'
            title='Thoát Zen Mode (Ctrl+\)'
          >
            <Minimize2 className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* 4. FOOTER SHORTCUT LEGEND */}
      {!isZenMode && (
        <footer className='shrink-0 h-7 bg-[#2D3748] text-stone-300 text-xs px-4 flex items-center justify-between select-none border-t border-[#1A202C]'>
          <div className='flex items-center gap-2 text-[11px] font-mono'>
            <span className='w-2 h-2 rounded-full bg-emerald-400 inline-block' />
            <span>WriteSolo Screenplay Flow: Scene $\rightarrow$ Action $\rightarrow$ Character $\rightarrow$ Dialogue</span>
          </div>

          <div className='hidden sm:flex items-center gap-3 text-[10px] font-mono text-stone-400'>
            <span>[Tab] Chuyển Character / Đổi vai</span>
            <span>•</span>
            <span>[Enter] Xuống dòng kịch bản</span>
            <span>•</span>
            <span>[Backspace] Hoàn nguyên Action</span>
          </div>
        </footer>
      )}
    </div>
  );
};
