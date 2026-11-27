import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Lock, Rocket, Unlock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { Badge, Button, type SurfaceTone } from '@/shared/ui';
import { daysUntil } from './workspaceMetrics';
import {
  buildChapterManagementUrl,
  buildRoleChapterReaderUrl,
  buildProductionWorkspaceUrl,
  buildScriptReviewUrl,
  buildSeriesExportUrl,
} from '@/app/routePaths';

export interface ProducerSharedHeaderProps {
  /** 'chapter' (default) shows chapter selector, status, script lock & deadline; 'series' renders a Series-level header without chapter controls. */
  mode?: 'chapter' | 'series';
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

const CHAPTER_STATUS_META: Record<string, { labelKey: string; tone: SurfaceTone }> = {
  PreProduction: {
    labelKey: 'workbench.chapterStatus.PreProduction',
    tone: 'neutral',
  },
  InProduction: {
    labelKey: 'workbench.chapterStatus.InProduction',
    tone: 'info',
  },
  ChapterApproved: {
    labelKey: 'workbench.chapterStatus.ChapterApproved',
    tone: 'success',
  },
  Approved: {
    labelKey: 'workbench.chapterStatus.Approved',
    tone: 'success',
  },
  HandedOffAndPublished: {
    labelKey: 'workbench.chapterStatus.HandedOffAndPublished',
    tone: 'success',
  },
  Published: {
    labelKey: 'workbench.chapterStatus.Published',
    tone: 'success',
  },
};

export const ProducerSharedHeader: React.FC<ProducerSharedHeaderProps> = ({
  mode = 'chapter',
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
          ? { label: t(meta.labelKey), tone: meta.tone }
          : { label: resolvedStatus, tone: 'neutral' as SurfaceTone };
      })()
    : null;

  const isScriptFrozen = Boolean(
    readiness?.script?.isScriptFrozen ?? resolvedChapter?.isScriptFrozen,
  );
  const scriptStatus = String(
    readiness?.script?.scriptStatus || resolvedChapter?.scriptStatus || '',
  );
  const scriptVersionNum =
    readiness?.script?.productionVersionNumber ??
    readiness?.script?.approvedVersionNumber ??
    readiness?.script?.latestVersionNumber ??
    null;
  const deadlineStr = readiness?.targetReleaseDate ?? resolvedChapter?.targetReleaseDate;
  const remainingDays = daysUntil(deadlineStr);

  const activeHubSection: 'overview' | 'pre-production' | 'production' | 'review' = (() => {
    if (location.pathname.includes('/script/review')) return 'pre-production';
    if (location.pathname.endsWith('/workspace')) return 'production';
    if (location.pathname.endsWith('/reader') || location.pathname.endsWith('/export')) {
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
        navigate(buildRoleChapterReaderUrl('producer', workspaceId, seriesId, nextId));
      } else if (location.pathname.endsWith('/export')) {
        navigate(buildSeriesExportUrl(workspaceId, seriesId, nextId));
      } else if (location.pathname.endsWith('/workspace')) {
        navigate(
          buildProductionWorkspaceUrl(workspaceId, seriesId, {
            chapterId: nextId,
            tab: 'progress',
          }),
        );
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

  const isSeriesMode = mode === 'series';

  return (
    <header
      data-testid='producer-shared-header'
      className='w-full bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-[var(--studio-z-sticky)] px-4 sm:px-6 lg:px-8 py-2.5 shadow-[inset_0_2px_0_var(--studio-accent)]'
    >
      <div className='max-w-[1640px] mx-auto'>
        <div className='flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3'>
          {/* Left: Context Title & Metadata Badges */}
          <div className='flex flex-wrap items-center gap-2.5 min-w-0'>
            <div className='min-w-0'>
              {!isSeriesMode && !hideBackLink && activeHubSection !== 'overview' && (
                <button
                  type='button'
                  onClick={handleBack}
                  className='inline-flex items-center gap-1 text-xs font-semibold text-accent-dark hover:underline mb-0.5 transition-colors cursor-pointer'
                >
                  <ArrowLeft className='w-3.5 h-3.5' aria-hidden='true' />
                  <span>{t('workbench.backToChapters')}</span>
                </button>
              )}

              {isSeriesMode ? (
                <div className='flex flex-wrap items-center gap-2'>
                  <h2 className='font-serif text-lg font-bold text-stone-900 leading-tight truncate'>
                    {seriesTitle || t('workbench.seriesFallback')}
                  </h2>
                  <Badge tone='neutral' icon={<BookOpen aria-hidden='true' />}>
                    {t('workbench.header.seriesScopeBadge')}
                  </Badge>
                  {seriesFormat && <Badge tone='brand'>{seriesFormat}</Badge>}
                </div>
              ) : (
                <div className='flex flex-wrap items-center gap-2'>
                  <h2 className='text-base font-bold text-stone-900 leading-tight truncate'>
                    {seriesTitle ? `${seriesTitle} · ` : ''}
                    {currentChapterFormattedTitle}
                  </h2>
                  {statusMeta && (
                    <Badge data-testid='header-chapter-lifecycle-badge' tone={statusMeta.tone}>
                      {statusMeta.label}
                    </Badge>
                  )}
                  {resolvedChapter && (
                    <Badge
                      data-testid='header-script-lock-badge'
                      tone={
                        isScriptFrozen
                          ? 'success'
                          : scriptStatus === 'InReview'
                            ? 'info'
                            : 'warning'
                      }
                      icon={
                        isScriptFrozen ? <Lock aria-hidden='true' /> : <Unlock aria-hidden='true' />
                      }
                      title={
                        isScriptFrozen
                          ? t('workbench.header.scriptLockedTitle')
                          : scriptStatus === 'InReview'
                            ? t('workbench.header.scriptInReviewTitle')
                            : t('workbench.header.scriptDraftTitle')
                      }
                    >
                      {isScriptFrozen
                        ? t('workbench.header.scriptLocked')
                        : scriptStatus === 'InReview'
                          ? t('workbench.header.scriptInReview')
                          : t('workbench.header.scriptDraft')}
                      {scriptVersionNum ? ` · v${scriptVersionNum}` : ''}
                    </Badge>
                  )}
                  {deadlineStr && (
                    <Badge
                      tone={remainingDays !== null && remainingDays < 0 ? 'danger' : 'neutral'}
                      icon={<Calendar aria-hidden='true' />}
                    >
                      {t('workbench.header.deadline', { date: deadlineStr })}
                    </Badge>
                  )}
                </div>
              )}

              {subtitle ? (
                <p className='text-xs text-stone-500 mt-0.5 truncate'>{subtitle}</p>
              ) : !isSeriesMode && seriesFormat ? (
                <p className='text-xs text-stone-500 mt-0.5 truncate'>{seriesFormat}</p>
              ) : null}
            </div>
          </div>

          {/* Right: Chapter Selector (chapter mode only) + Single Primary Action */}
          <div className='flex flex-wrap items-center gap-2 shrink-0'>
            {!isSeriesMode && (
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
                  className='px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium focus:outline-none focus:border-accent cursor-pointer shadow-2xs max-w-[220px] truncate'
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
            )}

            {actionCta !== undefined ? (
              actionCta
            ) : !isSeriesMode && onStartProduction ? (
              <Button
                variant='primary'
                size='sm'
                leadingIcon={<Rocket aria-hidden='true' />}
                onClick={onStartProduction}
              >
                {t('workbench.startProduction')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
