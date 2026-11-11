import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import { notificationService } from '@/services/notification.service';
import type { ChapterProgressDto } from '@/services/series.service';
import { MangaProject, AssistantRosterItem, ProvenanceLogItem } from '@/types';
import { SeriesChaptersModal } from '../modals/SeriesChaptersModal';
import { SeriesMembersModal } from '../modals/SeriesMembersModal';
import { CreateAssignmentModal } from '../modals/CreateAssignmentModal';
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

interface DashboardViewProps {
  /** Vai trò trong workspace hiện tại: chỉ Producer thấy nút đổi avatar/banner Series. */
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

  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [assignChapter, setAssignChapter] = useState<{
    id: string;
    number?: number | string;
  } | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

  const seriesTitle = seriesDetail?.title || activeProject?.title || 'Bộ truyện';
  const canRoute = !!(workspaceId && seriesId);
  const showSection = (...tabs: DashboardTab[]) => activeTab === 'all' || tabs.includes(activeTab);

  const openPipeline = (chapterId?: string | null) =>
    navigate(
      `/workspaces/${workspaceId}/series/${seriesId}/workspace${chapterId ? `?chapterId=${chapterId}` : ''}`,
    );

  const openAssign = (chapter: ChapterProgressDto) =>
    setAssignChapter({ id: chapter.chapterId, number: chapter.chapterNumber });

  const closeAssign = () => setAssignChapter(null);

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await notificationService.sendReminders();
      onShowToast(
        'Thông báo nhắc hạn',
        res.created > 0
          ? `Đã gửi ${res.created} thông báo nhắc hạn cho các công việc & yêu cầu sửa quá hạn.`
          : 'Người phụ trách các mục quá hạn đều đã được nhắc gần đây, không gửi thêm.',
      );
    } catch {
      onShowToast('Gửi nhắc hạn thất bại', 'Máy chủ không nhận yêu cầu nhắc hạn. Hãy thử lại sau.');
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <PageContainer className='w-full max-w-full px-4 sm:px-6 lg:px-8 space-y-6 pb-16 font-sans text-stone-900 min-w-0'>
      <SeriesHeaderBanner
        seriesId={seriesId}
        seriesTitle={seriesTitle}
        seriesDetail={seriesDetail}
        activeProject={activeProject}
        workspaceName={dashboard.workspaceName}
        chapterCount={chapters.length || seriesDetail?.chaptersCount || 0}
        loading={loading}
        generatedAt={progress?.generatedAt}
        canManageImages={String(workspaceRole ?? '').toUpperCase() === 'PRODUCER'}
        onImageApplied={(kind, url) => {
          dashboard.setSeriesDetail((d) =>
            d ? { ...d, [kind === 'avatar' ? 'avatarUrl' : 'bannerUrl']: url } : d,
          );
          onShowToast(
            'Đã lưu ảnh',
            kind === 'avatar' ? 'Avatar Series đã cập nhật.' : 'Banner Series đã cập nhật.',
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
            Thử lại
          </button>
        </div>
      )}

      <SeriesQuickMetrics
        loading={loading}
        kpis={kpis}
        focusChapter={dashboard.activeProductionChapter}
      />

      <DashboardTabNav
        activeTab={activeTab}
        onChange={setActiveTab}
        counts={{ chapters: chapters.length, team: seriesMembers.length }}
      />

      {showSection('chapters') && (
        <ChapterStatusTable
          chapters={chapters}
          selectedChapterId={selectedChapter?.chapterId}
          onSelect={dashboard.setSelectedChapterId}
          onAssign={openAssign}
        />
      )}

      {showSection('team') && (
        <section
          aria-label='Đội ngũ và rủi ro'
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
                      `/workspaces/${workspaceId}/series/${seriesId}/my-work?chapterId=${chapterId}&assignmentId=${assignmentId}`,
                    )
                : null
            }
          />
        </section>
      )}

      {showSection('chapters') && selectedChapter && (
        <StageMatrixSection
          chapter={selectedChapter}
          chapters={chapters}
          onSelectChapter={dashboard.setSelectedChapterId}
          onOpenPipeline={canRoute ? () => openPipeline(selectedChapter.chapterId) : undefined}
        />
      )}

      {showSection('team', 'reports') && (
        <section className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          {showSection('reports') && (
            <div className={activeTab === 'reports' ? 'lg:col-span-12' : 'lg:col-span-6'}>
              <SeriesBurndownCard burndown={progress?.burndown} loading={loading} />
            </div>
          )}
          {showSection('team') && (
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

      {seriesId && workspaceId && isMembersModalOpen && (
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

      {seriesId && (
        <SeriesChaptersModal
          isOpen={isChapterModalOpen}
          workspaceId={workspaceId}
          seriesId={seriesId}
          seriesTitle={seriesDetail?.title || activeProject?.title || 'Series'}
          onClose={() => {
            setIsChapterModalOpen(false);
            void dashboard.fetchProgress();
          }}
          onShowToast={onShowToast}
        />
      )}

      {seriesId && assignChapter && (
        <CreateAssignmentModal
          isOpen
          workspaceId={workspaceId || ''}
          seriesId={seriesId}
          chapterId={assignChapter.id}
          chapterNumber={assignChapter.number}
          onClose={closeAssign}
          onSuccess={() => {
            closeAssign();
            void dashboard.fetchProgress();
          }}
          onShowToast={onShowToast}
        />
      )}
    </PageContainer>
  );
};
