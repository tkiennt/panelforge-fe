import React, { useState } from 'react';
import { X, BookOpen, Calendar, Users, Layers, AlertCircle, Loader2 } from 'lucide-react';

export interface CreateChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (chapterData: ChapterFormData) => Promise<void>;
}

export interface ChapterFormData {
  chapterNumber: number;
  title: string;
  deadline: string;
  pipelineTemplate: string;
  primaryAssignee: string;
}

export const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<ChapterFormData>({
    chapterNumber: 1,
    title: '',
    deadline: '',
    pipelineTemplate: 'standard',
    primaryAssignee: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'chapterNumber' ? parseInt(value) || 0 : value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Chapter Title is required.');
      return;
    }
    if (formData.chapterNumber <= 0) {
      setError('Chapter Number must be a positive integer.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset and close on success
      setFormData({
        chapterNumber: formData.chapterNumber + 1,
        title: '',
        deadline: '',
        pipelineTemplate: 'standard',
        primaryAssignee: '',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create chapter. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto'>
      <div className='w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden transition-all'>
        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-zinc-200 bg-white'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center'>
              <BookOpen className='w-5 h-5 text-orange-600' />
            </div>
            <div>
              <h2 className='text-lg font-bold text-zinc-900 font-sans tracking-tight'>
                Create New Chapter
              </h2>
              <p className='text-xs text-zinc-500'>
                Initialize a new chapter in the production pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors'
            disabled={isSubmitting}
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className='p-5 sm:p-6 space-y-5'>
          {error && (
            <div className='p-3 bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm font-medium flex items-start gap-2'>
              <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
              <p>{error}</p>
            </div>
          )}

          <div className='flex gap-4'>
            <div className='w-1/3'>
              <label className='block text-xs font-semibold text-zinc-700 mb-1.5'>Number</label>
              <input
                type='number'
                name='chapterNumber'
                min='1'
                required
                value={formData.chapterNumber}
                onChange={handleChange}
                className='w-full px-3 py-2.5 bg-white border border-zinc-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent rounded-xl text-sm text-zinc-900 transition-all shadow-sm outline-none'
              />
            </div>
            <div className='flex-1'>
              <label className='block text-xs font-semibold text-zinc-700 mb-1.5'>
                Chapter Title
              </label>
              <input
                type='text'
                name='title'
                required
                placeholder='e.g., The Awakening'
                value={formData.title}
                onChange={handleChange}
                className='w-full px-3 py-2.5 bg-white border border-zinc-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent rounded-xl text-sm text-zinc-900 placeholder-zinc-400 transition-all shadow-sm outline-none'
              />
            </div>
          </div>

          <div>
            <label className='block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5'>
              <Calendar className='w-3.5 h-3.5 text-zinc-500' /> Target Deadline
            </label>
            <input
              type='datetime-local'
              name='deadline'
              required
              value={formData.deadline}
              onChange={handleChange}
              className='w-full px-3 py-2.5 bg-white border border-zinc-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent rounded-xl text-sm text-zinc-900 transition-all shadow-sm outline-none'
            />
          </div>

          {/* Footer Actions */}
          <div className='pt-4 flex items-center justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              disabled={isSubmitting}
              className='px-4 py-2.5 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='flex items-center justify-center min-w-[140px] px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed'
            >
              {isSubmitting ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Initialize Chapter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
