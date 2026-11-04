import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Lock, Sparkles, X } from 'lucide-react';
import {
  AiApiError,
  AiRunDto,
  AiStepDto,
  AiSuggestionDto,
  AiSuggestionKind,
  AiWorkflowAvailability,
  ReadingDirection,
  aiAgentsService,
  isActiveRun,
  latestScriptRevisionId,
} from '@/services/aiAgents.service';
import type { AiWorkflowType } from '@/services/aiAgents.service';
import { StepOutputView } from './StepOutputView';
import { SuggestionCard } from './SuggestionCard';
import { collectLines, formatMs } from './aiViewUtils';
import { aiStreamService } from '@/services/aiStream.service';

export const BRIEF_MAX_LENGTH = 4000;
export const POLL_INTERVAL_MS = 2000;

interface Props {
  seriesId: string;
  chapterId: string;
  sceneId: string;
  /** Nhiệm vụ AI của panel. Bước 1 (Writer) dùng 'Script'. */
  workflowType: AiWorkflowType;
  /** Loại đề xuất mà panel này hiển thị để quyết định. */
  suggestionKind: AiSuggestionKind;
  title: string;
  briefLabel: string;
  briefPlaceholder: string;
  runLabel: string;
  readingDirection: ReadingDirection;
  /** versionVector hiện tại của Chapter. */
  chapterVersion: number;
  /** Bible entry / nhân vật id → tên, để hiển thị người nói và nguồn bằng chứng. */
  nameById: Record<string, string>;
  hasPanels?: boolean;
  panelIds?: string[] | null;
  onClose: () => void;
  /** Tải lại dữ liệu của màn làm việc (script của Scene + versionVector) sau Accept hoặc khi bị 409. */
  onReload: () => void | Promise<void>;
}

interface UiError {
  message: string;
  /** Khoá hẳn nút AI (AI tắt / không khả dụng); soạn tay vẫn bình thường. */
  lockAi: boolean;
}

function toUiError(e: unknown, fallback: string): UiError {
  const err = e as Partial<AiApiError> | undefined;
  const msg = err?.message || fallback;
  switch (err?.code) {
    case 'AI_UNAVAILABLE':
      return {
        message: 'Trợ lý AI tạm thời không khả dụng. Bạn vẫn có thể soạn tay bình thường.',
        lockAi: true,
      };
    case 'AI_DISABLED':
      return {
        message: 'Trợ lý AI đang bị tắt. Bạn vẫn có thể soạn tay bình thường.',
        lockAi: true,
      };
    case 'FORBIDDEN':
      return { message: msg, lockAi: false };
    case 'AI_QUOTA_EXCEEDED':
      return { message: 'Đã hết hạn mức dùng Trợ lý AI. Hãy thử lại sau.', lockAi: false };
    case 'CONFLICT':
      return {
        message:
          'Chương đã thay đổi trong lúc AI chạy. Đã tải lại dữ liệu mới nhất; hãy bấm chạy lại nếu vẫn cần.',
        lockAi: false,
      };
    default:
      if (err?.status === 503) {
        return {
          message: 'Trợ lý AI tạm thời không khả dụng. Bạn vẫn có thể soạn tay bình thường.',
          lockAi: true,
        };
      }
      return { message: msg, lockAi: false };
  }
}

function statusText(run: AiRunDto): { text: string; tone: 'info' | 'warn' | 'ok' | 'error' } {
  switch (run.status) {
    case 'Queued':
      return { text: 'Đang xếp hàng…', tone: 'info' };
    case 'Running':
      return { text: 'Trợ lý AI đang viết…', tone: 'info' };
    case 'WaitingForHuman':
      return { text: 'AI đã dừng: còn lỗi nhất quán cần bạn xử lý', tone: 'warn' };
    case 'Completed':
      return { text: 'Hoàn tất', tone: 'ok' };
    case 'Interrupted':
      return { text: 'Lượt chạy bị gián đoạn. Hãy chạy lại.', tone: 'error' };
    default:
      return { text: run.errorMessage || 'Lượt chạy thất bại.', tone: 'error' };
  }
}

