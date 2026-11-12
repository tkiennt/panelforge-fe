import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  Briefcase,
  ArrowLeft,
  RefreshCw,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  User,
  Sparkles,
  Send,
  RotateCcw,
  History,
  FileStack,
  Lock,
  Tag,
  Shield,
  Loader2,
  X,
  Filter,
} from 'lucide-react';
import {
  publisherService,
  PublisherSeriesDetailDto,
  PublisherManagedChapterDto,
} from '@/services/publisher.service';
import { bibleService, SeriesBibleDto, BibleEntryDto } from '@/services/bible.service';
import { PublishScheduleModal } from '../modals/PublishScheduleModal';
import { RejectChapterModal } from '../modals/RejectChapterModal';
import { ChapterReviewsModal } from '@/shared/modals/ChapterReviewsModal';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { ChapterReaderModal } from '@/shared/modals/ChapterReaderModal';
import { ChapterPriceBadge } from '@/shared/components/ChapterPriceBadge';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';

interface PublisherSeriesDetailViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

type ChapterTab = 'all' | 'approved' | 'published';

export const PublisherSeriesDetailView: React.FC<PublisherSeriesDetailViewProps> = ({
  onShowToast,
}) => {
  const { seriesId } = useParams<{ seriesId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [detail, setDetail] = useState<PublisherSeriesDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ChapterTab>('all');

  // Modals state for chapters
  const [publishingChapter, setPublishingChapter] = useState<PublisherManagedChapterDto | null>(
    null,
  );
  const [rejectingChapter, setRejectingChapter] = useState<PublisherManagedChapterDto | null>(null);
  const [reviewingChapter, setReviewingChapter] = useState<PublisherManagedChapterDto | null>(null);
  const [readingChapter, setReadingChapter] = useState<PublisherManagedChapterDto | null>(null);
  const [snapshotChapter, setSnapshotChapter] = useState<PublisherManagedChapterDto | null>(null);

  // Series Bible Modal state
  const [isBibleOpen, setIsBibleOpen] = useState(false);
  const [bibleData, setBibleData] = useState<SeriesBibleDto | null>(null);
  const [bibleLoading, setBibleLoading] = useState(false);
  const [bibleCategoryFilter, setBibleCategoryFilter] = useState<string>('all');

  // Fetch Series Details
  const fetchDetail = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    try {
      const data = await publisherService.getSeriesDetail(seriesId);
      setDetail(data);
    } catch (err: any) {
      onShowToast?.('Lỗi', err.message || 'Không thể tải chi tiết bộ truyện.');
    } finally {
      setLoading(false);
    }
  }, [seriesId, onShowToast]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Load Series Bible
  const handleOpenBible = async () => {
    if (!seriesId) return;
    setIsBibleOpen(true);
    if (bibleData) return;
    setBibleLoading(true);
    try {
      const data = await bibleService.getSeriesBible(seriesId);
      setBibleData(data);
    } catch (err: any) {
      onShowToast?.('Series Bible', err.message || 'Không thể tải dữ liệu Bible.');
    } finally {
      setBibleLoading(false);
    }
  };

  // Filtered chapters list
  const filteredChapters = useMemo(() => {
    if (!detail?.chapters) return [];
    if (activeTab === 'approved') {
      return detail.chapters.filter((c) => c.status === 'Approved');
    }
    if (activeTab === 'published') {
      return detail.chapters.filter((c) => c.status === 'Published');
    }
    return detail.chapters;
  }, [detail, activeTab]);

  const approvedCount = useMemo(() => {
    return detail?.chapters.filter((c) => c.status === 'Approved').length || 0;
  }, [detail]);

  const publishedCount = useMemo(() => {
    return detail?.chapters.filter((c) => c.status === 'Published').length || 0;
  }, [detail]);

  // Filtered Bible entries
  const filteredBibleEntries = useMemo(() => {
    if (!bibleData?.entries) return [];
    if (bibleCategoryFilter === 'all') return bibleData.entries;
    return bibleData.entries.filter((e) => String(e.category) === bibleCategoryFilter);
  }, [bibleData, bibleCategoryFilter]);

  if (loading) {
    return (
      <div className='min-h-full bg-[#F3F0E9] p-12 flex flex-col items-center justify-center space-y-3'>
        <RefreshCw className='w-7 h-7 animate-spin text-[#EA580C]' />
        <p className='text-xs font-semibold text-stone-600'>
          Đang tải thông tin chi tiết bộ truyện...
        </p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className='min-h-full bg-[#F3F0E9] p-12 text-center space-y-4'>
        <BookOpen className='w-10 h-10 text-stone-300 mx-auto' />
        <p className='text-stone-700 font-serif font-bold text-base'>
          Không tìm thấy thông tin bộ truyện này.
        </p>
        <button
          onClick={() => navigate('/publisher/series')}
          className='px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-colors'
        >
          {t('publisher.detail.backToSeries', 'Quay lại danh sách bộ truyện')}
        </button>
      </div>
    );
  }

  const coverSrc = detail.coverImageUrl || detail.coverUrl;

  return (
    <div className='min-h-full bg-[#F3F0E9] p-4 sm:p-6 lg:p-8 space-y-6'>
      {/* Top Navigation Bar */}
      <div className='flex items-center justify-between gap-4'>
        <button
          type='button'
          onClick={() => navigate('/publisher/series')}
          className='px-3.5 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#EFECE5] text-xs font-semibold text-stone-700 rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-2xs'
        >
          <ArrowLeft className='w-4 h-4' />
          <span>{t('publisher.detail.backToSeries', 'Danh sách bộ truyện')}</span>
        </button>

        <div className='flex items-center gap-2.5'>
          <button
            type='button'
            onClick={fetchDetail}
            className='px-3.5 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#EFECE5] text-xs font-semibold text-stone-600 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
          >
            <RefreshCw className='w-3.5 h-3.5' />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 1. Phần Trên: Hồ Sơ Bộ Truyện & Công Cụ Publisher (2-column layout) */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-7 shadow-2xs flex flex-col lg:flex-row gap-6 lg:gap-8'>
        {/* Cột Trái: Ảnh Bìa Lớn (3:4) */}
        <div className='w-full sm:w-[200px] md:w-[220px] lg:w-[240px] shrink-0 mx-auto sm:mx-0'>
          <div className='relative aspect-[3/4] rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/90 shadow-md flex items-center justify-center'>
            {coverSrc ? (
              <AuthenticatedImage
                src={coverSrc}
                alt={detail.title}
                className='w-full h-full object-cover'
                fallback={
                  <div className='w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 flex flex-col items-center justify-center p-3 text-stone-500'>
                    <BookOpen className='w-12 h-12 opacity-40 mb-2' />
                    <span className='text-xs text-center font-bold font-serif'>{detail.title}</span>
                  </div>
                }
              />
            ) : (
              <div className='w-full h-full bg-gradient-to-br from-orange-50 via-stone-100 to-stone-200 flex flex-col items-center justify-center p-4 text-stone-500'>
                <BookOpen className='w-12 h-12 text-[#C2410C]/40 mb-2' />
                <span className='text-xs text-center font-bold font-serif text-stone-700'>
                  {detail.title}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Thông Tin & Công Cụ Publisher */}
        <div className='flex-1 flex flex-col justify-between space-y-4'>
          <div className='space-y-3.5'>
            {/* Studio, Producer, Badges */}
            <div className='flex items-center justify-between gap-2 flex-wrap'>
              <div className='flex items-center gap-2 flex-wrap'>
                <span className='px-3 py-1 rounded-lg bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1.5 border border-stone-200/80'>
                  <Briefcase className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>{detail.workspaceName}</span>
                </span>

                {detail.producerName && (
                  <span className='px-3 py-1 rounded-lg bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1.5 border border-stone-200/80'>
                    <User className='w-3.5 h-3.5 text-stone-500' />
                    <span>
                      Producer: <strong>{detail.producerName}</strong>
                    </span>
                  </span>
                )}
              </div>

              <div className='flex items-center gap-1.5'>
                <span className='px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1'>
                  <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
                  <span>
                    {detail.status === 'Ongoing'
                      ? t('publisher.detail.ongoing', 'Đang sản xuất')
                      : detail.status}
                  </span>
                </span>

                <span className='px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200'>
                  {detail.ageRating || 'All'}
                </span>
              </div>
            </div>

            {/* Tiêu đề Bộ truyện Lớn */}
            <h1 className='text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight leading-snug'>
              {detail.title}
            </h1>

            {/* Hàng nút công cụ dành cho Publisher */}
            <div className='flex items-center gap-3 flex-wrap pt-1'>
              <button
                type='button'
                onClick={handleOpenBible}
                className='px-4 py-2 rounded-xl bg-[#FCFBF8] hover:bg-[#FFF2E6] text-stone-800 hover:text-[#C2410C] border border-[#D8D2C5] hover:border-[#FDBA74] text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-all'
              >
                <BookMarked className='w-4 h-4 text-[#C2410C]' />
                <span>{t('publisher.detail.viewBible', 'Xem Series Bible')}</span>
              </button>
            </div>

            {/* Thể loại */}
            <div className='flex items-center gap-1.5 flex-wrap pt-1'>
              <span className='text-xs font-bold text-stone-500'>Thể loại:</span>
              {detail.genres && detail.genres.length > 0 ? (
                detail.genres.map((g, idx) => (
                  <span
                    key={idx}
                    className='px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200/70'
                  >
                    {g}
                  </span>
                ))
              ) : (
                <span className='px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-800 text-xs font-medium border border-stone-200/70'>
                  {detail.genre || 'Manga'}
                </span>
              )}
            </div>

            {/* Logline */}
            {detail.logline && (
              <div className='p-3.5 rounded-xl bg-[#FFF2E6] border border-[#FDBA74] text-xs text-[#9A3412] leading-relaxed space-y-1'>
                <div className='font-bold flex items-center gap-1.5'>
                  <Sparkles className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>Logline Cốt Truyện</span>
                </div>
                <p className='text-stone-800'>{detail.logline}</p>
              </div>
            )}

            {/* Tóm tắt phát hành (Synopsis) */}
            {detail.synopsis && (
              <div className='text-xs text-stone-700 leading-relaxed space-y-1 bg-[#F8F6F0] p-3 rounded-xl border border-[#E7E2D7]'>
                <span className='font-bold text-stone-900 block'>
                  {t('publisher.detail.synopsis', 'Tóm tắt phát hành')}:
                </span>
                <p>{detail.synopsis}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Phần Dưới: Danh Sách Chương Của Bộ Truyện (Chapter Queue & Actions) */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4'>
        {/* Header & Tabs */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7E2D7] pb-4'>
          <div className='flex items-center gap-2'>
            <FileText className='w-5 h-5 text-[#C2410C]' />
            <h2 className='text-base font-serif font-bold text-[#1C1917]'>
              {t('publisher.detail.chapterQueue', 'Danh Sách Chương Cần Quản Lý')}
            </h2>
            <span className='text-xs font-mono font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full'>
              {detail.chapters.length}
            </span>
          </div>

          {/* Filter Tabs */}
          <div className='flex items-center gap-1.5 bg-[#F3F0E9] p-1 rounded-xl'>
            <button
              type='button'
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {t('publisher.detail.allChapters', 'Tất cả')} ({detail.chapters.length})
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-[#EA580C] text-white shadow-2xs'
                  : 'text-[#C2410C] hover:bg-orange-100'
              }`}
            >
              <Clock className='w-3 h-3' />
              <span>{t('publisher.detail.waitingApproval', 'Chờ duyệt')}</span>
              {approvedCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === 'approved' ? 'bg-white text-[#EA580C]' : 'bg-[#EA580C] text-white'
                  }`}
                >
                  {approvedCount}
                </span>
              )}
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className='w-3 h-3' />
              <span>{t('publisher.detail.publishedAndScheduled', 'Đã phát hành')}</span>
              {publishedCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === 'published'
                      ? 'bg-white text-emerald-800'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {publishedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Danh Sách Từng Chương */}
        {filteredChapters.length === 0 ? (
          <div className='py-12 text-center text-stone-500 space-y-2'>
            <BookOpen className='w-8 h-8 text-stone-300 mx-auto' />
            <p className='text-xs'>
              {t(
                'publisher.detail.emptyChapters',
                'Chưa có chương nào ở trạng thái chờ duyệt hoặc đã phát hành.',
              )}
            </p>
          </div>
        ) : (
          <div className='space-y-3.5'>
            {filteredChapters.map((chap) => {
              const isScheduled =
                chap.status === 'Published' &&
                chap.publishAt &&
                new Date(chap.publishAt) > new Date();
              const isOfficialReleased =
                chap.status === 'Published' &&
                (!chap.publishAt || new Date(chap.publishAt) <= new Date());

              return (
                <div
                  key={chap.chapterId}
                  className='bg-white border border-[#E7E2D7] hover:border-[#FDBA74] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-soft-sm transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4'
                >
                  {/* Left: Info */}
                  <div className='flex items-start sm:items-center gap-3.5 min-w-0 flex-1'>
                    {/* Chapter Number Badge */}
                    <div className='w-14 h-12 rounded-xl bg-[#F8F6F0] border border-[#D8D2C5] font-mono font-bold text-sm text-[#1C1917] flex flex-col items-center justify-center shrink-0 shadow-2xs'>
                      <span className='text-[10px] text-stone-400 font-sans font-normal'>Tập</span>
                      <span>#{chap.chapterNumber}</span>
                    </div>

                    <div className='min-w-0 space-y-1.5'>
                      <div className='flex items-center gap-2.5 flex-wrap'>
                        <h3 className='font-bold text-sm sm:text-base text-[#1C1917] truncate'>
                          {chap.title
                            ? `Chương #${chap.chapterNumber}: ${chap.title}`
                            : `Chương #${chap.chapterNumber} (Bản hoàn chỉnh)`}
                        </h3>

                        <ChapterPriceBadge isLocked={chap.isLocked} priceVnd={chap.priceVnd} />

                        {/* Status Badge */}
                        {chap.status === 'Approved' && (
                          <span className='px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] flex items-center gap-1 shadow-2xs'>
                            <Clock className='w-3 h-3 text-[#EA580C]' />
                            <span>Chờ Publisher duyệt</span>
                          </span>
                        )}

                        {isScheduled && (
                          <span className='px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1 shadow-2xs'>
                            <Calendar className='w-3 h-3 text-indigo-600' />
                            <span>
                              Hẹn giờ: {new Date(chap.publishAt!).toLocaleString('vi-VN')}
                            </span>
                          </span>
                        )}

                        {isOfficialReleased && (
                          <span className='px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-2xs'>
                            <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                            <span>
                              Đã phát hành{' '}
                              {chap.publishAt
                                ? `(${new Date(chap.publishAt).toLocaleDateString('vi-VN')})`
                                : ''}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Sub-info: Trang, Duyệt bởi Producer */}
                      <div className='text-xs text-stone-500 flex items-center gap-3.5 flex-wrap'>
                        <span className='flex items-center gap-1 font-medium'>
                          <FileText className='w-3.5 h-3.5 text-stone-400' />
                          <span>{chap.pageCount} trang</span>
                        </span>

                        {chap.approvedBy && (
                          <span className='flex items-center gap-1'>
                            <User className='w-3.5 h-3.5 text-stone-400' />
                            <span>
                              Producer duyệt: <strong>{chap.approvedBy}</strong>
                            </span>
                          </span>
                        )}

                        {chap.approvedAt && (
                          <span className='flex items-center gap-1 font-mono text-[11px]'>
                            <Calendar className='w-3.5 h-3.5 text-stone-400' />
                            <span>{new Date(chap.approvedAt).toLocaleString('vi-VN')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className='flex items-center gap-2 flex-wrap shrink-0 self-end lg:self-center'>
                    {/* Nhóm nút kiểm tra */}
                    <div className='flex items-center gap-1.5 bg-[#F8F6F0] p-1 rounded-xl border border-[#E7E2D7]'>
                      {/* Đọc thử */}
                      <button
                        type='button'
                        onClick={() => setReadingChapter(chap)}
                        className='px-2.5 py-1.5 rounded-lg hover:bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer'
                        title='Đọc thử trên trình đọc Manga Reader'
                      >
                        <BookOpen className='w-3.5 h-3.5 text-[#C2410C]' />
                        <span>{t('publisher.detail.readPreview', 'Đọc thử')}</span>
                      </button>

                      {/* Bản duyệt (Manifest) */}
                      <button
                        type='button'
                        onClick={() => setSnapshotChapter(chap)}
                        className='px-2.5 py-1.5 rounded-lg hover:bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer'
                        title='Xem manifest ChapterSnapshot đã đóng băng bởi Producer'
                      >
                        <FileStack className='w-3.5 h-3.5 text-stone-500' />
                        <span>{t('publisher.detail.viewManifest', 'Bản duyệt')}</span>
                      </button>

                      {/* Lịch sử review */}
                      <button
                        type='button'
                        onClick={() => setReviewingChapter(chap)}
                        className='px-2.5 py-1.5 rounded-lg hover:bg-white text-xs font-semibold text-stone-700 hover:text-stone-900 flex items-center gap-1.5 transition-colors cursor-pointer'
                        title='Lịch sử phê duyệt và biên bản họp'
                      >
                        <History className='w-3.5 h-3.5 text-stone-500' />
                        <span>{t('publisher.detail.reviewHistory', 'Lịch sử')}</span>
                      </button>
                    </div>

                    {/* Nhóm nút quyết định */}
                    {chap.status === 'Approved' && (
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => setRejectingChapter(chap)}
                          className='px-3.5 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                          title='Từ chối và trả về Studio sản xuất'
                        >
                          <RotateCcw className='w-3.5 h-3.5 text-rose-600' />
                          <span>{t('publisher.detail.reject', 'Từ chối')}</span>
                        </button>

                        <button
                          type='button'
                          onClick={() => setPublishingChapter(chap)}
                          className='px-4 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-soft-sm active:scale-95'
                          title='Phát hành ngay hoặc lên lịch hẹn giờ'
                        >
                          <Send className='w-3.5 h-3.5' />
                          <span>
                            {t('publisher.detail.publishSchedule', 'Xuất bản / Lên lịch')}
                          </span>
                        </button>
                      </div>
                    )}

                    {isScheduled && (
                      <button
                        type='button'
                        onClick={() => setPublishingChapter(chap)}
                        className='px-3.5 py-1.5 rounded-xl border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
                        title='Đổi lịch phát hành'
                      >
                        <Calendar className='w-3.5 h-3.5 text-indigo-600' />
                        <span>Đổi lịch</span>
                      </button>
                    )}

                    {isOfficialReleased && (
                      <span className='px-3.5 py-1.5 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 text-xs font-semibold flex items-center gap-1.5 select-none'>
                        <Lock className='w-3.5 h-3.5 text-stone-500' />
                        <span>{t('publisher.detail.lockedOfficial', 'Bản chính thức')}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 2: Series Bible Modal */}
      {isBibleOpen && (
        <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-3xl p-6 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-4 custom-scrollbar'>
            {/* Header */}
            <div className='flex items-center justify-between border-b border-[#E7E2D7] pb-3'>
              <div className='flex items-center gap-2.5'>
                <div className='w-9 h-9 rounded-xl bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center'>
                  <BookMarked className='w-5 h-5' />
                </div>
                <div>
                  <h3 className='font-serif font-bold text-base text-[#1C1917]'>
                    Series Bible // Thiết Lập Thế Giới &amp; Nhân Vật
                  </h3>
                  <p className='text-xs text-stone-500'>
                    Tra cứu toàn bộ thiết lập nhân vật, bối cảnh, đạo cụ của{' '}
                    <strong>{detail.title}</strong>
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setIsBibleOpen(false)}
                className='w-8 h-8 rounded-full hover:bg-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            {/* Filter by Category */}
            <div className='flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar'>
              {['all', 'Character', 'Location', 'Prop', 'Terminology', 'StyleRule', 'PlotFact'].map(
                (cat) => (
                  <button
                    key={cat}
                    type='button'
                    onClick={() => setBibleCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      bibleCategoryFilter === cat
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {cat === 'all'
                      ? 'Tất cả'
                      : cat === 'Character'
                        ? 'Nhân vật'
                        : cat === 'Location'
                          ? 'Địa điểm'
                          : cat === 'Prop'
                            ? 'Đạo cụ'
                            : cat === 'Terminology'
                              ? 'Thuật ngữ'
                              : cat === 'StyleRule'
                                ? 'Quy chuẩn vẽ'
                                : 'Tình tiết cốt truyện'}
                  </button>
                ),
              )}
            </div>

            {/* Content List */}
            {bibleLoading ? (
              <div className='py-16 text-center text-stone-500 flex flex-col items-center justify-center space-y-2'>
                <RefreshCw className='w-6 h-6 animate-spin text-orange-600' />
                <p className='text-xs font-semibold'>Đang tải dữ liệu Series Bible...</p>
              </div>
            ) : filteredBibleEntries.length === 0 ? (
              <div className='py-12 text-center text-stone-500 space-y-2'>
                <BookOpen className='w-8 h-8 text-stone-300 mx-auto' />
                <p className='text-xs'>Không tìm thấy mục thiết lập nào trong phân loại này.</p>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
                {filteredBibleEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className='bg-white border border-[#E7E2D7] rounded-xl p-3.5 shadow-2xs space-y-2'
                  >
                    <div className='flex items-center justify-between gap-2'>
                      <span className='font-mono font-bold text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded'>
                        {entry.code}
                      </span>
                      <span className='text-[10.5px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded'>
                        {String(entry.category)}
                      </span>
                    </div>
                    <div className='font-bold text-sm text-stone-900'>{entry.name}</div>
                    {entry.subtitle && (
                      <div className='text-xs text-stone-500 italic'>{entry.subtitle}</div>
                    )}
                    <p className='text-xs text-stone-700 line-clamp-3 leading-relaxed'>
                      {entry.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Publish & Schedule Modal */}
      {publishingChapter && (
        <PublishScheduleModal
          isOpen={!!publishingChapter}
          chapterId={publishingChapter.chapterId}
          chapterNumber={Number(publishingChapter.chapterNumber)}
          chapterTitle={publishingChapter.title}
          onClose={() => setPublishingChapter(null)}
          onSuccess={fetchDetail}
          onShowToast={onShowToast}
        />
      )}

      {/* MODAL 4: Reject Chapter Modal */}
      {rejectingChapter && (
        <RejectChapterModal
          isOpen={!!rejectingChapter}
          chapterId={rejectingChapter.chapterId}
          chapterNumber={Number(rejectingChapter.chapterNumber)}
          chapterTitle={rejectingChapter.title}
          onClose={() => setRejectingChapter(null)}
          onSuccess={fetchDetail}
          onShowToast={onShowToast}
        />
      )}

      {/* MODAL 5: Chapter Reviews Modal */}
      {reviewingChapter && (
        <ChapterReviewsModal
          isOpen={!!reviewingChapter}
          chapterId={reviewingChapter.chapterId}
          chapterNumber={Number(reviewingChapter.chapterNumber)}
          chapterTitle={reviewingChapter.title}
          onClose={() => setReviewingChapter(null)}
        />
      )}

      {/* MODAL 6: Chapter Snapshot Manifest (Provenance) Modal */}
      {snapshotChapter && (
        <ChapterProvenanceModal
          seriesId={seriesId!}
          chapterId={snapshotChapter.chapterId}
          chapterNumber={Number(snapshotChapter.chapterNumber)}
          chapterTitle={snapshotChapter.title}
          viewerRole='Publisher'
          onClose={() => setSnapshotChapter(null)}
        />
      )}

      {/* MODAL 7: Chapter Reader Preview Modal */}
      {readingChapter && (
        <ChapterReaderModal
          isOpen={!!readingChapter}
          chapterId={readingChapter.chapterId}
          chapterNumber={Number(readingChapter.chapterNumber)}
          chapterTitle={readingChapter.title}
          onClose={() => setReadingChapter(null)}
        />
      )}
    </div>
  );
};
