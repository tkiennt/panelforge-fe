import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Globe,
  Languages,
  Loader2,
  Search,
  Send,
  Tag,
} from 'lucide-react';
import type { PublisherManagedChapterDto } from '@/services/publisher.service';
import type {
  ChapterLanguageStatusDto,
  ChapterManageDto,
  ContentLanguage,
} from '@/services/payment.service';
import {
  formatContentLanguageName,
  formatEditionPricingLabel,
  getEditionStatusDisplay,
} from './multilingual';

export type SeriesPublishingTab = 'matrix' | 'editions' | 'pricing' | 'chapters';

interface MultilingualPublishingMatrixProps {
  seriesId: string;
  chapters: PublisherManagedChapterDto[];
  originalLanguage: ContentLanguage;
  releaseLanguages: ContentLanguage[];
  manageByChapterId: Record<string, ChapterManageDto>;
  loadingEditions: boolean;
  uiLang: string;
  mode: 'matrix' | 'editions' | 'pricing';
  selectedLanguageFilter: string;
  onSelectLanguageFilter: (lang: string) => void;
  onOpenEditionDetail: (chapterId: string, lang: ContentLanguage) => void;
  onOpenSeriesInsights: (lang?: ContentLanguage) => void;
  onOpenPublishModal?: (chapter: PublisherManagedChapterDto) => void;
  onSwitchToMatrix?: (lang: ContentLanguage) => void;
}

