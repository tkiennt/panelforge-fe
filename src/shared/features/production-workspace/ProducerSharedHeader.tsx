import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  Rocket,
  Unlock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { daysUntil } from './workspaceMetrics';
import {
  buildChapterManagementUrl,
  buildChapterReaderUrl,
  buildEditorDeskUrl,
  buildProductionWorkspaceUrl,
  buildScriptReviewUrl,
  buildSeriesExportUrl,
} from '@/app/routePaths';

export interface ProducerSharedHeaderProps {
  workspaceId?: string;
  seriesId?: string;
  currentChapterId?: string;
  chapters?: ChapterDto[];
  seriesTitle?: string;
  seriesFormat?: string;
  subtitle?: string;
  currentChapter?: ChapterDto | null;
  readiness?: ChapterReadinessDto | null;
  onChapterChange?: (newChapterId: string) => void;
  onBackToChapters?: () => void;
  onStartProduction?: () => void;
  actionCta?: React.ReactNode;
  loadingChapters?: boolean;
  hideBackLink?: boolean;
  showWorkspaceTabs?: boolean;
}

const CHAPTER_STATUS_META: Record<string, { labelKey: string; cls: string }> = {
  PreProduction: {
    labelKey: 'workbench.chapterStatus.PreProduction',
    cls: 'text-stone-800 bg-stone-100 border-stone-200',
  },
  InProduction: {
    labelKey: 'workbench.chapterStatus.InProduction',
    cls: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  ChapterApproved: {
    labelKey: 'workbench.chapterStatus.ChapterApproved',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  Approved: {
    labelKey: 'workbench.chapterStatus.Approved',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  HandedOffAndPublished: {
    labelKey: 'workbench.chapterStatus.HandedOffAndPublished',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  Published: {
    labelKey: 'workbench.chapterStatus.Published',
    cls: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
};

export const ProducerSharedHeader: React.FC<ProducerSharedHeaderProps> = ({
  workspaceId,
  seriesId,
  currentChapterId,
  chapters = [],
  seriesTitle,
  seriesFormat,
  subtitle,
  currentChapter,
  readiness,
  onChapterChange,
  onBackToChapters,
  onStartProduction,
  actionCta,
  loadingChapters = false,
  hideBackLink = false,
  showWorkspaceTabs = true,
}) => {
  const { t } = useTranslation('pipeline');
  const navigate = useNavigate();
  const location = useLocation();

  const resolvedChapter =
    currentChapter || chapters.find((c) => c.id === currentChapterId) || chapters[0] || null;

  const effectiveChapterId = currentChapterId || resolvedChapter?.id || '';

  const currentChapterFormattedTitle = resolvedChapter
    ? formatChapterLabel(
        resolvedChapter.chapterNumber,
        resolvedChapter.title || t('workbench.draftTitle'),
      )
    : t('workbench.selectChapter');

  const resolvedStatus = String(readiness?.chapterStatus || resolvedChapter?.status || '');
  const statusMeta = resolvedStatus
    ? (() => {
        const meta = CHAPTER_STATUS_META[resolvedStatus];
        return meta
          ? { label: t(meta.labelKey), cls: meta.cls }
          : {
              label: resolvedStatus,
              cls: 'text-stone-800 bg-stone-100 border-stone-200',
            };
      })()
    : null;

  const isScriptFrozen = Boolean(readiness?.script?.isScriptFrozen ?? resolvedChapter?.isScriptFrozen);
  const scriptStatus = String(readiness?.script?.scriptStatus || resolvedChapter?.scriptStatus || '');
  const deadlineStr = readiness?.targetReleaseDate ?? resolvedChapter?.targetReleaseDate;
  const remainingDays = daysUntil(deadlineStr);

  const activeHubSection: 'overview' | 'pre-production' | 'production' | 'review' = (() => {
    if (location.pathname.includes('/script/review')) return 'pre-production';
    if (location.pathname.endsWith('/workspace')) return 'production';
    if (
      location.pathname.endsWith('/reader') ||
      location.pathname.endsWith('/export') ||
      location.pathname.includes('/editor/desk')
    ) {
      return 'review';
    }
    return 'overview';
  })();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    if (onChapterChange) {
      onChapterChange(nextId);
    } else if (workspaceId && seriesId) {
      if (location.pathname.includes('/script/review')) {
        navigate(buildScriptReviewUrl(workspaceId, seriesId, nextId));
      } else if (location.pathname.endsWith('/reader')) {
        navigate(buildChapterReaderUrl(workspaceId, seriesId, nextId));
      } else if (location.pathname.endsWith('/export')) {
        navigate(buildSeriesExportUrl(workspaceId, seriesId, nextId));
      } else if (location.pathname.endsWith('/workspace')) {
        navigate(buildProductionWorkspaceUrl(workspaceId, seriesId, { chapterId: nextId, tab: 'progress' }));
      } else if (location.pathname.includes('/editor/desk')) {
        navigate(buildEditorDeskUrl(workspaceId, seriesId, { chapterId: nextId }));
      } else {
        navigate(buildChapterManagementUrl(workspaceId, seriesId, nextId));
      }
    }
  };

  const handleBack = () => {
    if (onBackToChapters) {
      onBackToChapters();
    } else if (workspaceId && seriesId) {
      navigate(buildChapterManagementUrl(workspaceId, seriesId, effectiveChapterId));
    }
  };

  return (
    <div
      data-testid='producer-shared-header'
      className='w-full bg-white/95 border-b border-stone-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 pt-2.5 pb-2 shadow-[inset_0_2px_0_var(--studio-accent)]'
    >
      <div className='max-w-[1640px] mx-auto space-y-2'>
        <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3'>
          {/* Left: Title, Chapter Lifecycle Badge, Script Lock Badge, Deadline */}
          <div className='flex flex-wrap items-center gap-2.5 min-w-0'>
            <div className='min-w-0'>
              {!hideBackLink && activeHubSection !== 'overview' && (
                <button
                  type='button'
                  onClick={handleBack}
                  className='inline-flex items-center gap-1 text-xs font-semibold text-orange-700 hover:text-orange-800 hover:underline mb-0.5 transition-colors cursor-pointer'
                >
                  <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
                  <span>{t('workbench.backToChapters', 'Quay lại Tổng quan chương')}</span>
                </button>
              )}
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-base font-bold text-stone-900 leading-tight truncate'>
                  {seriesTitle ? `${seriesTitle} · ` : ''}
                  {currentChapterFormattedTitle}
                </h2>
                {statusMeta && (
                  <span
                    data-testid='header-chapter-lifecycle-badge'
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${statusMeta.cls}`}
                  >
                    {statusMeta.label}
                  </span>
                )}
                {resolvedChapter && (
                  <span
                    data-testid='header-script-lock-badge'
                    title={
                      isScriptFrozen
                        ? 'Kịch bản đã khóa cho sản xuất'
                        : scriptStatus === 'InReview'
                          ? 'Kịch bản đã gửi duyệt, chưa khóa sản xuất'
                          : 'Kịch bản đang mở chỉnh sửa'
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium whitespace-nowrap ${
                      isScriptFrozen
                        ? 'bg-stone-100 text-stone-700 border-stone-200'
                        : scriptStatus === 'InReview'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-amber-50/70 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isScriptFrozen ? (
                      <Lock className='w-3 h-3' aria-hidden='true' />
                    ) : (
                      <Unlock className='w-3 h-3' aria-hidden='true' />
                    )}
                    <span>
                      {isScriptFrozen
                        ? 'Kịch bản: Đã khóa'
                        : scriptStatus === 'InReview'
                          ? 'Kịch bản: Đã gửi duyệt'
                          : 'Kịch bản: Bản nháp'}
                    </span>
                  </span>
                )}
                {deadlineStr && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      remainingDays !== null && remainingDays < 0
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    <Calendar className='w-3 h-3' aria-hidden='true' />
                    <span>Hạn: {deadlineStr}</span>
                  </span>
                )}
              </div>
              {subtitle || seriesFormat ? (
                <p className='text-xs text-stone-500 mt-0.5'>
                  {subtitle || seriesFormat}
                </p>
              ) : null}
            </div>
          </div>

          {/* Right: Chapter Selector + Single Primary Action */}
          <div className='flex flex-wrap items-center gap-2.5 shrink-0'>
            <div className='relative flex items-center'>
              <label htmlFor='producer-chapter-select' className='sr-only'>
                {t('workbench.chapterSelectLabel')}
              </label>
              <select
                id='producer-chapter-select'
                aria-label={t('workbench.chapterSelectLabel')}
                value={effectiveChapterId}
                onChange={handleSelectChange}
                disabled={loadingChapters || chapters.length === 0}
                className='px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium focus:outline-none focus:border-stone-400 cursor-pointer shadow-2xs'
              >
                {chapters.length === 0 ? (
                  <option value=''>{t('workbench.loadingChapters')}</option>
                ) : (
                  chapters.map((chap) => (
                    <option key={chap.id} value={chap.id}>
                      {formatChapterLabel(
                        chap.chapterNumber,
                        chap.title || t('workbench.draftTitle'),
                      )}
                    </option>
                  ))
                )}
              </select>
            </div>

            {actionCta !== undefined ? (
              actionCta
            ) : onStartProduction ? (
              <button
                type='button'
                onClick={onStartProduction}
                className='px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer'
              >
                <Rocket className='w-3.5 h-3.5' />
                <span>{t('workbench.startProduction', 'Bắt đầu sản xuất')}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Unified Chapter Production Hub Section Tabs */}
        {showWorkspaceTabs && workspaceId && seriesId && effectiveChapterId && (
          <nav
            aria-label='Điều hướng trung tâm sản xuất chương'
            data-testid='producer-hub-tabs'
            className='flex items-center gap-1 overflow-x-auto pt-1 border-t border-stone-100'
          >
            {[
              {
                id: 'overview' as const,
                label: 'Tổng quan',
                icon: LayoutDashboard,
                url: buildChapterManagementUrl(workspaceId, seriesId, effectiveChapterId),
              },
              {
                id: 'pre-production' as const,
                label: 'Tiền sản xuất',
                icon: FileText,
                url: buildScriptReviewUrl(workspaceId, seriesId, effectiveChapterId),
              },
              {
                id: 'production' as const,
                label: 'Sản xuất',
                icon: LayoutGrid,
                url: buildProductionWorkspaceUrl(workspaceId, seriesId, {
                  chapterId: effectiveChapterId,
                  tab: 'progress',
                }),
              },
              {
                id: 'review' as const,
                label: 'Kiểm duyệt & Bàn giao',
                icon:
                  resolvedStatus === 'ChapterApproved' || resolvedStatus === 'HandedOffAndPublished'
                    ? CheckCircle2
                    : ClipboardCheck,
                url:
                  resolvedStatus === 'ChapterApproved' || resolvedStatus === 'HandedOffAndPublished'
                    ? buildSeriesExportUrl(workspaceId, seriesId, effectiveChapterId)
                    : buildEditorDeskUrl(workspaceId, seriesId, { chapterId: effectiveChapterId }),
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeHubSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => navigate(tab.url)}
                  data-testid={`hub-tab-${tab.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 border border-orange-200/80'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 border border-transparent'
                  }`}
                >
                  <Icon className='w-3.5 h-3.5 shrink-0' aria-hidden='true' />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
};
