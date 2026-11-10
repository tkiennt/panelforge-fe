import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { pageService, PageDto, isGuid } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { pipelineService, PipelineStageDto } from '@/services/pipeline.service';
import { assignmentService, AssignmentDto } from '@/services/assignment.service';
import { frameTemplateService, FrameTemplateDto } from '@/services/frameTemplate.service';
import { artworkService } from '@/services/artwork.service';
import { PanelDto } from '@/types/pipeline';
import { parseBoundingBox } from '../utils/panelBoundingBox';
import { useToast } from '@/shared/context/ToastContext';
import {
  UploadCloud,
  ImagePlus,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  Check,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Lock,
  Unlock,
  X,
  LayoutTemplate,
  Sparkles,
  Wand2,
  Scissors,
  Upload,
} from 'lucide-react';
import { detectPanelsFromSketchImage } from '../lib/panelDetection';
import { getRoleDefaultPath } from '@/roles/roles';
import {
  formatChapterLabel,
  stageKindOf,
} from '@/shared/features/pipeline-board/productionBoard.utils';
import {
  FocusStageItem,
  FocusStudioHeaderBar,
  useFocusHeaderContext,
} from '@/app/FocusWorkspaceLayout';
import { getArtistStageKind } from '../utils/artistStage';
import {
  ArtistCanvaSidebar,
  CanvaSidebarTab,
  ScriptLineItem,
  BibleEntityItem,
  DEFAULT_FRAME_TEMPLATES,
} from '../components/desk/ArtistCanvaSidebar';
import { ArtistBottomPageStrip } from '../components/desk/ArtistBottomPageStrip';
import { PageStage } from '../components/desk/ArtistPageSidebar';

export interface ArtistDeskViewProps {
  workspaceRole?: string | null;
  initialScriptLines?: ScriptLineItem[];
  initialBibleEntities?: BibleEntityItem[];
}

export interface PanelArtworkData {
  id: string;
  panelId: string;
  panelNumber: number;
  imageUrl: string;
  fileName: string;
  uploadedAt: string;
}

interface RawLoadedScriptLine extends ScriptLineItem {
  speakerCharacterId?: string | null;
}

const CHARACTER_COLORS = [
  '#F97316',
  '#06B6D4',
  '#8B5CF6',
  '#10B981',
  '#E11D48',
  '#D97706',
  '#2563EB',
];

const DEFAULT_ARTIST_STAGES: FocusStageItem[] = [
  { id: 'stage-pencil', label: 'Pencil', key: 'pencil' },
  { id: 'stage-ink', label: 'Ink', key: 'ink' },
  { id: 'stage-letter', label: 'Letter', key: 'lettering' },
];

function localizeArtistStageLabel(stage: Pick<PipelineStageDto, 'name' | 'slug'>): string {
  const kind = getArtistStageKind(stage);
  if (kind === 'pencil') return 'Pencil';
  if (kind === 'ink') return 'Ink';
  if (kind === 'lettering') return 'Letter';

  const lower = `${stage.slug || ''} ${stage.name || ''}`.toLowerCase();
  if (lower.includes('letter') || lower.includes('dialogue') || lower.includes('thoại')) return 'Letter';
  if (lower.includes('ink') || lower.includes('mực') || lower.includes('nét')) return 'Ink';
  if (lower.includes('pencil') || lower.includes('chì') || lower.includes('layout') || lower.includes('bố cục') || lower.includes('thumbnail')) return 'Pencil';

  const boardKind = stageKindOf(stage.name || '');
  if (boardKind === 'letter') return 'Letter';
  if (boardKind === 'ink') return 'Ink';
  if (boardKind === 'pencil' || boardKind === 'thumbnail') return 'Pencil';

  const cleaned = (stage.name || '').replace(/\s*\([A-Za-z0-9\s/-]+\)\s*/g, '').trim();
  return cleaned || 'Pencil';
}

function resolveStageKey(stage: Pick<PipelineStageDto, 'name' | 'slug'>): PageStage {
  const kind = getArtistStageKind(stage);
  if (kind === 'ink') return 'ink';
  if (kind === 'lettering') return 'lettering';
  const boardKind = stageKindOf(stage.name || '');
  if (boardKind === 'letter') return 'lettering';
  if (boardKind === 'color') return 'completed';
  return 'pencil';
}

function getDeterministicColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return CHARACTER_COLORS[Math.abs(hash) % CHARACTER_COLORS.length];
}

function mapBibleCategory(cat: string | number): 'character' | 'location' | 'lore' {
  if (typeof cat === 'string') {
    const s = cat.toLowerCase();
    if (s.includes('char')) return 'character';
    if (s.includes('loc')) return 'location';
    return 'lore';
  }
  if (cat === 0 || cat === 1) return 'character';
  if (cat === 2) return 'location';
  return 'lore';
}

function getBibleCategoryTag(cat: string | number, subtitle?: string | null): string {
  if (subtitle?.trim()) return subtitle.trim();
  const s = String(cat).toLowerCase();
  if (s.includes('char') || s === '0' || s === '1') return 'Nhân vật';
  if (s.includes('loc') || s === '2') return 'Bối cảnh';
  if (s.includes('style') || s === '4') return 'Quy tắc mỹ thuật';
  if (s.includes('prop') || s === '3') return 'Đạo cụ & Thuật ngữ';
  return 'Thiết lập thế giới';
}

const ATTRIBUTE_LABELS: Record<string, string> = {
  appearance: 'Ngoại hình',
  costume: 'Trang phục',
  hair: 'Kiểu tóc',
  eyes: 'Màu mắt',
  height: 'Chiều cao',
  weapon: 'Vũ khí / Đạo cụ',
  distinguishingMarks: 'Dấu ấn đặc trưng',
  personality: 'Tính cách',
  role: 'Vai trò',
  atmosphere: 'Không khí / Ánh sáng',
  architecture: 'Kiến trúc',
};

