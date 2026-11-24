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
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  Approved: {
    labelKey: 'submissionHistory.status.Approved',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  Rejected: {
    labelKey: 'submissionHistory.status.Rejected',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
  Superseded: {
    labelKey: 'submissionHistory.status.Superseded',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
};

/** Lịch sử các lần nộp của một việc (CF3, UC-09): lần nào bị trả về kèm lý do, lần nào được duyệt. */
export const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({ submissions }) => {
  const { t, lang } = useTranslation('collaboration');
  const dateLocale = lang === 'en' ? 'en-US' : 'vi-VN';

  if (submissions.length === 0) {
    return (
      <p className='text-[11px] text-[#888888]' data-testid='submission-history-empty'>
        {t('submissionHistory.empty')}
      </p>
    );
  }

  return (
    <div className='space-y-2' data-testid='submission-history'>
      <div className='flex items-center gap-1.5 text-[11px] font-bold text-[#171717]'>
        <History className='w-3.5 h-3.5 text-[#F97316]' />
        <span>{t('submissionHistory.title', { count: submissions.length })}</span>
      </div>
      <ol className='space-y-1.5'>
        {submissions.map((s) => {
          const style = STATUS_STYLE[String(s.status)] ?? STATUS_STYLE.Pending;
          return (
            <li
              key={s.id}
              className='p-2 rounded-lg bg-[#FAF8F5] border border-[#F0ECE1] text-[11px] space-y-1'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='font-mono font-semibold'>
                  {t('submissionHistory.attempt', { attempt: s.attemptNumber })}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-semibold text-[10px] ${style.className}`}
                >
                  {t(style.labelKey)}
                </span>
              </div>
              <div className='text-[#737373] font-mono'>
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
                <div className='text-[#333333]'>
                  <strong>{t('submissionHistory.returnReason')}</strong> {s.decisionComment}
                </div>
              )}
              {s.scriptRevisionIds && s.scriptRevisionIds.length > 0 && (
                <div
                  className='flex items-center gap-1.5 flex-wrap text-[10px] text-stone-600 pt-0.5'
                  data-testid='submission-script-revisions'
                >
                  <span className='font-semibold'>{t('submissionHistory.scriptRevisions')}</span>
                  {s.scriptRevisionIds.map((revId) => (
                    <span
                      key={revId}
                      className='px-1.5 py-0.5 bg-stone-100 border border-stone-200 rounded font-mono text-[9px] text-stone-700'
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
