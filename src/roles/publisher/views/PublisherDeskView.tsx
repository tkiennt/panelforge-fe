import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  FileStack,
  Search,
  Briefcase,
  BookMarked,
  Languages,
  X,
} from 'lucide-react';
import {
  publisherService,
  PublisherChapterDto,
  PublisherSeriesDto,
  PublisherWorkspaceDto,
} from '@/services/publisher.service';
import { chapterEditionService, type ChapterEditionDto } from '@/services/chapter-edition.service';
import { CONTENT_LANGUAGES } from '@/services/payment.service';
import { formatContentLanguageName, getEditionStatusDisplay } from '@/shared/lib/multilingual';
import { PublishScheduleModal } from '../modals/PublishScheduleModal';
import { ChapterReviewsModal } from '@/shared/modals/ChapterReviewsModal';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { ChapterReaderModal } from '@/shared/modals/ChapterReaderModal';
import { ChapterPriceBadge } from '@/shared/components/ChapterPriceBadge';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { useTranslation } from '@/lib/i18n';

interface PublisherDeskViewProps {
  onShowToast?: (title: string, desc: string) => void;
}

export const PublisherDeskView: React.FC<PublisherDeskViewProps> = ({ onShowToast }) => {
  const routeParams = useParams<{ seriesId?: string; workspaceId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation('publisher');

  // URL Query or Route params
  const paramWorkspaceId = routeParams.workspaceId || searchParams.get('workspaceId') || '';
  const paramSeriesId = routeParams.seriesId || searchParams.get('seriesId') || '';

  const [workspaces, setWorkspaces] = useState<PublisherWorkspaceDto[]>([]);
  const [seriesList, setSeriesList] = useState<PublisherSeriesDto[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>(paramWorkspaceId);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(paramSeriesId);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [chapters, setChapters] = useState<PublisherChapterDto[]>([]);
  const [editionsByChapterId, setEditionsByChapterId] = useState<
    Record<string, ChapterEditionDto[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'approved' | 'published' | 'all'>('approved');

  // Modals state
  const [publishingChapter, setPublishingChapter] = useState<PublisherChapterDto | null>(null);
  const [reviewingChapter, setReviewingChapter] = useState<PublisherChapterDto | null>(null);
  const [readingChapter, setReadingChapter] = useState<PublisherChapterDto | null>(null);
  const [snapshotChapter, setSnapshotChapter] = useState<PublisherChapterDto | null>(null);

  // Load Workspaces for filter dropdown
  useEffect(() => {
    publisherService
      .getWorkspaces()
      .then((data) => setWorkspaces(data || []))
      .catch((err) => console.warn('Không thể tải danh sách Studio:', err));
  }, []);

  // Load Series for filter dropdown when selectedWorkspaceId changes
  useEffect(() => {
    publisherService
      .getSeries({ workspaceId: selectedWorkspaceId || undefined })
      .then((data) => setSeriesList(data || []))
      .catch((err) => console.warn('Không thể tải danh sách Series:', err));
  }, [selectedWorkspaceId]);

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publisherService.getChapters({
        status: 'all',
        workspaceId: selectedWorkspaceId || undefined,
        seriesId: selectedSeriesId || undefined,
        search: searchQuery || undefined,
        pageIndex: 1,
        pageSize: 100,
      });
      const items = res.items || [];
      setChapters(items);

      // Load real per-language ChapterEditions for handed-off chapters (best-effort, non-blocking)
      const relevant = items
        .filter(
          (c) =>
            c.status === 'ChapterApproved' ||
            (c.status as any) === 'Approved' ||
            c.status === 'HandedOffAndPublished' ||
            (c.status as any) === 'Published',
        )
        .slice(0, 30);
      if (relevant.length > 0) {
        const results = await Promise.all(
          relevant.map((c) =>
            chapterEditionService
              .getChapterEditions(c.id)
              .then((eds) => [c.id, eds] as const)
              .catch(() => null),
          ),
        );
        const map: Record<string, ChapterEditionDto[]> = {};
        results.forEach((r) => {
          if (r) map[r[0]] = r[1];
        });
        setEditionsByChapterId(map);
      } else {
        setEditionsByChapterId({});
      }
    } catch (err: any) {
      onShowToast?.(t('desk.loadErrorTitle'), err.message || t('shared.serverConnectionError'));
    } finally {
      setLoading(false);
    }
  }, [selectedWorkspaceId, selectedSeriesId, searchQuery, onShowToast, t]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const handedOffChapters = chapters.filter(
    (c) =>
      c.status === 'ChapterApproved' ||
      (c.status as any) === 'Approved' ||
      c.status === 'HandedOffAndPublished' ||
      (c.status as any) === 'Published',
  );
  const approvedChapters = handedOffChapters.filter(
    (c) => c.status === 'ChapterApproved' || (c.status as any) === 'Approved',
  );
  const publishedChapters = handedOffChapters.filter(
    (c) => c.status === 'HandedOffAndPublished' || (c.status as any) === 'Published',
  );

  const baseFilteredChapters =
    activeTab === 'approved'
      ? approvedChapters
      : activeTab === 'published'
        ? publishedChapters
        : handedOffChapters;

  const filteredChapters =
    selectedLanguage === 'all'
      ? baseFilteredChapters
      : baseFilteredChapters.filter((c) => {
          const eds = editionsByChapterId[c.id];
          if (!eds || eds.length === 0) return selectedLanguage === 'vi';
          return eds.some((e) => e.languageCode.toLowerCase() === selectedLanguage);
        });

  const totalLoadedEditions = Object.values(editionsByChapterId).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return t('desk.dateUnknown');
    try {
      return new Date(isoString).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
    } catch {
      return isoString;
    }
  };

  const clearFilters = () => {
    setSelectedWorkspaceId('');
    setSelectedSeriesId('');
    setSelectedLanguage('all');
    setSearchQuery('');
    setSearchParams({});
  };

  return (
    <div className='min-h-full bg-[#F3F0E9] p-6 space-y-6'>
      {/* Header Banner */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-center gap-3.5'>
          <div className='w-12 h-12 rounded-2xl bg-[#FFF2E6] border border-[#FDBA74] text-[#C2410C] flex items-center justify-center shadow-xs'>
            <Send className='w-6 h-6' />
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-xl font-serif font-bold text-[#1C1917]'>{t('desk.title')}</h1>
              <span className='px-2 py-0.5 rounded bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] text-xs font-mono font-bold'>
                STAGE: PUBLISHING
              </span>
            </div>
            <p className='text-xs text-[#57534E] mt-1'>{t('desk.subtitle')}</p>
          </div>
        </div>

        <div className='flex items-center gap-2.5 flex-wrap'>
          <button
            type='button'
            onClick={fetchChapters}
            disabled={loading}
            className='px-3 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] text-xs font-semibold text-[#57534E] hover:text-[#1C1917] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('shared.refresh')}</span>
          </button>
          <button
            type='button'
            onClick={() => navigate('/publisher/series')}
            className='px-3.5 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm active:scale-95'
          >
            <BookMarked className='w-3.5 h-3.5' />
            <span>{t('desk.manageSeries')}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Cross-Studio & Series */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-3 flex-1'>
          {/* Studio Filter */}
          <div className='flex items-center gap-1.5'>
            <Briefcase className='w-4 h-4 text-[#C2410C] shrink-0' />
            <select
              value={selectedWorkspaceId}
              onChange={(e) => {
                setSelectedWorkspaceId(e.target.value);
                setSelectedSeriesId('');
              }}
              className='text-xs font-medium bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 cursor-pointer min-w-[160px]'
            >
              <option value=''>{t('desk.studioFilter')}</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}{' '}
                  {ws.approvedChaptersCount > 0
                    ? t('desk.studioPendingCount', { count: ws.approvedChaptersCount })
                    : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Series Filter */}
          <div className='flex items-center gap-1.5'>
            <BookOpen className='w-4 h-4 text-[#C2410C] shrink-0' />
            <select
              value={selectedSeriesId}
              onChange={(e) => setSelectedSeriesId(e.target.value)}
              className='text-xs font-medium bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 cursor-pointer min-w-[180px]'
            >
              <option value=''>{t('desk.seriesFilter')}</option>
              {seriesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.workspaceName})
                </option>
              ))}
            </select>
          </div>

          {/* Content Language Filter */}
          <div className='flex items-center gap-1.5'>
            <Languages className='w-4 h-4 text-[#C2410C] shrink-0' />
            <select
              aria-label={
                lang === 'en' ? 'Filter by content language' : 'Lọc theo ngôn ngữ nội dung'
              }
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className='text-xs font-medium bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl px-3 py-2 text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 cursor-pointer min-w-[160px]'
            >
              <option value='all'>
                {lang === 'en' ? 'All content languages' : 'Tất cả ngôn ngữ'}
              </option>
              {CONTENT_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {formatContentLanguageName(code, lang)}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Search */}
          <div className='relative flex-1 min-w-[200px]'>
            <Search className='w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('desk.searchPlaceholder')}
              className='w-full text-xs bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl pl-9 pr-3 py-2 text-[#1C1917] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30'
            />
          </div>

          {(selectedWorkspaceId ||
            selectedSeriesId ||
            selectedLanguage !== 'all' ||
            searchQuery) && (
            <button
              type='button'
              onClick={clearFilters}
              className='px-2.5 py-1.5 rounded-xl border border-stone-300 hover:bg-stone-200 text-xs font-semibold text-stone-600 flex items-center gap-1 transition-colors cursor-pointer'
              title={t('desk.clearFilterTooltip')}
            >
              <X className='w-3.5 h-3.5' />
              <span>{t('shared.clearFilter')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <div
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-[#FFF2E6] border-[#FDBA74] ring-2 ring-[#F97316]/20 shadow-xs'
              : 'bg-[#FCFBF8] border-[#D8D2C5] hover:border-[#F97316]/50'
          }`}
        >
          <div className='flex items-center justify-between text-xs text-[#57534E]'>
            <span className='font-semibold'>{t('desk.waitingApproval')}</span>
            <CheckCircle2 className='w-4 h-4 text-[#C2410C]' />
          </div>
          <div className='text-2xl font-bold font-mono tabular-nums text-[#1C1917] mt-1.5'>
            {approvedChapters.length}
          </div>
          <p className='text-xs text-[#C2410C] mt-1 font-medium'>{t('desk.waitingApprovalDesc')}</p>
        </div>

        <div
          onClick={() => setActiveTab('published')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'published'
              ? 'bg-[#FFF2E6] border-[#FDBA74] ring-2 ring-[#F97316]/20 shadow-xs'
              : 'bg-[#FCFBF8] border-[#D8D2C5] hover:border-[#F97316]/50'
          }`}
        >
          <div className='flex items-center justify-between text-xs text-[#57534E]'>
            <span className='font-semibold'>{t('desk.publishedAndScheduled')}</span>
            <Sparkles className='w-4 h-4 text-[#C2410C]' />
          </div>
          <div className='text-2xl font-bold font-mono tabular-nums text-[#1C1917] mt-1.5'>
            {publishedChapters.length}
          </div>
          <p className='text-xs text-[#57534E] mt-1 font-medium'>
            {t('desk.publishedAndScheduledDesc')}
          </p>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#FFF2E6] border-[#FDBA74] ring-2 ring-[#F97316]/20 shadow-xs'
              : 'bg-[#FCFBF8] border-[#D8D2C5] hover:border-[#F97316]/50'
          }`}
        >
          <div className='flex items-center justify-between text-xs text-[#57534E]'>
            <span className='font-semibold'>{t('desk.totalHandedOff')}</span>
            <BookOpen className='w-4 h-4 text-[#57534E]' />
          </div>
          <div className='text-2xl font-bold font-mono tabular-nums text-[#1C1917] mt-1.5'>
            {handedOffChapters.length}
          </div>
          <p className='text-xs text-[#57534E] mt-1 font-medium'>
            {totalLoadedEditions > 0
              ? lang === 'en'
                ? `${handedOffChapters.length} source chapters · ${totalLoadedEditions} language editions`
                : `${handedOffChapters.length} chương gốc · ${totalLoadedEditions} ấn bản theo ngôn ngữ`
              : t('desk.totalHandedOffDesc')}
          </p>
        </div>
      </div>

      {/* Chapters Table */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl overflow-hidden shadow-2xs'>
        <div className='p-4 bg-[#F8F6F0] border-b border-[#D8D2C5] flex items-center justify-between flex-wrap gap-2'>
          <div className='flex items-center gap-2'>
            <Filter className='w-4 h-4 text-[#57534E]' />
            <span className='text-xs font-serif font-bold text-[#1C1917]'>
              {activeTab === 'approved'
                ? t('desk.tableTitleApproved')
                : activeTab === 'published'
                  ? t('desk.tableTitlePublished')
                  : t('desk.tableTitleAll')}
            </span>
            <span className='px-2 py-0.5 rounded-full bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] text-xs font-mono font-bold'>
              {filteredChapters.length}
            </span>
          </div>

          <div className='flex items-center gap-1.5'>
            <button
              type='button'
              onClick={() => setActiveTab('approved')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-[#FCFBF8] text-[#C2410C] shadow-2xs border border-[#D8D2C5]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {t('desk.tabPending', { count: approvedChapters.length })}
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('published')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'published'
                  ? 'bg-[#FCFBF8] text-[#C2410C] shadow-2xs border border-[#D8D2C5]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {t('desk.tabPublished', { count: publishedChapters.length })}
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#FCFBF8] text-[#1C1917] shadow-2xs border border-[#D8D2C5]'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              {t('desk.tabAll', { count: handedOffChapters.length })}
            </button>
          </div>
        </div>

        {filteredChapters.length === 0 ? (
          <div className='p-12 text-center text-[#57534E] space-y-2'>
            <CheckCircle2 className='w-8 h-8 text-[#D8D2C5] mx-auto' />
            <div className='font-serif font-bold text-sm text-[#1C1917]'>
              {activeTab === 'approved' ? t('desk.emptyApprovedTitle') : t('desk.emptyOtherTitle')}
            </div>
            <p className='text-xs text-[#57534E] max-w-sm mx-auto'>
              {activeTab === 'approved' ? t('desk.emptyApprovedDesc') : t('desk.emptyOtherDesc')}
            </p>
          </div>
        ) : (
          <div className='divide-y divide-[#D8D2C5]'>
            {filteredChapters.map((chap) => {
              const isScheduled = chap.publishedAt && new Date(chap.publishedAt) > new Date();

              return (
                <div
                  key={chap.id}
                  className='p-5 hover:bg-[#F8F6F0] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4'
                >
                  {/* Left: Info */}
                  <div className='flex items-start sm:items-center gap-3.5 min-w-0'>
                    {chap.coverUrl ? (
                      <AuthenticatedImage
                        src={chap.coverUrl}
                        alt={t('desk.chapterCoverAlt', { number: chap.chapterNumber })}
                        className='w-11 h-15 object-cover rounded-lg border border-[#D8D2C5] shadow-2xs shrink-0 bg-stone-100'
                        fallback={
                          <div className='w-11 h-15 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex flex-col items-center justify-center text-center font-mono shrink-0 shadow-2xs'>
                            <span className='text-[8px] text-stone-400 font-bold'>
                              {t('desk.chapterShortUpper')}
                            </span>
                            <span className='text-xs font-bold text-[#F97316]'>
                              {chap.chapterNumber}
                            </span>
                          </div>
                        }
                      />
                    ) : (
                      <div className='w-11 h-15 rounded-lg bg-[#FAF8F5] border border-[#D8D2C5] flex flex-col items-center justify-center text-center font-mono shrink-0 shadow-2xs'>
                        <span className='text-[8px] text-stone-400 font-bold'>
                          {t('desk.chapterShortUpper')}
                        </span>
                        <span className='text-xs font-bold text-[#F97316]'>
                          {chap.chapterNumber}
                        </span>
                      </div>
                    )}
                    <div className='space-y-1.5 min-w-0'>
                      <div className='flex items-center gap-2.5 flex-wrap'>
                        {/* Studio Badge */}
                        <span className='px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-sans font-semibold text-xs flex items-center gap-1 border border-stone-300'>
                          <Briefcase className='w-3 h-3 text-[#C2410C]' />
                          <span>{chap.workspaceName}</span>
                        </span>

                        {/* Series Title */}
                        <span className='px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-sans font-bold text-xs border border-amber-300'>
                          {chap.seriesTitle}
                        </span>

                        <span className='px-2.5 py-0.5 rounded-lg bg-[#1C1917] text-[#FCFBF8] font-mono font-bold text-xs'>
                          {t('desk.chapterNumber', { number: chap.chapterNumber })}
                        </span>

                        <h3 className='font-bold text-sm text-[#1C1917]'>
                          {chap.title || t('desk.untitled')}
                        </h3>

                        <ChapterPriceBadge
                          isLocked={chap.isLocked}
                          priceVnd={chap.priceVnd}
                          isMonetizationConfigured={chap.isMonetizationConfigured}
                        />

                        {/* Independent per-language edition pills (click -> exact Localized Chapter Detail) */}
                        {(editionsByChapterId[chap.id] || []).length > 0 && (
                          <div className='flex items-center gap-1.5 flex-wrap'>
                            {editionsByChapterId[chap.id].map((ed) => {
                              const st = getEditionStatusDisplay(ed, lang);
                              return (
                                <button
                                  key={ed.id}
                                  type='button'
                                  onClick={() =>
                                    navigate(
                                      `/publisher/revenue/series/${chap.seriesId}/chapters/${chap.id}?section=editions&lang=${ed.languageCode.toLowerCase()}`,
                                    )
                                  }
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold cursor-pointer hover:opacity-85 ${st.badgeClass}`}
                                  title={`${formatContentLanguageName(ed.languageCode, lang)} — ${st.label}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                                  <span>
                                    {formatContentLanguageName(ed.languageCode, lang)}: {st.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {chap.status === 'ChapterApproved' && (
                          <span className='px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] flex items-center gap-1'>
                            <Clock className='w-3 h-3 text-[#C2410C]' />
                            <span>{t('desk.badgePending')}</span>
                          </span>
                        )}
                        {chap.status === 'HandedOffAndPublished' && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border flex items-center gap-1 ${
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
                              {isScheduled ? t('desk.badgeScheduled') : t('desk.badgePublished')}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className='flex items-center gap-4 text-xs text-[#57534E] font-mono flex-wrap'>
                        <span>
                          {t('desk.scopeLabel')}: <strong>{chap.scenesCount || 0}</strong>{' '}
                          {t('desk.scenesUnit')} • <strong>{chap.pagesCount || 0}</strong>{' '}
                          {t('desk.pagesUnit')}
                        </span>
                        <span>Version: v.{chap.versionVector}</span>
                        {chap.targetReleaseDate && (
                          <span className='flex items-center gap-1 text-[#57534E]'>
                            <Calendar className='w-3 h-3' />
                            {t('desk.targetReleaseDate', { date: chap.targetReleaseDate })}
                          </span>
                        )}
                        {chap.publishedAt && (
                          <span className='flex items-center gap-1 text-[#C2410C] font-semibold'>
                            <Clock className='w-3 h-3' />
                            {t('desk.publishedAt', { date: formatDate(chap.publishedAt) })}
                          </span>
                        )}
                      </div>

                      {chap.outline && (
                        <p className='text-xs text-[#57534E] italic line-clamp-1'>
                          {t('desk.outline', { outline: chap.outline })}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className='flex items-center gap-2 shrink-0 flex-wrap'>
                    <button
                      type='button'
                      onClick={() => setReviewingChapter(chap)}
                      className='px-3.5 py-1.5 rounded-full border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-xs font-semibold text-[#57534E] hover:text-[#1C1917] flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm'
                      title={t('desk.historyTooltip')}
                    >
                      <History className='w-3.5 h-3.5 text-[#57534E]' />
                      <span>{t('detail.reviewHistory')}</span>
                    </button>

                    <button
                      type='button'
                      onClick={() => setSnapshotChapter(chap)}
                      className='px-3.5 py-1.5 rounded-full border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-xs font-semibold text-[#57534E] hover:text-[#1C1917] flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm'
                      title={t('desk.manifestTooltip')}
                    >
                      <FileStack className='w-3.5 h-3.5 text-[#57534E]' />
                      <span>{t('detail.viewManifest')}</span>
                    </button>

                    {chap.status === 'HandedOffAndPublished' && (
                      <button
                        type='button'
                        onClick={() => setReadingChapter(chap)}
                        className='px-3.5 py-1.5 rounded-full border border-[#D8D2C5] bg-[#F8F6F0] hover:bg-[#F3F0E9] text-xs font-semibold text-[#1C1917] flex items-center gap-1.5 transition-colors cursor-pointer shadow-soft-sm'
                        title={t('desk.readPreviewTooltip')}
                      >
                        <BookOpen className='w-3.5 h-3.5 text-[#C2410C]' />
                        <span>{t('desk.readPreview')}</span>
                      </button>
                    )}

                    {chap.status === 'ChapterApproved' && (
                      <button
                        type='button'
                        onClick={() => setPublishingChapter(chap)}
                        className='px-4 py-1.5 rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-soft-sm active:scale-95'
                        title={t('desk.publishScheduleTooltip')}
                      >
                        <Send className='w-3.5 h-3.5' />
                        <span>{t('desk.publishSchedule')}</span>
                      </button>
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

      {reviewingChapter && (
        <ChapterReviewsModal
          isOpen={!!reviewingChapter}
          chapterId={reviewingChapter.id}
          chapterNumber={reviewingChapter.chapterNumber}
          chapterTitle={reviewingChapter.title}
          onClose={() => setReviewingChapter(null)}
        />
      )}

      {snapshotChapter && (
        <ChapterProvenanceModal
          seriesId={snapshotChapter.seriesId}
          chapterId={snapshotChapter.id}
          chapterNumber={snapshotChapter.chapterNumber}
          chapterTitle={snapshotChapter.title}
          viewerRole='Publisher'
          onClose={() => setSnapshotChapter(null)}
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
