import React, { useState } from 'react';
import { User, Search, X, BookOpen } from 'lucide-react';
import { BibleEntryDto } from '@/services/bible.service';

interface BibleCharactersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characters: BibleEntryDto[];
}

export const BibleCharactersDrawer: React.FC<BibleCharactersDrawerProps> = ({
  isOpen,
  onClose,
  characters,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = characters.filter((c) =>
    searchQuery
      ? c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true,
  );

  return (
    <div className='w-full xl:w-[400px] 2xl:w-[440px] shrink-0 border-l border-[#D8D2C5] bg-[#FCFBF8] flex flex-col h-full shadow-lg z-20 animate-in slide-in-from-right duration-200'>
      {/* Drawer Header */}
      <div className='p-4 border-b border-[#D8D2C5] bg-[#F8F6F0] flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5 min-w-0'>
          <div className='p-2 bg-[#FFF2E6] text-[#C2410C] rounded-xl shrink-0 border border-[#F97316]/20'>
            <User className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm font-bold text-[#1C1917] truncate font-serif'>
              Nhân vật Series Bible ({characters.length})
            </h3>
            <p className='text-xs text-[#57534E] truncate'>
              Danh sách nhân vật Canon đối chiếu kịch bản
            </p>
          </div>
        </div>

        <button
          type='button'
          onClick={onClose}
          className='p-1.5 text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] rounded-lg cursor-pointer transition-colors'
          title='Đóng'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* Search Input */}
      {characters.length > 2 && (
        <div className='p-3 border-b border-[#D8D2C5] bg-[#F8F6F0]/60'>
          <div className='relative'>
            <Search className='w-3.5 h-3.5 text-[#57534E] absolute left-3 top-2.5' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Tìm kiếm nhân vật...'
              className='w-full pl-8 pr-3 py-1.5 text-xs border border-[#D8D2C5] rounded-xl outline-none focus:border-[#F97316] bg-[#FCFBF8] text-[#1C1917]'
            />
          </div>
        </div>
      )}

      {/* Characters List */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#F3F0E9]'>
        {filtered.length === 0 ? (
          <div className='p-8 text-center text-[#57534E] border border-dashed border-[#D8D2C5] rounded-2xl bg-[#FCFBF8]'>
            <User className='w-8 h-8 text-[#57534E]/40 mx-auto mb-2' />
            <p className='text-xs font-semibold text-[#1C1917]'>
              {searchQuery
                ? 'Không tìm thấy nhân vật nào phù hợp.'
                : 'Chưa có nhân vật nào trong Series Bible.'}
            </p>
          </div>
        ) : (
          filtered.map((char) => (
            <div
              key={char.id}
              className='p-3.5 rounded-2xl border border-[#D8D2C5] bg-[#FCFBF8] hover:border-[#F97316]/60 transition-all text-left flex items-start gap-3 shadow-2xs hover:shadow-xs'
            >
              <div className='w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs'>
                {char.name.charAt(0).toUpperCase()}
              </div>
              <div className='min-w-0 flex-1'>
                <div className='text-xs md:text-sm font-bold text-[#1C1917] truncate'>
                  {char.name}
                </div>
                {char.subtitle && (
                  <div className='text-xs text-[#C2410C] font-mono truncate font-semibold'>
                    {char.subtitle}
                  </div>
                )}
                {char.description && (
                  <p className='text-xs text-[#57534E] line-clamp-2 mt-1 leading-snug break-words'>
                    {char.description}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
