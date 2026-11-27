import React, { useEffect, useMemo, useState } from 'react';
import { translate, useTranslation } from '@/lib/i18n';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileStack,
  FileText,
  GitBranch,
  Info,
  Layers,
  Loader2,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import {
  chapterService,
  type ChapterSnapshotDetailDto,
  type ChapterSnapshotDto,
} from '@/services/chapter.service';
import {
  aiAgentsService,
  type AiRunSummaryDto,
  type ProvenanceNode,
  type ProvenanceReportResponse,
  type SceneLite,
} from '@/services/aiAgents.service';
import { Alert, Modal } from '@/shared/ui';
import {
  EVENT_LABEL,
  canViewProvenanceReport,
  detail,
  eventTone,
  formatDateTime,
  revisionsOf,
  shortHash,
  traceRevision,
} from './provenanceRules';
import { PageHistoryPanel } from './PageHistoryPanel';

type Tab = 'snapshots' | 'provenance' | 'runs' | 'pages';
type RevisionKindFilter =
  'ALL' | 'Script' | 'Layout' | 'ImagePrompt' | 'Artwork' | 'Lettering' | 'Review';

interface ChapterProvenanceModalProps {
  seriesId: string;
  chapterId: string;
  /** Không có (vd mở từ màn task) thì tiêu đề chỉ ghi "Chương hiện tại". */
  chapterNumber?: number;
  chapterTitle?: string | null;
  /** Vai trò của người xem trong Workspace: quyết định có hiện tab Provenance Report (Producer/Editor). */
  viewerRole?: string | null;
  onClose: () => void;
}

const TONE_CLASSES: Record<
  ReturnType<typeof eventTone>,
  { dot: string; badge: string; text: string }
> = {
  ai: {
    dot: 'bg-violet-500 ring-violet-200',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    text: 'text-violet-700',
  },
  human: {
    dot: 'bg-emerald-500 ring-emerald-200',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    text: 'text-emerald-700',
  },
  error: {
    dot: 'bg-rose-500 ring-rose-200',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    text: 'text-rose-700',
  },
  approval: {
    dot: 'bg-amber-500 ring-amber-200',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    text: 'text-amber-700',
  },
};

const RUN_STATUS_STYLE: Record<string, string> = {
  Completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Failed: 'text-rose-700 bg-rose-50 border-rose-200',
  Interrupted: 'text-rose-700 bg-rose-50 border-rose-200',
  Running: 'text-indigo-700 bg-indigo-50 border-indigo-200 animate-pulse',
  Queued: 'text-neutral-700 bg-neutral-50 border-neutral-200',
};

