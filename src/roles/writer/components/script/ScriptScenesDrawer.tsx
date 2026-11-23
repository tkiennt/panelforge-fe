import React, { useState } from 'react';
import {
  Clapperboard,
  Edit2,
  PanelLeftClose,
  Plus,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { SceneDto } from '@/services/scriptLine.service';
import { useTranslation } from '@/lib/i18n';
import { parseScenePanelRange } from '../../utils/sceneUtils';

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

/**
 * Ngăn kéo danh sách phân cảnh (Scene Outline Sidebar) chuẩn giao diện Stitch Writer Studio
 */
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
      id='scene-outline-sidebar'
      data-testid='script-scenes-drawer'
      className='w-72 bg-[#FBF9F4] border-r border-[#E8E3DA] flex flex-col shrink-0 z-20 animate-in slide-in-from-left-2 fade-in duration-150 select-none'
    >
      <div className='p-3.5 border-b border-stone-200/80 flex items-start justify-between bg-white'>
        <div className='min-w-0 pr-2'>
          <div className='flex items-center gap-1.5'>
            <Clapperboard className='w-4 h-4 text-primary' />
            <h3 className='font-headline-sm text-[15px] font-bold text-stone-900 leading-tight'>
              {t('scriptStudio.scenes.title', 'Phân cảnh')}
            </h3>
          </div>
          <p className='text-xs text-stone-500 mt-0.5'>
            {t(
              'collaboration.writerStudio.sceneOutlineHint',
              'Ghi chú phân đoạn · Không ảnh hưởng logic',
            )}
          </p>
        </div>
        <div className='flex items-center gap-1 shrink-0'>
          {canEdit && (
            <button
              type='button'
              data-testid='add-scene-btn'
              onClick={onAdd}
              title={t('scriptStudio.scenes.add', 'Thêm cảnh mới')}
              aria-label={t('scriptStudio.scenes.add', 'Thêm cảnh mới')}
              className='p-1 text-primary hover:bg-orange-50 rounded transition-colors cursor-pointer'
            >
              <Plus className='w-4 h-4' />
            </button>
          )}
          <button
            type='button'
            data-testid='close-scenes-drawer-btn'
            onClick={onClose}
            title={t('common.close', 'Đóng')}
            aria-label={t('common.close', 'Đóng')}
            className='p-1 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded transition-colors cursor-pointer'
          >
            <PanelLeftClose className='w-4 h-4' />
          </button>
        </div>
      </div>

      {scenes.length > 3 && (
        <div className='px-3 pt-3 bg-white/50'>
          <label className='relative block'>
            <Search className='w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5' />
            <input
              type='text'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('scriptStudio.scenes.search', 'Tìm phân cảnh...')}
              className='w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-stone-200 bg-white outline-none focus:border-primary text-stone-900 placeholder:text-stone-400'
            />
          </label>
        </div>
      )}

      <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar'>
        {scenes.length === 0 ? (
          <div className='text-xs text-stone-500 text-center py-10 bg-white rounded-xl border border-dashed border-stone-200 p-4'>
            <p>{t('scriptStudio.scenes.empty', 'Chưa có phân cảnh nào.')}</p>
            {canEdit && (
              <button
                type='button'
                onClick={onAdd}
                className='block mx-auto mt-2 font-semibold text-primary hover:underline cursor-pointer'
              >
                {t('scriptStudio.scenes.add', 'Thêm phân cảnh')}
              </button>
            )}
          </div>
        ) : (
          visible.map((s) => {
            const isSelected = s.id === selectedSceneId;
            const rangeInfo = parseScenePanelRange(s.summary);
            const rangeLabel =
              rangeInfo.fromPanel && rangeInfo.toPanel
                ? rangeInfo.fromPanel === rangeInfo.toPanel
                  ? `Panel ${rangeInfo.fromPanel}`
                  : `Từ Panel ${rangeInfo.fromPanel} đến Panel ${rangeInfo.toPanel}`
                : t('collaboration.writerStudio.unassignedPages', 'Chưa gán trang');

            return (
              <div
                key={s.id}
                onClick={() => onSelect(s)}
                className={`bg-white rounded-xl p-3 shadow-xs transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected
                    ? 'border border-primary/40'
                    : 'border border-stone-200/80 hover:border-primary/40'
                }`}
              >
                {isSelected && <div className='absolute top-0 left-0 w-1 h-full bg-primary' />}
                <div className={`${isSelected ? 'pl-1.5' : ''} space-y-2`}>
                  <div className='flex items-center justify-between gap-1'>
                    <div className='flex items-center gap-1.5 min-w-0'>
                      <span className='px-1.5 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary border border-primary/20 shrink-0 font-mono'>
                        {t('collaboration.writerStudio.sceneNumber', { n: s.sceneNumber })}
                      </span>
                      <h4
                        className={`text-xs font-bold truncate transition-colors uppercase ${
                          isSelected ? 'text-primary' : 'text-stone-900 group-hover:text-primary'
                        }`}
                      >
                        {s.heading ||
                          t('collaboration.writerStudio.untitledScene', 'PHÂN ĐOẠN KHÔNG TÊN')}
                      </h4>
                    </div>

                    {canEdit && (
                      <div className='flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0'>
                        <button
                          type='button'
                          data-testid='edit-scene-heading-btn'
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(s);
                            onRenameSelected();
                          }}
                          title={t('scriptStudio.scenes.rename', 'Sửa tên cảnh')}
                          className='p-1 text-stone-400 hover:text-primary hover:bg-orange-50 rounded transition-colors cursor-pointer'
                        >
                          <Edit2 className='w-3.5 h-3.5' />
                        </button>
                        <button
                          type='button'
                          data-testid={`delete-scene-${s.sceneNumber}-btn`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(s);
                          }}
                          title={t('scriptStudio.scenes.delete', 'Xoá cảnh')}
                          className='p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className='flex flex-wrap items-center gap-2 text-xs text-stone-500'>
                    <span className='font-mono font-medium text-stone-900'>{rangeLabel}</span>
                    <span>•</span>
                    <span className='font-mono text-stone-500'>
                      {t('scriptStudio.scenes.lines', { count: s.scriptLinesCount })}
                    </span>
                  </div>

                  {rangeInfo.cleanSummary && (
                    <p className='text-xs text-stone-600 leading-relaxed line-clamp-2 bg-[#FAF9F5] p-2 rounded-lg border border-stone-200/80'>
                      {rangeInfo.cleanSummary}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}

        {canEdit && (
          <button
            type='button'
            data-testid='add-scene-dashed-btn'
            onClick={onAdd}
            className='w-full py-2.5 px-3 rounded-xl border border-dashed border-stone-300 hover:border-primary text-stone-500 hover:text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-white/60 shadow-xs cursor-pointer'
          >
            <PlusCircle className='w-4 h-4' />
            <span>{t('collaboration.writerStudio.addScene', '+ Thêm phân cảnh')}</span>
          </button>
        )}
      </div>

      {onDeleteChapter && (
        <div className='p-3 border-t border-stone-200/80 bg-white'>
          <button
            type='button'
            data-testid='delete-current-chapter-btn'
            onClick={onDeleteChapter}
            className='w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200/60 transition-colors cursor-pointer'
          >
            <Trash2 className='w-3.5 h-3.5' />
            <span>{t('scriptStudio.scenes.deleteChapter', 'Xoá chương này')}</span>
          </button>
        </div>
      )}
    </aside>
  );
};
