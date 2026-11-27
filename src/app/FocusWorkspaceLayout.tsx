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
  UploadCloud,
  Layers,
  LayoutTemplate,
  Type,
  ShieldCheck,
  BookMarked,
  Kanban,
  Users,
} from 'lucide-react';
import { BrandMark } from '@/shared/components/BrandMark';
import { MangaProject } from '@/types';
import { getRoleDefaultPath } from '@/roles/roles';
import { seriesService } from '@/services/series.service';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { useTranslation } from '@/lib/i18n';
import { CurrentUser } from './AppShell';
import { AppShellSidebar } from './AppShellSidebar';
import { useSidebarTheme } from './useSidebarTheme';

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
  showWithdrawButton?: boolean;
  isWithdrawDisabled?: boolean;
  withdrawDisabledReason?: string;
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

function getReadableWorkspaceTitle(pathname: string, t: (k: string) => string): string {
  if (pathname.includes('/artist')) return t('navigation.focus.workspaceTitle.artist');
  if (pathname.includes('/script/review')) return t('navigation.focus.workspaceTitle.scriptReview');
  if (pathname.includes('/script')) return t('navigation.focus.workspaceTitle.script');
  if (pathname.includes('/letterer')) return t('navigation.focus.workspaceTitle.letterer');
  if (pathname.includes('/chapter-review'))
    return t('navigation.focus.workspaceTitle.chapterReview');
  if (pathname.includes('/editor/bible')) return t('navigation.focus.workspaceTitle.bibleReview');
  if (pathname.includes('/editor/desk')) return t('navigation.focus.workspaceTitle.editorDesk');
  if (pathname.includes('/review/')) return t('navigation.focus.workspaceTitle.review');
  if (pathname.includes('/task/')) return t('navigation.focus.workspaceTitle.task');
  return t('navigation.focus.workspaceTitle.default');
}

