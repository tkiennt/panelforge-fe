// src/shared/features/pipeline-board/DependencyGraphModal.tsx
import React, { useRef } from 'react';
import {
  Network,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Info,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

export interface GraphNodeItem {
  id: string;
  brief: string;
  status: string | number;
  stageName?: string;
  assigneeName?: string;
  contextText?: string;
  isCurrent?: boolean;
}

export interface DependencyGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTask: {
    title: string;
    stageName?: string;
    contextText?: string;
    assigneeName?: string;
    isCreating?: boolean;
  };
  dependencies: GraphNodeItem[];
}

export const DependencyGraphModal: React.FC<DependencyGraphModalProps> = ({
  isOpen,
  onClose,
  targetTask,
  dependencies,
}) => {
  const { t } = useTranslation('pipeline');
  const modalRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const isApproved = (status: string | number) => String(status).toLowerCase() === 'approved';

  const approvedCount = dependencies.filter((d) => isApproved(d.status)).length;
  const pendingCount = dependencies.length - approvedCount;

  const modalContent = (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeLabel={t('dependencyGraph.closeLabel')}
      size='lg'
      title={t('dependencyGraph.title')}
    >
      <div
        ref={modalRef}
        className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden'
      >
        {/* Header */}
        <div className='p-5 border-b border-[#D8D2C5] bg-[#F3F0E9] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#F97316] shadow-2xs'>
              <Network className='w-5 h-5' aria-hidden='true' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='px-2 py-0.5 rounded bg-[#1C1917] text-white font-mono text-xs font-bold'>
                  DAG VISUALIZER
                </span>
                <span className='text-xs text-stone-500 font-mono'>
                  {t('dependencyGraph.subtitle')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend & Stats Banner */}
        <div className='px-6 py-3 bg-[#FAF8F5] border-b border-[#E7E5E4] flex flex-wrap items-center justify-between gap-3 text-xs'>
          <div className='flex items-center gap-4 flex-wrap'>
            <span className='font-semibold text-stone-700'>{t('dependencyGraph.legend')}</span>
            <div className='flex items-center gap-1.5 text-emerald-800'>
              <span className='w-2.5 h-2.5 rounded-full bg-emerald-500'></span>
              <span>{t('dependencyGraph.legendApproved')}</span>
            </div>
            <div className='flex items-center gap-1.5 text-amber-800'>
              <span className='w-2.5 h-2.5 rounded-full bg-amber-500'></span>
              <span>{t('dependencyGraph.legendPending')}</span>
            </div>
            <div className='flex items-center gap-1.5 text-orange-800'>
              <span className='w-2.5 h-2.5 rounded-full bg-[#F97316] ring-2 ring-orange-200'></span>
              <span>
                {t('dependencyGraph.legendTarget', {
                  state: targetTask.isCreating
                    ? t('dependencyGraph.stateCreating')
                    : t('dependencyGraph.stateCurrent'),
                })}
              </span>
            </div>
          </div>

          <div className='text-xs font-mono text-stone-600'>
            {dependencies.length === 0 ? (
              <span className='text-stone-400 italic'>
                {t('dependencyGraph.noPredecessorsSelected')}
              </span>
            ) : (
              <span>
                {t('dependencyGraph.predecessorsCount', { count: dependencies.length })} ·{' '}
                <strong className='text-emerald-700'>
                  {t('dependencyGraph.approvedCount', { count: approvedCount })}
                </strong>{' '}
                ·{' '}
                <strong className='text-amber-700'>
                  {t('dependencyGraph.pendingCount', { count: pendingCount })}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Graph Body */}
        <div className='p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6'>
          {dependencies.length === 0 ? (
            <div className='py-12 text-center text-stone-500 bg-white rounded-xl border border-dashed border-stone-300 p-6 space-y-2'>
              <Info className='w-8 h-8 text-stone-400 mx-auto' />
              <p className='text-sm font-medium text-stone-700'>
                {t('dependencyGraph.emptyTitle')}
              </p>
              <p className='text-xs text-stone-500 max-w-md mx-auto'>
                {t('dependencyGraph.emptyDesc')}
              </p>
            </div>
          ) : (
            <div className='flex flex-col md:flex-row items-center justify-between gap-6 relative'>
              {/* Left Column: Predecessors */}
              <div className='w-full md:w-5/12 space-y-3'>
                <div className='text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between'>
                  <span>
                    {t('dependencyGraph.predecessorsHeading', { count: dependencies.length })}
                  </span>
                  <span className='text-xs text-stone-400 font-normal'>
                    {t('dependencyGraph.mustFinishFirst')}
                  </span>
                </div>

                <div className='space-y-2.5 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar'>
                  {dependencies.map((node) => {
                    const approved = isApproved(node.status);
                    return (
                      <div
                        key={node.id}
                        className={`p-3 rounded-xl border text-xs transition-all shadow-2xs ${
                          approved
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                            : 'bg-amber-50/80 border-amber-300 text-amber-950'
                        }`}
                      >
                        <div className='flex items-start justify-between gap-2'>
                          <div className='font-semibold text-stone-900 leading-snug line-clamp-2'>
                            {node.brief}
                          </div>
                          <span
                            className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 ${
                              approved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {approved ? (
                              <>
                                <CheckCircle2 className='w-3 h-3' />{' '}
                                {t('dependencyGraph.approvedBadge')}
                              </>
                            ) : (
                              <>
                                <Clock className='w-3 h-3' /> {t('dependencyGraph.pendingBadge')}
                              </>
                            )}
                          </span>
                        </div>

                        <div className='mt-2 pt-2 border-t border-black/5 flex flex-wrap items-center justify-between gap-1 text-xs text-stone-600'>
                          <span>{node.contextText || t('dependencyGraph.chapterFallback')}</span>
                          {node.assigneeName && (
                            <span className='font-medium text-stone-700'>
                              👤 {node.assigneeName}
                            </span>
                          )}
                          <span className='font-mono text-xs text-stone-400'>
                            #{node.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center Connectors (Arrow Direction) */}
              <div className='shrink-0 flex md:flex-col items-center justify-center gap-2 text-stone-400 py-2'>
                <div className='hidden md:flex flex-col items-center gap-1.5'>
                  <div className='w-0.5 h-8 bg-stone-300 rounded'></div>
                  <div className='w-7 h-7 rounded-full bg-white border border-[#D8D2C5] flex items-center justify-center text-[#F97316] shadow-xs'>
                    <ArrowRight className='w-4 h-4' />
                  </div>
                  <div className='w-0.5 h-8 bg-stone-300 rounded'></div>
                </div>
                <span className='text-xs font-mono uppercase tracking-widest text-stone-500 font-semibold px-2 py-1 bg-stone-100 rounded border border-stone-200'>
                  {t('dependencyGraph.approvalRequired')}
                </span>
                <div className='md:hidden flex items-center gap-1.5'>
                  <div className='w-8 h-0.5 bg-stone-300 rounded'></div>
                  <ArrowRight className='w-4 h-4 text-[#F97316]' />
                </div>
              </div>

              {/* Right Column: Target Task */}
              <div className='w-full md:w-5/12 space-y-3'>
                <div className='text-xs font-bold uppercase tracking-wider text-[#F97316] flex items-center justify-between'>
                  <span className='flex items-center gap-1.5'>
                    <Sparkles className='w-3.5 h-3.5' />
                    <span>
                      {targetTask.isCreating
                        ? t('dependencyGraph.creatingTaskHeading')
                        : t('dependencyGraph.targetTaskHeading')}
                    </span>
                  </span>
                  <span className='text-xs text-stone-400 font-normal'>
                    {t('dependencyGraph.startsAfter')}
                  </span>
                </div>

                <div className='p-4 rounded-xl border-2 border-[#F97316] bg-white text-xs space-y-3 shadow-md relative overflow-hidden'>
                  <div className='absolute top-0 right-0 bg-[#F97316] text-white font-mono text-xs font-bold px-2 py-0.5 rounded-bl-lg'>
                    {targetTask.isCreating
                      ? t('dependencyGraph.creatingBadge')
                      : t('dependencyGraph.targetBadge')}
                  </div>

                  <div>
                    <span className='text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-block mb-1'>
                      {targetTask.stageName || 'Pipeline Stage'}
                    </span>
                    <h4 className='text-sm font-bold text-[#1C1917] leading-snug'>
                      {targetTask.title || t('dependencyGraph.untitledBrief')}
                    </h4>
                  </div>

                  <div className='pt-2 border-t border-stone-100 text-xs text-stone-600 space-y-1'>
                    <div className='flex items-center justify-between'>
                      <span>{t('dependencyGraph.contextLabel')}</span>
                      <strong className='text-stone-800'>
                        {targetTask.contextText || t('dependencyGraph.chapterFallback')}
                      </strong>
                    </div>
                    {targetTask.assigneeName && (
                      <div className='flex items-center justify-between'>
                        <span>{t('dependencyGraph.assigneeLabel')}</span>
                        <strong className='text-stone-800'>{targetTask.assigneeName}</strong>
                      </div>
                    )}
                  </div>

                  {/* Readiness Status Box */}
                  <div
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                      pendingCount === 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    {pendingCount === 0 ? (
                      <>
                        <ShieldCheck className='w-4 h-4 text-emerald-600 shrink-0 mt-0.5' />
                        <div>
                          <strong>{t('dependencyGraph.readyTitle')}</strong>{' '}
                          {t('dependencyGraph.readyDesc', { count: dependencies.length })}
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className='w-4 h-4 text-amber-600 shrink-0 mt-0.5' />
                        <div>
                          <strong>{t('dependencyGraph.blockedTitle')}</strong>{' '}
                          {t('dependencyGraph.blockedDesc', { count: pendingCount })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation Footer Note */}
          <div className='p-3.5 bg-[#FAF8F5] rounded-xl border border-[#D8D2C5] text-xs text-stone-600 space-y-1.5'>
            <div className='font-semibold text-stone-800 flex items-center gap-1.5'>
              <Info className='w-3.5 h-3.5 text-[#F97316]' />
              <span>{t('dependencyGraph.rulesTitle')}</span>
            </div>
            <ul className='list-disc list-inside space-y-0.5 text-xs text-stone-600 pl-1'>
              <li>
                {t('dependencyGraph.rule1Prefix')}{' '}
                <strong>{t('dependencyGraph.rule1Action')}</strong>{' '}
                {t('dependencyGraph.rule1Middle')} <em>InProgress</em>.
              </li>
              <li>
                {t('dependencyGraph.rule2Prefix')}{' '}
                <strong className='text-emerald-700'>{t('dependencyGraph.rule2Status')}</strong>.
              </li>
              <li>{t('dependencyGraph.rule3')}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className='p-4 border-t border-[#D8D2C5] bg-[#F3F0E9] flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-medium text-xs shadow-xs cursor-pointer transition-colors'
          >
            {t('dependencyGraph.closeBtn')}
          </button>
        </div>
      </div>
    </Modal>
  );

  return modalContent;
};
