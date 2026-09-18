import React from 'react';
import { PanelItem, StageType } from '../../data/mockLayoutData';
import {
  Settings2,
  UploadCloud,
  Image as ImageIcon,
  RotateCcw,
  Clock,
  Maximize2,
} from 'lucide-react';

interface PanelPropertiesProps {
  panel: PanelItem | null;
  onUpdateStage: (id: string, stage: StageType) => void;
  onUploadArtwork: (id: string) => void;
  onRollback: (id: string, versionId: string) => void;
}

const STAGES: { value: StageType; label: string }[] = [
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'pencil', label: 'Pencil' },
  { value: 'ink', label: 'Ink' },
  { value: 'color', label: 'Color' },
  { value: 'letter', label: 'Lettering' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export const PanelProperties: React.FC<PanelPropertiesProps> = ({
  panel,
  onUpdateStage,
  onUploadArtwork,
  onRollback,
}) => {
  if (!panel) {
    return (
      <div className='w-80 bg-white border-l border-[#E7E7E7] flex flex-col h-full shrink-0 items-center justify-center text-center p-6'>
        <div className='w-12 h-12 bg-[#F3F3F3] rounded-full flex items-center justify-center mb-3'>
          <Settings2 className='w-6 h-6 text-[#A3A3A3]' />
        </div>
        <p className='text-sm font-semibold text-[#525252]'>No Panel Selected</p>
        <p className='text-xs text-[#A3A3A3] mt-1'>
          Select a panel on the canvas to view its properties and upload artwork.
        </p>
      </div>
    );
  }

  return (
    <div className='w-80 bg-white border-l border-[#E7E7E7] flex flex-col h-full shrink-0'>
      <div className='p-4 border-b border-[#E7E7E7] bg-[#FAF8F4] flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Settings2 className='w-4 h-4 text-[#525252]' />
          <h3 className='text-sm font-semibold text-[#171717] font-heading'>Panel Properties</h3>
        </div>
        <span className='text-[10px] font-mono font-bold bg-white px-2 py-0.5 border border-[#E7E7E7] shadow-sm rounded'>
          {panel.id}
        </span>
      </div>

      <div className='flex-1 overflow-y-auto custom-scrollbar'>
        {/* Basic Info */}
        <div className='p-4 border-b border-[#E7E7E7] space-y-4'>
          <div>
            <label className='block text-xs font-semibold text-[#525252] mb-1.5'>
              Current Stage
            </label>
            <select
              value={panel.stage}
              onChange={(e) => onUpdateStage(panel.id, e.target.value as StageType)}
              className='w-full text-sm bg-white border border-[#E7E7E7] rounded-md px-3 py-2 outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/20 transition-all font-medium'
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-xs font-semibold text-[#525252] mb-1.5'>Assignee</label>
            <div className='text-sm font-medium text-[#171717] bg-[#F3F3F3] px-3 py-2 rounded-md'>
              {panel.assignee}
            </div>
          </div>
        </div>

        {/* Artwork Upload Area */}
        <div className='p-4'>
          <h4 className='text-xs font-bold text-[#171717] uppercase tracking-wider mb-3'>
            Artwork Versions
          </h4>

          <div
            className='border-2 border-dashed border-[#B8B8B8] hover:border-[#F97316] hover:bg-[#FFF7ED] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors mb-6'
            onClick={() => onUploadArtwork(panel.id)}
          >
            <UploadCloud className='w-6 h-6 text-[#A3A3A3] mb-2' />
            <span className='text-xs font-semibold text-[#525252]'>
              Click or drag file to upload
            </span>
            <span className='text-[10px] text-[#A3A3A3] mt-1'>PNG, JPG, PSD (Max 50MB)</span>
          </div>

          {/* Version List */}
          <div className='space-y-3'>
            {panel.versions.map((v, idx) => {
              const isCurrent = v.id === panel.currentArtworkVersionId;

              return (
                <div
                  key={v.id}
                  className={`p-3 rounded-lg border transition-all group ${isCurrent ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-[#E7E7E7] bg-white hover:border-[#B8B8B8]'}`}
                >
                  <div className='flex items-start gap-3'>
                    {/* Thumbnail */}
                    <div className='w-12 h-16 bg-[#E7E7E7] rounded flex items-center justify-center shrink-0 border border-[#B8B8B8]/30 overflow-hidden relative group/thumb'>
                      {v.thumbnailUrl ? (
                        <img
                          src={v.thumbnailUrl}
                          alt='thumb'
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        <ImageIcon className='w-4 h-4 text-[#A3A3A3]' />
                      )}
                      <button className='absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity'>
                        <Maximize2 className='w-4 h-4' />
                      </button>
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-[11px] font-mono font-bold text-[#171717] uppercase tracking-wider'>
                          {v.id}
                        </span>
                        {isCurrent && (
                          <span className='text-[9px] font-mono font-bold bg-[#F97316] text-white px-1.5 rounded-sm uppercase tracking-wider'>
                            Current
                          </span>
                        )}
                      </div>

                      <div className='flex items-center gap-1.5 text-[10px] text-[#737373] mb-1 font-mono'>
                        <div className='w-3 h-3 rounded bg-[#525252] text-white flex items-center justify-center text-[7px] font-bold'>
                          {v.uploaderAvatar}
                        </div>
                        <span className='truncate'>{v.uploaderName}</span>
                      </div>

                      <div className='flex items-center gap-1.5 text-[10px] text-[#A3A3A3] font-mono mb-2'>
                        <Clock className='w-3 h-3' />
                        <span>
                          {new Date(v.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => onRollback(panel.id, v.id)}
                          className='flex items-center gap-1 text-[10px] font-semibold text-[#525252] hover:text-[#171717] bg-[#F3F3F3] hover:bg-[#E7E7E7] px-2 py-1 rounded transition-colors w-full justify-center opacity-0 group-hover:opacity-100'
                        >
                          <RotateCcw className='w-3 h-3' /> Set as Current
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {panel.versions.length === 0 && (
              <div className='text-center text-xs text-[#A3A3A3] py-4'>
                No versions uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
