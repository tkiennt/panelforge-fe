import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clapperboard,
  FileText,
  LayoutTemplate,
  Loader2,
  Lock,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AiApiError,
  AiRunDto,
  AiStepDto,
  AiSuggestionDto,
  AiSuggestionKind,
  AiWorkflowAvailability,
  ReadingDirection,
  SupervisorDecision,
  aiAgentsService,
  createsScriptVersionOnAccept,
  isActiveRun,
  latestScriptRevisionId,
} from '@/services/aiAgents.service';
import { SCRIPT_WORKING_COPY_CHANGED_EVENT } from '@/services/scriptLine.service';
import type { AiWorkflowType } from '@/services/aiAgents.service';
import { translate, useTranslation } from '@/lib/i18n';
import { StepOutputView } from './StepOutputView';
import { SuggestionCard } from './SuggestionCard';
import { collectLines, formatMs, toAiReadingDirection } from './aiViewUtils';
import { aiStreamService } from '@/services/aiStream.service';

export const BRIEF_MAX_LENGTH = 4000;
export const POLL_INTERVAL_MS = 2000;

export interface AiScriptCharacterOption {
  id: string;
  name: string;
}

export interface AiScriptDraftContext {
  sceneTitle: string;
  sceneSummary?: string | null;
  onOpenScenes?: () => void;
  hasStoryArc?: boolean;
  hasChapterOutline?: boolean;
  chapterOutline?: string | null;
  bibleEntryCount?: number;
  sceneLineCount?: number;
  linkedPanelLineCount?: number;
  bibleCharacters?: AiScriptCharacterOption[];
  onOpenNarrative?: (tab?: 'outline' | 'storyArc') => void;
  onOpenBible?: () => void;
  onOpenStoryboard?: () => void;
}

export interface ScriptBriefFields {
  freeBrief: string;
  sceneGoal: string;
  tone: string;
  desiredLength: string;
  characterNames: string[];
  mustInclude: string;
  mustAvoid: string;
}

export interface ScriptBriefLabels {
  sceneGoal: string;
  tone: string;
  desiredLength: string;
  characters: string;
  mustInclude: string;
  mustAvoid: string;
  notes: string;
}

function composeScriptBrief(fields: ScriptBriefFields, labels: ScriptBriefLabels): string {
  const sections: string[] = [];
  const goal = fields.sceneGoal.trim();
  const tone = fields.tone.trim();
  const length = fields.desiredLength.trim();
  const chars = fields.characterNames.map((n) => n.trim()).filter(Boolean);
  const include = fields.mustInclude.trim();
  const avoid = fields.mustAvoid.trim();
  const free = fields.freeBrief.trim();

  if (goal) sections.push(`${labels.sceneGoal}: ${goal}`);
  if (tone) sections.push(`${labels.tone}: ${tone}`);
  if (length) sections.push(`${labels.desiredLength}: ${length}`);
  if (chars.length > 0) sections.push(`${labels.characters}: ${chars.join(', ')}`);
  if (include) sections.push(`${labels.mustInclude}: ${include}`);
  if (avoid) sections.push(`${labels.mustAvoid}: ${avoid}`);

  if (sections.length === 0) return free;
  if (free) sections.push(`${labels.notes}: ${free}`);
  return sections.join('\n');
}

type ProgressStageState = 'done' | 'active' | 'pending';

function getScriptProgressStages(
  run: AiRunDto,
  steps: AiStepDto[],
  hasScriptSuggestion: boolean,
): {
  writing: ProgressStageState;
  checkingBible: ProgressStageState;
  readyForReview: ProgressStageState;
} {
  if (!isActiveRun(run.status)) {
    return {
      writing: 'done',
      checkingBible: 'done',
      readyForReview: hasScriptSuggestion ? 'done' : 'active',
    };
  }
  const lastWriterIdx = steps
    .filter((s) => s.agent === 'Writer' && s.status === 'Succeeded')
    .reduce((max, s) => Math.max(max, s.stepIndex), -1);
  const lastContinuityIdx = steps
    .filter((s) => s.agent === 'Continuity' && s.status === 'Succeeded')
    .reduce((max, s) => Math.max(max, s.stepIndex), -1);

  if (lastWriterIdx < 0) {
    return { writing: 'active', checkingBible: 'pending', readyForReview: 'pending' };
  }
  if (lastWriterIdx > lastContinuityIdx) {
    return { writing: 'done', checkingBible: 'active', readyForReview: 'pending' };
  }
  const latestSupervisorAfterContinuity = [...steps]
    .filter((s) => s.agent === 'Supervisor' && s.stepIndex > lastContinuityIdx)
    .sort((a, b) => b.stepIndex - a.stepIndex)[0];
  const supervisorAction = (
    latestSupervisorAfterContinuity?.output as SupervisorDecision | undefined
  )?.action;
  if (supervisorAction === 'Writer') {
    return { writing: 'active', checkingBible: 'pending', readyForReview: 'pending' };
  }
  return { writing: 'done', checkingBible: 'done', readyForReview: 'active' };
}

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
  readingDirection: ReadingDirection | number;
  /** versionVector hiện tại của Chapter. */
  chapterVersion: number;
  /** Bible entry / nhân vật id → tên, để hiển thị người nói và nguồn bằng chứng. */
  nameById: Record<string, string>;
  hasPanels?: boolean;
  panelIds?: string[] | null;
  /** Ngữ cảnh tuỳ chọn chỉ dùng khi workflowType === 'Script'. */
  scriptContext?: AiScriptDraftContext;
  onClose: () => void;
  /** Tải lại dữ liệu của màn làm việc (working copy + expectedRevisionId + versionVector) sau Accept hoặc khi bị 409. */
  onReload: (acceptedKind?: AiSuggestionKind) => void | Promise<void>;
  /** Báo đề xuất Script đang chờ để màn hình hiện thay đổi trên trang script. */
  onScriptPreview?: (suggestion: AiSuggestionDto | null) => void;
}

