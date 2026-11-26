import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Square,
  Sparkles,
  Loader2,
  Play,
  MinusCircle,
  HelpCircle,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  History,
  BookOpen,
  CheckSquare,
  FileText,
  Layers,
  ExternalLink,
  X,
  AlertOctagon,
  Maximize2,
  Trash2,
  Lock,
} from 'lucide-react';
import { pageService, type PageDto } from '@/services/page.service';
import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { assignmentService, extractError } from '@/services/assignment.service';
import { artworkService, resolveArtworkUrl } from '@/services/artwork.service';
import { elementService, type ElementSnapshotDto } from '@/services/element.service';
import { panelService } from '@/services/panel.service';
import { workspaceService, type WorkspaceMemberDto } from '@/services/workspace.service';
import { chapterService } from '@/services/chapter.service';
import { useTranslation } from '@/lib/i18n';
import {
  getActivePipelineStages,
  computePageProgressSummary,
  computePageStageStatus,
  computeUnfinishedPagesWarning,
  formatUnfinishedWarningText,
  STAGE_STATUS_CONFIG,
  type PageStageStatus,
} from '@/shared/features/collaboration/chapterReviewStatus';
import { buildPageComposite } from '@/shared/utils/compositePageRenderer';
import { loadPreviousStageArtworks } from '@/shared/utils/stageArtworks';
import {
  compositeSessionCache,
  type CachedPageComposite,
} from '@/shared/features/collaboration/ChapterReviewArtworkOverview';
import { ChapterProvenanceModal } from '@/shared/features/provenance/ChapterProvenanceModal';
import { SubmissionHistory } from '@/shared/features/collaboration/SubmissionHistory';
import { Modal, PageHeader } from '@/shared/ui';
import {
  Box,
  CHECKLIST_ITEMS,
  ChecklistId,
  normalizeRegionBox,
  parseRegionBox,
  findIntersectingPanelIds,
  isRegionOverlappingText,
  suggestTargetAssignment,
  buildReturnWorkPayload,
  parse409AwaitingReview,
  roundCoord,
} from './chapterReviewViewUtils';
import {
  resolveReworkDecisionComments,
  resolveReworkReasonDisplay,
  type AssignmentDto,
  type ChangeRequestDto,
  type ConsistencyFindingDto,
  type PanelDto,
  type StageProgressDto,
  type StageTaskDto,
  type SubmissionDto,
  type TaskGridDto,
  type TaskGridReviewItemDto,
  type VisualConsistencyReportDto,
} from '@/types';

export interface ChapterReviewViewProps {
  assignment: AssignmentDto;
  chapterId: string;
  seriesId: string;
  effectiveWsId?: string | null;
  effectiveRole?: string | null;
  currentUserId?: string | null;
  onShowToast?: (title: string, desc: string) => void;
  onDecisionMade?: () => void;
  onCloseWithoutDecision?: () => Promise<void> | void;
}

type ReviewTab = 'changes' | 'checklist' | 'consistency';

const SEVERITY_STYLE: Record<string, string> = {
  Blocking: 'bg-red-50 text-red-700 border-red-200',
  Warning: 'bg-amber-50 text-amber-700 border-amber-200',
  Info: 'bg-stone-100 text-stone-600 border-stone-200',
};

const OPEN_FINDING = ['Open', 'Confirmed', 'NeedsClarification'];

