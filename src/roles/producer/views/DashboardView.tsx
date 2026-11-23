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

  const seriesTitle = seriesDetail?.title || activeProject?.title || 'Bộ truyện';
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
      {/* Top Bar: Return to Tier 1 Studio Hub and Role Scope Badge */}
      <div className='flex flex-wrap items-center justify-between gap-3 pt-1'>
        {workspaceId && (
          <button
            type='button'
            data-testid='back-to-studio-hub-btn'
            onClick={() => navigate(`/workspaces/${workspaceId}`)}
            className='inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/80 hover:border-orange-300 text-stone-700 hover:text-stone-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer'
            title='Quay lại Sảnh Studio Hub (Cấp 1)'
          >
            <ArrowLeft className='w-3.5 h-3.5 text-orange-600' />
            <span>Về Sảnh Studio</span>
          </button>
        )}

        <div className='flex items-center gap-2 text-xs ml-auto'>
          <span className='text-stone-500 font-medium hidden sm:inline'>
            Quyền hạn bàn làm việc:
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold font-mono text-xs uppercase border ${
              isProducer
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : isEditor
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            {isProducer
              ? 'PRODUCER // TOÀN QUYỀN ĐIỀU PHỐI'
              : isEditor
                ? 'EDITOR // THẨM ĐỊNH & KIỂM SOÁT'
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
                  Kịch bản & Góp ý Biên tập
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>
                Soạn thảo kịch bản phân cảnh, soát thoại và kiểm duyệt trước khi đưa vào khâu vẽ.
              </p>
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
                  <span>Mở Soạn thảo Kịch bản</span>
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
                  <span>Duyệt Kịch bản</span>
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
                    Chương {ch.chapterNumber}
                  </span>
                  <span className='px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200'>
                    {ch.status || 'Kịch bản'}
                  </span>
                </div>
                <h4 className='text-sm font-bold text-stone-900 truncate'>
                  {ch.title || `Chương ${ch.chapterNumber}`}
                </h4>
                <div className='text-xs text-stone-500 flex items-center justify-between pt-1'>
                  <span>{ch.panelCount ?? 0} khung tranh</span>
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        buildScriptEditorUrl(workspaceId!, seriesId!, { chapterId: ch.chapterId }),
                      )
                    }
                    className='text-orange-600 hover:text-orange-700 font-semibold text-xs flex items-center gap-1 cursor-pointer'
                  >
                    <span>Chi tiết</span>
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
                <Eye className='w-5 h-5 text-blue-600' />
                <h3 className='font-serif text-lg font-bold text-stone-900'>
                  Đọc thử & Soát tranh Bản thảo
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>
                Kiểm tra bản vẽ, đối chiếu lời thoại và thẩm định chất lượng từng trang tranh.
              </p>
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
                  <span>Vào Bàn duyệt Thẩm định</span>
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
                  <span>Mở Bàn vẽ & Khung tranh</span>
                </button>
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {chapters.map((ch) => (
              <div
                key={ch.chapterId}
                className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-blue-300 transition-all space-y-2.5'
              >
                <div className='flex items-center justify-between'>
                  <span className='font-mono font-bold text-xs text-stone-500'>
                    Chương {ch.chapterNumber}
                  </span>
                  <span className='text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'>
                    {ch.percentComplete?.toFixed(0) ?? 0}%
                  </span>
                </div>
                <h4 className='text-sm font-bold text-stone-900 truncate'>
                  {ch.title || `Chương ${ch.chapterNumber}`}
                </h4>
                <div className='text-xs text-stone-500 flex items-center justify-between'>
                  <span>
                    {ch.pageCount ?? 0} trang · {ch.panelCount ?? 0} khung
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      navigate(
                        buildEditorDeskUrl(workspaceId!, seriesId!, { chapterId: ch.chapterId }),
                      )
                    }
                    className='text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer'
                  >
                    <span>Soát trang</span>
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
                <UploadCloud className='w-5 h-5 text-violet-600' />
                <h3 className='font-serif text-lg font-bold text-stone-900'>
                  Đóng gói Bản thảo & Bàn giao Xuất bản
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>
                Xuất file PDF/X-1a, Greyscale K-100%, kiểm soát trame và thông số kỹ thuật in ấn
                tiêu chuẩn.
              </p>
            </div>
            {canRoute && (
              <button
                type='button'
                onClick={() => navigate(buildExportUrl(workspaceId!, seriesId!))}
                className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
              >
                <UploadCloud className='w-3.5 h-3.5' />
                <span>Mở Bàn giao Xuất bản</span>
              </button>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5'>
              <span className='text-xs text-stone-500 font-medium'>Định dạng xuất bản</span>
              <p className='text-sm font-bold text-stone-900'>PDF/X-1a tiêu chuẩn Shonen</p>
              <p className='text-xs text-stone-500'>Độ phân giải 600 DPI, Trame 60 LPI</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5'>
              <span className='text-xs text-stone-500 font-medium'>Bảo mật bản quyền</span>
              <p className='text-sm font-bold text-stone-900'>Đóng dấu chìm biên tập</p>
              <p className='text-xs text-stone-500'>Tự động định danh mã biên tập viên</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1.5'>
              <span className='text-xs text-stone-500 font-medium'>Chương đã sẵn sàng</span>
              <p className='text-sm font-bold text-emerald-700'>
                {chapters.filter((c) => c.percentComplete >= 100).length} / {chapters.length} chương
              </p>
              <p className='text-xs text-stone-500'>Đạt chuẩn chất lượng xuất bản</p>
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
                  Hồ sơ Thiết kế & Model Sheets (Series Bible)
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>
                Kho quy chuẩn tạo hình nhân vật, bối cảnh địa điểm, đạo cụ và quy tắc tính nhất
                quán.
              </p>
            </div>
            {canRoute && (
              <button
                type='button'
                onClick={() => navigate(buildBibleUrl(workspaceId!, seriesId!))}
                className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
              >
                <BookMarked className='w-3.5 h-3.5' />
                <span>Mở Series Bible Toàn diện</span>
              </button>
            )}
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>Nhân vật</span>
              <p className='text-xl font-mono font-bold text-stone-900'>Model Sheets</p>
              <p className='text-xs text-stone-500'>Đã chuẩn hóa biểu cảm & phục trang</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>Địa điểm</span>
              <p className='text-xl font-mono font-bold text-stone-900'>Bối cảnh 3D/2D</p>
              <p className='text-xs text-stone-500'>Phối cảnh & màu nền</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>Đạo cụ</span>
              <p className='text-xl font-mono font-bold text-stone-900'>Vũ khí & Xe cộ</p>
              <p className='text-xs text-stone-500'>Quy chuẩn kích thước & góc vẽ</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50/50 text-center space-y-1'>
              <span className='text-xs text-stone-500 font-semibold'>Quy tắc Lore</span>
              <p className='text-xl font-mono font-bold text-stone-900'>Tính nhất quán</p>
              <p className='text-xs text-stone-500'>AI tự động kiểm soát sai lệch</p>
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
                  Doanh thu & Thống kê Độc giả (Producer)
                </h3>
              </div>
              <p className='text-xs text-stone-500 mt-1'>
                Dữ liệu phát hành ấn bản và phân phối số, doanh số VietQR và chỉ số đọc truyện.
              </p>
            </div>
            {canRoute && (
              <button
                type='button'
                onClick={() => navigate(buildSeriesPath(workspaceId!, seriesId!, 'payments'))}
                className='btn-cta-primary focus-ring min-h-9 px-4 text-xs font-semibold inline-flex items-center gap-1.5 rounded-xl cursor-pointer'
              >
                <DollarSign className='w-3.5 h-3.5' />
                <span>Chi tiết Doanh thu & Cổng VietQR</span>
              </button>
            )}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
            <div className='p-4 rounded-xl border border-stone-200 bg-emerald-50/50 space-y-1'>
              <span className='text-xs font-semibold text-emerald-800'>Doanh số ấn phẩm</span>
              <p className='text-2xl font-mono font-bold text-stone-900'>Tankōbon Vol. 1-2</p>
              <p className='text-xs text-emerald-700 font-medium'>Đã phát hành toàn quốc</p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-blue-50/50 space-y-1'>
              <span className='text-xs font-semibold text-blue-800'>Kênh phát hành số</span>
              <p className='text-2xl font-mono font-bold text-stone-900'>Bản quyền số</p>
              <p className='text-xs text-blue-700 font-medium'>
                Hỗ trợ thanh toán VietQR theo chương
              </p>
            </div>
            <div className='p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-1'>
              <span className='text-xs font-semibold text-stone-600'>Tình trạng thanh toán</span>
              <p className='text-2xl font-mono font-bold text-stone-900'>Tự động đối soát</p>
              <p className='text-xs text-stone-500'>Đồng bộ cùng Publisher Desk</p>
            </div>
          </div>
        </div>
      )}

      {/* 8. CREW & ASSIGNMENTS (PRODUCER ONLY) */}
      {isProducer && showSection('team') && (
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
