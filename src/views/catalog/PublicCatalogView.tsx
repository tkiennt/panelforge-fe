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
import {
  catalogService,
  PublicSeriesDto,
  PublicSeriesDetailDto,
} from '../../services/catalog.service';

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
    <div className='min-h-screen bg-[#FAF8F5] text-[#171717] flex flex-col'>
      {/* Top Navigation */}
      <header className='bg-white border-b border-[#E7E7E7] px-6 py-4 sticky top-0 z-30 shadow-2xs'>
        <div className='max-w-7xl mx-auto flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            {onBackToWorkspaces && (
              <button
                onClick={onBackToWorkspaces}
                className='p-2 rounded-xl border border-[#E7E7E7] hover:bg-[#FAF8F5] transition-colors cursor-pointer text-[#555555]'
                title='Quay lại Workspace'
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
            )}
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-xl bg-[#F97316] text-white flex items-center justify-center font-bold shadow-2xs'>
                <BookOpen className='w-4 h-4' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='font-serif font-bold text-base tracking-tight'>
                    PanelForge Reader
                  </span>
                  <span className='px-2 py-0.2 bg-[#FFF7ED] text-[#F97316] border border-[#FDBA74] text-[10px] font-mono font-bold rounded'>
                    PUBLIC CATALOG // BR-23
                  </span>
                </div>
                <p className='text-[11px] text-[#737373]'>
                  Danh mục truyện tranh đã phát hành chính thức
                </p>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2.5'>
            <button
              onClick={fetchCatalog}
              disabled={loading}
              className='p-2 text-[#555555] hover:bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl transition-all cursor-pointer'
              title='Làm mới danh mục'
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className='px-3.5 py-1.5 rounded-xl bg-[#171717] hover:bg-black text-white text-xs font-semibold shadow-xs cursor-pointer'
              >
                Đăng Nhập Studio
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Filter Bar */}
      <div className='bg-white border-b border-[#E7E7E7] py-6 px-6 shadow-2xs'>
        <div className='max-w-7xl mx-auto space-y-4'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-serif font-bold tracking-tight text-[#171717]'>
                Thư Viện Truyện Tranh Xuất Bản
              </h1>
              <p className='text-xs text-[#737373]'>
                Khám phá các tác phẩm Manga, Webtoon và Comic chất lượng cao được sản xuất trên nền tảng PanelForge.
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className='flex items-center gap-2 max-w-md w-full'>
              <div className='relative flex-1'>
                <Search className='w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2' />
                <input
                  type='text'
                  placeholder='Tìm kiếm theo tên truyện, tóm tắt...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-xl text-xs focus:outline-none focus:border-[#F97316]'
                />
              </div>
              <button
                type='submit'
                className='px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs'
              >
                Tìm
              </button>
            </form>
          </div>

          {/* Genre Chips */}
          <div className='flex items-center gap-2 overflow-x-auto pb-1 pt-1'>
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
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#171717] text-white'
                      : 'bg-[#FAF8F5] text-[#555555] hover:bg-[#EAE6DF] border border-[#E7E7E7]'
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
                Hiện tại các dự án truyện tranh đang trong giai đoạn sản xuất tại Studio Desk. Sau khi các chương được Biên tập viên duyệt (Approved) và xuất bản chính thức (Published), chúng sẽ xuất hiện tại đây cho độc giả thưởng thức.
              </p>
            </div>
            {onBackToWorkspaces && (
              <button
                onClick={onBackToWorkspaces}
                className='inline-flex items-center gap-1.5 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer'
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
                className='bg-white rounded-2xl border border-[#E7E7E7] hover:border-[#F97316] p-5 space-y-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between'
              >
                <div className='space-y-2'>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='px-2 py-0.5 rounded bg-[#FFF7ED] text-[#F97316] font-mono text-[10px] font-bold border border-[#FDBA74]'>
                      {item.genre}
                    </span>
                    <span className='text-[10px] font-mono bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E7E7E7] text-[#555555]'>
                      {item.format}
                    </span>
                  </div>

                  <h3 className='text-base font-bold text-[#171717] group-hover:text-[#F97316] transition-colors line-clamp-1'>
                    {item.title}
                  </h3>

                  <p className='text-xs text-[#555555] line-clamp-3 leading-relaxed'>
                    {item.synopsis || 'Chưa có mô tả tóm tắt cho bộ truyện này.'}
                  </p>
                </div>

                <div className='pt-3 border-t border-[#E7E7E7] space-y-2 text-[11px] font-mono text-[#737373]'>
                  <div className='flex items-center justify-between'>
                    <span>Studio:</span>
                    <span className='font-semibold text-[#171717]'>{item.studioName}</span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span>Số chương phát hành:</span>
                    <span className='px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200'>
                      {item.publishedChapterCount} chương
                    </span>
                  </div>
                  {item.latestPublishedAt && (
                    <div className='flex items-center justify-between text-[10px] text-[#888888]'>
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
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-white rounded-3xl border border-[#E7E7E7] shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col'>
            <div className='flex items-start justify-between border-b border-[#E7E7E7] pb-3'>
              <div>
                <span className='px-2 py-0.5 rounded bg-[#FFF7ED] text-[#F97316] font-mono text-[10px] font-bold border border-[#FDBA74]'>
                  {selectedSeries.genre}
                </span>
                <h2 className='text-lg font-bold text-[#171717] mt-1'>{selectedSeries.title}</h2>
                <span className='text-xs text-[#888888] font-mono'>
                  Studio: {selectedSeries.studioName} • {selectedSeries.format}
                </span>
              </div>
              <button
                onClick={() => setSelectedSeries(null)}
                className='text-[#888888] hover:text-[#171717]'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            <p className='text-xs text-[#555555] leading-relaxed'>
              {selectedSeries.synopsis || 'Chưa có thông tin tóm tắt.'}
            </p>

            <div className='space-y-2 flex-1 overflow-y-auto border border-[#E7E7E7] rounded-xl p-3 bg-[#FAF8F5]'>
              <div className='text-xs font-bold text-[#171717] flex items-center gap-1.5'>
                <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
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
                      className='p-2.5 bg-white rounded-lg border border-[#E7E7E7] flex items-center justify-between text-xs hover:border-[#F97316] transition-colors'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='font-mono font-bold text-[#F97316]'>
                          Chương {chap.chapterNumber}:
                        </span>
                        <span className='font-semibold text-[#171717]'>
                          {chap.title || 'Không tiêu đề'}
                        </span>
                      </div>
                      {chap.publishedAt && (
                        <span className='text-[10px] text-[#888888] font-mono'>
                          {new Date(chap.publishedAt).toLocaleDateString('vi-VN')}
                        </span>
                      )}
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
    </div>
  );
};
