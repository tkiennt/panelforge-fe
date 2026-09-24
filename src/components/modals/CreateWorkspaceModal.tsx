import React, { useState } from 'react';
import { X, Layers, Plus, Loader2 } from 'lucide-react';
import { workspaceService, WorkspaceDto } from '../../services/workspace.service';

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

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200'>
      <div className='relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E7E7E7] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-5 border-b border-[#E7E7E7] bg-[#FAF8F5]'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-[#EA580C]'>
              <Layers className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-bold text-lg text-[#171717]'>Tạo Studio / Workspace mới</h3>
              <p className='text-xs text-[#888888]'>Khởi tạo không gian làm việc sản xuất truyện</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg flex items-center justify-center text-[#888888] hover:text-[#171717] hover:bg-black/5 transition-colors cursor-pointer'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          {error && (
            <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed'>
              {error}
            </div>
          )}

          <div>
            <label className='block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2'>
              Tên Studio / Workspace <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ví dụ: Tokyo Ghoul Production Studio'
              className='w-full px-4 py-2.5 rounded-xl border border-[#D1D5DB] focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 outline-hidden text-sm text-[#171717] transition-all'
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className='block text-xs font-bold text-[#171717] uppercase tracking-wider mb-2'>
              Dung lượng lưu trữ ban đầu (GB)
            </label>
            <select
              value={quotaGb}
              onChange={(e) => setQuotaGb(e.target.value)}
              className='w-full px-4 py-2.5 rounded-xl border border-[#D1D5DB] focus:border-[#EA580C] focus:ring-2 focus:ring-[#EA580C]/20 outline-hidden text-sm text-[#171717] transition-all bg-white'
              disabled={loading}
            >
              <option value='5'>5 GB (Tiêu chuẩn)</option>
              <option value='10'>10 GB (Khuyến nghị)</option>
              <option value='25'>25 GB (Studio lớn)</option>
              <option value='50'>50 GB (Chuyên nghiệp)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center justify-end gap-3 pt-4 border-t border-[#E7E7E7]'>
            <button
              type='button'
              onClick={onClose}
              disabled={loading}
              className='px-4 py-2.5 rounded-xl border border-[#D1D5DB] text-sm font-semibold text-[#555555] hover:bg-gray-50 transition-colors cursor-pointer'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={loading || !name.trim()}
              className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#171717] hover:bg-[#2A2A2A] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
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
};
