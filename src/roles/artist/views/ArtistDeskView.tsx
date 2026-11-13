import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { pageService, PageDto, PageHistoryDto, isGuid } from '@/services/page.service';
import { panelService } from '@/services/panel.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { bibleService, BibleEntryDto } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { assignmentService, AssignmentDto } from '@/services/assignment.service';
import { frameTemplateService, FrameTemplateDto } from '@/services/frameTemplate.service';
import { artworkService } from '@/services/artwork.service';
import { PanelDto, ChangeRequestDto } from '@/types/pipeline';
import { parseBoundingBox } from '../utils/panelBoundingBox';
import { useToast } from '@/shared/context/ToastContext';
import { detectPanelsFromSketchImage, cropImageByBoundingBox } from '../lib/panelDetection';
import { getRoleDefaultPath } from '@/roles/roles';
import {
  formatChapterLabel,
  stageKindOf,
} from '@/shared/features/pipeline-board/productionBoard.utils';
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
} from '../components/desk/ArtistCanvaSidebar';
import { ArtistBottomPageStrip } from '../components/desk/ArtistBottomPageStrip';
import { PageStage } from '../components/desk/ArtistPageSidebar';
import { ArtistCanvasViewport, type PageSketch } from '../components/desk/ArtistCanvasViewport';
import { PanelFrameOverlay, type PanelArtworkData } from '../components/desk/PanelFrameOverlay';
import { LetteringBalloonOverlay } from '../components/desk/LetteringBalloonOverlay';
import { ArtworkPreviewDialog, UnlockLayoutDialog } from '../components/desk/ArtistDeskDialogs';
import { useLetteringBalloons } from '../hooks/useLetteringBalloons';
import {
  DEFAULT_ARTIST_STAGES,
  DEFAULT_INITIAL_PAGES,
  extractBibleVisualDetails,
  getBibleCategoryTag,
  getDeterministicColor,
  localizeArtistStageLabel,
  mapBibleCategory,
  resolveStageKey,
} from '../lib/artistDeskHelpers';
import { resolveChangeRequestLocation } from '../utils/changeRequestLocation';

export type { PanelArtworkData };

export interface ArtistDeskViewProps {
  workspaceRole?: string | null;
  initialScriptLines?: ScriptLineItem[];
  initialBibleEntities?: BibleEntityItem[];
  initialSidebarTab?: CanvaSidebarTab;
}

interface RawLoadedScriptLine extends ScriptLineItem {
  speakerCharacterId?: string | null;
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