interface UiError {
  message: string;
  /** Khoá hẳn nút AI (AI tắt / không khả dụng); soạn tay vẫn bình thường. */
  lockAi: boolean;
}

function extractServerMessage(e: unknown): string {
  const resData = (
    e as {
      response?: {
        data?: string | { error?: unknown; message?: unknown; detail?: unknown };
      };
    }
  )?.response?.data;
  if (typeof resData === 'string' && resData.trim()) return resData.trim();
  if (resData && typeof resData === 'object') {
    for (const candidate of [resData.error, resData.message, resData.detail]) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
  }
  const rawMsg = (e as Partial<AiApiError> | undefined)?.message;
  if (typeof rawMsg === 'string') {
    const trimmed = rawMsg.trim();
    if (trimmed && !/^Request failed with status code \d+$/i.test(trimmed)) {
      return trimmed;
    }
  }
  return '';
}

function toUiError(e: unknown, fallback: string): UiError {
  const err = e as
    | (Partial<AiApiError> & { response?: { status?: number; data?: { code?: string } } })
    | undefined;
  const status = err?.status ?? err?.response?.status;
  const code = err?.code ?? err?.response?.data?.code;
  const serverMsg = extractServerMessage(e);
  const msg =
    serverMsg ||
    (status === 403 || code === 'FORBIDDEN'
      ? translate('features.aiAgents.assist.errors.forbidden')
      : fallback);
  switch (code) {
    case 'AI_UNAVAILABLE':
      return {
        message: translate('features.aiAgents.assist.errors.aiUnavailable'),
        lockAi: true,
      };
    case 'AI_DISABLED':
      return {
        message: translate('features.aiAgents.assist.errors.aiDisabled'),
        lockAi: true,
      };
    case 'FORBIDDEN':
      return { message: msg, lockAi: false };
    case 'AI_QUOTA_EXCEEDED':
      return {
        message: translate('features.aiAgents.assist.errors.quotaExceeded'),
        lockAi: false,
      };
    case 'CONFLICT':
      return { message: msg, lockAi: false };
    default:
      if (status === 503) {
        return {
          message: translate('features.aiAgents.assist.errors.aiUnavailable'),
          lockAi: true,
        };
      }
      if (status === 403) {
        return { message: msg, lockAi: false };
      }
      return { message: msg, lockAi: false };
  }
}

