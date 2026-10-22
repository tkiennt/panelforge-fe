import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  FileStack,
  GitBranch,
  Loader2,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import {
  chapterService,
  type ChapterSnapshotDetailDto,
  type ChapterSnapshotDto,
} from '@/services/chapter.service';
import {
  aiAgentsService,
  type AiRunSummaryDto,
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
import { PageHistoryPanel } from './PageHistoryPanel';

type Tab = 'snapshots' | 'provenance' | 'runs' | 'pages';

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

const TONE: Record<ReturnType<typeof eventTone>, string> = {
  ai: 'bg-violet-500',
  human: 'bg-emerald-500',
  error: 'bg-rose-500',
  approval: 'bg-orange-500',
};

const RUN_STATUS_STYLE: Record<string, string> = {
  Completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Failed: 'text-rose-700 bg-rose-50 border-rose-200',
  Interrupted: 'text-rose-700 bg-rose-50 border-rose-200',
  Running: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  Queued: 'text-neutral-700 bg-neutral-50 border-neutral-200',
};

const Loading: React.FC<{ text: string }> = ({ text }) => (
  <div className='py-12 flex flex-col items-center justify-center text-xs text-[#888888] gap-2'>
    <Loader2 className='w-5 h-5 animate-spin text-orange-500' />
    <span>{text}</span>
  </div>
);

const ErrorBox: React.FC<{ text: string }> = ({ text }) => (
  <div
    role='alert'
    className='p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl'
  >
    {text}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className='py-12 text-center text-xs text-[#888888]'>{text}</div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className='flex items-baseline gap-2 text-xs'>
    <span className='text-[#888888] shrink-0 w-28'>{label}</span>
    <span className='text-[#171717] break-all'>{value ?? '—'}</span>
  </div>
);

const str = (v: unknown): string | undefined =>
  v === null || v === undefined || v === '' ? undefined : String(v);

/**
 * CF4: lịch sử và nguồn gốc nội dung của một chương. Bản duyệt (ChapterSnapshot, bất biến), Provenance Report
 * (UC-19, BR-10: agent, model, prompt, người quyết, mức sửa), lịch sử AI run và lịch sử canvas từng trang
 * (PageHistoryPanel: so sánh, Producer/Artist khôi phục). Khôi phục script nằm ở màn Script của Writer (ScriptHistoryModal).
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
        setTraceId(revisionsOf(r)[0]?.id ?? '');
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

  const trace = useMemo(
    () => (report && traceId ? traceRevision(report, traceId) : null),
    [report, traceId],
  );

  // ── Lịch sử AI ──
  const [runs, setRuns] = useState<AiRunSummaryDto[] | null>(null);
  const [runsTotal, setRunsTotal] = useState(0);
  const [runsError, setRunsError] = useState<string | null>(null);

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

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'snapshots', label: 'Bản duyệt', icon: <FileStack className='w-3.5 h-3.5' /> },
    ...(canProvenance
      ? [
          {
            key: 'provenance' as Tab,
            label: 'Provenance',
            icon: <GitBranch className='w-3.5 h-3.5' />,
          },
        ]
      : []),
    { key: 'runs', label: 'Lịch sử AI', icon: <Bot className='w-3.5 h-3.5' /> },
    { key: 'pages', label: 'Lịch sử trang', icon: <Clock className='w-3.5 h-3.5' /> },
  ];

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div
        role='dialog'
        aria-modal='true'
        aria-label={`Lịch sử và nguồn gốc chương ${chapterNumber ?? ''}`.trim()}
        className='bg-white border border-[#E7E7E7] rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[88vh]'
      >
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center'>
              <GitBranch className='w-4 h-4' />
            </div>
            <div>
              <h3 className='font-bold text-sm text-[#171717]'>Lịch Sử & Nguồn Gốc Nội Dung</h3>
              <p className='text-xs text-[#737373]'>
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
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Tabs */}
        <div role='tablist' className='px-4 pt-3 flex gap-1 border-b border-[#E7E7E7]'>
          {tabs.map((t) => (
            <button
              key={t.key}
              type='button'
              role='tab'
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                tab === t.key
                  ? 'border-orange-500 text-[#171717]'
                  : 'border-transparent text-[#888888] hover:text-[#171717]'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className='p-5 overflow-y-auto flex-1 custom-scrollbar'>
          {/* ════ Bản duyệt ════ */}
          {tab === 'snapshots' &&
            (snapError ? (
              <ErrorBox text={snapError} />
            ) : !snapshots ? (
              <Loading text='Đang tải các bản duyệt...' />
            ) : snapshots.length === 0 ? (
              <Empty text='Chương chưa được duyệt lần nào. Bản duyệt được tạo tự động khi Producer duyệt chương.' />
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4'>
                <ul className='space-y-1.5'>
                  {snapshots.map((s) => (
                    <li key={s.id}>
                      <button
                        type='button'
                        onClick={() => setSelectedSnap(s.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                          selectedSnap === s.id
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-[#E7E7E7] bg-[#FAF8F5] hover:border-neutral-400'
                        }`}
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <span className='font-bold text-[#171717]'>
                            Bản duyệt #{s.snapshotNumber}
                          </span>
                          {s.isLatest && (
                            <span className='text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200'>
                              Hiện hành
                            </span>
                          )}
                        </div>
                        <div className='text-[11px] text-[#737373] mt-1'>
                          {formatDateTime(s.createdAt)}
                        </div>
                        <div className='text-[11px] text-[#737373]'>
                          {s.createdByName || 'Producer'}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className='space-y-3'>
                  {snapDetailError && <ErrorBox text={snapDetailError} />}
                  {!snapDetail && !snapDetailError && <Loading text='Đang tải manifest...' />}
                  {snapDetail && (
                    <>
                      <div
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium ${
                          snapDetail.hashVerified
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        {snapDetail.hashVerified ? (
                          <ShieldCheck className='w-4 h-4 shrink-0' />
                        ) : (
                          <AlertTriangle className='w-4 h-4 shrink-0' />
                        )}
                        {snapDetail.hashVerified
                          ? 'Manifest còn nguyên vẹn: hash khớp với lúc duyệt.'
                          : 'Cảnh báo: hash manifest không khớp, bản duyệt có thể đã bị sửa.'}
                      </div>
                      <div className='p-3 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] space-y-1.5'>
                        <Field
                          label='Version chương'
                          value={`v.${snapDetail.snapshot.chapterVersion}`}
                        />
                        <Field
                          label='Hash manifest'
                          value={
                            <span className='font-mono'>
                              {shortHash(snapDetail.snapshot.manifestHash, 16)}
                            </span>
                          }
                        />
                        <Field
                          label='Revision script'
                          value={`${snapDetail.manifest.scriptRevisionIds.length} (bản mới nhất mỗi cảnh)`}
                        />
                        <Field
                          label='Revision Bible'
                          value={`${snapDetail.manifest.bibleRevisionIds.length} (đã khoá, hiệu lực tại chương)`}
                        />
                      </div>
                      <table className='w-full text-xs border border-[#E7E7E7] rounded-xl overflow-hidden'>
                        <thead className='bg-[#FAF8F4] text-[#737373]'>
                          <tr>
                            <th className='text-left p-2 font-semibold'>Trang</th>
                            <th className='text-left p-2 font-semibold'>Artwork (SHA-256)</th>
                            <th className='text-left p-2 font-semibold'>Version canvas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapDetail.manifest.pages.map((p) => (
                            <tr key={p.pageId} className='border-t border-[#E7E7E7]'>
                              <td className='p-2 font-semibold'>{p.pageNumber}</td>
                              <td className='p-2 font-mono'>
                                {p.artworkSha256 ? (
                                  shortHash(p.artworkSha256, 16)
                                ) : (
                                  <span className='text-amber-700'>Chưa có ảnh cả trang</span>
                                )}
                              </td>
                              <td className='p-2'>
                                {p.canvasStreamVersion < 0 ? '—' : p.canvasStreamVersion}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </div>
            ))}

          {/* ════ Provenance Report ════ */}
          {tab === 'provenance' && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2 text-xs'>
                <label htmlFor='prov-scene' className='text-[#737373]'>
                  Phạm vi
                </label>
                <select
                  id='prov-scene'
                  value={sceneId}
                  onChange={(e) => setSceneId(e.target.value)}
                  className='border border-[#E7E7E7] rounded-lg px-2 py-1 bg-white'
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

              {reportError && <ErrorBox text={reportError} />}
              {!report && !reportError && <Loading text='Đang dựng Provenance Report...' />}
              {report && (
                <>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
                    {[
                      ['AI run', report.stats.totalRuns],
                      [
                        'Đề xuất AI',
                        `${report.stats.acceptedSuggestions}/${report.stats.totalSuggestions} nhận`,
                      ],
                      ['Người sửa đề xuất', report.stats.modifiedByHumanDecisions],
                      [
                        'Revision',
                        `${report.stats.aiOriginatedRevisions} AI · ${report.stats.manualRevisions} người`,
                      ],
                      ['Đề xuất bị từ chối', report.stats.rejectedSuggestions],
                      ['Đề xuất chờ', report.stats.pendingSuggestions],
                      ['Bản duyệt', report.stats.totalSnapshots],
                      [
                        'Token',
                        (
                          report.stats.totalPromptTokens + report.stats.totalCompletionTokens
                        ).toLocaleString('vi-VN'),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className='p-2.5 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5]'
                      >
                        <div className='text-[10px] uppercase tracking-wider text-[#888888] font-bold'>
                          {label}
                        </div>
                        <div className='text-sm font-bold text-[#171717] mt-0.5'>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Truy vết một revision (BR-10) */}
                  <section className='p-3 rounded-xl border border-[#E7E7E7] space-y-2'>
                    <div className='flex items-center gap-2 flex-wrap'>
                      <h4 className='text-xs font-bold text-[#171717]'>Truy vết nội dung</h4>
                      <select
                        aria-label='Chọn revision để truy vết'
                        value={traceId}
                        onChange={(e) => setTraceId(e.target.value)}
                        className='text-xs border border-[#E7E7E7] rounded-lg px-2 py-1 bg-white max-w-full'
                      >
                        {revisionsOf(report).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.summary}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!trace ? (
                      <p className='text-xs text-[#888888]'>
                        Chưa có revision nội dung nào trong phạm vi này.
                      </p>
                    ) : (
                      <div className='space-y-1.5'>
                        <div className='flex items-center gap-1.5 text-xs font-semibold'>
                          {trace.origin === 'AI' ? (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200'>
                              <Bot className='w-3.5 h-3.5' /> Từ đề xuất AI
                            </span>
                          ) : (
                            <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200'>
                              <User className='w-3.5 h-3.5' /> Do người viết/sửa
                            </span>
                          )}
                          <span className='text-[#737373] font-normal'>
                            {formatDateTime(trace.revision.timestamp)}
                          </span>
                        </div>
                        {trace.step && (
                          <Field
                            label='Agent / model'
                            value={`${str(detail(trace.step, 'agent')) ?? '—'} · ${str(detail(trace.step, 'model')) ?? '—'}`}
                          />
                        )}
                        {trace.step && (
                          <Field
                            label='Prompt'
                            value={
                              <span className='font-mono'>
                                {str(detail(trace.step, 'promptRef')) ?? '—'}
                              </span>
                            }
                          />
                        )}
                        {trace.run && (
                          <Field
                            label='Người chạy AI'
                            value={str(detail(trace.run, 'requestedBy'))}
                          />
                        )}
                        {trace.suggestion && (
                          <Field
                            label='Đầu vào'
                            value={`Script nền ${shortHash(str(detail(trace.suggestion, 'baseScriptRevisionId')), 8)} · ${
                              (
                                detail(trace.suggestion, 'bibleRevisionIds') as
                                  unknown[] | undefined
                              )?.length ?? 0
                            } revision Bible`}
                          />
                        )}
                        {trace.decision && (
                          <Field
                            label='Người quyết định'
                            value={`${str(detail(trace.decision, 'decidedBy')) ?? '—'} · ${str(detail(trace.decision, 'decision')) ?? ''} · mức sửa: ${
                              str(detail(trace.decision, 'modificationLevel')) ?? 'None'
                            }`}
                          />
                        )}
                        {trace.restoredFrom && (
                          <Field label='Khôi phục từ' value={trace.restoredFrom.summary} />
                        )}
                        <Field label='Tạo bởi' value={str(detail(trace.revision, 'createdBy'))} />
                        <Field
                          label='Nằm trong'
                          value={
                            trace.snapshots.length > 0
                              ? trace.snapshots.map((s) => s.summary).join(', ')
                              : 'Chưa thuộc bản duyệt nào'
                          }
                        />
                      </div>
                    )}
                  </section>

                  {/* Dòng thời gian */}
                  <section>
                    <h4 className='text-xs font-bold text-[#171717] mb-2'>Dòng thời gian</h4>
                    {report.timeline.length === 0 ? (
                      <Empty text='Chưa có sự kiện nào.' />
                    ) : (
                      <ol className='relative pl-6 space-y-3 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-[#E7E7E7]'>
                        {report.timeline.map((t, i) => (
                          <li key={`${t.entityId}-${t.eventType}-${i}`} className='relative'>
                            <span
                              className={`absolute -left-[22px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${TONE[eventTone(t.eventType)]}`}
                            />
                            <div className='flex items-center gap-2 text-[11px] text-[#737373]'>
                              <Clock className='w-3 h-3' />
                              {formatDateTime(t.timestamp)}
                              <span className='font-semibold text-[#555555]'>
                                {EVENT_LABEL[t.eventType] ?? t.eventType}
                              </span>
                            </div>
                            <p className='text-xs text-[#171717]'>{t.summary}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {/* ════ Lịch sử AI ════ */}
          {/* ════ Lịch sử canvas từng trang (CF4 4.3) ════ */}
          {tab === 'pages' && <PageHistoryPanel chapterId={chapterId} viewerRole={viewerRole} />}

          {tab === 'runs' &&
            (runsError ? (
              <ErrorBox text={runsError} />
            ) : !runs ? (
              <Loading text='Đang tải lịch sử AI...' />
            ) : runs.length === 0 ? (
              <Empty text='Chương chưa có lần chạy AI nào.' />
            ) : (
              <div className='space-y-2'>
                <p className='text-[11px] text-[#888888]'>{runsTotal} lần chạy, mới nhất trước.</p>
                {runs.map((r) => (
                  <div
                    key={r.id}
                    className='p-3 rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] space-y-1'
                  >
                    <div className='flex items-center justify-between gap-2 flex-wrap'>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            RUN_STATUS_STYLE[r.status] ?? RUN_STATUS_STYLE.Queued
                          }`}
                        >
                          {r.status}
                        </span>
                        <span className='text-xs font-semibold text-[#171717]'>
                          {r.workflowType}
                        </span>
                        <span className='text-[11px] text-[#737373]'>
                          {r.provider} · {r.model}
                        </span>
                      </div>
                      <span className='text-[11px] text-[#737373]'>
                        {formatDateTime(r.createdAt)}
                      </span>
                    </div>
                    <p className='text-xs text-[#555555]'>{r.brief}</p>
                    <div className='flex items-center gap-3 text-[11px] text-[#737373]'>
                      <span>{r.stepCount} bước</span>
                      <span>{r.suggestionCount} đề xuất</span>
                      <span className='inline-flex items-center gap-1 text-emerald-700'>
                        <CheckCircle2 className='w-3 h-3' /> {r.acceptedCount} nhận
                      </span>
                      <span className='text-rose-700'>{r.rejectedCount} từ chối</span>
                      {r.errorCode && <span className='text-rose-700'>Lỗi: {r.errorCode}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>

        <div className='p-3 bg-[#FAF8F4] border-t border-[#E7E7E7] flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