const TONE: Record<'info' | 'warn' | 'ok' | 'error', string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warn: 'border-amber-300 bg-amber-50 text-amber-800',
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  error: 'border-rose-300 bg-rose-50 text-rose-800',
};

const latestStep = (steps: AiStepDto[], agent: AiStepDto['agent']) =>
  [...steps]
    .filter((s) => s.agent === agent && s.status === 'Succeeded' && s.output)
    .sort((a, b) => b.stepIndex - a.stepIndex)[0];

const runKey = (sceneId: string, workflowType: AiWorkflowType) =>
  `ai-run:${sceneId}:${workflowType}`;

// sessionStorage có thể bị chặn (chế độ riêng tư, đầy dung lượng): mọi thao tác đều bọc try/catch
const readStoredRunId = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const storeRunId = (key: string, id: string) => {
  try {
    sessionStorage.setItem(key, id);
  } catch {
    /* bỏ qua */
  }
};
const clearStoredRunId = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
};

export const AiAssistPanel: React.FC<Props> = ({
  seriesId,
  chapterId,
  sceneId,
  workflowType,
  suggestionKind,
  title,
  briefLabel,
  briefPlaceholder,
  runLabel,
  readingDirection,
  chapterVersion,
  nameById,
  hasPanels,
  panelIds,
  onClose,
  onReload,
}) => {
  const [availability, setAvailability] = useState<AiWorkflowAvailability | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [brief, setBrief] = useState('');
  const [run, setRun] = useState<AiRunDto | null>(null);
  const [starting, setStarting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [pollFailed, setPollFailed] = useState(false);
  const [streamDelta, setStreamDelta] = useState<{ agent: string; text: string } | null>(null);
  const [error, setError] = useState<UiError | null>(null);
  const [aiLocked, setAiLocked] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const [serverPending, setServerPending] = useState(false);
  const storageKey = runKey(sceneId, workflowType);

  // Khôi phục khi mở panel: (2) run đã lưu trong sessionStorage, rồi (1) đề xuất Pending của Scene
  useEffect(() => {
    let alive = true;
    const restore = async () => {
      let restored: AiRunDto | null = null;
      const storedId = readStoredRunId(storageKey);
      if (storedId) {
        try {
          restored = await aiAgentsService.getRun(seriesId, storedId);
        } catch (e) {
          const status = (e as AiApiError)?.status;
          // 404/403: run không còn xem được → xoá khoá, không báo lỗi
          if (status === 404 || status === 403) clearStoredRunId(storageKey);
        }
      }
      let latestPending: AiSuggestionDto | undefined;
      try {
        const pending = await aiAgentsService.getSuggestions(seriesId, { status: 'Pending' });
        latestPending = pending
          .filter((s) => s.sceneId === sceneId && s.kind === suggestionKind)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      } catch {
        /* không tải được danh sách thì thôi, không chặn panel */
      }
      if (!restored && latestPending) {
        try {
          restored = await aiAgentsService.getRun(seriesId, latestPending.runId);
        } catch {
          /* bỏ qua */
        }
      }
      if (!alive) return;
      setServerPending(!!latestPending);
      // không ghi đè lượt người dùng vừa bấm chạy trong lúc đang tải
      if (restored) setRun((prev) => prev ?? restored);
    };
    restore();
    return () => {
      alive = false;
    };
  }, [seriesId, sceneId, suggestionKind, storageKey]);

  // (a) khả năng chạy nhiệm vụ trong Scene này
  useEffect(() => {
    let alive = true;
    setLoadingAvail(true);
    aiAgentsService
      .getWorkflowAvailability(seriesId, chapterId, sceneId)
      .then((res) => {
        if (!alive) return;
        setAvailability(res.workflows.find((w) => w.workflowType === workflowType) ?? null);
      })
      .catch((e) => {
        if (!alive) return;
        const ui = toUiError(e, 'Không thể kiểm tra điều kiện chạy Trợ lý AI.');
        setError(ui);
        if (ui.lockAi) setAiLocked(true);
      })
      .finally(() => {
        if (alive) setLoadingAvail(false);
      });
    return () => {
      alive = false;
    };
  }, [seriesId, chapterId, sceneId, workflowType]);

  // (c1) Token Streaming & Realtime Step updates qua SignalR Hub
  useEffect(() => {
    if (!run || !isActiveRun(run.status)) {
      setStreamDelta(null);
      return;
    }

    const currentRunId = run.id;
    aiStreamService.joinRun(currentRunId);

    const unsubToken = aiStreamService.onTokenChunk((e) => {
      if (e.runId.toLowerCase() === currentRunId.toLowerCase()) {
        setStreamDelta((prev) => ({
          agent: e.agent,
          text: (prev && prev.agent === e.agent ? prev.text : '') + e.deltaText,
        }));
      }
    });

    const unsubStep = aiStreamService.onStepRecorded(async (e) => {
      if (e.runId.toLowerCase() === currentRunId.toLowerCase()) {
        setStreamDelta(null);
        try {
          const next = await aiAgentsService.getRun(seriesId, currentRunId);
          setRun(next);
        } catch {
          // ignore error, will be picked up by polling
        }
      }
    });

    const unsubStatus = aiStreamService.onRunStatusChanged(async (e) => {
      if (e.runId.toLowerCase() === currentRunId.toLowerCase()) {
        setStreamDelta(null);
        try {
          const next = await aiAgentsService.getRun(seriesId, currentRunId);
          setRun(next);
        } catch {
          // ignore
        }
      }
    });

    return () => {
      aiStreamService.leaveRun(currentRunId);
      unsubToken();
      unsubStep();
      unsubStatus();
    };
  }, [run?.id, run?.status, seriesId]);

  // (c) polling mỗi 2 giây tới khi run không còn Queued/Running (Safety-net fallback)
  useEffect(() => {
    if (!run || pollFailed || !isActiveRun(run.status)) return;
    const timer = setTimeout(async () => {
      try {
        setRun(await aiAgentsService.getRun(seriesId, run.id));
      } catch (e) {
        setPollFailed(true);
        setError(toUiError(e, 'Không thể tải trạng thái lượt chạy.'));
      }
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [run, pollFailed, seriesId]);

  const running = !!run && isActiveRun(run.status) && !pollFailed;
  const runHasPending =
    !!run && run.suggestions.some((s) => s.kind === suggestionKind && s.status === 'Pending');
  // có run đang hiển thị thì dựa vào run đó (cập nhật sau Accept/Reject); chưa có thì dựa vào server
  const hasPending = run ? runHasPending : serverPending;

  // Xoá khoá khi run kết thúc mà không còn đề xuất Pending
  useEffect(() => {
    if (run && !isActiveRun(run.status) && !runHasPending) {
      if (readStoredRunId(storageKey) === run.id) clearStoredRunId(storageKey);
    }
  }, [run, runHasPending, storageKey]);

  const canRun = availability?.canRun === true;
  const briefTrim = brief.trim();
  const runDisabled = loadingAvail || !canRun || aiLocked || starting || running || !briefTrim;

  // (b) chạy nhiệm vụ
  const handleRun = async () => {
    setError(null);
    setStarting(true);
    setPollFailed(false);
    try {
      const revisions = await aiAgentsService.getSceneRevisions(seriesId, sceneId);
      const started = await aiAgentsService.runWorkflow(seriesId, {
        workflowType,
        chapterId,
        sceneId,
        brief: briefTrim,
        readingDirection,
        chapterVersion,
        baseScriptRevisionId: latestScriptRevisionId(revisions),
        panelIds: panelIds && panelIds.length > 0 ? panelIds : undefined,
      });
      storeRunId(storageKey, started.runId);
      setRun(await aiAgentsService.getRun(seriesId, started.runId));
    } catch (e) {
      const ui = toUiError(e, 'Không thể chạy Trợ lý AI.');
      setError(ui);
      if (ui.lockAi) setAiLocked(true);
      // 409: tải lại dữ liệu mới nhất, KHÔNG tự gửi lại
      if ((e as AiApiError)?.code === 'CONFLICT' || (e as AiApiError)?.status === 409) {
        await onReload();
      }
    } finally {
      setStarting(false);
    }
  };

  // (e)(f) quyết định đề xuất
  const handleDecide = async (
    s: AiSuggestionDto,
    decision: 'accept' | 'reject' | 'request-changes',
    reason?: string,
  ) => {
    if (decision === 'request-changes' && !reason?.trim()) return;
    setDeciding(true);
    setError(null);
    try {
      await aiAgentsService.review(seriesId, s.id, decision, { reason, chapterVersion });
      if (run) setRun(await aiAgentsService.getRun(seriesId, run.id));
      if (decision === 'accept') await onReload();
    } catch (e) {
      setError(toUiError(e, 'Không thể ghi quyết định.'));
      if ((e as AiApiError)?.code === 'CONFLICT' || (e as AiApiError)?.status === 409) {
        await onReload();
      }
    } finally {
      setDeciding(false);
    }
  };

  const steps = useMemo(() => run?.steps ?? [], [run]);
  const lines = useMemo(() => collectLines(steps, nameById), [steps, nameById]);
  const draftStep = latestStep(steps, 'Writer');
  const continuityStep = latestStep(steps, 'Continuity');
  const storyboardStep = latestStep(steps, 'Storyboard');
  const suggestions = (run?.suggestions ?? []).filter((s) => s.kind === suggestionKind);
  const status = run ? statusText(run) : null;

  const toggleTech = useCallback(() => setShowTech((v) => !v), []);

  // Nhấn Esc để đóng panel (không phụ thuộc vào việc nút X có bị che hay không)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Render ở cấp <body> với z-index cao hơn thanh header của AppShell: trước đây header che mất nút đóng ở góc trên panel
  return createPortal(
    <aside
      data-testid='ai-assist-panel'
      aria-label={title}
      className='fixed inset-y-0 right-0 z-[100] flex w-full max-w-md flex-col border-l border-[#E7E7E7] bg-white shadow-2xl'
    >
      <div className='flex items-center justify-between border-b border-[#E7E7E7] px-4 py-3'>
        <div className='flex items-center gap-2'>
          <Sparkles className='h-4 w-4 text-orange-600' />
          <h2 className='text-sm font-bold text-[#171717]'>{title}</h2>
        </div>
        <button
          type='button'
          onClick={onClose}
          aria-label='Đóng Trợ lý AI'
          className='rounded p-1 text-zinc-400 hover:text-zinc-700'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
        {error && (
          <div
            role='alert'
            data-testid='ai-error'
            className='flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800'
          >
            <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            <span className='whitespace-pre-line'>{error.message}</span>
          </div>
        )}

        {!loadingAvail && availability && !availability.canRun && (
          <div
            data-testid='ai-missing'
            className='rounded-lg border border-[#E7E7E7] bg-[#FAF8F5] p-2.5 text-xs text-[#525252]'
          >
            <div className='mb-1 flex items-center gap-1.5 font-semibold'>
              <Lock className='h-3.5 w-3.5' /> Chưa thể chạy Trợ lý AI
            </div>
            <ul className='list-disc space-y-0.5 pl-4'>
              {availability.missing.map((m) => (
                <li key={m.code}>{m.message}</li>
              ))}
            </ul>
          </div>
        )}

        {workflowType === 'Storyboard' && hasPanels && (
          <div
            data-testid='ai-storyboard-has-panels-banner'
            className='flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900'
          >
            <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600' />
            <div>
              <p className='font-semibold'>Phân cảnh này đã có khung tranh (panel)</p>
              <p className='mt-0.5 text-[11px] text-amber-800 leading-relaxed'>
                Đề xuất phân khung Storyboard chỉ có thể áp dụng cho phân cảnh chưa có khung tranh. Để chia lại dòng kịch bản cho các khung có sẵn, vui lòng mở màn <strong>Bàn vẽ & Khung trang</strong> (Artist Desk) và dùng tính năng <strong>Tự động phân bổ kịch bản</strong>.
              </p>
            </div>
          </div>
        )}

        {hasPending && (
          <div
            data-testid='ai-pending-banner'
            className='flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-800'
          >
            <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
            <span>Có đề xuất chưa duyệt</span>
          </div>
        )}

        <div>
          <label htmlFor='ai-brief' className='mb-1 block text-xs font-semibold text-zinc-700'>
            {briefLabel}
          </label>
          <textarea
            id='ai-brief'
            rows={5}
            maxLength={BRIEF_MAX_LENGTH}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={briefPlaceholder}
            disabled={running}
            className='w-full resize-none rounded-xl border border-[#E7E7E7] bg-white px-3 py-2 text-xs outline-none focus:border-orange-500 disabled:bg-zinc-100'
          />
          <div className='mt-1 flex items-center justify-between'>
            <span className='font-mono text-[10px] text-zinc-400'>
              {brief.length}/{BRIEF_MAX_LENGTH}
            </span>
            <button
              type='button'
              data-testid='ai-run-btn'
              onClick={handleRun}
              disabled={runDisabled}
              className='inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {starting || running ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Sparkles className='h-3.5 w-3.5' />
              )}
              {runLabel}
            </button>
          </div>
        </div>

        {status && (
          <div
            data-testid='ai-status'
            className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-semibold ${TONE[status.tone]}`}
          >
            {running && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
            <span className='whitespace-pre-line'>{status.text}</span>
          </div>
        )}

        {streamDelta && running && (
          <div
            data-testid='ai-live-stream'
            className='rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-950 shadow-xs'
          >
            <div className='flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-indigo-600 mb-1.5'>
              <Sparkles className='h-3.5 w-3.5 animate-pulse text-indigo-500' />
              <span>{streamDelta.agent} đang soạn thảo trực tiếp...</span>
            </div>
            <div className='whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 bg-white/80 p-2.5 rounded border border-indigo-100 max-h-48 overflow-y-auto'>
              {streamDelta.text}
              <span className='inline-block w-1.5 h-3.5 ml-0.5 bg-indigo-600 animate-pulse align-middle' />
            </div>
          </div>
        )}

        {draftStep && (
          <section data-testid='ai-draft'>
            <h3 className='mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
              Bản nháp script
            </h3>
            <StepOutputView step={draftStep} allSteps={steps} nameById={nameById} lines={lines} />
          </section>
        )}

        {continuityStep && (
          <section data-testid='ai-continuity'>
            <h3 className='mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
              Đối chiếu với Series Bible
            </h3>
            <StepOutputView
              step={continuityStep}
              allSteps={steps}
              nameById={nameById}
              lines={lines}
            />
          </section>
        )}

        {storyboardStep && (
          <section data-testid='ai-storyboard'>
            <h3 className='mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
              Bố cục Storyboard (Phân khung)
            </h3>
            <StepOutputView
              step={storyboardStep}
              allSteps={steps}
              nameById={nameById}
              lines={lines}
            />
          </section>
        )}

        {suggestions.length > 0 && (
          <section data-testid='ai-suggestions' className='space-y-2'>
            <h3 className='text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
              Đề xuất
            </h3>
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                seriesId={seriesId}
                // chỉ cho quyết định khi BE xác nhận canDecide = true
                suggestion={{ ...s, canDecide: s.canDecide === true }}
                busy={deciding}
                nameById={nameById}
                hasPanels={hasPanels}
                onDecide={(decision, reason) => handleDecide(s, decision, reason)}
              />
            ))}
          </section>
        )}

        {steps.length > 0 && (
          <section>
            <button
              type='button'
              onClick={toggleTech}
              className='flex items-center gap-1 text-[11px] font-semibold text-[#525252] hover:text-[#171717]'
            >
              {showTech ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Chi tiết kỹ thuật
            </button>
            {showTech && (
              <ul
                data-testid='ai-tech-details'
                className='mt-1.5 space-y-1 rounded-lg bg-[#FAF8F5] p-2 font-mono text-[10px] text-[#525252]'
              >
                {steps.map((s) => (
                  <li key={s.id}>
                    #{s.stepIndex} {s.agent === 'Supervisor' ? 'Điều phối' : s.agent} · {s.provider}
                    /{s.model} · {s.promptVersion} · {formatMs(s.durationMs)}
                    {s.promptTokens != null || s.completionTokens != null
                      ? ` · token ${s.promptTokens ?? 0}/${s.completionTokens ?? 0}`
                      : ''}
                    {s.status === 'Failed' ? ` · lỗi ${s.errorCode ?? ''}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </aside>,
    document.body,
  );
};
