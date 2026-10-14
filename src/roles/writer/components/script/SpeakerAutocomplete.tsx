import React, { useState, useRef, useEffect } from 'react';
import { User, Plus } from 'lucide-react';
import { BibleEntity } from '@/types';

interface SpeakerAutocompleteProps {
  value: string;
  onChange: (speakerId: string) => void;
  mockEntities: BibleEntity[];
  onAddNew: () => void;
}

export const SpeakerAutocomplete: React.FC<SpeakerAutocompleteProps> = ({
  value,
  onChange,
  mockEntities,
  onAddNew,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const characters = mockEntities.filter((e) => String(e.category).toLowerCase() === 'character');
  const selectedChar = characters.find((c) => c.id === value);
  const displayValue = selectedChar ? selectedChar.name : value;

  const filtered = characters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='relative w-full max-w-[200px]' ref={wrapperRef}>
      <div
        className={`flex items-center gap-2 px-2 py-1 rounded-md border cursor-pointer transition-colors ${isOpen ? 'border-[#F97316] bg-[#FFF7ED]' : 'border-transparent hover:bg-[#F3F3F3]'}`}
        onClick={() => setIsOpen(true)}
      >
        <User className={`w-3.5 h-3.5 ${selectedChar ? 'text-[#171717]' : 'text-[#A3A3A3]'}`} />
        <span
          className={`text-[11px] font-mono font-semibold uppercase truncate ${selectedChar ? 'text-[#171717]' : 'text-[#A3A3A3]'}`}
        >
          {displayValue || 'Select Speaker...'}
        </span>
      </div>

      {isOpen && (
        <div className='absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-[#E7E7E7] z-50 overflow-hidden animate-in slide-in-from-top-1 duration-150'>
          <div className='p-2 border-b border-[#E7E7E7]'>
            <input
              type='text'
              autoFocus
              className='w-full text-xs px-2 py-1.5 outline-none bg-[#F3F3F3] rounded border border-transparent focus:border-[#F97316]/50 focus:bg-white transition-colors'
              placeholder='Search characters...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className='max-h-48 overflow-y-auto custom-scrollbar p-1'>
            {filtered.length > 0 ? (
              filtered.map((char) => (
                <div
                  key={char.id}
                  className='px-3 py-2 text-xs hover:bg-[#F3F3F3] rounded-md cursor-pointer flex items-center justify-between group'
                  onClick={() => {
                    onChange(char.id);
                    setIsOpen(false);
                  }}
                >
                  <span className='font-semibold text-[#171717]'>{char.name}</span>
                  <span className='text-[10px] text-[#A3A3A3] font-mono opacity-0 group-hover:opacity-100 transition-opacity'>
                    Select
                  </span>
                </div>
              ))
            ) : (
              <div className='px-3 py-4 text-center text-xs text-[#737373]'>
                No characters found.
              </div>
            )}
          </div>
          <div className='p-1 border-t border-[#E7E7E7] bg-[#FAF8F4]'>
            <button
              className='w-full px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[#F97316] hover:bg-[#FFF7ED] rounded-md transition-colors'
              onClick={() => {
                setIsOpen(false);
                onAddNew();
              }}
            >
              <Plus className='w-3.5 h-3.5' />
              New Character
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
