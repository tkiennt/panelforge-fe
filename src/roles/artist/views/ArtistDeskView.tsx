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
import { PanelDto } from '@/types/pipeline';
import { parseBoundingBox } from '../utils/panelBoundingBox';
import { useToast } from '@/shared/context/ToastContext';
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
  { id: 'stage-pencil', label: 'Vẽ chì', key: 'pencil' },
  { id: 'stage-ink', label: 'Đi nét mực', key: 'ink' },
  { id: 'stage-finish', label: 'Hoàn thiện tranh', key: 'completed' },
];

function localizeArtistStageLabel(stage: Pick<PipelineStageDto, 'name' | 'slug'>): string {
  const kind = getArtistStageKind(stage);
  if (kind === 'pencil') return 'Vẽ chì';
  if (kind === 'ink') return 'Đi nét mực';
  if (kind === 'lettering') return 'Chèn thoại';

  const boardKind = stageKindOf(stage.name || '');
  if (boardKind === 'thumbnail') return 'Bố cục khung';
  if (boardKind === 'color') return 'Hoàn thiện tranh';
  if (boardKind === 'script') return 'Kịch bản';

  const cleaned = (stage.name || '').replace(/\s*\([A-Za-z0-9\s/-]+\)\s*/g, '').trim();
  return cleaned || 'Thực hiện';
}

