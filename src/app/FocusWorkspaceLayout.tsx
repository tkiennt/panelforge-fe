import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Command,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
} from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { MangaProject } from '@/types';
import { getRoleDefaultPath } from '@/roles/roles';
import { seriesService } from '@/services/series.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { CurrentUser } from './AppShell';

export interface FocusStageItem {
  id: string;
  label: string;
  key?: string;
}

export interface FocusChapterOption {
  id: string;
  chapterNumber: number;
  title?: string | null;
}

export interface FocusHeaderConfig {
  seriesTitle?: string;
  seriesPath?: string;
  chapters?: FocusChapterOption[];
  currentChapterId?: string | null;
  chapterPath?: string;
  onSelectChapter?: (chapterId: string) => void;
  stages?: FocusStageItem[];
  currentStageIndex?: number;
  isStageFlowCompleted?: boolean;
  isSubmittingStage?: boolean;
  onSubmitStage?: () => void;
  submitButtonLabel?: string;
}

interface FocusHeaderContextValue {
  isInsideFocusLayout: boolean;
  setHeaderConfig: React.Dispatch<React.SetStateAction<FocusHeaderConfig | null>>;
}

const FocusHeaderContext = createContext<FocusHeaderContextValue | null>(null);

export const useFocusHeaderContext = () => useContext(FocusHeaderContext);

export interface FocusWorkspaceLayoutProps {
  currentUser: CurrentUser;
  activeWorkspace?: { id?: string; name: string } | null;
  activeSeries?: MangaProject | { id?: string; title: string; subtitle?: string } | null;
  onLogout?: () => void;
  children?: React.ReactNode;
}

export interface FocusStudioHeaderBarProps {
  workspaceId?: string;
  seriesId?: string;
  chapterId?: string | null;
  pathname: string;
  userRole?: string | number | null;
  userName?: string;
  userInitials?: string;
  workspaceName?: string;
  activeSeriesTitle?: string;
  headerConfig?: FocusHeaderConfig | null;
  isExiting?: boolean;
  onBack?: () => void;
  onEnterFocusMode?: () => void;
  showFocusControls?: boolean;
}

function getReadableWorkspaceTitle(pathname: string): string {
  if (pathname.includes('/artist/workspace')) return 'Không gian vẽ';
  if (pathname.includes('/artist')) return 'Bàn vẽ họa sĩ';
  if (pathname.includes('/script/review')) return 'Duyệt kịch bản';
  if (pathname.includes('/script')) return 'Biên soạn kịch bản';
  if (pathname.includes('/letterer')) return 'Chèn chữ & bóng thoại';
  if (pathname.includes('/chapter-review')) return 'Duyệt toàn chương';
  if (pathname.includes('/editor/bible')) return 'Duyệt thiết kế Bible';
  if (pathname.includes('/editor/desk')) return 'Bàn thẩm định biên tập';
  if (pathname.includes('/review/')) return 'Kiểm duyệt biên tập';
  if (pathname.includes('/task/')) return 'Chi tiết công việc';
  return 'Phòng làm việc';
}

function formatFallbackChapterText(chapterId: string): string {
  const cleaned = chapterId.replace(/^chapter-?/i, '').replace(/^chap-?/i, '');
  if (/^\d+$/.test(cleaned)) {
    return `Chương ${cleaned}`;
  }
  return 'Chương đang mở';
}

/**
 * Header dùng chung cho không gian làm việc tập trung (màu giấy ấm chuẩn hệ thống,
 * hiển thị đường dẫn Bộ truyện / Chương, thanh công đoạn và nút Nộp chuyển bước).
 */
