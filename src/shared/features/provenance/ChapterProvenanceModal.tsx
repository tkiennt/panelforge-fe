import React, { useEffect, useMemo, useState } from 'react';
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

type Tab = 'snapshots' | 'provenance' | 'runs';
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

const KIND_ROLE_LABEL: Record<string, { label: string; role: string; color: string }> = {
  Script: {
    label: 'Kịch bản & Thoại',
    role: 'Writer',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Layout: {
    label: 'Bố cục khung (Panels)',
    role: 'Artist / Storyboard',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  ImagePrompt: {
    label: 'Prompt ảnh nhân vật',
    role: 'Artist / AI',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  Artwork: {
    label: 'Phiên bản artwork',
    role: 'Artist',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  Lettering: {
    label: 'Chèn chữ & bóng thoại',
    role: 'Letterer',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  Review: {
    label: 'Nộp / duyệt / trả về',
    role: 'Editor',
    color: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

function formatAuthor(val?: unknown): string {
  if (!val) return '—';
  const s = String(val).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return `Người dùng (${s.slice(0, 8)}…)`;
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
  <div
    role='alert'
    className='p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-2.5 shadow-soft-xs'
  >
    <AlertTriangle className='w-4 h-4 shrink-0 text-rose-600 mt-0.5' />
    <span className='font-medium'>{text}</span>
  </div>
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
 * Bản duyệt (ChapterSnapshot bất biến), Provenance Report (UC-19, BR-10: agent, model, prompt, người quyết, mức sửa)
 * và lịch sử AI run.
 */
export const ChapterProvenanceModal: React.FC<ChapterProvenanceModalProps> = ({
  seriesId,
  chapterId,
  chapterNumber,
  chapterTitle,
  viewerRole,
  onClose,
}) => {
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
      label: 'Bản duyệt',
      icon: <FileStack className='w-4 h-4' />,
      badgeCount: snapshots?.length,
    },
    ...(canProvenance
      ? [
          {
            key: 'provenance' as Tab,
            label: 'Provenance',
            icon: <GitBranch className='w-4 h-4' />,
            badgeCount: allRevisions.length,
          },
        ]
      : []),
    {
      key: 'runs',
      label: 'Lịch sử AI',
      icon: <Bot className='w-4 h-4' />,
      badgeCount: runsTotal || runs?.length,
    },
  ];

  const toggleTimeline = (index: number) => {
    setExpandedTimeline((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200'>
      <div
        role='dialog'
        aria-modal='true'
        aria-label={`Lịch sử và nguồn gốc chương ${chapterNumber ?? ''}`.trim()}
        className='bg-white border border-stone-200/90 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'
      >
        {/* Header */}
        <div className='px-5 py-4 bg-gradient-to-r from-[#FAF8F5] via-[#FFFDF9] to-[#FAF8F5] border-b border-stone-200 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-orange-100/80 text-orange-700 border border-orange-200 flex items-center justify-center shadow-xs'>
              <GitBranch className='w-4.5 h-4.5' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h3 className='font-bold text-sm text-stone-900'>Lịch Sử & Nguồn Gốc Nội Dung</h3>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100/70 text-orange-800 border border-orange-200'>
                  CF4
                </span>
              </div>
              <p className='text-xs text-stone-500 font-medium'>
                {chapterNumber === undefined
                  ? 'Chương hiện tại'
                  : `Chương ${chapterNumber}: ${chapterTitle || 'Không tiêu đề'}`}
              </p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Đóng'
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
          {tabs.map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                type='button'
                role='tab'
                aria-selected={isActive}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-orange-500 text-orange-700 bg-white shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-white/60'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
                {t.badgeCount !== undefined && t.badgeCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-orange-100 text-orange-800 font-bold'
                        : 'bg-stone-200/70 text-stone-600'
                    }`}
                  >
                    {t.badgeCount}
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
              <Loading text='Đang tải các bản duyệt...' />
            ) : snapshots.length === 0 ? (
              <Empty text='Chương chưa được duyệt lần nào. Bản duyệt được tạo tự động khi Producer duyệt chương.' />
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
                            Bản duyệt #{s.snapshotNumber}
                          </span>
                          {s.isLatest && (
                            <span className='text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200'>
                              Hiện hành
                            </span>
                          )}
                        </div>
                        <div className='text-[11px] text-stone-500 mt-1 flex items-center gap-1.5'>
                          <Clock className='w-3 h-3 text-stone-400' />
                          <span>{formatDateTime(s.createdAt)}</span>
                        </div>
                        <div className='text-[11px] text-stone-600 font-medium mt-0.5 flex items-center gap-1.5'>
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
                    <Loading text='Đang tải manifest bản duyệt...' />
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
                            ? 'Manifest còn nguyên vẹn: hash khớp chính xác với lúc duyệt.'
                            : 'Cảnh báo: hash manifest không khớp, bản duyệt có thể đã bị can thiệp ngoài nền tảng.'}
                        </span>
                      </div>

                      <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl border border-stone-200 bg-[#FAF8F5]'>
                        <div>
                          <span className='text-[10px] uppercase font-bold text-stone-400 tracking-wider'>
                            Version
                          </span>
                          <p className='text-xs font-bold text-stone-800 mt-0.5'>
                            v.{snapDetail.snapshot.chapterVersion}
                          </p>
                        </div>
                        <div>
                          <span className='text-[10px] uppercase font-bold text-stone-400 tracking-wider'>
                            Hash Manifest
                          </span>
                          <p className='text-xs font-mono font-bold text-stone-800 mt-0.5'>
                            {shortHash(snapDetail.snapshot.manifestHash, 14)}
                          </p>
                        </div>
                        <div>
                          <span className='text-[10px] uppercase font-bold text-stone-400 tracking-wider'>
                            Script Revisions
                          </span>
                          <p className='text-xs font-bold text-stone-800 mt-0.5'>
                            {snapDetail.manifest.scriptRevisionIds.length} bản cảnh
                          </p>
                        </div>
                        <div>
                          <span className='text-[10px] uppercase font-bold text-stone-400 tracking-wider'>
                            Bible Hiệu lực
                          </span>
                          <p className='text-xs font-bold text-stone-800 mt-0.5'>
                            {snapDetail.manifest.bibleRevisionIds.length} mục khoá
                          </p>
                        </div>
                      </div>

                      <div className='border border-stone-200 rounded-xl overflow-hidden bg-white shadow-soft-xs'>
                        <table className='w-full text-xs'>
                          <thead className='bg-stone-50 border-b border-stone-200 text-stone-600'>
                            <tr>
                              <th className='text-left px-3 py-2.5 font-semibold'>Trang</th>
                              <th className='text-left px-3 py-2.5 font-semibold'>
                                Artwork (SHA-256)
                              </th>
                              <th className='text-left px-3 py-2.5 font-semibold'>
                                Version Canvas
                              </th>
                            </tr>
                          </thead>
                          <tbody className='divide-y divide-stone-100'>
                            {snapDetail.manifest.pages.map((p) => (
                              <tr key={p.pageId} className='hover:bg-stone-50/50'>
                                <td className='px-3 py-2.5 font-bold text-stone-800'>
                                  Trang {p.pageNumber}
                                </td>
                                <td className='px-3 py-2.5 font-mono text-[11px]'>
                                  {p.artworkSha256 ? (
                                    <span className='text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded'>
                                      {shortHash(p.artworkSha256, 16)}
                                    </span>
                                  ) : (
                                    <span className='text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200'>
                                      Chưa có ảnh cả trang
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
                    Phạm vi:
                  </label>
                  <select
                    id='prov-scene'
                    value={sceneId}
                    onChange={(e) => setSceneId(e.target.value)}
                    className='border border-stone-300 rounded-lg px-2.5 py-1 bg-white text-xs font-medium text-stone-800 cursor-pointer shadow-2xs'
                  >
                    <option value=''>Cả chương</option>
                    {scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        Cảnh {s.sceneNumber}
                        {s.heading ? `: ${s.heading}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter chips for revision kinds */}
                <div className='flex items-center gap-1.5 text-xs flex-wrap'>
                  <span className='text-stone-500 font-medium text-[11px]'>Lọc theo vai trò:</span>
                  {(
                    [
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'Script', label: 'Kịch bản & Thoại (Writer)' },
                      { key: 'Layout', label: 'Khung trang (Artist)' },
                      { key: 'ImagePrompt', label: 'Prompt vẽ (Artist)' },
                      { key: 'Artwork', label: 'Artwork (Artist)' },
                      { key: 'Lettering', label: 'Chèn chữ (Letterer)' },
                      { key: 'Review', label: 'Nộp & duyệt (Editor)' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type='button'
                      onClick={() => setKindFilter(f.key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
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
                      <span className='font-bold'>Giai đoạn sản xuất hiện tại của chương:</span>{' '}
                      Chương này mới có phiên bản kịch bản (vai trò <b>Writer</b>). Khi{' '}
                      <b>Artist</b> tải artwork, <b>Letterer</b> chèn chữ hoặc <b>Editor</b> duyệt /
                      trả về, các phiên bản đó sẽ tự xuất hiện tại đây (khi xem cả chương, không lọc
                      theo phân cảnh).
                    </div>
                  </div>
                )}

              {reportError && <ErrorBox text={reportError} />}
              {!report && !reportError && (
                <Loading text='Đang dựng báo cáo phả hệ (Provenance Report)...' />
              )}

              {report && (
                <>
                  {/* KPI Metric Cards */}
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2.5'>
                    {[
                      {
                        label: 'AI Workflow Run',
                        value: report.stats.totalRuns,
                        icon: <Bot className='w-4 h-4 text-violet-600' />,
                        bg: 'bg-violet-50/70 border-violet-200/70',
                      },
                      {
                        label: 'Đề xuất AI chấp nhận',
                        value: `${report.stats.acceptedSuggestions}/${report.stats.totalSuggestions}`,
                        icon: <CheckCircle2 className='w-4 h-4 text-emerald-600' />,
                        bg: 'bg-emerald-50/70 border-emerald-200/70',
                      },
                      {
                        label: 'Người sửa đề xuất',
                        value: report.stats.modifiedByHumanDecisions,
                        icon: <UserCheck className='w-4 h-4 text-blue-600' />,
                        bg: 'bg-blue-50/70 border-blue-200/70',
                      },
                      {
                        label: 'Phiên bản nội dung',
                        value: `${report.stats.aiOriginatedRevisions} AI · ${report.stats.manualRevisions} người`,
                        icon: <Layers className='w-4 h-4 text-indigo-600' />,
                        bg: 'bg-indigo-50/70 border-indigo-200/70',
                      },
                      {
                        label: 'Đề xuất bị từ chối',
                        value: report.stats.rejectedSuggestions,
                        icon: <XCircle className='w-4 h-4 text-rose-600' />,
                        bg: 'bg-rose-50/70 border-rose-200/70',
                      },
                      {
                        label: 'Đề xuất chờ duyệt',
                        value: report.stats.pendingSuggestions,
                        icon: <Clock className='w-4 h-4 text-amber-600' />,
                        bg: 'bg-amber-50/70 border-amber-200/70',
                      },
                      {
                        label: 'Bản duyệt đã chốt',
                        value: report.stats.totalSnapshots,
                        icon: <ShieldCheck className='w-4 h-4 text-amber-600' />,
                        bg: 'bg-amber-50/70 border-amber-200/70',
                      },
                      {
                        label: 'Token AI tiêu thụ',
                        value: (
                          report.stats.totalPromptTokens + report.stats.totalCompletionTokens
                        ).toLocaleString('vi-VN'),
                        icon: <Sparkles className='w-4 h-4 text-sky-600' />,
                        bg: 'bg-sky-50/70 border-sky-200/70',
                      },
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${stat.bg} shadow-soft-xs flex flex-col justify-between`}
                      >
                        <div className='flex items-center justify-between text-stone-500'>
                          <span className='text-[10px] uppercase font-bold tracking-wider'>
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
                          Truy vết phả hệ nội dung
                        </h4>
                      </div>

                      <select
                        aria-label='Chọn revision để truy vết'
                        value={activeTraceId}
                        onChange={(e) => setTraceId(e.target.value)}
                        className='text-xs border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-stone-800 max-w-full md:max-w-md cursor-pointer shadow-2xs'
                      >
                        {filteredRevisions.length === 0 ? (
                          <option value=''>Không có phiên bản nào phù hợp</option>
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
                        Chưa có phiên bản nội dung nào trong phạm vi và bộ lọc này.
                      </p>
                    ) : (
                      <div className='space-y-3 pt-1'>
                        {/* Status Bar of selected Revision */}
                        <div className='flex items-center justify-between gap-2 flex-wrap bg-[#FAF8F5] p-2.5 rounded-xl border border-stone-200'>
                          <div className='flex items-center gap-2'>
                            {trace.origin === 'AI' ? (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-xs font-semibold'>
                                <Bot className='w-3.5 h-3.5' /> Từ đề xuất AI
                              </span>
                            ) : (
                              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold'>
                                <User className='w-3.5 h-3.5' /> Do người viết/sửa
                              </span>
                            )}
                            <span className='text-xs font-bold text-stone-800'>
                              v{String(detail(trace.revision, 'versionNumber') ?? '')} •{' '}
                              {trace.revision.summary}
                            </span>
                          </div>
                          <div className='flex items-center gap-1 text-[11px] text-stone-500 font-mono'>
                            <Clock className='w-3 h-3 text-stone-400' />
                            <span>{formatDateTime(trace.revision.timestamp)}</span>
                          </div>
                        </div>

                        {/* Visual Step-by-Step Lineage Flow */}
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-xs'>
                          {/* Left Column: AI Genesis */}
                          <div className='p-3 rounded-xl border border-stone-200 bg-[#FCFBF9] space-y-2'>
                            <span className='text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1'>
                              <Bot className='w-3 h-3' /> Nguồn gốc sinh AI
                            </span>
                            {trace.run ? (
                              <div className='space-y-1.5'>
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>Workflow:</span>
                                  <span className='font-bold text-stone-800'>
                                    {str(detail(trace.run, 'workflowType'))}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>Mô hình AI:</span>
                                  <span className='font-medium text-stone-800'>
                                    {str(detail(trace.run, 'provider'))} •{' '}
                                    {str(detail(trace.run, 'model'))}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>Người chạy:</span>
                                  <span className='font-medium text-stone-800'>
                                    {str(detail(trace.run, 'requestedBy'))}
                                  </span>
                                </div>
                                {trace.step && (
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>Agent / Prompt:</span>
                                    <span className='font-mono text-stone-700 text-[11px]'>
                                      {str(detail(trace.step, 'agent'))} (
                                      {str(detail(trace.step, 'promptRef')) ?? '—'})
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className='text-xs text-stone-400 italic'>
                                Phiên bản này được thực hiện thủ công bởi thành viên dự án, không
                                qua chuỗi đề xuất tự động.
                              </p>
                            )}
                          </div>

                          {/* Right Column: Human Review & Decision */}
                          <div className='p-3 rounded-xl border border-stone-200 bg-[#FCFBF9] space-y-2'>
                            <span className='text-[10px] uppercase font-bold text-stone-400 tracking-wider flex items-center gap-1'>
                              <UserCheck className='w-3 h-3' /> Thẩm định & Bản quyền
                            </span>
                            <div className='space-y-1.5'>
                              {trace.decision ? (
                                <>
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>Người duyệt:</span>
                                    <span className='font-bold text-stone-800'>
                                      {str(detail(trace.decision, 'decidedBy'))}
                                    </span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>Quyết định:</span>
                                    <span className='font-bold text-emerald-700'>
                                      {str(detail(trace.decision, 'decision'))}
                                    </span>
                                  </div>
                                  <div className='flex justify-between'>
                                    <span className='text-stone-500'>Mức độ sửa:</span>
                                    <span className='font-medium text-stone-800'>
                                      {str(detail(trace.decision, 'modificationLevel')) ?? 'None'}
                                    </span>
                                  </div>
                                </>
                              ) : null}
                              <div className='flex justify-between'>
                                <span className='text-stone-500'>Tạo bởi:</span>
                                <span className='font-bold text-stone-800'>
                                  {formatAuthor(detail(trace.revision, 'createdBy'))}
                                </span>
                              </div>
                              {detail(trace.revision, 'role') != null && (
                                <div className='flex justify-between'>
                                  <span className='text-stone-500'>Vai trò:</span>
                                  <span className='font-semibold text-stone-800'>
                                    {String(detail(trace.revision, 'role'))}
                                  </span>
                                </div>
                              )}
                              <div className='flex justify-between'>
                                <span className='text-stone-500'>Đóng gói trong:</span>
                                <span className='font-semibold text-stone-800'>
                                  {trace.snapshots.length > 0
                                    ? trace.snapshots.map((s) => s.summary).join(', ')
                                    : 'Chưa thuộc bản duyệt nào'}
                                </span>
                              </div>
                              {trace.previousVersion && (
                                <div className='flex justify-between items-center pt-1 border-t border-stone-100'>
                                  <span className='text-stone-500'>Bản liền trước:</span>
                                  <button
                                    type='button'
                                    onClick={() => setTraceId(trace.previousVersion!.id)}
                                    className='text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer truncate max-w-[180px]'
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
                                    <span className='text-[10px] uppercase font-bold text-stone-400 tracking-wider'>
                                      Chi tiết thực hiện
                                    </span>
                                    {prod.stage != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>Công đoạn:</span>
                                        <span className='font-semibold text-stone-800'>
                                          {String(prod.stage)}
                                        </span>
                                      </div>
                                    )}
                                    {prod.pageNumber != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>Vị trí:</span>
                                        <span className='font-semibold text-stone-800'>
                                          Trang {String(prod.pageNumber)}
                                          {prod.panelId ? ' · Khung' : ''}
                                        </span>
                                      </div>
                                    )}
                                    {prod.fileName != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>Tệp ảnh:</span>
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
                                        <span className='text-stone-500'>Thao tác:</span>
                                        <span className='font-medium text-stone-800'>
                                          {String(prod.action)}
                                          {Number(prod.count) > 1 ? ` (${prod.count} lần)` : ''}
                                        </span>
                                      </div>
                                    )}
                                    {prod.status != null && (
                                      <div className='flex justify-between'>
                                        <span className='text-stone-500'>Trạng thái duyệt:</span>
                                        <span className='font-bold text-stone-800'>
                                          {String(prod.status)}
                                        </span>
                                      </div>
                                    )}
                                    {prod.decisionComment != null &&
                                      String(prod.decisionComment).trim() !== '' && (
                                        <div className='flex justify-between'>
                                          <span className='text-stone-500'>Nhận xét:</span>
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
                        <h4 className='text-xs font-bold text-stone-900'>Dòng thời gian sự kiện</h4>
                      </div>
                      <span className='text-[11px] text-stone-400 font-mono'>
                        {report.timeline.length} sự kiện được ghi nhận
                      </span>
                    </div>

                    {report.timeline.length === 0 ? (
                      <Empty text='Chưa có sự kiện nào được ghi nhận.' />
                    ) : (
                      <ol className='relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200'>
                        {report.timeline.map((t, i) => {
                          const tone = TONE_CLASSES[eventTone(t.eventType)];
                          const isExpanded = !!expandedTimeline[i];
                          const isLong =
                            t.summary.length > 140 ||
                            t.summary.includes('|') ||
                            t.summary.includes('\n');
                          const previewSummary =
                            isLong && !isExpanded ? `${t.summary.slice(0, 130)}…` : t.summary;

                          return (
                            <li
                              key={`${t.entityId}-${t.eventType}-${i}`}
                              className='relative group'
                            >
                              <span
                                className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border-2 border-white ring-2 ${tone.dot}`}
                              />
                              <div className='p-2.5 rounded-xl border border-stone-200/80 bg-[#FAF8F5]/60 hover:bg-white hover:border-stone-300 transition-colors shadow-2xs'>
                                <div className='flex items-center justify-between gap-2 text-[11px] mb-1'>
                                  <span
                                    className={`font-bold px-2 py-0.5 rounded-full border ${tone.badge}`}
                                  >
                                    {EVENT_LABEL[t.eventType] ?? t.eventType}
                                  </span>
                                  <span className='text-stone-400 font-mono'>
                                    {formatDateTime(t.timestamp)}
                                  </span>
                                </div>
                                <p className='text-xs text-stone-800 leading-relaxed font-normal whitespace-pre-line'>
                                  {previewSummary}
                                </p>
                                {isLong && (
                                  <button
                                    type='button'
                                    onClick={() => toggleTimeline(i)}
                                    className='mt-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer'
                                  >
                                    {isExpanded ? (
                                      <>
                                        <span>Thu gọn</span>
                                        <ChevronUp className='w-3 h-3' />
                                      </>
                                    ) : (
                                      <>
                                        <span>Xem chi tiết</span>
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

          {/* ════ Tab 3: Lịch sử AI ════ */}
          {tab === 'runs' &&
            (runsError ? (
              <ErrorBox text={runsError} />
            ) : !runs ? (
              <Loading text='Đang tải lịch sử các lượt chạy AI...' />
            ) : runs.length === 0 ? (
              <Empty text='Chương chưa có lượt chạy AI nào.' />
            ) : (
              <div className='space-y-3'>
                <div className='flex items-center justify-between text-xs text-stone-500 font-medium px-1'>
                  <span>
                    Danh sách {runsTotal} lần chạy workflow AI trong chương (mới nhất xếp trước):
                  </span>
                </div>
                {runs.map((r) => {
                  const isExpanded = !!expandedRuns[r.id];
                  const briefText = r.brief || 'Không có mô tả yêu cầu.';
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
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                              RUN_STATUS_STYLE[r.status] ?? RUN_STATUS_STYLE.Queued
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className='text-xs font-bold text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200'>
                            {r.workflowType}
                          </span>
                          <span className='text-[11px] text-stone-500 font-mono flex items-center gap-1'>
                            <span>{r.provider}</span>
                            <span className='text-stone-300'>•</span>
                            <span className='text-stone-700 font-medium'>{r.model}</span>
                          </span>
                        </div>
                        <span className='text-[11px] text-stone-400 font-mono flex items-center gap-1'>
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
                            className='text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer transition-colors pt-1'
                          >
                            {isExpanded ? (
                              <>
                                <span>Thu gọn</span>
                                <ChevronUp className='w-3 h-3' />
                              </>
                            ) : (
                              <>
                                <span>Xem toàn bộ nội dung ({briefText.length} ký tự)</span>
                                <ChevronDown className='w-3 h-3' />
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      <div className='flex items-center gap-2.5 text-[11px] text-stone-600 font-medium flex-wrap pt-0.5'>
                        <span className='bg-stone-100/80 px-2.5 py-0.5 rounded-full text-stone-700 border border-stone-200/60'>
                          {r.stepCount} bước
                        </span>
                        <span className='bg-stone-100/80 px-2.5 py-0.5 rounded-full text-stone-700 border border-stone-200/60'>
                          {r.suggestionCount} đề xuất
                        </span>
                        <span className='inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200'>
                          <CheckCircle2 className='w-3 h-3' /> {r.acceptedCount} nhận
                        </span>
                        <span className='text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200'>
                          {r.rejectedCount} từ chối
                        </span>
                        {r.errorCode && (
                          <span className='inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono font-semibold'>
                            <AlertTriangle className='w-3 h-3 text-rose-500' />
                            <span>Mã lỗi: {r.errorCode}</span>
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
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
