import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, CornerUpLeft, Lock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  chapterService,
  type ChapterDto,
  type ChapterBibleGateResultDto,
} from '@/services/chapter.service';
import { scriptLineService, type SceneDetailDto } from '@/services/scriptLine.service';
import { assignmentService } from '@/services/assignment.service';
import type {
  AssignmentDto,
  ChangeRequestDto,
  ConsistencyFindingDto,
  SubmissionDto,
} from '@/types/pipeline';
import { countUnclosed, getWorkActions } from '@/shared/features/collaboration/collaborationRules';
import {
  ManuscriptPane,
  type AnchorMarks,
  type ComposerTarget,
} from './script-review/ManuscriptPane';
import { NotesTab, type LineLocation } from './script-review/NotesTab';
import { ChecksTab, type FindingDecision } from './script-review/ChecksTab';
import {
  anchorKey,
  draftsToChangeItems,
  isCrClosed,
  lineText,
  readDrafts,
  writeDrafts,
  type ReviewDraft,
} from './script-review/scriptReviewModel';

interface ScriptReviewViewProps {
  currentUserId?: string;
  workspaceRole?: string;
  onShowToast?: (title: string, message: string) => void;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Duyệt kịch bản (cổng Script, CF3). Editor đọc bản nộp, mỗi nhận xét trên dòng/phân cảnh là một yêu cầu sửa;
 * trả bài gửi toàn bộ nhận xét cho Writer kèm nhận xét chung bắt buộc (BR-06). Duyệt chỉ khi mọi yêu cầu sửa
 * cũ đã được xác minh hoặc bỏ. Editor không sửa câu chữ của Writer.
 */
export const ScriptReviewView: React.FC<ScriptReviewViewProps> = ({
  currentUserId,
  workspaceRole,
  onShowToast,
}) => {
  const {
    workspaceId,
    seriesId,
    chapterId = '',
  } = useParams<{
    workspaceId: string;
    seriesId: string;
    chapterId: string;
  }>();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const navigate = useNavigate();
  const { t } = useTranslation('review');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [scenes, setScenes] = useState<SceneDetailDto[]>([]);
  const [bibleGate, setBibleGate] = useState<ChapterBibleGateResultDto | null>(null);
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<SubmissionDto | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestDto[]>([]);

  const [drafts, setDrafts] = useState<ReviewDraft[]>([]);
  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [tab, setTab] = useState<'notes' | 'checks'>('notes');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const isProducer = ['producer', 'owner'].includes((workspaceRole ?? '').toLowerCase());

  const loadData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [chapterData, sceneList, gate, findingList] = await Promise.all([
        chapterService.getChapterById(chapterId),
        scriptLineService.getScenesByChapter(chapterId),
        chapterService.checkBibleGate(chapterId).catch(() => null),
        assignmentService.getConsistencyFindings(chapterId).catch(() => []),
      ]);
      const details = await Promise.all(sceneList.map((s) => scriptLineService.getSceneById(s.id)));
      setChapter(chapterData);
      setScenes(details.sort((a, b) => a.sceneNumber - b.sceneNumber));
      setBibleGate(gate);
      setFindings(findingList);

      if (assignmentId) {
        const [a, crs, subs] = await Promise.all([
          assignmentService.getAssignmentById(chapterId, assignmentId),
          assignmentService.getChangeRequests(chapterId, { assignmentId }),
          assignmentService.getSubmissions(chapterId, assignmentId),
        ]);
        setAssignment(a);
        setChangeRequests(crs);
        setLatestSubmission([...subs].sort((x, y) => y.attemptNumber - x.attemptNumber)[0] ?? null);
      }
    } catch (err) {
      setLoadError(errorMessage(err, t('scriptReview.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [chapterId, assignmentId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submissionId = latestSubmission?.id ?? null;

  useEffect(() => {
    if (assignmentId) setDrafts(readDrafts(assignmentId, submissionId));
  }, [assignmentId, submissionId]);

  const updateDrafts = (next: ReviewDraft[]) => {
    setDrafts(next);
    if (assignmentId) writeDrafts(assignmentId, submissionId, next);
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
  const canDecide = work?.canDecide ?? false;

  // ── Tra cứu vị trí: số thứ tự dòng trong cảnh khớp với số hiển thị ở bản thảo ──
  const lineIndex = useMemo(() => {
    const map = new Map<string, { sceneNumber: number; order: number; text: string }>();
    for (const scene of scenes) {
      [...scene.scriptLines]
        .sort((a, b) => a.lineOrder - b.lineOrder)
        .forEach((line, i) =>
          map.set(line.id, { sceneNumber: scene.sceneNumber, order: i + 1, text: lineText(line) }),
        );
    }
    return map;
  }, [scenes]);

  const locate = useCallback(
    (sceneId: string | null | undefined, lineId: string | null | undefined): LineLocation => {
      if (lineId) {
        const hit = lineIndex.get(lineId);
        if (hit)
          return {
            label: t('scriptReview.location.line', { scene: hit.sceneNumber, line: hit.order }),
            currentText: hit.text,
          };
      }
      const scene = scenes.find((s) => s.id === sceneId);
      if (scene) {
        return {
          label: lineId
            ? t('scriptReview.location.removedLine', { scene: scene.sceneNumber })
            : t('scriptReview.location.scene', { scene: scene.sceneNumber }),
          currentText: lineId ? null : scene.slugline || scene.heading || '',
        };
      }
      return { label: t('scriptReview.location.general'), currentText: lineId ? null : '' };
    },
    [lineIndex, scenes, t],
  );

  const speakers = useMemo(
    () => new Map((bibleGate?.items ?? []).map((i) => [i.bibleEntryId, i.name])),
    [bibleGate],
  );
  const speakerName = useCallback(
    (id: string | null | undefined) => (id ? (speakers.get(id) ?? null) : null),
    [speakers],
  );

  const marks = useMemo(() => {
    const map = new Map<string, AnchorMarks>();
    const at = (key: string) => {
      let m = map.get(key);
      if (!m) {
        m = { drafts: [], crs: [], findings: [] };
        map.set(key, m);
      }
      return m;
    };
    drafts.forEach((d) => at(anchorKey(d.sceneId, d.scriptLineId)).drafts.push(d));
    changeRequests
      .filter((c) => c.sceneId)
      .forEach((c) => at(anchorKey(c.sceneId, c.scriptLineId)).crs.push(c));
    findings
      .filter((f) => f.sceneId || f.scriptLineId)
      .filter((f) => ['Open', 'Confirmed', 'NeedsClarification'].includes(String(f.status)))
      .forEach((f) => at(anchorKey(f.sceneId, f.scriptLineId)).findings.push(f));
    return map;
  }, [drafts, changeRequests, findings]);

  const sceneNoteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const add = (sceneId: string | null | undefined, n: number) => {
      if (sceneId && n > 0) counts.set(sceneId, (counts.get(sceneId) ?? 0) + n);
    };
    drafts.forEach((d) => add(d.sceneId, 1));
    changeRequests.filter((c) => !isCrClosed(c)).forEach((c) => add(c.sceneId, 1));
    return counts;
  }, [drafts, changeRequests]);

  // ── Nhận xét nháp ──
  const handleSaveComment = (text: string) => {
    if (!composer) return;
    if (composer.draftId) {
      updateDrafts(drafts.map((d) => (d.id === composer.draftId ? { ...d, text } : d)));
    } else {
      updateDrafts([
        ...drafts,
        {
          id: newId(),
          sceneId: composer.sceneId,
          scriptLineId: composer.scriptLineId,
          quotedText: composer.quotedText,
          text,
        },
      ]);
    }
    setComposer(null);
    setTab('notes');
  };

  const handleEditDraft = (d: ReviewDraft) => {
    setActiveAnchor(anchorKey(d.sceneId, d.scriptLineId));
    setComposer({
      sceneId: d.sceneId,
      scriptLineId: d.scriptLineId,
      quotedText: d.quotedText,
      draftId: d.id,
      initialText: d.text,
    });
  };

  const handleFindingToComment = (f: ConsistencyFindingDto) => {
    const sceneId =
      f.sceneId ??
      scenes.find((s) => s.scriptLines.some((l) => l.id === f.scriptLineId))?.id ??
      null;
    if (!sceneId) return;
    setActiveAnchor(anchorKey(sceneId, f.scriptLineId));
    setComposer({
      sceneId,
      scriptLineId: f.scriptLineId ?? null,
      quotedText: f.scriptLineId ? (lineIndex.get(f.scriptLineId)?.text ?? '') : '',
      initialText: f.message,
    });
  };

  // ── Hành động gọi API ──
  const run = async (key: string, action: () => Promise<void>, failTitle: string) => {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      onShowToast?.(failTitle, errorMessage(err, t('scriptReview.errors.generic')));
    } finally {
      setBusy(null);
    }
  };

  const handleOpenReview = () =>
    run(
      'open',
      async () => {
        if (!assignmentId) return;
        await assignmentService.openReview(chapterId, assignmentId);
        await loadData();
      },
      t('scriptReview.toast.openFailed'),
    );

  const handleReturn = () =>
    run(
      'return',
      async () => {
        if (!assignmentId || !summary.trim()) return;
        await assignmentService.requestChanges(chapterId, assignmentId, {
          comment: summary.trim(),
          changes: drafts.length > 0 ? draftsToChangeItems(drafts) : undefined,
          expectedSubmissionId: submissionId ?? undefined,
        });
        updateDrafts([]);
        setSummary('');
        onShowToast?.(
          t('scriptReview.toast.returnedTitle'),
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
        if (!assignmentId) return;
        await assignmentService.approveAssignment(
          chapterId,
          assignmentId,
          submissionId ?? undefined,
        );
        updateDrafts([]);
        onShowToast?.(t('scriptReview.toast.approvedTitle'), t('scriptReview.toast.approvedBody'));
        await loadData();
      },
      t('scriptReview.toast.approveFailed'),
    );

  const replaceCr = (updated: ChangeRequestDto) =>
    setChangeRequests((list) => list.map((c) => (c.id === updated.id ? updated : c)));

  const crAction = (cr: ChangeRequestDto, call: () => Promise<ChangeRequestDto>) =>
    run(cr.id, async () => replaceCr(await call()), t('scriptReview.toast.crFailed'));

  const handleTriage = (f: ConsistencyFindingDto, decision: FindingDecision, note?: string) =>
    run(
      f.id,
      async () => {
        const updated = await assignmentService.triageConsistencyFinding(
          chapterId,
          f.id,
          decision,
          note,
        );
        setFindings((list) => list.map((x) => (x.id === updated.id ? updated : x)));
      },
      t('scriptReview.toast.triageFailed'),
    );

  const handleRunCheck = () =>
    run(
      'consistency',
      async () => {
        const res = await assignmentService.runConsistencyCheck(chapterId);
        setFindings(res.findings ?? []);
        setTab('checks');
      },
      t('scriptReview.toast.checkFailed'),
    );

  const chapterAction = (key: string, call: () => Promise<ChapterDto>) =>
    run(key, async () => setChapter(await call()), t('scriptReview.toast.canonFailed'));

  const backToDesk = () =>
    workspaceId && seriesId
      ? navigate(`/workspaces/${workspaceId}/series/${seriesId}/editor/desk`)
      : navigate(-1);

  if (loading && !chapter) {
    return (
      <div className='flex flex-1 flex-col gap-3 bg-[#FAF9F5] p-6' aria-busy='true'>
        <div className='h-6 w-64 animate-pulse rounded-md bg-stone-200/70' />
        <div className='h-40 w-full max-w-3xl animate-pulse rounded-xl bg-stone-200/70' />
        <div className='h-40 w-full max-w-3xl animate-pulse rounded-xl bg-stone-200/70' />
      </div>
    );
  }

  if (loadError || !chapter) {
    return (
      <div className='flex flex-1 items-center justify-center bg-[#FAF9F5] p-6'>
        <div className='max-w-md rounded-xl border border-stone-200/80 bg-white p-6 text-center shadow-xs'>
          <AlertTriangle className='mx-auto h-8 w-8 text-rose-600' aria-hidden='true' />
          <p className='mt-2 font-serif text-base font-bold text-stone-900'>
            {t('scriptReview.errors.loadTitle')}
          </p>
          <p className='mt-1 text-xs text-stone-500'>
            {loadError ?? t('scriptReview.errors.load')}
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

  // ── Điều kiện quyết định ──
  const unclosed = countUnclosed(changeRequests, true);
  const blockingFindings = findings.filter(
    (f) =>
      String(f.severity) === 'Blocking' &&
      ['Open', 'Confirmed', 'NeedsClarification'].includes(String(f.status)),
  ).length;
  const approveBlocker =
    drafts.length > 0
      ? t('scriptReview.decision.blockedByDrafts', { count: drafts.length })
      : unclosed > 0
        ? t('scriptReview.decision.blockedByUnclosed', { count: unclosed })
        : null;

  const reviewNotice = (() => {
    if (!assignment) return t('scriptReview.notice.noAssignment');
    if (canDecide) return null;
    if (work?.isAssignee) return t('scriptReview.notice.selfReview');
    if (!work?.isReviewer) return t('scriptReview.notice.notReviewer');
    if (work.canOpenReview) return t('scriptReview.notice.notOpened');
    return t('scriptReview.notice.status', {
      status: t(`scriptReview.assignmentStatus.${assignment.status}`, String(assignment.status)),
    });
  })();

  const liveCrCount = changeRequests.filter((c) => !isCrClosed(c)).length;

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
              {t('scriptReview.header.title', { number: chapter.chapterNumber })}
              {chapter.title ? `: ${chapter.title}` : ''}
            </h1>
            <p className='text-xs text-stone-500'>
              {latestSubmission
                ? t('scriptReview.header.submission', {
                    attempt: latestSubmission.attemptNumber,
                    date: new Date(latestSubmission.submittedAt).toLocaleString(),
                  })
                : t('scriptReview.header.noSubmission')}
              {' · '}
              {t('scriptReview.header.scenes', { count: scenes.length })}
            </p>
          </div>
        </div>
        {chapter.isScriptFrozen && (
          <span className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700'>
            <Lock className='h-3.5 w-3.5' aria-hidden='true' />
            {t('scriptReview.checks.frozen')}
          </span>
        )}
      </header>

      <div className='flex min-h-0 flex-1 flex-col lg:flex-row'>
        {/* Mục lục phân cảnh */}
        <nav
          aria-label={t('scriptReview.nav.label')}
          className='hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-white xl:flex'
        >
          <p className='px-4 pb-2 pt-4 text-xs font-semibold uppercase tracking-wide text-stone-500'>
            {t('scriptReview.nav.title')}
          </p>
          <ol className='pb-4'>
            {scenes.map((s) => {
              const count = sceneNoteCounts.get(s.id) ?? 0;
              return (
                <li key={s.id}>
                  <button
                    type='button'
                    onClick={() =>
                      document
                        .getElementById(`scene-${s.id}`)
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className='flex w-full items-start justify-between gap-2 px-4 py-2 text-left hover:bg-stone-50'
                  >
                    <span className='min-w-0'>
                      <span className='block font-mono text-xs text-stone-500'>
                        {t('scriptReview.manuscript.sceneLabel', { number: s.sceneNumber })}
                      </span>
                      <span className='block truncate text-sm text-stone-800'>
                        {s.slugline || s.heading || s.sceneName || '—'}
                      </span>
                    </span>
                    {count > 0 && (
                      <span className='mt-0.5 rounded-full border border-stone-200 px-1.5 font-mono text-xs text-stone-600'>
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <main className='min-h-0 min-w-0 flex-1 overflow-y-auto'>
          {reviewNotice && (
            <div className='mx-auto mt-4 flex max-w-3xl items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5'>
              <p className='text-xs leading-normal text-amber-900'>{reviewNotice}</p>
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
          {assignment?.lastFeedbackComment && !canDecide && (
            <p className='mx-auto mt-3 max-w-3xl px-1 text-xs text-stone-600'>
              <span className='font-semibold text-stone-700'>
                {t('scriptReview.notice.lastFeedback')}
              </span>{' '}
              {assignment.lastFeedbackComment}
            </p>
          )}
          <ManuscriptPane
            scenes={scenes}
            speakerName={speakerName}
            marks={marks}
            canComment={canDecide}
            activeAnchor={activeAnchor}
            onSelectAnchor={setActiveAnchor}
            composer={composer}
            onStartComment={setComposer}
            onSaveComment={handleSaveComment}
            onCancelComment={() => setComposer(null)}
          />
        </main>

        {/* Nhận xét, kiểm tra và quyết định */}
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
              <NotesTab
                drafts={drafts}
                changeRequests={changeRequests}
                locate={locate}
                onSelectAnchor={setActiveAnchor}
                canDecide={canDecide}
                busyId={busy}
                onEditDraft={handleEditDraft}
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
              <ChecksTab
                chapter={chapter}
                bibleGate={bibleGate}
                findings={findings}
                locateLabel={(s, l) => locate(s, l).label}
                onSelectAnchor={setActiveAnchor}
                canTriage={canDecide || isProducer}
                canComment={canDecide}
                isProducer={isProducer}
                busy={busy}
                onRunCheck={handleRunCheck}
                onTriage={handleTriage}
                onFindingToComment={handleFindingToComment}
                onFreeze={() =>
                  chapterAction('freeze', () => chapterService.freezeScript(chapterId))
                }
                onUnfreeze={(reason) =>
                  chapterAction('freeze', () => chapterService.unfreezeScript(chapterId, reason))
                }
                onDecideReopen={(approve) =>
                  chapterAction('reopen', () =>
                    approve
                      ? chapterService.approveScriptReopen(chapterId)
                      : chapterService.rejectScriptReopen(chapterId),
                  )
                }
              />
            )}
          </div>

          {canDecide && (
            <div className='shrink-0 space-y-3 border-t border-stone-200 bg-[#FAF9F5] p-4'>
              <label className='block text-sm font-semibold text-stone-800'>
                {t('scriptReview.decision.summaryLabel')}
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={2}
                  placeholder={t('scriptReview.decision.summaryPlaceholder')}
                  className='mt-1 w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-stone-800 focus:border-orange-500 focus:outline-none'
                />
              </label>
              {blockingFindings > 0 && (
                <p className='flex items-start gap-1.5 text-xs text-amber-900'>
                  <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden='true' />
                  {t('scriptReview.decision.blockingFindings', { count: blockingFindings })}
                </p>
              )}
              {approveBlocker && <p className='text-xs text-stone-600'>{approveBlocker}</p>}
              <div className='flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={handleReturn}
                  disabled={!summary.trim() || busy === 'return'}
                  title={!summary.trim() ? t('scriptReview.decision.summaryRequired') : undefined}
                  className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <CornerUpLeft className='h-4 w-4' aria-hidden='true' />
                  {drafts.length > 0
                    ? t('scriptReview.decision.returnWithNotes', { count: drafts.length })
                    : t('scriptReview.decision.return')}
                </button>
                <button
                  type='button'
                  onClick={handleApprove}
                  disabled={!!approveBlocker || busy === 'approve'}
                  className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
                >
                  <CheckCircle2 className='h-4 w-4' aria-hidden='true' />
                  {t('scriptReview.decision.approve')}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