export const FocusStudioHeaderBar: React.FC<FocusStudioHeaderBarProps> = ({
  workspaceId,
  seriesId,
  chapterId,
  pathname,
  userRole,
  userName = 'Thành viên',
  userInitials = 'PF',
  workspaceName,
  activeSeriesTitle,
  headerConfig,
  isExiting = false,
  onBack,
  onEnterFocusMode,
  showFocusControls = true,
}) => {
  const navigate = useNavigate();

  const resolvedSeriesPath =
    headerConfig?.seriesPath ||
    (workspaceId && seriesId
      ? getRoleDefaultPath(userRole || 'ARTIST', workspaceId, seriesId)
      : workspaceId
        ? `/workspaces/${workspaceId}/series`
        : '/workspaces');

  const resolvedSeriesTitle =
    headerConfig?.seriesTitle ||
    (activeSeriesTitle && activeSeriesTitle !== 'PanelForge Studio'
      ? activeSeriesTitle
      : undefined) ||
    workspaceName ||
    'Bộ truyện';

  const activeChapterId = headerConfig?.currentChapterId ?? chapterId ?? null;
  const chapters = headerConfig?.chapters ?? [];
  const activeChapter = chapters.find((c) => c.id === activeChapterId) || null;

  const resolvedChapterPath =
    headerConfig?.chapterPath ||
    (workspaceId && seriesId && activeChapterId
      ? `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${encodeURIComponent(activeChapterId)}`
      : resolvedSeriesPath);

  const stages = headerConfig?.stages ?? [];
  const currentStageIndex = headerConfig?.currentStageIndex ?? 0;
  const isStageFlowCompleted = Boolean(headerConfig?.isStageFlowCompleted);
  const isSubmittingStage = Boolean(headerConfig?.isSubmittingStage);
  const isLastStage = stages.length > 0 && currentStageIndex >= stages.length - 1;

  // Editor: màn duyệt quay về bàn duyệt (đường mặc định của vai trò); từ bàn duyệt quay về thư viện bộ truyện.
  const isEditorDesk = pathname.includes('/editor/desk');
  const isEditorReview =
    String(userRole ?? '').toUpperCase() === 'EDITOR' &&
    (pathname.includes('/script/review') ||
      pathname.includes('/review/') ||
      pathname.includes('/editor/bible'));
  const isReadOnlyReview = isEditorDesk || isEditorReview;
  const backPath =
    isEditorDesk && workspaceId ? `/workspaces/${workspaceId}/series` : resolvedSeriesPath;

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(backPath);
    }
  };

  return (
    <header
      className='min-h-12 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#D8D2C5] px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-30 select-none transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-2'
      data-testid='focus-studio-header'
    >
      {/* Phía trái: Nút quay lại + Đường dẫn Bộ truyện / Chương */}
      <div className='flex items-center gap-1.5 sm:gap-2 min-w-0'>
        <button
          type='button'
          onClick={handleBackClick}
          disabled={isExiting}
          data-testid='focus-back-btn'
          title='Quay lại trang bộ truyện'
          className='group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-[#57534E] hover:text-[#1C1917] hover:bg-[#FFF2E6] active:scale-95 transition-all duration-150 cursor-pointer shrink-0 focus:outline-none focus-visible:outline-2 focus-visible:outline-[#C2410C] disabled:opacity-60'
        >
          {isExiting ? (
            <Loader2 className='w-3.5 h-3.5 animate-spin text-[#C2410C]' />
          ) : (
            <ArrowLeft className='w-3.5 h-3.5 transition-transform duration-150 group-hover:-translate-x-0.5' />
          )}
          <span className='hidden sm:inline'>
            {isEditorReview ? 'Về bàn duyệt' : 'Về bộ truyện'}
          </span>
        </button>

        <span className='text-[#D8D2C5] font-bold select-none'>/</span>

        <BrandMark size={20} tone='ink' className='shrink-0 hidden xs:inline-block' />

        <nav
          aria-label='Điều hướng bộ truyện và chương'
          className='flex items-center gap-1.5 min-w-0 text-xs'
        >
          <Link
            to={resolvedSeriesPath}
            data-testid='focus-series-link'
            title={`Mở trang bộ truyện: ${resolvedSeriesTitle}`}
            className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[#1C1917] hover:bg-[#FFF2E6] hover:text-[#C2410C] transition-colors truncate max-w-[140px] sm:max-w-[200px]'
          >
            <BookOpen className='w-3.5 h-3.5 text-[#C2410C] shrink-0' />
            <span className='truncate'>{resolvedSeriesTitle}</span>
          </Link>

          {(chapters.length > 0 || activeChapterId) && (
            <>
              <span className='text-[#A8A29E] font-bold select-none'>/</span>
              <div
                data-testid='focus-chapter-breadcrumb'
                className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F3F0E9] border border-[#D8D2C5] text-[#1C1917] font-semibold max-w-[190px] sm:max-w-[250px]'
              >
                <FileText className='w-3.5 h-3.5 text-[#EA580C] shrink-0' />
                {chapters.length > 0 && headerConfig?.onSelectChapter ? (
                  <select
                    aria-label='Chọn chương'
                    data-testid='focus-chapter-select'
                    value={activeChapterId || chapters[0].id}
                    onChange={(e) => headerConfig.onSelectChapter?.(e.target.value)}
                    className='bg-transparent text-xs font-semibold text-[#1C1917] focus:outline-none cursor-pointer truncate max-w-[155px] sm:max-w-[210px]'
                  >
                    {chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {formatChapterLabel(ch.chapterNumber, ch.title)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Link
                    to={resolvedChapterPath}
                    data-testid='focus-chapter-link'
                    className='truncate hover:text-[#C2410C] transition-colors'
                  >
                    {activeChapter
                      ? formatChapterLabel(activeChapter.chapterNumber, activeChapter.title)
                      : activeChapterId
                        ? formatFallbackChapterText(activeChapterId)
                        : 'Chương đang mở'}
                  </Link>
                )}
              </div>
            </>
          )}

          {stages.length === 0 && !activeChapterId && chapters.length === 0 && (
            <>
              <span className='text-[#A8A29E] font-bold select-none'>/</span>
              <span className='font-bold text-[#1C1917] truncate px-1'>
                {getReadableWorkspaceTitle(pathname)}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Ở giữa: Hiển thị các công đoạn thực hiện (Stage Stepper) */}
      <div className='flex items-center justify-center min-w-0'>
        {stages.length > 0 ? (
          <div
            data-testid='focus-stage-stepper'
            role='list'
            aria-label='Tiến độ công đoạn'
            className='hidden md:flex items-center gap-1 p-0.5 rounded-xl bg-[#F3F0E9] border border-[#D8D2C5]'
          >
            {stages.map((stage, idx) => {
              const isCompleted = isStageFlowCompleted || idx < currentStageIndex;
              const isCurrent = !isStageFlowCompleted && idx === currentStageIndex;
              const stepState = isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming';

              return (
                <React.Fragment key={stage.id}>
                  {idx > 0 && (
                    <ChevronRight className='w-3 h-3 text-[#A8A29E] shrink-0' aria-hidden='true' />
                  )}
                  <div
                    role='listitem'
                    data-testid={`focus-stage-step-${idx}`}
                    data-stage-id={stage.id}
                    data-stage-state={stepState}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                      isCurrent
                        ? 'bg-white text-[#1C1917] border border-[#D8D2C5] shadow-2xs font-bold'
                        : isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-semibold'
                          : 'text-[#78716C] border border-transparent font-medium'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                            ? 'bg-[#C2410C] text-white'
                            : 'bg-[#E7E2D8] text-[#57534E]'
                      }`}
                    >
                      {isCompleted ? <Check className='w-2.5 h-2.5' /> : idx + 1}
                    </span>
                    <span>{stage.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        ) : isReadOnlyReview ? null : (
          <div className='hidden lg:flex items-center gap-1.5 bg-[#F3F0E9] px-3 py-1 rounded-full border border-[#D8D2C5] text-[11px] font-medium text-[#57534E] shrink-0'>
            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
            <span>Đã lưu tự động</span>
          </div>
        )}
      </div>

      {/* Phía phải: Nút Nộp qua công đoạn, Chế độ tập trung, Tìm kiếm nhanh & Tài khoản */}
      <div className='flex items-center gap-2 shrink-0'>
        {headerConfig?.onSubmitStage &&
          (isStageFlowCompleted ? (
            <div
              data-testid='focus-stage-completed-badge'
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shrink-0'
            >
              <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
              <span>Đã nộp chờ duyệt</span>
            </div>
          ) : (
            <button
              type='button'
              onClick={headerConfig.onSubmitStage}
              disabled={isSubmittingStage}
              data-testid='focus-submit-stage-btn'
              title={
                headerConfig.submitButtonLabel
                  ? `${headerConfig.submitButtonLabel} để chờ duyệt`
                  : isLastStage
                    ? 'Nộp hoàn thiện bản thảo để chờ duyệt'
                    : 'Nộp bản thảo công đoạn hiện tại'
              }
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0'
            >
              {isSubmittingStage ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : isLastStage ? (
                <Send className='w-3.5 h-3.5' />
              ) : (
                <ArrowRight className='w-3.5 h-3.5' />
              )}
              <span>
                {isSubmittingStage
                  ? 'Đang nộp...'
                  : headerConfig.submitButtonLabel || 'Nộp bản thảo'}
              </span>
            </button>
          ))}

        {showFocusControls && onEnterFocusMode && (
          <button
            type='button'
            onClick={onEnterFocusMode}
            title='Chế độ tập trung toàn màn hình (Phím F)'
            data-testid='focus-zen-toggle-btn'
            className='flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F0E9] border border-[#D8D2C5] text-xs font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#FFF2E6] active:scale-95 transition-all cursor-pointer'
          >
            <Maximize2 className='w-3.5 h-3.5 text-[#C2410C]' />
            <span className='hidden sm:inline'>Tập trung</span>
          </button>
        )}

        {showFocusControls && (
          <button
            type='button'
            onClick={() =>
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
              )
            }
            title='Tìm kiếm nhanh (Ctrl+K)'
            className='hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F3F0E9] border border-[#D8D2C5] text-[11px] font-medium text-[#57534E] hover:text-[#1C1917] hover:bg-[#FFF2E6] active:scale-95 transition-all cursor-pointer'
          >
            <Command className='w-3 h-3' />
            <span>K</span>
          </button>
        )}

        <div className='flex items-center gap-2 pl-2 border-l border-[#D8D2C5]'>
          <div
            className='w-7 h-7 rounded-full bg-[#FFF2E6] border border-[#FDBA74] text-[#C2410C] flex items-center justify-center text-xs font-bold'
            title={userName}
          >
            {userInitials || 'PF'}
          </div>
        </div>
      </div>
    </header>
  );
};

/**
 * FocusWorkspaceLayout - Chế độ phòng làm việc tập trung theo bảng màu giấy ấm hệ thống.
 */
export const FocusWorkspaceLayout: React.FC<FocusWorkspaceLayoutProps> = ({
  currentUser,
  activeWorkspace,
  activeSeries,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ workspaceId?: string; seriesId?: string; chapterId?: string }>();
  const [isZenMode, setIsZenMode] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<FocusHeaderConfig | null>(null);
  const [fetchedSeriesTitle, setFetchedSeriesTitle] = useState<string | undefined>(undefined);

  const workspaceId = params.workspaceId ?? activeWorkspace?.id;
  const seriesId = params.seriesId ?? (activeSeries as any)?.id;
  const urlSearchParams = new URLSearchParams(location.search);
  const chapterId = params.chapterId ?? urlSearchParams.get('chapterId');

  // Nạp tên bộ truyện thật nếu layout chưa có thông tin từ App
  useEffect(() => {
    let alive = true;
    if (!seriesId) return;
    if (activeSeries?.title && activeSeries.title !== 'PanelForge Studio') {
      setFetchedSeriesTitle(activeSeries.title);
      return;
    }
    if (seriesService?.getSeriesById) {
      seriesService
        .getSeriesById(seriesId)
        .then((ser) => {
          if (alive && ser?.title) {
            setFetchedSeriesTitle(ser.title);
          }
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [seriesId, activeSeries?.title]);

  // Lắng nghe phím tắt 'f' để bật/tắt chế độ tập trung toàn màn hình, 'Escape' để thoát
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        if (!e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          setIsZenMode((prev) => !prev);
        }
      } else if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  const handleBackToProject = useCallback(() => {
    if (isExiting) return;

    const targetPath =
      headerConfig?.seriesPath ||
      (workspaceId && seriesId
        ? location.pathname.includes('/artist')
          ? `/workspaces/${workspaceId}/series/${seriesId}/artist`
          : location.pathname.includes('/script')
            ? `/workspaces/${workspaceId}/series/${seriesId}/script`
            : location.pathname.includes('/letterer')
              ? `/workspaces/${workspaceId}/series/${seriesId}/letterer`
              : getRoleDefaultPath(
                  currentUser.workspaceRole || currentUser.role,
                  workspaceId,
                  seriesId,
                )
        : workspaceId
          ? `/workspaces/${workspaceId}/series`
          : '/workspaces');

    if (
      typeof document !== 'undefined' &&
      typeof (document as any).startViewTransition === 'function'
    ) {
      (document as any).startViewTransition(() => {
        navigate(targetPath);
      });
    } else {
      setIsExiting(true);
      setTimeout(() => {
        navigate(targetPath);
      }, 160);
    }
  }, [
    isExiting,
    headerConfig?.seriesPath,
    workspaceId,
    seriesId,
    currentUser.workspaceRole,
    currentUser.role,
    navigate,
  ]);

  const contextValue = useMemo<FocusHeaderContextValue>(
    () => ({
      isInsideFocusLayout: true,
      setHeaderConfig,
    }),
    [],
  );

  return (
    <FocusHeaderContext.Provider value={contextValue}>
      <div
        className={`h-screen w-full flex flex-col overflow-hidden bg-[#F3F0E9] text-[#1C1917] select-none transition-all duration-200 ease-out ${
          isExiting
            ? 'opacity-0 scale-[0.995] filter blur-[0.5px] pointer-events-none'
            : 'opacity-100 scale-100 filter-none'
        }`}
        data-testid='focus-workspace-layout'
      >
        {isZenMode ? (
          <div
            data-testid='focus-zen-pill'
            className='absolute top-3 right-4 z-50 animate-in fade-in zoom-in-95 duration-200'
          >
            <button
              type='button'
              onClick={() => setIsZenMode(false)}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FCFBF8]/95 backdrop-blur-md border border-[#D8D2C5] text-xs text-[#1C1917] hover:bg-[#FFF2E6] shadow-md cursor-pointer transition-all active:scale-95'
              title='Thoát chế độ tập trung (Phím F hoặc Escape)'
            >
              <Minimize2 className='w-3.5 h-3.5 text-[#C2410C]' />
              <span className='font-semibold'>Thoát toàn màn hình (F)</span>
            </button>
          </div>
        ) : (
          <FocusStudioHeaderBar
            workspaceId={workspaceId}
            seriesId={seriesId}
            chapterId={chapterId}
            pathname={location.pathname}
            userRole={currentUser.workspaceRole || currentUser.role}
            userName={currentUser.name}
            userInitials={currentUser.avatarInitials}
            workspaceName={activeWorkspace?.name}
            activeSeriesTitle={fetchedSeriesTitle || activeSeries?.title}
            headerConfig={headerConfig}
            isExiting={isExiting}
            onBack={handleBackToProject}
            onEnterFocusMode={() => setIsZenMode(true)}
            showFocusControls={true}
          />
        )}

        <main
          className='flex-1 min-h-0 min-w-0 w-full flex flex-col overflow-hidden relative transition-all duration-200 ease-out'
          data-testid='focus-workspace-body'
        >
          <div
            key={location.pathname}
            className='w-full h-full flex-1 flex flex-col overflow-hidden animate-in fade-in duration-250 ease-out'
          >
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </FocusHeaderContext.Provider>
  );
};

export default FocusWorkspaceLayout;
