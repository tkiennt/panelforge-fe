import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Flag, Loader2, RefreshCw, Send, ShieldAlert } from 'lucide-react';
import { pageService, PageDto, PageHistoryDto, isGuid } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import {
  chapterEditionService,
  type ChapterEditionDto,
  type EditionStatus,
} from '@/services/chapter-edition.service';
import { IMAGE_LAYER_TYPES } from '@/services/element.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { assignmentService, AssignmentDto, StageTaskDto } from '@/services/assignment.service';
import { frameTemplateService, FrameTemplateDto } from '@/services/frameTemplate.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { PanelDto, ChangeRequestDto, AssetReferenceDto } from '@/types/pipeline';
import { parseBoundingBox } from '../utils/panelBoundingBox';
import { useToast } from '@/shared/context/ToastContext';
import { useConfirm } from '@/shared/context/ConfirmContext';
import { detectPanelsFromSketchImage, cropImagesByBoundingBoxes } from '../lib/panelDetection';
import {
  carryArtworksByReadingOrder,
  mergeResplitArtworks,
  revokeArtworkUrls,
} from '../utils/panelArtworkCarry';
import { getRoleDefaultPath } from '@/roles/roles';
import { formatChapterLabel } from '@/shared/features/pipeline-board/productionBoard.utils';
import { getArtistStageKind } from '../utils/artistStage';
import {
  FocusStageItem,
  FocusStudioHeaderBar,
  useFocusHeaderContext,
} from '@/app/FocusWorkspaceLayout';
import {
  ArtistCanvaSidebar,
  CanvaSidebarTab,
  ScriptLineItem,
  BibleEntityItem,
  DEFAULT_FRAME_TEMPLATES,
  DEFAULT_SCRIPT_LINES,
} from '../components/desk/ArtistCanvaSidebar';
import { getCharacterStatusTone, BIBLE_STATUS_STYLES } from '@/shared/lib/bibleColoring';
import { ArtistBottomPageStrip } from '../components/desk/ArtistBottomPageStrip';
import { PageStage } from '../components/desk/ArtistPageSidebar';
import { ArtistCanvasViewport, type PageSketch } from '../components/desk/ArtistCanvasViewport';
import { PanelFrameOverlay, type PanelArtworkData } from '../components/desk/PanelFrameOverlay';
import { SplitPanelStrip } from '../components/desk/SplitPanelStrip';
import { LetteringBalloonOverlay } from '../components/desk/LetteringBalloonOverlay';
import { KeepOutZoneOverlay } from '../components/desk/KeepOutZoneOverlay';
import { ArtworkPreviewDialog } from '../components/desk/ArtistDeskDialogs';
import { useLetteringBalloons, type BalloonType } from '../hooks/useLetteringBalloons';
import { useKeepOutZones } from '../hooks/useKeepOutZones';
import {
  findKeepOutCollision,
  rectsOverlap,
  suggestBalloonPosition,
  type Rect,
} from '@/shared/lib/lettering/keepOutZones';
import { LanguageSelector } from '@/shared/components/LanguageSelector';
import { suggestBalloonType } from '../utils/letteringScript';
import { LetteringPropertyPanel } from '../components/desk/LetteringPropertyPanel';
import { classifyScriptLine } from '@/shared/utils/textStyle';
import {
  DEFAULT_ARTIST_STAGES,
  DEFAULT_INITIAL_PAGES,
  buildArtistFocusStages,
  extractBibleVisualDetails,
  getBibleCategoryTag,
  getDeterministicColor,
  localizeArtistStageLabel,
  mapBibleCategory,
  resolveStageKey,
} from '../lib/artistDeskHelpers';
import { resolveChangeRequestLocation } from '../utils/changeRequestLocation';
import { getStoredCurrentUserId } from '@/types/workspace';
import { normalizeWorkspaceRole, resolveReworkReasonDisplay } from '@/types';
import { useTranslation } from '@/lib/i18n';

export type { PanelArtworkData };

export interface ArtistDeskViewProps {
  workspaceRole?: string | null;
  initialScriptLines?: ScriptLineItem[];
  initialBibleEntities?: BibleEntityItem[];
  initialSidebarTab?: CanvaSidebarTab;
}

const EDITION_STATUS_STYLES: Record<
  string,
  { fallbackLabel: string; bg: string; text: string; border: string }
