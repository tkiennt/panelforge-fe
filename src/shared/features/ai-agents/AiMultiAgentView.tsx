import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  ChevronRight,
  Cpu,
  History,
  Info,
  Loader2,
  Play,
  PowerOff,
  Sparkles,
} from 'lucide-react';
import { PageContainer } from '@/shared/components/PageContainer';
import {
  AiApiError,
  AiRunDto,
  AiStepDto,
  AiWorkflowAvailabilityResponse,
  AiWorkflowType,
  ContentRevisionKind,
  ContentRevisionDto,
  ProductionReport,
  ReadingDirection,
  ReviewReport,
  SceneLite,
  aiAgentsService,
  isActiveRun,
  latestScriptRevisionId,
  workflowOf,
} from '@/services/aiAgents.service';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { bibleService } from '@/services/bible.service';
import { AgentPipelineStrip } from './AgentPipelineStrip';
import { ProductionReportView, ReviewReportView } from './AgentOutputViews';
import { StepOutputView } from './StepOutputView';
import { SuggestionCard } from './SuggestionCard';
import {
  AGENT_META,
  RUN_STATUS_LABEL,
  WORKFLOW_AGENTS,
  WORKFLOW_META,
  WORKFLOW_ORDER,
  collectLines,
  decisionOf,
  formatMs,
  hasWriterLoop,
  lastReportStep,
} from './aiViewUtils';

const STUBBORN_MARKER = '[mock:stubborn]';
const ESCALATE_MARKER = '[mock:escalate]';
const DEFAULT_BRIEFS: Record<AiWorkflowType, string> = {
  FullScene: 'Viết cảnh An dọn tiệm đồng hồ lúc nửa đêm thì bà Lan xuất hiện ngoài hiên.',
  Script: 'Viết cảnh An dọn tiệm đồng hồ lúc nửa đêm thì bà Lan xuất hiện ngoài hiên.',
  Storyboard: 'Chia script của Scene thành Page/Panel.',
  Artist: 'Soạn prompt ảnh cho các panel của layout đã duyệt.',
  Letterer: 'Rút gọn các thoại dài cho vừa bubble, giữ giọng nhân vật.',
  Editor: 'Review script và layout của Scene.',
  Producer: 'Báo cáo tiến độ Chapter và các rủi ro cần chú ý.',
};

interface StoredRun {
  runId: string;
  createdAt: string;
  brief: string;
  workflowType?: AiWorkflowType;
}

const historyKey = (seriesId: string) => `ai-runs:${seriesId}`;

function loadHistory(seriesId: string): StoredRun[] {
  try {
    return JSON.parse(localStorage.getItem(historyKey(seriesId)) || '[]');
  } catch {
    return [];
  }
}

const STATUS_CHIP: Record<string, string> = {
  Queued: 'border-[#A3A3A3] bg-[#F5F5F5] text-[#525252]',
  Running: 'border-[#F97316] bg-[#FFF7ED] text-[#C2410C]',
  WaitingForHuman: 'border-red-400 bg-red-50 text-red-700',
  Completed: 'border-emerald-400 bg-emerald-50 text-emerald-700',
  Failed: 'border-red-400 bg-red-50 text-red-700',
  Interrupted: 'border-amber-400 bg-amber-50 text-amber-700',
};

const KIND_CHIP: Record<string, string> = {
  Permission: 'border-red-300 bg-red-50 text-red-700',
  Config: 'border-amber-300 bg-amber-50 text-amber-700',
  State: 'border-amber-300 bg-amber-50 text-amber-700',
  Context: 'border-sky-300 bg-sky-50 text-sky-700',
};
const KIND_LABEL: Record<string, string> = {
  Permission: 'Quyền',
  Config: 'Cấu hình',
  State: 'Trạng thái',
  Context: 'Thiếu dữ liệu',
};

const REVISION_STYLE: Record<ContentRevisionKind, string> = {
  Script: 'bg-[#171717]',
  Layout: 'bg-[#0EA5E9]',
  ImagePrompt: 'bg-[#EC4899]',
};

