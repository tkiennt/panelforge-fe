// src/roles/letterer/views/LetteringWorkspace.tsx
import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  MessageCircle,
  Type,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Plus,
  BookOpen,
  CheckCircle2,
  FileText,
  ListOrdered,
  Sparkles,
  Move,
  Layers,
  Bot,
  Hand,
  Eye,
  EyeOff,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Check,
  X,
  GripVertical,
  ShieldAlert,
  Smartphone,
  Split,
  Compass,
  Globe,
} from 'lucide-react';
import {
  elementService,
  ElementSnapshotDto,
  PageSnapshotDto,
  MoveElementRequest,
  IMAGE_LAYER_TYPES,
  LAYER_LABELS,
  type TextStyleDto,
} from '@/services/element.service';
import { pageService } from '@/services/page.service';
import { chapterService } from '@/services/chapter.service';
import { panelService } from '@/services/panel.service';
import { bibleService } from '@/services/bible.service';
import { artworkService, resolveArtworkUrl, toThumbnailUrl } from '@/services/artwork.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { pickPageArtwork, pickPanelArtwork } from '@/shared/utils/stageArtworks';
import type { AssetReferenceDto } from '@/types';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';
import { parseBoundingBox } from '@/shared/utils/panelBoundingBox';
import type { PanelDto } from '@/types/pipeline';
import {
  scriptLineService,
  SceneDto,
  SceneScriptLineSummaryDto,
} from '@/services/scriptLine.service';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { aiAgentsService, LetteringSuggestion, AiSuggestionDto } from '@/services/aiAgents.service';
import { offlineQueueService } from '@/services/offlineQueue.service';
import { OfflineStatusBanner } from '@/shared/components/OfflineStatusBanner';
import { ElementConflictModal } from '@/shared/modals/ElementConflictModal';
import { AutoAssignScriptLinesModal } from '@/shared/modals/AutoAssignScriptLinesModal';
import {
  LETTERING_FONT_PX,
  LETTERING_CHAR_WIDTH_EM,
  LETTERING_LINE_HEIGHT_EM,
  LETTERING_PADDING_PX,
  MIN_LETTERING_FONT_PX,
  MAX_WORDS_PER_BALLOON,
  countWords,
  estimateBoxHeight,
  fitView,
  keepCenter,
  screenToPage,
  pageToScreen,
  wheelZoomFactor,
  snapBox,
  nudgeDelta,
  SNAP_SCREEN_PX,
  type SnapTargets,
  zoomAt,
  zoomAtCenter,
  type FitMode,
  type Size,
  type ViewState,
  evaluateTextConstraints,
  splitTextIntoTwoBalloons,
  rectsOverlap,
  findKeepOutCollision,
  suggestBalloonPosition,
  calculatePanelTextDensity,
  sortBalloonsReadingOrder,
  checkReadingOrderMismatch,
  hasTimeMarker,
  createThoughtTailDots,
  type KeepOutZone,
  type Rect,
  type PanelTextDensity,
} from '../lib/lettererView';
import {
  canvasFont,
  resolveTextStyle,
  textStyleCss,
  classifyScriptLine,
  type ScriptLineClassification,
  type ScriptLineKind,
} from '../lib/textStyle';
import { TextFormatToolbar } from '../components/TextFormatToolbar';
import { BalloonAppearancePanel } from '../components/BalloonAppearancePanel';
import {
  BALLOON_SHAPES,
  balloonPath,
  defaultAppearance,
  defaultTail,
  fillRgba,
  fitBoxHeight,
  fitFontSize,
  layoutText,
  resolveAppearance,
  appearanceFromStyle,
  mergeTextStyle,
  tailFromStyle,
  withAppearance,
  resizeFromCorner,
  type ResizeCorner,
  type BalloonAppearance,
} from '../lib/balloonRender';

interface LetteringWorkspaceProps {
  pageId?: string;
  chapterId?: string;
  seriesId?: string;
  isReadOnly?: boolean;
  onShowToast?: (title: string, desc: string) => void;
}

type ToolMode = 'select' | 'hand' | 'balloon' | 'thought' | 'narration' | 'sfx' | 'keepout';

const TOOL_TO_TYPE: Record<string, string> = {
  balloon: 'SPEECH_BALLOON',
  thought: 'THOUGHT_BALLOON',
  narration: 'NARRATION_BOX',
  sfx: 'SOUND_EFFECT',
};

const TYPE_TO_TOOL: Record<string, ToolMode> = {
  SPEECH_BALLOON: 'balloon',
  THOUGHT_BALLOON: 'thought',
  NARRATION_BOX: 'narration',
  SOUND_EFFECT: 'sfx',
};

const TYPE_SHORT_LABEL: Record<string, string> = {
  SPEECH_BALLOON: 'Thoại',
  THOUGHT_BALLOON: 'Suy nghĩ',
  NARRATION_BOX: 'Dẫn truyện',
  SOUND_EFFECT: 'SFX',
};

// Kích thước mặc định (px trang) theo loại; chiều cao còn được nới theo độ dài chữ khi đặt.
const DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  SPEECH_BALLOON: { w: 280, h: 160 },
  THOUGHT_BALLOON: { w: 280, h: 160 },
  NARRATION_BOX: { w: 360, h: 140 },
  SOUND_EFFECT: { w: 240, h: 120 },
};

const SAFE_MARGIN_PX = 40;
const MIN_BOX_W = 80;
const MIN_BOX_H = 50;
const SIDE_MIN = 220;
const SIDE_MAX = 560;
const LAYOUT_KEY = 'pf.letterer.layout.v1';

interface LayoutPrefs {
  leftOpen: boolean;
  rightOpen: boolean;
  leftW: number;
  rightW: number;
}

const DEFAULT_LAYOUT: LayoutPrefs = { leftOpen: true, rightOpen: true, leftW: 288, rightW: 288 };

const DEFAULT_KEEPOUT_ZONES: KeepOutZone[] = [
  {
    id: 'kz-face-minh',
    panelId: 'panel-minh',
    label: 'Mặt nhân vật Minh',
    x: 140,
    y: 180,
    width: 220,
    height: 240,
  },
  {
    id: 'kz-face-hoa',
    panelId: 'panel-hoa',
    label: 'Mặt & tay nhân vật Hoà',
    x: 680,
    y: 650,
    width: 240,
    height: 280,
  },
];

