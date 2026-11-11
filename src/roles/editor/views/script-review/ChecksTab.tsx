import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  MessageSquarePlus,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ChapterBibleGateResultDto, ChapterDto } from '@/services/chapter.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { anchorKey } from './scriptReviewModel';
import { OPEN_FINDING_STATUSES } from '../review-shared/reviewModel';
import { ReasonForm } from '../review-shared/ReasonForm';

export type FindingDecision = 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification';

interface ChecksTabProps {
  chapter: ChapterDto;
  bibleGate: ChapterBibleGateResultDto | null;
  findings: ConsistencyFindingDto[];
  locateLabel: (sceneId: string | null | undefined, lineId: string | null | undefined) => string;
  onSelectAnchor: (key: string) => void;
  canTriage: boolean;
  canComment: boolean;
  isProducer: boolean;
  busy: string | null;
  onRunCheck: () => void;
  onTriage: (finding: ConsistencyFindingDto, decision: FindingDecision, note?: string) => void;
  onFindingToComment: (finding: ConsistencyFindingDto) => void;
  onFreeze: () => void;
  onUnfreeze: (reason: string) => void;
  onDecideReopen: (approve: boolean) => void;
}

const OPEN_FINDING = new Set(OPEN_FINDING_STATUSES);

const SEVERITY_BADGE: Record<string, string> = {
  Blocking: 'bg-rose-50 text-rose-800 border-rose-200',
  Warning: 'bg-amber-50 text-amber-800 border-amber-200',
  Info: 'bg-stone-100 text-stone-600 border-stone-200',
};