> = {
  Draft: {
    fallbackLabel: 'Draft',
    bg: 'bg-stone-100',
    text: 'text-stone-700',
    border: 'border-stone-300',
  },
  ReworkRequired: {
    fallbackLabel: 'Rework Required',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  InReview: {
    fallbackLabel: 'In Review',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  EditorApproved: {
    fallbackLabel: 'Editor Approved',
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-300',
  },
  Approved: {
    fallbackLabel: 'Approved',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
  },
  Published: {
    fallbackLabel: 'Published',
    bg: 'bg-stone-900',
    text: 'text-stone-50',
    border: 'border-stone-800',
  },
};

function normalizeEditionStatus(status?: EditionStatus | string | number | null): string {
  if (status === null || status === undefined || status === 0) return 'Draft';
  if (status === 1) return 'InReview';
  if (status === 2) return 'EditorApproved';
  if (status === 3) return 'Approved';
  if (status === 4) return 'Published';
  return String(status).trim() || 'Draft';
}

function isEditionEditableStatus(status?: EditionStatus | string | number | null): boolean {
  const norm = normalizeEditionStatus(status);
  return norm === 'Draft' || norm === 'ReworkRequired' || norm === 'ChangesRequested';
}

/**
 * Artist desk: script and bible reference on the left, a B5 manga sheet in the centre,
 * the page filmstrip along the bottom. Stage submission lives in the focus header.
 */
export const ArtistDeskView: React.FC<ArtistDeskViewProps> = ({
  workspaceRole,
  initialScriptLines,
  initialBibleEntities,
  initialSidebarTab,
}) => {
  const {
    workspaceId,
    seriesId,
    chapterId: chapterIdFromParam,
  } = useParams<{
    workspaceId?: string;
    seriesId?: string;
    chapterId?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const focusHeader = useFocusHeaderContext();
  const { t } = useTranslation('pipeline');
  // Gán sau khi có hook bóng thoại (khai báo phía dưới); trả thông báo lỗi hoặc null nếu đủ chữ
  const letteringCheckRef = useRef<(() => Promise<string | null>) | null>(null);

  const chapterIdFromUrl = chapterIdFromParam || searchParams.get('chapterId');
  const assignmentIdFromUrl = searchParams.get('assignmentId');
  const stageIdFromUrl = searchParams.get('stageId');

  const [currentChapterId, setCurrentChapterId] = useState<string | null>(chapterIdFromUrl);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [seriesTitle, setSeriesTitle] = useState<string | undefined>(undefined);
  const [pages, setPages] = useState<PageDto[]>(DEFAULT_INITIAL_PAGES);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(DEFAULT_INITIAL_PAGES[0].id);

  // Tiến độ công đoạn (Stage progression trên Header)
  const [artistStages, setArtistStages] = useState<FocusStageItem[]>(DEFAULT_ARTIST_STAGES);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [isStageFlowCompleted, setIsStageFlowCompleted] = useState<boolean>(false);
  const [isSubmittingStage, setIsSubmittingStage] = useState<boolean>(false);
  const [isWithdrawingStage, setIsWithdrawingStage] = useState<boolean>(false);
  const [chapterAssignments, setChapterAssignments] = useState<AssignmentDto[]>([]);
  const [gridTasks, setGridTasks] = useState<StageTaskDto[]>([]);
  const [gridStages, setGridStages] = useState<
    Array<{ id: string; name: string; allowedRole?: string | null; isEnabled?: boolean }>
  >([]);

  // Dữ liệu thực tế từ Backend cho Kịch bản & Hồ sơ truyện
  const [rawScriptLines, setRawScriptLines] = useState<ScriptLineItem[] | undefined>(
    initialScriptLines,
  );
  const [hasLoadedRealScript, setHasLoadedRealScript] = useState(false);
  const [panelsByPageId, setPanelsByPageId] = useState<Record<string, PanelDto[]>>({});
  const [persistedPanelsByPageId, setPersistedPanelsByPageId] = useState<
    Record<string, PanelDto[]>
  >({});
  const [panelPageMap, setPanelPageMap] = useState<
    Record<
      string,
      { pageId?: string; pageNumber: number; panelNumber: number; sceneId?: string | null }
    >
  >({});
  const [rawBibleEntries, setRawBibleEntries] = useState<BibleEntryDto[]>([]);
  const [hasLoadedRealBible, setHasLoadedRealBible] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [isLoadingBible, setIsLoadingBible] = useState(false);

  // Dữ liệu & trạng thái Mẫu Khung theo từng trang
  const [frameTemplates, setFrameTemplates] = useState<FrameTemplateDto[]>(DEFAULT_FRAME_TEMPLATES);
  const [activeTemplateByPageId, setActiveTemplateByPageId] = useState<Record<string, string>>({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // A saved layout may receive artwork; any layout edit makes the page dirty again.
  const [savedLayoutByPageId, setSavedLayoutByPageId] = useState<Record<string, boolean>>({});
  const [panelArtworksByPageId, setPanelArtworksByPageId] = useState<
    Record<string, Record<string, PanelArtworkData>>
  >({});
  const [fullPageSketchesByPageId, setFullPageSketchesByPageId] = useState<
    Record<string, PageSketch>
  >({});
  const [isDetectingPanels, setIsDetectingPanels] = useState(false);
  const [orphanedArtworksByPageId, setOrphanedArtworksByPageId] = useState<
    Record<string, PanelArtworkData[]>
  >({});
  const [previewArtwork, setPreviewArtwork] = useState<{ imageUrl: string; title: string } | null>(
    null,
  );
  const [seriesLanguages, setSeriesLanguages] = useState<string[]>(['vi', 'en']);
  const [originalLang, setOriginalLang] = useState<string>('vi');
  const [activeLang, setActiveLang] = useState<string>('vi');
  const [isRTL, setIsRTL] = useState<boolean>(true);
  const [chapterEditions, setChapterEditions] = useState<ChapterEditionDto[]>([]);
  const [isSubmittingEdition, setIsSubmittingEdition] = useState<boolean>(false);

  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [selectedPanelNumberOverride, setSelectedPanelNumberOverride] = useState<number | null>(
    null,
  );
  const handleSelectPanelById = useCallback((panelId: string | null) => {
    setSelectedPanelId(panelId);
    setSelectedPanelNumberOverride(null);
  }, []);

  const tabFromUrl = searchParams.get('tab') as CanvaSidebarTab | null;
  const isLettererRoute = location.pathname.includes('/letterer');
  const defaultTab = initialSidebarTab || tabFromUrl || (isLettererRoute ? 'lettering' : 'script');

  const [activeSidebarTab, setActiveSidebarTab] = useState<CanvaSidebarTab | undefined>(defaultTab);
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState<boolean | undefined>(
    defaultTab ? true : undefined,
  );

  // Yêu cầu chỉnh sửa công đoạn (Sidetab Change Requests)
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [isLoadingChangeRequests, setIsLoadingChangeRequests] = useState(false);
  const [isResolvingChangeRequest, setIsResolvingChangeRequest] = useState(false);

  // Lịch sử phiên bản trang (Page History Drawer)
  const [pageHistory, setPageHistory] = useState<PageHistoryDto | null>(null);
  const [isLoadingPageHistory, setIsLoadingPageHistory] = useState(false);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);

  // Điều khiển thanh trang & khung vẽ
  const [isFilmstripOpen, setIsFilmstripOpen] = useState(true);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Đồng bộ chapterId khi URL thay đổi từ bên ngoài
  useEffect(() => {
    if (chapterIdFromUrl && chapterIdFromUrl !== currentChapterId) {
      setCurrentChapterId(chapterIdFromUrl);
      setIsStageFlowCompleted(false);
      setCurrentStageIndex(0);
    }
  }, [chapterIdFromUrl, currentChapterId]);

  // Nạp các công đoạn sản xuất dành cho Họa sĩ từ quy trình bộ truyện
  useEffect(() => {
    let alive = true;
    if (!seriesId || !pipelineService?.getSeriesPipeline) return;

    pipelineService
      .getSeriesPipeline(seriesId)
      .then((pipeline) => {
        if (!alive || !Array.isArray(pipeline?.stages)) return;
        setArtistStages(buildArtistFocusStages(pipeline.stages));
      })
      .catch(() => {
        // Giữ bộ công đoạn mặc định nếu chưa kết nối quy trình
      });

    return () => {
      alive = false;
    };
  }, [seriesId]);

  // Nạp công việc phân công của chương để đồng bộ công đoạn đang thực hiện (ưu tiên Lưới V3, lùi về V2 nếu chương cũ)
  useEffect(() => {
    let alive = true;
    if (stageIdFromUrl) {
      const explicitIdx = artistStages.findIndex((s) => s.id === stageIdFromUrl);
      if (explicitIdx >= 0) {
        setCurrentStageIndex(explicitIdx);
        setIsStageFlowCompleted(false);
      }
    }

    if (!currentChapterId) {
      setGridTasks([]);
      return;
    }

    (async () => {
      try {
        if (typeof assignmentService?.getTaskGrid === 'function') {
          const grid = await assignmentService.getTaskGrid(currentChapterId).catch(() => null);
          const fetchedGridTasks = (grid?.tasks ?? []).filter((t) => t.status !== 'Cancelled');
          if (alive) {
            setGridStages(grid?.stages ?? []);
          }
          if (alive && fetchedGridTasks.length > 0) {
            setGridTasks(fetchedGridTasks);
            setChapterAssignments([]);
            if (stageIdFromUrl && artistStages.some((s) => s.id === stageIdFromUrl)) return;

            if (assignmentIdFromUrl) {
              const targetCell = fetchedGridTasks.find((t) => t.id === assignmentIdFromUrl);
              if (targetCell) {
                const idx = artistStages.findIndex((s) => s.id === targetCell.pipelineStageId);
                if (idx >= 0) {
                  setCurrentStageIndex(idx);
                  setIsStageFlowCompleted(false);
                  return;
                }
              }
            }

            const stageIds = new Set(artistStages.map((s) => s.id));
            // Chỉ lấy ô giao cho chính người đang mở Desk (Artist và Letterer dùng chung màn này, BR-31).
            const me = getStoredCurrentUserId();
            const assignedCells = fetchedGridTasks.filter(
              (t) =>
                stageIds.has(t.pipelineStageId) &&
                t.status !== 'Unassigned' &&
                (!me || !t.assigneeUserId || t.assigneeUserId === me),
            );
            if (assignedCells.length === 0) return;

            // Ưu tiên ô đang làm/đang sửa, rồi ô đã đến lượt bắt đầu, rồi ô đã giao; cùng hạng thì theo thứ tự công đoạn.
            // (Artist có thể giữ cả Pencil, Ink và Lettering của cùng trang — BR-31.)
            const cellRank = (t: (typeof assignedCells)[number]) =>
              t.status === 'InProgress' || t.status === 'ReworkRequired'
                ? 0
                : t.status === 'Assigned' && t.isStartable
                  ? 1
                  : t.status === 'Assigned'
                    ? 2
                    : 9;
            const stageOrder = (t: (typeof assignedCells)[number]) =>
              artistStages.findIndex((s) => s.id === t.pipelineStageId);
            const activeCell = [...assignedCells]
              .filter((t) => cellRank(t) < 9)
              .sort((a, b) => cellRank(a) - cellRank(b) || stageOrder(a) - stageOrder(b))[0];
            if (activeCell) {
              const idx = artistStages.findIndex((s) => s.id === activeCell.pipelineStageId);
              if (idx >= 0) {
                setCurrentStageIndex(idx);
                setIsStageFlowCompleted(false);
              }
            } else if (
              assignedCells.every(
                (t) =>
                  t.status === 'Submitted' || t.status === 'UnderReview' || t.status === 'Approved',
              )
            ) {
              setCurrentStageIndex(Math.max(0, artistStages.length - 1));
              setIsStageFlowCompleted(true);
            }
            return;
          }
          if (alive) {
            setGridTasks([]);
          }
        }

        if (!assignmentService?.getAssignments) return;
        const list = await assignmentService.getAssignments(currentChapterId);
        if (!alive || !Array.isArray(list)) return;
        setChapterAssignments(list);

        if (stageIdFromUrl && artistStages.some((s) => s.id === stageIdFromUrl)) return;

        if (assignmentIdFromUrl) {
          const target = list.find((a) => a.id === assignmentIdFromUrl);
          if (target) {
            const idx = artistStages.findIndex((s) => s.id === target.pipelineStageId);
            if (idx >= 0) {
              const st = String(target.status || '').toLowerCase();
              if (st === 'submitted' || st === 'underreview' || st === 'approved') {
                if (idx < artistStages.length - 1) {
                  setCurrentStageIndex(idx + 1);
                  setIsStageFlowCompleted(false);
                } else {
                  setCurrentStageIndex(idx);
                  setIsStageFlowCompleted(true);
                }
              } else {
                setCurrentStageIndex(idx);
                setIsStageFlowCompleted(false);
              }
              return;
            }
          }
        }

        const stageIds = new Set(artistStages.map((s) => s.id));
        const related = list.filter((a) => stageIds.has(a.pipelineStageId));
        if (related.length === 0) return;

        const activeAssignment = related.find((a) => {
          const st = String(a.status || '').toLowerCase();
          return st === 'inprogress' || st === 'reworkrequired' || st === 'assigned';
        });

        if (activeAssignment) {
          const idx = artistStages.findIndex((s) => s.id === activeAssignment.pipelineStageId);
          if (idx >= 0) {
            setCurrentStageIndex(idx);
            setIsStageFlowCompleted(false);
          }
        } else {
          const allSubmittedOrDone = related.every((a) => {
            const st = String(a.status || '').toLowerCase();
            return st === 'submitted' || st === 'underreview' || st === 'approved';
          });
          if (allSubmittedOrDone) {
            setCurrentStageIndex(Math.max(0, artistStages.length - 1));
            setIsStageFlowCompleted(true);
          }
        }
      } catch {
        // Bỏ qua nếu API phân công chưa sẵn sàng
      }
    })();

    return () => {
      alive = false;
    };
  }, [currentChapterId, assignmentIdFromUrl, stageIdFromUrl, artistStages]);

  const isFallbackStageId = (id?: string | null): boolean =>
    !id ||
    id === 'stage-pencil' ||
    id === 'stage-ink' ||
    id === 'stage-color' ||
    id === 'stage-letter';

  // Tải danh sách tranh đã lưu trên R2 cho từng trang: nhóm theo panelId, lấy version mới nhất và xin link xem ảnh
  const loadPageArtworks = useCallback(
    async (
      chapId: string,
      pageList: PageDto[],
      stageId?: string,
      currentPanelsByPage?: Record<string, PanelDto[]>,
    ) => {
      if (
        !chapId ||
        !pageList.length ||
        !artworkService?.getArtworks ||
        !artworkService?.getArtworkAccessLink
      ) {
        return;
      }

      try {
        const pageArtworkResults = await Promise.all(
          pageList.map(async (pg) => {
            if (!pg.id || pg.id.startsWith('default-page-') || pg.id.startsWith('page-default-')) {
              return { pageId: pg.id, artworks: [] as AssetReferenceDto[] };
            }
            try {
              let artworks = await artworkService.getArtworks(chapId, pg.id, stageId);
              // Công đoạn đang xem chưa có tranh -> dùng tranh mới nhất của các công đoạn trước
              // (vd tranh nạp ở Thumbnail khi đang xem Pencil), để Artist vẽ tiếp trên bản cũ.
              if (stageId && (!Array.isArray(artworks) || artworks.length === 0)) {
                artworks = await artworkService.getArtworks(chapId, pg.id);
              }
              return { pageId: pg.id, artworks: Array.isArray(artworks) ? artworks : [] };
            } catch {
              return { pageId: pg.id, artworks: [] as AssetReferenceDto[] };
            }
          }),
        );

        const nextArtworksByPageId: Record<string, Record<string, PanelArtworkData>> = {};
        const nextFullPageSketches: Record<
          string,
          {
            id?: string;
            versionNumber?: number;
            imageUrl: string;
            fileName: string;
            isVisible: boolean;
          }
        > = {};

        await Promise.all(
          pageArtworkResults.map(async ({ pageId, artworks }) => {
            if (!artworks.length) return;

            // Nhóm theo panelId (hoặc '__PAGE__' cho tranh cả trang null/undefined)
            // Lấy phiên bản versionNumber lớn nhất của từng khung/trang
            const latestByGroup = new Map<string, AssetReferenceDto>();
            artworks.forEach((art) => {
              const key = art.panelId || '__PAGE__';
              const existing = latestByGroup.get(key);
              // versionNumber chỉ tăng trong cùng công đoạn, nên khác công đoạn thì so theo thời điểm tạo
              const isNewer = !existing
                ? true
                : art.pipelineStageId === existing.pipelineStageId
                  ? art.versionNumber > existing.versionNumber
                  : Date.parse(art.createdAt) > Date.parse(existing.createdAt);
              if (isNewer) {
                latestByGroup.set(key, art);
              }
            });

            const pagePanels = currentPanelsByPage?.[pageId] || [];
            const panelMap = new Map<string, PanelDto>();
            pagePanels.forEach((p) => panelMap.set(p.id, p));

            const pageArtMap: Record<string, PanelArtworkData> = {};

            await Promise.all(
              Array.from(latestByGroup.values()).map(async (art) => {
                try {
                  const link = await artworkService.getArtworkAccessLink(chapId, art.id);
                  if (!link?.url) return;
                  const imageUrl = resolveArtworkUrl(link.url);

                  if (!art.panelId || art.panelId === '__PAGE__') {
                    nextFullPageSketches[pageId] = {
                      id: art.id,
                      versionNumber: art.versionNumber,
                      imageUrl,
                      fileName: art.fileName || 'sketch.png',
                      isVisible: true,
                    };
                  } else {
                    const pnl = panelMap.get(art.panelId);
                    const panelNum = pnl?.panelNumber || pnl?.readingOrder || 1;
                    pageArtMap[art.panelId] = {
                      id: art.id,
                      panelId: art.panelId,
                      panelNumber: panelNum,
                      imageUrl,
                      fileName: art.fileName || `Khung #${panelNum}`,
                      uploadedAt: art.createdAt || new Date().toISOString(),
                    };
                  }
                } catch {
                  // Bỏ qua lỗi nạp link của từng ảnh để không ảnh hưởng các ảnh khác
                }
              }),
            );

            if (Object.keys(pageArtMap).length > 0) {
              nextArtworksByPageId[pageId] = pageArtMap;
            }
          }),
        );

        setPanelArtworksByPageId((prev) => {
          const next = { ...prev };
          pageList.forEach((pg) => {
            next[pg.id] = nextArtworksByPageId[pg.id] || {};
          });
          return next;
        });

        setFullPageSketchesByPageId((prev) => {
          const next = { ...prev };
          pageList.forEach((pg) => {
            if (nextFullPageSketches[pg.id]) {
              next[pg.id] = nextFullPageSketches[pg.id];
            } else if (!next[pg.id]?.imageUrl?.startsWith('blob:')) {
              delete next[pg.id];
            }
          });
          return next;
        });
      } catch {
        // Giữ trạng thái hiện tại nếu có lỗi
      }
    },
    [],
  );

  // Tải danh sách trang từ API backend nếu có chapterId + ánh xạ panel -> trang để đồng bộ kịch bản
  const loadPages = useCallback(
    async (chapId: string, targetStageId?: string) => {
      try {
        const fetched = await pageService.getPagesByChapter(chapId);
        if (Array.isArray(fetched) && fetched.length > 0) {
          const sortedPages = [...fetched].sort((a, b) => a.pageNumber - b.pageNumber);
          setPages(sortedPages);
          setSelectedPageId((prev) =>
            sortedPages.some((p) => p.id === prev) ? prev : sortedPages[0].id,
          );

          // Tải danh sách khung của từng trang để đồng bộ chính xác dòng kịch bản thuộc về trang & khung nào
          let resolvedPanelsByPage: Record<string, PanelDto[]> = {};
          if (panelService?.getPanelsByPage) {
            const panelResults = await Promise.all(
              sortedPages.map((pg) =>
                panelService
                  .getPanelsByPage(pg.id)
                  .then((panels) => ({
                    pageId: pg.id,
                    pageNumber: pg.pageNumber,
                    panels: (panels || []).sort(
                      (a, b) =>
                        (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber),
                    ),
                  }))
                  .catch(() => ({ pageId: pg.id, pageNumber: pg.pageNumber, panels: [] })),
              ),
            );
            const nextMap: Record<
              string,
              { pageId: string; pageNumber: number; panelNumber: number }
            > = {};
            const nextPanelsByPage: Record<string, PanelDto[]> = {};
            const backendSavedMap: Record<string, boolean> = {};
            panelResults.forEach(({ pageId, pageNumber, panels }) => {
              if (panels && panels.length > 0) {
                nextPanelsByPage[pageId] = panels;
                backendSavedMap[pageId] = true;
                panels.forEach((pnl) => {
                  nextMap[pnl.id] = {
                    pageId,
                    pageNumber,
                    panelNumber: pnl.panelNumber || pnl.readingOrder || 1,
                  };
                });
              }
            });
            resolvedPanelsByPage = nextPanelsByPage;
            setPanelsByPageId((prev) => ({ ...prev, ...nextPanelsByPage }));
            setPersistedPanelsByPageId((prev) => ({ ...prev, ...nextPanelsByPage }));
            setPanelPageMap((prev) => ({ ...prev, ...nextMap }));
            setSavedLayoutByPageId((prev) => ({ ...prev, ...backendSavedMap }));
          }

          // Tải danh sách tranh đã lưu trên R2 cho các trang
          const currentStage = artistStages[currentStageIndex];
          const effectiveStageId =
            targetStageId !== undefined
              ? targetStageId
              : currentStage?.id && !isFallbackStageId(currentStage.id)
                ? currentStage.id
                : undefined;
          await loadPageArtworks(chapId, sortedPages, effectiveStageId, resolvedPanelsByPage);
        }
      } catch {
        // Giữ trang mặc định nếu chưa kết nối hoặc có lỗi
      }
    },
    [artistStages, currentStageIndex, loadPageArtworks],
  );

  // Tải dữ liệu kịch bản thực tế của chương qua danh sách phân cảnh (sắp xếp theo thứ tự cảnh & dòng)
  const loadScriptLines = useCallback(async (chapId: string) => {
    if (!scriptLineService?.getScenesByChapter) return;
    setIsLoadingScript(true);
    try {
      const scenes = await scriptLineService.getScenesByChapter(chapId);
      if (Array.isArray(scenes)) {
        const sortedScenes = [...scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
        const sceneDetails = await Promise.all(
          sortedScenes.map((s) =>
            scriptLineService.getSceneById
              ? scriptLineService.getSceneById(s.id).catch(() => null)
              : Promise.resolve(null),
          ),
        );
        const combined: ScriptLineItem[] = [];
        sceneDetails.forEach((detail, idx) => {
          const sc = sortedScenes[idx];
          const rawLines = detail?.scriptLines || [];
          const sortedLines = [...rawLines].sort((a, b) => (a.lineOrder ?? 0) - (b.lineOrder ?? 0));
          sortedLines.forEach((l: any) => {
            combined.push({
              id: l.id,
              pageId: l.pageId ?? undefined,
              panelNumber: l.panelNumber ?? undefined,
              pageNumber: l.pageNumber ?? undefined,
              sceneId: sc.id,
              sceneNumber: sc.sceneNumber,
              sceneTitle:
                detail?.heading ||
                detail?.sceneName ||
                sc.heading ||
                sc.sceneName ||
                t('artist.deskView.sceneTitleFallback', { number: sc.sceneNumber }),
              sceneSlugline: detail?.slugline || sc.slugline || undefined,
              speakerCharacterId: l.speakerCharacterId,
              speakerLabel: l.speakerLabel ?? null,
              characterName: l.characterName || (l as any).speakerLabel,
              characterColor: l.characterColor,
              dialogueText: l.dialogueText ?? l.content ?? undefined,
              stageDirection: l.stageDirection ?? l.actionDescription ?? undefined,
              narrationMode: l.narrationMode || l.type,
              kind: l.kind ?? l.type ?? null,
              text: l.text ?? null,
              panelId: l.panelId || undefined,
              lineOrder: l.lineOrder,
            });
          });
        });
        setRawScriptLines(combined);
        setHasLoadedRealScript(true);
      }
    } catch {
      // Giữ fallback mặc định trong ArtistCanvaSidebar nếu offline/chưa kết nối backend
    } finally {
      setIsLoadingScript(false);
    }
  }, []);

  // Tải dữ liệu Hồ sơ truyện thực tế của bộ truyện
  const loadBibleEntities = useCallback(async (sId: string) => {
    if (!bibleService?.getSeriesBible) return;
    setIsLoadingBible(true);
    try {
      const bibleData = await bibleService.getSeriesBible(sId);
      if (bibleData?.name) {
        setSeriesTitle((prev) => prev || bibleData.name);
      }
      if (Array.isArray(bibleData?.entries)) {
        setRawBibleEntries(bibleData.entries);
        setHasLoadedRealBible(true);
      }
    } catch {
      // Giữ fallback mặc định trong ArtistCanvaSidebar nếu offline/chưa kết nối backend
    } finally {
      setIsLoadingBible(false);
    }
  }, []);

  // Tải danh sách Yêu cầu chỉnh sửa của chương
  const loadChangeRequests = useCallback(async (chapId: string) => {
    if (!assignmentService?.getChangeRequests) return;
    setIsLoadingChangeRequests(true);
    try {
      const list = await assignmentService.getChangeRequests(chapId);
      setChangeRequests(list || []);
    } catch {
      setChangeRequests([]);
    } finally {
      setIsLoadingChangeRequests(false);
    }
  }, []);

  // Tải danh sách ấn bản ngôn ngữ của chương (BR-34)
  const loadChapterEditions = useCallback(async (chapId: string) => {
    if (!chapId || !chapterEditionService?.getChapterEditions) return;
    try {
      const list = await chapterEditionService.getChapterEditions(chapId);
      if (Array.isArray(list)) {
        setChapterEditions(list);
      }
    } catch {
      // Giữ danh sách ấn bản hiện có nếu chưa kết nối backend
    }
  }, []);

  // Tải lịch sử phiên bản của trang được chọn
  const loadPageHistory = useCallback(async (pgId: string) => {
    if (!pageService?.getPageHistory || !isGuid(pgId)) {
      setPageHistory(null);
      return;
    }
    setIsLoadingPageHistory(true);
    try {
      const history = await pageService.getPageHistory(pgId);
      setPageHistory(history || null);
    } catch {
      setPageHistory(null);
    } finally {
      setIsLoadingPageHistory(false);
    }
  }, []);

  // Xử lý Họa sĩ báo đã sửa Change Request
  const handleResolveChangeRequest = useCallback(
    async (changeRequestId: string, note?: string) => {
      if (!currentChapterId || !assignmentService?.resolveChangeRequest) return;
      setIsResolvingChangeRequest(true);
      try {
        await assignmentService.resolveChangeRequest(currentChapterId, changeRequestId, note);
        toast.success(
          t('artist.deskView.resolveCrSuccessTitle'),
          t('artist.deskView.resolveCrSuccessDesc'),
        );
        loadChangeRequests(currentChapterId);
      } catch (err: any) {
        toast.error(
          t('artist.deskView.resolveCrErrorTitle'),
          err?.message || t('artist.deskView.retryLater'),
        );
      } finally {
        setIsResolvingChangeRequest(false);
      }
    },
    [currentChapterId, toast, loadChangeRequests, t],
  );

  // Điều hướng xem vị trí yêu cầu chỉnh sửa (nhảy đến trang và khung tương ứng)
  const handleNavigateToChangeRequestTarget = useCallback(
    (cr: ChangeRequestDto) => {
      if (!cr) return;
      const loc = resolveChangeRequestLocation(cr, panelsByPageId);
      if (loc && loc.pageId) {
        setSelectedPageId(loc.pageId);
        const pNum = loc.panelId ? panelPageMap[loc.panelId]?.panelNumber : undefined;
        toast.info(
          t('artist.deskView.navCrSuccessTitle'),
          pNum
            ? t('artist.deskView.navCrPanelDesc', { panel: pNum })
            : cr.description?.slice(0, 80) || '',
        );
        return;
      }

      toast.info(
        t('artist.deskView.navCrInfoTitle'),
        cr.description?.slice(0, 80) || t('artist.deskView.navCrInfoFallback'),
      );
    },
    [panelsByPageId, panelPageMap, toast, t],
  );

  // Khôi phục trang về một phiên bản cũ trong lịch sử
  const handleRestoreVersion = useCallback(
    async (version: number) => {
      const targetPage = pages.find((p) => p.id === selectedPageId) || pages[0] || null;
      if (!targetPage || !pageService?.restorePageVersion || !pageHistory) return;
      setIsRestoringVersion(true);
      try {
        await pageService.restorePageVersion(targetPage.id, version, pageHistory.currentVersion);
        toast.success(
          t('artist.deskView.restoreSuccessTitle'),
          t('artist.deskView.restoreSuccessDesc', { page: targetPage.pageNumber, version }),
        );
        if (currentChapterId) {
          await loadPages(currentChapterId);
        }
        await loadPageHistory(targetPage.id);
      } catch (err: any) {
        toast.error(
          t('artist.deskView.restoreErrorTitle'),
          err?.message || t('artist.deskView.retryLater'),
        );
      } finally {
        setIsRestoringVersion(false);
      }
    },
    [pages, selectedPageId, pageHistory, currentChapterId, loadPages, loadPageHistory, toast, t],
  );

  const currentChapterIdRef = useRef<string | null>(currentChapterId);
  useEffect(() => {
    currentChapterIdRef.current = currentChapterId;
  }, [currentChapterId]);

  // Tải thông tin Bộ truyện & danh sách Chương (tự động chọn chương đầu tiên nếu URL chưa có chapterId)
  useEffect(() => {
    let alive = true;
    if (!seriesId) return;

    if (seriesService?.getSeriesById) {
      seriesService
        .getSeriesById(seriesId)
        .then((ser) => {
          if (alive && ser) {
            if (ser.title) setSeriesTitle(ser.title);
            if (ser.releaseLanguages && ser.releaseLanguages.length > 0) {
              setSeriesLanguages(ser.releaseLanguages);
            }
            if (ser.originalLanguage) {
              setOriginalLang(ser.originalLanguage);
              setActiveLang(ser.originalLanguage);
            }
            if (ser.readingDirection !== undefined && ser.readingDirection !== null) {
              setIsRTL(ser.readingDirection === 0 || ser.readingDirection === 'RightToLeft');
            }
          }
        })
        .catch(() => {});
    }

    if (chapterService?.getChaptersBySeries) {
      chapterService
        .getChaptersBySeries(seriesId)
        .then((chaps: any) => {
          const items: ChapterDto[] = Array.isArray(chaps) ? chaps : chaps?.items || [];
          if (!alive) return;
          const sortedChapters = [...items].sort((a, b) => a.chapterNumber - b.chapterNumber);
          setChapters(sortedChapters);
          if (!currentChapterIdRef.current && sortedChapters.length > 0) {
            const firstId = sortedChapters[0].id;
            setCurrentChapterId(firstId);
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                next.set('chapterId', firstId);
                return next;
              },
              { replace: true },
            );
          }
        })
        .catch(() => {});
    }

    return () => {
      alive = false;
    };
  }, [seriesId, setSearchParams]);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const panelsByPageIdRef = useRef(panelsByPageId);
  panelsByPageIdRef.current = panelsByPageId;

  useEffect(() => {
    if (currentChapterId) {
      loadPages(currentChapterId);
      loadScriptLines(currentChapterId);
      loadChangeRequests(currentChapterId);
      loadChapterEditions(currentChapterId);
    } else {
      setChapterEditions([]);
    }
  }, [currentChapterId, loadPages, loadScriptLines, loadChangeRequests, loadChapterEditions]);

  const currentStage = artistStages[currentStageIndex];
  const currentStageId =
    currentStage?.id && !isFallbackStageId(currentStage.id) ? currentStage.id : undefined;

  const isInkOrColorStage = useMemo(() => {
    if (isStageFlowCompleted) return false;
    if (currentStage?.key === 'ink' || currentStage?.key === 'color') return true;
    const stageId = stageIdFromUrl || currentStage?.id;
    if (!stageId) return false;
    if (/ink|color|colour|mực|màu/i.test(stageId)) return true;
    const matchedGridStage = gridStages.find((s) => s.id === stageId);
    if (matchedGridStage) {
      const kind = getArtistStageKind({
        name: matchedGridStage.name,
        slug: matchedGridStage.name.toLowerCase(),
        allowedRole: matchedGridStage.allowedRole,
      });
      if (kind === 'ink' || kind === 'color') return true;
    }
    return false;
  }, [isStageFlowCompleted, currentStage, stageIdFromUrl, gridStages]);

  useEffect(() => {
    if (isInkOrColorStage && activeSidebarTab === 'templates') {
      setActiveSidebarTab('script');
    }
  }, [isInkOrColorStage, activeSidebarTab]);

  // Tìm trang hiện tại đang được chọn
  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0] || null;

  const lastStageKeyRef = useRef<string | undefined>(`${currentStageIndex}:${currentStageId}`);
  useEffect(() => {
    const key = `${currentStageIndex}:${currentStageId}`;
    if (currentChapterId && pagesRef.current.length > 0) {
      if (lastStageKeyRef.current !== key) {
        lastStageKeyRef.current = key;
        loadPageArtworks(
          currentChapterId,
          pagesRef.current,
          currentStageId,
          panelsByPageIdRef.current,
        );
      }
    } else {
      lastStageKeyRef.current = key;
    }
  }, [currentChapterId, currentStageIndex, currentStageId, loadPageArtworks]);

  useEffect(() => {
    if (selectedPageId) {
      loadPageHistory(selectedPageId);
    }
  }, [selectedPageId, loadPageHistory]);

  useEffect(() => {
    if (seriesId) {
      loadBibleEntities(seriesId);
    }
  }, [seriesId, loadBibleEntities]);

  // Tải danh sách Mẫu Khung (Frame Templates) từ Workspace (fallback sang mẫu dựng sẵn khi offline)
  useEffect(() => {
    let alive = true;
    if (!workspaceId || !frameTemplateService?.getFrameTemplates) return;
    setIsLoadingTemplates(true);
    frameTemplateService
      .getFrameTemplates(workspaceId)
      .then((data) => {
        if (!alive) return;
        if (Array.isArray(data) && data.length > 0) {
          setFrameTemplates(data);
        }
      })
      .catch(() => {
        // Giữ DEFAULT_FRAME_TEMPLATES khi chưa kết nối backend
      })
      .finally(() => {
        if (alive) setIsLoadingTemplates(false);
      });
    return () => {
      alive = false;
    };
  }, [workspaceId]);

  // Chuyển đổi ChapterDto đang chọn -> tiêu đề chương hiển thị trên Header & Sidebar Kịch bản
  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === currentChapterId) || null,
    [chapters, currentChapterId],
  );
  const activeChapterTitle = useMemo(() => {
    if (!activeChapter) return undefined;
    return formatChapterLabel(activeChapter.chapterNumber, activeChapter.title);
  }, [activeChapter]);

  const scriptCoverage = useMemo(() => {
    const dialogueLines = (rawScriptLines || initialScriptLines || []).filter((line) =>
      Boolean(line.dialogueText?.trim()),
    );
    const covered = dialogueLines.filter((line) => Boolean(line.panelId)).length;
    const total = dialogueLines.length;
    return {
      covered,
      total,
      percent: total === 0 ? 100 : Math.round((covered / total) * 100),
    };
  }, [rawScriptLines, initialScriptLines]);

  const handleSelectChapter = useCallback(
    (chapId: string) => {
      setCurrentChapterId(chapId);
      setCurrentStageIndex(0);
      setIsStageFlowCompleted(false);

      if (chapterIdFromParam && workspaceId && seriesId) {
        const nextSearch = new URLSearchParams(searchParams);
        nextSearch.delete('chapterId');
        const qs = nextSearch.toString();
        navigate(
          `/workspaces/${workspaceId}/series/${seriesId}/chapters/${chapId}/artist${qs ? `?${qs}` : ''}`,
        );
      } else {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('chapterId', chapId);
          return next;
        });
      }
    },
    [chapterIdFromParam, workspaceId, seriesId, searchParams, navigate, setSearchParams],
  );

  // Xử lý bấm Nộp (Submit) trên Header để hoàn tất và chuyển sang công đoạn tiếp theo
  const handleSubmitStage = useCallback(async () => {
    if (isSubmittingStage || isStageFlowCompleted || artistStages.length === 0) return;

    const currentStage = artistStages[currentStageIndex];
    if (!currentStage) return;

    if (currentStage.key === 'pencil' && scriptCoverage.percent < 100) {
      toast.warning(
        t('artist.deskView.submitPencilBlockedTitle'),
        t('artist.deskView.submitPencilBlockedDesc', {
          covered: scriptCoverage.covered,
          total: scriptCoverage.total,
        }),
      );
      return;
    }

    // Công đoạn Letter: kiểm tra đủ chữ trước khi nộp (mọi dòng thoại đã có bóng, không bóng trống)
    if (currentStage.label === 'Letter' && letteringCheckRef.current) {
      const problem = await letteringCheckRef.current();
      if (problem) {
        toast.warning(t('artist.deskView.submitLetterBlockedTitle'), problem);
        return;
      }
    }

    if (!currentChapterId) {
      toast.warning(
        t('artist.deskView.cannotSubmitStageTitle'),
        t('artist.deskView.noAssignmentForStageDesc', { stage: currentStage.label }),
      );
      return;
    }

    setIsSubmittingStage(true);
    try {
      let handledViaGrid = false;
      if (typeof assignmentService?.getTaskGrid === 'function') {
        const grid = await assignmentService.getTaskGrid(currentChapterId).catch(() => null);
        const latestGridTasks = (grid?.tasks ?? []).filter((t) => t.status !== 'Cancelled');
        if (latestGridTasks.length > 0) {
          handledViaGrid = true;
          setGridTasks(latestGridTasks);
          const me = getStoredCurrentUserId();
          const targetCell =
            latestGridTasks.find(
              (t) =>
                t.pipelineStageId === currentStage.id &&
                (!me || !t.assigneeUserId || t.assigneeUserId === me) &&
                ((selectedPageId && t.pageId === selectedPageId) || !t.pageId) &&
                (t.status === 'Assigned' ||
                  t.status === 'InProgress' ||
                  t.status === 'ReworkRequired'),
            ) ||
            (assignmentIdFromUrl
              ? latestGridTasks.find(
                  (t) => t.id === assignmentIdFromUrl && t.pipelineStageId === currentStage.id,
                )
              : undefined);

          if (!targetCell) {
            toast.warning(
              t('artist.deskView.cannotSubmitStageTitle'),
              t('artist.deskView.noAssignmentForStageDesc', { stage: currentStage.label }),
            );
            return;
          }

          try {
            if (
              (targetCell.status === 'Assigned' || targetCell.status === 'ReworkRequired') &&
              targetCell.isStartable &&
              typeof assignmentService.startStageTask === 'function'
            ) {
              const started = await assignmentService.startStageTask(
                currentChapterId,
                targetCell.id,
              );
              if (started) {
                setGridTasks((prev) =>
                  prev.map((t) => (t.id === targetCell.id ? { ...t, ...started, id: t.id } : t)),
                );
              }
            }
            if (typeof assignmentService.submitStageTasks === 'function') {
              const lotInProgress = targetCell.lotId
                ? latestGridTasks.filter(
                    (t) =>
                      t.pipelineStageId === currentStage.id &&
                      t.lotId === targetCell.lotId &&
                      (!me || !t.assigneeUserId || t.assigneeUserId === me) &&
                      !t.isInputOutdated &&
                      (t.id === targetCell.id || t.status === 'InProgress'),
                  )
                : [targetCell];
              const taskIdsToSubmit =
                lotInProgress.length > 0 ? lotInProgress.map((c) => c.id) : [targetCell.id];
              const submittedCells = await assignmentService.submitStageTasks(
                currentChapterId,
                taskIdsToSubmit,
              );
              if (
                Array.isArray(submittedCells) &&
                submittedCells.length > 0 &&
                !submittedCells.some((c) => c.status === 'Approved')
              ) {
                const byId = new Map(
                  submittedCells.map((c, idx) => [
                    c.id || taskIdsToSubmit[idx] || targetCell.id,
                    c,
                  ]),
                );
                setGridTasks((prev) =>
                  prev.map((t) => {
                    const patch = byId.get(t.id);
                    return patch
                      ? {
                          ...t,
                          ...patch,
                          id: t.id,
                          status: patch.status ?? 'Submitted',
                          reopenReason: patch.reopenReason ?? null,
                        }
                      : t;
                  }),
                );
              } else {
                const refreshedGrid = await assignmentService
                  .getTaskGrid(currentChapterId)
                  .catch(() => null);
                if (refreshedGrid?.tasks) {
                  setGridTasks(refreshedGrid.tasks.filter((t) => t.status !== 'Cancelled'));
                }
              }
            }
          } catch (err: any) {
            const backendMsg =
              err?.response?.data?.message ||
              err?.response?.data?.error ||
              err?.data?.message ||
              err?.data?.error ||
              err?.message;
            const status = err?.status || err?.response?.status;
            const isDirectBackendErr =
              status === 409 ||
              status === 403 ||
              status === 400 ||
              err?.code === 'CONFLICT' ||
              err?.code === 'FORBIDDEN' ||
              /^Trang\s+\d+\s*:/i.test(backendMsg || '');
            if (isDirectBackendErr && backendMsg) {
              toast.error(backendMsg);
            } else {
              toast.error(
                t('artist.deskView.submitStageErrorTitle'),
                backendMsg || t('artist.deskView.retryLater'),
              );
            }
            if (status === 409 && typeof assignmentService.getTaskGrid === 'function') {
              const refreshedGrid = await assignmentService
                .getTaskGrid(currentChapterId)
                .catch(() => null);
              if (refreshedGrid?.tasks) {
                setGridTasks(refreshedGrid.tasks.filter((t) => t.status !== 'Cancelled'));
              }
            }
            return;
          }
        }
      }

      if (!handledViaGrid) {
        const matchingAssignment =
          (assignmentIdFromUrl
            ? chapterAssignments.find(
                (a) => a.id === assignmentIdFromUrl && a.pipelineStageId === currentStage.id,
              )
            : undefined) ||
          chapterAssignments.find((a) => {
            const st = String(a.status || '').toLowerCase();
            return (
              a.pipelineStageId === currentStage.id &&
              (st === 'assigned' || st === 'inprogress' || st === 'reworkrequired')
            );
          });

        if (!matchingAssignment) {
          toast.warning(
            t('artist.deskView.cannotSubmitStageTitle'),
            t('artist.deskView.noAssignmentForStageDesc', { stage: currentStage.label }),
          );
          return;
        }

        try {
          const statusLower = String(matchingAssignment.status || '').toLowerCase();
          if (
            (statusLower === 'assigned' || statusLower === 'reworkrequired') &&
            assignmentService?.startAssignment
          ) {
            await assignmentService.startAssignment(currentChapterId, matchingAssignment.id);
          }
          if (assignmentService?.submitAssignment) {
            const updated = await assignmentService.submitAssignment(
              currentChapterId,
              matchingAssignment.id,
            );
            if (updated) {
              setChapterAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            }
          }
        } catch (err: any) {
          const backendMsg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.data?.message ||
            err?.data?.error ||
            err?.message;
          const isConflict409 =
            err?.status === 409 ||
            err?.response?.status === 409 ||
            err?.code === 'CONFLICT' ||
            /^Trang\s+\d+\s*:/i.test(backendMsg || '');
          if (isConflict409 && backendMsg) {
            toast.error(backendMsg);
            return;
          }
        }
      }

      if (currentStageIndex < artistStages.length - 1) {
        const nextIdx = currentStageIndex + 1;
        setCurrentStageIndex(nextIdx);
        toast.success(
          t('artist.deskView.handoffSuccessTitle'),
          t('artist.deskView.handoffSuccessDesc', {
            from: currentStage.label,
            to: artistStages[nextIdx].label,
          }),
        );
      } else {
        setIsStageFlowCompleted(true);
        toast.success(
          t('artist.deskView.stageCompleteTitle'),
          t('artist.deskView.stageCompleteDesc', { stage: currentStage.label }),
        );
      }
    } finally {
      setIsSubmittingStage(false);
    }
  }, [
    isSubmittingStage,
    isStageFlowCompleted,
    artistStages,
    currentStageIndex,
    currentChapterId,
    selectedPageId,
    assignmentIdFromUrl,
    chapterAssignments,
    scriptCoverage,
    toast,
    t,
  ]);

  const handleSelectStage = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= artistStages.length) return;
      if (idx > currentStageIndex) {
        toast.warning(
          t('artist.deskView.stageLockedTitle'),
          t('artist.deskView.stageLockedDesc', {
            stage:
              artistStages[currentStageIndex]?.label || t('artist.deskView.currentStageFallback'),
          }),
        );
        return;
      }
      setCurrentStageIndex(idx);
      setIsStageFlowCompleted(false);
    },
    [artistStages, currentStageIndex, toast, t],
  );

  const seriesPath = useMemo(() => {
    if (workspaceId && seriesId) {
      return `/workspaces/${workspaceId}/series/${seriesId}/artist`;
    }
    return workspaceId ? `/workspaces/${workspaceId}/series` : '/workspaces';
  }, [workspaceId, seriesId]);

  const chapterPath = useMemo(() => {
    if (workspaceId && seriesId && currentChapterId) {
      return `/workspaces/${workspaceId}/series/${seriesId}/workspace?chapterId=${encodeURIComponent(currentChapterId)}`;
    }
    return seriesPath;
  }, [workspaceId, seriesId, currentChapterId, seriesPath]);

  const withdrawableCell = useMemo(() => {
    if (!currentChapterId || gridTasks.length === 0) return null;
    const me = getStoredCurrentUserId();
    const mySubmittedOnPage = gridTasks.filter(
      (t) =>
        t.status === 'Submitted' &&
        (me ? t.assigneeUserId === me : Boolean(t.assigneeUserId)) &&
        (!t.pageId || !selectedPage || t.pageId === selectedPage.id),
    );
    if (mySubmittedOnPage.length === 0) return null;
    return (
      (currentStage
        ? mySubmittedOnPage.find((t) => t.pipelineStageId === currentStage.id)
        : undefined) || mySubmittedOnPage[mySubmittedOnPage.length - 1]
    );
  }, [currentChapterId, gridTasks, selectedPage, currentStage]);

  const handleWithdrawStage = useCallback(async () => {
    if (
      isWithdrawingStage ||
      !currentChapterId ||
      !withdrawableCell ||
      typeof assignmentService?.withdrawStageTask !== 'function'
    ) {
      return;
    }
    setIsWithdrawingStage(true);
    try {
      const withdrawn = await assignmentService.withdrawStageTask(
        currentChapterId,
        withdrawableCell.id,
      );
      setGridTasks((prev) =>
        prev.map((t) =>
          t.id === withdrawableCell.id
            ? { ...t, ...withdrawn, id: t.id, status: withdrawn?.status ?? 'InProgress' }
            : t,
        ),
      );
      const withdrawnStageIdx = artistStages.findIndex(
        (s) => s.id === withdrawableCell.pipelineStageId,
      );
      if (withdrawnStageIdx >= 0) {
        setCurrentStageIndex(withdrawnStageIdx);
      }
      setIsStageFlowCompleted(false);
      toast.success(
        t('artist.deskView.withdrawSuccessTitle'),
        t('artist.deskView.withdrawSuccessDesc'),
      );
    } catch (err: any) {
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.data?.message ||
        err?.data?.error ||
        err?.message;
      toast.error(backendMsg || t('artist.deskView.withdrawErrorFallback'));
      if (
        (err?.status === 409 || err?.response?.status === 409) &&
        typeof assignmentService.getTaskGrid === 'function'
      ) {
        const refreshed = await assignmentService.getTaskGrid(currentChapterId).catch(() => null);
        if (refreshed?.tasks) {
          setGridTasks(refreshed.tasks.filter((t) => t.status !== 'Cancelled'));
        }
      }
    } finally {
      setIsWithdrawingStage(false);
    }
  }, [isWithdrawingStage, currentChapterId, withdrawableCell, artistStages, toast]);

  // Đồng bộ thông tin Header lên FocusWorkspaceLayout (đường dẫn Series/Chương + công đoạn + nút Nộp / Rút bài)
  useEffect(() => {
    if (!focusHeader?.isInsideFocusLayout) return;
    focusHeader.setHeaderConfig({
      seriesTitle,
      seriesPath,
      chapters,
      currentChapterId,
      chapterPath,
      onSelectChapter: handleSelectChapter,
      stages: artistStages,
      currentStageIndex,
      isStageFlowCompleted,
      isSubmittingStage,
      onSubmitStage: handleSubmitStage,
      onSelectStage: handleSelectStage,
      submitButtonLabel: t('artist.deskView.submitButtonLabel'),
      showWithdrawButton: true,
      onWithdrawStage: withdrawableCell ? handleWithdrawStage : undefined,
      isWithdrawDisabled: !withdrawableCell,
      withdrawDisabledReason: t('artist.deskView.withdrawDisabledTooltip'),
      isWithdrawingStage,
      withdrawButtonLabel: t('artist.deskView.withdrawButtonLabel'),
    });
  }, [
    focusHeader,
    seriesTitle,
    seriesPath,
    chapters,
    currentChapterId,
    chapterPath,
    handleSelectChapter,
    artistStages,
    currentStageIndex,
    isStageFlowCompleted,
    isSubmittingStage,
    handleSubmitStage,
    handleSelectStage,
    withdrawableCell,
    handleWithdrawStage,
    isWithdrawingStage,
  ]);

  useEffect(() => {
    return () => {
      if (focusHeader?.isInsideFocusLayout) {
        focusHeader.setHeaderConfig(null);
      }
    };
  }, [focusHeader]);

  // Chuyển đổi danh sách Hồ sơ truyện thực tế + bản đồ tra cứu tên nhân vật cho Kịch bản
  const { bibleEntities, characterById } = useMemo(() => {
    const charMap = new Map<string, { name: string; color: string; avatarUrl?: string }>();

    // Luôn nạp trước các thực thể từ props initialBibleEntities nếu có
    if (initialBibleEntities) {
      initialBibleEntities.forEach((e) => {
        const color = e.color || getDeterministicColor(e.name);
        charMap.set(e.id, { name: e.name, color });
      });
    }

    if (!hasLoadedRealBible) {
      return { bibleEntities: initialBibleEntities, characterById: charMap };
    }

    const adapted: BibleEntityItem[] = rawBibleEntries
      .filter((e) => e.isActive !== false)
      .map((e) => {
        const category = mapBibleCategory(e.category);
        const color = getDeterministicColor(e.id || e.name);
        const resolvedImage =
          e.referenceImageUrl ||
          e.effectiveRevision?.referenceImageUrl ||
          e.effectiveRevision?.conceptImageUrl ||
          undefined;
        // Lưu tất cả thực thể vào charMap theo id và code để tra cứu người nói (kèm ảnh đại diện)
        charMap.set(e.id, { name: e.name, color, avatarUrl: resolvedImage });
        if (e.code) {
          charMap.set(e.code, { name: e.name, color, avatarUrl: resolvedImage });
        }
        const { visualNotes, gallery } = extractBibleVisualDetails(e);

        return {
          id: e.id,
          code: e.code || `BE-${e.id.slice(0, 4)}`,
          name: e.name,
          subtitle: e.subtitle || undefined,
          variantLabel: e.effectiveRevision?.stageName || undefined,
          versionNumber: e.effectiveRevision?.versionNumber ?? undefined,
          category,
          tag: getBibleCategoryTag(e.category, e.subtitle),
          description: e.description || '',
          visualNotes,
          color,
          imageUrl: resolvedImage,
          gallery,
          status: e.effectiveRevision?.reviewStatus
            ? String(e.effectiveRevision.reviewStatus)
            : undefined,
        };
      });

    return { bibleEntities: adapted, characterById: charMap };
  }, [hasLoadedRealBible, rawBibleEntries, initialBibleEntities]);

  // Đồng bộ các dòng kịch bản với Trang, Khung và Tên/Màu nhân vật từ Hồ sơ truyện
  const resolvedScriptLines = useMemo(() => {
    if (!hasLoadedRealScript && !initialScriptLines) return undefined;
    const source: ScriptLineItem[] | undefined = rawScriptLines || initialScriptLines;
    if (!source) return undefined;

    const sceneToPageMap = new Map<string, number>();
    pages.forEach((p) => {
      if (p.sceneId && !sceneToPageMap.has(p.sceneId)) {
        sceneToPageMap.set(p.sceneId, p.pageNumber);
      }
    });

    return source.map((line): ScriptLineItem => {
      const fromPanel = line.panelId ? panelPageMap[line.panelId] : undefined;
      const resolvedPageId = fromPanel?.pageId ?? line.pageId;
      const resolvedPageNum =
        fromPanel?.pageNumber ??
        line.pageNumber ??
        (resolvedPageId ? pages.find((p) => p.id === resolvedPageId)?.pageNumber : undefined) ??
        (line.sceneId ? sceneToPageMap.get(line.sceneId) : undefined);
      const resolvedPanelNum = fromPanel?.panelNumber ?? line.panelNumber;

      // Phân tích người nói và nội dung hội thoại
      const rawKind = String(line.kind ?? line.narrationMode ?? '').toLowerCase();
      const isActionOrSfxOnly =
        rawKind === '1' ||
        rawKind === 'action' ||
        rawKind === '5' ||
        rawKind === 'sfx' ||
        (!line.dialogueText &&
          Boolean(line.stageDirection) &&
          !line.speakerCharacterId &&
          !line.speakerLabel);
      const rawText = (line.dialogueText || line.text || line.stageDirection || '').trim();
      let speaker = (line.characterName || line.speakerLabel || '').trim();
      if (speaker && characterById.has(speaker)) {
        speaker = characterById.get(speaker)!.name;
      }
      let cleanText = rawText;

      // 1. Tra cứu theo speakerCharacterId trong bản đồ nhân vật
      if (!speaker && line.speakerCharacterId && characterById.has(line.speakerCharacterId)) {
        speaker = characterById.get(line.speakerCharacterId)!.name;
      }

      if (!isActionOrSfxOnly) {
        // 2. Tách cú pháp @TênNhânVật: "Lời thoại" hoặc @Tên: Lời thoại
        const atMatch = rawText.match(/^@([a-zA-ZÀ-ỹ0-9_\s]{2,30})\s*:\s*["“]?(.*?)["”]?$/);
        if (atMatch) {
          if (!speaker) speaker = atMatch[1].trim();
          cleanText = atMatch[2].trim();
        } else {
          // 3. Tách cú pháp Tên: "Lời thoại" hoặc Tên: Lời thoại
          const colonMatch = rawText.match(
            /^([A-ZÀ-Ỹ][a-zA-ZÀ-ỹ0-9_\s]{1,25})\s*:\s*["“]?(.*?)["”]?$/,
          );
          if (colonMatch) {
            const prefix = colonMatch[1].trim();
            if (!speaker) speaker = prefix;
            cleanText = colonMatch[2].trim();
          } else {
            // 4. Tách cú pháp [Tên] Lời thoại
            const bracketMatch = rawText.match(/^\[([a-zA-ZÀ-ỹ0-9_\s]{2,25})\]\s*["“]?(.*?)["”]?$/);
            if (bracketMatch) {
              if (!speaker) speaker = bracketMatch[1].trim();
              cleanText = bracketMatch[2].trim();
            } else {
              // 5. Nếu có ngoặc kép "..." mà chưa rõ người nói
              const quotedMatch = rawText.match(/^["“](.*?)["”]$/);
              if (quotedMatch) {
                if (!speaker) speaker = t('artist.deskView.characterFallback');
                cleanText = quotedMatch[1].trim();
              } else if (!speaker && line.dialogueText) {
                speaker = t('artist.deskView.characterFallback');
              }
            }
          }
        }
      }

      const resolvedCharName = isActionOrSfxOnly
        ? speaker || undefined
        : speaker || t('artist.deskView.narratorFallback');
      const resolvedCharColor = resolvedCharName
        ? (rawBibleEntries.length > 0
            ? BIBLE_STATUS_STYLES[getCharacterStatusTone(resolvedCharName, rawBibleEntries, null)].textColor
            : line.characterColor ||
              (line.speakerCharacterId && characterById.get(line.speakerCharacterId)?.color) ||
              getDeterministicColor(resolvedCharName))
        : undefined;

      const resolvedStageDirection =
        line.stageDirection ||
        (rawKind === '1' || rawKind === 'action' ? line.text || undefined : undefined);
      const resolvedDialogueText =
        line.dialogueText !== undefined
          ? cleanText || line.dialogueText
          : isActionOrSfxOnly
            ? undefined
            : cleanText || line.text || undefined;

      return {
        ...line,
        pageId: resolvedPageId,
        pageNumber: resolvedPageNum,
        panelNumber: resolvedPanelNum,
        characterName: resolvedCharName,
        characterColor: resolvedCharColor,
        stageDirection: resolvedStageDirection,
        dialogueText: resolvedDialogueText,
        characterAvatarUrl:
          (line.speakerCharacterId && characterById.get(line.speakerCharacterId)?.avatarUrl) ||
          undefined,
      };
    });
  }, [hasLoadedRealScript, rawScriptLines, initialScriptLines, pages, panelPageMap, characterById]);

  const firstSceneMeta = useMemo(() => {
    const first = resolvedScriptLines?.find((l) => l.sceneTitle || l.sceneSlugline);
    return {
      title: first?.sceneTitle || (activeChapterTitle ? activeChapterTitle : undefined),
      slugline: first?.sceneSlugline || undefined,
    };
  }, [resolvedScriptLines, activeChapterTitle]);

  const activeStageKey: PageStage = useMemo(() => {
    if (isStageFlowCompleted) return 'completed';
    const current = artistStages[currentStageIndex];
    if (current?.key === 'color') return 'ink';
    if (current?.key === 'ink' || current?.key === 'lettering' || current?.key === 'completed') {
      return current.key;
    }
    return 'pencil';
  }, [isStageFlowCompleted, artistStages, currentStageIndex]);

  // Tổng hợp khung toàn bộ chương từ db.Panels (Left-join SSOT cho ArtistScriptReader và LetteringScriptPanel)
  const allChapterPanels = useMemo(() => {
    const result: Array<{
      id: string;
      pageNumber?: number;
      panelNumber?: number;
      direction?: string | null;
      pageId?: string;
    }> = [];
    pages.forEach((pg) => {
      const pList = panelsByPageId[pg.id] || [];
      pList.forEach((p) => {
        result.push({
          id: p.id,
          pageNumber: pg.pageNumber,
          panelNumber: p.panelNumber || p.readingOrder || 1,
          direction: (p as any).direction ?? null,
          pageId: pg.id,
        });
      });
    });
    return result;
  }, [pages, panelsByPageId]);

  // Thao tác trang: Chọn trang
  const handleSelectPage = (page: PageDto) => {
    setSelectedPageId(page.id);
    handleSelectPanelById(null);
  };

  // Thao tác trang: Thêm trang mới
  const handleAddPage = async () => {
    const nextNumber = pages.length > 0 ? Math.max(...pages.map((p) => p.pageNumber)) + 1 : 1;
    const tempId = `page-new-${Date.now()}`;
    const newPage: PageDto = {
      id: tempId,
      chapterId: currentChapterId || 'default-chapter',
      pageNumber: nextNumber,
      layoutFormat: 'B5',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    };

    if (currentChapterId && isGuid(currentChapterId) && pageService?.createPage) {
      try {
        const created = await pageService.createPage(currentChapterId, {
          pageNumber: nextNumber,
          layoutFormat: newPage.layoutFormat,
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
        });
        const resolvedPage = created?.id ? created : newPage;
        setPages((prev) => [...prev, resolvedPage]);
        setSelectedPageId(resolvedPage.id);
      } catch (err: any) {
        toast.error(err?.message || t('artist.deskView.addPageError'));
      }
      return;
    }

    setPages((prev) => [...prev, newPage]);
    setSelectedPageId(newPage.id);

    if (currentChapterId && pageService?.createPage) {
      try {
        const created = await pageService.createPage(currentChapterId, {
          pageNumber: nextNumber,
          layoutFormat: newPage.layoutFormat,
          widthPx: 1200,
          heightPx: 1800,
          dpi: 600,
        });
        if (created?.id) {
          setPages((prev) => prev.map((p) => (p.id === tempId ? created : p)));
          setSelectedPageId(created.id);
        }
      } catch {
        // Giữ lại trang mới ở chế độ thử nghiệm ngoại tuyến
      }
    }
  };

  // Thao tác trang: Xóa trang
  const handleDeletePage = async (pageId: string) => {
    if (pages.length <= 1) return;
    // Xoá trên server trước: BE trả 409 khi trang còn việc / ô lưới, khi đó giữ nguyên trang trên giao diện.
    try {
      await pageService.deletePage?.(pageId);
    } catch (err: any) {
      toast.error(
        t('artist.deskView.deletePageErrorTitle'),
        err?.message || t('artist.deskView.retryLater'),
      );
      return;
    }
    const remaining = pages
      .filter((p) => p.id !== pageId)
      .sort((a, b) => a.pageNumber - b.pageNumber)
      .map((page, index) => ({ ...page, pageNumber: index + 1 }));
    setPages(remaining);
    const pageNumberById = new Map(remaining.map((page) => [page.id, page.pageNumber]));
    setPanelPageMap((prev) =>
      Object.fromEntries(
        Object.entries(prev)
          .filter(([, location]) => location.pageId !== pageId)
          .map(([panelId, location]) => [
            panelId,
            {
              ...location,
              pageNumber: location.pageId
                ? (pageNumberById.get(location.pageId) ?? location.pageNumber)
                : location.pageNumber,
            },
          ]),
      ),
    );
    if (selectedPageId === pageId) {
      setSelectedPageId(remaining[0]?.id || null);
    }
  };

  // Thao tác trang: Nhân bản trang
  const handleDuplicatePage = (page: PageDto) => {
    const nextNumber = Math.max(...pages.map((p) => p.pageNumber)) + 1;
    const duplicated: PageDto = {
      ...page,
      id: `page-dup-${Date.now()}`,
      pageNumber: nextNumber,
    };
    setPages((prev) => [...prev, duplicated]);
    setSelectedPageId(duplicated.id);
  };

  // Các panel của trang hiện tại & template đang chọn cho trang hiện tại
  const currentPagePanels = useMemo(
    () => (selectedPage ? panelsByPageId[selectedPage.id] || [] : []),
    [selectedPage, panelsByPageId],
  );
  const selectedPanelNumber = useMemo(() => {
    if (!selectedPanelId) return selectedPanelNumberOverride;
    const found = currentPagePanels.find((p) => p.id === selectedPanelId);
    if (found) return found.panelNumber || found.readingOrder || 1;
    const fromMap = panelPageMap[selectedPanelId];
    if (fromMap) return fromMap.panelNumber;
    const match = selectedPanelId.match(/(\d+)$/);
    return match ? Number(match[1]) : selectedPanelNumberOverride;
  }, [selectedPanelId, selectedPanelNumberOverride, currentPagePanels, panelPageMap]);
  const currentTemplateId = selectedPage ? activeTemplateByPageId[selectedPage.id] || null : null;
  const currentSketch = useMemo(
    () => (selectedPage ? fullPageSketchesByPageId[selectedPage.id] || null : null),
    [selectedPage, fullPageSketchesByPageId],
  );

  const isCurrentPageLayoutSaved = Boolean(selectedPage && savedLayoutByPageId[selectedPage.id]);
  const currentPageArtworks = useMemo(
    () => (selectedPage ? panelArtworksByPageId[selectedPage.id] || {} : {}),
    [selectedPage, panelArtworksByPageId],
  );
  const artworkPanelKeys = useMemo<Set<string | number>>(() => {
    const keys = new Set<string | number>();
    Object.values(currentPageArtworks).forEach((artwork) => {
      keys.add(artwork.panelId);
      keys.add(artwork.panelNumber);
    });
    return keys;
  }, [currentPageArtworks]);
  const hasCurrentPageArtwork = Object.keys(currentPageArtworks).length > 0;
  const currentTemplate = useMemo(
    () =>
      frameTemplates.find((t) => t.id === currentTemplateId) ||
      DEFAULT_FRAME_TEMPLATES.find((t) => t.id === currentTemplateId) ||
      null,
    [frameTemplates, currentTemplateId],
  );

  // Kiểm tra quyền chỉnh sửa trang và tải artwork trên chương dùng Lưới V3 (mục B & C)
  const { isPageReadOnly, canUploadCurrentPageArtwork } = useMemo(() => {
    // 0. Khóa quyền tạo/sửa layout ở giai đoạn PreProduction để Writer giữ quyền SSOT tuyệt đối
    const currentChapter = chapters.find((c) => c.id === currentChapterId);
    const isPreProduction =
      currentChapter &&
      (currentChapter.status === 'PreProduction' ||
        (currentChapter as any).status === 1 ||
        (!currentChapter.isScriptFrozen && currentChapter.status !== 'InProduction'));
    if (isPreProduction) {
      return { isPageReadOnly: true, canUploadCurrentPageArtwork: false };
    }

    if (gridTasks.length === 0 || !selectedPage) {
      return { isPageReadOnly: false, canUploadCurrentPageArtwork: true };
    }
    const me = getStoredCurrentUserId();
    const isProducerRole = String(workspaceRole || '').toUpperCase() === 'PRODUCER';
    const pageCells = gridTasks.filter((t) => !t.pageId || t.pageId === selectedPage.id);
    const hasStageMatchInGrid = Boolean(
      currentStage?.id && pageCells.some((t) => t.pipelineStageId === currentStage.id),
    );
    const stagePageCells = hasStageMatchInGrid
      ? pageCells.filter((t) => t.pipelineStageId === currentStage?.id)
      : pageCells;

    const holdsOpenPageCell = pageCells.some(
      (t) =>
        (t.status === 'InProgress' || t.status === 'ReworkRequired') &&
        (me ? t.assigneeUserId === me : Boolean(t.assigneeUserId)),
    );
    const holdsOpenStageCell = stagePageCells.some(
      (t) =>
        (t.status === 'InProgress' || t.status === 'ReworkRequired') &&
        (me ? t.assigneeUserId === me : Boolean(t.assigneeUserId)),
    );
    const isProducerOnUnassignedStage =
      isProducerRole && stagePageCells.some((t) => t.status === 'Unassigned');

    return {
      isPageReadOnly: !holdsOpenPageCell && !isProducerOnUnassignedStage,
      canUploadCurrentPageArtwork: holdsOpenStageCell || isProducerOnUnassignedStage,
    };
  }, [chapters, currentChapterId, gridTasks, selectedPage, workspaceRole, currentStage?.id]);

  // Ô của công đoạn hiện tại trên trang này đã giao cho mình và đến lượt làm nhưng chưa bấm Bắt đầu
  const startableCurrentCell = useMemo(() => {
    if (!isPageReadOnly || !selectedPage || !currentStage?.id) return null;
    const me = getStoredCurrentUserId();
    return (
      gridTasks.find(
        (t) =>
          t.pipelineStageId === currentStage.id &&
          (t.pageId === selectedPage.id || !t.pageId) &&
          t.status === 'Assigned' &&
          t.isStartable &&
          (!me || t.assigneeUserId === me),
      ) ?? null
    );
  }, [isPageReadOnly, selectedPage, currentStage?.id, gridTasks]);
  const [isStartingCell, setIsStartingCell] = useState(false);

  const hasVisualScriptImpact = useMemo(() => {
    if (!selectedPage) return false;
    const gridImpact = gridTasks.some(
      (task) => task.hasScriptImpact === true && (!task.pageId || task.pageId === selectedPage.id),
    );
    const legacyImpact = chapterAssignments.some((assignment) => {
      if (assignment.hasScriptImpact !== true) return false;
      if (assignment.pageId) return assignment.pageId === selectedPage.id;
      return panelPageMap[assignment.targetEntityId]?.pageId === selectedPage.id;
    });
    return gridImpact || legacyImpact;
  }, [selectedPage, gridTasks, chapterAssignments, panelPageMap]);

  const handleStartCurrentCell = async () => {
    if (!startableCurrentCell || !currentChapterId || isStartingCell) return;
    setIsStartingCell(true);
    try {
      const started = await assignmentService.startStageTask(
        currentChapterId,
        startableCurrentCell.id,
      );
      setGridTasks((prev) =>
        prev.map((t) =>
          t.id === startableCurrentCell.id
            ? { ...t, ...started, id: t.id, status: started?.status ?? 'InProgress' }
            : t,
        ),
      );
      toast.success(
        t('artist.deskView.startCellSuccessTitle'),
        t('artist.deskView.startCellSuccessDesc', { stage: currentStage?.label ?? '' }),
      );
    } catch (err: any) {
      toast.error(t('artist.deskView.startCellErrorTitle'), err?.message || '');
    } finally {
      setIsStartingCell(false);
    }
  };

  const activeReworkDisplay = useMemo(() => {
    if (gridTasks.length === 0) return null;
    const me = getStoredCurrentUserId();
    const pageCells = gridTasks.filter(
      (cell) => !cell.pageId || !selectedPage || cell.pageId === selectedPage.id,
    );
    const hasStageMatchInGrid = Boolean(
      currentStage?.id && pageCells.some((cell) => cell.pipelineStageId === currentStage.id),
    );
    const stagePageCells = hasStageMatchInGrid
      ? pageCells.filter((cell) => cell.pipelineStageId === currentStage?.id)
      : pageCells;
    const reworkCell = stagePageCells.find(
      (cell) =>
        cell.status === 'ReworkRequired' &&
        (me ? cell.assigneeUserId === me : Boolean(cell.assigneeUserId)),
    );
    return reworkCell ? resolveReworkReasonDisplay(reworkCell) : null;
  }, [gridTasks, selectedPage, currentStage?.id]);

  const isScriptUnfrozenInProduction = Boolean(
    activeChapter &&
    activeChapter.status === 'InProduction' &&
    activeChapter.isScriptFrozen === false,
  );

  // Persist the current dirty layout. Saving never prevents later layout changes.
  const handleSaveLayout = useCallback(async () => {
    if (isInkOrColorStage) {
      toast.error(t('artist.deskView.onlyPencilCanEditLayout'));
      return;
    }
    if (isPageReadOnly) {
      toast.error(t('artist.deskView.noOpenSlotOnPage'));
      return;
    }
    if (!selectedPage || currentPagePanels.length === 0 || isCurrentPageLayoutSaved) return;
    const targetPage = selectedPage;
    const templateId = activeTemplateByPageId[targetPage.id];
    const template =
      frameTemplates.find((t) => t.id === templateId) ||
      DEFAULT_FRAME_TEMPLATES.find((t) => t.id === templateId);

    if (isGuid(targetPage.id)) {
      setIsApplyingTemplate(true);
      try {
        const requestPanels = currentPagePanels.map((panel) => ({
          panelNumber: panel.panelNumber,
          readingOrder: panel.readingOrder,
          boundingBox: panel.boundingBox,
          direction: panel.direction,
        }));
        const result =
          templateId && !templateId.startsWith('builtin-')
            ? await frameTemplateService.applyFrameTemplate(targetPage.id, templateId)
            : await panelService.replacePageLayout(targetPage.id, requestPanels);
        const reloadedPanels = await panelService.getPanelsByPage(targetPage.id);
        const savedPanels = [...reloadedPanels].sort(
          (a, b) => (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber),
        );

        setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: savedPanels }));
        setPersistedPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: savedPanels }));
        setPanelPageMap((prev) => {
          const next = { ...prev };
          currentPagePanels.forEach((panel) => {
            delete next[panel.id];
          });
          savedPanels.forEach((panel) => {
            next[panel.id] = {
              pageId: targetPage.id,
              pageNumber: targetPage.pageNumber,
              panelNumber: panel.panelNumber || panel.readingOrder || 1,
              sceneId: panel.sceneId,
            };
          });
          return next;
        });
        setPages((prev) =>
          prev.map((page) =>
            page.id === targetPage.id ? { ...page, elementsCount: savedPanels.length } : page,
          ),
        );
        if (currentChapterId) {
          await loadPageArtworks(currentChapterId, [targetPage], currentStageId, {
            [targetPage.id]: savedPanels,
          });
        }
        if (result.unassignedArtworkCount > 0) {
          toast.warning(
            t('artist.deskView.unassignedArtworksWarning', {
              count: result.unassignedArtworkCount,
            }),
            '',
          );
        }
      } catch (err: any) {
        const backendMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.data?.message ||
          err?.data?.error ||
          err?.message;
        setTemplateError(backendMsg || t('artist.deskView.saveLayoutServerError'));
        const status = err?.status || err?.response?.status;
        if (
          (status === 403 ||
            status === 409 ||
            status === 400 ||
            err?.code === 'FORBIDDEN' ||
            err?.code === 'CONFLICT') &&
          backendMsg
        ) {
          toast.error(backendMsg);
        } else {
          toast.error(
            t('artist.deskView.saveLayoutErrorTitle'),
            backendMsg || t('artist.deskView.saveLayoutErrorDesc'),
          );
        }
        return;
      } finally {
        setIsApplyingTemplate(false);
      }
    }

    setSavedLayoutByPageId((prev) => ({ ...prev, [targetPage.id]: true }));
    toast.success(
      t('artist.deskView.saveLayoutSuccessTitle'),
      t('artist.deskView.saveLayoutSuccessDesc', {
        page: targetPage.pageNumber,
        template: template?.name || t('artist.deskView.templateFallback'),
      }),
    );
  }, [
    activeTemplateByPageId,
    currentPagePanels,
    currentChapterId,
    currentStageId,
    frameTemplates,
    isCurrentPageLayoutSaved,
    isInkOrColorStage,
    isPageReadOnly,
    loadPageArtworks,
    selectedPage,
    toast,
  ]);

  // Nạp tranh vào ô khung
  const handleUploadPanelArtwork = useCallback(
    async (panelId: string, panelNum: number, file: File) => {
      if (!selectedPage) return;
      if (!canUploadCurrentPageArtwork) {
        toast.error(t('artist.deskView.noUploadPermission'));
        return;
      }
      if (!savedLayoutByPageId[selectedPage.id]) {
        toast.warning(t('artist.deskView.saveLayoutBeforeUpload'), '');
        return;
      }
      const shouldPersistToServer = Boolean(
        currentChapterId &&
        isGuid(selectedPage.id) &&
        isGuid(panelId) &&
        artworkService?.uploadArtwork,
      );

      if (shouldPersistToServer) {
        try {
          const currentStg = artistStages[currentStageIndex];
          const stageId = currentStg?.id && isGuid(currentStg.id) ? currentStg.id : undefined;
          await artworkService.uploadArtwork(
            currentChapterId!,
            selectedPage.id,
            file,
            stageId,
            undefined,
            undefined,
            panelId,
          );
        } catch (err: any) {
          const errorMsg =
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.data?.error ||
            err?.data?.message ||
            err?.message ||
            t('artist.deskView.uploadR2Error');
          const status = err?.status || err?.response?.status;
          const isDirectBackendErr =
            status === 403 ||
            status === 409 ||
            status === 400 ||
            err?.code === 'FORBIDDEN' ||
            err?.code === 'CONFLICT';
          if (isDirectBackendErr) {
            toast.error(errorMsg);
          } else {
            toast.error(
              t('artist.deskView.uploadErrorTitle'),
              t('artist.deskView.uploadErrorDesc', { panel: panelNum, error: errorMsg }),
            );
          }
          return;
        }
      }

      const objectUrl = URL.createObjectURL(file);
      const newArtwork: PanelArtworkData = {
        id: `art-${panelId}-${Date.now()}`,
        panelId,
        panelNumber: panelNum,
        imageUrl: objectUrl,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      };

      setPanelArtworksByPageId((prev) => ({
        ...prev,
        [selectedPage.id]: {
          ...(prev[selectedPage.id] || {}),
          [panelId]: newArtwork,
        },
      }));

      toast.success(
        t('artist.deskView.uploadSuccessTitle'),
        t('artist.deskView.uploadSuccessDesc', { file: file.name, panel: panelNum }),
      );
    },
    [
      selectedPage,
      canUploadCurrentPageArtwork,
      currentChapterId,
      artistStages,
      currentStageIndex,
      savedLayoutByPageId,
      toast,
      t,
    ],
  );

  // Xóa tranh khỏi ô khung
  const handleRemovePanelArtwork = useCallback(
    (panelId: string, panelNum: number) => {
      if (!selectedPage) return;
      if (!canUploadCurrentPageArtwork) {
        toast.error(t('artist.deskView.noUploadPermission'));
        return;
      }
      const removed = panelArtworksByPageId[selectedPage.id]?.[panelId];
      setPanelArtworksByPageId((prev) => {
        const pageArts = { ...(prev[selectedPage.id] || {}) };
        delete pageArts[panelId];
        return { ...prev, [selectedPage.id]: pageArts };
      });
      // Ảnh cắt tự động chỉ tồn tại ở máy: gỡ khỏi khung là bỏ hẳn, giải phóng bộ nhớ.
      if (removed?.source === 'auto-split') revokeArtworkUrls([removed]);
      toast.info(
        t('artist.deskView.removeArtTitle'),
        t('artist.deskView.removeArtDesc', { panel: panelNum }),
      );
    },
    [selectedPage, canUploadCurrentPageArtwork, panelArtworksByPageId, toast, t],
  );

  // Áp dụng mẫu khung tranh tham khảo vào TRANG HIỆN TẠI (chế độ nháp, chuyển đổi mượt mà)
  const handleSelectTemplate = async (template: FrameTemplateDto) => {
    if (!selectedPage) return;
    if (isInkOrColorStage) {
      toast.error(t('artist.deskView.onlyPencilCanEditLayout'));
      return;
    }
    if (isPageReadOnly) {
      toast.error(t('artist.deskView.noOpenSlotOnPage'));
      return;
    }
    const targetPage = selectedPage;

    if (hasCurrentPageArtwork) {
      const accepted = await confirm({
        title: t('artist.deskView.switchTemplateTitle'),
        description: t('artist.deskView.switchTemplateDesc'),
        confirmLabel: t('artist.deskView.switchTemplateConfirm'),
        cancelLabel: t('artist.deskView.keepCurrentLayout'),
        variant: 'warning',
      });
      if (!accepted) return;
    }

    setTemplateError(null);

    const nowIso = new Date().toISOString();
    const localPanels: PanelDto[] = template.slots.map((slot, idx) => ({
      id: `tpl-panel-${targetPage.id}-${idx + 1}`,
      pageId: targetPage.id,
      panelNumber: idx + 1,
      readingOrder: idx + 1,
      boundingBox: JSON.stringify({
        normalized: { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
        corners: slot.corners || undefined,
        borderless: Boolean(slot.borderless),
        pageWidthPx: targetPage.widthPx || 1200,
        pageHeightPx: targetPage.heightPx || 1800,
      }),
      createdAt: nowIso,
    }));

    const carried = carryArtworksByReadingOrder(
      currentPagePanels,
      localPanels,
      currentPageArtworks,
      orphanedArtworksByPageId[targetPage.id] || [],
    );
    setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: localPanels }));
    setPanelArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: carried.mapped }));
    setOrphanedArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: carried.orphans }));
    setSavedLayoutByPageId((prev) => ({ ...prev, [targetPage.id]: false }));
    setActiveTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: template.id }));
    setPages((prev) =>
      prev.map((pg) =>
        pg.id === targetPage.id ? { ...pg, elementsCount: localPanels.length } : pg,
      ),
    );
    if (carried.orphans.length > 0) {
      toast.warning(
        t('artist.deskView.unassignedArtworksWarning', { count: carried.orphans.length }),
        t('artist.deskView.artworksInHistoryDesc'),
      );
    }
  };

  // Xoá khung tham khảo của trang hiện tại (trở về giấy trắng)
  const handleClearTemplate = async () => {
    if (!selectedPage) return;
    if (isInkOrColorStage) {
      toast.error(t('artist.deskView.onlyPencilCanEditLayout'));
      return;
    }
    if (isPageReadOnly) {
      toast.error(t('artist.deskView.noOpenSlotOnPage'));
      return;
    }
    const targetPage = selectedPage;

    if (hasCurrentPageArtwork) {
      const accepted = await confirm({
        title: t('artist.deskView.clearTemplateTitle'),
        description: t('artist.deskView.clearTemplateDesc'),
        confirmLabel: t('artist.deskView.clearTemplateConfirm'),
        cancelLabel: t('artist.deskView.keepCurrentLayout'),
        variant: 'warning',
      });
      if (!accepted) return;
    }

    setTemplateError(null);
    const orphaned = [
      ...(orphanedArtworksByPageId[targetPage.id] || []),
      ...Object.values(currentPageArtworks),
    ];
    setSavedLayoutByPageId((prev) => ({ ...prev, [targetPage.id]: false }));
    setPanelArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: {} }));
    setOrphanedArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: orphaned }));

    setPanelsByPageId((prev) => {
      const next = { ...prev };
      delete next[targetPage.id];
      return next;
    });
    setActiveTemplateByPageId((prev) => {
      const next = { ...prev };
      delete next[targetPage.id];
      return next;
    });
    setPages((prev) =>
      prev.map((pg) => (pg.id === targetPage.id ? { ...pg, elementsCount: 0 } : pg)),
    );

    if (orphaned.length > 0) {
      toast.warning(
        t('artist.deskView.unassignedArtworksWarning', { count: orphaned.length }),
        t('artist.deskView.artworksInHistoryDesc'),
      );
    }
  };

  // Nạp ảnh cả trang để tách khung: CHỈ giữ trên máy (blob URL), không tải lên máy chủ.
  // Nhận diện gửi file sang split-artwork (BE không lưu); khi xác nhận chỉ các khung đã cắt
  // được tải lên. Lý do: ảnh cả trang trên máy chủ được ghép trang (Editor / Reader) ưu tiên hơn
  // ảnh từng khung, và tốn quota cho một bản không dùng tới.
  const handleUploadFullPageSketch = (file: File) => {
    if (!selectedPage) return;
    if (isInkOrColorStage) {
      toast.error(t('artist.deskView.onlyPencilCanEditLayout'));
      return;
    }
    if (isPageReadOnly) {
      toast.error(t('artist.deskView.noOpenSlotOnPage'));
      return;
    }
    const targetPage = selectedPage;
    const previous = fullPageSketchesByPageId[targetPage.id];
    if (previous && previous.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previous.imageUrl);
    }

    setFullPageSketchesByPageId((prev) => ({
      ...prev,
      [targetPage.id]: {
        imageUrl: URL.createObjectURL(file),
        fileName: file.name,
        isVisible: true,
      },
    }));

    toast.success(t('artist.deskView.sketchUploadedTitle'), '');
  };

  // Bật/tắt hiển thị ảnh phác thảo phía dưới
  const handleToggleSketchVisibility = () => {
    if (!selectedPage || !currentSketch) return;
    const targetPage = selectedPage;
    setFullPageSketchesByPageId((prev) => ({
      ...prev,
      [targetPage.id]: {
        ...prev[targetPage.id],
        isVisible: !prev[targetPage.id].isVisible,
      },
    }));
  };

  // Gỡ ảnh phác thảo
  const handleRemoveSketch = () => {
    if (!selectedPage) return;
    if (isInkOrColorStage) {
      toast.error(t('artist.deskView.onlyPencilCanEditLayout'));
      return;
    }
    if (isPageReadOnly) {
      toast.error(t('artist.deskView.noOpenSlotOnPage'));
      return;
    }
    const targetPage = selectedPage;
    setFullPageSketchesByPageId((prev) => {
      const next = { ...prev };
      delete next[targetPage.id];
      return next;
    });
    toast.info(t('artist.deskView.sketchRemovedTitle'), '');
  };

  // Tự động tách panel từ ảnh phác thảo toàn trang (Chỉ nhận diện Panel, KHÔNG đụng đến thoại)
  const handleAutoDetectPanels = async () => {
    if (!selectedPage || !currentSketch) return;
    if (isInkOrColorStage) {
      toast.error(t('artist.deskView.onlyPencilCanEditLayout'));
      return;
    }
    if (isPageReadOnly) {
      toast.error(t('artist.deskView.noOpenSlotOnPage'));
      return;
    }
    const targetPage = selectedPage;

    if (hasCurrentPageArtwork) {
      const accepted = await confirm({
        title: t('artist.deskView.resplitTitle'),
        description: t('artist.deskView.switchTemplateDesc'),
        confirmLabel: t('artist.deskView.resplitConfirm'),
        cancelLabel: t('artist.deskView.keepCurrentLayout'),
        variant: 'warning',
      });
      if (!accepted) return;
    }

    setIsDetectingPanels(true);
    setTemplateError(null);

    try {
      const detection = await detectPanelsFromSketchImage(currentSketch.imageUrl, {
        readingDirection: isRTL ? 'rtl' : 'ltr',
      });

      const nowIso = new Date().toISOString();
      const detectedPanels: PanelDto[] = detection.panels.map((p) => ({
        id: `detected-panel-${targetPage.id}-${p.panelNumber}-${Date.now()}`,
        pageId: targetPage.id,
        panelNumber: p.panelNumber,
        readingOrder: p.readingOrder,
        boundingBox: JSON.stringify({
          normalized: { x: p.x, y: p.y, w: p.w, h: p.h },
          borderless: Boolean(p.borderless),
          pageWidthPx: targetPage.widthPx || 1200,
          pageHeightPx: targetPage.heightPx || 1800,
        }),
        createdAt: nowIso,
      }));

      // Tự động cắt các ô tranh tương ứng từ ảnh phác thảo toàn trang
      const newArtworks: Record<string, PanelArtworkData> = {};
      let croppedUrls: Array<string | null> = [];
      try {
        croppedUrls = await cropImagesByBoundingBoxes(currentSketch.imageUrl, detection.panels);
      } catch (cropErr) {
        console.warn('Lỗi tải ảnh phác thảo để cắt khung:', cropErr);
      }
      detection.panels.forEach((p, idx) => {
        const panel = detectedPanels[idx];
        const croppedUrl = croppedUrls[idx];
        if (!croppedUrl) return;
        newArtworks[panel.id] = {
          id: `art-${panel.id}-${Date.now()}`,
          panelId: panel.id,
          panelNumber: p.panelNumber,
          imageUrl: croppedUrl,
          fileName: `panel-${p.panelNumber}.png`,
          uploadedAt: nowIso,
          source: 'auto-split',
        };
      });

      // Tranh đã tải lên vẫn chuyển theo thứ tự đọc; khung còn trống nhận ảnh vừa cắt.
      const carried = mergeResplitArtworks(
        currentPagePanels,
        detectedPanels,
        currentPageArtworks,
        newArtworks,
        orphanedArtworksByPageId[targetPage.id] || [],
      );
      revokeArtworkUrls(carried.discarded);
      setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: detectedPanels }));
      setPanelArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: carried.mapped }));
      setOrphanedArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: carried.orphans }));
      setSavedLayoutByPageId((prev) => ({ ...prev, [targetPage.id]: false }));
      setActiveTemplateByPageId((prev) => {
        const next = { ...prev };
        delete next[targetPage.id];
        return next;
      });

      setPages((prev) =>
        prev.map((pg) =>
          pg.id === targetPage.id ? { ...pg, elementsCount: detectedPanels.length } : pg,
        ),
      );

      toast.success(t('artist.deskView.panelsSplitSuccess'), '');
      if (carried.orphans.length > 0) {
        toast.warning(
          t('artist.deskView.unassignedArtworksWarning', { count: carried.orphans.length }),
          t('artist.deskView.artworksInHistoryDesc'),
        );
      }
    } catch (err) {
      console.error('Lỗi nhận diện panel:', err);
      toast.error(
        t('artist.deskView.panelsSplitErrorTitle'),
        t('artist.deskView.panelsSplitErrorDesc'),
      );
    } finally {
      setIsDetectingPanels(false);
    }
  };

  const balloons = useLetteringBalloons(
    selectedPage,
    currentPagePanels,
    zoomScale,
    toast,
    isPageReadOnly,
    activeLang,
    originalLang,
  );
  const keepOut = useKeepOutZones(selectedPage, currentPagePanels, toast, isPageReadOnly);
  const selectedBalloon =
    balloons.pageElements.find((el) => el.elementId === balloons.selectedElementId) ?? null;
  const selectedKeepOutCollision = useMemo(() => {
    if (!selectedBalloon || keepOut.zones.length === 0) return null;
    return findKeepOutCollision(
      {
        x: selectedBalloon.x,
        y: selectedBalloon.y,
        width: selectedBalloon.width,
        height: selectedBalloon.height,
      },
      keepOut.zones,
    );
  }, [selectedBalloon, keepOut.zones]);
  const handleSuggestBalloonPosition = useCallback(() => {
    if (!selectedBalloon || !selectedPage) return;
    const pageW = selectedPage.widthPx || 1200;
    const pageH = selectedPage.heightPx || 1800;
    let targetPanelRect: Rect = { x: 0, y: 0, width: pageW, height: pageH };
    const balloonRect: Rect = {
      x: selectedBalloon.x,
      y: selectedBalloon.y,
      width: selectedBalloon.width,
      height: selectedBalloon.height,
    };
    for (const panel of currentPagePanels) {
      const pBox = parseBoundingBox(panel.boundingBox, pageW, pageH);
      const pr: Rect = { x: pBox.pixelX, y: pBox.pixelY, width: pBox.pixelW, height: pBox.pixelH };
      if (rectsOverlap(balloonRect, pr)) {
        targetPanelRect = pr;
        break;
      }
    }
    const suggested = suggestBalloonPosition(
      { width: selectedBalloon.width, height: selectedBalloon.height },
      targetPanelRect,
      keepOut.zones,
      isRTL,
    );
    void balloons.moveElementTo(selectedBalloon.elementId, suggested.x, suggested.y);
  }, [selectedBalloon, selectedPage, currentPagePanels, keepOut.zones, isRTL, balloons]);
  const normalizedDeskRole =
    normalizeWorkspaceRole(workspaceRole) ||
    (typeof window !== 'undefined'
      ? normalizeWorkspaceRole(localStorage.getItem('workspaceRole'))
      : null);
  const isLettererRole = normalizedDeskRole === 'LETTERER';
  const currentVisualImpactCell = useMemo(() => {
    if (gridTasks.length === 0 || isLettererRole) return null;
    const me = getStoredCurrentUserId();
    const pageCells = gridTasks.filter(
      (cell) => !cell.pageId || !selectedPage || cell.pageId === selectedPage.id,
    );
    const stagePageCells = currentStage?.id
      ? pageCells.filter((cell) => cell.pipelineStageId === currentStage.id)
      : pageCells;
    return (
      stagePageCells.find(
        (cell) =>
          cell.isInputOutdated && (me ? cell.assigneeUserId === me : Boolean(cell.assigneeUserId)),
      ) ?? null
    );
  }, [gridTasks, isLettererRole, selectedPage, currentStage?.id]);
  const handleReloadLetteringPage = useCallback(async () => {
    await Promise.all([balloons.reloadElements(), keepOut.reload()]);
    if (currentChapterId) {
      await loadPages(currentChapterId);
    }
  }, [balloons, keepOut, currentChapterId, loadPages]);
  // Số dòng của bóng đang chọn, đánh số giống cột "Script truyện" (chỉ dòng có chữ để đặt)
  const selectedLineNumber = useMemo(() => {
    if (!selectedBalloon?.scriptLineId) return undefined;
    const letterable = (resolvedScriptLines ?? []).filter((l) => suggestBalloonType(l).letterable);
    const idx = letterable.findIndex((l) => l.id === selectedBalloon.scriptLineId);
    return idx >= 0 ? idx + 1 : undefined;
  }, [selectedBalloon, resolvedScriptLines]);
  const linkedScriptLineIds = useMemo(
    () => new Set(balloons.linkedByScriptLine.keys()),
    [balloons.linkedByScriptLine],
  );

  const isTranslationMode = Boolean(
    activeLang && originalLang && activeLang.toLowerCase() !== originalLang.toLowerCase(),
  );
  const activeEdition = useMemo(
    () =>
      chapterEditions.find(
        (ed) => ed.languageCode.toLowerCase() === (activeLang || '').toLowerCase(),
      ) ?? null,
    [chapterEditions, activeLang],
  );
  const activeEditionStatus = normalizeEditionStatus(activeEdition?.status);
  const isActiveEditionEditable = isEditionEditableStatus(activeEdition?.status);
  const canEditCurrentTranslation = isTranslationMode && isActiveEditionEditable;
  const editionBadgeStyle =
    EDITION_STATUS_STYLES[activeEditionStatus] || EDITION_STATUS_STYLES.Draft;

  // Tính số bóng thoại chưa có bản dịch trên các trang đã nạp của chương hiện tại (theo từng ngôn ngữ phát hành khác ngôn ngữ gốc)
  const currentChapterPageIds = useMemo(() => new Set(pages.map((p) => p.id)), [pages]);
  const chapterLoadedBalloons = useMemo(() => {
    const entries = Object.entries(balloons.elementsByPageId || {});
    const matching = entries.filter(([pageId]) => currentChapterPageIds.has(pageId));
    const list = (matching.length > 0 ? matching : entries).flatMap(([, els]) => els);
    return list.filter(
      (el) =>
        !el.isRemoved &&
        !IMAGE_LAYER_TYPES.includes(el.elementType as any) &&
        el.elementType !== 'KEY_ARTWORK_REGION',
    );
  }, [balloons.elementsByPageId, currentChapterPageIds]);

  const untranslatedCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {};
    const origLower = (originalLang || 'vi').toLowerCase();
    for (const lang of seriesLanguages) {
      if (!lang || lang.toLowerCase() === origLower) continue;
      const missing = chapterLoadedBalloons.filter((el) => {
        const val =
          el.texts?.[lang] ?? el.texts?.[lang.toLowerCase()] ?? el.texts?.[lang.toUpperCase()];
        return !val || !val.trim();
      }).length;
      counts[lang] = missing;
    }
    return counts;
  }, [seriesLanguages, originalLang, chapterLoadedBalloons]);

  const handleSubmitEditionTranslation = useCallback(async () => {
    if (
      !currentChapterId ||
      !isTranslationMode ||
      !isActiveEditionEditable ||
      isSubmittingEdition
    ) {
      return;
    }
    const langUpper = activeLang.toUpperCase();
    const missingCount =
      untranslatedCounts[activeLang] ??
      untranslatedCounts[activeLang.toLowerCase()] ??
      chapterLoadedBalloons.filter((el) => {
        const val =
          el.texts?.[activeLang] ??
          el.texts?.[activeLang.toLowerCase()] ??
          el.texts?.[activeLang.toUpperCase()];
        return !val || !val.trim();
      }).length;

    const description =
      chapterLoadedBalloons.length === 0
        ? t(
            'production.lettering.edition.confirmNoBalloons',
            { lang: langUpper },
            `Chương chưa có bóng thoại nào để dịch. Vẫn gửi ấn bản ${langUpper} cho Editor thẩm định?`,
          )
        : missingCount > 0
          ? t(
              'production.lettering.edition.confirmMissingWarning',
              { count: missingCount, lang: langUpper },
              `Cảnh báo: Còn ${missingCount} bóng thoại chưa có bản dịch cho ngôn ngữ ${langUpper}. Bạn có chắc muốn nộp ấn bản ${langUpper} không?`,
            )
          : t(
              'production.lettering.edition.confirmDescription',
              { lang: langUpper },
              `Tất cả bóng thoại đã có bản dịch ${langUpper}. Gửi ấn bản này cho Editor thẩm định?`,
            );

    const accepted = await confirm({
      title: t(
        'production.lettering.edition.confirmTitle',
        { lang: langUpper },
        `Nộp ấn bản ${langUpper}?`,
      ),
      description,
      confirmLabel: t(
        'production.lettering.edition.submitBtn',
        { lang: langUpper },
        `Nộp ấn bản ${langUpper}`,
      ),
      cancelLabel: t('common.actions.cancel', 'Hủy'),
      variant: missingCount > 0 ? 'warning' : 'default',
    });
    if (!accepted) return;

    setIsSubmittingEdition(true);
    try {
      const updated = await chapterEditionService.submitEditionTranslation(
        currentChapterId,
        activeLang,
      );
      if (updated && updated.languageCode) {
        setChapterEditions((prev) => {
          const exists = prev.some(
            (e) => e.languageCode.toLowerCase() === updated.languageCode.toLowerCase(),
          );
          return exists
            ? prev.map((e) =>
                e.languageCode.toLowerCase() === updated.languageCode.toLowerCase() ? updated : e,
              )
            : [...prev, updated];
        });
      }
      await loadChapterEditions(currentChapterId);
      toast.success(
        t(
          'production.lettering.edition.submitSuccessTitle',
          { lang: langUpper },
          `Đã nộp ấn bản ${langUpper}`,
        ),
        t(
          'production.lettering.edition.submitSuccessDesc',
          { lang: langUpper },
          `Ấn bản ${langUpper} đã chuyển sang trạng thái chờ Editor thẩm định.`,
        ),
      );
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        t('production.lettering.edition.submitErrorTitle', 'Không thể nộp ấn bản');
      toast.error(
        t('production.lettering.edition.submitErrorTitle', 'Không thể nộp ấn bản'),
        serverMsg,
      );
    } finally {
      setIsSubmittingEdition(false);
    }
  }, [
    currentChapterId,
    isTranslationMode,
    isActiveEditionEditable,
    isSubmittingEdition,
    activeLang,
    untranslatedCounts,
    chapterLoadedBalloons,
    confirm,
    t,
    loadChapterEditions,
    toast,
  ]);

  // Kéo loại bóng / dòng script từ tab Letter thả lên trang → tạo bóng tại điểm thả (BR-05)
  const handleLetteringDrop = (e: React.DragEvent) => {
    const raw = e.dataTransfer?.getData?.('application/json');
    if (!raw || !selectedPage) return;
    let payload: { type?: BalloonType; scriptLine?: ScriptLineItem };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload.type) return;
    e.preventDefault();
    const surface = document.querySelector('[data-testid="artist-canvas-surface"]');
    const rect = surface?.getBoundingClientRect();
    const at =
      rect && rect.width > 0
        ? {
            x: ((e.clientX - rect.left) / rect.width) * (selectedPage.widthPx || 1200),
            y: ((e.clientY - rect.top) / rect.height) * (selectedPage.heightPx || 1800),
          }
        : undefined;
    balloons.addElement(payload.type, payload.scriptLine, { at });
  };

  // Kiểm tra đủ chữ trước khi nộp Letter: mọi dòng thoại (không phải chỉ dẫn) đã có bóng, không bóng trống
  letteringCheckRef.current = async () => {
    const byPage = await balloons.prefetchPages(pages.map((p) => p.id));
    const all = Object.values(byPage).flat();
    const linked = new Set(all.map((el) => el.scriptLineId).filter(Boolean));
    // Chỉ đối chiếu với kịch bản thật đã nạp (không dùng dữ liệu mẫu)
    const unplaced = (hasLoadedRealScript ? (resolvedScriptLines ?? []) : []).filter(
      (l) => classifyScriptLine(l).isLetterable && !linked.has(l.id),
    );
    const empty = all.filter((el) => !(el.content || el.renderedText || '').trim());
    const issues: string[] = [];
    if (unplaced.length > 0) {
      issues.push(t('artist.deskView.unplacedLinesIssue', { count: unplaced.length }));
    }
    if (empty.length > 0) {
      issues.push(t('artist.deskView.emptyBalloonsIssue', { count: empty.length }));
    }
    return issues.length > 0
      ? t('artist.deskView.letteringCheckHint', { issues: issues.join(', ') })
      : null;
  };

  // Biết dòng nào đã gắn trên toàn chương: nạp bóng của mọi trang khi đang ở tab Letter
  useEffect(() => {
    if (activeSidebarTab === 'lettering' && pages.length > 0) {
      balloons.prefetchPages(pages.map((p) => p.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSidebarTab, pages]);

  // Bật/tắt toàn màn hình
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className='flex-1 basis-0 min-h-0 w-full h-full flex flex-col bg-[#FAF9F5] text-[#1C1917] overflow-hidden select-none relative animate-in fade-in duration-300'
      data-testid='artist-desk'
    >
      {/* Fallback Header khi màn hình ArtistDeskView được render độc lập bên ngoài FocusWorkspaceLayout */}
      {!focusHeader?.isInsideFocusLayout && (
        <FocusStudioHeaderBar
          workspaceId={workspaceId}
          seriesId={seriesId}
          chapterId={currentChapterId}
          pathname={location.pathname}
          userRole={workspaceRole || 'ARTIST'}
          activeSeriesTitle={seriesTitle}
          headerConfig={{
            seriesTitle,
            seriesPath,
            chapters,
            currentChapterId,
            chapterPath,
            onSelectChapter: handleSelectChapter,
            stages: artistStages,
            currentStageIndex,
            isStageFlowCompleted,
            isSubmittingStage,
            onSubmitStage: handleSubmitStage,
            onSelectStage: handleSelectStage,
            submitButtonLabel: t('artist.deskView.submitButtonLabel'),
            showWithdrawButton: true,
            onWithdrawStage: withdrawableCell ? handleWithdrawStage : undefined,
            isWithdrawDisabled: !withdrawableCell,
            withdrawDisabledReason: t('artist.deskView.withdrawDisabledTooltip'),
            isWithdrawingStage,
            withdrawButtonLabel: t('artist.deskView.withdrawButtonLabel'),
          }}
          showFocusControls={false}
        />
      )}

      {isScriptUnfrozenInProduction && (
        <div
          data-testid='script-unfrozen-banner'
          role='status'
          className='shrink-0 border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-950 flex items-center gap-2'
        >
          <AlertTriangle className='w-4 h-4 text-[#D97706] shrink-0' aria-hidden='true' />
          <span>Kịch bản đang được mở khóa để chỉnh sửa — lưu ý trước khi nộp bài mới.</span>
        </div>
      )}

      {hasVisualScriptImpact && (
        <div
          data-testid='visual-impact-badge'
          role='status'
          className='shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 flex items-center gap-2'
        >
          <span className='inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 shrink-0'>
            <Flag className='w-3 h-3' aria-hidden='true' />⚑ Kịch bản thay đổi
          </span>
          <span>
            {currentVisualImpactCell.outdatedReason ||
              'Nội dung hình ảnh của trang này đã được cập nhật khi chốt lại kịch bản.'}
          </span>
        </div>
      )}

      {isPageReadOnly && (
        <div
          data-testid='artist-page-readonly-banner'
          role='status'
          className='shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900'
        >
          {canEditCurrentTranslation
            ? t(
                'production.lettering.edition.translationModeAllowedBanner',
                { lang: activeLang.toUpperCase() },
                `Chế độ dịch (${activeLang.toUpperCase()}) — Cho phép chỉnh sửa bản dịch; khung tranh và chữ gốc chỉ đọc`,
              )
            : startableCurrentCell
              ? t('artist.deskView.readyToStartBanner', { stage: currentStage?.label ?? '' })
              : t('artist.deskView.readOnlyBanner')}
          {startableCurrentCell && !canEditCurrentTranslation && (
            <button
              type='button'
              data-testid='artist-start-cell-btn'
              disabled={isStartingCell}
              onClick={() => void handleStartCurrentCell()}
              className='ml-3 inline-flex items-center rounded-md bg-orange-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-orange-700 disabled:opacity-60'
            >
              {isStartingCell
                ? t('artist.deskView.startingCell')
                : t('artist.deskView.startCellBtn')}
            </button>
          )}
        </div>
      )}

      {activeReworkDisplay && (
        <div
          data-testid='artist-rework-banner'
          role='status'
          className='shrink-0 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-900 whitespace-pre-line break-words'
        >
          {activeReworkDisplay.kind === 'reopen' ? (
            <>
              🔄{' '}
              <span className='font-semibold'>
                {t('taskGridV3.reopenReasonPrefix', 'Producer mở lại:')}
              </span>{' '}
              <span>{activeReworkDisplay.text}</span>
            </>
          ) : (
            <>
              💬{' '}
              <span className='font-semibold'>
                {t('taskGridV3.lastDecisionLabel', 'Nhận xét lần duyệt gần nhất')}:
              </span>{' '}
              <span>{activeReworkDisplay.text}</span>
            </>
          )}
        </div>
      )}

      <div className='flex-1 min-h-0 w-full flex flex-row overflow-hidden relative'>
        {/* 1. SIDEBAR CÔNG CỤ HỌA SĨ (Kịch bản tham chiếu + Hồ sơ truyện) */}
        <ArtistCanvaSidebar
          pages={pages.map((p) => ({
            id: p.id,
            pageNumber: p.pageNumber,
            title: t('artist.deskView.pageLabel', { page: p.pageNumber }),
            stage: activeStageKey,
            panelsCount: p.elementsCount || 1,
            format: p.layoutFormat || 'B5',
            isVisible: true,
          }))}
          selectedPageId={selectedPageId || ''}
          onSelectPage={(id) => setSelectedPageId(id)}
          onAddPage={handleAddPage}
          onDuplicatePage={() => {
            if (selectedPage) handleDuplicatePage(selectedPage);
          }}
          onDeletePage={(id) => handleDeletePage(id)}
          onMovePage={() => {}}
          onToggleVisibility={() => {}}
          hidePagesTab={false}
          scriptLines={resolvedScriptLines}
          chapterPanels={allChapterPanels}
          sceneTitle={firstSceneMeta.title}
          sceneSlugline={firstSceneMeta.slugline}
          chapterTitle={activeChapterTitle}
          chapters={chapters}
          selectedChapterId={currentChapterId}
          onSelectChapter={handleSelectChapter}
          isLoadingScript={isLoadingScript}
          selectedPanelId={selectedPanelId}
          selectedPanelNumber={selectedPanelNumber}
          onSelectPanelId={handleSelectPanelById}
          bibleEntities={bibleEntities}
          seriesTitle={seriesTitle}
          isLoadingBible={isLoadingBible}
          templates={frameTemplates}
          activeTemplateId={currentTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onClearTemplate={handleClearTemplate}
          hasPagePanels={currentPagePanels.length > 0}
          isLoadingTemplates={isLoadingTemplates}
          isApplyingTemplate={isApplyingTemplate}
          templateError={templateError}
          layoutLocked={isInkOrColorStage}
          activeTab={activeSidebarTab}
          onTabChange={(tab) => setActiveSidebarTab(tab)}
          isDrawerOpen={isSidebarDrawerOpen}
          onToggleDrawer={(open) => setIsSidebarDrawerOpen(open)}
          changeRequests={changeRequests}
          isLoadingChangeRequests={isLoadingChangeRequests}
          onResolveChangeRequest={handleResolveChangeRequest}
          isResolvingChangeRequest={isResolvingChangeRequest}
          onNavigateToChangeRequestTarget={handleNavigateToChangeRequestTarget}
          pageHistory={pageHistory}
          isLoadingPageHistory={isLoadingPageHistory}
          onRestoreVersion={handleRestoreVersion}
          isRestoringVersion={isRestoringVersion}
          onRefreshHistory={() => {
            if (selectedPageId) {
              loadPageHistory(selectedPageId);
            }
          }}
          letteringElements={balloons.pageElements}
          onAddLetteringElement={balloons.addElement}
          onDeleteLetteringElement={balloons.deleteElement}
          selectedElementId={balloons.selectedElementId}
          onSelectElementId={balloons.setSelectedElementId}
          artworkPanelKeys={artworkPanelKeys}
          onSelectPanel={(pageNumber, panelNumber) => {
            const targetPage = pages.find((page) => page.pageNumber === pageNumber);
            if (!targetPage) return;
            setSelectedPageId(targetPage.id);
            const targetPanel = (panelsByPageId[targetPage.id] || []).find(
              (panel) => (panel.panelNumber || panel.readingOrder) === panelNumber,
            );
            setSelectedPanelId(targetPanel?.id || null);
            setSelectedPanelNumberOverride(panelNumber);
          }}
          activeLang={activeLang}
          originalLang={originalLang}
          translationReadOnly={isTranslationMode && !isActiveEditionEditable}
          onUpdateElementText={balloons.updateElementText}
          onUpdateElementTranslation={balloons.updateElementText}
          linkedScriptLineIds={linkedScriptLineIds}
          letteringHeaderSlot={
            <div className='w-full flex flex-col gap-2'>
              <div className='flex items-center justify-between gap-2'>
                <button
                  type='button'
                  data-testid='tool-keepout'
                  onClick={keepOut.toggleDrawingMode}
                  disabled={isPageReadOnly || keepOut.isSaving}
                  aria-pressed={keepOut.isDrawingMode}
                  title={t(
                    'lettering.keepOut.title',
                    'Vẽ vùng cấm chữ trên tranh (tránh mặt/tay nhân vật)',
                  )}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    keepOut.isDrawingMode
                      ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                  }`}
                >
                  <ShieldAlert className='w-3.5 h-3.5' aria-hidden='true' />
                  <span>{t('lettering.keepOut.button', 'Vùng cấm')}</span>
                  {keepOut.zones.length > 0 && (
                    <span
                      data-testid='keepout-count-badge'
                      className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                        keepOut.isDrawingMode ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {keepOut.zones.length}
                    </span>
                  )}
                </button>
                <LanguageSelector
                  languages={seriesLanguages}
                  activeLang={activeLang}
                  onChange={setActiveLang}
                  originalLang={originalLang}
                  counts={untranslatedCounts}
                />
              </div>
              {keepOut.conflictMessage && (
                <div
                  role='alert'
                  data-testid='keepout-conflict-banner'
                  className='flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900'
                >
                  <span className='leading-snug'>{keepOut.conflictMessage}</span>
                  <button
                    type='button'
                    data-testid='keepout-reload-btn'
                    onClick={() => void keepOut.reload()}
                    disabled={keepOut.isLoading}
                    className='inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 cursor-pointer disabled:opacity-50'
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${keepOut.isLoading ? 'animate-spin' : ''}`}
                      aria-hidden='true'
                    />
                    {t('lettering.keepOut.reload', 'Tải lại')}
                  </button>
                </div>
              )}
              {isTranslationMode && (
                <div
                  data-testid='lettering-edition-bar'
                  className='flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-stone-200 shadow-2xs'
                >
                  <div className='flex items-center gap-1.5 min-w-0'>
                    <span className='text-xs text-stone-500 font-medium'>
                      {t('production.lettering.edition.label', 'Ấn bản')}:
                    </span>
                    <span
                      data-testid='lettering-edition-status'
                      data-edition-status={activeEditionStatus}
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${editionBadgeStyle.bg} ${editionBadgeStyle.text} ${editionBadgeStyle.border}`}
                    >
                      {t(
                        `production.lettering.edition.status.${activeEditionStatus}`,
                        editionBadgeStyle.fallbackLabel,
                      )}
                    </span>
                  </div>
                  <button
                    type='button'
                    data-testid='lettering-submit-edition-btn'
                    onClick={handleSubmitEditionTranslation}
                    disabled={!isActiveEditionEditable || isSubmittingEdition || !currentChapterId}
                    className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-stone-200 disabled:text-stone-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs shrink-0'
                  >
                    {isSubmittingEdition ? (
                      <>
                        <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
                        <span>
                          {t('production.lettering.edition.submittingBtn', 'Đang nộp...')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className='w-3.5 h-3.5' aria-hidden='true' />
                        <span>
                          {t(
                            'production.lettering.edition.submitBtn',
                            { lang: activeLang.toUpperCase() },
                            `Nộp ấn bản ${activeLang.toUpperCase()}`,
                          )}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          }
          theme='paper'
        />

        <div
          className='flex-1 min-h-0 min-w-0 h-full flex flex-col overflow-hidden relative'
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('application/json')) e.preventDefault();
          }}
          onDrop={handleLetteringDrop}
        >
          <div className='flex-1 min-h-0 min-w-0 flex'>
            <ArtistCanvasViewport
              pageKey={selectedPageId || 'default'}
              zoomScale={zoomScale}
              sketch={currentSketch}
              hasPanels={currentPagePanels.length > 0}
              isLayoutSaved={isCurrentPageLayoutSaved}
              isDetectingPanels={isDetectingPanels}
              isSavingLayout={isApplyingTemplate}
              readOnly={isPageReadOnly}
              layoutLockedReason={
                isInkOrColorStage ? t('artist.deskView.onlyPencilCanEditLayout') : undefined
              }
              onCanvasClick={() => {
                balloons.setSelectedElementId(null);
                handleSelectPanelById(null);
              }}
              onUploadSketch={handleUploadFullPageSketch}
              onSplitPanels={handleAutoDetectPanels}
              onOpenTemplates={() => {
                setActiveSidebarTab('templates');
                setIsSidebarDrawerOpen(true);
              }}
              onSaveLayout={handleSaveLayout}
            >
              {currentPagePanels.length > 0 && (
                <PanelFrameOverlay
                  panels={currentPagePanels}
                  pageWidth={selectedPage?.widthPx || 1200}
                  pageHeight={selectedPage?.heightPx || 1800}
                  templateCode={currentTemplate?.code}
                  artworks={currentPageArtworks}
                  isLayoutSaved={isCurrentPageLayoutSaved}
                  canUploadArtwork={canUploadCurrentPageArtwork}
                  selectedPanelId={selectedPanelId}
                  onSelectPanel={handleSelectPanelById}
                  onUploadArtwork={handleUploadPanelArtwork}
                  onRemoveArtwork={handleRemovePanelArtwork}
                  onPreviewArtwork={setPreviewArtwork}
                />
              )}
              {selectedPage && (activeSidebarTab === 'lettering' || keepOut.zones.length > 0) && (
                <KeepOutZoneOverlay
                  zones={keepOut.zones}
                  pageWidth={selectedPage.widthPx || 1200}
                  pageHeight={selectedPage.heightPx || 1800}
                  isDrawingMode={keepOut.isDrawingMode}
                  readOnly={isPageReadOnly}
                  onAddZone={(rect) => {
                    void keepOut.addZone(rect);
                  }}
                  onDeleteZone={(id) => {
                    void keepOut.deleteZone(id);
                  }}
                  onExitDrawingMode={() => keepOut.setIsDrawingMode(false)}
                />
              )}
              {selectedPage && balloons.pageElements.length > 0 && (
                <LetteringBalloonOverlay
                  elements={balloons.pageElements}
                  pageWidth={selectedPage.widthPx || 1200}
                  pageHeight={selectedPage.heightPx || 1800}
                  activeLang={activeLang}
                  selectedId={balloons.selectedElementId}
                  activeGestureId={balloons.draggingId || balloons.resizingId}
                  readOnly={isPageReadOnly}
                  keepOutZones={keepOut.zones}
                  onSelect={balloons.setSelectedElementId}
                  onScale={balloons.scaleElement}
                  onCopy={balloons.copyElement}
                  onDelete={balloons.deleteElement}
                  onDragStart={balloons.onDragStart}
                  onDragMove={balloons.onDragMove}
                  onDragEnd={balloons.onDragEnd}
                  onResizeStart={balloons.onResizeStart}
                  onResizeMove={balloons.onResizeMove}
                  onResizeEnd={balloons.onResizeEnd}
                />
              )}
            </ArtistCanvasViewport>
            {selectedBalloon && (
              <LetteringPropertyPanel
                element={selectedBalloon}
                scriptLine={resolvedScriptLines?.find((l) => l.id === selectedBalloon.scriptLineId)}
                activeLang={activeLang}
                originalLang={originalLang}
                textReadOnly={isTranslationMode ? !isActiveEditionEditable : isPageReadOnly}
                onCommitText={(text) => balloons.updateElementText(selectedBalloon.elementId, text)}
                onSyncScriptText={() => balloons.syncElementText(selectedBalloon.elementId)}
                onChangeStyle={(patch) =>
                  balloons.updateElementStyle(selectedBalloon.elementId, patch)
                }
                lineNumber={selectedLineNumber}
                displayNumber={
                  (selectedBalloon.readingOrder ??
                    balloons.pageElements.indexOf(selectedBalloon) + 1) ||
                  undefined
                }
                onDelete={
                  !isPageReadOnly
                    ? () => balloons.deleteElement(selectedBalloon.elementId)
                    : undefined
                }
                onViewScript={() => {
                  setActiveSidebarTab('script');
                  setIsSidebarDrawerOpen(true);
                }}
                onClose={() => balloons.setSelectedElementId(null)}
                seriesId={seriesId}
                pageId={selectedPage?.id}
                canUseAiShorten={Boolean(
                  isLettererRole &&
                  seriesId &&
                  selectedPage?.id &&
                  !selectedPage.id.startsWith('page-default-'),
                )}
                onReloadPage={handleReloadLetteringPage}
                keepOutCollision={selectedKeepOutCollision}
                onSuggestPosition={!isPageReadOnly ? handleSuggestBalloonPosition : undefined}
              />
            )}
          </div>

          {hasCurrentPageArtwork && (
            <SplitPanelStrip
              panels={currentPagePanels}
              artworks={currentPageArtworks}
              canEdit={canUploadCurrentPageArtwork}
              selectedPanelId={selectedPanelId}
              onSelectPanel={handleSelectPanelById}
              onPreviewArtwork={setPreviewArtwork}
              onRemoveArtwork={handleRemovePanelArtwork}
            />
          )}

          <ArtistBottomPageStrip
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={handleSelectPage}
            onAddPage={handleAddPage}
            onDeletePage={handleDeletePage}
            onDuplicatePage={handleDuplicatePage}
            isFilmstripOpen={isFilmstripOpen}
            onToggleFilmstrip={() => setIsFilmstripOpen((v) => !v)}
            zoomScale={zoomScale}
            onZoomChange={setZoomScale}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            canEdit={!isPageReadOnly}
          />
        </div>
      </div>

      {previewArtwork && (
        <ArtworkPreviewDialog
          imageUrl={previewArtwork.imageUrl}
          title={previewArtwork.title}
          onClose={() => setPreviewArtwork(null)}
        />
      )}
    </div>
  );
};

export default ArtistDeskView;
