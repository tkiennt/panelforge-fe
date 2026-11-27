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
  Globe,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  catalogService,
  PublicSeriesDto,
  PublicSeriesDetailDto,
  resolveCatalogImageUrl,
} from '@/services/catalog.service';
import { CONTENT_LANGUAGES } from '@/services/payment.service';
import { formatContentLanguageName } from '@/roles/publisher/components/multilingual';
import { ChapterReaderModal } from '@/shared/modals/ChapterReaderModal';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface PublicCatalogViewProps {
  onBackToWorkspaces?: () => void;
  onOpenLogin?: () => void;
}

export const PublicCatalogView: React.FC<PublicCatalogViewProps> = ({
  onBackToWorkspaces,
  onOpenLogin,
}) => {
  const { t, lang } = useTranslation();
  const dateLocale = lang === 'en' ? 'en-US' : 'vi-VN';
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
  const [selectedContentLang, setSelectedContentLang] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('preferred_reading_language');
      return saved && CONTENT_LANGUAGES.includes(saved as (typeof CONTENT_LANGUAGES)[number])
        ? saved
        : 'vi';
    } catch {
      return 'vi';
    }
  });

  const genres = [
    '',
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
        genre: selectedGenre || undefined,
        pageIndex,
        pageSize: 20,
      });
      setSeriesList(res.items || []);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      console.warn('Public catalog fetch error:', err);
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

  const handleOpenDetail = async (seriesId: string, contentLang?: string) => {
    const targetLang = contentLang || selectedContentLang;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await catalogService.getPublicSeriesDetail(seriesId, targetLang);
      setSelectedSeries(detail);
    } catch (err: any) {
      setDetailError(err.message || t('workspace.reader.catalog.detailLoadError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectContentLanguage = (code: string) => {
    setSelectedContentLang(code);
    try {
      localStorage.setItem('preferred_reading_language', code);
    } catch {
      // ignore
    }
    if (selectedSeries) {
      handleOpenDetail(selectedSeries.id, code);
    }
  };

  return (
    <div className='min-h-screen bg-[#F3F0E9] text-[#1C1917] flex flex-col'>
      {/* Top Navigation */}
      <header className='bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#D8D2C5] px-6 py-4 sticky top-0 z-30 shadow-xs'>
        <div className='max-w-7xl mx-auto flex items-center justify-between gap-4'>
          <div className='flex items-center gap-3'>
            {onBackToWorkspaces && (
              <button
                onClick={onBackToWorkspaces}
                className='p-2 rounded-full border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#EFECE6] transition-colors cursor-pointer text-[#57534E] hover:text-[#1C1917]'
                title={t('workspace.reader.catalog.backToWorkspaces')}
              >
                <ArrowLeft className='w-4 h-4' />
              </button>
            )}
            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-full bg-[#1C1917] text-white flex items-center justify-center font-bold text-xs shadow-xs'>
                <BookOpen className='w-4 h-4' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='font-serif font-bold text-base tracking-tight text-[#1C1917]'>
                    PanelForge Reader
                  </span>
                  <span className='px-2.5 py-0.5 bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] text-xs font-mono font-medium rounded-full'>
                    PUBLIC CATALOG
                  </span>
                </div>
                <p className='text-xs text-[#57534E]'>{t('workspace.reader.catalog.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className='flex items-center gap-2.5'>
            <button
              onClick={fetchCatalog}
              disabled={loading}
              className='p-2 text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFECE6] bg-[#FCFBF8] border border-[#D8D2C5] rounded-full transition-all cursor-pointer'
              title={t('workspace.reader.catalog.refreshTitle')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onOpenLogin && (
              <button
                onClick={onOpenLogin}
                className='px-4 py-2 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer'
              >
                {t('workspace.reader.catalog.loginStudio')}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Filter Bar */}
      <div className='bg-[#F3F0E9] border-b border-[#D8D2C5] py-8 px-6'>
        <div className='max-w-7xl mx-auto space-y-5'>
          <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-serif font-bold tracking-tight text-[#1C1917]'>
                {t('workspace.reader.catalog.heroTitle')}
              </h1>
              <p className='text-xs text-[#57534E] mt-1'>
                {t('workspace.reader.catalog.heroDesc')}
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className='flex items-center gap-2 max-w-md w-full'>
              <div className='relative flex-1'>
                <Search className='w-4 h-4 text-[#57534E] absolute left-3.5 top-1/2 -translate-y-1/2' />
                <input
                  type='text'
                  placeholder={t('workspace.reader.catalog.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='w-full pl-10 pr-4 py-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-full text-xs text-[#1C1917] placeholder:text-[#57534E]/60 focus:outline-none focus:border-[#F97316] shadow-xs'
                />
              </div>
              <button
                type='submit'
                className='px-5 py-2 bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold rounded-full transition-colors cursor-pointer shadow-xs'
              >
                {t('workspace.reader.catalog.searchBtn')}
              </button>
            </form>
          </div>

          {/* Genre Chips */}
          <div className='flex items-center gap-2 overflow-x-auto pb-1 pt-1 custom-scrollbar'>
            {genres.map((g) => {
              const isSelected = selectedGenre === g;
              return (
                <button
                  key={g || 'all'}
                  type='button'
                  onClick={() => {
                    setSelectedGenre(g);
                    setPageIndex(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-xs cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] font-semibold'
                      : 'bg-[#FCFBF8] text-[#57534E] hover:text-[#1C1917] hover:bg-[#EFECE6] border border-[#D8D2C5]'
                  }`}
                >
                  {g || t('workspace.reader.catalog.genreAll')}
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
            <div className='text-xs font-mono text-[#57534E]'>
              {t('workspace.reader.catalog.loading')}
            </div>
          </div>
        ) : seriesList.length === 0 ? (
          /* Empty state required by BR-23 / HANDOFF */
          <div className='py-20 text-center bg-[#FCFBF8] rounded-3xl border border-dashed border-[#D8D2C5] p-8 max-w-2xl mx-auto space-y-4 shadow-xs'>
            <div className='w-16 h-16 rounded-2xl bg-[#FFF2E6] text-[#F97316] border border-[#FDBA74] flex items-center justify-center mx-auto shadow-xs'>
              <BookOpen className='w-8 h-8' />
            </div>
            <div className='space-y-1.5'>
              <h3 className='text-lg font-serif font-bold text-[#1C1917]'>
                {t('workspace.reader.catalog.emptyTitle')}
              </h3>
              <p className='text-xs text-[#57534E] max-w-md mx-auto leading-relaxed'>
                {t('workspace.reader.catalog.emptyDesc')}
              </p>
            </div>
            {onBackToWorkspaces && (
              <button
                onClick={onBackToWorkspaces}
                className='inline-flex items-center gap-1.5 px-4 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-full shadow-xs transition-all cursor-pointer'
              >
                <Compass className='w-3.5 h-3.5' />
                <span>{t('workspace.reader.catalog.backToStudio')}</span>
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
                className='bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] hover:border-[#F97316] p-6 space-y-4 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group flex flex-col justify-between'
              >
                <div className='space-y-2.5'>
                  <div className='flex items-start justify-between gap-2'>
                    <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-[#C2410C] font-mono text-xs font-medium border border-[#FDBA74]/60'>
                      {item.genre}
                    </span>
                    <span className='text-xs font-mono bg-[#F8F6F0] px-2.5 py-0.5 rounded-full border border-[#D8D2C5] text-[#57534E]'>
                      {item.format}
                    </span>
                  </div>

                  <h3 className='text-base font-serif font-bold text-[#1C1917] group-hover:text-[#F97316] transition-colors line-clamp-1'>
                    {item.title}
                  </h3>

                  <p className='text-xs text-[#57534E] line-clamp-3 leading-relaxed'>
                    {item.synopsis || t('workspace.reader.catalog.noSynopsis')}
                  </p>
                </div>

                <div className='pt-3.5 border-t border-[#D8D2C5] space-y-2 text-xs font-mono text-[#57534E]'>
                  <div className='flex items-center justify-between'>
                    <span>Studio:</span>
                    <span className='font-semibold text-[#1C1917]'>{item.studioName}</span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span>{t('workspace.reader.catalog.publishedChaptersLabel')}</span>
                    <span className='px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-200'>
                      {t('workspace.reader.catalog.publishedChaptersCount', {
                        count: item.publishedChapterCount,
                      })}
                    </span>
                  </div>
                  {item.latestPublishedAt && (
                    <div className='flex items-center justify-between text-xs text-[#57534E]/70'>
                      <span>{t('workspace.reader.catalog.latestLabel')}</span>
                      <span>{new Date(item.latestPublishedAt).toLocaleDateString(dateLocale)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Series Detail Modal */}
      <Modal
        isOpen={!!selectedSeries}
        onClose={() => setSelectedSeries(null)}
        size='md'
        title={
          selectedSeries ? (
            <div>
              <span className='px-2.5 py-0.5 rounded-full bg-[#FFF2E6] text-[#C2410C] font-mono text-xs font-medium border border-[#FDBA74]/60'>
                {selectedSeries.genre}
              </span>
              <div className='text-xl font-serif font-bold text-[#1C1917] mt-2'>
                {selectedSeries.title}
              </div>
            </div>
          ) : (
            ''
          )
        }
        description={
          selectedSeries
            ? `Studio: ${selectedSeries.studioName} • ${selectedSeries.format}`
            : undefined
        }
        closeLabel={t('workspace.reader.catalog.close')}
        footer={
          <button
            onClick={() => setSelectedSeries(null)}
            className='px-4 py-1.5 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold cursor-pointer transition-colors'
          >
            {t('workspace.reader.catalog.close')}
          </button>
        }
      >
        {selectedSeries && (
          <div className='space-y-4'>
            <p className='text-xs text-[#57534E] leading-relaxed'>
              {selectedSeries.synopsis || t('workspace.reader.catalog.noSynopsisShort')}
            </p>

            {/* Content Language Selector — independent from UI language */}
            <div className='flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FCFBF8] border border-[#D8D2C5]'>
              <span className='inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E]'>
                <Globe className='w-3.5 h-3.5 text-[#F97316]' />
                {lang === 'en' ? 'Content language' : 'Ngôn ngữ nội dung'}
              </span>
              <div className='flex items-center gap-1.5'>
                {CONTENT_LANGUAGES.map((code) => {
                  const active = (selectedSeries.language || selectedContentLang) === code;
                  return (
                    <button
                      key={code}
                      type='button'
                      disabled={detailLoading}
                      onClick={() => handleSelectContentLanguage(code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1C1917] text-white'
                          : 'bg-[#F8F6F0] text-[#57534E] hover:bg-[#EFECE6] border border-[#D8D2C5]'
                      }`}
                    >
                      {formatContentLanguageName(code, lang)}
                    </button>
                  );
                })}
              </div>
            </div>

            {detailError && (
              <div className='text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2'>
                {detailError}
              </div>
            )}

            <div className='space-y-2 border border-[#D8D2C5] rounded-xl p-3.5 bg-[#F8F6F0]'>
              <div className='text-xs font-semibold text-[#1C1917] flex items-center justify-between gap-2'>
                <span className='flex items-center gap-1.5'>
                  <Sparkles className='w-3.5 h-3.5 text-[#F97316]' />
                  <span>
                    {t('workspace.reader.catalog.publishedChaptersHeading', {
                      count: selectedSeries.chapters.length,
                    })}
                  </span>
                </span>
                {detailLoading && <RefreshCw className='w-3.5 h-3.5 text-[#F97316] animate-spin' />}
              </div>

              {selectedSeries.chapters.length === 0 ? (
                <div className='text-xs text-[#57534E] py-4 text-center'>
                  {t('workspace.reader.catalog.noChaptersReady')}
                </div>
              ) : (
                <div className='space-y-1.5'>
                  {selectedSeries.chapters.map((chap) => {
                    const priceVnd = chap.priceVnd ?? 0;
                    const isPaid =
                      chap.isFree === false || (chap.isLocked && priceVnd > 0) || priceVnd > 0;
                    const isUnlocked = chap.isUnlocked === true;
                    const chapLangs = chap.languages ?? [];
                    return (
                      <div
                        key={chap.id}
                        onClick={() => setReadingChapterId(chap.id)}
                        className='p-2.5 bg-[#FCFBF8] rounded-lg border border-[#D8D2C5] flex items-center justify-between gap-2 text-xs hover:border-[#F97316] transition-all cursor-pointer group hover:bg-[#FFF2E6]/30'
                        title={t('workspace.reader.catalog.readOnlineTitle')}
                      >
                        <div className='flex items-center gap-2.5 min-w-0'>
                          {chap.coverUrl ? (
                            <img
                              src={resolveCatalogImageUrl(chap.coverUrl)}
                              alt={t('workspace.reader.catalog.chapterCoverAlt', {
                                number: chap.chapterNumber,
                              })}
                              className='w-8 h-11 object-cover rounded border border-[#D8D2C5] shadow-2xs shrink-0 bg-stone-100'
                              loading='lazy'
                            />
                          ) : (
                            <div className='w-8 h-11 rounded bg-[#F0EDE6] border border-[#D8D2C5] flex flex-col items-center justify-center shrink-0 text-center font-mono shadow-2xs'>
                              <span className='text-[7px] text-stone-400 font-bold uppercase leading-none'>
                                {t('workspace.reader.catalog.chapterShortBadge')}
                              </span>
                              <span className='text-[11px] font-bold text-[#F97316] leading-none mt-0.5'>
                                {chap.chapterNumber}
                              </span>
                            </div>
                          )}
                          <div className='min-w-0 space-y-1'>
                            <div className='flex items-center gap-1.5 flex-wrap'>
                              <span className='font-mono font-bold text-[#F97316] shrink-0'>
                                {t('workspace.reader.catalog.chapterLabel', {
                                  number: chap.chapterNumber,
                                })}
                              </span>
                              <span className='font-semibold text-[#1C1917] group-hover:text-[#F97316] transition-colors truncate'>
                                {chap.title || t('workspace.reader.catalog.untitled')}
                              </span>
                            </div>
                            <div className='flex items-center gap-1.5 flex-wrap'>
                              {chapLangs.length > 0 &&
                                chapLangs.map((l) => (
                                  <span
                                    key={l.language}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${
                                      l.language ===
                                      (selectedSeries.language || selectedContentLang)
                                        ? 'bg-[#1C1917] text-white border-[#1C1917]'
                                        : 'bg-[#F8F6F0] text-[#57534E] border-[#D8D2C5]'
                                    }`}
                                  >
                                    {l.language.toUpperCase()}
                                  </span>
                                ))}
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  isPaid
                                    ? isUnlocked
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {isPaid ? (
                                  <>
                                    {isUnlocked ? (
                                      <Unlock className='w-2.5 h-2.5' />
                                    ) : (
                                      <Lock className='w-2.5 h-2.5' />
                                    )}
                                    <span>{`${priceVnd.toLocaleString(dateLocale)} VND`}</span>
                                  </>
                                ) : (
                                  <span>{lang === 'en' ? 'Free' : 'Miễn phí'}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-2 shrink-0'>
                          {chap.publishedAt && (
                            <span className='hidden sm:inline text-[10px] text-[#57534E]/70 font-mono'>
                              {new Date(chap.publishedAt).toLocaleDateString(dateLocale)}
                            </span>
                          )}
                          <span className='px-2 py-0.5 rounded bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-200 group-hover:bg-[#F97316] group-hover:text-white transition-colors flex items-center gap-1'>
                            <span>{t('workspace.reader.catalog.readBtn')}</span>
                            <span>→</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Chapter Reader Modal */}
      {readingChapterId && (
        <ChapterReaderModal
          isOpen={!!readingChapterId}
          chapterId={readingChapterId}
          initialLanguage={selectedSeries?.language || selectedContentLang}
          onClose={() => setReadingChapterId(null)}
        />
      )}
    </div>
  );
};
