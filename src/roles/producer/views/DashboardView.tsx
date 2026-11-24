import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  DollarSign,
  Eye,
  FileText,
  UploadCloud,
} from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { useTranslation } from '@/lib/i18n';
import { notificationService } from '@/services/notification.service';
import type { ChapterProgressDto } from '@/services/series.service';
import { MangaProject, AssistantRosterItem, ProvenanceLogItem } from '@/types';
import { SeriesChaptersModal } from '../modals/SeriesChaptersModal';
import { SeriesMembersModal } from '../modals/SeriesMembersModal';
import { SeriesBurndownCard } from '../components/SeriesBurndownCard';
import { useSeriesDashboard } from '../hooks/useSeriesDashboard';
import { SeriesHeaderBanner } from '../components/dashboard/SeriesHeaderBanner';
import { SeriesQuickMetrics } from '../components/dashboard/SeriesQuickMetrics';
import { DashboardTabNav, type DashboardTab } from '../components/dashboard/DashboardTabNav';
import { ChapterStatusTable } from '../components/dashboard/ChapterStatusTable';
import { SeriesTeamCard } from '../components/dashboard/SeriesTeamCard';
import { AttentionRiskCard } from '../components/dashboard/AttentionRiskCard';
import { StageMatrixSection } from '../components/dashboard/StageMatrixSection';
import { WorkloadCard } from '../components/dashboard/WorkloadCard';
import {
  buildArtistDeskUrl,
  buildBibleUrl,
  buildEditorDeskUrl,
  buildExportUrl,
  buildScriptEditorUrl,
  buildScriptReviewUrl,
  buildSeriesPath,
} from '@/app/routePaths';

interface DashboardViewProps {
  /** Vai trò trong workspace hiện tại: chỉ Producer thấy nút đổi avatar/banner Series & tab doanh thu/đội ngũ. */
  workspaceRole?: string | null;
  activeProject?: MangaProject;
  assistants?: AssistantRosterItem[];
  provenanceLogs?: ProvenanceLogItem[];
  onOpenSpreadModal?: () => void;
  onOpenCanvasModal?: () => void;
  onRunAiAudit?: () => void;
  onExportReport?: () => void;
  onConfigureAnchors?: () => void;
  onViewAuditLog?: () => void;
  onManageAssignments?: () => void;
  onShowToast?: (title: string, desc: string) => void;
}

const noopToast = (_title: string, _desc: string) => {};