function extractBibleVisualDetails(entry: BibleEntryDto): {
  visualNotes: string[];
  gallery?: Array<{ url: string; label?: string }>;
} {
  const notes: string[] = [];
  let gallery: Array<{ url: string; label?: string }> | undefined;

  const parseJsonSafe = (raw?: string | null): Record<string, any> | null => {
    if (!raw || typeof raw !== 'string') return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  let details = parseJsonSafe(entry.detailsJson);
  if (!details && entry.effectiveRevision?.snapshotJson) {
    const snap = parseJsonSafe(entry.effectiveRevision.snapshotJson);
    const nestedRaw = snap?.DetailsJson || snap?.detailsJson;
    details = parseJsonSafe(nestedRaw) || snap;
  }

  if (details) {
    if (Array.isArray(details.visualNotes)) {
      details.visualNotes.forEach((n: unknown) => {
        if (typeof n === 'string' && n.trim()) notes.push(n.trim());
      });
    }

    if (details.attributes && typeof details.attributes === 'object') {
      Object.entries(details.attributes).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) {
          const label = ATTRIBUTE_LABELS[k] || k;
          notes.push(`${label}: ${v.trim()}`);
        } else if (Array.isArray(v)) {
          v.forEach((item) => {
            if (typeof item === 'string' && item.trim()) notes.push(item.trim());
          });
        }
      });
    }

    if (Array.isArray(details.turnaroundGallery)) {
      const mapped = details.turnaroundGallery
        .filter((g: any) => g && typeof g.url === 'string' && g.url.trim())
        .map((g: any) => ({ url: g.url, label: g.label || g.angle || undefined }));
      if (mapped.length > 0) gallery = mapped;
    }
  }

  return { visualNotes: notes, gallery };
}

