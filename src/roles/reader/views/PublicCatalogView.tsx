// src/views/catalog/PublicCatalogView.tsx
import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Compass,
  Sparkles,
  Calendar,
  Layers,
  ArrowLeft,
  X,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { catalogService, PublicSeriesDto, PublicSeriesDetailDto } from '@/services/catalog.service';
import { ChapterReaderModal } from '@/shared/modals/ChapterReaderModal';

interface PublicCatalogViewProps {
  onBackToWorkspaces?: () => void;
  onOpenLogin?: () => void;
}

export const PublicCatalogView: React.FC<PublicCatalogViewProps> = ({
  onBackToWorkspaces,
  onOpenLogin,
}) => {
  const [seriesList, setSeriesList] = useState<PublicSeriesDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [pageIndex, setPageIndex] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Detail Modal
  const [selectedSeries, setSelectedSeries] = useState<PublicSeriesDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null);

  const genres = [
    'Tất cả',
    'Action / Sci-Fi',
    'Fantasy / Isekai',
    'Mystery / Detective',
    'Horror / Supernatural',
    'Slice of Life / Drama',
  ];

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await catalogService.getPublicSeries({
        search: search.trim() || undefined,
        genre: selectedGenre === 'Tất cả' || !selectedGenre ? undefined : selectedGenre,
        pageIndex,
        pageSize: 20,
      });
      setSeriesList(res.items || []);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      console.warn('Lỗi tải danh mục catalog công khai:', err);
      setSeriesList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    // Cố ý không theo dõi `search`: tìm kiếm chỉ chạy khi submit form (handleSearchSubmit).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGenre, pageIndex]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPageIndex(1);
    fetchCatalog();
  };

  const handleOpenDetail = async (seriesId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await catalogService.getPublicSeriesDetail(seriesId);
      setSelectedSeries(detail);
    } catch (err: any) {
      setDetailError(err.message || 'Không thể tải chi tiết bộ truyện.');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#f5f5f5] text-[#0c0a09] flex flex-col'>
      {/* Top Navigation */}
      <header className='bg-[#f5f5f5]/90 backdrop-blur-md border-b border-[#e7e5e4] px-6 py-4 sticky top-0 z-30 shadow-soft-sm'>
        <div className='max-w-7xl mx-auto flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            {onBackToWorkspaces && (
              <button
                onClick={onBackToWorkspaces}
                className='p-2 rounded-full border border-[#e7e5e4] hover:bg-[#f0efed] transition-colors cursor-pointer text-[#777169] hover:text-[#0c0a09]'
                title='Quay lại Workspace'
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
            )}
            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-full bg-[#292524] text-white flex items-center justify-center font-bold text-xs shadow-soft-sm'>
                <BookOpen className='w-4 h-4' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='font-serif font-medium text-base tracking-tight text-[#0c0a09]'>
                    PanelForge Reader
                  </span>
                  <span className='px-2.5 py-0.5 bg-[#f0efed] text-[#292524] border border-[#e7e5e4] text-xs font-mono font-medium rounded-full'>
                    PUBLIC CATALOG
                  </span>
                </div>
                <p className='text-xs text-[#777169]'>Danh mục tác phẩm phát hành chính thức</p>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2.5'>
            <button
              onClick={fetchCatalog}
              disabled={loading}
              className='p-2 text-[#777169] hover:text-[#0c0a09] hover:bg-[#f0efed] border border-[#e7e5e4] rounded-full transition-all cursor-pointer'
              title='Làm mới danh mục'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className='px-4 py-2 rounded-full bg-[#292524] hover:bg-[#0c0a09] text-white text-xs font-medium shadow-soft-sm transition-all cursor-pointer'
              >
                Đăng Nhập Studio
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Filter Bar */}
      <div className='bg-[#f5f5f5] border-b border-[#e7e5e4] py-8 px-6'>
        <div className='max-w-7xl mx-auto space-y-5'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-serif font-light tracking-tight text-[#0c0a09]'>
                Thư Viện Tác Phẩm Xuất Bản
              </h1>
              <p className='text-xs text-[#777169] mt-1'>
                Khám phá các tác phẩm Manga, Webtoon và Comic chất lượng cao được sản xuất trên nền
                tảng PanelForge.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className='flex items-center gap-2 max-w-md w-full'>
              <div className='relative flex-1'>
                <Search className='w-4 h-4 text-[#777169] absolute left-3.5 top-1/2 -translate-y-1/2' />
                <input
                  type='text'
                  placeholder='Tìm kiếm theo tên truyện, tóm tắt...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 bg-white border border-[#e7e5e4] rounded-full text-xs text-[#0c0a09] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#292524] shadow-soft-sm'
                />
              </div>
              <button
                type='submit'
                className='px-5 py-2 bg-[#292524] hover:bg-[#0c0a09] text-white text-xs font-medium rounded-full transition-colors cursor-pointer shadow-soft-sm'
              >
                Tìm
              </button>
            </form>
          </div>

          {/* Genre Chips */}
          <div className='flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar'>
            {genres.map((g) => {
              const isSelected = selectedGenre === g || (g === 'Tất cả' && !selectedGenre);
              return (
                <button
                  key={g}
                  type='button'
                  onClick={() => {
                    setSelectedGenre(g === 'Tất cả' ? '' : g);
                    setPageIndex(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-soft-sm cursor-pointer ${
                    isSelected
                      ? 'bg-[#292524] text-white'
                      : 'bg-white text-[#777169] hover:text-[#0c0a09] hover:bg-[#f0efed] border border-[#e7e5e4]'
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className='flex-1 max-w-7xl w-full mx-auto p-6 md:p-8'>
        {loading ? (
          <div className='py-24 text-center space-y-3'>
            <RefreshCw className='w-8 h-8 text-[#F97316] animate-spin mx-auto' />
            <div className='text-xs font-mono text-[#888888]'>Đang tải danh mục xuất bản...</div>
          </div>
        ) : seriesList.length === 0 ? (
          /* Empty state required by BR-23 / HANDOFF */
          <div className='py-20 text-center bg-white rounded-3xl border border-dashed border-[#E7E7E7] p-8 max-w-2xl mx-auto space-y-4 shadow-xs'>
            <div className='w-16 h-16 rounded-2xl bg-[#FFF7ED] text-[#F97316] border border-[#FDBA74] flex items-center justify-center mx-auto shadow-2xs'>
              <BookOpen className='w-8 h-8' />
            </div>
            <div className='space-y-1.5'>
              <h3 className='text-lg font-bold text-[#171717]'>
                Chưa có Series nào được phát hành công khai
              </h3>
              <p className='text-xs text-[#737373] max-w-md mx-auto leading-relaxed'>
                Hiện tại các dự án truyện tranh đang trong giai đoạn sản xuất tại Studio Desk. Sau
                khi các chương được Biên tập viên duyệt (Approved) và xuất bản chính thức
                (Published), chúng sẽ xuất hiện tại đây cho độc giả thưởng thức.
              </p>
            </div>
            {onBackToWorkspaces && (
              <button
                onClick={onBackToWorkspaces}
                className='inline-flex items-center gap-1.5 px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold rounded-full shadow-soft-sm transition-all cursor-pointer'
              >
                <Compass className='w-3.5 h-3.5' />
                <span>Trở Về Studio Workspace</span>
              </button>
            )}
          </div>
        ) : (
          /* Populated Grid */
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {seriesList.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item.id)}
                className='bg-white rounded-2xl border border-[#f0efed] hover:border-[#292524] p-6 space-y-4 shadow-soft-sm hover:shadow-soft-md transition-all duration-200 cursor-pointer group flex flex-col justify-between'
              >
                <div className='space-y-2.5'>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='px-2.5 py-0.5 rounded-full bg-[#f0efed] text-[#292524] font-mono text-xs font-medium border border-[#e7e5e4]'>
                      {item.genre}
                    </span>
                    <span className='text-xs font-mono bg-[#fafafa] px-2.5 py-0.5 rounded-full border border-[#e7e5e4] text-[#777169]'>
                      {item.format}
                    </span>
                  </div>

                  <h3 className='text-base font-semibold text-[#0c0a09] group-hover:text-[#292524] transition-colors line-clamp-1'>
                    {item.title}
                  </h3>

                  <p className='text-xs text-[#777169] line-clamp-3 leading-relaxed'>
                    {item.synopsis || 'Chưa có mô tả tóm tắt cho bộ truyện này.'}
                  </p>
                </div>

                <div className='pt-3.5 border-t border-[#f0efed] space-y-2 text-xs font-mono text-[#777169]'>
                  <div className='flex items-center justify-between'>
                    <span>Studio:</span>
                    <span className='font-semibold text-[#0c0a09]'>{item.studioName}</span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span>Số chương phát hành:</span>
                    <span className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200'>
                      {item.publishedChapterCount} chương
                    </span>
                  </div>
                  {item.latestPublishedAt && (
                    <div className='flex items-center justify-between text-xs text-[#a8a29e]'>
                      <span>Mới nhất:</span>
                      <span>{new Date(item.latestPublishedAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Series Detail Modal */}
      {selectedSeries && (
        <div className='fixed inset-0 z-50 bg-[#0c0a09]/50 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white rounded-2xl border border-[#f0efed] shadow-soft-lg max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200'>
            <div className='flex items-start justify-between border-b border-[#f0efed] pb-3.5'>
              <div>
                <span className='px-2.5 py-0.5 rounded-full bg-[#f0efed] text-[#292524] font-mono text-xs font-medium border border-[#e7e5e4]'>
                  {selectedSeries.genre}
                </span>
                <h2 className='text-xl font-serif font-light text-[#0c0a09] mt-2'>
                  {selectedSeries.title}
                </h2>
                <span className='text-xs text-[#777169] font-mono mt-0.5 block'>
                  Studio: {selectedSeries.studioName} • {selectedSeries.format}
                </span>
              </div>
              <button
                onClick={() => setSelectedSeries(null)}
                className='text-[#777169] hover:text-[#0c0a09] p-1.5 rounded-full hover:bg-[#f0efed] transition-colors cursor-pointer'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <p className='text-xs text-[#4e4e4e] leading-relaxed'>
              {selectedSeries.synopsis || 'Chưa có thông tin tóm tắt.'}
            </p>

            <div className='space-y-2 flex-1 overflow-y-auto border border-[#f0efed] rounded-xl p-3.5 bg-[#fafafa]'>
              <div className='text-xs font-semibold text-[#0c0a09] flex items-center gap-1.5'>
                <Sparkles className='w-3.5 h-3.5 text-[#292524]' />
                <span>Danh Sách Chương Đã Phát Hành ({selectedSeries.chapters.length})</span>
              </div>

              {selectedSeries.chapters.length === 0 ? (
                <div className='text-xs text-[#888888] py-4 text-center'>
                  Chưa có chương nào sẵn sàng đọc.
                </div>
              ) : (
                <div className='space-y-1.5'>
                  {selectedSeries.chapters.map((chap) => (
                    <div
                      key={chap.id}
                      onClick={() => setReadingChapterId(chap.id)}
                      className='p-2.5 bg-white rounded-lg border border-[#E7E7E7] flex items-center justify-between text-xs hover:border-[#F97316] transition-all cursor-pointer group hover:bg-[#FFF7ED]/30'
                      title='Bấm để đọc trực tuyến'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='font-mono font-bold text-[#F97316]'>
                          Chương {chap.chapterNumber}:
                        </span>
                        <span className='font-semibold text-[#171717] group-hover:text-[#F97316] transition-colors'>
                          {chap.title || 'Không tiêu đề'}
                        </span>
                      </div>
                      <div className='flex items-center gap-2'>
                        {chap.publishedAt && (
                          <span className='text-[10px] text-[#888888] font-mono'>
                            {new Date(chap.publishedAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                        <span className='px-2 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-200 group-hover:bg-orange-600 group-hover:text-white transition-colors flex items-center gap-1'>
                          <span>Đọc</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className='flex justify-end pt-2 border-t border-[#E7E7E7]'>
              <button
                onClick={() => setSelectedSeries(null)}
                className='px-4 py-1.5 rounded-xl bg-[#171717] text-white text-xs font-semibold'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Reader Modal */}
      {readingChapterId && (
        <ChapterReaderModal
          isOpen={!!readingChapterId}
          chapterId={readingChapterId}
          onClose={() => setReadingChapterId(null)}
        />
      )}
    </div>
  );
};
