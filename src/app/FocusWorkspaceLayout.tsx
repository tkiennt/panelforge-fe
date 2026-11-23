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
  RotateCcw,
  Send,
  Layers,
  LayoutTemplate,
  Type,
  ShieldCheck,
  BookMarked,
  Kanban,
} from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { MangaProject } from '@/types';
import { getRoleDefaultPath } from '@/roles/roles';
import { seriesService } from '@/services/series.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { useTranslation } from '@/lib/i18n';
import { CurrentUser } from './AppShell';
import { AppShellSidebar } from './AppShellSidebar';

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
  onSelectStage?: (stageIndex: number) => void;
  submitButtonLabel?: string;
  onWithdrawStage?: () => void;
  isWithdrawingStage?: boolean;
  withdrawButtonLabel?: string;
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
 * Header dùng chung cho không gian làm việc tập trung (chuẩn Stitch Design,
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
      className='h-16 bg-white border-b border-stone-200 px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 z-30 select-none shadow-xs'
      data-testid='focus-studio-header'
    >
      {/* Phía trái: Nút quay lại + Đường dẫn Bộ truyện / Chương */}
      <div className='flex items-center gap-2 min-w-0'>
        <button
          type='button'
          onClick={handleBackClick}
          disabled={isExiting}
          data-testid='focus-back-btn'
          title='Quay lại trang bộ truyện'
          className='group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer shrink-0 disabled:opacity-60'
        >
          {isExiting ? (
            <Loader2 className='w-4 h-4 animate-spin text-orange-600' />
          ) : (
            <ArrowLeft className='w-4 h-4 text-stone-500 transition-transform duration-150 group-hover:-translate-x-0.5' />
          )}
          <span className='hidden sm:inline'>
            {isEditorReview ? 'Về bàn duyệt' : 'Về bộ truyện'}
          </span>
        </button>

        <span className='text-stone-300 font-bold select-none shrink-0'>/</span>

        <nav
          aria-label='Điều hướng bộ truyện và chương'
          className='flex items-center gap-1.5 min-w-0 text-xs'
        >
          <Link
            to={resolvedSeriesPath}
            data-testid='focus-series-link'
            title={`Mở trang bộ truyện: ${resolvedSeriesTitle}`}
            className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-stone-900 hover:text-orange-600 hover:bg-stone-100 transition-colors truncate max-w-[140px] sm:max-w-[200px]'
          >
            <BookOpen className='w-4 h-4 text-orange-600 shrink-0' />
            <span className='truncate'>{resolvedSeriesTitle}</span>
          </Link>

          {(chapters.length > 0 || activeChapterId) && (
            <>
              <span className='text-stone-300 font-bold select-none shrink-0'>/</span>
              <div
                data-testid='focus-chapter-breadcrumb'
                className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-50 border border-orange-200 text-orange-700 font-semibold text-xs max-w-[190px] sm:max-w-[250px]'
              >
                <FileText className='w-3.5 h-3.5 text-orange-600 shrink-0' />
                {chapters.length > 0 && headerConfig?.onSelectChapter ? (
                  <select
                    aria-label='Chọn chương'
                    data-testid='focus-chapter-select'
                    value={activeChapterId || chapters[0].id}
                    onChange={(e) => headerConfig.onSelectChapter?.(e.target.value)}
                    className='bg-transparent text-xs font-semibold text-orange-700 focus:outline-none cursor-pointer truncate max-w-[155px] sm:max-w-[210px]'
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
                    className='truncate hover:text-orange-800 transition-colors'
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
              <span className='text-stone-300 font-bold select-none shrink-0'>/</span>
              <span className='font-bold text-stone-900 truncate px-1'>
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
            className='hidden md:flex items-center gap-1 p-1 rounded-xl bg-stone-100 border border-stone-200'
          >
            {stages.map((stage, idx) => {
              const isCompleted = isStageFlowCompleted || idx < currentStageIndex;
              const isCurrent = !isStageFlowCompleted && idx === currentStageIndex;
              const stepState = isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming';

              return (
                <React.Fragment key={stage.id}>
                  {idx > 0 && (
                    <ChevronRight className='w-3 h-3 text-stone-400 shrink-0' aria-hidden='true' />
                  )}
                  <div
                    role='listitem'
                    data-testid={`focus-stage-step-${idx}`}
                    data-stage-id={stage.id}
                    data-stage-state={stepState}
                    aria-current={isCurrent ? 'step' : undefined}
                    onClick={() => headerConfig?.onSelectStage?.(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap ${
                      headerConfig?.onSelectStage ? 'cursor-pointer hover:opacity-90' : ''
                    } ${
                      isCurrent
                        ? 'bg-white text-stone-900 border border-stone-200 shadow-2xs font-bold'
                        : isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                          : 'text-stone-500 border border-transparent font-medium'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                            ? 'bg-orange-600 text-white'
                            : 'bg-stone-200 text-stone-600'
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
          <div className='hidden lg:flex items-center gap-1.5 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 text-xs font-medium text-stone-600 shrink-0'>
            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
            <span>Đã lưu tự động</span>
          </div>
        )}
      </div>

      {/* Phía phải: Nút Rút bài / Nộp qua công đoạn, Chế độ tập trung, Tìm kiếm nhanh & Tài khoản */}
      <div className='flex items-center gap-2 shrink-0'>
        {headerConfig?.onWithdrawStage && (
          <button
            type='button'
            onClick={headerConfig.onWithdrawStage}
            disabled={Boolean(headerConfig.isWithdrawingStage)}
            data-testid='artist-withdraw-btn'
            title='Rút bài nộp để tiếp tục chỉnh sửa'
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0'
          >
            {headerConfig.isWithdrawingStage ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <RotateCcw className='w-3.5 h-3.5' />
            )}
            <span>
              {headerConfig.isWithdrawingStage
                ? 'Đang rút...'
                : headerConfig.withdrawButtonLabel || 'Rút bài'}
            </span>
          </button>
        )}

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
              className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs active:scale-95 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0'
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
            className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200 active:scale-95 transition-all cursor-pointer'
          >
            <Maximize2 className='w-3.5 h-3.5 text-orange-600' />
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
            className='hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-xs font-mono font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors cursor-pointer'
          >
            <Command className='w-3 h-3' />
            <span>K</span>
          </button>
        )}

        <div className='flex items-center gap-2 pl-2 border-l border-stone-200'>
          <div
            className='w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold'
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
 * FocusWorkspaceLayout - Chế độ phòng làm việc tập trung (Writer Studio, Artist Desk, Editor Desk)
 * với sidebar trái từ thiết kế Stitch Writer Studio.
 */
export const FocusWorkspaceLayout: React.FC<FocusWorkspaceLayoutProps> = ({
  currentUser,
  activeWorkspace,
  activeSeries,
  onLogout,
  children,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ workspaceId?: string; seriesId?: string; chapterId?: string }>();
  const [isZenMode, setIsZenMode] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [headerConfig, setHeaderConfig] = useState<FocusHeaderConfig | null>(null);
  const [fetchedSeriesTitle, setFetchedSeriesTitle] = useState<string | undefined>(undefined);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pf.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pf.sidebar.collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const workspaceId = params.workspaceId ?? activeWorkspace?.id;
  const seriesId = params.seriesId ?? (activeSeries as any)?.id;
  const urlSearchParams = new URLSearchParams(location.search);
  const chapterId = params.chapterId ?? urlSearchParams.get('chapterId');

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
    location.pathname,
  ]);

  const contextValue = useMemo<FocusHeaderContextValue>(
    () => ({
      isInsideFocusLayout: true,
      setHeaderConfig,
    }),
    [],
  );

  const effectiveRole = currentUser.workspaceRole
    ? String(currentUser.workspaceRole).toUpperCase()
    : currentUser.activeRoles && currentUser.activeRoles.length > 0
      ? String(currentUser.activeRoles[0]).toUpperCase()
      : 'WRITER';

  const chapterQuery = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : '';

  const navSections = useMemo(() => {
    return [
      {
        section: t('navigation.sidebar.seriesOverview', 'TỔNG QUAN'),
        items: [
          {
            icon: Layers,
            label: t('navigation.menu.myWork', 'Việc của tôi'),
            href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
            badge: { type: 'count', count: 3 },
          },
        ],
      },
      {
        section: t('navigation.sidebar.chapterProduction', 'SÁNG TÁC CHƯƠNG'),
        items: [
          {
            icon: FileText,
            label: t('navigation.menu.script', 'Kịch bản Chương'),
            href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
          },
          ...(effectiveRole === 'ARTIST'
            ? [
                {
                  icon: LayoutTemplate,
                  label: t('navigation.menu.desk', 'Bàn vẽ Khung tranh'),
                  href: `/workspaces/${workspaceId}/series/${seriesId}/artist`,
                },
              ]
            : []),
          ...(effectiveRole === 'LETTERER'
            ? [
                {
                  icon: Type,
                  label: t('navigation.menu.lettering', 'Chèn chữ & Bóng thoại'),
                  href: `/workspaces/${workspaceId}/series/${seriesId}/letterer`,
                },
              ]
            : []),
          ...(effectiveRole === 'EDITOR'
            ? [
                {
                  icon: ShieldCheck,
                  label: t('navigation.menu.reviewDesk', 'Bàn thẩm định biên tập'),
                  href: `/workspaces/${workspaceId}/series/${seriesId}/editor/desk`,
                },
              ]
            : []),
        ],
      },
      {
        section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
        items: [
          {
            icon: BookMarked,
            label: t('navigation.menu.bible', 'Series Bible'),
            href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
            badge: { type: 'text', text: 'VAULT', color: 'bg-stone-100 text-stone-600' },
          },
          {
            icon: Kanban,
            label: t('navigation.menu.production', 'Quy trình sản xuất'),
            href: `/workspaces/${workspaceId}/series/${seriesId}/workspace${chapterQuery}`,
          },
        ],
      },
    ];
  }, [t, workspaceId, seriesId, effectiveRole, chapterQuery]);

  const handleNavClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      e.preventDefault();
      navigate(href);
    },
    [navigate],
  );

  const renderBadge = useCallback((badge: any) => {
    if (!badge) return null;
    if (typeof badge === 'number' || typeof badge === 'string') {
      return (
        <span className='px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-xs shrink-0'>
          {badge}
        </span>
      );
    }
    if (badge.type === 'count') {
      return (
        <span className='px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-bold text-xs shrink-0'>
          {badge.count}
        </span>
      );
    }
    if (badge.type === 'dot') {
      return <span className={`w-1.5 h-1.5 rounded-full ${badge.color || 'bg-orange-600'} shrink-0`} />;
    }
    if (badge.type === 'text') {
      return (
        <span
          className={`text-xs font-mono px-1.5 py-0.5 rounded font-semibold ${badge.color || 'bg-stone-100 text-stone-600'} shrink-0 max-w-[80px] truncate`}
        >
          {badge.text}
        </span>
      );
    }
    return null;
  }, []);

  const effectiveActiveSeries = activeSeries || {
    id: seriesId,
    title: fetchedSeriesTitle || 'Shibuya Overdrive',
    subtitle: chapterId ? `Chapter ${chapterId}` : 'Series Workspace',
  };

  return (
    <FocusHeaderContext.Provider value={contextValue}>
      <div
        className={`h-screen w-full flex overflow-hidden bg-[#FAF9F5] text-stone-900 select-none transition-all duration-200 ease-out ${
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
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-stone-200 text-xs text-stone-900 hover:bg-stone-50 shadow-md cursor-pointer transition-all active:scale-95'
              title='Thoát chế độ tập trung (Phím F hoặc Escape)'
            >
              <Minimize2 className='w-3.5 h-3.5 text-orange-600' />
              <span className='font-semibold'>Thoát toàn màn hình (F)</span>
            </button>
          </div>
        ) : (
          <AppShellSidebar
            currentUser={currentUser}
            activeWorkspace={activeWorkspace}
            activeSeries={effectiveActiveSeries as any}
            workspaceId={workspaceId}
            seriesId={seriesId}
            isReader={false}
            navSections={navSections}
            handleNavClick={handleNavClick}
            renderBadge={renderBadge}
            onLogout={onLogout}
            isCollapsed={isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            isMobileDrawer={false}
          />
        )}

        <div className='flex-1 flex flex-col min-w-0 h-full bg-[#FAF9F5] relative overflow-hidden'>
          {!isZenMode && (
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
            className='flex-1 min-h-0 min-w-0 w-full flex flex-col overflow-hidden relative'
            data-testid='focus-workspace-body'
          >
            <div
              key={location.pathname}
              className='w-full h-full flex-1 flex flex-col overflow-hidden animate-in fade-in duration-200'
            >
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </FocusHeaderContext.Provider>
  );
};

export default FocusWorkspaceLayout;
