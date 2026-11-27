import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  PreviewChapterDto,
  PreviewPageDto,
  PreviewPanelDto,
  previewLinkService,
  resolvePreviewImageUrl,
} from '@/services/previewLink.service';
import { parseBoundingBox } from '@/shared/utils/panelBoundingBox';
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  BookOpen,
  Info,
  X,
  Smartphone,
  ShieldCheck,
  Rows3,
  FileImage,
} from 'lucide-react';
import { ReviewHandoffModal } from '@/shared/modals/ReviewHandoffModal';
import { useTranslation } from '@/lib/i18n';

interface SentFeedback {
  id: string;
  label: string;
  message: string;
  createdAt: string;
}

export const PublicPreviewView: React.FC = () => {
  const { t, lang } = useTranslation();
  const dateLocale = lang === 'en' ? 'en-US' : 'vi-VN';
  const { token } = useParams<{ token: string }>();

  // Dữ liệu bản xem thử (Chỉ lưu trong React State, TUYỆT ĐỐI KHÔNG lưu vào localStorage lâu dài)
  const [chapterData, setChapterData] = useState<PreviewChapterDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Điều hướng trang
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 403 Image retry flag: chỉ gọi lại /open đúng MỘT lần khi ảnh bị lỗi 403 / hết hạn
  const hasRetriedImageRef = useRef(false);
  const [imageReloadCount, setImageReloadCount] = useState(0);

  // Phản hồi độc giả
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackScope, setFeedbackScope] = useState<'chapter' | 'page' | 'panel'>('page');
  const [selectedPanel, setSelectedPanel] = useState<PreviewPanelDto | null>(null);
  const [message, setMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Chế độ xem (từng trang / cuộn dọc), cầu nối QR sang Mobile, tên người góp ý và các góp ý đã gửi trong phiên.
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single');
  const [showHandoff, setShowHandoff] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [sentFeedback, setSentFeedback] = useState<SentFeedback[]>([]);

  const fetchChapter = useCallback(async () => {
    if (!token) {
      setErrorMsg(t('workspace.reader.preview.missingToken'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await previewLinkService.openPreview(token);
      setChapterData(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t('workspace.reader.preview.invalidOrExpired');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchChapter();
  }, [fetchChapter]);

  // Xử lý khi ảnh trang tải lỗi (ví dụ token ảnh 10 phút hết hạn gây 403)
  const handleImageError = async () => {
    if (!token || hasRetriedImageRef.current) return;
    hasRetriedImageRef.current = true;
    try {
      // Gọi lại /open đúng MỘT lần để lấy token ảnh mới
      const refreshed = await previewLinkService.openPreview(token);
      setChapterData(refreshed);
      setImageReloadCount((c) => c + 1);
    } catch {
      // Giữ nguyên lỗi, không retry lặp vô tận
    }
  };

  const isRTL = chapterData?.readingDirection === 'RightToLeft';
  const totalPages = chapterData?.pages?.length || 0;
  const currentPage: PreviewPageDto | undefined = chapterData?.pages?.[currentPageIndex];

  const handleNextPage = useCallback(() => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex((prev) => prev + 1);
      setSelectedPanel(null);
    }
  }, [currentPageIndex, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
      setSelectedPanel(null);
    }
  }, [currentPageIndex]);

  // Bắt phím điều hướng (hỗ trợ đọc RTL: lật phải -> trái)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nếu đang gõ feedback thì không bắt phím điều hướng
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        if (isRTL) handlePrevPage();
        else handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        if (isRTL) handleNextPage();
        else handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRTL, handleNextPage, handlePrevPage]);

  const handleSelectPanel = (panel: PreviewPanelDto) => {
    setSelectedPanel(panel);
    setFeedbackScope('panel');
    setIsFeedbackOpen(true);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !message.trim()) return;

    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const pageId = feedbackScope === 'chapter' ? null : currentPage?.pageId || null;
      const panelId = feedbackScope === 'panel' ? selectedPanel?.panelId || null : null;

      const name = reviewerName.trim();
      const created = await previewLinkService.submitFeedback({
        token,
        message: message.trim(),
        reviewerName: name || null,
        pageId,
        panelId,
      });

      const label =
        feedbackScope === 'chapter'
          ? t('workspace.reader.preview.scopeWholeChapter')
          : feedbackScope === 'panel' && selectedPanel
            ? t('workspace.reader.preview.scopePagePanel', {
                page: currentPageIndex + 1,
                panel: selectedPanel.panelNumber,
              })
            : t('workspace.reader.preview.scopePageOnly', { page: currentPageIndex + 1 });
      setSentFeedback((prev) => [
        {
          id: created?.id ?? String(Date.now()),
          label,
          message: message.trim(),
          createdAt: created?.createdAt ?? new Date().toISOString(),
        },
        ...prev,
      ]);
      setFeedbackSuccess(true);
      setMessage('');
      setTimeout(() => {
        setFeedbackSuccess(false);
      }, 4000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        t('workspace.reader.preview.feedbackSubmitError');
      setFeedbackError(msg);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Màn hình Loading
  if (loading) {
    return (
      <div
        className='min-h-screen bg-[#0E0E10] text-white flex flex-col items-center justify-center p-6'
        data-testid='preview-loading-screen'
      >
        <Loader2 className='w-8 h-8 animate-spin text-[#F97316] mb-3' />
        <h2 className='text-sm font-semibold text-neutral-300'>
          {t('workspace.reader.preview.loadingTitle')}
        </h2>
        <p className='text-xs text-neutral-500 mt-1 font-mono'>
          {t('workspace.reader.preview.loadingSubtitle')}
        </p>
      </div>
    );
  }

  // Màn hình Lỗi (403: Hết hạn / Thu hồi / Token sai)
  if (errorMsg || !chapterData) {
    return (
      <div
        className='min-h-screen bg-[#0E0E10] text-white flex flex-col items-center justify-center p-6'
        data-testid='preview-error-screen'
      >
        <div className='max-w-md w-full bg-[#18181B] border border-red-900/50 rounded-2xl p-8 text-center shadow-2xl space-y-4'>
          <div className='w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto shadow-inner'>
            <ShieldAlert className='w-7 h-7' />
          </div>
          <div>
            <h1 className='text-lg font-bold text-white'>
              {t('workspace.reader.preview.errorHeading')}
            </h1>
            <p className='text-xs text-red-300 mt-2 bg-red-950/40 p-2.5 rounded-lg border border-red-900/40'>
              {errorMsg || t('workspace.reader.preview.invalidOrExpired')}
            </p>
          </div>
          <p className='text-xs text-neutral-400'>{t('workspace.reader.preview.errorDesc')}</p>
          <div className='pt-2'>
            <Link
              to='/'
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 transition-colors'
            >
              {t('workspace.reader.preview.backHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Một trang + khung tranh + watermark bắt buộc (BR-16) — dùng cho cả chế độ Từng trang và Cuộn dọc.
  const renderPageCanvas = (page: PreviewPageDto, index: number) => (
    <div
      className='relative inline-block w-full max-w-[850px] aspect-[2/3]'
      data-testid={`preview-page-image-wrapper-${page.pageId}`}
    >
      <img
        key={`${page.pageId}-${imageReloadCount}`}
        src={resolvePreviewImageUrl(page.imageUrl)}
        alt={t('workspace.reader.preview.pageAlt', { number: page.pageNumber })}
        onError={handleImageError}
        className='w-full h-full object-contain pointer-events-auto'
        data-testid='preview-page-image'
      />

      {/* Khung Panel Clickable Overlay (Kiểm tra và chuẩn hoá toạ độ px hay %) */}
      {page.panels &&
        page.panels.map((p) => {
          const box = parseBoundingBox(p.boundingBox, 100, 100);
          const isSelected = index === currentPageIndex && selectedPanel?.panelId === p.panelId;
          return (
            <div
              key={p.panelId}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPageIndex(index);
                handleSelectPanel(p);
              }}
              style={{
                position: 'absolute',
                left: `${box.percentX}%`,
                top: `${box.percentY}%`,
                width: `${box.percentW}%`,
                height: `${box.percentH}%`,
              }}
              className={`border transition-all cursor-pointer z-30 group ${
                isSelected
                  ? 'border-orange-500 bg-orange-500/20 shadow-lg'
                  : 'border-transparent hover:border-orange-400/80 hover:bg-orange-400/10'
              }`}
              title={t('workspace.reader.preview.panelTooltip', { number: p.panelNumber })}
              data-testid={`preview-panel-box-${p.panelId}`}
            >
              <span
                className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-mono font-bold transition-opacity ${
                  isSelected
                    ? 'bg-orange-500 text-white opacity-100'
                    : 'bg-black/70 text-orange-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {t('workspace.reader.preview.panelBadge', { number: p.panelNumber })}
              </span>
            </div>
          );
        })}

      {/* Watermark bắt buộc đè chéo, lặp lại trên mọi trang (CSS, pointer-events: none, không thể chọn được) */}
      <div
        className='absolute inset-0 pointer-events-none select-none overflow-hidden z-25'
        style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
        data-testid='watermark-overlay'
      >
        {/* SVG Repeating Diagonal Background */}
        <div
          className='w-full h-full opacity-25'
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='140px' width='280px'><text transform='translate(20, 110) rotate(-28)' fill='rgba(255,255,255,0.35)' font-size='14' font-family='monospace' font-weight='900'>${encodeURIComponent(chapterData.watermarkText || 'PANELFORGE CONFIDENTIAL PREVIEW')}</text></svg>")`,
            backgroundRepeat: 'repeat',
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      className='min-h-screen bg-[#0A0A0C] text-neutral-100 flex flex-col select-none'
      data-testid='public-preview-view'
    >
      {/* Top Header */}
      <header className='h-14 bg-[#141416]/95 border-b border-neutral-800/80 px-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md'>
        <div className='flex items-center gap-3 min-w-0'>
          <div className='w-8 h-8 rounded-lg bg-orange-950/60 border border-orange-700/50 flex items-center justify-center text-[#F97316] shrink-0'>
            <BookOpen className='w-4 h-4' />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <h1 className='text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md'>
                {chapterData.seriesTitle}
              </h1>
              <span className='px-1.5 py-0.5 rounded bg-orange-950/80 text-orange-400 border border-orange-800 text-xs font-mono shrink-0'>
                {isRTL
                  ? t('workspace.reader.preview.rtlBadge')
                  : t('workspace.reader.preview.ltrBadge')}
              </span>
            </div>
            <div className='text-xs text-neutral-400 font-mono truncate'>
              {t('workspace.reader.preview.chapterMeta', { number: chapterData.chapterNumber })}
              {chapterData.chapterTitle ? `: ${chapterData.chapterTitle}` : ''} •{' '}
              {t('workspace.reader.preview.recipientLabel')}{' '}
              <span className='text-neutral-300'>{chapterData.recipientEmail}</span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className='flex items-center gap-2 shrink-0'>
          <div className='hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400'>
            <span>{t('workspace.reader.preview.expiresLabel')}</span>
            <span className='text-amber-400 font-semibold'>
              {new Date(chapterData.expiresAt).toLocaleString(dateLocale)}
            </span>
          </div>

          <span
            className='hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs font-bold text-emerald-300'
            data-testid='watermark-badge'
          >
            <ShieldCheck className='w-3.5 h-3.5' />
            {t('workspace.reader.preview.watermarkBadge')}
          </span>

          <button
            type='button'
            onClick={() => setShowHandoff(true)}
            className='px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 cursor-pointer'
            data-testid='open-handoff-btn'
            title={t('workspace.reader.preview.handoffTitle')}
          >
            <Smartphone className='w-3.5 h-3.5' />
            <span className='hidden sm:inline'>{t('workspace.reader.preview.handoffLabel')}</span>
          </button>

          <button
            type='button'
            onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isFeedbackOpen
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
            }`}
            data-testid='toggle-feedback-panel'
            title={t('workspace.reader.preview.feedbackToggleTitle')}
          >
            <MessageSquare className='w-3.5 h-3.5' />
            <span>{t('workspace.reader.preview.feedbackToggleLabel')}</span>
          </button>

          <button
            type='button'
            onClick={toggleFullscreen}
            className='p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer hidden sm:flex'
            title={
              isFullscreen
                ? t('workspace.reader.preview.exitFullscreen')
                : t('workspace.reader.preview.enterFullscreen')
            }
          >
            {isFullscreen ? <Minimize2 className='w-4 h-4' /> : <Maximize2 className='w-4 h-4' />}
          </button>
        </div>
      </header>

      {/* Main Reader Content */}
      <div className='flex-1 flex overflow-hidden relative'>
        {/* Page Viewer Area */}
        <main className='flex-1 flex flex-col items-center justify-between p-2 sm:p-4 overflow-y-auto custom-scrollbar relative'>
          {/* Navigation Controls Bar */}
          <div className='w-full max-w-4xl flex items-center justify-between mb-2 text-xs font-mono text-neutral-400 px-2'>
            <div className='flex items-center gap-1.5'>
              <span>{t('workspace.reader.preview.pageLabel')}</span>
              <span className='text-white font-bold text-sm'>
                {currentPageIndex + 1} / {totalPages}
              </span>
              {currentPage && (
                <span className='text-xs text-neutral-500'>
                  {t('workspace.reader.preview.versionBadge', {
                    version: currentPage.versionNumber,
                  })}
                </span>
              )}
            </div>

            <div className='flex items-center gap-2'>
              <div
                className='flex rounded-lg border border-neutral-800 overflow-hidden'
                role='group'
                aria-label={t('workspace.reader.preview.viewModeAria')}
              >
                <button
                  type='button'
                  onClick={() => setViewMode('single')}
                  aria-pressed={viewMode === 'single'}
                  className={`px-2 py-1 flex items-center gap-1 cursor-pointer ${viewMode === 'single' ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                  data-testid='view-mode-single'
                >
                  <FileImage className='w-3.5 h-3.5' />
                  <span className='hidden sm:inline'>
                    {t('workspace.reader.preview.viewModeSingle')}
                  </span>
                </button>
                <button
                  type='button'
                  onClick={() => setViewMode('scroll')}
                  aria-pressed={viewMode === 'scroll'}
                  className={`px-2 py-1 flex items-center gap-1 cursor-pointer ${viewMode === 'scroll' ? 'bg-neutral-700 text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                  data-testid='view-mode-scroll'
                >
                  <Rows3 className='w-3.5 h-3.5' />
                  <span className='hidden sm:inline'>
                    {t('workspace.reader.preview.viewModeScroll')}
                  </span>
                </button>
              </div>
              {/* Lật trang theo hướng đọc */}
              <button
                type='button'
                onClick={isRTL ? handleNextPage : handlePrevPage}
                disabled={isRTL ? currentPageIndex >= totalPages - 1 : currentPageIndex <= 0}
                className='px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center gap-1 transition-colors cursor-pointer'
                data-testid='nav-prev-btn'
                title={
                  isRTL
                    ? t('workspace.reader.preview.nextPageRtlTitle')
                    : t('workspace.reader.preview.prevPageTitle')
                }
              >
                <ChevronLeft className='w-3.5 h-3.5' />
                <span>
                  {isRTL
                    ? t('workspace.reader.preview.nextPageRtl')
                    : t('workspace.reader.preview.prevPage')}
                </span>
              </button>

              <button
                type='button'
                onClick={isRTL ? handlePrevPage : handleNextPage}
                disabled={isRTL ? currentPageIndex <= 0 : currentPageIndex >= totalPages - 1}
                className='px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center gap-1 transition-colors cursor-pointer'
                data-testid='nav-next-btn'
                title={
                  isRTL
                    ? t('workspace.reader.preview.prevPageRtlTitle')
                    : t('workspace.reader.preview.nextPageTitle')
                }
              >
                <span>
                  {isRTL
                    ? t('workspace.reader.preview.prevPageRtl')
                    : t('workspace.reader.preview.nextPage')}
                </span>
                <ChevronRight className='w-3.5 h-3.5' />
              </button>
            </div>
          </div>

          {/* Page Image Container with Panels & Mandatory Diagonal Repeating Watermark */}
          <div
            className='relative max-w-4xl w-full flex items-center justify-center bg-[#111114] border border-neutral-800/80 rounded-xl overflow-hidden shadow-2xl'
            data-testid='preview-page-container'
          >
            {viewMode === 'scroll' && totalPages > 0 ? (
              <div className='w-full flex flex-col items-center gap-4 py-2'>
                {chapterData.pages.map((page, index) => renderPageCanvas(page, index))}
              </div>
            ) : currentPage ? (
              renderPageCanvas(currentPage, currentPageIndex)
            ) : (
              <div className='py-20 text-center text-neutral-500'>
                <Info className='w-8 h-8 mx-auto mb-2 text-neutral-600' />
                <p className='text-xs'>{t('workspace.reader.preview.emptyChapter')}</p>
              </div>
            )}
          </div>

          {/* Reading hint */}
          <div className='mt-2 text-xs text-neutral-500 font-mono text-center'>
            {t('workspace.reader.preview.readingHint')}
          </div>
        </main>

        {/* Feedback Sidebar / Drawer */}
        {isFeedbackOpen && (
          <aside
            className='w-80 sm:w-96 bg-[#141416] border-l border-neutral-800 p-4 flex flex-col z-30 animate-in slide-in-from-right duration-200 shrink-0'
            data-testid='feedback-drawer'
          >
            <div className='flex items-center justify-between border-b border-neutral-800 pb-3 mb-4'>
              <div className='flex items-center gap-2'>
                <MessageSquare className='w-4 h-4 text-[#F97316]' />
                <h2 className='text-xs font-bold text-white uppercase tracking-wider'>
                  {t('workspace.reader.preview.feedbackHeading')}
                </h2>
              </div>
              <button
                type='button'
                onClick={() => setIsFeedbackOpen(false)}
                className='w-6 h-6 rounded hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer'
              >
                <X className='w-3.5 h-3.5' />
              </button>
            </div>

            {/* Scope selector */}
            <div className='mb-3'>
              <label className='block text-xs font-semibold text-neutral-300 mb-1.5'>
                {t('workspace.reader.preview.scopeLabel')}
              </label>
              <div className='grid grid-cols-3 gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-xs font-mono'>
                <button
                  type='button'
                  onClick={() => {
                    setFeedbackScope('chapter');
                    setSelectedPanel(null);
                  }}
                  className={`py-1.5 rounded text-center transition-colors cursor-pointer ${
                    feedbackScope === 'chapter'
                      ? 'bg-neutral-800 text-[#F97316] font-bold shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  data-testid='scope-chapter-btn'
                >
                  {t('workspace.reader.preview.scopeBtnChapter')}
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setFeedbackScope('page');
                    setSelectedPanel(null);
                  }}
                  className={`py-1.5 rounded text-center transition-colors cursor-pointer ${
                    feedbackScope === 'page'
                      ? 'bg-neutral-800 text-[#F97316] font-bold shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  data-testid='scope-page-btn'
                >
                  {t('workspace.reader.preview.scopeBtnPage', { number: currentPageIndex + 1 })}
                </button>
                <button
                  type='button'
                  onClick={() => setFeedbackScope('panel')}
                  className={`py-1.5 rounded text-center transition-colors cursor-pointer ${
                    feedbackScope === 'panel'
                      ? 'bg-neutral-800 text-[#F97316] font-bold shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  data-testid='scope-panel-btn'
                >
                  {selectedPanel
                    ? t('workspace.reader.preview.scopeBtnPanel', {
                        number: selectedPanel.panelNumber,
                      })
                    : t('workspace.reader.preview.scopeBtnPanelEmpty')}
                </button>
              </div>
            </div>

            {/* Scope details badge */}
            <div className='mb-3 p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-300 flex items-start gap-1.5'>
              <Sparkles className='w-3.5 h-3.5 text-[#F97316] shrink-0 mt-0.5' />
              <div>
                {feedbackScope === 'chapter' && (
                  <span>{t('workspace.reader.preview.scopeHintChapter')}</span>
                )}
                {feedbackScope === 'page' && (
                  <span>
                    {t('workspace.reader.preview.scopeHintPagePrefix')}{' '}
                    <strong>
                      {t('workspace.reader.preview.scopeHintPageName', {
                        number: currentPageIndex + 1,
                      })}
                    </strong>{' '}
                    {t('workspace.reader.preview.scopeHintPageVersion', {
                      version: currentPage?.versionNumber ?? '',
                    })}
                  </span>
                )}
                {feedbackScope === 'panel' && (
                  <span>
                    {selectedPanel ? (
                      <>
                        {t('workspace.reader.preview.scopeHintPanelPrefix')}{' '}
                        <strong>
                          {t('workspace.reader.preview.scopeHintPanelName', {
                            panel: selectedPanel.panelNumber,
                          })}
                        </strong>{' '}
                        {t('workspace.reader.preview.scopeHintPanelPage', {
                          page: currentPageIndex + 1,
                        })}
                      </>
                    ) : (
                      <span className='text-amber-400'>
                        {t('workspace.reader.preview.scopeHintPanelSelect')}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Success notification */}
            {feedbackSuccess && (
              <div
                className='mb-3 p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150'
                data-testid='feedback-success-banner'
              >
                <CheckCircle2 className='w-4 h-4 shrink-0 text-emerald-400' />
                <span>{t('workspace.reader.preview.feedbackSuccess')}</span>
              </div>
            )}

            {/* Error notification */}
            {feedbackError && (
              <div className='mb-3 p-2.5 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-150'>
                <AlertTriangle className='w-4 h-4 shrink-0 text-red-400' />
                <span>{feedbackError}</span>
              </div>
            )}

            {/* Feedback input form */}
            <form onSubmit={handleSubmitFeedback} className='flex-1 flex flex-col space-y-3'>
              <div>
                <label
                  htmlFor='reviewer-name'
                  className='block text-xs font-semibold text-neutral-300 mb-1'
                >
                  {t('workspace.reader.preview.reviewerNameLabel')}
                </label>
                <input
                  id='reviewer-name'
                  value={reviewerName}
                  maxLength={80}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder={t('workspace.reader.preview.reviewerNamePlaceholder')}
                  className='w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#F97316]'
                  data-testid='reviewer-name-input'
                />
              </div>
              {feedbackScope !== 'chapter' && totalPages > 1 && (
                <div>
                  <label
                    htmlFor='feedback-page'
                    className='block text-xs font-semibold text-neutral-300 mb-1'
                  >
                    {t('workspace.reader.preview.feedbackPageLabel')}
                  </label>
                  <select
                    id='feedback-page'
                    value={currentPageIndex}
                    onChange={(e) => {
                      setCurrentPageIndex(Number(e.target.value));
                      setSelectedPanel(null);
                    }}
                    className='w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#F97316]'
                    data-testid='feedback-page-select'
                  >
                    {chapterData.pages.map((p, idx) => (
                      <option key={p.pageId} value={idx}>
                        {t('workspace.reader.preview.feedbackPageOption', {
                          number: p.pageNumber,
                        })}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className='flex-1 flex flex-col'>
                <label className='block text-xs font-semibold text-neutral-300 mb-1'>
                  {t('workspace.reader.preview.feedbackMessageLabel')}
                </label>
                <textarea
                  required
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('workspace.reader.preview.feedbackMessagePlaceholder')}
                  className='w-full flex-1 min-h-[160px] p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#F97316] resize-none custom-scrollbar'
                  data-testid='feedback-message-input'
                />
                <div className='text-right text-xs text-neutral-500 font-mono mt-1'>
                  {t('workspace.reader.preview.charCount', { count: message.length })}
                </div>
              </div>

              <button
                type='submit'
                disabled={
                  submittingFeedback ||
                  !message.trim() ||
                  (feedbackScope === 'panel' && !selectedPanel)
                }
                className='w-full py-2.5 rounded-full bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer'
                data-testid='submit-feedback-btn'
              >
                {submittingFeedback ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Send className='w-4 h-4' />
                )}
                <span>{t('workspace.reader.preview.submitFeedback')}</span>
              </button>
            </form>

            {sentFeedback.length > 0 && (
              <div
                className='mt-4 border-t border-neutral-800 pt-3'
                data-testid='sent-feedback-list'
              >
                <h3 className='text-xs font-bold text-neutral-300 mb-2'>
                  {t('workspace.reader.preview.sentFeedbackTitle', { count: sentFeedback.length })}
                </h3>
                <ul className='space-y-2 max-h-48 overflow-y-auto custom-scrollbar'>
                  {sentFeedback.map((fb) => (
                    <li
                      key={fb.id}
                      className='p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs'
                    >
                      <div className='flex items-center justify-between gap-2 text-neutral-500 font-mono'>
                        <span className='text-emerald-400 flex items-center gap-1'>
                          <CheckCircle2 className='w-3 h-3' />
                          {fb.label}
                        </span>
                        <span>{new Date(fb.createdAt).toLocaleTimeString(dateLocale)}</span>
                      </div>
                      <p className='mt-1 text-neutral-200 whitespace-pre-wrap break-words'>
                        {fb.message}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>

      {showHandoff && token && (
        <ReviewHandoffModal token={token} onClose={() => setShowHandoff(false)} />
      )}
    </div>
  );
};
export default PublicPreviewView;
