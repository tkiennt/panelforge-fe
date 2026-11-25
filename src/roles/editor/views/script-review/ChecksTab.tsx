import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  MessageSquarePlus,
  RotateCcw,
  Unlock,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ChapterDto } from '@/services/chapter.service';
import type { ChapterCastDto } from '@/services/chapterCast.service';
import type { ConsistencyFindingDto } from '@/types/pipeline';
import { anchorKey } from '@/shared/features/script-review/scriptReviewModel';
import { OPEN_FINDING_STATUSES, isAiFinding } from '@/shared/features/script-review/reviewModel';
import { ReasonForm } from '@/shared/components/ReasonForm';

export type FindingDecision = 'Confirmed' | 'Rejected' | 'Ignored' | 'NeedsClarification';

interface ChecksTabProps {
  chapter: ChapterDto;
  cast: ChapterCastDto | null;
  findings: ConsistencyFindingDto[];
  locateLabel: (sceneId: string | null | undefined, lineId: string | null | undefined) => string;
  onSelectAnchor: (key: string) => void;
  canTriage: boolean;
  canComment: boolean;
  isProducer: boolean;
  busy: string | null;
  onRunCheck: () => void;
  /** Thời điểm kiểm tra gần nhất (tự chạy khi mở phiên duyệt). */
  checkedAt: string | null;
  onTriage: (finding: ConsistencyFindingDto, decision: FindingDecision, note?: string) => void;
  onFindingToComment: (finding: ConsistencyFindingDto) => void;
  openComments?: number;
  onFreeze: () => void;
  onUnfreeze: (reason: string) => void;
}

const OPEN_FINDING = new Set(OPEN_FINDING_STATUSES);

const SEVERITY_BADGE: Record<string, string> = {
  Blocking: 'bg-rose-50 text-rose-800 border-rose-200',
  Warning: 'bg-amber-50 text-amber-800 border-amber-200',
  Info: 'bg-stone-100 text-stone-600 border-stone-200',
};