function resolveStageKey(stage: Pick<PipelineStageDto, 'name' | 'slug'>): PageStage {
  const kind = getArtistStageKind(stage);
  if (kind === 'ink') return 'ink';
  if (kind === 'lettering') return 'lettering';
  if (stageKindOf(stage.name || '') === 'color') return 'completed';
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

        const filteredArtist = enabledSorted.filter((s) => {
          if (s.allowedRole === 'Artist') return true;
          const bKind = stageKindOf(s.name || '');
          const aKind = getArtistStageKind(s);
          return (
            aKind === 'pencil' ||
            aKind === 'ink' ||
            bKind === 'thumbnail' ||
            bKind === 'pencil' ||
            bKind === 'ink' ||
            bKind === 'color'
          );
        });

        if (filteredArtist.length > 0) {
          setArtistStages(
            filteredArtist.map((s) => ({
              id: s.id,
              label: localizeArtistStageLabel(s),
              key: resolveStageKey(s),
            })),
          );
        }
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
          panelResults.forEach(({ pageId, pageNumber, panels }) => {
            nextPanelsByPage[pageId] = panels;
            panels.forEach((pnl) => {
              nextMap[pnl.id] = {
                pageNumber,
                panelNumber: pnl.panelNumber || pnl.readingOrder || 1,
              };
            });
          });
          setPanelsByPageId((prev) => ({ ...prev, ...nextPanelsByPage }));
          setPanelPageMap(nextMap);
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
          if (!chapterIdFromUrl && !currentChapterId && sortedChapters.length > 0) {
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
  }, [seriesId, chapterIdFromUrl, currentChapterId, setSearchParams]);

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
      return getRoleDefaultPath(workspaceRole || 'ARTIST', workspaceId, seriesId);
    }
    return workspaceId ? `/workspaces/${workspaceId}/series` : '/workspaces';
  }, [workspaceId, seriesId, workspaceRole]);

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

  // Áp dụng mẫu khung tranh tham khảo vào TRANG HIỆN TẠI
  const handleSelectTemplate = async (template: FrameTemplateDto) => {
    if (!selectedPage) return;
    const targetPage = selectedPage;
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

    setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: localPanels }));
    setActiveTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: template.id }));
    setPages((prev) =>
      prev.map((pg) =>
        pg.id === targetPage.id ? { ...pg, elementsCount: localPanels.length } : pg,
      ),
    );

    if (
      isGuid(targetPage.id) &&
      !template.id.startsWith('builtin-') &&
      frameTemplateService?.applyFrameTemplate
    ) {
      setIsApplyingTemplate(true);
      try {
        const createdPanels = await frameTemplateService.applyFrameTemplate(
          targetPage.id,
          template.id,
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
  };

  // Xoá khung tham khảo của trang hiện tại (trở về giấy trắng)
  const handleClearTemplate = async () => {
    if (!selectedPage) return;
    const targetPage = selectedPage;
    const existingPanels = panelsByPageId[targetPage.id] || [];
    setTemplateError(null);

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
          theme='paper'
        />

        {/* 2. KHU VỰC LÀM VIỆC CHÍNH (TRANG GIẤY TRẮNG Ở TRÊN + QUẢN LÝ TRANG Ở DƯỚI) */}
        <div className='flex-1 min-h-0 min-w-0 h-full flex flex-col overflow-hidden relative'>
          <main
            className='relative flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden'
            data-testid='artist-canvas-shell'
          >
            <div
              className='w-full h-full flex items-center justify-center m-auto transition-transform duration-200 ease-out origin-center'
              style={{ transform: `scale(${zoomScale})` }}
            >
              {/* Trang giấy trắng tự nhiên chuẩn tỷ lệ 1:1.414 */}
              <div
                key={selectedPageId || 'default'}
                data-testid='artist-blank-sheet'
                className='max-h-full max-w-full h-full w-auto aspect-[1/1.414] bg-white rounded-[3px] shadow-[0_4px_16px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.07)] border border-stone-200/90 relative flex flex-col items-center justify-center p-6 sm:p-8 transition-all duration-300 ease-out shrink-0 animate-in fade-in zoom-in-98'
              >
                {/* Vùng vẽ trang giấy trắng */}
                <div
                  className='w-full h-full border border-dashed border-stone-200/70 rounded-[2px] flex flex-col items-center justify-center relative overflow-hidden'
                  data-testid='artist-canvas-surface'
                >
                  {/* Dấu định vị 4 góc trang */}
                  <div className='absolute top-2.5 left-2.5 w-3 h-3 border-t border-l border-stone-300/80 pointer-events-none' />
                  <div className='absolute top-2.5 right-2.5 w-3 h-3 border-t border-r border-stone-300/80 pointer-events-none' />
                  <div className='absolute bottom-2.5 left-2.5 w-3 h-3 border-b border-l border-stone-300/80 pointer-events-none' />
                  <div className='absolute bottom-2.5 right-2.5 w-3 h-3 border-b border-r border-stone-300/80 pointer-events-none' />

                  {/* Lớp hiển thị các khung Panel tham khảo của trang hiện tại (khi đã chọn mẫu khung) */}
                  {currentPagePanels.length > 0 && (
                    <div
                      data-testid='canvas-panel-template-overlay'
                      className='absolute inset-2 pointer-events-none'
                    >
                      {currentPagePanels.map((pnl, idx) => {
                        const box = parseBoundingBox(
                          pnl.boundingBox,
                          selectedPage?.widthPx || 1200,
                          selectedPage?.heightPx || 1800,
                        );
                        const panelNum = pnl.panelNumber || idx + 1;
                        return (
                          <div
                            key={pnl.id}
                            data-testid={`canvas-panel-frame-${panelNum}`}
                            className={`absolute transition-all duration-200 ${
                              box.borderless
                                ? 'border border-dashed border-orange-500/75 bg-orange-50/15'
                                : 'border-[1.5px] border-stone-800/80 bg-stone-50/20'
                            }`}
                            style={{
                              left: `${box.percentX}%`,
                              top: `${box.percentY}%`,
                              width: `${box.percentW}%`,
                              height: `${box.percentH}%`,
                              clipPath: box.corners?.length
                                ? `polygon(${box.corners
                                    .map((c) => `${c.x * 100}% ${c.y * 100}%`)
                                    .join(', ')})`
                                : undefined,
                            }}
                          >
                            <span className='absolute top-1 left-1.5 px-1 py-0.2 rounded text-[10px] font-mono font-bold bg-white/90 text-stone-700 border border-stone-300/80 shadow-2xs'>
                              #{panelNum}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
    </div>
  );
};

export default ArtistDeskView;