// Dữ liệu trang khởi tạo mặc định nếu chương chưa có trang
const DEFAULT_INITIAL_PAGES: PageDto[] = [
  {
    id: 'page-default-1',
    chapterId: 'chap-1',
    pageNumber: 1,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-2',
    chapterId: 'chap-1',
    pageNumber: 2,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-3',
    chapterId: 'chap-1',
    pageNumber: 3,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-4',
    chapterId: 'chap-1',
    pageNumber: 4,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-5',
    chapterId: 'chap-1',
    pageNumber: 5,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
  {
    id: 'page-default-6',
    chapterId: 'chap-1',
    pageNumber: 6,
    layoutFormat: 'B5',
    widthPx: 1200,
    heightPx: 1800,
    dpi: 600,
    elementsCount: 0,
  },
];

/**
 * ArtistDeskView - Không gian vẽ dành riêng cho Họa sĩ
 * - Header hệ thống hiển thị đường dẫn Bộ truyện / Chương, các công đoạn vẽ và nút Nộp chuyển công đoạn.
 * - Bên trái: Sidebar công cụ (Kịch bản tham chiếu và Hồ sơ nhân vật & bối cảnh).
 * - Trung tâm: Bàn vẽ trang giấy trắng tỷ lệ chuẩn căn giữa màn hình.
 * - Cạnh đáy: Thanh quản lý trang nền trong suốt, căn giữa màn hình.
 */
export const ArtistDeskView: React.FC<ArtistDeskViewProps> = ({
  workspaceRole,
  initialScriptLines,
  initialBibleEntities,
}) => {
  const { workspaceId, seriesId, chapterId: chapterIdFromParam } = useParams<{
    workspaceId?: string;
    seriesId?: string;
    chapterId?: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const focusHeader = useFocusHeaderContext();

  const chapterIdFromUrl = chapterIdFromParam || searchParams.get('chapterId');
  const assignmentIdFromUrl = searchParams.get('assignmentId');

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
  const [chapterAssignments, setChapterAssignments] = useState<AssignmentDto[]>([]);

  // Dữ liệu thực tế từ Backend cho Kịch bản & Hồ sơ truyện
  const [rawScriptLines, setRawScriptLines] = useState<RawLoadedScriptLine[] | undefined>(
    initialScriptLines,
  );
  const [hasLoadedRealScript, setHasLoadedRealScript] = useState(false);
  const [panelsByPageId, setPanelsByPageId] = useState<Record<string, PanelDto[]>>({});
  const [panelPageMap, setPanelPageMap] = useState<
    Record<string, { pageNumber: number; panelNumber: number; sceneId?: string | null }>
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

  // Trạng thái chốt / khóa bố cục mẫu khung của từng trang (chốt mới được tải tranh)
  const [lockedTemplateByPageId, setLockedTemplateByPageId] = useState<Record<string, boolean>>({});
  // Tranh đã nạp vào từng khung của từng trang: pageId -> (panelId -> PanelArtworkData)
  const [panelArtworksByPageId, setPanelArtworksByPageId] = useState<
    Record<string, Record<string, PanelArtworkData>>
  >({});
  // Ảnh phác thảo toàn trang của từng trang (dành cho tính năng Tự động tách panel ở khâu Pencil)
  const [fullPageSketchesByPageId, setFullPageSketchesByPageId] = useState<
    Record<string, { imageUrl: string; fileName: string; isVisible: boolean }>
  >({});
  const [isDetectingPanels, setIsDetectingPanels] = useState(false);
  const sketchFileInputRef = useRef<HTMLInputElement | null>(null);
  // Modal xác nhận an toàn khi mở khóa đổi mẫu khung nếu đã có tranh
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);
  // Modal xem tranh phóng to
  const [previewArtwork, setPreviewArtwork] = useState<{ imageUrl: string; title: string } | null>(null);
  // Input file ref cho từng panel
  const panelFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Điều khiển Sidebar tab & ngăn phụ Drawer từ bên ngoài
  const [activeSidebarTab, setActiveSidebarTab] = useState<CanvaSidebarTab | undefined>(undefined);
  const [isSidebarDrawerOpen, setIsSidebarDrawerOpen] = useState<boolean | undefined>(undefined);

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
        const enabledSorted = [...pipeline.stages]
          .filter((s) => s.isEnabled !== false)
          .sort((a, b) => a.stageOrder - b.stageOrder);

        // Bố cục tranh không phải 1 stage mà nằm chung với Pencil.
        // Thanh header của Artist chuẩn hoá gồm đúng 3 trạng thái: Pencil -> Ink -> Letter
        const artistPencil = enabledSorted.find(
          (s) => getArtistStageKind(s) === 'pencil' || stageKindOf(s.name || '') === 'pencil',
        );
        const artistInk = enabledSorted.find(
          (s) => getArtistStageKind(s) === 'ink' || stageKindOf(s.name || '') === 'ink',
        );
        const artistLetter = enabledSorted.find(
          (s) =>
            getArtistStageKind(s) === 'lettering' ||
            stageKindOf(s.name || '') === 'letter' ||
            (s.name || '').toLowerCase().includes('dialogue') ||
            (s.name || '').toLowerCase().includes('thoại'),
        );

        const normalizedArtistStages: FocusStageItem[] = [
          {
            id: artistPencil?.id || 'stage-pencil',
            label: 'Pencil',
            key: 'pencil',
          },
          {
            id: artistInk?.id || 'stage-ink',
            label: 'Ink',
            key: 'ink',
          },
          {
            id: artistLetter?.id || 'stage-letter',
            label: 'Letter',
            key: 'lettering',
          },
        ];

        setArtistStages(normalizedArtistStages);
      })
      .catch(() => {
        // Giữ bộ công đoạn mặc định nếu chưa kết nối quy trình
      });

    return () => {
      alive = false;
    };
  }, [seriesId]);

  // Nạp công việc phân công của chương để đồng bộ công đoạn đang thực hiện
  useEffect(() => {
    let alive = true;
    if (!currentChapterId || !assignmentService?.getAssignments) return;

    assignmentService
      .getAssignments(currentChapterId)
      .then((list) => {
        if (!alive || !Array.isArray(list)) return;
        setChapterAssignments(list);

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
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [currentChapterId, assignmentIdFromUrl, artistStages]);

  // Tải danh sách trang từ API backend nếu có chapterId + ánh xạ panel -> trang để đồng bộ kịch bản
  const loadPages = useCallback(async (chapId: string) => {
    try {
      const fetched = await pageService.getPagesByChapter(chapId);
      if (Array.isArray(fetched) && fetched.length > 0) {
        const sortedPages = [...fetched].sort((a, b) => a.pageNumber - b.pageNumber);
        setPages(sortedPages);
        setSelectedPageId((prev) =>
          sortedPages.some((p) => p.id === prev) ? prev : sortedPages[0].id,
        );

        // Tải danh sách khung của từng trang để đồng bộ chính xác dòng kịch bản thuộc về trang & khung nào
        if (panelService?.getPanelsByPage) {
          const panelResults = await Promise.all(
            sortedPages.map((pg) =>
              panelService
                .getPanelsByPage(pg.id)
                .then((panels) => ({
                  pageId: pg.id,
                  pageNumber: pg.pageNumber,
                  panels: (panels || []).sort(
                    (a, b) => (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber),
                  ),
                }))
                .catch(() => ({ pageId: pg.id, pageNumber: pg.pageNumber, panels: [] })),
            ),
          );
          const nextMap: Record<string, { pageNumber: number; panelNumber: number }> = {};
          const nextPanelsByPage: Record<string, PanelDto[]> = {};
          const backendLockedMap: Record<string, boolean> = {};
          panelResults.forEach(({ pageId, pageNumber, panels }) => {
            if (panels && panels.length > 0) {
              nextPanelsByPage[pageId] = panels;
              backendLockedMap[pageId] = true;
              panels.forEach((pnl) => {
                nextMap[pnl.id] = {
                  pageNumber,
                  panelNumber: pnl.panelNumber || pnl.readingOrder || 1,
                };
              });
            }
          });
          setPanelsByPageId((prev) => ({ ...prev, ...nextPanelsByPage }));
          setPanelPageMap((prev) => ({ ...prev, ...nextMap }));
          setLockedTemplateByPageId((prev) => ({ ...prev, ...backendLockedMap }));
        }
      }
    } catch {
      // Giữ trang mặc định nếu chưa kết nối hoặc có lỗi
    }
  }, []);

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
        const combined: RawLoadedScriptLine[] = [];
        sceneDetails.forEach((detail, idx) => {
          const sc = sortedScenes[idx];
          const rawLines = detail?.scriptLines || [];
          const sortedLines = [...rawLines].sort((a, b) => (a.lineOrder ?? 0) - (b.lineOrder ?? 0));
          sortedLines.forEach((l: any) => {
            combined.push({
              id: l.id,
              panelNumber: l.panelNumber,
              pageNumber: l.pageNumber,
              sceneId: sc.id,
              sceneNumber: sc.sceneNumber,
              sceneTitle:
                detail?.heading ||
                detail?.sceneName ||
                sc.heading ||
                sc.sceneName ||
                `Phân cảnh ${sc.sceneNumber}`,
              sceneSlugline: detail?.slugline || sc.slugline || undefined,
              speakerCharacterId: l.speakerCharacterId,
              characterName: l.characterName,
              characterColor: l.characterColor,
              dialogueText: l.dialogueText ?? l.content ?? undefined,
              stageDirection: l.stageDirection ?? l.actionDescription ?? undefined,
              narrationMode: l.narrationMode || l.type,
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

  const currentChapterIdRef = useRef<string | null>(currentChapterId);
  currentChapterIdRef.current = currentChapterId;

  // Tải thông tin Bộ truyện & danh sách Chương (tự động chọn chương đầu tiên nếu URL chưa có chapterId)
  useEffect(() => {
    let alive = true;
    if (!seriesId) return;

    if (seriesService?.getSeriesById) {
      seriesService
        .getSeriesById(seriesId)
        .then((ser) => {
          if (alive && ser?.title) {
            setSeriesTitle(ser.title);
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

  useEffect(() => {
    if (currentChapterId) {
      loadPages(currentChapterId);
      loadScriptLines(currentChapterId);
    }
  }, [currentChapterId, loadPages, loadScriptLines]);

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

    setIsSubmittingStage(true);
    try {
      if (currentChapterId) {
        const matchingAssignment =
          (assignmentIdFromUrl
            ? chapterAssignments.find(
                (a) =>
                  a.id === assignmentIdFromUrl &&
                  a.pipelineStageId === currentStage.id,
              )
            : undefined) ||
          chapterAssignments.find((a) => {
            const st = String(a.status || '').toLowerCase();
            return (
              a.pipelineStageId === currentStage.id &&
              (st === 'assigned' || st === 'inprogress' || st === 'reworkrequired')
            );
          });

        if (matchingAssignment) {
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
                setChapterAssignments((prev) =>
                  prev.map((a) => (a.id === updated.id ? updated : a)),
                );
              }
            }
          } catch {
            // Không chặn luồng chuyển bước trên bàn vẽ nếu API phân công chưa sẵn sàng
          }
        }
      }

      if (currentStageIndex < artistStages.length - 1) {
        const nextIdx = currentStageIndex + 1;
        setCurrentStageIndex(nextIdx);
        toast.success(
          'Chuyển công đoạn thành công',
          `Đã hoàn tất "${currentStage.label}" và chuyển sang "${artistStages[nextIdx].label}".`,
        );
      } else {
        setIsStageFlowCompleted(true);
        toast.success(
          'Hoàn tất bản vẽ',
          `Đã nộp "${currentStage.label}" để chờ kiểm duyệt.`,
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
    assignmentIdFromUrl,
    chapterAssignments,
    toast,
  ]);

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

  // Đồng bộ thông tin Header lên FocusWorkspaceLayout (đường dẫn Series/Chương + công đoạn + nút Nộp)
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
    const charMap = new Map<string, { name: string; color: string }>();

    if (!hasLoadedRealBible) {
      return { bibleEntities: initialBibleEntities, characterById: charMap };
    }

    const adapted: BibleEntityItem[] = rawBibleEntries
      .filter((e) => e.isActive !== false)
      .map((e) => {
        const category = mapBibleCategory(e.category);
        const color = getDeterministicColor(e.id || e.name);
        if (category === 'character') {
          charMap.set(e.id, { name: e.name, color });
        }
        const { visualNotes, gallery } = extractBibleVisualDetails(e);
        const resolvedImage =
          e.referenceImageUrl ||
          e.effectiveRevision?.referenceImageUrl ||
          e.effectiveRevision?.conceptImageUrl ||
          undefined;

        return {
          id: e.id,
          code: e.code || `BE-${e.id.slice(0, 4)}`,
          name: e.name,
          subtitle: e.subtitle || undefined,
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

  // Tìm trang hiện tại đang được chọn
  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0] || null;

  // Đồng bộ các dòng kịch bản với Trang, Khung và Tên/Màu nhân vật từ Hồ sơ truyện
  const resolvedScriptLines = useMemo(() => {
    if (!hasLoadedRealScript && !initialScriptLines) return undefined;
    const source: RawLoadedScriptLine[] | undefined = rawScriptLines || initialScriptLines;
    if (!source) return undefined;

    const sceneToPageMap = new Map<string, number>();
    pages.forEach((p) => {
      if (p.sceneId && !sceneToPageMap.has(p.sceneId)) {
        sceneToPageMap.set(p.sceneId, p.pageNumber);
      }
    });

    return source.map((line): ScriptLineItem => {
      const fromPanel = line.panelId ? panelPageMap[line.panelId] : undefined;
      const resolvedPageNum =
        fromPanel?.pageNumber ??
        line.pageNumber ??
        (line.sceneId ? sceneToPageMap.get(line.sceneId) : undefined);
      const resolvedPanelNum = fromPanel?.panelNumber ?? line.panelNumber;

      const charInfo = line.speakerCharacterId
        ? characterById.get(line.speakerCharacterId)
        : undefined;
      const resolvedCharName = line.characterName || charInfo?.name;
      const resolvedCharColor =
        line.characterColor ||
        charInfo?.color ||
        (resolvedCharName ? getDeterministicColor(resolvedCharName) : undefined);

      return {
        ...line,
        pageNumber: resolvedPageNum,
        panelNumber: resolvedPanelNum,
        characterName: resolvedCharName,
        characterColor: resolvedCharColor,
      };
    });
  }, [
    hasLoadedRealScript,
    rawScriptLines,
    initialScriptLines,
    pages,
    panelPageMap,
    characterById,
  ]);

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
    if (current?.key === 'ink' || current?.key === 'lettering' || current?.key === 'completed') {
      return current.key;
    }
    return 'pencil';
  }, [isStageFlowCompleted, artistStages, currentStageIndex]);

  // Thao tác trang: Chọn trang
  const handleSelectPage = (page: PageDto) => {
    setSelectedPageId(page.id);
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

    setPages((prev) => [...prev, newPage]);
    setSelectedPageId(newPage.id);

    if (currentChapterId) {
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
        // Giữ lại trang mới ở trạng thái tạm thời
      }
    }
  };

  // Thao tác trang: Xóa trang
  const handleDeletePage = async (pageId: string) => {
    if (pages.length <= 1) return;
    const remaining = pages.filter((p) => p.id !== pageId);
    setPages(remaining);
    if (selectedPageId === pageId) {
      setSelectedPageId(remaining[0]?.id || null);
    }

    if (pageService.deletePage) {
      try {
        await pageService.deletePage(pageId);
      } catch {
        // Đã xóa trên giao diện
      }
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
  const currentTemplateId = selectedPage ? activeTemplateByPageId[selectedPage.id] || null : null;
  const currentSketch = useMemo(
    () => (selectedPage ? fullPageSketchesByPageId[selectedPage.id] || null : null),
    [selectedPage, fullPageSketchesByPageId],
  );

  const isCurrentPageLayoutLocked = Boolean(selectedPage && lockedTemplateByPageId[selectedPage.id]);
  const currentPageArtworks = useMemo(
    () => (selectedPage ? panelArtworksByPageId[selectedPage.id] || {} : {}),
    [selectedPage, panelArtworksByPageId],
  );
  const hasCurrentPageArtwork = Object.keys(currentPageArtworks).length > 0;
  const currentTemplate = useMemo(
    () =>
      frameTemplates.find((t) => t.id === currentTemplateId) ||
      DEFAULT_FRAME_TEMPLATES.find((t) => t.id === currentTemplateId) ||
      null,
    [frameTemplates, currentTemplateId],
  );

  // Lưu bố cục mẫu khung cho trang hiện tại (chuyển từ Draft -> Saved / Locked Artwork Phase)
  const handleSaveLayout = useCallback(async () => {
    if (!selectedPage) return;
    const targetPage = selectedPage;
    const templateId = activeTemplateByPageId[targetPage.id];
    const template =
      frameTemplates.find((t) => t.id === templateId) ||
      DEFAULT_FRAME_TEMPLATES.find((t) => t.id === templateId);

    setLockedTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: true }));

    if (
      templateId &&
      isGuid(targetPage.id) &&
      !templateId.startsWith('builtin-') &&
      frameTemplateService?.applyFrameTemplate
    ) {
      setIsApplyingTemplate(true);
      try {
        const createdPanels = await frameTemplateService.applyFrameTemplate(
          targetPage.id,
          templateId,
        );
        if (Array.isArray(createdPanels) && createdPanels.length > 0) {
          const sorted = [...createdPanels].sort(
            (a, b) => (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber),
          );
          setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: sorted }));
          setPanelPageMap((prev) => {
            const next = { ...prev };
            sorted.forEach((pnl) => {
              next[pnl.id] = {
                pageNumber: targetPage.pageNumber,
                panelNumber: pnl.panelNumber || pnl.readingOrder || 1,
                sceneId: pnl.sceneId,
              };
            });
            return next;
          });
          setPages((prev) =>
            prev.map((pg) =>
              pg.id === targetPage.id ? { ...pg, elementsCount: sorted.length } : pg,
            ),
          );
        }
      } catch (err: any) {
        setTemplateError(err?.message || 'Không thể lưu mẫu khung lên máy chủ.');
      } finally {
        setIsApplyingTemplate(false);
      }
    }

    toast.success(
      'Đã lưu bố cục trang',
      `Khung vẽ Trang #${targetPage.pageNumber} (${template?.name || 'Mẫu khung'}) đã sẵn sàng nhận ảnh. Bạn có thể nạp tranh vào từng ô.`,
    );
  }, [selectedPage, activeTemplateByPageId, frameTemplates, toast]);

  // Alias tương thích với các component và test cũ
  const handleLockLayout = handleSaveLayout;

  // Yêu cầu mở khóa để đổi mẫu khung (bảo vệ tránh mất tranh khi trang đã có bản vẽ)
  const handleRequestUnlockLayout = useCallback(() => {
    if (!selectedPage) return;
    if (!hasCurrentPageArtwork) {
      setLockedTemplateByPageId((prev) => ({ ...prev, [selectedPage.id]: false }));
      setActiveSidebarTab('templates');
      setIsSidebarDrawerOpen(true);
      toast.info('Chế độ bố cục nháp', 'Bạn có thể chọn mẫu khung mới cho trang.');
    } else {
      setIsUnlockConfirmOpen(true);
    }
  }, [selectedPage, hasCurrentPageArtwork, toast]);

  // Xác nhận mở khóa và gỡ tranh cũ
  const handleConfirmUnlockLayout = useCallback(() => {
    if (!selectedPage) return;
    setLockedTemplateByPageId((prev) => ({ ...prev, [selectedPage.id]: false }));
    setPanelArtworksByPageId((prev) => ({ ...prev, [selectedPage.id]: {} }));
    setIsUnlockConfirmOpen(false);
    setActiveSidebarTab('templates');
    setIsSidebarDrawerOpen(true);
    toast.warning(
      'Đã mở khóa bố cục',
      'Đã gỡ tranh tạm trên trang. Bạn có thể chọn mẫu khung mới.',
    );
  }, [selectedPage, toast]);

  // Nạp tranh vào ô khung
  const handleUploadPanelArtwork = useCallback(
    async (panelId: string, panelNum: number, file: File) => {
      if (!selectedPage) return;
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
        'Đã nạp tranh vào ô',
        `Tệp "${file.name}" đã được tải vào Khung #${panelNum}.`,
      );

      if (
        currentChapterId &&
        isGuid(selectedPage.id) &&
        isGuid(panelId) &&
        artworkService?.uploadArtwork
      ) {
        try {
          const currentStage = artistStages[currentStageIndex];
          const stageId = currentStage?.id && isGuid(currentStage.id) ? currentStage.id : undefined;
          await artworkService.uploadArtwork(
            currentChapterId,
            selectedPage.id,
            file,
            stageId,
            undefined,
            undefined,
            panelId,
          );
        } catch {
          // Tranh vẫn được lưu trong phiên vẽ hiện tại
        }
      }
    },
    [selectedPage, currentChapterId, artistStages, currentStageIndex, toast],
  );

  // Xóa tranh khỏi ô khung
  const handleRemovePanelArtwork = useCallback(
    (panelId: string, panelNum: number) => {
      if (!selectedPage) return;
      setPanelArtworksByPageId((prev) => {
        const pageArts = { ...(prev[selectedPage.id] || {}) };
        delete pageArts[panelId];
        return { ...prev, [selectedPage.id]: pageArts };
      });
      toast.info('Đã gỡ tranh', `Đã gỡ tranh khỏi Khung #${panelNum}.`);
    },
    [selectedPage, toast],
  );

  // Áp dụng mẫu khung tranh tham khảo vào TRANG HIỆN TẠI (chế độ nháp, chuyển đổi mượt mà)
  const handleSelectTemplate = (template: FrameTemplateDto) => {
    if (!selectedPage) return;
    const targetPage = selectedPage;

    // Nếu trang đã chốt bố cục VÀ đã có tranh thực tế: cảnh báo an toàn trước khi đổi
    if (lockedTemplateByPageId[targetPage.id] && hasCurrentPageArtwork) {
      handleRequestUnlockLayout();
      return;
    }

    setTemplateError(null);

    // Nếu trang đang ở trạng thái đã chốt nhưng chưa có tranh: cho phép đổi sang mẫu mới mượt mà
    if (lockedTemplateByPageId[targetPage.id]) {
      setLockedTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: false }));
    }

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

    setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: localPanels }));
    setActiveTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: template.id }));
    setPages((prev) =>
      prev.map((pg) =>
        pg.id === targetPage.id ? { ...pg, elementsCount: localPanels.length } : pg,
      ),
    );
  };

  // Xoá khung tham khảo của trang hiện tại (trở về giấy trắng)
  const handleClearTemplate = async () => {
    if (!selectedPage) return;
    const targetPage = selectedPage;
    const existingPanels = panelsByPageId[targetPage.id] || [];

    if (lockedTemplateByPageId[targetPage.id] && hasCurrentPageArtwork) {
      handleRequestUnlockLayout();
      return;
    }

    setTemplateError(null);
    setLockedTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: false }));
    setPanelArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: {} }));

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

    if (panelService?.deletePanel) {
      const realIds = existingPanels.map((p) => p.id).filter((id) => isGuid(id));
      if (realIds.length > 0) {
        await Promise.all(realIds.map((id) => panelService.deletePanel(id).catch(() => null)));
      }
    }
  };

  // Tải ảnh phác thảo toàn trang (Pencil Stage)
  const handleUploadFullPageSketch = (file: File) => {
    if (!selectedPage) return;
    const targetPage = selectedPage;
    const localUrl = URL.createObjectURL(file);

    setFullPageSketchesByPageId((prev) => ({
      ...prev,
      [targetPage.id]: {
        imageUrl: localUrl,
        fileName: file.name,
        isVisible: true,
      },
    }));

    toast.success(
      'Đã nạp ảnh phác thảo toàn trang',
      'Bấm "Tự động tách panel" để AI phân tích rãnh và sinh các ô tranh Manga.',
    );
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
    const targetPage = selectedPage;
    setFullPageSketchesByPageId((prev) => {
      const next = { ...prev };
      delete next[targetPage.id];
      return next;
    });
    toast.info('Đã gỡ ảnh phác thảo', 'Đã xóa bản phác thảo toàn trang.');
  };

  // Tự động tách panel từ ảnh phác thảo toàn trang (Chỉ nhận diện Panel, KHÔNG đụng đến thoại)
  const handleAutoDetectPanels = async () => {
    if (!selectedPage || !currentSketch) return;
    const targetPage = selectedPage;

    setIsDetectingPanels(true);
    setTemplateError(null);

    try {
      const detection = await detectPanelsFromSketchImage(currentSketch.imageUrl, {
        pageWidth: targetPage.widthPx || 1200,
        pageHeight: targetPage.heightPx || 1800,
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

      setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: detectedPanels }));
      setLockedTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: false }));
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

      toast.success(
        'Tách panel thành công!',
        `Đã nhận diện ${detectedPanels.length} ô khung theo chuẩn Manga RTL. Bấm "Lưu" để chốt bố cục.`,
      );
    } catch (err) {
      console.error('Lỗi nhận diện panel:', err);
      toast.error('Không thể tách panel', 'Vui lòng kiểm tra lại ảnh phác thảo hoặc chọn mẫu khung dựng sẵn.');
    } finally {
      setIsDetectingPanels(false);
    }
  };

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
      className='flex-1 basis-0 min-h-0 w-full h-full flex flex-col bg-[#F3F0E9] text-[#1C1917] overflow-hidden select-none relative animate-in fade-in duration-300'
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
          }}
          showFocusControls={false}
        />
      )}

      <div className='flex-1 min-h-0 w-full flex flex-row overflow-hidden relative'>
        {/* 1. SIDEBAR CÔNG CỤ HỌA SĨ (Kịch bản tham chiếu + Hồ sơ truyện) */}
        <ArtistCanvaSidebar
          pages={pages.map((p) => ({
            id: p.id,
            pageNumber: p.pageNumber,
            title: `Trang ${p.pageNumber}`,
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
          hidePagesTab={true}
          scriptLines={resolvedScriptLines}
          sceneTitle={firstSceneMeta.title}
          sceneSlugline={firstSceneMeta.slugline}
          chapterTitle={activeChapterTitle}
          chapters={chapters}
          selectedChapterId={currentChapterId}
          onSelectChapter={handleSelectChapter}
          isLoadingScript={isLoadingScript}
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
          isLayoutLocked={isCurrentPageLayoutLocked}
          onLockLayout={handleLockLayout}
          onUnlockLayout={handleRequestUnlockLayout}
          hasPageArtwork={hasCurrentPageArtwork}
          activeTab={activeSidebarTab}
          onTabChange={(tab) => setActiveSidebarTab(tab)}
          isDrawerOpen={isSidebarDrawerOpen}
          onToggleDrawer={(open) => setIsSidebarDrawerOpen(open)}
          theme='paper'
        />

        {/* 2. KHU VỰC LÀM VIỆC CHÍNH (TRANG GIẤY TRẮNG Ở TRÊN + QUẢN LÝ TRANG Ở DƯỚI) */}
        <div className='flex-1 min-h-0 min-w-0 h-full flex flex-col overflow-hidden relative'>
          <main
            className='relative flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center p-2 sm:p-3 md:p-4 overflow-hidden'
            data-testid='artist-canvas-shell'
          >
            <div
              className='w-full h-full flex items-center justify-center m-auto transition-transform duration-200 ease-out origin-center'
              style={{ transform: `scale(${zoomScale})` }}
            >
              {/* Khung định vị trang giấy Manga B5 và nút thao tác gắn liền trang giấy */}
              <div className='relative max-h-full max-w-full h-full w-auto aspect-[1/1.414] shrink-0 flex items-center justify-center'>
                {/* Trang giấy trắng chuẩn in ấn Manga B5 (tỷ lệ 1:1.414, đầy đủ vùng Bleed, Trim Line & Safe Zone) */}
                <div
                  key={selectedPageId || 'default'}
                  data-testid='artist-blank-sheet'
                  className='w-full h-full bg-white rounded-[2px] shadow-[0_4px_24px_rgba(0,0,0,0.06),0_12px_44px_rgba(0,0,0,0.08)] border border-stone-300/80 relative flex flex-col items-center justify-center p-0 overflow-hidden transition-all duration-300 ease-out animate-in fade-in zoom-in-98'
                >
                {/* Vùng vẽ trang giấy trắng - Khung toạ độ 1:1 chuẩn theo khổ trang */}
                <div
                  className='w-full h-full relative overflow-hidden bg-white'
                  data-testid='artist-canvas-surface'
                >
                  {/* 1. Đường viền xén Trim Line chuẩn in ấn (3mm ~ 1.8% từ mép tràn lề Bleed) */}
                  <div
                    className='absolute inset-[1.8%] border border-dashed border-stone-300/50 pointer-events-none z-10'
                    title='Đường xén thành phẩm (Trim Line - 3mm Bleed)'
                  />

                  {/* 2. Đường biên vùng an toàn nội dung (Safe Zone / Live Area: 0.375" từ vết xén) */}
                  <div
                    className='absolute top-[2.8%] bottom-[2.8%] left-[2.8%] right-[2.8%] border border-dotted border-stone-200/60 pointer-events-none z-10'
                    title='Vùng an toàn nội dung thoại & hình vẽ chính (Live Safe Area)'
                  />

                  {/* Dấu định vị xén (Crop Marks) 4 góc trang chuẩn in ấn tại Trim Line */}
                  <div className='absolute top-[1.8%] left-[1.8%] w-3 h-3 border-t border-l border-stone-400/80 pointer-events-none z-10' />
                  <div className='absolute top-[1.8%] right-[1.8%] w-3 h-3 border-t border-r border-stone-400/80 pointer-events-none z-10' />
                  <div className='absolute bottom-[1.8%] left-[1.8%] w-3 h-3 border-b border-l border-stone-400/80 pointer-events-none z-10' />
                  <div className='absolute bottom-[1.8%] right-[1.8%] w-3 h-3 border-b border-r border-stone-400/80 pointer-events-none z-10' />

                  {/* Lớp hiển thị ảnh phác thảo toàn trang (Pencil Stage Sketch Underlay) */}
                  {currentSketch && (
                    <img
                      src={currentSketch.imageUrl}
                      alt={currentSketch.fileName}
                      className='absolute inset-0 w-full h-full object-contain pointer-events-none z-5 select-none transition-opacity duration-300'
                      style={{ opacity: currentSketch.isVisible ? 0.5 : 0 }}
                    />
                  )}

                  {/* Nút Tách khung đơn giản ở góc phải trên sau khi tải ảnh phác thảo */}
                  {currentSketch && currentPagePanels.length === 0 && (
                    <div
                      data-testid='pencil-sketch-split-btn'
                      className='absolute top-3.5 right-3.5 z-30 pointer-events-auto'
                    >
                      <button
                        type='button'
                        onClick={handleAutoDetectPanels}
                        disabled={isDetectingPanels}
                        data-testid='btn-split-panels-simple'
                        className='px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors disabled:opacity-60'
                      >
                        {isDetectingPanels ? (
                          <>
                            <Loader2 className='w-3.5 h-3.5 animate-spin text-white' />
                            <span>Đang tách khung...</span>
                          </>
                        ) : (
                          <span>Tách khung</span>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Hiệu ứng quét Scanner khi đang tách panel */}
                  {isDetectingPanels && (
                    <div className='absolute inset-0 z-35 pointer-events-none overflow-hidden animate-in fade-in duration-150'>
                      <div className='w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_#f59e0b] animate-bounce' />
                      <div className='absolute inset-0 bg-stone-900/10 backdrop-blur-[0.5px] flex items-center justify-center'>
                        <div className='px-4 py-2 rounded-xl bg-stone-900/90 text-white text-xs font-semibold shadow-xl flex items-center gap-2 border border-amber-400/30'>
                          <Loader2 className='w-4 h-4 text-amber-400 animate-spin' />
                          <span>AI đang quét rãnh và tách các ô panel...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2 nút bấm thao tác trực tiếp trên trang giấy trắng */}
                  {currentPagePanels.length === 0 && !currentSketch && (
                    <div
                      data-testid='artist-blank-state-actions'
                      className='absolute inset-0 z-20 flex items-center justify-center pointer-events-auto'
                    >
                      <div className='flex items-center gap-3'>
                        <button
                          type='button'
                          onClick={() => sketchFileInputRef.current?.click()}
                          data-testid='btn-upload-sketch-simple'
                          className='px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95'
                        >
                          <Upload className='w-4 h-4' />
                          <span>Tải phác thảo</span>
                        </button>
                        <button
                          type='button'
                          onClick={() => {
                            setActiveSidebarTab('templates');
                            setIsSidebarDrawerOpen(true);
                          }}
                          data-testid='btn-open-templates-simple'
                          className='px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-sm font-bold flex items-center gap-2 shadow-2xs cursor-pointer transition-all hover:scale-105 active:scale-95'
                        >
                          <LayoutTemplate className='w-4 h-4 text-stone-600' />
                          <span>Chọn mẫu khung</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden File Input cho ảnh phác thảo toàn trang */}
                  <input
                    ref={sketchFileInputRef}
                    type='file'
                    accept='image/png,image/jpeg,image/webp'
                    className='hidden'
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleUploadFullPageSketch(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />

                  {/* Lớp hiển thị các khung Panel */}
                  {currentPagePanels.length > 0 && (
                    <div
                      data-testid='canvas-panel-template-overlay'
                      className='absolute inset-0 z-20 pointer-events-none'
                    >
                      {currentPagePanels.map((pnl, idx) => {
                        const box = parseBoundingBox(
                          pnl.boundingBox,
                          selectedPage?.widthPx || 1200,
                          selectedPage?.heightPx || 1800,
                        );
                        const panelNum = pnl.panelNumber || idx + 1;
                        const artwork = currentPageArtworks[pnl.id];
                        const hasCorners = Boolean(box.corners && box.corners.length >= 3);
                        // Nhận diện Inset Panel (Khung lồng) khi có khung nhỏ nằm đè lên khung lớn
                        const isInsetChild = Boolean(
                          (currentTemplate?.code === 'TPL-MANGA-06' && idx > 0) ||
                          (box.percentW < 50 && box.percentH < 50 && currentPagePanels.some((_, i) => i !== idx && parseBoundingBox(currentPagePanels[i].boundingBox, selectedPage?.widthPx || 1200, selectedPage?.heightPx || 1800).percentW > 80))
                        );

                        return (
                          <div
                            key={pnl.id}
                            data-testid={`canvas-panel-frame-${panelNum}`}
                            className={`absolute transition-all duration-200 overflow-hidden ${
                              isInsetChild ? 'z-30 shadow-md bg-white' : 'z-20'
                            } ${
                              hasCorners
                                ? ''
                                : box.borderless
                                  ? 'border-2 border-dashed border-orange-500/85 bg-orange-50/15'
                                  : isCurrentPageLayoutLocked
                                    ? isInsetChild
                                      ? 'border-2 border-stone-900 bg-white'
                                      : 'border-2 border-stone-900 bg-stone-50/20 shadow-2xs'
                                    : isInsetChild
                                      ? 'border-2 border-dashed border-stone-600 bg-white'
                                      : 'border-2 border-dashed border-stone-400/80 bg-stone-100/30'
                            } ${isCurrentPageLayoutLocked ? 'pointer-events-auto' : 'pointer-events-none'}`}
                            style={{
                              left: `${box.percentX}%`,
                              top: `${box.percentY}%`,
                              width: `${box.percentW}%`,
                              height: `${box.percentH}%`,
                              clipPath: hasCorners
                                ? `polygon(${box.corners!
                                    .map((c) => `${c.x * 100}% ${c.y * 100}%`)
                                    .join(', ')})`
                                : undefined,
                            }}
                          >
                            {/* Viền SVG stroke cho các khung cắt chéo (Slanted Polygon) */}
                            {hasCorners && (
                              <svg
                                className='absolute inset-0 w-full h-full pointer-events-none z-10'
                                viewBox='0 0 100 100'
                                preserveAspectRatio='none'
                              >
                                <polygon
                                  points={box.corners!.map((c) => `${c.x * 100},${c.y * 100}`).join(' ')}
                                  fill={
                                    isInsetChild
                                      ? '#ffffff'
                                      : isCurrentPageLayoutLocked
                                        ? 'rgba(250, 250, 249, 0.2)'
                                        : 'rgba(245, 245, 244, 0.3)'
                                  }
                                  stroke={
                                    box.borderless
                                      ? '#f97316'
                                      : isCurrentPageLayoutLocked
                                        ? '#1c1917'
                                        : '#78716c'
                                  }
                                  strokeWidth={isCurrentPageLayoutLocked ? '2.5' : '2'}
                                  strokeDasharray={
                                    box.borderless || !isCurrentPageLayoutLocked ? '6 4' : undefined
                                  }
                                  vectorEffect='non-scaling-stroke'
                                />
                              </svg>
                            )}

                            {/* Số thứ tự đọc Manga */}
                            <span className='absolute top-1 left-1.5 z-20 px-1 py-0.2 rounded text-[10px] font-mono font-bold bg-white/95 text-stone-800 border border-stone-300/80 shadow-2xs'>
                              #{panelNum}
                            </span>

                            {/* Nếu ĐÃ CHỐT BỐ CỤC: Cho phép hiển thị / nạp tranh */}
                            {isCurrentPageLayoutLocked ? (
                              artwork ? (
                                <div className='relative w-full h-full group'>
                                  <img
                                    src={artwork.imageUrl}
                                    alt={artwork.fileName}
                                    className='w-full h-full object-cover select-none'
                                  />
                                  {/* Thanh công cụ khi hover vào khung có tranh */}
                                  <div className='absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2'>
                                    <button
                                      type='button'
                                      onClick={() =>
                                        setPreviewArtwork({
                                          imageUrl: artwork.imageUrl,
                                          title: `Khung #${panelNum} - ${artwork.fileName}`,
                                        })
                                      }
                                      data-testid={`panel-btn-view-${panelNum}`}
                                      className='p-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-800 shadow-sm cursor-pointer transition-transform hover:scale-105'
                                      title='Xem phóng to tranh'
                                    >
                                      <Eye className='w-4 h-4' />
                                    </button>
                                    <button
                                      type='button'
                                      onClick={() => panelFileInputRefs.current[pnl.id]?.click()}
                                      data-testid={`panel-btn-replace-${panelNum}`}
                                      className='p-1.5 rounded-lg bg-white/90 hover:bg-white text-stone-800 shadow-sm cursor-pointer transition-transform hover:scale-105'
                                      title='Thay đổi ảnh'
                                    >
                                      <UploadCloud className='w-4 h-4' />
                                    </button>
                                    <button
                                      type='button'
                                      onClick={() => handleRemovePanelArtwork(pnl.id, panelNum)}
                                      data-testid={`panel-btn-remove-${panelNum}`}
                                      className='p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-sm cursor-pointer transition-transform hover:scale-105'
                                      title='Gỡ tranh'
                                    >
                                      <Trash2 className='w-4 h-4' />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                      handleUploadPanelArtwork(pnl.id, panelNum, e.dataTransfer.files[0]);
                                    }
                                  }}
                                  onClick={() => panelFileInputRefs.current[pnl.id]?.click()}
                                  data-testid={`panel-dropzone-${panelNum}`}
                                  className='w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-50/50 cursor-pointer transition-all border border-dashed border-stone-300 hover:border-stone-500 rounded-xs'
                                >
                                  <div className='p-2 rounded-full bg-white/80 border border-stone-200/80 shadow-2xs'>
                                    <ImagePlus className='w-4 h-4 text-stone-600' />
                                  </div>
                                  <span className='text-[10.5px] font-semibold'>+ Nạp tranh Khung #{panelNum}</span>
                                  <span className='text-[9px] text-stone-400'>Kéo thả hoặc nhấn để chọn</span>
                                </div>
                              )
                            ) : (
                              /* Chưa lưu bố cục: Không cho tải ảnh */
                              <div className='w-full h-full flex items-center justify-center p-2 select-none pointer-events-none' />
                            )}

                            {/* Hidden File Input cho từng khung */}
                            <input
                              type='file'
                              ref={(el) => {
                                panelFileInputRefs.current[pnl.id] = el;
                              }}
                              accept='image/png,image/jpeg,image/webp'
                              className='hidden'
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleUploadPanelArtwork(pnl.id, panelNum, e.target.files[0]);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Nút LƯU phong cách Lucian UX/UI: Đặt bên phải dưới ngay bên cạnh / góc trang giấy, sau khi lưu thì tắt nút */}
              {currentPagePanels.length > 0 && !isCurrentPageLayoutLocked && (
                <div
                  data-testid='canvas-bottom-layout-bar'
                  className='absolute bottom-3 right-3 z-30 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto'
                >
                  <button
                    type='button'
                    onClick={handleSaveLayout}
                    disabled={isApplyingTemplate}
                    data-testid='canvas-btn-save-layout'
                    data-btn-lock-alias='canvas-btn-lock-layout'
                    aria-label='Lưu bố cục'
                    className='group relative inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-stone-900 hover:bg-black text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-xs font-bold tracking-wide shadow-[0_8px_20px_-4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] border border-white/20 dark:border-black/15 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60'
                  >
                    {isApplyingTemplate ? (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <Check className='w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 transition-transform group-hover:scale-110' />
                    )}
                    <span>Lưu</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

          {/* THANH QUẢN LÝ TRANG Ở ĐÁY MÀN HÌNH */}
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
            canEdit={true}
          />
        </div>
      </div>

      {/* Modal Xác nhận An toàn khi Mở khóa đổi mẫu khung nếu đã có tranh */}
      {isUnlockConfirmOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4'>
          <div
            data-testid='modal-unlock-layout-confirm'
            className='w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95'
          >
            <div className='flex items-start gap-3'>
              <div className='p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0'>
                <AlertTriangle className='w-5 h-5' />
              </div>
              <div className='space-y-1'>
                <h3 className='text-sm font-bold text-stone-900 dark:text-stone-100'>
                  Mở khóa đổi mẫu khung trang?
                </h3>
                <p className='text-xs text-stone-500 dark:text-stone-400 leading-relaxed'>
                  Trang này hiện đang chứa bản vẽ trong các khung hình. Việc mở khóa và chọn mẫu khung khác có thể làm thay đổi tỷ lệ hoặc gỡ bỏ các bản vẽ hiện tại.
                </p>
              </div>
            </div>

            <div className='p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-300'>
              Bấm <strong className='text-rose-600 dark:text-rose-400'>Xác nhận mở khóa</strong> sẽ gỡ tranh tạm trên trang và đưa trang về chế độ chọn bố cục nháp.
            </div>

            <div className='flex items-center justify-end gap-2 pt-1'>
              <button
                type='button'
                onClick={() => setIsUnlockConfirmOpen(false)}
                data-testid='btn-cancel-unlock'
                className='px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer transition-colors'
              >
                Hủy bỏ (Giữ nguyên)
              </button>
              <button
                type='button'
                onClick={handleConfirmUnlockLayout}
                data-testid='btn-confirm-unlock'
                className='px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all'
              >
                Xác nhận mở khóa & Gỡ tranh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xem Phóng to Tranh */}
      {previewArtwork && (
        <div
          onClick={() => setPreviewArtwork(null)}
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-zoom-out'
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className='relative max-w-4xl max-h-[90vh] bg-stone-900 rounded-xl overflow-hidden border border-stone-700 shadow-2xl flex flex-col'
          >
            <div className='flex items-center justify-between px-4 py-2 bg-stone-900/90 border-b border-stone-800 text-stone-200 text-xs font-medium'>
              <span>{previewArtwork.title}</span>
              <button
                type='button'
                onClick={() => setPreviewArtwork(null)}
                className='p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <div className='p-2 flex items-center justify-center overflow-auto'>
              <img
                src={previewArtwork.imageUrl}
                alt={previewArtwork.title}
                className='max-w-full max-h-[80vh] object-contain rounded'
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistDeskView;
