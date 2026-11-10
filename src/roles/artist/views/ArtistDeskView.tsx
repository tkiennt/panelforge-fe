import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { pageService, PageDto, isGuid } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { frameTemplateService, FrameTemplateDto } from '@/services/frameTemplate.service';
import { PanelDto } from '@/types/pipeline';
import { parseBoundingBox } from '../utils/panelBoundingBox';
import {
  ArtistCanvaSidebar,
  ScriptLineItem,
  BibleEntityItem,
  DEFAULT_FRAME_TEMPLATES,
} from '../components/desk/ArtistCanvaSidebar';
import { ArtistBottomPageStrip } from '../components/desk/ArtistBottomPageStrip';

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
  if (s.includes('char') || s === '0' || s === '1') return 'Nhân vật Canon';
  if (s.includes('loc') || s === '2') return 'Bối cảnh Canon';
  if (s.includes('style') || s === '4') return 'Quy tắc mỹ thuật';
  if (s.includes('prop') || s === '2' || s === '3') return 'Đạo cụ & Thuật ngữ';
  return 'Lore / Quy tắc';
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
 * ArtistDeskView - Canva-Style Manga Workspace
 * - Bên trái: Sidebar công cụ Artist (ArtistCanvaSidebar) chứa 2 tab chuyên dụng: Script (Kịch bản) và Series Bible.
 * - Trung tâm: Bàn vẽ trang giấy trắng Manga B5 căn giữa màn hình tuyệt đối, đổ bóng tự nhiên.
 * - Cạnh đáy: Thanh quản lý trang kiểu Canva (ArtistBottomPageStrip) nền trong suốt, căn giữa màn hình.
 */
