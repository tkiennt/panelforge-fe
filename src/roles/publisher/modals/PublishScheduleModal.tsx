import React, { useState } from 'react';
import { X, Send, Calendar, Clock, Loader2, Sparkles } from 'lucide-react';
import { chapterService } from '@/services/chapter.service';

interface PublishScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  onSuccess: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

export const PublishScheduleModal: React.FC<PublishScheduleModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterNumber,
  chapterTitle,
  onSuccess,
  onShowToast,
}) => {
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState(() => {
    // Default to tomorrow at 09:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let isoUtc: string | null = null;
      if (publishMode === 'schedule') {
        const selected = new Date(scheduleDate);
        if (isNaN(selected.getTime())) {
          setError('Thời gian hẹn giờ không hợp lệ.');
          setLoading(false);
          return;
        }
        if (selected.getTime() <= Date.now() + 60000) {
          setError('Thời gian lên lịch phát hành phải ở tương lai (tối thiểu 1 phút).');
          setLoading(false);
          return;
        }
        isoUtc = selected.toISOString();
      }

      await chapterService.publishChapter(chapterId, isoUtc);

      if (publishMode === 'now') {
        onShowToast?.(
          'Xuất bản thành công!',
          `Chương ${chapterNumber} đã được phát hành chính thức tới độc giả.`,
        );
      } else {
        onShowToast?.(
          'Lên lịch thành công!',
          `Chương ${chapterNumber} đã được lên lịch phát hành vào ${new Date(scheduleDate).toLocaleString('vi-VN')}.`,
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không thể xuất bản chương.');
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
            <div className='w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shadow-2xs'>
              <Send className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-sm text-[#171717]'>Xuất Bản & Lên Lịch Phát Hành</h3>
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

          <div className='space-y-2'>
            <label className='block text-xs font-bold text-[#171717]'>Hình Thức Phát Hành</label>
            <div className='grid grid-cols-2 gap-2.5'>
              <button
                type='button'
                onClick={() => setPublishMode('now')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  publishMode === 'now'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                    : 'border-[#E7E7E7] hover:border-neutral-300 bg-[#FAF8F5]'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs text-[#171717]'>
                  <Sparkles className='w-3.5 h-3.5 text-indigo-600' />
                  <span>Phát hành ngay</span>
                </div>
                <span className='text-[10px] text-[#737373] leading-relaxed'>
                  Độc giả có thể đọc chương ngay lập tức trên Catalog.
                </span>
              </button>

              <button
                type='button'
                onClick={() => setPublishMode('schedule')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  publishMode === 'schedule'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                    : 'border-[#E7E7E7] hover:border-neutral-300 bg-[#FAF8F5]'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs text-[#171717]'>
                  <Calendar className='w-3.5 h-3.5 text-indigo-600' />
                  <span>Lên lịch phát hành</span>
                </div>
                <span className='text-[10px] text-[#737373] leading-relaxed'>
                  Chương tự động hiển thị cho độc giả khi đến giờ hẹn.
                </span>
              </button>
            </div>
          </div>

          {publishMode === 'schedule' && (
            <div className='space-y-1.5 p-3.5 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl animate-in fade-in duration-150'>
              <label className='block text-xs font-semibold text-[#171717] flex items-center gap-1.5'>
                <Clock className='w-3.5 h-3.5 text-[#F97316]' />
                <span>Chọn Ngày & Giờ Phát Hành (Giờ địa phương)</span>
              </label>
              <input
                type='datetime-local'
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className='w-full px-3 py-2 bg-white border border-[#E7E7E7] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-indigo-600'
              />
              <p className='text-[10px] text-[#737373] mt-1'>
                * Hệ thống sẽ tự động chuyển đổi sang chuẩn giờ UTC khi gửi tới máy chủ.
              </p>
            </div>
          )}

          <div className='p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed'>
            <strong>Lưu ý quan trọng:</strong> Trạng thái <code>Published</code> là kết quả cuối
            cùng của quy trình sản xuất manga. Sau khi xuất bản, chương không thể mở lại được nữa
            (theo quy tắc phê duyệt V1.2).
          </div>

          {/* Action buttons */}
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
              disabled={loading}
              className='px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer'
            >
              {loading ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : (
                <Send className='w-3.5 h-3.5' />
              )}
              <span>{publishMode === 'now' ? 'Xác Nhận Xuất Bản' : 'Xác Nhận Lên Lịch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