export const MultilingualPublishingMatrix: React.FC<MultilingualPublishingMatrixProps> = ({
  chapters,
  originalLanguage,
  releaseLanguages,
  manageByChapterId,
  loadingEditions,
  uiLang,
  mode,
  selectedLanguageFilter,
  onSelectLanguageFilter,
  onOpenEditionDetail,
  onOpenSeriesInsights,
  onOpenPublishModal,
  onSwitchToMatrix,
}) => {
  const isEn = uiLang === 'en';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const visibleLanguages = useMemo(() => {
    if (selectedLanguageFilter && selectedLanguageFilter !== 'all') {
      return releaseLanguages.filter((l) => l === selectedLanguageFilter);
    }
    return releaseLanguages;
  }, [releaseLanguages, selectedLanguageFilter]);

  const sortedChapters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...chapters]
      .sort((a, b) => a.chapterNumber - b.chapterNumber)
      .filter((chap) => {
        if (q) {
          const matchNum = String(chap.chapterNumber).includes(q);
          const matchTitle = (chap.title || '').toLowerCase().includes(q);
          if (!matchNum && !matchTitle) return false;
        }
        if (statusFilter === 'all') return true;
        const manage = manageByChapterId[chap.chapterId];
        return visibleLanguages.some((langCode) => {
          const ed = manage?.languages?.find((l) => l.language === langCode);
          const st = getEditionStatusDisplay(ed, uiLang);
          return st.key === statusFilter;
        });
      });
  }, [chapters, searchQuery, statusFilter, manageByChapterId, visibleLanguages, uiLang]);

  // Aggregate per-language stats for Language Edition Cards
  const languageCards = useMemo(() => {
    return releaseLanguages.map((langCode) => {
      let published = 0;
      let ready = 0;
      let translating = 0;
      let unconfiguredPrice = 0;
      let missing = 0;

      chapters.forEach((chap) => {
        const manage = manageByChapterId[chap.chapterId];
        const ed = manage?.languages?.find((l) => l.language === langCode);
        const st = getEditionStatusDisplay(ed, uiLang);
        if (st.key === 'published') published += 1;
        else if (st.key === 'approved') ready += 1;
        else if (st.key === 'draft' || st.key === 'in_review') translating += 1;
        else missing += 1;

        if (ed && !ed.isMonetizationConfigured) {
          unconfiguredPrice += 1;
        }
      });

      return {
        langCode,
        isOriginal: langCode === originalLanguage,
        totalChapters: chapters.length,
        published,
        ready,
        translating,
        missing,
        unconfiguredPrice,
      };
    });
  }, [releaseLanguages, originalLanguage, chapters, manageByChapterId, uiLang]);

  if (loadingEditions && Object.keys(manageByChapterId).length === 0) {
    return (
      <div className='py-12 flex flex-col items-center justify-center gap-2 text-stone-500'>
        <Loader2 className='w-5 h-5 animate-spin text-[#EA580C]' />
        <span className='text-xs'>
          {isEn ? 'Loading language editions...' : 'Đang tải trạng thái các ấn bản ngôn ngữ...'}
        </span>
      </div>
    );
  }

  // ── MODE: LANGUAGE EDITION CARDS ──
  if (mode === 'editions') {
    return (
      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500'>
          <span>
            {isEn
              ? `1 canonical series · ${chapters.length} source chapters · ${releaseLanguages.length} language editions`
              : `1 bộ truyện gốc · ${chapters.length} chương gốc · ${releaseLanguages.length} ấn bản ngôn ngữ`}
          </span>
          <span className='px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-medium'>
            {isEn ? 'Currency: VND' : 'Đơn vị tiền tệ hiện tại: VND'}
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {languageCards.map((card) => (
            <div
              key={card.langCode}
              data-testid={`language-edition-card-${card.langCode}`}
              className='rounded-2xl border border-[#D8D2C5] bg-white p-5 shadow-2xs flex flex-col justify-between gap-4'
            >
              <div className='space-y-3'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <Globe className='w-4 h-4 text-[#C2410C]' />
                      <h3 className='text-sm font-bold text-[#1C1917]'>
                        {formatContentLanguageName(card.langCode, uiLang)}
                      </h3>
                      {card.isOriginal && (
                        <span className='px-2 py-0.5 rounded-full bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] text-[10px] font-bold uppercase'>
                          {isEn ? 'Source Language' : 'Ngôn ngữ gốc'}
                        </span>
                      )}
                    </div>
                    <p className='text-xs text-stone-500 mt-1'>
                      {isEn
                        ? `Content language code: ${card.langCode} · Currency: VND`
                        : `Mã ngôn ngữ nội dung: ${card.langCode} · Tiền tệ: VND`}
                    </p>
                  </div>
                  <span className='text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200'>
                    {card.published}/{card.totalChapters}{' '}
                    {isEn ? 'published' : 'đã xuất bản'}
                  </span>
                </div>

                <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs'>
                  <div className='rounded-xl bg-emerald-50/60 border border-emerald-100 px-3 py-2'>
                    <div className='text-[11px] text-emerald-700'>
                      {isEn ? 'Published' : 'Đã xuất bản'}
                    </div>
                    <div className='font-bold text-emerald-900 mt-0.5'>{card.published}</div>
                  </div>
                  <div className='rounded-xl bg-sky-50/60 border border-sky-100 px-3 py-2'>
                    <div className='text-[11px] text-sky-700'>
                      {isEn ? 'Ready' : 'Chờ xuất bản'}
                    </div>
                    <div className='font-bold text-sky-900 mt-0.5'>{card.ready}</div>
                  </div>
                  <div className='rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2'>
                    <div className='text-[11px] text-amber-800'>
                      {isEn ? 'In progress' : 'Đang dịch/duyệt'}
                    </div>
                    <div className='font-bold text-amber-900 mt-0.5'>{card.translating}</div>
                  </div>
                  <div className='rounded-xl bg-stone-50 border border-stone-200/80 px-3 py-2'>
                    <div className='text-[11px] text-stone-600'>
                      {isEn ? 'No price set' : 'Chưa đặt giá'}
                    </div>
                    <div className='font-bold text-stone-800 mt-0.5'>{card.unconfiguredPrice}</div>
                  </div>
                </div>
              </div>

              <div className='pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2'>
                <button
                  type='button'
                  onClick={() => onOpenSeriesInsights(card.langCode)}
                  className='inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#C2410C] cursor-pointer'
                >
                  <BarChart3 className='w-3.5 h-3.5' />
                  <span>{isEn ? 'Edition Analytics' : 'Hiệu quả ấn bản'}</span>
                </button>
                <button
                  type='button'
                  onClick={() => onSwitchToMatrix?.(card.langCode)}
                  className='px-3.5 py-1.5 rounded-xl bg-[#1C1917] hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer'
                >
                  <span>{isEn ? 'Manage Edition' : 'Quản lý ấn bản'}</span>
                  <ArrowRight className='w-3.5 h-3.5' />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── SHARED FILTER BAR FOR PUBLISHING MATRIX & PRICING MATRIX ──
  const renderCell = (
    chap: PublisherManagedChapterDto,
    langCode: ContentLanguage,
    ed?: ChapterLanguageStatusDto,
    totalPages: number = chap.pageCount,
  ) => {
    const statusInfo = getEditionStatusDisplay(ed, uiLang);
    const priceInfo = formatEditionPricingLabel(ed, uiLang);
    const isOrig = langCode === originalLanguage;

    if (mode === 'pricing') {
      return (
        <button
          type='button'
          onClick={() => onOpenEditionDetail(chap.chapterId, langCode)}
          data-testid={`pricing-cell-${chap.chapterId}-${langCode}`}
          className='w-full text-left rounded-xl border border-stone-200/90 hover:border-[#F97316] bg-[#FCFBF8] hover:bg-[#FFF9F3] p-2.5 transition-all cursor-pointer space-y-1'
        >
          <div className='flex items-center justify-between gap-1.5'>
            <span
              className={`text-xs font-bold font-mono ${
                priceInfo.tone === 'paid'
                  ? 'text-[#C2410C]'
                  : priceInfo.tone === 'free'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
              }`}
            >
              {priceInfo.label}
            </span>
            <Tag className='w-3 h-3 text-stone-400 shrink-0' />
          </div>
          <div className='text-[11px] text-stone-500 flex items-center justify-between gap-1'>
            <span>
              {ed?.isPaid && ed.isMonetizationConfigured
                ? isEn
                  ? `${ed.freePreviewPages} free preview`
                  : `Xem trước ${ed.freePreviewPages} trang`
                : statusInfo.label}
            </span>
          </div>
        </button>
      );
    }

    // Publishing Matrix Cell
    return (
      <div
        data-testid={`matrix-cell-${chap.chapterId}-${langCode}`}
        className='rounded-xl border border-stone-200/90 hover:border-[#F97316] bg-[#FCFBF8] hover:bg-[#FFF9F3] p-2.5 transition-all space-y-2'
      >
        <div className='flex items-center justify-between gap-1.5 flex-wrap'>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${statusInfo.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
            <span>{statusInfo.label}</span>
          </span>
          <span
            className={`text-[11px] font-mono font-semibold ${
              priceInfo.tone === 'paid'
                ? 'text-[#C2410C]'
                : priceInfo.tone === 'free'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
            }`}
          >
            {priceInfo.label}
          </span>
        </div>

        <div className='flex items-center justify-between gap-2 text-[11px] text-stone-500'>
          <span>
            {ed && totalPages > 0 && !isOrig
              ? isEn
                ? `${ed.translatedPages}/${totalPages} pages`
                : `${ed.translatedPages}/${totalPages} trang`
              : isOrig && chap.publishAt && new Date(chap.publishAt) > new Date()
                ? `${isEn ? 'Scheduled' : 'Lên lịch'}: ${new Date(chap.publishAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}`
                : isEn
                  ? `${totalPages} pages`
                  : `${totalPages} trang`}
          </span>

          <div className='flex items-center gap-1.5'>
            {isOrig && chap.status === 'ChapterApproved' && onOpenPublishModal && (
              <button
                type='button'
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPublishModal(chap);
                }}
                className='px-2 py-0.5 rounded-md bg-[#EA580C] hover:bg-[#C2410C] text-white text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer'
              >
                <Send className='w-2.5 h-2.5' />
                <span>{isEn ? 'Publish' : 'Phát hành'}</span>
              </button>
            )}
            <button
              type='button'
              onClick={() => onOpenEditionDetail(chap.chapterId, langCode)}
              className='text-[11px] font-semibold text-[#C2410C] hover:underline cursor-pointer'
            >
              {isEn ? 'Manage →' : 'Chi tiết →'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='space-y-4'>
      {/* Matrix Controls: Search + Language Filter + Status Filter */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-2 flex-1'>
          <label className='relative min-w-[180px] flex-1 max-w-xs'>
            <Search className='w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search chapter...' : 'Tìm theo số hoặc tên chương...'}
              className='w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D8D2C5] bg-white text-xs text-stone-800 focus:outline-none focus:border-[#F97316]'
            />
          </label>

          <div className='flex items-center gap-1.5'>
            <Languages className='w-3.5 h-3.5 text-[#C2410C]' />
            <select
              aria-label={isEn ? 'Filter by content language' : 'Lọc theo ngôn ngữ nội dung'}
              value={selectedLanguageFilter}
              onChange={(e) => onSelectLanguageFilter(e.target.value)}
              className='px-2.5 py-1.5 rounded-xl border border-[#D8D2C5] bg-white text-xs font-medium text-stone-800 cursor-pointer'
            >
              <option value='all'>
                {isEn ? 'All content languages' : 'Tất cả ngôn ngữ nội dung'}
              </option>
              {releaseLanguages.map((l) => (
                <option key={l} value={l}>
                  {formatContentLanguageName(l, uiLang)}
                  {l === originalLanguage ? (isEn ? ' · Source' : ' · Gốc') : ''}
                </option>
              ))}
            </select>
          </div>

          {mode === 'matrix' && (
            <select
              aria-label={isEn ? 'Filter by edition status' : 'Lọc theo trạng thái ấn bản'}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className='px-2.5 py-1.5 rounded-xl border border-[#D8D2C5] bg-white text-xs font-medium text-stone-800 cursor-pointer'
            >
              <option value='all'>{isEn ? 'All statuses' : 'Tất cả trạng thái'}</option>
              <option value='published'>{isEn ? 'Published' : 'Đã xuất bản'}</option>
              <option value='approved'>{isEn ? 'Ready to publish' : 'Đã duyệt xuất bản'}</option>
              <option value='in_review'>{isEn ? 'In review' : 'Đang kiểm tra bản dịch'}</option>
              <option value='draft'>{isEn ? 'Translating' : 'Đang dịch'}</option>
              <option value='missing'>{isEn ? 'Not prepared' : 'Chưa chuẩn bị'}</option>
            </select>
          )}
        </div>

        <div className='text-xs text-stone-500 flex items-center gap-2'>
          <span>
            {sortedChapters.length} {isEn ? 'source chapters' : 'chương gốc'} ·{' '}
            {visibleLanguages.length} {isEn ? 'editions' : 'ấn bản ngôn ngữ'}
          </span>
        </div>
      </div>

      {mode === 'pricing' && (
        <div className='px-3.5 py-2 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-center justify-between gap-2 flex-wrap'>
          <span>
            {isEn
              ? 'Independent pricing per Language Edition. Current system currency: VND. Click any cell to configure Free/Paid and preview pages.'
              : 'Mỗi ấn bản ngôn ngữ có giá bán và số trang xem trước độc lập (đơn vị tiền tệ hiện tại: VND). Bấm vào từng ô để cấu hình.'}
          </span>
        </div>
      )}

      {/* Matrix Table */}
      {sortedChapters.length === 0 ? (
        <div className='py-12 text-center text-xs text-stone-500 border border-dashed border-[#D8D2C5] rounded-2xl bg-white'>
          {isEn
            ? 'No chapters match the current filter.'
            : 'Không có chương nào phù hợp bộ lọc hiện tại.'}
        </div>
      ) : (
        <div className='rounded-2xl border border-[#D8D2C5] bg-white overflow-x-auto shadow-2xs'>
          <table className='w-full text-xs border-collapse min-w-[640px]'>
            <thead className='bg-[#FAF8F5] border-b border-[#E7E2D7] sticky top-0 z-10'>
              <tr>
                <th className='text-left font-bold text-stone-700 px-4 py-3 sticky left-0 bg-[#FAF8F5] z-20 border-r border-[#E7E2D7] min-w-[200px]'>
                  {isEn ? 'Source Chapter' : 'Chương gốc'}
                </th>
                {visibleLanguages.map((langCode) => (
                  <th
                    key={langCode}
                    className='text-left font-bold text-stone-800 px-4 py-3 min-w-[230px]'
                  >
                    <div className='flex items-center gap-1.5'>
                      <span>{formatContentLanguageName(langCode, uiLang)}</span>
                      {langCode === originalLanguage && (
                        <span className='px-1.5 py-0.5 rounded bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] text-[10px] font-bold uppercase'>
                          {isEn ? 'Source' : 'Gốc'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className='divide-y divide-[#F0ECE3]'>
              {sortedChapters.map((chap) => {
                const manage = manageByChapterId[chap.chapterId];
                const totalPages = manage?.pages?.length ?? chap.pageCount ?? 0;
                return (
                  <tr key={chap.chapterId} className='hover:bg-[#FCFBF8]/80'>
                    <td className='px-4 py-3 sticky left-0 bg-white z-10 border-r border-[#E7E2D7] align-top'>
                      <div className='font-bold text-stone-900'>
                        {isEn ? `Chapter ${chap.chapterNumber}` : `Chương ${chap.chapterNumber}`}
                      </div>
                      {chap.title && (
                        <div className='text-[11px] text-stone-500 truncate max-w-[200px] mt-0.5'>
                          {chap.title}
                        </div>
                      )}
                      <div className='text-[10px] text-stone-400 mt-1 flex items-center gap-1.5'>
                        {chap.status === 'HandedOffAndPublished' ? (
                          <CheckCircle2 className='w-3 h-3 text-emerald-600' />
                        ) : (
                          <Clock className='w-3 h-3 text-amber-600' />
                        )}
                        <span>{totalPages} {isEn ? 'pages' : 'trang'}</span>
                      </div>
                    </td>
                    {visibleLanguages.map((langCode) => {
                      const ed = manage?.languages?.find((l) => l.language === langCode);
                      return (
                        <td key={langCode} className='px-3 py-2.5 align-top'>
                          {renderCell(chap, langCode, ed, totalPages)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
