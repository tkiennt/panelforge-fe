import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Layers,
  Plus,
  Trash2,
  Settings,
  FileImage,
  RefreshCw,
  CheckCircle2,
  X,
  Layout,
  Sparkles,
  KanbanSquare,
  Clock,
  ArrowRight,
  BookOpen,
  ShieldAlert,
  LayoutTemplate,
  CheckSquare,
  Square,
  MessageSquare,
  Move,
  Film,
  Edit3,
  Upload,
  ImageIcon,
  ImagePlus,
  RotateCw,
  ArrowUp,
  ArrowDown,
  User,
  Mountain,
  Package,
  Zap,
  Palette,
  Loader2,
  AlertTriangle,
  Play,
  Columns,
  Rows,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  MoreHorizontal,
  Grid2x2,
  History,
  Lock,
} from 'lucide-react';
import { pageService, PageDto, PageDetailDto } from '@/services/page.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { panelService } from '@/services/panel.service';
import { PanelDto, PanelDetailDto, ImageConsistencyResultDto } from '@/types/pipeline';
import {
  elementService,
  ElementSnapshotDto,
  IMAGE_LAYER_TYPES,
  ImageLayerType,
  LAYER_LABELS,
  AddElementRequest,
} from '@/services/element.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { FrameTemplateModal } from '@/roles/artist/modals/FrameTemplateModal';
import { BibleReferenceDrawer } from '@/shared/features/collaboration/BibleReferenceDrawer';
import { AuthenticatedImage } from '@/shared/components/AuthenticatedImage';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { offlineQueueService } from '@/services/offlineQueue.service';
import {
  scriptLineService,
  SceneDto,
  SceneScriptLineSummaryDto,
} from '@/services/scriptLine.service';
import {
  artworkService,
  computeFileSha256,
  resolveArtworkUrl,
  toThumbnailUrl,
} from '@/services/artwork.service';
import { assignmentService, type AssignmentDto } from '@/services/assignment.service';
import {
  findUploadAssignment,
  needsArtworkLink,
  parseLinkExpiry,
} from '@/shared/utils/artworkLinks';
import { errorMessage } from '@/shared/features/collaboration/collaborationRules';
import type { AssetReferenceDto } from '@/types';
import type { WorkspaceAssignmentDto } from '@/types/pipeline';
import { normalizeWorkspaceRole } from '@/types/auth';
import {
  ParsedBoundingBox,
  parseBoundingBox,
  buildBoundingBoxJson,
} from '../utils/panelBoundingBox';
import {
  alignRects,
  clampRect,
  detectLayoutIssues,
  distributeRects,
  moveRect,
  resizeRect,
  round1,
  roundRect,
  snapRect,
  splitEvenly,
  splitPanelRect,
  straightenRects,
  type AlignMode,
  type DragMode,
  type GapLabel,
  type Guide,
  type Rect,
  type SplitAxis,
  type SplitPreset,
} from '@/shared/utils/panelLayout';
import {
  LayoutGuidesOverlay,
  PanelLayoutToolbar,
  PanelReadout,
  PanelResizeHandles,
} from '@/roles/artist/components/PanelLayoutControls';

import { splitPanelWithRollback } from '../utils/splitPanel';
import { PageArtworkWorkflow } from '../components/PageArtworkWorkflow';
import { PageArtCrop } from '@/shared/features/collaboration/ArtworkPanel';
import { seriesService } from '@/services/series.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { pickPanelArtwork, pickPageArtwork } from '@/shared/utils/stageArtworks';
import { ElementConflictModal } from '@/shared/modals/ElementConflictModal';

/** Chỉ lỗi mạng (không có status HTTP) mới xếp hàng chờ ngoại tuyến; 4xx/409 của BE phải hiện cho người dùng. */
const isNetworkFailure = (err: any): boolean =>
  err?.status === undefined && (!err?.response || err?.code === 'ERR_NETWORK');

let localIdSeq = 0;
function generateClientId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  localIdSeq += 1;
  return `${prefix}-local-${localIdSeq}`;
}

interface ArtistDeskViewProps {
  workspaceRole?: string | null;
}

