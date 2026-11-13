import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lock, Play } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  chapterService,
  type ChapterDto,
  type ChapterBibleGateResultDto,
  type ScriptCommentDto,
  type ScriptStatus,
  type ScriptVersionDetailDto,
  type ScriptVersionRow,
} from '@/services/chapter.service';
import { assignmentService } from '@/services/assignment.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { useConfirm } from '@/shared/context/ConfirmContext';
import {
  SubmittedScriptPane,
  type ComposerTarget,
  type LineMarks,
} from './script-review/SubmittedScriptPane';
import { ChecksTab, type FindingDecision } from './script-review/ChecksTab';
import { ScriptVersionDiff } from '@/shared/features/script-versions/ScriptVersionDiff';
import {
  EMPTY_BASE,
  renderRow,
  rowLineId,
  shortHash,
  type RowLabels,
} from '@/shared/features/script-versions/versionDiff';

interface ScriptReviewViewProps {
  currentUserId?: string;
  workspaceRole?: string;
  onShowToast?: (title: string, message: string) => void;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

type Tab = 'comments' | 'changes' | 'checks';
type Staleness = 'changed' | 'removed' | null;

/**
 * Duyệt kịch bản theo D12 (01_SCRIPT_PLAN). Lưu = commit, Gửi duyệt = push: Editor đọc đúng bản Writer đã gửi
 * (Chapter.LastSubmittedVersionId), nên Writer sửa tiếp không làm đổi chữ Editor đang góp ý. Góp ý không đổi
 * trạng thái kịch bản; tab "Thay đổi" so bản đang gửi với lần gửi trước. Producer bấm "Bắt đầu sản xuất" khi
 * kịch bản đang chờ duyệt (máy chủ chặn nếu Writer đã sửa sau lần gửi mà chưa gửi lại).
 */
export const ScriptReviewView: React.FC<ScriptReviewViewProps> = ({
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
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { t, lang } = useTranslation('review');
  const { t: tp } = useTranslation('production');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [pushed, setPushed] = useState<ScriptVersionDetailDto | null>(null);
  const [bibleGate, setBibleGate] = useState<ChapterBibleGateResultDto | null>(null);
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [comments, setComments] = useState<ScriptCommentDto[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('comments');
  const [busy, setBusy] = useState<string | null>(null);

  const role = (workspaceRole ?? '').toLowerCase();
  const isProducer = ['producer', 'owner'].includes(role);
  const isEditor = role === 'editor';

  const loadData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [chapterData, gate, findingList, commentList] = await Promise.all([
        chapterService.getChapterById(chapterId),
        chapterService.checkBibleGate(chapterId).catch(() => null),
        assignmentService.getConsistencyFindings(chapterId).catch(() => []),
        chapterService.getScriptComments(chapterId).catch(() => []),
      ]);
      const pushedVersion = chapterData.lastSubmittedVersionId
        ? await chapterService.getScriptVersion(chapterId, chapterData.lastSubmittedVersionId)
        : null;
      setChapter(chapterData);
      setPushed(pushedVersion);
      setBibleGate(gate);
      setFindings(findingList);
      setComments(commentList);
    } catch (err) {
      setLoadError(errorMessage(err, t('scriptReview.errors.load')));
    } finally {
      setLoading(false);
    }
  }, [chapterId, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const scriptStatus: ScriptStatus =
    chapter?.scriptStatus ?? (chapter?.isScriptFrozen ? 'Frozen' : 'Draft');
  const isInReview = scriptStatus === 'InReview';
  // Editor (chính) và Producer góp ý khi kịch bản đang chờ duyệt
  const canComment = (isEditor || isProducer) && isInReview && !!pushed;

  const labels: RowLabels = useMemo(
    () => ({
      page: (n) => tp('scriptStudio.versions.rowPage', { n }),
      panel: (n) => tp('scriptStudio.gn.panel', { n }),
      caption: tp('scriptStudio.gn.caption'),
      sfx: tp('scriptStudio.gn.sfx'),
      thought: tp('scriptStudio.versions.rowThought'),
    }),
    [tp],
  );
  const renderText = useCallback((row: ScriptVersionRow) => renderRow(row, labels), [labels]);
  const rows = useMemo(() => pushed?.rows ?? [], [pushed]);

  // ── Tra cứu dòng trong bản đã gửi ──
  const lineIndex = useMemo(() => {
    const map = new Map<string, ScriptVersionRow>();
    rows.forEach((r) => {
      const id = rowLineId(r);
      if (id) map.set(id, r);
    });
    return map;
  }, [rows]);

  const locateLabel = useCallback(
    (_sceneId: string | null | undefined, lineId: string | null | undefined) => {
      const row = lineId ? lineIndex.get(lineId) : undefined;
      if (!row) return t('scriptReview.comments.general');
      return row.panel > 0
        ? t('scriptReview.location.row', { page: row.page, panel: row.panel })
        : t('scriptReview.location.page', { page: row.page });
    },
    [lineIndex, t],
  );

  /** Góp ý cũ so với bản đang gửi: dòng bị xoá, hoặc chữ đã khác đoạn trích lúc góp ý. */
  const staleness = useCallback(
    (c: ScriptCommentDto): Staleness => {
      if (!c.scriptLineId || !pushed) return null;
      const row = lineIndex.get(c.scriptLineId);
      if (!row) return 'removed';
      return c.quotedText && renderText(row) !== c.quotedText ? 'changed' : null;
    },
    [lineIndex, pushed, renderText],
  );

  // Góp ý và phát hiện nhất quán hiển thị như dấu trên bản thảo
  const marks = useMemo(() => {
    const map = new Map<string, LineMarks>();
    const at = (lineId: string) => {
      let m = map.get(lineId);
      if (!m) {
        m = { comments: 0, findings: [] };
        map.set(lineId, m);
      }
      return m;
    };
    comments
      .filter((c) => c.scriptLineId && !c.resolvedAt)
      .forEach((c) => at(c.scriptLineId as string).comments++);
    findings
      .filter((f) => f.scriptLineId)
      .filter((f) => ['Open', 'Confirmed', 'NeedsClarification'].includes(String(f.status)))
      .forEach((f) => at(f.scriptLineId as string).findings.push(f));
    return map;
  }, [comments, findings]);

  const selectAnchor = (key: string) => {
    if (key.startsWith('line:')) setActiveLineId(key.slice(5));
  };

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

  // ── Góp ý: lưu ngay, không đổi trạng thái kịch bản ──
  const handleSaveComment = (text: string) => {
    const target = composer;
    if (!target) return;
    void run(
      'comment',
      async () => {
        const saved = await chapterService.addScriptComment(chapterId, {
          sceneId: null,
          scriptLineId: target.scriptLineId,
          quotedText: target.quotedText,
          body: text,
        });
        setComments((list) => [...list, saved]);
        setComposer(null);
        setTab('comments');
      },
      t('scriptReview.comments.saveFailed'),
    );
  };

  const handleFindingToComment = (f: ConsistencyFindingDto) => {
    const row = f.scriptLineId ? lineIndex.get(f.scriptLineId) : undefined;
    if (!row || !f.scriptLineId || !canComment) return;
    setActiveLineId(f.scriptLineId);
    setComposer({
      scriptLineId: f.scriptLineId,
      quotedText: renderText(row),
      initialText: f.message,
    });
  };

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
        setCheckedAt(res.checkedAt);
        setTab('checks');
      },
      t('scriptReview.toast.checkFailed'),
    );

