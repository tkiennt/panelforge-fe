import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Check,
  Lock,
  LayoutGrid,
  Search,
  X,
  Clapperboard,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { ChapterDto, ChapterStatus } from '@/services/chapter.service';
import { SceneDto } from '@/services/scriptLine.service';
import { useTranslation } from '@/lib/i18n';

export interface ScriptChaptersDrawerProps {
  chapters: ChapterDto[];
  selectedChapterId?: string | null;
  onSelectChapter: (chapterId: string) => void;
  onBackToSelection?: () => void;
  onClose: () => void;
  scenes?: SceneDto[];
  selectedSceneId?: string | null;
  canEdit?: boolean;
  onSelectScene?: (scene: SceneDto) => void;
  onAddScene?: () => void;
  onRenameSelectedScene?: () => void;
  onDeleteScene?: (scene: SceneDto) => void;
  onDeleteChapter?: () => void;
}

function getStatusBadge(status?: ChapterStatus) {
  switch (status) {
    case 'PreProduction':
      return { label: 'Tiền kỳ', className: 'bg-stone-50 text-stone-700 border-stone-200' };
    case 'InProduction':
      return { label: 'Đang sản xuất', className: 'bg-stone-100 text-stone-600 border-stone-200' };
    case 'ChapterApproved':
      return {
        label: 'Đã nghiệm thu (Gate 3)',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'HandedOffAndPublished':
      return { label: 'Đã phát hành', className: 'bg-purple-50 text-purple-700 border-purple-200' };
    default:
      return { label: 'Tiền kỳ', className: 'bg-stone-50 text-stone-700 border-stone-200' };
  }
}

/** Ngăn kéo cấu trúc Chương → Cảnh (Tree View) cho phép điều hướng toàn bộ cấu trúc kịch bản */
export const ScriptChaptersDrawer: React.FC<ScriptChaptersDrawerProps> = ({
  chapters,
  selectedChapterId,
  onSelectChapter,
  onBackToSelection,
  onClose,
  scenes = [],
  selectedSceneId,
  canEdit = false,
  onSelectScene,
  onAddScene,
  onRenameSelectedScene,
  onDeleteScene,
  onDeleteChapter,
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
      const numMatch =
        `ch ${c.chapterNumber} chương ${c.chapterNumber} ${c.chapterNumber}`.includes(q);
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
          <span className='px-1.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-stone-100 text-stone-600 shrink-0'>
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
              <div
                key={chap.id}
                data-testid={`chapter-item-${chap.id}`}
                onClick={() => onSelectChapter(chap.id)}
                className={`w-full rounded-xl p-3 border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50/70 border-orange-200 shadow-[inset_3px_0_0_#C2410C]'
                    : 'bg-white hover:bg-stone-50 border-stone-200/80 hover:border-stone-300'
                }`}
              >
                <div
                  role='button'
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectChapter(chap.id);
                    }
                  }}
                >
                  <div className='flex items-center justify-between gap-2 mb-1'>
                    <span className='font-mono text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5'>
                      <span>Chương {chap.chapterNumber}</span>
                      {isSelected && <Check className='w-3.5 h-3.5 text-[#C2410C]' />}
                    </span>
                    <div className='flex items-center gap-1'>
                      {chap.isScriptFrozen && (
                        <span title='Kịch bản đã đóng băng'>
                          <Lock className='w-3 h-3 text-stone-400' />
                        </span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded border font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  <div className='font-serif text-sm font-semibold text-stone-900 truncate mb-1'>
                    {chap.title ? chap.title : `Chương ${chap.chapterNumber}`}
                  </div>

                  <div className='flex items-center gap-2 text-xs text-stone-500 font-mono'>
                    <span>{chap.scenesCount ?? 0} cảnh</span>
                    <span>•</span>
                    <span>{chap.pagesCount ?? 0} trang</span>
                    <span>•</span>
                    <span>v{chap.versionVector ?? 1}</span>
                  </div>
                </div>

                {/* Tree View: Danh sách Phân cảnh thuộc Chương đang chọn */}
                {isSelected && scenes && scenes.length > 0 && (
                  <div
                    data-testid='script-scenes-drawer'
                    className='mt-3 pt-2.5 border-t border-orange-200/80'
                  >
                    <div className='flex items-center justify-between mb-2 px-1'>
                      <span className='text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5'>
                        <Clapperboard className='w-3.5 h-3.5 text-[#C2410C]' />
                        <span>
                          {t('scriptStudio.scenes.title', 'Phân cảnh')} ({scenes.length})
                        </span>
                      </span>
                      <div className='flex items-center gap-1'>
                        {canEdit && onAddScene && (
                          <button
                            type='button'
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddScene();
                            }}
                            title={t('scriptStudio.scenes.add', 'Thêm phân cảnh')}
                            aria-label={t('scriptStudio.scenes.add', 'Thêm phân cảnh')}
                            className='p-1 rounded-md text-[#C2410C] hover:bg-orange-100 cursor-pointer'
                          >
                            <Plus className='w-3.5 h-3.5' />
                          </button>
                        )}
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                          }}
                          title='Đóng'
                          aria-label='Đóng'
                          className='p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer'
                        >
                          <X className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>

                    <ol className='space-y-1 pl-2 border-l-2 border-orange-200'>
                      {scenes.map((s) => {
                        const isSceneSelected = s.id === selectedSceneId;
                        return (
                          <li key={s.id}>
                            <div
                              className={`rounded-lg p-2 transition-colors cursor-pointer ${
                                isSceneSelected
                                  ? 'bg-orange-100/80 shadow-xs'
                                  : 'hover:bg-orange-50/50'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectScene?.(s);
                              }}
                            >
                              <div className='flex items-baseline justify-between gap-1.5'>
                                <span className='text-xs font-semibold text-stone-700 truncate'>
                                  {s.heading ||
                                    `${t('scriptStudio.scenes.scene', { n: s.sceneNumber })}: ${t('scriptStudio.scenes.untitled')}`}
                                </span>
                                <span className='text-xs text-stone-400 font-mono shrink-0'>
                                  {t('scriptStudio.scenes.lines', { count: s.scriptLinesCount })}
                                </span>
                              </div>
                              {s.summary && (
                                <p className='text-xs text-stone-500 line-clamp-1 mt-0.5'>
                                  {s.summary}
                                </p>
                              )}
                              {canEdit && isSceneSelected && (
                                <div className='flex items-center gap-2 mt-1.5 pt-1 border-t border-orange-200/60'>
                                  {onRenameSelectedScene && (
                                    <button
                                      type='button'
                                      data-testid='edit-scene-heading-btn'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onRenameSelectedScene();
                                      }}
                                      className='inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 cursor-pointer'
                                    >
                                      <Edit2 className='w-3 h-3' />
                                      <span>{t('scriptStudio.scenes.rename', 'Đổi tên')}</span>
                                    </button>
                                  )}
                                  {onDeleteScene && (
                                    <button
                                      type='button'
                                      data-testid={`delete-scene-${s.sceneNumber}-btn`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteScene(s);
                                      }}
                                      className='inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 cursor-pointer'
                                    >
                                      <Trash2 className='w-3 h-3' />
                                      <span>{t('scriptStudio.scenes.delete', 'Xoá')}</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