export const DashboardView: React.FC<DashboardViewProps> = ({
  workspaceRole,
  activeProject,
  onShowToast = noopToast,
}) => {
  const { t } = useTranslation('production');
  const navigate = useNavigate();
  const { workspaceId, seriesId: routeSeriesId } = useParams<{
    workspaceId: string;
    seriesId: string;
  }>();
  const seriesId = routeSeriesId || activeProject?.id;

  const dashboard = useSeriesDashboard(seriesId, workspaceId, onShowToast);
  const { progress, seriesDetail, seriesMembers, selectedChapter, kpis, loading, error } =
    dashboard;
  const chapters = progress?.chapters ?? [];

  // Determine user role in this workbench: Producer vs Editor
  const normalizedRole = String(workspaceRole ?? '').toUpperCase();
  const userRole = localStorage.getItem('userRole');
  const isEditor = normalizedRole === 'EDITOR' || (!normalizedRole && userRole === 'EDITOR');
  const isProducer = !isEditor;

  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  // Fallback for Editor: Editor must not access revenue or team tabs
  useEffect(() => {
    if (!isProducer && (activeTab === 'revenue' || activeTab === 'team')) {
      setActiveTab('chapters');
    }
  }, [isProducer, activeTab]);

  const seriesTitle =
    seriesDetail?.title || activeProject?.title || t('dashboard.view.defaultSeriesTitle');
  const canRoute = !!(workspaceId && seriesId);

  const showSection = (...tabs: DashboardTab[]) => {
    if (activeTab === 'all') {
      return tabs.some((t) => t === 'chapters' || (t === 'team' && isProducer) || t === 'reports');
    }
    return tabs.includes(activeTab);
  };

  const openPipeline = (chapterId?: string | null) =>
    navigate(
      `/workspaces/${workspaceId}/series/${seriesId}/workspace${chapterId ? `?chapterId=${chapterId}` : ''}`,
    );

  const openAssign = (chapter: ChapterProgressDto) => {
    if (!canRoute) return;
    navigate(
      `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${chapter.chapterId}&board=grid-v3`,
    );
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await notificationService.sendReminders();
      onShowToast(
        t('dashboard.view.remindersToastTitle'),
        res.created > 0
          ? t('dashboard.view.remindersToastSent', { count: res.created })
          : t('dashboard.view.remindersToastNone'),
      );
    } catch {
      onShowToast(
        t('dashboard.view.remindersToastErrorTitle'),
        t('dashboard.view.remindersToastErrorDesc'),
      );
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <PageContainer className='w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6 pb-16 font-sans text-stone-900 min-w-0'>
      {/* Top Bar: Return to Tier 1 Studio Hub and Role Scope Badge */}
      <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
        {workspaceId && (
          <button
            type='button'
            data-testid='back-to-studio-hub-btn'
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
            className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/80 hover:border-orange-300 text-stone-700 hover:text-stone-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer'
            title={t('dashboard.view.backToStudioHubTooltip')}
          >
            <ArrowLeft className='w-3.5 h-3.5 text-orange-600' />
            <span>{t('dashboard.view.backToStudioHub')}</span>
          </button>
        )}

        <div className='flex items-center gap-2 text-xs ml-auto'>
          <span className='text-stone-500 font-medium hidden sm:inline'>
            {t('dashboard.view.workspaceRoleLabel')}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-[11px] uppercase border ${
              isProducer
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : isEditor
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            {isProducer
              ? t('dashboard.view.roleBadgeProducer')
              : isEditor
                ? t('dashboard.view.roleBadgeEditor')
                : (workspaceRole ?? 'MEMBER')}
          </span>
        </div>
      </div>

      <SeriesHeaderBanner
        seriesId={seriesId}
        seriesTitle={seriesTitle}
        seriesDetail={seriesDetail}
        activeProject={activeProject}
        workspaceName={dashboard.workspaceName}
        chapterCount={chapters.length || seriesDetail?.chaptersCount || 0}
        loading={loading}
        generatedAt={progress?.generatedAt}
        canManageImages={isProducer}
        onImageApplied={(kind, url) => {
          dashboard.setSeriesDetail((d) =>
            d ? { ...d, [kind === 'avatar' ? 'avatarUrl' : 'bannerUrl']: url } : d,
          );
          onShowToast(
            t('dashboard.identity.imageSavedTitle'),
            kind === 'avatar'
              ? t('dashboard.identity.avatarSavedDesc')
              : t('dashboard.identity.bannerSavedDesc'),
          );
        }}
        onOpenChapters={() => setIsChapterModalOpen(true)}
        onRefresh={() => void dashboard.fetchProgress()}
        onOpenPipeline={canRoute ? () => openPipeline(dashboard.selectedChapterId) : undefined}
      />

      {error && (
        <div
          role='alert'
          className='p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-3'
        >
          <div className='flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 shrink-0 text-rose-600' aria-hidden='true' />
            <span>{error}</span>
          </div>
          <button
            type='button'
            onClick={() => void dashboard.fetchProgress()}
            className='btn-cta-danger focus-ring min-h-9 px-3 text-xs font-semibold cursor-pointer'
          >
            {t('dashboard.kpi.retry')}
          </button>
        </div>
      )}

      <SeriesQuickMetrics
        loading={loading}
        kpis={kpis}
        focusChapter={dashboard.activeProductionChapter}
      />

      {/* Role-Aware Workbench Tabs: Editor cannot see Revenue or Crew */}
      <DashboardTabNav
        activeTab={activeTab}
        onChange={setActiveTab}
        counts={{
          chapters: chapters.length,
          team: isProducer ? seriesMembers.length : undefined,
        }}
        isProducer={isProducer}
      />

      {/* 1. CHAPTERS VIEW */}
      {showSection('chapters') && (
        <ChapterStatusTable
          chapters={chapters}
          selectedChapterId={selectedChapter?.chapterId}
          onSelect={dashboard.setSelectedChapterId}
          onAssign={openAssign}
          onManageChapter={
            canRoute
              ? (ch) =>
                  navigate(
                    `/workspaces/${workspaceId}/series/${seriesId}/chapters?chapterId=${ch.chapterId}`,
                  )
              : undefined
          }
        />
      )}

      {/* 2. PROGRESS & STAGE MATRIX VIEW */}
      {(showSection('progress') || (activeTab === 'all' && showSection('chapters'))) &&
        selectedChapter && (
          <StageMatrixSection
            chapter={selectedChapter}
            chapters={chapters}
            onSelectChapter={dashboard.setSelectedChapterId}
            onOpenPipeline={canRoute ? () => openPipeline(selectedChapter.chapterId) : undefined}
          />
        )}

      {/* 3. SCRIPT WORKBENCH VIEW */}
      {showSection('script') && (
        <div className='bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5 animate-in fade-in duration-150'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4'>
            <div>
              <div className='flex items-center gap-2'>
                <FileText className='w-5 h-5 text-orange-600' />
                <h3 className='font-serif text-lg font-bold text-stone-900'>
                  {t('dashboard.view.scriptTitle')}
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>{t('dashboard.view.scriptDesc')}</p>
            </div>
            {canRoute && (
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      buildScriptEditorUrl(workspaceId!, seriesId!, {
                        chapterId: selectedChapter?.chapterId,
                      }),
                    )
                  }
                  className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
                >
                  <FileText className='w-3.5 h-3.5' />
                  <span>{t('dashboard.view.openScriptEditor')}</span>
                </button>
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      buildScriptReviewUrl(
                        workspaceId!,
                        seriesId!,
                        selectedChapter?.chapterId || chapters[0]?.chapterId || '',
                      ),
                    )
                  }
                  className='focus-ring min-h-9 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-200'
                >
                  <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                  <span>{t('dashboard.view.reviewScript')}</span>
                </button>
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {chapters.map((ch) => (
              <div
                key={ch.chapterId}
                className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-orange-300 transition-all space-y-2'
              >
                <div className='flex items-center justify-between'>
                  <span className='font-mono font-bold text-xs text-stone-500'>
                    {t('dashboard.view.chapterNumber', { number: ch.chapterNumber })}
                  </span>
                  <span className='px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-semibold border border-stone-200'>
                    {ch.status || t('dashboard.view.statusScriptFallback')}
                  </span>
                </div>
                <h4 className='text-sm font-bold text-stone-900 truncate'>
                  {ch.title || t('dashboard.view.chapterNumber', { number: ch.chapterNumber })}
                </h4>
                <div className='text-xs text-stone-500 flex items-center justify-between pt-1'>
                  <span>{t('dashboard.view.panelsCount', { count: ch.panelCount ?? 0 })}</span>
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        buildScriptEditorUrl(workspaceId!, seriesId!, { chapterId: ch.chapterId }),
                      )
                    }
                    className='text-orange-600 hover:text-orange-700 font-semibold text-xs flex items-center gap-1 cursor-pointer'
                  >
                    <span>{t('dashboard.view.detailsBtn')}</span>
                    <ArrowRight className='w-3 h-3' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. READER & PROOFING WORKBENCH VIEW */}
      {showSection('reader') && (
        <div className='bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5 animate-in fade-in duration-150'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4'>
            <div>
              <div className='flex items-center gap-2'>
                <Eye className='w-5 h-5 text-sky-600' />
                <h3 className='font-serif text-lg font-bold text-stone-900'>
                  {t('dashboard.view.readerTitle')}
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>{t('dashboard.view.readerDesc')}</p>
            </div>
            {canRoute && (
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      buildEditorDeskUrl(workspaceId!, seriesId!, {
                        chapterId: selectedChapter?.chapterId,
                      }),
                    )
                  }
                  className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
                >
                  <Eye className='w-3.5 h-3.5' />
                  <span>{t('dashboard.view.openEditorDesk')}</span>
                </button>
                <button
                  type='button'
                  onClick={() =>
                    navigate(
                      buildArtistDeskUrl(workspaceId!, seriesId!, {
                        chapterId: selectedChapter?.chapterId,
                      }),
                    )
                  }
                  className='focus-ring min-h-9 px-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-200'
                >
                  <span>{t('dashboard.view.openArtistDesk')}</span>
                </button>
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {chapters.map((ch) => (
              <div
                key={ch.chapterId}
                className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-sky-300 transition-all space-y-2.5'
              >
                <div className='flex items-center justify-between'>
                  <span className='font-mono font-bold text-xs text-stone-500'>
                    {t('dashboard.view.chapterNumber', { number: ch.chapterNumber })}
                  </span>
                  <span className='text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'>
                    {ch.percentComplete?.toFixed(0) ?? 0}%
                  </span>
                </div>
                <h4 className='text-sm font-bold text-stone-900 truncate'>
                  {ch.title || t('dashboard.view.chapterNumber', { number: ch.chapterNumber })}
                </h4>
                <div className='text-xs text-stone-500 flex items-center justify-between'>
                  <span>
                    {t('dashboard.view.pagesAndFrames', {
                      pages: ch.pageCount ?? 0,
                      panels: ch.panelCount ?? 0,
                    })}
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        buildEditorDeskUrl(workspaceId!, seriesId!, { chapterId: ch.chapterId }),
                      )
                    }
                    className='text-sky-600 hover:text-sky-700 font-semibold text-xs flex items-center gap-1 cursor-pointer'
                  >
                    <span>{t('dashboard.view.proofPageBtn')}</span>
                    <ArrowRight className='w-3 h-3' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. HANDOFF & PACKAGING VIEW */}
      {showSection('handoff') && (
        <div className='bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5 animate-in fade-in duration-150'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4'>
            <div>
              <div className='flex items-center gap-2'>
                <UploadCloud className='w-5 h-5 text-purple-600' />
                <h3 className='font-serif text-lg font-bold text-stone-900'>
                  {t('dashboard.view.handoffTitle')}
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>{t('dashboard.view.handoffDesc')}</p>
            </div>
            {canRoute && (
              <button
                type='button'
                onClick={() => navigate(buildExportUrl(workspaceId!, seriesId!))}
                className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
              >
                <UploadCloud className='w-3.5 h-3.5' />
                <span>{t('dashboard.view.openExportBtn')}</span>
              </button>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5'>
              <span className='text-xs text-stone-500 font-medium'>
                {t('dashboard.view.publishFormatLabel')}
              </span>
              <p className='text-sm font-bold text-stone-900'>
                {t('dashboard.view.publishFormatValue')}
              </p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.publishFormatSub')}</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5'>
              <span className='text-xs text-stone-500 font-medium'>
                {t('dashboard.view.copyrightLabel')}
              </span>
              <p className='text-sm font-bold text-stone-900'>
                {t('dashboard.view.copyrightValue')}
              </p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.copyrightSub')}</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5'>
              <span className='text-xs text-stone-500 font-medium'>
                {t('dashboard.view.readyChaptersLabel')}
              </span>
              <p className='text-sm font-bold text-emerald-700'>
                {t('dashboard.view.readyChaptersCount', {
                  ready: chapters.filter((c) => c.percentComplete >= 100).length,
                  total: chapters.length,
                })}
              </p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.readyChaptersSub')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 6. SERIES BIBLE VIEW */}
      {showSection('bible') && (
        <div className='bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5 animate-in fade-in duration-150'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4'>
            <div>
              <div className='flex items-center gap-2'>
                <BookMarked className='w-5 h-5 text-indigo-600' />
                <h3 className='font-serif text-lg font-bold text-stone-900'>
                  {t('dashboard.view.bibleTitle')}
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>{t('dashboard.view.bibleDesc')}</p>
            </div>
            {canRoute && (
              <button
                type='button'
                onClick={() => navigate(buildBibleUrl(workspaceId!, seriesId!))}
                className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
              >
                <BookMarked className='w-3.5 h-3.5' />
                <span>{t('dashboard.view.openBibleBtn')}</span>
              </button>
            )}
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>
                {t('dashboard.view.bibleCharacters')}
              </span>
              <p className='text-xl font-mono font-bold text-stone-900'>Model Sheets</p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.bibleCharactersSub')}</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>
                {t('dashboard.view.bibleLocations')}
              </span>
              <p className='text-xl font-mono font-bold text-stone-900'>
                {t('dashboard.view.bibleLocationsValue')}
              </p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.bibleLocationsSub')}</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>
                {t('dashboard.view.bibleProps')}
              </span>
              <p className='text-xl font-mono font-bold text-stone-900'>
                {t('dashboard.view.biblePropsValue')}
              </p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.biblePropsSub')}</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>
                {t('dashboard.view.bibleLore')}
              </span>
              <p className='text-xl font-mono font-bold text-stone-900'>
                {t('dashboard.view.bibleLoreValue')}
              </p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.bibleLoreSub')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 7. REVENUE & READER STATS VIEW (PRODUCER ONLY) */}
      {isProducer && showSection('revenue') && (
        <div className='bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5 animate-in fade-in duration-150'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4'>
            <div>
              <div className='flex items-center gap-2'>
                <DollarSign className='w-5 h-5 text-emerald-600' />
                <h3 className='font-serif text-lg font-bold text-stone-900'>
                  {t('dashboard.view.revenueTitle')}
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>{t('dashboard.view.revenueDesc')}</p>
            </div>
            {canRoute && (
              <button
                type='button'
                onClick={() => navigate(buildSeriesPath(workspaceId!, seriesId!, 'payments'))}
                className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
              >
                <DollarSign className='w-3.5 h-3.5' />
                <span>{t('dashboard.view.revenueDetailBtn')}</span>
              </button>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className='p-4 rounded-xl border border-stone-200 bg-emerald-50/50 space-y-1'>
              <span className='text-xs font-semibold text-emerald-800'>
                {t('dashboard.view.printSalesLabel')}
              </span>
              <p className='text-2xl font-mono font-bold text-stone-900'>Tankōbon Vol. 1-2</p>
              <p className='text-[11px] text-emerald-700 font-medium'>
                {t('dashboard.view.printSalesSub')}
              </p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-sky-50/50 space-y-1'>
              <span className='text-xs font-semibold text-sky-800'>
                {t('dashboard.view.digitalChannelLabel')}
              </span>
              <p className='text-2xl font-mono font-bold text-stone-900'>
                {t('dashboard.view.digitalChannelValue')}
              </p>
              <p className='text-[11px] text-sky-700 font-medium'>
                {t('dashboard.view.digitalChannelSub')}
              </p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1'>
              <span className='text-xs font-semibold text-stone-600'>
                {t('dashboard.view.paymentStatusLabel')}
              </span>
              <p className='text-2xl font-mono font-bold text-stone-900'>
                {t('dashboard.view.paymentStatusValue')}
              </p>
              <p className='text-[11px] text-stone-500'>{t('dashboard.view.paymentStatusSub')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 8. CREW & ASSIGNMENTS (PRODUCER ONLY) */}
      {isProducer && showSection('team') && (
        <section
          aria-label={t('dashboard.view.teamAndRiskAria')}
          className='grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch'
        >
          {seriesId && (
            <SeriesTeamCard members={seriesMembers} onManage={() => setIsMembersModalOpen(true)} />
          )}
          <AttentionRiskCard
            progress={progress}
            overdueTotal={kpis.overdueTotal}
            sendingReminders={sendingReminders}
            onSendReminders={handleSendReminders}
            openTask={
              canRoute
                ? (chapterId, assignmentId) =>
                    navigate(
                      `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${chapterId}&assignmentId=${assignmentId}&taskId=${assignmentId}`,
                    )
                : null
            }
          />
        </section>
      )}

      {/* 9. BURNDOWN & WORKLOAD SECTION */}
      {showSection('team', 'reports') && (
        <section className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {showSection('reports') && (
            <div className={activeTab === 'reports' ? 'lg:col-span-12' : 'lg:col-span-6'}>
              <SeriesBurndownCard burndown={progress?.burndown} loading={loading} />
            </div>
          )}
          {isProducer && showSection('team') && (
            <div className={activeTab === 'team' ? 'lg:col-span-12' : 'lg:col-span-6'}>
              <WorkloadCard
                workload={progress?.workload}
                memberCount={seriesMembers.length}
                assignChapterNumber={selectedChapter?.chapterNumber ?? null}
                onAssign={() => selectedChapter && openAssign(selectedChapter)}
                onManageMembers={() => setIsMembersModalOpen(true)}
              />
            </div>
          )}
        </section>
      )}

      {/* Modals for Chapter and Member Management */}
      {seriesId && workspaceId && isMembersModalOpen && isProducer && (
        <SeriesMembersModal
          isOpen={isMembersModalOpen}
          workspaceId={workspaceId}
          workspaceName={dashboard.workspaceName}
          seriesId={seriesId}
          seriesTitle={seriesDetail?.title || activeProject?.title || 'Series'}
          onClose={() => setIsMembersModalOpen(false)}
          onMembersChanged={() => {
            void dashboard.fetchProgress();
            dashboard.refreshMembers();
          }}
        />
      )}

      {seriesId && isChapterModalOpen && (
        <SeriesChaptersModal
          isOpen={isChapterModalOpen}
          workspaceId={workspaceId}
          seriesId={seriesId}
          seriesTitle={seriesTitle}
          onClose={() => setIsChapterModalOpen(false)}
          onChaptersCountChange={() => void dashboard.fetchProgress()}
          onShowToast={onShowToast}
        />
      )}
    </PageContainer>
  );
};
