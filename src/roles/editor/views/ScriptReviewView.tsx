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
} from '@/services/chapter.service';
import { scriptLineService, type SceneDetailDto } from '@/services/scriptLine.service';
import { assignmentService } from '@/services/assignment.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { useConfirm } from '@/shared/context/ConfirmContext';
import {
  ManuscriptPane,
  type AnchorMarks,
  type ComposerTarget,
} from './script-review/ManuscriptPane';
import { type LineLocation } from './script-review/NotesTab';
import { ChecksTab, type FindingDecision } from './script-review/ChecksTab';
import {
  anchorKey,
  lineText,
  type ReviewDraft,
} from '@/shared/features/script-review/scriptReviewModel';

interface ScriptReviewViewProps {
  currentUserId?: string;
  workspaceRole?: string;
  onShowToast?: (title: string, message: string) => void;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/**
 * Duyệt kịch bản theo D12 (01_SCRIPT_PLAN): Editor đọc kịch bản Writer đã gửi duyệt và góp ý theo từng dòng.
 * Góp ý không đổi trạng thái kịch bản và không đi qua Assignment; chỉ Writer quyết định hủy gửi duyệt để sửa.
 * Producer bấm "Bắt đầu sản xuất" khi kịch bản đang chờ duyệt (không bắt buộc Editor xác nhận trước).
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

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [scenes, setScenes] = useState<SceneDetailDto[]>([]);
  const [bibleGate, setBibleGate] = useState<ChapterBibleGateResultDto | null>(null);
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [comments, setComments] = useState<ScriptCommentDto[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);
  const [tab, setTab] = useState<'comments' | 'checks'>('comments');
  const [busy, setBusy] = useState<string | null>(null);

  const role = (workspaceRole ?? '').toLowerCase();
  const isProducer = ['producer', 'owner'].includes(role);
  const isEditor = role === 'editor';

  const loadData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [chapterData, sceneList, gate, findingList, commentList] = await Promise.all([
        chapterService.getChapterById(chapterId),
        scriptLineService.getScenesByChapter(chapterId),
        chapterService.checkBibleGate(chapterId).catch(() => null),
        assignmentService.getConsistencyFindings(chapterId).catch(() => []),
        chapterService.getScriptComments(chapterId).catch(() => []),
      ]);
      const details = await Promise.all(sceneList.map((s) => scriptLineService.getSceneById(s.id)));
      setChapter(chapterData);
      setScenes(details.sort((a, b) => a.sceneNumber - b.sceneNumber));
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
  const canComment = (isEditor || isProducer) && isInReview;

  // ── Tra cứu vị trí dòng ──
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
      return { label: t('scriptReview.comments.general'), currentText: lineId ? null : '' };
    },
    [lineIndex, scenes, t],
  );

  // Kịch bản là chữ thuần (D11): không còn liên kết người nói với Series Bible
  const speakerName = useCallback(() => null, []);

  // Góp ý đã lưu hiển thị như dấu trên bản thảo
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
    comments
      .filter((c) => c.sceneId && !c.resolvedAt)
      .forEach((c) => {
        const note: ReviewDraft = {
          id: c.id,
          sceneId: c.sceneId as string,
          scriptLineId: c.scriptLineId ?? null,
          quotedText: c.quotedText ?? '',
          text: c.body,
        };
        at(anchorKey(note.sceneId, note.scriptLineId)).drafts.push(note);
      });
    findings
      .filter((f) => f.sceneId || f.scriptLineId)
      .filter((f) => ['Open', 'Confirmed', 'NeedsClarification'].includes(String(f.status)))
      .forEach((f) => at(anchorKey(f.sceneId, f.scriptLineId)).findings.push(f));
    return map;
  }, [comments, findings]);

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
          sceneId: target.sceneId,
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
    const sceneId =
      f.sceneId ??
      scenes.find((s) => s.scriptLines.some((l) => l.id === f.scriptLineId))?.id ??
      null;
    if (!sceneId || !canComment) return;
    setActiveAnchor(anchorKey(sceneId, f.scriptLineId));
    setComposer({
      sceneId,
      scriptLineId: f.scriptLineId ?? null,
      quotedText: f.scriptLineId ? (lineIndex.get(f.scriptLineId)?.text ?? '') : '',
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

  return (
    <div className='flex min-h-0 flex-1 flex-col bg-[#FAF9F5] font-sans text-stone-900'>
      <header className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3'>
        <div className='min-w-0'>
          <h1 className='truncate font-serif text-lg font-bold tracking-tight text-stone-900'>
            {t('scriptReview.header.title', { number: chapter.chapterNumber })}
            {chapter.title ? `: ${chapter.title}` : ''}
          </h1>
          <p className='text-xs text-stone-500'>
            {chapter.scriptSubmittedAt
              ? dateFormat(chapter.scriptSubmittedAt)
              : t('scriptReview.header.noSubmission')}
            {' · '}
            {t('scriptReview.header.scenes', { count: scenes.length })}
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
          <ManuscriptPane
            scenes={scenes}
            speakerName={speakerName}
            marks={marks}
            canComment={canComment}
            activeAnchor={activeAnchor}
            onSelectAnchor={setActiveAnchor}
            composer={composer}
            onStartComment={setComposer}
            onSaveComment={handleSaveComment}
            onCancelComment={() => setComposer(null)}
          />
        </main>

        <aside className='flex max-h-[45vh] w-full shrink-0 flex-col border-t border-stone-200 bg-white lg:max-h-none lg:w-96 lg:border-l lg:border-t-0'>
          <div role='tablist' className='flex shrink-0 border-b border-stone-200 px-2'>
            {(['comments', 'checks'] as const).map((key) => (
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
                {key === 'comments'
                  ? t('scriptReview.comments.tab', { count: openComments })
                  : t('scriptReview.tabs.checks')}
              </button>
            ))}
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            {tab === 'comments' ? (
              comments.length === 0 ? (
                <p className='p-4 text-xs text-stone-500'>{t('scriptReview.comments.empty')}</p>
              ) : (
                <ul className='divide-y divide-stone-100'>
                  {comments.map((c) => {
                    const where = locate(c.sceneId, c.scriptLineId);
                    return (
                      <li key={c.id}>
                        <button
                          type='button'
                          onClick={() =>
                            c.sceneId &&
                            setActiveAnchor(anchorKey(c.sceneId, c.scriptLineId ?? null))
                          }
                          className='w-full px-4 py-3 text-left hover:bg-stone-50'
                        >
                          <div className='flex items-center justify-between gap-2 text-xs'>
                            <span className='font-semibold text-stone-800'>{where.label}</span>
                            <span
                              className={`inline-flex items-center gap-1 ${c.resolvedAt ? 'text-emerald-700' : 'text-amber-700'}`}
                            >
                              {c.resolvedAt && <CheckCircle2 className='h-3.5 w-3.5' />}
                              {c.resolvedAt
                                ? t('scriptReview.comments.resolved')
                                : t('scriptReview.comments.open')}
                            </span>
                          </div>
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
            ) : (
              <ChecksTab
                chapter={chapter}
                bibleGate={bibleGate}
                findings={findings}
                locateLabel={(s, l) => locate(s, l).label}
                onSelectAnchor={setActiveAnchor}
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