function formatFallbackChapterText(
  chapterId: string,
  t: (k: string, params?: Record<string, string | number>) => string,
): string {
  const cleaned = chapterId.replace(/^chapter-?/i, '').replace(/^chap-?/i, '');
  if (/^\d+$/.test(cleaned)) {
    return t('navigation.focus.chapterFallback', { number: cleaned });
  }
  return t('navigation.focus.chapterOpen');
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
  userName,
  userInitials = 'PF',
  workspaceName,
  activeSeriesTitle,
  headerConfig,
  onEnterFocusMode,
  showFocusControls = true,
}) => {
  const { t } = useTranslation();
  const resolvedUserName = userName || t('navigation.focus.defaultUser');

  const isWriterScriptEditor =
    pathname.includes('/script/editor') ||
    (pathname.includes('/script') &&
      !pathname.includes('/review') &&
      !pathname.includes('/editor/desk') &&
      !pathname.includes('/artist'));

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
    t('navigation.focus.defaultSeries');

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

  const canWithdraw = Boolean(headerConfig?.onWithdrawStage) && !headerConfig?.isWithdrawDisabled;
  const showWithdrawBtn = Boolean(
    headerConfig?.onWithdrawStage || headerConfig?.showWithdrawButton,
  );

  return (
    <header
      className='h-16 bg-white border-b border-stone-200 px-3 flex items-center justify-between gap-2 shrink-0 z-30 select-none'
      data-testid='focus-studio-header'
    >
      {/* Phía trái: Breadcrumb Series › Chương n: <title> (Stitch) */}
      <nav
        aria-label={t('navigation.focus.breadcrumbAria')}
        className='flex items-center gap-1 min-w-0 shrink-0 text-xs text-stone-600'
      >
        <Link
          to={resolvedSeriesPath}
          data-testid='focus-series-link'
          title={t('navigation.focus.openSeriesTooltip', { title: resolvedSeriesTitle })}
          className='font-semibold text-stone-900 hover:text-[#EA580C] transition-colors truncate max-w-[140px] sm:max-w-[165px] shrink-0'
        >
          {resolvedSeriesTitle}
        </Link>

        {(chapters.length > 0 || activeChapterId) && (
          <>
            <ChevronRight className='w-3.5 h-3.5 text-stone-400 shrink-0' aria-hidden='true' />
            <div
              data-testid='focus-chapter-breadcrumb'
              className='inline-flex items-center min-w-0 shrink-0 max-w-[240px]'
            >
              {chapters.length > 0 && headerConfig?.onSelectChapter ? (
                <select
                  aria-label={t('navigation.header.chapter', 'Chọn chương')}
                  data-testid='focus-chapter-select'
                  value={activeChapterId || chapters[0].id}
                  onChange={(e) => headerConfig.onSelectChapter?.(e.target.value)}
                  className='w-auto max-w-[240px] bg-[#FAF9F5] border border-[#E7E5E4] hover:border-orange-300 rounded px-2 py-1 text-xs font-medium text-stone-800 hover:text-[#EA580C] focus:outline-none focus:ring-1 focus:ring-[#EA580C] cursor-pointer transition-colors'
                >
                  {chapters.map((ch) => {
                    const baseLabel = formatChapterLabel(ch.chapterNumber, ch.title);
                    const displayLabel = isWriterScriptEditor
                      ? `${baseLabel} ${t('navigation.breadcrumbs.scriptSuffix', '(Kịch bản)')}`
                      : baseLabel;
                    return (
                      <option key={ch.id} value={ch.id}>
                        {displayLabel}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <Link
                  to={resolvedChapterPath}
                  data-testid='focus-chapter-link'
                  className='font-semibold text-stone-900 hover:text-[#EA580C] transition-colors truncate'
                >
                  {(() => {
                    const base = activeChapter
                      ? formatChapterLabel(activeChapter.chapterNumber, activeChapter.title)
                      : activeChapterId
                        ? formatFallbackChapterText(activeChapterId, t)
                        : t('navigation.header.currentChapter', 'Chương đang mở');
                    return isWriterScriptEditor
                      ? `${base} ${t('navigation.breadcrumbs.scriptSuffix', '(Kịch bản)')}`
                      : base;
                  })()}
                </Link>
              )}
            </div>
          </>
        )}

        {stages.length === 0 && !activeChapterId && chapters.length === 0 && (
          <>
            <ChevronRight className='w-3.5 h-3.5 text-stone-400 shrink-0' aria-hidden='true' />
            <span className='font-semibold text-stone-900 truncate'>
              {getReadableWorkspaceTitle(pathname, t)}
            </span>
          </>
        )}
      </nav>

      {/* Ở giữa: Hiển thị các công đoạn thực hiện (Stage Stepper) - chuẩn Stitch pill */}
      {stages.length > 0 && (
        <div className='flex items-center justify-center min-w-0'>
          <div
            data-testid='focus-stage-stepper'
            role='list'
            aria-label={t('navigation.focus.stageProgressAria')}
            className='hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-[#FAF9F5] border border-[#E7E5E4] text-xs shrink-0'
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
                    className={`flex items-center gap-1 transition-all whitespace-nowrap ${
                      headerConfig?.onSelectStage ? 'cursor-pointer hover:opacity-90' : ''
                    } ${
                      isCurrent
                        ? 'bg-[#EA580C] text-white px-2 py-0.5 rounded-full font-semibold shadow-2xs'
                        : isCompleted
                          ? 'text-emerald-600 font-medium px-0.5'
                          : 'text-stone-400 font-medium px-0.5'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2
                        className='w-3.5 h-3.5 text-emerald-600 shrink-0'
                        aria-hidden='true'
                      />
                    ) : isCurrent ? (
                      <span
                        className='w-1.5 h-1.5 rounded-full bg-white shrink-0'
                        aria-hidden='true'
                      />
                    ) : (
                      <span
                        className='w-1.5 h-1.5 rounded-full bg-stone-300 shrink-0'
                        aria-hidden='true'
                      />
                    )}
                    <span>
                      {idx + 1}. {stage.label}
                      {isCurrent ? ` (${t('navigation.focus.inProgressTag', 'đang làm')})` : ''}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Phía phải: Nút Rút bài / Nộp qua công đoạn / Gửi duyệt kịch bản */}
      <div className='flex items-center gap-1.5 shrink-0'>
        {showWithdrawBtn && (
          <button
            type='button'
            onClick={canWithdraw ? headerConfig?.onWithdrawStage : undefined}
            disabled={Boolean(headerConfig?.isWithdrawingStage) || !canWithdraw}
            data-testid='artist-withdraw-btn'
            title={
              canWithdraw
                ? t('navigation.focus.withdrawTooltip')
                : headerConfig?.withdrawDisabledReason ||
                  t('navigation.focus.withdrawDisabledTooltip')
            }
            className='inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-stone-50 border border-[#E7E5E4] text-stone-700 text-xs font-medium active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0 whitespace-nowrap'
          >
            {headerConfig?.isWithdrawingStage ? (
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <RotateCcw className='w-3.5 h-3.5' />
            )}
            <span>
              {headerConfig?.isWithdrawingStage
                ? t('navigation.focus.withdrawing')
                : headerConfig?.withdrawButtonLabel || t('navigation.focus.withdrawBtn')}
            </span>
          </button>
        )}

        {headerConfig?.onSubmitStage &&
          (isStageFlowCompleted ? (
            <div
              data-testid='focus-stage-completed-badge'
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold shrink-0'
            >
              <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
              <span>{t('navigation.focus.submittedBadge')}</span>
            </div>
          ) : (
            <button
              type='button'
              onClick={headerConfig.onSubmitStage}
              disabled={isSubmittingStage}
              data-testid='focus-submit-stage-btn'
              title={
                headerConfig.submitButtonLabel
                  ? t('navigation.focus.submitCustomTooltip', {
                      label: headerConfig.submitButtonLabel,
                    })
                  : isLastStage
                    ? t('navigation.focus.submitFinalTooltip')
                    : t('navigation.focus.submitStageTooltip')
              }
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold shadow-2xs active:scale-95 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 whitespace-nowrap'
            >
              {isSubmittingStage ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' />
              ) : isLastStage ? (
                <Send className='w-3.5 h-3.5' />
              ) : (
                <UploadCloud className='w-3.5 h-3.5' />
              )}
              <span>
                {isSubmittingStage
                  ? t('navigation.focus.submitting')
                  : headerConfig.submitButtonLabel || t('navigation.focus.submitBtn')}
              </span>
            </button>
          ))}

        {!isWriterScriptEditor && showFocusControls && onEnterFocusMode && (
          <button
            type='button'
            onClick={onEnterFocusMode}
            title={t('navigation.focus.zenModeTooltip')}
            data-testid='focus-zen-toggle-btn'
            className='flex items-center gap-1 px-2 py-1.5 rounded bg-white border border-[#E7E5E4] text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 active:scale-95 transition-all cursor-pointer shrink-0'
          >
            <Maximize2 className='w-3.5 h-3.5 text-stone-500' />
            <span className='hidden 2xl:inline'>{t('navigation.focus.zenModeBtn')}</span>
            <span className='sr-only 2xl:hidden'>{t('navigation.focus.zenModeBtn')}</span>
          </button>
        )}

        {!isWriterScriptEditor && (
          <div className='flex items-center gap-1.5 pl-0.5'>
            <div
              className='w-8 h-8 rounded-full bg-[#EA580C] text-white flex items-center justify-center text-xs font-semibold shrink-0'
              title={resolvedUserName}
            >
              {userInitials || 'PF'}
            </div>
          </div>
        )}
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
  const [sidebarTheme, setSidebarTheme] = useSidebarTheme();

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

  const isWriterScriptEditor =
    location.pathname.includes('/script/editor') ||
    (location.pathname.includes('/script') &&
      !location.pathname.includes('/review') &&
      !location.pathname.includes('/editor/desk') &&
      !location.pathname.includes('/artist'));

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
    if (isWriterScriptEditor) {
      if (isZenMode) setIsZenMode(false);
      return;
    }

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
  }, [isZenMode, isWriterScriptEditor]);

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
      : location.pathname.includes('/artist')
        ? 'ARTIST'
        : location.pathname.includes('/letterer')
          ? 'LETTERER'
          : location.pathname.includes('/editor')
            ? 'EDITOR'
            : 'WRITER';

  const chapterQuery = chapterId ? `?chapterId=${encodeURIComponent(chapterId)}` : '';

  const navSections = useMemo(() => {
    if (effectiveRole === 'WRITER') {
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
          section: t('navigation.sidebar.chapterWriting', 'SÁNG TÁC CHƯƠNG'),
          items: [
            {
              icon: FileText,
              label: t('navigation.menu.chapterScript', 'Kịch bản Chương'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
            },
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
              icon: Users,
              label: t('navigation.menu.characterProfilesAndLore', 'Hồ sơ Nhân vật & Lore'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/bible?tab=entities`,
            },
          ],
        },
      ];
    }

    if (effectiveRole === 'ARTIST') {
      return [
        {
          section: t('navigation.sidebar.seriesOverview', 'TỔNG QUAN'),
          items: [
            {
              icon: Layers,
              label: t('navigation.menu.artistMyWork', 'Công việc của tôi'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
            },
          ],
        },
        {
          section: t('navigation.sidebar.comicProduction', 'SẢN XUẤT TRUYỆN'),
          items: [
            {
              icon: LayoutTemplate,
              label: t('navigation.menu.artistDesk', 'Bàn vẽ truyện'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/artist`,
              isActive: location.pathname.includes('/artist'),
            },
            {
              icon: FileText,
              label: t('navigation.menu.scriptReference', 'Kịch bản tham chiếu'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
            },
          ],
        },
        {
          section: t('navigation.sidebar.designAssets', 'THIẾT KẾ TÀI NGUYÊN'),
          items: [
            {
              icon: BookMarked,
              label: t('navigation.menu.bible', 'Series Bible'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
            },
          ],
        },
      ];
    }

    if (effectiveRole === 'LETTERER') {
      return [
        {
          section: t('navigation.sidebar.seriesOverview', 'TỔNG QUAN'),
          items: [
            {
              icon: Layers,
              label: t('navigation.menu.myWork', 'Việc của tôi'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/my-work`,
              badge: { type: 'count', count: 2 },
            },
          ],
        },
        {
          section: t('navigation.sidebar.chapterProduction', 'SẢN XUẤT CHƯƠNG'),
          items: [
            {
              icon: Type,
              label: t('navigation.menu.letteringAndBalloons', 'Chèn chữ & Bóng thoại'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/letterer`,
            },
            {
              icon: FileText,
              label: t('navigation.menu.scriptReadOnly', 'Kịch bản (chỉ đọc)'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
            },
          ],
        },
        {
          section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
          items: [
            {
              icon: BookMarked,
              label: t('navigation.menu.bible', 'Series Bible'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
            },
          ],
        },
      ];
    }

    if (effectiveRole === 'EDITOR') {
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
          section: t('navigation.sidebar.chapterProduction', 'SẢN XUẤT CHƯƠNG'),
          items: [
            {
              icon: ShieldCheck,
              label: t('navigation.menu.editorReviewDesk', 'Kiểm tra & Hiệu đính'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/editor/desk`,
            },
            {
              icon: FileText,
              label: t('navigation.menu.script', 'Kịch bản'),
              href: `/workspaces/${workspaceId}/series/${seriesId}/script`,
            },
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
          ],
        },
      ];
    }

    return [
      {
        section: t('navigation.sidebar.chapterProduction', 'SẢN XUẤT CHƯƠNG'),
        items: [
          {
            icon: Kanban,
            label: t('navigation.menu.progressAndTasks', 'Tiến độ & Giao việc'),
            href: `/workspaces/${workspaceId}/series/${seriesId}/workspace${chapterQuery}`,
          },
          {
            icon: BookOpen,
            label: t('navigation.menu.artworkReview', 'Đọc duyệt tranh'),
            href: `/workspaces/${workspaceId}/series/${seriesId}/editor/desk${chapterQuery}`,
          },
        ],
      },
      {
        section: t('navigation.sections.seriesManagement', 'QUẢN LÝ SERIES'),
        items: [
          {
            icon: BookMarked,
            label: t('navigation.menu.bible', 'Series Bible'),
            href: `/workspaces/${workspaceId}/series/${seriesId}/bible`,
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
      return (
        <span className={`w-1.5 h-1.5 rounded-full ${badge.color || 'bg-orange-600'} shrink-0`} />
      );
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

  const activeChapterObj = headerConfig?.chapters?.find(
    (c) => c.id === (headerConfig?.currentChapterId ?? chapterId),
  );

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
        {isZenMode && !isWriterScriptEditor ? (
          <div
            data-testid='focus-zen-pill'
            className='absolute top-3 right-4 z-50 animate-in fade-in zoom-in-95 duration-200'
          >
            <button
              type='button'
              onClick={() => setIsZenMode(false)}
              className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-stone-200 text-xs text-stone-900 hover:bg-stone-50 shadow-md cursor-pointer transition-all active:scale-95'
              title={t('navigation.focus.exitZenTooltip')}
            >
              <Minimize2 className='w-3.5 h-3.5 text-orange-600' />
              <span className='font-semibold'>{t('navigation.focus.exitZenBtn')}</span>
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
            theme={sidebarTheme}
            onChangeTheme={setSidebarTheme}
            activeChapterNumber={activeChapterObj?.chapterNumber ?? null}
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
              showFocusControls={!isWriterScriptEditor}
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
