// src/roles/writer/components/script/flow/writesolo/SeriesBibleContextSidebar.tsx
import React, { useState } from 'react';
import {
  BookOpen,
  User,
  MapPin,
  Sparkles,
  Plus,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Layers,
  X,
  Search,
  Filter,
} from 'lucide-react';
import { BibleEntryDto } from '@/services/bible.service';
import { DetectedEntityInfo } from './writeSoloExtensions';

interface SeriesBibleContextSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  detectedEntities: DetectedEntityInfo[];
  allBibleEntries: BibleEntryDto[];
  currentPageNumber?: number;
  currentPanelNumber?: number;
  onCreateStub?: (name: string, tempCode: string) => void;
  onOpenInBible?: (codeOrId: string) => void;
}

export const SeriesBibleContextSidebar: React.FC<SeriesBibleContextSidebarProps> = ({
  isOpen,
  onClose,
  detectedEntities,
  allBibleEntries,
  currentPageNumber = 1,
  currentPanelNumber = 1,
  onCreateStub,
  onOpenInBible,
}) => {
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  // Lọc entity theo Scope và Search Query
  const filteredEntities = detectedEntities.filter((item) => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const registeredEntities = filteredEntities.filter((e) => e.isRegistered);
  const unregisteredEntities = filteredEntities.filter((e) => !e.isRegistered);

  return (
    <aside className='w-[340px] shrink-0 border-l border-[#E7E7E7] bg-white flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200 select-none'>
      {/* 1. Header */}
      <div className='p-3.5 border-b border-[#E7E7E7] bg-[#FAF8F5] flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 rounded-lg bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center border border-[#E11D48]/20'>
            <BookOpen className='w-4 h-4' />
          </div>
          <div>
            <h3 className='font-sans text-xs font-bold text-[#171717] uppercase tracking-wider flex items-center gap-1.5'>
              Series Bible
              <span className='px-1.5 py-0.2 rounded-full bg-[#E11D48] text-white text-[10px] font-mono'>
                {registeredEntities.length}
              </span>
            </h3>
            <p className='text-[11px] text-[#737373]'>Nhận diện thực thể tự động</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className='p-1 text-[#737373] hover:text-[#171717] hover:bg-stone-200/50 rounded-md transition-colors cursor-pointer'
          title='Đóng thanh tra cứu'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* 2. Scope Filter Toggle */}
      <div className='p-2.5 border-b border-[#E7E7E7] bg-white flex items-center gap-1.5'>
        <button
          onClick={() => setScope('current')}
          className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            scope === 'current'
              ? 'bg-[#171717] text-white shadow-2xs'
              : 'text-[#737373] hover:bg-stone-100'
          }`}
        >
          <Layers className='w-3.5 h-3.5' />
          Khung {currentPageNumber}.{currentPanelNumber}
        </button>
        <button
          onClick={() => setScope('all')}
          className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            scope === 'all'
              ? 'bg-[#171717] text-white shadow-2xs'
              : 'text-[#737373] hover:bg-stone-100'
          }`}
        >
          Toàn chương ({detectedEntities.length})
        </button>
      </div>

      {/* 3. Search Bar */}
      <div className='px-3 py-2 border-b border-[#E7E7E7] bg-[#FAF8F5]/60'>
        <div className='relative'>
          <Search className='w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2' />
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Tìm trong các thực thể phát hiện...'
            className='w-full pl-8 pr-3 py-1 bg-white border border-[#E7E7E7] rounded-md text-xs text-[#171717] outline-none focus:border-[#C2410C]'
          />
        </div>
      </div>

      {/* 4. Entity List Area */}
      <div className='flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar bg-[#FAF8F5]/30'>
        {/* Section 4A: Chưa đăng ký (Unregistered - Write First, Bible Later) */}
        {unregisteredEntities.length > 0 && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider px-1'>
              <span className='flex items-center gap-1.5'>
                <Sparkles className='w-3.5 h-3.5 text-amber-600' />
                Nhân vật mới phát hiện ({unregisteredEntities.length})
              </span>
            </div>

            <div className='space-y-2'>
              {unregisteredEntities.map((ent) => (
                <div
                  key={ent.name}
                  className='p-2.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 flex items-center justify-between gap-2 shadow-2xs'
                >
                  <div className='min-w-0'>
                    <div className='font-mono font-bold text-xs text-amber-950 truncate'>
                      {ent.name}
                    </div>
                    <div className='text-[10px] text-amber-700/80'>Chưa có trong Series Bible</div>
                  </div>

                  <button
                    onClick={() => {
                      const tempCode = `CHAR_TEMP_${ent.name.toUpperCase().replace(/\s+/g, '_')}`;
                      onCreateStub?.(ent.name, tempCode);
                    }}
                    className='shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer'
                  >
                    <Plus className='w-3 h-3' />
                    Tạo Stub
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4B: Thực thể đã đăng ký Canon */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-xs font-bold text-stone-500 uppercase tracking-wider px-1'>
            <span>Thực thể Canon đã khớp ({registeredEntities.length})</span>
          </div>

          {registeredEntities.length === 0 ? (
            <div className='p-6 text-center border border-dashed border-[#E7E7E7] rounded-xl bg-white text-[#737373] text-xs'>
              Chưa phát hiện nhân vật hoặc địa danh nào trong ngữ cảnh hiện tại.
            </div>
          ) : (
            registeredEntities.map((ent) => {
              const bible = ent.bibleEntry;
              const isLocation = ent.category === 'Location';
              const eraBadge =
                bible?.effectiveRevision?.stageName || 'v1.0 Canon Locked • Ch. 1–14';

              return (
                <div
                  key={ent.name}
                  onClick={() => bible?.id && onOpenInBible?.(bible.id)}
                  className='p-3 rounded-xl border border-[#E7E7E7] bg-white hover:border-[#C2410C]/50 hover:shadow-xs transition-all cursor-pointer group'
                >
                  <div className='flex items-start gap-2.5 mb-2'>
                    {bible?.referenceImageUrl ? (
                      <img
                        src={bible.referenceImageUrl}
                        alt={ent.name}
                        className='w-9 h-9 rounded-lg object-cover border border-[#E7E7E7] shrink-0'
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                          isLocation
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-[#FFF1F2] text-[#E11D48] border-[#E11D48]/30'
                        }`}
                      >
                        {isLocation ? (
                          <MapPin className='w-4 h-4' />
                        ) : (
                          <User className='w-4 h-4' />
                        )}
                      </div>
                    )}

                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center justify-between gap-1'>
                        <span className='font-sans font-bold text-xs text-[#171717] group-hover:text-[#C2410C] transition-colors truncate'>
                          {ent.name}
                        </span>
                        <ExternalLink className='w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0' />
                      </div>
                      <div className='text-[10px] font-mono text-[#737373] truncate'>
                        {bible?.code || ent.category}
                      </div>
                    </div>
                  </div>

                  {/* BR-15 Chapter-Scoped Era Badge */}
                  <div className='flex items-center gap-1.5 pt-1.5 border-t border-stone-100 text-[10px] text-stone-500'>
                    <ShieldCheck className='w-3.5 h-3.5 text-emerald-600 shrink-0' />
                    <span className='truncate font-medium'>{eraBadge}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
};
