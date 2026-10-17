import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, User, MapPin, Box, Paintbrush } from 'lucide-react';
import { bibleService, BibleEntryDto } from '@/services/bible.service';

export const BibleReferencePanel: React.FC = () => {
  const { seriesId } = useParams<{ seriesId?: string }>();
  const [activeTab, setActiveTab] = useState<'character' | 'location' | 'prop' | 'style'>(
    'character',
  );
  const [entries, setEntries] = useState<BibleEntryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!seriesId) return;
    setLoading(true);
    bibleService
      .getSeriesBible(seriesId)
      .then((res) => {
        setEntries(res.entries || []);
      })
      .catch((err) => {
        console.error('Failed to load Bible entries:', err);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, [seriesId]);

  const handleDragStart = (e: React.DragEvent, entity: BibleEntryDto) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'bible', data: entity }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getFiltered = () => {
    switch (activeTab) {
      case 'character':
        return entries.filter(
          (e) => String(e.category).toLowerCase() === 'character' || e.category === 0,
        );
      case 'location':
        return entries.filter(
          (e) => String(e.category).toLowerCase() === 'location' || e.category === 1,
        );
      case 'prop':
        return entries.filter(
          (e) => String(e.category).toLowerCase() === 'prop' || e.category === 2,
        );
      case 'style':
        return entries.filter(
          (e) =>
            String(e.category).toLowerCase() === 'stylerule' ||
            String(e.category).toLowerCase() === 'style' ||
            e.category === 4,
        );
      default:
        return [];
    }
  };

  const tabs = [
    { id: 'character', icon: User, label: 'Chars' },
    { id: 'location', icon: MapPin, label: 'Locs' },
    { id: 'prop', icon: Box, label: 'Props' },
    { id: 'style', icon: Paintbrush, label: 'Style' },
  ];

  return (
    <div className='w-64 bg-white border-r border-[#E7E7E7] flex flex-col h-full shrink-0'>
      <div className='p-4 border-b border-[#E7E7E7] bg-[#FAF8F4] flex items-center gap-2'>
        <BookOpen className='w-4 h-4 text-[#8B5CF6]' />
        <h3 className='text-sm font-semibold text-[#171717] font-heading'>Series Bible</h3>
      </div>

      <div className='flex border-b border-[#E7E7E7] bg-white'>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 flex justify-center items-center p-2 text-xs transition-colors ${
              activeTab === t.id
                ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6] bg-[#F5F3FF]'
                : 'text-[#A3A3A3] hover:text-[#525252] hover:bg-[#F3F3F3]'
            }`}
            title={t.label}
          >
            <t.icon className='w-4 h-4' />
          </button>
        ))}
      </div>

      <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-[#F3F3F3]'>
        <div className='text-[10px] text-[#A3A3A3] uppercase font-mono font-bold text-center tracking-wider mb-2'>
          Drag to Canvas
        </div>

        {getFiltered().map((entity) => (
          <div
            key={entity.id}
            draggable
            onDragStart={(e) => handleDragStart(e, entity)}
            className='bg-white p-3 rounded-lg border border-[#E7E7E7] shadow-sm cursor-grab active:cursor-grabbing hover:border-[#8B5CF6] hover:shadow-md transition-all group'
          >
            <div className='flex items-start gap-3'>
              <div className='w-10 h-10 rounded bg-[#F3F3F3] flex items-center justify-center text-[#A3A3A3] shrink-0 border border-dashed border-[#B8B8B8] group-hover:border-[#D8B4FE] group-hover:bg-[#F5F3FF]'>
                <User className='w-5 h-5 group-hover:text-[#8B5CF6]' />
              </div>
              <div>
                <h4 className='text-xs font-semibold text-[#171717] leading-tight'>
                  {entity.name}
                </h4>
                <p className='text-[10px] text-[#737373] mt-1 line-clamp-2 leading-snug'>
                  {entity.description}
                </p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className='text-center text-xs text-[#A3A3A3] p-4'>Đang tải Series Bible...</div>
        )}
        {!loading && getFiltered().length === 0 && (
          <div className='text-center text-xs text-[#A3A3A3] p-4'>Chưa có dữ liệu</div>
        )}
      </div>
    </div>
  );
};