export const ChecksTab: React.FC<ChecksTabProps> = ({
  chapter,
  cast,
  findings,
  locateLabel,
  onSelectAnchor,
  canTriage,
  canComment,
  isProducer,
  busy,
  onRunCheck,
  checkedAt,
  onTriage,
  onFindingToComment,
  openComments,
  onFreeze,
  onUnfreeze,
}) => {
  const { t, lang } = useTranslation('review');
  const [noteFor, setNoteFor] = useState<{ id: string; decision: FindingDecision } | null>(null);
  const [unfreezing, setUnfreezing] = useState(false);
  const [entityFilter, setEntityFilter] = useState<'all' | 'main' | 'crowd'>('all');

  const openFindings = findings.filter((f) => OPEN_FINDING.has(String(f.status)));
  const blockingOpen = openFindings.filter((f) => String(f.severity) === 'Blocking').length;

  const isFrozen = chapter.isScriptFrozen === true;
  const isGatePassed = cast?.gate?.canStart ?? false;
  const blockers = cast?.gate?.blockers ?? [];
  const freezeBlocked = Boolean(cast && !isGatePassed);
  const totalEntities = cast?.entities?.length ?? 0;
  const passedEntitiesCount = Math.max(0, totalEntities - blockers.length);

  const allEntities = cast?.entities ?? [];
  const mainEntities = allEntities.filter((e) => !e.isCrowd);
  const crowdEntities = allEntities.filter((e) => e.isCrowd);
  const displayedEntities =
    entityFilter === 'main' ? mainEntities : entityFilter === 'crowd' ? crowdEntities : allEntities;

  return (
    <div className='space-y-6 p-4'>
      {/* Bible Gate & Entities in Script (Stitch view-script style) */}
      <section className='space-y-3'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200'>
          <div>
            <h3 className='text-sm font-bold text-stone-900'>
              {t('scriptReview.checks.entitiesTitle', { count: allEntities.length })}
            </h3>
            <p className='text-xs text-stone-500'>{t('scriptReview.checks.entitiesSubtitle')}</p>
          </div>
          {allEntities.length > 0 && (
            <div className='inline-flex p-0.5 rounded-lg bg-stone-100 border border-stone-200 text-xs shrink-0'>
              <button
                type='button'
                onClick={() => setEntityFilter('all')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  entityFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t('scriptReview.checks.filterAll', { count: allEntities.length })}
              </button>
              <button
                type='button'
                onClick={() => setEntityFilter('main')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  entityFilter === 'main'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t('scriptReview.checks.filterMain', { count: mainEntities.length })}
              </button>
              <button
                type='button'
                onClick={() => setEntityFilter('crowd')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                  entityFilter === 'crowd'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t('scriptReview.checks.filterCrowd', { count: crowdEntities.length })}
              </button>
            </div>
          )}
        </div>

        {!cast ? (
          <p className='mt-1 text-xs text-stone-500'>{t('scriptReview.checks.bibleUnavailable')}</p>
        ) : (
          <>
            <p
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                isGatePassed ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {isGatePassed ? (
                <CheckCircle2 className='h-3.5 w-3.5' aria-hidden='true' />
              ) : (
                <AlertTriangle className='h-3.5 w-3.5' aria-hidden='true' />
              )}
              {isGatePassed
                ? t('scriptReview.checks.biblePassed', { count: passedEntitiesCount })
                : t('scriptReview.checks.bibleFailed', { count: blockers.length })}
            </p>

            {/* List of entities */}
            {displayedEntities.length > 0 ? (
              <div className='space-y-2 mt-2'>
                {displayedEntities.map((ent) => {
                  const isBlocker = blockers.some((b) => b.bibleEntryId === ent.bibleEntryId);
                  const isLocked = ent.bibleStatus === 'Active' && !ent.isStub && !isBlocker;
                  const initials = (ent.name || 'UN')
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={ent.bibleEntryId || ent.code}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-2 shadow-2xs transition-colors ${
                        isBlocker
                          ? 'bg-rose-50/60 border-rose-200'
                          : isLocked
                            ? 'bg-stone-50 border-stone-200'
                            : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className='flex items-center gap-2.5 min-w-0'>
                        <div
                          className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                            isBlocker
                              ? 'bg-rose-600 text-white'
                              : ent.isCrowd
                                ? 'bg-stone-400 text-white'
                                : 'bg-stone-900 text-white'
                          }`}
                        >
                          {initials}
                        </div>
                        <div className='min-w-0'>
                          <div className='text-xs font-bold text-stone-900 truncate'>
                            {ent.name}
                          </div>
                          <div className='text-[11px] text-stone-500 truncate'>
                            {ent.category || t('scriptReview.checks.entityCategoryFallback')} ·{' '}
                            {ent.source === 'Speaker'
                              ? t('scriptReview.checks.entitySourceSpeaker')
                              : t('scriptReview.checks.entitySourceMentioned')}
                          </div>
                        </div>
                      </div>

                      <div className='flex items-center gap-1.5 shrink-0'>
                        {isBlocker ? (
                          <span className='bg-rose-50 text-rose-700 border border-rose-200 text-[11px] px-2 py-0.5 rounded-full font-semibold'>
                            {t('scriptReview.checks.entityStatusIncomplete')}
                          </span>
                        ) : isLocked ? (
                          <span className='bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-full font-semibold'>
                            {t('scriptReview.checks.entityStatusLocked')}
                          </span>
                        ) : ent.isCrowd ? (
                          <span className='bg-stone-100 text-stone-600 border border-stone-200 text-[11px] px-2 py-0.5 rounded-full font-medium'>
                            {t('scriptReview.checks.entityStatusExempt')}
                          </span>
                        ) : (
                          <span className='bg-amber-50 text-amber-700 border border-amber-200 text-[11px] px-2 py-0.5 rounded-full font-medium'>
                            {t('scriptReview.checks.entityStatusPending')}
                          </span>
                        )}
                        <span className='text-[11px] text-stone-500 font-medium bg-white px-1.5 py-0.5 rounded border border-stone-200'>
                          {ent.isCrowd
                            ? t('scriptReview.checks.entityRoleCrowd')
                            : t('scriptReview.checks.entityRoleMain')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {blockers.length > 0 && (
              <div className='p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2 mt-3'>
                <AlertTriangle className='w-4 h-4 text-rose-600 shrink-0 mt-0.5' />
                <p>
                  {t('scriptReview.checks.blockedByEntitiesPrefix')}{' '}
                  <strong>{blockers.map((b) => b.entryName).join(', ')}</strong>{' '}
                  {t('scriptReview.checks.blockedByEntitiesSuffix')}
                </p>
              </div>
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
            className='inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50'
          >
            <RotateCcw className='h-3.5 w-3.5' aria-hidden='true' />
            {busy === 'consistency'
              ? t('scriptReview.checks.running')
              : t('scriptReview.checks.recheck')}
          </button>
        </div>
        <p className='mt-1 text-xs text-stone-500'>
          {checkedAt
            ? t('scriptReview.checks.checkedAt', {
                time: new Date(checkedAt).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })
            : t('scriptReview.checks.codeRules')}
        </p>
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
                  className={`rounded-lg border border-l-2 border-stone-200/80 bg-white p-3 ${
                    isAiFinding(f.ruleCode) ? 'border-l-violet-500' : 'border-l-amber-500'
                  }`}
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

        {isProducer && !isFrozen && (
          <div className='mt-2'>
            {openComments !== undefined && openComments > 0 && (
              <p
                data-testid='checks-open-comments-warning'
                className='mb-1.5 inline-flex items-center gap-1 text-xs text-amber-700'
              >
                <AlertTriangle className='h-3.5 w-3.5 text-amber-600' aria-hidden='true' />
                {t('scriptReview.lifecycle.openCommentsWarning', { count: openComments })}
              </p>
            )}
            <div>
              <button
                type='button'
                disabled={!!freezeBlocked || busy === 'freeze'}
                onClick={onFreeze}
                className='inline-flex items-center gap-1 rounded-full bg-[#EA580C] px-3 py-1 text-xs font-semibold text-white hover:bg-[#C2410C] disabled:cursor-not-allowed disabled:opacity-50'
              >
                <Lock className='h-3.5 w-3.5' aria-hidden='true' />
                {t('scriptReview.checks.freeze')}
              </button>
            </div>
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