export const ChecksTab: React.FC<ChecksTabProps> = ({
  chapter,
  bibleGate,
  findings,
  locateLabel,
  onSelectAnchor,
  canTriage,
  canComment,
  isProducer,
  busy,
  onRunCheck,
  onTriage,
  onFindingToComment,
  onFreeze,
  onUnfreeze,
  onDecideReopen,
}) => {
  const { t } = useTranslation('review');
  const [noteFor, setNoteFor] = useState<{ id: string; decision: FindingDecision } | null>(null);
  const [unfreezing, setUnfreezing] = useState(false);

  const openFindings = findings.filter((f) => OPEN_FINDING.has(String(f.status)));
  const blockingOpen = openFindings.filter((f) => String(f.severity) === 'Blocking').length;
  const pendingEntities = bibleGate?.items.filter((i) => !i.isLocked) ?? [];
  const isFrozen = chapter.isScriptFrozen === true;
  const freezeBlocked = bibleGate && !bibleGate.isPassed;

  return (
    <div className='space-y-6 p-4'>
      {/* Bible Gate: nhân vật / bối cảnh dùng trong chương phải đã khoá canon (CF2 bước 6) */}
      <section>
        <h3 className='text-sm font-semibold text-stone-800'>
          {t('scriptReview.checks.bibleTitle')}
        </h3>
        {!bibleGate ? (
          <p className='mt-1 text-xs text-stone-500'>{t('scriptReview.checks.bibleUnavailable')}</p>
        ) : (
          <>
            <p
              className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium ${
                bibleGate.isPassed ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {bibleGate.isPassed ? (
                <CheckCircle2 className='h-3.5 w-3.5' aria-hidden='true' />
              ) : (
                <AlertTriangle className='h-3.5 w-3.5' aria-hidden='true' />
              )}
              {bibleGate.isPassed
                ? t('scriptReview.checks.biblePassed', { count: bibleGate.lockedCount })
                : t('scriptReview.checks.bibleFailed', { count: bibleGate.pendingCount })}
            </p>
            {pendingEntities.length > 0 && (
              <ul className='mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200/80 bg-white'>
                {pendingEntities.map((e) => (
                  <li key={e.bibleEntryId} className='px-3 py-2'>
                    <p className='text-sm font-medium text-stone-900'>{e.name}</p>
                    <p className='text-xs text-stone-500'>
                      {e.warningMessage ?? t('scriptReview.checks.notLocked')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Kiểm tra nhất quán: AI và luật code nêu phát hiện, người quyết (BR-02, BR-21) */}
      <section>
        <div className='flex items-center justify-between gap-2'>
          <h3 className='text-sm font-semibold text-stone-800'>
            {t('scriptReview.checks.consistencyTitle')}
          </h3>
          <button
            type='button'
            onClick={onRunCheck}
            disabled={busy === 'consistency'}
            className='inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50'
          >
            <Sparkles className='h-3.5 w-3.5' aria-hidden='true' />
            {busy === 'consistency'
              ? t('scriptReview.checks.running')
              : t('scriptReview.checks.run')}
          </button>
        </div>
        <p className='mt-1 text-xs text-stone-500'>
          {findings.length === 0
            ? t('scriptReview.checks.noFindings')
            : t('scriptReview.checks.findingSummary', {
                open: openFindings.length,
                blocking: blockingOpen,
              })}
        </p>
        {openFindings.length > 0 && (
          <ul className='mt-2 space-y-2'>
            {openFindings.map((f) => {
              const severity = String(f.severity);
              const hasAnchor = !!(f.sceneId || f.scriptLineId);
              return (
                <li
                  key={f.id}
                  className='rounded-lg border border-stone-200/80 border-l-2 border-l-violet-500 bg-white p-3'
                >
                  <div className='flex items-start justify-between gap-2'>
                    <span className='font-mono text-xs text-stone-500'>{f.ruleCode}</span>
                    <span
                      className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${
                        SEVERITY_BADGE[severity] ?? SEVERITY_BADGE.Info
                      }`}
                    >
                      {t(`scriptReview.severity.${severity}`, severity)}
                    </span>
                  </div>
                  <p className='mt-1 text-sm leading-relaxed text-stone-800'>{f.message}</p>
                  {f.evidence && (
                    <p className='mt-1 border-l-2 border-stone-200 pl-2 text-xs italic text-stone-600'>
                      {f.evidence}
                    </p>
                  )}
                  {hasAnchor && (
                    <button
                      type='button'
                      onClick={() => onSelectAnchor(anchorKey(f.sceneId, f.scriptLineId))}
                      className='mt-1 font-mono text-xs text-stone-600 hover:text-orange-700 hover:underline'
                    >
                      {locateLabel(f.sceneId, f.scriptLineId)}
                    </button>
                  )}
                  {String(f.status) !== 'Open' && (
                    <p className='mt-1 text-xs text-stone-500'>
                      {t(`scriptReview.findingStatus.${String(f.status)}`, String(f.status))}
                      {f.triageNote ? ` · ${f.triageNote}` : ''}
                    </p>
                  )}

                  {canTriage && noteFor?.id !== f.id && (
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {canComment && hasAnchor && (
                        <button
                          type='button'
                          onClick={() => onFindingToComment(f)}
                          className='inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-800 hover:bg-orange-100'
                        >
                          <MessageSquarePlus className='h-3.5 w-3.5' aria-hidden='true' />
                          {t('scriptReview.checks.toComment')}
                        </button>
                      )}
                      {String(f.status) !== 'Confirmed' && (
                        <button
                          type='button'
                          onClick={() => onTriage(f, 'Confirmed')}
                          className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                        >
                          {t('scriptReview.checks.confirm')}
                        </button>
                      )}
                      <button
                        type='button'
                        onClick={() => onTriage(f, 'Rejected')}
                        className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                      >
                        {t('scriptReview.checks.notAnIssue')}
                      </button>
                      <button
                        type='button'
                        onClick={() => setNoteFor({ id: f.id, decision: 'Ignored' })}
                        className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                      >
                        {t('scriptReview.checks.ignore')}
                      </button>
                      <button
                        type='button'
                        onClick={() => setNoteFor({ id: f.id, decision: 'NeedsClarification' })}
                        className='rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-100'
                      >
                        {t('scriptReview.checks.clarify')}
                      </button>
                    </div>
                  )}
                  {noteFor?.id === f.id && (
                    <ReasonForm
                      tone='neutral'
                      label={
                        noteFor.decision === 'Ignored'
                          ? t('scriptReview.checks.ignoreReason')
                          : t('scriptReview.checks.clarifyQuestion')
                      }
                      confirmLabel={
                        noteFor.decision === 'Ignored'
                          ? t('scriptReview.checks.ignore')
                          : t('scriptReview.checks.clarify')
                      }
                      onCancel={() => setNoteFor(null)}
                      onConfirm={(note) => {
                        onTriage(f, noteFor.decision, note);
                        setNoteFor(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Cổng canon: Producer đóng băng kịch bản sau khi đã duyệt và qua Bible Gate (CF2 bước 7) */}
      <section>
        <h3 className='text-sm font-semibold text-stone-800'>
          {t('scriptReview.checks.canonTitle')}
        </h3>
        <p className='mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-stone-700'>
          {isFrozen ? (
            <Lock className='h-3.5 w-3.5' aria-hidden='true' />
          ) : (
            <Unlock className='h-3.5 w-3.5' aria-hidden='true' />
          )}
          {isFrozen ? t('scriptReview.checks.frozen') : t('scriptReview.checks.notFrozen')}
        </p>
        {isFrozen && chapter.scriptContentHash && (
          <p
            className='mt-1 truncate font-mono text-xs text-stone-500'
            title={chapter.scriptContentHash}
          >
            SHA-256 {chapter.scriptContentHash}
          </p>
        )}

        {chapter.scriptReopenStatus === 'Requested' && (
          <div className='mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3'>
            <p className='text-xs font-semibold text-amber-900'>
              {t('scriptReview.checks.reopenRequested')}
            </p>
            {chapter.scriptReopenReason && (
              <p className='mt-1 text-xs text-amber-900'>{chapter.scriptReopenReason}</p>
            )}
            {isProducer && (
              <div className='mt-2 flex gap-2'>
                <button
                  type='button'
                  disabled={busy === 'reopen'}
                  onClick={() => onDecideReopen(true)}
                  className='rounded-full bg-[#EA580C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#C2410C] disabled:opacity-50'
                >
                  {t('scriptReview.checks.approveReopen')}
                </button>
                <button
                  type='button'
                  disabled={busy === 'reopen'}
                  onClick={() => onDecideReopen(false)}
                  className='rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50'
                >
                  {t('scriptReview.checks.rejectReopen')}
                </button>
              </div>
            )}
          </div>
        )}

        {isProducer && !isFrozen && (
          <div className='mt-2'>
            <button
              type='button'
              disabled={!!freezeBlocked || busy === 'freeze'}
              onClick={onFreeze}
              className='inline-flex items-center gap-1 rounded-full bg-[#EA580C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Lock className='h-3.5 w-3.5' aria-hidden='true' />
              {t('scriptReview.checks.freeze')}
            </button>
            {freezeBlocked && (
              <p className='mt-1 text-xs text-rose-800'>{t('scriptReview.checks.freezeBlocked')}</p>
            )}
          </div>
        )}
        {isProducer && isFrozen && !unfreezing && (
          <button
            type='button'
            onClick={() => setUnfreezing(true)}
            className='mt-2 inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100'
          >
            <Unlock className='h-3.5 w-3.5' aria-hidden='true' />
            {t('scriptReview.checks.unfreeze')}
          </button>
        )}
        {unfreezing && (
          <ReasonForm
            tone='neutral'
            label={t('scriptReview.checks.unfreezeReason')}
            confirmLabel={t('scriptReview.checks.unfreeze')}
            onCancel={() => setUnfreezing(false)}
            onConfirm={(reason) => {
              onUnfreeze(reason);
              setUnfreezing(false);
            }}
          />
        )}
      </section>
    </div>
  );
};
