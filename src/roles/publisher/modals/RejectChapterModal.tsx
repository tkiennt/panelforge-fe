import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { chapterService } from '@/services/chapter.service';

interface RejectChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  onSuccess: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const RejectChapterModal: React.FC<RejectChapterModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterNumber,
  chapterTitle,
  onSuccess,
  onShowToast,
}) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Vui lòng nhập lý do từ chối / yêu cầu sửa đổi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await chapterService.reopenChapter(chapterId, comment.trim());
      onShowToast?.(
        'Đã từ chối xuất bản',
        `Chương ${chapterNumber} đã được chuyển lại về trạng thái InProduction để nhóm sản xuất khắc phục.`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể từ chối chương.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shadow-2xs'>
              <AlertTriangle className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-sm text-[#171717]'>Từ Chối & Yêu Cầu Chỉnh Sửa</h3>
              <p className='text-xs text-[#737373]'>
                Chương {chapterNumber}: {chapterTitle || 'Không tiêu đề'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className='p-5 space-y-4'>
          {error && (
            <div className='p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl'>
              {error}
            </div>
          )}

          <div>
            <label className='block text-xs font-bold text-[#171717] mb-1.5'>
              Lý do từ chối xuất bản <span className='text-rose-600'>*</span>
            </label>
            <textarea
              rows={4}
              required
              placeholder='Nhập chi tiết các điểm cần hoàn thiện hoặc sửa đổi (lỗi chính tả, lỗi nét vẽ, lệch khung, vi phạm bản quyền...)...'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F5] focus:bg-white border border-[#E7E7E7] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-rose-500 custom-scrollbar leading-relaxed'
            />
            <p className='text-[10px] text-[#737373] mt-1'>
              * Producer và nhóm sản xuất sẽ nhận được thông báo kèm lý do này để thực hiện khắc
              phục.
            </p>
          </div>

          <div className='p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed'>
            Chương sẽ được chuyển từ <code>Approved</code> về lại <code>InProduction</code>. Nhóm
            sản xuất có thể mở lại việc và tải lên bản sửa đổi.
          </div>

          {/* Actions */}
          <div className='flex items-center justify-end gap-2 pt-2 border-t border-[#E7E7E7]'>
            <button
              type='button'
              onClick={onClose}
              disabled={loading}
              className='px-3.5 py-1.5 text-xs text-[#555555] hover:bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] transition-colors cursor-pointer'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={loading || !comment.trim()}
              title={!comment.trim() ? 'Vui lòng nhập lý do từ chối' : undefined}
              className='px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer'
            >
              {loading ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <RotateCcw className='w-3.5 h-3.5' />
              )}
              <span>Từ Chối &amp; Mở Lại Sản Xuất</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