const LOCKED_TONE = 'bg-stone-100 text-stone-700 border-stone-300';
/** Nhãn trạng thái việc (Assignment) trên bàn vẽ; "Chỉ xem" khi việc đã nộp/duyệt. */
const WORK_STATUS: Record<string, { label: string; tone: string }> = {
  Assigned: { label: 'Được giao', tone: 'bg-sky-50 text-sky-800 border-sky-200' },
  InProgress: { label: 'Đang làm', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  ReworkRequired: { label: 'Cần sửa', tone: 'bg-amber-50 text-amber-900 border-amber-300' },
  Submitted: { label: 'Chờ duyệt · Chỉ xem', tone: LOCKED_TONE },
  UnderReview: { label: 'Đang duyệt · Chỉ xem', tone: LOCKED_TONE },
  Approved: { label: 'Đã duyệt · Chỉ xem', tone: LOCKED_TONE },
  Blocked: { label: 'Chờ công đoạn trước', tone: LOCKED_TONE },
};

export const ArtistDeskView: React.FC<ArtistDeskViewProps> = ({ workspaceRole }) => {
  const { workspaceId, seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');

  const [activeTab, setActiveTab] = useState<'pages' | 'script' | 'queue'>('pages');
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(chapterIdFromUrl || null);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Quyền ghi Page (Breaking 152): Chỉ Producer và Artist được ghi (tạo/sửa canvas/xoá)
  const normRole = workspaceRole ? normalizeWorkspaceRole(workspaceRole) : null;
  const canEditPages = !normRole || normRole === 'PRODUCER' || normRole === 'ARTIST';

  // Tasks Queue Data (nạp từ assignmentService)
  const [tasks, setTasks] = useState<AssignmentDto[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    let alive = true;
    if (currentChapterId && assignmentService.getAssignments) {
      setLoadingTasks(true);
      Promise.resolve(assignmentService.getAssignments(currentChapterId))
        .then((list) => {
          if (alive) setTasks(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (alive) setTasks([]);
        })
        .finally(() => {
          if (alive) setLoadingTasks(false);
        });
    } else if (workspaceId && assignmentService.getMyAssignments) {
      setLoadingTasks(true);
      Promise.resolve(assignmentService.getMyAssignments(workspaceId))
        .then((list) => {
          if (alive) setTasks(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (alive) setTasks([]);
        })
        .finally(() => {
          if (alive) setLoadingTasks(false);
        });
    } else {
      setTasks([]);
    }
    return () => {
      alive = false;
    };
  }, [currentChapterId, workspaceId]);

  const [pages, setPages] = useState<PageDto[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageDto | null>(null);
  const [pageDetail, setPageDetail] = useState<PageDetailDto | null>(null);
  const [loading, setLoading] = useState(false);

  // Panels on the selected page
  const [panels, setPanels] = useState<PanelDto[]>([]);
  const [loadingPanels, setLoadingPanels] = useState(false);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedPanelDetail, setSelectedPanelDetail] = useState<PanelDetailDto | null>(null);

  // Scenes & Script lines in current chapter
  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [sceneLines, setSceneLines] = useState<SceneScriptLineSummaryDto[]>([]);
  const [loadingSceneLines, setLoadingSceneLines] = useState(false);

  // Panel Coordinates Edit State
  const [panelBoxX, setPanelBoxX] = useState(10);
  const [panelBoxY, setPanelBoxY] = useState(10);
  const [panelBoxW, setPanelBoxW] = useState(80);
  const [panelBoxH, setPanelBoxH] = useState(35);
  const [panelReadingOrder, setPanelReadingOrder] = useState(1);

  // Chỉnh bố cục khung trực tiếp trên canvas (kéo/đổi cỡ có snap, chọn nhiều, căn chỉnh)
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    mode: DragMode;
    ids: string[];
    starts: Record<string, Rect>;
    others: Rect[];
    startX: number;
    startY: number;
    w: number;
    h: number;
    moved: boolean;
  } | null>(null);
  const liveRef = useRef<Record<string, Rect>>({});
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<{
    persistRects: (u: Array<{ id: string; rect: Rect }>) => Promise<void>;
  } | null>(null);
  const [liveRects, setLiveRects] = useState<Record<string, Rect>>({});
  const [dragGuides, setDragGuides] = useState<{ guides: Guide[]; gaps: GapLabel[] }>({
    guides: [],
    gaps: [],
  });
  const [multiIds, setMultiIds] = useState<string[]>([]);
  const [layoutBusy, setLayoutBusy] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [frameTemplateModalOpen, setFrameTemplateModalOpen] = useState(false);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newLayoutFormat, setNewLayoutFormat] = useState('StandardPage');
  const [newWidthPx, setNewWidthPx] = useState('1200');
  const [newHeightPx, setNewHeightPx] = useState('1800');
  const [newDpi, setNewDpi] = useState('600');

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editWidthPx, setEditWidthPx] = useState('1200');
  const [editHeightPx, setEditHeightPx] = useState('1800');
  const [editDpi, setEditDpi] = useState('600');
  const [editLayout, setEditLayout] = useState('StandardPage');

  // Trạng thái Bàn làm việc họa sĩ (Thu gọn cột phụ & Phóng to bản vẽ)
  // Dưới 1024px cột Trang/Kịch bản là drawer nên mặc định đóng; cột Chi tiết mặc định đóng để ưu tiên trang truyện
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024,
  );
  const [isRightCollapsed, setIsRightCollapsed] = useState(true);
  // "Sửa bố cục": chỉ khi bật mới kéo/đổi cỡ khung, hiện tay nắm và công cụ bố cục
  const [layoutEdit, setLayoutEdit] = useState(false);
  const [openMenu, setOpenMenu] = useState<'upload' | 'page' | null>(null);
  const detailsCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!openMenu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== 'Escape') return;
      if (e.type === 'mousedown' && (e.target as Element | null)?.closest?.('[data-menu-root]'))
        return;
      setOpenMenu(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [openMenu]);
  useEffect(() => {
    // Cột Chi tiết là drawer dưới 1280px: đưa focus vào nút Đóng khi mở
    if (!isRightCollapsed && window.matchMedia?.('(max-width: 1279px)')?.matches) {
      detailsCloseRef.current?.focus();
    }
  }, [isRightCollapsed]);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [isFitMode, setIsFitMode] = useState(true);

  const baseWidth = 560;
  const pageW = selectedPage?.widthPx || 1200;
  const pageH = selectedPage?.heightPx || 1800;
  const canvasRatio = pageW > 0 ? pageH / pageW : 1.414;
  const baseHeight = Math.round(baseWidth * canvasRatio);

  const calculateFitScale = useCallback(() => {
    if (!canvasContainerRef.current) return 1;
    const container = canvasContainerRef.current;
    const isSmall = container.clientWidth < 640;
    const padX = isSmall ? 24 : 40;
    const padY = 40;
    const availW = Math.max(60, container.clientWidth - padX);
    const availH = Math.max(60, container.clientHeight - padY);
    const scale = Math.min(availW / baseWidth, availH / baseHeight);
    return Math.max(0.1, Math.min(1.5, Math.round(scale * 100) / 100));
  }, [baseWidth, baseHeight]);

  const handleFitToScreen = useCallback(() => {
    setIsFitMode(true);
    const fit = calculateFitScale();
    setZoomScale(fit);
    if (canvasContainerRef.current) {
      canvasContainerRef.current.scrollTop = 0;
      canvasContainerRef.current.scrollLeft = 0;
    }
  }, [calculateFitScale]);

  const handleZoomIn = () => {
    setIsFitMode(false);
    setZoomScale((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  };
  const handleZoomOut = () => {
    setIsFitMode(false);
    setZoomScale((z) => Math.max(0.3, Math.round((z - 0.15) * 100) / 100));
  };
  const handleResetZoom = () => {
    setIsFitMode(false);
    setZoomScale(1);
  };

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (isFitMode) {
        setZoomScale(calculateFitScale());
      }
    });
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
    // canvas chỉ render khi đã có trang: gắn lại observer khi trang được chọn
  }, [isFitMode, calculateFitScale, selectedPage]);

  // Quản lý Artwork của Page và Panel
  const [pageArtworks, setPageArtworks] = useState<AssetReferenceDto[]>([]);
  // Công đoạn của Series (để biết thứ tự + stage nào đang tắt) và công đoạn đang xem ảnh ('AUTO' = tự chọn)
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [viewStageId, setViewStageId] = useState<string>('AUTO');
  useEffect(() => {
    if (!seriesId) return;
    let alive = true;
    pipelineService
      .getSeriesPipeline(seriesId)
      .then(
        (p) =>
          alive && setStages([...(p?.stages ?? [])].sort((a, b) => a.stageOrder - b.stageOrder)),
      )
      .catch(() => alive && setStages([]));
    return () => {
      alive = false;
    };
  }, [seriesId]);
  const [panelArtworkUrls, setPanelArtworkUrls] = useState<Record<string, string>>({});
  const panelFileInputRef = React.useRef<HTMLInputElement>(null);
  const pageFileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadMode, setUploadMode] = useState<'panel' | 'page'>('panel');
  // Vừa khung ngay khi bố cục đổi (đóng/mở cột, bật sửa bố cục, đổi chế độ tải) — không chờ ResizeObserver
  useLayoutEffect(() => {
    if (isFitMode && selectedPage) setZoomScale(calculateFitScale());
  }, [
    isFitMode,
    calculateFitScale,
    selectedPage,
    isLeftCollapsed,
    isRightCollapsed,
    layoutEdit,
    uploadMode,
  ]);
  const [uploadingPanelId, setUploadingPanelId] = useState<string | null>(null);
  const [uploadingPage, setUploadingPage] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  // Ảnh toàn trang đã chọn nhưng chưa tải lên: xem trước, đổi / huỷ rồi mới bấm "Tải lên"
  const [pendingPageFile, setPendingPageFile] = useState<File | null>(null);
  const [pendingPagePreview, setPendingPagePreview] = useState<string | null>(null);
  const [seriesRightToLeft, setSeriesRightToLeft] = useState(false);
  const [dragOverPanelId, setDragOverPanelId] = useState<string | null>(null);
  const [checkingConsistencyPanelId, setCheckingConsistencyPanelId] = useState<string | null>(null);
  const [panelConsistencyResult, setPanelConsistencyResult] = useState<
    Record<string, ImageConsistencyResultDto>
  >({});
  const [bibleDrawerOpen, setBibleDrawerOpen] = useState(false);
  const [selectedDrawerPanelId, setSelectedDrawerPanelId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);

  // Concurrency Conflict Modal (BR-11 / NFR-09)
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictErrorMsg, setConflictErrorMsg] = useState<string | undefined>(undefined);
  const [conflictPanelId, setConflictPanelId] = useState<string | undefined>(undefined);

  // Lắng nghe sự kiện xung đột từ hàng đợi offline (BR-11 / NFR-09)
  useEffect(() => {
    const handleOfflineConflict = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setConflictPanelId(detail.item?.clientRefId);
        setConflictErrorMsg(
          detail.message ||
            'Xung đột phiên bản khung tranh khi đồng bộ ngoại tuyến (409 Conflict).',
        );
        setConflictModalOpen(true);
      }
    };
    window.addEventListener('panelforge:offline_conflict', handleOfflineConflict);
    return () => {
      window.removeEventListener('panelforge:offline_conflict', handleOfflineConflict);
    };
  }, []);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (title: string, desc: string) => {
    setToast({ title, desc });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      if (typeof window !== 'undefined') {
        setToast(null);
      }
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleCheckPanelConsistency = async (panelId: string) => {
    setCheckingConsistencyPanelId(panelId);
    try {
      const res = await panelService.checkImageConsistency(panelId);
      setPanelConsistencyResult((prev) => ({ ...prev, [panelId]: res }));
      if (res.passed) {
        showToast(
          'Nhất quán hình ảnh: ĐẠT',
          `Điểm tương đồng ${Math.round(res.score * 100)}% (ngưỡng ${Math.round(res.threshold * 100)}%) với Character Sheet đã khóa.`,
        );
      } else {
        showToast(
          'Cảnh báo sai lệch nhân vật',
          res.summaryReason ||
            `Điểm tương đồng chỉ đạt ${Math.round(res.score * 100)}% (ngưỡng ${Math.round(res.threshold * 100)}%). Đã ghi nhận độ lệch.`,
        );
      }
    } catch (err: any) {
      showToast(
        'Lỗi kiểm tra nhất quán',
        err.message || 'Không thể kiểm tra tính nhất quán hình ảnh.',
      );
    } finally {
      setCheckingConsistencyPanelId(null);
    }
  };

  /**
   * Hiện lỗi của các lệnh sửa nội dung (Page/Panel/Element).
   * BR-12: 409 `CHAPTER_READ_ONLY` = chương đã Approved/Published, KHÔNG phải xung đột phiên bản.
   */
  const showMutationError = (title: string, err: any, fallback?: string) => {
    if (err?.code === 'CHAPTER_READ_ONLY') {
      showToast(
        'Chương chỉ đọc',
        err?.message || 'Chương đã được duyệt hoặc phát hành nên không thể sửa nội dung.',
      );
      return;
    }
    showToast(title, err?.message || fallback || 'Thao tác thất bại.');
  };

  /** Xoá Page/Panel bị BE chặn (409 CONFLICT) vì còn Assignment đang giao: giữ nguyên trên giao diện. */
  const showDeleteError = (title: string, err: any) => {
    if (err?.code === 'CONFLICT' || (err?.status === 409 && err?.code !== 'CHAPTER_READ_ONLY')) {
      showToast(
        title,
        err?.message ||
          'Vẫn còn việc đang giao cho mục này. Producer cần huỷ việc trước rồi mới xoá được.',
      );
      return;
    }
    showMutationError(title, err);
  };

  // Quản lý Layers & Element ảnh trên Canvas (CF2 / BR-11)
  const [pageElements, setPageElements] = useState<ElementSnapshotDto[]>([]);
  const [loadingElements, setLoadingElements] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<
    'panel' | 'versions' | 'feedback' | 'layers'
  >('panel');
  const [previewArt, setPreviewArt] = useState<AssetReferenceDto | null>(null);
  // Mặc định khi đang chọn panel: chỉ hiện layer của panel đó + layer "Toàn trang"
  const [showAllPageLayers, setShowAllPageLayers] = useState(false);
  const isPanelLayerFilter = Boolean(selectedPanelId) && !showAllPageLayers;
  const visibleElements = isPanelLayerFilter
    ? pageElements.filter((e) => !e.panelId || e.panelId === selectedPanelId)
    : pageElements;
  const selectedPanelNumber = panels.find((p) => p.id === selectedPanelId)?.panelNumber;
  const [bibleEntries, setBibleEntries] = useState<BibleEntryDto[]>([]);
  const [createLayerModalOpen, setCreateLayerModalOpen] = useState(false);

  // Form tạo layer mới
  const [newLayerType, setNewLayerType] = useState<ImageLayerType>('CHARACTER_INSTANCE');
  const [newLayerPanelId, setNewLayerPanelId] = useState<string>('');
  const [newLayerBibleEntryId, setNewLayerBibleEntryId] = useState<string>('');
  const [newLayerRotation, setNewLayerRotation] = useState<number>(0);
  const [newLayerX, setNewLayerX] = useState<number>(100);
  const [newLayerY, setNewLayerY] = useState<number>(100);
  const [newLayerWidth, setNewLayerWidth] = useState<number>(300);
  const [newLayerHeight, setNewLayerHeight] = useState<number>(400);
  const [newLayerAssetId, setNewLayerAssetId] = useState<string>('');
  const [newLayerContent, setNewLayerContent] = useState<string>('');

  // Link xem artwork chỉ sống 5 phút (BR-16): nhớ thời điểm hết hạn để xin lại trước khi ảnh vỡ
  const artworkLinkExpiry = React.useRef<Record<string, number>>({});
  const artworkLinkRetried = React.useRef<Set<string>>(new Set());

  const requestArtworkLink = useCallback(async (chapId: string, artId: string) => {
    try {
      const res = await artworkService.getArtworkAccessLink(chapId, artId);
      artworkLinkExpiry.current[artId] = parseLinkExpiry(res.expiresAtUtc, Date.now());
      setPanelArtworkUrls((prev) => ({ ...prev, [artId]: resolveArtworkUrl(res.url) }));
    } catch {
      // để lần kế tiếp (interval / onError) thử lại
    }
  }, []);

  const loadPageArtworks = useCallback(
    async (chapId: string, pId: string) => {
      try {
        const arts = await artworkService.getArtworks(chapId, pId);
        setPageArtworks(arts);
        for (const a of arts) {
          if (needsArtworkLink(artworkLinkExpiry.current[a.id], Date.now())) {
            void requestArtworkLink(chapId, a.id);
          }
        }
      } catch {
        // ignore
      }
    },
    [requestArtworkLink],
  );

  // Trang để mở lâu: cứ 30 giây xin lại link sắp hết hạn
  useEffect(() => {
    if (!currentChapterId || pageArtworks.length === 0) return;
    const timer = window.setInterval(() => {
      for (const a of pageArtworks) {
        if (needsArtworkLink(artworkLinkExpiry.current[a.id], Date.now())) {
          void requestArtworkLink(currentChapterId, a.id);
        }
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [currentChapterId, pageArtworks, requestArtworkLink]);

  /** Ảnh lỗi tải (thường do link hết hạn, 401): xin link mới một lần rồi mới bỏ cuộc. */
  const handleArtworkImgError = (artId: string | undefined) => {
    if (!artId || !currentChapterId || artworkLinkRetried.current.has(artId)) return;
    artworkLinkRetried.current.add(artId);
    void requestArtworkLink(currentChapterId, artId);
  };
  const handleArtworkImgLoad = (artId: string | undefined) => {
    if (artId) artworkLinkRetried.current.delete(artId);
  };

  // Việc InProgress, Assigned & ChangesRequested của chính mình
  const [myInProgress, setMyInProgress] = useState<WorkspaceAssignmentDto[]>([]);
  const [myAssigned, setMyAssigned] = useState<WorkspaceAssignmentDto[]>([]);
  const [myChangesRequested, setMyChangesRequested] = useState<WorkspaceAssignmentDto[]>([]);
  const [startingAssignmentPanelId, setStartingAssignmentPanelId] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setMyInProgress([]);
      setMyAssigned([]);
      setMyChangesRequested([]);
      return;
    }
    let alive = true;
    assignmentService
      .getMyAssignments(workspaceId, { status: 'InProgress' })
      .then((list) => alive && setMyInProgress(list))
      .catch(() => alive && setMyInProgress([]));
    assignmentService
      .getMyAssignments(workspaceId, { status: 'Assigned' })
      .then((list) => alive && setMyAssigned(list))
      .catch(() => alive && setMyAssigned([]));
    assignmentService
      .getMyAssignments(workspaceId, { status: 'ReworkRequired' })
      .then((list) => alive && setMyChangesRequested(list))
      .catch(() => alive && setMyChangesRequested([]));
    return () => {
      alive = false;
    };
  }, [workspaceId, currentChapterId]);

  const findPendingAssigned = (panelId: string) => {
    if (!currentChapterId || !selectedPage) return undefined;
    const assigned = myAssigned.filter((a) => a.chapterId === currentChapterId);
    return (
      assigned.find((a) => a.entityType === 'Panel' && a.targetEntityId === panelId) ??
      assigned.find((a) => a.entityType === 'Page' && a.targetEntityId === selectedPage.id)
    );
  };

  const findFeedbackAssignment = (panelId?: string) => {
    if (!currentChapterId || !selectedPage) return undefined;
    const allAssignments = [...myChangesRequested, ...myInProgress, ...myAssigned].filter(
      (a) => a.chapterId === currentChapterId,
    );
    if (panelId) {
      const panelSpecific = allAssignments.find(
        (a) =>
          a.entityType === 'Panel' &&
          a.targetEntityId === panelId &&
          (a.status === 'ReworkRequired' || Boolean(a.lastFeedbackComment)),
      );
      if (panelSpecific) return panelSpecific;
    }
    return allAssignments.find(
      (a) =>
        a.entityType === 'Page' &&
        a.targetEntityId === selectedPage.id &&
        (a.status === 'ReworkRequired' || Boolean(a.lastFeedbackComment)),
    );
  };

  /** Bắt đầu việc được giao rồi mở chọn ảnh; panelId = null là ảnh cả trang. */
  const handleStartAndUploadPanel = async (panelId: string | null) => {
    const pending = findPendingAssigned(panelId ?? '');
    if (!pending || !currentChapterId) {
      if (panelId) handleTriggerUploadPanel(panelId);
      else handleTriggerUploadPage();
      return;
    }
    setStartingAssignmentPanelId(panelId ?? 'PAGE');
    try {
      showToast('Đang bắt đầu việc', 'Đang cập nhật trạng thái việc sang Đang làm (InProgress)...');
      await assignmentService.startAssignment(currentChapterId, pending.id);
      showToast('Đã bắt đầu việc', 'Nhiệm vụ đã sẵn sàng! Đang mở hộp thoại chọn tệp ảnh...');
      if (workspaceId) {
        const [inProg, asg, chg] = await Promise.all([
          assignmentService.getMyAssignments(workspaceId, { status: 'InProgress' }).catch(() => []),
          assignmentService.getMyAssignments(workspaceId, { status: 'Assigned' }).catch(() => []),
          assignmentService
            .getMyAssignments(workspaceId, { status: 'ReworkRequired' })
            .catch(() => []),
        ]);
        setMyInProgress(inProg);
        setMyAssigned(asg);
        setMyChangesRequested(chg);
      }
      if (panelId) {
        setUploadingPanelId(panelId);
        panelFileInputRef.current?.click();
      } else {
        setUploadMode('page');
        pageFileInputRef.current?.click();
      }
    } catch (err: any) {
      showMutationError(
        'Không thể bắt đầu việc',
        err,
        'Vui lòng kiểm tra lại điều kiện công đoạn.',
      );
    } finally {
      setStartingAssignmentPanelId(null);
    }
  };

  // Công đoạn đang xem: chọn tay, hoặc (Tự động) công đoạn mình đang làm trên trang này; null = công đoạn cao nhất có ảnh
  const myStageOnPage =
    currentChapterId && selectedPage
      ? findUploadAssignment(myInProgress, { chapterId: currentChapterId, pageId: selectedPage.id })
          ?.pipelineStageId
      : undefined;
  const effectiveStageId = viewStageId !== 'AUTO' ? viewStageId : (myStageOnPage ?? null);
  const artFor = (panelId: string) =>
    pickPanelArtwork(pageArtworks, panelId, stages, effectiveStageId);
  const pageArt = pickPageArtwork(pageArtworks, stages, effectiveStageId);
  const pageArtUrl = pageArt ? panelArtworkUrls[pageArt.id] : null;
  const stageLabel = (stageId: string) => stages.find((s) => s.id === stageId)?.name ?? '';

  // Việc cả chương của chính mình (nếu có): khi có việc này, các trang/khung đã tách cho người khác sẽ bị khoá
  const myChapterAssignment = useMemo(() => {
    return (
      myInProgress.find((a) => a.chapterId === currentChapterId && a.entityType === 'Chapter') ||
      myChangesRequested.find(
        (a) => a.chapterId === currentChapterId && a.entityType === 'Chapter',
      ) ||
      myAssigned.find((a) => a.chapterId === currentChapterId && a.entityType === 'Chapter')
    );
  }, [myInProgress, myChangesRequested, myAssigned, currentChapterId]);

  // Danh sách ID các trang đã tách việc cho người khác ở cùng stage
  const carvedOutPageIds = useMemo(() => {
    if (!myChapterAssignment) return new Set<string>();
    const set = new Set<string>();
    for (const t of tasks) {
      if (
        t.pipelineStageId === myChapterAssignment.pipelineStageId &&
        t.id !== myChapterAssignment.id &&
        t.entityType === 'Page' &&
        t.targetEntityId &&
        String(t.status) !== 'Cancelled'
      ) {
        set.add(t.targetEntityId);
      }
    }
    return set;
  }, [myChapterAssignment, tasks]);

  // Danh sách ID các khung tranh đã tách việc cho người khác ở cùng stage
  const carvedOutPanelIds = useMemo(() => {
    if (!myChapterAssignment) return new Set<string>();
    const set = new Set<string>();
    for (const t of tasks) {
      if (
        t.pipelineStageId === myChapterAssignment.pipelineStageId &&
        t.id !== myChapterAssignment.id &&
        t.entityType === 'Panel' &&
        t.targetEntityId &&
        String(t.status) !== 'Cancelled'
      ) {
        set.add(t.targetEntityId);
      }
    }
    return set;
  }, [myChapterAssignment, tasks]);

  const isCurrentPageCarvedOut = Boolean(selectedPage && carvedOutPageIds.has(selectedPage.id));
  const hasCarvedOutPanelOnPage = Boolean(
    selectedPage && panels.some((p) => carvedOutPanelIds.has(p.id)),
  );

  const findStageAssignment = (panelId: string) => {
    if (!currentChapterId || !selectedPage) return undefined;
    if (isCurrentPageCarvedOut || carvedOutPanelIds.has(panelId)) return undefined;
    return findUploadAssignment(myInProgress, {
      chapterId: currentChapterId,
      pageId: selectedPage.id,
      panelId,
    });
  };

  const findPageStageAssignment = () => {
    if (!currentChapterId || !selectedPage) return undefined;
    if (isCurrentPageCarvedOut) return undefined;
    return findUploadAssignment(myInProgress, {
      chapterId: currentChapterId,
      pageId: selectedPage.id,
    });
  };

  const hasPanelOnlyAssignmentOnPage = Boolean(
    selectedPage &&
    currentChapterId &&
    myInProgress.some(
      (a) =>
        a.chapterId === currentChapterId &&
        a.entityType === 'Panel' &&
        panels.some((p) => p.id === a.targetEntityId),
    ) &&
    !findPageStageAssignment(),
  );

  useEffect(() => {
    if ((hasPanelOnlyAssignmentOnPage || hasCarvedOutPanelOnPage || isCurrentPageCarvedOut) && uploadMode === 'page') {
      setUploadMode('panel');
    }
  }, [hasPanelOnlyAssignmentOnPage, hasCarvedOutPanelOnPage, isCurrentPageCarvedOut, uploadMode]);

  useEffect(() => {
    if (isCurrentPageCarvedOut && layoutEdit) {
      setLayoutEdit(false);
      setMultiIds([]);
    }
  }, [isCurrentPageCarvedOut, layoutEdit]);

  const uploadArtworkFileForPanel = async (panelId: string, file: File) => {
    if (!currentChapterId || !selectedPage) return;
    if (isCurrentPageCarvedOut) {
      showToast('Trang đã tách việc', 'Trang này đã được tách cho hoạ sĩ khác ở cùng công đoạn.');
      return;
    }
    if (carvedOutPanelIds.has(panelId)) {
      showToast('Khung đã tách việc', 'Khung tranh này đã được tách cho hoạ sĩ khác ở cùng công đoạn.');
      return;
    }
    const stageAssignment = findStageAssignment(panelId);
    if (!stageAssignment) {
      showToast(
        'Chưa thể tải ảnh',
        'Bạn cần đang làm (bấm "Bắt đầu") một việc được giao cho Page hoặc Panel này trước.',
      );
      return;
    }
    setUploadingPanelId(panelId);
    try {
      setUploadProgressMsg('Đang tính mã SHA-256...');
      showToast('Đang xử lý', 'Đang tính mã SHA-256 cho ảnh panel...');
      const sha256 = await computeFileSha256(file);
      setUploadProgressMsg('Đang tải lên máy chủ...');
      showToast('Đang tải lên', 'Đang tải artwork cho khung panel...');
      const res = await artworkService.uploadArtwork(
        currentChapterId,
        selectedPage.id,
        file,
        stageAssignment.pipelineStageId,
        sha256,
        undefined,
        panelId,
      );
      showToast('Thành công', `Đã tải artwork v${res.versionNumber} cho khung panel!`);
      await loadPageArtworks(currentChapterId, selectedPage.id);
    } catch (err: unknown) {
      showToast('Lỗi tải ảnh', errorMessage(err, 'Không thể tải ảnh cho khung panel'));
    } finally {
      if (panelFileInputRef.current) panelFileInputRef.current.value = '';
      setUploadingPanelId(null);
      setUploadProgressMsg(null);
    }
  };

  const uploadArtworkFileForPage = async (file: File): Promise<boolean> => {
    if (!currentChapterId || !selectedPage || uploadingPage) return false;
    if (isCurrentPageCarvedOut) {
      showToast(
        'Trang đã tách việc',
        'Trang này đã được tách cho hoạ sĩ khác ở cùng công đoạn, bạn không thể tải ảnh toàn trang.',
      );
      return false;
    }
    if (hasCarvedOutPanelOnPage) {
      showToast(
        'Chưa thể tải ảnh toàn trang',
        'Trang này có khung tranh đã được tách cho người khác, bạn chỉ có thể tải ảnh cho các khung còn lại.',
      );
      return false;
    }
    if (hasPanelOnlyAssignmentOnPage) {
      showToast(
        'Chưa thể tải ảnh trang',
        'Bạn đang giữ việc theo khung nên chỉ có thể tải ảnh cho khung được giao.',
      );
      return false;
    }
    const stageAssignment = findPageStageAssignment();
    if (!stageAssignment) {
      showToast(
        'Chưa thể tải ảnh trang',
        'Bạn cần đang làm một việc được giao cho Trang này trước (hoặc bấm "Bắt đầu").',
      );
      return false;
    }
    setUploadingPage(true);
    try {
      setUploadProgressMsg('Đang tính mã SHA-256 cho ảnh trang...');
      showToast('Đang xử lý', 'Đang tính mã SHA-256 cho ảnh trang...');
      const sha256 = await computeFileSha256(file);
      setUploadProgressMsg('Đang tải ảnh toàn trang lên máy chủ...');
      showToast('Đang tải lên', 'Đang tải artwork toàn trang...');
      const res = await artworkService.uploadArtwork(
        currentChapterId,
        selectedPage.id,
        file,
        stageAssignment.pipelineStageId,
        sha256,
      );
      showToast('Thành công', `Đã tải artwork toàn trang v${res.versionNumber}!`);
      await loadPageArtworks(currentChapterId, selectedPage.id);
      return true;
    } catch (err: unknown) {
      showToast('Lỗi tải ảnh trang', errorMessage(err, 'Không thể tải ảnh cho trang'));
      return false;
    } finally {
      if (pageFileInputRef.current) pageFileInputRef.current.value = '';
      setUploadingPage(false);
      setUploadProgressMsg(null);
    }
  };

  const handleTriggerUploadPanel = (panelId: string) => {
    if (isCurrentPageCarvedOut) {
      showToast('Trang đã tách việc', 'Trang này đã được tách cho hoạ sĩ khác ở cùng công đoạn.');
      return;
    }
    if (carvedOutPanelIds.has(panelId)) {
      showToast('Khung đã tách việc', 'Khung tranh này đã được tách cho hoạ sĩ khác ở cùng công đoạn.');
      return;
    }
    if (!findStageAssignment(panelId)) {
      showToast(
        'Chưa thể tải ảnh',
        'Bạn cần đang làm (bấm "Bắt đầu") một việc được giao cho Page hoặc Panel này trước.',
      );
      return;
    }
    setUploadingPanelId(panelId);
    panelFileInputRef.current?.click();
  };

  const handleTriggerUploadPage = () => {
    if (isCurrentPageCarvedOut) {
      showToast(
        'Trang đã tách việc',
        'Trang này đã được tách cho hoạ sĩ khác ở cùng công đoạn, bạn không thể tải ảnh toàn trang.',
      );
      return;
    }
    if (hasCarvedOutPanelOnPage) {
      showToast(
        'Chưa thể tải ảnh toàn trang',
        'Trang này có khung tranh đã được tách cho người khác, bạn chỉ có thể tải ảnh cho các khung còn lại.',
      );
      return;
    }
    if (hasPanelOnlyAssignmentOnPage) {
      showToast(
        'Chưa thể tải ảnh trang',
        'Bạn đang giữ việc theo khung nên chỉ có thể tải ảnh cho khung được giao.',
      );
      return;
    }
    if (!findPageStageAssignment()) {
      showToast(
        'Chưa thể tải ảnh trang',
        'Bạn cần đang làm một việc được giao cho Trang này trước (hoặc bấm "Bắt đầu").',
      );
      return;
    }
    pageFileInputRef.current?.click();
  };

  const handlePanelFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingPanelId) return;
    await uploadArtworkFileForPanel(uploadingPanelId, file);
  };

  /** Chọn / kéo thả / dán ảnh toàn trang: chỉ giữ lại để xem trước, chưa tải lên. */
  const stagePageFile = (file: File) => {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast('Tệp không hợp lệ', 'Ảnh trang chỉ nhận PNG, JPEG hoặc WEBP.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('Ảnh quá lớn', 'Artwork tối đa 25 MB.');
      return;
    }
    setPendingPageFile(file);
  };

  const handleUploadPendingPage = async () => {
    if (!pendingPageFile) return;
    if (await uploadArtworkFileForPage(pendingPageFile)) setPendingPageFile(null);
  };

  const handlePageFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) stagePageFile(file);
  };

  useEffect(() => {
    if (!pendingPageFile) {
      setPendingPagePreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingPageFile);
    setPendingPagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPageFile]);

  // Đổi trang: bỏ file đang chờ (không áp ảnh của trang này sang trang khác)
  useEffect(() => {
    setPendingPageFile(null);
  }, [selectedPage?.id]);

  // Hướng đọc mặc định cho nhận diện panel = cấu hình Series
  useEffect(() => {
    if (!seriesId) return;
    let alive = true;
    seriesService
      .getSeriesById(seriesId)
      .then((s) => {
        if (alive)
          setSeriesRightToLeft(s.readingDirection === 1 || s.readingDirection === 'RightToLeft');
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [seriesId]);

  const handlePanelFileDrop = async (panelId: string, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(
        'Tệp không hợp lệ',
        'Vui lòng chỉ tải lên tệp định dạng hình ảnh (PNG, JPG, WEBP,...).',
      );
      return;
    }
    await uploadArtworkFileForPanel(panelId, file);
  };

  // Clipboard Paste (Ctrl+V) khi đang chọn một Panel hoặc đang ở chế độ Tải cả trang
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            if (uploadMode === 'page') {
              stagePageFile(file);
            } else if (selectedPanelId) {
              void uploadArtworkFileForPanel(selectedPanelId, file);
            }
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [uploadMode, selectedPanelId, currentChapterId, selectedPage, myInProgress]);

  // Nạp danh sách Chapter thật của Series
  useEffect(() => {
    if (!seriesId) return;
    let isMounted = true;
    setLoadingChapters(true);
    chapterService
      .getChaptersBySeries(seriesId, 1, 50)
      .then((res) => {
        if (!isMounted) return;
        setChapters(res.items);
        if (res.items.length > 0) {
          const matched = res.items.find((c) => c.id === chapterIdFromUrl);
          const chosenId = matched ? matched.id : res.items[0].id;
          setCurrentChapterId(chosenId);
        }
      })
      .catch((err) => {
        console.error('Không thể nạp chapters cho ArtistDesk:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingChapters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [seriesId, chapterIdFromUrl]);

  // Nạp danh sách Scenes của Chapter (V1.2 / CF2)
  useEffect(() => {
    if (!currentChapterId) {
      setScenes([]);
      return;
    }
    scriptLineService
      .getScenesByChapter(currentChapterId)
      .then((data) => setScenes(data))
      .catch((err) => console.error('Lỗi nạp scenes cho chapter:', err));
  }, [currentChapterId]);

  // Nạp Series Bible (Nhân vật, Bối cảnh, Đạo cụ...) cho Series
  useEffect(() => {
    if (!seriesId) return;
    bibleService
      .getSeriesBible(seriesId)
      .then((res) => {
        setBibleEntries(res.entries || []);
      })
      .catch((err) => console.warn('Lỗi nạp series bible:', err));
  }, [seriesId]);

  // Nạp danh sách Elements / Layers của Trang
  const loadElements = useCallback(async (pageId: string) => {
    setLoadingElements(true);
    try {
      const snap = await elementService.getPageSnapshot(pageId);
      setPageElements(snap.elements || []);
    } catch (err: any) {
      console.warn('Lỗi tải elements của trang:', err);
    } finally {
      setLoadingElements(false);
    }
  }, []);

  // Nạp danh sách Panels của Trang được chọn
  const loadPanels = useCallback(async (pageId: string) => {
    setLoadingPanels(true);
    try {
      const data = await panelService.getPanelsByPage(pageId);
      setPanels(data);
      if (data.length > 0) {
        setSelectedPanelId(data[0].id);
      } else {
        setSelectedPanelId(null);
        setSelectedPanelDetail(null);
      }
    } catch (err: any) {
      console.error('Lỗi tải panels của trang:', err);
    } finally {
      setLoadingPanels(false);
    }
  }, []);

  const loadPages = useCallback(async () => {
    if (!currentChapterId) {
      setPages([]);
      setSelectedPage(null);
      setPanels([]);
      setPageElements([]);
      return;
    }
    setLoading(true);
    try {
      const list = await pageService.getPagesByChapter(currentChapterId);
      if (list && list.length > 0) {
        setPages(list);
        const sel = list.find((p) => p.id === selectedPage?.id) || list[0];
        setSelectedPage(sel);
        const detail = await pageService.getPageById(sel.id);
        setPageDetail(detail);
        setNewPageNumber(list.length + 1);
        await Promise.all([
          loadPanels(sel.id),
          loadElements(sel.id),
          loadPageArtworks(currentChapterId, sel.id),
        ]);
      } else {
        setPages([]);
        setSelectedPage(null);
        setPageDetail(null);
        setPanels([]);
        setPageElements([]);
        setPageArtworks([]);
        setNewPageNumber(1);
      }
    } catch (err: any) {
      console.error('Lỗi nạp pages cho chapter:', err);
      showToast('Lỗi nạp trang', err.message || 'Không thể tải danh sách trang');
    } finally {
      setLoading(false);
    }
  }, [currentChapterId, loadPanels, loadElements, loadPageArtworks, selectedPage?.id]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  const handleSelectPage = async (p: PageDto) => {
    setSelectedPage(p);
    if (canvasContainerRef.current) {
      canvasContainerRef.current.scrollTop = 0;
      canvasContainerRef.current.scrollLeft = 0;
    }
    try {
      const detail = await pageService.getPageById(p.id);
      setPageDetail(detail);
      if (currentChapterId) {
        await Promise.all([
          loadPanels(p.id),
          loadElements(p.id),
          loadPageArtworks(currentChapterId, p.id),
        ]);
      } else {
        await Promise.all([loadPanels(p.id), loadElements(p.id)]);
      }
      if (isFitMode) {
        setTimeout(() => {
          setZoomScale(calculateFitScale());
        }, 50);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Thao tác với Layer Ảnh (CF2 / BR-11)
  const handleCreateLayer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPage) return;
    const clientElementId = generateClientId('elem');

    const req: AddElementRequest = {
      elementType: newLayerType,
      x: Number(newLayerX),
      y: Number(newLayerY),
      width: Number(newLayerWidth),
      height: Number(newLayerHeight),
      zIndex: pageElements.length + 1,
      content: newLayerContent || undefined,
      assetId: newLayerAssetId || undefined,
      panelId: newLayerPanelId || undefined,
      rotation: Number(newLayerRotation) || 0,
      bibleEntryId: newLayerBibleEntryId || undefined,
      clientElementId,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ADD_ELEMENT',
        endpoint: `/pages/${selectedPage.id}/elements`,
        method: 'POST',
        payload: req,
        clientRefId: clientElementId,
      });
      const tempItem: ElementSnapshotDto = {
        elementId: clientElementId,
        elementType: newLayerType,
        x: req.x,
        y: req.y,
        width: req.width,
        height: req.height,
        zIndex: req.zIndex,
        content: req.content,
        assetId: req.assetId,
        panelId: req.panelId,
        rotation: req.rotation,
        bibleEntryId: req.bibleEntryId,
        isRemoved: false,
        version: 1,
      };
      setPageElements((prev) => [...prev, tempItem]);
      setSelectedElementId(tempItem.elementId);
      setCreateLayerModalOpen(false);
      showToast('Đã lưu ngoại tuyến', 'Layer đã được lưu tạm trên máy (NFR-09).');
      return;
    }

    try {
      const res = await elementService.addElement(selectedPage.id, req);
      const newItem: ElementSnapshotDto = {
        elementId: res.elementId,
        elementType: res.elementType,
        x: req.x,
        y: req.y,
        width: req.width,
        height: req.height,
        zIndex: req.zIndex,
        content: req.content,
        assetId: res.assetId || req.assetId,
        panelId: res.panelId || req.panelId,
        rotation: res.rotation != null ? res.rotation : req.rotation,
        bibleEntryId: res.bibleEntryId || req.bibleEntryId,
        isRemoved: false,
        version: 1,
      };
      setPageElements((prev) => [...prev, newItem]);
      setSelectedElementId(newItem.elementId);
      setCreateLayerModalOpen(false);
      showToast('Thành công', `Đã thêm layer ${LAYER_LABELS[newLayerType] || newLayerType}!`);
    } catch (err: any) {
      showMutationError('Thất bại', err, 'Không thể tạo layer ảnh');
    }
  };

  const handleRotateLayer = async (elem: ElementSnapshotDto, deltaDeg: number) => {
    if (!selectedPage) return;
    const newRotation = ((((elem.rotation || 0) + deltaDeg) % 360) + 360) % 360;
    try {
      await elementService.moveElement(selectedPage.id, elem.elementId, {
        newX: elem.x,
        newY: elem.y,
        newWidth: elem.width,
        newHeight: elem.height,
        expectedElementVersion: elem.version,
        newRotation,
        newZIndex: elem.zIndex,
      });
      setPageElements((prev) =>
        prev.map((el) =>
          el.elementId === elem.elementId
            ? { ...el, rotation: newRotation, version: (el.version || 1) + 1 }
            : el,
        ),
      );
      showToast('Xoay layer', `Đã xoay layer sang ${newRotation}°`);
    } catch (err: any) {
      showMutationError('Lỗi xoay layer', err);
    }
  };

  const handleChangeLayerZIndex = async (elem: ElementSnapshotDto, deltaZ: number) => {
    if (!selectedPage) return;
    const newZIndex = Math.max(1, elem.zIndex + deltaZ);
    try {
      await elementService.moveElement(selectedPage.id, elem.elementId, {
        newX: elem.x,
        newY: elem.y,
        newWidth: elem.width,
        newHeight: elem.height,
        expectedElementVersion: elem.version,
        newRotation: elem.rotation || 0,
        newZIndex,
      });
      setPageElements((prev) =>
        prev.map((el) =>
          el.elementId === elem.elementId
            ? { ...el, zIndex: newZIndex, version: (el.version || 1) + 1 }
            : el,
        ),
      );
      showToast('Đổi thứ tự lớp', `Đã đổi zIndex sang ${newZIndex}`);
    } catch (err: any) {
      showMutationError('Lỗi đổi lớp', err);
    }
  };

  const handleDeleteLayer = async (elem: ElementSnapshotDto) => {
    if (!selectedPage) return;
    try {
      await elementService.removeElement(selectedPage.id, elem.elementId, elem.version);
      setPageElements((prev) => prev.filter((el) => el.elementId !== elem.elementId));
      if (selectedElementId === elem.elementId) setSelectedElementId(null);
      showToast('Đã xoá layer', 'Đã xoá layer thành công.');
    } catch (err: any) {
      showMutationError('Lỗi xoá layer', err);
    }
  };

  // Khi chọn một Panel, nạp chi tiết PanelDetailDto và danh sách script lines
  useEffect(() => {
    if (!selectedPanelId) {
      setSelectedPanelDetail(null);
      setSceneLines([]);
      return;
    }
    panelService
      .getPanelById(selectedPanelId)
      .then((detail) => {
        setSelectedPanelDetail(detail);
        const box = parseBoundingBox(
          detail.boundingBox,
          selectedPage?.widthPx,
          selectedPage?.heightPx,
        );
        setPanelBoxX(round1(box.percentX));
        setPanelBoxY(round1(box.percentY));
        setPanelBoxW(round1(box.percentW));
        setPanelBoxH(round1(box.percentH));
        setPanelReadingOrder(detail.readingOrder);

        if (detail.sceneId) {
          setLoadingSceneLines(true);
          scriptLineService
            .getSceneById(detail.sceneId)
            .then((res) => {
              setSceneLines(res.scriptLines || []);
            })
            .catch(console.error)
            .finally(() => setLoadingSceneLines(false));
        } else {
          setSceneLines([]);
        }
      })
      .catch(console.error);
  }, [selectedPanelId, selectedPage?.widthPx, selectedPage?.heightPx]);

  // Đổi trang thì bỏ chọn nhiều khung của trang cũ
  useEffect(() => {
    setMultiIds([]);
  }, [selectedPage?.id]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditPages) {
      showToast('Không có quyền', 'Chỉ Producer và Artist mới có quyền tạo trang.');
      return;
    }
    if (!currentChapterId) {
      showToast('Chưa chọn chương', 'Vui lòng chọn hoặc tạo một Chương trước khi thêm trang.');
      return;
    }
    try {
      const created = await pageService.createPage(currentChapterId, {
        pageNumber: newPageNumber,
        layoutFormat: newLayoutFormat,
        widthPx: parseInt(newWidthPx, 10),
        heightPx: parseInt(newHeightPx, 10),
        dpi: parseInt(newDpi, 10),
      });
      setPages((prev) => [...prev, created]);
      setSelectedPage(created);
      setCreateModalOpen(false);
      showToast(
        'Tạo trang thành công',
        `Đã tạo Trang ${created.pageNumber} (${created.layoutFormat} - ${created.dpi} DPI).`,
      );
      await loadPanels(created.id);
    } catch (err: any) {
      showMutationError('Lỗi tạo trang', err);
    }
  };

  const handleUpdateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPage) return;
    try {
      await pageService.updateCanvasSettings(selectedPage.id, {
        widthPx: parseInt(editWidthPx, 10),
        heightPx: parseInt(editHeightPx, 10),
        dpi: parseInt(editDpi, 10),
        layoutFormat: editLayout,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === selectedPage.id
            ? {
                ...p,
                widthPx: parseInt(editWidthPx, 10),
                heightPx: parseInt(editHeightPx, 10),
                dpi: parseInt(editDpi, 10),
                layoutFormat: editLayout,
              }
            : p,
        ),
      );
      setSettingsModalOpen(false);
      showToast('Cập nhật Canvas', 'Đã lưu cài đặt kích thước và DPI khổ giấy.');
    } catch (err: any) {
      showMutationError('Lỗi', err);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!canEditPages) {
      showToast('Không có quyền', 'Chỉ Producer và Artist mới có quyền xoá trang.');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa trang này khỏi Chapter?')) return;
    try {
      await pageService.deletePage(pageId);
      const remaining = pages.filter((p) => p.id !== pageId);
      setPages(remaining);
      if (selectedPage?.id === pageId) {
        setSelectedPage(remaining[0] || null);
        if (remaining[0]) {
          await loadPanels(remaining[0].id);
        } else {
          setPanels([]);
        }
      }
      showToast('Đã xóa trang', 'Trang đã được gỡ khỏi chapter.');
    } catch (err: any) {
      showDeleteError('Không xoá được trang', err);
    }
  };

  // Thêm Panel thủ công (POST /api/pages/{pageId}/panels)
  const handleCreatePanel = async () => {
    if (!selectedPage || !canEditPages) return;
    const pageWidth = selectedPage.widthPx || 1200;
    const pageHeight = selectedPage.heightPx || 1800;
    const nextNum = panels.length + 1;
    const defaultY = Math.min(75, 5 + ((panels.length * 25) % 70));
    const defaultBox = buildBoundingBoxJson(10, defaultY, 80, 22, pageWidth, pageHeight);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const clientPanelId = generateClientId('panel');
      offlineQueueService.enqueue({
        type: 'CREATE_PANEL',
        endpoint: `/pages/${selectedPage.id}/panels`,
        method: 'POST',
        payload: {
          panelNumber: nextNum,
          readingOrder: nextNum,
          boundingBox: defaultBox,
        },
        clientRefId: clientPanelId,
      });
      const tempPanel: PanelDto = {
        id: clientPanelId,
        pageId: selectedPage.id,
        panelNumber: nextNum,
        readingOrder: nextNum,
        boundingBox: defaultBox,
        createdAt: new Date().toISOString(),
      };
      setPanels((prev) => [...prev, tempPanel]);
      setSelectedPanelId(tempPanel.id);
      showToast('Đã lưu ngoại tuyến', `Đã tạo Panel #${nextNum} tạm thời trên máy.`);
      return;
    }

    try {
      const created = await panelService.createPanel(selectedPage.id, {
        panelNumber: nextNum,
        readingOrder: nextNum,
        boundingBox: defaultBox,
      });
      setPanels((prev) => [...prev, created]);
      setSelectedPanelId(created.id);
      showToast(
        'Tạo Panel thành công',
        `Đã tạo Panel #${created.panelNumber} (Thứ tự đọc #${created.readingOrder}).`,
      );
    } catch (err: any) {
      const isNetworkError = isNetworkFailure(err);
      if (isNetworkError) {
        const clientPanelId = generateClientId('panel');
        offlineQueueService.enqueue({
          type: 'CREATE_PANEL',
          endpoint: `/pages/${selectedPage.id}/panels`,
          method: 'POST',
          payload: {
            panelNumber: nextNum,
            readingOrder: nextNum,
            boundingBox: defaultBox,
          },
          clientRefId: clientPanelId,
        });
        const tempPanel: PanelDto = {
          id: clientPanelId,
          pageId: selectedPage.id,
          panelNumber: nextNum,
          readingOrder: nextNum,
          boundingBox: defaultBox,
          createdAt: new Date().toISOString(),
        };
        setPanels((prev) => [...prev, tempPanel]);
        setSelectedPanelId(tempPanel.id);
        showToast('Đã lưu ngoại tuyến', `Mất mạng: Đã tạo Panel #${nextNum} tạm thời trên máy.`);
      } else {
        showMutationError('Lỗi tạo panel', err);
      }
    }
  };

  // Xóa Panel (DELETE /api/panels/{panelId})
  const handleDeletePanel = async (panelId: string) => {
    if (!canEditPages) return;
    if (!confirm('Bạn có chắc chắn muốn xóa ô panel này khỏi trang?')) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'DELETE_PANEL',
        endpoint: `/panels/${panelId}`,
        method: 'DELETE',
        payload: {},
        clientRefId: panelId,
      });
      const remaining = panels.filter((p) => p.id !== panelId);
      setPanels(remaining);
      if (selectedPanelId === panelId) {
        setSelectedPanelId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast('Đã lưu ngoại tuyến', 'Đã xóa khung panel tạm thời trên máy.');
      return;
    }

    try {
      await panelService.deletePanel(panelId);
      const remaining = panels.filter((p) => p.id !== panelId);
      setPanels(remaining);
      if (selectedPanelId === panelId) {
        setSelectedPanelId(remaining.length > 0 ? remaining[0].id : null);
      }
      showToast('Đã xóa panel', 'Khung panel đã được xóa thành công.');
    } catch (err: any) {
      const isNetworkError = isNetworkFailure(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'DELETE_PANEL',
          endpoint: `/panels/${panelId}`,
          method: 'DELETE',
          payload: {},
          clientRefId: panelId,
        });
        const remaining = panels.filter((p) => p.id !== panelId);
        setPanels(remaining);
        if (selectedPanelId === panelId) {
          setSelectedPanelId(remaining.length > 0 ? remaining[0].id : null);
        }
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã xóa khung panel tạm thời trên máy.');
      } else {
        showDeleteError('Không xoá được panel', err);
      }
    }
  };

  /**
   * BR-11 / CF4 4.2: 409 CONFLICT khi sửa khung = có người vừa sửa cùng khung (version lệch).
   * Báo và tải lại bố cục mới nhất, KHÔNG tự gửi lại bản cũ. Trả true nếu đã xử lý.
   */
  const handlePanelVersionConflict = (err: any): boolean => {
    if (err?.code !== 'CONFLICT' || !selectedPage) return false;
    setConflictPanelId(selectedPanelId || undefined);
    setConflictErrorMsg(
      err.message || 'Phiên bản khung tranh đã thay đổi trên máy chủ bởi người dùng khác.',
    );
    setConflictModalOpen(true);
    showToast(
      'Khung vừa được người khác sửa (409 Conflict)',
      `${err.message || 'Phiên bản khung đã thay đổi.'} Vui lòng kiểm tra xung đột.`,
    );
    void loadPanels(selectedPage.id);
    return true;
  };

  // Cập nhật tọa độ Panel (PUT /api/panels/{panelId}/coordinates)
  const handleSavePanelCoords = async () => {
    if (!selectedPanelId) return;
    const pageWidth = selectedPage?.widthPx || 1200;
    const pageHeight = selectedPage?.heightPx || 1800;
    const existing = selectedPanelDetail?.boundingBox
      ? parseBoundingBox(selectedPanelDetail.boundingBox, pageWidth, pageHeight)
      : null;
    const boxJson = buildBoundingBoxJson(
      Number(panelBoxX),
      Number(panelBoxY),
      Number(panelBoxW),
      Number(panelBoxH),
      pageWidth,
      pageHeight,
      { corners: existing?.corners, borderless: existing?.borderless },
    );

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'UPDATE_PANEL_COORDINATES',
        endpoint: `/panels/${selectedPanelId}/coordinates`,
        method: 'PUT',
        payload: {
          boundingBox: boxJson,
          readingOrder: Number(panelReadingOrder),
        },
        clientRefId: selectedPanelId,
      });
      setPanels((prev) =>
        prev.map((p) =>
          p.id === selectedPanelId
            ? { ...p, boundingBox: boxJson, readingOrder: Number(panelReadingOrder) }
            : p,
        ),
      );
      if (selectedPanelDetail) {
        setSelectedPanelDetail({
          ...selectedPanelDetail,
          boundingBox: boxJson,
          readingOrder: Number(panelReadingOrder),
        });
      }
      showToast('Đã lưu ngoại tuyến', 'Tọa độ panel đã được lưu tạm trên máy (NFR-09).');
      return;
    }

    try {
      const updated = await panelService.updatePanelCoordinates(selectedPanelId, {
        boundingBox: boxJson,
        readingOrder: Number(panelReadingOrder),
        expectedVersion: panels.find((p) => p.id === selectedPanelId)?.version,
      });
      setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? updated : p)));
      if (selectedPanelDetail) {
        setSelectedPanelDetail({
          ...selectedPanelDetail,
          boundingBox: updated.boundingBox,
          readingOrder: updated.readingOrder,
        });
      }
      showToast(
        'Đã lưu tọa độ panel',
        `Tọa độ và thứ tự đọc #${updated.readingOrder} đã được cập nhật.`,
      );
    } catch (err: any) {
      const isNetworkError = isNetworkFailure(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'UPDATE_PANEL_COORDINATES',
          endpoint: `/panels/${selectedPanelId}/coordinates`,
          method: 'PUT',
          payload: {
            boundingBox: boxJson,
            readingOrder: Number(panelReadingOrder),
          },
          clientRefId: selectedPanelId,
        });
        setPanels((prev) =>
          prev.map((p) =>
            p.id === selectedPanelId
              ? { ...p, boundingBox: boxJson, readingOrder: Number(panelReadingOrder) }
              : p,
          ),
        );
        if (selectedPanelDetail) {
          setSelectedPanelDetail({
            ...selectedPanelDetail,
            boundingBox: boxJson,
            readingOrder: Number(panelReadingOrder),
          });
        }
        showToast(
          'Đã lưu ngoại tuyến',
          'Mất mạng: Tọa độ panel đã được lưu tạm trên máy (NFR-09).',
        );
      } else if (!handlePanelVersionConflict(err)) {
        showMutationError('Lỗi lưu tọa độ', err);
      }
    }
  };

  // ───────── Bố cục khung: kéo thả, đổi cỡ, căn chỉnh, chia lại N khung ─────────
  const rectOfPanel = (p: PanelDto): Rect => {
    const box = parseBoundingBox(
      p.boundingBox,
      selectedPage?.widthPx || 1200,
      selectedPage?.heightPx || 1800,
    );
    return { x: box.percentX, y: box.percentY, w: box.percentW, h: box.percentH };
  };
  const rectOfId = (id: string): Rect => {
    const p = panels.find((x) => x.id === id);
    return liveRef.current[id] ?? (p ? rectOfPanel(p) : { x: 0, y: 0, w: 10, h: 10 });
  };
  const targetIds = (): string[] =>
    multiIds.length > 0 ? multiIds : selectedPanelId ? [selectedPanelId] : [];

  // Lưu toạ độ nhiều khung một lượt (mỗi khung một PUT; mất mạng thì xếp hàng chờ như cũ)
  const persistRects = async (updates: Array<{ id: string; rect: Rect }>) => {
    if (!selectedPage || updates.length === 0) return;
    const pw = selectedPage.widthPx || 1200;
    const ph = selectedPage.heightPx || 1800;
    try {
      const results = await Promise.all(
        updates.map(async ({ id, rect }) => {
          const p = panels.find((x) => x.id === id);
          if (!p) return null;
          const existing = p.boundingBox ? parseBoundingBox(p.boundingBox, pw, ph) : null;
          const r = roundRect(clampRect(rect));
          const boundingBox = buildBoundingBoxJson(r.x, r.y, r.w, r.h, pw, ph, {
            corners: existing?.corners,
            borderless: existing?.borderless,
          });
          const payload = { boundingBox, readingOrder: p.readingOrder };
          const offline = typeof navigator !== 'undefined' && !navigator.onLine;
          if (!offline) {
            try {
              // BR-11: online gửi version đã thấy; hàng chờ ngoại tuyến không gửi để các lần sửa nối tiếp không tự xung đột
              return await panelService.updatePanelCoordinates(id, {
                ...payload,
                expectedVersion: p.version,
              });
            } catch (err: any) {
              // Chỉ lỗi mạng (không có status HTTP) mới chuyển sang hàng chờ ngoại tuyến
              if (err?.status !== undefined) throw err;
            }
          }
          offlineQueueService.enqueue({
            type: 'UPDATE_PANEL_COORDINATES',
            endpoint: `/panels/${id}/coordinates`,
            method: 'PUT',
            payload,
            clientRefId: id,
          });
          return { ...p, boundingBox } as PanelDto;
        }),
      );
      const byId = new Map(results.filter((x): x is PanelDto => Boolean(x)).map((x) => [x.id, x]));
      setPanels((prev) => prev.map((p) => byId.get(p.id) ?? p));
      const sel = selectedPanelId ? byId.get(selectedPanelId) : undefined;
      if (sel) {
        const b = parseBoundingBox(sel.boundingBox, pw, ph);
        setPanelBoxX(round1(b.percentX));
        setPanelBoxY(round1(b.percentY));
        setPanelBoxW(round1(b.percentW));
        setPanelBoxH(round1(b.percentH));
        setSelectedPanelDetail((d) => (d ? { ...d, boundingBox: sel.boundingBox } : d));
      }
    } catch (err: any) {
      if (!handlePanelVersionConflict(err))
        showMutationError('Lỗi lưu bố cục', err, 'Không lưu được vị trí khung.');
    }
  };
  useEffect(() => {
    latestRef.current = { persistRects };
  });

  const handlePanelPointerDown = (p: PanelDto, e: React.PointerEvent) => {
    if (!canEditPages || e.button !== 0) return;
    if (e.shiftKey) {
      const base = multiIds.length > 0 ? multiIds : selectedPanelId ? [selectedPanelId] : [];
      setMultiIds(base.includes(p.id) ? base.filter((x) => x !== p.id) : [...base, p.id]);
      return;
    }
    if (!multiIds.includes(p.id)) setMultiIds([]);
    setSelectedPanelId(p.id);
    startDrag(p.id, 'move', e);
  };

  const startDrag = (id: string, mode: DragMode, e: React.PointerEvent) => {
    if (!canEditPages || e.button !== 0 || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const ids = mode === 'move' && multiIds.length > 1 && multiIds.includes(id) ? multiIds : [id];
    const starts: Record<string, Rect> = {};
    ids.forEach((x) => {
      starts[x] = rectOfId(x);
    });
    dragRef.current = {
      id,
      mode,
      ids,
      starts,
      others: panels.filter((o) => !ids.includes(o.id)).map(rectOfPanel),
      startX: e.clientX,
      startY: e.clientY,
      w: bounds.width,
      h: bounds.height,
      moved: false,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 3) return;
      d.moved = true;
      const dx = ((e.clientX - d.startX) / d.w) * 100;
      const dy = ((e.clientY - d.startY) / d.h) * 100;
      const next: Record<string, Rect> = {};
      if (d.ids.length > 1) {
        d.ids.forEach((id) => {
          next[id] = roundRect(moveRect(d.starts[id], dx, dy));
        });
        setDragGuides({ guides: [], gaps: [] });
      } else {
        const start = d.starts[d.id];
        const raw = d.mode === 'move' ? moveRect(start, dx, dy) : resizeRect(start, d.mode, dx, dy);
        // Giữ Alt để kéo tự do, không hít
        const snapped = e.altKey
          ? { rect: raw, guides: [], gaps: [] }
          : snapRect(raw, d.mode, d.others);
        next[d.id] = roundRect(snapped.rect);
        setDragGuides({ guides: snapped.guides, gaps: snapped.gaps });
      }
      liveRef.current = next;
      setLiveRects(next);
    };
    const onUp = async () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      setDragGuides({ guides: [], gaps: [] });
      if (!d.moved) return;
      const updates = d.ids
        .filter((id) => liveRef.current[id])
        .map((id) => ({ id, rect: liveRef.current[id] }));
      await latestRef.current?.persistRects(updates);
      liveRef.current = {};
      setLiveRects({});
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    };
  }, []);

  // Phím mũi tên nhích khung đang chọn (0.5%, giữ Shift = 2%); lưu sau khi dừng bấm
  const handleCanvasKeyDown = (e: React.KeyboardEvent) => {
    if (!canEditPages || !layoutEdit) return;
    const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!keys.includes(e.key)) return;
    const ids = targetIds();
    if (ids.length === 0) return;
    e.preventDefault();
    const step = e.shiftKey ? 2 : 0.5;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    const next: Record<string, Rect> = { ...liveRef.current };
    ids.forEach((id) => {
      next[id] = roundRect(moveRect(rectOfId(id), dx, dy));
    });
    liveRef.current = next;
    setLiveRects(next);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(async () => {
      const updates = ids.map((id) => ({ id, rect: liveRef.current[id] })).filter((u) => u.rect);
      await latestRef.current?.persistRects(updates);
      liveRef.current = {};
      setLiveRects({});
    }, 600);
  };

  const runLayoutAction = async (action: () => Promise<void>) => {
    setLayoutBusy(true);
    try {
      await action();
    } finally {
      setLayoutBusy(false);
    }
  };

  const handleAlign = (mode: AlignMode) =>
    runLayoutAction(async () => {
      const ids = targetIds();
      if (ids.length < 2) return;
      const out = alignRects(ids.map(rectOfId), mode);
      await persistRects(ids.map((id, i) => ({ id, rect: out[i] })));
    });

  const handleDistribute = (axis: 'x' | 'y') =>
    runLayoutAction(async () => {
      const ids = targetIds();
      if (ids.length < 3) return;
      const out = distributeRects(ids.map(rectOfId), axis);
      await persistRects(ids.map((id, i) => ({ id, rect: out[i] })));
    });

  const handleStraighten = () =>
    runLayoutAction(async () => {
      const ids = panels.map((p) => p.id);
      const out = straightenRects(ids.map(rectOfId));
      await persistRects(ids.map((id, i) => ({ id, rect: out[i] })));
      showToast('Đã căn thẳng', 'Các cạnh lệch nhẹ đã được gom về cùng một đường.');
    });

  // Chia đôi Panel đang chọn (dọc = 2 cột, ngang = 2 hàng): PUT khung gốc rồi POST khung mới; POST lỗi thì hoàn tác PUT
  const splitBlockedReason = (axis: SplitAxis): string | null => {
    const p = panels.find((x) => x.id === selectedPanelId);
    if (!p || !selectedPage) return 'Chọn một khung trước.';
    if (!canEditPages) return 'Chỉ Producer và Artist được sửa khung.';
    const box = parseBoundingBox(p.boundingBox, selectedPage.widthPx, selectedPage.heightPx);
    if (box.corners && box.corners.length >= 3)
      return 'Khung nghiêng không chia hình chữ nhật được.';
    const res = splitPanelRect(rectOfPanel(p), axis);
    return 'error' in res ? res.error : null;
  };

  const handleSplitPanel = (axis: SplitAxis) =>
    runLayoutAction(async () => {
      const p = panels.find((x) => x.id === selectedPanelId);
      if (!p || !selectedPage) return;
      const blocked = splitBlockedReason(axis);
      if (blocked) {
        showToast('Chưa thể chia khung', blocked);
        return;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        showToast('Cần kết nối mạng', 'Chia khung cần tạo khung mới trên máy chủ.');
        return;
      }
      const pw = selectedPage.widthPx || 1200;
      const ph = selectedPage.heightPx || 1800;
      const res = splitPanelRect(rectOfPanel(p), axis);
      if ('error' in res) return;
      const existing = parseBoundingBox(p.boundingBox, pw, ph);
      const extra = { borderless: existing.borderless };
      const toJson = (r: Rect) => buildBoundingBoxJson(r.x, r.y, r.w, r.h, pw, ph, extra);
      try {
        const { updated, created } = await splitPanelWithRollback(
          {
            updateCoordinates: panelService.updatePanelCoordinates,
            createPanel: panelService.createPanel,
          },
          {
            panel: p,
            pageId: selectedPage.id,
            firstBox: toJson(res.first),
            secondBox: toJson(res.second),
            newPanelNumber: panels.reduce((m, x) => Math.max(m, x.panelNumber), 0) + 1,
            newReadingOrder: panels.reduce((m, x) => Math.max(m, x.readingOrder), 0) + 1,
          },
        );
        setPanels((prev) => [...prev.map((x) => (x.id === p.id ? updated : x)), created]);
        setSelectedPanelDetail((d) => (d ? { ...d, boundingBox: updated.boundingBox } : d));
        setPanelBoxX(round1(res.first.x));
        setPanelBoxY(round1(res.first.y));
        setPanelBoxW(round1(res.first.w));
        setPanelBoxH(round1(res.first.h));
        setMultiIds([]);
        showToast(
          'Đã chia khung',
          `Khung #${p.panelNumber} được chia đôi; khung mới #${created.panelNumber} cần tải ảnh riêng.`,
        );
      } catch (err: any) {
        // BE từ chối (vd 409: chương không còn ở trạng thái sản xuất, hoặc khung vừa bị người khác sửa): giữ nguyên bố cục
        if (!handlePanelVersionConflict(err))
          showMutationError('Không chia được khung', err, 'Bố cục được giữ nguyên.');
      }
    });

  // Editor trả về yêu cầu thêm khung: chia lại bố cục thành N khung đều, giữ khung/ảnh đã có
  const handleRelayout = (preset: SplitPreset, count: number, margin: number, gap: number) =>
    runLayoutAction(async () => {
      if (!selectedPage || !canEditPages) return;
      if (count < panels.length) {
        showToast(
          'Chưa thể giảm số khung',
          'Hãy xóa bớt khung thủ công (nếu không còn việc đang giao) rồi chia lại.',
        );
        return;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        showToast('Cần kết nối mạng', 'Chia lại bố cục cần tạo khung mới trên máy chủ.');
        return;
      }
      const pw = selectedPage.widthPx || 1200;
      const ph = selectedPage.heightPx || 1800;
      const cells = splitEvenly(preset, count, margin, gap);
      const sorted = [...panels].sort((a, b) => a.readingOrder - b.readingOrder);
      await persistRects(sorted.map((p, i) => ({ id: p.id, rect: cells[i] })));

      const created: PanelDto[] = [];
      let nextNumber = panels.reduce((m, p) => Math.max(m, p.panelNumber), 0);
      let nextOrder = panels.reduce((m, p) => Math.max(m, p.readingOrder), 0);
      try {
        for (let i = sorted.length; i < count; i += 1) {
          nextNumber += 1;
          nextOrder += 1;
          const r = cells[i];
          created.push(
            await panelService.createPanel(selectedPage.id, {
              panelNumber: nextNumber,
              readingOrder: nextOrder,
              boundingBox: buildBoundingBoxJson(r.x, r.y, r.w, r.h, pw, ph),
            }),
          );
        }
      } catch (err: any) {
        showMutationError('Lỗi tạo khung mới', err, 'Không tạo được khung mới.');
      }
      if (created.length > 0) setPanels((prev) => [...prev, ...created]);
      setMultiIds([]);
      showToast(
        'Đã chia lại bố cục',
        created.length > 0
          ? `Trang có ${panels.length + created.length} khung đều nhau. Khung mới cần tải ảnh riêng.`
          : 'Các khung đã được xếp lại đều nhau.',
      );
    });

  // Gán Phân cảnh cho Panel (PUT /api/panels/{panelId}/scene)
  const handleAssignScene = async (sceneId: string | null) => {
    if (!selectedPanelId) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ASSIGN_PANEL_SCENE',
        endpoint: `/panels/${selectedPanelId}/scene`,
        method: 'PUT',
        payload: { sceneId },
        clientRefId: selectedPanelId,
      });
      setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? { ...p, sceneId } : p)));
      if (selectedPanelDetail) {
        setSelectedPanelDetail({ ...selectedPanelDetail, sceneId });
      }
      showToast('Đã lưu ngoại tuyến', 'Liên kết phân cảnh đã được lưu tạm trên máy.');
      return;
    }

    try {
      const updated = await panelService.assignPanelScene(selectedPanelId, sceneId);
      setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? updated : p)));
      if (selectedPanelDetail) {
        setSelectedPanelDetail({ ...selectedPanelDetail, sceneId });
      }
      if (sceneId) {
        setLoadingSceneLines(true);
        const sceneDetail = await scriptLineService.getSceneById(sceneId);
        setSceneLines(sceneDetail.scriptLines || []);
        setLoadingSceneLines(false);
      } else {
        setSceneLines([]);
      }
      showToast(
        'Đã cập nhật phân cảnh',
        sceneId ? 'Đã liên kết Panel với Phân cảnh.' : 'Đã bỏ liên kết Phân cảnh.',
      );
    } catch (err: any) {
      const isNetworkError = isNetworkFailure(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'ASSIGN_PANEL_SCENE',
          endpoint: `/panels/${selectedPanelId}/scene`,
          method: 'PUT',
          payload: { sceneId },
          clientRefId: selectedPanelId,
        });
        setPanels((prev) => prev.map((p) => (p.id === selectedPanelId ? { ...p, sceneId } : p)));
        if (selectedPanelDetail) {
          setSelectedPanelDetail({ ...selectedPanelDetail, sceneId });
        }
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Liên kết phân cảnh đã được lưu tạm trên máy.');
      } else {
        showMutationError('Lỗi gán phân cảnh', err);
      }
    }
  };

  // Neo dòng kịch bản vào Panel (PUT /api/panels/{panelId}/script-lines)
  const handleToggleScriptLine = async (lineId: string) => {
    if (!selectedPanelId || !selectedPanelDetail) return;
    const currentIds = selectedPanelDetail.scriptLineIds || [];
    const newIds = currentIds.includes(lineId)
      ? currentIds.filter((id) => id !== lineId)
      : [...currentIds, lineId];

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ASSIGN_PANEL_SCRIPT_LINES',
        endpoint: `/panels/${selectedPanelId}/script-lines`,
        method: 'PUT',
        payload: { scriptLineIds: newIds },
        clientRefId: selectedPanelId,
      });
      setSelectedPanelDetail({ ...selectedPanelDetail, scriptLineIds: newIds });
      showToast('Đã lưu ngoại tuyến', `Đã lưu tạm neo ${newIds.length} dòng kịch bản.`);
      return;
    }

    try {
      await panelService.assignPanelScriptLines(selectedPanelId, newIds);
      setSelectedPanelDetail({ ...selectedPanelDetail, scriptLineIds: newIds });
      showToast('Cập nhật dòng thoại', `Đã neo ${newIds.length} dòng kịch bản vào Panel này.`);
    } catch (err: any) {
      const isNetworkError = isNetworkFailure(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'ASSIGN_PANEL_SCRIPT_LINES',
          endpoint: `/panels/${selectedPanelId}/script-lines`,
          method: 'PUT',
          payload: { scriptLineIds: newIds },
          clientRefId: selectedPanelId,
        });
        setSelectedPanelDetail({ ...selectedPanelDetail, scriptLineIds: newIds });
        showToast('Đã lưu ngoại tuyến', `Mất mạng: Đã lưu tạm neo ${newIds.length} dòng kịch bản.`);
      } else {
        showMutationError('Lỗi neo kịch bản', err);
      }
    }
  };

  // ---- Trạng thái việc & hành động chính theo ngữ cảnh (khung đang chọn, hoặc cả trang) ----
  const pickForTarget = <T extends { entityType: string; targetEntityId: string }>(list: T[]) =>
    (selectedPanelId
      ? list.find((a) => a.entityType === 'Panel' && a.targetEntityId === selectedPanelId)
      : undefined) ??
    (selectedPage
      ? list.find((a) => a.entityType === 'Page' && a.targetEntityId === selectedPage.id)
      : undefined);
  const myWork = currentChapterId
    ? pickForTarget(
        [...myChangesRequested, ...myInProgress, ...myAssigned].filter(
          (a) => a.chapterId === currentChapterId,
        ),
      )
    : undefined;
  const targetTask = myWork ? undefined : pickForTarget(tasks);
  const workStatus = String(myWork?.status ?? targetTask?.status ?? '');
  const workStageName = myWork
    ? stageLabel(myWork.pipelineStageId) || myWork.stageName
    : targetTask
      ? stageLabel(targetTask.pipelineStageId) || targetTask.stageName
      : undefined;
  const workBadge = workStatus
    ? (WORK_STATUS[workStatus] ?? { label: workStatus, tone: LOCKED_TONE })
    : null;
  const uploadBlockedReason = !canEditPages
    ? 'Bạn chỉ có quyền xem trang này'
    : workStatus === 'Approved'
      ? 'Việc đã duyệt — chỉ xem, không tải ảnh mới'
      : workStatus === 'Submitted' || workStatus === 'UnderReview'
        ? 'Đang chờ duyệt — tạm khóa tải ảnh cho đến khi có kết quả'
        : workStatus === 'Blocked'
          ? 'Công đoạn trước chưa xong — chưa thể bắt đầu'
          : 'Bạn chưa có việc đang làm cho trang hoặc khung này';
  const pendingForTarget = selectedPage ? findPendingAssigned(selectedPanelId ?? '') : undefined;
  const primaryCta: {
    label: string;
    icon: React.ReactNode;
    action: 'create' | 'start' | 'uploadPanel' | 'none';
    disabled: boolean;
    reason?: string;
    title?: string;
    testId: string;
  } | null = (() => {
    if (!selectedPage) {
      return canEditPages && currentChapterId
        ? {
            label: 'Tạo trang mới',
            icon: <Plus className='w-3.5 h-3.5' />,
            action: 'create',
            disabled: false,
            testId: 'cta-create-page',
          }
        : null;
    }
    if (!canEditPages) return null;
    if (pendingForTarget) {
      return {
        label: 'Bắt đầu việc',
        icon: <Play className='w-3.5 h-3.5 fill-current' />,
        action: 'start',
        disabled: startingAssignmentPanelId !== null,
        testId: 'cta-start-work',
      };
    }
    // Chế độ cả trang: thanh PageArtworkWorkflow ngay trên canvas đã có nút tải/nhận diện, không lặp CTA
    if (uploadMode === 'page') return null;
    if (selectedPanelDetail) {
      const ok = Boolean(findStageAssignment(selectedPanelDetail.id));
      return {
        label: artFor(selectedPanelDetail.id) ? 'Tải bản mới' : 'Tải ảnh khung',
        title: `Tải ảnh cho Khung #${selectedPanelDetail.panelNumber}`,
        icon: <Upload className='w-3.5 h-3.5' />,
        action: 'uploadPanel',
        disabled: !ok,
        reason: ok ? undefined : uploadBlockedReason,
        testId: 'cta-upload-panel',
      };
    }
    return {
      label: 'Tải ảnh',
      icon: <Upload className='w-3.5 h-3.5' />,
      action: 'none',
      disabled: true,
      reason: 'Chọn một khung trên trang, hoặc mở "Tải ảnh" → "Cả trang"',
      testId: 'cta-upload-panel',
    };
  })();
  const runPrimaryCta = (action: NonNullable<typeof primaryCta>['action']) => {
    if (action === 'create') setCreateModalOpen(true);
    else if (action === 'start')
      void handleStartAndUploadPanel(uploadMode === 'page' ? null : selectedPanelId);
    else if (action === 'uploadPanel' && selectedPanelId) handleTriggerUploadPanel(selectedPanelId);
  };
  // Khung đang chọn (dùng trong Chi tiết → Khung / Phiên bản)
  const panelArt = selectedPanelDetail ? artFor(selectedPanelDetail.id) : undefined;
  const panelArtUrl = panelArt ? panelArtworkUrls[panelArt.id] : null;
  const canUpload = selectedPanelDetail
    ? Boolean(findStageAssignment(selectedPanelDetail.id))
    : false;
  const pendingPanel = selectedPanelDetail
    ? findPendingAssigned(selectedPanelDetail.id)
    : undefined;
  const feedbackAsg = selectedPage
    ? findFeedbackAssignment(selectedPanelId ?? undefined)
    : undefined;
  const hasFeedback = Boolean(
    feedbackAsg && (feedbackAsg.status === 'ReworkRequired' || feedbackAsg.lastFeedbackComment),
  );
  const openDetails = (tab?: typeof activeRightTab) => {
    if (tab) setActiveRightTab(tab);
    setIsRightCollapsed(false);
  };
  const groupByStage = (arts: AssetReferenceDto[]) => {
    const order = (id: string) => stages.find((s) => s.id === id)?.stageOrder ?? 999;
    const map = new Map<string, AssetReferenceDto[]>();
    arts.forEach((a) => map.set(a.pipelineStageId, [...(map.get(a.pipelineStageId) ?? []), a]));
    return [...map.entries()]
      .sort((x, y) => order(x[0]) - order(y[0]))
      .map(([stageId, list]) => ({
        stageId,
        list: [...list].sort((a, b) => b.versionNumber - a.versionNumber),
      }));
  };
  const renderVersionList = (
    arts: AssetReferenceDto[],
    currentId: string | undefined,
    testId: string,
  ) =>
    arts.length === 0 ? (
      <p className='text-xs text-[#57534E] italic'>Chưa có phiên bản nào.</p>
    ) : (
      <div className='space-y-2' data-testid={testId}>
        {groupByStage(arts).map(({ stageId, list }) => (
          <div key={stageId} className='space-y-1'>
            <div className='text-[11px] font-semibold text-[#57534E]'>
              {stageLabel(stageId) || 'Công đoạn'} · {list.length} bản
            </div>
            {list.map((v) => {
              const isCurrent = v.id === currentId;
              const name = `${stageLabel(v.pipelineStageId) || 'Bản'} v${v.versionNumber}`;
              return (
                <button
                  key={v.id}
                  type='button'
                  onClick={() => setPreviewArt(v)}
                  data-testid={`version-item-${v.id}`}
                  aria-label={`Mở lớn ${name}${isCurrent ? ' (đang xem)' : ''}`}
                  className={`w-full p-1.5 rounded-lg border flex items-center gap-2 text-xs cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                    isCurrent
                      ? 'bg-[#FFF2E6] border-[#F97316]/40'
                      : 'bg-[#FCFBF8] border-[#D8D2C5] hover:border-[#F97316]/40'
                  }`}
                >
                  <span className='w-10 h-10 shrink-0 rounded border border-[#D8D2C5] bg-white overflow-hidden flex items-center justify-center'>
                    {panelArtworkUrls[v.id] ? (
                      <img
                        src={toThumbnailUrl(panelArtworkUrls[v.id])}
                        alt=''
                        className='max-w-full max-h-full object-contain'
                      />
                    ) : (
                      <ImageIcon className='w-4 h-4 text-[#57534E]/50' />
                    )}
                  </span>
                  <span className='min-w-0 flex-1 text-left'>
                    <span className='block font-mono font-bold text-[#1C1917]'>{name}</span>
                    <span className='block truncate text-[11px] text-[#57534E]'>
                      {v.fileName} · {Math.round(v.sizeBytes / 1024)} KB
                    </span>
                  </span>
                  {isCurrent && (
                    <span className='text-[10px] font-bold text-[#C2410C] bg-white border border-[#F97316]/30 px-1 rounded shrink-0'>
                      Đang xem
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  const viewedPageLabel = pageArt
    ? `Ảnh cả trang ${stageLabel(pageArt.pipelineStageId)} v${pageArt.versionNumber}`
    : 'Chưa có ảnh cả trang';
  const toolbarBtn =
    'h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#F97316] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 disabled:border-stone-200';
  const toolbarIdle = 'bg-[#FCFBF8] text-[#1C1917] border-[#D8D2C5] hover:bg-[#F3F0E9]';
  const toolbarOn = 'bg-[#FFF2E6] text-[#C2410C] border-[#F97316]/50';
  const menuItem =
    'w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-[#F3F0E9] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] disabled:text-stone-400 disabled:cursor-not-allowed disabled:hover:bg-transparent';

  return (
    <div
      className='flex-1 basis-0 min-h-0 w-full flex flex-col bg-[#F3F0E9] p-2 gap-2 overflow-hidden'
      data-testid='artist-desk'
    >
      {/* Toast */}
      {toast && (
        <div className='fixed top-6 right-6 z-50 bg-[#1C1917] text-[#FCFBF8] px-4 py-3 rounded-xl shadow-2xl border border-[#D8D2C5]/30 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200'>
          <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
          <div>
            <div className='text-xs font-bold'>{toast.title}</div>
            <div className='text-xs text-[#57534E]'>{toast.desc}</div>
          </div>
          <button
            onClick={() => setToast(null)}
            className='ml-2 text-[#57534E] hover:text-white cursor-pointer'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* NFR-09 Offline Status Indicator */}
      <OfflineStatusBanner />

      {/* Toolbar chính: Ngữ cảnh · Ảnh hiển thị → Sửa bố cục → Tải ảnh → CTA → Chi tiết → Trang ⋯ → Zoom */}
      <div
        className='shrink-0 relative z-30 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl px-1.5 py-1 flex flex-wrap items-center gap-1 min-w-0'
        role='toolbar'
        aria-label='Thanh công cụ bàn vẽ'
        data-testid='artist-main-toolbar'
      >
        <button
          type='button'
          onClick={() => setIsLeftCollapsed((v) => !v)}
          aria-expanded={!isLeftCollapsed}
          aria-controls='artist-left-column'
          aria-label={isLeftCollapsed ? 'Mở cột Trang / Kịch bản' : 'Thu gọn cột Trang / Kịch bản'}
          title={isLeftCollapsed ? 'Mở cột Trang / Kịch bản' : 'Thu gọn cột Trang / Kịch bản'}
          data-testid='toggle-left-column'
          className={`${toolbarBtn} ${toolbarIdle} w-8 px-0 justify-center`}
        >
          {isLeftCollapsed ? (
            <PanelLeftOpen className='w-4 h-4' />
          ) : (
            <PanelLeftClose className='w-4 h-4' />
          )}
        </button>

        <div className='flex items-center gap-1 min-w-0 text-xs text-[#57534E]'>
          {chapters.length > 0 ? (
            <>
              <label htmlFor='artist-chapter-select' className='sr-only'>
                Chương
              </label>
              <select
                id='artist-chapter-select'
                value={currentChapterId || ''}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCurrentChapterId(newId);
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.set('chapterId', newId);
                    return p;
                  });
                }}
                className='h-8 max-w-[5.5rem] bg-transparent font-semibold text-[#1C1917] rounded-lg px-1 cursor-pointer hover:bg-[#F3F0E9] focus-visible:outline-2 focus-visible:outline-[#F97316] truncate'
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Chương {c.chapterNumber}
                    {c.title ? `: ${c.title}` : ''}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span>{loadingChapters ? 'Đang tải…' : 'Chưa có chương'}</span>
          )}
          {selectedPage && (
            <>
              <span aria-hidden='true'>/</span>
              <span
                className='font-semibold text-[#1C1917] whitespace-nowrap'
                data-testid='toolbar-page-context'
              >
                Trang {selectedPage.pageNumber}
              </span>
            </>
          )}
          {workBadge && (
            <span
              className={`ml-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap inline-flex items-center ${workBadge.tone}`}
              data-testid='artist-work-status'
              title={`${workStageName ? `Công đoạn công việc: ${workStageName} — ` : ''}${workBadge.label}`}
            >
              <span className='hidden 2xl:inline'>
                {workStageName ? `${workStageName} · ` : ''}
              </span>
              {workBadge.label.split(' · ')[0]}
              {workBadge.label.includes('Chỉ xem') && (
                <>
                  <Lock className='inline w-3 h-3 ml-1 -mt-px' aria-hidden='true' />
                  <span className='sr-only'> · Chỉ xem</span>
                </>
              )}
            </span>
          )}
        </div>

        {selectedPage && (
          <>
            <span className='w-px h-5 bg-[#D8D2C5] shrink-0' aria-hidden='true' />
            <label className='flex items-center gap-1 text-xs text-[#57534E] shrink-0'>
              <Eye className='w-3.5 h-3.5 text-[#C2410C]' aria-hidden='true' />
              <span className='hidden 2xl:inline whitespace-nowrap'>Ảnh hiển thị</span>
              <span className='sr-only 2xl:hidden'>Ảnh hiển thị</span>
              <select
                value={viewStageId}
                onChange={(e) => setViewStageId(e.target.value)}
                data-testid='desk-stage-select'
                title='Chỉ đổi ảnh đang xem trên canvas, không đổi công đoạn công việc'
                className='h-8 max-w-[8.5rem] bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg px-1.5 font-semibold text-[#1C1917] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316]'
              >
                <option value='AUTO'>
                  Tự động{myStageOnPage ? ` (${stageLabel(myStageOnPage)})` : ''}
                </option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.stageOrder}. {s.name}
                    {s.isEnabled === false ? ' (đã tắt)' : ''}
                  </option>
                ))}
              </select>
            </label>

            {canEditPages && (
              <button
                type='button'
                aria-pressed={layoutEdit}
                disabled={isCurrentPageCarvedOut}
                onClick={() => {
                  if (layoutEdit) setMultiIds([]);
                  setLayoutEdit((v) => !v);
                }}
                data-testid='toggle-layout-edit'
                title={
                  isCurrentPageCarvedOut
                    ? 'Trang này đã được tách việc cho người khác, không thể sửa bố cục'
                    : layoutEdit
                      ? 'Tắt chế độ sửa bố cục'
                      : 'Bật chế độ sửa bố cục khung'
                }
                className={`${toolbarBtn} ${layoutEdit ? toolbarOn : toolbarIdle}`}
              >
                <Grid2x2 className='w-3.5 h-3.5' />
                <span className='hidden lg:inline'>Sửa bố cục</span>
                <span className='sr-only lg:hidden'>Sửa bố cục</span>
              </button>
            )}

            {canEditPages && (
              <div className='relative shrink-0' data-menu-root>
                <button
                  type='button'
                  aria-haspopup='menu'
                  aria-expanded={openMenu === 'upload'}
                  onClick={() => setOpenMenu((m) => (m === 'upload' ? null : 'upload'))}
                  data-testid='upload-menu-btn'
                  aria-label={`Tải ảnh — chế độ ${uploadMode === 'page' ? 'cả trang' : 'từng khung'}`}
                  className={`${toolbarBtn} ${toolbarIdle}`}
                >
                  <Upload className='w-3.5 h-3.5' />
                  <span className='hidden lg:inline'>Tải ảnh</span>
                  <ChevronDown className='w-3 h-3' />
                </button>
                {openMenu === 'upload' && (
                  <div
                    role='menu'
                    aria-label='Chế độ tải ảnh'
                    data-testid='upload-mode-toggle'
                    className='absolute left-0 top-full mt-1 w-64 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-xl py-1 z-50'
                  >
                    {[
                      {
                        mode: 'panel' as const,
                        testId: 'mode-panel-slice',
                        title: 'Từng khung',
                        hint: selectedPanelDetail
                          ? `Tải cho Khung #${selectedPanelDetail.panelNumber} đang chọn`
                          : 'Chọn một khung trên trang để tải ảnh riêng',
                      },
                      ...(!hasPanelOnlyAssignmentOnPage
                        ? [
                            {
                              mode: 'page' as const,
                              testId: 'mode-full-page',
                              title: 'Cả trang',
                              hint: `Một ảnh cho cả Trang ${selectedPage.pageNumber}, có nhận diện khung & bóng thoại`,
                            },
                          ]
                        : []),
                    ].map((o) => (
                      <button
                        key={o.mode}
                        type='button'
                        role='menuitemradio'
                        aria-checked={uploadMode === o.mode}
                        data-testid={o.testId}
                        onClick={() => {
                          setUploadMode(o.mode);
                          setOpenMenu(null);
                        }}
                        className={menuItem}
                      >
                        <Check
                          className={`w-3.5 h-3.5 shrink-0 ${uploadMode === o.mode ? 'text-[#C2410C]' : 'invisible'}`}
                        />
                        <span className='min-w-0'>
                          <span className='block font-semibold text-[#1C1917]'>{o.title}</span>
                          <span className='block text-[11px] text-[#57534E]'>{o.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className='ml-auto flex flex-wrap items-center justify-end gap-1 min-w-0'>
          {primaryCta && (
            <>
              <button
                type='button'
                onClick={() => runPrimaryCta(primaryCta.action)}
                disabled={primaryCta.disabled}
                title={primaryCta.reason ?? primaryCta.title}
                aria-describedby={primaryCta.reason ? 'artist-cta-reason' : undefined}
                data-testid={primaryCta.testId}
                className={`${toolbarBtn} ${
                  primaryCta.disabled
                    ? ''
                    : 'bg-[#EA580C] hover:bg-[#C2410C] text-white border-[#EA580C]'
                } max-w-[12rem]`}
              >
                {startingAssignmentPanelId !== null && primaryCta.testId === 'cta-start-work' ? (
                  <Loader2 className='w-3.5 h-3.5 animate-spin' />
                ) : (
                  primaryCta.icon
                )}
                <span className='truncate'>{primaryCta.label}</span>
              </button>
              {primaryCta.reason && (
                <span id='artist-cta-reason' className='sr-only'>
                  {primaryCta.reason}
                </span>
              )}
            </>
          )}

          {selectedPage && (
            <button
              type='button'
              onClick={() => (isRightCollapsed ? openDetails() : setIsRightCollapsed(true))}
              aria-expanded={!isRightCollapsed}
              aria-controls='artist-details'
              data-testid='toggle-details'
              className={`${toolbarBtn} ${isRightCollapsed ? toolbarIdle : toolbarOn} relative`}
            >
              <PanelRightOpen className='w-3.5 h-3.5' />
              <span className='hidden md:inline'>Chi tiết</span>
              <span className='sr-only md:hidden'>Chi tiết</span>
              {hasFeedback && (
                <span
                  className='absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white'
                  aria-label='Có phản hồi'
                />
              )}
            </button>
          )}

          <div className='relative shrink-0' data-menu-root>
            <button
              type='button'
              aria-haspopup='menu'
              aria-expanded={openMenu === 'page'}
              aria-label='Thao tác trang'
              title='Thao tác trang'
              onClick={() => setOpenMenu((m) => (m === 'page' ? null : 'page'))}
              data-testid='page-menu-btn'
              className={`${toolbarBtn} ${toolbarIdle} w-8 px-0 justify-center`}
            >
              <MoreHorizontal className='w-4 h-4' />
            </button>
            {openMenu === 'page' && (
              <div
                role='menu'
                aria-label='Thao tác trang'
                className='absolute right-0 top-full mt-1 w-56 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl shadow-xl py-1 z-50'
              >
                <button
                  type='button'
                  role='menuitem'
                  onClick={() => {
                    setOpenMenu(null);
                    void loadPages();
                  }}
                  disabled={loading}
                  className={menuItem}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
                </button>
                <button
                  type='button'
                  role='menuitem'
                  data-testid='artist-desk-bible-reference-btn'
                  onClick={() => {
                    setOpenMenu(null);
                    setSelectedDrawerPanelId(selectedPanelId || null);
                    setBibleDrawerOpen(true);
                  }}
                  className={menuItem}
                >
                  <BookOpen className='w-3.5 h-3.5' /> Tham chiếu Series Bible
                </button>
                {canEditPages && (
                  <>
                    <button
                      type='button'
                      role='menuitem'
                      onClick={() => {
                        setOpenMenu(null);
                        setCreateModalOpen(true);
                      }}
                      disabled={!currentChapterId}
                      className={menuItem}
                    >
                      <Plus className='w-3.5 h-3.5' /> Tạo trang mới
                    </button>
                    {selectedPage && (
                      <>
                        <button
                          type='button'
                          role='menuitem'
                          data-testid='page-settings-btn'
                          onClick={() => {
                            setOpenMenu(null);
                            setEditWidthPx(selectedPage.widthPx.toString());
                            setEditHeightPx(selectedPage.heightPx.toString());
                            setEditDpi(selectedPage.dpi.toString());
                            setEditLayout(selectedPage.layoutFormat);
                            setSettingsModalOpen(true);
                          }}
                          className={menuItem}
                        >
                          <Settings className='w-3.5 h-3.5' /> Cài đặt trang
                        </button>
                        <div className='my-1 border-t border-[#D8D2C5]' />
                        <button
                          type='button'
                          role='menuitem'
                          onClick={() => {
                            setOpenMenu(null);
                            handleDeletePage(selectedPage.id);
                          }}
                          className={`${menuItem} text-rose-700 hover:bg-rose-50`}
                        >
                          <Trash2 className='w-3.5 h-3.5' /> Xóa Trang {selectedPage.pageNumber}…
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {selectedPage && (
            <div
              className='inline-flex items-center h-8 bg-[#F3F0E9] p-0.5 rounded-lg border border-[#D8D2C5] shrink-0'
              role='group'
              aria-label='Thu phóng'
            >
              <button
                type='button'
                onClick={handleZoomOut}
                disabled={zoomScale <= 0.3}
                className='p-1 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FCFBF8] rounded-md cursor-pointer disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#F97316]'
                title='Thu nhỏ'
                aria-label='Thu nhỏ'
              >
                <ZoomOut className='w-3.5 h-3.5' />
              </button>
              <button
                type='button'
                onClick={handleResetZoom}
                className='hidden 2xl:block px-1 text-[11px] font-mono font-bold text-[#1C1917] rounded hover:bg-[#FCFBF8] cursor-pointer min-w-[2.75rem] focus-visible:outline-2 focus-visible:outline-[#F97316]'
                title='Đặt lại 100%'
                aria-label={`Thu phóng ${Math.round(zoomScale * 100)}%, bấm để đặt lại 100%`}
              >
                {Math.round(zoomScale * 100)}%
              </button>
              <button
                type='button'
                onClick={handleZoomIn}
                disabled={zoomScale >= 2.5}
                className='p-1 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FCFBF8] rounded-md cursor-pointer disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-[#F97316]'
                title='Phóng to'
                aria-label='Phóng to'
              >
                <ZoomIn className='w-3.5 h-3.5' />
              </button>
              <button
                type='button'
                onClick={handleFitToScreen}
                data-testid='zoom-fit-btn'
                aria-pressed={isFitMode}
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                  isFitMode
                    ? 'bg-white text-[#C2410C] shadow-2xs'
                    : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#FCFBF8]'
                }`}
                title='Vừa khung: nhìn trọn trang'
              >
                Vừa khung
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar phụ khi bật "Sửa bố cục" */}
      {selectedPage && canEditPages && !isCurrentPageCarvedOut && layoutEdit && (
        <div className='shrink-0 relative z-20' data-testid='layout-edit-bar'>
          <PanelLayoutToolbar
            panelCount={panels.length}
            selectedCount={Math.max(multiIds.length, selectedPanelId ? 1 : 0)}
            issues={detectLayoutIssues(panels.map((p) => liveRects[p.id] ?? rectOfPanel(p)))}
            busy={layoutBusy}
            canEdit={canEditPages}
            onRelayout={handleRelayout}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
            onStraighten={handleStraighten}
            onSelectAll={() => setMultiIds(panels.map((p) => p.id))}
            leading={
              <>
                <button
                  type='button'
                  onClick={() => setFrameTemplateModalOpen(true)}
                  className='px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap'
                  title='Áp dụng mẫu khung tranh dựng sẵn vào trang'
                >
                  <LayoutTemplate className='w-3.5 h-3.5 text-orange-600' />
                  Áp Dụng Mẫu Khung
                </button>
                <button
                  type='button'
                  onClick={handleCreatePanel}
                  className='px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-50 flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap'
                  title='Tạo thêm một khung thủ công'
                >
                  <Plus className='w-3.5 h-3.5' />
                  Thêm Panel
                </button>
                <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
              </>
            }
            trailing={
              selectedPanelId && multiIds.length <= 1 ? (
                <div className='flex items-center gap-1 shrink-0'>
                  <span className='w-px h-5 bg-[#E7E7E7] mx-0.5' />
                  <span className='text-xs font-semibold text-stone-700 whitespace-nowrap'>
                    Khung #{panels.find((p) => p.id === selectedPanelId)?.panelNumber}:
                  </span>
                  <button
                    type='button'
                    data-testid={`floating-split-v-${selectedPanelId}`}
                    disabled={Boolean(splitBlockedReason('vertical')) || layoutBusy}
                    onClick={() => handleSplitPanel('vertical')}
                    className='p-1.5 rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer'
                    title={splitBlockedReason('vertical') ?? 'Chia đôi dọc'}
                    aria-label='Chia đôi dọc'
                  >
                    <Columns className='w-3.5 h-3.5' />
                  </button>
                  <button
                    type='button'
                    data-testid={`floating-split-h-${selectedPanelId}`}
                    disabled={Boolean(splitBlockedReason('horizontal')) || layoutBusy}
                    onClick={() => handleSplitPanel('horizontal')}
                    className='p-1.5 rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer'
                    title={splitBlockedReason('horizontal') ?? 'Chia đôi ngang'}
                    aria-label='Chia đôi ngang'
                  >
                    <Rows className='w-3.5 h-3.5' />
                  </button>
                  <button
                    type='button'
                    data-testid={`floating-delete-${selectedPanelId}`}
                    onClick={() => handleDeletePanel(selectedPanelId)}
                    className='p-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer'
                    title='Xoá khung này'
                    aria-label='Xoá khung này'
                  >
                    <Trash2 className='w-3.5 h-3.5' />
                  </button>
                  <button
                    type='button'
                    onClick={() => openDetails('panel')}
                    className='px-2 py-1.5 text-xs font-semibold rounded-lg border border-[#E7E7E7] text-stone-700 hover:bg-stone-50 cursor-pointer whitespace-nowrap'
                  >
                    Thông số…
                  </button>
                </div>
              ) : null
            }
          />
        </div>
      )}

      {/* Vùng làm việc: Trang/Kịch bản · Canvas · Chi tiết */}
      <div className='flex-1 min-h-0 flex gap-2 relative'>
        {!isLeftCollapsed && (
          <button
            type='button'
            className='fixed inset-0 z-40 bg-[#1C1917]/30 lg:hidden cursor-default'
            aria-label='Đóng cột Trang / Kịch bản'
            tabIndex={-1}
            onClick={() => setIsLeftCollapsed(true)}
          />
        )}
        <aside
          id='artist-left-column'
          aria-label='Trang và kịch bản'
          data-testid='artist-left-column'
          onKeyDown={(e) => {
            if (e.key === 'Escape' && window.innerWidth < 1024) setIsLeftCollapsed(true);
          }}
          className={`${
            isLeftCollapsed ? 'hidden' : 'flex'
          } fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl lg:static lg:z-auto lg:w-[188px] lg:shadow-none lg:rounded-xl flex-col min-h-0 shrink-0 bg-[#FCFBF8] border border-[#D8D2C5] overflow-hidden`}
        >
          <div
            className='shrink-0 flex items-center gap-1 p-1.5 border-b border-[#D8D2C5]'
            role='tablist'
            aria-label='Cột trái'
          >
            {[
              { id: 'pages' as const, label: `Trang (${pages.length})` },
              { id: 'script' as const, label: 'Kịch bản' },
            ].map((t) => {
              const on = activeTab === t.id || (t.id === 'pages' && activeTab === 'queue');
              return (
                <button
                  key={t.id}
                  type='button'
                  role='tab'
                  aria-selected={on}
                  data-testid={`left-tab-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                    on ? 'bg-[#FFF2E6] text-[#C2410C]' : 'text-[#57534E] hover:bg-[#F3F0E9]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
            <button
              type='button'
              onClick={() => setIsLeftCollapsed(true)}
              className='p-1 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316]'
              aria-label='Thu gọn cột Trang / Kịch bản'
              title='Thu gọn cột'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>
          </div>

          <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2 space-y-2 text-xs'>
            {activeTab === 'pages' && (
              <>
                {pages.length === 0 ? (
                  <div className='p-3 text-center text-[#57534E] border border-dashed border-[#D8D2C5] rounded-xl'>
                    {loading ? 'Đang tải trang…' : 'Chưa có trang nào.'}
                  </div>
                ) : (
                  <ul className='space-y-1.5' data-testid='left-page-list'>
                    {pages.map((p) => {
                      const isSel = selectedPage?.id === p.id;
                      const isCarvedOut = carvedOutPageIds.has(p.id);
                      const pageTask = tasks.find(
                        (t) => t.entityType === 'Page' && t.targetEntityId === p.id,
                      );
                      const pageStatus = pageTask
                        ? WORK_STATUS[String(pageTask.status)]
                        : undefined;
                      return (
                        <li key={p.id}>
                          <button
                            type='button'
                            onClick={() => {
                              handleSelectPage(p);
                              if (window.innerWidth < 1024) setIsLeftCollapsed(true);
                            }}
                            aria-current={isSel ? 'page' : undefined}
                            className={`w-full p-1.5 rounded-lg border flex items-center gap-2 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                              isSel
                                ? 'border-[#F97316]/60 bg-[#FFF2E6]'
                                : 'border-transparent hover:bg-[#F3F0E9]'
                            }`}
                          >
                            <span
                              className='w-9 shrink-0 bg-white border border-[#D8D2C5] rounded overflow-hidden flex items-center justify-center'
                              style={{
                                aspectRatio: `${p.widthPx || 1200} / ${p.heightPx || 1800}`,
                              }}
                            >
                              {isSel && pageArtUrl ? (
                                <img
                                  src={toThumbnailUrl(pageArtUrl)}
                                  alt=''
                                  className='w-full h-full object-contain'
                                />
                              ) : (
                                <span className='text-[10px] font-mono text-[#57534E]'>
                                  {p.pageNumber}
                                </span>
                              )}
                            </span>
                            <span className='min-w-0 flex-1'>
                              <span className='block font-semibold text-[#1C1917] flex items-center justify-between gap-1'>
                                <span>Trang {p.pageNumber}</span>
                                {isCarvedOut && (
                                  <span
                                    data-testid={`carved-out-badge-${p.id}`}
                                    className='px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold shrink-0'
                                    title='Trang đã được tách việc cho người khác'
                                  >
                                    Đã tách
                                  </span>
                                )}
                              </span>
                              {pageStatus && !isCarvedOut && (
                                <span className='block truncate text-[11px] text-[#57534E]'>
                                  {pageStatus.label.split(' · ')[0]}
                                </span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {canEditPages && (
                  <button
                    type='button'
                    onClick={() => setCreateModalOpen(true)}
                    disabled={!currentChapterId}
                    className='w-full py-1.5 border border-dashed border-[#D8D2C5] rounded-lg font-semibold text-[#1C1917] hover:bg-[#F3F0E9] flex items-center justify-center gap-1 cursor-pointer disabled:text-stone-400 disabled:cursor-not-allowed'
                  >
                    <Plus className='w-3.5 h-3.5 text-[#C2410C]' /> Tạo trang mới
                  </button>
                )}
                <button
                  type='button'
                  onClick={() => setActiveTab('queue')}
                  data-testid='left-open-queue'
                  className='w-full py-1.5 rounded-lg font-semibold text-[#57534E] hover:bg-[#F3F0E9] flex items-center justify-center gap-1 cursor-pointer'
                >
                  <KanbanSquare className='w-3.5 h-3.5' /> Nhiệm vụ chương ({tasks.length})
                </button>
              </>
            )}

            {activeTab === 'queue' && (
              <>
                <button
                  type='button'
                  onClick={() => setActiveTab('pages')}
                  className='flex items-center gap-1 font-semibold text-[#C2410C] hover:underline cursor-pointer'
                >
                  <ChevronLeft className='w-3.5 h-3.5' /> Danh sách trang
                </button>
                <div className='space-y-2 max-h-[70vh] overflow-y-auto custom-scrollbar'>
                  <div className='text-xs font-bold text-[#1C1917] pb-1 flex items-center justify-between'>
                    <span>Hàng Đợi Công Việc</span>
                    {loadingTasks && <Loader2 className='w-3 h-3 animate-spin text-[#F97316]' />}
                  </div>
                  {tasks.length === 0 ? (
                    <div className='p-4 text-center text-xs text-[#57534E] border border-dashed border-[#D8D2C5] rounded-xl bg-[#F8F6F0]'>
                      Chưa có nhiệm vụ nào trong chương này.
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className='p-2.5 rounded-xl border border-[#D8D2C5] bg-[#F8F6F0] space-y-1 text-xs'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#F97316]/30'>
                            {stages.find((s) => s.id === task.pipelineStageId)?.name ||
                              task.pipelineStageId}
                          </span>
                          <span className='text-[10px] font-mono text-[#57534E]'>
                            {task.status}
                          </span>
                        </div>
                        <div className='font-bold text-[#1C1917] line-clamp-2'>
                          {task.brief || 'Không có mô tả'}
                        </div>
                        {task.dueDate && (
                          <div className='text-[10px] text-[#57534E]'>
                            Hạn: {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'script' &&
              (selectedPanelDetail ? (
                <>
                  <div className='font-semibold text-[#1C1917]'>
                    Khung #{selectedPanelDetail.panelNumber}
                  </div>
                  <button
                    type='button'
                    data-testid={`panel-bible-reference-btn-${selectedPanelDetail.id}`}
                    onClick={() => {
                      setSelectedDrawerPanelId(selectedPanelDetail.id);
                      setBibleDrawerOpen(true);
                    }}
                    className='w-full py-1.5 bg-[#FFF2E6] hover:bg-[#FDBA74]/30 text-[#C2410C] border border-[#FDBA74] rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-98'
                  >
                    <BookOpen className='w-3.5 h-3.5 text-[#C2410C]' />
                    <span>Tham chiếu Bible (Khung #{selectedPanelDetail.panelNumber})</span>
                  </button>
                  <div className='p-2.5 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5] space-y-1.5'>
                    <div className='font-bold text-[#1C1917] flex items-center gap-1.5 text-xs'>
                      <Film className='w-3.5 h-3.5 text-[#C2410C]' />
                      <span>Phân Cảnh (Scene)</span>
                    </div>
                    <select
                      value={selectedPanelDetail.sceneId || ''}
                      onChange={(e) => handleAssignScene(e.target.value ? e.target.value : null)}
                      className='w-full p-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl text-xs font-semibold text-[#1C1917] focus:border-[#F97316] focus:outline-none cursor-pointer'
                    >
                      <option value=''>-- Chưa gán phân cảnh --</option>
                      {scenes.map((s) => (
                        <option key={s.id} value={s.id}>
                          Phân cảnh #{s.sceneNumber}: {s.heading || 'Không tiêu đề'} (
                          {s.scriptLinesCount} dòng thoại)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='p-2.5 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5] space-y-2 flex-1'>
                    <div className='font-bold text-[#1C1917] flex items-center justify-between text-xs'>
                      <span className='flex items-center gap-1.5'>
                        <MessageSquare className='w-3.5 h-3.5 text-[#C2410C]' />
                        <span>Dòng Kịch Bản Phân Cảnh</span>
                      </span>
                      <span className='text-xs text-[#57534E] font-mono'>
                        {selectedPanelDetail.scriptLineIds?.length || 0} dòng
                      </span>
                    </div>

                    {!selectedPanelDetail.sceneId ? (
                      <p className='text-xs text-[#57534E] italic p-2 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5]'>
                        Vui lòng gán Phân cảnh (Scene) ở trên trước khi chọn các dòng thoại neo vào
                        panel này.
                      </p>
                    ) : loadingSceneLines ? (
                      <p className='text-xs text-[#57534E] p-2'>Đang nạp kịch bản...</p>
                    ) : sceneLines.length === 0 ? (
                      <p className='text-xs text-[#57534E] italic p-2 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5]'>
                        Phân cảnh này chưa có dòng thoại kịch bản nào.
                      </p>
                    ) : (
                      <div className='space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar'>
                        {sceneLines.map((line) => {
                          const isAnchored = selectedPanelDetail.scriptLineIds?.includes(line.id);
                          return (
                            <div
                              key={line.id}
                              onClick={() => handleToggleScriptLine(line.id)}
                              className={`p-2 rounded-xl border text-left cursor-pointer flex items-start gap-2 transition-all ${
                                isAnchored
                                  ? 'bg-[#FFF2E6] border-[#F97316]/40 text-[#1C1917] shadow-2xs'
                                  : 'bg-[#FCFBF8] border-[#D8D2C5] text-[#1C1917] hover:border-[#F97316]/40'
                              }`}
                            >
                              {isAnchored ? (
                                <CheckSquare className='w-3.5 h-3.5 text-[#C2410C] shrink-0 mt-0.5' />
                              ) : (
                                <Square className='w-3.5 h-3.5 text-[#57534E] shrink-0 mt-0.5' />
                              )}
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-1 text-[11px] font-mono font-bold text-[#57534E]'>
                                  <span>#{line.lineOrder}</span>
                                  {line.speakerCharacterId && (
                                    <span className='bg-[#F3F0E9] border border-[#D8D2C5] px-1 rounded text-[#1C1917]'>
                                      Nhân vật
                                    </span>
                                  )}
                                </div>
                                <p className='text-xs truncate font-medium'>
                                  {line.dialogueText ||
                                    line.stageDirection ||
                                    '(Chỉ dẫn diễn xuất)'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className='p-3 text-center text-[#57534E] border border-dashed border-[#D8D2C5] rounded-xl leading-relaxed'>
                  Chọn một khung trên trang để xem phân cảnh, dòng kịch bản và tham chiếu Bible.
                </p>
              ))}
          </div>
        </aside>

        {/* Canvas trung tâm */}
        <section className='flex-1 min-w-0 min-h-0 flex flex-col gap-2' aria-label='Trang truyện'>
          {selectedPage ? (
            <>
              {isCurrentPageCarvedOut && (
                <div
                  data-testid='carved-out-page-banner'
                  className='shrink-0 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs'
                >
                  <Lock className='w-4 h-4 text-amber-600 shrink-0' />
                  <div className='flex-1'>
                    <span className='font-bold'>Trang đã tách việc:</span> Trang {selectedPage.pageNumber} đã được tách riêng cho hoạ sĩ khác ở công đoạn này.
                    Bạn giữ việc cả chương không thể sửa bố cục hoặc tải ảnh cho trang này.
                  </div>
                </div>
              )}
              {uploadMode === 'page' && !isCurrentPageCarvedOut && (
                <PageArtworkWorkflow
                  page={selectedPage}
                  stageName={(() => {
                    const a = findPageStageAssignment();
                    return a ? stageLabel(a.pipelineStageId) || a.stageName : undefined;
                  })()}
                  assignmentBrief={findPageStageAssignment()?.brief}
                  artwork={
                    pageArt && pageArtUrl
                      ? { id: pageArt.id, versionNumber: pageArt.versionNumber, url: pageArtUrl }
                      : null
                  }
                  pendingFile={pendingPageFile}
                  uploading={uploadingPage}
                  uploadProgressMsg={uploadProgressMsg}
                  canEdit={canEditPages && !hasPanelOnlyAssignmentOnPage && !hasCarvedOutPanelOnPage}
                  existingPanels={panels}
                  defaultRightToLeft={seriesRightToLeft}
                  onPickFile={handleTriggerUploadPage}
                  onCancelPending={() => setPendingPageFile(null)}
                  onUploadPending={handleUploadPendingPage}
                  onApplied={async () => {
                    await Promise.all([loadPanels(selectedPage.id), loadElements(selectedPage.id)]);
                  }}
                />
              )}
              {/* Canvas Container & Direct Dropzone */}
              <div
                ref={canvasContainerRef}
                onDragOver={(e) => {
                  if (
                    uploadMode === 'page' &&
                    canEditPages &&
                    !hasPanelOnlyAssignmentOnPage &&
                    !isCurrentPageCarvedOut &&
                    !hasCarvedOutPanelOnPage
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                onDrop={(e) => {
                  if (
                    uploadMode === 'page' &&
                    canEditPages &&
                    !hasPanelOnlyAssignmentOnPage &&
                    !isCurrentPageCarvedOut &&
                    !hasCarvedOutPanelOnPage &&
                    e.dataTransfer.files?.[0]
                  ) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!uploadingPage) stagePageFile(e.dataTransfer.files[0]);
                  }
                }}
                data-testid='canvas-viewport'
                className='flex-1 min-h-0 w-full bg-[#ECE7DC] rounded-xl border border-[#D8D2C5] relative overflow-auto custom-scrollbar'
              >
                {/* Sizer & Centering Wrapper */}
                <div
                  className='min-w-full min-h-full flex items-center justify-center p-4'
                  style={{ minWidth: 'max-content', minHeight: 'max-content' }}
                >
                  {/* Scaled bounding box with explicit layout dimensions */}
                  <div
                    style={{
                      width: Math.round(baseWidth * zoomScale),
                      height: Math.round(baseHeight * zoomScale),
                      position: 'relative',
                      margin: 'auto',
                    }}
                    className='shrink-0 flex items-center justify-center'
                  >
                    <div
                      ref={canvasRef}
                      tabIndex={0}
                      onKeyDown={handleCanvasKeyDown}
                      data-testid='panel-canvas'
                      className='bg-white shadow-2xl border-2 border-[#171717] relative outline-none focus:ring-2 focus:ring-[#F97316]/50 transition-transform duration-150 overflow-hidden shrink-0'
                      style={{
                        width: baseWidth,
                        height: baseHeight,
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'center center',
                      }}
                    >
                      {/* Safe Margin Guides */}
                      {layoutEdit && (
                        <div className='absolute inset-3 border border-blue-200/60 pointer-events-none'></div>
                      )}

                      {/* Xem trước ảnh toàn trang đã chọn nhưng CHƯA tải lên */}
                      {uploadMode === 'page' && pendingPagePreview && (
                        <>
                          <img
                            src={pendingPagePreview}
                            alt={`Xem trước ảnh trang ${selectedPage.pageNumber} (chưa tải lên)`}
                            data-testid='canvas-pending-preview'
                            className='absolute inset-0 w-full h-full object-contain pointer-events-none z-[1] bg-white'
                          />
                        </>
                      )}

                      {/* Backdrop Layer: Ảnh Cả Trang (Full-page Composite) */}
                      {pageArtUrl && (
                        <img
                          src={pageArtUrl}
                          alt={`Page #${selectedPage.pageNumber}`}
                          onError={() => handleArtworkImgError(pageArt?.id)}
                          onLoad={() => handleArtworkImgLoad(pageArt?.id)}
                          data-testid='canvas-full-page-backdrop'
                          className={`absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity ${
                            uploadMode === 'page' || panels.some((pp) => !artFor(pp.id))
                              ? 'opacity-90 z-0'
                              : 'opacity-25 z-0'
                          }`}
                        />
                      )}

                      {/* Banner / Dropzone khi ở chế độ Full-Page và chưa có ảnh */}
                      {uploadMode === 'page' &&
                        !pageArtUrl &&
                        !pendingPagePreview &&
                        !uploadingPage && (
                          <div
                            className='absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none z-10 bg-white/75 backdrop-blur-2xs'
                            data-testid='full-page-empty-banner'
                          >
                            <FileImage className='w-8 h-8 text-blue-500 mb-1.5 animate-pulse' />
                            <span className='text-xs font-bold text-stone-800'>
                              Tải ảnh cả trang
                            </span>
                            <p className='text-xs text-stone-500 mt-1 max-w-xs leading-relaxed'>
                              Kéo thả file ảnh toàn trang hoặc bấm nút bên dưới để tải và đối chiếu
                              khớp nét với các khung.
                            </p>
                            {canEditPages && !hasPanelOnlyAssignmentOnPage && (
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerUploadPage();
                                }}
                                data-testid='desk-upload-page-btn'
                                className='mt-2.5 px-3 py-1.5 pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-soft-sm transition-all active:scale-95 flex items-center gap-1.5'
                              >
                                <Upload className='w-3.5 h-3.5' />
                                <span>Chọn ảnh trang truyện</span>
                              </button>
                            )}
                          </div>
                        )}

                      {/* Upload Spinner toàn trang */}
                      {uploadingPage && (
                        <div className='absolute inset-0 bg-stone-900/40 backdrop-blur-2xs flex flex-col items-center justify-center p-2 z-30 pointer-events-none'>
                          <Loader2 className='w-7 h-7 text-white animate-spin mb-1.5' />
                          <span className='text-xs font-semibold text-white bg-black/60 px-2.5 py-1 rounded'>
                            {uploadProgressMsg || 'Đang tải artwork toàn trang...'}
                          </span>
                        </div>
                      )}

                      {panels.length === 0 ? (
                        <div className='absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-zinc-400'>
                          <LayoutTemplate className='w-8 h-8 mb-2 opacity-50' />
                          <span className='text-xs font-semibold'>Chưa có khung panel</span>
                          <p className='text-xs mt-1 text-zinc-500'>
                            Bật "Sửa bố cục" rồi chọn "Áp Dụng Mẫu Khung" hoặc "Thêm Panel" để chia
                            khung.
                          </p>
                        </div>
                      ) : (
                        panels.map((p) => {
                          const box = parseBoundingBox(
                            p.boundingBox,
                            selectedPage.widthPx,
                            selectedPage.heightPx,
                          );
                          const liveRect = liveRects[p.id];
                          const isPrimary = selectedPanelId === p.id;
                          const isSelected = isPrimary || multiIds.includes(p.id);
                          const dragging = Boolean(liveRect);
                          const panelArt = artFor(p.id);
                          const panelArtUrl = panelArt ? panelArtworkUrls[panelArt.id] : null;
                          const isDraggingOver = dragOverPanelId === p.id;
                          const isUploading = uploadingPanelId === p.id;
                          const showsPageArt = !panelArtUrl && Boolean(pageArtUrl);

                          return (
                            <div
                              key={p.id}
                              onClick={() => setSelectedPanelId(p.id)}
                              onPointerDown={(e) => {
                                if (layoutEdit) handlePanelPointerDown(p, e);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (canEditPages) setDragOverPanelId(p.id);
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (dragOverPanelId === p.id) setDragOverPanelId(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverPanelId(null);
                                if (canEditPages && e.dataTransfer.files?.[0]) {
                                  void handlePanelFileDrop(p.id, e.dataTransfer.files[0]);
                                }
                              }}
                              data-testid={`panel-box-${p.id}`}
                              className={`group absolute border-2 ${
                                dragging ? '' : 'transition-all'
                              } ${layoutEdit && canEditPages ? 'cursor-move' : 'cursor-pointer'} flex flex-col justify-between p-1.5 overflow-hidden select-none ${
                                isDraggingOver
                                  ? 'border-orange-500 bg-orange-500/20 ring-2 ring-orange-400 z-30'
                                  : isSelected && layoutEdit
                                    ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-400/40 z-20'
                                    : showsPageArt
                                      ? // Khung chưa có ảnh riêng: nhìn xuyên xuống đúng phần ảnh cả trang
                                        `${box.borderless ? 'border-dashed border-zinc-400' : 'border-[#171717]'} bg-transparent hover:border-blue-500 z-10`
                                      : box.borderless
                                        ? 'border-dashed border-zinc-400 bg-white/80 hover:border-blue-500 z-10'
                                        : 'border-[#171717] bg-white/90 hover:border-blue-500 hover:bg-blue-50/20 z-10'
                              }`}
                              style={{
                                left: `${liveRect ? liveRect.x : box.percentX}%`,
                                top: `${liveRect ? liveRect.y : box.percentY}%`,
                                width: `${liveRect ? liveRect.w : box.percentW}%`,
                                height: `${liveRect ? liveRect.h : box.percentH}%`,
                                touchAction: 'none',
                              }}
                            >
                              {isPrimary && canEditPages && layoutEdit && multiIds.length <= 1 && (
                                <PanelResizeHandles
                                  onStart={(mode, e) => startDrag(p.id, mode, e)}
                                />
                              )}

                              {/* Dropzone Overlay khi kéo tệp vào ô */}
                              {isDraggingOver && (
                                <div className='absolute inset-0 bg-orange-500/25 backdrop-blur-2xs flex flex-col items-center justify-center p-2 z-30 pointer-events-none'>
                                  <Upload className='w-6 h-6 text-orange-600 animate-bounce mb-1' />
                                  <span className='text-xs font-bold text-orange-950 bg-white/90 px-2 py-0.5 rounded shadow-2xs'>
                                    Thả ảnh vào Khung #{p.panelNumber}
                                  </span>
                                </div>
                              )}

                              {/* Upload Spinner Overlay */}
                              {isUploading && (
                                <div className='absolute inset-0 bg-stone-900/40 backdrop-blur-2xs flex flex-col items-center justify-center p-2 z-30 pointer-events-none'>
                                  <Loader2 className='w-6 h-6 text-white animate-spin mb-1' />
                                  <span className='text-xs font-semibold text-white bg-black/60 px-2 py-0.5 rounded'>
                                    {uploadProgressMsg || 'Đang tải ảnh...'}
                                  </span>
                                </div>
                              )}

                              {/* Ảnh Artwork hiển thị sắc nét */}
                              {panelArtUrl && (
                                <img
                                  src={panelArtUrl}
                                  alt={`Panel #${p.panelNumber}`}
                                  onError={() => handleArtworkImgError(panelArt?.id)}
                                  onLoad={() => handleArtworkImgLoad(panelArt?.id)}
                                  className='absolute inset-0 w-full h-full object-contain pointer-events-none opacity-90 z-0'
                                />
                              )}

                              {/* Khung dùng ảnh cả trang: chỉ gắn nhãn nhỏ, không che tranh */}
                              {layoutEdit && showsPageArt && !isDraggingOver && !isUploading && (
                                <span
                                  data-testid={`panel-uses-page-art-${p.id}`}
                                  className='absolute bottom-1 right-1 z-10 pointer-events-none text-[10px] font-semibold bg-white/85 text-stone-700 border border-stone-300 px-1 rounded'
                                >
                                  Ảnh cả trang v{pageArt?.versionNumber}
                                </span>
                              )}

                              {/* Nút bấm nhanh Tải ảnh khi chưa có tranh */}
                              {!panelArtUrl && !showsPageArt && !isDraggingOver && !isUploading && (
                                <div className='absolute inset-0 flex flex-col items-center justify-center p-2 text-center pointer-events-none z-0'>
                                  <ImagePlus className='w-5 h-5 text-stone-300 mb-1' />
                                  <span className='text-xs text-stone-400 font-medium'>
                                    {canEditPages ? 'Kéo thả ảnh hoặc' : 'Chưa có ảnh'}
                                  </span>
                                  {canEditPages && (
                                    <button
                                      type='button'
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPanelId(p.id);
                                        handleTriggerUploadPanel(p.id);
                                      }}
                                      className='mt-1 px-2 py-0.5 pointer-events-auto bg-stone-100/90 hover:bg-orange-50 text-stone-600 hover:text-orange-700 border border-stone-200 hover:border-orange-300 rounded text-xs font-semibold cursor-pointer shadow-2xs transition-all active:scale-95'
                                    >
                                      + Tải ảnh
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Header Panel Box */}
                              <div className='flex items-center justify-between pointer-events-none relative z-20'>
                                <span
                                  className={`font-mono font-bold text-xs text-white px-1.5 py-0.5 rounded shadow-2xs ${isPrimary ? 'bg-[#C2410C]' : 'bg-[#171717]'}`}
                                >
                                  #{p.panelNumber}
                                </span>
                                <div className='flex items-center gap-1'>
                                  {layoutEdit && panelArt && (
                                    <span className='font-mono font-bold text-xs bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs'>
                                      {stageLabel(panelArt.pipelineStageId)} v
                                      {panelArt.versionNumber}
                                    </span>
                                  )}
                                  {layoutEdit && (
                                    <span className='font-mono font-semibold text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200'>
                                      Đọc #{p.readingOrder}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Footer Panel Box */}
                              {layoutEdit && (
                                <div className='flex items-center justify-between text-xs text-zinc-500 pointer-events-none relative z-20'>
                                  {p.sceneId && (
                                    <span className='bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded truncate max-w-[80px]'>
                                      Scene
                                    </span>
                                  )}
                                  <span className='font-mono text-zinc-400 ml-auto'>
                                    {Math.round(box.percentW)}×{Math.round(box.percentH)}%
                                    {box.borderless && ' (Tràn)'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      {(dragGuides.guides.length > 0 || dragGuides.gaps.length > 0) && (
                        <LayoutGuidesOverlay guides={dragGuides.guides} gaps={dragGuides.gaps} />
                      )}

                      {/* Layers / Image Elements on Canvas (CF2) */}
                      {pageElements
                        .filter((el) => !el.isRemoved)
                        .map((el) => {
                          const isSelected = selectedElementId === el.elementId;
                          const bibleEntry = el.bibleEntryId
                            ? bibleEntries.find((b) => b.id === el.bibleEntryId)
                            : null;
                          const artRef = el.assetId
                            ? pageArtworks.find((a) => a.id === el.assetId)
                            : null;
                          const imgUrl = artRef
                            ? panelArtworkUrls[artRef.id]
                            : el.content?.startsWith('http') || el.content?.startsWith('data:')
                              ? el.content
                              : bibleEntry?.referenceImageUrl
                                ? bibleEntry.referenceImageUrl
                                : null;

                          // Tỷ lệ % trên canvas
                          const pageW = selectedPage.widthPx || 1200;
                          const pageH = selectedPage.heightPx || 1800;
                          const isPercent =
                            el.x >= 0 &&
                            el.y >= 0 &&
                            el.x <= 100 &&
                            el.y <= 100 &&
                            el.width <= 100 &&
                            el.height <= 100;
                          const leftPct = Math.max(
                            0,
                            Math.min(100, isPercent ? el.x : (el.x / pageW) * 100),
                          );
                          const topPct = Math.max(
                            0,
                            Math.min(100, isPercent ? el.y : (el.y / pageH) * 100),
                          );
                          const widthPct = Math.max(
                            1,
                            Math.min(100, isPercent ? el.width : (el.width / pageW) * 100),
                          );
                          const heightPct = Math.max(
                            1,
                            Math.min(100, isPercent ? el.height : (el.height / pageH) * 100),
                          );

                          return (
                            <div
                              key={el.elementId}
                              data-testid={`canvas-layer-${el.elementId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedElementId(el.elementId);
                                openDetails('layers');
                              }}
                              className={`absolute transition-all cursor-pointer flex flex-col items-center justify-center p-1 overflow-hidden select-none ${
                                isSelected
                                  ? 'ring-2 ring-purple-600 bg-purple-50/30'
                                  : 'border border-dashed border-purple-400/50 hover:ring-1 hover:ring-purple-400'
                              }`}
                              style={{
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: `${widthPct}%`,
                                height: `${heightPct}%`,
                                transform: `rotate(${el.rotation || 0}deg)`,
                                transformOrigin: 'center center',
                                zIndex: el.zIndex || 5,
                              }}
                            >
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt={el.elementType}
                                  onError={() => handleArtworkImgError(artRef?.id)}
                                  onLoad={() => handleArtworkImgLoad(artRef?.id)}
                                  className='w-full h-full object-contain pointer-events-none'
                                />
                              ) : (
                                <div className='flex flex-col items-center justify-center text-center p-1 bg-white/80 backdrop-blur-2xs rounded w-full h-full pointer-events-none'>
                                  {el.elementType === 'CHARACTER_INSTANCE' && (
                                    <User className='w-4 h-4 text-purple-600 mb-0.5' />
                                  )}
                                  {el.elementType === 'BACKGROUND' && (
                                    <Mountain className='w-4 h-4 text-emerald-600 mb-0.5' />
                                  )}
                                  {el.elementType === 'PROP' && (
                                    <Package className='w-4 h-4 text-amber-600 mb-0.5' />
                                  )}
                                  {el.elementType === 'EFFECT' && (
                                    <Zap className='w-4 h-4 text-red-500 mb-0.5' />
                                  )}
                                  {el.elementType === 'ARTWORK_LAYER' && (
                                    <Palette className='w-4 h-4 text-blue-500 mb-0.5' />
                                  )}
                                  <span className='text-xs font-bold text-zinc-700 truncate max-w-full'>
                                    {bibleEntry
                                      ? bibleEntry.name
                                      : LAYER_LABELS[el.elementType] || el.elementType}
                                  </span>
                                  {el.rotation ? (
                                    <span className='text-xs text-zinc-500'>{el.rotation}°</span>
                                  ) : null}
                                </div>
                              )}
                              {layoutEdit && (
                                <div className='absolute top-0.5 right-0.5 bg-black/60 text-white text-xs px-1 rounded font-mono'>
                                  z:{el.zIndex || 1}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thanh trạng thái mỏng */}
              <div
                className='shrink-0 min-h-8 flex items-center gap-2 px-2 py-1 text-xs text-[#57534E] bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg min-w-0'
                data-testid='canvas-status-bar'
              >
                <span className='truncate'>
                  <span className='font-semibold text-[#1C1917]'>
                    Trang {selectedPage.pageNumber}
                  </span>
                  {' · '}
                  {viewedPageLabel}
                  {viewStageId !== 'AUTO' && ' (đang xem theo lựa chọn)'}
                  {selectedPanelDetail && (
                    <>
                      {' · '}Khung #{selectedPanelDetail.panelNumber}:{' '}
                      {(() => {
                        const a = artFor(selectedPanelDetail.id);
                        return a
                          ? `${stageLabel(a.pipelineStageId)} v${a.versionNumber}`
                          : pageArt
                            ? 'dùng ảnh cả trang'
                            : 'chưa có ảnh';
                      })()}
                    </>
                  )}
                </span>
                {uploadMode === 'page' && pendingPagePreview && (
                  <span className='shrink-0 font-semibold bg-[#C2410C] text-white px-1.5 rounded'>
                    Bản xem trước — chưa tải lên
                  </span>
                )}
                {!canEditPages && (
                  <span
                    className='shrink-0 inline-flex items-center gap-1 font-semibold bg-stone-100 text-stone-700 border border-stone-300 px-1.5 rounded'
                    title='Chỉ Producer và Artist mới có quyền tạo, sửa và xoá trang'
                  >
                    <Lock className='w-3 h-3' /> Chỉ xem
                  </span>
                )}
                {(loadingPanels || loadingElements) && (
                  <Loader2
                    className='w-3.5 h-3.5 animate-spin text-[#C2410C] shrink-0'
                    aria-label='Đang tải'
                  />
                )}
                <button
                  type='button'
                  onClick={() => openDetails('versions')}
                  data-testid='status-open-history'
                  className='ml-auto shrink-0 inline-flex items-center gap-1 font-semibold text-[#C2410C] hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] rounded'
                >
                  <History className='w-3.5 h-3.5' /> Lịch sử
                </button>
              </div>
            </>
          ) : (
            <div className='flex flex-col items-center justify-center p-12 text-center bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-xs my-6'>
              <div className='w-16 h-16 rounded-2xl bg-[#F8F6F0] border border-[#D8D2C5] flex items-center justify-center text-[#57534E] mb-4'>
                <FileImage className='w-8 h-8 text-[#C2410C]' />
              </div>
              <h3 className='text-base font-serif font-bold text-[#1C1917] mb-1'>
                Chọn một trang để bắt đầu
              </h3>
              <p className='text-xs text-[#57534E] max-w-sm'>
                {pages.length > 0
                  ? 'Vui lòng chọn một trang từ danh sách ở cột trái để bắt đầu thao tác bố cục khung tranh.'
                  : 'Chương hiện tại chưa có trang truyện nào. Bấm "Tạo Trang Mới" để tạo trang đầu tiên.'}
              </p>
              {canEditPages && currentChapterId && (
                <button
                  type='button'
                  onClick={() => setCreateModalOpen(true)}
                  className='mt-4 btn-cta-primary flex items-center gap-1.5'
                >
                  <Plus className='w-4 h-4' />
                  <span>Tạo Trang Mới</span>
                </button>
              )}
            </div>
          )}
        </section>

        {/* Cột Chi tiết: mặc định đóng; inline từ 1280px, drawer khi hẹp hơn */}
        {selectedPage && !isRightCollapsed && (
          <>
            <button
              type='button'
              className='fixed inset-0 z-40 bg-[#1C1917]/30 xl:hidden cursor-default'
              aria-label='Đóng Chi tiết'
              tabIndex={-1}
              onClick={() => setIsRightCollapsed(true)}
            />
            <aside
              id='artist-details'
              aria-label='Chi tiết'
              data-testid='artist-details'
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsRightCollapsed(true);
              }}
              className='fixed inset-y-0 right-0 z-50 w-[22rem] max-w-[92vw] shadow-2xl xl:static xl:z-auto xl:w-80 xl:shadow-none xl:rounded-xl flex flex-col min-h-0 shrink-0 bg-[#FCFBF8] border border-[#D8D2C5] overflow-hidden'
            >
              <div className='shrink-0 flex items-center gap-1 p-1.5 border-b border-[#D8D2C5]'>
                <div
                  className='flex items-center gap-0.5 flex-1 min-w-0'
                  role='tablist'
                  aria-label='Chi tiết'
                >
                  {[
                    { id: 'panel' as const, label: 'Khung', testId: 'tab-panel' },
                    { id: 'versions' as const, label: 'Phiên bản', testId: 'tab-versions' },
                    { id: 'feedback' as const, label: 'Phản hồi', testId: 'tab-feedback' },
                    {
                      id: 'layers' as const,
                      label: `Lớp (${visibleElements.length})`,
                      testId: 'tab-layers',
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type='button'
                      role='tab'
                      aria-selected={activeRightTab === t.id}
                      data-testid={t.testId}
                      onClick={() => setActiveRightTab(t.id)}
                      className={`relative px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316] ${
                        activeRightTab === t.id
                          ? 'bg-[#FFF2E6] text-[#C2410C]'
                          : 'text-[#57534E] hover:bg-[#F3F0E9]'
                      }`}
                    >
                      {t.label}
                      {t.id === 'feedback' && hasFeedback && (
                        <span className='ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-500 align-middle' />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  ref={detailsCloseRef}
                  type='button'
                  onClick={() => setIsRightCollapsed(true)}
                  className='p-1 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316]'
                  aria-label='Đóng Chi tiết'
                  title='Đóng'
                  data-testid='close-details'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>

              <div className='flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-3 text-xs'>
                {activeRightTab === 'panel' &&
                  (selectedPanelDetail ? (
                    <>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='font-bold text-sm text-[#1C1917]'>
                          Khung #{selectedPanelDetail.panelNumber}
                        </span>
                        <span className='text-[11px] text-[#57534E]'>
                          {panelArt
                            ? `${stageLabel(panelArt.pipelineStageId)} v${panelArt.versionNumber}`
                            : pageArt
                              ? 'Dùng ảnh cả trang'
                              : 'Chưa có ảnh'}
                        </span>
                      </div>

                      {canEditPages && (
                        <div className='space-y-2' data-testid='panel-artwork-desk-card'>
                          <button
                            type='button'
                            data-testid={`desk-upload-panel-btn-${selectedPanelDetail.id}`}
                            onClick={() => handleTriggerUploadPanel(selectedPanelDetail.id)}
                            disabled={!canUpload}
                            title={canUpload ? undefined : uploadBlockedReason}
                            className={`w-full ${toolbarBtn} justify-center ${
                              canUpload
                                ? 'bg-[#EA580C] hover:bg-[#C2410C] text-white border-[#EA580C]'
                                : ''
                            }`}
                          >
                            <Upload className='w-3.5 h-3.5' />
                            {panelArt ? 'Tải phiên bản mới cho khung' : 'Tải ảnh cho khung'}
                          </button>
                          {!canUpload && (
                            <div
                              className='p-2.5 rounded-lg border border-stone-200 bg-stone-50 text-stone-700 space-y-2'
                              data-testid='desk-upload-panel-blocked'
                            >
                              <p className='flex items-start gap-1.5 leading-relaxed'>
                                <Lock className='w-3.5 h-3.5 mt-px shrink-0 text-stone-500' />
                                <span>
                                  {pendingPanel
                                    ? 'Việc đã được giao nhưng chưa bắt đầu.'
                                    : uploadBlockedReason}
                                </span>
                              </p>
                              {pendingPanel && (
                                <button
                                  type='button'
                                  data-testid={`desk-start-and-upload-btn-${selectedPanelDetail.id}`}
                                  onClick={() => handleStartAndUploadPanel(selectedPanelDetail.id)}
                                  disabled={startingAssignmentPanelId === selectedPanelDetail.id}
                                  className={`w-full ${toolbarBtn} justify-center bg-[#EA580C] hover:bg-[#C2410C] text-white border-[#EA580C]`}
                                >
                                  {startingAssignmentPanelId === selectedPanelDetail.id ? (
                                    <Loader2 className='w-3.5 h-3.5 animate-spin' />
                                  ) : (
                                    <Play className='w-3.5 h-3.5 fill-current' />
                                  )}
                                  Bắt đầu việc &amp; tải ảnh
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <PanelReadout
                        selectedPanel={panels.find((p) => p.id === selectedPanelDetail.id)}
                        selectedPage={selectedPage}
                        panelRect={
                          liveRects[selectedPanelDetail.id] ??
                          (panels.find((p) => p.id === selectedPanelDetail.id)
                            ? rectOfPanel(panels.find((p) => p.id === selectedPanelDetail.id)!)
                            : null)
                        }
                      />

                      <div className='p-3 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5] space-y-2'>
                        <div className='font-bold text-[#1C1917] flex items-center justify-between text-xs'>
                          <span>Vị trí &amp; Thứ tự đọc</span>
                          <span className='font-mono text-xs text-[#57534E]'>
                            #{selectedPanelDetail.panelNumber}
                          </span>
                        </div>
                        <div className='grid grid-cols-2 gap-2 text-xs'>
                          <div>
                            <label className='block text-[#57534E] mb-1 font-medium'>
                              Thứ tự đọc:
                            </label>
                            <input
                              type='number'
                              value={panelReadingOrder}
                              onChange={(e) => setPanelReadingOrder(parseInt(e.target.value, 10))}
                              className='w-full px-2.5 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg font-mono text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                            />
                          </div>
                          <div>
                            <label className='block text-[#57534E] mb-1 font-medium'>X (%):</label>
                            <input
                              type='number'
                              step={0.1}
                              value={panelBoxX}
                              onChange={(e) => setPanelBoxX(parseFloat(e.target.value))}
                              className='w-full px-2.5 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg font-mono text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                            />
                          </div>
                          <div>
                            <label className='block text-[#57534E] mb-1 font-medium'>Y (%):</label>
                            <input
                              type='number'
                              step={0.1}
                              value={panelBoxY}
                              onChange={(e) => setPanelBoxY(parseFloat(e.target.value))}
                              className='w-full px-2.5 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg font-mono text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                            />
                          </div>
                          <div>
                            <label className='block text-[#57534E] mb-1 font-medium'>
                              Rộng × Cao (%):
                            </label>
                            <div className='flex gap-1'>
                              <input
                                type='number'
                                step={0.1}
                                value={panelBoxW}
                                onChange={(e) => setPanelBoxW(parseFloat(e.target.value))}
                                className='w-1/2 px-2 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg font-mono text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                              />
                              <input
                                type='number'
                                step={0.1}
                                value={panelBoxH}
                                onChange={(e) => setPanelBoxH(parseFloat(e.target.value))}
                                className='w-1/2 px-2 py-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg font-mono text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleSavePanelCoords}
                          className='w-full mt-2 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-soft-sm active:scale-98'
                        >
                          Lưu Tọa Độ &amp; Thứ Tự Đọc
                        </button>
                        <div
                          className='grid grid-cols-2 gap-2 mt-2'
                          data-testid='panel-split-buttons'
                        >
                          {(['vertical', 'horizontal'] as const).map((axis) => {
                            const reason = splitBlockedReason(axis);
                            return (
                              <button
                                key={axis}
                                type='button'
                                data-testid={`split-${axis}`}
                                disabled={Boolean(reason) || layoutBusy}
                                title={
                                  reason ??
                                  (axis === 'vertical'
                                    ? 'Chia khung này thành 2 cột trái/phải'
                                    : 'Chia khung này thành 2 hàng trên/dưới')
                                }
                                onClick={() => handleSplitPanel(axis)}
                                className='py-1.5 bg-[#FCFBF8] hover:bg-[#FFF2E6] text-[#1C1917] hover:text-[#C2410C] border border-[#D8D2C5] hover:border-[#F97316]/40 rounded-xl font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs'
                              >
                                {axis === 'vertical' ? 'Chia đôi dọc' : 'Chia đôi ngang'}
                              </button>
                            );
                          })}
                        </div>
                        {splitBlockedReason('vertical') && splitBlockedReason('horizontal') && (
                          <p className='text-xs text-[#57534E] mt-1'>
                            {splitBlockedReason('vertical')}
                          </p>
                        )}
                      </div>

                      <div className='p-2.5 bg-[#F8F6F0] rounded-xl border border-[#D8D2C5] space-y-1.5'>
                        <div className='font-bold text-[#1C1917] flex items-center gap-1.5 text-xs'>
                          <Film className='w-3.5 h-3.5 text-[#C2410C]' />
                          <span>Phân Cảnh (Scene)</span>
                        </div>
                        <select
                          value={selectedPanelDetail.sceneId || ''}
                          onChange={(e) =>
                            handleAssignScene(e.target.value ? e.target.value : null)
                          }
                          className='w-full p-1.5 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl text-xs font-semibold text-[#1C1917] focus:border-[#F97316] focus:outline-none cursor-pointer'
                        >
                          <option value=''>-- Chưa gán phân cảnh --</option>
                          {scenes.map((s) => (
                            <option key={s.id} value={s.id}>
                              Phân cảnh #{s.sceneNumber}: {s.heading || 'Không tiêu đề'} (
                              {s.scriptLinesCount} dòng thoại)
                            </option>
                          ))}
                        </select>
                      </div>

                      {panelArt && (
                        <button
                          type='button'
                          data-testid={`check-consistency-panel-btn-${selectedPanelDetail.id}`}
                          onClick={() => handleCheckPanelConsistency(selectedPanelDetail.id)}
                          disabled={checkingConsistencyPanelId === selectedPanelDetail.id}
                          className='w-full py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-900 border border-violet-200 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50'
                        >
                          {checkingConsistencyPanelId === selectedPanelDetail.id ? (
                            <Loader2 className='w-3.5 h-3.5 animate-spin' />
                          ) : (
                            <Sparkles className='w-3.5 h-3.5 text-violet-600' />
                          )}
                          <span>
                            {checkingConsistencyPanelId === selectedPanelDetail.id
                              ? 'Đang kiểm tra AI...'
                              : 'Kiểm tra nhất quán nhân vật AI'}
                          </span>
                        </button>
                      )}

                      {/* Kết quả kiểm tra nhất quán nếu có */}
                      {panelConsistencyResult[selectedPanelDetail.id] &&
                        (() => {
                          const r = panelConsistencyResult[selectedPanelDetail.id];
                          const scorePct = Math.round(r.score * 100);
                          const threshPct = Math.round(r.threshold * 100);

                          return (
                            <div
                              data-testid={`panel-consistency-card-${selectedPanelDetail.id}`}
                              className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                                r.passed
                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                  : 'bg-amber-50/70 border-amber-300 text-amber-950'
                              }`}
                            >
                              <div className='flex items-center justify-between font-bold text-xs'>
                                <span className='flex items-center gap-1'>
                                  {r.passed ? (
                                    <CheckCircle2 className='w-3.5 h-3.5 text-emerald-600' />
                                  ) : (
                                    <AlertTriangle className='w-3.5 h-3.5 text-amber-600' />
                                  )}
                                  <span>{r.passed ? 'Nhất quán ĐẠT' : 'Cảnh báo sai lệch'}</span>
                                </span>
                                <span
                                  className={`font-mono px-2 py-0.5 rounded-md text-xs ${
                                    r.passed
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-900 font-bold'
                                  }`}
                                >
                                  {scorePct}% / {threshPct}%
                                </span>
                              </div>

                              {r.characterName && (
                                <div className='text-xs text-stone-600'>
                                  So với Character Sheet:{' '}
                                  <strong className='text-stone-800'>{r.characterName}</strong>
                                  {r.characterSheetVersion != null &&
                                    ` (v${r.characterSheetVersion})`}
                                </div>
                              )}

                              {r.summaryReason && (
                                <p className='text-xs leading-relaxed bg-white/70 p-2 rounded-lg border border-black/5'>
                                  {r.summaryReason}
                                </p>
                              )}

                              {r.deviations && r.deviations.length > 0 && (
                                <div className='space-y-1 pt-1.5 border-t border-black/5'>
                                  <div className='text-xs font-bold uppercase tracking-wider text-amber-900'>
                                    Chi tiết độ lệch ({r.deviations.length}):
                                  </div>
                                  <ul className='space-y-1 text-xs'>
                                    {r.deviations.map((dev, idx) => (
                                      <li
                                        key={idx}
                                        className='bg-white/80 p-1.5 rounded-lg border border-amber-200/50'
                                      >
                                        <span className='font-bold text-amber-950 mr-1'>
                                          [{dev.aspect}]
                                        </span>
                                        <span>{dev.description}</span>
                                        {dev.regionHint && (
                                          <span className='text-amber-700 italic ml-1'>
                                            ({dev.regionHint})
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                      {canEditPages && (
                        <div className='pt-2.5 border-t border-[#D8D2C5] flex justify-end'>
                          <button
                            onClick={() => handleDeletePanel(selectedPanelDetail.id)}
                            className='px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                            <span>Xóa Khung Panel Này</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className='p-4 text-center text-[#57534E] border border-dashed border-[#D8D2C5] rounded-xl leading-relaxed'>
                      Chọn một khung trên trang để xem thông số, thứ tự đọc, phân cảnh và tải ảnh
                      cho khung.
                    </p>
                  ))}

                {activeRightTab === 'versions' && (
                  <div className='space-y-4' data-testid='versions-tab'>
                    {selectedPanelDetail && (
                      <section className='space-y-2'>
                        <h3 className='font-bold text-[#1C1917]'>
                          Khung #{selectedPanelDetail.panelNumber}
                        </h3>
                        {panelArt ? (
                          <div className='space-y-2'>
                            {panelArtUrl ? (
                              <div className='aspect-video max-h-36 bg-[#FCFBF8] border border-[#D8D2C5] rounded-xl overflow-hidden flex items-center justify-center relative p-1 shadow-2xs'>
                                <img
                                  src={panelArtUrl}
                                  alt={panelArt.fileName}
                                  onError={() => handleArtworkImgError(panelArt.id)}
                                  onLoad={() => handleArtworkImgLoad(panelArt.id)}
                                  className='w-full h-full object-contain'
                                />
                              </div>
                            ) : (
                              <p className='text-xs text-[#57534E] font-mono'>
                                Đang nạp link xem ảnh...
                              </p>
                            )}
                            <div className='text-xs text-[#57534E] font-mono flex items-center justify-between'>
                              <span className='truncate'>{panelArt.fileName}</span>
                              <span>{Math.round(panelArt.sizeBytes / 1024)} KB</span>
                            </div>
                          </div>
                        ) : pageArt && pageArtUrl ? (
                          // Chưa có ảnh riêng: hiện phần tương ứng của ảnh cả trang
                          <div className='space-y-1.5' data-testid='panel-desk-page-art'>
                            <PageArtCrop
                              src={pageArtUrl}
                              boundingBox={
                                panels.find((pp) => pp.id === selectedPanelDetail.id)?.boundingBox
                              }
                              alt={`Khung #${selectedPanelDetail.panelNumber} cắt từ ảnh cả trang`}
                              testId='panel-desk-page-art-crop'
                            />
                            <p className='text-xs text-[#57534E]'>
                              Đang dùng phần khung này trong{' '}
                              <strong>
                                ảnh cả trang {stageLabel(pageArt.pipelineStageId)} v
                                {pageArt.versionNumber}
                              </strong>
                              . Tải ảnh riêng nếu muốn thay.
                            </p>
                          </div>
                        ) : (
                          <p className='text-xs text-[#57534E] italic p-2.5 bg-[#FCFBF8] rounded-xl border border-[#D8D2C5]'>
                            Khung này chưa có ảnh riêng. Bấm "Tải ảnh cho khung" hoặc kéo thả ảnh
                            vào ô trên canvas.
                          </p>
                        )}
                        {renderVersionList(
                          pageArtworks.filter((a) => a.panelId === selectedPanelDetail.id),
                          panelArt?.id,
                          'panel-version-list',
                        )}
                      </section>
                    )}
                    <section className='space-y-2'>
                      <h3 className='font-bold text-[#1C1917]'>
                        Ảnh cả trang {selectedPage.pageNumber}
                      </h3>
                      {renderVersionList(
                        pageArtworks.filter((a) => !a.panelId),
                        pageArt?.id,
                        'page-version-list',
                      )}
                    </section>
                    <p className='text-[11px] text-[#57534E]'>
                      Mỗi công đoạn đánh số phiên bản riêng. Bấm một bản để xem lớn; xem bản cũ
                      không đổi bản hiện hành.
                    </p>
                  </div>
                )}

                {activeRightTab === 'feedback' &&
                  (hasFeedback ? (
                    <>
                      {(() => {
                        const feedbackAsg = findFeedbackAssignment(selectedPanelDetail?.id);
                        if (!feedbackAsg) return null;
                        const isChangesReq = feedbackAsg.status === 'ReworkRequired';
                        const comment = feedbackAsg.lastFeedbackComment;
                        if (!isChangesReq && !comment) return null;

                        return (
                          <div
                            className={`p-3 rounded-xl border space-y-2 shadow-2xs ${
                              isChangesReq
                                ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                                : 'bg-[#FFF8F0] border-[#F97316]/30 text-[#1C1917]'
                            }`}
                          >
                            <div className='flex items-center justify-between font-bold text-xs'>
                              <span className='flex items-center gap-1.5'>
                                <AlertTriangle
                                  className={`w-3.5 h-3.5 ${
                                    isChangesReq ? 'text-amber-600' : 'text-[#C2410C]'
                                  }`}
                                />
                                <span>
                                  {isChangesReq ? 'Yêu Cầu Chỉnh Sửa' : 'Ghi Chú Phản Hồi'}
                                </span>
                              </span>
                              <span className='text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200'>
                                {feedbackAsg.stageName || 'Sản xuất'}
                              </span>
                            </div>

                            {comment ? (
                              <div className='p-2 bg-white/90 rounded-lg border border-amber-200 text-xs italic text-[#1C1917] leading-relaxed'>
                                "{comment}"
                              </div>
                            ) : null}

                            {feedbackAsg.brief ? (
                              <p className='text-xs text-[#57534E] leading-relaxed'>
                                <strong>Yêu cầu:</strong> {feedbackAsg.brief}
                              </p>
                            ) : null}

                            {isChangesReq && (
                              <p className='text-[11px] text-amber-800 font-medium'>
                                Chỉnh sửa bản vẽ rồi tải phiên bản mới (tab Khung hoặc nút tải ảnh
                                trên thanh công cụ).
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <p className='p-4 text-center text-[#57534E] border border-dashed border-[#D8D2C5] rounded-xl'>
                      Chưa có phản hồi nào cho{' '}
                      {selectedPanelDetail
                        ? `Khung #${selectedPanelDetail.panelNumber}`
                        : 'trang này'}
                      .
                    </p>
                  ))}

                {activeRightTab === 'layers' && (
                  <>
                    <div className='flex justify-end'>
                      <button
                        type='button'
                        onClick={() => setCreateLayerModalOpen(true)}
                        className='p-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-soft-sm active:scale-95'
                        data-testid='open-create-layer-modal'
                        title='Thêm Layer mới'
                      >
                        <Plus className='w-3.5 h-3.5' />
                      </button>
                    </div>
                    <div
                      className='space-y-3.5 text-xs flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5'
                      data-testid='layers-management-view'
                    >
                      <div className='p-3 bg-[#FFF2E6] rounded-xl border border-[#F97316]/30 space-y-1.5'>
                        <div className='flex items-center justify-between'>
                          <span className='font-bold text-[#1C1917] flex items-center gap-1.5'>
                            <Sparkles className='w-3.5 h-3.5 text-[#C2410C]' />
                            <span data-testid='layers-title'>
                              {isPanelLayerFilter
                                ? `Layer của Panel #${selectedPanelNumber ?? '?'} (${visibleElements.length})`
                                : `Layer của trang (${pageElements.length})`}
                            </span>
                          </span>
                          {selectedPanelId && (
                            <button
                              type='button'
                              data-testid='toggle-all-page-layers'
                              onClick={() => setShowAllPageLayers((v) => !v)}
                              className='text-xs font-bold text-[#C2410C] hover:text-[#9A3412] underline cursor-pointer'
                            >
                              {showAllPageLayers ? 'Chỉ xem panel đang chọn' : 'Xem cả trang'}
                            </button>
                          )}
                        </div>
                        <p className='text-xs text-[#57534E]'>
                          Tách layer nhân vật, bối cảnh, đạo cụ, hiệu ứng trực quan trên canvas. Hỗ
                          trợ xoay góc và đổi thứ tự hiển thị z-index.
                        </p>
                      </div>

                      {loadingElements ? (
                        <div className='p-8 text-center text-[#57534E]'>
                          <RefreshCw className='w-5 h-5 animate-spin mx-auto mb-2 text-[#C2410C]' />
                          <span>Đang tải các layer của trang...</span>
                        </div>
                      ) : pageElements.length === 0 ? (
                        <div className='p-8 text-center border border-dashed border-[#D8D2C5] rounded-xl flex flex-col items-center justify-center space-y-3 bg-[#FCFBF8]'>
                          <Layers className='w-8 h-8 text-[#C2410C]/40' />
                          <div>
                            <p className='font-semibold text-[#1C1917]'>Chưa có layer ảnh nào</p>
                            <p className='text-xs text-[#57534E] mt-0.5 max-w-xs'>
                              Bấm "+ Thêm Layer" để thêm nhân vật, bối cảnh, đạo cụ, hiệu ứng hoặc
                              lớp artwork riêng trên trang.
                            </p>
                          </div>
                          <button
                            type='button'
                            onClick={() => setCreateLayerModalOpen(true)}
                            className='px-3 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1'
                          >
                            <Plus className='w-3.5 h-3.5' />
                            <span>Thêm Layer Đầu Tiên</span>
                          </button>
                        </div>
                      ) : (
                        <div className='space-y-3' data-testid='page-layers-list'>
                          {/* Selected Layer Inspector if any */}
                          {(() => {
                            const selectedElem = pageElements.find(
                              (e) => e.elementId === selectedElementId,
                            );
                            if (!selectedElem) return null;
                            const bible = selectedElem.bibleEntryId
                              ? bibleEntries.find((b) => b.id === selectedElem.bibleEntryId)
                              : null;
                            return (
                              <div
                                className='p-3 bg-[#F8F6F0] rounded-xl border-2 border-[#F97316]/50 space-y-2.5 shadow-2xs'
                                data-testid='selected-layer-inspector'
                              >
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-1.5 font-bold text-[#1C1917]'>
                                    <span className='px-1.5 py-0.5 rounded text-xs bg-[#FFF2E6] text-[#C2410C] border border-[#F97316]/30 font-mono'>
                                      z:{selectedElem.zIndex}
                                    </span>
                                    <span className='truncate max-w-[160px]'>
                                      {bible
                                        ? bible.name
                                        : LAYER_LABELS[selectedElem.elementType] ||
                                          selectedElem.elementType}
                                    </span>
                                  </div>
                                  <span className='font-mono text-xs text-[#57534E]'>
                                    ID: {selectedElem.elementId.slice(0, 8)}...
                                  </span>
                                </div>

                                <div className='grid grid-cols-2 gap-2 text-xs'>
                                  <div>
                                    <span className='text-[#57534E] block text-xs'>
                                      Loại Layer:
                                    </span>
                                    <span className='font-semibold text-[#1C1917]'>
                                      {LAYER_LABELS[selectedElem.elementType] ||
                                        selectedElem.elementType}
                                    </span>
                                  </div>
                                  <div>
                                    <span className='text-[#57534E] block text-xs'>Góc xoay:</span>
                                    <span className='font-mono font-semibold text-[#1C1917]'>
                                      {selectedElem.rotation || 0}°
                                    </span>
                                  </div>
                                  <div>
                                    <span className='text-[#57534E] block text-xs'>Toạ độ:</span>
                                    <span className='font-mono text-[#1C1917]'>
                                      {selectedElem.x}, {selectedElem.y} px
                                    </span>
                                  </div>
                                  <div>
                                    <span className='text-[#57534E] block text-xs'>
                                      Kích thước:
                                    </span>
                                    <span className='font-mono text-[#1C1917]'>
                                      {selectedElem.width} × {selectedElem.height} px
                                    </span>
                                  </div>
                                </div>

                                {bible && (
                                  <div className='p-2 bg-[#FCFBF8] rounded-lg border border-[#D8D2C5] flex items-center gap-2'>
                                    {bible.referenceImageUrl && (
                                      <AuthenticatedImage
                                        src={bible.referenceImageUrl}
                                        alt={bible.name}
                                        className='w-7 h-7 rounded object-cover border border-[#D8D2C5]'
                                      />
                                    )}
                                    <div className='min-w-0 flex-1'>
                                      <span className='text-xs text-[#57534E] block'>
                                        Series Bible:
                                      </span>
                                      <p className='text-xs font-bold text-[#1C1917] truncate'>
                                        {bible.name}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Controls */}
                                <div className='pt-2 border-t border-[#D8D2C5] flex items-center justify-between gap-1'>
                                  <div className='flex items-center gap-1'>
                                    <button
                                      type='button'
                                      onClick={() => handleRotateLayer(selectedElem, -15)}
                                      className='px-2 py-1 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] rounded text-[#1C1917] flex items-center gap-1 text-xs font-semibold cursor-pointer'
                                      title='Xoay trái 15 độ'
                                    >
                                      <RotateCw className='w-3 h-3 -scale-x-100' />
                                      <span>-15°</span>
                                    </button>
                                    <button
                                      type='button'
                                      onClick={() => handleRotateLayer(selectedElem, 15)}
                                      className='px-2 py-1 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] rounded text-[#1C1917] flex items-center gap-1 text-xs font-semibold cursor-pointer'
                                      title='Xoay phải 15 độ'
                                    >
                                      <RotateCw className='w-3 h-3' />
                                      <span>+15°</span>
                                    </button>
                                  </div>

                                  <div className='flex items-center gap-1'>
                                    <button
                                      type='button'
                                      onClick={() => handleChangeLayerZIndex(selectedElem, 1)}
                                      className='p-1.5 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] rounded text-[#1C1917] cursor-pointer'
                                      title='Lên 1 lớp (Tăng zIndex)'
                                    >
                                      <ArrowUp className='w-3.5 h-3.5' />
                                    </button>
                                    <button
                                      type='button'
                                      onClick={() => handleChangeLayerZIndex(selectedElem, -1)}
                                      className='p-1.5 bg-[#FCFBF8] border border-[#D8D2C5] hover:bg-[#F3F0E9] rounded text-[#1C1917] cursor-pointer'
                                      title='Xuống 1 lớp (Giảm zIndex)'
                                    >
                                      <ArrowDown className='w-3.5 h-3.5' />
                                    </button>
                                  </div>

                                  <button
                                    type='button'
                                    onClick={() => handleDeleteLayer(selectedElem)}
                                    className='p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer'
                                    title='Xoá layer'
                                  >
                                    <Trash2 className='w-3.5 h-3.5' />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Layer List Items */}
                          <div className='space-y-1.5'>
                            {visibleElements.length === 0 && (
                              <p
                                className='p-3 text-center text-xs text-[#57534E] border border-dashed border-[#D8D2C5] rounded-xl bg-[#FCFBF8]'
                                data-testid='no-panel-layers'
                              >
                                Panel #{selectedPanelNumber ?? '?'} chưa có layer nào (trang có{' '}
                                {pageElements.length} layer ở panel khác). Bấm "Xem cả trang" để xem
                                tất cả.
                              </p>
                            )}
                            {visibleElements
                              .slice()
                              .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
                              .map((el) => {
                                const isSelected = selectedElementId === el.elementId;
                                const bible = el.bibleEntryId
                                  ? bibleEntries.find((b) => b.id === el.bibleEntryId)
                                  : null;
                                const artRef = el.assetId
                                  ? pageArtworks.find((a) => a.id === el.assetId)
                                  : null;
                                const layerThumbUrl =
                                  artRef && panelArtworkUrls[artRef.id]
                                    ? toThumbnailUrl(panelArtworkUrls[artRef.id])
                                    : el.content?.startsWith('http') ||
                                        el.content?.startsWith('data:')
                                      ? el.content
                                      : null;
                                return (
                                  <div
                                    key={el.elementId}
                                    data-testid={`layer-item-${el.elementId}`}
                                    onClick={() => setSelectedElementId(el.elementId)}
                                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-[#F97316] bg-[#FFF2E6] shadow-xs ring-1 ring-[#F97316]'
                                        : 'border-[#D8D2C5] bg-[#FCFBF8] hover:border-[#F97316]/50'
                                    }`}
                                  >
                                    <div className='flex items-center gap-2 min-w-0 flex-1'>
                                      <div className='w-8 h-8 rounded-lg bg-[#F8F6F0] border border-[#D8D2C5] flex items-center justify-center shrink-0 text-[#57534E] overflow-hidden'>
                                        {bible?.referenceImageUrl ? (
                                          <AuthenticatedImage
                                            src={toThumbnailUrl(bible.referenceImageUrl)}
                                            alt={bible.name}
                                            className='w-full h-full rounded object-cover'
                                          />
                                        ) : layerThumbUrl ? (
                                          <img
                                            src={layerThumbUrl}
                                            alt={artRef?.fileName || 'Layer artwork'}
                                            className='w-full h-full rounded object-cover'
                                          />
                                        ) : (
                                          <>
                                            {el.elementType === 'CHARACTER_INSTANCE' && (
                                              <User className='w-4 h-4 text-purple-600' />
                                            )}
                                            {el.elementType === 'BACKGROUND' && (
                                              <Mountain className='w-4 h-4 text-emerald-600' />
                                            )}
                                            {el.elementType === 'PROP' && (
                                              <Package className='w-4 h-4 text-amber-600' />
                                            )}
                                            {el.elementType === 'EFFECT' && (
                                              <Zap className='w-4 h-4 text-red-500' />
                                            )}
                                            {el.elementType === 'ARTWORK_LAYER' && (
                                              <Palette className='w-4 h-4 text-blue-500' />
                                            )}
                                          </>
                                        )}
                                      </div>
                                      <div className='min-w-0 flex-1'>
                                        <p className='font-semibold text-xs text-[#1C1917] truncate'>
                                          {bible
                                            ? bible.name
                                            : LAYER_LABELS[el.elementType] || el.elementType}
                                        </p>
                                        <div className='flex items-center gap-1.5 text-xs text-[#57534E]'>
                                          <span className='font-mono'>z:{el.zIndex}</span>
                                          {el.rotation ? (
                                            <span className='font-mono'>• {el.rotation}°</span>
                                          ) : null}
                                          {el.panelId ? (
                                            <span className='bg-[#FFF2E6] text-[#C2410C] px-1 rounded'>
                                              Khung #
                                              {panels.find((p) => p.id === el.panelId)
                                                ?.panelNumber || '?'}
                                            </span>
                                          ) : (
                                            <span className='text-[#57534E]'>Toàn trang</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div
                                      className='flex items-center gap-1'
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type='button'
                                        data-testid={`rotate-layer-${el.elementId}`}
                                        onClick={() => handleRotateLayer(el, 15)}
                                        className='p-1 text-[#57534E] hover:text-[#1C1917] rounded hover:bg-[#F3F0E9] cursor-pointer'
                                        title='Xoay +15°'
                                      >
                                        <RotateCw className='w-3 h-3' />
                                      </button>
                                      <button
                                        type='button'
                                        data-testid={`layer-up-${el.elementId}`}
                                        onClick={() => handleChangeLayerZIndex(el, 1)}
                                        className='p-1 text-[#57534E] hover:text-[#1C1917] rounded hover:bg-[#F3F0E9] cursor-pointer'
                                        title='Lên 1 lớp'
                                      >
                                        <ArrowUp className='w-3.5 h-3.5' />
                                      </button>
                                      <button
                                        type='button'
                                        data-testid={`layer-down-${el.elementId}`}
                                        onClick={() => handleChangeLayerZIndex(el, -1)}
                                        className='p-1 text-[#57534E] hover:text-[#1C1917] rounded hover:bg-[#F3F0E9] cursor-pointer'
                                        title='Xuống 1 lớp'
                                      >
                                        <ArrowDown className='w-3.5 h-3.5' />
                                      </button>
                                      <button
                                        type='button'
                                        data-testid={`delete-layer-${el.elementId}`}
                                        onClick={() => handleDeleteLayer(el)}
                                        className='p-1 text-[#57534E] hover:text-red-600 rounded hover:bg-red-50 cursor-pointer'
                                        title='Xoá layer'
                                      >
                                        <Trash2 className='w-3.5 h-3.5' />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Xem lớn một phiên bản (chỉ xem, không đổi bản hiện hành) */}
      {previewArt &&
        (() => {
          const isCurrent =
            previewArt.id === (previewArt.panelId ? artFor(previewArt.panelId)?.id : pageArt?.id);
          const name = `${stageLabel(previewArt.pipelineStageId) || 'Bản'} v${previewArt.versionNumber}`;
          const scope = previewArt.panelId
            ? `Khung #${panels.find((p) => p.id === previewArt.panelId)?.panelNumber ?? '?'}`
            : 'Cả trang';
          return (
            <div
              className='fixed inset-0 z-[60] bg-[#1C1917]/70 flex items-center justify-center p-4'
              role='dialog'
              aria-modal='true'
              aria-label={`${name} · ${scope}`}
              data-testid='version-preview'
              onClick={() => setPreviewArt(null)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setPreviewArt(null);
              }}
            >
              <div
                className='bg-[#FCFBF8] rounded-xl p-3 w-full max-w-[min(92vw,960px)] max-h-[92vh] flex flex-col gap-2'
                onClick={(e) => e.stopPropagation()}
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-sm font-bold text-[#1C1917]'>
                    {name} · {scope}
                  </span>
                  <button
                    type='button'
                    autoFocus
                    onClick={() => setPreviewArt(null)}
                    className='p-1 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#F97316]'
                    aria-label='Đóng xem ảnh'
                  >
                    <X className='w-4 h-4' />
                  </button>
                </div>
                <div className='min-h-0 flex-1 flex items-center justify-center bg-[#ECE7DC] rounded-lg overflow-hidden'>
                  {panelArtworkUrls[previewArt.id] ? (
                    <img
                      src={panelArtworkUrls[previewArt.id]}
                      alt={`${name} · ${scope}`}
                      className='max-w-full max-h-[78vh] object-contain'
                    />
                  ) : (
                    <Loader2 className='w-6 h-6 animate-spin text-[#C2410C] m-8' />
                  )}
                </div>
                <p className='text-xs text-[#57534E]'>
                  {isCurrent
                    ? 'Đây là bản đang hiển thị trên canvas.'
                    : 'Bản lịch sử — chỉ để xem, không thay đổi bản hiện hành.'}{' '}
                  {previewArt.fileName} · {Math.round(previewArt.sizeBytes / 1024)} KB
                </p>
              </div>
            </div>
          );
        })()}

      {/* Modal: Frame Template */}
      {selectedPage && (
        <FrameTemplateModal
          isOpen={frameTemplateModalOpen}
          onClose={() => setFrameTemplateModalOpen(false)}
          workspaceId={workspaceId || ''}
          pageId={selectedPage.id}
          pageNumber={selectedPage.pageNumber}
          hasExistingPanels={panels.length > 0}
          onApplied={(newPanels) => {
            setPanels(newPanels);
            if (newPanels.length > 0) {
              setSelectedPanelId(newPanels[0].id);
            }
          }}
          onShowToast={showToast}
        />
      )}

      {/* Modal: Create Page */}
      {createModalOpen && (
        <div className='fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-3'>
              <h3 className='text-base font-serif font-bold text-[#1C1917]'>
                Tạo Trang Truyện Mới
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className='text-[#57534E] hover:text-[#1C1917] p-1.5 rounded-lg hover:bg-[#F3F0E9] transition-colors cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleCreatePage} className='space-y-3.5 text-xs'>
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>
                  Số thứ tự trang (Page Number)
                </label>
                <input
                  type='number'
                  value={newPageNumber}
                  onChange={(e) => setNewPageNumber(parseInt(e.target.value, 10))}
                  className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                  required
                />
              </div>
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>
                  Kiểu bố cục (Layout Format)
                </label>
                <select
                  value={newLayoutFormat}
                  onChange={(e) => setNewLayoutFormat(e.target.value)}
                  className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                >
                  <option value='StandardPage'>StandardPage (Trang đơn tiêu chuẩn)</option>
                  <option value='SpreadLeft'>SpreadLeft (Trang đôi - Nửa trái)</option>
                  <option value='SpreadRight'>SpreadRight (Trang đôi - Nửa phải)</option>
                  <option value='WebtoonScroll'>WebtoonScroll (Cuộn dọc)</option>
                </select>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={newWidthPx}
                    onChange={(e) => setNewWidthPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={newHeightPx}
                    onChange={(e) => setNewHeightPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                  />
                </div>
              </div>
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>Độ phân giải DPI</label>
                <select
                  value={newDpi}
                  onChange={(e) => setNewDpi(e.target.value)}
                  className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                >
                  <option value='300'>300 DPI (Web &amp; Digital Preview)</option>
                  <option value='600'>600 DPI (B5 Tankōbon Print Standard)</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 pt-2 border-t border-[#D8D2C5]'>
                <button
                  type='button'
                  onClick={() => setCreateModalOpen(false)}
                  className='px-3.5 py-2 rounded-xl text-[#57534E] hover:bg-[#F3F0E9] font-medium transition-colors cursor-pointer'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold shadow-soft-sm transition-all cursor-pointer active:scale-95'
                >
                  Tạo Trang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Canvas Settings */}
      {settingsModalOpen && (
        <div className='fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-center justify-center p-4'>
          <div className='bg-[#FCFBF8] rounded-2xl border border-[#D8D2C5] shadow-2xl max-w-md w-full p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-3'>
              <h3 className='text-base font-serif font-bold text-[#1C1917]'>
                Cập Nhật Thông Số Canvas Trang
              </h3>
              <button
                onClick={() => setSettingsModalOpen(false)}
                className='text-[#57534E] hover:text-[#1C1917] p-1.5 rounded-lg hover:bg-[#F3F0E9] transition-colors cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <form onSubmit={handleUpdateCanvas} className='space-y-3.5 text-xs'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={editWidthPx}
                    onChange={(e) => setEditWidthPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={editHeightPx}
                    onChange={(e) => setEditHeightPx(e.target.value)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                  />
                </div>
              </div>
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>Độ phân giải DPI</label>
                <select
                  value={editDpi}
                  onChange={(e) => setEditDpi(e.target.value)}
                  className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                >
                  <option value='300'>300 DPI</option>
                  <option value='600'>600 DPI</option>
                </select>
              </div>
              <div className='flex justify-end gap-2 pt-2 border-t border-[#D8D2C5]'>
                <button
                  type='button'
                  onClick={() => setSettingsModalOpen(false)}
                  className='px-3.5 py-2 rounded-xl text-[#57534E] hover:bg-[#F3F0E9] font-medium transition-colors cursor-pointer'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold shadow-soft-sm transition-all cursor-pointer active:scale-95'
                >
                  Lưu Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm Layer Ảnh / Element Mới (CF2) */}
      {createLayerModalOpen && (
        <div
          className='fixed inset-0 z-50 bg-[#1C1917]/60 backdrop-blur-xs flex items-center justify-center p-4'
          data-testid='create-layer-modal'
        >
          <div className='bg-[#FCFBF8] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#D8D2C5] space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar'>
            <div className='flex items-center justify-between border-b border-[#D8D2C5] pb-3'>
              <div className='flex items-center gap-2'>
                <div className='p-2 bg-[#FFF2E6] rounded-xl text-[#C2410C]'>
                  <Layers className='w-4 h-4' />
                </div>
                <div>
                  <h3 className='font-serif font-bold text-base text-[#1C1917]'>
                    Thêm Layer / Element Ảnh Canvas
                  </h3>
                  <p className='text-xs text-[#57534E]'>
                    Tạo layer nhân vật, bối cảnh, đạo cụ hoặc hiệu ứng (CF2)
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => setCreateLayerModalOpen(false)}
                className='p-1.5 rounded-lg text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9] cursor-pointer transition-colors'
              >
                <X className='w-4 h-4' />
              </button>
            </div>

            <form onSubmit={handleCreateLayer} className='space-y-3.5 text-xs'>
              {/* Loại Layer */}
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>
                  Loại Layer Ảnh (Master Data)
                </label>
                <select
                  value={newLayerType}
                  onChange={(e) => setNewLayerType(e.target.value as ImageLayerType)}
                  className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] font-medium focus:border-[#F97316] focus:outline-none'
                  data-testid='select-layer-type'
                >
                  {IMAGE_LAYER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {LAYER_LABELS[t] || t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Neo vào Panel hoặc Toàn trang */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>
                    Gắn Với Panel (Tuỳ chọn)
                  </label>
                  <select
                    value={newLayerPanelId}
                    onChange={(e) => setNewLayerPanelId(e.target.value)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                    data-testid='select-layer-panel'
                  >
                    <option value=''>Toàn trang (Không thuộc panel)</option>
                    {panels.map((p) => (
                      <option key={p.id} value={p.id}>
                        Khung #{p.panelNumber} (Đọc #{p.readingOrder})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>
                    Mục Series Bible (Tuỳ chọn)
                  </label>
                  <select
                    value={newLayerBibleEntryId}
                    onChange={(e) => setNewLayerBibleEntryId(e.target.value)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                    data-testid='select-layer-bible-entry'
                  >
                    <option value=''>Không gắn mục Bible</option>
                    {bibleEntries.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.category}] {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ảnh Artwork Uploaded hoặc Link */}
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>
                  Artwork Đã Tải Lên (AssetId)
                </label>
                <select
                  value={newLayerAssetId}
                  onChange={(e) => setNewLayerAssetId(e.target.value)}
                  className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl bg-[#FCFBF8] text-[#1C1917] font-mono text-xs focus:border-[#F97316] focus:outline-none'
                  data-testid='select-layer-asset'
                >
                  <option value=''>Không dùng assetId sẵn có</option>
                  {pageArtworks.map((a) => (
                    <option key={a.id} value={a.id}>
                      v{a.versionNumber}{' '}
                      {a.panelId ? `[Panel ${a.panelId.slice(0, 6)}]` : '[Toàn trang]'}
                    </option>
                  ))}
                </select>
              </div>

              {/* URL ảnh / Mô tả ghi chú */}
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>
                  Đường Dẫn Ảnh (URL) Hoặc Ghi Chú
                </label>
                <input
                  type='text'
                  value={newLayerContent}
                  onChange={(e) => setNewLayerContent(e.target.value)}
                  placeholder='https://... hoặc data:image/... hoặc mô tả layer'
                  className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono text-xs bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                  data-testid='input-layer-content'
                />
              </div>

              {/* Vị trí X, Y */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Toạ độ X (px)</label>
                  <input
                    type='number'
                    value={newLayerX}
                    onChange={(e) => setNewLayerX(parseFloat(e.target.value) || 0)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                    data-testid='input-layer-x'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Toạ độ Y (px)</label>
                  <input
                    type='number'
                    value={newLayerY}
                    onChange={(e) => setNewLayerY(parseFloat(e.target.value) || 0)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                    data-testid='input-layer-y'
                  />
                </div>
              </div>

              {/* Kích thước Rộng, Cao */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Chiều rộng (px)</label>
                  <input
                    type='number'
                    value={newLayerWidth}
                    onChange={(e) => setNewLayerWidth(parseFloat(e.target.value) || 100)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                    data-testid='input-layer-w'
                  />
                </div>
                <div>
                  <label className='block font-semibold text-[#1C1917] mb-1'>Chiều cao (px)</label>
                  <input
                    type='number'
                    value={newLayerHeight}
                    onChange={(e) => setNewLayerHeight(parseFloat(e.target.value) || 100)}
                    className='w-full px-3 py-2 border border-[#D8D2C5] rounded-xl font-mono bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                    data-testid='input-layer-h'
                  />
                </div>
              </div>

              {/* Góc xoay */}
              <div>
                <label className='block font-semibold text-[#1C1917] mb-1'>
                  Góc Xoay (Độ, 0 - 359°):{' '}
                  <span className='font-mono text-[#C2410C] font-bold'>{newLayerRotation}°</span>
                </label>
                <div className='flex items-center gap-3'>
                  <input
                    type='range'
                    min='0'
                    max='359'
                    value={newLayerRotation}
                    onChange={(e) => setNewLayerRotation(parseInt(e.target.value, 10))}
                    className='flex-1 accent-[#F97316]'
                  />
                  <input
                    type='number'
                    min='0'
                    max='359'
                    value={newLayerRotation}
                    onChange={(e) => setNewLayerRotation(parseInt(e.target.value, 10) || 0)}
                    className='w-20 px-2.5 py-1.5 border border-[#D8D2C5] rounded-xl font-mono text-center bg-[#FCFBF8] text-[#1C1917] focus:border-[#F97316] focus:outline-none'
                    data-testid='input-layer-rotation'
                  />
                </div>
              </div>

              <div className='flex justify-end gap-2 pt-3 border-t border-[#D8D2C5]'>
                <button
                  type='button'
                  onClick={() => setCreateLayerModalOpen(false)}
                  className='px-3.5 py-2 rounded-xl text-[#57534E] hover:bg-[#F3F0E9] font-medium cursor-pointer transition-colors'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  className='px-4 py-2 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold transition-all cursor-pointer shadow-soft-sm active:scale-95'
                  data-testid='submit-create-layer'
                >
                  Tạo Layer Ảnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File input ẩn tải ảnh panel */}
      <input
        ref={panelFileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        data-testid='desk-panel-file-input'
        onChange={handlePanelFileSelected}
      />

      {/* File input ẩn tải ảnh toàn trang (Full-page Composite) */}
      <input
        ref={pageFileInputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        className='hidden'
        data-testid='desk-page-file-input'
        onChange={handlePageFileSelected}
      />

      {/* Drawer Tham chiếu Series Bible (FR-Artist-04) */}
      <BibleReferenceDrawer
        isOpen={bibleDrawerOpen}
        onClose={() => setBibleDrawerOpen(false)}
        seriesId={seriesId}
        chapterId={currentChapterId || undefined}
        chapterNumber={chapters.find((c) => c.id === currentChapterId)?.chapterNumber ?? 1}
        panelId={selectedDrawerPanelId || selectedPanelId || (panels[0]?.id ?? null)}
        panelNumber={
          panels.find((p) => p.id === (selectedDrawerPanelId || selectedPanelId))?.panelNumber ??
          null
        }
        availablePanels={panels.map((p) => ({
          id: p.id,
          panelNumber: p.panelNumber,
          readingOrder: p.readingOrder,
        }))}
        onSelectPanel={(pid) => {
          setSelectedDrawerPanelId(pid);
          setSelectedPanelId(pid);
        }}
      />

      {/* Concurrency Conflict Modal (BR-11 / NFR-09) */}
      <ElementConflictModal
        isOpen={conflictModalOpen}
        title='Xung Đột Phiên Bản Khung Tranh (BR-11)'
        subtitle='Optimistic Concurrency Control — PANEL_VERSION_CONFLICT'
        entityType='Khung tranh'
        elementId={conflictPanelId}
        errorMessage={conflictErrorMsg}
        onReload={() => {
          if (selectedPage) void loadPanels(selectedPage.id);
        }}
        onClose={() => setConflictModalOpen(false)}
      />
    </div>
  );
};

export default ArtistDeskView;
