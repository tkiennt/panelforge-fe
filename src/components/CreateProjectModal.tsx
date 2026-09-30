import React, { useState } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
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
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('WEBTOON');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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
          format,
        });
        if (created?.id) {
          createdId = created.id;
        }
      }
    } catch (err) {
      console.warn('Error creating series, fallback to local creation:', err);
    } finally {
      setIsSubmitting(false);
    }

    const newProject: MangaProject = {
      id: createdId,
      title: title.trim(),
      subtitle: `New ${format} Series`,
      arc: 'Arc 01',
      chapter: 1,
      format,
      status: 'In Production (0%)',
      progressPercent: 0,
      completedPages: 0,
      totalPages: 0,
      dueDate: 'TBD',
      daysLeft: 0,
      genres: ['General'],
      coverStyle: 'drifter',
      coverText: title.toUpperCase(),
      tagline: 'A new adventure begins.',
      lastUpdated: 'Just now',
      coverImage: 'https://placehold.co/400x600/171717/FFF?text=No+Cover',
    };

    onCreateProject(newProject);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200'>
      <div className='bg-white border border-zinc-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150'>
        {/* Modal Header */}
        <div className='px-5 py-3.5 bg-white border-b border-zinc-200 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center text-white font-bold text-xs tracking-tighter shadow-sm'>
              PF
            </div>
            <h2 className='font-display font-bold text-base text-zinc-900 tracking-tight'>
              Create New Series
            </h2>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-[#F3F1EB] flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className='p-6 space-y-5'>
          <div className='space-y-4'>
            {/* Series Name / Title */}
            <div>
              <label className='block text-xs font-bold text-zinc-900 mb-1.5'>
                Series Title <span className="text-red-500">*</span>
              </label>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. Cyberpunk 2077: Edgerunners'
                className='w-full px-3 py-2 bg-zinc-50 focus:bg-white rounded-lg border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 transition-all'
                required
              />
            </div>

            {/* Format Dropdown */}
            <div>
              <label className='block text-xs font-bold text-zinc-900 mb-1.5'>
                Format
              </label>
              <div className='relative'>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className='w-full px-3 py-2 bg-zinc-50 focus:bg-white rounded-lg border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-orange-500 appearance-none pr-8 cursor-pointer transition-all'
                >
                  <option value='WEBTOON'>WEBTOON</option>
                  <option value='MANGA'>MANGA</option>
                </select>
                <ChevronDown className='w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none' />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className='pt-3 border-t border-zinc-200 flex items-center justify-end gap-2.5'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='px-4 py-2 bg-white hover:bg-[#F3F1EB] border border-zinc-200 text-zinc-500 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSubmitting || !title.trim()}
              className='px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-sm transition-all cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Plus className='w-4 h-4' />
              <span>{isSubmitting ? 'Creating...' : 'Create Series'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