  const chapterAction = (key: string, call: () => Promise<ChapterDto>) =>
    run(key, async () => setChapter(await call()), t('scriptReview.toast.canonFailed'));

  /** D12 / Gate 1: Producer bấm Bắt đầu sản xuất khi kịch bản đang chờ duyệt. */
  const handleStartProduction = async () => {
    if (!chapter) return;
    const ok = await confirm({
      title: t('scriptReview.lifecycle.startProduction'),
      description: t('scriptReview.lifecycle.startConfirm', { n: chapter.chapterNumber }),
      confirmText: t('scriptReview.lifecycle.startProduction'),
      variant: 'info',
    });
    if (!ok) return;
    await run(
      'start',
      async () => {
        setChapter(await chapterService.freezeScript(chapterId));
        onShowToast?.(t('scriptReview.lifecycle.started'), '');
      },
      t('scriptReview.lifecycle.startFailed'),
    );
  };

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

  const notice =
    scriptStatus === 'Draft'
      ? t('scriptReview.lifecycle.draftNotice')
      : scriptStatus === 'Frozen'
        ? t('scriptReview.lifecycle.frozenNotice')
        : t('scriptReview.lifecycle.inReviewNotice');
  const openComments = comments.filter((c) => !c.resolvedAt).length;
  const dateFormat = (iso: string) =>
    new Date(iso).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB');
  const tabLabel = (key: Tab) =>
    key === 'comments'
      ? t('scriptReview.comments.tab', { count: openComments })
      : key === 'changes'
        ? t('scriptReview.tabs.changes')
        : t('scriptReview.tabs.checks');

