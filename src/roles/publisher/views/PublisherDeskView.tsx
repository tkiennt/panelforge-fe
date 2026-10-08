import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  History,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { PublishScheduleModal } from '../modals/PublishScheduleModal';
import { RejectChapterModal } from '../modals/RejectChapterModal';
import { ChapterReviewsModal } from '@/shared/modals/ChapterReviewsModal';
import { ChapterReaderModal } from '@/shared/modals/ChapterReaderModal';

interface PublisherDeskViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

export const PublisherDeskView: React.FC<PublisherDeskViewProps> = ({ onShowToast }) => {
  const { seriesId, workspaceId } = useParams<{ seriesId: string; workspaceId: string }>();
  const navigate = useNavigate();

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'approved' | 'published' | 'all'>('approved');

  // Modals state
  const [publishingChapter, setPublishingChapter] = useState<ChapterDto | null>(null);
  const [rejectingChapter, setRejectingChapter] = useState<ChapterDto | null>(null);
  const [reviewingChapter, setReviewingChapter] = useState<ChapterDto | null>(null);
  const [readingChapter, setReadingChapter] = useState<ChapterDto | null>(null);

  const fetchChapters = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    try {
      const res = await chapterService.getChaptersBySeries(seriesId, 1, 100);
      setChapters(res.items || []);
    } catch (err: any) {
      onShowToast?.('Không thể tải danh sách chương', err.message);
    } finally {
      setLoading(false);
    }
  }, [seriesId, onShowToast]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const approvedChapters = chapters.filter((c) => c.status === 'Approved');
  const publishedChapters = chapters.filter((c) => c.status === 'Published');

  const filteredChapters =
    activeTab === 'approved'
      ? approvedChapters
      : activeTab === 'published'
        ? publishedChapters
        : chapters;

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Chưa xác định';
    try {
      return new Date(isoString).toLocaleString('vi-VN');
    } catch {
      return isoString;
    }
  };

  return (
    <div className='min-h-full bg-[#FAF8F5] p-6 space-y-6'>
      {/* Header Banner */}
      <div className='bg-white border border-[#E7E7E7] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-center gap-3.5'>
          <div className='w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs'>
            <Send className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-display font-bold text-[#171717]'>
                Bàn Làm Việc Publisher // Cổng Duyệt Xuất Bản
              </h1>
              <span className='px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono font-bold'>
                STAGE: PUBLISHING
              </span>
            </div>
            <p className='text-xs text-[#737373] mt-1'>
              Duyệt thẩm định chương sau khi Producer hoàn tất sản xuất, lên lịch phát hành hoặc
              xuất bản trực tiếp tới độc giả công khai.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2.5'>
          <button
            onClick={fetchChapters}
            disabled={loading}
            className='px-3 py-1.5 bg-white border border-[#E7E7E7] hover:bg-[#FAF8F5] text-xs font-semibold text-[#555555] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}/series/${seriesId}/workspace`)}
            className='px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs'
          >
            <Layers className='w-3.5 h-3.5' />
            <span>Vào Production Board</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-[#E7E7E7] hover:border-neutral-300'
          }`}
        >
          <div className='flex items-center justify-between text-xs text-[#737373]'>
            <span className='font-semibold'>Chờ Duyệt Xuất Bản</span>
            <CheckCircle2 className='w-4 h-4 text-amber-600' />
          </div>
          <div className='text-2xl font-bold font-mono text-[#171717] mt-1.5'>
            {approvedChapters.length}
          </div>
          <p className='text-[11px] text-amber-700 mt-1 font-medium'>
            Producer đã duyệt hoàn tất sản xuất
          </p>
        </div>

        <div
          onClick={() => setActiveTab('published')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'published'
              ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white border-[#E7E7E7] hover:border-neutral-300'
          }`}
        >
          <div className='flex items-center justify-between text-xs text-[#737373]'>
            <span className='font-semibold'>Đã Xuất Bản &amp; Lên Lịch</span>
            <Sparkles className='w-4 h-4 text-purple-600' />
          </div>
          <div className='text-2xl font-bold font-mono text-[#171717] mt-1.5'>
            {publishedChapters.length}
          </div>
          <p className='text-[11px] text-purple-700 mt-1 font-medium'>
            Sẵn sàng đọc hoặc đang đếm ngược
          </p>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-[#E7E7E7] hover:border-neutral-300'
          }`}
        >
          <div className='flex items-center justify-between text-xs text-[#737373]'>
            <span className='font-semibold'>Tổng Số Chương</span>
            <BookOpen className='w-4 h-4 text-indigo-600' />
          </div>
          <div className='text-2xl font-bold font-mono text-[#171717] mt-1.5'>
            {chapters.length}
          </div>
          <p className='text-[11px] text-[#737373] mt-1 font-medium'>
            Tất cả các chương trong bộ truyện
          </p>
        </div>
      </div>

      {/* Chapters Table */}
      <div className='bg-white border border-[#E7E7E7] rounded-2xl overflow-hidden shadow-2xs'>
        <div className='p-4 bg-[#FAF8F5] border-b border-[#E7E7E7] flex items-center justify-between flex-wrap gap-2'>
          <div className='flex items-center gap-2'>
            <Filter className='w-4 h-4 text-[#737373]' />
            <span className='text-xs font-bold text-[#171717]'>
              {activeTab === 'approved'
                ? 'Danh Sách Chương Chờ Publisher Phê Duyệt'
                : activeTab === 'published'
                  ? 'Danh Sách Chương Đã Phát Hành & Lên Lịch'
                  : 'Tất Cả Các Chương Trong Series'}
            </span>
            <span className='px-2 py-0.5 rounded-full bg-neutral-200 text-[#171717] text-[10px] font-mono font-bold'>
              {filteredChapters.length}
            </span>
          </div>

          <div className='flex items-center gap-1.5'>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-white text-amber-700 shadow-2xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              Chờ duyệt ({approvedChapters.length})
            </button>
            <button
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-white text-purple-700 shadow-2xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              Đã phát hành ({publishedChapters.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-[#171717] shadow-2xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              Tất cả ({chapters.length})
            </button>
          </div>
        </div>

        {filteredChapters.length === 0 ? (
          <div className='p-12 text-center text-[#888888] space-y-2'>
            <CheckCircle2 className='w-8 h-8 text-neutral-300 mx-auto' />
            <div className='font-bold text-sm text-[#171717]'>
              {activeTab === 'approved'
                ? 'Không có chương nào đang chờ duyệt xuất bản'
                : 'Chưa có chương nào trong danh mục này'}
            </div>
            <p className='text-xs text-[#737373] max-w-sm mx-auto'>
              {activeTab === 'approved'
                ? 'Khi Producer hoàn tất sản xuất và duyệt chương (Approve), chương sẽ tự động xuất hiện tại đây để Publisher xem xét và phát hành.'
                : 'Mọi chương được tạo trong Series sẽ hiển thị tại danh mục này.'}
            </p>
          </div>
        ) : (
          <div className='divide-y divide-[#E7E7E7]'>
            {filteredChapters.map((chap) => {
              const isScheduled = chap.publishedAt && new Date(chap.publishedAt) > new Date();

              return (
                <div
                  key={chap.id}
                  className='p-5 hover:bg-[#FAF8F5] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4'
                >
                  {/* Left: Info */}
                  <div className='space-y-1.5'>
                    <div className='flex items-center gap-2.5 flex-wrap'>
                      <span className='px-2.5 py-0.5 rounded-lg bg-neutral-900 text-white font-mono font-bold text-xs'>
                        Chương #{chap.chapterNumber}
                      </span>
                      <h3 className='font-bold text-sm text-[#171717]'>
                        {chap.title || 'Chưa đặt tiêu đề'}
                      </h3>
                      {chap.status === 'Approved' && (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1'>
                          <Clock className='w-3 h-3 text-amber-600' />
                          <span>CHỜ DUYỆT XUẤT BẢN</span>
                        </span>
                      )}
                      {chap.status === 'Published' && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${
                            isScheduled
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isScheduled ? (
                            <Calendar className='w-3 h-3 text-purple-600' />
                          ) : (
                            <Sparkles className='w-3 h-3 text-emerald-600' />
                          )}
                          <span>
                            {isScheduled ? 'ĐÃ LÊN LỊCH PHÁT HÀNH' : 'ĐÃ XUẤT BẢN CÔNG KHAI'}
                          </span>
                        </span>
                      )}
                      {chap.status === 'InProduction' && (
                        <span className='px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200'>
                          ĐANG SẢN XUẤT
                        </span>
                      )}
                    </div>

                    <div className='flex items-center gap-4 text-xs text-[#737373] font-mono flex-wrap'>
                      <span>
                        Quy mô: <strong>{chap.scenesCount || 0}</strong> cảnh •{' '}
                        <strong>{chap.pagesCount || 0}</strong> trang
                      </span>
                      <span>Version: v.{chap.versionVector}</span>
                      {chap.targetReleaseDate && (
                        <span className='flex items-center gap-1 text-neutral-600'>
                          <Calendar className='w-3 h-3' />
                          Hạn mục tiêu: {chap.targetReleaseDate}
                        </span>
                      )}
                      {chap.publishedAt && (
                        <span className='flex items-center gap-1 text-purple-700 font-semibold'>
                          <Clock className='w-3 h-3' />
                          Thời điểm phát hành: {formatDate(chap.publishedAt)}
                        </span>
                      )}
                    </div>

                    {chap.outline && (
                      <p className='text-xs text-neutral-500 italic line-clamp-1'>
                        Đề cương: {chap.outline}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                    <button
                      type='button'
                      onClick={() => setReviewingChapter(chap)}
                      className='px-3 py-1.5 rounded-xl border border-[#E7E7E7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#555555] flex items-center gap-1.5 transition-colors cursor-pointer'
                      title='Xem lịch sử phê duyệt & xuất bản'
                    >
                      <History className='w-3.5 h-3.5 text-neutral-500' />
                      <span>Lịch sử</span>
                    </button>

                    {chap.status === 'Published' && (
                      <button
                        type='button'
                        onClick={() => setReadingChapter(chap)}
                        className='px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                        title='Đọc thử trên trình đọc Catalog'
                      >
                        <BookOpen className='w-3.5 h-3.5 text-purple-600' />
                        <span>Đọc Thử</span>
                      </button>
                    )}

                    {chap.status === 'Approved' && (
                      <>
                        <button
                          type='button'
                          onClick={() => setRejectingChapter(chap)}
                          className='px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                          title='Từ chối xuất bản và mở lại sản xuất'
                        >
                          <RotateCcw className='w-3.5 h-3.5 text-rose-600' />
                          <span>Từ Chối</span>
                        </button>

                        <button
                          type='button'
                          onClick={() => setPublishingChapter(chap)}
                          className='px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs'
                          title='Xuất bản hoặc lên lịch phát hành'
                        >
                          <Send className='w-3.5 h-3.5' />
                          <span>Xuất Bản / Lên Lịch</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {publishingChapter && (
        <PublishScheduleModal
          isOpen={!!publishingChapter}
          chapterId={publishingChapter.id}
          chapterNumber={publishingChapter.chapterNumber}
          chapterTitle={publishingChapter.title}
          onClose={() => setPublishingChapter(null)}
          onSuccess={fetchChapters}
          onShowToast={onShowToast}
        />
      )}

      {rejectingChapter && (
        <RejectChapterModal
          isOpen={!!rejectingChapter}
          chapterId={rejectingChapter.id}
          chapterNumber={rejectingChapter.chapterNumber}
          chapterTitle={rejectingChapter.title}
          onClose={() => setRejectingChapter(null)}
          onSuccess={fetchChapters}
          onShowToast={onShowToast}
        />
      )}

      {reviewingChapter && (
        <ChapterReviewsModal
          isOpen={!!reviewingChapter}
          chapterId={reviewingChapter.id}
          chapterNumber={reviewingChapter.chapterNumber}
          chapterTitle={reviewingChapter.title}
          onClose={() => setReviewingChapter(null)}
        />
      )}

      {readingChapter && (
        <ChapterReaderModal
          isOpen={!!readingChapter}
          chapterId={readingChapter.id}
          chapterNumber={readingChapter.chapterNumber}
          chapterTitle={readingChapter.title}
          onClose={() => setReadingChapter(null)}
        />
      )}
    </div>
  );
};
