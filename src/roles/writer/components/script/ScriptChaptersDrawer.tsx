import React, { useState, useMemo } from 'react';
import { BookOpen, Check, Lock, LayoutGrid, Search, X } from 'lucide-react';
import { ChapterDto, ChapterStatus } from '@/services/chapter.service';
import { useTranslation } from '@/lib/i18n';

interface ScriptChaptersDrawerProps {
  chapters: ChapterDto[];
  selectedChapterId?: string | null;
  onSelectChapter: (chapterId: string) => void;
  onBackToSelection?: () => void;
  onClose: () => void;
}

function getStatusBadge(status?: ChapterStatus) {
  switch (status) {
    case 'InProduction':
      return { label: 'Đang sản xuất', className: 'bg-stone-100 text-stone-600 border-stone-200' };
    case 'Approved':
      return { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'Locked':
      return { label: 'Đã khóa', className: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'Published':
      return { label: 'Xuất bản', className: 'bg-purple-50 text-purple-700 border-purple-200' };
    default:
      return { label: 'Đang sản xuất', className: 'bg-stone-100 text-stone-600 border-stone-200' };
  }
}

/** Ngăn kéo danh sách chương (Side Tab) cho phép chuyển chương nhanh trong Studio kịch bản */
export const ScriptChaptersDrawer: React.FC<ScriptChaptersDrawerProps> = ({
  chapters,
  selectedChapterId,
  onSelectChapter,
  onBackToSelection,
  onClose,
}) => {
  const { t } = useTranslation('production');
  const [query, setQuery] = useState('');

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [chapters]);

  const filteredChapters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedChapters;

    return sortedChapters.filter((c) => {
      const numMatch = `ch ${c.chapterNumber} chương ${c.chapterNumber} ${c.chapterNumber}`.includes(q);
      const titleMatch = (c.title || '').toLowerCase().includes(q);
      return numMatch || titleMatch;
    });
  }, [sortedChapters, query]);

  return (
    <aside
      data-testid='script-chapters-drawer'
      className='w-[300px] shrink-0 bg-[#FCFBF8] border-r border-stone-200/80 flex flex-col z-20 animate-in slide-in-from-left-2 fade-in duration-150'
    >
      {/* Header */}
      <div className='flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200/80'>
        <div className='flex items-center gap-2 min-w-0'>
          <BookOpen className='w-4 h-4 text-[#C2410C] shrink-0' />
          <h2 className='font-serif text-base text-stone-900 truncate'>
            {t('scriptStudio.chapters.title', 'Danh Sách Chương')}
          </h2>
          <span className='px-1.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-stone-100 text-stone-600 shrink-0'>
            {chapters.length}
          </span>
        </div>

        <div className='flex items-center gap-1 shrink-0'>
          {onBackToSelection && (
            <button
              type='button'
              onClick={onBackToSelection}
              data-testid='back-to-chapter-selection-btn'
              title='Xem tất cả chương'
              className='p-1.5 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors'
            >
              <LayoutGrid className='w-4 h-4' />
            </button>
          )}
          <button
            type='button'
            onClick={onClose}
            title='Đóng ngăn kéo'
            aria-label='Đóng ngăn kéo'
            className='p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer transition-colors'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {/* Tìm kiếm chương */}
      {chapters.length > 3 && (
        <div className='px-3 pt-3'>
          <label className='relative block'>
            <Search className='w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5' />
            <input
              type='text'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid='chapter-search-input'
              placeholder='Tìm số hoặc tiêu đề chương…'
              className='w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-stone-200 bg-white outline-none focus:border-[#C2410C] transition-colors placeholder:text-stone-400'
            />
          </label>
        </div>
      )}

      {/* Danh sách chương */}
      <div className='flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar'>
        {chapters.length === 0 ? (
          <div className='text-sm text-stone-500 text-center py-12 px-4'>
            <p>Chưa có chương nào trong series.</p>
            {onBackToSelection && (
              <button
                type='button'
                onClick={onBackToSelection}
                className='mt-3 btn-cta-primary text-xs mx-auto'
              >
                <span>Quản lý chương</span>
              </button>
            )}
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className='text-xs text-stone-400 text-center py-8'>
            Không tìm thấy chương phù hợp với "{query}"
          </div>
        ) : (
          filteredChapters.map((chap) => {
            const isSelected = chap.id === selectedChapterId;
            const badge = getStatusBadge(chap.status);

            return (
              <button
                key={chap.id}
                type='button'
                data-testid={`chapter-item-${chap.id}`}
                onClick={() => onSelectChapter(chap.id)}
                className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer group ${
                  isSelected
                    ? 'bg-orange-50/70 border-orange-200 shadow-[inset_3px_0_0_#C2410C]'
                    : 'bg-white hover:bg-stone-50 border-stone-200/80 hover:border-stone-300'
                }`}
              >
                <div className='flex items-center justify-between gap-2 mb-1'>
                  <span className='font-mono text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5'>
                    <span>Chương {chap.chapterNumber}</span>
                    {isSelected && (
                      <Check className='w-3.5 h-3.5 text-[#C2410C]' />
                    )}
                  </span>
                  <div className='flex items-center gap-1'>
                    {chap.isScriptFrozen && (
                      <span title='Kịch bản đã đóng băng'>
                        <Lock className='w-3 h-3 text-stone-400' />
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className='font-serif text-sm font-semibold text-stone-900 truncate mb-1'>
                  {chap.title ? chap.title : `Chương ${chap.chapterNumber}`}
                </div>

                <div className='flex items-center gap-2 text-[11px] text-stone-400 font-mono'>
                  <span>{chap.scenesCount ?? 0} cảnh</span>
                  <span>•</span>
                  <span>{chap.pagesCount ?? 0} trang</span>
                  <span>•</span>
                  <span>v{chap.versionVector ?? 1}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

