import React from 'react';
import { BookOpen, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { ScriptLineItem } from './workspace.types';

interface ScriptReaderPanelProps {
  pageNumber: number;
  sceneTitle?: string;
  sceneSlugline?: string;
  lines: ScriptLineItem[];
  selectedPanelId?: string | null;
  onSelectPanel?: (panelId: string) => void;
  onAutoSync?: () => void;
  isSyncing?: boolean;
}

export const ScriptReaderPanel: React.FC<ScriptReaderPanelProps> = ({
  pageNumber,
  sceneTitle = 'CẢNH 1: MỞ ĐẦU',
  sceneSlugline = 'NGOẠI · CỔNG THÀNH · SÁNG',
  lines,
  selectedPanelId,
  onSelectPanel,
  onAutoSync,
  isSyncing = false,
}) => {
  return (
    <aside
      data-testid='writer-script-reader-panel'
      className='w-[340px] shrink-0 bg-[#FAF8F5] border-r border-stone-200 flex flex-col h-full overflow-hidden select-none'
    >
      {/* 1. Header Trang & Phân cảnh */}
      <div className='p-4 border-b border-stone-200/80 bg-[#F5F2EB]/50 shrink-0 space-y-1.5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <BookOpen className='w-4 h-4 text-orange-600' />
            <h2 className='text-xs font-bold uppercase tracking-wider text-stone-900'>
              Kịch bản Trang {pageNumber}
            </h2>
          </div>
          <span className='text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200/70 text-stone-700 font-semibold'>
            {lines.length} đoạn kịch bản
          </span>
        </div>

        {/* Scene Heading & Slugline */}
        <div className='pt-1'>
          <div className='font-serif font-bold text-stone-900 text-sm tracking-tight truncate'>
            {sceneTitle}
          </div>
          <div className='text-[10px] font-mono text-stone-500 uppercase tracking-wide truncate mt-0.5'>
            {sceneSlugline}
          </div>
        </div>
      </div>

      {/* 2. Script Manuscript Body (Văn bản kịch bản liền mạch chuẩn Writer's Studio) */}
      <div className='flex-1 overflow-y-auto custom-scrollbar p-3.5 space-y-2.5'>
        {lines.length === 0 ? (
          <div className='h-full flex flex-col items-center justify-center text-center p-6 text-stone-400'>
            <BookOpen className='w-8 h-8 stroke-[1.5] text-stone-300 mb-2' />
            <p className='text-xs font-serif italic'>Trang này chưa có nội dung kịch bản nào.</p>
          </div>
        ) : (
          lines.map((line) => {
            const isLinkedToSelectedPanel = Boolean(
              selectedPanelId && line.panelId === selectedPanelId,
            );

            return (
              <div
                key={line.id}
                onClick={() => line.panelId && onSelectPanel?.(line.panelId)}
                data-testid={`script-block-${line.id}`}
                className={`p-3 rounded-lg text-left transition-all duration-150 cursor-pointer relative group ${
                  isLinkedToSelectedPanel
                    ? 'border-l-4 border-orange-500 bg-orange-50/70 shadow-xs'
                    : 'border-l-4 border-transparent bg-white/70 hover:bg-white hover:shadow-2xs border border-stone-200/60'
                }`}
              >
                {/* Panel Association Badge ở góc phải */}
                <div className='absolute right-2.5 top-2.5 flex items-center gap-1'>
                  {line.panelId ? (
                    <span
                      title={`Được liên kết với Khung #${line.panelId.replace('panel-', '')}`}
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                        isLinkedToSelectedPanel
                          ? 'bg-orange-500 text-white shadow-2xs'
                          : 'bg-stone-100 text-stone-600 group-hover:bg-stone-200'
                      }`}
                    >
                      Khung #{line.panelId.replace('panel-', '')}
                    </span>
                  ) : (
                    <span
                      title='Chưa gán khung tranh'
                      className='text-[10px] font-mono text-stone-300'
                    >
                      —
                    </span>
                  )}
                </div>

                {/* Line Order Pill */}
                <div className='flex items-center gap-1.5 mb-1.5'>
                  <span className='text-[10px] font-mono font-semibold text-stone-400'>
                    #{line.lineOrder}
                  </span>
                  {line.cameraAngle && (
                    <span className='text-[9px] font-mono px-1 py-0.2 rounded bg-stone-100 text-stone-600 uppercase'>
                      {line.cameraAngle}
                    </span>
                  )}
                </div>

                {/* 1. Action / Stage Direction Block */}
                {line.stageDirection && (
                  <p className='text-xs text-stone-700 font-serif italic leading-relaxed pr-14'>
                    {line.stageDirection}
                  </p>
                )}

                {/* 2. Dialogue Block */}
                {line.dialogueText && (
                  <div className='mt-2 space-y-1 pr-4'>
                    {line.characterName && (
                      <div className='flex items-center gap-1.5'>
                        <span
                          className='w-2 h-2 rounded-full shrink-0'
                          style={{ backgroundColor: line.characterColor || '#F97316' }}
                        />
                        <span className='text-[11px] font-bold text-stone-900 tracking-wide'>
                          {line.characterName}
                        </span>
                      </div>
                    )}
                    <p className='text-xs text-stone-900 font-sans leading-relaxed pl-3 border-l-2 border-stone-300/80'>
                      "{line.dialogueText}"
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Interactive Sync Action */}
      <div className='p-3 border-t border-stone-200 bg-[#F5F2EB]/80 shrink-0'>
        <button
          type='button'
          data-testid='auto-sync-script-dialogue-btn'
          onClick={onAutoSync}
          disabled={isSyncing || lines.length === 0}
          className='w-full py-2 px-3 bg-white hover:bg-orange-50/60 active:bg-orange-100/80 border border-stone-300 hover:border-orange-400 text-stone-800 hover:text-orange-700 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSyncing ? (
            <>
              <RefreshCw className='w-3.5 h-3.5 animate-spin text-orange-600' />
              <span>Đang đồng bộ khung...</span>
            </>
          ) : (
            <>
              <Sparkles className='w-3.5 h-3.5 text-orange-600' />
              <span>Tự động đồng bộ khung với thoại</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
