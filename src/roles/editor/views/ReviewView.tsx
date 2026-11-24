import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Globe, Lock, Minus, Plus, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  normalizeWorkspaceRole,
  parseStageTaskCanvasVersions,
  parseStageTaskPanelLayout,
  pickLatestDecisionComment,
  type AssignmentDto,
  type ChangeRequestDto,
  type SubmissionDto,
  type VisualConsistencyReportDto,
  type VisualDeviationDto,
} from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { chapterEditionService } from '@/services/chapter-edition.service';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import {
  countUnclosed,
  errorMessage,
  getWorkActions,
} from '@/shared/features/collaboration/collaborationRules';
import { ChapterReviewView } from './ChapterReviewView';
import { findIntersectingPanelIds } from './chapterReviewViewUtils';
import { ArtworkCanvas } from './artwork-review/ArtworkCanvas';
import { parseRegion, type Box, type CanvasRegion } from './artwork-review/artworkModel';
import { ArtworkNotesTab, type ArtworkDraft } from './artwork-review/ArtworkNotesTab';
import { VisualChecksTab, type VisualDecision } from './artwork-review/VisualChecksTab';
import { useSubmissionArtworks } from './artwork-review/useSubmissionArtworks';
import { DecisionBar } from './review-shared/DecisionBar';
import { ReasonForm } from '@/shared/components/ReasonForm';
import {
  OPEN_FINDING_STATUSES,
  crStatus,
  isCrClosed,
  newDraftId,
  readDrafts,
  writeDrafts,
} from '@/shared/features/script-review/reviewModel';

