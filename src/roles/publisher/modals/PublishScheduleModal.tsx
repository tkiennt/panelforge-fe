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
    <div className='fixed inset-0 bg-[#1C1917]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden'>
        {/* Header */}
        <div className='p-4 bg-[#F8F6F0] border-b border-[#D8D2C5] flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-xl bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] flex items-center justify-center shadow-2xs'>
              <Send className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-serif font-bold text-sm text-[#1C1917]'>
                Xuất Bản &amp; Lên Lịch Phát Hành
              </h3>
              <p className='text-xs text-[#57534E]'>
                Chương {chapterNumber}: {chapterTitle || 'Không tiêu đề'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-[#F3F0E9] border border-transparent hover:border-[#D8D2C5] flex items-center justify-center text-[#57534E] hover:text-[#1C1917] transition-all cursor-pointer'
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
            <label className='block text-xs font-bold text-[#1C1917]'>Hình Thức Phát Hành</label>
            <div className='grid grid-cols-2 gap-2.5'>
              <button
                type='button'
                onClick={() => setPublishMode('now')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  publishMode === 'now'
                    ? 'border-[#F97316] bg-[#FFF2E6] ring-1 ring-[#F97316]'
                    : 'border-[#D8D2C5] hover:border-[#F97316]/60 bg-[#FCFBF8]'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs text-[#1C1917]'>
                  <Sparkles className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>Phát hành ngay</span>
                </div>
                <span className='text-[10px] text-[#57534E] leading-relaxed'>
                  Độc giả có thể đọc chương ngay lập tức trên Catalog.
                </span>
              </button>

              <button
                type='button'
                onClick={() => setPublishMode('schedule')}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                  publishMode === 'schedule'
                    ? 'border-[#F97316] bg-[#FFF2E6] ring-1 ring-[#F97316]'
                    : 'border-[#D8D2C5] hover:border-[#F97316]/60 bg-[#FCFBF8]'
                }`}
              >
                <div className='flex items-center gap-1.5 font-bold text-xs text-[#1C1917]'>
                  <Calendar className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>Lên lịch phát hành</span>
                </div>
                <span className='text-[10px] text-[#57534E] leading-relaxed'>
                  Chương tự động hiển thị cho độc giả khi đến giờ hẹn.
                </span>
              </button>
            </div>
          </div>

          {publishMode === 'schedule' && (
            <div className='space-y-1.5 p-3.5 bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl animate-in fade-in duration-150'>
              <label className='block text-xs font-semibold text-[#1C1917] flex items-center gap-1.5'>
                <Clock className='w-3.5 h-3.5 text-[#F97316]' />
                <span>Chọn Ngày &amp; Giờ Phát Hành (Giờ địa phương)</span>
              </label>
              <input
                type='datetime-local'
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className='w-full px-3 py-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg text-xs font-mono text-[#1C1917] focus:outline-none focus:border-[#F97316]'
              />
              <p className='text-[10px] text-[#57534E] mt-1'>
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
              disabled={loading}
              className='px-4 py-1.5 text-xs font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer active:scale-95'
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
