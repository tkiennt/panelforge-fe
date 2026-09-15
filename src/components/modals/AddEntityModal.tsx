import React, { useState } from 'react';
import { X, Plus, Sparkles, BookOpen } from 'lucide-react';
import { BibleEntity, BibleCategory } from '../../types';

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (entity: BibleEntity) => void;
  onShowToast: (title: string, desc: string) => void;
}

export const AddEntityModal: React.FC<AddEntityModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<BibleCategory>('characters');
  const [description, setDescription] = useState('');
  const [loraWeight, setLoraWeight] = useState(0.85);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    const newEntity: BibleEntity = {
      id: `entity-${Date.now()}`,
      code: `#ENT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      subtitle: subtitle.trim() || 'Canon Spec Entity',
      category: category,
      tags: ['CANON V4.2', category.toUpperCase(), 'CHAPTER 5'],
      description: description.trim(),
      referencesCount: 1,
      loraWeight: Number(loraWeight),
      modelVersion: 'LoRA v4.2',
      continuityMatch: 99.2,
      imageUrl:
        category === 'locations'
          ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRF-X_pK-VNA-EDpW2TbENZXn5jBdsCJEViFUEfD1-cL_s6PpvrNV7Br-yvSJJP7XpLx-Q6po_dSRvBycNhUkNoZrpxI6pCLfmSiu3GY9sfOpdOlnvjkYYCL0y61ttCJ5fLSmT1ICs8y7G9Q6Y5MOdvUJxx1VFnqyY8qN7YBUINiyVOxDKYSL905nG_GxVijlasleWGD3OZipKscljZThMLHG09TocsEdeAvvhlPimteBhQD9Wacq_qA'
          : 'https://lh3.googleusercontent.com/aida-public/AB6AXuDEZ45g-B7n7a9w-eMhQz9J4z8aBw8a8fG6a7eA6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1',
      status: 'Verified',
      colors: ['#171717', '#F97316', '#FFFFFF'],
    };

    onAdd(newEntity);
    onShowToast(
      'Entity Registered',
      `${newEntity.name} added to Series Bible and LoRA continuity matrix.`,
    );
    onClose();
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <BookOpen className='w-4 h-4 text-[#F97316]' />
            <h3 className='font-display font-bold text-base text-[#171717]'>
              Add Series Bible Entity
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
              Entity Name
            </label>
            <input
              type='text'
              required
              placeholder='e.g. Zor (Cybernetic Renegade)'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            />
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div>
              <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                Role / Subtitle
              </label>
              <input
                type='text'
                placeholder='e.g. Key Operative'
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
              />
            </div>

            <div>
              <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BibleCategory)}
                className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
              >
                <option value='characters'>Characters</option>
                <option value='locations'>Locations</option>
                <option value='cyberware'>Cyberware &amp; Props</option>
                <option value='lore'>Lore &amp; Factions</option>
                <option value='style'>Style Guide</option>
              </select>
            </div>
          </div>

          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
              Canon Description &amp; Visual Rules
            </label>
            <textarea
              required
              rows={3}
              placeholder='Detail mechanical dimensions, costume turnarounds, cyberware specs, and personality markers...'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            ></textarea>
          </div>

          <div>
            <div className='flex items-center justify-between text-xs font-mono mb-1'>
              <span className='text-[#888888] uppercase'>LoRA Enforcement Weight</span>
              <strong className='text-[#6D28D9]'>{loraWeight}</strong>
            </div>
            <input
              type='range'
              min='0.4'
              max='1.0'
              step='0.05'
              value={loraWeight}
              onChange={(e) => setLoraWeight(parseFloat(e.target.value))}
              className='w-full accent-[#F97316]'
            />
          </div>

          <div className='pt-2 flex items-center justify-between'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer'
            >
              Add to Series Bible
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