const KIND_ROLE_LABEL: Record<string, { role: string; color: string }> = {
  Script: {
    role: 'Writer',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Layout: {
    role: 'Artist / Storyboard',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  ImagePrompt: {
    role: 'Artist / AI',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  Artwork: {
    role: 'Artist',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  Lettering: {
    role: 'Letterer',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  Review: {
    role: 'Editor',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

function formatAuthor(val?: unknown): string {
  if (!val) return '—';
  const s = String(val).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return translate('features.provenance.userFallback', { id: s.slice(0, 8) });
  }
  return s;
}

const Loading: React.FC<{ text: string }> = ({ text }) => (
  <div className='py-16 flex flex-col items-center justify-center text-xs text-stone-500 gap-3'>
    <div className='w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center'>
      <Loader2 className='w-5 h-5 animate-spin text-orange-600' />
    </div>
    <span className='font-medium'>{text}</span>
  </div>
);

const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <Alert tone='danger' className='text-xs'>
    <span className='font-medium'>{text}</span>
  </Alert>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className='py-14 text-center text-xs text-stone-400 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200'>
    {text}
  </div>
);

const str = (v: unknown): string | undefined =>
  v === null || v === undefined || v === '' ? undefined : String(v);

/**
 * CF4: Lịch sử và nguồn gốc nội dung của một chương.
 * Bản duyệt (ChapterSnapshot bất biến), Provenance Report (UC-19, BR-10: agent, model, prompt, người quyết, mức sửa),
 * lịch sử AI run và lịch sử canvas từng trang (PageHistoryPanel: so sánh, Producer/Artist khôi phục).
 */
export const ChapterProvenanceModal: React.FC<ChapterProvenanceModalProps> = ({
  seriesId,
  chapterId,
  chapterNumber,
  chapterTitle,
  viewerRole,
  onClose,
}) => {
  const { t, lang } = useTranslation('features');
  const canProvenance = canViewProvenanceReport(viewerRole);
  const [tab, setTab] = useState<Tab>('snapshots');

  // ── Bản duyệt ──
  const [snapshots, setSnapshots] = useState<ChapterSnapshotDto[] | null>(null);
  const [snapError, setSnapError] = useState<string | null>(null);
  const [selectedSnap, setSelectedSnap] = useState<string | null>(null);
  const [snapDetail, setSnapDetail] = useState<ChapterSnapshotDetailDto | null>(null);
  const [snapDetailError, setSnapDetailError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    chapterService
      .getSnapshots(chapterId)
      .then((list) => {
        if (!alive) return;
        setSnapshots(list);
        setSelectedSnap(list[0]?.id ?? null);
      })
      .catch((e) => alive && setSnapError(e.message));
    return () => {
      alive = false;
    };
  }, [chapterId]);

  useEffect(() => {
    if (!selectedSnap) return;
    let alive = true;
    setSnapDetail(null);
    setSnapDetailError(null);
    chapterService
      .getSnapshot(chapterId, selectedSnap)
      .then((d) => alive && setSnapDetail(d))
      .catch((e) => alive && setSnapDetailError(e.message));
    return () => {
      alive = false;
    };
  }, [chapterId, selectedSnap]);

  // ── Provenance Report ──
  const [scenes, setScenes] = useState<SceneLite[]>([]);
  const [sceneId, setSceneId] = useState('');
  const [report, setReport] = useState<ProvenanceReportResponse | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState('');
  const [kindFilter, setKindFilter] = useState<RevisionKindFilter>('ALL');
  const [expandedTimeline, setExpandedTimeline] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (tab !== 'provenance' || !canProvenance) return;
    let alive = true;
    setReport(null);
    setReportError(null);
    aiAgentsService
      .getProvenanceReport(seriesId, chapterId, sceneId || undefined)
      .then((r) => {
        if (!alive) return;
        setReport(r);
        const firstRev = revisionsOf(r)[0];
        setTraceId(firstRev?.id ?? '');
      })
      .catch((e) => alive && setReportError(e.message));
    return () => {
      alive = false;
    };
  }, [tab, canProvenance, seriesId, chapterId, sceneId]);

  useEffect(() => {
    if (tab !== 'provenance' || scenes.length > 0) return;
    aiAgentsService
      .getScenesByChapter(chapterId)
      .then(setScenes)
      .catch(() => setScenes([]));
  }, [tab, chapterId, scenes.length]);

  const allRevisions = useMemo(() => (report ? revisionsOf(report) : []), [report]);

  const filteredRevisions = useMemo(() => {
    if (kindFilter === 'ALL') return allRevisions;
    return allRevisions.filter((r) => String(detail(r, 'kind')) === kindFilter);
  }, [allRevisions, kindFilter]);

  // Phiên bản đang truy vết phải thuộc bộ lọc vai trò; đổi bộ lọc thì chuyển sang phiên bản mới nhất của vai trò đó
  const activeTraceId = filteredRevisions.some((r) => r.id === traceId)
    ? traceId
    : (filteredRevisions[0]?.id ?? '');
  const trace = useMemo(
    () => (report && activeTraceId ? traceRevision(report, activeTraceId) : null),
    [report, activeTraceId],
  );

  // ── Lịch sử AI ──
  const [runs, setRuns] = useState<AiRunSummaryDto[] | null>(null);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});

  const toggleRunExpand = (runId: string) => {
    setExpandedRuns((prev) => ({ ...prev, [runId]: !prev[runId] }));
  };

  useEffect(() => {
    if (tab !== 'runs' || runs) return;
    aiAgentsService
      .getRunHistory(seriesId, { chapterId, pageSize: 50 })
      .then((r) => {
        setRuns(r.items);
        setRunsTotal(r.totalCount);
      })
      .catch((e) => setRunsError(e.message));
  }, [tab, runs, seriesId, chapterId]);

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode; badgeCount?: number }> = [
    {
      key: 'snapshots',
      label: t('provenance.tabs.snapshots'),
      icon: <FileStack className='w-4 h-4' />,
      badgeCount: snapshots?.length,
    },
    ...(canProvenance
      ? [
          {
            key: 'provenance' as Tab,
            label: t('provenance.tabs.provenance'),
            icon: <GitBranch className='w-4 h-4' />,
            badgeCount: allRevisions.length,
          },
        ]
      : []),
    {
      key: 'runs',
      label: t('provenance.tabs.runs'),
      icon: <Bot className='w-4 h-4' />,
      badgeCount: runsTotal || runs?.length,
    },
    { key: 'pages', label: t('provenance.tabs.pages'), icon: <Clock className='w-4 h-4' /> },
  ];

  const toggleTimeline = (index: number) => {
    setExpandedTimeline((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      closeLabel={t('provenance.closeLabel')}
      size='xl'
      title={t('provenance.modalTitle')}
    >
      <div className='bg-white border border-stone-200/90 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'>
        {/* Header */}
        <div className='px-5 py-4 bg-gradient-to-r from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] border-b border-stone-200 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-orange-100/80 text-orange-700 border border-orange-200 flex items-center justify-center shadow-xs'>
              <GitBranch className='w-4.5 h-4.5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h3 className='font-bold text-sm text-stone-900'>{t('provenance.modalTitle')}</h3>
                <span className='px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100/70 text-orange-800 border border-orange-200'>
                  CF4
                </span>
              </div>
              <p className='text-xs text-stone-500 font-medium'>
                {chapterNumber === undefined
                  ? t('provenance.currentChapter')
                  : t('provenance.chapterHeader', {
                      number: chapterNumber,
                      title: chapterTitle || t('provenance.untitledChapter'),
                    })}
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={t('provenance.closeLabel')}
            className='w-8 h-8 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors flex items-center justify-center cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          role='tablist'
          className='px-5 pt-2.5 flex gap-2 border-b border-stone-200 bg-stone-50/40'
        >
          {tabs.map((tabItem) => {
            const isActive = tab === tabItem.key;
            return (
              <button
                key={tabItem.key}
                type='button'
                role='tab'
                aria-selected={isActive}
                onClick={() => setTab(tabItem.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-orange-500 text-orange-700 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-white/60'
                }`}
              >
                {tabItem.icon}
                <span>{tabItem.label}</span>
                {tabItem.badgeCount !== undefined && tabItem.badgeCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-xs font-mono ${
                      isActive
                        ? 'bg-orange-100 text-orange-800 font-bold'
                        : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    {tabItem.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className='p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4'>
          {/* ════ Tab 1: Bản duyệt ════ */}
          {tab === 'snapshots' &&
            (snapError ? (
              <ErrorBox text={snapError} />
            ) : !snapshots ? (
              <Loading text={t('provenance.snapshots.loading')} />
            ) : snapshots.length === 0 ? (
              <Empty text={t('provenance.snapshots.empty')} />
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4'>
                <ul className='space-y-2'>
                  {snapshots.map((s) => (
                    <li key={s.id}>
                      <button
                        type='button'
                        onClick={() => setSelectedSnap(s.id)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer shadow-soft-xs ${
                          selectedSnap === s.id
                            ? 'border-orange-400 bg-orange-50/60 ring-2 ring-orange-200/50'
                            : 'border-stone-200 bg-[#FAF8F5] hover:border-stone-300 hover:bg-white'
                        }`}
                      >
                        <div className='flex items-center justify-between gap-1'>
                          <span className='font-bold text-stone-900'>
                            {t('provenance.snapshots.itemTitle', { number: s.snapshotNumber })}
                          </span>
                          {s.isLatest && (
                            <span className='text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200'>
                              {t('provenance.snapshots.latestBadge')}
                            </span>
                          )}
                        </div>
                        <div className='text-xs text-stone-500 mt-1 flex items-center gap-1.5'>
                          <Clock className='w-3 h-3 text-stone-400' />
                          <span>{formatDateTime(s.createdAt)}</span>
                        </div>
                        <div className='text-xs text-stone-600 font-medium mt-0.5 flex items-center gap-1.5'>
                          <User className='w-3 h-3 text-stone-400' />
                          <span>{s.createdByName || 'Producer'}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className='space-y-3.5'>
                  {snapDetailError && <ErrorBox text={snapDetailError} />}
                  {!snapDetail && !snapDetailError && (
                    <Loading text={t('provenance.snapshots.loadingManifest')} />
                  )}
                  {snapDetail && (
                    <>
                      <div
                        className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold shadow-soft-xs ${
                          snapDetail.hashVerified
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50/80 border-rose-200 text-rose-800'
                        }`}
                      >
                        {snapDetail.hashVerified ? (
                          <ShieldCheck className='w-4.5 h-4.5 shrink-0 text-emerald-600' />
                        ) : (
                          <AlertTriangle className='w-4.5 h-4.5 shrink-0 text-rose-600' />
                        )}
                        <span>
                          {snapDetail.hashVerified
                            ? t('provenance.snapshots.hashVerified')
                            : t('provenance.snapshots.hashMismatch')}
                        </span>
                      </div>

                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl border border-stone-200 bg-[#FAF8F5]'>
                        <div>
                          <span className='text-xs uppercase font-bold text-stone-400 tracking-wider'>
                            {t('provenance.snapshots.versionLabel')}
                          </span>
                          <p className='text-xs font-bold text-stone-800 mt-0.5'>
                            v.{snapDetail.snapshot.chapterVersion}
                          </p>
                        </div>
                        <div>
                          <span className='text-xs uppercase font-bold text-stone-400 tracking-wider'>
                            {t('provenance.snapshots.hashManifestLabel')}
                          </span>
                          <p className='text-xs font-mono font-bold text-stone-800 mt-0.5'>
                            {shortHash(snapDetail.snapshot.manifestHash, 14)}
                          </p>
                        </div>
                        <div>
                          <span className='text-xs uppercase font-bold text-stone-400 tracking-wider'>
                            {t('provenance.snapshots.scriptRevisionsLabel')}
                          </span>
                          <p className='text-xs font-bold text-stone-800 mt-0.5'>
                            {t('provenance.snapshots.sceneVersionsCount', {
                              count: snapDetail.manifest.scriptRevisionIds.length,
                            })}
                          </p>
                        </div>
                        <div>
                          <span className='text-xs uppercase font-bold text-stone-400 tracking-wider'>
                            {t('provenance.snapshots.effectiveBibleLabel')}
                          </span>
                          <p className='text-xs font-bold text-stone-800 mt-0.5'>
                            {t('provenance.snapshots.lockedItemsCount', {
                              count: snapDetail.manifest.bibleRevisionIds.length,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className='border border-stone-200 rounded-xl overflow-hidden bg-white shadow-soft-xs'>
                        <table className='w-full text-xs'>
                          <thead className='bg-stone-50 border-b border-stone-200 text-stone-600'>
                            <tr>
                              <th className='text-left px-3 py-2.5 font-semibold'>
                                {t('provenance.snapshots.colPage')}
                              </th>
                              <th className='text-left px-3 py-2.5 font-semibold'>
                                {t('provenance.snapshots.colArtwork')}
                              </th>
                              <th className='text-left px-3 py-2.5 font-semibold'>
                                {t('provenance.snapshots.colCanvasVersion')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-stone-100'>
                            {snapDetail.manifest.pages.map((p) => (
                              <tr key={p.pageId} className='hover:bg-stone-50/50'>
                                <td className='px-3 py-2.5 font-bold text-stone-800'>
                                  {t('provenance.snapshots.pageNumber', { number: p.pageNumber })}
                                </td>
                                <td className='px-3 py-2.5 font-mono text-xs'>
                                  {p.artworkSha256 ? (
                                    <span className='text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded'>
                                      {shortHash(p.artworkSha256, 16)}
                                    </span>
                                  ) : (
                                    <span className='text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'>
                                      {t('provenance.snapshots.noFullPageArt')}
                                    </span>
                                  )}
                                </td>
                                <td className='px-3 py-2.5 text-stone-600'>
                                  {p.canvasStreamVersion < 0
                                    ? '—'
                                    : `Stream v.${p.canvasStreamVersion}`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

          {/* ════ Tab 2: Provenance Report ════ */}
          {tab === 'provenance' && (
            <div className='space-y-4'>
              {/* Scope & Role Context Explanation */}
              <div className='flex items-center justify-between gap-3 flex-wrap bg-stone-50/70 p-3 rounded-xl border border-stone-200'>
                <div className='flex items-center gap-2 text-xs'>
                  <label htmlFor='prov-scene' className='font-semibold text-stone-700'>
                    {t('provenance.report.scopeLabel')}
                  </label>
                  <select
                    id='prov-scene'
                    value={sceneId}
                    onChange={(e) => setSceneId(e.target.value)}
                    className='border border-stone-300 rounded-lg px-2.5 py-1 bg-white text-xs font-medium text-stone-800 cursor-pointer shadow-2xs'
                  >
                    <option value=''>{t('provenance.report.wholeChapter')}</option>
                    {scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {t('provenance.report.sceneOption', { number: s.sceneNumber })}
                        {s.heading ? `: ${s.heading}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter chips for revision kinds */}
                <div className='flex items-center gap-1.5 text-xs flex-wrap'>
                  <span className='text-stone-500 font-medium text-xs'>
                    {t('provenance.report.filterByRole')}
                  </span>
                  {(
                    [
                      { key: 'ALL', label: t('provenance.filterAll') },
                      { key: 'Script', label: t('provenance.kinds.Script.filterLabel') },
                      { key: 'Layout', label: t('provenance.kinds.Layout.filterLabel') },
                      { key: 'ImagePrompt', label: t('provenance.kinds.ImagePrompt.filterLabel') },
                      { key: 'Artwork', label: t('provenance.kinds.Artwork.filterLabel') },
                      { key: 'Lettering', label: t('provenance.kinds.Lettering.filterLabel') },
                      { key: 'Review', label: t('provenance.kinds.Review.filterLabel') },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type='button'
                      onClick={() => setKindFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                        kindFilter === f.key
                          ? 'bg-orange-50 border-orange-300 text-orange-800 shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informational Banner explaining current role stage */}
              {report &&
                allRevisions.length > 0 &&
                allRevisions.every((r) => String(detail(r, 'kind')) === 'Script') && (
                  <div className='flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs shadow-soft-xs'>
                    <Info className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                    <div>
                      <span className='font-bold'>{t('provenance.report.stageBannerTitle')}</span>{' '}
                      {t('provenance.report.stageBannerPart1')} <b>Writer</b>
                      {t('provenance.report.stageBannerPart2')} <b>Artist</b>{' '}
                      {t('provenance.report.stageBannerPart3')} <b>Letterer</b>{' '}
                      {t('provenance.report.stageBannerPart4')} <b>Editor</b>{' '}
                      {t('provenance.report.stageBannerPart5')}
                    </div>
                  </div>
                )}

              {reportError && <ErrorBox text={reportError} />}
              {!report && !reportError && <Loading text={t('provenance.report.loading')} />}

              {report && (
                <>
                  {/* KPI Metric Cards */}
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
                    {[
                      {
                        label: t('provenance.report.kpi.aiWorkflowRun'),
                        value: report.stats.totalRuns,
                        icon: <Bot className='w-4 h-4 text-violet-600' />,
                        bg: 'bg-violet-50/70 border-violet-200/70',
                      },
                      {
                        label: t('provenance.report.kpi.acceptedSuggestions'),
                        value: `${report.stats.acceptedSuggestions}/${report.stats.totalSuggestions}`,
                        icon: <CheckCircle2 className='w-4 h-4 text-emerald-600' />,
                        bg: 'bg-emerald-50/70 border-emerald-200/70',
                      },
                      {
                        label: t('provenance.report.kpi.modifiedByHuman'),
                        value: report.stats.modifiedByHumanDecisions,
                        icon: <UserCheck className='w-4 h-4 text-blue-600' />,
                        bg: 'bg-blue-50/70 border-blue-200/70',
                      },
                      {
                        label: t('provenance.report.kpi.contentRevisions'),
                        value: t('provenance.report.kpi.contentRevisionsValue', {
                          ai: report.stats.aiOriginatedRevisions,
                          manual: report.stats.manualRevisions,
                        }),
                        icon: <Layers className='w-4 h-4 text-indigo-600' />,
                        bg: 'bg-indigo-50/70 border-indigo-200/70',
                      },
                      {
                        label: t('provenance.report.kpi.rejectedSuggestions'),
                        value: report.stats.rejectedSuggestions,
                        icon: <XCircle className='w-4 h-4 text-rose-600' />,
                        bg: 'bg-rose-50/70 border-rose-200/70',
                      },
                      {
                        label: t('provenance.report.kpi.pendingSuggestions'),
                        value: report.stats.pendingSuggestions,
                        icon: <Clock className='w-4 h-4 text-amber-600' />,
                        bg: 'bg-amber-50/70 border-amber-200/70',
                      },
                      {
                        label: t('provenance.report.kpi.approvedSnapshots'),
                        value: report.stats.totalSnapshots,
                        icon: <ShieldCheck className='w-4 h-4 text-amber-600' />,
                        bg: 'bg-amber-50/70 border-amber-200/70',
                      },
                      {
                        label: t('provenance.report.kpi.aiTokensUsed'),
                        value: (
                          report.stats.totalPromptTokens + report.stats.totalCompletionTokens
                        ).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN'),
                        icon: <Sparkles className='w-4 h-4 text-sky-600' />,
                        bg: 'bg-sky-50/70 border-sky-200/70',
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${stat.bg} shadow-soft-xs flex flex-col justify-between`}
                      >
                        <div className='flex items-center justify-between text-stone-500'>
                          <span className='text-xs uppercase font-bold tracking-wider'>
                            {stat.label}
                          </span>
                          {stat.icon}
                        </div>
                        <div className='text-base font-bold text-stone-900 mt-1'>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Truy vết một revision (BR-10) */}
                  <section className='p-4 rounded-xl border border-stone-200 bg-white space-y-3 shadow-soft-xs'>
                    <div className='flex items-center justify-between gap-2 flex-wrap border-b border-stone-100 pb-3'>
                      <div className='flex items-center gap-2'>
                        <div className='w-6 h-6 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs'>
                          🔍
                        </div>
                        <h4 className='text-xs font-bold text-stone-900'>
                          {t('provenance.report.traceTitle')}
                        </h4>
                      </div>

                      <select
                        aria-label={t('provenance.report.selectRevisionAria')}
                        value={activeTraceId}
                        onChange={(e) => setTraceId(e.target.value)}
                        className='text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-stone-800 max-w-full md:max-w-md cursor-pointer shadow-2xs'
                      >
                        {filteredRevisions.length === 0 ? (
                          <option value=''>{t('provenance.report.noMatchingRevisions')}</option>
                        ) : (
                          filteredRevisions.map((r) => {
                            const kind = String(detail(r, 'kind') ?? 'Script');
                            const kindMeta = KIND_ROLE_LABEL[kind];
                            return (
                              <option key={r.id} value={r.id}>
                                v{String(detail(r, 'versionNumber') ?? '')} [
                                {kindMeta?.role ?? kind}] {r.summary}
                              </option>
                            );
                          })
                        )}
                      </select>
                    </div>

                    {!trace ? (
                      <p className='text-xs text-stone-400 py-3 text-center'>
                        {t('provenance.report.noRevisionsInScope')}
                      </p>
                    ) : (
                      <div className='space-y-3 pt-1'>
                        {/* Status Bar of selected Revision */}
                        <div className='flex items-center justify-between gap-2 flex-wrap bg-[#FAF8F5] p-2.5 rounded-xl border border-stone-200'>
                          <div className='flex items-center gap-2'>
                            {trace.origin === 'AI' ? (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold'>
                                <Bot className='w-3.5 h-3.5' /> {t('provenance.report.originAi')}
                              </span>
                            ) : (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold'>
                                <User className='w-3.5 h-3.5' />{' '}
                                {t('provenance.report.originHuman')}
                              </span>
                            )}
                            <span className='text-xs font-bold text-stone-800'>
                              v{String(detail(trace.revision, 'versionNumber') ?? '')} •{' '}
                              {trace.revision.summary}
                            </span>
                          </div>
                          <div className='flex items-center gap-1 text-xs text-stone-500 font-mono'>
                            <Clock className='w-3 h-3 text-stone-400' />
                            <span>{formatDateTime(trace.revision.timestamp)}</span>
                          </div>
                        </div>

                        {/* Visual Step-by-Step Lineage Flow */}
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs'>
                          {/* Left Column: AI Genesis */}
                          <div className='p-3 rounded-xl border border-stone-200 bg-[#FCFBF9] space-y-2'>
                            <span className='text-xs uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1'>
                              <Bot className='w-3 h-3' /> {t('provenance.report.aiGenesisTitle')}
                            </span>
                            {trace.run ? (
                              <div className='space-y-1.5'>
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>
                                    {t('provenance.report.workflowLabel')}
                                  </span>
                                  <span className='font-bold text-stone-800'>
                                    {str(detail(trace.run, 'workflowType'))}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>
                                    {t('provenance.report.aiModelLabel')}
                                  </span>
                                  <span className='font-medium text-stone-800'>
                                    {str(detail(trace.run, 'provider'))} •{' '}
                                    {str(detail(trace.run, 'model'))}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>
                                    {t('provenance.report.requestedByLabel')}
                                  </span>
                                  <span className='font-medium text-stone-800'>
                                    {str(detail(trace.run, 'requestedBy'))}
                                  </span>
                                </div>
                                {trace.step && (
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>
                                      {t('provenance.report.agentPromptLabel')}
                                    </span>
                                    <span className='font-mono text-stone-700 text-xs'>
                                      {str(detail(trace.step, 'agent'))} (
                                      {str(detail(trace.step, 'promptRef')) ?? '—'})
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className='text-xs text-stone-400 italic'>
                                {t('provenance.report.manualRevisionNote')}
                              </p>
                            )}
                          </div>

                          {/* Right Column: Human Review & Decision */}
                          <div className='p-3 rounded-xl border border-stone-200 bg-[#FCFBF9] space-y-2'>
                            <span className='text-xs uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1'>
                              <UserCheck className='w-3 h-3' />{' '}
                              {t('provenance.report.reviewRightsTitle')}
                            </span>
                            <div className='space-y-1.5'>
                              {trace.decision ? (
                                <>
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>
                                      {t('provenance.report.decidedByLabel')}
                                    </span>
                                    <span className='font-bold text-stone-800'>
                                      {str(detail(trace.decision, 'decidedBy'))}
                                    </span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>
                                      {t('provenance.report.decisionLabel')}
                                    </span>
                                    <span className='font-bold text-emerald-700'>
                                      {str(detail(trace.decision, 'decision'))}
                                    </span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>
                                      {t('provenance.report.modificationLevelLabel')}
                                    </span>
                                    <span className='font-medium text-stone-800'>
                                      {str(detail(trace.decision, 'modificationLevel')) ?? 'None'}
                                    </span>
                                  </div>
                                </>
                              ) : null}
                              <div className='flex justify-between'>
                                <span className='text-stone-500'>
                                  {t('provenance.report.createdByLabel')}
                                </span>
                                <span className='font-bold text-stone-800'>
                                  {formatAuthor(detail(trace.revision, 'createdBy'))}
                                </span>
                              </div>
                              {detail(trace.revision, 'role') != null && (
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>
                                    {t('provenance.report.roleLabel')}
                                  </span>
                                  <span className='font-semibold text-stone-800'>
                                    {String(detail(trace.revision, 'role'))}
                                  </span>
                                </div>
                              )}
                              <div className='flex justify-between'>
                                <span className='text-stone-500'>
                                  {t('provenance.report.packagedInLabel')}
                                </span>
                                <span className='font-semibold text-stone-800'>
                                  {trace.snapshots.length > 0
                                    ? trace.snapshots.map((s) => s.summary).join(', ')
                                    : t('provenance.report.notInSnapshot')}
                                </span>
                              </div>
                              {trace.previousVersion && (
                                <div className='flex justify-between items-center pt-1 border-t border-stone-100'>
                                  <span className='text-stone-500'>
                                    {t('provenance.report.previousVersionLabel')}
                                  </span>
                                  <button
                                    type='button'
                                    onClick={() => setTraceId(trace.previousVersion!.id)}
                                    className='text-xs font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer truncate max-w-[180px]'
                                    title={trace.previousVersion.summary}
                                  >
                                    {trace.previousVersion.summary}
                                  </button>
                                </div>
                              )}
                              {(() => {
                                const prod = detail(trace.revision, 'production') as
                                  Record<string, unknown> | undefined;
                                if (!prod) return null;
                                return (
                                  <div className='pt-2 mt-2 border-t border-stone-200/80 space-y-1.5'>
                                    <span className='text-xs uppercase font-bold text-stone-400 tracking-wider'>
                                      {t('provenance.report.executionDetailsTitle')}
                                    </span>
                                    {prod.stage != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>
                                          {t('provenance.report.stageLabel')}
                                        </span>
                                        <span className='font-semibold text-stone-800'>
                                          {String(prod.stage)}
                                        </span>
                                      </div>
                                    )}
                                    {prod.pageNumber != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>
                                          {t('provenance.report.locationLabel')}
                                        </span>
                                        <span className='font-semibold text-stone-800'>
                                          {t('provenance.report.pageLabel', {
                                            number: String(prod.pageNumber),
                                          })}
                                          {prod.panelId ? t('provenance.report.panelSuffix') : ''}
                                        </span>
                                      </div>
                                    )}
                                    {prod.fileName != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>
                                          {t('provenance.report.imageFileLabel')}
                                        </span>
                                        <span
                                          className='font-mono text-stone-800 truncate max-w-[180px]'
                                          title={String(prod.fileName)}
                                        >
                                          {String(prod.fileName)}
                                        </span>
                                      </div>
                                    )}
                                    {prod.action != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>
                                          {t('provenance.report.actionLabel')}
                                        </span>
                                        <span className='font-medium text-stone-800'>
                                          {String(prod.action)}
                                          {Number(prod.count) > 1
                                            ? t('provenance.report.timesCount', {
                                                count: Number(prod.count),
                                              })
                                            : ''}
                                        </span>
                                      </div>
                                    )}
                                    {prod.status != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>
                                          {t('provenance.report.reviewStatusLabel')}
                                        </span>
                                        <span className='font-bold text-stone-800'>
                                          {String(prod.status)}
                                        </span>
                                      </div>
                                    )}
                                    {prod.decisionComment != null &&
                                      String(prod.decisionComment).trim() !== '' && (
                                        <div className='flex justify-between'>
                                          <span className='text-stone-500'>
                                            {t('provenance.report.commentLabel')}
                                          </span>
                                          <span
                                            className='text-stone-700 italic truncate max-w-[180px]'
                                            title={String(prod.decisionComment)}
                                          >
                                            "{String(prod.decisionComment)}"
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Dòng thời gian trực quan (Interactive Timeline) */}
                  <section className='p-4 rounded-xl border border-stone-200 bg-white space-y-3 shadow-soft-xs'>
                    <div className='flex items-center justify-between border-b border-stone-100 pb-2.5'>
                      <div className='flex items-center gap-2'>
                        <Clock className='w-4 h-4 text-orange-600' />
                        <h4 className='text-xs font-bold text-stone-900'>
                          {t('provenance.report.timelineTitle')}
                        </h4>
                      </div>
                      <span className='text-xs text-stone-400 font-mono'>
                        {t('provenance.report.eventsRecorded', { count: report.timeline.length })}
                      </span>
                    </div>

                    {report.timeline.length === 0 ? (
                      <Empty text={t('provenance.report.noEvents')} />
                    ) : (
                      <ol className='relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200'>
                        {report.timeline.map((ev, i) => {
                          const tone = TONE_CLASSES[eventTone(ev.eventType)];
                          const isExpanded = !!expandedTimeline[i];
                          const isLong =
                            ev.summary.length > 140 ||
                            ev.summary.includes('|') ||
                            ev.summary.includes('\n');
                          const previewSummary =
                            isLong && !isExpanded ? `${ev.summary.slice(0, 130)}…` : ev.summary;

                          return (
                            <li
                              key={`${ev.entityId}-${ev.eventType}-${i}`}
                              className='relative group'
                            >
                              <span
                                className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border-2 border-white ring-2 ${tone.dot}`}
                              />
                              <div className='p-2.5 rounded-xl border border-stone-200/80 bg-[#FAF8F5]/60 hover:bg-white hover:border-stone-300 transition-colors shadow-2xs'>
                                <div className='flex items-center justify-between gap-2 text-xs mb-1'>
                                  <span
                                    className={`font-bold px-2 py-0.5 rounded-full border ${tone.badge}`}
                                  >
                                    {EVENT_LABEL[ev.eventType] ?? ev.eventType}
                                  </span>
                                  <span className='text-stone-400 font-mono'>
                                    {formatDateTime(ev.timestamp)}
                                  </span>
                                </div>
                                <p className='text-xs text-stone-800 leading-relaxed font-normal whitespace-pre-line'>
                                  {previewSummary}
                                </p>
                                {isLong && (
                                  <button
                                    type='button'
                                    onClick={() => toggleTimeline(i)}
                                    className='mt-1 text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer'
                                  >
                                    {isExpanded ? (
                                      <>
                                        <span>{t('provenance.report.collapse')}</span>
                                        <ChevronUp className='w-3 h-3' />
                                      </>
                                    ) : (
                                      <>
                                        <span>{t('provenance.report.viewDetails')}</span>
                                        <ChevronDown className='w-3 h-3' />
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {/* ════ Tab 4: Lịch sử canvas từng trang (CF4 4.3) ════ */}
          {tab === 'pages' && <PageHistoryPanel chapterId={chapterId} viewerRole={viewerRole} />}

          {/* ════ Tab 3: Lịch sử AI ════ */}
          {tab === 'runs' &&
            (runsError ? (
              <ErrorBox text={runsError} />
            ) : !runs ? (
              <Loading text={t('provenance.runs.loading')} />
            ) : runs.length === 0 ? (
              <Empty text={t('provenance.runs.empty')} />
            ) : (
              <div className='space-y-3'>
                <div className='flex items-center justify-between text-xs text-stone-500 font-medium px-1'>
                  <span>{t('provenance.runs.listHeader', { total: runsTotal })}</span>
                </div>
                {runs.map((r) => {
                  const isExpanded = !!expandedRuns[r.id];
                  const briefText = r.brief || t('provenance.runs.noBrief');
                  const isLong = briefText.length > 150;
                  const displayText =
                    isLong && !isExpanded ? `${briefText.slice(0, 140)}…` : briefText;

                  return (
                    <div
                      key={r.id}
                      className='p-4 rounded-2xl border border-stone-200/90 bg-[#FAF8F5] hover:bg-white hover:border-stone-300 transition-all space-y-2.5 shadow-soft-xs'
                    >
                      <div className='flex items-center justify-between gap-2 flex-wrap'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                              RUN_STATUS_STYLE[r.status] ?? RUN_STATUS_STYLE.Queued
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className='text-xs font-bold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200'>
                            {r.workflowType}
                          </span>
                          <span className='text-xs text-stone-500 font-mono flex items-center gap-1'>
                            <span>{r.provider}</span>
                            <span className='text-stone-300'>•</span>
                            <span className='text-stone-700 font-medium'>{r.model}</span>
                          </span>
                        </div>
                        <span className='text-xs text-stone-400 font-mono flex items-center gap-1'>
                          <Clock className='w-3 h-3 text-stone-300' />
                          <span>{formatDateTime(r.createdAt)}</span>
                        </span>
                      </div>

                      {/* Brief content block without line-clamp vertical clipping */}
                      <div className='bg-white/90 p-3 rounded-xl border border-stone-200/70 shadow-2xs space-y-1.5'>
                        <p className='text-xs text-stone-800 font-normal leading-relaxed whitespace-pre-line break-words'>
                          {displayText}
                        </p>
                        {isLong && (
                          <button
                            type='button'
                            onClick={() => toggleRunExpand(r.id)}
                            className='text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition-colors pt-1'
                          >
                            {isExpanded ? (
                              <>
                                <span>{t('provenance.runs.collapse')}</span>
                                <ChevronUp className='w-3 h-3' />
                              </>
                            ) : (
                              <>
                                <span>
                                  {t('provenance.runs.viewFullContent', {
                                    count: briefText.length,
                                  })}
                                </span>
                                <ChevronDown className='w-3 h-3' />
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className='flex items-center gap-2.5 text-xs text-stone-600 font-medium flex-wrap pt-0.5'>
                        <span className='bg-stone-100/80 px-2.5 py-0.5 rounded-full text-stone-700 border border-stone-200/60'>
                          {t('provenance.runs.stepsCount', { count: r.stepCount })}
                        </span>
                        <span className='bg-stone-100/80 px-2.5 py-0.5 rounded-full text-stone-700 border border-stone-200/60'>
                          {t('provenance.runs.suggestionsCount', { count: r.suggestionCount })}
                        </span>
                        <span className='inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200'>
                          <CheckCircle2 className='w-3 h-3' />{' '}
                          {t('provenance.runs.acceptedCount', { count: r.acceptedCount })}
                        </span>
                        <span className='text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200'>
                          {t('provenance.runs.rejectedCount', { count: r.rejectedCount })}
                        </span>
                        {r.errorCode && (
                          <span className='inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono font-semibold'>
                            <AlertTriangle className='w-3 h-3 text-rose-500' />
                            <span>{t('provenance.runs.errorCode', { code: r.errorCode })}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
        </div>

        {/* Modal Footer */}
        <div className='p-3.5 bg-gradient-to-r from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] border-t border-stone-200 flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='px-5 py-2 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-all shadow-soft-xs cursor-pointer'
          >
            {t('provenance.closeLabel')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