function statusText(run: AiRunDto): { text: string; tone: 'info' | 'warn' | 'ok' | 'error' } {
  switch (run.status) {
    case 'Queued':
      return { text: translate('features.aiAgents.assist.status.queued'), tone: 'info' };
    case 'Running':
      return { text: translate('features.aiAgents.assist.status.running'), tone: 'info' };
    case 'WaitingForHuman':
      return {
        text: translate('features.aiAgents.assist.status.waitingForHuman'),
        tone: 'warn',
      };
    case 'Completed':
      return { text: translate('features.aiAgents.assist.status.completed'), tone: 'ok' };
    case 'Interrupted':
      return { text: translate('features.aiAgents.assist.status.interrupted'), tone: 'error' };
    default:
      return {
        text: run.errorMessage || translate('features.aiAgents.assist.status.failed'),
        tone: 'error',
      };
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
  scriptContext,
  onClose,
  onReload,
  onScriptPreview,
}) => {
  const { t } = useTranslation('production');
  const { t: tf } = useTranslation('features');
  const isScriptWorkflow = workflowType === 'Script';

  const [availability, setAvailability] = useState<AiWorkflowAvailability | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [brief, setBrief] = useState('');
  const [run, setRun] = useState<AiRunDto | null>(null);
  const [starting, setStarting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [pollFailed, setPollFailed] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
  const [aiLocked, setAiLocked] = useState(false);
  const [showTech, setShowTech] = useState(false);
  const [serverPending, setServerPending] = useState(false);
  const [scriptAccepted, setScriptAccepted] = useState(false);

  // Script-only UI states (unused when workflowType !== 'Script')
  const [showContext, setShowContext] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [confirmOutlineOverwrite, setConfirmOutlineOverwrite] = useState(false);
  const [sceneGoal, setSceneGoal] = useState('');
  const [tone, setTone] = useState('');
  const [desiredLength, setDesiredLength] = useState('');
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [mustInclude, setMustInclude] = useState('');
  const [mustAvoid, setMustAvoid] = useState('');

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
        const ui = toUiError(e, tf('aiAgents.assist.errors.checkAvailFailed'));
        setError(ui);
        if (ui.lockAi) setAiLocked(true);
      })
      .finally(() => {
        if (alive) setLoadingAvail(false);
      });
    return () => {
      alive = false;
    };
  }, [seriesId, chapterId, sceneId, workflowType, tf]);

  const activeRunId = run && isActiveRun(run.status) ? run.id : null;

  // (c1) Realtime Step & RunStatus updates qua SignalR Hub
  useEffect(() => {
    if (!activeRunId) return;

    aiStreamService.joinRun(activeRunId);

    const unsubStep = aiStreamService.onStepRecorded(async (e) => {
      if (e.runId.toLowerCase() === activeRunId.toLowerCase()) {
        try {
          const next = await aiAgentsService.getRun(seriesId, activeRunId);
          setRun(next);
        } catch {
          // ignore error, will be picked up by polling
        }
      }
    });

    const unsubStatus = aiStreamService.onRunStatusChanged(async (e) => {
      if (e.runId.toLowerCase() === activeRunId.toLowerCase()) {
        try {
          const next = await aiAgentsService.getRun(seriesId, activeRunId);
          setRun(next);
        } catch {
          // ignore
        }
      }
    });

    return () => {
      aiStreamService.leaveRun(activeRunId);
      unsubStep();
      unsubStatus();
    };
  }, [activeRunId, seriesId]);

  // (c) polling mỗi 2 giây tới khi run không còn Queued/Running (Safety-net fallback)
  useEffect(() => {
    if (!run || pollFailed || !isActiveRun(run.status)) return;
    const timer = setTimeout(async () => {
      try {
        setRun(await aiAgentsService.getRun(seriesId, run.id));
      } catch (e) {
        setPollFailed(true);
        setError(toUiError(e, tf('aiAgents.assist.errors.pollFailed')));
      }
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [run, pollFailed, seriesId, tf]);

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

  const briefLabels = useMemo<ScriptBriefLabels>(
    () => ({
      sceneGoal: t('scriptStudio.aiPanel.fieldSceneGoal'),
      tone: t('scriptStudio.aiPanel.fieldTone'),
      desiredLength: t('scriptStudio.aiPanel.fieldDesiredLength'),
      characters: t('scriptStudio.aiPanel.fieldCharacters'),
      mustInclude: t('scriptStudio.aiPanel.fieldMustInclude'),
      mustAvoid: t('scriptStudio.aiPanel.fieldMustAvoid'),
      notes: t('scriptStudio.aiPanel.composedNotesLabel'),
    }),
    [t],
  );

  const selectedCharNames = useMemo(() => {
    if (!isScriptWorkflow || selectedCharIds.length === 0) return [];
    const byId = new Map((scriptContext?.bibleCharacters ?? []).map((c) => [c.id, c.name]));
    return selectedCharIds.map((id) => byId.get(id) ?? nameById[id] ?? '').filter(Boolean);
  }, [isScriptWorkflow, selectedCharIds, scriptContext?.bibleCharacters, nameById]);

  const desiredLengthLabel = desiredLength
    ? t(`scriptStudio.aiPanel.lengthOptions.${desiredLength}`)
    : '';

  const composedScriptBrief = useMemo(
    () =>
      composeScriptBrief(
        {
          freeBrief: brief,
          sceneGoal,
          tone,
          desiredLength: desiredLengthLabel,
          characterNames: selectedCharNames,
          mustInclude,
          mustAvoid,
        },
        briefLabels,
      ),
    [
      brief,
      sceneGoal,
      tone,
      desiredLengthLabel,
      selectedCharNames,
      mustInclude,
      mustAvoid,
      briefLabels,
    ],
  );

  const finalBrief = isScriptWorkflow ? composedScriptBrief : briefTrim;
  const briefCount = isScriptWorkflow ? finalBrief.length : brief.length;
  const isBriefTooLong = isScriptWorkflow && finalBrief.length > BRIEF_MAX_LENGTH;
  const linkedPanelLineCount = isScriptWorkflow ? (scriptContext?.linkedPanelLineCount ?? 0) : 0;
  const hasLinkedPanelLines = linkedPanelLineCount > 0;
  const existingSceneLineCount = isScriptWorkflow ? (scriptContext?.sceneLineCount ?? 0) : 0;

  const activeOptionalCount =
    (sceneGoal.trim() ? 1 : 0) +
    (tone.trim() ? 1 : 0) +
    (desiredLength ? 1 : 0) +
    (selectedCharIds.length > 0 ? 1 : 0) +
    (mustInclude.trim() ? 1 : 0) +
    (mustAvoid.trim() ? 1 : 0);

  const runDisabled =
    loadingAvail ||
    !canRun ||
    aiLocked ||
    starting ||
    running ||
    !finalBrief ||
    isBriefTooLong ||
    hasLinkedPanelLines;

  // (b) chạy nhiệm vụ
  const executeRun = async (runBrief: string, revisionOfSuggestionId?: string) => {
    if (!runBrief || runBrief.length > BRIEF_MAX_LENGTH || hasLinkedPanelLines) return;
    setError(null);
    setStarting(true);
    setPollFailed(false);
    setScriptAccepted(false);
    try {
      const revisions = await aiAgentsService.getSceneRevisions(seriesId, sceneId);
      const started = await aiAgentsService.runWorkflow(seriesId, {
        workflowType,
        chapterId,
        sceneId,
        brief: runBrief,
        readingDirection: toAiReadingDirection(readingDirection),
        chapterVersion,
        baseScriptRevisionId: latestScriptRevisionId(revisions),
        panelIds: panelIds && panelIds.length > 0 ? panelIds : undefined,
        ...(revisionOfSuggestionId ? { revisionOfSuggestionId } : {}),
      });
      storeRunId(storageKey, started.runId);
      setRun(await aiAgentsService.getRun(seriesId, started.runId));
    } catch (e) {
      const ui = toUiError(e, tf('aiAgents.assist.errors.runFailed'));
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

  const handleRun = () => executeRun(finalBrief);

  const chapterOutlineText = scriptContext?.chapterOutline?.trim() ?? '';

  const handleFillFromOutline = () => {
    if (!chapterOutlineText) return;
    if (brief.trim()) {
      setConfirmOutlineOverwrite(true);
      return;
    }
    setBrief(chapterOutlineText);
    setConfirmOutlineOverwrite(false);
  };

  const handleConfirmOverwrite = () => {
    if (!chapterOutlineText) return;
    setBrief(chapterOutlineText);
    setConfirmOutlineOverwrite(false);
  };

  const scriptTemplates = useMemo(
    () => [
      {
        id: 'opening',
        label: t('scriptStudio.aiPanel.templates.opening.label'),
        goal: t('scriptStudio.aiPanel.templates.opening.goal'),
        tone: t('scriptStudio.aiPanel.templates.opening.tone'),
        length: 'medium',
        brief: t('scriptStudio.aiPanel.templates.opening.brief'),
      },
      {
        id: 'confrontation',
        label: t('scriptStudio.aiPanel.templates.confrontation.label'),
        goal: t('scriptStudio.aiPanel.templates.confrontation.goal'),
        tone: t('scriptStudio.aiPanel.templates.confrontation.tone'),
        length: 'medium',
        brief: t('scriptStudio.aiPanel.templates.confrontation.brief'),
      },
      {
        id: 'action',
        label: t('scriptStudio.aiPanel.templates.action.label'),
        goal: t('scriptStudio.aiPanel.templates.action.goal'),
        tone: t('scriptStudio.aiPanel.templates.action.tone'),
        length: 'short',
        brief: t('scriptStudio.aiPanel.templates.action.brief'),
      },
      {
        id: 'quiet',
        label: t('scriptStudio.aiPanel.templates.quiet.label'),
        goal: t('scriptStudio.aiPanel.templates.quiet.goal'),
        tone: t('scriptStudio.aiPanel.templates.quiet.tone'),
        length: 'short',
        brief: t('scriptStudio.aiPanel.templates.quiet.brief'),
      },
    ],
    [t],
  );

  const applyTemplate = (tpl: (typeof scriptTemplates)[number]) => {
    setBrief(tpl.brief);
    setSceneGoal(tpl.goal);
    setTone(tpl.tone);
    setDesiredLength(tpl.length);
    setConfirmOutlineOverwrite(false);
  };

  const toggleCharacter = (id: string) => {
    setSelectedCharIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSingleLineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
    }
  };

  const handleBriefKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      if (!runDisabled) void handleRun();
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
      if (decision === 'accept' && s.kind === 'Script') {
        setScriptAccepted(true);
      }
      if (run) setRun(await aiAgentsService.getRun(seriesId, run.id));
      if (decision === 'accept') {
        if (createsScriptVersionOnAccept(s.kind) && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent(SCRIPT_WORKING_COPY_CHANGED_EVENT, {
              detail: { chapterId, sceneId: s.sceneId, source: 'ai-accept', kind: s.kind },
            }),
          );
        }
        await onReload(s.kind);
      }
    } catch (e) {
      // 403 (ngoài phạm vi được giao dù canDecide theo role = true): hiện đúng message Backend, giữ đề xuất Pending, không tự gửi lại
      setError(toUiError(e, tf('aiAgents.assist.errors.decideFailed')));
      const status =
        (e as AiApiError)?.status ?? (e as { response?: { status?: number } })?.response?.status;
      if ((e as AiApiError)?.code === 'CONFLICT' || status === 409) {
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
  const pendingScript =
    suggestions.find((s) => s.kind === 'Script' && s.status === 'Pending') ?? null;
  const pendingScriptId = pendingScript?.id;
  const pendingScriptRef = useRef(pendingScript);
  pendingScriptRef.current = pendingScript;
  useEffect(() => {
    onScriptPreview?.(pendingScriptRef.current);
    return () => onScriptPreview?.(null);
  }, [pendingScriptId, onScriptPreview]);
  const latestSuggestion = useMemo(
    () =>
      [...suggestions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ??
      suggestions[suggestions.length - 1],
    [suggestions],
  );
  const latestChangesReason = useMemo(() => {
    if (latestSuggestion?.status !== 'ChangesRequested') return '';
    const rawDecisions = (latestSuggestion.decisions ?? []) as unknown as Array<
      Record<string, unknown>
    >;
    const matched = rawDecisions.filter((d) => {
      const val = String(d.decision ?? d.type ?? d.status ?? '').toLowerCase();
      return val.includes('change') || val === 'request-changes';
    });
    const pool = matched.length > 0 ? matched : rawDecisions;
    const withIndexed = pool.map((d, idx) => ({
      d,
      idx,
      ts: String(d.createdAt ?? d.decidedAt ?? d.createdAtUtc ?? d.decidedAtUtc ?? ''),
    }));
    withIndexed.sort((a, b) => {
      if (a.ts && b.ts && a.ts !== b.ts) return b.ts.localeCompare(a.ts);
      return b.idx - a.idx;
    });
    const reason = withIndexed[0]?.d?.reason;
    return typeof reason === 'string' ? reason.trim() : '';
  }, [latestSuggestion]);
  const rerunBrief = finalBrief || latestChangesReason;
  const showRerunChanges =
    !loadingAvail && canRun && !aiLocked && latestSuggestion?.status === 'ChangesRequested';
  const rerunDisabled =
    starting ||
    running ||
    !rerunBrief ||
    rerunBrief.length > BRIEF_MAX_LENGTH ||
    hasLinkedPanelLines;
  const status = run ? statusText(run) : null;
  const scriptProgressStages =
    isScriptWorkflow && run ? getScriptProgressStages(run, steps, suggestions.length > 0) : null;

  const hasContextInfo =
    isScriptWorkflow &&
    !!scriptContext &&
    (scriptContext.hasStoryArc !== undefined ||
      scriptContext.hasChapterOutline !== undefined ||
      scriptContext.bibleEntryCount !== undefined ||
      scriptContext.sceneLineCount !== undefined);

  const hasAcceptedScript =
    scriptAccepted ||
    (!runHasPending && suggestions.some((s) => s.kind === 'Script' && s.status === 'Accepted'));
  const showNextStoryboard =
    isScriptWorkflow && Boolean(scriptContext?.onOpenStoryboard) && hasAcceptedScript;

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
          aria-label={tf('aiAgents.assist.closeAria')}
          className='rounded p-1 text-zinc-400 hover:text-zinc-700'
        >
          <X className='h-4 w-4' />
        </button>
      </div>

      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
        {isScriptWorkflow && scriptContext?.sceneTitle && (
          <section
            data-testid='ai-script-scene-header'
            className='rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] p-3 text-xs'
          >
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <div className='flex items-center gap-1.5 text-[11px] font-semibold text-[#525252]'>
                  <Clapperboard className='h-3.5 w-3.5 shrink-0 text-orange-600' />
                  <span className='truncate'>
                    {t('scriptStudio.aiPanel.writingFor')}:{' '}
                    <strong className='text-[#171717]'>{scriptContext.sceneTitle}</strong>
                  </span>
                </div>
                {scriptContext.sceneSummary?.trim() && (
                  <p className='mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#525252]'>
                    {scriptContext.sceneSummary.trim()}
                  </p>
                )}
              </div>
              {scriptContext.onOpenScenes && (
                <button
                  type='button'
                  data-testid='ai-open-scenes-btn'
                  onClick={scriptContext.onOpenScenes}
                  className='shrink-0 rounded-lg border border-[#E7E7E7] bg-white px-2 py-1 text-[11px] font-semibold text-[#171717] hover:bg-stone-50'
                >
                  {t('scriptStudio.aiPanel.changeScene')}
                </button>
              )}
            </div>
          </section>
        )}

        {hasContextInfo && scriptContext && (
          <section
            data-testid='ai-script-context'
            className='rounded-xl border border-[#E7E7E7] bg-white p-2.5 text-xs'
          >
            <button
              type='button'
              onClick={() => setShowContext((v) => !v)}
              aria-expanded={showContext}
              className='flex w-full items-center justify-between text-[11px] font-semibold text-[#525252] hover:text-[#171717]'
            >
              <span>{t('scriptStudio.aiPanel.basedOn')}</span>
              {showContext ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            {showContext && (
              <ul className='mt-2 space-y-1.5 text-[11px]'>
                {scriptContext.hasStoryArc !== undefined && (
                  <li className='flex items-center justify-between gap-2'>
                    <span className='text-[#525252]'>{t('scriptStudio.aiPanel.storyArc')}</span>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          scriptContext.hasStoryArc
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {scriptContext.hasStoryArc
                          ? t('scriptStudio.aiPanel.statusPresent')
                          : t('scriptStudio.aiPanel.statusMissing')}
                      </span>
                      {!scriptContext.hasStoryArc && scriptContext.onOpenNarrative && (
                        <button
                          type='button'
                          onClick={() => scriptContext.onOpenNarrative?.('storyArc')}
                          className='text-[10px] font-semibold text-orange-600 hover:underline'
                        >
                          {t('scriptStudio.aiPanel.openNarrative')}
                        </button>
                      )}
                    </div>
                  </li>
                )}

                {scriptContext.hasChapterOutline !== undefined && (
                  <li className='flex items-center justify-between gap-2'>
                    <span className='text-[#525252]'>
                      {t('scriptStudio.aiPanel.chapterOutline')}
                    </span>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          scriptContext.hasChapterOutline
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {scriptContext.hasChapterOutline
                          ? t('scriptStudio.aiPanel.statusPresent')
                          : t('scriptStudio.aiPanel.statusMissing')}
                      </span>
                      {!scriptContext.hasChapterOutline && scriptContext.onOpenNarrative && (
                        <button
                          type='button'
                          onClick={() => scriptContext.onOpenNarrative?.('outline')}
                          className='text-[10px] font-semibold text-orange-600 hover:underline'
                        >
                          {t('scriptStudio.aiPanel.openNarrative')}
                        </button>
                      )}
                    </div>
                  </li>
                )}

                {scriptContext.bibleEntryCount !== undefined && (
                  <li className='flex items-center justify-between gap-2'>
                    <span className='text-[#525252]'>{t('scriptStudio.aiPanel.bibleEntries')}</span>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          scriptContext.bibleEntryCount > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {scriptContext.bibleEntryCount > 0
                          ? t('scriptStudio.aiPanel.bibleCount', {
                              count: scriptContext.bibleEntryCount,
                            })
                          : t('scriptStudio.aiPanel.statusMissing')}
                      </span>
                      {scriptContext.bibleEntryCount === 0 && scriptContext.onOpenBible && (
                        <button
                          type='button'
                          onClick={scriptContext.onOpenBible}
                          className='text-[10px] font-semibold text-orange-600 hover:underline'
                        >
                          {t('scriptStudio.aiPanel.openBible')}
                        </button>
                      )}
                    </div>
                  </li>
                )}

                {scriptContext.sceneLineCount !== undefined && (
                  <li className='flex items-center justify-between gap-2'>
                    <span className='text-[#525252]'>{t('scriptStudio.aiPanel.sceneLines')}</span>
                    <span className='rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#525252]'>
                      {scriptContext.sceneLineCount > 0
                        ? t('scriptStudio.aiPanel.sceneLinesCount', {
                            count: scriptContext.sceneLineCount,
                          })
                        : t('scriptStudio.aiPanel.sceneLinesEmpty')}
                    </span>
                  </li>
                )}
              </ul>
            )}
          </section>
        )}

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
              <Lock className='h-3.5 w-3.5' /> {tf('aiAgents.assist.cannotRunTitle')}
            </div>
            <ul className='list-disc space-y-0.5 pl-4'>
              {availability.missing.map((m) => (
                <li key={m.code}>{m.message}</li>
              ))}
            </ul>
          </div>
        )}

        {isScriptWorkflow && hasLinkedPanelLines && (
          <div
            role='alert'
            data-testid='ai-script-linked-panels-warning'
            className='flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800'
          >
            <Lock className='mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600' />
            <span>
              {t('scriptStudio.aiPanel.linkedPanelsWarning', { count: linkedPanelLineCount })}
            </span>
          </div>
        )}

        {isScriptWorkflow && !hasLinkedPanelLines && existingSceneLineCount > 0 && (
          <div
            data-testid='ai-script-replace-warning'
            className='flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900'
          >
            <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600' />
            <span>
              {t('scriptStudio.aiPanel.replaceWarning', { count: existingSceneLineCount })}
            </span>
          </div>
        )}

        {workflowType === 'Storyboard' && hasPanels && (
          <div
            data-testid='ai-storyboard-has-panels-banner'
            className='flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900'
          >
            <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600' />
            <div>
              <p className='font-semibold'>{tf('aiAgents.assist.storyboardHasPanelsTitle')}</p>
              <p className='mt-0.5 text-[11px] text-amber-800 leading-relaxed'>
                {tf('aiAgents.assist.storyboardHasPanelsDescPrefix')}{' '}
                <strong>{tf('aiAgents.assist.artistDesk')}</strong> {tf('aiAgents.assist.andUse')}{' '}
                <strong>{tf('aiAgents.assist.autoAllocateScript')}</strong>.
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
            <span>{tf('aiAgents.assist.pendingBanner')}</span>
          </div>
        )}

        <div className='space-y-2.5'>
          <div className='flex items-center justify-between gap-2'>
            <label htmlFor='ai-brief' className='block text-xs font-semibold text-zinc-700'>
              {briefLabel}
            </label>
            {isScriptWorkflow && scriptContext && (
              <button
                type='button'
                data-testid='ai-fill-outline-btn'
                onClick={handleFillFromOutline}
                disabled={running || !chapterOutlineText}
                title={
                  chapterOutlineText
                    ? t('scriptStudio.aiPanel.fillFromOutline')
                    : t('scriptStudio.aiPanel.fillFromOutlineEmpty')
                }
                className='inline-flex items-center gap-1 rounded-lg border border-[#E7E7E7] bg-[#FAF8F5] px-2 py-1 text-[11px] font-semibold text-[#171717] hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50'
              >
                <FileText className='h-3 w-3 text-orange-600' />
                {t('scriptStudio.aiPanel.fillFromOutline')}
              </button>
            )}
          </div>

          {isScriptWorkflow && confirmOutlineOverwrite && (
            <div
              data-testid='ai-confirm-overwrite'
              className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900'
            >
              <span>{t('scriptStudio.aiPanel.confirmOverwritePrompt')}</span>
              <div className='flex items-center gap-1.5'>
                <button
                  type='button'
                  data-testid='ai-confirm-overwrite-yes'
                  onClick={handleConfirmOverwrite}
                  className='rounded-md bg-orange-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-orange-700'
                >
                  {t('scriptStudio.aiPanel.confirmOverwriteYes')}
                </button>
                <button
                  type='button'
                  data-testid='ai-confirm-overwrite-cancel'
                  onClick={() => setConfirmOutlineOverwrite(false)}
                  className='rounded-md border border-[#E7E7E7] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#525252] hover:bg-stone-50'
                >
                  {t('scriptStudio.aiPanel.confirmOverwriteCancel')}
                </button>
              </div>
            </div>
          )}

          {isScriptWorkflow && (
            <div data-testid='ai-script-templates' className='flex flex-wrap items-center gap-1.5'>
              <span className='text-[10px] font-semibold text-[#737373]'>
                {t('scriptStudio.aiPanel.templatesLabel')}:
              </span>
              {scriptTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type='button'
                  data-testid={`ai-template-${tpl.id}`}
                  disabled={running}
                  onClick={() => applyTemplate(tpl)}
                  className='rounded-full border border-[#E7E7E7] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-medium text-[#525252] transition-colors hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          )}

          <textarea
            id='ai-brief'
            rows={5}
            maxLength={BRIEF_MAX_LENGTH}
            value={brief}
            onChange={(e) => {
              setBrief(e.target.value);
              if (confirmOutlineOverwrite) setConfirmOutlineOverwrite(false);
            }}
            onKeyDown={handleBriefKeyDown}
            placeholder={briefPlaceholder}
            disabled={running}
            aria-invalid={isBriefTooLong}
            className='w-full resize-none rounded-xl border border-[#E7E7E7] bg-white px-3 py-2 text-xs outline-none focus:border-orange-500 disabled:bg-zinc-100'
          />

          {isScriptWorkflow && (
            <div className='rounded-xl border border-[#E7E7E7] bg-[#FAF8F5] p-2.5'>
              <button
                type='button'
                data-testid='ai-script-options-toggle'
                onClick={() => setShowOptions((v) => !v)}
                aria-expanded={showOptions}
                className='flex w-full items-center justify-between text-[11px] font-semibold text-[#525252] hover:text-[#171717]'
              >
                <span className='inline-flex items-center gap-1.5'>
                  <SlidersHorizontal className='h-3.5 w-3.5 text-orange-600' />
                  {t('scriptStudio.aiPanel.optionsToggle')}
                  {activeOptionalCount > 0 && (
                    <span className='rounded-full bg-orange-100 px-1.5 py-0.2 text-[10px] font-bold text-orange-700'>
                      {t('scriptStudio.aiPanel.optionsActiveCount', {
                        count: activeOptionalCount,
                      })}
                    </span>
                  )}
                </span>
                {showOptions ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {showOptions && (
                <div data-testid='ai-script-options-fields' className='mt-2.5 space-y-2.5'>
                  <div>
                    <label
                      htmlFor='ai-script-goal'
                      className='mb-1 block text-[11px] font-semibold text-[#525252]'
                    >
                      {t('scriptStudio.aiPanel.fieldSceneGoal')}
                    </label>
                    <input
                      id='ai-script-goal'
                      type='text'
                      value={sceneGoal}
                      onChange={(e) => setSceneGoal(e.target.value)}
                      onKeyDown={handleSingleLineKeyDown}
                      disabled={running}
                      placeholder={t('scriptStudio.aiPanel.fieldSceneGoalPlaceholder')}
                      className='w-full rounded-lg border border-[#E7E7E7] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-orange-500 disabled:bg-zinc-100'
                    />
                  </div>

                  <div className='grid grid-cols-2 gap-2'>
                    <div>
                      <label
                        htmlFor='ai-script-tone'
                        className='mb-1 block text-[11px] font-semibold text-[#525252]'
                      >
                        {t('scriptStudio.aiPanel.fieldTone')}
                      </label>
                      <input
                        id='ai-script-tone'
                        type='text'
                        list='ai-script-tone-presets'
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        onKeyDown={handleSingleLineKeyDown}
                        disabled={running}
                        placeholder={t('scriptStudio.aiPanel.fieldTonePlaceholder')}
                        className='w-full rounded-lg border border-[#E7E7E7] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-orange-500 disabled:bg-zinc-100'
                      />
                      <datalist id='ai-script-tone-presets'>
                        <option value={t('scriptStudio.aiPanel.tonePresets.tense')} />
                        <option value={t('scriptStudio.aiPanel.tonePresets.humorous')} />
                        <option value={t('scriptStudio.aiPanel.tonePresets.calm')} />
                        <option value={t('scriptStudio.aiPanel.tonePresets.dramatic')} />
                        <option value={t('scriptStudio.aiPanel.tonePresets.warm')} />
                      </datalist>
                    </div>

                    <div>
                      <label
                        htmlFor='ai-script-length'
                        className='mb-1 block text-[11px] font-semibold text-[#525252]'
                      >
                        {t('scriptStudio.aiPanel.fieldDesiredLength')}
                      </label>
                      <select
                        id='ai-script-length'
                        value={desiredLength}
                        onChange={(e) => setDesiredLength(e.target.value)}
                        disabled={running}
                        className='w-full rounded-lg border border-[#E7E7E7] bg-white px-2 py-1.5 text-xs outline-none focus:border-orange-500 disabled:bg-zinc-100'
                      >
                        <option value=''>{t('scriptStudio.aiPanel.lengthOptions.default')}</option>
                        <option value='short'>
                          {t('scriptStudio.aiPanel.lengthOptions.short')}
                        </option>
                        <option value='medium'>
                          {t('scriptStudio.aiPanel.lengthOptions.medium')}
                        </option>
                        <option value='long'>{t('scriptStudio.aiPanel.lengthOptions.long')}</option>
                      </select>
                    </div>
                  </div>

                  <fieldset>
                    <legend className='mb-1 text-[11px] font-semibold text-[#525252]'>
                      {t('scriptStudio.aiPanel.fieldCharacters')}
                    </legend>
                    {scriptContext?.bibleCharacters && scriptContext.bibleCharacters.length > 0 ? (
                      <div className='flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-[#E7E7E7] bg-white p-1.5'>
                        {scriptContext.bibleCharacters.map((char) => {
                          const checked = selectedCharIds.includes(char.id);
                          return (
                            <label
                              key={char.id}
                              className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition-colors ${
                                checked
                                  ? 'border-orange-400 bg-orange-50 font-semibold text-orange-800'
                                  : 'border-[#E7E7E7] bg-[#FAF8F5] text-[#525252] hover:bg-stone-100'
                              }`}
                            >
                              <input
                                type='checkbox'
                                checked={checked}
                                disabled={running}
                                onChange={() => toggleCharacter(char.id)}
                                className='h-3 w-3 accent-orange-600'
                              />
                              <span>{char.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className='flex items-center justify-between rounded-lg border border-dashed border-[#E7E7E7] bg-white px-2.5 py-1.5 text-[11px] text-[#737373]'>
                        <span>{t('scriptStudio.aiPanel.fieldCharactersEmpty')}</span>
                        {scriptContext?.onOpenBible && (
                          <button
                            type='button'
                            onClick={scriptContext.onOpenBible}
                            className='font-semibold text-orange-600 hover:underline'
                          >
                            {t('scriptStudio.aiPanel.openBible')}
                          </button>
                        )}
                      </div>
                    )}
                  </fieldset>

                  <div>
                    <label
                      htmlFor='ai-script-must-include'
                      className='mb-1 block text-[11px] font-semibold text-[#525252]'
                    >
                      {t('scriptStudio.aiPanel.fieldMustInclude')}
                    </label>
                    <input
                      id='ai-script-must-include'
                      type='text'
                      value={mustInclude}
                      onChange={(e) => setMustInclude(e.target.value)}
                      onKeyDown={handleSingleLineKeyDown}
                      disabled={running}
                      placeholder={t('scriptStudio.aiPanel.fieldMustIncludePlaceholder')}
                      className='w-full rounded-lg border border-[#E7E7E7] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-orange-500 disabled:bg-zinc-100'
                    />
                  </div>

                  <div>
                    <label
                      htmlFor='ai-script-must-avoid'
                      className='mb-1 block text-[11px] font-semibold text-[#525252]'
                    >
                      {t('scriptStudio.aiPanel.fieldMustAvoid')}
                    </label>
                    <input
                      id='ai-script-must-avoid'
                      type='text'
                      value={mustAvoid}
                      onChange={(e) => setMustAvoid(e.target.value)}
                      onKeyDown={handleSingleLineKeyDown}
                      disabled={running}
                      placeholder={t('scriptStudio.aiPanel.fieldMustAvoidPlaceholder')}
                      className='w-full rounded-lg border border-[#E7E7E7] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-orange-500 disabled:bg-zinc-100'
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {isBriefTooLong && (
            <div
              role='alert'
              data-testid='ai-brief-overflow'
              className='flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 p-2 text-[11px] text-rose-800'
            >
              <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
              <span>
                {t('scriptStudio.aiPanel.briefOverflow', {
                  current: briefCount,
                  max: BRIEF_MAX_LENGTH,
                })}
              </span>
            </div>
          )}

          <div className='mt-1 flex items-center justify-between gap-2'>
            <span
              data-testid='ai-brief-counter'
              className={`font-mono text-[10px] ${
                isBriefTooLong ? 'font-semibold text-rose-600' : 'text-zinc-400'
              }`}
            >
              {briefCount}/{BRIEF_MAX_LENGTH}
            </span>
            <div className='flex items-center gap-2'>
              {showRerunChanges && latestSuggestion && (
                <button
                  type='button'
                  data-testid='ai-rerun-changes-btn'
                  onClick={() => executeRun(rerunBrief, latestSuggestion.id)}
                  disabled={rerunDisabled}
                  className='inline-flex items-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-all hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {starting || running ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <Sparkles className='h-3.5 w-3.5' />
                  )}
                  {tf('aiAgents.assist.rerunChanges')}
                </button>
              )}
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
        </div>

        {status &&
          (isScriptWorkflow && running && scriptProgressStages ? (
            <div
              data-testid='ai-status'
              className='rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-900'
            >
              <ol data-testid='ai-script-progress' className='grid grid-cols-3 gap-1.5 text-[11px]'>
                {(
                  [
                    {
                      key: 'writing',
                      label: t('scriptStudio.aiPanel.progress.writing'),
                      state: scriptProgressStages.writing,
                    },
                    {
                      key: 'checkingBible',
                      label: t('scriptStudio.aiPanel.progress.checkingBible'),
                      state: scriptProgressStages.checkingBible,
                    },
                    {
                      key: 'readyForReview',
                      label: t('scriptStudio.aiPanel.progress.readyForReview'),
                      state: scriptProgressStages.readyForReview,
                    },
                  ] as const
                ).map((stage) => (
                  <li
                    key={stage.key}
                    data-stage={stage.key}
                    data-stage-state={stage.state}
                    className={`flex items-center gap-1 rounded-md border px-1.5 py-1 ${
                      stage.state === 'done'
                        ? 'border-emerald-200 bg-emerald-50 font-semibold text-emerald-800'
                        : stage.state === 'active'
                          ? 'border-sky-300 bg-white font-semibold text-sky-800'
                          : 'border-sky-100 bg-sky-50/60 text-sky-600/80'
                    }`}
                  >
                    {stage.state === 'done' ? (
                      <CheckCircle2 className='h-3 w-3 shrink-0 text-emerald-600' />
                    ) : stage.state === 'active' ? (
                      <Loader2 className='h-3 w-3 shrink-0 animate-spin text-sky-600' />
                    ) : (
                      <span className='h-2 w-2 shrink-0 rounded-full bg-sky-300' />
                    )}
                    <span className='truncate'>{stage.label}</span>
                  </li>
                ))}
              </ol>
              {run?.status === 'Queued' && (
                <div className='mt-1.5 text-[10px] text-sky-700'>
                  {t('scriptStudio.aiPanel.progress.queued')}
                </div>
              )}
            </div>
          ) : (
            <div
              data-testid='ai-status'
              className={`flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs font-semibold ${TONE[status.tone]}`}
            >
              <div className='flex items-center gap-2'>
                {running && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                <span className='whitespace-pre-line'>{status.text}</span>
              </div>
              {isScriptWorkflow && run?.status === 'Completed' && runHasPending && (
                <span className='shrink-0 rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700'>
                  {t('scriptStudio.aiPanel.progress.readyForReview')}
                </span>
              )}
            </div>
          ))}

        {showNextStoryboard && scriptContext?.onOpenStoryboard && (
          <section
            data-testid='ai-script-next-storyboard'
            className='rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900'
          >
            <div className='flex items-center gap-1.5 font-bold text-emerald-800'>
              <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
              <span>{t('scriptStudio.aiPanel.nextStepTitle')}</span>
            </div>
            <p className='mt-1 text-[11px] leading-relaxed text-emerald-800'>
              {t('scriptStudio.aiPanel.nextStepDesc')}
            </p>
            <button
              type='button'
              data-testid='ai-open-storyboard-next-btn'
              onClick={scriptContext.onOpenStoryboard}
              className='mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800'
            >
              <LayoutTemplate className='h-3.5 w-3.5' />
              {t('scriptStudio.aiPanel.nextStepStoryboard')}
            </button>
          </section>
        )}

        {draftStep && (
          <section data-testid='ai-draft'>
            <h3 className='mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
              {tf('aiAgents.assist.draftSection')}
            </h3>
            <StepOutputView step={draftStep} allSteps={steps} nameById={nameById} lines={lines} />
          </section>
        )}

        {continuityStep && (
          <section data-testid='ai-continuity'>
            <h3 className='mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
              {tf('aiAgents.assist.continuitySection')}
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
              {tf('aiAgents.assist.storyboardSection')}
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
              {tf('aiAgents.assist.suggestionsSection')}
            </h3>
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                seriesId={seriesId}
                // chỉ cho quyết định / áp dụng khi BE xác nhận canDecide / canAccept = true
                suggestion={{
                  ...s,
                  canDecide: s.canDecide === true,
                  canAccept: s.canAccept === true,
                }}
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
              {tf('aiAgents.assist.techDetails')}
            </button>
            {showTech && (
              <ul
                data-testid='ai-tech-details'
                className='mt-1.5 space-y-1 rounded-lg bg-[#FAF8F5] p-2 font-mono text-[10px] text-[#525252]'
              >
                {steps.map((s) => (
                  <li key={s.id}>
                    #{s.stepIndex}{' '}
                    {s.agent === 'Supervisor' ? tf('aiAgents.assist.coordinatorAgent') : s.agent} ·{' '}
                    {s.provider}/{s.model} · {s.promptVersion} · {formatMs(s.durationMs)}
                    {s.promptTokens != null || s.completionTokens != null
                      ? ` · token ${s.promptTokens ?? 0}/${s.completionTokens ?? 0}`
                      : ''}
                    {s.status === 'Failed'
                      ? ` · ${tf('aiAgents.assist.errorCode', { code: s.errorCode ?? '' })}`
                      : ''}
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
