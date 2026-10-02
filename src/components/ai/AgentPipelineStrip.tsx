import React from 'react';
import {
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileEdit,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  MinusCircle,
  RotateCcw,
  Scissors,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { AiAgentName, AiRunDto, workflowOf } from '../../services/aiAgents.service';
import {
  AGENT_META,
  AGENTS,
  AgentNodeState,
  WORKFLOW_META,
  agentNodeStates,
  decisionOf,
} from './aiViewUtils';

const ICONS: Record<AiAgentName, React.ElementType> = {
  Supervisor: Brain,
  Writer: FileEdit,
  Continuity: ShieldCheck,
  Storyboard: LayoutTemplate,
  Artist: ImageIcon,
  Letterer: Scissors,
  Editor: ClipboardCheck,
  Producer: TrendingUp,
};

const STATE_LABEL: Record<AgentNodeState, string> = {
  idle: 'Chưa chạy',
  running: 'Đang chạy…',
  done: 'Xong',
  failed: 'Lỗi',
  skipped: 'Không chạy',
  notInWorkflow: 'Không thuộc nhiệm vụ này',
};

/**
 * Gemini (Supervisor) ở trên điều phối các agent chuyên môn theo role. Hiển thị ĐỦ 7 agent; mỗi nhiệm vụ chỉ chạy tập agent riêng
 * (agent không thuộc nhiệm vụ được làm mờ). Vòng sửa Writer ↔ Continuity hiện ở thẻ Continuity khi nhiệm vụ có Writer.
 */
export const AgentPipelineStrip: React.FC<{ run: AiRunDto | null }> = ({ run }) => {
  const states = agentNodeStates(run);
  const workflow = workflowOf(run);
  const stoppedAtLoop = run?.status === 'WaitingForHuman';
  const hasLoop = workflow === 'FullScene' || workflow === 'Script';

  const supervisorSteps = run?.steps.filter((s) => s.agent === 'Supervisor') ?? [];
  const lastDecision = [...supervisorSteps].reverse().map(decisionOf).find(Boolean) ?? null;
  const overridden = supervisorSteps.filter((s) => decisionOf(s)?.guardrailOverridden).length;
  const sState = states.Supervisor;
  const SupIcon = ICONS.Supervisor;

  return (
    <div className='space-y-0' aria-label='Pipeline AI Multi-Agent'>
      {/* ── Supervisor: Gemini điều phối (không phải ProducerAgent) ── */}
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl border-[1.5px] border-[#171717] p-3 text-white ${
          sState === 'running' ? 'bg-[#2B2B2B] ring-2 ring-[#F97316]' : 'bg-[#171717]'
        }`}
      >
        <span className='flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#171717]'>
          <SupIcon size={18} />
        </span>
        <div className='min-w-0'>
          <div className='flex items-center gap-2 text-sm font-bold leading-tight'>
            Supervisor
            <span className='rounded bg-[#F97316] px-1.5 py-0.5 text-[10px] font-bold'>
              {run?.provider === 'Mock' ? 'Mock' : (run?.model ?? 'Gemini')}
            </span>
            {run && (
              <span className='rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold'>
                nhiệm vụ: {WORKFLOW_META[workflow].short}
              </span>
            )}
          </div>
          <div className='text-[11px] text-[#D4D4D4]'>
            Điều phối các agent theo role · chỉ chọn trong hàng rào do code tính cho từng nhiệm vụ ·
            không viết nội dung, không Approve
          </div>
        </div>
        <div className='ml-auto flex items-center gap-2 text-[11px] font-semibold'>
          {sState === 'running' && <Loader2 size={12} className='animate-spin text-[#F97316]' />}
          {sState === 'failed' && <XCircle size={12} className='text-red-400' />}
          <span>
            {sState === 'running'
              ? 'Đang quyết định bước kế tiếp…'
              : `${supervisorSteps.length} quyết định`}
          </span>
          {overridden > 0 && (
            <span className='rounded bg-amber-400 px-1.5 py-0.5 text-[10px] text-[#171717]'>
              {overridden} bị guardrail ghi đè
            </span>
          )}
        </div>
        {lastDecision && (
          <div className='w-full truncate text-[11px] text-[#D4D4D4]'>
            Quyết định gần nhất: <b className='text-white'>→ {lastDecision.action}</b> —{' '}
            {lastDecision.reason}
          </div>
        )}
      </div>
      <div className='flex justify-around px-8'>
        {AGENTS.map((a) => (
          <div
            key={a}
            className={`h-3 w-[2px] ${states[a] === 'notInWorkflow' ? 'bg-[#E7E7E7]' : 'bg-[#171717]'}`}
          />
        ))}
      </div>

      {/* ── Bảy agent chuyên môn ── */}
      <div className='grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7'>
        {AGENTS.map((agent) => {
          const Icon = ICONS[agent];
          const state = states[agent];
          const meta = AGENT_META[agent];
          const count = run?.steps.filter((s) => s.agent === agent).length ?? 0;
          const muted = state === 'idle' || state === 'skipped' || state === 'notInWorkflow';
          return (
            <div
              key={agent}
              data-agent={agent}
              data-state={state}
              className={`flex flex-col gap-1 rounded-xl border-[1.5px] p-3 transition-colors ${
                state === 'running'
                  ? 'border-[#171717] bg-[#FFF7ED]'
                  : state === 'done'
                    ? 'border-[#171717] bg-white'
                    : state === 'failed'
                      ? 'border-red-400 bg-red-50'
                      : state === 'notInWorkflow'
                        ? 'border-dashed border-[#E7E7E7] bg-[#FAF8F5] text-[#A3A3A3] opacity-70'
                        : 'border-[#E7E7E7] bg-[#FAF8F5] text-[#A3A3A3]'
              }`}
            >
              <div className='flex items-center gap-2'>
                <span
                  className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white'
                  style={{ backgroundColor: muted ? '#D4D4D4' : meta.accent }}
                >
                  <Icon size={16} />
                </span>
                <div className='min-w-0'>
                  <div className='text-sm font-bold leading-tight'>{meta.label}</div>
                  <div className='text-[10px] leading-tight text-[#737373]'>{meta.role}</div>
                </div>
              </div>
              <div className='flex flex-wrap items-center gap-1'>
                {meta.roles.map((r) => (
                  <span
                    key={r}
                    title={`Agent này hỗ trợ role ${r}`}
                    className='rounded border border-[#E7E7E7] bg-[#FAF8F5] px-1 text-[9px] font-bold uppercase tracking-wide text-[#525252]'
                  >
                    {r}
                  </span>
                ))}
              </div>
              <div className='flex items-center gap-1 text-[11px] font-semibold'>
                {state === 'running' && (
                  <Loader2 size={12} className='animate-spin text-[#F97316]' />
                )}
                {state === 'done' && <CheckCircle2 size={12} className='text-emerald-600' />}
                {state === 'failed' && <XCircle size={12} className='text-red-600' />}
                {(state === 'skipped' || state === 'notInWorkflow') && <MinusCircle size={12} />}
                <span>{STATE_LABEL[state]}</span>
                {count > 1 && <span className='ml-auto font-mono text-[10px]'>{count} lượt</span>}
              </div>
              {agent === 'Continuity' && hasLoop && (
                <div
                  className={`flex items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    stoppedAtLoop
                      ? 'border-red-300 bg-red-50 text-red-700'
                      : run && run.revisionRounds > 0
                        ? 'border-[#8B5CF6] bg-[#F5F3FF] text-[#6D28D9]'
                        : 'border-[#E7E7E7] text-[#A3A3A3]'
                  }`}
                  title='Vòng sửa Writer ↔ Continuity, tối đa 2 lượt (hàng rào của code)'
                >
                  <RotateCcw size={10} />
                  vòng sửa {run ? `${run.revisionRounds}/${run.maxRevisionRounds}` : '0/2'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
