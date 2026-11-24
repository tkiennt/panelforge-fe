import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { AlertTriangle, Brain, CheckCircle2, Code2, Quote } from 'lucide-react';
import {
  AiStepDto,
  ArtistPromptSet,
  ContinuityReport,
  LetteringSuggestionSet,
  ProductionReport,
  ReviewReport,
  ScriptDraft,
  StoryboardLayout,
  SupervisorDecision,
  previousWriterStep,
} from '@/services/aiAgents.service';
import { LayoutPreview } from './LayoutPreview';
import {
  ArtistPromptsView,
  LetteringDiffView,
  ProductionReportView,
  ReviewReportView,
} from './AgentOutputViews';
import { LineInfo, SEVERITY_STYLE } from './aiViewUtils';

interface Props {
  step: AiStepDto;
  allSteps: AiStepDto[];
  nameById: Record<string, string>;
  lines: Record<string, LineInfo>;
}

const ScriptView: React.FC<Props> = ({ step, allSteps, nameById }) => {
  const { t } = useTranslation('features');
  const draft = step.output as ScriptDraft;
  const prev = previousWriterStep(allSteps, step)?.output as ScriptDraft | undefined;
  const prevByOrder = new Map((prev?.lines ?? []).map((l) => [l.order, l]));
  const textOf = (l: { dialogue?: string | null; stageDirection?: string | null }) =>
    `${l.dialogue ?? ''}|${l.stageDirection ?? ''}`;

  return (
    <div className='space-y-2'>
      {draft.revisionNotes && (
        <div className='rounded-lg border border-[#FDBA74] bg-[#FFF7ED] p-2 text-xs text-[#9A3412]'>
          <b>{t('aiAgents.stepOutput.revisionNotes')}</b> {draft.revisionNotes}
        </div>
      )}
      <ol className='space-y-1'>
        {draft.lines.map((l) => {
          const old = prevByOrder.get(l.order);
          const changed = !!old && textOf(old) !== textOf(l);
          return (
            <li
              key={l.lineId}
              className={`rounded-lg border p-2 text-xs ${
                changed ? 'border-[#F59E0B] bg-[#FFFBEB]' : 'border-[#E7E7E7] bg-white'
              }`}
            >
              <div className='flex items-start gap-2'>
                <span className='mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#171717] text-[10px] font-bold text-white'>
                  {l.order}
                </span>
                <div className='min-w-0 flex-1'>
                  {l.speakerId && (
                    <span className='mr-1 rounded bg-[#F5F3FF] px-1.5 py-0.5 text-[10px] font-bold text-[#6D28D9]'>
                      {nameById[l.speakerId] ?? t('aiAgents.stepOutput.characterFallback')}
                    </span>
                  )}
                  {l.dialogue && <span className='font-medium'>“{l.dialogue}”</span>}
                  {l.stageDirection && (
                    <div className='mt-0.5 italic text-[#525252]'>({l.stageDirection})</div>
                  )}
                  {changed && (
                    <div className='mt-1 rounded bg-white/70 p-1 text-[11px] text-[#92400E]'>
                      <span className='mr-1 rounded bg-[#F59E0B] px-1 text-[10px] font-bold text-white'>
                        {t('aiAgents.stepOutput.editedBadge')}
                      </span>
                      <span className='line-through opacity-70'>
                        {old?.dialogue ? `“${old.dialogue}” ` : ''}
                        {old?.stageDirection ? `(${old.stageDirection})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const ContinuityView: React.FC<Props> = ({ step, nameById, lines }) => {
  const { t } = useTranslation('features');
  const report = step.output as ContinuityReport;
  return (
    <div className='space-y-2'>
      <div
        className={`flex items-center gap-2 rounded-lg border p-2 text-xs font-semibold ${
          report.findings.length === 0
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-red-300 bg-red-50 text-red-700'
        }`}
      >
        {report.findings.length === 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        {report.summary ||
          (report.findings.length === 0
            ? t('aiAgents.stepOutput.noConflicts')
            : t('aiAgents.stepOutput.hasConflicts'))}
      </div>
      {report.findings.map((f) => (
        <div
          key={f.findingId}
          className='rounded-lg border-[1.5px] border-[#171717] bg-white p-3 text-xs'
        >
          <div className='flex flex-wrap items-center gap-2'>
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${SEVERITY_STYLE[f.severity] ?? ''}`}
            >
              {f.severity}
            </span>
            <span className='rounded bg-[#EAE6DF] px-1.5 py-0.5 text-[10px] font-semibold'>
              {f.category}
            </span>
            <span className='font-mono text-[10px] text-[#737373]'>{f.findingId}</span>
          </div>
          <p className='mt-1 font-semibold'>{f.description}</p>

          <div className='mt-2 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
            {t('aiAgents.stepOutput.relatedScriptLines')}
          </div>
          {f.scriptLineIds.map((id) => (
            <div key={id} className='mt-1 rounded border border-[#FDBA74] bg-[#FFF7ED] p-1.5'>
              <b>{t('aiAgents.stepOutput.lineOrder', { order: lines[id]?.order ?? '?' })}</b>
              {lines[id]?.speaker ? ` · ${lines[id]?.speaker}` : ''}: {lines[id]?.text}
            </div>
          ))}

          <div className='mt-2 text-[11px] font-bold uppercase tracking-wide text-[#737373]'>
            {t('aiAgents.stepOutput.bibleEvidence')}
          </div>
          {f.evidence.map((e) => (
            <div
              key={e.bibleRevisionId}
              className='mt-1 flex gap-1.5 rounded border border-[#DDD6FE] bg-[#F5F3FF] p-1.5 text-[#4C1D95]'
            >
              <Quote size={12} className='mt-0.5 shrink-0' />
              <div>
                “{e.quote}”
                <div className='font-mono text-[10px] opacity-70'>
                  {nameById[e.bibleEntryId] ?? 'Bible entry'} · revision{' '}
                  {e.bibleRevisionId.slice(0, 8)}
                </div>
              </div>
            </div>
          ))}
          {f.suggestedFix && (
            <p className='mt-2 text-[#065F46]'>
              <b>{t('aiAgents.stepOutput.suggestedFix')}</b> {f.suggestedFix}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

const SupervisorView: React.FC<Props> = ({ step }) => {
  const { t } = useTranslation('features');
  const d = step.output as SupervisorDecision;
  return (
    <div className='space-y-2 text-xs'>
      <div className='flex flex-wrap items-center gap-2 rounded-lg bg-[#171717] p-2 text-white'>
        <Brain size={14} />
        <span>{t('aiAgents.stepOutput.supervisorChose')}</span>
        <span className='rounded bg-[#F97316] px-2 py-0.5 text-[11px] font-bold'>→ {d.action}</span>
        {d.guardrailOverridden && (
          <span className='rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[#171717]'>
            {t('aiAgents.stepOutput.guardrailOverridden')}
          </span>
        )}
      </div>
      <p>
        <b>{t('aiAgents.stepOutput.reasonLabel')}</b> {d.reason}
      </p>
      {d.instruction && (
        <div className='rounded border border-[#FDBA74] bg-[#FFF7ED] p-2 text-[#9A3412]'>
          <b>{t('aiAgents.stepOutput.nextAgentInstruction')}</b> {d.instruction}
        </div>
      )}
      <div className='flex flex-wrap items-center gap-1'>
        <span className='text-[10px] font-bold uppercase tracking-wide text-[#737373]'>
          {t('aiAgents.stepOutput.allowedActionsLabel')}
        </span>
        {d.allowedActions.map((a) => (
          <span
            key={a}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
              a === d.action
                ? 'border-[#171717] bg-[#171717] text-white'
                : 'border-[#E7E7E7] bg-white text-[#525252]'
            }`}
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Hiển thị output có cấu trúc của một step, theo từng agent; có nút xem JSON gốc (provenance). */
export const StepOutputView: React.FC<Props> = (props) => {
  const { t } = useTranslation('features');
  const { step } = props;
  const [raw, setRaw] = useState(false);

  if (step.status === 'Failed') {
    return (
      <div className='rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700'>
        <b>{step.errorCode}</b>
        <p className='mt-1'>{step.errorMessage}</p>
      </div>
    );
  }
  if (!step.output) return null;

  return (
    <div>
      {step.agent === 'Supervisor' && <SupervisorView {...props} />}
      {step.agent === 'Writer' && <ScriptView {...props} />}
      {step.agent === 'Continuity' && <ContinuityView {...props} />}
      {step.agent === 'Storyboard' && (
        <LayoutPreview
          layout={step.output as StoryboardLayout}
          lines={props.lines}
          nameById={props.nameById}
        />
      )}
      {step.agent === 'Editor' && <ReviewReportView report={step.output as ReviewReport} />}
      {step.agent === 'Artist' && (
        <ArtistPromptsView set={step.output as ArtistPromptSet} nameById={props.nameById} />
      )}
      {step.agent === 'Letterer' && (
        <LetteringDiffView set={step.output as LetteringSuggestionSet} />
      )}
      {step.agent === 'Producer' && (
        <ProductionReportView report={step.output as ProductionReport} />
      )}

      <button
        type='button'
        onClick={() => setRaw((v) => !v)}
        className='mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#525252] hover:text-[#171717]'
      >
        <Code2 size={12} />{' '}
        {raw ? t('aiAgents.stepOutput.hideRawJson') : t('aiAgents.stepOutput.showRawJson')}
      </button>
      {raw && (
        <pre className='mt-1 max-h-72 overflow-auto rounded bg-[#171717] p-2 text-[10px] text-[#E5E5E5]'>
          {JSON.stringify({ input: step.input, output: step.output }, null, 2)}
        </pre>
      )}
    </div>
  );
};
