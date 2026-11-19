import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { SeriesDto } from '@/services/series.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { formatGenre, formatReadingDirection } from './formatters';

export interface StudioScheduleTabProps {
  seriesList: SeriesDto[];
  workspaceId?: string;
  isProducer: boolean;
}

export const StudioScheduleTab: React.FC<StudioScheduleTabProps> = ({
  seriesList,
  workspaceId,
  isProducer,
}) => {
  const navigate = useNavigate();

  const totalChapters = React.useMemo(() => {
    return seriesList.reduce((acc, s) => acc + (s.chaptersCount ?? 0), 0);
  }, [seriesList]);

  const activeSeries = React.useMemo(() => {
    return seriesList.filter((s) => !s.isCompleted);
  }, [seriesList]);

  const completedSeries = React.useMemo(() => {
    return seriesList.filter((s) => s.isCompleted);
  }, [seriesList]);

  if (seriesList.length === 0) {
    return (
      <div className='bg-white border border-stone-200/80 rounded-2xl p-10 text-center space-y-3'>
        <div className='w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center'>
          <Calendar className='w-6 h-6' />
        </div>
        <h3 className='font-serif text-lg font-bold text-stone-900'>Chưa có lịch phát hành</h3>
        <p className='text-xs sm:text-sm text-stone-600 max-w-md mx-auto'>
          Hiện Studio chưa có bộ truyện nào trong danh sách. Hãy tạo bộ truyện mới để bắt đầu thiết
          lập lịch phát hành.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6 animate-in fade-in duration-200'>
      {/* KPI Overview Banner */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div className='bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5'>
          <div className='flex items-center justify-between text-xs font-semibold text-stone-500'>
            <span>Bộ truyện đang chạy</span>
            <BookOpen className='w-4 h-4 text-orange-600' />
          </div>
          <div className='text-2xl font-mono font-bold text-stone-900'>
            {activeSeries.length}{' '}
            <span className='text-xs text-stone-500 font-sans font-normal'>
              / {seriesList.length} bộ
            </span>
          </div>
          <div className='text-[11px] text-emerald-700 font-medium flex items-center gap-1'>
            <CheckCircle2 className='w-3 h-3' />
            <span>Đang phát hành theo kế hoạch</span>
          </div>
        </div>

        <div className='bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5'>
          <div className='flex items-center justify-between text-xs font-semibold text-stone-500'>
            <span>Tổng số chương hoàn thành</span>
            <Clock className='w-4 h-4 text-sky-600' />
          </div>
          <div className='text-2xl font-mono font-bold text-stone-900'>
            {totalChapters}{' '}
            <span className='text-xs text-stone-500 font-sans font-normal'>chương</span>
          </div>
          <div className='text-[11px] text-stone-600 font-medium'>
            Bao gồm cả các bản thảo chờ duyệt
          </div>
        </div>

        <div className='bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1.5'>
          <div className='flex items-center justify-between text-xs font-semibold text-stone-500'>
            <span>Trọn bộ hoàn tất</span>
            <Sparkles className='w-4 h-4 text-emerald-600' />
          </div>
          <div className='text-2xl font-mono font-bold text-stone-900'>
            {completedSeries.length}{' '}
            <span className='text-xs text-stone-500 font-sans font-normal'>tác phẩm</span>
          </div>
          <div className='text-[11px] text-stone-600 font-medium'>Đã lưu trữ vĩnh viễn</div>
        </div>
      </div>

      {/* Schedule Table / List */}
      <div className='bg-white rounded-2xl border border-stone-200/80 shadow-2xs overflow-hidden'>
        <div className='p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <div>
            <h3 className='font-serif text-base font-bold text-stone-900'>
              Lịch phát hành xuất bản tổng hợp
            </h3>
            <p className='text-xs text-stone-500 mt-0.5'>
              Kế hoạch phát hành định kỳ các tác phẩm thuộc Studio
            </p>
          </div>
          <span className='text-xs font-mono px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-semibold self-start sm:self-auto'>
            {seriesList.length} Dự án
          </span>
        </div>

        <div className='divide-y divide-stone-100'>
          {seriesList.map((s) => {
            const displayCoverUrl = s.coverUrl || s.avatarUrl;
            const isDone = s.isCompleted;

            return (
              <div
                key={s.id}
                className='p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/70 transition-colors'
              >
                <div className='flex items-center gap-4 min-w-0'>
                  {/* Thumbnail */}
                  <div className='w-14 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0 relative flex items-center justify-center'>
                    {displayCoverUrl ? (
                      <AuthenticatedImage
                        src={displayCoverUrl}
                        alt={s.title}
                        className='w-full h-full object-cover'
                        fallback={
                          <span className='font-serif font-bold text-stone-400 text-lg'>
                            {s.title.charAt(0).toUpperCase()}
                          </span>
                        }
                      />
                    ) : (
                      <span className='font-serif font-bold text-stone-400 text-lg'>
                        {s.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h4 className='text-sm font-bold text-stone-900 truncate'>{s.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isDone
                            ? 'bg-stone-100 text-stone-700 border border-stone-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isDone ? 'Đã hoàn thành' : 'Đang phát hành'}
                      </span>
                    </div>
                    <div className='flex items-center gap-3 text-xs text-stone-500 mt-1 flex-wrap'>
                      <span>{formatGenre(s.genre || s.format)}</span>
                      <span>•</span>
                      <span>{formatReadingDirection(s.readingDirection).label}</span>
                      <span>•</span>
                      <span className='font-mono font-semibold text-stone-700'>
                        {s.chaptersCount ?? 0} chương đã khởi tạo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex items-center gap-2.5 shrink-0 self-end md:self-auto'>
                  <button
                    type='button'
                    onClick={() => {
                      if (workspaceId) {
                        navigate(`/workspaces/${workspaceId}/series/${s.id}/dashboard`);
                      }
                    }}
                    className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer rounded-xl'
                  >
                    <span>Mở Bàn làm việc</span>
                    <ArrowRight className='w-3.5 h-3.5' />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
