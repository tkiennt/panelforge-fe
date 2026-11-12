import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Plus, Loader2 } from 'lucide-react';
import { workspaceService, WorkspaceDto } from '@/services/workspace.service';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newWorkspace: WorkspaceDto) => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [quotaGb, setQuotaGb] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên Workspace / Studio.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const quotaBytes = (parseFloat(quotaGb) || 10) * 1024 * 1024 * 1024;
      const created = await workspaceService.createWorkspace({
        name: trimmedName,
        storageQuotaBytes: quotaBytes,
      });

      if (onShowToast) {
        onShowToast('Tạo Studio thành công', `Đã tạo workspace "${created.name}"`);
      }
      setName('');
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo Workspace:', err);
      setError(err.message || 'Không thể tạo Workspace. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className='relative w-full max-w-md bg-[#FCFBF8] rounded-xl shadow-editorial border border-[#D8D2C5] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-5 border-b border-[#D8D2C5] bg-[#F8F6F0]'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-[#FFF2E6] border border-[#D8D2C5] flex items-center justify-center text-[#C2410C] shadow-2xs'>
              <Layers className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-serif font-bold text-lg text-[#1C1917]'>
                Tạo Studio / Workspace mới
              </h3>
              <p className='text-xs text-[#57534E]'>Khởi tạo không gian làm việc sản xuất truyện</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label='Đóng modal'
            className='w-8 h-8 rounded-lg flex items-center justify-center text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {error && (
            <div className='p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed'>
              {error}
            </div>
          )}

          <div>
            <label className='block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2'>
              Tên Studio / Workspace <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ví dụ: Tokyo Ghoul Production Studio'
              className='w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none text-sm text-[#1C1917] placeholder:text-stone-400 transition-all'
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className='block text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2'>
              Dung lượng lưu trữ ban đầu (GB)
            </label>
            <select
              value={quotaGb}
              onChange={(e) => setQuotaGb(e.target.value)}
              className='w-full px-4 py-2.5 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316] outline-none text-sm text-[#1C1917] transition-all cursor-pointer'
              disabled={loading}
            >
              <option value='5'>5 GB (Tiêu chuẩn)</option>
              <option value='10'>10 GB (Khuyến nghị)</option>
              <option value='25'>25 GB (Studio lớn)</option>
              <option value='50'>50 GB (Chuyên nghiệp)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center justify-end gap-3 pt-4 border-t border-[#D8D2C5]'>
            <button
              type='button'
              onClick={onClose}
              disabled={loading}
              className='px-4 py-2.5 rounded-lg border border-[#D8D2C5] text-sm font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] transition-colors cursor-pointer'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={loading || !name.trim()}
              className='flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-2xs'
            >
              {loading ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <Plus className='w-4 h-4' />
                  <span>Tạo Studio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
