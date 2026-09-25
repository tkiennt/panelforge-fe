import React, { useState, useRef } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Upload,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  Check,
} from 'lucide-react';
import { MangaProject } from '../types';
import { seriesService } from '../services/series.service';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (newProject: MangaProject) => void;
  workspaceId?: string;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  workspaceId,
}) => {
  const [title, setTitle] = useState('Cyberpunk 2077: Edgerunners');
  const [format, setFormat] = useState('B5 Tankōbon (600 DPI)');
  const [tags, setTags] = useState<string[]>(['Sci-Fi', 'Cyberpunk Noir']);
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [dueDate, setDueDate] = useState('Nov 28, 2025');
  const [selectedDay, setSelectedDay] = useState(28);
  const [currentMonth, setCurrentMonth] = useState('November 2025');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setDueDate(`Nov ${day < 10 ? '0' + day : day}, 2025`);
  };

  const handleQuickDate = (type: 'today' | '2wks' | '1mo') => {
    if (type === 'today') {
      setSelectedDay(15);
      setDueDate('Nov 15, 2025');
    } else if (type === '2wks') {
      setSelectedDay(29);
      setDueDate('Nov 29, 2025');
    } else {
      setSelectedDay(28);
      setCurrentMonth('December 2025');
      setDueDate('Dec 28, 2025');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    let createdId = `project-${Date.now()}`;

    try {
      const effectiveWsId =
        workspaceId ||
        (() => {
          try {
            const saved = localStorage.getItem('activeWorkspace');
            return saved ? JSON.parse(saved)?.id : undefined;
          } catch {
            return undefined;
          }
        })();

      if (effectiveWsId) {
        const created = await seriesService.createSeries(effectiveWsId, {
          title: title.trim(),
          synopsis: 'High-octane serialized manga production initialized via PanelForge AI Studio.',
          genre: tags.join(', '),
          format,
        });
        if (created?.id) {
          createdId = created.id;
        }
      }
    } catch (err) {
      console.warn('Lỗi khi gọi seriesService.createSeries, fallback sang local:', err);
    } finally {
      setIsSubmitting(false);
    }

    const newProject: MangaProject = {
      id: createdId,
      title: title.trim(),
      subtitle: `Studio Mappa • Arc 01 Pilot Episode`,
      arc: 'Arc 01: Pilot Edition',
      chapter: 1,
      format,
      status: 'In Production (0%)',
      progressPercent: 0,
      completedPages: 0,
      totalPages: 32,
      dueDate,
      daysLeft: 4,
      genres: tags.length > 0 ? tags : ['Sci-Fi', 'Action'],
      coverStyle: 'halftone-cyber',
      coverText: title.toUpperCase(),
      tagline: 'High-octane serialized manga production initialized via PanelForge AI Studio.',
      lastUpdated: 'Just now',
      coverImage:
        coverPreview ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDCN83560cOGR49r3erfCgnKKaEdU0_CmPncgfpr3QV2ogH_TYnPD4z1PYfLwJexShtfl9p0EKLHilGOYVFoLVrZUyQTyuOyrH0AP_FUrUwyvwkUvk8K3p7yTy1wI7wzkMLJjCgzfR5Bqbb4ZRwPaWZJ5Vgt66mLfNB6QGqv0CF4o6VwPCURuFKtDKLE-jOibIvwClUXeMLtzynkXFMdJMhLXCTyw-fXE6VF9-LJulNEOiBN9Op98vhkw',
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150'>
        {/* Modal Header */}
        <div className='px-5 py-3.5 bg-white border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-6 h-6 rounded-md bg-[#171717] flex items-center justify-center text-white font-bold text-xs tracking-tighter shadow-xs'>
              PF
            </div>
            <h2 className='font-display font-bold text-base text-[#171717] tracking-tight'>
              Setup New Manga Series / Project
            </h2>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-[#F3F1EB] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-colors cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className='p-6 space-y-5'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
            {/* Left Column: Details */}
            <div className='space-y-4'>
              {/* Series Name / Title */}
              <div>
                <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                  Series Name / Title
                </label>
                <input
                  type='text'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder='e.g. Cyberpunk 2077: Edgerunners'
                  className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#F97316] transition-all'
                  required
                />
              </div>

              {/* Series Format Standard */}
              <div>
                <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                  Series Format Standard
                </label>
                <div className='relative'>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs font-semibold text-[#171717] focus:outline-none focus:border-[#F97316] appearance-none pr-8 cursor-pointer transition-all'
                  >
                    <option value='B5 Tankōbon (600 DPI)'>B5 Tankōbon (600 DPI)</option>
                    <option value='Continuous Webtoon (800px)'>Continuous Webtoon (800px)</option>
                    <option value='Standard Folio (A4)'>Standard Folio (A4)</option>
                    <option value='Deluxe Tankōbon Master'>Deluxe Tankōbon Master</option>
                    <option value='US Comic Standard (600 DPI)'>US Comic Standard (600 DPI)</option>
                  </select>
                  <ChevronDown className='w-3.5 h-3.5 text-[#888888] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none' />
                </div>
              </div>

              {/* Genres & Themes */}
              <div>
                <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                  Genres &amp; Themes
                </label>
                <div className='flex flex-wrap items-center gap-1.5 p-2 bg-[#FAF8F4] rounded-lg border border-[#E7E7E7] min-h-[38px]'>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-[#171717] border border-[#E0DED7] text-[11px] font-medium shadow-2xs'
                    >
                      {tag}
                      <button
                        type='button'
                        onClick={() => handleRemoveTag(tag)}
                        className='text-[#888888] hover:text-[#171717] cursor-pointer'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    </span>
                  ))}

                  {isAddingTag ? (
                    <div className='flex items-center gap-1'>
                      <input
                        type='text'
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        autoFocus
                        placeholder='Tag...'
                        className='px-1.5 py-0.5 text-[11px] bg-white border border-[#F97316] rounded w-20 focus:outline-none'
                      />
                      <button
                        type='button'
                        onClick={handleAddTag}
                        className='text-[10px] px-1.5 py-0.5 bg-[#171717] text-white rounded cursor-pointer'
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => setIsAddingTag(true)}
                      className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-[#F97316] hover:bg-orange-50 border border-transparent hover:border-[#F97316]/30 transition-all cursor-pointer'
                    >
                      <Plus className='w-3 h-3' />
                      <span>Add Tag</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cover Art Dropzone */}
              <div>
                <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
                  Cover Art Dropzone
                </label>
                <input
                  type='file'
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept='image/*'
                  className='hidden'
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className='border-2 border-dashed border-[#E0DED7] hover:border-[#F97316] bg-[#FAF8F4] hover:bg-[#FFFBF5] rounded-xl p-4 text-center cursor-pointer transition-all group relative overflow-hidden'
                >
                  {coverPreview ? (
                    <div className='flex items-center gap-3'>
                      <img
                        src={coverPreview}
                        alt='Cover preview'
                        className='w-12 h-12 rounded-lg object-cover border border-[#E7E7E7]'
                      />
                      <div className='text-left'>
                        <div className='text-xs font-bold text-[#171717]'>Cover Uploaded</div>
                        <div className='text-[10px] text-[#F97316] font-semibold'>
                          Click to change cover
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center justify-center gap-1'>
                      <div className='w-8 h-8 rounded-full bg-white border border-[#E7E7E7] flex items-center justify-center text-[#888888] group-hover:text-[#F97316] shadow-2xs mb-0.5'>
                        <Upload className='w-4 h-4' />
                      </div>
                      <div className='text-xs text-[#555555]'>
                        Drag &amp; drop cover, or{' '}
                        <span className='text-[#F97316] font-semibold underline'>browse</span>
                      </div>
                      <div className='text-[10px] text-[#888888] font-mono'>
                        PNG, JPG up to 10MB (600 DPI)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Date & Interactive Calendar */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='block text-[10px] font-mono font-bold uppercase tracking-wider text-[#888888]'>
                  Publication / Ch. 1 Due Date
                </label>
                <span className='text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#EA580C] border border-[#FDBA74]/40'>
                  Calendar Active
                </span>
              </div>

              {/* Date Input field with Orange Border */}
              <div className='flex items-center gap-2 px-3 py-2 bg-white rounded-lg border-2 border-[#F97316] text-xs font-semibold text-[#171717] shadow-xs'>
                <CalendarIcon className='w-3.5 h-3.5 text-[#F97316]' />
                <span className='font-mono'>{dueDate}</span>
              </div>

              {/* Interactive Mini Calendar Picker */}
              <div className='bg-white border border-[#E7E7E7] rounded-xl p-3 shadow-2xs'>
                {/* Month Navigator Header */}
                <div className='flex items-center justify-between text-xs mb-2.5 pb-2 border-b border-[#F0EFEA]'>
                  <button
                    type='button'
                    onClick={() => {
                      setCurrentMonth('October 2025');
                      setDueDate('Oct 28, 2025');
                    }}
                    className='p-1 hover:bg-[#F3F1EB] rounded text-[#888888] hover:text-[#171717] cursor-pointer'
                  >
                    <ChevronLeft className='w-3.5 h-3.5' />
                  </button>
                  <span className='font-bold font-display text-xs text-[#171717]'>
                    {currentMonth}{' '}
                    <span className='text-[10px] font-mono font-normal text-[#888888]'>B5 Avg</span>
                  </span>
                  <button
                    type='button'
                    onClick={() => {
                      setCurrentMonth('December 2025');
                      setDueDate('Dec 28, 2025');
                    }}
                    className='p-1 hover:bg-[#F3F1EB] rounded text-[#888888] hover:text-[#171717] cursor-pointer'
                  >
                    <ChevronRight className='w-3.5 h-3.5' />
                  </button>
                </div>

                {/* Weekday Names */}
                <div className='grid grid-cols-7 text-center text-[10px] font-mono font-semibold text-[#888888] mb-1.5'>
                  <span>Su</span>
                  <span>Mo</span>
                  <span>Tu</span>
                  <span>We</span>
                  <span>Th</span>
                  <span>Fr</span>
                  <span>Sa</span>
                </div>

                {/* Day Grid */}
                <div className='grid grid-cols-7 text-center text-[11px] font-mono gap-y-1'>
                  {/* Previous month trailing days */}
                  {[26, 27, 28, 29, 30, 31].map((d) => (
                    <span key={`prev-${d}`} className='text-[#D1D5DB] py-1'>
                      {d}
                    </span>
                  ))}

                  {/* Current month days 1 to 30 */}
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                    const isSelected = day === selectedDay;
                    return (
                      <button
                        key={day}
                        type='button'
                        onClick={() => handleDayClick(day)}
                        className={`py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F97316] text-white font-bold shadow-xs'
                            : 'hover:bg-[#FAF8F4] text-[#171717]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Bottom Quick Actions */}
                <div className='flex items-center justify-between pt-3 mt-2 border-t border-[#F0EFEA] text-[10px] font-mono'>
                  <div className='flex items-center gap-1.5'>
                    <button
                      type='button'
                      onClick={() => handleQuickDate('today')}
                      className='px-2 py-0.5 rounded bg-[#FAF8F4] hover:bg-[#F3F1EB] text-[#555555] border border-[#E7E7E7] cursor-pointer'
                    >
                      Today
                    </button>
                    <button
                      type='button'
                      onClick={() => handleQuickDate('2wks')}
                      className='px-2 py-0.5 rounded bg-[#FAF8F4] hover:bg-[#F3F1EB] text-[#555555] border border-[#E7E7E7] cursor-pointer'
                    >
                      +2 Wks
                    </button>
                    <button
                      type='button'
                      onClick={() => handleQuickDate('1mo')}
                      className='px-2 py-0.5 rounded bg-[#FAF8F4] hover:bg-[#F3F1EB] text-[#555555] border border-[#E7E7E7] cursor-pointer'
                    >
                      +1 Mo
                    </button>
                  </div>
                  <span className='text-[#F97316] font-semibold'>
                    {Math.max(1, selectedDay - 24)} days to gate
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className='pt-3 border-t border-[#E7E7E7] flex items-center justify-end gap-2.5'>
            <button
              type='button'
              onClick={onClose}
              className='px-4 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] rounded-xl text-xs font-semibold transition-colors cursor-pointer'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-5 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5'
            >
              <Plus className='w-3.5 h-3.5' />
              <span>Create Series</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
