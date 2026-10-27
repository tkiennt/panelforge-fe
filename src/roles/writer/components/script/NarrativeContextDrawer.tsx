import React, { useState } from 'react';
import {
  Compass,
  BookOpen,
  FileText,
  Save,
  X,
  Maximize2,
  Minimize2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { ChapterDto } from '@/services/chapter.service';

interface NarrativeContextDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storyArcInput: string;
  setStoryArcInput: (val: string) => void;
  outlineInput: string;
  setOutlineInput: (val: string) => void;
  currentChapter: ChapterDto | null;
  canEditScript: boolean;
  isChapterLocked: boolean;
  savingStoryArc: boolean;
  savingOutline: boolean;
  onSaveStoryArc: () => Promise<void>;
  onSaveOutline: () => Promise<void>;
  isStoryArcDirty: boolean;
  isOutlineDirty: boolean;
}

export const NarrativeContextDrawer: React.FC<NarrativeContextDrawerProps> = ({
  isOpen,
  onClose,
  storyArcInput,
  setStoryArcInput,
  outlineInput,
  setOutlineInput,
  currentChapter,
  canEditScript,
  isChapterLocked,
  savingStoryArc,
  savingOutline,
  onSaveStoryArc,
  onSaveOutline,
  isStoryArcDirty,
  isOutlineDirty,
}) => {
  const [tab, setTab] = useState<'both' | 'storyArc' | 'outline'>('both');
  const [isExpandedHeight, setIsExpandedHeight] = useState(false);

  if (!isOpen) return null;

  const storyArcWordCount = storyArcInput.trim()
    ? storyArcInput.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const outlineWordCount = outlineInput.trim()
    ? outlineInput.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div
      data-testid='narrative-context-section'
      className='w-full xl:w-[460px] 2xl:w-[500px] shrink-0 border-l border-[#D8D2C5] bg-[#FCFBF8] flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200'
    >
      {/* Drawer Header */}
      <div className='p-4 border-b border-[#D8D2C5] bg-[#F8F6F0] flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-[#FFF2E6] text-[#C2410C] rounded-xl shrink-0 border border-[#F97316]/20'>
            <Compass className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm font-bold text-[#1C1917] truncate font-serif'>
              Định hướng cốt truyện & đề cương
            </h3>
            <p className='text-xs text-[#57534E] truncate'>
              Ngữ cảnh sáng tác cho Writer và AI Agent
            </p>
          </div>
        </div>

        <div className='flex items-center gap-1.5 shrink-0'>
          {/* Maximize height toggle */}
          <button
            type='button'
            onClick={() => setIsExpandedHeight((prev) => !prev)}
            className='p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] rounded-lg cursor-pointer transition-colors'
            title={isExpandedHeight ? 'Thu nhỏ khung' : 'Phóng to khung'}
          >
            {isExpandedHeight ? (
              <Minimize2 className='w-4 h-4' />
            ) : (
              <Maximize2 className='w-4 h-4' />
            )}
          </button>
          {/* Close drawer button */}
          <button
            type='button'
            onClick={onClose}
            className='p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] rounded-lg cursor-pointer transition-colors'
            title='Đóng bảng đề cương'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Tabs Switcher: Song song / Story Arc / Đề Cương */}
      <div className='px-4 pt-3 pb-2 border-b border-[#D8D2C5] flex items-center justify-between gap-2 bg-[#F8F6F0]/60'>
        <div className='flex items-center p-1 bg-[#F3F0E9] border border-[#D8D2C5] rounded-xl text-xs font-semibold'>
          <button
            type='button'
            onClick={() => setTab('both')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tab === 'both'
                ? 'bg-[#FFF2E6] text-[#1C1917] shadow-2xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            Cả hai
          </button>
          <button
            type='button'
            onClick={() => setTab('storyArc')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'storyArc'
                ? 'bg-[#FFF2E6] text-[#C2410C] shadow-2xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <span>Story Arc</span>
            {isStoryArcDirty && <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />}
          </button>
          <button
            type='button'
            onClick={() => setTab('outline')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'outline'
                ? 'bg-[#FFF2E6] text-[#1C1917] shadow-2xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <span>Đề cương Ch.{currentChapter?.chapterNumber ?? ''}</span>
            {isOutlineDirty && <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />}
          </button>
        </div>

        {(isStoryArcDirty || isOutlineDirty) && (
          <span className='text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md'>
            Có sửa đổi chưa lưu
          </span>
        )}
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F3F0E9]'>
        {/* SERIES STORY ARC */}
        {(tab === 'both' || tab === 'storyArc') && (
          <div className='p-4 bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-2xs space-y-3'>
            <div className='flex items-center justify-between pb-2 border-b border-[#D8D2C5]'>
              <div className='flex items-center gap-2'>
                <BookOpen className='w-4 h-4 text-[#C2410C]' />
                <div>
                  <h4 className='text-xs font-bold text-[#1C1917]'>Story Arc của Series</h4>
                  <p className='text-xs text-[#57534E]'>Cung truyện dài hạn</p>
                </div>
              </div>

              {canEditScript && (
                <button
                  type='button'
                  onClick={onSaveStoryArc}
                  disabled={savingStoryArc || !isStoryArcDirty}
                  data-testid='save-story-arc-btn'
                  className='btn-cta-primary'
                >
                  <Save className='w-3.5 h-3.5' />
                  <span>{savingStoryArc ? 'Đang lưu...' : 'Lưu Story Arc'}</span>
                </button>
              )}
            </div>

            <textarea
              rows={isExpandedHeight ? 12 : tab === 'storyArc' ? 14 : 6}
              value={storyArcInput}
              onChange={(e) => setStoryArcInput(e.target.value)}
              disabled={!canEditScript}
              placeholder='Nhập tóm lược Story Arc của Series (ví dụ: Hành trình khám phá bí mật cổ xưa...)'
              data-testid='story-arc-textarea'
              className='w-full p-3 text-xs md:text-sm leading-relaxed border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] disabled:bg-[#F3F0E9] disabled:cursor-not-allowed resize-y transition-all text-[#1C1917]'
            />

            <div className='flex items-center justify-between text-xs text-[#57534E]'>
              <span>
                {storyArcWordCount} từ · {storyArcInput.length} ký tự
              </span>
              <span>Dùng làm bối cảnh chính cho Writer AI</span>
            </div>
          </div>
        )}

        {/* CHAPTER OUTLINE */}
        {(tab === 'both' || tab === 'outline') && (
          <div className='p-4 bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-2xs space-y-3'>
            <div className='flex items-center justify-between pb-2 border-b border-[#D8D2C5]'>
              <div className='flex items-center gap-2'>
                <FileText className='w-4 h-4 text-blue-600' />
                <div>
                  <h4 className='text-xs font-bold text-[#1C1917]'>
                    Đề cương Chương {currentChapter?.chapterNumber ?? ''} (Outline)
                  </h4>
                  <p className='text-xs text-[#57534E]'>Dàn ý và diễn biến then chốt</p>
                </div>
              </div>

              {canEditScript && !isChapterLocked && (
                <button
                  type='button'
                  onClick={onSaveOutline}
                  disabled={savingOutline || !isOutlineDirty}
                  data-testid='save-chapter-outline-btn'
                  className='btn-cta-primary'
                >
                  <Save className='w-3.5 h-3.5' />
                  <span>{savingOutline ? 'Đang lưu...' : 'Lưu Đề Cương'}</span>
                </button>
              )}
            </div>

            <textarea
              rows={isExpandedHeight ? 12 : tab === 'outline' ? 14 : 6}
              value={outlineInput}
              onChange={(e) => setOutlineInput(e.target.value)}
              disabled={!canEditScript || isChapterLocked}
              placeholder='Nhập đề cương phân cảnh / nhịp điệu của chương...'
              data-testid='chapter-outline-textarea'
              className='w-full p-3 text-xs md:text-sm leading-relaxed border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] disabled:bg-[#F3F0E9] disabled:cursor-not-allowed resize-y transition-all text-[#1C1917]'
            />

            <div className='flex items-center justify-between text-xs text-[#57534E]'>
              <span>
                {outlineWordCount} từ · {outlineInput.length} ký tự
              </span>
              <span>Tự động đưa vào prompt khi viết kịch bản AI</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