export const ArtistDeskView: React.FC<ArtistDeskViewProps> = ({
  workspaceRole,
  initialScriptLines,
  initialBibleEntities,
}) => {
  const { workspaceId, seriesId } = useParams<{ workspaceId?: string; seriesId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const chapterIdFromUrl = searchParams.get('chapterId');

  const [currentChapterId, setCurrentChapterId] = useState<string | null>(chapterIdFromUrl);
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [seriesTitle, setSeriesTitle] = useState<string | undefined>(undefined);
  const [pages, setPages] = useState<PageDto[]>(DEFAULT_INITIAL_PAGES);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(DEFAULT_INITIAL_PAGES[0].id);

  // Dữ liệu thực tế từ Backend cho Script & Series Bible
  const [rawScriptLines, setRawScriptLines] = useState<RawLoadedScriptLine[] | undefined>(
    initialScriptLines,
  );
  const [hasLoadedRealScript, setHasLoadedRealScript] = useState(false);
  const [panelsByPageId, setPanelsByPageId] = useState<Record<string, PanelDto[]>>({});
  const [panelPageMap, setPanelPageMap] = useState<
    Record<string, { pageNumber: number; panelNumber: number; sceneId?: string | null }>
  >({});
  const [panelScenePagesMap, setPanelScenePagesMap] = useState<Record<string, number[]>>({});
  const [rawBibleEntries, setRawBibleEntries] = useState<BibleEntryDto[]>([]);
  const [hasLoadedRealBible, setHasLoadedRealBible] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [isLoadingBible, setIsLoadingBible] = useState(false);

  // Dữ liệu & trạng thái Panel Templates theo từng trang
  const [frameTemplates, setFrameTemplates] = useState<FrameTemplateDto[]>(DEFAULT_FRAME_TEMPLATES);
  const [activeTemplateByPageId, setActiveTemplateByPageId] = useState<Record<string, string>>({});
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  // Điều khiển thanh trang & canvas
  const [isFilmstripOpen, setIsFilmstripOpen] = useState(true);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

        // Tải danh sách panel của từng trang để đồng bộ chính xác script line & hiển thị khung trang hiện tại
        if (panelService?.getPanelsByPage) {
          const panelResults = await Promise.all(
            sortedPages.map((pg) =>
              panelService
                .getPanelsByPage(pg.id)
                .then((panels) => ({
                  pageId: pg.id,
                  pageNumber: pg.pageNumber,
                  panels: (panels || []).sort((a, b) => (a.readingOrder || a.panelNumber) - (b.readingOrder || b.panelNumber)),
                }))
                .catch(() => ({ pageId: pg.id, pageNumber: pg.pageNumber, panels: [] })),
            ),
          );
          const nextMap: Record<
            string,
            { pageNumber: number; panelNumber: number; sceneId?: string | null }
          > = {};
          const nextScenePages: Record<string, Set<number>> = {};
          const nextPanelsByPage: Record<string, PanelDto[]> = {};

          panelResults.forEach(({ pageId, pageNumber, panels }) => {
            nextPanelsByPage[pageId] = panels;
            panels.forEach((pnl) => {
              nextMap[pnl.id] = {
                pageNumber,
                panelNumber: pnl.panelNumber || pnl.readingOrder || 1,
                sceneId: pnl.sceneId,
              };
              if (pnl.sceneId) {
                if (!nextScenePages[pnl.sceneId]) nextScenePages[pnl.sceneId] = new Set();
                nextScenePages[pnl.sceneId].add(pageNumber);
              }
            });
          });
          setPanelsByPageId((prev) => ({ ...prev, ...nextPanelsByPage }));
          setPanelPageMap(nextMap);
          const normalizedScenePages: Record<string, number[]> = {};
          Object.entries(nextScenePages).forEach(([sId, set]) => {
            normalizedScenePages[sId] = Array.from(set).sort((a, b) => a - b);
          });
          setPanelScenePagesMap(normalizedScenePages);
        }
      }
    } catch {
      // Giữ trang mặc định nếu chưa kết nối hoặc có lỗi
    }
  }, []);

  // Tải dữ liệu kịch bản thực tế của chapter qua danh sách phân cảnh (sắp xếp theo thứ tự cảnh & dòng)
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

  // Tải dữ liệu Series Bible thực tế của Series
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

  // Tải thông tin Series & danh sách Chương (tự động chọn chương đầu tiên nếu URL chưa có chapterId)
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
          if (!currentChapterId && sortedChapters.length > 0) {
            const firstId = sortedChapters[0].id;
            setCurrentChapterId(firstId);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('chapterId', firstId);
              return next;
            });
          }
        })
        .catch(() => {});
    }

    return () => {
      alive = false;
    };
  }, [seriesId, currentChapterId, setSearchParams]);

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

  // Tải danh sách Mẫu Khung (Frame Templates) từ Workspace (fallback sang mẫu B5 dựng sẵn khi offline)
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

  // Chuyển đổi ChapterDto đang chọn -> tiêu đề chương hiển thị trên Sidebar Script
  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === currentChapterId) || null,
    [chapters, currentChapterId],
  );
  const activeChapterTitle = useMemo(() => {
    if (!activeChapter) return undefined;
    return `Chương ${activeChapter.chapterNumber}${activeChapter.title ? `: ${activeChapter.title}` : ''}`;
  }, [activeChapter]);

  const handleSelectChapter = useCallback(
    (chapId: string) => {
      setCurrentChapterId(chapId);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('chapterId', chapId);
        return next;
      });
    },
    [setSearchParams],
  );

  // Chuyển đổi danh sách Series Bible thực tế + bản đồ tra cứu tên nhân vật cho Script
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

  // Đồng bộ script lines với Trang, Panel và Tên/Màu nhân vật từ Series Bible
  const resolvedScriptLines = useMemo(() => {
    if (!hasLoadedRealScript && !initialScriptLines) return undefined;
    const source: RawLoadedScriptLine[] | undefined = rawScriptLines || initialScriptLines;
    if (!source) return undefined;

    // Thu thập danh sách tất cả các trang thuộc từng phân cảnh (từ page.sceneId và panel.sceneId)
    const sceneToPagesMap = new Map<string, number[]>();
    const addScenePage = (sId: string, pageNum: number) => {
      const list = sceneToPagesMap.get(sId) || [];
      if (!list.includes(pageNum)) {
        list.push(pageNum);
        list.sort((a, b) => a - b);
        sceneToPagesMap.set(sId, list);
      }
    };
    pages.forEach((p) => {
      if (p.sceneId) addScenePage(p.sceneId, p.pageNumber);
    });
    Object.entries(panelScenePagesMap).forEach(([sId, pageNums]) => {
      pageNums.forEach((pNum) => addScenePage(sId, pNum));
    });

    // Đếm tổng số dòng trong từng scene chưa có panelId để chia đều sang các trang thuộc cùng scene đó
    const unpaneledLinesByScene = new Map<string, string[]>();
    source.forEach((line) => {
      const hasPanel = Boolean(line.panelId && panelPageMap[line.panelId]);
      if (!hasPanel && !line.pageNumber && line.sceneId) {
        const arr = unpaneledLinesByScene.get(line.sceneId) || [];
        arr.push(line.id);
        unpaneledLinesByScene.set(line.sceneId, arr);
      }
    });

    return source.map((line): ScriptLineItem => {
      const fromPanel = line.panelId ? panelPageMap[line.panelId] : undefined;
      let sceneFallbackPage: number | undefined;
      if (!fromPanel && !line.pageNumber && line.sceneId) {
        const scenePages = sceneToPagesMap.get(line.sceneId);
        if (scenePages && scenePages.length > 0) {
          if (scenePages.length === 1) {
            sceneFallbackPage = scenePages[0];
          } else {
            const idsInScene = unpaneledLinesByScene.get(line.sceneId) || [];
            const idx = Math.max(0, idsInScene.indexOf(line.id));
            const bucket = Math.min(
              scenePages.length - 1,
              Math.floor((idx * scenePages.length) / Math.max(1, idsInScene.length)),
            );
            sceneFallbackPage = scenePages[bucket];
          }
        }
      }

      const resolvedPageNum = fromPanel?.pageNumber ?? line.pageNumber ?? sceneFallbackPage;
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
    panelScenePagesMap,
    characterById,
  ]);

  const firstSceneMeta = useMemo(() => {
    const first = resolvedScriptLines?.find((l) => l.sceneTitle || l.sceneSlugline);
    return {
      title: first?.sceneTitle || (activeChapterTitle ? activeChapterTitle : undefined),
      slugline: first?.sceneSlugline || undefined,
    };
  }, [resolvedScriptLines, activeChapterTitle]);

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
        // Giữ lại newPage ở state local
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
        // Đã xóa trên local
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

  // Áp dụng mẫu khung tranh tham khảo vào TRANG HIỆN TẠI (effective immediately on selectedPage)
  const handleSelectTemplate = async (template: FrameTemplateDto) => {
    if (!selectedPage) return;
    const targetPage = selectedPage;
    setTemplateError(null);

    // Tạo danh sách panel tham khảo tức thì từ slots của template
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

    // Đồng bộ với Backend API nếu trang là GUID thật & template từ backend (không phải builtin fallback)
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
      const realIds = existingPanels
        .map((p) => p.id)
        .filter((id) => isGuid(id));
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
      className='flex-1 basis-0 min-h-0 w-full h-full flex flex-row bg-[#F3F0E9] text-[#1C1917] overflow-hidden select-none relative animate-in fade-in duration-300'
      data-testid='artist-desk'
    >
      {/* 1. SIDEBAR CÔNG CỤ ARTIST (Kịch bản Script + Series Bible + Mẫu Khung) */}
      <ArtistCanvaSidebar
        pages={pages.map((p) => ({
          id: p.id,
          pageNumber: p.pageNumber,
          title: `Trang ${p.pageNumber}`,
          stage: 'pencil',
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

      {/* 2. KHU VỰC LÀM VIỆC CHÍNH (CANVAS TRANG GIẤY TRẮNG Ở TRÊN + QUẢN LÝ TRANG CANVA Ở DƯỚI) */}
      <div className='flex-1 min-h-0 min-w-0 h-full flex flex-col overflow-hidden relative'>
        {/* KHU VỰC BÀN VẼ CHÍNH (CANVAS WORKSPACE) - Căn giữa màn hình, giữ màu nền workspace #F3F0E9 */}
        <main
          className='relative flex-1 min-h-0 min-w-0 w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden'
          data-testid='artist-canvas-shell'
        >
          {/* Wrapper phóng to/thu nhỏ canvas theo slider - Căn giữa tự nhiên */}
          <div
            className='w-full h-full flex items-center justify-center m-auto transition-transform duration-200 ease-out origin-center'
            style={{ transform: `scale(${zoomScale})` }}
          >
            {/* Trang giấy trắng tự nhiên (Chuẩn tỷ lệ Manga B5 1:1.414, hiệu ứng đổ bóng tự nhiên, mở lên mượt mà) */}
            <div
              key={selectedPageId || 'default'}
              data-testid='artist-blank-sheet'
              className='max-h-full max-w-full h-full w-auto aspect-[1/1.414] bg-white rounded-[3px] shadow-[0_4px_16px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.07)] border border-stone-200/90 relative flex flex-col items-center justify-center p-6 sm:p-8 transition-all duration-300 ease-out shrink-0 animate-in fade-in zoom-in-98'
            >
              {/* Vùng vẽ trang giấy trắng tự nhiên */}
              <div
                className='w-full h-full border border-dashed border-stone-200/70 rounded-[2px] flex flex-col items-center justify-center relative overflow-hidden'
                data-testid='artist-canvas-surface'
              >
                {/* Dấu định vị 4 góc vẽ (Crop marks tinh tế, thanh thoát) */}
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

        {/* THANH QUẢN LÝ TRANG Ở ĐÁY MÀN HÌNH - BACKGROUND TRONG SUỐT & CĂN GIỮA MÀN HÌNH TUYỆT ĐỐI */}
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
  );
};

export default ArtistDeskView;