  // Artwork uploads unlock only after the page layout has been locked.
  const [lockedTemplateByPageId, setLockedTemplateByPageId] = useState<Record<string, boolean>>({});
  const [panelArtworksByPageId, setPanelArtworksByPageId] = useState<
    Record<string, Record<string, PanelArtworkData>>
  >({});
  const [fullPageSketchesByPageId, setFullPageSketchesByPageId] = useState<
    Record<string, PageSketch>
  >({});
  const [isDetectingPanels, setIsDetectingPanels] = useState(false);
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);
  const [previewArtwork, setPreviewArtwork] = useState<{ imageUrl: string; title: string } | null>(
    null,
  );

  const tabFromUrl = searchParams.get('tab') as CanvaSidebarTab | null;
  const isLettererRoute = location.pathname.includes('/letterer');
  const defaultTab = initialSidebarTab || tabFromUrl || (isLettererRoute ? 'lettering' : undefined);

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
          'Đã báo hoàn tất chỉnh sửa',
          'Yêu cầu đã được chuyển sang trạng thái chờ duyệt lại.',
        );
        loadChangeRequests(currentChapterId);
      } catch (err: any) {
        toast.error('Không thể cập nhật yêu cầu', err?.message || 'Vui lòng thử lại sau.');
      } finally {
        setIsResolvingChangeRequest(false);
      }
    },
    [currentChapterId, toast, loadChangeRequests],
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
          'Đã chuyển đến trang cần sửa',
          pNum ? `Khung số ${pNum}` : cr.description?.slice(0, 80) || '',
        );
        return;
      }

      toast.info(
        'Yêu cầu chỉnh sửa',
        cr.description?.slice(0, 80) || 'Kiểm tra bản vẽ của trang hiện tại.',
      );
    },
    [panelsByPageId, panelPageMap, toast],
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
          'Khôi phục thành công!',
          `Trang ${targetPage.pageNumber} đã được khôi phục về phiên bản v${version}.`,
        );
        if (currentChapterId) {
          await loadPages(currentChapterId);
        }
        await loadPageHistory(targetPage.id);
      } catch (err: any) {
        toast.error('Không thể khôi phục phiên bản', err?.message || 'Vui lòng thử lại.');
      } finally {
        setIsRestoringVersion(false);
      }
    },
    [pages, selectedPageId, pageHistory, currentChapterId, loadPages, loadPageHistory, toast],
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
      loadChangeRequests(currentChapterId);
    }
  }, [currentChapterId, loadPages, loadScriptLines, loadChangeRequests]);

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
        toast.success('Hoàn tất bản vẽ', `Đã nộp "${currentStage.label}" để chờ kiểm duyệt.`);
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
      submitButtonLabel: 'Nộp bản thảo',
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
        // Lưu tất cả thực thể vào charMap theo id và code để tra cứu người nói
        charMap.set(e.id, { name: e.name, color });
        if (e.code) {
          charMap.set(e.code, { name: e.name, color });
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
        (line.sceneId ? sceneToPageMap.get(line.sceneId) : undefined) ??
        1;
      const resolvedPanelNum = fromPanel?.panelNumber ?? line.panelNumber ?? 1;

      // Phân tích người nói và nội dung hội thoại
      const rawText = (line.dialogueText || line.stageDirection || '').trim();
      let speaker = (line.characterName || '').trim();
      let cleanText = rawText;

      // 1. Tra cứu theo speakerCharacterId trong bản đồ nhân vật
      if (!speaker && line.speakerCharacterId && characterById.has(line.speakerCharacterId)) {
        speaker = characterById.get(line.speakerCharacterId)!.name;
      }

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
          const isCaption = /^(Lời dẫn|Dẫn chuyện|Caption|Ghi chú|Hồi tưởng|Bối cảnh)$/i.test(
            prefix,
          );
          if (isCaption) {
            if (!speaker) speaker = prefix;
            cleanText = colonMatch[2].trim();
          } else {
            if (!speaker) speaker = prefix;
            cleanText = colonMatch[2].trim();
          }
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
              if (!speaker) speaker = 'Nhân vật';
              cleanText = quotedMatch[1].trim();
            } else if (!speaker && line.dialogueText) {
              speaker = 'Nhân vật';
            }
          }
        }
      }

      const resolvedCharName = speaker || 'Người dẫn';
      const resolvedCharColor =
        line.characterColor ||
        (line.speakerCharacterId && characterById.get(line.speakerCharacterId)?.color) ||
        getDeterministicColor(resolvedCharName);

      return {
        ...line,
        pageNumber: resolvedPageNum,
        panelNumber: resolvedPanelNum,
        characterName: resolvedCharName,
        characterColor: resolvedCharColor,
        dialogueText: cleanText || line.dialogueText,
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

  const isCurrentPageLayoutLocked = Boolean(
    selectedPage && lockedTemplateByPageId[selectedPage.id],
  );
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

      toast.success('Đã nạp tranh vào ô', `Tệp "${file.name}" đã được tải vào Khung #${panelNum}.`);

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

    // Không cho phép chọn khung khi trang đang có ảnh phác thảo toàn trang (tránh bị chồng lên)
    if (currentSketch) {
      toast.warning(
        'Không thể chọn mẫu khung',
        'Trang đang có ảnh phác thảo toàn trang. Vui lòng bấm "Tách khung" hoặc gỡ ảnh phác thảo để tránh bị chồng khung.',
      );
      return;
    }

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

    toast.success('Đã tải ảnh phác thảo', '');
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
    toast.info('Đã gỡ ảnh phác thảo', '');
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

      // Tự động cắt các ô tranh tương ứng từ ảnh phác thảo toàn trang
      const newArtworks: Record<string, PanelArtworkData> = {};
      await Promise.all(
        detection.panels.map(async (p, idx) => {
          const panel = detectedPanels[idx];
          try {
            const croppedUrl = await cropImageByBoundingBox(currentSketch.imageUrl, p);
            newArtworks[panel.id] = {
              id: `art-${panel.id}-${Date.now()}`,
              panelId: panel.id,
              panelNumber: p.panelNumber,
              imageUrl: croppedUrl,
              fileName: `panel-${p.panelNumber}.png`,
              uploadedAt: nowIso,
            };
          } catch (cropErr) {
            console.warn(`Lỗi cắt tranh cho khung #${p.panelNumber}:`, cropErr);
          }
        }),
      );

      setPanelsByPageId((prev) => ({ ...prev, [targetPage.id]: detectedPanels }));
      setPanelArtworksByPageId((prev) => ({ ...prev, [targetPage.id]: newArtworks }));
      // Tự động chốt bố cục và nạp tranh xong, không yêu cầu người dùng phải bấm lưu hay nạp tranh lại
      setLockedTemplateByPageId((prev) => ({ ...prev, [targetPage.id]: true }));
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

      toast.success('Đã tách khung', '');
    } catch (err) {
      console.error('Lỗi nhận diện panel:', err);
      toast.error('Không thể tách khung', 'Vui lòng kiểm tra lại ảnh phác thảo.');
    } finally {
      setIsDetectingPanels(false);
    }
  };

  const balloons = useLetteringBalloons(selectedPage, currentPagePanels, zoomScale, toast);

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
            submitButtonLabel: 'Nộp bản thảo',
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
          hasSketchUnderlay={Boolean(currentSketch)}
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
          theme='paper'
        />

        <div className='flex-1 min-h-0 min-w-0 h-full flex flex-col overflow-hidden relative'>
          <ArtistCanvasViewport
            pageKey={selectedPageId || 'default'}
            zoomScale={zoomScale}
            sketch={currentSketch}
            hasPanels={currentPagePanels.length > 0}
            isLayoutLocked={isCurrentPageLayoutLocked}
            isDetectingPanels={isDetectingPanels}
            isSavingLayout={isApplyingTemplate}
            onCanvasClick={() => balloons.setSelectedElementId(null)}
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
                isLayoutLocked={isCurrentPageLayoutLocked}
                onUploadArtwork={handleUploadPanelArtwork}
                onRemoveArtwork={handleRemovePanelArtwork}
                onPreviewArtwork={setPreviewArtwork}
              />
            )}
            {selectedPage && balloons.pageElements.length > 0 && (
              <LetteringBalloonOverlay
                elements={balloons.pageElements}
                pageWidth={selectedPage.widthPx || 1200}
                pageHeight={selectedPage.heightPx || 1800}
                selectedId={balloons.selectedElementId}
                activeGestureId={balloons.draggingId || balloons.resizingId}
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

      {isUnlockConfirmOpen && (
        <UnlockLayoutDialog
          onCancel={() => setIsUnlockConfirmOpen(false)}
          onConfirm={handleConfirmUnlockLayout}
        />
      )}

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