export const AiMultiAgentView: React.FC<{
  onShowToast: (title: string, desc: string) => void;
}> = ({ onShowToast }) => {
  const { seriesId } = useParams();
  const sid = seriesId!;

  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [scenes, setScenes] = useState<SceneLite[]>([]);
  const [chapterId, setChapterId] = useState('');
  const [sceneId, setSceneId] = useState('');
  const [chapterVersion, setChapterVersion] = useState<number | null>(null);
  const [revisions, setRevisions] = useState<ContentRevisionDto[]>([]);
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<AiWorkflowAvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const [workflowType, setWorkflowType] = useState<AiWorkflowType>('FullScene');
  const [brief, setBrief] = useState(DEFAULT_BRIEFS.FullScene);
  const [briefTouched, setBriefTouched] = useState(false);
  const [direction, setDirection] = useState<ReadingDirection>('RightToLeft');
  const [stubborn, setStubborn] = useState(false);
  const [escalate, setEscalate] = useState(false);

  const [run, setRun] = useState<AiRunDto | null>(null);
  const [history, setHistory] = useState<StoredRun[]>(() =>
    seriesId ? loadHistory(seriesId) : [],
  );
  const [starting, setStarting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [aiDown, setAiDown] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const lastStepCount = useRef(0);

  const baseRevisionId = useMemo(() => latestScriptRevisionId(revisions), [revisions]);
  const needsScene = workflowType !== 'Producer';
  const selected = availability?.workflows.find((w) => w.workflowType === workflowType);
  const runWorkflow = workflowOf(run);

  // ── Dữ liệu nền: chương + tên nhân vật trong Bible ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await chapterService.getChaptersBySeries(sid, 1, 50);
        setChapters(res.items);
        if (res.items.length > 0) {
          const preferred = res.items.find((c) => c.scenesCount > 0) ?? res.items[0];
          setChapterId(preferred.id);
        }
      } catch (e: any) {
        onShowToast('AI Multi-Agent', e.message);
      }
      try {
        const bible = await bibleService.getSeriesBible(sid);
        setNameById(Object.fromEntries(bible.entries.map((en) => [en.id, en.name])));
      } catch {
        /* Bible không bắt buộc để hiển thị; tên nhân vật sẽ hiện chung chung */
      }
    })();
  }, [sid, onShowToast]);

  const refreshAvailability = useCallback(async () => {
    if (!chapterId) return;
    try {
      setAvailability(
        await aiAgentsService.getWorkflowAvailability(sid, chapterId, sceneId || null),
      );
      setAvailabilityError(null);
    } catch (e) {
      setAvailability(null);
      setAvailabilityError((e as AiApiError).message);
    }
  }, [chapterId, sceneId, sid]);

  const refreshVersions = useCallback(async () => {
    if (!chapterId) return;
    try {
      const ch = await chapterService.getChapterById(chapterId);
      setChapterVersion(ch.versionVector ?? 0);
    } catch {
      setChapterVersion(null);
    }
    if (sceneId) {
      try {
        setRevisions(await aiAgentsService.getSceneRevisions(sid, sceneId));
      } catch {
        setRevisions([]);
      }
    }
    await refreshAvailability();
  }, [chapterId, sceneId, sid, refreshAvailability]);

  useEffect(() => {
    if (!chapterId) return;
    (async () => {
      try {
        const list = await aiAgentsService.getScenesByChapter(chapterId);
        setScenes(list);
        setSceneId(list[0]?.id ?? '');
      } catch (e: any) {
        setScenes([]);
        onShowToast('AI Multi-Agent', e.message);
      }
    })();
  }, [chapterId, onShowToast]);

  useEffect(() => {
    refreshVersions();
  }, [refreshVersions]);

  // Đổi nhiệm vụ: gợi ý brief mặc định nếu người dùng chưa tự sửa
  const pickWorkflow = (t: AiWorkflowType) => {
    setWorkflowType(t);
    if (!briefTouched) setBrief(DEFAULT_BRIEFS[t]);
    if (!hasWriterLoop(t)) {
      setStubborn(false);
      setEscalate(false);
    }
  };

  // ── Polling run đang chạy ───────────────────────────────────────────────────
  const loadRun = useCallback(
    async (runId: string) => {
      try {
        const r = await aiAgentsService.getRun(sid, runId);
        setRun(r);
        return r;
      } catch (e: any) {
        onShowToast('AI Multi-Agent', e.message);
        return null;
      }
    },
    [sid, onShowToast],
  );

  useEffect(() => {
    if (!run || !isActiveRun(run.status)) return;
    const t = setInterval(() => loadRun(run.id), 2000);
    return () => clearInterval(t);
  }, [run, loadRun]);

  // Step mới xuất hiện → mở step cuối; run kết thúc → làm mới version/revision/điều kiện chạy
  useEffect(() => {
    if (!run) return;
    if (run.steps.length !== lastStepCount.current) {
      lastStepCount.current = run.steps.length;
      const last = run.steps[run.steps.length - 1];
      if (last) setExpanded((prev) => new Set(prev).add(last.id));
    }
    if (!isActiveRun(run.status)) refreshVersions();
  }, [run, refreshVersions]);

  // ── Hành động ───────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!chapterId || (needsScene && !sceneId) || chapterVersion === null) return;
    setStarting(true);
    setAiDown(null);
    try {
      const res = await aiAgentsService.runWorkflow(sid, {
        chapterId,
        sceneId: needsScene ? sceneId : null,
        brief: [
          brief.trim(),
          stubborn || escalate ? STUBBORN_MARKER : '',
          escalate ? ESCALATE_MARKER : '',
        ]
          .filter(Boolean)
          .join(' '),
        readingDirection: direction,
        chapterVersion,
        baseScriptRevisionId: needsScene ? baseRevisionId : null,
        workflowType,
      });
      const entry: StoredRun = {
        runId: res.runId,
        createdAt: new Date().toISOString(),
        brief,
        workflowType,
      };
      const next = [entry, ...history].slice(0, 15);
      setHistory(next);
      localStorage.setItem(historyKey(sid), JSON.stringify(next));
      lastStepCount.current = 0;
      setExpanded(new Set());
      onShowToast('AI Multi-Agent', `Đã giao job (${res.provider} · ${res.model}). Đang chạy…`);
      await loadRun(res.runId);
    } catch (e) {
      const err = e as AiApiError;
      if (err.code === 'AI_UNAVAILABLE') setAiDown(err.message);
      else
        onShowToast(
          err.status === 403 ? 'Không đủ quyền / điều kiện' : 'AI Multi-Agent',
          err.message,
        );
      if (err.status === 409 || err.status === 403) refreshVersions();
    } finally {
      setStarting(false);
    }
  };

  const handleDecide = async (
    suggestionId: string,
    decision: 'accept' | 'reject' | 'request-changes',
    reason?: string,
  ) => {
    setDeciding(true);
    try {
      // Accept cần version Chapter MỚI NHẤT (sai → 409): lấy lại ngay trước khi gửi
      const ch = await chapterService.getChapterById(chapterId);
      await aiAgentsService.review(sid, suggestionId, decision, {
        reason,
        chapterVersion: ch.versionVector ?? 0,
      });
      onShowToast(
        'AI Multi-Agent',
        decision === 'accept'
          ? 'Đã áp dụng đề xuất: tạo content revision mới (Chapter chưa bị Approve).'
          : 'Đã ghi quyết định của bạn.',
      );
      if (run) await loadRun(run.id);
      await refreshVersions();
    } catch (e) {
      const err = e as AiApiError;
      onShowToast(
        err.status === 409
          ? 'Xung đột phiên bản (409)'
          : err.status === 403
            ? 'Không đủ quyền'
            : 'AI Multi-Agent',
        err.message,
      );
      if (run) await loadRun(run.id);
      await refreshVersions();
    } finally {
      setDeciding(false);
    }
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const lines = useMemo(() => collectLines(run?.steps ?? [], nameById), [run, nameById]);
  const totalTokens = (run?.steps ?? []).reduce(
    (n, s) => n + (s.promptTokens ?? 0) + (s.completionTokens ?? 0),
    0,
  );
  const lastSupervisor = [...(run?.steps ?? [])].reverse().map(decisionOf).find(Boolean);
  const editorStep = lastReportStep(run, 'Editor');
  const producerStep = lastReportStep(run, 'Producer');
  const reportOnly = WORKFLOW_META[runWorkflow].result === 'report';

  const stepTitle = (s: AiStepDto) => {
    if (s.agent === 'Supervisor') {
      const d = decisionOf(s);
      return d ? `→ gọi ${d.action} · ${d.reason}` : 'Quyết định điều phối';
    }
    if (s.agent === 'Writer')
      return s.round === 0 ? 'Viết bản đầu' : `Sửa theo finding — lượt ${s.round}`;
    if (s.agent === 'Continuity') return `Kiểm tra continuity — bản lượt ${s.round}`;
    if (s.agent === 'Storyboard') return 'Chia Page / Panel';
    if (s.agent === 'Artist') return 'Soạn prompt ảnh cho panel';
    if (s.agent === 'Letterer') return 'Đề xuất rút gọn thoại';
    if (s.agent === 'Producer') return 'Báo cáo tiến độ';
    return 'Báo cáo review';
  };

  const runBlocked = selected && !selected.canRun;
  const runDisabled =
    starting ||
    (needsScene && !sceneId) ||
    chapterVersion === null ||
    !brief.trim() ||
    isActiveRun(run?.status) ||
    !!runBlocked;

  return (
    <PageContainer className='space-y-5 py-6'>
      <header className='flex flex-wrap items-center gap-3'>
        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#171717] text-white'>
          <Bot size={20} />
        </span>
        <div>
          <h1 className='font-serif text-2xl font-bold tracking-tight'>AI Multi-Agent</h1>
          <p className='text-xs text-[#525252]'>
            Gemini (Supervisor) điều phối 7 agent chuyên môn theo nhiệm vụ và role: Writer ·
            Continuity · Storyboard · Artist · Letterer · Editor · Producer · mỗi nhiệm vụ chỉ chạy
            tập agent của nó · code giữ hàng rào, AI chỉ đề xuất, người có quyền quyết định.
          </p>
        </div>
      </header>

      {aiDown && (
        <div className='flex items-start gap-2 rounded-xl border-[1.5px] border-amber-400 bg-amber-50 p-3 text-sm text-amber-800'>
          <PowerOff size={16} className='mt-0.5 shrink-0' />
          <div>
            <b>AI tạm thời không khả dụng</b> (AI_UNAVAILABLE): {aiDown}
            <div className='text-xs'>
              Bạn vẫn có thể làm thủ công — các chức năng khác không bị ảnh hưởng.
            </div>
          </div>
        </div>
      )}

      <AgentPipelineStrip run={run} />

      <div className='grid gap-5 lg:grid-cols-[360px_1fr]'>
        {/* ── Form chạy nhiệm vụ ── */}
        <aside className='space-y-3 self-start rounded-2xl border-[1.5px] border-[#171717] bg-white p-4'>
          <h2 className='flex items-center gap-2 text-sm font-bold'>
            <Sparkles size={15} className='text-[#F97316]' /> Chọn nhiệm vụ AI
          </h2>

          <label className='block text-xs font-semibold'>
            Chapter
            <select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className='mt-1 w-full rounded border-[1.5px] border-[#171717] bg-white p-1.5 text-xs'
            >
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Chapter {c.chapterNumber}
                  {c.title ? ` — ${c.title}` : ''}
                </option>
              ))}
            </select>
          </label>

          {hasWriterLoop(workflowType) &&
            (() => {
              const currentChap = chapters.find((c) => c.id === chapterId);
              if (!currentChap?.outline) return null;
              return (
                <div className='rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-xs'>
                  <div className='flex items-center gap-1 font-semibold text-amber-800 text-[11px] mb-0.5'>
                    <Sparkles size={12} className='text-[#F97316]' />
                    <span>Đề cương chương (Writer Input)</span>
                  </div>
                  <p className='text-[11px] text-amber-900 line-clamp-3 leading-relaxed'>
                    {currentChap.outline}
                  </p>
                </div>
              );
            })()}

          {needsScene ? (
            <label className='block text-xs font-semibold'>
              Scene
              <select
                value={sceneId}
                onChange={(e) => setSceneId(e.target.value)}
                className='mt-1 w-full rounded border-[1.5px] border-[#171717] bg-white p-1.5 text-xs'
              >
                {scenes.length === 0 && <option value=''>(Chapter chưa có Scene)</option>}
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    Scene {s.sceneNumber}
                    {s.heading ? ` — ${s.heading}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className='rounded bg-[#FAF8F5] p-2 text-[11px] text-[#525252]'>
              Báo cáo tiến độ tính trên <b>cả Chapter</b>, không cần chọn Scene.
            </p>
          )}

          {availability?.yourRole && (
            <p className='text-[11px] text-[#525252]'>
              Vai trò của bạn trong Workspace: <b>{availability.yourRole}</b> — Backend tự xác định
              quyền, assignment và trạng thái khoá chương.
            </p>
          )}
          {availabilityError && (
            <p className='rounded border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800'>
              Không tải được điều kiện chạy: {availabilityError}. Backend vẫn kiểm lại khi bạn chạy.
            </p>
          )}

          <fieldset className='space-y-1.5' aria-label='Nhiệm vụ AI'>
            {WORKFLOW_ORDER.map((t) => {
              const info = availability?.workflows.find((w) => w.workflowType === t);
              const meta = WORKFLOW_META[t];
              const agents = info?.agents ?? WORKFLOW_AGENTS[t];
              const on = workflowType === t;
              const blocked = info ? !info.canRun : false;
              return (
                <label
                  key={t}
                  data-workflow={t}
                  data-can-run={info ? String(info.canRun) : 'unknown'}
                  className={`block cursor-pointer rounded-lg border-[1.5px] p-2 text-xs transition-colors ${
                    on ? 'border-[#171717] bg-[#FFF7ED]' : 'border-[#E7E7E7] hover:bg-[#FAF8F5]'
                  } ${blocked && !on ? 'opacity-70' : ''}`}
                >
                  <div className='flex items-center gap-2'>
                    <input
                      type='radio'
                      name='workflow'
                      checked={on}
                      onChange={() => pickWorkflow(t)}
                    />
                    <span className='font-bold'>{info?.title ?? meta.title}</span>
                    <span
                      className={`ml-auto rounded border px-1 text-[9px] font-bold ${
                        meta.result === 'report'
                          ? 'border-[#A3A3A3] bg-[#F5F5F5] text-[#525252]'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      }`}
                      title={
                        meta.result === 'report'
                          ? 'Báo cáo tham khảo: không có Accept/Reject'
                          : 'Đề xuất áp dụng được: người có quyền Accept/Reject'
                      }
                    >
                      {meta.result === 'report' ? 'Báo cáo' : 'Đề xuất'}
                    </span>
                    {info && (
                      <span
                        className={`rounded border px-1 text-[9px] font-bold ${
                          info.canRun
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-red-300 bg-red-50 text-red-700'
                        }`}
                      >
                        {info.canRun ? 'Chạy được' : 'Chưa chạy được'}
                      </span>
                    )}
                  </div>
                  <div className='mt-1 flex flex-wrap items-center gap-1 pl-5'>
                    {agents.map((a) => (
                      <span
                        key={a}
                        className='rounded px-1 text-[9px] font-bold text-white'
                        style={{ backgroundColor: AGENT_META[a].accent }}
                      >
                        {a}
                      </span>
                    ))}
                    {info && (
                      <span className='text-[9px] text-[#737373]'>
                        · role: {info.requiredRoles.join('/')}
                      </span>
                    )}
                  </div>
                  {on && (
                    <p className='mt-1 pl-5 text-[11px] text-[#525252]'>
                      {info?.description ?? ''}
                    </p>
                  )}
                </label>
              );
            })}
          </fieldset>

          {runBlocked && selected && (
            <div
              className='space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900'
              data-testid='missing-conditions'
            >
              <b>Chưa thể chạy “{selected.title}” — còn thiếu:</b>
              <ul className='space-y-1'>
                {selected.missing.map((m) => (
                  <li key={m.code} className='flex items-start gap-1.5'>
                    <span
                      className={`mt-0.5 shrink-0 rounded border px-1 text-[9px] font-bold ${KIND_CHIP[m.kind] ?? ''}`}
                    >
                      {KIND_LABEL[m.kind] ?? m.kind}
                    </span>
                    <span>{m.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className='block text-xs font-semibold'>
            Brief
            <textarea
              value={brief}
              onChange={(e) => {
                setBrief(e.target.value);
                setBriefTouched(true);
              }}
              rows={3}
              className='mt-1 w-full rounded border-[1.5px] border-[#171717] p-2 text-xs font-normal outline-none focus:border-[#F97316]'
            />
          </label>

          {(workflowType === 'FullScene' || workflowType === 'Storyboard') && (
            <label className='block text-xs font-semibold'>
              Hướng đọc
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as ReadingDirection)}
                className='mt-1 w-full rounded border-[1.5px] border-[#171717] bg-white p-1.5 text-xs'
              >
                <option value='RightToLeft'>Phải → trái (RTL, manga)</option>
                <option value='LeftToRight'>Trái → phải (LTR)</option>
              </select>
            </label>
          )}

          {hasWriterLoop(workflowType) && (
            <>
              <label className='flex items-start gap-2 text-[11px] text-[#525252]'>
                <input
                  type='checkbox'
                  checked={stubborn}
                  onChange={(e) => setStubborn(e.target.checked)}
                  className='mt-0.5'
                />
                <span>
                  Demo dừng chờ người: ép Writer không sửa lỗi (chỉ có tác dụng ở chế độ Mock) → sau
                  2 lượt dừng ở <b>WaitingForHuman</b>.
                </span>
              </label>

              <label className='flex items-start gap-2 text-[11px] text-[#525252]'>
                <input
                  type='checkbox'
                  checked={escalate}
                  onChange={(e) => setEscalate(e.target.checked)}
                  className='mt-0.5'
                />
                <span>
                  Demo Supervisor leo thang sớm (Mock): khi gặp finding chặn, Supervisor tự chọn{' '}
                  <b>StopForHuman</b> thay vì gọi Writer sửa tiếp.
                </span>
              </label>
            </>
          )}

          {needsScene && (
            <div className='rounded-lg bg-[#FAF8F5] p-2 text-[11px] text-[#525252]'>
              <b>Phiên bản nguồn</b> (chống ghi đè, BR-11):
              <div className='font-mono'>
                chapterVersion = {chapterVersion ?? '…'} · script revision ={' '}
                {baseRevisionId ? baseRevisionId.slice(0, 8) : 'chưa có'}
              </div>
            </div>
          )}

          <button
            type='button'
            onClick={handleRun}
            disabled={runDisabled}
            title={runBlocked ? 'Còn thiếu điều kiện — xem khung cảnh báo phía trên' : undefined}
            className='flex w-full items-center justify-center gap-2 rounded border-[1.5px] border-[#F97316] bg-[#F97316] px-3 py-2 text-sm font-bold text-white hover:bg-[#EA580C] disabled:cursor-not-allowed disabled:opacity-50'
          >
            {starting ? <Loader2 size={15} className='animate-spin' /> : <Play size={15} />}
            Chạy: {WORKFLOW_META[workflowType].short} (
            {(selected?.agents ?? WORKFLOW_AGENTS[workflowType]).length} agent)
          </button>

          {history.length > 0 && (
            <div className='border-t border-[#E7E7E7] pt-3'>
              <div className='mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
                <History size={12} /> Run gần đây (trên máy này)
              </div>
              <ul className='space-y-1'>
                {history.slice(0, 6).map((h) => (
                  <li key={h.runId}>
                    <button
                      type='button'
                      onClick={() => {
                        lastStepCount.current = 0;
                        setExpanded(new Set());
                        loadRun(h.runId);
                      }}
                      className={`w-full rounded border px-2 py-1 text-left text-[11px] hover:bg-[#FAF8F5] ${
                        run?.id === h.runId ? 'border-[#171717]' : 'border-[#E7E7E7]'
                      }`}
                    >
                      <div className='truncate font-semibold'>
                        <span className='mr-1 rounded bg-[#F5F5F5] px-1 text-[9px] font-bold text-[#525252]'>
                          {WORKFLOW_META[h.workflowType ?? 'FullScene'].short}
                        </span>
                        {h.brief}
                      </div>
                      <div className='font-mono text-[10px] text-[#737373]'>
                        {new Date(h.createdAt).toLocaleTimeString('vi-VN')} · {h.runId.slice(0, 8)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        {/* ── Kết quả ── */}
        <main className='min-w-0 space-y-4'>
          {!run && (
            <div className='rounded-2xl border-[1.5px] border-dashed border-[#A3A3A3] p-10 text-center text-sm text-[#737373]'>
              Chọn nhiệm vụ, Scene (nếu cần), nhập brief rồi bấm <b>Chạy</b>. Từng step (input,
              output, prompt, token, thời gian) sẽ hiện ở đây ngay khi Backend lưu xong.
            </div>
          )}

          {run && (
            <>
              <section className='rounded-2xl border-[1.5px] border-[#171717] bg-white p-4'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span
                    className={`flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${STATUS_CHIP[run.status]}`}
                  >
                    {isActiveRun(run.status) && <Loader2 size={12} className='animate-spin' />}
                    {RUN_STATUS_LABEL[run.status]}
                  </span>
                  <span className='rounded border border-[#171717] bg-[#FFF7ED] px-2 py-0.5 text-[11px] font-bold'>
                    {WORKFLOW_META[runWorkflow].title}
                  </span>
                  <span
                    className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-bold ${
                      run.provider === 'Mock'
                        ? 'border-[#A3A3A3] bg-[#F5F5F5] text-[#525252]'
                        : 'border-[#171717] bg-[#171717] text-white'
                    }`}
                  >
                    <Cpu size={11} /> {run.provider} · {run.model}
                  </span>
                  <span className='text-[11px] text-[#525252]'>
                    {run.provider === 'Mock'
                      ? 'Fixture xác định — không có token thật'
                      : `${totalTokens.toLocaleString('vi-VN')} token`}
                  </span>
                  <span className='ml-auto font-mono text-[10px] text-[#737373]'>
                    run {run.id.slice(0, 8)}
                  </span>
                </div>
                <p className='mt-2 text-xs text-[#404040]'>
                  <b>Brief:</b> {run.brief}
                </p>

                {run.status === 'WaitingForHuman' && (
                  <div className='mt-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700'>
                    <AlertTriangle size={14} className='mt-0.5 shrink-0' />
                    <div>
                      <b>Dừng chờ con người.</b>{' '}
                      {hasWriterLoop(runWorkflow)
                        ? `Sau ${run.revisionRounds} lượt sửa, Continuity vẫn còn finding chặn; các bước sau không được chạy. Hãy xem bằng chứng bên dưới rồi Reject / Yêu cầu sửa.`
                        : 'Workflow này không có Writer để sửa tiếp hoặc thiếu dữ kiện để chạy.'}
                      {lastSupervisor && (
                        <div className='mt-1 font-normal'>
                          Lý do của Supervisor: {lastSupervisor.reason}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(run.status === 'Failed' || run.status === 'Interrupted') && (
                  <div className='mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700'>
                    <b>{run.errorCode}</b>: {run.errorMessage}
                    {run.status === 'Interrupted' &&
                      ' — chưa hỗ trợ resume, hãy chạy lại workflow.'}
                  </div>
                )}
              </section>

              {/* Báo cáo tham khảo (Editor / Producer): hiển thị nổi bật, không có Accept/Reject */}
              {(editorStep || producerStep) && reportOnly && (
                <section className='space-y-2' data-testid='report-section'>
                  <h3 className='flex items-center gap-2 text-sm font-bold'>
                    {producerStep ? 'Báo cáo tiến độ' : 'Báo cáo review'}
                    <span className='flex items-center gap-1 rounded border border-[#A3A3A3] bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#525252]'>
                      <Info size={10} /> tham khảo — không có Accept/Reject
                    </span>
                  </h3>
                  {producerStep ? (
                    <ProductionReportView report={producerStep.output as ProductionReport} />
                  ) : (
                    <ReviewReportView report={editorStep!.output as ReviewReport} />
                  )}
                </section>
              )}

              <section className='space-y-2'>
                <div className='flex items-center'>
                  <h3 className='text-sm font-bold'>
                    Từng bước ({run.steps.length}):{' '}
                    {run.steps.filter((s) => s.agent !== 'Supervisor').length} agent chuyên môn +{' '}
                    {run.steps.filter((s) => s.agent === 'Supervisor').length} quyết định điều phối
                  </h3>
                  <button
                    type='button'
                    className='ml-auto text-[11px] font-semibold text-[#525252] hover:text-[#171717]'
                    onClick={() =>
                      setExpanded(
                        expanded.size === run.steps.length
                          ? new Set()
                          : new Set(run.steps.map((s) => s.id)),
                      )
                    }
                  >
                    {expanded.size === run.steps.length ? 'Thu gọn tất cả' : 'Mở tất cả'}
                  </button>
                </div>

                {run.steps.map((s) => {
                  const meta = AGENT_META[s.agent];
                  const open = expanded.has(s.id);
                  const parent = run.steps.find((p) => p.id === s.parentStepId);
                  return (
                    <div
                      key={s.id}
                      className='overflow-hidden rounded-xl border-[1.5px] border-[#171717] bg-white'
                    >
                      <button
                        type='button'
                        onClick={() => toggle(s.id)}
                        className='flex w-full flex-wrap items-center gap-2 p-3 text-left hover:bg-[#FAF8F5]'
                      >
                        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span
                          className='flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white'
                          style={{ backgroundColor: meta.accent }}
                        >
                          {s.stepIndex}
                        </span>
                        <span className='text-sm font-bold'>{meta.label}</span>
                        <span className='text-xs text-[#525252]'>{stepTitle(s)}</span>
                        {s.status === 'Failed' && (
                          <span className='rounded border border-red-300 bg-red-50 px-1.5 text-[10px] font-bold text-red-700'>
                            Lỗi
                          </span>
                        )}
                        {s.agent === 'Continuity' &&
                          (s.output as { findings?: unknown[] } | null)?.findings?.length === 0 && (
                            <span className='rounded border border-emerald-300 bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700'>
                              Sạch
                            </span>
                          )}
                        <span className='ml-auto flex flex-wrap items-center gap-2 text-[10px] text-[#737373]'>
                          <span className='font-mono'>{s.promptVersion}</span>
                          {s.repairAttempts > 0 && (
                            <span className='rounded bg-amber-100 px-1 font-semibold text-amber-700'>
                              sửa JSON ×{s.repairAttempts}
                            </span>
                          )}
                          <span>
                            {s.promptTokens != null
                              ? `${s.promptTokens}/${s.completionTokens ?? 0} tok`
                              : 'không token'}
                          </span>
                          <span>{formatMs(s.durationMs)}</span>
                        </span>
                      </button>
                      {open && (
                        <div className='space-y-2 border-t border-[#E7E7E7] bg-[#FDFCFA] p-3'>
                          {parent && (
                            <p className='text-[11px] text-[#737373]'>
                              ↳ nhận input từ output của step #{parent.stepIndex} ({parent.agent})
                            </p>
                          )}
                          <StepOutputView
                            step={s}
                            allSteps={run.steps}
                            nameById={nameById}
                            lines={lines}
                          />
                          <p className='font-mono text-[10px] text-[#A3A3A3]'>{s.promptRef}</p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isActiveRun(run.status) && (
                  <div className='flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#F97316] p-3 text-xs text-[#C2410C]'>
                    <Loader2 size={14} className='animate-spin' /> Agent kế tiếp đang chạy… (tự cập
                    nhật mỗi 2 giây)
                  </div>
                )}
              </section>

              {run.suggestions.length > 0 && (
                <section className='space-y-2'>
                  <h3 className='text-sm font-bold'>Đề xuất của AI</h3>
                  {run.suggestions.map((sg) => (
                    <SuggestionCard
                      key={sg.id}
                      suggestion={sg}
                      parentStatus={
                        sg.parentSuggestionId
                          ? run.suggestions.find((p) => p.id === sg.parentSuggestionId)?.status
                          : undefined
                      }
                      busy={deciding}
                      nameById={nameById}
                      onDecide={(d, reason) => handleDecide(sg.id, d, reason)}
                    />
                  ))}
                  <p className='text-[11px] text-[#737373]'>
                    Accept chỉ tạo content revision (có liên kết nguồn AI) — không Approve Chapter,
                    không chuyển production stage. Nút quyết định chỉ hiện cho vai trò được phép.
                  </p>
                </section>
              )}

              {run.suggestions.length === 0 && run.status === 'Completed' && !reportOnly && (
                <p
                  className='rounded-xl border border-dashed border-[#A3A3A3] p-3 text-xs text-[#525252]'
                  data-testid='no-suggestions'
                >
                  Run hoàn tất nhưng không tạo đề xuất áp dụng nào
                  {runWorkflow === 'Letterer' ? ' (không có dòng thoại nào cần rút gọn).' : '.'}
                </p>
              )}
            </>
          )}

          {revisions.length > 0 && (
            <section className='rounded-2xl border-[1.5px] border-[#E7E7E7] bg-white p-4'>
              <h3 className='mb-2 flex items-center gap-1 text-sm font-bold'>
                <History size={14} /> Lịch sử revision của Scene (append-only)
              </h3>
              <ul className='space-y-1 text-xs'>
                {revisions.map((r) => (
                  <li
                    key={r.id}
                    className='flex flex-wrap items-center gap-2 rounded border border-[#E7E7E7] p-1.5'
                  >
                    <span
                      className={`rounded px-1.5 text-[10px] font-bold text-white ${REVISION_STYLE[r.kind] ?? 'bg-[#171717]'}`}
                    >
                      {r.kind} v{r.versionNumber}
                    </span>
                    <span className='min-w-0 flex-1 truncate'>{r.summary}</span>
                    <span className='font-mono text-[10px] text-[#737373]'>
                      {r.sourceSuggestionId ? `AI ${r.sourceSuggestionId.slice(0, 8)}` : 'baseline'}{' '}
                      · {r.contentHash.slice(0, 8)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </PageContainer>
  );
};