  return (
    <div className='flex min-h-0 flex-1 flex-col bg-[#FAF9F5] font-sans text-stone-900'>
      <header className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3'>
        <div className='min-w-0'>
          <h1 className='truncate font-serif text-lg font-bold tracking-tight text-stone-900'>
            {t('scriptReview.header.title', { number: chapter.chapterNumber })}
            {chapter.title ? `: ${chapter.title}` : ''}
          </h1>
          <p className='text-xs text-stone-500'>
            {pushed
              ? t('scriptReview.pushed.version', {
                  n: pushed.version.versionNumber,
                  hash: shortHash(pushed.version.contentHash),
                })
              : t('scriptReview.pushed.none')}
            {chapter.scriptSubmittedAt ? ` · ${dateFormat(chapter.scriptSubmittedAt)}` : ''}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span
            data-testid='script-status-badge'
            className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700'
          >
            {scriptStatus === 'Frozen' && <Lock className='h-3.5 w-3.5' aria-hidden='true' />}
            {t(`scriptReview.lifecycle.status.${scriptStatus}`)}
          </span>
          {isProducer && isInReview && (
            <button
              type='button'
              onClick={() => void handleStartProduction()}
              disabled={busy === 'start'}
              className='inline-flex items-center gap-1.5 rounded-full bg-[#EA580C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C] disabled:opacity-50'
            >
              <Play className='h-3.5 w-3.5' aria-hidden='true' />
              {t('scriptReview.lifecycle.startProduction')}
            </button>
          )}
        </div>
      </header>

      <div className='flex min-h-0 flex-1 flex-col lg:flex-row'>
        <main className='min-h-0 min-w-0 flex-1 overflow-y-auto'>
          <div className='mx-auto mt-4 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5'>
            <p className='text-xs leading-normal text-amber-900'>{notice}</p>
          </div>
          {pushed ? (
            <SubmittedScriptPane
              rows={rows}
              renderText={renderText}
              marks={marks}
              canComment={canComment}
              activeLineId={activeLineId}
              onSelectLine={setActiveLineId}
              composer={composer}
              onStartComment={setComposer}
              onSaveComment={handleSaveComment}
              onCancelComment={() => setComposer(null)}
            />
          ) : (
            <p className='mx-auto mt-6 max-w-3xl px-4 text-sm text-stone-500'>
              {t('scriptReview.pushed.none')}
            </p>
          )}
        </main>

        <aside className='flex max-h-[45vh] w-full shrink-0 flex-col border-t border-stone-200 bg-white lg:max-h-none lg:w-[28rem] lg:border-l lg:border-t-0'>
          <div role='tablist' className='flex shrink-0 border-b border-stone-200 px-2'>
            {(['comments', 'changes', 'checks'] as const).map((key) => (
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
                {tabLabel(key)}
              </button>
            ))}
          </div>

          <div className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
            {tab === 'comments' ? (
              comments.length === 0 ? (
                <p className='p-4 text-xs text-stone-500'>{t('scriptReview.comments.empty')}</p>
              ) : (
                <ul className='divide-y divide-stone-100'>
                  {comments.map((c) => {
                    const stale = staleness(c);
                    return (
                      <li key={c.id}>
                        <button
                          type='button'
                          onClick={() => c.scriptLineId && setActiveLineId(c.scriptLineId)}
                          className='w-full px-4 py-3 text-left hover:bg-stone-50'
                        >
                          <div className='flex items-center justify-between gap-2 text-xs'>
                            <span className='font-semibold text-stone-800'>
                              {locateLabel(c.sceneId, c.scriptLineId)}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 ${c.resolvedAt ? 'text-emerald-700' : 'text-amber-700'}`}
                            >
                              {c.resolvedAt && <CheckCircle2 className='h-3.5 w-3.5' />}
                              {c.resolvedAt
                                ? t('scriptReview.comments.resolved')
                                : t('scriptReview.comments.open')}
                            </span>
                          </div>
                          {stale && (
                            <span className='mt-1 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800'>
                              {stale === 'removed'
                                ? t('scriptReview.comments.staleRemoved')
                                : t('scriptReview.comments.staleChanged')}
                            </span>
                          )}
                          {c.quotedText && (
                            <p className='mt-1 line-clamp-2 border-l-2 border-stone-200 pl-2 text-xs italic text-stone-500'>
                              {c.quotedText}
                            </p>
                          )}
                          <p className='mt-1 whitespace-pre-wrap text-sm text-stone-800'>
                            {c.body}
                          </p>
                          <p className='mt-1 text-[11px] text-stone-400'>
                            {c.authorName ?? ''} · {dateFormat(c.createdAt)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : tab === 'changes' ? (
              pushed ? (
                <>
                  <p className='border-b border-stone-200 px-3 py-2 text-xs text-stone-500'>
                    {chapter.previousSubmittedVersionId
                      ? t('scriptReview.pushed.sincePrevious')
                      : t('scriptReview.pushed.firstSubmit')}
                  </p>
                  <ScriptVersionDiff
                    key={`${chapter.previousSubmittedVersionId ?? EMPTY_BASE}>${pushed.version.id}`}
                    chapterId={chapterId}
                    defaultFromId={chapter.previousSubmittedVersionId ?? EMPTY_BASE}
                    defaultToId={pushed.version.id}
                  />
                </>
              ) : (
                <p className='p-4 text-xs text-stone-500'>{t('scriptReview.pushed.none')}</p>
              )
            ) : (
              <ChecksTab
                chapter={chapter}
                bibleGate={bibleGate}
                findings={findings}
                locateLabel={locateLabel}
                onSelectAnchor={selectAnchor}
                canTriage={isEditor || isProducer}
                canComment={canComment}
                isProducer={isProducer}
                busy={busy}
                onRunCheck={handleRunCheck}
                checkedAt={checkedAt}
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
        </aside>
      </div>
    </div>
  );
};
