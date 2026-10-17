import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  Send,
  RotateCcw,
  Clock,
  Calendar,
} from 'lucide-react';
import { chapterService, ChapterReviewDto, ChapterReviewAction } from '@/services/chapter.service';

interface ChapterReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
}

export const ChapterReviewsModal: React.FC<ChapterReviewsModalProps> = ({
  isOpen,
  onClose,
  chapterId,
  chapterNumber,
  chapterTitle,
}) => {
  const [reviews, setReviews] = useState<ChapterReviewDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !chapterId) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    chapterService
      .getChapterReviews(chapterId)
      .then((data) => {
        if (mounted) {
          setReviews(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Không thể tải lịch sử phê duyệt.');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, chapterId]);

  if (!isOpen) return null;

  const getActionConfig = (action: ChapterReviewAction) => {
    switch (action) {
      case 'ProducerApproved':
        return {
          label: 'Producer Đã Phê Duyệt',
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          dotBg: 'bg-emerald-500',
          icon: <CheckCircle2 className='w-4 h-4 text-emerald-600' />,
          desc: 'Chương hoàn tất sản xuất và chuyển sang trạng thái Approved (chờ xuất bản)',
        };
      case 'ProducerReopened':
        return {
          label: 'Producer Mở Lại Sản Xuất',
          color: 'text-amber-700 bg-amber-50 border-amber-200',
          dotBg: 'bg-amber-500',
          icon: <RotateCcw className='w-4 h-4 text-amber-600' />,
          desc: 'Chương được chuyển lại trạng thái InProduction để tiếp tục chỉnh sửa',
        };
      case 'PublisherRejected':
        return {
          label: 'Publisher Từ Chối Xuất Bản',
          color: 'text-rose-700 bg-rose-50 border-rose-200',
          dotBg: 'bg-rose-500',
          icon: <AlertTriangle className='w-4 h-4 text-rose-600' />,
          desc: 'Publisher yêu cầu hoàn thiện thêm trước khi phát hành chính thức',
        };
      case 'PublisherPublished':
        return {
          label: 'Publisher Đã Xuất Bản',
          color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
          dotBg: 'bg-indigo-500',
          icon: <Send className='w-4 h-4 text-indigo-600' />,
          desc: 'Chương đã được phát hành hoặc lên lịch phát hành chính thức tới độc giả',
        };
      default:
        return {
          label: action,
          color: 'text-neutral-700 bg-neutral-50 border-neutral-200',
          dotBg: 'bg-neutral-500',
          icon: <Clock className='w-4 h-4 text-neutral-600' />,
          desc: 'Thao tác xem xét',
        };
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center'>
              <History className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-sm text-[#171717]'>Lịch Sử Phê Duyệt & Xuất Bản</h3>
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

        {/* Content */}
        <div className='p-6 overflow-y-auto flex-1 custom-scrollbar'>
          {loading && (
            <div className='py-12 flex flex-col items-center justify-center text-xs text-[#888888] gap-2'>
              <Clock className='w-5 h-5 animate-spin text-orange-500' />
              <span>Đang tải lịch sử phê duyệt...</span>
            </div>
          )}

          {error && (
            <div className='p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl'>
              {error}
            </div>
          )}

          {!loading && !error && reviews.length === 0 && (
            <div className='py-12 text-center text-xs text-[#888888]'>
              Chưa có lượt phê duyệt hoặc xuất bản nào được ghi nhận cho chương này.
            </div>
          )}

          {!loading && !error && reviews.length > 0 && (
            <div className='relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E7E7E7]'>
              {reviews.map((rev) => {
                const config = getActionConfig(rev.action);
                return (
                  <div key={rev.id} className='relative group'>
                    {/* Bullet marker */}
                    <div
                      className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white shadow-xs ${config.dotBg}`}
                    />

                    <div className='bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl p-3.5 space-y-2 group-hover:border-neutral-400 transition-colors'>
                      <div className='flex items-center justify-between gap-2 flex-wrap'>
                        <div className='flex items-center gap-2'>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}
                          >
                            {config.icon}
                            {config.label}
                          </span>
                          <span className='text-[10px] text-[#888888] font-mono'>
                            v.{rev.chapterVersion}
                          </span>
                        </div>
                        <span className='text-[11px] text-[#737373] font-mono'>
                          {formatDate(rev.createdAt)}
                        </span>
                      </div>

                      <p className='text-xs text-[#555555]'>{config.desc}</p>

                      {rev.comment && (
                        <div className='p-2.5 bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] mt-1 space-y-0.5'>
                          <div className='text-[10px] font-bold text-[#888888] uppercase tracking-wider'>
                            Ghi chú / Lý do:
                          </div>
                          <p className='whitespace-pre-wrap leading-relaxed'>{rev.comment}</p>
                        </div>
                      )}

                      {rev.scheduledAt && (
                        <div className='flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg p-2 font-medium'>
                          <Calendar className='w-3.5 h-3.5 shrink-0' />
                          <span>
                            Thời gian phát hành dự kiến:{' '}
                            <strong>{formatDate(rev.scheduledAt)}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='p-3 bg-[#FAF8F4] border-t border-[#E7E7E7] flex justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
