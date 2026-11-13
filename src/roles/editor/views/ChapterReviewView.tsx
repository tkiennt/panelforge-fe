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
import {
  Box,
  CHECKLIST_ITEMS,
  ChecklistId,
  normalizeRegionBox,
  parseRegionBox,
  findIntersectingPanelId,
  isRegionOverlappingText,
  suggestTargetAssignment,
  buildReturnWorkPayload,
  parse409AwaitingReview,
  roundCoord,
} from './chapterReviewViewUtils';
import type {
  AssignmentDto,
  ChangeRequestDto,
  ConsistencyFindingDto,
  PanelDto,
  StageProgressDto,
  SubmissionDto,
  VisualConsistencyReportDto,
} from '@/types';

export interface ChapterReviewViewProps {
  assignment: AssignmentDto;
  chapterId: string;
  seriesId: string;
  effectiveWsId?: string | null;
  effectiveRole?: string | null;
  currentUserId?: string | null;
  onShowToast?: (title: string, desc: string) => void;
}

type ReviewTab = 'changes' | 'checklist' | 'consistency';

const SEVERITY_STYLE: Record<string, string> = {
  Blocking: 'bg-red-50 text-red-700 border-red-200',
  Warning: 'bg-amber-50 text-amber-700 border-amber-200',
  Info: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const FINDING_LABEL: Record<string, string> = {
  Open: 'Chưa xử lý',
  Confirmed: 'Đã xác nhận',
  Rejected: 'Bác bỏ',
  Ignored: 'Bỏ qua',
  NeedsClarification: 'Cần làm rõ',
  Resolved: 'Đã sửa',
  Stale: 'Lỗi thời',
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
  const [chapterTitle, setChapterTitle] = useState<string>('');
  const [chapterNumber, setChapterNumber] = useState<number>(1);

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
      const [
        pagesRes,
        pipelineRes,
        assignmentsRes,
        progressRes,
        changeRequestsRes,
        submissionsRes,
        membersRes,
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
        assignmentService
          .getConsistencyFindings(chapterId)
          .catch(() => [] as ConsistencyFindingDto[]),
        assignmentService.getVisualConsistencyReport(chapterId, visualThreshold).catch(() => null),
      ]);

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

      const activeStages = getActivePipelineStages(pipelineRes?.stages ?? []);
      setStages(activeStages);
      setChapterAssignments(assignmentsRes);
      setStageProgressList(progressRes);
      setChangeRequests(changeRequestsRes);
      setSubmissions(submissionsRes);
      setMembers(membersRes);
      setFindings(findingsRes);
      setVisualReport(visualRes);

      // Chapter info from chapterService
      chapterService
        .getChapterById(chapterId)
        .then((ch) => {
          if (ch) {
            setChapterTitle(ch.title || `Chương ${ch.chapterNumber}`);
            setChapterNumber(ch.chapterNumber);
          }
        })
        .catch(() => {
          /* ignore */
        });
    } catch (err: any) {
      toast('Lỗi nạp dữ liệu', extractError(err, 'Không thể tải dữ liệu duyệt chương'));
    } finally {
      setLoading(false);
    }
  }, [chapterId, seriesId, assignment.id, effectiveWsId, visualThreshold, toast]);

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
        console.warn('Không thể dựng composite trang:', err);
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
          setDrawingHint('Kéo chuột để khoanh vùng');
          if (drawingHintTimerRef.current) clearTimeout(drawingHintTimerRef.current);
          drawingHintTimerRef.current = setTimeout(() => setDrawingHint(null), 3000);
          return;
        }

        // Valid box drawn: identify panel & smart target assignment
        const matchedPanelId = findIntersectingPanelId(box, activePanels);
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
  }, [activePanels, activeElements, currentPageAssignments, stages, currentPage]);

  // Handle Submit Return Work
  const handleSubmitReturnWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignmentId || !returnDescription.trim()) {
      setFormError('Vui lòng chọn công đoạn và nhập mô tả lỗi.');
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
      toast('Đã trả việc thành công', `Đã chuyển yêu cầu sửa cho công đoạn.`);
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
        const msg = extractError(err, 'Không thể gửi yêu cầu sửa.');
        setFormError(msg);
        toast('Không thể gửi yêu cầu', msg);
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
        'Xác minh đạt từ màn duyệt chương',
      );
      toast('Đã xác minh', 'Yêu cầu sửa đã được đánh dấu hoàn thành.');
      const crs = await assignmentService.getChangeRequests(chapterId);
      setChangeRequests(crs);
    } catch (err: any) {
      toast('Lỗi', extractError(err, 'Không thể xác minh yêu cầu.'));
    }
  };

  // Handle Reopen Change Request
  const handleReopenChangeRequest = async (crId: string) => {
    const reason = window.prompt('Nhập lý do mở lại yêu cầu sửa:');
    if (!reason || !reason.trim()) return;
    try {
      await assignmentService.reopenChangeRequest(chapterId, crId, reason.trim());
      toast('Đã mở lại yêu cầu', 'Công đoạn cần tiếp tục chỉnh sửa.');
      const crs = await assignmentService.getChangeRequests(chapterId);
      setChangeRequests(crs);
    } catch (err: any) {
      toast('Lỗi', extractError(err, 'Không thể mở lại yêu cầu.'));
    }
  };

  // Handle Start Assignment (if Assigned)
  const handleStartReview = async () => {
    setActionBusy(true);
    setBackendBlockError(null);
    try {
      await assignmentService.startAssignment(chapterId, assignment.id);
      toast('Đã bắt đầu', 'Bắt đầu quá trình duyệt toàn chương.');
      void loadChapterData();
    } catch (err: any) {
      const msg = extractError(err, 'Không thể bắt đầu duyệt chương.');
      setBackendBlockError(msg);
      toast('Bị chặn', msg);
    } finally {
      setActionBusy(false);
    }
  };

  const handleApproveChapter = async () => {
    // Generate comment with checklist summary if any
    const checkedLabels = CHECKLIST_ITEMS.filter((item) => checklist[item.id]).map((i) => i.label);
    const checklistPart =
      checkedLabels.length > 0 ? `[Checklist đạt: ${checkedLabels.join(', ')}] ` : '';
    const comment = `${checklistPart}Duyệt hoàn tất nội dung toàn bộ chương.`;

    setActionBusy(true);
    setBackendBlockError(null);
    try {
      await assignmentService.approveAssignment(chapterId, assignment.id);
      toast('Đã duyệt chương', 'Công đoạn Review đã hoàn tất thành công!');
      void loadChapterData();
    } catch (err: any) {
      const msg = extractError(err, 'Không thể duyệt công đoạn Review.');
      setBackendBlockError(msg);
      toast('Duyệt bị chặn (409 Conflict)', msg);
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
      note = window.prompt(`Nhập lý do cho quyết định "${decision}":`) || undefined;
      if (!note) return;
    }
    try {
      await assignmentService.triageConsistencyFinding(chapterId, f.id, decision, note);
      toast('Đã phân loại', `Finding ${f.ruleCode} -> ${decision}`);
      const updated = await assignmentService.getConsistencyFindings(chapterId);
      setFindings(updated);
    } catch (err: any) {
      toast('Lỗi', extractError(err, 'Không thể phân loại lỗi'));
    }
  };

  // Run Consistency Check
  const handleRunConsistency = async () => {
    setActionBusy(true);
    try {
      const res = await assignmentService.runConsistencyCheck(chapterId);
      toast('Kiểm tra hoàn tất', `${res.newCount} lỗi mới · ${res.openCount} đang mở`);
      const updated = await assignmentService.getConsistencyFindings(chapterId);
      setFindings(updated);
    } catch (err: any) {
      toast('Lỗi', extractError(err, 'Không thể chạy kiểm tra nhất quán'));
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
      toast('Kiểm tra hình ảnh hoàn tất', `Ngưỡng: ${Math.round(res.threshold * 100)}%`);
    } catch (err: any) {
      toast('Lỗi', extractError(err, 'Không thể kiểm tra hình ảnh'));
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
      const assigneeName = member?.fullName || member?.email || 'Chưa giao';
      const stOrder = st?.stageOrder || '';
      return {
        id: as.id,
        label: `${stOrder ? stOrder + '. ' : ''}${stName} · ${assigneeName} · ${as.status}`,
      };
    });
  }, [currentPageAssignments, stageMap, memberMap]);

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
        <span className='text-xs font-semibold text-zinc-600'>
          Đang nạp màn hình duyệt toàn chương...
        </span>
      </div>
    );
  }

  const isApproved = String(assignment.status) === 'Approved';
  const canApprove =
    !isApproved &&
    (effectiveRole === 'EDITOR' ||
      effectiveRole === 'PRODUCER' ||
      String(assignment.status) === 'UnderReview' ||
      String(assignment.status) === 'InProgress');

  return (
    <div
      className='w-full h-full flex flex-col bg-[#F3F0E9] overflow-hidden select-none font-sans'
      data-testid='chapter-review-view'
    >
      {/* 1. TOP BAR / HEADER */}
      <div className='shrink-0 bg-[#FCFBF8] border-b border-[#D8D2C5] px-6 py-2.5 flex items-center justify-between gap-4 z-20 shadow-xs'>
        <div className='flex items-center gap-3 min-w-0'>
          <button
            type='button'
            onClick={() => {
              if (effectiveWsId && seriesId) {
                navigate(`/workspaces/${effectiveWsId}/series/${seriesId}/editor/desk`);
              } else {
                navigate(-1);
              }
            }}
            aria-label='Quay lại Bàn Thẩm Định'
            className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] cursor-pointer transition-colors shadow-2xs border border-[#D8D2C5]'
          >
            <ArrowLeft className='w-4 h-4' />
          </button>

          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFF2E6] text-[#C2410C] border border-[#F97316]/30 uppercase tracking-wide'>
                Gate 2
              </span>
              <h2
                className='text-sm sm:text-base font-serif font-bold text-[#1C1917] truncate'
                title={chapterTitle}
              >
                {chapterTitle} · Quality & Composite Gate
              </h2>
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  isApproved
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {assignment.status}
              </span>
            </div>
            <p className='text-[11px] text-[#57534E] font-medium'>
              Vai trò:{' '}
              <span className='font-semibold text-[#1C1917]'>{effectiveRole || 'Editor'}</span> ·{' '}
              {pages.length} trang thành phẩm
            </p>
          </div>
        </div>

        {/* 3-Step Stepper in Header */}
        <div className='hidden lg:flex items-center gap-1.5 px-3 py-1 bg-[#F8F6F0] border border-[#D8D2C5] rounded-full text-xs font-semibold'>
          <span className='px-2 py-0.5 rounded-full bg-indigo-600 text-white flex items-center gap-1 shadow-xs'>
            <span>1</span>
            <span>{t('chapterReview.stepper.editor', 'Editor duyệt')}</span>
          </span>
          <span className='text-zinc-400'>→</span>
          <span className='px-2 py-0.5 rounded-full text-zinc-500 flex items-center gap-1'>
            <span>2</span>
            <span>{t('chapterReview.stepper.producer', 'Producer duyệt')}</span>
          </span>
          <span className='text-zinc-400'>→</span>
          <span className='px-2 py-0.5 rounded-full text-zinc-500 flex items-center gap-1'>
            <span>3</span>
            <span>{t('chapterReview.stepper.publisher', 'Publisher phát hành')}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2 shrink-0'>
          <button
            type='button'
            onClick={() => setIsProvenanceOpen(true)}
            className='px-3 py-1.5 flex items-center gap-1.5 border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] text-xs font-semibold rounded-full cursor-pointer shadow-xs transition-colors'
            title='Xem lịch sử và nguồn gốc chương (CF4)'
            data-testid='btn-provenance-modal'
          >
            <History className='w-3.5 h-3.5 text-[#78716C]' />
            <span>{t('chapterReview.provenance', 'Nguồn gốc')}</span>
          </button>

          <button
            type='button'
            onClick={() => setIsSubmissionsOpen(true)}
            className='px-3 py-1.5 flex items-center gap-1.5 border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#1C1917] text-xs font-semibold rounded-full cursor-pointer shadow-xs transition-colors'
            title='Xem lịch sử nộp bài của Review'
            data-testid='btn-submissions-history'
          >
            <Clock className='w-3.5 h-3.5 text-[#78716C]' />
            <span>Lịch sử ({submissions.length})</span>
          </button>

          {String(assignment.status) === 'Assigned' && (
            <button
              type='button'
              disabled={actionBusy}
              onClick={() => void handleStartReview()}
              className='px-4 py-1.5 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full disabled:opacity-50 cursor-pointer shadow-xs transition-colors'
            >
              <Eye className='w-3.5 h-3.5' />
              <span>Bắt đầu duyệt</span>
            </button>
          )}

          {canApprove && (
            <button
              type='button'
              disabled={actionBusy || isApproved || !!unfinishedWarning}
              onClick={() => void handleApproveChapter()}
              title={
                unfinishedWarning
                  ? 'Còn trang chưa xong công đoạn, chưa thể hoàn tất duyệt cả chương.'
                  : 'Duyệt toàn bộ nội dung chương'
              }
              className='px-5 py-2 flex items-center gap-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-all active:scale-98'
              data-testid='btn-approve-chapter-review'
            >
              <CheckCircle2 className='w-4 h-4' />
              <span>Duyệt cả chương</span>
            </button>
          )}

          {isApproved && (
            <div className='px-4 py-2 flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-full shadow-xs'>
              <CheckCircle2 className='w-4 h-4 text-emerald-600' />
              <span>Đã duyệt hoàn tất chương</span>
            </div>
          )}
        </div>
      </div>

      {/* WARNING BANNERS */}
      {unfinishedWarning && unfinishedWarning.length > 0 && (
        <div
          className='shrink-0 px-6 py-2.5 bg-red-50 border-b border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2'
          data-testid='chapter-unfinished-warning-banner'
        >
          <AlertOctagon className='w-4 h-4 text-red-600 shrink-0' />
          <div>
            <span>Chưa thể hoàn tất Review cho cả chương vì còn trang chưa xong: </span>
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
            <span>{backendBlockError}</span>
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
        <div className='w-72 md:w-80 shrink-0 border-r border-[#D8D2C5] bg-[#FCFBF8] flex flex-col h-full overflow-hidden'>
          <div className='p-3 border-b border-[#D8D2C5] bg-[#F8F6F0] flex items-center justify-between'>
            <span className='text-xs font-bold text-[#1C1917] flex items-center gap-1.5'>
              <Layers className='w-3.5 h-3.5 text-[#F97316]' />
              Danh sách trang ({pages.length})
            </span>
            <span className='text-[11px] text-[#57534E] font-medium'>
              Đang chọn: P.{currentPage?.pageNumber || 1}
            </span>
          </div>

          <div className='flex-1 overflow-y-auto p-3 space-y-2.5'>
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
                  <div className='w-16 h-24 shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 overflow-hidden flex items-center justify-center relative'>
                    {cached?.dataUrl ? (
                      <img
                        src={cached.dataUrl}
                        alt={`Trang ${page.pageNumber}`}
                        className='w-full h-full object-contain'
                      />
                    ) : (
                      <span className='text-[10px] text-zinc-400 font-medium text-center px-1'>
                        {cached ? (cached.hasArtwork ? 'Ảnh' : 'Chưa có ảnh') : 'Đang tải...'}
                      </span>
                    )}

                    {cached?.hasArtwork && !cached.hasText && (
                      <span className='absolute top-1 left-1 px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500 text-white'>
                        Chưa chữ
                      </span>
                    )}
                    {cached?.baseStageName && (
                      <span className='absolute bottom-1 right-1 px-1 py-0.2 rounded text-[8px] font-bold bg-black/75 text-white font-mono'>
                        {cached.baseStageName}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className='flex-1 min-w-0 flex flex-col justify-between py-0.5'>
                    <div>
                      <div className='flex items-center justify-between gap-1'>
                        <h4 className='text-xs font-bold text-zinc-900 truncate'>
                          Trang {page.pageNumber}
                        </h4>
                        {pageCrCount > 0 ? (
                          <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200'>
                            {pageCrCount} lỗi
                          </span>
                        ) : isPageIncomplete ? (
                          <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200'>
                            Chưa xong
                          </span>
                        ) : (
                          <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800'>
                            Đạt
                          </span>
                        )}
                      </div>
                      <p className='text-[11px] text-zinc-500'>
                        {panelCount > 0 ? `${panelCount} khung` : 'Trang đơn'} ·{' '}
                        {summary.approvedStageCount}/{summary.totalActiveStages} công đoạn
                      </p>
                    </div>

                    {/* Mini 1->7 stage progress bar */}
                    <div className='pt-1.5 border-t border-zinc-100 flex items-center gap-1 flex-wrap'>
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
        </div>

        {/* COLUMN 2: CENTER - MAIN COMPOSITE VIEWER */}
        <div className='flex-1 flex flex-col h-full overflow-hidden bg-[#F3F0E9] relative'>
          {/* Top Viewer Toolbar */}
          <div className='h-11 shrink-0 bg-[#FCFBF8]/95 backdrop-blur-md border-b border-[#D8D2C5] px-4 flex items-center justify-between text-[#1C1917] z-10'>
            {/* Page navigation */}
            <div className='flex items-center gap-2'>
              <button
                type='button'
                disabled={selectedPageIndex <= 0}
                onClick={() => setSelectedPageId(pages[selectedPageIndex - 1].id)}
                className='p-1 rounded-lg hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors'
                title='Trang trước (phím ←)'
                data-testid='btn-prev-page'
              >
                <ChevronLeft className='w-4 h-4' />
              </button>
              <span className='text-xs font-semibold font-mono text-[#1C1917]'>
                {t(
                  'chapterReview.pageCounter',
                  { current: currentPage?.pageNumber || 1, total: pages.length },
                  `Trang ${currentPage?.pageNumber || 1} / ${pages.length}`,
                )}
              </span>
              <button
                type='button'
                disabled={selectedPageIndex >= pages.length - 1}
                onClick={() => setSelectedPageId(pages[selectedPageIndex + 1].id)}
                className='p-1 rounded-lg hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors'
                title='Trang sau (phím →)'
                data-testid='btn-next-page'
              >
                <ChevronRight className='w-4 h-4' />
              </button>
            </div>

            {/* Mode: Khoanh vùng vs Di chuyển */}
            <div className='flex items-center gap-2'>
              <div className='flex items-center bg-[#F3F0E9] border border-[#D8D2C5] rounded-lg p-0.5'>
                <button
                  type='button'
                  onClick={() => setIsDrawTool(true)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDrawTool
                      ? 'bg-[#FFF2E6] text-[#1C1917] border border-[#C2410C] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                  data-testid='btn-tool-draw'
                >
                  <Square className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>Khoanh vùng</span>
                </button>
                <button
                  type='button'
                  onClick={() => setIsDrawTool(false)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    !isDrawTool
                      ? 'bg-[#FFF2E6] text-[#1C1917] border border-[#C2410C] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                  data-testid='btn-tool-pan'
                >
                  <Move className='w-3.5 h-3.5 text-[#C2410C]' />
                  <span>Di chuyển</span>
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
                className='p-1.5 rounded hover:bg-[#E7E5E4] text-zinc-600 hover:text-zinc-900 cursor-pointer'
                title='Phóng to'
              >
                <ZoomIn className='w-3.5 h-3.5' />
              </button>
              <span className='text-xs font-mono text-zinc-600 w-12 text-center'>
                {Math.round(zoomTransform.scale * 100)}%
              </span>
              <button
                type='button'
                onClick={() => handleZoom(-0.2)}
                className='p-1.5 rounded hover:bg-[#E7E5E4] text-zinc-600 hover:text-zinc-900 cursor-pointer'
                title='Thu nhỏ'
              >
                <ZoomOut className='w-3.5 h-3.5' />
              </button>
              <button
                type='button'
                onClick={resetZoom}
                className='px-2 py-1 rounded border border-[#E7E7E7] hover:bg-[#E7E5E4] text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer'
                title='Đặt lại kích thước'
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
              <div className='flex flex-col items-center justify-center gap-2 text-zinc-500'>
                <Loader2 className='w-8 h-8 animate-spin text-amber-500' />
                <span className='text-xs font-semibold'>Đang ghép trang thành phẩm...</span>
              </div>
            ) : !activeComposite?.dataUrl ? (
              <div className='w-96 h-[32rem] bg-white border-2 border-dashed border-[#E7E7E7] rounded-2xl flex flex-col items-center justify-center gap-3 text-zinc-500 p-6 text-center'>
                <AlertTriangle className='w-10 h-10 text-amber-500' />
                <p className='text-sm font-bold text-zinc-700'>Chưa có bản vẽ</p>
                <p className='text-xs text-zinc-500'>
                  Trang này chưa có artwork ở công đoạn nào trước Review.
                </p>
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
                  alt={`Trang ${currentPage?.pageNumber} thành phẩm`}
                  draggable={false}
                  className='max-h-[85vh] w-auto object-contain block'
                />

                {/* Badge if artwork exists but no text */}
                {!activeComposite.hasText && (
                  <span className='absolute top-3 left-3 px-2 py-1 rounded bg-amber-600/90 text-white text-xs font-bold shadow-md'>
                    Chưa chèn chữ
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
                    <span className='px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white shadow-xs'>
                      Vùng yêu cầu sửa {draftRegion.panelId ? `(Khung)` : ''}
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
                        className={`px-1 py-0.2 rounded text-[9px] font-extrabold text-white ${
                          isOp ? 'bg-red-600' : isVer ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      {cr.panelId && (
                        <span className='px-1 py-0.2 rounded text-[9px] font-bold bg-black/60 text-white'>
                          Khung
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
        <div className='w-96 shrink-0 border-l border-[#D8D2C5] bg-[#FCFBF8] flex flex-col h-full overflow-hidden'>
          {/* Tab Navigation */}
          <div className='flex border-b border-[#D8D2C5] bg-[#F8F6F0] shrink-0 text-xs font-bold'>
            <button
              type='button'
              onClick={() => setActiveTab('changes')}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'changes'
                  ? 'border-[#C2410C] text-[#1C1917] bg-[#FFF2E6]/60'
                  : 'border-transparent text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9]'
              }`}
            >
              <span>{t('chapterReview.changeRequests', 'Yêu cầu sửa')}</span>
              {changeRequests.filter((c) => String(c.status) === 'Open').length > 0 && (
                <span className='px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-100 text-red-700'>
                  {changeRequests.filter((c) => String(c.status) === 'Open').length}
                </span>
              )}
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('checklist')}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'checklist'
                  ? 'border-[#C2410C] text-[#1C1917] bg-[#FFF2E6]/60'
                  : 'border-transparent text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9]'
              }`}
            >
              <CheckSquare className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>{t('chapterReview.checklist', 'Checklist')}</span>
              <span className='px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#F3F0E9] text-[#57534E]'>
                {Object.values(checklist).filter(Boolean).length}/5
              </span>
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('consistency')}
              className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'consistency'
                  ? 'border-[#C2410C] text-[#1C1917] bg-[#FFF2E6]/60'
                  : 'border-transparent text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9]'
              }`}
            >
              <Sparkles className='w-3.5 h-3.5 text-[#C2410C]' />
              <span>{t('chapterReview.consistency', 'Nhất quán')}</span>
              {findings.length > 0 && (
                <span className='px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#F3F0E9] text-[#57534E]'>
                  {findings.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: YÊU CẦU SỬA (CHANGE REQUESTS) */}
          {activeTab === 'changes' && (
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              {/* Form tạo yêu cầu sửa mới cho trang đang chọn */}
              <div className='p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold text-zinc-900 flex items-center gap-1.5'>
                    <Send className='w-3.5 h-3.5 text-amber-600' />
                    Trả việc cho Trang {currentPage?.pageNumber}
                  </span>
                  {draftRegion && (
                    <button
                      type='button'
                      onClick={() => setDraftRegion(null)}
                      className='text-[11px] font-semibold text-zinc-500 hover:text-red-600 flex items-center gap-1 cursor-pointer'
                    >
                      <Trash2 className='w-3 h-3' /> Xoá vùng vẽ
                    </button>
                  )}
                </div>

                {/* Draft region info */}
                {draftRegion && (
                  <div className='p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-900 flex items-center justify-between'>
                    <span>
                      Vùng: x {Math.round(draftRegion.box.x * 100)}%, y{' '}
                      {Math.round(draftRegion.box.y * 100)}%, w{' '}
                      {Math.round(draftRegion.box.w * 100)}%, h{' '}
                      {Math.round(draftRegion.box.h * 100)}%
                    </span>
                    {draftRegion.panelId && (
                      <span className='px-1.5 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold'>
                        Khung
                      </span>
                    )}
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleSubmitReturnWork} className='space-y-2.5'>
                  <div>
                    <label className='block text-[11px] font-bold text-zinc-700 mb-1'>
                      Công đoạn cần sửa <span className='text-red-500'>*</span>
                    </label>
                    <select
                      value={targetAssignmentId}
                      onChange={(e) => {
                        setTargetAssignmentId(e.target.value);
                        setAwaitingReviewConflict(null);
                      }}
                      className='w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500'
                      data-testid='select-target-assignment'
                    >
                      <option value=''>-- Chọn công đoạn của trang này --</option>
                      {targetOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className='block text-[11px] font-bold text-zinc-700 mb-1'>
                      Mô tả lỗi cần sửa <span className='text-red-500'>*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={returnDescription}
                      onChange={(e) => setReturnDescription(e.target.value)}
                      placeholder='Mô tả chi tiết nội dung cần sửa...'
                      className='w-full px-2.5 py-2 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500'
                      data-testid='input-return-description'
                    />
                  </div>

                  <div>
                    <label className='block text-[11px] font-bold text-zinc-700 mb-1'>
                      Hạn sửa (tuỳ chọn)
                    </label>
                    <input
                      type='date'
                      value={returnDueDate}
                      onChange={(e) => setReturnDueDate(e.target.value)}
                      className='w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500'
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
                        <span>Mở duyệt việc này</span>
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
                    <span>Gửi yêu cầu sửa (Trả việc)</span>
                  </button>
                </form>
              </div>

              {/* Danh sách yêu cầu sửa của cả chương nhóm theo trang */}
              <div className='space-y-3 pt-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-bold text-zinc-900'>
                    Yêu cầu sửa của chương ({changeRequests.length})
                  </span>
                  <div className='flex items-center gap-1 text-[11px]'>
                    {(['All', 'Open', 'Resolved', 'Verified'] as const).map((st) => (
                      <button
                        key={st}
                        type='button'
                        onClick={() => setCrFilter(st)}
                        className={`px-1.5 py-0.5 rounded font-semibold cursor-pointer ${
                          crFilter === st
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-500 hover:bg-zinc-100'
                        }`}
                      >
                        {st === 'All' ? 'Tất cả' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredChangeRequests.length === 0 ? (
                  <p className='text-center text-xs text-zinc-400 py-6'>Chưa có yêu cầu sửa nào.</p>
                ) : (
                  pages.map((page) => {
                    const pageCrs = changeRequestsByPage.get(page.id) || [];
                    if (pageCrs.length === 0) return null;

                    return (
                      <div key={page.id} className='space-y-2'>
                        <div className='text-[11px] font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded flex items-center justify-between'>
                          <span>Trang {page.pageNumber}</span>
                          <span>{pageCrs.length} yêu cầu</span>
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
                                    : 'border-zinc-200'
                                }`}
                              >
                                <div className='flex items-center justify-between gap-1'>
                                  <div className='flex items-center gap-1.5'>
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        isOp
                                          ? 'bg-red-100 text-red-800'
                                          : isRes
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {cr.status}
                                    </span>
                                    <span className='font-bold text-zinc-800'>
                                      {st?.name || 'Công đoạn'}
                                    </span>
                                  </div>
                                  <span className='text-[10px] text-zinc-400'>
                                    {member?.fullName || member?.email || 'Người làm'}
                                  </span>
                                </div>

                                <p className='text-zinc-800'>{cr.description}</p>

                                {cr.regionJson && (
                                  <div className='flex items-center gap-2'>
                                    <button
                                      type='button'
                                      onClick={() => {
                                        setSelectedPageId(page.id);
                                        setHighlightedCrId(cr.id);
                                      }}
                                      className='text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer'
                                    >
                                      <Square className='w-3 h-3' /> Xem trên ảnh
                                    </button>
                                  </div>
                                )}

                                {/* Action Buttons for Editor */}
                                {isRes && (
                                  <div className='pt-2 border-t border-zinc-100 flex items-center justify-end gap-2'>
                                    <button
                                      type='button'
                                      onClick={() => void handleReopenChangeRequest(cr.id)}
                                      className='px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold cursor-pointer'
                                    >
                                      Mở lại
                                    </button>
                                    <button
                                      type='button'
                                      onClick={() => void handleVerifyChangeRequest(cr.id)}
                                      className='px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1'
                                    >
                                      <CheckCircle2 className='w-3 h-3' /> Xác minh đạt
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
          )}

          {/* TAB 2: CHECKLIST DUYỆT TRUYỆN */}
          {activeTab === 'checklist' && (
            <div className='flex-1 overflow-y-auto p-4 space-y-4'>
              <div className='p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5'>
                <h4 className='text-xs font-bold text-purple-900 flex items-center gap-1.5'>
                  <CheckSquare className='w-4 h-4 text-purple-700' />
                  Bảng kiểm tra chất lượng Manga
                </h4>
                <p className='text-[11px] text-purple-700'>
                  Các tiêu chí đã tick sẽ được tự động đính kèm vào ghi chú khi bạn Duyệt hoặc Nộp
                  bài.
                </p>
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
                          : 'bg-white border-zinc-200 hover:border-zinc-300'
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
                        className='mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer'
                      />
                      <div className='flex-1'>
                        <span
                          className={`text-xs font-semibold ${isChecked ? 'text-emerald-900' : 'text-zinc-800'}`}
                        >
                          {item.label}
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
                  <span>Chạy kiểm tra nhất quán (Script ↔ Bible)</span>
                </button>

                {findings.length === 0 ? (
                  <p className='text-center text-xs text-zinc-400 py-4'>
                    Chưa phát hiện lỗi nhất quán kịch bản.
                  </p>
                ) : (
                  <div className='space-y-2'>
                    {findings.map((f) => (
                      <div
                        key={f.id}
                        className='p-3 rounded-xl border border-zinc-200 bg-white space-y-2 text-xs'
                      >
                        <div className='flex items-center justify-between'>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              SEVERITY_STYLE[String(f.severity)] || 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {f.severity} · {f.ruleCode}
                          </span>
                          <span className='text-[10px] text-zinc-500 font-bold'>
                            {FINDING_LABEL[String(f.status)] || f.status}
                          </span>
                        </div>
                        <p className='text-zinc-800'>{f.message}</p>
                        {f.evidence && (
                          <blockquote className='text-[11px] text-zinc-500 border-l-2 border-zinc-300 pl-2 italic'>
                            {f.evidence}
                          </blockquote>
                        )}
                        {OPEN_FINDING.includes(String(f.status)) && (
                          <div className='flex items-center gap-1.5 pt-1 border-t border-zinc-100'>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'Confirmed')}
                              className='p-1 rounded text-emerald-600 hover:bg-emerald-50 cursor-pointer'
                              title='Xác nhận là lỗi'
                            >
                              <CheckCircle2 className='w-4 h-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'Rejected')}
                              className='p-1 rounded text-red-600 hover:bg-red-50 cursor-pointer'
                              title='Bác bỏ (không phải lỗi)'
                            >
                              <XCircle className='w-4 h-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'Ignored')}
                              className='p-1 rounded text-purple-600 hover:bg-purple-50 cursor-pointer'
                              title='Bỏ qua (nhập lý do)'
                            >
                              <MinusCircle className='w-4 h-4' />
                            </button>
                            <button
                              type='button'
                              onClick={() => void handleTriageFinding(f, 'NeedsClarification')}
                              className='p-1 rounded text-amber-600 hover:bg-amber-50 cursor-pointer'
                              title='Cần làm rõ'
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
              <div className='pt-4 border-t border-zinc-200 space-y-3'>
                <div className='p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl space-y-2.5'>
                  <div className='flex items-center justify-between text-xs font-bold text-purple-900'>
                    <span>Ngưỡng nhất quán AI</span>
                    <span className='font-mono bg-white px-2 py-0.5 rounded border border-purple-200'>
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
                    className='w-full accent-purple-600 cursor-pointer'
                  />
                  <button
                    type='button'
                    disabled={actionBusy}
                    onClick={() => void handleRunVisual()}
                    className='w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5'
                  >
                    <Sparkles className='w-3.5 h-3.5' />
                    <span>Chạy kiểm tra nét vẽ nhân vật</span>
                  </button>
                </div>

                {visualReport && (
                  <div className='p-3 bg-white border border-zinc-200 rounded-xl space-y-2 text-xs'>
                    <div className='grid grid-cols-3 gap-2 text-center'>
                      <div className='p-2 bg-zinc-50 rounded-lg'>
                        <span className='text-[10px] text-zinc-400'>Tổng khung</span>
                        <p className='font-bold text-zinc-900'>{visualReport.totalEvaluated}</p>
                      </div>
                      <div className='p-2 bg-emerald-50 rounded-lg'>
                        <span className='text-[10px] text-emerald-600'>Khớp</span>
                        <p className='font-bold text-emerald-800'>{visualReport.passedCount}</p>
                      </div>
                      <div className='p-2 bg-amber-50 rounded-lg'>
                        <span className='text-[10px] text-amber-600'>Lệch</span>
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

      {isSubmissionsOpen && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4'
        >
          <div className='bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden'>
            <div className='p-4 border-b border-zinc-200 flex items-center justify-between'>
              <h3 className='text-sm font-bold text-zinc-900 flex items-center gap-2'>
                <Clock className='w-4 h-4 text-zinc-600' />
                Lịch sử các lần nộp Review
              </h3>
              <button
                type='button'
                onClick={() => setIsSubmissionsOpen(false)}
                className='p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer'
              >
                <X className='w-4 h-4' />
              </button>
            </div>
            <div className='flex-1 overflow-y-auto p-4'>
              <SubmissionHistory submissions={submissions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
