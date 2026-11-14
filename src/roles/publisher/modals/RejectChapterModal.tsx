import React, { useState } from 'react';
import { RotateCcw, Loader2 } from 'lucide-react';
import { chapterService } from '@/services/chapter.service';
import { Modal } from '@/shared/ui';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='md'
      title='Từ Chối & Yêu Cầu Chỉnh Sửa'
      description={`Chương ${chapterNumber}: ${chapterTitle || 'Không tiêu đề'}`}
      closeLabel='Đóng'
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        {error && (
          <div className='p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl'>
            {error}
          </div>
        )}

        <div>
          <label className='block text-xs font-bold text-[#1C1917] mb-1.5'>
            Lý do từ chối xuất bản <span className='text-rose-600'>*</span>
          </label>
          <textarea
            rows={4}
            required
            placeholder='Nhập chi tiết các điểm cần hoàn thiện hoặc sửa đổi (lỗi chính tả, lỗi nét vẽ, lệch khung, vi phạm bản quyền...)...'
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className='w-full px-3 py-2 bg-[#FCFBF8] focus:bg-white border border-[#D8D2C5] rounded-xl text-xs text-[#1C1917] focus:outline-none focus:border-rose-500 custom-scrollbar leading-relaxed'
          />
          <p className='text-[10px] text-[#57534E] mt-1'>
            * Producer và nhóm sản xuất sẽ nhận được thông báo kèm lý do này để thực hiện khắc phục.
          </p>
        </div>

        <div className='p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed'>
          Chương sẽ được chuyển từ <code>Approved</code> về lại <code>InProduction</code>. Nhóm sản
          xuất có thể mở lại việc và tải lên bản sửa đổi.
        </div>

        {/* Actions */}
        <div className='flex items-center justify-end gap-2 pt-2 border-t border-[#D8D2C5]'>
          <button
            type='button'
            onClick={onClose}
            disabled={loading}
            className='px-3.5 py-1.5 text-xs text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917] rounded-xl border border-[#D8D2C5] transition-colors cursor-pointer'
          >
            Hủy
          </button>
          <button
            type='submit'
            disabled={loading || !comment.trim()}
            title={!comment.trim() ? 'Vui lòng nhập lý do từ chối' : undefined}
            className='px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer active:scale-95'
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
    </Modal>
  );
};
