import React from 'react';
import { History } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { SubmissionDto } from '@/types';

interface SubmissionHistoryProps {
  submissions: SubmissionDto[];
}

const STATUS_STYLE: Record<string, { labelKey: string; className: string }> = {
  Pending: {
    labelKey: 'submissionHistory.status.Pending',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  Approved: {
    labelKey: 'submissionHistory.status.Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Rejected: {
    labelKey: 'submissionHistory.status.Rejected',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  Superseded: {
    labelKey: 'submissionHistory.status.Superseded',
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
};

/** Lịch sử các lần nộp của một việc (CF3, UC-09): lần nào bị trả về kèm lý do, lần nào được duyệt. */
export const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({ submissions }) => {
  const { t, lang } = useTranslation('collaboration');
  const dateLocale = lang === 'en' ? 'en-US' : 'vi-VN';

  if (submissions.length === 0) {
    return (
      <p className='text-xs text-stone-400' data-testid='submission-history-empty'>
        {t('submissionHistory.empty')}
      </p>
    );
  }

  return (
    <div className='space-y-2' data-testid='submission-history'>
      <div className='flex items-center gap-1.5 text-xs font-bold text-stone-900'>
        <History className='w-3.5 h-3.5 text-orange-600' />
        <span>{t('submissionHistory.title', { count: submissions.length })}</span>
      </div>
      <ol className='space-y-1.5'>
        {submissions.map((s) => {
          const style = STATUS_STYLE[String(s.status)] ?? STATUS_STYLE.Pending;
          return (
            <li
              key={s.id}
              className='p-2 rounded-lg bg-[#FAF9F5] border border-stone-200/80 text-xs space-y-1'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='font-mono font-semibold text-stone-900'>
                  {t('submissionHistory.attempt', { attempt: s.attemptNumber })}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-semibold text-xs ${style.className}`}
                >
                  {t(style.labelKey)}
                </span>
              </div>
              <div className='text-stone-500 font-mono text-xs'>
                {t('submissionHistory.submittedAt', {
                  date: new Date(s.submittedAt).toLocaleString(dateLocale),
                })}
                {s.decidedAt && (
                  <>
                    {' '}
                    ·{' '}
                    {t('submissionHistory.decidedAt', {
                      date: new Date(s.decidedAt).toLocaleString(dateLocale),
                    })}
                  </>
                )}
              </div>
              {s.decisionComment && (
                <div className='text-stone-800 text-xs'>
                  <strong>{t('submissionHistory.returnReason')}</strong> {s.decisionComment}
                </div>
              )}
              {s.scriptRevisionIds && s.scriptRevisionIds.length > 0 && (
                <div
                  className='flex items-center gap-1.5 flex-wrap text-xs text-stone-600 pt-0.5'
                  data-testid='submission-script-revisions'
                >
                  <span className='font-semibold'>{t('submissionHistory.scriptRevisions')}</span>
                  {s.scriptRevisionIds.map((revId) => (
                    <span
                      key={revId}
                      className='px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded font-mono text-xs text-stone-700'
                      title={revId}
                    >
                      {revId.length > 8 ? `${revId.slice(0, 8)}…` : revId}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
