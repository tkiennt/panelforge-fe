import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Minus, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type {
  AssignmentDto,
  ChangeRequestDto,
  SubmissionDto,
  VisualConsistencyReportDto,
  VisualDeviationDto,
} from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { chapterService } from '@/services/chapter.service';
import { pageService } from '@/services/page.service';
import { normalizeWorkspaceRole } from '@/types';
import {
  countUnclosed,
  errorMessage,
  getWorkActions,
} from '@/shared/features/collaboration/collaborationRules';
import { ChapterReviewView } from './ChapterReviewView';
import { findIntersectingPanelId } from './chapterReviewViewUtils';
import { ArtworkCanvas } from './artwork-review/ArtworkCanvas';
import { parseRegion, type Box, type CanvasRegion } from './artwork-review/artworkModel';
import { ArtworkNotesTab, type ArtworkDraft } from './artwork-review/ArtworkNotesTab';
import { VisualChecksTab, type VisualDecision } from './artwork-review/VisualChecksTab';
import { useSubmissionArtworks } from './artwork-review/useSubmissionArtworks';
import { DecisionBar } from './review-shared/DecisionBar';
import { ReasonForm } from './review-shared/ReasonForm';
import {
  OPEN_FINDING_STATUSES,
  crStatus,
  isCrClosed,
  newDraftId,
  readDrafts,
  writeDrafts,
} from './review-shared/reviewModel';

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
  const effectiveWsId = workspaceId || wsId || null;
  const navigate = useNavigate();
  const { t } = useTranslation('review');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);
  const [visualReport, setVisualReport] = useState<VisualConsistencyReportDto | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number | null>(null);

  const [drafts, setDrafts] = useState<ArtworkDraft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [tab, setTab] = useState<'notes' | 'checks'>('notes');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [impactDecision, setImpactDecision] = useState<'Keep' | 'Rework' | null>(null);

  const loadData = useCallback(async () => {
    if (!chapterId || !taskId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [a, crs, subs, report, chapter] = await Promise.all([
        assignmentService.getAssignmentById(taskId, chapterId),
        assignmentService.getChangeRequests(chapterId, { assignmentId: taskId }),
        assignmentService.getSubmissions(chapterId, taskId),
        assignmentService.getVisualConsistencyReport(chapterId).catch(() => null),
        chapterService.getChapterById(chapterId).catch(() => null),
      ]);
      setAssignment(a);
      setChangeRequests(crs);
      setSubmissions(subs);
      setVisualReport(report);
      setChapterNumber(chapter?.chapterNumber ?? null);
    } catch (err) {
      setLoadError(errorMessage(err, t('artworkReview.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [chapterId, taskId, t]);

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
  const canDecide = (work?.canDecide ?? false) && !assignment?.impactReviewReason;

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
      panelId: findIntersectingPanelId(box, arts.panels),
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

  const handleReturn = () =>
    run(
      'return',
      async () => {
        await assignmentService.requestChanges(chapterId, taskId, {
          comment: summary.trim(),
          expectedSubmissionId: pendingSub?.id,
          changes:
            drafts.length > 0
              ? drafts.map((d) => ({
                  description: d.text.trim(),
                  regionJson: JSON.stringify(d.box),
                  assetReferenceId: d.assetReferenceId,
                  panelId: d.panelId,
                }))
              : undefined,
        });
        updateDrafts([]);
        setSummary('');
        onShowToast?.(
          t('artworkReview.toast.returnedTitle'),
          t('scriptReview.toast.returnedBody', { count: Math.max(drafts.length, 1) }),
        );
        await loadData();
      },
      t('scriptReview.toast.returnFailed'),
    );

  const handleApprove = () =>
    run(
      'approve',
      async () => {
        await assignmentService.approveAssignment(chapterId, taskId, pendingSub?.id);
        onShowToast?.(t('artworkReview.toast.approvedTitle'), assignment?.brief ?? '');
        await loadData();
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
      : navigate(-1);

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
      />
    );
  }

  // ── Điều kiện quyết định ──
  const unclosed = countUnclosed(changeRequests, true);
  const emptyDrafts = drafts.filter((d) => !d.text.trim()).length;
  const approveBlocker =
    drafts.length > 0
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
    if (assignment.impactReviewReason) return null;
    if (canDecide) return null;
    if (work?.isAssignee) return t('scriptReview.notice.selfReview');
    if (!work?.isReviewer) return t('artworkReview.notice.notReviewer');
    if (work.canOpenReview) return t('scriptReview.notice.notOpened');
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
            onClick={backToDesk}
            className='rounded-full border border-stone-200 p-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            aria-label={t('scriptReview.common.backToDesk')}
            title={t('scriptReview.common.backToDesk')}
          >
            <ArrowLeft className='h-4 w-4' />
          </button>
          <div className='min-w-0'>
            <h1 className='truncate font-serif text-lg font-bold tracking-tight text-stone-900'>
              {[
                chapterNumber !== null
                  ? t('scriptReview.header.title', { number: chapterNumber })
                  : null,
                pageNumber !== null ? t('artworkReview.header.page', { number: pageNumber }) : null,
                assignment.stageName,
              ]
                .filter(Boolean)
                .join(' · ')}
            </h1>
            <p className='text-xs text-stone-500'>
              {latestSub
                ? t('scriptReview.header.submission', {
                    attempt: latestSub.attemptNumber,
                    date: new Date(latestSub.submittedAt).toLocaleString(),
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

          {notice && (
            <div className='mx-4 mt-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5'>
              <p className='text-xs leading-normal text-amber-900'>{notice}</p>
              {work?.canOpenReview && (
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

        <aside className='flex max-h-[60vh] w-full shrink-0 flex-col border-t border-stone-200 bg-white lg:max-h-none lg:w-96 lg:border-l lg:border-t-0'>
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
                  ? t('scriptReview.tabs.notes', { count: drafts.length + liveCrCount })
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

          {canDecide && (
            <DecisionBar
              summary={summary}
              onSummaryChange={setSummary}
              labels={{
                summary: t('artworkReview.decision.summaryLabel'),
                summaryPlaceholder: t('scriptReview.decision.summaryPlaceholder'),
                summaryRequired: t('scriptReview.decision.summaryRequired'),
                returnAction:
                  drafts.length > 0
                    ? t('scriptReview.decision.returnWithNotes', { count: drafts.length })
                    : t('artworkReview.decision.return'),
                approve: t('artworkReview.decision.approve'),
              }}
              warning={
                pageDeviations > 0
                  ? t('artworkReview.decision.blockingDeviations', { count: pageDeviations })
                  : null
              }
              returnBlocker={
                emptyDrafts > 0
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