interface ReviewViewProps {
  currentUserId?: string | null;
  workspaceRole?: string | null;
  onShowToast?: (title: string, desc: string) => void;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const isPendingSub = (s: SubmissionDto) => s.status === 'Pending' || s.status === 0;

/**
 * Duyệt tranh của một việc Page/Panel (CF3). Editor xem bản nộp (so cạnh nhau với bản trước khi cần),
 * khoanh vùng thành nhận xét, xác minh các yêu cầu sửa cũ rồi trả bài hoặc duyệt.
 * Việc Review cả chương chuyển sang ChapterReviewView.
 */
export const ReviewView: React.FC<ReviewViewProps> = ({
  currentUserId,
  workspaceRole,
  onShowToast,
}) => {
  const {
    taskId = '',
    workspaceId,
    wsId,
    seriesId,
    chapterId: paramChapterId,
  } = useParams<{
    taskId?: string;
    workspaceId?: string;
    wsId?: string;
    seriesId?: string;
    chapterId?: string;
  }>();
  const [search] = useSearchParams();
  const chapterId = paramChapterId || search.get('chapterId') || '';
  const langParam = search.get('lang') || undefined;
  const effectiveWsId = workspaceId || wsId || null;
  const navigate = useNavigate();
  const { t, lang } = useTranslation('review');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [isGridTask, setIsGridTask] = useState(false);
  const [gridIsInputOutdated, setGridIsInputOutdated] = useState(false);
  const [gridLatestComment, setGridLatestComment] = useState<string | null>(null);
  const [gridReopenReason, setGridReopenReason] = useState<string | null>(null);
  const [gridReviewerUserId, setGridReviewerUserId] = useState<string | null>(null);
  const [gridReviewerName, setGridReviewerName] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [visualReport, setVisualReport] = useState<VisualConsistencyReportDto | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number | null>(null);

  const heldReviewLockRef = useRef(false);
  const decisionMadeRef = useRef(false);
  const autoOpenedTaskRef = useRef<string | null>(null);

  const [drafts, setDrafts] = useState<ArtworkDraft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [tab, setTab] = useState<'notes' | 'checks'>('notes');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [impactDecision, setImpactDecision] = useState<'Keep' | 'Rework' | null>(null);

  useEffect(() => {
    heldReviewLockRef.current = false;
    decisionMadeRef.current = false;
    autoOpenedTaskRef.current = null;
  }, [chapterId, taskId]);

  const loadData = useCallback(async () => {
    if (!chapterId || !taskId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const hasTaskGridApi = typeof assignmentService.getTaskGrid === 'function';
      const v2Assign =
        typeof assignmentService.getAssignmentById === 'function'
          ? await assignmentService.getAssignmentById(taskId, chapterId).catch((err) => {
              if (!hasTaskGridApi) throw err;
              return null;
            })
          : null;

      if (!v2Assign && hasTaskGridApi) {
        const [grid, report, chapter] = await Promise.all([
          assignmentService.getTaskGrid(chapterId),
          typeof assignmentService.getVisualConsistencyReport === 'function'
            ? assignmentService.getVisualConsistencyReport(chapterId).catch(() => null)
            : Promise.resolve(null),
          chapterService.getChapterById(chapterId).catch(() => null),
        ]);
        let cell = grid?.tasks.find((item) => item.id === taskId && item.status !== 'Cancelled');
        if (!cell) {
          setIsGridTask(false);
          setGridIsInputOutdated(false);
          setGridLatestComment(null);
          setGridReopenReason(null);
          setGridReviewerUserId(null);
          setGridReviewerName(null);
          heldReviewLockRef.current = false;
          setAssignment(null);
          return;
        }
        const stg = grid.stages.find((s) => s.id === cell!.pipelineStageId);
        const lot = cell.lotId ? grid.lots.find((l) => l.id === cell!.lotId) : undefined;
        const pg = cell.pageId ? grid.pages.find((p) => p.id === cell!.pageId) : undefined;

        const normRole = normalizeWorkspaceRole(workspaceRole);
        const isReviewerRole = normRole === 'EDITOR' || normRole === 'PRODUCER';
        const cellAssigneeId = cell.assigneeUserId ?? lot?.assigneeUserId ?? '';
        const isSelfCell = Boolean(
          currentUserId && cellAssigneeId && cellAssigneeId === currentUserId,
        );

        if (
          cell.status === 'Submitted' &&
          isReviewerRole &&
          !isSelfCell &&
          !cell.isInputOutdated &&
          autoOpenedTaskRef.current !== cell.id &&
          typeof assignmentService.openStageTaskReview === 'function'
        ) {
          autoOpenedTaskRef.current = cell.id;
          try {
            const opened = await assignmentService.openStageTaskReview(chapterId, cell.id);
            cell = {
              ...cell,
              ...opened,
              id: cell.id,
              status: opened?.status ?? 'UnderReview',
              reviewerUserId: opened?.reviewerUserId ?? currentUserId ?? null,
            };
            heldReviewLockRef.current = true;
          } catch (openErr: any) {
            onShowToast?.(
              t('scriptReview.toast.openFailed', 'Không thể mở duyệt'),
              errorMessage(openErr, t('scriptReview.errors.generic')),
            );
            if (openErr?.status === 409) {
              const refreshed = await assignmentService.getTaskGrid(chapterId).catch(() => null);
              const freshCell = refreshed?.tasks.find(
                (item) => item.id === taskId && item.status !== 'Cancelled',
              );
              if (freshCell) cell = freshCell;
            }
          }
        } else if (
          cell.status === 'UnderReview' &&
          currentUserId &&
          cell.reviewerUserId === currentUserId
        ) {
          heldReviewLockRef.current = true;
        } else {
          heldReviewLockRef.current = false;
        }

        let resolvedReviewerName: string | null = null;
        if (
          cell.status === 'UnderReview' &&
          cell.reviewerUserId &&
          cell.reviewerUserId !== currentUserId
        ) {
          if (effectiveWsId && typeof assignmentService.getTaskGridReviewQueue === 'function') {
            const queue = await assignmentService
              .getTaskGridReviewQueue(effectiveWsId, seriesId ? { seriesId } : undefined)
              .catch(() => []);
            resolvedReviewerName =
              queue.find((q) => q.taskId === cell!.id)?.reviewerName || cell.reviewerUserId;
          } else {
            resolvedReviewerName = cell.reviewerUserId;
          }
        }

        const rawSubs =
          typeof assignmentService.getStageTaskSubmissions === 'function'
            ? await assignmentService.getStageTaskSubmissions(chapterId, cell.id).catch(() => [])
            : [];
        const mappedSubs: SubmissionDto[] = rawSubs.map((s) => ({
          id: s.id,
          assignmentId: cell!.id,
          chapterId,
          submittedByUserId: s.submittedByUserId,
          attemptNumber: s.attemptNumber,
          status: s.status as SubmissionDto['status'],
          submittedAt: s.submittedAt,
          decidedByUserId: s.decidedByUserId ?? undefined,
          decidedAt: s.decidedAt ?? undefined,
          decisionComment: s.decisionComment ?? undefined,
          artworkReferenceIds: s.artworkReferenceIds ?? [],
          panelLayout: parseStageTaskPanelLayout(s.panelLayoutJson),
          canvasVersions: parseStageTaskCanvasVersions(s.canvasVersionsJson),
        }));

        setIsGridTask(true);
        setGridIsInputOutdated(Boolean(cell.isInputOutdated));
        setGridReviewerUserId(cell.reviewerUserId ?? null);
        setGridReviewerName(resolvedReviewerName);
        setGridLatestComment(
          cell.lastDecisionComment?.trim() || pickLatestDecisionComment(rawSubs) || null,
        );
        setGridReopenReason(cell.reopenReason?.trim() || null);
        setAssignment({
          id: cell.id,
          seriesId: seriesId || '',
          chapterId,
          entityType: cell.pageId ? 'Page' : 'Chapter',
          targetEntityId: cell.pageId ?? chapterId,
          pipelineStageId: cell.pipelineStageId,
          stageName: stg?.name ?? 'Stage',
          stageOrder: stg?.stageOrder ?? 99,
          assigneeUserId: cellAssigneeId,
          assignedRole: (lot?.assignedRole || stg?.allowedRole || 'Artist') as any,
          brief:
            lot?.brief?.trim() ||
            `${stg?.name ?? 'Stage'} · ${pg ? t('artworkReview.header.page', { number: pg.pageNumber }) : t('chapterReview.wholeChapter')}`,
          dueDate: lot?.dueDate ?? null,
          priority: 'Medium' as any,
          status: cell.status as any,
          impactReviewReason: cell.isInputOutdated
            ? cell.outdatedReason || t('artworkReview.impact.inputOutdatedFallback')
            : null,
          createdAt: cell.startedAt ?? new Date().toISOString(),
        });
        setChangeRequests([]);
        setSubmissions(mappedSubs);
        setVisualReport(report);
        setChapterNumber(chapter?.chapterNumber ?? null);
        if (pg?.pageNumber != null) setPageNumber(pg.pageNumber);
        return;
      }

      const [crs, subs, report, chapter] = await Promise.all([
        assignmentService.getChangeRequests(chapterId, { assignmentId: taskId }),
        assignmentService.getSubmissions(chapterId, taskId),
        assignmentService.getVisualConsistencyReport(chapterId).catch(() => null),
        chapterService.getChapterById(chapterId).catch(() => null),
      ]);
      setIsGridTask(false);
      setGridIsInputOutdated(false);
      setGridLatestComment(null);
      setGridReopenReason(null);
      setGridReviewerUserId(null);
      setGridReviewerName(null);
      heldReviewLockRef.current = false;
      setAssignment(v2Assign);
      setChangeRequests(crs);
      setSubmissions(subs);
      setVisualReport(report);
      setChapterNumber(chapter?.chapterNumber ?? null);
    } catch (err) {
      setLoadError(errorMessage(err, t('artworkReview.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [chapterId, currentUserId, effectiveWsId, onShowToast, seriesId, taskId, t, workspaceRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isChapterReview =
    !!assignment &&
    String(assignment.entityType) === 'Chapter' &&
    ((assignment.stageOrder ?? 0) > 1 || !assignment.stageName?.toLowerCase().includes('script'));

  const arts = useSubmissionArtworks(chapterId, isChapterReview ? null : assignment, submissions);
  const current = arts.artworks.find((x) => x.id === arts.currentId) ?? null;
  const previous = arts.artworks.find((x) => x.id === arts.previousId) ?? null;

  useEffect(() => {
    if (!arts.pageId) return;
    pageService
      .getPagesByChapter(chapterId)
      .then((pages) => setPageNumber(pages.find((p) => p.id === arts.pageId)?.pageNumber ?? null))
      .catch(() => setPageNumber(null));
  }, [arts.pageId, chapterId]);

  const pendingSub = useMemo(
    () => [...submissions].reverse().find(isPendingSub) ?? null,
    [submissions],
  );
  const latestSub = useMemo(
    () => [...submissions].sort((x, y) => y.attemptNumber - x.attemptNumber)[0] ?? null,
    [submissions],
  );
  const submissionId = pendingSub?.id ?? latestSub?.id ?? null;

  useEffect(() => {
    if (taskId) setDrafts(readDrafts<ArtworkDraft>('artworkReview', taskId, submissionId));
  }, [taskId, submissionId]);

  const updateDrafts = (next: ArtworkDraft[]) => {
    setDrafts(next);
    if (taskId) writeDrafts('artworkReview', taskId, submissionId, next);
  };

  const work = useMemo(
    () =>
      assignment
        ? getWorkActions(assignment, {
            userId: currentUserId,
            workspaceRole,
            changeRequests,
            hasCurrentArtwork: null,
          })
        : null,
    [assignment, currentUserId, workspaceRole, changeRequests],
  );
  const isProducer = normalizeWorkspaceRole(workspaceRole) === 'PRODUCER';
  const isLockedByOtherReviewer = Boolean(
    isGridTask &&
    String(assignment?.status) === 'UnderReview' &&
    gridReviewerUserId &&
    gridReviewerUserId !== currentUserId,
  );
  const canDecide = isGridTask
    ? Boolean(
        assignment &&
        (String(assignment.status) === 'Submitted' ||
          String(assignment.status) === 'UnderReview') &&
        !isLockedByOtherReviewer &&
        !work?.isAssignee &&
        work?.isReviewer &&
        !assignment.impactReviewReason,
      )
    : (work?.canDecide ?? false) && !assignment?.impactReviewReason;
  const showDecisionBar =
    canDecide ||
    Boolean(
      isGridTask &&
      isLockedByOtherReviewer &&
      !work?.isAssignee &&
      work?.isReviewer &&
      !assignment?.impactReviewReason,
    );

  // ── Vùng khoanh: yêu cầu sửa nằm trên đúng phiên bản đã khoanh (ảnh thật hoặc ảnh ghép của lần nộp) ──
  const isOnArtwork = useCallback(
    (c: ChangeRequestDto, artId: string | undefined) => {
      if (!artId) return false;
      if (c.assetReferenceId) return c.assetReferenceId === artId;
      if (!artId.startsWith('composite-sub-')) return false;
      const subId = artId.replace('composite-sub-', '');
      return c.submissionId ? c.submissionId === subId : pendingSub?.id === subId;
    },
    [pendingSub],
  );

  const crNumbers = useMemo(
    () => new Map(changeRequests.map((c, i) => [c.id, `#${i + 1}`])),
    [changeRequests],
  );

  const regionsOn = (artId: string | undefined): CanvasRegion[] =>
    changeRequests
      .filter((c) => isOnArtwork(c, artId))
      .map((c) => ({ c, box: parseRegion(c.regionJson) }))
      .filter((x): x is { c: ChangeRequestDto; box: Box } => !!x.box)
      .map(({ c, box }) => ({
        id: c.id,
        box,
        label: crNumbers.get(c.id) ?? '',
        kind: crStatus(c.status),
      }));

  const currentRegions: CanvasRegion[] = [
    ...regionsOn(current?.id),
    ...drafts.map((d, i) => ({ id: d.id, box: d.box, label: `M${i + 1}`, kind: 'draft' as const })),
  ];
  const previousRegions = regionsOn(previous?.id);

  const regionLabel = (crId: string) => {
    const cr = changeRequests.find((c) => c.id === crId);
    return cr && parseRegion(cr.regionJson) ? (crNumbers.get(crId) ?? null) : null;
  };

  const selectNote = (id: string) => {
    setActiveId(id);
    setTab('notes');
    const cr = changeRequests.find((c) => c.id === id);
    // Yêu cầu sửa khoanh trên bản cũ: bật so sánh để thấy vùng đó cạnh bản mới
    if (cr && previous && isOnArtwork(cr, previous.id)) setCompare(true);
  };

  const handleDrawn = (box: Box) => {
    if (!current) return;
    const draft: ArtworkDraft = {
      id: newDraftId(),
      box,
      text: '',
      assetReferenceId: current.id.startsWith('composite-') ? undefined : current.id,
      panelIds: findIntersectingPanelIds(box, arts.panels),
      layer: 'Artwork',
    };
    updateDrafts([...drafts, draft]);
    setActiveId(draft.id);
    setTab('notes');
  };

  // ── Gọi API ──
  const run = async (key: string, action: () => Promise<void>, failTitle: string) => {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      onShowToast?.(failTitle, errorMessage(err, t('scriptReview.errors.generic')));
      // 409: có lần nộp mới hoặc người khác đã quyết; tải lại để Editor thấy trạng thái thật
      await loadData();
    } finally {
      setBusy(null);
    }
  };

  const handleOpenReview = () =>
    run(
      'open',
      async () => {
        await assignmentService.openReview(chapterId, taskId);
        await loadData();
      },
      t('scriptReview.toast.openFailed'),
    );

  const releaseHeldReviewIfNeeded = useCallback(async () => {
    if (
      !heldReviewLockRef.current ||
      decisionMadeRef.current ||
      !chapterId ||
      !taskId ||
      typeof assignmentService.releaseStageTaskReview !== 'function'
    ) {
      return;
    }
    heldReviewLockRef.current = false;
    try {
      await assignmentService.releaseStageTaskReview(chapterId, taskId);
    } catch {
      // Bỏ qua nếu khoá đã được nhả hoặc chuyển trạng thái
    }
  }, [chapterId, taskId]);

  useEffect(() => {
    return () => {
      if (
        heldReviewLockRef.current &&
        !decisionMadeRef.current &&
        chapterId &&
        taskId &&
        typeof assignmentService.releaseStageTaskReview === 'function'
      ) {
        heldReviewLockRef.current = false;
        void assignmentService.releaseStageTaskReview(chapterId, taskId).catch(() => null);
      }
    };
  }, [chapterId, taskId]);

  const handleForceReleaseReview = () =>
    run(
      'releaseReview',
      async () => {
        const released = await assignmentService.releaseStageTaskReview(chapterId, taskId);
        heldReviewLockRef.current = false;
        autoOpenedTaskRef.current = taskId;
        setGridReviewerUserId(released?.reviewerUserId ?? null);
        setGridReviewerName(null);
        if (released?.lastDecisionComment !== undefined) {
          setGridLatestComment(released.lastDecisionComment?.trim() || null);
        }
        if (released?.reopenReason !== undefined) {
          setGridReopenReason(released.reopenReason?.trim() || null);
        }
        if (released?.isInputOutdated !== undefined) {
          setGridIsInputOutdated(Boolean(released.isInputOutdated));
        }
        setAssignment((prev) =>
          prev ? { ...prev, status: (released?.status ?? 'Submitted') as any } : prev,
        );
        onShowToast?.(
          t('chapterReview.releaseReviewToast', 'Đã nhả khoá duyệt'),
          assignment?.brief ?? '',
        );
      },
      t('scriptReview.errors.generic'),
    );

  const handleReturn = () =>
    run(
      'return',
      async () => {
        if (langParam) {
          // BR-34: Editor trả bản dịch ấn bản kèm yêu cầu sửa
          await chapterEditionService.reviewEdition(chapterId, langParam, {
            action: 'RequestChange',
            comment: summary.trim(),
          });
        } else if (isGridTask) {
          const commentParts = [
            summary.trim(),
            ...drafts
              .map((d, idx) => (d.text.trim() ? `[M${idx + 1}] ${d.text.trim()}` : ''))
              .filter(Boolean),
          ].filter(Boolean);
          const commentText = commentParts.join('\n');
          const updated = await assignmentService.requestStageTaskChanges(
            chapterId,
            taskId,
            commentText,
          );
          decisionMadeRef.current = true;
          heldReviewLockRef.current = false;
          autoOpenedTaskRef.current = taskId;
          updateDrafts([]);
          setSummary('');
          setGridReviewerUserId(updated?.reviewerUserId ?? null);
          setGridReviewerName(null);
          setGridLatestComment(updated?.lastDecisionComment?.trim() || commentText || null);
          if (updated?.reopenReason !== undefined) {
            setGridReopenReason(updated.reopenReason?.trim() || null);
          }
          if (updated?.isInputOutdated !== undefined) {
            setGridIsInputOutdated(Boolean(updated.isInputOutdated));
          }
          setAssignment((prev) =>
            prev ? { ...prev, status: (updated?.status ?? 'ReworkRequired') as any } : prev,
          );
          setSubmissions((prev) =>
            prev.map((s) =>
              isPendingSub(s) ? { ...s, status: 'Rejected', decisionComment: commentText } : s,
            ),
          );
          onShowToast?.(
            t('artworkReview.toast.returnedTitle'),
            t('scriptReview.toast.returnedBody', {
              count: Math.max(
                drafts.reduce((count, draft) => count + Math.max(draft.panelIds.length, 1), 0),
                1,
              ),
            }),
          );
          return;
        } else {
          await assignmentService.requestChanges(chapterId, taskId, {
            comment: summary.trim(),
            expectedSubmissionId: pendingSub?.id,
            changes:
              drafts.length > 0
                ? drafts.flatMap((d) => {
                    const panelIds = d.panelIds.length > 0 ? d.panelIds : [undefined];
                    const groupId = panelIds.length > 1 ? newDraftId() : undefined;
                    return panelIds.map((panelId) => ({
                      description: d.text.trim(),
                      regionJson: JSON.stringify(d.box),
                      assetReferenceId: d.assetReferenceId,
                      panelId,
                      groupId,
                      layer: d.layer,
                    }));
                  })
                : undefined,
          });
        }
        updateDrafts([]);
        setSummary('');
        onShowToast?.(
          t('artworkReview.toast.returnedTitle'),
          t('scriptReview.toast.returnedBody', {
            count: Math.max(
              drafts.reduce((count, draft) => count + Math.max(draft.panelIds.length, 1), 0),
              1,
            ),
          }),
        );
        await loadData();
      },
      t('scriptReview.toast.returnFailed'),
    );

  const handleApprove = () =>
    run(
      'approve',
      async () => {
        if (langParam) {
          // BR-34: Editor duyệt ấn bản dịch -> EditorApproved
          await chapterEditionService.reviewEdition(chapterId, langParam, {
            action: 'Approve',
          });
        } else if (isGridTask) {
          await assignmentService.approveStageTask(chapterId, taskId);
          decisionMadeRef.current = true;
          heldReviewLockRef.current = false;
          onShowToast?.(t('artworkReview.toast.approvedTitle'), assignment?.brief ?? '');
          backToDesk();
          return;
        } else {
          await assignmentService.approveAssignment(chapterId, taskId, pendingSub?.id);
        }
        onShowToast?.(t('artworkReview.toast.approvedTitle'), assignment?.brief ?? '');
        backToDesk();
      },
      t('scriptReview.toast.approveFailed'),
    );

  const crAction = (cr: ChangeRequestDto, call: () => Promise<ChangeRequestDto>) =>
    run(
      cr.id,
      async () => {
        const updated = await call();
        setChangeRequests((list) => list.map((c) => (c.id === updated.id ? updated : c)));
      },
      t('scriptReview.toast.crFailed'),
    );

  const handleRunVisual = () =>
    run(
      'visual',
      async () => setVisualReport(await assignmentService.runVisualConsistencyCheck(chapterId)),
      t('artworkReview.toast.visualFailed'),
    );

  const handleTriageVisual = (d: VisualDeviationDto, decision: VisualDecision, note?: string) =>
    run(
      d.findingId,
      async () => {
        await assignmentService.triageConsistencyFinding(chapterId, d.findingId, decision, note);
        setVisualReport(await assignmentService.getVisualConsistencyReport(chapterId));
      },
      t('scriptReview.toast.triageFailed'),
    );

  const handleImpact = (reason: string) =>
    run(
      'impact',
      async () => {
        if (!impactDecision) return;
        if (isGridTask) {
          const updated = await assignmentService.resolveStageTaskImpact(
            chapterId,
            taskId,
            impactDecision === 'Keep',
          );
          setGridIsInputOutdated(Boolean(updated?.isInputOutdated));
          if (updated?.lastDecisionComment !== undefined) {
            setGridLatestComment(updated.lastDecisionComment?.trim() || null);
          }
          if (updated?.reopenReason !== undefined) {
            setGridReopenReason(updated.reopenReason?.trim() || null);
          }
          setAssignment((prev) =>
            prev
              ? {
                  ...prev,
                  status: (updated?.status ??
                    (impactDecision === 'Keep' ? prev.status : 'ReworkRequired')) as any,
                  impactReviewReason: updated?.isInputOutdated
                    ? updated.outdatedReason || prev.impactReviewReason
                    : null,
                }
              : prev,
          );
          setImpactDecision(null);
          return;
        }
        await assignmentService.resolveImpactReview(chapterId, taskId, {
          decision: impactDecision,
          reason,
        });
        setImpactDecision(null);
        await loadData();
      },
      t('artworkReview.toast.impactFailed'),
    );

  const backToDesk = () =>
    effectiveWsId && seriesId
      ? navigate(`/workspaces/${effectiveWsId}/series/${seriesId}/editor/desk`)
      : navigate('/workspaces');

  const handleCloseWithoutDecision = async () => {
    await releaseHeldReviewIfNeeded();
    backToDesk();
  };

  if (!chapterId) {
    return (
      <p className='p-8 text-center text-sm text-stone-500'>
        {t('artworkReview.errors.noChapter')}
      </p>
    );
  }

  if (loading && !assignment) {
    return (
      <div className='flex flex-1 gap-6 bg-[#FAF9F5] p-6' aria-busy='true'>
        <div className='h-[70vh] flex-1 animate-pulse rounded-xl bg-stone-200/70' />
        <div className='hidden h-[70vh] w-96 animate-pulse rounded-xl bg-stone-200/70 lg:block' />
      </div>
    );
  }

  if (loadError || !assignment) {
    return (
      <div className='flex flex-1 items-center justify-center bg-[#FAF9F5] p-6'>
        <div className='max-w-md rounded-xl border border-stone-200/80 bg-white p-6 text-center shadow-xs'>
          <AlertTriangle className='mx-auto h-8 w-8 text-rose-600' aria-hidden='true' />
          <p className='mt-2 font-serif text-base font-bold text-stone-900'>
            {t('artworkReview.errors.loadTitle')}
          </p>
          <p className='mt-1 text-xs text-stone-500'>
            {loadError ?? t('artworkReview.errors.notFound')}
          </p>
          <div className='mt-4 flex justify-center gap-2'>
            <button
              type='button'
              onClick={loadData}
              className='rounded-full bg-[#EA580C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C]'
            >
              {t('scriptReview.common.retry')}
            </button>
            <button
              type='button'
              onClick={backToDesk}
              className='rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
            >
              {t('scriptReview.common.backToDesk')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isChapterReview) {
    return (
      <ChapterReviewView
        assignment={assignment}
        chapterId={chapterId}
        seriesId={seriesId || assignment.seriesId || ''}
        effectiveWsId={effectiveWsId}
        effectiveRole={normalizeWorkspaceRole(workspaceRole) ?? workspaceRole ?? null}
        currentUserId={currentUserId}
        onShowToast={onShowToast}
        onDecisionMade={() => {
          decisionMadeRef.current = true;
          heldReviewLockRef.current = false;
        }}
        onCloseWithoutDecision={handleCloseWithoutDecision}
      />
    );
  }

  // ── Điều kiện quyết định ──
  const unclosed = countUnclosed(changeRequests, true);
  const emptyDrafts = drafts.filter((d) => !d.text.trim()).length;
  const draftRequestCount = drafts.reduce(
    (count, draft) => count + Math.max(draft.panelIds.length, 1),
    0,
  );
  const lockedByOtherText = isLockedByOtherReviewer
    ? t('chapterReview.underReviewBy', {
        name: gridReviewerName || gridReviewerUserId || '',
      })
    : null;
  const approveBlocker = lockedByOtherText
    ? lockedByOtherText
    : drafts.length > 0
      ? t('scriptReview.decision.blockedByDrafts', { count: drafts.length })
      : unclosed > 0
        ? t('scriptReview.decision.blockedByUnclosed', { count: unclosed })
        : null;
  const pageDeviations = (visualReport?.deviations ?? []).filter(
    (d) =>
      d.isDeviation &&
      String(d.severity) === 'Blocking' &&
      OPEN_FINDING_STATUSES.includes(String(d.status)) &&
      (!arts.pageId || !d.pageId || d.pageId === arts.pageId),
  ).length;

  const notice = (() => {
    if (assignment.impactReviewReason || isLockedByOtherReviewer) return null;
    if (canDecide) return null;
    if (work?.isAssignee) return t('scriptReview.notice.selfReview');
    if (!work?.isReviewer) return t('artworkReview.notice.notReviewer');
    if (!isGridTask && work.canOpenReview) return t('scriptReview.notice.notOpened');
    return t('scriptReview.notice.status', {
      status: t(`scriptReview.assignmentStatus.${assignment.status}`, String(assignment.status)),
    });
  })();

  const liveCrCount = changeRequests.filter((c) => !isCrClosed(c)).length;
  const zoom = ZOOM_STEPS[zoomIndex];
  const versionCaption = (art: typeof current, isCurrent: boolean) => {
    if (!art) return '';
    const attempt = submissions.find(
      (s) => s.artworkReferenceIds?.includes(art.id) || art.id === `composite-sub-${s.id}`,
    )?.attemptNumber;
    const base = attempt
      ? t('artworkReview.canvas.attempt', { attempt })
      : t('artworkReview.canvas.version', { version: art.versionNumber });
    return isCurrent ? t('artworkReview.canvas.current', { label: base }) : base;
  };

  return (
    <div className='flex min-h-0 flex-1 flex-col bg-[#FAF9F5] font-sans text-stone-900'>
      <header className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <button
            type='button'
            data-testid='review-close-btn'
            onClick={() => void handleCloseWithoutDecision()}
            aria-label={t('scriptReview.common.backToDesk', 'Quay lại Bàn duyệt')}
            title={t('scriptReview.common.backToDesk', 'Quay lại Bàn duyệt')}
            className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 cursor-pointer'
          >
            <ArrowLeft className='h-4 w-4' />
          </button>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h1 className='truncate font-serif text-lg font-bold tracking-tight text-stone-900'>
                {[
                  chapterNumber !== null
                    ? t('scriptReview.header.title', { number: chapterNumber })
                    : null,
                  pageNumber !== null
                    ? t('artworkReview.header.page', { number: pageNumber })
                    : null,
                  assignment.stageName,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </h1>
              {isGridTask && gridIsInputOutdated && (
                <span
                  data-testid='review-input-outdated-badge'
                  className='inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900'
                >
                  <AlertTriangle className='h-3 w-3 shrink-0 text-amber-700' aria-hidden='true' />
                  {t('chapterReview.inputOutdatedBadge', 'Đầu vào đã đổi')}
                </span>
              )}
              {langParam && (
                <span
                  data-testid='edition-review-badge'
                  className='inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-bold text-xs'
                >
                  <Globe className='w-3.5 h-3.5 text-orange-600' />
                  {t('artworkReview.header.editionBadge', { lang: langParam.toUpperCase() })}
                </span>
              )}
            </div>
            <p className='text-xs text-stone-500'>
              {latestSub
                ? t('scriptReview.header.submission', {
                    attempt: latestSub.attemptNumber,
                    date: new Date(latestSub.submittedAt).toLocaleString(
                      lang === 'vi' ? 'vi-VN' : 'en-GB',
                    ),
                  })
                : t('scriptReview.header.noSubmission')}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {previous && (
            <button
              type='button'
              aria-pressed={compare}
              onClick={() => setCompare((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-150 ${
                compare
                  ? 'border-orange-200 bg-orange-50 text-orange-800'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              {t('artworkReview.toolbar.compare')}
            </button>
          )}
          <div className='flex items-center rounded-full border border-stone-200 bg-white'>
            <button
              type='button'
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              disabled={zoomIndex === 0}
              className='rounded-l-full p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-40'
              aria-label={t('artworkReview.toolbar.zoomOut')}
            >
              <Minus className='h-4 w-4' />
            </button>
            <button
              type='button'
              onClick={() => setZoomIndex(2)}
              className='min-w-12 px-1 font-mono text-xs text-stone-700 hover:text-stone-900'
              title={t('artworkReview.toolbar.zoomReset')}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type='button'
              onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
              disabled={zoomIndex === ZOOM_STEPS.length - 1}
              className='rounded-r-full p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-40'
              aria-label={t('artworkReview.toolbar.zoomIn')}
            >
              <Plus className='h-4 w-4' />
            </button>
          </div>
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col lg:flex-row'>
        <main className='flex min-h-0 min-w-0 flex-1 flex-col'>
          {assignment.impactReviewReason && (
            <div className='mx-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3'>
              <p className='text-xs font-semibold text-amber-900'>
                {t('artworkReview.impact.title')}
              </p>
              <p className='mt-1 text-xs text-amber-900'>{assignment.impactReviewReason}</p>
              {work?.isReviewer && !work.isAssignee && !impactDecision && (
                <div className='mt-2 flex gap-2'>
                  <button
                    type='button'
                    onClick={() => setImpactDecision('Keep')}
                    className='rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                  >
                    {t('artworkReview.impact.keep')}
                  </button>
                  <button
                    type='button'
                    onClick={() => setImpactDecision('Rework')}
                    className='rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50'
                  >
                    {t('artworkReview.impact.rework')}
                  </button>
                </div>
              )}
              {impactDecision && (
                <ReasonForm
                  tone={impactDecision === 'Rework' ? 'danger' : 'neutral'}
                  label={t('artworkReview.impact.reason')}
                  confirmLabel={
                    impactDecision === 'Keep'
                      ? t('artworkReview.impact.keep')
                      : t('artworkReview.impact.rework')
                  }
                  busy={busy === 'impact'}
                  onCancel={() => setImpactDecision(null)}
                  onConfirm={handleImpact}
                />
              )}
            </div>
          )}

          {isGridTask &&
            String(assignment.status) === 'ReworkRequired' &&
            (gridReopenReason || gridLatestComment) && (
              <div
                data-testid={
                  gridReopenReason
                    ? 'review-view-reopen-reason'
                    : 'review-view-last-decision-comment'
                }
                className='mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900'
              >
                {gridReopenReason ? (
                  <>
                    🔄{' '}
                    <span className='font-semibold'>
                      {t('chapterReview.reopenReasonPrefix', 'Producer mở lại:')}
                    </span>{' '}
                    {gridReopenReason}
                  </>
                ) : (
                  <>
                    💬{' '}
                    <span className='font-semibold'>
                      {t('chapterReview.gate2GridLastComment', 'Nhận xét lần duyệt gần nhất')}:
                    </span>{' '}
                    {gridLatestComment}
                  </>
                )}
              </div>
            )}

          {isLockedByOtherReviewer && lockedByOtherText && (
            <div
              data-testid='review-locked-by-other'
              className='mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950'
            >
              <span className='flex items-center gap-1.5 font-semibold'>
                <Lock className='h-3.5 w-3.5 shrink-0 text-amber-700' aria-hidden='true' />
                {lockedByOtherText}
              </span>
              {isProducer && (
                <button
                  type='button'
                  data-testid='review-force-release-btn'
                  disabled={busy === 'releaseReview'}
                  onClick={handleForceReleaseReview}
                  className='inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-200 disabled:opacity-50 cursor-pointer'
                >
                  <RotateCcw className='h-3.5 w-3.5' aria-hidden='true' />
                  {t('chapterReview.forceReleaseReviewBtn', 'Gỡ khoá duyệt')}
                </button>
              )}
            </div>
          )}

          {notice && (
            <div className='mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5'>
              <p className='text-xs leading-normal text-amber-900'>{notice}</p>
              {!isGridTask && work?.canOpenReview && (
                <button
                  type='button'
                  onClick={handleOpenReview}
                  disabled={busy === 'open'}
                  className='shrink-0 rounded-full bg-[#EA580C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#C2410C] disabled:opacity-50'
                >
                  {t('scriptReview.notice.openAction')}
                </button>
              )}
            </div>
          )}

          {canDecide && current && (
            <p className='px-4 pt-3 text-xs text-stone-500'>{t('artworkReview.canvas.drawHint')}</p>
          )}

          {arts.orphans.length > 0 && (
            <div className='mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900'>
              {arts.orphans.map((o) => (
                <div key={o.subId}>
                  <p>{t('artworkReview.canvas.orphan', { attempt: o.attempt })}</p>
                  <div className='mt-1 flex flex-wrap gap-2'>
                    {o.arts.map((art) =>
                      arts.urls[art.id] ? (
                        <img
                          key={art.id}
                          src={arts.urls[art.id]}
                          alt={art.fileName || art.id}
                          className='h-16 w-auto rounded border border-amber-300 bg-white object-contain'
                        />
                      ) : null,
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className='min-h-0 flex-1 overflow-auto'>
            {arts.loading && !current ? (
              <div className='m-6 h-[60vh] animate-pulse rounded-xl bg-stone-200/70' />
            ) : arts.loadError ? (
              <p className='p-8 text-center text-sm text-rose-800'>
                {errorMessage(arts.loadError, t('artworkReview.errors.artwork'))}
              </p>
            ) : (
              <ArtworkCanvas
                currentUrl={current ? arts.urls[current.id] : undefined}
                currentCaption={versionCaption(current, true)}
                previousUrl={compare && previous ? arts.urls[previous.id] : undefined}
                previousCaption={compare && previous ? versionCaption(previous, false) : undefined}
                zoom={zoom}
                canDraw={canDecide && !!current}
                regions={currentRegions}
                previousRegions={compare ? previousRegions : []}
                activeRegionId={activeId}
                onSelectRegion={selectNote}
                onDrawn={handleDrawn}
                emptyText={t('artworkReview.canvas.empty')}
              />
            )}
          </div>
        </main>

        <aside className='flex max-h-[45vh] w-full shrink-0 flex-col border-t border-stone-200 bg-white lg:max-h-none lg:w-96 lg:border-l lg:border-t-0'>
          <div role='tablist' className='flex shrink-0 border-b border-stone-200 px-2'>
            {(['notes', 'checks'] as const).map((key) => (
              <button
                key={key}
                type='button'
                role='tab'
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                  tab === key
                    ? 'border-orange-500 text-orange-800'
                    : 'border-transparent text-stone-600 hover:text-stone-900'
                }`}
              >
                {key === 'notes'
                  ? t('scriptReview.tabs.notes', { count: draftRequestCount + liveCrCount })
                  : t('scriptReview.tabs.checks')}
              </button>
            ))}
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            {tab === 'notes' ? (
              <ArtworkNotesTab
                drafts={drafts}
                changeRequests={changeRequests}
                regionLabel={regionLabel}
                activeId={activeId}
                onSelect={selectNote}
                canDecide={canDecide}
                busyId={busy}
                onDraftText={(id, text) =>
                  updateDrafts(drafts.map((d) => (d.id === id ? { ...d, text } : d)))
                }
                onDraftLayer={(id, layer) =>
                  updateDrafts(drafts.map((d) => (d.id === id ? { ...d, layer } : d)))
                }
                onDeleteDraft={(id) => updateDrafts(drafts.filter((d) => d.id !== id))}
                onVerify={(cr) =>
                  crAction(cr, () => assignmentService.verifyChangeRequest(chapterId, cr.id))
                }
                onReopen={(cr, comment) =>
                  crAction(cr, () =>
                    assignmentService.reopenChangeRequest(chapterId, cr.id, comment),
                  )
                }
                onReject={(cr, reason) =>
                  crAction(cr, () =>
                    assignmentService.rejectChangeRequest(chapterId, cr.id, reason),
                  )
                }
              />
            ) : (
              <VisualChecksTab
                report={visualReport}
                pageId={arts.pageId}
                canTriage={!!work?.isReviewer}
                busy={busy}
                onRun={handleRunVisual}
                onTriage={handleTriageVisual}
              />
            )}
          </div>

          {showDecisionBar && (
            <DecisionBar
              summary={summary}
              onSummaryChange={setSummary}
              labels={{
                summary: t('artworkReview.decision.summaryLabel'),
                summaryPlaceholder: t('scriptReview.decision.summaryPlaceholder'),
                summaryRequired: t('scriptReview.decision.summaryRequired'),
                returnAction:
                  draftRequestCount > 0
                    ? t('scriptReview.decision.returnWithNotes', { count: draftRequestCount })
                    : t('artworkReview.decision.return'),
                approve: t('artworkReview.decision.approve'),
              }}
              warning={
                pageDeviations > 0
                  ? t('artworkReview.decision.blockingDeviations', { count: pageDeviations })
                  : null
              }
              returnBlocker={
                lockedByOtherText
                  ? lockedByOtherText
                  : emptyDrafts > 0
                    ? t('artworkReview.decision.emptyDrafts', { count: emptyDrafts })
                    : null
              }
              approveBlocker={approveBlocker}
              busy={busy === 'return' || busy === 'approve' ? busy : null}
              onReturn={handleReturn}
              onApprove={handleApprove}
            />
          )}
        </aside>
      </div>
    </div>
  );
};
