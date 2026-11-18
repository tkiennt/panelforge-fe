import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
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
  defaultTab?: 'outline' | 'storyArc';
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
  defaultTab = 'outline',
}) => {
  const { t } = useTranslation('production');
  const [tab, setTab] = useState<'outline' | 'storyArc'>(defaultTab);
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

      {/* Tabs Switcher: Đề Cương / Story Arc */}
      <div className='px-4 pt-3 pb-2 border-b border-[#D8D2C5] flex items-center justify-between gap-2 bg-[#F8F6F0]/60'>
        <div className='flex items-center p-1 bg-[#F3F0E9] border border-[#D8D2C5] rounded-xl text-xs font-semibold'>
          <button
            type='button'
            onClick={() => setTab('outline')}
            data-testid='tab-narrative-outline'
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'outline'
                ? 'bg-[#FFF2E6] text-[#C2410C] shadow-2xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <span>
              {t('scriptStudio.narrative.outlineWithChapter', {
                n: currentChapter?.chapterNumber ?? '',
                defaultValue: `Đề cương Ch.${currentChapter?.chapterNumber ?? ''}`,
              })}
            </span>
            {isOutlineDirty && <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />}
          </button>
          <button
            type='button'
            onClick={() => setTab('storyArc')}
            data-testid='tab-narrative-story-arc'
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              tab === 'storyArc'
                ? 'bg-[#FFF2E6] text-[#C2410C] shadow-2xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <span>{t('scriptStudio.narrative.storyArc', 'Story Arc')}</span>
            {isStoryArcDirty && <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />}
          </button>
        </div>

        {(isStoryArcDirty || isOutlineDirty) && (
          <span className='text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md'>
            {t('scriptStudio.narrative.hasChanges', 'Có sửa đổi chưa lưu')}
          </span>
        )}
      </div>

      {/* Scrollable Content */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#F3F0E9]'>
        {/* CHAPTER OUTLINE */}
        {tab === 'outline' && (
          <div className='p-4 bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-2xs space-y-3'>
            <div className='flex items-center justify-between pb-2 border-b border-[#D8D2C5]'>
              <div className='flex items-center gap-2'>
                <FileText className='w-4 h-4 text-blue-600' />
                <div>
                  <h4 className='text-xs font-bold text-[#1C1917]'>
                    {t('scriptStudio.narrative.chapterOutline', {
                      n: currentChapter?.chapterNumber ?? '',
                      defaultValue: `Đề cương Chương ${currentChapter?.chapterNumber ?? ''} (Outline)`,
                    })}
                  </h4>
                  <p className='text-xs text-[#57534E]'>
                    {t('scriptStudio.narrative.chapterOutlineDesc', 'Dàn ý và diễn biến then chốt')}
                  </p>
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
                  <span>
                    {savingOutline
                      ? t('scriptStudio.narrative.saving', 'Đang lưu...')
                      : t('scriptStudio.narrative.saveOutline', 'Lưu Đề Cương')}
                  </span>
                </button>
              )}
            </div>

            <textarea
              rows={isExpandedHeight ? 18 : 12}
              value={outlineInput}
              onChange={(e) => setOutlineInput(e.target.value)}
              disabled={!canEditScript || isChapterLocked}
              placeholder={t(
                'scriptStudio.narrative.outlinePlaceholder',
                'Nhập đề cương phân cảnh / nhịp điệu của chương...',
              )}
              data-testid='chapter-outline-textarea'
              className='w-full p-3 text-xs md:text-sm leading-relaxed border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] disabled:bg-[#F3F0E9] disabled:cursor-not-allowed resize-y transition-all text-[#1C1917]'
            />

            <div className='flex items-center justify-between text-xs text-[#57534E]'>
              <span>
                {outlineWordCount} {t('scriptStudio.narrative.words', 'từ')} · {outlineInput.length}{' '}
                {t('scriptStudio.narrative.chars', 'ký tự')}
              </span>
              <span>{t('scriptStudio.narrative.outlineAiHint', 'Tự động đưa vào prompt khi viết kịch bản AI')}</span>
            </div>
          </div>
        )}

        {/* SERIES STORY ARC */}
        {tab === 'storyArc' && (
          <div className='p-4 bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-2xs space-y-3'>
            <div className='flex items-center justify-between pb-2 border-b border-[#D8D2C5]'>
              <div className='flex items-center gap-2'>
                <BookOpen className='w-4 h-4 text-[#C2410C]' />
                <div>
                  <h4 className='text-xs font-bold text-[#1C1917]'>
                    {t('scriptStudio.narrative.seriesStoryArc', 'Story Arc của Series')}
                  </h4>
                  <p className='text-xs text-[#57534E]'>
                    {t('scriptStudio.narrative.seriesStoryArcDesc', 'Cung truyện dài hạn')}
                  </p>
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
                  <span>
                    {savingStoryArc
                      ? t('scriptStudio.narrative.saving', 'Đang lưu...')
                      : t('scriptStudio.narrative.saveStoryArc', 'Lưu Story Arc')}
                  </span>
                </button>
              )}
            </div>

            <textarea
              rows={isExpandedHeight ? 18 : 12}
              value={storyArcInput}
              onChange={(e) => setStoryArcInput(e.target.value)}
              disabled={!canEditScript}
              placeholder={t(
                'scriptStudio.narrative.storyArcPlaceholder',
                'Nhập tóm lược Story Arc của Series (ví dụ: Hành trình khám phá bí mật cổ xưa...)',
              )}
              data-testid='story-arc-textarea'
              className='w-full p-3 text-xs md:text-sm leading-relaxed border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] disabled:bg-[#F3F0E9] disabled:cursor-not-allowed resize-y transition-all text-[#1C1917]'
            />

            <div className='flex items-center justify-between text-xs text-[#57534E]'>
              <span>
                {storyArcWordCount} {t('scriptStudio.narrative.words', 'từ')} · {storyArcInput.length}{' '}
                {t('scriptStudio.narrative.chars', 'ký tự')}
              </span>
              <span>{t('scriptStudio.narrative.storyArcAiHint', 'Dùng làm bối cảnh chính cho Writer AI')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
