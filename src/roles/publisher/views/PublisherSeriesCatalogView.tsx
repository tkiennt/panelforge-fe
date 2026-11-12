import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  Briefcase,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Flame,
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  Send,
} from 'lucide-react';
import {
  publisherService,
  PublisherSeriesListItemDto,
  PublisherWorkspaceDto,
} from '@/services/publisher.service';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';

interface PublisherSeriesCatalogViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

type FilterTab = 'all' | 'needs_review' | 'scheduled';
type SortOption = 'latest' | 'az';

export const PublisherSeriesCatalogView: React.FC<PublisherSeriesCatalogViewProps> = ({
  onShowToast,
}) => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [seriesList, setSeriesList] = useState<PublisherSeriesListItemDto[]>([]);
  const [workspaces, setWorkspaces] = useState<PublisherWorkspaceDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Workspaces for studio filter
  useEffect(() => {
    publisherService
      .getWorkspaces()
      .then((data) => setWorkspaces(data || []))
      .catch((err) => console.warn('Không thể tải danh sách Studio:', err));
  }, []);

  // Fetch Series
  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await publisherService.getSeries({
        filter: activeTab === 'all' ? undefined : activeTab,
        workspaceId: selectedWorkspaceId || undefined,
        search: searchQuery.trim() || undefined,
        sortBy: sortBy,
      });
      setSeriesList(data || []);
    } catch (err: any) {
      onShowToast?.('Không thể tải danh mục bộ truyện', err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedWorkspaceId, searchQuery, sortBy, onShowToast]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  // Total review counts for badges
  const pendingReviewCount = useMemo(() => {
    return seriesList.filter((s) => s.approvedChaptersCount > 0).length;
  }, [seriesList]);

  const totalApprovedChapters = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + (s.approvedChaptersCount || 0), 0);
  }, [seriesList]);

  return (
    <div className='min-h-full bg-[#F3F0E9] p-4 sm:p-6 lg:p-8 space-y-6'>
      {/* Top Banner */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-center gap-3.5'>
          <div className='w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#FDBA74] text-[#C2410C] flex items-center justify-center shadow-xs shrink-0'>
            <BookMarked className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-xl sm:text-2xl font-serif font-bold text-[#1C1917]'>
                Quản Lý Bộ Truyện Xuất Bản
              </h1>
              <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] text-xs font-mono font-bold'>
                PUBLISHER PORTAL
              </span>
            </div>
            <p className='text-xs text-[#57534E] mt-1'>
              Giám sát tiến độ xuất bản toàn hệ thống: duyệt chương hoàn chỉnh từ các Studio, kiểm
              soát lịch phát hành và xem Series Bible.
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <button
            type='button'
            onClick={fetchSeries}
            disabled={loading}
            className='px-3.5 py-2 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] text-xs font-semibold text-[#57534E] hover:text-[#1C1917] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type='button'
            onClick={() => navigate('/publisher/catalog')}
            className='px-3.5 py-2 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] text-xs font-semibold text-[#57534E] hover:text-[#1C1917] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
          >
            <BookOpen className='w-3.5 h-3.5 text-stone-500' />
            <span>Danh mục công khai</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4 shadow-2xs space-y-4'>
        {/* Tabs */}
        <div className='flex items-center gap-2 border-b border-[#E7E2D7] pb-3 overflow-x-auto custom-scrollbar'>
          <button
            type='button'
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'all'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'text-[#57534E] hover:bg-[#EFECE5] hover:text-[#1C1917]'
            }`}
          >
            <Layers className='w-3.5 h-3.5' />
            <span>Tất cả bộ truyện</span>
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('needs_review')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'needs_review'
                ? 'bg-[#EA580C] text-white shadow-xs'
                : 'text-[#C2410C] bg-[#FFF2E6] hover:bg-[#FED7AA] border border-[#FDBA74]'
            }`}
          >
            <Flame className='w-3.5 h-3.5 text-amber-300' />
            <span>Có chương chờ duyệt</span>
            {totalApprovedChapters > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'needs_review'
                    ? 'bg-white text-[#EA580C]'
                    : 'bg-[#EA580C] text-white'
                }`}
              >
                {totalApprovedChapters}
              </span>
            )}
          </button>

          <button
            type='button'
            onClick={() => setActiveTab('scheduled')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'scheduled'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'text-[#57534E] hover:bg-[#EFECE5] hover:text-[#1C1917]'
            }`}
          >
            <Calendar className='w-3.5 h-3.5' />
            <span>Đang lên lịch</span>
          </button>
        </div>

        {/* Search, Studio dropdown, Sort dropdown */}
        <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-3 flex-1'>
            {/* Search */}
            <div className='relative flex-1 min-w-[220px]'>
              <Search className='w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2' />
              <input
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Tìm kiếm theo tên bộ truyện hoặc Studio...'
                className='w-full text-xs bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl pl-9 pr-8 py-2 text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30'
              />
              {searchQuery && (
                <button
                  type='button'
                  onClick={() => setSearchQuery('')}
                  className='absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              )}
            </div>

            {/* Studio Filter */}
            <div className='flex items-center gap-1.5'>
              <Briefcase className='w-4 h-4 text-[#C2410C] shrink-0' />
              <select
                value={selectedWorkspaceId}
                onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                className='text-xs font-medium bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 cursor-pointer min-w-[170px]'
              >
                <option value=''>Tất cả Studio</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.seriesCount} truyện)
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className='flex items-center gap-1.5'>
              <ArrowUpDown className='w-4 h-4 text-stone-500 shrink-0' />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className='text-xs font-medium bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 cursor-pointer min-w-[140px]'
              >
                <option value='latest'>Mới cập nhật</option>
                <option value='az'>Tên A - Z</option>
              </select>
            </div>

            {(selectedWorkspaceId || searchQuery) && (
              <button
                type='button'
                onClick={() => {
                  setSelectedWorkspaceId('');
                  setSearchQuery('');
                }}
                className='px-2.5 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-200 text-xs font-semibold text-stone-600 flex items-center gap-1 transition-colors cursor-pointer'
              >
                <X className='w-3.5 h-3.5' />
                <span>Xóa lọc</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Series Grid (2-column layout like Manga catalog) */}
      {loading ? (
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-16 text-center text-[#57534E] space-y-3 shadow-2xs'>
          <RefreshCw className='w-8 h-8 text-[#EA580C] animate-spin mx-auto' />
          <p className='text-xs font-semibold'>Đang tải danh sách bộ truyện...</p>
        </div>
      ) : seriesList.length === 0 ? (
        <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-16 text-center text-[#57534E] space-y-3 shadow-2xs'>
          <BookOpen className='w-10 h-10 text-[#D8D2C5] mx-auto' />
          <div className='font-serif font-bold text-base text-[#1C1917]'>
            Không tìm thấy bộ truyện nào
          </div>
          <p className='text-xs text-[#57534E] max-w-md mx-auto'>
            {activeTab === 'needs_review'
              ? 'Hiện tại không có bộ truyện nào đang có chương chờ duyệt xuất bản.'
              : activeTab === 'scheduled'
                ? 'Không có bộ truyện nào đang có chương hẹn giờ phát hành.'
                : 'Chưa có bộ truyện nào phù hợp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc.'}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 xl:grid-cols-2 gap-5'>
          {seriesList.map((s) => {
            const seriesTargetId = s.seriesId || s.id;
            const coverSrc = s.coverImageUrl || s.coverUrl;

            return (
              <div
                key={seriesTargetId}
                className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-soft-sm hover:border-[#F97316]/50 transition-all flex flex-col sm:flex-row gap-4 sm:gap-5'
              >
                {/* Left: Vertical Cover Image (Aspect 3:4) */}
                <div
                  onClick={() => navigate(`/publisher/series/${seriesTargetId}`)}
                  className='w-full sm:w-[130px] md:w-[145px] shrink-0 cursor-pointer group'
                >
                  <div className='relative aspect-[3/4] rounded-xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-2xs flex items-center justify-center'>
                    {coverSrc ? (
                      <AuthenticatedImage
                        src={coverSrc}
                        alt={s.title}
                        className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                        fallback={
                          <div className='w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 flex flex-col items-center justify-center p-2 text-stone-500'>
                            <BookOpen className='w-8 h-8 opacity-40 mb-1' />
                            <span className='text-[10px] text-center font-bold font-serif line-clamp-2'>
                              {s.title}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      <div className='w-full h-full bg-gradient-to-br from-orange-50 via-stone-100 to-stone-200 flex flex-col items-center justify-center p-2 text-stone-500 group-hover:bg-orange-100/50 transition-colors'>
                        <BookOpen className='w-8 h-8 text-[#C2410C]/40 mb-1' />
                        <span className='text-[10px] text-center font-bold font-serif text-stone-700 line-clamp-2'>
                          {s.title}
                        </span>
                      </div>
                    )}

                    {/* Floating Orange Badge if Chapters need review */}
                    {s.approvedChaptersCount > 0 && (
                      <div className='absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#EA580C] text-white font-bold text-[10px] tracking-wide shadow-md flex items-center gap-1 backdrop-blur-xs'>
                        <Clock className='w-3 h-3' />
                        <span>{s.approvedChaptersCount} chờ duyệt</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Series Details */}
                <div className='flex-1 flex flex-col justify-between min-w-0 py-0.5 space-y-3'>
                  {/* Studio & Metadata */}
                  <div className='space-y-2'>
                    {/* Studio Pill */}
                    <div className='flex items-center justify-between gap-2 flex-wrap'>
                      <span className='px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 font-sans font-semibold text-[11px] flex items-center gap-1.5 border border-stone-200/80 transition-colors'>
                        <Briefcase className='w-3.5 h-3.5 text-[#C2410C]' />
                        <span>{s.workspaceName}</span>
                      </span>

                      <span className='px-2 py-0.5 rounded-full text-[10.5px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1'>
                        <span className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
                        <span>{s.status === 'Ongoing' ? 'Đang sản xuất' : s.status}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h2
                      onClick={() => navigate(`/publisher/series/${seriesTargetId}`)}
                      className='text-base sm:text-lg font-serif font-bold text-[#1C1917] hover:text-[#C2410C] cursor-pointer transition-colors line-clamp-1 leading-snug'
                      title={s.title}
                    >
                      {s.title}
                    </h2>

                    {/* Tags: Genres & Age Rating */}
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      {s.genres && s.genres.length > 0 ? (
                        s.genres.map((g, idx) => (
                          <span
                            key={idx}
                            className='px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10.5px] font-medium border border-stone-200/60'
                          >
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className='px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10.5px] font-medium border border-stone-200/60'>
                          {s.genre || 'Manga'}
                        </span>
                      )}

                      <span className='px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10.5px] font-mono font-bold border border-amber-200'>
                        {s.ageRating || 'All'}
                      </span>
                    </div>

                    {/* Synopsis */}
                    {s.synopsis && (
                      <p className='text-xs text-stone-600 line-clamp-2 leading-relaxed'>
                        {s.synopsis}
                      </p>
                    )}
                  </div>

                  {/* Chapter Stats and Latest Chapter Card */}
                  <div className='space-y-2 pt-1 border-t border-[#E7E2D7]'>
                    {/* Stats */}
                    <div className='flex items-center justify-between text-xs text-stone-600'>
                      <div className='flex items-center gap-1.5'>
                        <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                        <span>Đã xuất bản:</span>
                        <strong className='text-stone-900 font-bold'>
                          {s.publishedChaptersCount} chương
                        </strong>
                      </div>

                      <div className='flex items-center gap-1.5'>
                        <Clock className='w-3.5 h-3.5 text-[#C2410C]' />
                        <span>Chờ duyệt:</span>
                        <strong
                          className={
                            s.approvedChaptersCount > 0
                              ? 'text-[#EA580C] font-bold'
                              : 'text-stone-700 font-semibold'
                          }
                        >
                          {s.approvedChaptersCount} chương
                        </strong>
                      </div>
                    </div>

                    {/* Latest Chapter Box */}
                    {s.latestChapter ? (
                      <div className='bg-[#F8F6F0] border border-[#E7E2D7] rounded-xl px-3 py-2 flex items-center justify-between text-xs gap-2'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <span className='font-mono font-bold text-stone-800 bg-white border border-stone-300 px-1.5 py-0.5 rounded text-[11px] shrink-0'>
                            #{s.latestChapter.chapterNumber}
                          </span>
                          <span className='font-medium text-stone-700 truncate text-[11.5px]'>
                            {s.latestChapter.title || 'Bản hoàn chỉnh'}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                              s.latestChapter.status === 'Approved'
                                ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                : s.latestChapter.status === 'Published'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-stone-200 text-stone-700'
                            }`}
                          >
                            {s.latestChapter.status === 'Approved'
                              ? 'Chờ duyệt'
                              : s.latestChapter.status === 'Published'
                                ? 'Đã phát hành'
                                : s.latestChapter.status}
                          </span>
                        </div>
                        {s.latestChapter.updatedAt && (
                          <span className='text-[10.5px] text-stone-400 shrink-0 font-mono'>
                            {new Date(s.latestChapter.updatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className='text-[11px] text-stone-400 italic py-1'>
                        Chưa có chương nào
                      </div>
                    )}

                    {/* Navigate Button */}
                    <div className='flex justify-end pt-1'>
                      <button
                        type='button'
                        onClick={() => navigate(`/publisher/series/${seriesTargetId}`)}
                        className='px-3.5 py-1.5 bg-stone-100 hover:bg-[#FFF2E6] hover:text-[#C2410C] border border-stone-200 hover:border-[#FDBA74] text-xs font-semibold text-stone-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group'
                      >
                        <span>Quản lý & Duyệt chương</span>
                        <ChevronRight className='w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform' />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
