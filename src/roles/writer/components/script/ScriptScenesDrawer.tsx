import React, { useState } from 'react';
import { Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import { SceneDto } from '@/services/scriptLine.service';
import { useTranslation } from '@/lib/i18n';

interface ScriptScenesDrawerProps {
  scenes: SceneDto[];
  selectedSceneId?: string | null;
  canEdit: boolean;
  onSelect: (scene: SceneDto) => void;
  onAdd: () => void;
  onRenameSelected: () => void;
  onDelete: (scene: SceneDto) => void;
  onClose: () => void;
  /** Chỉ Producer: xoá chương đang mở */
  onDeleteChapter?: () => void;
}

/** Ngăn kéo danh sách phân cảnh, mở từ thanh biểu tượng như ngăn kéo của Bàn vẽ. */
export const ScriptScenesDrawer: React.FC<ScriptScenesDrawerProps> = ({
  scenes,
  selectedSceneId,
  canEdit,
  onSelect,
  onAdd,
  onRenameSelected,
  onDelete,
  onClose,
  onDeleteChapter,
}) => {
  const { t } = useTranslation('production');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = scenes.filter(
    (s) => !q || `${s.sceneNumber} ${s.heading ?? ''} ${s.summary ?? ''}`.toLowerCase().includes(q),
  );

  return (
    <aside
      data-testid='script-scenes-drawer'
      className='w-[280px] shrink-0 bg-[#FCFBF8] border-r border-stone-200/80 flex flex-col z-20 animate-in slide-in-from-left-2 fade-in duration-150'
    >
      <div className='flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-200/80'>
        <h2 className='font-serif text-base text-stone-900'>{t('scriptStudio.scenes.title')}</h2>
        <div className='flex items-center gap-1'>
          {canEdit && (
            <button
              type='button'
              onClick={onAdd}
              title={t('scriptStudio.scenes.add')}
              aria-label={t('scriptStudio.scenes.add')}
              className='p-1.5 rounded-lg text-[#C2410C] hover:bg-orange-50 cursor-pointer'
            >
              <Plus className='w-4 h-4' />
            </button>
          )}
          <button
            type='button'
            onClick={onClose}
            title={t('scriptStudio.scenes.close')}
            aria-label={t('scriptStudio.scenes.close')}
            className='p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>
      </div>

      {scenes.length > 3 && (
        <div className='px-3 pt-3'>
          <label className='relative block'>
            <Search className='w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5' />
            <input
              type='text'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('scriptStudio.scenes.search')}
              className='w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-stone-200 bg-white outline-none focus:border-orange-400'
            />
          </label>
        </div>
      )}

      <ol className='flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar'>
        {scenes.length === 0 ? (
          <li className='text-sm text-stone-500 text-center py-10'>
            {t('scriptStudio.scenes.empty')}
            {canEdit && (
              <button
                type='button'
                onClick={onAdd}
                className='block mx-auto mt-2 font-semibold text-[#C2410C] hover:underline cursor-pointer'
              >
                {t('scriptStudio.scenes.add')}
              </button>
            )}
          </li>
        ) : (
          visible.map((s) => {
            const isSelected = s.id === selectedSceneId;
            return (
              <li key={s.id}>
                <div
                  className={`group rounded-lg px-3 py-2.5 transition-colors ${
                    isSelected
                      ? 'bg-orange-50 shadow-[inset_2px_0_0_#EA580C]'
                      : 'hover:bg-stone-100/70'
                  }`}
                >
                  <button
                    type='button'
                    onClick={() => onSelect(s)}
                    className='w-full text-left cursor-pointer'
                  >
                    <span className='flex items-baseline justify-between gap-2'>
                      <span className='text-xs font-semibold uppercase tracking-[0.12em] text-stone-500'>
                        {t('scriptStudio.scenes.scene', { n: s.sceneNumber })}
                      </span>
                      <span className='text-xs text-stone-400 font-mono'>
                        {t('scriptStudio.scenes.lines', { count: s.scriptLinesCount })}
                      </span>
                    </span>
                    <span className='block font-serif text-[15px] text-stone-900 truncate mt-0.5'>
                      {s.heading || t('scriptStudio.scenes.untitled')}
                    </span>
                    {s.summary && (
                      <span className='block text-xs text-stone-500 line-clamp-2 mt-0.5'>
                        {s.summary}
                      </span>
                    )}
                  </button>

                  {canEdit && isSelected && (
                    <div className='flex items-center gap-1 mt-2 -ml-2'>
                      <button
                        type='button'
                        data-testid='edit-scene-heading-btn'
                        onClick={onRenameSelected}
                        className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-stone-600 hover:text-stone-900 hover:bg-white cursor-pointer'
                      >
                        <Edit2 className='w-3.5 h-3.5' /> {t('scriptStudio.scenes.rename')}
                      </button>
                      {scenes.length > 1 && (
                        <button
                          type='button'
                          data-testid={`delete-scene-${s.sceneNumber}-btn`}
                          onClick={() => onDelete(s)}
                          className='inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-rose-600 hover:bg-rose-50 cursor-pointer'
                        >
                          <Trash2 className='w-3.5 h-3.5' /> {t('scriptStudio.scenes.delete')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ol>

      {onDeleteChapter && (
        <div className='p-3 border-t border-stone-200/80'>
          <button
            type='button'
            data-testid='delete-current-chapter-btn'
            onClick={onDeleteChapter}
            className='w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer'
          >
            <Trash2 className='w-3.5 h-3.5' /> {t('scriptStudio.scenes.deleteChapter')}
          </button>
        </div>
      )}
    </aside>
  );
};
