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
      {/* Stitch Weekly Schedule Header */}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold text-stone-900'>Lịch phát hành xuất bản tổng hợp</h2>
          <p className='text-xs text-stone-500 mt-0.5'>
            Hạn chót nộp bản vẽ, hiệu chỉnh hội thoại và bàn giao in ấn theo tuần
          </p>
        </div>
        <button
          type='button'
          className='px-3.5 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs text-stone-800 shadow-2xs font-semibold cursor-pointer transition-colors'
        >
          Hôm nay
        </button>
      </div>

      {/* Dynamic 4-Column Weekly Sprint Cards from Real Series */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Tuần 1: Hoàn tất phát hành */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>Tuần 1</span>
            <span className='text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold'>
              ĐÃ PHÁT HÀNH
            </span>
          </div>
          {completedSeries[0] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-600 line-clamp-1'>
                {(completedSeries[0] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                {(completedSeries[0] || seriesList[0]).chaptersCount
                  ? `Chương ${(completedSeries[0] || seriesList[0]).chaptersCount}: Đã phát hành`
                  : 'Bản thảo Name'}
              </span>
              <span className='text-[11px] text-stone-500 line-clamp-1'>
                Định dạng: {(completedSeries[0] || seriesList[0]).format || 'Manga/Webtoon'}
              </span>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>Chưa có lịch phát hành</div>
          )}
        </div>

        {/* Tuần 2: Kỳ gần nhất */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>Tuần 2</span>
            <span className='text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-bold'>
              HOÀN TẤT
            </span>
          </div>
          {seriesList[1] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-700 line-clamp-1'>
                {(seriesList[1] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                {(seriesList[1] || seriesList[0]).chaptersCount
                  ? `Chương ${(seriesList[1] || seriesList[0]).chaptersCount}: Hiệu đính`
                  : 'Tiền kỳ phân cảnh'}
              </span>
              <span className='text-[11px] text-stone-500 line-clamp-1'>
                Thể loại: {formatGenre((seriesList[1] || seriesList[0]).genre)}
              </span>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>Chưa có lịch phát hành</div>
          )}
        </div>

        {/* Tuần 3: TUẦN HIỆN TẠI (Đang sản xuất) */}
        <div className='bg-white border-2 border-orange-600 rounded-xl p-4 flex flex-col gap-3 shadow-sm relative'>
          <div className='absolute -top-2.5 right-3 px-2 py-0.5 bg-orange-600 text-white text-[10px] font-bold rounded-full shadow-2xs'>
            TUẦN HIỆN TẠI
          </div>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-bold text-orange-600 text-xs'>Tuần 3 (Đang triển khai)</span>
          </div>
          {activeSeries[0] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-orange-50/50 border border-orange-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-700 line-clamp-1'>
                {(activeSeries[0] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                Chương {((activeSeries[0] || seriesList[0]).chaptersCount ?? 0) + 1}: Đang sản xuất
              </span>
              <div className='flex items-center justify-between text-[11px] text-amber-600 font-semibold mt-1'>
                <span>Đang vẽ phân cảnh & thoại</span>
                <span>Tiến độ thực tế</span>
              </div>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>Chưa có dự án nào đang chạy</div>
          )}
        </div>

        {/* Tuần 4: Sắp diễn ra */}
        <div className='bg-white border border-stone-200 rounded-xl p-4 flex flex-col gap-3 shadow-xs'>
          <div className='flex items-center justify-between pb-2 border-b border-stone-100'>
            <span className='font-semibold text-stone-800 text-xs'>Tuần 4</span>
            <span className='text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-bold'>
              SẮP DIỄN RA
            </span>
          </div>
          {seriesList[2] || seriesList[0] ? (
            <div className='p-2.5 rounded-lg bg-[#FAF9F5] border border-stone-200 flex flex-col gap-1'>
              <span className='text-[11px] font-bold text-orange-600 line-clamp-1'>
                {(seriesList[2] || seriesList[0]).title}
              </span>
              <span className='font-semibold text-stone-900 text-xs line-clamp-1'>
                Chương {((seriesList[2] || seriesList[0]).chaptersCount ?? 0) + 1}: Kế hoạch tiếp theo
              </span>
              <span className='text-[11px] text-stone-500 line-clamp-1'>
                Hạn bàn giao Lineart & Lettering
              </span>
            </div>
          ) : (
            <div className='p-4 text-center text-xs text-stone-400'>Chưa có lịch phát hành</div>
          )}
        </div>
      </div>

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