export const ChapterReviewView: React.FC<ChapterReviewViewProps> = ({
  assignment,
  chapterId,
  seriesId,
  effectiveWsId,
  effectiveRole,
  currentUserId,
  onShowToast,
  onDecisionMade,
  onCloseWithoutDecision,
}) => {
  const { t } = useTranslation('review');
  const navigate = useNavigate();

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageDto[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [stages, setStages] = useState<PipelineStageDto[]>([]);
  const [chapterAssignments, setChapterAssignments] = useState<AssignmentDto[]>([]);
  const [stageProgressList, setStageProgressList] = useState<StageProgressDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'pages' | 'script'>('pages');
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [taskGrid, setTaskGrid] = useState<TaskGridDto | null>(null);
  const [gridCommentsByTask, setGridCommentsByTask] = useState<Record<string, string>>({});
  const [gridReviewerNames, setGridReviewerNames] = useState<Record<string, string>>({});
  const [gridCellBusyId, setGridCellBusyId] = useState<string | null>(null);
  const [rejectingGridCellId, setRejectingGridCellId] = useState<string | null>(null);
  const [rejectGridCellComment, setRejectGridCellComment] = useState<string>('');

  // Consistency & Visual report
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [visualReport, setVisualReport] = useState<VisualConsistencyReportDto | null>(null);
  const [visualThreshold, setVisualThreshold] = useState<number>(0.75);

  // Active Page Details (panels, elements, composite)
  const [activePanels, setActivePanels] = useState<PanelDto[]>([]);
  const [pagePanelsMap, setPagePanelsMap] = useState<Record<string, PanelDto[]>>({});
  const [activeElements, setActiveElements] = useState<ElementSnapshotDto[]>([]);
  const [activeComposite, setActiveComposite] = useState<CachedPageComposite | null>(null);
  const [loadingComposite, setLoadingComposite] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<ReviewTab>('changes');
  const [crFilter, setCrFilter] = useState<'All' | 'Open' | 'Resolved' | 'Verified'>('All');

  // Viewer State (Zoom & Pan)
  const [zoomTransform, setZoomTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDrawTool, setIsDrawTool] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [drawingHint, setDrawingHint] = useState<string | null>(null);
  const [highlightedCrId, setHighlightedCrId] = useState<string | null>(null);

  // Interactive Drawing Region State
  const [drawing, setDrawing] = useState<{ start: { x: number; y: number }; box: Box } | null>(
    null,
  );
  const [draftRegion, setDraftRegion] = useState<{ box: Box; panelId?: string } | null>(null);

  // Return Work Form State
  const [targetAssignmentId, setTargetAssignmentId] = useState<string>('');
  const [returnDescription, setReturnDescription] = useState<string>('');
  const [returnDueDate, setReturnDueDate] = useState<string>('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [awaitingReviewConflict, setAwaitingReviewConflict] = useState<{
    message: string;
    targetAssignmentId: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Checklist State (persisted in localStorage)
  const checklistStorageKey = `pf_review_checklist_${chapterId}_${assignment.id}`;
  const [checklist, setChecklist] = useState<Record<ChecklistId, boolean>>(() => {
    try {
      const saved = localStorage.getItem(checklistStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return {
      script: false,
      bible: false,
      readingOrder: false,
      artQuality: false,
      spelling: false,
    };
  });

  // Action status / Global 409
  const [actionBusy, setActionBusy] = useState(false);
  const [backendBlockError, setBackendBlockError] = useState<string | null>(null);

  // Modals
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);

  // Refs
  const imageWrapperRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef<typeof drawing>(null);
  const panStartRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(
    null,
  );
  const drawingHintTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toast = useCallback(
    (title: string, desc: string) => {
      onShowToast?.(title, desc);
    },
    [onShowToast],
  );

  // Load Main Data
  const loadChapterData = useCallback(async () => {
    setLoading(true);
    setBackendBlockError(null);
    try {
      const gridPromise: Promise<TaskGridDto | null> =
        typeof assignmentService.getTaskGrid === 'function'
          ? assignmentService.getTaskGrid(chapterId).catch(() => null)
          : Promise.resolve(null);

      const [
        pagesRes,
        pipelineRes,
        assignmentsRes,
        progressRes,
        changeRequestsRes,
        submissionsRes,
        membersRes,
        reviewQueueRes,
        findingsRes,
        visualRes,
      ] = await Promise.all([
        pageService.getPagesByChapter(chapterId).catch(() => [] as PageDto[]),
        seriesId
          ? pipelineService.getSeriesPipeline(seriesId).catch(() => null)
          : Promise.resolve(null),
        assignmentService.getAssignments(chapterId).catch(() => [] as AssignmentDto[]),
        assignmentService.getStageProgress(chapterId).catch(() => [] as StageProgressDto[]),
        assignmentService.getChangeRequests(chapterId).catch(() => [] as ChangeRequestDto[]),
        assignmentService
          .getSubmissions(chapterId, assignment.id)
          .catch(() => [] as SubmissionDto[]),
        effectiveWsId
          ? workspaceService.getMembers(effectiveWsId).catch(() => [] as WorkspaceMemberDto[])
          : Promise.resolve([]),
        effectiveWsId && typeof assignmentService.getTaskGridReviewQueue === 'function'
          ? assignmentService
              .getTaskGridReviewQueue(effectiveWsId, seriesId ? { seriesId } : undefined)
              .catch(() => [] as TaskGridReviewItemDto[])
          : Promise.resolve([] as TaskGridReviewItemDto[]),
        assignmentService
          .getConsistencyFindings(chapterId)
          .catch(() => [] as ConsistencyFindingDto[]),
        assignmentService.getVisualConsistencyReport(chapterId, visualThreshold).catch(() => null),
      ]);
      const gridRes = await gridPromise;
      const reviewerNamesMap: Record<string, string> = {};
      for (const item of reviewQueueRes || []) {
        if (item.taskId && item.reviewerName) {
          reviewerNamesMap[item.taskId] = item.reviewerName;
        }
      }
      setGridReviewerNames(reviewerNamesMap);

      const sortedPages = [...pagesRes].sort((a, b) => a.pageNumber - b.pageNumber);
      setPages(sortedPages);
      if (sortedPages.length > 0) {
        setSelectedPageId((prev) => (prev ? prev : sortedPages[0].id));
      }

      // Load panels for all pages to support progress summary and unfinished warning
      const panelsResults = await Promise.all(
        sortedPages.map((p) => panelService.getPanelsByPage(p.id).catch(() => [] as PanelDto[])),
      );
      const panelMap: Record<string, PanelDto[]> = {};
      sortedPages.forEach((p, idx) => {
        panelMap[p.id] = panelsResults[idx];
      });
      setPagePanelsMap(panelMap);

      const nonCancelledGridTasks = (gridRes?.tasks ?? []).filter(
        (item) => item.status !== 'Cancelled',
      );
      const hasGrid = Boolean(gridRes && nonCancelledGridTasks.length > 0);
      let activeStages: PipelineStageDto[];
      if ((gridRes?.stages ?? []).length > 0) {
        const pipeById = new Map<string, PipelineStageDto>(
          ((pipelineRes?.stages ?? []) as PipelineStageDto[]).map((s) => [s.id, s]),
        );
        activeStages = (gridRes?.stages ?? [])
          .filter((s) => s.isEnabled !== false && pipeById.get(s.id)?.isEnabled !== false)
          .sort((a, b) => a.stageOrder - b.stageOrder)
          .map((s) => {
            const base = pipeById.get(s.id);
            return {
              id: s.id,
              name: s.name,
              slug: base?.slug ?? s.name.toLowerCase(),
              stageOrder: s.stageOrder,
              allowedRole: s.allowedRole ?? base?.allowedRole,
              isApprovalGate: s.isApprovalGate,
              isInitial: base?.isInitial ?? false,
              isTerminal: base?.isTerminal ?? false,
              isEnabled: s.isEnabled,
            } as PipelineStageDto;
          });
      } else {
        activeStages = getActivePipelineStages(pipelineRes?.stages ?? []);
      }
      setStages(activeStages);

      if (hasGrid && gridRes) {
        const enabledIds = new Set(activeStages.map((s) => s.id));
        const gridStagesById = new Map((gridRes.stages ?? []).map((s) => [s.id, s]));
        const gridLotsById = new Map((gridRes.lots ?? []).map((l) => [l.id, l]));
        const enabledGridTasks = nonCancelledGridTasks.filter((item) =>
          enabledIds.has(item.pipelineStageId),
        );
        const reworkComments = await resolveReworkDecisionComments(
          chapterId,
          enabledGridTasks,
          typeof assignmentService.getStageTaskSubmissions === 'function'
            ? (cId, tId) => assignmentService.getStageTaskSubmissions(cId, tId)
            : undefined,
        );
        setTaskGrid(gridRes);
        setGridCommentsByTask(reworkComments);

        const synthAssignments: AssignmentDto[] = enabledGridTasks.map((cell) => {
          const stg = gridStagesById.get(cell.pipelineStageId);
          const lot = cell.lotId ? gridLotsById.get(cell.lotId) : undefined;
          return {
            id: cell.id,
            seriesId,
            chapterId,
            entityType: cell.pageId ? 'Page' : 'Chapter',
            targetEntityId: cell.pageId ?? chapterId,
            pipelineStageId: cell.pipelineStageId,
            stageName: stg?.name ?? 'Stage',
            stageOrder: stg?.stageOrder ?? 99,
            assigneeUserId: cell.assigneeUserId ?? lot?.assigneeUserId ?? '',
            assignedRole: (lot?.assignedRole || stg?.allowedRole || 'Artist') as any,
            brief: lot?.brief?.trim() || stg?.name || 'Stage',
            priority: 'Medium' as any,
            status: cell.status as any,
            createdAt: cell.startedAt ?? new Date().toISOString(),
          };
        });
        const synthProgress: StageProgressDto[] = enabledGridTasks.flatMap((cell) => {
          if (!cell.pageId) return [];
          const pagePanels = panelMap[cell.pageId] ?? [];
          if (pagePanels.length === 0) return [];
          return pagePanels.map(
            (pnl) =>
              ({
                id: `prog-${cell.id}-${pnl.id}`,
                chapterId,
                pageId: cell.pageId,
                panelId: pnl.id,
                pipelineStageId: cell.pipelineStageId,
                status: cell.status as any,
              }) as unknown as StageProgressDto,
          );
        });

        setChapterAssignments(synthAssignments);
        setStageProgressList(synthProgress);

        const reviewCell =
          enabledGridTasks.find((item) => item.id === assignment.id) ??
          enabledGridTasks.find(
            (item) => !item.pageId && item.pipelineStageId === assignment.pipelineStageId,
          );
        if (
          submissionsRes.length === 0 &&
          reviewCell &&
          typeof assignmentService.getStageTaskSubmissions === 'function'
        ) {
          const v3Subs = await assignmentService
            .getStageTaskSubmissions(chapterId, reviewCell.id)
            .catch(() => []);
          setSubmissions(
            v3Subs.map((s) => ({
              id: s.id,
              assignmentId: reviewCell.id,
              chapterId,
              submittedByUserId: s.submittedByUserId,
              attemptNumber: s.attemptNumber,
              status: s.status as SubmissionDto['status'],
              submittedAt: s.submittedAt,
              decidedByUserId: s.decidedByUserId ?? undefined,
              decidedAt: s.decidedAt ?? undefined,
              decisionComment: s.decisionComment ?? undefined,
              artworkReferenceIds: s.artworkReferenceIds ?? [],
            })),
          );
        } else {
          setSubmissions(submissionsRes);
        }
      } else {
        setTaskGrid(null);
        setGridCommentsByTask({});
        setChapterAssignments(assignmentsRes);
        setStageProgressList(progressRes);
        setSubmissions(submissionsRes);
      }

      setChangeRequests(changeRequestsRes);
      setMembers(membersRes);
      setFindings(findingsRes);
      setVisualReport(visualRes);

      // Chapter info from chapterService
      chapterService
        .getChapterById(chapterId)
        .then((ch) => {
          if (ch) {
            setChapterTitle(
              ch.title || t('scriptReview.header.title', { number: ch.chapterNumber }),
            );
            setChapterNumber(ch.chapterNumber);
          }
        })
        .catch(() => {
          /* ignore */
        });
    } catch (err: any) {
      toast(
        t('chapterReview.toast.loadErrorTitle'),
        extractError(err, t('chapterReview.toast.loadErrorDesc')),
      );
    } finally {
      setLoading(false);
    }
  }, [chapterId, seriesId, assignment.id, effectiveWsId, visualThreshold, toast, t]);

  useEffect(() => {
    // Clear in-memory composite cache on initial review mount to ensure fresh render
    compositeSessionCache.clear();
    void loadChapterData();
  }, [loadChapterData]);

  // Save checklist state
  useEffect(() => {
    try {
      localStorage.setItem(checklistStorageKey, JSON.stringify(checklist));
    } catch {
      /* ignore */
    }
  }, [checklist, checklistStorageKey]);

  // Selected Page Object
  const selectedPageIndex = useMemo(() => {
    return pages.findIndex((p) => p.id === selectedPageId);
  }, [pages, selectedPageId]);

  const currentPage = useMemo(() => {
    return pages[selectedPageIndex] || pages[0] || null;
  }, [pages, selectedPageIndex]);

  // Current Page Assignments (Page tasks for this page or Panel tasks on this page)
  const currentPageAssignments = useMemo(() => {
    if (!currentPage) return [];
    const panelIds = new Set(activePanels.map((p) => p.id));
    return chapterAssignments.filter((a) => {
      if (a.entityType === 'Page' && a.targetEntityId === currentPage.id) return true;
      if (a.entityType === 'Panel' && panelIds.has(a.targetEntityId)) return true;
      return false;
    });
  }, [currentPage, activePanels, chapterAssignments]);

  // Member map for quick name resolution
  const memberMap = useMemo(() => {
    return new Map(members.map((m) => [m.userId, m]));
  }, [members]);

  const stageMap = useMemo(() => {
    return new Map(stages.map((s) => [s.id, s]));
  }, [stages]);

  // Load Composite and Details for Selected Page
  const loadActivePageComposite = useCallback(
    async (page: PageDto) => {
      if (stages.length === 0) return;
      setLoadingComposite(true);
      try {
        const [panels, snapshot] = await Promise.all([
          panelService.getPanelsByPage(page.id).catch(() => [] as PanelDto[]),
          elementService
            .getPageSnapshot(page.id)
            .catch(() => ({ elements: [] as ElementSnapshotDto[] })),
        ]);

        setActivePanels(panels);
        setActiveElements(snapshot.elements || []);

        // Check session cache - only if valid artwork/text composite exists
        const cached = compositeSessionCache.get(page.id);
        if (cached && (cached.hasArtwork || cached.hasText) && cached.dataUrl) {
          setActiveComposite(cached);
          setLoadingComposite(false);
          return;
        }

        // Load base artwork from closest preceding active stage
        const baseArts = await loadPreviousStageArtworks(
          chapterId,
          seriesId || '',
          page.id,
          assignment.pipelineStageId,
          { stages },
        );

        const hasArtwork = baseArts.length > 0;
        const textElements = (snapshot.elements || []).filter((el) => {
          const t = String(el.elementType || '').toUpperCase();
          return (
            t === 'SPEECH_BALLOON' ||
            t === 'THOUGHT_BALLOON' ||
            t === 'SHOUT_BALLOON' ||
            t === 'NARRATION_BOX' ||
            t === 'SFX' ||
            t === 'TEXT'
          );
        });
        const hasText = textElements.length > 0;

        let dataUrl = '';
        let baseStageName: string | undefined;
        let baseVersion: number | undefined;

        if (hasArtwork || hasText) {
          const firstArt = baseArts[0];
          const st = firstArt ? stages.find((s) => s.id === firstArt.pipelineStageId) : undefined;
          baseStageName = st?.name;
          baseVersion = firstArt?.versionNumber;

          const rendered = await buildPageComposite({
            panels,
            artworks: baseArts,
            elements: snapshot.elements || [],
            drawText: true,
            getAccessUrl: async (assetRefId) => {
              const link = await artworkService.getArtworkAccessLink(chapterId, assetRefId);
              return resolveArtworkUrl(link.url);
            },
          });
          dataUrl = rendered.dataUrl;
        }

        const compositeData: CachedPageComposite = {
          dataUrl,
          hasArtwork,
          hasText,
          baseStageName,
          baseVersion,
        };

        if (hasArtwork || hasText) {
          compositeSessionCache.set(page.id, compositeData);
        }
        setActiveComposite(compositeData);
      } catch (err) {
        console.warn('Could not build page composite:', err);
        setActiveComposite({
          dataUrl: '',
          hasArtwork: false,
          hasText: false,
        });
      } finally {
        setLoadingComposite(false);
      }
    },
    [chapterId, seriesId, stages, assignment.pipelineStageId],
  );

  useEffect(() => {
    if (currentPage && stages.length > 0) {
      setDraftRegion(null);
      setAwaitingReviewConflict(null);
      setFormError(null);
      void loadActivePageComposite(currentPage);
    }
  }, [currentPage, stages, loadActivePageComposite]);

  // Keyboard navigation for Prev/Next pages
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        if (selectedPageIndex > 0) {
          setSelectedPageId(pages[selectedPageIndex - 1].id);
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedPageIndex < pages.length - 1) {
          setSelectedPageId(pages[selectedPageIndex + 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages, selectedPageIndex]);

  // Unfinished pages warning
  const unfinishedWarning = useMemo(() => {
    if (pages.length === 0 || stages.length === 0) return null;
    const getPanelIds = (pageId: string) => pagePanelsMap[pageId]?.map((p) => p.id) ?? [];
    return computeUnfinishedPagesWarning(
      pages,
      getPanelIds,
      stages,
      stageProgressList,
      chapterAssignments,
    );
  }, [pages, stages, pagePanelsMap, stageProgressList, chapterAssignments]);

  // Zoom handlers
  const currentPagePanels = useMemo(
    () => (selectedPageId ? pagePanelsMap[selectedPageId] || [] : []),
    [selectedPageId, pagePanelsMap],
  );
  const selectedPanel = useMemo(
    () => currentPagePanels.find((p) => p.id === selectedPanelId) || currentPagePanels[0],
    [currentPagePanels, selectedPanelId],
  );
  const selectedPanelNumber = selectedPanel?.panelNumber || 1;
  const totalOpenCrs = useMemo(
    () => changeRequests.filter((cr) => String(cr.status) === 'Open').length,
    [changeRequests],
  );

  const handleZoom = (delta: number) => {
    setZoomTransform((prev) => {
      const nextScale = Math.min(3.0, Math.max(0.4, Math.round((prev.scale + delta) * 10) / 10));
      return { ...prev, scale: nextScale };
    });
  };

  const resetZoom = () => {
    setZoomTransform({ scale: 1, x: 0, y: 0 });
  };

  // Drawing and Mouse event handlers
  const onMouseDownViewer = (e: React.MouseEvent<HTMLDivElement>) => {
    // If clicked on an existing change request box on the image, do not start drawing
    if ((e.target as HTMLElement).closest('[data-cr-box]')) {
      return;
    }

    if (!imageWrapperRef.current) return;
    const rect = imageWrapperRef.current.getBoundingClientRect();
    const p = {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };

    if (isDrawTool || e.shiftKey) {
      const initial = { start: p, box: { x: p.x, y: p.y, w: 0, h: 0 } };
      drawingRef.current = initial;
      setDrawing(initial);
      setDrawingHint(null);
      return;
    }

    // Pan mode
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      x: zoomTransform.x,
      y: zoomTransform.y,
    };
    setIsPanning(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 1. Drawing Region
      if (drawingRef.current && imageWrapperRef.current) {
        const rect = imageWrapperRef.current.getBoundingClientRect();
        const curX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        const curY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
        const start = drawingRef.current.start;

        const box: Box = {
          x: roundCoord(Math.min(curX, start.x)),
          y: roundCoord(Math.min(curY, start.y)),
          w: roundCoord(Math.abs(curX - start.x)),
          h: roundCoord(Math.abs(curY - start.y)),
        };

        const next = { start, box };
        drawingRef.current = next;
        setDrawing(next);
        return;
      }

      // 2. Panning
      if (panStartRef.current) {
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;
        setZoomTransform((prev) => ({
          ...prev,
          x: panStartRef.current!.x + dx,
          y: panStartRef.current!.y + dy,
        }));
      }
    };

    const handleMouseUp = () => {
      // Stop pan
      if (panStartRef.current) {
        panStartRef.current = null;
        setIsPanning(false);
      }

      // Complete drawing
      if (drawingRef.current) {
        const active = drawingRef.current;
        drawingRef.current = null;
        setDrawing(null);

        const { box } = active;
        if (box.w < 0.01 || box.h < 0.01) {
          setDrawingHint(t('chapterReview.drawingHint'));
          if (drawingHintTimerRef.current) clearTimeout(drawingHintTimerRef.current);
          drawingHintTimerRef.current = setTimeout(() => setDrawingHint(null), 3000);
          return;
        }

        // Valid box drawn: identify panel & smart target assignment
        const matchedPanelId = findIntersectingPanelIds(box, activePanels)[0];
        const suggestedTarget = suggestTargetAssignment(
          box,
          currentPageAssignments,
          activeElements,
          stages,
          currentPage?.widthPx || 1200,
          currentPage?.heightPx || 1800,
        );

        setDraftRegion({ box, panelId: matchedPanelId });
        if (suggestedTarget) {
          setTargetAssignmentId(suggestedTarget);
        }
        setActiveTab('changes');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activePanels, activeElements, currentPageAssignments, stages, currentPage, t]);

  const isGridMode = Boolean(
    taskGrid && taskGrid.tasks.some((item) => item.status !== 'Cancelled'),
  );

  const gridReviewTask = useMemo(() => {
    if (!taskGrid) return null;
    return (
      taskGrid.tasks.find((item) => item.id === assignment.id && item.status !== 'Cancelled') ??
      taskGrid.tasks.find(
        (item) =>
          !item.pageId &&
          item.status !== 'Cancelled' &&
          item.pipelineStageId === assignment.pipelineStageId,
      ) ??
      null
    );
  }, [taskGrid, assignment.id, assignment.pipelineStageId]);

  const currentPageGridCells = useMemo(() => {
    if (!isGridMode || !taskGrid || !currentPage) return [];
    const enabledIds = new Set(stages.map((s) => s.id));
    return taskGrid.tasks
      .filter(
        (item) =>
          item.pageId === currentPage.id &&
          item.status !== 'Cancelled' &&
          enabledIds.has(item.pipelineStageId),
      )
      .sort(
        (a, b) =>
          (stageMap.get(a.pipelineStageId)?.stageOrder ?? 99) -
          (stageMap.get(b.pipelineStageId)?.stageOrder ?? 99),
      );
  }, [isGridMode, taskGrid, currentPage, stages, stageMap]);

  const applyUpdatedGridCell = useCallback(
    (cellId: string, updated?: Partial<StageTaskDto> | null) => {
      if (!updated) return;
      setTaskGrid((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === cellId ? { ...t, ...updated, id: t.id } : t)),
        };
      });
      if (updated.status) {
        setChapterAssignments((prev) =>
          prev.map((a) => (a.id === cellId ? { ...a, status: updated.status as any } : a)),
        );
        setStageProgressList((prev) =>
          prev.map((p) =>
            p.id.startsWith(`prog-${cellId}-`) ? { ...p, status: updated.status as any } : p,
          ),
        );
      }
      const inlineComment = updated.lastDecisionComment?.trim();
      if (inlineComment) {
        setGridCommentsByTask((prev) => ({ ...prev, [cellId]: inlineComment }));
      }
      if (updated.reviewerUserId === null) {
        setGridReviewerNames((prev) => {
          if (!(cellId in prev)) return prev;
          const next = { ...prev };
          delete next[cellId];
          return next;
        });
      }
    },
    [],
  );

  const handleApproveGridCell = async (cell: StageTaskDto) => {
    setGridCellBusyId(`approve:${cell.id}`);
    setBackendBlockError(null);
    try {
      await assignmentService.approveStageTask(chapterId, cell.id);
      const st = stageMap.get(cell.pipelineStageId);
      toast(
        t('chapterReview.toast.cellApprovedTitle'),
        t('chapterReview.toast.cellPageSummary', {
          stage: st?.name || 'Stage',
          page: currentPage?.pageNumber ?? '',
        }),
      );
      await loadChapterData();
    } catch (err: any) {
      const msg = extractError(err, t('chapterReview.toast.cellApproveErrorDesc'));
      setBackendBlockError(msg);
      toast(t('chapterReview.toast.cellApproveErrorTitle'), msg);
      if (err?.status === 409) await loadChapterData();
    } finally {
      setGridCellBusyId(null);
    }
  };

  const handleRequestChangesGridCell = async (cell: StageTaskDto) => {
    const trimmed = rejectGridCellComment.trim();
    if (!trimmed) return;
    setGridCellBusyId(`reject:${cell.id}`);
    setBackendBlockError(null);
    try {
      const updated = await assignmentService.requestStageTaskChanges(chapterId, cell.id, trimmed);
      setRejectingGridCellId(null);
      setRejectGridCellComment('');
      applyUpdatedGridCell(cell.id, {
        ...updated,
        status: updated?.status ?? 'ReworkRequired',
        lastDecisionComment: updated?.lastDecisionComment ?? trimmed,
        reviewerUserId: updated?.reviewerUserId ?? null,
      });
      const st = stageMap.get(cell.pipelineStageId);
      toast(
        t('chapterReview.toast.cellChangesRequestedTitle'),
        t('chapterReview.toast.cellPageSummary', {
          stage: st?.name || 'Stage',
          page: currentPage?.pageNumber ?? '',
        }),
      );
    } catch (err: any) {
      const msg = extractError(err, t('chapterReview.toast.cellRejectErrorDesc'));
      setBackendBlockError(msg);
      toast(t('chapterReview.toast.cellRejectErrorTitle'), msg);
      if (err?.status === 409) await loadChapterData();
    } finally {
      setGridCellBusyId(null);
    }
  };

  const handleReleaseGridCellReview = async (cell: StageTaskDto) => {
    setGridCellBusyId(`release:${cell.id}`);
    setBackendBlockError(null);
    try {
      const updated = await assignmentService.releaseStageTaskReview(chapterId, cell.id);
      applyUpdatedGridCell(cell.id, {
        ...updated,
        status: updated?.status ?? 'Submitted',
        reviewerUserId: updated?.reviewerUserId ?? null,
      });
      const st = stageMap.get(cell.pipelineStageId);
      toast(
        t('chapterReview.releaseReviewToast'),
        currentPage
          ? t('chapterReview.toast.cellPageSummary', {
              stage: st?.name || 'Stage',
              page: currentPage.pageNumber,
            })
          : st?.name || 'Stage',
      );
    } catch (err: any) {
      const msg = extractError(err, t('chapterReview.toast.cellReleaseErrorDesc'));
      setBackendBlockError(msg);
      toast(t('chapterReview.toast.cellReleaseErrorTitle'), msg);
      if (err?.status === 409) await loadChapterData();
    } finally {
      setGridCellBusyId(null);
    }
  };

  // Handle Submit Return Work
  const handleSubmitReturnWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignmentId || !returnDescription.trim()) {
      setFormError(t('chapterReview.form.missingFields'));
      return;
    }

    if (isGridMode) {
      setSubmittingReturn(true);
      setFormError(null);
      setAwaitingReviewConflict(null);
      try {
        const targetCell = taskGrid?.tasks.find((item) => item.id === targetAssignmentId);
        const trimmed = returnDescription.trim();
        const reopened =
          targetCell?.status === 'Approved' &&
          String(effectiveRole || '').toUpperCase() === 'PRODUCER' &&
          typeof assignmentService.reopenStageTask === 'function';
        if (reopened) {
          await assignmentService.reopenStageTask(chapterId, targetAssignmentId, trimmed);
          toast(
            t('chapterReview.toast.cellReopenedTitle'),
            t('chapterReview.toast.cellReopenedDesc'),
          );
        } else {
          const updated = await assignmentService.requestStageTaskChanges(
            chapterId,
            targetAssignmentId,
            trimmed,
          );
          applyUpdatedGridCell(targetAssignmentId, {
            ...updated,
            status: updated?.status ?? 'ReworkRequired',
            lastDecisionComment: updated?.lastDecisionComment ?? trimmed,
            reviewerUserId: updated?.reviewerUserId ?? null,
          });
          toast(
            t('chapterReview.toast.returnSuccessTitle'),
            t('chapterReview.toast.returnGridSuccessDesc'),
          );
        }
        setReturnDescription('');
        setReturnDueDate('');
        setDraftRegion(null);
        if (reopened) {
          await loadChapterData();
        }
      } catch (err: any) {
        const msg = extractError(err, t('chapterReview.toast.returnErrorDesc'));
        setFormError(msg);
        toast(t('chapterReview.toast.returnErrorTitle'), msg);
        if (err?.status === 409) await loadChapterData();
      } finally {
        setSubmittingReturn(false);
      }
      return;
    }

    const targetAssignment = chapterAssignments.find((a) => a.id === targetAssignmentId);
    const payload = buildReturnWorkPayload({
      targetAssignmentId,
      description: returnDescription,
      box: draftRegion?.box,
      panelId: draftRegion?.panelId,
      targetAssignment,
      dueDate: returnDueDate || undefined,
    });

    setSubmittingReturn(true);
    setFormError(null);
    setAwaitingReviewConflict(null);

    try {
      await assignmentService.returnWorkFromReview(chapterId, assignment.id, payload);
      toast(
        t('chapterReview.toast.returnSuccessTitle'),
        t('chapterReview.toast.returnStageSuccessDesc'),
      );
      setReturnDescription('');
      setReturnDueDate('');
      setDraftRegion(null);

      // Refresh change requests and chapter assignments
      const [crs, as] = await Promise.all([
        assignmentService.getChangeRequests(chapterId),
        assignmentService.getAssignments(chapterId),
        assignmentService.getStageProgress(chapterId).then((p) => setStageProgressList(p)),
      ]);
      setChangeRequests(crs);
      setChapterAssignments(as);
    } catch (err: any) {
      const conflict = parse409AwaitingReview(err, targetAssignmentId);
      if (conflict.isAwaitingReview) {
        setAwaitingReviewConflict({
          message: conflict.message,
          targetAssignmentId,
        });
      } else {
        const msg = extractError(err, t('chapterReview.toast.returnErrorDesc'));
        setFormError(msg);
        toast(t('chapterReview.toast.returnErrorTitle'), msg);
      }
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Handle Verify Change Request
  const handleVerifyChangeRequest = async (crId: string) => {
    try {
      await assignmentService.verifyChangeRequest(
        chapterId,
        crId,
        t('chapterReview.toast.verifyDefaultNote'),
      );
      toast(t('chapterReview.toast.verifiedTitle'), t('chapterReview.toast.verifiedDesc'));
      const crs = await assignmentService.getChangeRequests(chapterId);
      setChangeRequests(crs);
    } catch (err: any) {
      toast(
        t('chapterReview.toast.errorTitle'),
        extractError(err, t('chapterReview.toast.verifyErrorDesc')),
      );
    }
  };

  // Handle Reopen Change Request
  const handleReopenChangeRequest = async (crId: string) => {
    const reason = window.prompt(t('chapterReview.prompts.reopenReason'));
    if (!reason || !reason.trim()) return;
    try {
      await assignmentService.reopenChangeRequest(chapterId, crId, reason.trim());
      toast(t('chapterReview.toast.reopenedCrTitle'), t('chapterReview.toast.reopenedCrDesc'));
      const crs = await assignmentService.getChangeRequests(chapterId);
      setChangeRequests(crs);
    } catch (err: any) {
      toast(
        t('chapterReview.toast.errorTitle'),
        extractError(err, t('chapterReview.toast.reopenErrorDesc')),
      );
    }
  };

  // Handle Start Assignment (if Assigned)
  const handleStartReview = async () => {
    setActionBusy(true);
    setBackendBlockError(null);
    try {
      if (isGridMode && gridReviewTask) {
        const updated = await assignmentService.startStageTask(chapterId, gridReviewTask.id);
        applyUpdatedGridCell(gridReviewTask.id, {
          ...updated,
          status: updated?.status ?? 'InProgress',
        });
      } else {
        await assignmentService.startAssignment(chapterId, assignment.id);
        await loadChapterData();
      }
      toast(t('chapterReview.toast.startedTitle'), t('chapterReview.toast.startedDesc'));
    } catch (err: any) {
      const msg = extractError(err, t('chapterReview.toast.startErrorDesc'));
      setBackendBlockError(msg);
      toast(t('chapterReview.toast.blockedTitle'), msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitGate2GridReview = async () => {
    if (!gridReviewTask) return;
    setActionBusy(true);
    setBackendBlockError(null);
    try {
      const updatedList = await assignmentService.submitStageTasks(chapterId, [gridReviewTask.id]);
      toast(
        t('chapterReview.toast.submittedGate2Title'),
        t('chapterReview.toast.submittedGate2Desc'),
      );
      if (
        Array.isArray(updatedList) &&
        updatedList.length > 0 &&
        !updatedList.some((u) => u.status === 'Approved')
      ) {
        applyUpdatedGridCell(gridReviewTask.id, updatedList[0]);
      } else {
        await loadChapterData();
      }
    } catch (err: any) {
      const msg = extractError(err, t('chapterReview.toast.submitGate2ErrorDesc'));
      setBackendBlockError(msg);
      toast(t('chapterReview.toast.blockedTitle'), msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handleApproveChapter = async () => {
    setActionBusy(true);
    setBackendBlockError(null);
    try {
      if (isGridMode && gridReviewTask) {
        await assignmentService.approveStageTask(chapterId, gridReviewTask.id);
        onDecisionMade?.();
      } else {
        await assignmentService.approveAssignment(chapterId, assignment.id);
      }
      toast(
        t('chapterReview.toast.approvedGate2Title'),
        t('chapterReview.toast.approvedGate2Desc'),
      );
      await loadChapterData();
    } catch (err: any) {
      const msg = extractError(err, t('chapterReview.toast.approveErrorDesc'));
      setBackendBlockError(msg);
      toast(t('chapterReview.toast.approveBlockedTitle'), msg);
    } finally {
      setActionBusy(false);
    }
  };

  // Triage Consistency Finding
  const handleTriageFinding = async (
    f: ConsistencyFindingDto,
    decision: 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification',
  ) => {
    let note: string | undefined = undefined;
    if (decision === 'Ignored' || decision === 'NeedsClarification') {
      note = window.prompt(t('chapterReview.prompts.triageReason', { decision })) || undefined;
      if (!note) return;
    }
    try {
      await assignmentService.triageConsistencyFinding(chapterId, f.id, decision, note);
      toast(t('chapterReview.toast.triagedTitle'), `Finding ${f.ruleCode} -> ${decision}`);
      const updated = await assignmentService.getConsistencyFindings(chapterId);
      setFindings(updated);
    } catch (err: any) {
      toast(
        t('chapterReview.toast.errorTitle'),
        extractError(err, t('chapterReview.toast.triageErrorDesc')),
      );
    }
  };

  // Run Consistency Check
  const handleRunConsistency = async () => {
    setActionBusy(true);
    try {
      const res = await assignmentService.runConsistencyCheck(chapterId);
      toast(
        t('chapterReview.toast.consistencyDoneTitle'),
        t('chapterReview.toast.consistencyDoneDesc', {
          newCount: res.newCount,
          openCount: res.openCount,
        }),
      );
      const updated = await assignmentService.getConsistencyFindings(chapterId);
      setFindings(updated);
    } catch (err: any) {
      toast(
        t('chapterReview.toast.errorTitle'),
        extractError(err, t('chapterReview.toast.consistencyErrorDesc')),
      );
    } finally {
      setActionBusy(false);
    }
  };

  // Run Visual Consistency Check
  const handleRunVisual = async () => {
    setActionBusy(true);
    try {
      const res = await assignmentService.runVisualConsistencyCheck(chapterId, visualThreshold);
      setVisualReport(res);
      toast(
        t('chapterReview.toast.visualDoneTitle'),
        t('chapterReview.toast.visualDoneDesc', { threshold: Math.round(res.threshold * 100) }),
      );
    } catch (err: any) {
      toast(
        t('chapterReview.toast.errorTitle'),
        extractError(err, t('chapterReview.toast.visualErrorDesc')),
      );
    } finally {
      setActionBusy(false);
    }
  };

  // Filtered change requests
  const filteredChangeRequests = useMemo(() => {
    if (crFilter === 'All') return changeRequests;
    return changeRequests.filter((cr) => String(cr.status) === crFilter);
  }, [changeRequests, crFilter]);

  // Group change requests by page
  const changeRequestsByPage = useMemo(() => {
    const map = new Map<string, ChangeRequestDto[]>();
    for (const page of pages) {
      map.set(page.id, []);
    }
    const panelToPage = new Map<string, string>();
    for (const p of activePanels) {
      panelToPage.set(p.id, p.pageId);
    }

    for (const cr of filteredChangeRequests) {
      let pageId: string | undefined = undefined;
      if (cr.panelId && panelToPage.has(cr.panelId)) {
        pageId = panelToPage.get(cr.panelId);
      } else {
        const as = chapterAssignments.find((a) => a.id === cr.assignmentId);
        if (as?.entityType === 'Page') {
          pageId = as.targetEntityId;
        } else if (as?.entityType === 'Panel' && panelToPage.has(as.targetEntityId)) {
          pageId = panelToPage.get(as.targetEntityId);
        }
      }

      if (pageId && map.has(pageId)) {
        map.get(pageId)!.push(cr);
      } else if (pages.length > 0) {
        // Fallback to first page
        map.get(pages[0].id)!.push(cr);
      }
    }
    return map;
  }, [filteredChangeRequests, pages, activePanels, chapterAssignments]);

  // Active page change requests for bounding box overlay
  const activePageChangeRequests = useMemo(() => {
    if (!currentPage) return [];
    return changeRequestsByPage.get(currentPage.id) || [];
  }, [currentPage, changeRequestsByPage]);

  // Target assignment options for the active page
  const targetOptions = useMemo(() => {
    return currentPageAssignments.map((as) => {
      const st = stageMap.get(as.pipelineStageId);
      const member = memberMap.get(as.assigneeUserId);
      const stName = st?.name || as.assignedRole || 'Stage';
      const assigneeName = member?.fullName || member?.email || t('chapterReview.unassigned');
      const stOrder = st?.stageOrder || '';
      return {
        id: as.id,
        label: `${stOrder ? stOrder + '. ' : ''}${stName} · ${assigneeName} · ${as.status}`,
      };
    });
  }, [currentPageAssignments, stageMap, memberMap, t]);

  useEffect(() => {
    if (targetOptions.length > 0) {
      if (!targetAssignmentId || !targetOptions.some((o) => o.id === targetAssignmentId)) {
        setTargetAssignmentId(targetOptions[0].id);
      }
    } else {
      setTargetAssignmentId('');
    }
  }, [targetOptions, targetAssignmentId]);

  if (loading) {
    return (
      <div className='w-full h-full flex flex-col items-center justify-center bg-[#FAF8F4] gap-3'>
        <Loader2 className='w-8 h-8 animate-spin text-[#171717]' />
        <span className='text-xs font-semibold text-stone-600'>
          {t('chapterReview.loadingGate2')}
        </span>
      </div>
    );
  }

  const effectiveReviewStatus = gridReviewTask ? gridReviewTask.status : assignment.status;
  const isApproved = String(effectiveReviewStatus) === 'Approved';
  const isSelfGate2Review = Boolean(
    isGridMode &&
    gridReviewTask &&
    currentUserId &&
    gridReviewTask.assigneeUserId === currentUserId,
  );
  const canSubmitGate2Grid = Boolean(
    isGridMode &&
    gridReviewTask &&
    String(effectiveReviewStatus) === 'InProgress' &&
    isSelfGate2Review,
  );
  const canApprove = isGridMode
    ? !isApproved &&
      !isSelfGate2Review &&
      (String(effectiveReviewStatus) === 'Submitted' ||
        String(effectiveReviewStatus) === 'UnderReview') &&
      (effectiveRole === 'EDITOR' || effectiveRole === 'PRODUCER' || !effectiveRole)
    : !isApproved &&
      (effectiveRole === 'EDITOR' ||
        effectiveRole === 'PRODUCER' ||
        String(effectiveReviewStatus) === 'UnderReview' ||
        String(effectiveReviewStatus) === 'InProgress');

  return (
    <div
      className='w-full h-full flex flex-col bg-[#F3F0E9] overflow-hidden select-none font-sans'
      data-testid='chapter-review-view'
    >
      {/* 1. TOP BAR / HEADER */}
      <PageHeader
        variant='toolbar'
        className='shrink-0 px-6 py-2.5 flex items-center justify-between gap-4 z-20 shadow-xs'
      >
        <div className='flex items-center gap-3 min-w-0'>
          <button
            type='button'
            onClick={() => {
              if (onCloseWithoutDecision) {
                void onCloseWithoutDecision();
              } else if (effectiveWsId && seriesId) {
                navigate(`/workspaces/${effectiveWsId}/series/${seriesId}/editor/desk`);
              } else {
                navigate(-1);
              }
            }}
            aria-label={t('chapterReview.backToDeskAria')}
            className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F0E9] text-stone-600 hover:text-stone-900 cursor-pointer transition-colors shadow-2xs border border-head-line shrink-0'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>

          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap min-w-0'>
              <span className='px-2 py-0.5 rounded text-xs font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#F97316]/30 uppercase tracking-wide shrink-0'>
                Gate 2
              </span>
              <h2
                className='text-sm sm:text-base font-serif font-bold text-stone-900 truncate min-w-0'
                title={chapterTitle}
              >
                {chapterTitle} · Quality & Composite Gate
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${
                  isApproved
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {effectiveReviewStatus}
              </span>
              {gridReviewTask?.isInputOutdated && (
                <span
                  data-testid='chapter-review-input-outdated-badge'
                  className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-xs font-semibold text-amber-900 shrink-0'
                >
                  <AlertTriangle className='w-3 h-3 text-amber-700 shrink-0' />
                  <span>{t('chapterReview.inputOutdatedBadge')}</span>
                </span>
              )}
            </div>
            <p className='text-xs text-stone-600 font-medium truncate'>
              {t('chapterReview.roleLabel')}:{' '}
              <span className='font-semibold text-stone-900'>{effectiveRole || 'Editor'}</span> ·{' '}
              {t('chapterReview.finishedPagesCount', { count: pages.length })}
            </p>
          </div>
        </div>

        {/* 3-Step Stepper in Header */}
        <div className='hidden lg:flex items-center gap-1.5 px-3 py-1 bg-head-wash border border-head-line rounded-full text-xs font-semibold shrink-0'>
          <span className='px-2 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs'>
            <span>1</span>
            <span>{t('chapterReview.stepper.editor')}</span>
          </span>
          <span className='text-stone-400'>→</span>
          <span className='px-2 py-0.5 rounded-full text-stone-500 flex items-center gap-1'>
            <span>2</span>
            <span>{t('chapterReview.stepper.producer')}</span>
          </span>
          <span className='text-stone-400'>→</span>
          <span className='px-2 py-0.5 rounded-full text-stone-500 flex items-center gap-1'>
            <span>3</span>
            <span>{t('chapterReview.stepper.publisher')}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2 shrink-0'>
          {/* Button Yêu cầu vẽ lại (Stitch id="btn-rework-count") */}
          <button
            id='btn-rework-count'
            type='button'
            onClick={() => setActiveTab('changes')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
              totalOpenCrs > 0
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-white text-stone-600 border-head-line hover:bg-stone-50'
            }`}
          >
            <AlertTriangle className='w-3.5 h-3.5 text-rose-600' />
            <span>{t('chapterReview.redrawRequestsBtn', { count: totalOpenCrs })}</span>
          </button>

          <button
            type='button'
            onClick={() => setIsProvenanceOpen(true)}
            className='px-3 py-1.5 flex items-center gap-1.5 border border-head-line bg-white hover:bg-stone-50 text-stone-900 text-xs font-semibold rounded-full cursor-pointer shadow-xs transition-colors'
            title={t('chapterReview.provenanceTitle')}
            data-testid='btn-provenance-modal'
          >
            <History className='w-3.5 h-3.5 text-stone-500' />
            <span>{t('chapterReview.provenance')}</span>
          </button>

          <button
            type='button'
            onClick={() => setIsSubmissionsOpen(true)}
            className='px-3 py-1.5 flex items-center gap-1.5 border border-head-line bg-white hover:bg-stone-50 text-stone-900 text-xs font-semibold rounded-full cursor-pointer shadow-xs transition-colors'
            title={t('chapterReview.submissionsTitle')}
            data-testid='btn-submissions-history'
          >
            <Clock className='w-3.5 h-3.5 text-stone-500' />
            <span>{t('chapterReview.historyCount', { count: submissions.length })}</span>
          </button>

          {(String(effectiveReviewStatus) === 'Assigned' ||
            (isGridMode && String(effectiveReviewStatus) === 'ReworkRequired')) && (
            <button
              type='button'
              disabled={actionBusy}
              onClick={() => void handleStartReview()}
              className='px-4 py-1.5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full disabled:opacity-50 cursor-pointer shadow-xs transition-colors'
            >
              <Eye className='w-3.5 h-3.5' />
              <span>{t('chapterReview.startReviewBtn')}</span>
            </button>
          )}

          {canSubmitGate2Grid && (
            <button
              type='button'
              disabled={actionBusy || !!unfinishedWarning}
              onClick={() => void handleSubmitGate2GridReview()}
              data-testid='btn-submit-chapter-review'
              className='px-4 py-1.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors'
            >
              <Send className='w-3.5 h-3.5' />
              <span>{t('chapterReview.gate2GridSubmitChapterReview')}</span>
            </button>
          )}

          {canApprove && (
            <button
              type='button'
              disabled={actionBusy || isApproved || !!unfinishedWarning}
              onClick={() => void handleApproveChapter()}
              title={
                unfinishedWarning
                  ? t('chapterReview.approveBlockedTitle')
                  : t('chapterReview.approveTooltip')
              }
              className='px-5 py-2 flex items-center gap-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-all active:scale-98'
              data-testid='btn-approve-chapter-review'
            >
              <CheckCircle2 className='w-4 h-4' />
              <span>{t('chapterReview.approveGate2Btn')}</span>
            </button>
          )}

          {isApproved && (
            <div className='px-4 py-2 flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-full shadow-xs'>
              <CheckCircle2 className='w-4 h-4 text-emerald-600' />
              <span>{t('chapterReview.approvedChapterBadge')}</span>
            </div>
          )}
        </div>
      </PageHeader>

      {/* WARNING BANNERS */}
      {unfinishedWarning && unfinishedWarning.length > 0 && (
        <div
          className='shrink-0 px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2'
          data-testid='chapter-unfinished-warning-banner'
        >
          <AlertOctagon className='w-4 h-4 text-red-600 shrink-0' />
          <div>
            <span>{t('chapterReview.unfinishedBannerPrefix')} </span>
            <span className='font-bold text-red-900'>
              {unfinishedWarning.map(formatUnfinishedWarningText).join(' · ')}
            </span>
          </div>
        </div>
      )}

      {backendBlockError && (
        <div
          className='shrink-0 px-6 py-2.5 bg-red-100 border-b border-red-300 text-red-900 text-xs font-bold flex items-center justify-between gap-2'
          data-testid='backend-block-error-banner'
        >
          <div className='flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
            <span className='whitespace-pre-line break-words'>{backendBlockError}</span>
          </div>
          <button
            type='button'
            onClick={() => setBackendBlockError(null)}
            className='text-red-700 hover:text-red-900 font-bold p-1 cursor-pointer'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      )}

      {/* 2. THREE-COLUMN MAIN LAYOUT */}
      <div className='flex-1 flex overflow-hidden'>
        {/* COLUMN 1: LEFT SIDEBAR - PAGE LIST */}
        <div className='w-72 md:w-80 shrink-0 border-r border-head-line bg-[#FCFBF8] flex flex-col h-full overflow-hidden'>
          <div className='p-2.5 border-b border-head-line bg-head-wash flex items-center justify-between gap-1'>
            <div className='inline-flex p-0.5 rounded-lg bg-stone-200/70 text-xs font-semibold'>
              <button
                type='button'
                onClick={() => setLeftSidebarTab('pages')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  leftSidebarTab === 'pages'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Trang ({pages.length})
              </button>
              <button
                type='button'
                onClick={() => setLeftSidebarTab('script')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  leftSidebarTab === 'script'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <BookOpen className='w-3 h-3 text-orange-600' />
                <span>{t('chapterReview.scriptTab')}</span>
              </button>
            </div>
            <span className='text-xs text-stone-600 font-medium'>
              {t('chapterReview.selectedPageLabel', { page: currentPage?.pageNumber || 1 })}
            </span>
          </div>

          {leftSidebarTab === 'script' ? (
            <div className='p-3.5 space-y-3 flex-1 overflow-y-auto'>
              <div className='pb-2 border-b border-stone-200'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5'>
                    <BookOpen className='w-3.5 h-3.5 text-orange-600' />
                    {t('chapterReview.scriptReferenceTitle')}
                  </span>
                  <span className='text-xs font-mono px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded'>
                    {t('chapterReview.pageBadge', { page: currentPage?.pageNumber || 1 })}
                  </span>
                </div>
                <p className='text-xs text-stone-500 mt-0.5'>
                  {t('chapterReview.scriptReferenceHint')}
                </p>
              </div>

              <div className='space-y-2'>
                {currentPagePanels.length === 0 ? (
                  <p className='text-xs text-stone-400 py-4 text-center'>
                    {t('chapterReview.noPanelsOnPage')}
                  </p>
                ) : (
                  currentPagePanels.map((p, idx) => {
                    const pNum = p.panelNumber || idx + 1;
                    const pCrs = (changeRequestsByPage.get(selectedPageId) || []).filter(
                      (cr) => cr.panelId === p.id && String(cr.status) === 'Open',
                    );
                    const isSelected = selectedPanelId === p.id;
                    return (
                      <div
                        key={p.id}
                        id={`script-card-${pNum}`}
                        onClick={() => setSelectedPanelId(p.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer shadow-xs transition-all space-y-1.5 ${
                          isSelected
                            ? 'bg-orange-50/70 border-2 border-orange-500'
                            : 'bg-white border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div className='flex items-center justify-between'>
                          <span className='text-xs font-bold text-stone-900'>
                            {t('chapterReview.panelLabel', {
                              page: currentPage?.pageNumber || 1,
                              panel: pNum,
                            })}
                          </span>
                          {pCrs.length > 0 ? (
                            <span className='px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold'>
                              {t('chapterReview.panelOpenCrs', { count: pCrs.length })}
                            </span>
                          ) : (
                            <span className='px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold'>
                              {t('chapterReview.panelMatched')}
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-stone-600 italic leading-relaxed'>
                          {p.direction || t('chapterReview.panelDirectionFallback')}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className='flex-1 overflow-y-auto p-3 space-y-2.5'>
              {/* Synchronized script-card elements in DOM for tests / Stitch selectors */}
              <div className='hidden' aria-hidden='true'>
                {currentPagePanels.map((p, idx) => {
                  const pNum = p.panelNumber || idx + 1;
                  return (
                    <div
                      key={`synced-card-${p.id}`}
                      id={`script-card-${pNum}`}
                      onClick={() => setSelectedPanelId(p.id)}
                    >
                      Khung {pNum}
                    </div>
                  );
                })}
              </div>
              {pages.map((page, idx) => {
                const isSelected = page.id === selectedPageId;
                const cached = compositeSessionCache.get(page.id);
                const panelCount = activePanels.filter((p) => p.pageId === page.id).length;
                const pageCrCount = (changeRequestsByPage.get(page.id) || []).filter(
                  (cr) => String(cr.status) === 'Open',
                ).length;

                // Compute stages status for this page
                const summary = computePageProgressSummary(
                  page.id,
                  activePanels.filter((p) => p.pageId === page.id).map((p) => p.id),
                  stages,
                  stageProgressList,
                  chapterAssignments,
                );

                const isPageIncomplete = summary.approvedStageCount < summary.totalActiveStages;

                return (
                  <div
                    key={page.id}
                    onClick={() => setSelectedPageId(page.id)}
                    data-testid={`page-item-${page.id}`}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                      isSelected
                        ? 'bg-[#FFF2E6] border-[#C2410C] ring-2 ring-[#F97316]/30 shadow-xs'
                        : 'bg-[#FCFBF8] border-[#D8D2C5] hover:border-[#F97316]/50 hover:bg-[#F3F0E9]'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className='w-16 h-24 shrink-0 rounded-lg border border-stone-200 bg-stone-100 overflow-hidden flex items-center justify-center relative'>
                      {cached?.dataUrl ? (
                        <img
                          src={cached.dataUrl}
                          alt={t('artworkReview.header.page', { number: page.pageNumber })}
                          className='w-full h-full object-contain'
                        />
                      ) : (
                        <span className='text-xs text-stone-400 font-medium text-center px-1'>
                          {cached
                            ? cached.hasArtwork
                              ? t('chapterReview.thumbImage')
                              : t('chapterReview.thumbNoImage')
                            : t('chapterReview.thumbLoading')}
                        </span>
                      )}

                      {cached?.hasArtwork && !cached.hasText && (
                        <span className='absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500 text-white'>
                          {t('chapterReview.noTextShort')}
                        </span>
                      )}
                      {cached?.baseStageName && (
                        <span className='absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold bg-black/75 text-white font-mono'>
                          {cached.baseStageName}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className='flex-1 min-w-0 flex flex-col justify-between py-0.5'>
                      <div>
                        <div className='flex items-center justify-between gap-1'>
                          <h4 className='text-xs font-bold text-stone-900 truncate'>
                            {t('artworkReview.header.page', { number: page.pageNumber })}
                          </h4>
                          {pageCrCount > 0 ? (
                            <span className='px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200'>
                              {t('chapterReview.issuesCount', { count: pageCrCount })}
                            </span>
                          ) : isPageIncomplete ? (
                            <span className='px-1.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200'>
                              {t('chapterReview.pageIncomplete')}
                            </span>
                          ) : (
                            <span className='px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800'>
                              {t('chapterReview.pagePassed')}
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-stone-500'>
                          {panelCount > 0
                            ? t('chapterReview.panelsCount', { count: panelCount })
                            : t('chapterReview.singlePage')}{' '}
                          ·{' '}
                          {t('chapterReview.stagesProgress', {
                            done: summary.approvedStageCount,
                            total: summary.totalActiveStages,
                          })}
                        </p>
                      </div>

                      {/* Mini 1->7 stage progress bar */}
                      <div className='pt-1.5 border-t border-stone-100 flex items-center gap-1 flex-wrap'>
                        {stages.map((st) => {
                          const status = summary.stageStatuses[st.id] || 'NotStarted';
                          const cfg = STAGE_STATUS_CONFIG[status];
                          return (
                            <span
                              key={st.id}
                              title={`${st.stageOrder}. ${st.name}: ${cfg.label}`}
                              className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor} border border-black/10`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMN 2: CENTER - MAIN COMPOSITE VIEWER */}
        <div className='flex-1 flex flex-col h-full overflow-hidden bg-[#F3F0E9] relative'>
          {/* Top Viewer Toolbar */}
          <div className='h-11 shrink-0 bg-head-wash/95 backdrop-blur-md border-b border-head-line px-4 flex items-center justify-between text-stone-900 z-10'>
            {/* Page navigation */}
            <div className='flex items-center gap-2'>
              <button
                type='button'
                disabled={selectedPageIndex <= 0}
                onClick={() => setSelectedPageId(pages[selectedPageIndex - 1].id)}
                className='p-1 rounded-lg hover:bg-[#F3F0E9] text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors'
                title={t('chapterReview.prevPageTitle')}
                data-testid='btn-prev-page'
              >
                <ChevronLeft className='w-4 h-4' />
              </button>
              <span className='text-xs font-semibold font-mono text-stone-900'>
                {t('chapterReview.pageCounter', {
                  current: currentPage?.pageNumber || 1,
                  total: pages.length,
                })}
              </span>
              <button
                type='button'
                disabled={selectedPageIndex >= pages.length - 1}
                onClick={() => setSelectedPageId(pages[selectedPageIndex + 1].id)}
                className='p-1 rounded-lg hover:bg-[#F3F0E9] text-stone-600 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors'
                title={t('chapterReview.nextPageTitle')}
                data-testid='btn-next-page'
              >
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>

            {/* Mode: Khoanh vùng vs Di chuyển */}
            <div className='flex items-center gap-2'>
              <div className='flex items-center bg-[#F3F0E9] border border-head-line rounded-lg p-0.5'>
                <button
                  type='button'
                  onClick={() => setIsDrawTool(true)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDrawTool
                      ? 'bg-orange-50 text-stone-900 border border-[#C2410C] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  data-testid='btn-tool-draw'
                >
                  <Square className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>{t('chapterReview.toolDraw')}</span>
                </button>
                <button
                  type='button'
                  onClick={() => setIsDrawTool(false)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    !isDrawTool
                      ? 'bg-orange-50 text-stone-900 border border-[#C2410C] shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  data-testid='btn-tool-pan'
                >
                  <Move className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>{t('chapterReview.toolPan')}</span>
                </button>
              </div>

              {drawingHint && (
                <span className='px-2.5 py-1 rounded bg-amber-500 text-white text-xs font-bold animate-pulse shadow-md'>
                  💡 {drawingHint}
                </span>
              )}
            </div>

            {/* Zoom Controls */}
            <div className='flex items-center gap-1.5'>
              <button
                type='button'
                onClick={() => handleZoom(0.2)}
                className='p-1.5 rounded hover:bg-[#E7E5E4] text-stone-600 hover:text-stone-900 cursor-pointer'
                title={t('artworkReview.toolbar.zoomIn')}
              >
                <ZoomIn className='w-3.5 h-3.5' />
              </button>
              <span className='text-xs font-mono text-stone-600 w-12 text-center'>
                {Math.round(zoomTransform.scale * 100)}%
              </span>
              <button
                type='button'
                onClick={() => handleZoom(-0.2)}
                className='p-1.5 rounded hover:bg-[#E7E5E4] text-stone-600 hover:text-stone-900 cursor-pointer'
                title={t('artworkReview.toolbar.zoomOut')}
              >
                <ZoomOut className='w-3.5 h-3.5' />
              </button>
              <button
                type='button'
                onClick={resetZoom}
                className='px-2 py-1 rounded border border-[#E7E7E7] hover:bg-[#E7E5E4] text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer'
                title={t('chapterReview.resetZoomTitle')}
              >
                Fit
              </button>
            </div>
          </div>

          {/* Main Viewport Container */}
          <div
            className='flex-1 overflow-hidden flex items-center justify-center p-4 relative'
            onMouseDown={onMouseDownViewer}
          >
            {loadingComposite ? (
              <div className='flex flex-col items-center justify-center gap-2 text-stone-500'>
                <Loader2 className='w-8 h-8 animate-spin text-amber-500' />
                <span className='text-xs font-semibold'>
                  {t('chapterReview.buildingComposite')}
                </span>
              </div>
            ) : !activeComposite?.dataUrl ? (
              <div className='w-96 h-[32rem] bg-white border-2 border-dashed border-[#E7E7E7] rounded-2xl flex flex-col items-center justify-center gap-3 text-stone-500 p-6 text-center'>
                <AlertTriangle className='w-10 h-10 text-amber-500' />
                <p className='text-sm font-bold text-stone-700'>
                  {t('chapterReview.noArtworkTitle')}
                </p>
                <p className='text-xs text-stone-500'>{t('chapterReview.noArtworkDesc')}</p>
              </div>
            ) : (
              <div
                ref={imageWrapperRef}
                style={{
                  transform: `translate(${zoomTransform.x}px, ${zoomTransform.y}px) scale(${zoomTransform.scale})`,
                  transformOrigin: 'center center',
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                }}
                className={`relative inline-block select-none shadow-2xl rounded border border-[#E7E7E7] max-h-[85vh] ${
                  isDrawTool ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
                }`}
                data-testid='composite-page-canvas'
              >
                <img
                  src={activeComposite.dataUrl}
                  alt={t('chapterReview.finishedPageAlt', { page: currentPage?.pageNumber ?? '' })}
                  draggable={false}
                  className='max-h-[85vh] w-auto object-contain block'
                />

                {/* Stitch view-reader: Panel frames */}
                {currentPagePanels.map((p, idx) => {
                  const pNum = p.panelNumber || idx + 1;
                  const isSelected = selectedPanelId === p.id;
                  return (
                    <div
                      key={p.id}
                      id={`panel-frame-${pNum}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPanelId(p.id);
                      }}
                      className={`panel-frame absolute pointer-events-auto cursor-pointer ${
                        isSelected ? 'ring-2 ring-orange-500' : ''
                      }`}
                    />
                  );
                })}

                {/* Badge if artwork exists but no text */}
                {!activeComposite.hasText && (
                  <span className='absolute top-3 left-3 px-2 py-1 rounded bg-amber-600/90 text-white text-xs font-bold shadow-md'>
                    {t('chapterReview.noTextBadge')}
                  </span>
                )}

                {/* Current Active Drawing Box */}
                {drawing && (
                  <div
                    style={{
                      left: `${drawing.box.x * 100}%`,
                      top: `${drawing.box.y * 100}%`,
                      width: `${drawing.box.w * 100}%`,
                      height: `${drawing.box.h * 100}%`,
                    }}
                    className='absolute border-2 border-dashed border-amber-400 bg-amber-400/20 pointer-events-none z-30'
                  />
                )}

                {/* Saved Draft Region Box */}
                {draftRegion && (
                  <div
                    style={{
                      left: `${draftRegion.box.x * 100}%`,
                      top: `${draftRegion.box.y * 100}%`,
                      width: `${draftRegion.box.w * 100}%`,
                      height: `${draftRegion.box.h * 100}%`,
                    }}
                    className='absolute border-2 border-amber-500 bg-amber-500/25 pointer-events-none z-30 flex items-start p-1'
                  >
                    <span className='px-1.5 py-0.5 rounded text-xs font-bold bg-amber-600 text-white shadow-xs'>
                      {t('chapterReview.draftRegionBadge')}
                      {draftRegion.panelId ? ` (${t('chapterReview.panelTag')})` : ''}
                    </span>
                  </div>
                )}

                {/* Existing Change Request Boxes of this page */}
                {activePageChangeRequests.map((cr, idx) => {
                  const b = parseRegionBox(cr.regionJson);
                  if (!b) return null;
                  const isOp = String(cr.status) === 'Open';
                  const isVer = String(cr.status) === 'Verified';
                  const isHigh = highlightedCrId === cr.id;

                  return (
                    <div
                      key={cr.id}
                      data-cr-box='true'
                      onClick={(e) => {
                        e.stopPropagation();
                        setHighlightedCrId(cr.id);
                        setActiveTab('changes');
                      }}
                      style={{
                        left: `${b.x * 100}%`,
                        top: `${b.y * 100}%`,
                        width: `${b.w * 100}%`,
                        height: `${b.h * 100}%`,
                      }}
                      title={`#${idx + 1}: ${cr.description} (${cr.status})`}
                      className={`absolute border-2 transition-all cursor-pointer z-20 flex items-start justify-between p-0.5 ${
                        isOp
                          ? 'border-red-500 bg-red-500/20'
                          : isVer
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-amber-500 bg-amber-500/20'
                      } ${isHigh ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-extrabold text-white ${
                          isOp ? 'bg-red-600' : isVer ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      {cr.panelId && (
                        <span className='px-1.5 py-0.5 rounded text-xs font-bold bg-black/60 text-white'>
                          {t('chapterReview.panelTag')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: RIGHT TAB PANEL */}
        <div className='w-96 shrink-0 border-l border-head-line bg-[#FCFBF8] flex flex-col h-full overflow-hidden'>
          {/* Tab Navigation */}
          <div className='flex border-b border-head-line bg-head-wash shrink-0 text-xs font-bold'>
            <button
              type='button'
              onClick={() => setActiveTab('changes')}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'changes'
                  ? 'border-[#C2410C] text-stone-900 bg-orange-50/60'
                  : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-[#F3F0E9]'
              }`}
            >
              <span>{t('chapterReview.changeRequests', 'Yêu cầu sửa')}</span>
              {changeRequests.filter((c) => String(c.status) === 'Open').length > 0 && (
                <span className='px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700'>
                  {changeRequests.filter((c) => String(c.status) === 'Open').length}
                </span>
              )}
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('checklist')}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'checklist'
                  ? 'border-[#C2410C] text-stone-900 bg-orange-50/60'
                  : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-[#F3F0E9]'
              }`}
            >
              <CheckSquare className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>{t('chapterReview.checklist', 'Checklist')}</span>
              <span className='px-1.5 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-100 text-stone-600'>
                {Object.values(checklist).filter(Boolean).length}/5
              </span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('consistency')}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'consistency'
                  ? 'border-[#C2410C] text-stone-900 bg-orange-50/60'
                  : 'border-transparent text-stone-600 hover:text-stone-900 hover:bg-[#F3F0E9]'
              }`}
            >
              <Sparkles className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>{t('chapterReview.consistency', 'Nhất quán')}</span>
              {findings.length > 0 && (
                <span className='px-1.5 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-100 text-stone-600'>
                  {findings.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: YÊU CẦU SỬA (CHANGE REQUESTS) */}
          {activeTab === 'changes' && (
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {/* Lưới V3: Duyệt trực tiếp từng ô của Trang đang chọn qua API task-grid */}
              {isGridMode && currentPage && currentPageGridCells.length > 0 && (
                <div
                  data-testid='gate2-grid-cells-panel'
                  className='p-3.5 rounded-xl border border-head-line bg-white space-y-2.5 shadow-2xs'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='text-xs font-bold text-stone-900 flex items-center gap-1.5'>
                      <Layers className='w-3.5 h-3.5 text-[#C2410C]' />
                      <span>
                        {t('chapterReview.gate2GridTitle', {
                          page: currentPage.pageNumber,
                        })}
                      </span>
                    </span>
                  </div>

                  <div className='space-y-2'>
                    {currentPageGridCells.map((cell) => {
                      const st = stageMap.get(cell.pipelineStageId);
                      const member = cell.assigneeUserId
                        ? memberMap.get(cell.assigneeUserId)
                        : undefined;
                      const assigneeLabel =
                        member?.fullName ||
                        member?.email ||
                        cell.assigneeUserId ||
                        t('chapterReview.unassigned');
                      const isReviewable =
                        cell.status === 'Submitted' || cell.status === 'UnderReview';
                      const isSelfCell = Boolean(
                        currentUserId && cell.assigneeUserId === currentUserId,
                      );
                      const isCellLockedByOther = Boolean(
                        cell.status === 'UnderReview' &&
                        cell.reviewerUserId &&
                        cell.reviewerUserId !== currentUserId,
                      );
                      const reviewerLabel = gridReviewerNames[cell.id] || cell.reviewerUserId || '';
                      const isProducerViewer =
                        String(effectiveRole || '').toUpperCase() === 'PRODUCER';
                      const reworkDisplay = resolveReworkReasonDisplay(
                        cell,
                        gridCommentsByTask[cell.id],
                      );

                      return (
                        <div
                          key={cell.id}
                          data-testid={`gate2-grid-cell-${cell.id}`}
                          className='rounded-lg border border-stone-200 bg-[#FCFBF8] p-2.5 space-y-2 text-xs'
                        >
                          <div className='flex items-center justify-between gap-2 flex-wrap'>
                            <div className='min-w-0'>
                              <div className='font-bold text-stone-900'>
                                {st?.stageOrder ? `${st.stageOrder}. ` : ''}
                                {st?.name || 'Stage'}
                              </div>
                              <div className='text-xs text-stone-500 truncate'>
                                👤 {assigneeLabel}
                              </div>
                            </div>
                            <div className='flex items-center gap-1.5 flex-wrap'>
                              {cell.isInputOutdated && (
                                <span
                                  data-testid={`gate2-cell-input-outdated-${cell.id}`}
                                  className='inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-300 bg-amber-100 text-xs font-semibold text-amber-900'
                                >
                                  <AlertTriangle className='w-3 h-3 text-amber-700 shrink-0' />
                                  <span>
                                    {t('chapterReview.inputOutdatedBadge', 'Đầu vào đã đổi')}
                                  </span>
                                </span>
                              )}
                              <span className='px-2 py-0.5 rounded border border-stone-300 bg-white text-xs font-semibold text-stone-800'>
                                {cell.status}
                              </span>
                            </div>
                          </div>

                          {reworkDisplay && (
                            <div
                              data-testid={
                                reworkDisplay.kind === 'reopen'
                                  ? `gate2-cell-reopen-reason-${cell.id}`
                                  : `gate2-cell-last-comment-${cell.id}`
                              }
                              title={
                                reworkDisplay.kind === 'reopen'
                                  ? `${t('chapterReview.reopenReasonPrefix', 'Producer mở lại:')} ${reworkDisplay.text}`
                                  : `${t('chapterReview.gate2GridLastComment', 'Nhận xét lần duyệt gần nhất')}: ${reworkDisplay.text}`
                              }
                              className='rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-900'
                            >
                              {reworkDisplay.kind === 'reopen' ? (
                                <>
                                  🔄{' '}
                                  <span className='font-semibold'>
                                    {t('chapterReview.reopenReasonPrefix', 'Producer mở lại:')}
                                  </span>{' '}
                                  {reworkDisplay.text}
                                </>
                              ) : (
                                <>
                                  💬{' '}
                                  <span className='font-semibold'>
                                    {t('chapterReview.gate2GridLastComment')}:
                                  </span>{' '}
                                  {reworkDisplay.text}
                                </>
                              )}
                            </div>
                          )}

                          {isCellLockedByOther && (
                            <div
                              data-testid={`gate2-cell-locked-by-other-${cell.id}`}
                              className='rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 flex items-center justify-between gap-1.5 flex-wrap'
                            >
                              <span className='inline-flex items-center gap-1'>
                                <Lock className='w-3 h-3 text-amber-600 shrink-0' />
                                {t('chapterReview.underReviewBy', {
                                  name: reviewerLabel,
                                })}
                              </span>
                              {isProducerViewer && (
                                <button
                                  type='button'
                                  data-testid={`gate2-force-release-cell-${cell.id}`}
                                  disabled={gridCellBusyId !== null}
                                  onClick={() => void handleReleaseGridCellReview(cell)}
                                  className='inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-950 cursor-pointer disabled:opacity-50'
                                >
                                  <RotateCcw className='w-3 h-3' />
                                  <span>{t('chapterReview.forceReleaseReviewBtn')}</span>
                                </button>
                              )}
                            </div>
                          )}

                          {isReviewable && (
                            <div className='flex flex-wrap items-center gap-1.5 pt-0.5'>
                              {isSelfCell ? (
                                <span
                                  data-testid={`gate2-cell-self-locked-${cell.id}`}
                                  className='inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900'
                                >
                                  <Lock className='w-3 h-3 text-amber-600' />
                                  <span>{t('chapterReview.gate2GridSelfReviewLocked')}</span>
                                </span>
                              ) : (
                                <>
                                  <button
                                    type='button'
                                    data-testid={`gate2-approve-cell-${cell.id}`}
                                    disabled={
                                      gridCellBusyId !== null ||
                                      cell.isInputOutdated ||
                                      isCellLockedByOther
                                    }
                                    onClick={() => void handleApproveGridCell(cell)}
                                    className='inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                                  >
                                    {gridCellBusyId === `approve:${cell.id}` ? (
                                      <Loader2 className='w-3 h-3 animate-spin' />
                                    ) : (
                                      <CheckCircle2 className='w-3 h-3' />
                                    )}
                                    <span>{t('chapterReview.gate2GridApproveCell')}</span>
                                  </button>
                                  <button
                                    type='button'
                                    data-testid={`gate2-request-changes-toggle-${cell.id}`}
                                    disabled={gridCellBusyId !== null || isCellLockedByOther}
                                    onClick={() => {
                                      setRejectingGridCellId((prev) =>
                                        prev === cell.id ? null : cell.id,
                                      );
                                      setRejectGridCellComment('');
                                    }}
                                    className='inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 px-2.5 py-1 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                                  >
                                    <XCircle className='w-3 h-3' />
                                    <span>{t('chapterReview.gate2GridRequestChanges')}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {rejectingGridCellId === cell.id && !isSelfCell && (
                            <div className='rounded-lg border border-rose-200 bg-rose-50/70 p-2 space-y-1.5'>
                              <textarea
                                rows={2}
                                data-testid={`gate2-request-changes-input-${cell.id}`}
                                value={rejectGridCellComment}
                                onChange={(e) => setRejectGridCellComment(e.target.value)}
                                placeholder={t(
                                  'chapterReview.gate2GridCommentPlaceholder',
                                  'Nhập nhận xét yêu cầu sửa bắt buộc (BR-06)...',
                                )}
                                aria-label={t(
                                  'chapterReview.gate2GridCommentPlaceholder',
                                  'Nhập nhận xét yêu cầu sửa bắt buộc (BR-06)...',
                                )}
                                className='w-full rounded border border-rose-300 bg-white px-2 py-1.5 text-xs text-stone-900'
                              />
                              <div className='flex items-center justify-end gap-1.5'>
                                <button
                                  type='button'
                                  onClick={() => {
                                    setRejectingGridCellId(null);
                                    setRejectGridCellComment('');
                                  }}
                                  className='px-2 py-1 rounded border border-stone-300 bg-white text-xs font-semibold text-stone-700 cursor-pointer'
                                >
                                  {t('desk.cancel')}
                                </button>
                                <button
                                  type='button'
                                  data-testid={`gate2-confirm-request-changes-${cell.id}`}
                                  disabled={
                                    gridCellBusyId !== null || !rejectGridCellComment.trim()
                                  }
                                  onClick={() => void handleRequestChangesGridCell(cell)}
                                  className='px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50'
                                >
                                  {t('chapterReview.gate2GridConfirmReturn')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form tạo yêu cầu sửa mới cho trang đang chọn */}
              <div className='p-3.5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold text-stone-900 flex items-center gap-1.5'>
                    <Send className='w-3.5 h-3.5 text-amber-600' />
                    {t('chapterReview.form.title', { page: currentPage?.pageNumber ?? '' })}
                  </span>
                  {draftRegion && (
                    <button
                      type='button'
                      onClick={() => setDraftRegion(null)}
                      className='text-xs font-semibold text-stone-500 hover:text-red-600 flex items-center gap-1 cursor-pointer'
                    >
                      <Trash2 className='w-3 h-3' /> {t('chapterReview.form.clearRegion')}
                    </button>
                  )}
                </div>

                {/* Draft region info */}
                {draftRegion && (
                  <div className='p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900 flex items-center justify-between'>
                    <span>
                      {t('chapterReview.form.regionLabel')}: x {Math.round(draftRegion.box.x * 100)}
                      %, y {Math.round(draftRegion.box.y * 100)}%, w{' '}
                      {Math.round(draftRegion.box.w * 100)}%, h{' '}
                      {Math.round(draftRegion.box.h * 100)}%
                    </span>
                    {draftRegion.panelId && (
                      <span className='px-1.5 py-0.5 rounded bg-amber-600 text-white text-xs font-bold'>
                        {t('chapterReview.panelTag')}
                      </span>
                    )}
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleSubmitReturnWork} className='space-y-2.5'>
                  <div>
                    <label className='block text-xs font-bold text-stone-700 mb-1'>
                      {t('chapterReview.form.stageLabel')} <span className='text-red-500'>*</span>
                    </label>
                    <select
                      value={targetAssignmentId}
                      onChange={(e) => {
                        setTargetAssignmentId(e.target.value);
                        setAwaitingReviewConflict(null);
                      }}
                      className='w-full px-2.5 py-2 text-xs border border-stone-300 rounded-lg bg-white text-stone-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500'
                      data-testid='select-target-assignment'
                    >
                      <option value=''>{t('chapterReview.form.stagePlaceholder')}</option>
                      {targetOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <label className='block text-xs font-bold text-stone-700'>
                        {t('chapterReview.form.descLabel')} <span className='text-red-500'>*</span>
                      </label>
                      <span
                        id='selected-panel-badge'
                        className='font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-xs'
                      >
                        {t('readerView.selectedPanelBadge', { number: selectedPanelNumber })}
                      </span>
                    </div>
                    <textarea
                      id='panel-comment-input'
                      rows={3}
                      value={returnDescription}
                      onChange={(e) => setReturnDescription(e.target.value)}
                      placeholder={t('chapterReview.form.descPlaceholder')}
                      className='w-full px-2.5 py-2 text-xs border border-stone-300 rounded-lg bg-white text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500'
                      data-testid='input-return-description'
                    />
                  </div>

                  <div>
                    <label className='block text-xs font-bold text-stone-700 mb-1'>
                      {t('chapterReview.form.dueDateLabel')}
                    </label>
                    <input
                      type='date'
                      value={returnDueDate}
                      onChange={(e) => setReturnDueDate(e.target.value)}
                      className='w-full px-2.5 py-1.5 text-xs border border-stone-300 rounded-lg bg-white text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500'
                    />
                  </div>

                  {formError && (
                    <div className='p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs font-semibold'>
                      {formError}
                    </div>
                  )}

                  {/* 409 Conflict when target is awaiting review */}
                  {awaitingReviewConflict && (
                    <div
                      className='p-2.5 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs space-y-2'
                      data-testid='awaiting-review-conflict-banner'
                    >
                      <p className='font-bold flex items-center gap-1.5'>
                        <AlertTriangle className='w-4 h-4 text-red-600 shrink-0' />
                        {awaitingReviewConflict.message}
                      </p>
                      <button
                        type='button'
                        onClick={() => {
                          if (effectiveWsId && seriesId) {
                            navigate(
                              `/workspaces/${effectiveWsId}/series/${seriesId}/review/${awaitingReviewConflict.targetAssignmentId}?chapterId=${chapterId}`,
                            );
                          }
                        }}
                        className='w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors'
                      >
                        <ExternalLink className='w-3.5 h-3.5' />
                        <span>{t('chapterReview.form.openTaskReview')}</span>
                      </button>
                    </div>
                  )}

                  <button
                    type='submit'
                    disabled={submittingReturn || !targetAssignmentId || !returnDescription.trim()}
                    className='w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors'
                    data-testid='btn-submit-return-work'
                  >
                    {submittingReturn ? (
                      <Loader2 className='w-3.5 h-3.5 animate-spin' />
                    ) : (
                      <Send className='w-3.5 h-3.5' />
                    )}
                    <span>{t('chapterReview.returnWork')}</span>
                  </button>
                </form>
              </div>

              {/* Danh sách yêu cầu sửa của cả chương nhóm theo trang */}
              <div className='space-y-3 pt-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold text-stone-900'>
                    {t('chapterReview.crListTitle', { count: changeRequests.length })}
                  </span>
                  <div className='flex items-center gap-1 text-xs'>
                    {(['All', 'Open', 'Resolved', 'Verified'] as const).map((st) => (
                      <button
                        key={st}
                        type='button'
                        onClick={() => setCrFilter(st)}
                        className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                          crFilter === st
                            ? 'bg-stone-800 text-white'
                            : 'text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        {st === 'All' ? t('chapterReview.filterAll') : st}
                      </button>
                    ))}
                  </div>
                </div>

                <div id='panel-comments-list' className='space-y-3'>
                  {filteredChangeRequests.length === 0 ? (
                    <p className='text-center text-xs text-stone-400 py-6'>
                      {t('chapterReview.crListEmpty')}
                    </p>
                  ) : (
                    pages.map((page) => {
                      const pageCrs = changeRequestsByPage.get(page.id) || [];
                      if (pageCrs.length === 0) return null;

                      return (
                        <div key={page.id} className='space-y-2'>
                          <div className='text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded flex items-center justify-between'>
                            <span>
                              {t('artworkReview.header.page', { number: page.pageNumber })}
                            </span>
                            <span>{t('chapterReview.crPageCount', { count: pageCrs.length })}</span>
                          </div>

                          <div className='space-y-2'>
                            {pageCrs.map((cr, idx) => {
                              const isOp = String(cr.status) === 'Open';
                              const isRes = String(cr.status) === 'Resolved';
                              const isVer = String(cr.status) === 'Verified';
                              const as = chapterAssignments.find((a) => a.id === cr.assignmentId);
                              const st = as ? stageMap.get(as.pipelineStageId) : null;
                              const member = memberMap.get(cr.responsibleUserId);

                              return (
                                <div
                                  key={cr.id}
                                  className={`p-3 rounded-xl border bg-white space-y-2 text-xs transition-all ${
                                    highlightedCrId === cr.id
                                      ? 'ring-2 ring-amber-400'
                                      : 'border-stone-200'
                                  }`}
                                >
                                  <div className='flex items-center justify-between gap-1'>
                                    <div className='flex items-center gap-1.5'>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                          isOp
                                            ? 'bg-red-100 text-red-800'
                                            : isRes
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {cr.status}
                                      </span>
                                      <span className='font-bold text-stone-800'>
                                        {st?.name || t('chapterReview.defaultStageName')}
                                      </span>
                                    </div>
                                    <span className='text-xs text-stone-400'>
                                      {member?.fullName ||
                                        member?.email ||
                                        t('chapterReview.defaultAssignee')}
                                    </span>
                                  </div>

                                  <p className='text-stone-800'>{cr.description}</p>

                                  {cr.regionJson && (
                                    <div className='flex items-center gap-2'>
                                      <button
                                        type='button'
                                        onClick={() => {
                                          setSelectedPageId(page.id);
                                          setHighlightedCrId(cr.id);
                                        }}
                                        className='text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer'
                                      >
                                        <Square className='w-3 h-3' />{' '}
                                        {t('chapterReview.viewOnImage')}
                                      </button>
                                    </div>
                                  )}

                                  {/* Action Buttons for Editor */}
                                  {isRes && (
                                    <div className='pt-2 border-t border-stone-100 flex items-center justify-end gap-2'>
                                      <button
                                        type='button'
                                        onClick={() => void handleReopenChangeRequest(cr.id)}
                                        className='px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer'
                                      >
                                        {t('chapterReview.reopenBtn')}
                                      </button>
                                      <button
                                        type='button'
                                        onClick={() => void handleVerifyChangeRequest(cr.id)}
                                        className='px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1'
                                      >
                                        <CheckCircle2 className='w-3 h-3' />{' '}
                                        {t('chapterReview.verifyBtn')}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHECKLIST DUYỆT TRUYỆN */}
          {activeTab === 'checklist' && (
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              <div className='p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5'>
                <h4 className='text-xs font-bold text-purple-900 flex items-center gap-1.5'>
                  <CheckSquare className='w-4 h-4 text-purple-700' />
                  {t('chapterReview.checklistTitle')}
                </h4>
                <p className='text-xs text-purple-700'>{t('chapterReview.checklistHint')}</p>
              </div>

              <div className='space-y-3' data-testid='checklist-container'>
                {CHECKLIST_ITEMS.map((item) => {
                  const isChecked = !!checklist[item.id];
                  return (
                    <label
                      key={item.id}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type='checkbox'
                        checked={isChecked}
                        onChange={(e) =>
                          setChecklist((prev) => ({
                            ...prev,
                            [item.id]: e.target.checked,
                          }))
                        }
                        className='mt-0.5 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer'
                      />
                      <div className='flex-1'>
                        <span
                          className={`text-xs font-semibold ${isChecked ? 'text-emerald-900' : 'text-stone-800'}`}
                        >
                          {t(item.labelKey)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: NHẤT QUÁN (CONSISTENCY & VISUAL) */}
          {activeTab === 'consistency' && (
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {/* Script Consistency */}
              <div className='space-y-2.5'>
                <button
                  type='button'
                  disabled={actionBusy}
                  onClick={() => void handleRunConsistency()}
                  className='w-full py-2.5 flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 rounded-xl cursor-pointer'
                >
                  {actionBusy ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Play className='w-4 h-4' />
                  )}
                  <span>{t('chapterReview.runScriptConsistency')}</span>
                </button>

                {findings.length === 0 ? (
                  <p className='text-center text-xs text-stone-400 py-4'>
                    {t('chapterReview.noScriptFindings')}
                  </p>
                ) : (
                  <div className='space-y-2'>
                    {findings.map((f) => (
                      <div
                        key={f.id}
                        className='p-3 rounded-xl border border-stone-200 bg-white space-y-2 text-xs'
                      >
                        <div className='flex items-center justify-between'>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                              SEVERITY_STYLE[String(f.severity)] || 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {f.severity} · {f.ruleCode}
                          </span>
                          <span className='text-xs text-stone-500 font-bold'>
                            {t(`chapterReview.findingStatus.${String(f.status)}`, String(f.status))}
                          </span>
                        </div>
                        <p className='text-stone-800'>{f.message}</p>
                        {f.evidence && (
                          <blockquote className='text-xs text-stone-500 border-l-2 border-stone-300 pl-2 italic'>
                            {f.evidence}
                          </blockquote>
                        )}
                        {OPEN_FINDING.includes(String(f.status)) && (
                          <div className='flex items-center gap-1.5 pt-1 border-t border-stone-100'>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'Confirmed')}
                              className='p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                              title={t('chapterReview.triageConfirmTitle')}
                            >
                              <CheckCircle2 className='w-4 h-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'Rejected')}
                              className='p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer'
                              title={t('chapterReview.triageRejectTitle')}
                            >
                              <XCircle className='w-4 h-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'Ignored')}
                              className='p-1 rounded text-purple-600 hover:bg-purple-50 cursor-pointer'
                              title={t('chapterReview.triageIgnoreTitle')}
                            >
                              <MinusCircle className='w-4 h-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'NeedsClarification')}
                              className='p-1 rounded text-amber-600 hover:bg-amber-50 cursor-pointer'
                              title={t('chapterReview.triageClarifyTitle')}
                            >
                              <HelpCircle className='w-4 h-4' />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visual Consistency Section */}
              <div className='pt-4 border-t border-stone-200 space-y-3'>
                <div className='p-3 bg-violet-50/60 border border-violet-200 rounded-xl space-y-2.5'>
                  <div className='flex items-center justify-between text-xs font-bold text-violet-900'>
                    <span>{t('chapterReview.aiThresholdLabel')}</span>
                    <span className='font-mono bg-white px-2 py-0.5 rounded border border-violet-200'>
                      {Math.round(visualThreshold * 100)}%
                    </span>
                  </div>
                  <input
                    type='range'
                    min='0.5'
                    max='0.95'
                    step='0.05'
                    value={visualThreshold}
                    onChange={(e) => setVisualThreshold(parseFloat(e.target.value))}
                    className='w-full accent-violet-600 cursor-pointer'
                  />
                  <button
                    type='button'
                    disabled={actionBusy}
                    onClick={() => void handleRunVisual()}
                    className='w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5'
                  >
                    <Sparkles className='w-3.5 h-3.5' />
                    <span>{t('chapterReview.runVisualCheckBtn')}</span>
                  </button>
                </div>

                {visualReport && (
                  <div className='p-3 bg-white border border-stone-200 rounded-xl space-y-2 text-xs'>
                    <div className='grid grid-cols-3 gap-2 text-center'>
                      <div className='p-2 bg-stone-50 rounded-lg'>
                        <span className='text-xs text-stone-400'>
                          {t('chapterReview.visualTotalPanels')}
                        </span>
                        <p className='font-bold text-stone-900'>{visualReport.totalEvaluated}</p>
                      </div>
                      <div className='p-2 bg-emerald-50 rounded-lg'>
                        <span className='text-xs text-emerald-600'>
                          {t('chapterReview.visualPassed')}
                        </span>
                        <p className='font-bold text-emerald-800'>{visualReport.passedCount}</p>
                      </div>
                      <div className='p-2 bg-amber-50 rounded-lg'>
                        <span className='text-xs text-amber-600'>
                          {t('chapterReview.visualDeviations')}
                        </span>
                        <p className='font-bold text-amber-800'>{visualReport.deviationCount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {isProvenanceOpen && (
        <ChapterProvenanceModal
          onClose={() => setIsProvenanceOpen(false)}
          chapterId={chapterId}
          seriesId={seriesId}
          chapterNumber={chapterNumber}
          viewerRole={effectiveRole}
        />
      )}

      <Modal
        isOpen={isSubmissionsOpen}
        onClose={() => setIsSubmissionsOpen(false)}
        size='md'
        title={
          <span className='text-sm font-bold flex items-center gap-2'>
            <Clock className='w-4 h-4 text-stone-600' />
            {t('chapterReview.submissionsModalTitle')}
          </span>
        }
        closeLabel={t('chapterReview.closeBtn')}
      >
        <SubmissionHistory submissions={submissions} />
      </Modal>
    </div>
  );
};
