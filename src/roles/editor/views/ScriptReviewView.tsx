import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, Play, MapPin, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import {
  chapterService,
  type ChapterDto,
  type ScriptCommentDto,
  type ScriptStatus,
  type ScriptVersionDetailDto,
  type ScriptVersionRow,
} from '@/services/chapter.service';
import { seriesService, type SeriesDetailDto } from '@/services/series.service';
import { chapterCastService, type ChapterCastDto } from '@/services/chapterCast.service';
import { assignmentService } from '@/services/assignment.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { ProducerSharedHeader } from '@/shared/features/production-workspace/ProducerSharedHeader';
import { StartProductionModal } from '@/shared/modals/StartProductionModal';
import { RefreezeScriptModal } from '@/shared/modals/RefreezeScriptModal';
import { ScriptCommentItemCard } from '@/shared/features/script-review/ScriptCommentCard';
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
  chapterIdProp?: string;
  onBackToChapters?: () => void;
  chaptersList?: ChapterDto[];
  onSelectChapter?: (chapterId: string) => void;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

type Tab = 'entities' | 'comments' | 'changes' | 'checks';
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
  chapterIdProp,
  onBackToChapters,
  chaptersList,
  onSelectChapter,
}) => {
  const {
    workspaceId,
    seriesId,
    chapterId: routeChapterId = '',
  } = useParams<{
    workspaceId: string;
    seriesId: string;
    chapterId: string;
  }>();
  const chapterId = chapterIdProp || routeChapterId || '';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang } = useTranslation('review');
  const { t: tp } = useTranslation('production');

  const initialTabParam = searchParams.get('tab');
  const highlightedEntityId = searchParams.get('entityId') || '';
  const initialTab: Tab =
    initialTabParam === 'comments' ||
    initialTabParam === 'changes' ||
    initialTabParam === 'checks' ||
    initialTabParam === 'entities'
      ? initialTabParam
      : 'entities';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<ChapterDto | null>(null);
  const [pushed, setPushed] = useState<ScriptVersionDetailDto | null>(null);
  const [cast, setCast] = useState<ChapterCastDto | null>(null);
  const [findings, setFindings] = useState<ConsistencyFindingDto[]>([]);
  const [comments, setComments] = useState<ScriptCommentDto[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const [composer, setComposer] = useState<ComposerTarget | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (
      nextTab === 'comments' ||
      nextTab === 'changes' ||
      nextTab === 'checks' ||
      nextTab === 'entities'
    ) {
      setTab(nextTab);
    }
  }, [searchParams]);
  const [busy, setBusy] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [series, setSeries] = useState<SeriesDetailDto | null>(null);
  const [fetchedChapters, setFetchedChapters] = useState<ChapterDto[]>([]);
  const [entityFilter, setEntityFilter] = useState<'main' | 'crowd'>('main');

  const role = (workspaceRole ?? '').toLowerCase();
  const isProducer = ['producer', 'owner'].includes(role);
  const isEditor = role === 'editor';

  const loadData = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [chapterData, castData, findingList, commentList] = await Promise.all([
        chapterService.getChapterById(chapterId),
        chapterCastService.getChapterCast(chapterId).catch(() => null),
        assignmentService.getConsistencyFindings(chapterId).catch(() => []),
        chapterService.getScriptComments(chapterId).catch(() => []),
      ]);
      let pushedVersion = chapterData.lastSubmittedVersionId
        ? await chapterService
            .getScriptVersion(chapterId, chapterData.lastSubmittedVersionId)
            .catch(() => null)
        : null;

      // Fallback: nếu chưa có bản nộp chính thức hoặc không tìm thấy version, thử tải working copy để Editor vẫn đọc được kịch bản
      if (!pushedVersion) {
        try {
          const workingCopy = await chapterService.getScriptWorkingCopy(chapterId);
          if (workingCopy && workingCopy.rows && workingCopy.rows.length > 0) {
            pushedVersion = {
              version: {
                id: 'working-copy',
                versionNumber: 0,
                message: t('scriptReview.pushed.workingCopyDraft'),
                authorUserId: '',
                authorName: '',
                createdAt: new Date().toISOString(),
                lineCount: workingCopy.lineCount || workingCopy.rows.length,
                contentHash: workingCopy.contentHash || '',
                submittedAt: null,
              },
              rows: workingCopy.rows,
            };
          }
        } catch {
          // Bỏ qua nếu không có working copy
        }
      }
      setChapter(chapterData);
      setPushed(pushedVersion);
      setCast(castData);
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

  useEffect(() => {
    if (seriesId) {
      seriesService
        .getSeriesById(seriesId)
        .then(setSeries)
        .catch(() => {});
      if (!chaptersList || chaptersList.length === 0) {
        chapterService
          .getChaptersBySeries(seriesId, 1, 100)
          .then((res) => {
            if (res?.items) setFetchedChapters(res.items);
          })
          .catch(() => {});
      }
    }
  }, [seriesId, chaptersList]);

  const allChapters = chaptersList && chaptersList.length > 0 ? chaptersList : fetchedChapters;

  const entities = useMemo(() => cast?.entities ?? [], [cast]);
  const mainEntities = useMemo(() => entities.filter((e) => !e.isCrowd), [entities]);
  const crowdEntities = useMemo(() => entities.filter((e) => e.isCrowd), [entities]);

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
  const handleStartProduction = () => setStartOpen(true);

  const backToDesk = () =>
    workspaceId && seriesId
      ? navigate(`/workspaces/${workspaceId}/series/${seriesId}/editor/desk`)
      : navigate('/workspaces');

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
  const filteredEntities = entityFilter === 'main' ? mainEntities : crowdEntities;

  const tabLabel = (key: Tab) =>
    key === 'entities'
      ? `${t('scriptReview.tabs.entities', 'Thực thể')} (${entities.length})`
      : key === 'comments'
        ? t('scriptReview.comments.tab', { count: openComments })
        : key === 'changes'
          ? t('scriptReview.tabs.changes')
          : t('scriptReview.tabs.checks');

  return (
    <div className='flex min-h-0 flex-1 flex-col bg-[#FAF9F5] font-sans text-stone-900'>
      <ProducerSharedHeader
        workspaceId={workspaceId}
        seriesId={seriesId}
        currentChapterId={chapterId}
        chapters={allChapters}
        seriesTitle={series?.title}
        seriesFormat={series?.format}
        currentChapter={chapter}
        subtitle={
          (pushed
            ? t('scriptReview.pushed.version', {
                n: pushed.version.versionNumber,
                hash: shortHash(pushed.version.contentHash),
              })
            : t('scriptReview.pushed.none')) +
          (chapter.scriptSubmittedAt ? ` · ${dateFormat(chapter.scriptSubmittedAt)}` : '')
        }
        onChapterChange={(nextId) => {
          if (onSelectChapter) {
            onSelectChapter(nextId);
          } else if (workspaceId && seriesId) {
            navigate(
              `/workspaces/${workspaceId}/series/${seriesId}/chapters/${nextId}/script/review`,
            );
          }
        }}
        onBackToChapters={onBackToChapters}
        actionCta={
          isProducer && isInReview ? (
            <div className='flex items-center gap-2'>
              {openComments > 0 && (
                <span
                  data-testid='open-comments-warning'
                  className='inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800'
                >
                  <AlertTriangle className='h-3.5 w-3.5 text-amber-600' aria-hidden='true' />
                  {t('scriptReview.lifecycle.openCommentsWarning', { count: openComments })}
                </span>
              )}
              <button
                type='button'
                onClick={handleStartProduction}
                className='inline-flex items-center gap-1.5 rounded-lg bg-[#EA580C] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C] shadow-xs cursor-pointer'
              >
                <Play className='h-3.5 w-3.5' aria-hidden='true' />
                {chapter?.status === 'InProduction'
                  ? t('scriptReview.lifecycle.refreezeScript', 'Khóa lại kịch bản')
                  : t('scriptReview.lifecycle.startProduction')}
              </button>
            </div>
          ) : undefined
        }
      />
      <span data-testid='script-status-badge' className='hidden' aria-hidden='true'>
        {scriptStatus === 'Frozen' && <Lock className='h-3.5 w-3.5' aria-hidden='true' />}
        {t(`scriptReview.lifecycle.status.${scriptStatus}`)}
      </span>

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
              comments={comments}
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
            {(['entities', 'comments', 'changes', 'checks'] as const).map((key) => (
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
            {tab === 'entities' ? (
              <div className='p-4 space-y-4'>
                <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200'>
                  <div>
                    <h3 className='text-xs font-bold text-stone-900'>
                      {t('scriptReview.entities.title', 'Thực thể trong kịch bản')} (
                      {entities.length})
                    </h3>
                    <p className='text-xs text-stone-500'>
                      {t(
                        'scriptReview.entities.subtitle',
                        'Kiểm tra tính sẵn sàng của bản vẽ & hồ sơ nhân vật',
                      )}
                    </p>
                  </div>
                  <div className='inline-flex p-0.5 rounded-lg bg-stone-100 border border-stone-200 text-xs shrink-0'>
                    <button
                      type='button'
                      onClick={() => setEntityFilter('main')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        entityFilter === 'main'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {t('scriptReview.entities.filterMain', 'Chính')} ({mainEntities.length})
                    </button>
                    <button
                      type='button'
                      onClick={() => setEntityFilter('crowd')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        entityFilter === 'crowd'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {t('scriptReview.entities.filterCrowd', 'Quần chúng')} ({crowdEntities.length}
                      )
                    </button>
                  </div>
                </div>

                <div className='space-y-2.5'>
                  {filteredEntities.length === 0 ? (
                    <p className='py-6 text-center text-xs text-stone-400'>
                      {t('scriptReview.entities.empty', 'Không có thực thể nào phù hợp')}
                    </p>
                  ) : (
                    filteredEntities.map((item) => {
                      const isCrowd = item.isCrowd;
                      const isLocked =
                        !isCrowd &&
                        (Boolean(item.isCanonLocked) ||
                          Boolean(item.boundRevision?.isCanonLocked) ||
                          item.boundRevision?.status === 'CanonLocked' ||
                          item.bibleStatus === 'CanonLocked');
                      const isPendingConfirm =
                        !isCrowd &&
                        !isLocked &&
                        (item.boundRevision?.status === 'ConceptSubmitted' ||
                          item.bibleStatus === 'WaitingForConfirmation');
                      const isRework =
                        !isCrowd &&
                        !isLocked &&
                        (item.boundRevision?.status === 'ReworkRequired' ||
                          item.bibleStatus === 'ReworkRequired');
                      const isHighlighted = highlightedEntityId === item.bibleEntryId;

                      const initials =
                        item.name
                          .split(' ')
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'ID';

                      return (
                        <div
                          key={item.bibleEntryId}
                          data-testid={`script-entity-card-${item.bibleEntryId}`}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                            isHighlighted
                              ? 'ring-2 ring-orange-500 bg-orange-50/50 border-orange-300'
                              : !isLocked && !isCrowd
                                ? 'bg-amber-50/50 border-amber-200'
                                : 'bg-stone-50/70 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <div className='flex items-center gap-2.5 min-w-0'>
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                item.category === 'Location'
                                  ? 'bg-rose-100 text-rose-700'
                                  : isCrowd
                                    ? 'bg-stone-200 text-stone-700'
                                    : 'bg-stone-900 text-white'
                              }`}
                            >
                              {item.category === 'Location' ? (
                                <MapPin className='w-3.5 h-3.5' />
                              ) : isCrowd ? (
                                <Users className='w-3.5 h-3.5' />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className='min-w-0'>
                              <div className='text-xs font-bold text-stone-900 truncate'>
                                {item.name}
                              </div>
                              <div className='text-xs text-stone-500 flex items-center gap-1'>
                                <span>
                                  {item.boundRevision?.variantLabel
                                    ? `[${item.boundRevision.variantLabel}]`
                                    : item.category === 'Character'
                                      ? `[${t('scriptReview.defaultVariant')}]`
                                      : item.category}
                                </span>
                                {item.boundRevision?.versionNumber && (
                                  <span className='font-mono text-[11px] text-stone-400'>
                                    v{item.boundRevision.versionNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className='flex items-center gap-1.5 shrink-0'>
                            {isCrowd ? (
                              <span className='bg-stone-100 text-stone-600 border border-stone-200 text-xs px-2 py-0.5 rounded-full font-medium'>
                                {t('scriptReview.entities.statusExempt', 'Miễn trừ')}
                              </span>
                            ) : isLocked ? (
                              <span className='bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium'>
                                {t('scriptReview.entities.statusLocked', 'Đã khóa chuẩn')}
                              </span>
                            ) : isPendingConfirm ? (
                              <span className='bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-medium'>
                                {t('scriptReview.entities.statusInReview', 'Chờ duyệt vẽ')}
                              </span>
                            ) : isRework ? (
                              <span className='bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2 py-0.5 rounded-full font-medium'>
                                {t('scriptReview.entities.statusRework', 'Cần vẽ lại')}
                              </span>
                            ) : (
                              <span className='bg-rose-50 text-rose-700 border border-rose-200 text-xs px-2 py-0.5 rounded-full font-medium'>
                                {t('scriptReview.entities.statusMissing', 'Chưa có bản vẽ')}
                              </span>
                            )}
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                                isCrowd
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-white text-stone-500 border-stone-200'
                              }`}
                            >
                              {isCrowd
                                ? t('scriptReview.entities.typeCrowd', 'Quần chúng')
                                : t('scriptReview.entities.typeMain', 'Chính')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {cast?.gate?.canStart === false && (
                  <div className='p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2'>
                    <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                    <div>
                      <p className='font-semibold'>
                        {t(
                          'scriptReview.entities.blockerTitle',
                          'Kịch bản đang bị chặn duyệt sản xuất:',
                        )}
                      </p>
                      <ul className='list-disc pl-4 mt-1 space-y-0.5 text-stone-700'>
                        {cast.gate.blockers.map((b, idx) => (
                          <li key={idx}>
                            {typeof b === 'string'
                              ? b
                              : (b as any).message ||
                                (b as any).reason ||
                                (b as any).code ||
                                String(b)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : tab === 'comments' ? (
              comments.length === 0 ? (
                <p className='p-4 text-xs text-stone-500'>{t('scriptReview.comments.empty')}</p>
              ) : (
                <div className='p-3 space-y-3'>
                  {comments.map((c) => {
                    const stale = staleness(c);
                    const isSelected = activeLineId === c.scriptLineId;
                    return (
                      <div key={c.id} className='space-y-1'>
                        <div className='flex items-center justify-between text-xs px-1 text-stone-500'>
                          <span className='font-semibold text-stone-700'>
                            {locateLabel(c.sceneId, c.scriptLineId)}
                          </span>
                          {stale && (
                            <span className='rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800'>
                              {stale === 'removed'
                                ? t('scriptReview.comments.staleRemoved')
                                : t('scriptReview.comments.staleChanged')}
                            </span>
                          )}
                        </div>
                        <ScriptCommentItemCard
                          comment={c}
                          isSelected={isSelected}
                          onSelect={() => c.scriptLineId && setActiveLineId(c.scriptLineId)}
                        />
                      </div>
                    );
                  })}
                </div>
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
                cast={cast}
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
                openComments={openComments}
                onFreeze={handleStartProduction}
                onUnfreeze={(reason) =>
                  chapterAction('freeze', () => chapterService.unfreezeScript(chapterId, reason))
                }
              />
            )}
          </div>
        </aside>
      </div>
      {startOpen && chapter && chapter.status === 'InProduction' && (
        <RefreezeScriptModal
          isOpen
          workspaceId={workspaceId}
          seriesId={seriesId}
          chapterId={chapterId}
          chapterNumber={chapter.chapterNumber}
          chapterTitle={chapter.title || undefined}
          onClose={() => setStartOpen(false)}
          onSuccess={() => {
            setStartOpen(false);
            void chapterService.getChapterById(chapterId).then(setChapter);
          }}
          onShowToast={onShowToast}
        />
      )}
      {startOpen && chapter && chapter.status !== 'InProduction' && (
        <StartProductionModal
          isOpen
          workspaceId={workspaceId}
          seriesId={seriesId}
          chapterId={chapterId}
          chapterNumber={chapter.chapterNumber}
          chapterTitle={chapter.title || undefined}
          onClose={() => setStartOpen(false)}
          onSuccess={() => {
            setStartOpen(false);
            void chapterService.getChapterById(chapterId).then(setChapter);
          }}
          onShowToast={onShowToast}
        />
      )}
    </div>
  );
};