function loadLayout(): LayoutPrefs {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const p = JSON.parse(raw);
    const clamp = (n: unknown, fallback: number) =>
      typeof n === 'number' && Number.isFinite(n)
        ? Math.min(SIDE_MAX, Math.max(SIDE_MIN, n))
        : fallback;
    return {
      leftOpen: p.leftOpen !== false,
      rightOpen: p.rightOpen !== false,
      leftW: clamp(p.leftW, DEFAULT_LAYOUT.leftW),
      rightW: clamp(p.rightW, DEFAULT_LAYOUT.rightW),
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: LayoutPrefs) {
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Không có localStorage (chế độ riêng tư...): bỏ qua, chỉ mất ghi nhớ bố cục.
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}

function checkIsNetworkError(err: any): boolean {
  if (
    err.conflict === 'ELEMENT_VERSION_CONFLICT' ||
    err.code === 'CONFLICT' ||
    err.status === 409 ||
    err.response?.status === 409 ||
    err.message?.includes('ELEMENT_VERSION_CONFLICT')
  ) {
    return false;
  }
  return !err.response || err.code === 'ERR_NETWORK';
}

/** Dòng "Người dẫn truyện" = dòng kịch bản không có người nói (phân loại NARRATION). */
function isNarratorLine(line: SceneScriptLineSummaryDto): boolean {
  return classifyScriptLine(line).kind === 'NARRATION';
}

function panelPolygon(panel: PanelDto, pageW: number, pageH: number): string {
  const box = parseBoundingBox(panel.boundingBox, pageW, pageH);
  const pts =
    box.corners && box.corners.length >= 3
      ? box.corners.map((c) => ({
          x: box.pixelX + c.x * box.pixelW,
          y: box.pixelY + c.y * box.pixelH,
        }))
      : [
          { x: box.pixelX, y: box.pixelY },
          { x: box.pixelX + box.pixelW, y: box.pixelY },
          { x: box.pixelX + box.pixelW, y: box.pixelY + box.pixelH },
          { x: box.pixelX, y: box.pixelY + box.pixelH },
        ];
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * Ô nhập chữ chỉ gửi lên máy chủ khi rời ô (blur) hoặc Ctrl+Enter, không gửi mỗi phím gõ:
 * tránh bắn một request + tăng version cho từng ký tự và tránh xung đột phiên bản (BR-11).
 */
const CommitTextarea: React.FC<{
  value: string;
  readOnly?: boolean;
  onCommit: (text: string) => void;
  onDone?: () => void;
  className?: string;
  style?: React.CSSProperties;
  rows?: number;
  autoFocus?: boolean;
  placeholder?: string;
  testId?: string;
}> = ({
  value,
  readOnly,
  onCommit,
  onDone,
  className,
  style,
  rows,
  autoFocus,
  placeholder,
  testId,
}) => {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const cancelled = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  return (
    <textarea
      value={draft}
      readOnly={readOnly}
      autoFocus={autoFocus}
      rows={rows}
      placeholder={placeholder}
      data-testid={testId}
      className={className}
      style={style}
      onFocus={() => {
        focused.current = true;
        cancelled.current = false;
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        focused.current = false;
        if (!cancelled.current && !readOnly && draft !== value) onCommit(draft);
        if (cancelled.current) setDraft(value);
        onDone?.();
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          cancelled.current = true;
          (e.target as HTMLTextAreaElement).blur();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
    />
  );
};

interface PendingPlacement {
  line: SceneScriptLineSummaryDto;
  elementType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** false = đang kéo; true = đã thả, chờ người dùng xác nhận đặt. */
  dropped: boolean;
}

export const LetteringWorkspace: React.FC<LetteringWorkspaceProps> = ({
  pageId: propPageId,
  chapterId: propChapterId,
  seriesId: propSeriesId,
  isReadOnly = false,
  onShowToast,
}) => {
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();
  const { seriesId } = useParams<{ seriesId?: string }>();
  const activePageId = propPageId || searchParams.get('pageId') || '';
  const activeChapterId = propChapterId || searchParams.get('chapterId') || '';
  const activeSeriesId = propSeriesId || searchParams.get('seriesId') || '';

  const [pageSnapshot, setPageSnapshot] = useState<PageSnapshotDto | null>(null);
  const [elements, setElements] = useState<ElementSnapshotDto[]>([]);

  // ── Ghi theo phiên bản (BR-11): mỗi element ghi tuần tự, luôn gửi phiên bản mới nhất đã biết ──
  // Trước đây thao tác thứ hai (vd resize liên tiếp) gửi trước khi thao tác đầu trả về, mang phiên bản cũ → 409 giả.
  const [writes] = useState(() => ({
    versions: new Map<string, number>(),
    queue: new Map<string, Promise<unknown>>(),
  }));
  useEffect(() => {
    // Phản chiếu đúng phiên bản trong state (kể cả khi tải lại sau xung đột làm phiên bản đổi)
    for (const b of elements) writes.versions.set(b.elementId, b.version || 1);
  }, [elements, writes]);
  const sendVersioned = (
    elementId: string,
    send: (version: number) => Promise<{ elementVersion?: number } | unknown>,
  ) => {
    const run = async () => {
      const version =
        writes.versions.get(elementId) ??
        elements.find((e) => e.elementId === elementId)?.version ??
        1;
      const res = (await send(version)) as { elementVersion?: number } | undefined;
      // Dùng phiên bản thật máy chủ trả về: thao tác không đổi gì (thả đúng chỗ cũ, cùng kiểu chữ) thì máy chủ
      // không tăng phiên bản — tự +1 ở đây là nguyên nhân 409 khi làm xong bóng này rồi sang bóng khác.
      let next = res?.elementVersion;
      if (typeof next !== 'number') {
        // API cũ chưa trả elementVersion: đọc lại phiên bản từ máy chủ thay vì đoán
        const snap = await elementService.getPageSnapshot(activePageId).catch(() => null);
        next = snap?.elements.find((e) => e.elementId === elementId)?.version ?? version + 1;
      }
      const confirmed = next;
      writes.versions.set(elementId, confirmed);
      setElements((prev) =>
        prev.map((b) => (b.elementId === elementId ? { ...b, version: confirmed } : b)),
      );
    };
    const prev = writes.queue.get(elementId) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(run);
    writes.queue.set(elementId, next);
    return next;
  };
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ngôn ngữ soạn thảo bóng thoại (BR-34: balloon localization): 'vi' (ngôn ngữ gốc), 'en', 'ja', 'ko'...
  const [activeLang, setActiveLang] = useState<string>('vi');

  const getElementText = useCallback((el: ElementSnapshotDto, lang: string) => {
    if (lang === 'vi') return el.content || el.renderedText || '';
    return el.texts?.[lang] ?? el.content ?? el.renderedText ?? '';
  }, []);

  // Kích thước canvas thực tế (px) từ cấu hình Page (Lỗi 1)
  const [pageDim, setPageDim] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 1800,
  });

  // Layer filter on canvas (CF2 2.5: nhân vật / bối cảnh / đạo cụ / hiệu ứng)
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({
    BACKGROUND: true,
    CHARACTER_INSTANCE: true,
    PROP: true,
    EFFECT: true,
  });
  const [showLayerFilterMenu, setShowLayerFilterMenu] = useState(false);

  // AI Letterer Agent (CF2 2.4: rút gọn thoại vừa balloon)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [autoAssignModalOpen, setAutoAssignModalOpen] = useState(false);
  const [currentPageInfo, setCurrentPageInfo] = useState<{ pageNumber: number } | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<LetteringSuggestion[]>([]);
  const [currentAiSuggestionId, setCurrentAiSuggestionId] = useState<string | null>(null);
  const [chapterVersionVector, setChapterVersionVector] = useState<number>(1);

  // Script lines & Scenes
  const [scenes, setScenes] = useState<SceneDto[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sceneLines, setSceneLines] = useState<SceneScriptLineSummaryDto[]>([]);
  const [selectedScriptLine, setSelectedScriptLine] = useState<SceneScriptLineSummaryDto | null>(
    null,
  );

  // Tool Mode & Placement
  const [toolMode, setToolMode] = useState<ToolMode>('balloon');

  // Conflict Modal State (BR-11 & Lỗi 3)
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictElementId, setConflictElementId] = useState<string | undefined>();
  const [conflictErrorMsg, setConflictErrorMsg] = useState<string | undefined>();

  // Overflow Acknowledgment state
  const [ackReason, setAckReason] = useState('');

  // ── Bố cục: bảng kịch bản / thuộc tính thu-mở, đổi rộng, chế độ tập trung ──
  const [layout, setLayout] = useState<LayoutPrefs>(loadLayout);
  const [focusMode, setFocusMode] = useState(false);
  const [readerMode, setReaderMode] = useState(false);
  const leftVisible = layout.leftOpen && !focusMode && !readerMode;
  const rightVisible = layout.rightOpen && !focusMode && !readerMode;
  useEffect(() => saveLayout(layout), [layout]);

  // ── Manga Lettering State: Đuôi bóng, Vùng cấm, Thứ tự đọc RTL ──
  // Hình bóng / nền / viền / đuôi lưu trong `style` của element (PUT .../style) — cùng nguồn với màn duyệt và bản xuất.
  // `tailDraft` chỉ giữ vị trí đuôi trong lúc đang kéo; thả chuột mới lưu.
  const [tailDraft, setTailDraft] = useState<Record<string, { x: number; y: number }>>({});
  const appearanceOf = (b: { elementType: string; style?: TextStyleDto | null }) =>
    resolveAppearance(b.elementType, appearanceFromStyle(b.style));
  // patch = null: bỏ phần chỉnh bóng, về giao diện mặc định theo loại
  const updateAppearance = (
    elementId: string,
    patch: (Partial<BalloonAppearance> & { tail?: { x: number; y: number } | null }) | null,
  ) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;
    const next = withAppearance(
      target.style,
      resolveTextStyle({ elementType: target.elementType }),
      patch,
    );
    void handleUpdateStyle(elementId, next);
  };

  // Đo chữ phải chờ webfont, nếu không sẽ đo bằng font dự phòng rồi lệch với màn duyệt
  const [fontsReady, setFontsReady] = useState(0);
  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts) return;
    const bump = () => setFontsReady((n) => n + 1);
    fonts.ready?.then(bump).catch(() => undefined);
    fonts.addEventListener?.('loadingdone', bump);
    return () => fonts.removeEventListener?.('loadingdone', bump);
  }, []);

  const [localKeepOutZones, setLocalKeepOutZones] = useState<KeepOutZone[]>(() => {
    try {
      const raw = localStorage.getItem(`pf.letterer.keepout.${activePageId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return DEFAULT_KEEPOUT_ZONES;
  });
  useEffect(() => {
    if (!activePageId) return;
    try {
      localStorage.setItem(
        `pf.letterer.keepout.${activePageId}`,
        JSON.stringify(localKeepOutZones),
      );
    } catch {
      /* ignore */
    }
  }, [localKeepOutZones, activePageId]);

  const [drawingKeepOut, setDrawingKeepOut] = useState<Rect | null>(null);
  const drawingKeepOutStartRef = useRef<{ x: number; y: number } | null>(null);

  const [isRTL, setIsRTL] = useState(true); // Manga mặc định: Phải → Trái
  const [showReadingOrder, setShowReadingOrder] = useState(true);

  // ── Góc nhìn zoom/pan: artwork và lớp lettering cùng nằm trong một "stage" chịu chung phép biến đổi ──
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewState>({ scale: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  const [fitMode, setFitMode] = useState<FitMode | null>('page');
  const fitModeRef = useRef(fitMode);
  const [vpSize, setVpSize] = useState<Size>({ width: 0, height: 0 });
  const vpSizeRef = useRef(vpSize);
  const pageDimRef = useRef(pageDim);
  // Các handler sự kiện/window đọc giá trị mới nhất qua ref (cập nhật sau mỗi lần render, không trong lúc render)
  useLayoutEffect(() => {
    viewRef.current = view;
    fitModeRef.current = fitMode;
    pageDimRef.current = pageDim;
  });
  const [spacePressed, setSpacePressed] = useState(false);
  const [panning, setPanning] = useState(false);
  const panMovedRef = useRef(false);

  // ── Hiển thị ──
  const [backdropUrl, setBackdropUrl] = useState<string | null>(null);
  const [panels, setPanels] = useState<PanelDto[]>([]);
  const [pageArtworks, setPageArtworks] = useState<AssetReferenceDto[]>([]);
  const [panelArtworkUrls, setPanelArtworkUrls] = useState<Record<string, string>>({});
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [quickFilter, setQuickFilter] = useState<'all' | 'unplaced' | 'current_panel'>('all');
  // Làm mờ bóng thoại để nhìn xuyên xuống ảnh khi cần canh vị trí (chỉ hiển thị, không lưu).
  const [seeThrough, setSeeThrough] = useState(false);
  // Tạm ẩn toàn bộ lớp chữ để xem tranh gốc (chỉ hiển thị, không lưu).
  const [hideLettering, setHideLettering] = useState(false);
  // Độ đục nền bóng thoại (0–100%), chữ và viền vẫn rõ; chỉ hiển thị, nhớ trong localStorage.
  // Tự co chữ khi kéo đổi kích thước bóng (tuỳ chọn của người dùng, nhớ trên máy)
  const [autoFitText, setAutoFitText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('letterer.autoFitText') !== '0';
    } catch {
      return true;
    }
  });
  const toggleAutoFitText = (on: boolean) => {
    setAutoFitText(on);
    try {
      localStorage.setItem('letterer.autoFitText', on ? '1' : '0');
    } catch {
      // chế độ riêng tư: chỉ giữ trong phiên
    }
  };
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('letterer.bgOpacity'));
      return Number.isFinite(v) &&
        v >= 0 &&
        v <= 100 &&
        localStorage.getItem('letterer.bgOpacity') !== null
        ? v
        : 100;
    } catch {
      return 100;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('letterer.bgOpacity', String(bgOpacity));
    } catch {
      /* bỏ qua */
    }
  }, [bgOpacity]);
  const [showGuides, setShowGuides] = useState(true);

  // ── Kéo dòng kịch bản vào trang: bản xem trước + xác nhận ──
  const [draggingLine, setDraggingLine] = useState<SceneScriptLineSummaryDto | null>(null);
  const [pending, setPending] = useState<PendingPlacement | null>(null);

  // Chữ tràn khung: elementId → chiều cao chữ thực đo được (px trang) khi vượt khung
  const [overflowInfo, setOverflowInfo] = useState<Record<string, number>>({});

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingRef = useRef<{
    elementId: string;
    startX: number;
    startY: number;
    initialPxX: number;
    initialPxY: number;
    /** Vị trí cuối cùng đã hiển thị (đã hút + kẹp biên), dùng khi thả chuột. */
    lastX?: number;
    lastY?: number;
  } | null>(null);
  // Đường dóng đang hút khi kéo bóng (px trang); null = không hút theo trục đó
  const [snapGuides, setSnapGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  // Dời bằng phím mũi tên: gộp nhiều lần bấm thành một PUT .../position
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (title: string, desc: string) => {
      if (onShowToast) onShowToast(title, desc);
    },
    [onShowToast],
  );

  // Nạp thông tin kích thước trang (px) từ backend
  useEffect(() => {
    if (!activePageId || typeof pageService?.getPageById !== 'function') return;
    try {
      const res = pageService.getPageById(activePageId);
      if (res && typeof res.then === 'function') {
        res
          .then((p) => {
            if (p) {
              if (p.widthPx && p.heightPx) {
                setPageDim({ width: p.widthPx, height: p.heightPx });
              }
              if (p.pageNumber) {
                setCurrentPageInfo({ pageNumber: p.pageNumber });
              }
            }
          })
          .catch((err) => {
            console.warn('Lỗi nạp kích thước trang:', err);
          });
      }
    } catch (err) {
      console.warn('Lỗi gọi getPageById:', err);
    }
  }, [activePageId]);

  // Nạp stages của pipeline để biết thứ tự và chọn đúng artwork hoàn thiện (CF2 / BR-08)
  useEffect(() => {
    if (!activeSeriesId) return;
    let alive = true;
    pipelineService
      .getSeriesPipeline(activeSeriesId)
      .then((p) => {
        const stageList = Array.isArray(p) ? p : (p?.stages ?? []);
        if (alive) setStages(stageList);
      })
      .catch(() => {
        if (alive) setStages([]);
      });
    return () => {
      alive = false;
    };
  }, [activeSeriesId]);

  // Ảnh nền của trang (ghép từ artwork của Artist) để Letterer thấy chỗ cần đặt bóng thoại.
  // Không vẽ element lên ảnh nền: bóng thoại vẫn là lớp tương tác riêng phía trên.
  useEffect(() => {
    setBackdropUrl(null);
    setPanels([]);
    setPageArtworks([]);
    setPanelArtworkUrls({});
    if (!activePageId || !activeChapterId) return;
    let cancelled = false;
    (async () => {
      try {
        const [panelList, artworks] = await Promise.all([
          panelService.getPanelsByPage(activePageId),
          artworkService.getArtworks(activeChapterId, activePageId),
        ]);
        if (cancelled) return;
        const validPanels = Array.isArray(panelList) ? panelList : [];
        const validArts = Array.isArray(artworks) ? artworks : [];
        setPanels(validPanels);
        setPageArtworks(validArts);

        if (validArts.length === 0) {
          setBackdropUrl(null);
          return;
        }

        // Tải link truy cập cho từng artwork
        const urls: Record<string, string> = {};
        await Promise.all(
          validArts.map(async (art) => {
            try {
              const link = await artworkService.getArtworkAccessLink(activeChapterId, art.id);
              if (link?.url) {
                urls[art.id] = resolveArtworkUrl(link.url);
              }
            } catch {
              // ignore
            }
          }),
        );
        if (cancelled) return;
        setPanelArtworkUrls(urls);

        // Giữ buildPageComposite để tương thích ngược khi test mock
        try {
          const compResult = await buildPageComposite({
            panels: validPanels,
            artworks: validArts,
            width: pageDim.width,
            height: pageDim.height,
            getAccessUrl: async (assetReferenceId) => urls[assetReferenceId] || '',
          });
          if (!cancelled && compResult?.dataUrl) {
            setBackdropUrl(compResult.dataUrl);
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('Không nạp được ảnh nền của trang:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activePageId, activeChapterId, pageDim.width, pageDim.height]);

  // Lắng nghe sự kiện xung đột từ hàng đợi offline (Lỗi 3)
  useEffect(() => {
    const handleOfflineConflict = (e: any) => {
      const detail = e.detail;
      if (detail) {
        setConflictElementId(detail.item?.clientRefId);
        setConflictErrorMsg(
          detail.message || 'Xung đột phiên bản phần tử khi đồng bộ ngoại tuyến (409 Conflict).',
        );
        setConflictModalOpen(true);
      }
    };
    window.addEventListener('panelforge:offline_conflict', handleOfflineConflict);
    return () => {
      window.removeEventListener('panelforge:offline_conflict', handleOfflineConflict);
    };
  }, []);

  // Nạp Elements của trang
  const loadElements = useCallback(async () => {
    if (!activePageId) {
      setPageSnapshot(null);
      setElements([]);
      return;
    }
    setLoading(true);
    try {
      const snap = await elementService.getPageSnapshot(activePageId);
      setPageSnapshot(snap);
      setElements(snap.elements.filter((e) => !e.isRemoved));
    } catch (err: any) {
      console.error('Lỗi tải elements:', err);
      showToast('Lỗi tải phần tử', err.message);
    } finally {
      setLoading(false);
    }
  }, [activePageId, showToast]);

  useEffect(() => {
    loadElements();
  }, [loadElements]);

  // Tên người nói: API dòng kịch bản chỉ trả speakerCharacterId, tên lấy từ Series Bible
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!seriesId) return;
    let cancelled = false;
    bibleService
      .getSeriesBible(seriesId)
      .then((res) => {
        if (cancelled || !res?.entries) return;
        setSpeakerNames(Object.fromEntries(res.entries.map((e) => [e.id, e.name])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  // Nạp Scenes và ScriptLines
  useEffect(() => {
    if (!activeChapterId) return;
    scriptLineService
      .getScenesByChapter(activeChapterId)
      .then((res) => {
        setScenes(res);
        if (res.length > 0) {
          setSelectedSceneId(res[0].id);
        }
      })
      .catch((err) => console.error('Lỗi nạp scenes:', err));
  }, [activeChapterId]);

  useEffect(() => {
    if (!selectedSceneId) {
      setSceneLines([]);
      return;
    }
    scriptLineService
      .getSceneById(selectedSceneId)
      .then((detail) => {
        setSceneLines(detail.scriptLines || []);
      })
      .catch((err) => console.error('Lỗi nạp script lines:', err));
  }, [selectedSceneId]);

  // ── Viewport: theo dõi kích thước, tự vừa trang lần đầu; đổi kích thước (thu/mở bảng) thì giữ tâm ──
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const apply = (w: number, h: number) => {
      const prev = vpSizeRef.current;
      const next = { width: w, height: h };
      vpSizeRef.current = next;
      setVpSize(next);
      if (w <= 0 || h <= 0) return;
      if (fitModeRef.current || prev.width <= 0 || prev.height <= 0) {
        setView(fitView(next, pageDimRef.current, fitModeRef.current ?? 'page'));
      } else {
        setView((v) => keepCenter(v, prev, next));
      }
    };
    const rect = el.getBoundingClientRect();
    apply(rect.width, rect.height);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) apply(r.width, r.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // focusMode: viewport được tạo lại khi bật/tắt chế độ tập trung (portal) nên phải gắn lại bộ theo dõi
  }, [activePageId, focusMode]);

  // Đổi trang hoặc khổ trang: vừa trang lại (không đụng vào nội dung)
  useEffect(() => {
    setFitMode('page');
    const vp = vpSizeRef.current;
    if (vp.width > 0 && vp.height > 0) setView(fitView(vp, pageDim, 'page'));
  }, [activePageId, pageDim]);

  const applyFit = useCallback((mode: FitMode) => {
    setFitMode(mode);
    const vp = vpSizeRef.current;
    if (vp.width > 0 && vp.height > 0) setView(fitView(vp, pageDimRef.current, mode));
  }, []);

  const zoomTo = useCallback((scale: number) => {
    setFitMode(null);
    setView((v) => zoomAtCenter(v, scale, vpSizeRef.current));
  }, []);

  const zoomStep = useCallback((factor: number) => {
    setFitMode(null);
    setView((v) => zoomAtCenter(v, v.scale * factor, vpSizeRef.current));
  }, []);

  // Lăn chuột = zoom quanh con trỏ. Phải là listener không thụ động để chặn cuộn trang.
  const hasPage = Boolean(activePageId);
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setFitMode(null);
      setView((v) =>
        zoomAt(v, v.scale * wheelZoomFactor(e.deltaY, e.deltaMode, e.ctrlKey), anchor),
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [hasPage, focusMode]);

  const clientToPage = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    return screenToPage(
      { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) },
      viewRef.current,
    );
  };

  const isPanIntent = (button: number) => button === 1 || spacePressed || toolMode === 'hand';

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (toolMode === 'keepout' && !isReadOnly && e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      const pt = clientToPage(e.clientX, e.clientY);
      drawingKeepOutStartRef.current = pt;
      setDrawingKeepOut({ x: pt.x, y: pt.y, width: 0, height: 0 });

      const onMove = (m: PointerEvent) => {
        if (!drawingKeepOutStartRef.current) return;
        const cur = clientToPage(m.clientX, m.clientY);
        const x1 = Math.min(drawingKeepOutStartRef.current.x, cur.x);
        const y1 = Math.min(drawingKeepOutStartRef.current.y, cur.y);
        const x2 = Math.max(drawingKeepOutStartRef.current.x, cur.x);
        const y2 = Math.max(drawingKeepOutStartRef.current.y, cur.y);
        setDrawingKeepOut({
          x: Math.max(0, Math.round(x1)),
          y: Math.max(0, Math.round(y1)),
          width: Math.min(pageDimRef.current.width - x1, Math.round(x2 - x1)),
          height: Math.min(pageDimRef.current.height - y1, Math.round(y2 - y1)),
        });
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (drawingKeepOutStartRef.current) {
          setDrawingKeepOut((box) => {
            if (box && box.width > 20 && box.height > 20) {
              const newZone: KeepOutZone = {
                id: `kz-${Date.now()}`,
                label: `Vùng cấm ${localKeepOutZones.length + 1}`,
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
              };
              setLocalKeepOutZones((prev) => [...prev, newZone]);
              showToast('Đã thêm vùng cấm', `Vùng cấm (${box.width}×${box.height}px) đã được tạo.`);
            }
            return null;
          });
        }
        drawingKeepOutStartRef.current = null;
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return;
    }

    if (!isPanIntent(e.button)) return;
    e.preventDefault();
    setFitMode(null);
    panMovedRef.current = false;
    const start = { x: e.clientX, y: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty };
    setPanning(true);
    const onMove = (m: PointerEvent) => {
      const dx = m.clientX - start.x;
      const dy = m.clientY - start.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panMovedRef.current = true;
      setView((v) => ({ ...v, tx: start.tx + dx, ty: start.ty + dy }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setPanning(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Chuẩn hoá toạ độ element giữa pixel thực tế và phần trăm hiển thị (Lỗi 1)
  const getNormalizedElementBox = useCallback(
    (b: ElementSnapshotDto) => {
      // Nếu dữ liệu cũ lưu dạng phần trăm (<= 100) thì scale sang px theo khổ trang
      const w = Number(b.width) || 0;
      const h = Number(b.height) || 0;
      const rawX = Number(b.x) || 0;
      const rawY = Number(b.y) || 0;
      const isPercent = w <= 100 || h <= 100;
      const pxW = isPercent ? Math.round((w / 100) * pageDim.width) : Math.round(w);
      const pxH = isPercent ? Math.round((h / 100) * pageDim.height) : Math.round(h);
      const pxX = isPercent ? Math.round((rawX / 100) * pageDim.width) : Math.round(rawX);
      const pxY = isPercent ? Math.round((rawY / 100) * pageDim.height) : Math.round(rawY);

      const percentLeft = pageDim.width > 0 ? (pxX / pageDim.width) * 100 : 0;
      const percentTop = pageDim.height > 0 ? (pxY / pageDim.height) * 100 : 0;
      const percentWidth = pageDim.width > 0 ? (pxW / pageDim.width) * 100 : 0;
      const percentHeight = pageDim.height > 0 ? (pxH / pageDim.height) * 100 : 0;

      return { pxX, pxY, pxW, pxH, percentLeft, percentTop, percentWidth, percentHeight };
    },
    [pageDim.width, pageDim.height],
  );

  // Xử lý xung đột phiên bản BR-11
  const handleConcurrencyError = (err: any, elementId?: string) => {
    if (err?.code === 'FORBIDDEN' || err?.status === 403 || err?.response?.status === 403) {
      showToast('Không có quyền thao tác', 'Phần này thuộc việc của người khác / đang chờ duyệt');
      return;
    }
    if (err.code === 'CHAPTER_READ_ONLY') {
      showToast('Chương chỉ đọc', err.message);
      return;
    }
    if (
      err.conflict === 'ELEMENT_VERSION_CONFLICT' ||
      err.code === 'CONFLICT' ||
      err.status === 409 ||
      err.message?.includes('ELEMENT_VERSION_CONFLICT')
    ) {
      setConflictElementId(elementId);
      setConflictErrorMsg(err.message);
      setConflictModalOpen(true);
    } else {
      showToast('Thao tác thất bại', err.message);
    }
  };

  // Tạo element mới (POST /api/pages/{pageId}/elements). Toạ độ và kích thước là px của trang gốc.
  const placeElement = async (opts: {
    elemType: string;
    x: number;
    y: number;
    width: number;
    height: number;
    line: SceneScriptLineSummaryDto | null;
  }) => {
    if (isReadOnly) return;
    const { elemType, x, y, width, height, line } = opts;

    const content = line
      ? classifyScriptLine(line).cleanText || 'Nhập lời thoại...'
      : 'Lời thoại mới...';

    const clientElementId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : // eslint-disable-next-line react-hooks/purity
          `elem-${Date.now()}`;

    const newReq = {
      elementType: elemType,
      x,
      y,
      width,
      height,
      zIndex: elements.length + 1,
      content,
      scriptLineId: line ? line.id : undefined,
      clientElementId,
    };

    const tempItem: ElementSnapshotDto = {
      elementId: clientElementId,
      elementType: elemType,
      x,
      y,
      width,
      height,
      zIndex: newReq.zIndex,
      content,
      isRemoved: false,
      version: 1,
      scriptLineId: line ? line.id : null,
    };

    // Kiểm tra nếu offline -> enqueue vào offline queue (NFR-09)
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'ADD_ELEMENT',
        endpoint: `/pages/${activePageId}/elements`,
        method: 'POST',
        payload: newReq,
        clientRefId: clientElementId,
      });
      setElements((prev) => [...prev, tempItem]);
      setSelectedElementId(tempItem.elementId);
      setSelectedScriptLine(null);
      showToast('Đã lưu ngoại tuyến', 'Bóng thoại đã được lưu tạm trên máy (NFR-09).');
      return;
    }

    try {
      const res = await elementService.addElement(activePageId, newReq);
      const newElemId = res?.elementId || tempItem.elementId;
      setElements((prev) => [...prev, { ...tempItem, elementId: newElemId }]);
      setSelectedElementId(newElemId);
      setSelectedScriptLine(null);
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'ADD_ELEMENT',
          endpoint: `/pages/${activePageId}/elements`,
          method: 'POST',
          payload: newReq,
          clientRefId: clientElementId,
        });
        setElements((prev) => [...prev, tempItem]);
        setSelectedElementId(tempItem.elementId);
        setSelectedScriptLine(null);
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Bóng thoại đã được lưu tạm vào hàng đợi.');
      } else {
        handleConcurrencyError(err);
      }
    }
  };

  /** Hộp đặt mới ở giữa `center`, kích thước theo loại + độ dài chữ, luôn nằm trong khổ trang. */
  const buildBox = (
    elemType: string,
    center: { x: number; y: number },
    line: SceneScriptLineSummaryDto | null,
  ) => {
    const base = DEFAULT_SIZE[elemType] ?? DEFAULT_SIZE.SPEECH_BALLOON;
    const text = line ? classifyScriptLine(line).cleanText : '';
    const width = Math.min(base.w, pageDim.width);
    const height = Math.min(estimateBoxHeight(text, width, base.h), pageDim.height);
    return {
      width,
      height,
      x: Math.max(0, Math.min(pageDim.width - width, Math.round(center.x - width / 2))),
      y: Math.max(0, Math.min(pageDim.height - height, Math.round(center.y - height / 2))),
    };
  };

  // Click lên canvas để thêm balloon mới với toạ độ px chuẩn của trang (không phụ thuộc zoom/pan)
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }
    if (isPanIntent(e.button)) return;
    if ((e.target as HTMLElement).closest('.speech-balloon, [data-pending-placement]')) return;
    if (toolMode === 'select') {
      setSelectedElementId(null);
      setEditingId(null);
      return;
    }
    if (toolMode === 'hand' || isReadOnly) return;

    const elemType = TOOL_TO_TYPE[toolMode] ?? 'SPEECH_BALLOON';
    const point = clientToPage(e.clientX, e.clientY);
    const box = buildBox(elemType, point, selectedScriptLine);
    void placeElement({ elemType, ...box, line: selectedScriptLine });
  };

  // Di chuyển vị trí Balloon (PUT /api/pages/{pageId}/elements/{elementId}/position)
  const moveBalloon = async (
    elementId: string,
    newPxX: number,
    newPxY: number,
    newPxW?: number,
    newPxH?: number,
  ) => {
    if (isReadOnly) return;
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;
    const box = getNormalizedElementBox(target);
    const finalW = newPxW ?? box.pxW;
    const finalH = newPxH ?? box.pxH;
    const clampedX = Math.max(0, Math.min(pageDim.width - finalW, Math.round(newPxX)));
    const clampedY = Math.max(0, Math.min(pageDim.height - finalH, Math.round(newPxY)));

    setElements((prev) =>
      prev.map((b) =>
        b.elementId === elementId
          ? { ...b, x: clampedX, y: clampedY, width: finalW, height: finalH }
          : b,
      ),
    );

    const payload: MoveElementRequest = {
      newX: clampedX,
      newY: clampedY,
      newWidth: finalW,
      newHeight: finalH,
      expectedElementVersion: target.version,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'MOVE_ELEMENT',
        endpoint: `/pages/${activePageId}/elements/${elementId}/position`,
        method: 'PUT',
        payload,
        clientRefId: elementId,
      });
      return;
    }

    try {
      await sendVersioned(elementId, (v) =>
        elementService.moveElement(activePageId, elementId, {
          ...payload,
          expectedElementVersion: v,
        }),
      );
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'MOVE_ELEMENT',
          endpoint: `/pages/${activePageId}/elements/${elementId}/position`,
          method: 'PUT',
          payload,
          clientRefId: elementId,
        });
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã lưu tạm vị trí bóng thoại.');
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Bắt đầu kéo thả bóng thoại trên canvas (độ dời màn hình được chia cho scale để ra px trang)
  const handleBalloonPointerDown = (e: React.PointerEvent<HTMLDivElement>, elementId: string) => {
    // Tay nắm 4 góc không gắn handler riêng: bấm vào tay nắm (data-corner) thì chuyển sang đổi kích thước
    const corner = (e.target as HTMLElement).dataset?.corner as ResizeCorner | undefined;
    if (corner) return handleResizePointerDown(e, elementId, corner);
    if (isPanIntent(e.button)) return; // để viewport xử lý pan
    if (isReadOnly || editingId === elementId) return;
    e.stopPropagation();
    setSelectedElementId(elementId);

    const target = elements.find((el) => el.elementId === elementId);
    if (!target) return;
    const box = getNormalizedElementBox(target);

    draggingRef.current = {
      elementId,
      startX: e.clientX,
      startY: e.clientY,
      initialPxX: box.pxX,
      initialPxY: box.pxY,
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      if (!draggingRef.current) return;
      const scale = viewRef.current.scale || 1;
      const newX =
        draggingRef.current.initialPxX + (moveEvt.clientX - draggingRef.current.startX) / scale;
      const newY =
        draggingRef.current.initialPxY + (moveEvt.clientY - draggingRef.current.startY) / scale;
      // Hút vào cạnh/tâm trang, lề an toàn, khung panel và bóng khác; giữ Alt để kéo tự do
      let sx = newX;
      let sy = newY;
      let guides: { x: number | null; y: number | null } = { x: null, y: null };
      if (!moveEvt.altKey) {
        const snapped = snapBox(
          { x: newX, y: newY, width: box.pxW, height: box.pxH },
          snapTargetsRef.current(elementId),
          SNAP_SCREEN_PX / scale,
        );
        sx = snapped.x;
        sy = snapped.y;
        guides = { x: snapped.guideX, y: snapped.guideY };
      }
      const cx = Math.max(0, Math.min(pageDimRef.current.width - box.pxW, Math.round(sx)));
      const cy = Math.max(0, Math.min(pageDimRef.current.height - box.pxH, Math.round(sy)));
      draggingRef.current.lastX = cx;
      draggingRef.current.lastY = cy;
      setSnapGuides(guides);

      setElements((prev) =>
        prev.map((b) =>
          b.elementId === elementId ? { ...b, x: cx, y: cy, width: box.pxW, height: box.pxH } : b,
        ),
      );
    };

    const handlePointerUp = (upEvt: PointerEvent) => {
      setDraggingId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setSnapGuides({ x: null, y: null });

      if (!draggingRef.current) return;
      const scale = viewRef.current.scale || 1;
      const deltaScreenX = upEvt.clientX - draggingRef.current.startX;
      const deltaScreenY = upEvt.clientY - draggingRef.current.startY;

      // Chỉ gửi request nếu có di chuyển thực sự (zoom/pan không bao giờ đi qua đây)
      if (Math.abs(deltaScreenX) > 2 || Math.abs(deltaScreenY) > 2) {
        const finalX =
          draggingRef.current.lastX ?? draggingRef.current.initialPxX + deltaScreenX / scale;
        const finalY =
          draggingRef.current.lastY ?? draggingRef.current.initialPxY + deltaScreenY / scale;
        moveBalloon(elementId, finalX, finalY, box.pxW, box.pxH);
      }
      draggingRef.current = null;
    };

    setDraggingId(elementId);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Kéo 1 trong 4 góc để đổi kích thước bóng (góc đối diện đứng yên); chỉ gửi request khi thả chuột (PUT .../position).
  // Bật "Tự co chữ": cỡ chữ co theo bóng (không lớn hơn cỡ lúc bắt đầu kéo), lưu qua PUT .../style sau khi lưu vị trí.
  const handleResizePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    elementId: string,
    corner: ResizeCorner = 'se',
  ) => {
    if (isReadOnly || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const target = elements.find((el) => el.elementId === elementId);
    if (!target) return;
    const box = getNormalizedElementBox(target);
    const startX = e.clientX;
    const startY = e.clientY;
    const startStyle = resolveTextStyle(target);
    const shape = appearanceOf(target).shape;
    const rectAt = (evt: PointerEvent) =>
      resizeFromCorner(
        { x: box.pxX, y: box.pxY, w: box.pxW, h: box.pxH },
        corner,
        (evt.clientX - startX) / (viewRef.current.scale || 1), // toạ độ trang gốc, không phụ thuộc zoom
        (evt.clientY - startY) / (viewRef.current.scale || 1),
        { w: MIN_BOX_W, h: MIN_BOX_H },
        pageDimRef.current,
      );
    const fontFor = (r: { w: number; h: number }) =>
      autoFitText && target.content
        ? Math.min(startStyle.fontSize, fitFontSize(target.content, startStyle, shape, r.w, r.h))
        : startStyle.fontSize;

    const onMove = (evt: PointerEvent) => {
      const r = rectAt(evt);
      const fontSize = fontFor(r);
      setElements((prev) =>
        prev.map((b) =>
          b.elementId === elementId
            ? {
                ...b,
                x: r.x,
                y: r.y,
                width: r.w,
                height: r.h,
                // xem trước cỡ chữ ngay khi kéo, chưa lưu
                style:
                  fontSize !== startStyle.fontSize
                    ? { ...(b.style ?? startStyle), fontSize, preset: null }
                    : target.style,
              }
            : b,
        ),
      );
    };
    const onUp = (evt: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const r = rectAt(evt);
      const changed =
        r.x !== Math.round(box.pxX) ||
        r.y !== Math.round(box.pxY) ||
        r.w !== Math.round(box.pxW) ||
        r.h !== Math.round(box.pxH);
      if (!changed) return;
      void moveBalloon(elementId, r.x, r.y, r.w, r.h);
      const fontSize = fontFor(r);
      if (fontSize !== startStyle.fontSize) {
        void handleUpdateStyle(
          elementId,
          mergeTextStyle(
            { ...startStyle, fontSize, preset: null },
            target.style,
            resolveTextStyle({ elementType: target.elementType }),
          ),
        );
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Cập nhật văn bản Element (PUT /api/pages/{pageId}/elements/{elementId}/text)
  const updateBalloonText = async (elementId: string, text: string) => {
    if (isReadOnly) return;
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;

    const nextTexts = { ...(target.texts || {}), [activeLang]: text };
    setElements((prev) =>
      prev.map((b) =>
        b.elementId === elementId
          ? {
              ...b,
              content: activeLang === 'vi' ? text : (b.content || text),
              texts: nextTexts,
            }
          : b,
      ),
    );

    const payload = {
      content: activeLang === 'vi' ? text : (target.content || text),
      languageCode: activeLang,
      scriptLineId: target.scriptLineId || undefined,
      expectedElementVersion: target.version,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'UPDATE_ELEMENT_TEXT',
        endpoint: `/pages/${activePageId}/elements/${elementId}/text`,
        method: 'PUT',
        payload,
        clientRefId: elementId,
      });
      return;
    }

    try {
      await sendVersioned(elementId, (v) =>
        elementService.updateElementText(activePageId, elementId, {
          ...payload,
          expectedElementVersion: v,
        }),
      );
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'UPDATE_ELEMENT_TEXT',
          endpoint: `/pages/${activePageId}/elements/${elementId}/text`,
          method: 'PUT',
          payload,
          clientRefId: elementId,
        });
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã lưu tạm nội dung bóng thoại.');
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Cập nhật thứ tự đọc (PUT /api/pages/{pageId}/elements/{elementId}/reading-order)
  const handleSetReadingOrder = async (elementId: string, order: number | null) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;

    setElements((prev) =>
      prev.map((b) => (b.elementId === elementId ? { ...b, readingOrder: order } : b)),
    );

    const payload = {
      readingOrder: order,
      expectedElementVersion: target.version,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'SET_READING_ORDER',
        endpoint: `/pages/${activePageId}/elements/${elementId}/reading-order`,
        method: 'PUT',
        payload,
        clientRefId: elementId,
      });
      showToast('Đã lưu ngoại tuyến', `Đã lưu tạm thứ tự đọc #${order}.`);
      return;
    }

    try {
      await sendVersioned(elementId, (v) =>
        elementService.setReadingOrder(activePageId, elementId, {
          ...payload,
          expectedElementVersion: v,
        }),
      );
      showToast('Thứ tự đọc', `Đã cập nhật thứ tự đọc #${order}.`);
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'SET_READING_ORDER',
          endpoint: `/pages/${activePageId}/elements/${elementId}/reading-order`,
          method: 'PUT',
          payload,
          clientRefId: elementId,
        });
        showToast('Đã lưu ngoại tuyến', `Mất mạng: Đã lưu tạm thứ tự đọc #${order}.`);
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Kiểu chữ (PUT /api/pages/{pageId}/elements/{elementId}/style): cập nhật lạc quan, lỗi thì trả lại kiểu cũ
  const handleUpdateStyle = async (elementId: string, style: TextStyleDto | null) => {
    if (!activePageId || isReadOnly) return;
    const target = elements.find((b) => b.elementId === elementId);
    if (!target) return;
    const previous = target.style ?? null;
    setElements((prev) => prev.map((b) => (b.elementId === elementId ? { ...b, style } : b)));
    try {
      await sendVersioned(elementId, (v) =>
        elementService.updateElementStyle(activePageId, elementId, {
          style,
          expectedElementVersion: v,
        }),
      );
    } catch (err: any) {
      setElements((prev) =>
        prev.map((b) => (b.elementId === elementId ? { ...b, style: previous } : b)),
      );
      handleConcurrencyError(err, elementId);
    }
  };

  // Xác nhận tràn chữ (POST /api/pages/{pageId}/elements/{elementId}/overflow-ack)
  const handleAckOverflow = async (elementId: string) => {
    const hasBackendWarning = (pageSnapshot?.warnings ?? []).some(
      (w) => w.elementId === elementId && w.code === 'TEXT_OVERFLOW',
    );
    if (!hasBackendWarning) {
      showToast(
        'Không thể xác nhận',
        'Bóng thoại này hiện không bị tràn chữ trên hệ thống. Hãy chọn bóng thoại có cảnh báo tràn (viền đỏ) để xác nhận.',
      );
      return;
    }
    const reason = ackReason.trim() || 'Letterer đã xem xét và chấp nhận bố cục';
    try {
      // Lệnh này cũng tăng phiên bản element ở máy chủ: đi qua hàng đợi để cập nhật đúng số
      await sendVersioned(elementId, () =>
        elementService.acknowledgeOverflow(activePageId, elementId, { reason }),
      );
      setElements((prev) =>
        prev.map((b) =>
          b.elementId === elementId ? { ...b, overflowAcknowledgedReason: reason } : b,
        ),
      );
      setAckReason('');
      showToast('Xác nhận tràn chữ', 'Đã lưu xác nhận tràn chữ thành công.');
    } catch (err: any) {
      handleConcurrencyError(err, elementId);
    }
  };

  // Xóa Element (DELETE /api/pages/{pageId}/elements/{elementId})
  const deleteBalloon = async (elementId: string) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;

    if (
      !(await confirm({
        title: 'Xóa bóng thoại này?',
        description: 'Văn bản và kiểu dáng bóng thoại trên trang sẽ bị gỡ bỏ.',
        confirmText: 'Xác nhận xóa',
        cancelText: 'Giữ lại',
        variant: 'danger',
      }))
    )
      return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueueService.enqueue({
        type: 'DELETE_ELEMENT',
        endpoint: `/pages/${activePageId}/elements/${elementId}`,
        method: 'DELETE',
        payload: { expectedElementVersion: target.version },
        clientRefId: elementId,
      });
      setElements((prev) => prev.filter((b) => b.elementId !== elementId));
      setSelectedElementId(null);
      showToast('Đã lưu ngoại tuyến', 'Đã xóa tạm thời phần tử trên máy.');
      return;
    }

    try {
      await elementService.removeElement(activePageId, elementId, target.version);
      setElements((prev) => prev.filter((b) => b.elementId !== elementId));
      setSelectedElementId(null);
      showToast('Đã xóa bóng thoại', 'Phần tử đã được gỡ khỏi canvas.');
    } catch (err: any) {
      const isNetworkError = checkIsNetworkError(err);
      if (isNetworkError) {
        offlineQueueService.enqueue({
          type: 'DELETE_ELEMENT',
          endpoint: `/pages/${activePageId}/elements/${elementId}`,
          method: 'DELETE',
          payload: { expectedElementVersion: target.version },
          clientRefId: elementId,
        });
        setElements((prev) => prev.filter((b) => b.elementId !== elementId));
        setSelectedElementId(null);
        showToast('Đã lưu ngoại tuyến', 'Mất mạng: Đã xóa tạm thời phần tử trên máy.');
      } else {
        handleConcurrencyError(err, elementId);
      }
    }
  };

  // Gợi ý vị trí thoáng nhất không chạm vùng cấm, ưu tiên theo thứ tự đọc (P3)
  const handleSuggestPosition = (elementId: string) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target) return;
    const box = getNormalizedElementBox(target);

    // Tìm panel chứa bóng thoại hoặc fallback toàn bộ trang
    let targetPanelRect: Rect = { x: 0, y: 0, width: pageDim.width, height: pageDim.height };
    for (const panel of panels) {
      const pBox = parseBoundingBox(panel.boundingBox, pageDim.width, pageDim.height);
      const pr: Rect = { x: pBox.pixelX, y: pBox.pixelY, width: pBox.pixelW, height: pBox.pixelH };
      if (rectsOverlap({ x: box.pxX, y: box.pxY, width: box.pxW, height: box.pxH }, pr)) {
        targetPanelRect = pr;
        break;
      }
    }

    const suggested = suggestBalloonPosition(
      { width: box.pxW, height: box.pxH },
      targetPanelRect,
      localKeepOutZones,
      isRTL,
    );

    void moveBalloon(elementId, suggested.x, suggested.y, box.pxW, box.pxH);
    showToast('Gợi ý vị trí', 'Đã dời bóng thoại đến vị trí thoáng nhất trong khung.');
  };

  // Tách văn bản thành 2 bóng thoại khi quá dài (>30 từ hoặc tràn khung) (P2)
  const handleSplitBalloon = async (elementId: string) => {
    if (isReadOnly) return;
    const target = elements.find((e) => e.elementId === elementId);
    if (!target || !target.content) return;

    const { part1, part2 } = splitTextIntoTwoBalloons(target.content);
    if (!part2) {
      showToast('Không thể tách', 'Nội dung thoại quá ngắn để tách thành hai bóng.');
      return;
    }

    const box = getNormalizedElementBox(target);
    await updateBalloonText(elementId, part1);

    const matchingLine = sceneLines.find((l) => l.id === target.scriptLineId) || null;
    const newY = Math.min(pageDim.height - box.pxH, box.pxY + box.pxH + 16);
    await placeElement({
      elemType: target.elementType,
      x: box.pxX,
      y: newY,
      width: box.pxW,
      height: Math.max(
        MIN_BOX_H,
        estimateBoxHeight(part2, box.pxW, DEFAULT_SIZE[target.elementType]?.h ?? 160),
      ),
      line: matchingLine ? { ...matchingLine, dialogueText: part2 } : null,
    });

    showToast('Đã tách thành 2 bóng', 'Đoạn thoại dài đã được chia làm 2 bóng liên kết.');
  };

  // Xoá vùng cấm chữ (P3)
  const handleDeleteKeepOut = (zoneId: string) => {
    setLocalKeepOutZones((prev) => prev.filter((z) => z.id !== zoneId));
    showToast('Đã xoá vùng cấm', 'Bóng thoại có thể đặt vào khu vực này.');
  };

  // Kéo chỉnh đuôi bóng thoại (P1)
  const handleTailPointerDown = (e: React.PointerEvent<HTMLDivElement>, elementId: string) => {
    if (isReadOnly || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const target = elements.find((el) => el.elementId === elementId);
    if (!target) return;
    const box = getNormalizedElementBox(target);

    let last: { x: number; y: number } | null = null;
    const onMove = (moveEvt: PointerEvent) => {
      const curPagePt = clientToPage(moveEvt.clientX, moveEvt.clientY);
      const relX = Math.round(curPagePt.x - box.pxX);
      const relY = Math.round(curPagePt.y - box.pxY);
      last = { x: relX, y: relY };
      setTailDraft((prev) => ({
        ...prev,
        [elementId]: { x: relX, y: relY },
      }));
    };

    const onUp = () => {
      // Thả chuột mới lưu đuôi (toạ độ trang gốc tương đối góc bóng, không phụ thuộc zoom)
      if (last) updateAppearance(elementId, { tail: last });
      setTailDraft(({ [elementId]: _done, ...rest }) => rest);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Đồng bộ lại thoại kịch bản khi kịch bản bị sửa đổi sau khi đặt (BR-05 / isStale)
  const handleSyncStaleText = async (elem: ElementSnapshotDto) => {
    if (!elem.currentLineText) return;
    try {
      await elementService.updateElementText(activePageId, elem.elementId, {
        content: elem.currentLineText,
        scriptLineId: elem.scriptLineId || undefined,
        expectedElementVersion: elem.version,
      });
      setElements((prev) =>
        prev.map((b) =>
          b.elementId === elem.elementId
            ? {
                ...b,
                content: elem.currentLineText!,
                isStale: false,
                version: (b.version || 1) + 1,
              }
            : b,
        ),
      );
      showToast('Đã đồng bộ thoại mới', 'Bóng thoại đã được cập nhật khớp với kịch bản mới nhất.');
    } catch (err: any) {
      handleConcurrencyError(err, elem.elementId);
    }
  };

  // ── AI Letterer Copilot: Rút gọn thoại cho vừa balloon (sync theo từng bubble) ──
  const handleRunLettererAgent = async () => {
    if (!activeSeriesId) {
      showToast('Thiếu Series ID', 'Không tìm thấy mã Series để chạy Letterer Copilot.');
      return;
    }
    if (!activeChapterId) {
      showToast('Thiếu Chapter ID', 'Vui lòng chọn chương trước khi chạy Letterer Copilot.');
      return;
    }

    const targetElement =
      (selectedElement && selectedElement.scriptLineId ? selectedElement : null) ||
      elements.find((e) => Boolean(e.scriptLineId));

    if (!targetElement || !targetElement.scriptLineId) {
      showToast(
        'Chọn bóng thoại',
        'Vui lòng chọn một bóng thoại có gắn dòng kịch bản để rút gọn bằng AI Copilot.',
      );
      return;
    }

    setAiLoading(true);
    try {
      try {
        const ch = await chapterService.getChapterById(activeChapterId);
        if (ch && ch.versionVector) {
          setChapterVersionVector(ch.versionVector);
        }
      } catch (err) {
        console.warn('Lỗi lấy version chương:', err);
      }

      const box = getNormalizedElementBox(targetElement);
      const boxW = box?.pxW || 280;
      const boxH = box?.pxH || 160;
      const perLine = Math.max(
        1,
        Math.floor(
          (boxW - 2 * LETTERING_PADDING_PX) / (LETTERING_FONT_PX * LETTERING_CHAR_WIDTH_EM),
        ),
      );
      const maxLines = Math.max(
        1,
        Math.floor(
          (boxH - 2 * LETTERING_PADDING_PX) / (LETTERING_FONT_PX * LETTERING_LINE_HEIGHT_EM),
        ),
      );
      const maxChars = Math.max(10, Math.min(500, Math.floor(perLine * maxLines * 0.95)));

      const sugRes = await aiAgentsService.runCopilot(activeSeriesId, {
        task: 'letterer.shorten',
        lineId: targetElement.scriptLineId,
        maxChars,
      });

      const payload = sugRes.payload as any;
      const suggestedText = payload?.suggestedText || '';
      const originalText = payload?.originalText || targetElement.content || '';
      const reason = payload?.reason || 'Rút gọn vừa balloon';

      const item: LetteringSuggestion = {
        sourceScriptLineId: payload?.sourceScriptLineId || targetElement.scriptLineId,
        targetElementId: targetElement.elementId,
        originalText,
        suggestedText,
        reason,
        maxChars,
        limitSource: 'element-estimate',
        withinEstimatedLimit: suggestedText.length <= maxChars,
      };

      setCurrentAiSuggestionId(sugRes.id);
      setAiSuggestions([item]);
      setAiModalOpen(true);
      showToast('Thành công', 'AI Copilot đã tạo đề xuất rút gọn thoại cho bóng thoại này.');
    } catch (err: any) {
      console.error('Lỗi chạy Letterer Copilot:', err);
      showToast('Lỗi Letterer Copilot', err.message || 'Không thể chạy rút gọn thoại.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySuggestionToElement = async (sug: LetteringSuggestion) => {
    const target = elements.find(
      (e) =>
        (sug.targetElementId && e.elementId === sug.targetElementId) ||
        (sug.sourceScriptLineId && e.scriptLineId === sug.sourceScriptLineId) ||
        (selectedElementId && e.elementId === selectedElementId),
    );

    if (!target) {
      showToast('Chưa đặt trên trang', 'Bóng thoại này chưa được đặt trên trang vẽ hiện tại.');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        offlineQueueService.enqueue({
          type: 'UPDATE_ELEMENT_TEXT',
          endpoint: `/pages/${activePageId}/elements/${target.elementId}/text`,
          method: 'PUT',
          payload: {
            content: sug.suggestedText,
            expectedElementVersion: target.version,
          },
          clientRefId: target.elementId,
        });
      } else {
        await elementService.updateElementText(activePageId, target.elementId, {
          content: sug.suggestedText,
          expectedElementVersion: target.version,
        });
      }

      setElements((prev) =>
        prev.map((el) =>
          el.elementId === target.elementId
            ? { ...el, content: sug.suggestedText, version: (el.version || 1) + 1 }
            : el,
        ),
      );
      showToast('Đã áp dụng', 'Đã cập nhật thoại rút gọn vào bóng thoại trên trang.');
    } catch (err: any) {
      handleConcurrencyError(err, target.elementId);
    }
  };

  const handleAcceptAllAiSuggestions = async () => {
    if (!currentAiSuggestionId || !activeSeriesId) return;
    try {
      await aiAgentsService.review(activeSeriesId, currentAiSuggestionId, 'accept', {
        chapterVersion: chapterVersionVector,
      });

      // Cập nhật các bóng thoại đang có trên trang hiện tại
      for (const sug of aiSuggestions) {
        const target = elements.find(
          (e) =>
            (sug.targetElementId && e.elementId === sug.targetElementId) ||
            (sug.sourceScriptLineId && e.scriptLineId === sug.sourceScriptLineId),
        );
        if (target) {
          try {
            await elementService.updateElementText(activePageId, target.elementId, {
              content: sug.suggestedText,
              expectedElementVersion: target.version,
            });
          } catch (e) {
            console.warn('Lỗi cập nhật bóng thoại:', e);
          }
        }
      }

      await loadElements();
      setAiModalOpen(false);
      showToast('Đã chấp nhận', 'Đã lưu kịch bản mới và áp dụng thoại rút gọn vào các bóng thoại.');
    } catch (err: any) {
      showToast('Lỗi chấp nhận đề xuất', err.message);
    }
  };

  const handleRejectAiSuggestions = async () => {
    if (!currentAiSuggestionId || !activeSeriesId) {
      setAiModalOpen(false);
      return;
    }
    try {
      await aiAgentsService.review(activeSeriesId, currentAiSuggestionId, 'reject', {
        reason: 'Từ chối bởi Letterer',
      });
      setAiModalOpen(false);
      showToast('Đã từ chối', 'Đã từ chối đề xuất rút gọn thoại của AI.');
    } catch (err: any) {
      showToast('Lỗi từ chối đề xuất', err.message);
    }
  };

  // ── Kéo dòng kịch bản vào trang: xem trước đúng toạ độ, rồi xác nhận mới gửi lên ──
  const suggestedTypeFor = (line: SceneScriptLineSummaryDto): string => {
    const cl = classifyScriptLine(line, toolMode);
    if (cl.kind === 'SFX') return 'SOUND_EFFECT';
    if (cl.kind === 'NARRATION') return 'NARRATION_BOX';
    return toolMode === 'thought' ? 'THOUGHT_BALLOON' : 'SPEECH_BALLOON';
  };

  const handleSelectScriptLine = (line: SceneScriptLineSummaryDto) => {
    if (selectedScriptLine?.id === line.id) {
      setSelectedScriptLine(null);
      return;
    }
    setSelectedScriptLine(line);
    // Đề xuất công cụ theo loại dòng; người dùng vẫn đổi được ở thanh công cụ.
    setToolMode(TYPE_TO_TOOL[suggestedTypeFor(line)] ?? 'balloon');
  };

  const handleViewportDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingLine || isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const point = clientToPage(e.clientX, e.clientY);
    setPending((prev) => {
      const elementType = prev?.elementType ?? suggestedTypeFor(draggingLine);
      const box = buildBox(elementType, point, draggingLine);
      return { line: draggingLine, elementType, ...box, dropped: false };
    });
  };

  const handleViewportDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggingLine || isReadOnly) return;
    e.preventDefault();
    const point = clientToPage(e.clientX, e.clientY);
    setPending((prev) => {
      const elementType = prev?.elementType ?? suggestedTypeFor(draggingLine);
      const box = buildBox(elementType, point, draggingLine);
      return { line: draggingLine, elementType, ...box, dropped: true };
    });
    setDraggingLine(null);
  };

  const handleViewportDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setPending((prev) => (prev && !prev.dropped ? null : prev));
  };

  const changePendingType = (elementType: string) => {
    setPending((prev) => {
      if (!prev) return prev;
      const center = { x: prev.x + prev.width / 2, y: prev.y + prev.height / 2 };
      return { ...prev, elementType, ...buildBox(elementType, center, prev.line) };
    });
  };

  const confirmPending = () => {
    if (!pending?.dropped) return;
    const { line, elementType, x, y, width, height } = pending;
    setPending(null);
    void placeElement({ elemType: elementType, x, y, width, height, line });
  };

  const cancelPending = () => setPending(null);

  // Đặt dòng kịch bản bằng bàn phím: bản xem trước ở giữa vùng đang nhìn, chỉnh bằng mũi tên, Enter để đặt
  const startKeyboardPlacement = (line: SceneScriptLineSummaryDto) => {
    if (isReadOnly || elements.some((e) => e.scriptLineId === line.id)) return;
    const vp = vpSizeRef.current;
    const center = screenToPage({ x: vp.width / 2, y: vp.height / 2 }, viewRef.current);
    const elementType = suggestedTypeFor(line);
    setSelectedScriptLine(line);
    setPending({ line, elementType, ...buildBox(elementType, center, line), dropped: true });
  };

  const polygonsRef = useRef<{ points: string }[]>([]);
  // Các đường có thể hút: cạnh + tâm trang, lề an toàn, khung panel, cạnh/tâm các bóng khác
  const buildSnapTargets = (excludeId?: string): SnapTargets => {
    const { width, height } = pageDimRef.current;
    const xs = [0, width / 2, width, SAFE_MARGIN_PX, width - SAFE_MARGIN_PX];
    const ys = [0, height / 2, height, SAFE_MARGIN_PX, height - SAFE_MARGIN_PX];
    for (const poly of polygonsRef.current) {
      const pts = poly.points
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number))
        .filter((p) => p.length === 2 && p.every(Number.isFinite));
      if (pts.length === 0) continue;
      const pxs = pts.map((p) => p[0]);
      const pys = pts.map((p) => p[1]);
      xs.push(Math.min(...pxs), Math.max(...pxs));
      ys.push(Math.min(...pys), Math.max(...pys));
    }
    for (const el of elements) {
      if (el.elementId === excludeId || IMAGE_LAYER_TYPES.includes(el.elementType as any)) continue;
      const b = getNormalizedElementBox(el);
      xs.push(b.pxX, b.pxX + b.pxW / 2, b.pxX + b.pxW);
      ys.push(b.pxY, b.pxY + b.pxH / 2, b.pxY + b.pxH);
    }
    return { xs, ys };
  };
  const snapTargetsRef = useRef(buildSnapTargets);
  useLayoutEffect(() => {
    snapTargetsRef.current = buildSnapTargets;
  });

  // Dời bóng đang chọn (hoặc bản xem trước) bằng phím mũi tên; trả true nếu đã xử lý
  const handleNudgeKey = (e: KeyboardEvent): boolean => {
    const delta = nudgeDelta(e.key, e.shiftKey);
    if (!delta || isReadOnly) return false;
    const { width, height } = pageDimRef.current;
    if (pending) {
      setPending((prev) =>
        prev
          ? {
              ...prev,
              x: Math.max(0, Math.min(width - prev.width, prev.x + delta.x)),
              y: Math.max(0, Math.min(height - prev.height, prev.y + delta.y)),
            }
          : prev,
      );
      return true;
    }
    if (!selectedElementId || editingId === selectedElementId) return false;
    const target = elements.find((el) => el.elementId === selectedElementId);
    if (!target) return false;
    const b = getNormalizedElementBox(target);
    const nx = Math.max(0, Math.min(width - b.pxW, b.pxX + delta.x));
    const ny = Math.max(0, Math.min(height - b.pxH, b.pxY + delta.y));
    const id = selectedElementId;
    setElements((prev) =>
      prev.map((el) =>
        el.elementId === id ? { ...el, x: nx, y: ny, width: b.pxW, height: b.pxH } : el,
      ),
    );
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => {
      nudgeTimerRef.current = null;
      void moveBalloon(id, nx, ny, b.pxW, b.pxH);
    }, 400);
    return true;
  };

  const handlePendingPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !pending) return;
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY, px: pending.x, py: pending.y };
    const onMove = (m: PointerEvent) => {
      const scale = viewRef.current.scale || 1;
      setPending((prev) =>
        prev
          ? {
              ...prev,
              x: Math.max(
                0,
                Math.min(
                  pageDimRef.current.width - prev.width,
                  Math.round(start.px + (m.clientX - start.x) / scale),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  pageDimRef.current.height - prev.height,
                  Math.round(start.py + (m.clientY - start.y) / scale),
                ),
              ),
            }
          : prev,
      );
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ── Phím tắt (không kích hoạt khi đang nhập chữ) ──
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) setSpacePressed(true);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (handleNudgeKey(e)) {
      e.preventDefault();
      return;
    }
    switch (e.key) {
      case '+':
      case '=':
        zoomStep(1.25);
        break;
      case '-':
        zoomStep(0.8);
        break;
      case '0':
        applyFit('page');
        break;
      case '1':
        zoomTo(1);
        break;
      case 'h':
      case 'H':
        setToolMode('hand');
        break;
      case 'v':
      case 'V':
        setToolMode('select');
        break;
      case 'Enter':
        if (pending?.dropped) confirmPending();
        break;
      case 'Escape':
        if (readerMode) setReaderMode(false);
        else if (pending) cancelPending();
        else if (focusMode) setFocusMode(false);
        break;
      default:
    }
  };
  useLayoutEffect(() => {
    keyHandlerRef.current = handleKeyDown;
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandlerRef.current(e);
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    const onBlur = () => setSpacePressed(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // ── Đo chữ thật trong từng bóng: chữ cao hơn khung thì cảnh báo (không âm thầm cắt) ──
  // Dùng cùng `layoutText` với màn duyệt (vùng chữ an toàn theo hình bóng), không đo DOM, để hai nơi báo tràn giống nhau.
  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
    if (!fonts?.load) return;
    const used = new Set(
      elements
        .filter((b) => !IMAGE_LAYER_TYPES.includes(b.elementType as any))
        .map((b) => canvasFont(resolveTextStyle(b), 24)),
    );
    used.forEach((f) => void fonts.load(f).catch(() => undefined));
  }, [elements]);

  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    for (const b of elements) {
      if (IMAGE_LAYER_TYPES.includes(b.elementType as any) || !b.content) continue;
      const box = getNormalizedElementBox(b);
      const shape = appearanceOf(b).shape;
      const layout = layoutText(b.content, resolveTextStyle(b), shape, box.pxW, box.pxH);
      if (layout.overflow) next[b.elementId] = layout.textHeight;
    }
    setOverflowInfo((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && nextKeys.every((k) => prev[k] === next[k])) {
        return prev;
      }
      return next;
    });
  }, [elements, getNormalizedElementBox, fontsReady]);

  // "Vừa bóng theo chữ": giữ cỡ chữ + bề rộng, đổi bề cao (toạ độ trang gốc, không phụ thuộc zoom)
  const growToFit = (elementId: string) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target?.content) return;
    const box = getNormalizedElementBox(target);
    const shape = appearanceOf(target).shape;
    const needed = fitBoxHeight(target.content, resolveTextStyle(target), shape, box.pxW, box.pxH);
    const height = Math.min(pageDim.height - box.pxY, needed);
    if (height < needed) {
      showToast(
        'Không đủ chỗ phía dưới',
        'Hãy kéo bóng lên cao hơn hoặc mở rộng chiều ngang rồi thử lại.',
      );
    }
    moveBalloon(elementId, box.pxX, box.pxY, box.pxW, height);
  };

  // "Vừa chữ trong bóng": giữ kích thước bóng, chọn cỡ chữ lớn nhất còn vừa (14–160px), lưu qua API kiểu chữ
  const fitTextToBox = (elementId: string) => {
    const target = elements.find((e) => e.elementId === elementId);
    if (!target?.content) return;
    const box = getNormalizedElementBox(target);
    const style = resolveTextStyle(target);
    const shape = appearanceOf(target).shape;
    const fontSize = fitFontSize(target.content, style, shape, box.pxW, box.pxH);
    if (fontSize !== style.fontSize)
      void handleUpdateStyle(elementId, { ...style, fontSize, preset: null });
  };

  const polygons = useMemo(
    () =>
      panels.map((p) => ({
        id: p.id,
        points: panelPolygon(p, pageDim.width, pageDim.height),
        order: p.readingOrder,
      })),
    [panels, pageDim.width, pageDim.height],
  );
  useLayoutEffect(() => {
    polygonsRef.current = polygons;
  }, [polygons]);

  const selectedElement = elements.find((e) => e.elementId === selectedElementId);
  const selectedElementBox = selectedElement ? getNormalizedElementBox(selectedElement) : null;
  const selectedWarnings = (pageSnapshot?.warnings ?? []).filter(
    (w) => w.elementId === selectedElementId,
  );

  // Thứ tự đọc không gian & phát hiện thứ tự ngược kịch bản (P5)
  const placedBalloonsForOrder = useMemo(() => {
    return elements
      .filter((el) => !IMAGE_LAYER_TYPES.includes(el.elementType as any))
      .map((el) => {
        const box = getNormalizedElementBox(el);
        const scriptLine = sceneLines.find((l) => l.id === el.scriptLineId);
        return {
          id: el.elementId,
          x: box.pxX,
          y: box.pxY,
          width: box.pxW,
          height: box.pxH,
          scriptLineOrder: scriptLine?.lineOrder ?? el.readingOrder ?? null,
        };
      });
  }, [elements, sceneLines, getNormalizedElementBox]);

  const readingOrderMismatches = useMemo(() => {
    return checkReadingOrderMismatch(placedBalloonsForOrder, isRTL);
  }, [placedBalloonsForOrder, isRTL]);

  // Các panel chứa dòng thoại hồi tưởng (Flashback) để hiển thị viền/khoảng đệm tối (P4)
  const flashbackPanelIds = useMemo(() => {
    const ids = new Set<string>();
    for (const el of elements) {
      const line = sceneLines.find((l) => l.id === el.scriptLineId);
      if (line?.narrationMode === 'Flashback') {
        const box = getNormalizedElementBox(el);
        for (const p of panels) {
          const pBox = parseBoundingBox(p.boundingBox, pageDim.width, pageDim.height);
          const pr = { x: pBox.pixelX, y: pBox.pixelY, width: pBox.pixelW, height: pBox.pixelH };
          if (rectsOverlap({ x: box.pxX, y: box.pxY, width: box.pxW, height: box.pxH }, pr)) {
            ids.add(p.id);
          }
        }
      }
    }
    return ids;
  }, [elements, sceneLines, panels, pageDim.width, pageDim.height, getNormalizedElementBox]);

  const containingPanel = useMemo(() => {
    if (!selectedElement) return null;
    const box = getNormalizedElementBox(selectedElement);
    for (const p of panels) {
      const pBox = parseBoundingBox(p.boundingBox, pageDim.width, pageDim.height);
      const pr = { x: pBox.pixelX, y: pBox.pixelY, width: pBox.pixelW, height: pBox.pixelH };
      if (rectsOverlap({ x: box.pxX, y: box.pxY, width: box.pxW, height: box.pxH }, pr)) {
        return { panel: p, rect: pr };
      }
    }
    return null;
  }, [selectedElement, panels, pageDim.width, pageDim.height, getNormalizedElementBox]);

  const panelDensity = useMemo(() => {
    if (!containingPanel) return null;
    const panelBalloons = elements
      .filter((e) => !IMAGE_LAYER_TYPES.includes(e.elementType as any))
      .map((e) => {
        const b = getNormalizedElementBox(e);
        return { x: b.pxX, y: b.pxY, width: b.pxW, height: b.pxH };
      });
    return calculatePanelTextDensity(containingPanel.rect, panelBalloons);
  }, [containingPanel, elements, getNormalizedElementBox]);

  const selectedTextConstraints = useMemo(() => {
    if (!selectedElement || !selectedElementBox) return null;
    return evaluateTextConstraints(
      selectedElement.content || '',
      selectedElementBox.pxW,
      selectedElementBox.pxH,
      overflowInfo[selectedElement.elementId],
    );
  }, [selectedElement, selectedElementBox, overflowInfo]);

  const selectedKeepOutCollision = useMemo(() => {
    if (!selectedElementBox) return null;
    return findKeepOutCollision(
      {
        x: selectedElementBox.pxX,
        y: selectedElementBox.pxY,
        width: selectedElementBox.pxW,
        height: selectedElementBox.pxH,
      },
      localKeepOutZones,
    );
  }, [selectedElementBox, localKeepOutZones]);

  const selectedOrderMismatch = useMemo(() => {
    if (!selectedElementId) return null;
    return readingOrderMismatches.find((m) => m.elementId === selectedElementId) || null;
  }, [selectedElementId, readingOrderMismatches]);

  const selectedHasOverflow = useMemo(() => {
    if (!selectedElementId) return false;
    const hasBackendWarning = (pageSnapshot?.warnings ?? []).some(
      (w) => w.elementId === selectedElementId && w.code === 'TEXT_OVERFLOW',
    );
    const hasClientOverflow =
      overflowInfo[selectedElementId] != null || (selectedTextConstraints?.isOverflowing ?? false);
    return hasBackendWarning || hasClientOverflow;
  }, [selectedElementId, pageSnapshot?.warnings, overflowInfo, selectedTextConstraints]);

  // ── Tính toán ảnh nền & Nhóm kịch bản theo Khung (Req 1, 2, 3, 4) ──
  const wholePageArt = useMemo(() => pickPageArtwork(pageArtworks, stages), [pageArtworks, stages]);
  const wholePageArtUrl = wholePageArt ? panelArtworkUrls[wholePageArt.id] : null;

  const hasAnyPanelArt = useMemo(() => {
    return panels.some((p) => {
      const art = pickPanelArtwork(pageArtworks, p.id, stages);
      return art && panelArtworkUrls[art.id];
    });
  }, [panels, pageArtworks, stages, panelArtworkUrls]);

  const hasBackdrop = Boolean(wholePageArtUrl || backdropUrl || hasAnyPanelArt);

  const letterableLines = useMemo(
    () => sceneLines.filter((l) => classifyScriptLine(l).isLetterable),
    [sceneLines],
  );

  const placedLineIds = useMemo(
    () => new Set(elements.map((e) => e.scriptLineId).filter(Boolean) as string[]),
    [elements],
  );

  const placedCount = useMemo(
    () => letterableLines.filter((l) => placedLineIds.has(l.id)).length,
    [letterableLines, placedLineIds],
  );

  const totalLetterable = letterableLines.length;

  const visibleLines = useMemo(() => {
    return sceneLines.filter((line) => {
      const cl = classifyScriptLine(line);
      if (cl.kind === 'DIRECTION' && !showDirections) {
        return false;
      }
      const isPlaced = placedLineIds.has(line.id);
      if (quickFilter === 'unplaced' && isPlaced) {
        return false;
      }
      if (quickFilter === 'current_panel') {
        if (!selectedPanelId) return false;
        if (line.panelId !== selectedPanelId) return false;
      }
      return true;
    });
  }, [sceneLines, showDirections, placedLineIds, quickFilter, selectedPanelId]);

  const panelGroups = useMemo(() => {
    const groups: {
      key: string;
      panelId: string | null;
      title: string;
      lines: SceneScriptLineSummaryDto[];
    }[] = [];

    const panelIdSet = new Set(panels.map((p) => p.id));
    const sortedPanels = [...panels].sort((a, b) => a.panelNumber - b.panelNumber);

    for (const p of sortedPanels) {
      const lines = visibleLines.filter((l) => l.panelId === p.id);
      if (lines.length > 0 || quickFilter !== 'unplaced' || selectedPanelId === p.id) {
        groups.push({
          key: p.id,
          panelId: p.id,
          title: `Khung ${p.panelNumber}`,
          lines,
        });
      }
    }

    const unassigned = visibleLines.filter((l) => !l.panelId || !panelIdSet.has(l.panelId));
    if (unassigned.length > 0 || (groups.length === 0 && quickFilter === 'all')) {
      groups.push({
        key: 'unassigned',
        panelId: null,
        title: 'Chưa gán khung',
        lines: unassigned,
      });
    }

    return groups;
  }, [panels, visibleLines, quickFilter, selectedPanelId]);

  // Cuộn tới nhóm của khung khi chọn khung trên canvas
  useEffect(() => {
    if (selectedPanelId) {
      const el = document.getElementById(`panel-group-${selectedPanelId}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedPanelId]);

  const startSideResize = (side: 'left' | 'right') => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = side === 'left' ? layout.leftW : layout.rightW;
    const onMove = (m: PointerEvent) => {
      const delta = side === 'left' ? m.clientX - startX : startX - m.clientX;
      const w = Math.min(SIDE_MAX, Math.max(SIDE_MIN, Math.round(startW + delta)));
      setLayout((l) => (side === 'left' ? { ...l, leftW: w } : { ...l, rightW: w }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!activePageId) {
    return (
      <div className='flex flex-col items-center justify-center h-full p-8 text-center bg-[#F3F0E9]'>
        <div className='w-16 h-16 rounded-2xl bg-[#FCFBF8] border border-[#D8D2C5] flex items-center justify-center text-[#C2410C] mb-4 shadow-soft-sm'>
          <Type className='w-8 h-8' />
        </div>
        <h3 className='text-base font-serif font-bold text-[#1C1917] mb-1'>
          Chọn một trang để bắt đầu
        </h3>
        <p className='text-xs text-[#57534E] max-w-sm'>
          Vui lòng chọn một chương và trang truyện từ danh sách phía trên để mở bàn làm việc chèn
          chữ.
        </p>
      </div>
    );
  }

  const panIntent = spacePressed || toolMode === 'hand';
  const viewportCursor = panning
    ? 'cursor-grabbing'
    : panIntent
      ? 'cursor-grab'
      : toolMode === 'select'
        ? 'cursor-default'
        : 'cursor-crosshair';

  const toolBtn = (active: boolean, activeClass: string) =>
    `px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
      active
        ? `${activeClass} text-white shadow-xs`
        : 'text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
    }`;

  const pendingScreen = pending
    ? pageToScreen({ x: pending.x + pending.width / 2, y: pending.y + pending.height }, view)
    : null;

  const workspace = (
    <div
      className={`flex flex-col bg-[#F3F0E9] text-[#1C1917] overflow-hidden ${
        focusMode ? 'fixed inset-0 z-[150]' : 'h-full'
      }`}
      data-testid='lettering-workspace'
      data-focus-mode={focusMode ? 'true' : 'false'}
    >
      {/* Offline Status Indicator (NFR-09) */}
      <OfflineStatusBanner />

      {/* Thanh trên cùng gọn: tên, kích thước, thu/mở bảng, chế độ tập trung */}
      <div className='h-10 border-b border-[#D8D2C5] bg-[#FCFBF8] px-2 flex items-center justify-between shrink-0 gap-2 shadow-soft-sm'>
        <div className='flex items-center gap-1.5 min-w-0'>
          <button
            onClick={() => setLayout((l) => ({ ...l, leftOpen: !l.leftOpen }))}
            disabled={focusMode}
            aria-label='Thu/mở bảng kịch bản'
            aria-pressed={layout.leftOpen}
            title='Thu/mở bảng kịch bản'
            data-testid='toggle-left-panel'
            className='p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917] disabled:opacity-40 cursor-pointer transition-colors'
          >
            {layout.leftOpen ? (
              <PanelLeftClose className='w-4 h-4' />
            ) : (
              <PanelLeftOpen className='w-4 h-4' />
            )}
          </button>
          <Type className='w-4 h-4 text-[#C2410C] shrink-0' />
          <h3 className='font-serif font-bold text-xs text-[#1C1917] truncate'>
            Bàn Làm Việc Chèn Chữ
          </h3>
          {pageSnapshot && (
            <span className='font-mono text-xs px-2 py-0.5 bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74] rounded-full shrink-0 font-medium'>
              v{pageSnapshot.version} • {pageDim.width}×{pageDim.height}px
            </span>
          )}
          {(pageSnapshot?.warnings?.length ?? 0) > 0 && (
            <span className='text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shrink-0'>
              <AlertTriangle className='w-3 h-3 text-amber-600' />
              {pageSnapshot!.warnings!.length} cảnh báo an toàn
            </span>
          )}
        </div>

        <div className='flex items-center gap-1'>
          {/* Layer visibility toggle button (CF2 2.5) */}
          <div className='relative'>
            <button
              onClick={() => setShowLayerFilterMenu(!showLayerFilterMenu)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showLayerFilterMenu
                  ? 'bg-[#1C1917] text-white border-[#1C1917]'
                  : 'bg-[#FCFBF8] border-[#D8D2C5] text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
              }`}
              title='Bật / tắt hiển thị các lớp vẽ (Background, Character, Prop, Effect)'
            >
              <Layers className='w-4 h-4 text-[#C2410C]' />
              <span>Lớp vẽ (Layers)</span>
            </button>

            {showLayerFilterMenu && (
              <div className='absolute right-0 mt-2 w-56 bg-[#FCFBF8] rounded-2xl shadow-xl border border-[#D8D2C5] p-2.5 z-50 space-y-1.5 text-xs'>
                <div className='font-bold text-[#57534E] uppercase text-xs font-mono px-2 py-1'>
                  Hiển thị lớp vẽ trên canvas
                </div>
                {IMAGE_LAYER_TYPES.map((layerKey) => {
                  const isVisible = visibleLayers[layerKey] !== false;
                  return (
                    <button
                      key={layerKey}
                      onClick={() =>
                        setVisibleLayers((prev) => ({ ...prev, [layerKey]: !isVisible }))
                      }
                      className='w-full px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-[#F3F0E9] transition-colors text-[#1C1917] cursor-pointer'
                    >
                      <span className='font-medium'>{LAYER_LABELS[layerKey] || layerKey}</span>
                      {isVisible ? (
                        <Eye className='w-3.5 h-3.5 text-emerald-600' />
                      ) : (
                        <EyeOff className='w-3.5 h-3.5 text-[#57534E]' />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Letterer Agent trigger button (CF2 2.4) */}
          <button
            onClick={handleRunLettererAgent}
            disabled={aiLoading || !activeSeriesId}
            className='px-3.5 py-1.5 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-soft-sm transition-all cursor-pointer'
            title='Chạy Letterer Agent để rút gọn các dòng thoại cho vừa bóng thoại'
          >
            {aiLoading ? (
              <RefreshCw className='w-3.5 h-3.5 animate-spin' />
            ) : (
              <Sparkles className='w-3.5 h-3.5 text-amber-200' />
            )}
            <span>AI Rút Gọn Thoại</span>
          </button>

          <button
            onClick={loadElements}
            disabled={loading}
            className='p-1.5 hover:bg-[#F3F0E9] rounded-lg text-[#57534E] hover:text-[#1C1917] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer'
            title='Tải lại canvas'
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className='hidden 2xl:inline'>Làm mới</span>
          </button>
          <button
            onClick={() => setFocusMode((v) => !v)}
            aria-pressed={focusMode}
            title={focusMode ? 'Thoát chế độ tập trung (Esc)' : 'Chế độ tập trung: ẩn các bảng phụ'}
            data-testid='toggle-focus-mode'
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              focusMode
                ? 'bg-[#1C1917] text-white'
                : 'text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917]'
            }`}
          >
            {focusMode ? <Minimize2 className='w-4 h-4' /> : <Maximize2 className='w-4 h-4' />}
            <span className='hidden 2xl:inline'>Tập trung</span>
          </button>
          <button
            onClick={() => setLayout((l) => ({ ...l, rightOpen: !l.rightOpen }))}
            disabled={focusMode}
            aria-label='Thu/mở bảng thuộc tính'
            aria-pressed={layout.rightOpen}
            title='Thu/mở bảng thuộc tính'
            data-testid='toggle-right-panel'
            className='p-1.5 rounded-lg text-[#57534E] hover:bg-[#F3F0E9] hover:text-[#1C1917] disabled:opacity-40 cursor-pointer transition-colors'
          >
            {layout.rightOpen ? (
              <PanelRightClose className='w-4 h-4' />
            ) : (
              <PanelRightOpen className='w-4 h-4' />
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className='flex-1 flex overflow-hidden min-h-0'>
        {/* Left Drawer: Script Line Queue */}
        {leftVisible && (
          <>
            <div
              style={{ width: layout.leftW }}
              className='shrink-0 bg-[#FCFBF8] border-r border-[#D8D2C5] flex flex-col overflow-hidden'
              data-testid='left-panel'
            >
              <div className='p-3 border-b border-[#D8D2C5] bg-[#F8F6F0] space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-serif font-bold text-[#1C1917] flex items-center gap-1.5'>
                    <BookOpen className='w-4 h-4 text-[#C2410C]' />
                    <span>Kịch Bản Chương</span>
                  </span>
                  <span
                    data-testid='placed-counter'
                    className='text-xs font-mono font-semibold text-[#57534E]'
                  >
                    {placedCount}/{totalLetterable} đã đặt
                  </span>
                </div>

                {/* Slim progress bar */}
                <div
                  data-testid='letterer-progress-bar'
                  className='w-full h-1.5 bg-stone-200 rounded-full overflow-hidden'
                >
                  <div
                    className='h-full bg-amber-500 rounded-full transition-all duration-300'
                    style={{
                      width: `${totalLetterable > 0 ? Math.round((placedCount / totalLetterable) * 100) : 0}%`,
                    }}
                  />
                </div>

                {/* Scene Selector */}
                <select
                  value={selectedSceneId || ''}
                  onChange={(e) => setSelectedSceneId(e.target.value)}
                  className='w-full p-2 bg-[#FCFBF8] border border-[#D8D2C5] text-[#1C1917] rounded-xl text-xs font-semibold focus:border-[#F97316] focus:outline-none'
                >
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      Phân cảnh #{s.sceneNumber}: {s.heading || 'Không tiêu đề'}
                    </option>
                  ))}
                </select>

                {/* AI Tách Thoại (Auto-Assign Script Lines into Panels) */}
                <button
                  type='button'
                  data-testid='auto-assign-script-btn'
                  onClick={() => setAutoAssignModalOpen(true)}
                  title='AI Tách Thoại: Tự động phân bổ các câu thoại kịch bản vào các khung của trang'
                  className='w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95'
                >
                  <Sparkles className='w-3.5 h-3.5' />
                  <span>AI Tách thoại vào khung</span>
                </button>

                {/* Quick Filters */}
                <div className='flex items-center gap-1 bg-[#EBE7DF] p-1 rounded-xl text-[11px] font-semibold'>
                  <button
                    type='button'
                    data-testid='filter-all'
                    onClick={() => setQuickFilter('all')}
                    className={`flex-1 py-1 rounded-lg transition-colors text-center cursor-pointer ${
                      quickFilter === 'all'
                        ? 'bg-white text-[#C2410C] shadow-2xs font-bold'
                        : 'text-[#78716C] hover:text-[#1C1917]'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type='button'
                    data-testid='filter-unplaced'
                    onClick={() => setQuickFilter('unplaced')}
                    className={`flex-1 py-1 rounded-lg transition-colors text-center cursor-pointer ${
                      quickFilter === 'unplaced'
                        ? 'bg-white text-[#C2410C] shadow-2xs font-bold'
                        : 'text-[#78716C] hover:text-[#1C1917]'
                    }`}
                  >
                    Chưa đặt
                  </button>
                  <button
                    type='button'
                    data-testid='filter-current-panel'
                    onClick={() => setQuickFilter('current_panel')}
                    className={`flex-1 py-1 rounded-lg transition-colors text-center cursor-pointer ${
                      quickFilter === 'current_panel'
                        ? 'bg-white text-[#C2410C] shadow-2xs font-bold'
                        : 'text-[#78716C] hover:text-[#1C1917]'
                    }`}
                  >
                    Khung đang chọn
                  </button>
                </div>

                {/* Toggle Hiện chỉ dẫn */}
                <div className='flex items-center justify-between pt-0.5'>
                  <label
                    data-testid='toggle-show-directions-label'
                    className='flex items-center gap-1.5 text-[11px] text-[#78716C] cursor-pointer select-none hover:text-[#1C1917]'
                  >
                    <input
                      type='checkbox'
                      data-testid='toggle-show-directions'
                      checked={showDirections}
                      onChange={(e) => setShowDirections(e.target.checked)}
                      className='rounded text-[#F97316] focus:ring-[#F97316] w-3.5 h-3.5 cursor-pointer accent-[#F97316]'
                    />
                    <span>Hiện chỉ dẫn</span>
                  </label>
                  {selectedPanelId && (
                    <button
                      type='button'
                      onClick={() => setSelectedPanelId(null)}
                      className='text-[10px] text-stone-400 hover:text-stone-600 underline cursor-pointer'
                    >
                      Bỏ chọn khung
                    </button>
                  )}
                </div>
              </div>

              <div className='flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar'>
                {sceneLines.length === 0 ? (
                  <div className='p-6 text-center text-xs text-[#57534E]'>
                    Chưa có dòng kịch bản nào trong phân cảnh này.
                  </div>
                ) : visibleLines.length === 0 ? (
                  <div className='p-6 text-center text-xs text-[#57534E]'>
                    Không có dòng nào phù hợp với bộ lọc.
                  </div>
                ) : (
                  panelGroups.map((group) => {
                    const isGroupActive = Boolean(
                      group.panelId && selectedPanelId === group.panelId,
                    );
                    return (
                      <div
                        key={group.key}
                        id={`panel-group-${group.key}`}
                        data-testid={`panel-group-${group.key}`}
                        className={`rounded-xl border transition-all p-2.5 space-y-2 ${
                          isGroupActive
                            ? 'border-amber-400 bg-amber-50/70 ring-1 ring-amber-300 shadow-2xs'
                            : 'border-[#E7E2D8] bg-[#FDFCFA]'
                        }`}
                      >
                        {/* Tiêu đề nhóm khung */}
                        <div
                          data-testid={`panel-group-header-${group.key}`}
                          role='button'
                          tabIndex={0}
                          onClick={() => {
                            if (group.panelId) setSelectedPanelId(group.panelId);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              if (group.panelId) setSelectedPanelId(group.panelId);
                            }
                          }}
                          className='flex items-center justify-between cursor-pointer px-1 py-0.5 select-none hover:opacity-90'
                        >
                          <span
                            className={`text-xs font-bold flex items-center gap-1.5 ${
                              isGroupActive ? 'text-[#C2410C]' : 'text-[#1C1917]'
                            }`}
                          >
                            {group.panelId ? (
                              <Layers className='w-3.5 h-3.5 text-amber-600' />
                            ) : (
                              <FileText className='w-3.5 h-3.5 text-stone-400' />
                            )}
                            <span>{group.title}</span>
                          </span>
                          <span className='text-[10px] font-mono font-semibold text-[#57534E] bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200'>
                            {group.lines.length} dòng
                          </span>
                        </div>

                        {/* Danh sách dòng kịch bản trong nhóm */}
                        <div className='space-y-1.5'>
                          {group.lines.length === 0 ? (
                            <div className='text-[11px] text-[#A8A29E] italic px-2 py-1'>
                              Chưa có dòng nào
                            </div>
                          ) : (
                            group.lines.map((line) => {
                              const isSelected = selectedScriptLine?.id === line.id;
                              const isPlaced = elements.some((e) => e.scriptLineId === line.id);
                              const classification = classifyScriptLine(line, toolMode);
                              const isDirection = classification.kind === 'DIRECTION';
                              const narrator = classification.kind === 'NARRATION';
                              const speaker =
                                (line as { speakerName?: string | null }).speakerName ||
                                (line.speakerCharacterId
                                  ? (speakerNames[line.speakerCharacterId] ?? 'Nhân vật')
                                  : null);
                              const canDrag =
                                !isReadOnly && !isPlaced && classification.isLetterable;

                              const narrationMode = (line as any).narrationMode || 'Present';
                              const lineText = isDirection
                                ? line.stageDirection || ''
                                : classification.cleanText;
                              const lineWordCount = countWords(line.dialogueText || '');
                              const isTooLong = lineWordCount > MAX_WORDS_PER_BALLOON;
                              const isFlashback = narrationMode === 'Flashback';
                              const isDream = narrationMode === 'Dream';
                              const isImagination = narrationMode === 'Imagination';
                              const isMissingTime =
                                isFlashback && !hasTimeMarker(line.dialogueText || '');

                              return (
                                <div
                                  key={line.id}
                                  draggable={canDrag}
                                  data-testid={
                                    isDirection
                                      ? `direction-line-${line.id}`
                                      : `script-line-${line.id}`
                                  }
                                  onDragStart={(e) => {
                                    if (!canDrag) return;
                                    e.dataTransfer.setData('text/plain', line.id);
                                    e.dataTransfer.effectAllowed = 'copy';
                                    setDraggingLine(line);
                                    setSelectedScriptLine(line);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingLine(null);
                                    setPending((prev) => (prev && !prev.dropped ? null : prev));
                                  }}
                                  onClick={() => handleSelectScriptLine(line)}
                                  tabIndex={0}
                                  role='button'
                                  aria-label={`Dòng ${line.lineOrder}${canDrag ? ', nhấn Enter để đặt lên trang' : ''}`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && canDrag && !pending) {
                                      e.preventDefault();
                                      startKeyboardPlacement(line);
                                    } else if (e.key === ' ') {
                                      e.preventDefault();
                                      handleSelectScriptLine(line);
                                    }
                                  }}
                                  className={`p-2.5 rounded-xl border transition-all text-xs space-y-1.5 ${
                                    canDrag
                                      ? 'cursor-grab active:cursor-grabbing'
                                      : 'cursor-pointer'
                                  } ${
                                    isDirection
                                      ? 'border-dashed border-stone-300 bg-stone-50/70 opacity-75'
                                      : isSelected
                                        ? 'border-[#F97316] bg-[#FFF2E6] ring-2 ring-[#F97316]/20 shadow-xs'
                                        : isPlaced
                                          ? 'border-emerald-300 bg-emerald-50/40 text-emerald-900'
                                          : isFlashback
                                            ? 'border-[#57534E] bg-[#1C1917]/5'
                                            : 'border-[#D8D2C5] bg-[#FCFBF8] hover:bg-white hover:border-[#F97316]/60'
                                  }`}
                                >
                                  <div className='flex items-center justify-between gap-1.5 flex-wrap'>
                                    <span className='font-mono font-bold text-xs text-[#57534E] flex items-center gap-1 min-w-0'>
                                      {canDrag && (
                                        <GripVertical className='w-3 h-3 text-[#57534E]/60 shrink-0' />
                                      )}
                                      <span className='truncate'>
                                        #{line.lineOrder} •{' '}
                                        {speaker || (isDirection ? 'Chỉ dẫn' : 'Người dẫn truyện')}
                                      </span>
                                    </span>

                                    <div className='flex items-center gap-1 shrink-0'>
                                      {isFlashback && (
                                        <span
                                          data-testid={`badge-mode-${line.id}`}
                                          className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1C1917] text-white shrink-0 shadow-2xs'
                                        >
                                          HỒI TƯỞNG
                                        </span>
                                      )}
                                      {isDream && (
                                        <span
                                          data-testid={`badge-mode-${line.id}`}
                                          className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 shrink-0'
                                        >
                                          GIẤC MƠ
                                        </span>
                                      )}
                                      {isImagination && (
                                        <span
                                          data-testid={`badge-mode-${line.id}`}
                                          className='text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 shrink-0'
                                        >
                                          TƯỞNG TƯỢNG
                                        </span>
                                      )}

                                      {isPlaced ? (
                                        <span className='text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0'>
                                          <CheckCircle2 className='w-3 h-3' /> Đã đặt
                                        </span>
                                      ) : isDirection ? (
                                        <span
                                          data-testid={`badge-direction-${line.id}`}
                                          className='text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-stone-100 text-stone-500 border border-stone-200'
                                        >
                                          Chỉ dẫn
                                        </span>
                                      ) : classification.kind === 'SFX' ? (
                                        <span
                                          data-testid={`badge-sfx-${line.id}`}
                                          className='text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-red-50 text-red-600 border border-red-200'
                                        >
                                          SFX
                                        </span>
                                      ) : (
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                            narrator
                                              ? 'bg-[#FFF2E6] text-[#C2410C] border border-[#FDBA74]'
                                              : 'bg-[#F3F0E9] text-[#57534E]'
                                          }`}
                                        >
                                          {narrator ? 'Dẫn truyện' : 'Thoại'}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <p
                                    className={`font-medium text-[#1C1917] line-clamp-2 ${
                                      isFlashback || isDirection ? 'italic' : ''
                                    } ${isDirection ? 'text-[#78716C]' : ''}`}
                                  >
                                    {lineText}
                                  </p>

                                  {/* Badges cảnh báo độ dài và mốc thời gian */}
                                  {!isDirection && (isTooLong || isMissingTime) && (
                                    <div className='flex items-center gap-1.5 flex-wrap pt-0.5'>
                                      {isTooLong && (
                                        <span
                                          data-testid={`badge-toolong-${line.id}`}
                                          className='text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 flex items-center gap-0.5'
                                        >
                                          <AlertTriangle className='w-3 h-3' /> Quá dài (
                                          {lineWordCount} từ)
                                        </span>
                                      )}
                                      {isMissingTime && (
                                        <span
                                          data-testid={`badge-missing-time-${line.id}`}
                                          className='text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5'
                                        >
                                          <Compass className='w-3 h-3' /> Thiếu mốc thời gian
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {isSelected && canDrag && (
                                    <div className='text-xs font-semibold text-[#C2410C] flex items-center gap-1 pt-1 border-t border-[#FDBA74]'>
                                      <Plus className='w-3.5 h-3.5' /> Bấm hoặc kéo thả lên trang để
                                      đặt dòng này
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div
              onPointerDown={startSideResize('left')}
              role='separator'
              aria-orientation='vertical'
              aria-label='Đổi chiều rộng bảng kịch bản'
              data-testid='left-resizer'
              className='w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-[#F97316]/40 active:bg-[#EA580C]/50'
            />
          </>
        )}

        {/* Center: toolbar + viewport zoom/pan */}
        <div className='flex-1 min-w-0 flex flex-col overflow-hidden bg-[#F3F0E9]'>
          {/* Thanh công cụ gọn (không đè lên trang) */}
          <div className='shrink-0 z-20 bg-[#FCFBF8] border-b border-[#D8D2C5] px-2 py-1 flex flex-wrap items-center gap-1 shadow-2xs'>
            <button
              onClick={() => setToolMode('select')}
              title='Chọn / Kéo (V)'
              className={toolBtn(toolMode === 'select', 'bg-[#1C1917]')}
            >
              <Move className='w-3.5 h-3.5' /> <span className='hidden 2xl:inline'>Chọn / Kéo</span>
            </button>
            <button
              onClick={() => setToolMode('hand')}
              title='Bàn tay: kéo để di chuyển trang (H, hoặc giữ Space)'
              aria-pressed={toolMode === 'hand'}
              data-testid='tool-hand'
              className={toolBtn(toolMode === 'hand', 'bg-[#57534E]')}
            >
              <Hand className='w-3.5 h-3.5' /> <span className='hidden 2xl:inline'>Bàn tay</span>
            </button>
            <div className='w-px h-4 bg-[#D8D2C5] mx-1'></div>
            <button
              onClick={() => setToolMode('balloon')}
              title='Thoại thường'
              className={toolBtn(toolMode === 'balloon', 'bg-[#F97316]')}
            >
              <MessageCircle className='w-3.5 h-3.5' />{' '}
              <span className='hidden 2xl:inline'>Thoại thường</span>
            </button>
            <button
              onClick={() => setToolMode('thought')}
              title='Suy nghĩ'
              className={toolBtn(toolMode === 'thought', 'bg-sky-600')}
            >
              <Sparkles className='w-3.5 h-3.5' />{' '}
              <span className='hidden 2xl:inline'>Suy nghĩ</span>
            </button>
            <button
              onClick={() => setToolMode('narration')}
              title='Hộp dẫn truyện'
              className={toolBtn(toolMode === 'narration', 'bg-amber-600')}
            >
              <FileText className='w-3.5 h-3.5' />{' '}
              <span className='hidden 2xl:inline'>Dẫn truyện</span>
            </button>
            <button
              onClick={() => setToolMode('sfx')}
              title='Hiệu ứng âm'
              className={toolBtn(toolMode === 'sfx', 'bg-rose-600')}
            >
              <span className='font-display font-black text-xs'>SFX</span>{' '}
              <span className='hidden 2xl:inline'>Hiệu ứng âm</span>
            </button>
            <button
              onClick={() => setToolMode('keepout')}
              title='Vẽ vùng cấm chữ trên tranh (tránh mặt/tay nhân vật)'
              data-testid='tool-keepout'
              className={toolBtn(toolMode === 'keepout', 'bg-red-600')}
            >
              <ShieldAlert className='w-3.5 h-3.5' />{' '}
              <span className='hidden 2xl:inline'>Vùng cấm</span>
            </button>
            <div className='w-px h-4 bg-[#D8D2C5] mx-1'></div>
            <button
              onClick={() => setShowReadingOrder((v) => !v)}
              aria-pressed={showReadingOrder}
              title='Bật/tắt số thứ tự đọc trên bóng thoại'
              data-testid='toggle-reading-order'
              className={toolBtn(showReadingOrder, 'bg-[#C2410C]')}
            >
              <ListOrdered className='w-3.5 h-3.5' />{' '}
              <span className='hidden 2xl:inline'>Thứ tự</span>
            </button>
            <button
              onClick={() => setIsRTL((v) => !v)}
              title='Hướng đọc manga: Phải qua Trái (RTL)'
              data-testid='reading-direction-indicator'
              className='px-2 py-1 rounded-xl text-xs font-bold border border-[#D8D2C5] bg-[#FCFBF8] text-[#1C1917] hover:bg-[#F3F0E9] cursor-pointer flex items-center gap-1 transition-colors'
            >
              <Compass className='w-3 h-3 text-[#C2410C]' />
              <span>{isRTL ? 'RTL (Manga)' : 'LTR (Tây)'}</span>
            </button>
            <div className='w-px h-4 bg-[#D8D2C5] mx-1'></div>
            {/* Bộ chọn ngôn ngữ đang soạn (BR-34: Balloon Localization) */}
            <div
              data-testid='lettering-language-selector'
              className='flex items-center gap-1 bg-[#F3F0E9] px-2 py-0.5 rounded-xl border border-[#D8D2C5] text-xs font-semibold'
            >
              <Globe className='w-3 h-3 text-[#C2410C]' />
              <span className='text-[10px] text-[#78716C] font-mono'>Ngôn ngữ:</span>
              {[
                { code: 'vi', label: 'VI (Gốc)' },
                { code: 'en', label: 'EN' },
                { code: 'ja', label: 'JA' },
              ].map((l) => (
                <button
                  key={l.code}
                  type='button'
                  onClick={() => setActiveLang(l.code)}
                  className={`px-1.5 py-0.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                    activeLang === l.code
                      ? 'bg-[#1C1917] text-white font-bold shadow-2xs'
                      : 'text-[#57534E] hover:bg-[#E7E2D7]'
                  }`}
                  title={`Soạn bóng thoại ở ấn bản: ${l.label} (BR-34)`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setReaderMode((v) => !v)}
              aria-pressed={readerMode}
              title='Xem thử như người đọc manga trên điện thoại (~390px)'
              data-testid='toggle-reader-mode'
              className={toolBtn(readerMode, 'bg-[#F97316]')}
            >
              <Smartphone className='w-3.5 h-3.5' />{' '}
              <span className='hidden 2xl:inline'>Xem như người đọc</span>
            </button>
            <div className='w-px h-4 bg-[#D8D2C5] mx-1'></div>
            <button
              onClick={() => setSeeThrough((v) => !v)}
              aria-pressed={seeThrough}
              title='Làm mờ bóng thoại để nhìn ảnh bên dưới'
              className={toolBtn(seeThrough, 'bg-[#57534E]')}
            >
              <Eye className='w-3.5 h-3.5' /> <span className='hidden 2xl:inline'>Xem ảnh</span>
            </button>
            <label
              className='flex items-center gap-1 px-1.5 text-xs font-semibold text-[#57534E]'
              title='Độ đục nền bóng thoại (chữ vẫn rõ)'
            >
              Nền
              <input
                type='range'
                min={0}
                max={100}
                step={5}
                value={bgOpacity}
                onChange={(e) => setBgOpacity(Number(e.target.value))}
                data-testid='letterer-bg-opacity'
                aria-label='Độ đục nền bóng thoại'
                className='w-16 accent-[#F97316] cursor-pointer'
              />
              <span className='w-8 tabular-nums'>{bgOpacity}%</span>
            </label>
            <button
              onClick={() => setHideLettering((v) => !v)}
              aria-pressed={hideLettering}
              title='Tạm ẩn toàn bộ chữ để xem tranh gốc'
              data-testid='toggle-hide-lettering'
              className={toolBtn(hideLettering, 'bg-[#57534E]')}
            >
              <EyeOff className='w-3.5 h-3.5' /> <span className='hidden 2xl:inline'>Ẩn chữ</span>
            </button>
            <button
              onClick={() => setShowGuides((v) => !v)}
              aria-pressed={showGuides}
              title='Đường căn chỉnh: ranh giới khung, lề an toàn, tâm trang'
              data-testid='toggle-guides'
              className={toolBtn(showGuides, 'bg-blue-600')}
            >
              <LayoutGrid className='w-3.5 h-3.5' />{' '}
              <span className='hidden 2xl:inline'>Căn chỉnh</span>
            </button>
          </div>

          {/* Viewport: lăn chuột zoom quanh con trỏ; Space/Bàn tay/chuột giữa để pan */}
          <div
            ref={viewportRef}
            data-testid='letterer-viewport'
            onPointerDown={handleViewportPointerDown}
            onClick={handleViewportClick}
            onDragOver={handleViewportDragOver}
            onDrop={handleViewportDrop}
            onDragLeave={handleViewportDragLeave}
            className={`relative flex-1 min-h-0 overflow-hidden select-none touch-none overscroll-contain ${viewportCursor} ${
              readerMode ? 'w-full max-w-[420px] mx-auto shadow-2xl border-x border-zinc-300' : ''
            }`}
          >
            {readerMode && (
              <div
                className='absolute top-3 left-1/2 transform -translate-x-1/2 z-50 bg-[#171717]/90 text-white backdrop-blur px-4 py-1.5 rounded-full flex items-center gap-3 text-xs shadow-xl'
                data-testid='reader-mode-banner'
              >
                <span className='flex items-center gap-1.5 font-medium'>
                  <Smartphone className='w-3.5 h-3.5 text-emerald-400' />
                  Xem như người đọc (390px)
                </span>
                <button
                  onClick={() => setReaderMode(false)}
                  data-testid='exit-reader-mode'
                  className='px-2.5 py-0.5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-xs font-bold cursor-pointer transition-colors'
                >
                  ✕ Thoát xem thử
                </button>
              </div>
            )}
            <div
              data-testid='letterer-stage'
              className='absolute left-0 top-0 bg-white shadow-2xl'
              style={
                {
                  width: pageDim.width,
                  height: pageDim.height,
                  transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
                  transformOrigin: '0 0',
                  willChange: 'transform',
                  '--inv': 1 / (view.scale || 1),
                } as React.CSSProperties
              }
            >
              {/* Priority 1 / 2 / 3 background artwork */}
              {wholePageArtUrl || backdropUrl ? (
                <img
                  src={wholePageArtUrl || backdropUrl}
                  alt='Ảnh nền trang truyện'
                  data-testid='letterer-page-backdrop'
                  className='absolute inset-0 w-full h-full object-fill pointer-events-none select-none'
                  style={{ opacity: bgOpacity / 100 }}
                  draggable={false}
                />
              ) : hasAnyPanelArt ? (
                <div
                  data-testid='letterer-panels-backdrop-layer'
                  className='absolute inset-0 pointer-events-none select-none'
                  style={{ opacity: bgOpacity / 100 }}
                >
                  {panels.map((p) => {
                    const art = pickPanelArtwork(pageArtworks, p.id, stages);
                    const pUrl = art ? panelArtworkUrls[art.id] : undefined;
                    const pBox = parseBoundingBox(p.boundingBox, pageDim.width, pageDim.height);
                    if (pUrl) {
                      return (
                        <img
                          key={p.id}
                          src={pUrl}
                          alt={`Khung #${p.panelNumber}`}
                          data-testid={`letterer-panel-backdrop-${p.id}`}
                          className='absolute object-cover'
                          style={{
                            left: pBox.pixelX,
                            top: pBox.pixelY,
                            width: pBox.pixelW,
                            height: pBox.pixelH,
                          }}
                          draggable={false}
                        />
                      );
                    }
                    return (
                      <div
                        key={p.id}
                        data-testid={`letterer-panel-backdrop-placeholder-${p.id}`}
                        className='absolute flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs border border-dashed border-zinc-300'
                        style={{
                          left: pBox.pixelX,
                          top: pBox.pixelY,
                          width: pBox.pixelW,
                          height: pBox.pixelH,
                        }}
                      >
                        Chưa có ảnh
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  data-testid='letterer-no-art-notice'
                  className='absolute inset-0 flex items-center justify-center pointer-events-none select-none'
                  style={{ opacity: bgOpacity / 100 }}
                >
                  <span className='text-zinc-400 text-sm font-medium bg-white/80 px-4 py-2 rounded shadow-xs border border-zinc-200'>
                    Chưa có ảnh
                  </span>
                </div>
              )}

              {/* Khung tương tác trên Canvas (đồng bộ với nhóm kịch bản) */}
              {panels.map((p) => {
                const pBox = parseBoundingBox(p.boundingBox, pageDim.width, pageDim.height);
                const isSelected = selectedPanelId === p.id;
                return (
                  <div
                    key={`canvas-panel-${p.id}`}
                    data-testid={`canvas-panel-${p.id}`}
                    data-canvas-panel-id={p.id}
                    onClick={(e) => {
                      if (isPanIntent(e.button)) return;
                      setSelectedPanelId((prev) => (prev === p.id ? null : p.id));
                      if (toolMode === 'select') {
                        e.stopPropagation();
                        setSelectedElementId(null);
                      }
                    }}
                    className={`absolute transition-colors pointer-events-auto cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-amber-500 bg-amber-500/10 z-10'
                        : 'hover:ring-1 hover:ring-amber-400/50 z-0'
                    }`}
                    style={{
                      left: pBox.pixelX,
                      top: pBox.pixelY,
                      width: pBox.pixelW,
                      height: pBox.pixelH,
                    }}
                    title={`Khung #${p.panelNumber}`}
                  >
                    <span
                      className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded select-none shadow-xs ${
                        isSelected ? 'bg-amber-500 text-white' : 'bg-black/50 text-white/90'
                      }`}
                    >
                      #{p.panelNumber}
                    </span>
                  </div>
                );
              })}

              {/* Đường căn chỉnh: ranh giới khung, lề an toàn, tâm trang */}
              {showGuides && (
                <svg
                  className='absolute inset-0 pointer-events-none'
                  width={pageDim.width}
                  height={pageDim.height}
                  viewBox={`0 0 ${pageDim.width} ${pageDim.height}`}
                  data-testid='letterer-guides'
                >
                  <rect
                    x={SAFE_MARGIN_PX}
                    y={SAFE_MARGIN_PX}
                    width={pageDim.width - 2 * SAFE_MARGIN_PX}
                    height={pageDim.height - 2 * SAFE_MARGIN_PX}
                    fill='none'
                    stroke='rgba(59,130,246,0.55)'
                    strokeWidth={1.5}
                    strokeDasharray='8 6'
                    vectorEffect='non-scaling-stroke'
                  />
                  <line
                    x1={pageDim.width / 2}
                    y1={0}
                    x2={pageDim.width / 2}
                    y2={pageDim.height}
                    stroke='rgba(236,72,153,0.35)'
                    strokeWidth={1}
                    strokeDasharray='4 6'
                    vectorEffect='non-scaling-stroke'
                  />
                  <line
                    x1={0}
                    y1={pageDim.height / 2}
                    x2={pageDim.width}
                    y2={pageDim.height / 2}
                    stroke='rgba(236,72,153,0.35)'
                    strokeWidth={1}
                    strokeDasharray='4 6'
                    vectorEffect='non-scaling-stroke'
                  />
                  {snapGuides.x !== null && (
                    <line
                      data-testid='letterer-snap-guide-x'
                      x1={snapGuides.x}
                      y1={0}
                      x2={snapGuides.x}
                      y2={pageDim.height}
                      stroke='#F97316'
                      strokeWidth={1.5}
                      vectorEffect='non-scaling-stroke'
                    />
                  )}
                  {snapGuides.y !== null && (
                    <line
                      data-testid='letterer-snap-guide-y'
                      x1={0}
                      y1={snapGuides.y}
                      x2={pageDim.width}
                      y2={snapGuides.y}
                      stroke='#F97316'
                      strokeWidth={1.5}
                      vectorEffect='non-scaling-stroke'
                    />
                  )}
                  {polygons.map((poly) => (
                    <polygon
                      key={poly.id}
                      points={poly.points}
                      fill='none'
                      stroke='rgba(16,185,129,0.75)'
                      strokeWidth={1.5}
                      vectorEffect='non-scaling-stroke'
                      data-testid={`guide-panel-${poly.id}`}
                    />
                  ))}
                </svg>
              )}

              {/* Keep-out Zones ("Vùng cấm chữ" - P3) */}
              {localKeepOutZones.map((kz) => (
                <div
                  key={kz.id}
                  data-testid={`keep-out-zone-${kz.id}`}
                  className={`absolute border-2 border-dashed border-red-500 bg-red-500/15 pointer-events-auto rounded z-15 flex flex-col justify-between p-1 select-none ${
                    readerMode ? 'hidden' : 'flex'
                  }`}
                  style={{
                    left: kz.x,
                    top: kz.y,
                    width: kz.width,
                    height: kz.height,
                  }}
                >
                  <div className='flex items-center justify-between text-[11px] font-bold text-red-700 bg-white/95 px-1.5 py-0.5 rounded shadow-xs max-w-full'>
                    <span className='truncate flex items-center gap-1'>
                      <ShieldAlert className='w-3 h-3 text-red-500 shrink-0' />
                      <span className='truncate'>{kz.label || 'Vùng cấm'}</span>
                    </span>
                    {!isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteKeepOut(kz.id);
                        }}
                        title='Xoá vùng cấm này'
                        className='ml-1 text-zinc-400 hover:text-red-600 cursor-pointer'
                      >
                        <X className='w-3 h-3' />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Live drawing keep-out preview */}
              {drawingKeepOut && (
                <div
                  className='absolute border-2 border-dashed border-red-600 bg-red-500/25 pointer-events-none z-30'
                  style={{
                    left: drawingKeepOut.x,
                    top: drawingKeepOut.y,
                    width: drawingKeepOut.width,
                    height: drawingKeepOut.height,
                  }}
                />
              )}

              {/* Flashback panels overlay: dark gutter and soft border (P4) */}
              {Array.from(flashbackPanelIds).map((pId) => {
                const panel = panels.find((p) => p.id === pId);
                if (!panel) return null;
                const pBox = parseBoundingBox(panel.boundingBox, pageDim.width, pageDim.height);
                return (
                  <div
                    key={`flashback-overlay-${pId}`}
                    data-testid={`flashback-panel-overlay-${pId}`}
                    className='absolute pointer-events-none border-2 border-zinc-900/70 shadow-[0_0_24px_rgba(0,0,0,0.45)_inset] rounded-sm z-5'
                    style={{
                      left: pBox.pixelX,
                      top: pBox.pixelY,
                      width: pBox.pixelW,
                      height: pBox.pixelH,
                    }}
                  />
                );
              })}

              {/* Elements on canvas (px trang gốc, dùng chung phép biến đổi của stage) */}
              {elements.map((b) => {
                const isSelected = selectedElementId === b.elementId;
                // Ẩn nhãn cảnh báo trong lúc kéo để chỉ thấy bóng di chuyển
                const hideBadges = readerMode || draggingId === b.elementId;
                const isImageLayer = IMAGE_LAYER_TYPES.includes(b.elementType as any);
                const box = getNormalizedElementBox(b);

                if (isImageLayer) {
                  if (visibleLayers[b.elementType] === false) return null;
                  return (
                    <div
                      key={b.elementId}
                      className='absolute pointer-events-none select-none border border-dashed border-purple-400/40 rounded overflow-hidden'
                      style={{
                        left: box.pxX,
                        top: box.pxY,
                        width: box.pxW,
                        height: box.pxH,
                        transform: `rotate(${b.rotation || 0}deg)`,
                        transformOrigin: 'center center',
                        zIndex: b.zIndex || 1,
                      }}
                      data-testid={`letterer-image-layer-${b.elementId}`}
                    >
                      {b.content?.startsWith('http') || b.content?.startsWith('data:') ? (
                        <img
                          src={b.content}
                          alt={b.elementType}
                          className='w-full h-full object-contain'
                        />
                      ) : (
                        <div className='w-full h-full bg-purple-500/10 flex items-center justify-center p-1 text-center'>
                          <span
                            className='font-semibold text-purple-700 font-mono'
                            style={{ fontSize: 'calc(var(--inv) * 10px)' }}
                          >
                            [{LAYER_LABELS[b.elementType] || b.elementType}]
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }

                const displayedText = getElementText(b, activeLang);
                const textConstraints = evaluateTextConstraints(
                  displayedText,
                  box.pxW,
                  box.pxH,
                  overflowInfo[b.elementId],
                );
                const keepOutCollision = findKeepOutCollision(
                  { x: box.pxX, y: box.pxY, width: box.pxW, height: box.pxH },
                  localKeepOutZones,
                );
                const isOrderMismatch = readingOrderMismatches.some(
                  (m) => m.elementId === b.elementId,
                );

                const hasCollision = keepOutCollision != null;
                const isTooLong = textConstraints.isTooLong;
                const overflowing =
                  overflowInfo[b.elementId] != null || textConstraints.isOverflowing;

                // Giao diện thật của bóng — đọc từ style đã lưu, cùng quy tắc với màn duyệt và bản xuất
                const appearance = appearanceOf(b);
                const currentTail =
                  tailDraft[b.elementId] ?? tailFromStyle(b.style) ?? defaultTail(box.pxW, box.pxH);
                const shapePath = balloonPath(appearance.shape, box.pxW, box.pxH, currentTail);
                const textStyle = resolveTextStyle(b);
                const textLayout = layoutText(
                  displayedText,
                  textStyle,
                  appearance.shape,
                  box.pxW,
                  box.pxH,
                );
                // Thanh "Nền" chỉ làm mờ nền khi làm việc; viền thật theo cấu hình, không bị ép hiện hay ẩn
                const fillColor = fillRgba(appearance, readerMode ? 1 : bgOpacity / 100);
                // Khung chọn/cảnh báo chỉ là trợ giúp chỉnh sửa (box-shadow), không thuộc sản phẩm
                const ring = readerMode
                  ? undefined
                  : isSelected
                    ? '0 0 0 calc(var(--inv) * 2px) #10B981'
                    : hasCollision || overflowing || isTooLong
                      ? '0 0 0 calc(var(--inv) * 2px) rgba(239,68,68,0.8)'
                      : b.isStale
                        ? '0 0 0 calc(var(--inv) * 2px) rgba(245,158,11,0.8)'
                        : undefined;
                // Không nền, không viền: vẫn cần vùng bấm thấy được trong editor
                const invisibleShape =
                  !shapePath || (appearance.fillOpacity === 0 && appearance.borderWidth === 0);
                const hitHint =
                  !readerMode && invisibleShape && !ring
                    ? '1px dashed rgba(113,113,122,0.6)'
                    : undefined;
                const editing = editingId === b.elementId;

                return (
                  <div
                    key={b.elementId}
                    data-testid={`letterer-element-${b.elementId}`}
                    onPointerDown={(e) => handleBalloonPointerDown(e, b.elementId)}
                    onClick={(e) => {
                      if (isPanIntent(e.button)) return;
                      e.stopPropagation();
                      setSelectedElementId(b.elementId);
                    }}
                    onDoubleClick={(e) => {
                      if (isReadOnly || isPanIntent(e.button)) return;
                      e.stopPropagation();
                      setSelectedElementId(b.elementId);
                      setEditingId(b.elementId);
                    }}
                    className={`speech-balloon absolute select-none ${
                      editing ? 'cursor-text' : panIntent ? '' : 'cursor-move'
                    }`}
                    style={{
                      left: box.pxX,
                      top: box.pxY,
                      width: box.pxW,
                      height: box.pxH,
                      boxSizing: 'border-box',
                      padding: 0,
                      background: 'transparent',
                      color: textStyle.color,
                      border: 'none',
                      borderRadius: 0,
                      outline: hitHint,
                      boxShadow: ring,
                      opacity: seeThrough ? 0.3 : 1,
                      visibility: hideLettering ? 'hidden' : 'visible',
                      zIndex: isSelected ? 30 : b.isStale || overflowing || hasCollision ? 20 : 10,
                    }}
                  >
                    {/* Hình bóng thật — cùng path/nền/viền với màn duyệt (balloonRender); "Chỉ chữ" thì không vẽ */}
                    {shapePath && (
                      <svg
                        className='absolute inset-0 pointer-events-none'
                        data-testid={`balloon-shape-${b.elementId}`}
                        data-shape={appearance.shape}
                        style={{ width: box.pxW, height: box.pxH, overflow: 'visible' }}
                      >
                        <path
                          d={shapePath}
                          fill={fillColor}
                          stroke={appearance.borderWidth > 0 ? appearance.borderColor : 'none'}
                          strokeWidth={appearance.borderWidth}
                        />
                        {appearance.shape === 'cloud' &&
                          createThoughtTailDots(box.pxW, box.pxH, currentTail.x, currentTail.y).map(
                            (dot, dotIdx) => (
                              <circle
                                key={dotIdx}
                                cx={dot.cx}
                                cy={dot.cy}
                                r={dot.r}
                                fill={fillColor}
                                stroke={
                                  appearance.borderWidth > 0 ? appearance.borderColor : 'none'
                                }
                                strokeWidth={appearance.borderWidth}
                              />
                            ),
                          )}
                      </svg>
                    )}

                    {/* Draggable tail handle (P1) */}
                    {isSelected &&
                      !isReadOnly &&
                      (appearance.shape === 'oval' || appearance.shape === 'cloud') &&
                      !readerMode && (
                        <div
                          data-testid={`tail-handle-${b.elementId}`}
                          onPointerDown={(e) => handleTailPointerDown(e, b.elementId)}
                          title='Kéo chỉnh đuôi bóng thoại'
                          className='absolute bg-emerald-500 border-2 border-white rounded-full cursor-crosshair shadow-md z-40 transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform'
                          style={{
                            left: currentTail.x,
                            top: currentTail.y,
                            width: 'calc(var(--inv) * 14px)',
                            height: 'calc(var(--inv) * 14px)',
                          }}
                        />
                      )}

                    {/* Tay nắm đổi kích thước ở 4 góc (góc đối diện đứng yên) */}
                    {isSelected &&
                      !isReadOnly &&
                      !readerMode &&
                      (['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                        <div
                          key={corner}
                          data-corner={corner}
                          title={
                            autoFitText
                              ? 'Kéo để đổi kích thước (chữ tự co theo bóng)'
                              : 'Kéo để đổi kích thước'
                          }
                          data-testid={
                            corner === 'se'
                              ? `letterer-resize-${b.elementId}`
                              : `letterer-resize-${corner}-${b.elementId}`
                          }
                          className={`absolute bg-[#10B981] border-white rounded-sm shadow ${
                            corner === 'nw' || corner === 'se'
                              ? 'cursor-nwse-resize'
                              : 'cursor-nesw-resize'
                          }`}
                          style={{
                            width: 'calc(var(--inv) * 14px)',
                            height: 'calc(var(--inv) * 14px)',
                            [corner.includes('w') ? 'left' : 'right']: 'calc(var(--inv) * -7px)',
                            [corner.includes('n') ? 'top' : 'bottom']: 'calc(var(--inv) * -7px)',
                            borderWidth: 'calc(var(--inv) * 2px)',
                            borderStyle: 'solid',
                            zIndex: 40,
                          }}
                        />
                      ))}

                    {/* Badge Thứ tự đọc */}
                    {showReadingOrder && !hideBadges && (
                      <span
                        data-testid={`reading-order-badge-${b.elementId}`}
                        className='absolute bg-[#171717] text-white font-mono font-bold rounded-full shadow-2xs z-30'
                        style={{
                          top: 'calc(var(--inv) * -10px)',
                          left: 'calc(var(--inv) * -8px)',
                          fontSize: 'calc(var(--inv) * 10px)',
                          padding: 'calc(var(--inv) * 1px) calc(var(--inv) * 6px)',
                        }}
                      >
                        #{b.readingOrder ?? elements.indexOf(b) + 1}
                      </span>
                    )}

                    {/* Stale Warning Badge (BR-05) */}
                    {b.isStale && !hideBadges && (
                      <span
                        className='absolute bg-amber-500 text-white font-bold rounded shadow-2xs flex items-center gap-1 animate-pulse z-30'
                        style={{
                          top: 'calc(var(--inv) * -10px)',
                          right: 'calc(var(--inv) * 4px)',
                          fontSize: 'calc(var(--inv) * 10px)',
                          padding: 'calc(var(--inv) * 1px) calc(var(--inv) * 6px)',
                        }}
                      >
                        <AlertTriangle
                          style={{
                            width: 'calc(var(--inv) * 10px)',
                            height: 'calc(var(--inv) * 10px)',
                          }}
                        />{' '}
                        Sửa đổi
                      </span>
                    )}

                    {/* Badge Va chạm vùng cấm chữ (P3) */}
                    {hasCollision && !hideBadges && (
                      <span
                        data-testid={`keepout-collision-badge-${b.elementId}`}
                        className='absolute bg-red-600 text-white font-bold rounded shadow-2xs flex items-center gap-1 z-30 animate-pulse'
                        style={{
                          top: 'calc(var(--inv) * -10px)',
                          right: b.isStale ? 'calc(var(--inv) * 60px)' : 'calc(var(--inv) * 4px)',
                          fontSize: 'calc(var(--inv) * 10px)',
                          padding: 'calc(var(--inv) * 1px) calc(var(--inv) * 6px)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <ShieldAlert
                          style={{
                            width: 'calc(var(--inv) * 10px)',
                            height: 'calc(var(--inv) * 10px)',
                          }}
                        />{' '}
                        Che mặt/tay
                      </span>
                    )}

                    {/* Cảnh báo chữ tràn khung hoặc quá dài */}
                    {(overflowing || isTooLong) && !hideBadges && (
                      <span
                        data-testid={
                          isTooLong
                            ? `toolong-badge-${b.elementId}`
                            : `overflow-badge-${b.elementId}`
                        }
                        className='absolute bg-red-600 text-white font-bold rounded shadow-2xs flex items-center gap-1 z-30'
                        style={{
                          bottom: 'calc(var(--inv) * -22px)',
                          left: 0,
                          fontSize: 'calc(var(--inv) * 10px)',
                          padding: 'calc(var(--inv) * 2px) calc(var(--inv) * 6px)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <AlertTriangle
                          style={{
                            width: 'calc(var(--inv) * 10px)',
                            height: 'calc(var(--inv) * 10px)',
                          }}
                        />{' '}
                        {isTooLong
                          ? overflowing
                            ? `Quá dài (${textConstraints.wordCount} từ) · Tràn`
                            : `Quá dài (${textConstraints.wordCount} từ)`
                          : 'Chữ tràn khung'}
                      </span>
                    )}

                    {/* Cảnh báo thứ tự đọc ngược */}
                    {isOrderMismatch && !hideBadges && (
                      <span
                        data-testid={`order-mismatch-badge-${b.elementId}`}
                        className='absolute bg-blue-600 text-white font-bold rounded shadow-2xs flex items-center gap-1 z-30'
                        style={{
                          bottom: 'calc(var(--inv) * -22px)',
                          right: 0,
                          fontSize: 'calc(var(--inv) * 10px)',
                          padding: 'calc(var(--inv) * 2px) calc(var(--inv) * 6px)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Compass
                          style={{
                            width: 'calc(var(--inv) * 10px)',
                            height: 'calc(var(--inv) * 10px)',
                          }}
                        />{' '}
                        Thứ tự ngược
                      </span>
                    )}

                    {/* Cảnh báo nội dung là chỉ dẫn (không phải thoại) */}
                    {(() => {
                      const linked = b.scriptLineId
                        ? sceneLines.find((l) => l.id === b.scriptLineId)
                        : null;
                      const isDirectionWarning = Boolean(
                        b.content?.trim() &&
                        ((linked?.stageDirection &&
                          b.content.trim() === linked.stageDirection.trim()) ||
                          (linked && !linked.dialogueText && linked.stageDirection) ||
                          sceneLines.some(
                            (l) =>
                              l.stageDirection &&
                              !l.dialogueText &&
                              l.stageDirection.trim() === b.content?.trim(),
                          )),
                      );
                      if (!isDirectionWarning || hideBadges) return null;
                      return (
                        <span
                          data-testid={`stage-direction-warning-${b.elementId}`}
                          className='absolute bg-amber-600 text-white font-bold rounded shadow-2xs flex items-center gap-1 z-30'
                          style={{
                            top: 'calc(var(--inv) * -24px)',
                            left: 0,
                            fontSize: 'calc(var(--inv) * 10px)',
                            padding: 'calc(var(--inv) * 2px) calc(var(--inv) * 6px)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <AlertTriangle
                            style={{
                              width: 'calc(var(--inv) * 10px)',
                              height: 'calc(var(--inv) * 10px)',
                            }}
                          />{' '}
                          Nội dung là chỉ dẫn, không phải thoại
                        </span>
                      );
                    })()}

                    {/* Nội dung: hiển thị thuần (không có ô nhập). Bấm đúp để sửa tại chỗ. */}
                    {editing ? (
                      <CommitTextarea
                        autoFocus
                        value={displayedText}
                        readOnly={isReadOnly}
                        onCommit={(text) => updateBalloonText(b.elementId, text)}
                        onDone={() => setEditingId(null)}
                        testId={`inline-editor-${b.elementId}`}
                        className='absolute inset-0 w-full h-full resize-none text-center font-bold focus:outline-none bg-white/95 text-zinc-900'
                        style={{
                          ...textStyleCss(resolveTextStyle(b)),
                          color: undefined, // ô sửa dùng màu của lớp nền ô (đen/trắng) để luôn đọc được
                          WebkitTextStroke: undefined,
                          padding: LETTERING_PADDING_PX,
                          borderRadius: 'inherit',
                          zIndex: 35,
                        }}
                      />
                    ) : (
                      // Chữ theo đúng các dòng `layoutText` đã ngắt (cùng thuật toán và vùng an toàn với màn duyệt);
                      // tràn thì chữ vẫn hiện ra ngoài vùng để thấy, kèm cảnh báo — không tự thu nhỏ.
                      <div
                        data-testid={`balloon-text-${b.elementId}`}
                        className='absolute z-20 flex flex-col justify-center pointer-events-none'
                        style={{
                          left: textLayout.area.x,
                          top: textLayout.area.y,
                          width: textLayout.area.w,
                          height: textLayout.area.h,
                          ...textStyleCss(textStyle),
                          lineHeight: `${textLayout.lineHeightPx}px`,
                        }}
                      >
                        {textLayout.lines.map((line, i) => (
                          <div
                            key={i}
                            style={{ whiteSpace: 'pre', minHeight: textLayout.lineHeightPx }}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Bản xem trước khi kéo dòng kịch bản vào trang (chưa gửi lên máy chủ) */}
              {pending && (
                <div
                  data-pending-placement
                  data-testid='pending-placement'
                  onPointerDown={handlePendingPointerDown}
                  className='absolute cursor-move'
                  style={{
                    left: pending.x,
                    top: pending.y,
                    width: pending.width,
                    height: pending.height,
                    boxSizing: 'border-box',
                    padding: LETTERING_PADDING_PX,
                    background: 'rgba(16,185,129,0.18)',
                    border: 'calc(var(--inv) * 3px) dashed #10B981',
                    borderRadius:
                      pending.elementType === 'NARRATION_BOX'
                        ? 0
                        : Math.min(56, pending.height / 3),
                    zIndex: 50,
                  }}
                >
                  <div className='w-full h-full flex items-center justify-center'>
                    <span
                      className='font-bold text-emerald-900'
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        fontSize: LETTERING_FONT_PX,
                        lineHeight: LETTERING_LINE_HEIGHT_EM,
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {pending.line ? classifyScriptLine(pending.line).cleanText : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Thanh xác nhận đặt (đứng yên theo màn hình, bám dưới bản xem trước) */}
            {pending?.dropped && pendingScreen && (
              <div
                data-pending-placement
                data-testid='pending-confirm-bar'
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className='absolute z-30 bg-white rounded-xl shadow-xl border border-black/10 px-2 py-1.5 flex items-center gap-1 text-xs'
                style={{
                  left: Math.max(8, Math.min(vpSize.width - 8, pendingScreen.x)),
                  top: Math.max(8, Math.min(vpSize.height - 48, pendingScreen.y + 10)),
                  transform: 'translateX(-50%)',
                }}
              >
                {Object.entries(TYPE_SHORT_LABEL).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => changePendingType(type)}
                    aria-pressed={pending.elementType === type}
                    className={`px-2 py-1 rounded-lg font-semibold cursor-pointer ${
                      pending.elementType === type
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <div className='w-px h-4 bg-zinc-200 mx-1'></div>
                <button
                  onClick={confirmPending}
                  data-testid='pending-confirm'
                  className='px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-pointer'
                >
                  <Check className='w-3.5 h-3.5' /> Đặt
                </button>
                <button
                  onClick={cancelPending}
                  data-testid='pending-cancel'
                  className='px-2 py-1 rounded-lg text-zinc-600 hover:bg-zinc-100 flex items-center gap-1 cursor-pointer'
                >
                  <X className='w-3.5 h-3.5' /> Huỷ
                </button>
              </div>
            )}

            {/* Điều khiển zoom */}
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className='absolute bottom-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-black/10 px-1.5 py-1 flex items-center gap-0.5 text-xs'
              data-testid='zoom-controls'
            >
              <button
                onClick={() => zoomStep(0.8)}
                aria-label='Thu nhỏ'
                title='Thu nhỏ (-)'
                className='p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer'
              >
                <ZoomOut className='w-4 h-4' />
              </button>
              <button
                onClick={() => zoomTo(1)}
                title='Về 100%'
                data-testid='zoom-percent'
                className='min-w-[3.25rem] px-1 py-1 rounded-lg font-mono font-bold hover:bg-zinc-100 cursor-pointer'
              >
                {Math.round(view.scale * 100)}%
              </button>
              <button
                onClick={() => zoomStep(1.25)}
                aria-label='Phóng to'
                title='Phóng to (+)'
                className='p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer'
              >
                <ZoomIn className='w-4 h-4' />
              </button>
              <div className='w-px h-4 bg-zinc-200 mx-1'></div>
              <button
                onClick={() => applyFit('page')}
                title='Vừa trang (0)'
                data-testid='fit-page'
                className={`px-2 py-1 rounded-lg font-semibold cursor-pointer ${
                  fitMode === 'page' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-100'
                }`}
              >
                Vừa trang
              </button>
              <button
                onClick={() => applyFit('width')}
                title='Vừa chiều ngang'
                data-testid='fit-width'
                className={`px-2 py-1 rounded-lg font-semibold cursor-pointer ${
                  fitMode === 'width' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-100'
                }`}
              >
                Vừa ngang
              </button>
              <button
                onClick={() => zoomTo(1)}
                title='Kích thước thật 100% (1)'
                className='px-2 py-1 rounded-lg font-semibold hover:bg-zinc-100 cursor-pointer'
              >
                100%
              </button>
            </div>
          </div>
        </div>

        {/* Right Drawer: Properties */}
        {rightVisible && (
          <>
            <div
              onPointerDown={startSideResize('right')}
              role='separator'
              aria-orientation='vertical'
              aria-label='Đổi chiều rộng bảng thuộc tính'
              data-testid='right-resizer'
              className='w-1.5 shrink-0 cursor-col-resize bg-transparent hover:bg-emerald-400/40 active:bg-emerald-500/50'
            />
            <div
              style={{ width: layout.rightW }}
              className='shrink-0 bg-[#FCFBF8] border-l border-[#D8D2C5] flex flex-col overflow-hidden'
              data-testid='right-panel'
            >
              <div className='p-3 border-b border-[#D8D2C5] flex items-center gap-2 bg-[#F8F6F0]'>
                <Type className='w-4 h-4 text-[#C2410C]' />
                <h4 className='font-serif font-bold text-xs uppercase tracking-wider text-[#1C1917]'>
                  Thuộc Tính Phần Tử
                </h4>
              </div>

              {selectedElement && selectedElementBox ? (
                <div className='p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar text-xs'>
                  {/* Nội dung chữ: sửa ở đây hoặc bấm đúp bóng trên trang; chỉ lưu khi rời ô */}
                  {!IMAGE_LAYER_TYPES.includes(selectedElement.elementType as any) && (
                    <div className='space-y-1.5'>
                      <label className='block font-semibold text-[#1C1917]'>Nội dung chữ</label>
                      <CommitTextarea
                        key={selectedElement.elementId}
                        value={selectedElement.content || ''}
                        readOnly={isReadOnly}
                        onCommit={(text) => updateBalloonText(selectedElement.elementId, text)}
                        rows={4}
                        testId='element-text-editor'
                        className='w-full p-2 bg-[#FCFBF8] border border-[#D8D2C5] rounded-lg text-xs text-[#1C1917] resize-y focus:outline-none focus:border-[#F97316]'
                      />
                      <p className='text-xs text-[#57534E]'>
                        Lưu khi rời ô (hoặc Ctrl+Enter). Esc để hoàn tác.
                      </p>
                    </div>
                  )}

                  {/* Thanh định dạng chữ (kiểu có sẵn, font, cỡ, B/I, căn lề, màu, viền, giãn dòng) */}
                  {!IMAGE_LAYER_TYPES.includes(selectedElement.elementType as any) && (
                    <TextFormatToolbar
                      key={`fmt-${selectedElement.elementId}`}
                      style={resolveTextStyle(selectedElement)}
                      isCustom={!!selectedElement.style}
                      disabled={isReadOnly}
                      // Thanh định dạng chỉ đổi thuộc tính chữ: giữ phần bóng/đuôi đã lưu
                      onChange={(style) =>
                        void handleUpdateStyle(
                          selectedElement.elementId,
                          mergeTextStyle(
                            style,
                            selectedElement.style,
                            resolveTextStyle({ elementType: selectedElement.elementType }),
                          ),
                        )
                      }
                    />
                  )}

                  {/* Hình bóng: độc lập với loại nội dung (loại đã lưu ở BE, không đổi được sau khi tạo) */}
                  {!IMAGE_LAYER_TYPES.includes(selectedElement.elementType as any) && (
                    <BalloonAppearancePanel
                      appearance={appearanceOf(selectedElement)}
                      defaultShapeLabel={
                        BALLOON_SHAPES.find(
                          (s) => s.value === defaultAppearance(selectedElement.elementType).shape,
                        )?.label ?? ''
                      }
                      isCustom={
                        Object.keys(appearanceFromStyle(selectedElement.style)).length > 0 ||
                        tailFromStyle(selectedElement.style) != null
                      }
                      disabled={isReadOnly}
                      onChange={(patch) => updateAppearance(selectedElement.elementId, patch)}
                      onReset={() => updateAppearance(selectedElement.elementId, null)}
                      onFitBox={() => growToFit(selectedElement.elementId)}
                      onFitText={() => fitTextToBox(selectedElement.elementId)}
                      autoFitText={autoFitText}
                      onToggleAutoFit={toggleAutoFitText}
                    />
                  )}

                  {/* AI Dialogue Shortening (Letterer Agent CF2 2.4) */}
                  <div className='p-3 bg-[#FFF2E6] border border-[#FDBA74] rounded-xl space-y-2.5'>
                    <div className='flex items-center justify-between'>
                      <span className='font-serif font-bold text-[#1C1917] text-xs flex items-center gap-1.5'>
                        <Sparkles className='w-3.5 h-3.5 text-[#C2410C]' />
                        <span>Letterer Agent (Rút gọn thoại)</span>
                      </span>
                      <span className='text-xs font-mono text-[#C2410C] font-semibold'>
                        {selectedElement.content?.length || 0} ký tự
                      </span>
                    </div>
                    <p className='text-xs text-[#57534E] leading-tight'>
                      AI phân tích giới hạn kích thước balloon và đề xuất rút gọn thoại tự nhiên,
                      vừa vặn khung tranh.
                    </p>

                    {(() => {
                      const matchSug = aiSuggestions.find(
                        (s) =>
                          (s.targetElementId && s.targetElementId === selectedElement.elementId) ||
                          (s.sourceScriptLineId &&
                            s.sourceScriptLineId === selectedElement.scriptLineId),
                      );
                      if (matchSug) {
                        return (
                          <div className='bg-[#FCFBF8] p-2.5 rounded-lg border border-[#D8D2C5] space-y-1.5 text-xs'>
                            <div className='text-[#57534E] text-xs'>
                              Gợi ý hiện có cho bóng thoại này:
                            </div>
                            <div className='font-bold text-[#1C1917] italic bg-[#F8F6F0] p-1.5 rounded'>
                              "{matchSug.suggestedText}"
                            </div>
                            <div className='flex items-center justify-between text-xs text-[#57534E]'>
                              <span>
                                {matchSug.suggestedText.length} ký tự (ước lượng tối đa:{' '}
                                {matchSug.maxChars})
                              </span>
                              <span
                                className={
                                  matchSug.withinEstimatedLimit
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-amber-700 font-bold'
                                }
                              >
                                {matchSug.withinEstimatedLimit
                                  ? '✓ Trong giới hạn'
                                  : 'Vượt giới hạn'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleApplySuggestionToElement(matchSug)}
                              className='w-full py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white rounded font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer'
                            >
                              <Check className='w-3.5 h-3.5' /> Áp dụng gợi ý này
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button
                          onClick={handleRunLettererAgent}
                          disabled={aiLoading || !activeSeriesId}
                          className='w-full py-1.5 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer'
                        >
                          {aiLoading ? (
                            <>
                              <RefreshCw className='w-3 h-3 animate-spin' />
                              <span>Đang phân tích...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className='w-3 h-3 text-amber-200' />
                              <span>Chạy Letterer Agent</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>

                  {/* Mật độ chữ của Panel (P2) */}
                  {panelDensity && (
                    <div
                      className='p-3 bg-[#F8F6F0] border border-[#D8D2C5] rounded-xl space-y-1.5'
                      data-testid='panel-density-card'
                    >
                      <div className='flex items-center justify-between text-xs'>
                        <span className='font-bold text-[#1C1917]'>Mật độ chữ khung</span>
                        <span className='font-bold font-mono' style={{ color: panelDensity.color }}>
                          {panelDensity.percentage}% • {panelDensity.label}
                        </span>
                      </div>
                      <div className='w-full bg-[#D8D2C5] h-2 rounded-full overflow-hidden'>
                        <div
                          className='h-full transition-all duration-300 rounded-full'
                          style={{
                            width: `${Math.min(100, panelDensity.percentage)}%`,
                            backgroundColor: panelDensity.color,
                          }}
                        />
                      </div>
                      <div className='flex items-center justify-between text-[11px] text-[#57534E]'>
                        <span>&lt;15%: Thoáng</span>
                        <span>15–25%: Vừa</span>
                        <span>&gt;25%: Dày</span>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleSuggestPosition(selectedElement.elementId)}
                          data-testid='suggest-position-btn'
                          className='mt-1 w-full py-1 bg-[#FCFBF8] hover:bg-[#F3F0E9] border border-[#D8D2C5] text-[#1C1917] rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors'
                        >
                          <Compass className='w-3 h-3 text-[#C2410C]' /> Gợi ý vị trí thoáng
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cảnh báo bóng thoại đè vùng cấm chữ (P3) */}
                  {selectedKeepOutCollision && (
                    <div
                      data-testid='keepout-callout'
                      className='p-3 bg-red-50 border border-red-300 rounded-xl space-y-2 text-red-900'
                    >
                      <div className='font-bold flex items-center gap-1.5 text-xs'>
                        <ShieldAlert className='w-4 h-4 text-red-600 shrink-0' />
                        <span>Bóng thoại che vùng cấm</span>
                      </div>
                      <p className='text-xs leading-relaxed'>
                        Bóng thoại đang che khuất{' '}
                        <strong>{selectedKeepOutCollision.label || 'mặt/tay nhân vật'}</strong>. Hãy
                        dời bóng thoại hoặc bấm nút gợi ý bên dưới.
                      </p>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleSuggestPosition(selectedElement.elementId)}
                          data-testid='suggest-position-btn-collision'
                          className='w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs'
                        >
                          <Compass className='w-3.5 h-3.5' /> Gợi ý vị trí thoáng nhất
                        </button>
                      )}
                    </div>
                  )}

                  {/* Cảnh báo chữ không vừa khung hoặc quá dài (>30 từ) (P2) */}
                  {(overflowInfo[selectedElement.elementId] != null ||
                    selectedTextConstraints?.isTooLong) && (
                    <div
                      data-testid='overflow-callout'
                      className='p-3 bg-red-50 border border-red-300 rounded-xl space-y-2 text-red-900'
                    >
                      <div className='font-bold flex items-center justify-between text-xs'>
                        <div className='flex items-center gap-1.5'>
                          <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
                          <span>
                            {selectedTextConstraints?.isTooLong
                              ? 'Thoại quá dài (>30 từ)'
                              : 'Chữ không vừa khung'}
                          </span>
                        </div>
                        {selectedTextConstraints && (
                          <span className='font-mono text-xs font-bold text-red-700'>
                            {selectedTextConstraints.wordCount} từ
                          </span>
                        )}
                      </div>
                      <p className='text-xs leading-relaxed'>
                        {selectedTextConstraints?.isTooLong
                          ? 'Câu dài bị nhồi thành khối dày làm giảm trải nghiệm đọc manga. Khuyên dùng rút gọn hoặc tách đôi.'
                          : `Chữ cao khoảng ${Math.round(overflowInfo[selectedElement.elementId] || 0)}px, khung chỉ chứa ${Math.max(0, Math.round(selectedElementBox.pxH - 2 * LETTERING_PADDING_PX))}px.`}
                      </p>
                      {!isReadOnly && (
                        <div className='flex flex-col gap-1.5 pt-0.5'>
                          <button
                            onClick={handleRunLettererAgent}
                            disabled={aiLoading || !activeSeriesId}
                            data-testid='ai-shorten-btn'
                            className='w-full py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs'
                          >
                            <Sparkles className='w-3.5 h-3.5 text-amber-300' /> AI Rút Gọn Thoại
                          </button>
                          <button
                            onClick={() => handleSplitBalloon(selectedElement.elementId)}
                            data-testid='split-balloon-btn'
                            className='w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs'
                          >
                            <Split className='w-3.5 h-3.5' /> Tách thành 2 bóng
                          </button>
                          {overflowInfo[selectedElement.elementId] != null && (
                            <button
                              onClick={() => growToFit(selectedElement.elementId)}
                              data-testid='grow-to-fit'
                              className='w-full py-1.5 bg-zinc-700 hover:bg-zinc-800 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer'
                            >
                              Tăng khung cho vừa chữ
                            </button>
                          )}
                        </div>
                      )}
                      <p className='text-xs text-red-700/80'>
                        Cỡ chữ cố định {Math.max(MIN_LETTERING_FONT_PX, LETTERING_FONT_PX)}px theo
                        chuẩn hệ thống (không tự thu nhỏ dưới mức tối thiểu {MIN_LETTERING_FONT_PX}
                        px).
                      </p>
                    </div>
                  )}

                  {/* Cảnh báo thứ tự đọc ngược kịch bản (P5) */}
                  {selectedOrderMismatch && (
                    <div
                      data-testid='reading-order-mismatch-callout'
                      className='p-3 bg-blue-50 border border-blue-300 rounded-xl space-y-1.5 text-blue-900'
                    >
                      <div className='font-bold flex items-center gap-1.5 text-xs'>
                        <Compass className='w-4 h-4 text-blue-600 shrink-0' />
                        <span>Thứ tự đọc ngược kịch bản</span>
                      </div>
                      <p className='text-xs leading-relaxed'>{selectedOrderMismatch.message}</p>
                    </div>
                  )}

                  {selectedWarnings.length > 0 && (
                    <div className='space-y-1.5'>
                      {selectedWarnings.map((w, i) => {
                        const isOverflow = w.code === 'TEXT_OVERFLOW';
                        const isReadingOrder = w.code === 'READING_ORDER_MISMATCH';
                        return (
                          <div
                            key={`${w.code}-${i}`}
                            className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                              isOverflow
                                ? 'bg-red-50 border-red-200 text-red-900'
                                : isReadingOrder
                                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                                  : 'bg-amber-50 border-amber-200 text-amber-900'
                            }`}
                          >
                            <div className='font-bold flex items-center gap-1.5'>
                              <AlertTriangle className='w-3.5 h-3.5 shrink-0' />
                              <span className='font-mono uppercase font-bold text-xs'>
                                {w.code}
                              </span>
                            </div>
                            <p className='leading-relaxed text-xs'>{w.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Stale Alert & Resolution */}
                  {selectedElement.isStale && (
                    <div className='p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-amber-900'>
                      <div className='font-bold flex items-center gap-1.5 text-xs'>
                        <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0' />
                        <span>Thoại gốc đã đổi trong kịch bản (BR-05)</span>
                      </div>
                      <p className='text-xs text-amber-800 leading-relaxed'>
                        Nội dung kịch bản mới: <strong>"{selectedElement.currentLineText}"</strong>
                      </p>
                      <button
                        onClick={() => handleSyncStaleText(selectedElement)}
                        className='w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer'
                      >
                        Cập nhật theo kịch bản mới
                      </button>
                    </div>
                  )}

                  {/* Tọa độ và kích thước pixel thực tế trên canvas (Lỗi 1) */}
                  <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-2'>
                    <div className='flex items-center justify-between text-zinc-500 text-xs uppercase font-mono'>
                      <span>Tọa độ canvas trang (px)</span>
                      <span className='text-emerald-700 font-bold'>
                        {pageDim.width}×{pageDim.height}px
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-2 text-xs font-mono'>
                      <div>
                        <label className='block text-zinc-400 text-xs'>X (px):</label>
                        <input
                          type='number'
                          value={Math.round(selectedElementBox.pxX || 0)}
                          readOnly={isReadOnly}
                          onChange={(e) =>
                            moveBalloon(
                              selectedElement.elementId,
                              parseFloat(e.target.value) || 0,
                              selectedElementBox.pxY,
                            )
                          }
                          className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                        />
                      </div>
                      <div>
                        <label className='block text-zinc-400 text-xs'>Y (px):</label>
                        <input
                          type='number'
                          value={Math.round(selectedElementBox.pxY || 0)}
                          readOnly={isReadOnly}
                          onChange={(e) =>
                            moveBalloon(
                              selectedElement.elementId,
                              selectedElementBox.pxX,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                        />
                      </div>
                      <div>
                        <label className='block text-zinc-400 text-xs'>Rộng (px):</label>
                        <input
                          type='number'
                          value={Math.round(selectedElementBox.pxW || 0)}
                          readOnly={isReadOnly}
                          onChange={(e) =>
                            moveBalloon(
                              selectedElement.elementId,
                              selectedElementBox.pxX,
                              selectedElementBox.pxY,
                              parseFloat(e.target.value) || 100,
                              selectedElementBox.pxH,
                            )
                          }
                          className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                        />
                      </div>
                      <div>
                        <label className='block text-zinc-400 text-xs'>Cao (px):</label>
                        <input
                          type='number'
                          value={Math.round(selectedElementBox.pxH || 0)}
                          readOnly={isReadOnly}
                          onChange={(e) =>
                            moveBalloon(
                              selectedElement.elementId,
                              selectedElementBox.pxX,
                              selectedElementBox.pxY,
                              selectedElementBox.pxW,
                              parseFloat(e.target.value) || 60,
                            )
                          }
                          className='w-full p-1 bg-white border border-[#E7E7E7] rounded font-bold'
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reading Order Override */}
                  <div className='space-y-1.5'>
                    <label className='block font-semibold text-zinc-700 flex items-center justify-between text-xs'>
                      <span className='flex items-center gap-1'>
                        <ListOrdered className='w-3.5 h-3.5 text-blue-600' />
                        <span>Thứ Tự Đọc (Reading Order)</span>
                      </span>
                      <span className='font-mono text-xs text-zinc-400'>
                        v{selectedElement.version || 1}
                      </span>
                    </label>
                    <div className='flex gap-2'>
                      <input
                        type='number'
                        value={selectedElement.readingOrder ?? ''}
                        placeholder='Tự động'
                        onChange={(e) =>
                          handleSetReadingOrder(
                            selectedElement.elementId,
                            e.target.value ? parseInt(e.target.value, 10) : null,
                          )
                        }
                        className='flex-1 p-2 bg-[#FAF8F5] border border-[#E7E7E7] rounded-lg font-mono text-xs'
                      />
                      <button
                        onClick={() => handleSetReadingOrder(selectedElement.elementId, null)}
                        className='px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg cursor-pointer'
                      >
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Element Type Details */}
                  <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1.5'>
                    <div className='text-zinc-500 text-xs uppercase font-mono'>
                      Loại phần tử &amp; ID
                    </div>
                    <div className='font-bold text-[#171717] text-xs'>
                      {selectedElement.elementType}
                    </div>
                    <div className='font-mono text-xs text-zinc-400 truncate select-all'>
                      {selectedElement.elementId}
                    </div>
                  </div>

                  {/* Overflow Acknowledgment Section */}
                  <div className='p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2'>
                    <div className='font-semibold text-zinc-800 text-xs'>
                      Xác nhận cảnh báo tràn chữ (Overflow)
                    </div>
                    {selectedElement.overflowAcknowledgedReason ? (
                      <div className='text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200'>
                        ✓ Đã xác nhận: {selectedElement.overflowAcknowledgedReason}
                      </div>
                    ) : selectedHasOverflow ? (
                      <>
                        <p className='text-xs text-amber-700 leading-relaxed'>
                          Bóng thoại đang bị tràn chữ so với kích thước hộp. Bạn có thể nhập lý do
                          bên dưới để xác nhận cho phép nộp bài.
                        </p>
                        <input
                          type='text'
                          value={ackReason}
                          onChange={(e) => setAckReason(e.target.value)}
                          placeholder='Lý do chấp nhận tràn chữ (vd: Chữ nhỏ vừa đọc được)...'
                          className='w-full p-1.5 bg-white border border-zinc-300 rounded text-xs'
                        />
                        <button
                          onClick={() => handleAckOverflow(selectedElement.elementId)}
                          className='w-full py-1.5 bg-zinc-800 hover:bg-black text-white text-xs font-semibold rounded transition-colors cursor-pointer'
                        >
                          Xác nhận tràn chữ
                        </button>
                      </>
                    ) : (
                      <div className='text-xs text-emerald-700 bg-emerald-50/60 p-2 rounded border border-emerald-200/60 flex items-center gap-1.5'>
                        <CheckCircle2 className='w-3.5 h-3.5 shrink-0 text-emerald-600' />
                        <span>Kích thước bóng vừa vặn với nội dung chữ (không bị tràn).</span>
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  {!isReadOnly && (
                    <div className='pt-3 border-t border-[#E7E7E7]'>
                      <button
                        onClick={() => deleteBalloon(selectedElement.elementId)}
                        className='w-full py-2 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer'
                      >
                        <Trash2 className='w-4 h-4' /> Xóa phần tử này
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className='p-8 text-center text-xs text-zinc-400 flex-1 flex flex-col items-center justify-center'>
                  <MessageCircle className='w-8 h-8 mb-2 opacity-40' />
                  <p className='font-semibold text-zinc-600'>Chưa chọn bóng thoại</p>
                  <p className='text-xs text-zinc-400 mt-1 max-w-xs'>
                    Bấm vào một bóng thoại trên canvas hoặc chọn dòng kịch bản để đặt bóng mới.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Đề Xuất Rút Gọn Thoại (Letterer Agent - CF2 2.4) */}
      {aiModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4'>
          <div className='bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-zinc-200 animate-in fade-in zoom-in-95 duration-150'>
            {/* Modal Header */}
            <div className='p-4 border-b border-zinc-200 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between shrink-0'>
              <div className='flex items-center gap-2.5'>
                <div className='w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs'>
                  <Bot className='w-5 h-5' />
                </div>
                <div>
                  <h3 className='font-bold text-sm text-zinc-900 flex items-center gap-2'>
                    <span>Đề Xuất Rút Gọn Thoại (Letterer Agent)</span>
                    <span className='px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 font-mono'>
                      {aiSuggestions.length} đề xuất
                    </span>
                  </h3>
                  <p className='text-xs text-zinc-500'>
                    Human-in-the-loop: Kiểm tra và quyết định áp dụng từng dòng hoặc cập nhật toàn
                    bộ vào kịch bản.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiModalOpen(false)}
                className='p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer'
              >
                <X className='w-5 h-5' />
              </button>
            </div>

            {/* Modal Content - List of Suggestions */}
            <div className='p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar'>
              {aiSuggestions.map((sug, idx) => {
                const targetBalloon = elements.find(
                  (e) =>
                    (sug.targetElementId && e.elementId === sug.targetElementId) ||
                    (sug.sourceScriptLineId && e.scriptLineId === sug.sourceScriptLineId),
                );
                return (
                  <div
                    key={idx}
                    className='p-3.5 rounded-xl border border-zinc-200 bg-[#FAF8F5] space-y-2.5 hover:border-purple-300 transition-colors'
                  >
                    <div className='flex items-center justify-between text-xs'>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono font-bold text-zinc-700 bg-white px-2 py-0.5 rounded border border-zinc-200 text-xs'>
                          #{idx + 1}
                        </span>
                        {targetBalloon ? (
                          <span className='text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1'>
                            <CheckCircle2 className='w-3 h-3' /> Bóng thoại #
                            {targetBalloon.readingOrder || ''}
                          </span>
                        ) : (
                          <span className='text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded'>
                            Chưa đặt trên trang
                          </span>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            sug.withinEstimatedLimit
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sug.withinEstimatedLimit ? '✓ Vừa balloon' : 'Ước lượng dài'}
                        </span>
                        <span className='text-xs font-mono text-zinc-500'>
                          Tối đa: ~{sug.maxChars} ký tự
                        </span>
                      </div>
                    </div>

                    {/* Comparison Box */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                      <div className='p-2.5 bg-red-50/60 rounded-lg border border-red-200/70 space-y-1'>
                        <div className='text-xs font-bold text-red-700 uppercase tracking-wide flex items-center justify-between font-mono'>
                          <span>Thoại gốc</span>
                          <span className='font-mono'>{sug.originalText.length} ký tự</span>
                        </div>
                        <p className='text-zinc-800 leading-relaxed font-serif line-clamp-3'>
                          "{sug.originalText}"
                        </p>
                      </div>

                      <div className='p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 space-y-1'>
                        <div className='text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center justify-between font-mono'>
                          <span>Đề xuất rút gọn</span>
                          <span className='font-mono'>{sug.suggestedText.length} ký tự</span>
                        </div>
                        <p className='text-zinc-900 font-semibold leading-relaxed font-serif line-clamp-3'>
                          "{sug.suggestedText}"
                        </p>
                      </div>
                    </div>

                    {sug.reason && (
                      <p className='text-xs text-zinc-600 bg-white/70 p-2 rounded border border-zinc-200/60 leading-tight'>
                        <span className='font-semibold text-zinc-700'>Lý do: </span>
                        {sug.reason}
                      </p>
                    )}

                    {targetBalloon && (
                      <div className='flex justify-end pt-1'>
                        <button
                          onClick={() => handleApplySuggestionToElement(sug)}
                          className='px-3 py-1 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer'
                        >
                          <Check className='w-3.5 h-3.5' /> Áp dụng vào bóng thoại này
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className='p-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between shrink-0 text-xs'>
              <button
                onClick={handleRejectAiSuggestions}
                className='px-3.5 py-2 text-red-600 hover:bg-red-50 font-semibold rounded-xl transition-colors cursor-pointer'
              >
                Từ chối đề xuất (Reject)
              </button>

              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setAiModalOpen(false)}
                  className='px-3.5 py-2 text-zinc-600 hover:bg-zinc-200 font-semibold rounded-xl transition-colors cursor-pointer'
                >
                  Đóng
                </button>
                <button
                  onClick={handleAcceptAllAiSuggestions}
                  className='px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer'
                >
                  <Check className='w-4 h-4' /> Chấp nhận tất cả &amp; Cập nhật kịch bản (Accept)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Concurrency Conflict Modal (BR-11) */}
      <ElementConflictModal
        isOpen={conflictModalOpen}
        elementId={conflictElementId}
        errorMessage={conflictErrorMsg}
        onReload={loadElements}
        onClose={() => setConflictModalOpen(false)}
      />

      {/* AI Tách Thoại Modal trong Stage Lettering */}
      {activePageId && (
        <AutoAssignScriptLinesModal
          isOpen={autoAssignModalOpen}
          onClose={() => setAutoAssignModalOpen(false)}
          pageId={activePageId}
          pageNumber={currentPageInfo?.pageNumber || 1}
          sceneId={selectedSceneId || ''}
          sceneHeading={scenes.find((s) => s.id === selectedSceneId)?.heading}
          panels={panels}
          lines={sceneLines}
          onSuccess={async () => {
            if (selectedSceneId) {
              const sDetail = await scriptLineService.getSceneById(selectedSceneId);
              setSceneLines(sDetail.scriptLines || []);
            }
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );

  // Chế độ tập trung hiển thị qua portal ra body để phủ kín cả thanh tiêu đề/menu hệ thống (tránh kẹt trong stacking context)
  return focusMode ? createPortal(workspace, document.body) : workspace;
};

export default LetteringWorkspace;
