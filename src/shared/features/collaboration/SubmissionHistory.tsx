import React from 'react';
import { History } from 'lucide-react';
import type { SubmissionDto } from '@/types';

interface SubmissionHistoryProps {
  submissions: SubmissionDto[];
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ duyệt', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  Approved: { label: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Rejected: { label: 'Bị trả về', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  Superseded: { label: 'Đã thay thế', className: 'bg-stone-100 text-stone-600 border-stone-200' },
};

/** Lịch sử các lần nộp của một việc (CF3, UC-09): lần nào bị trả về kèm lý do, lần nào được duyệt. */
export const SubmissionHistory: React.FC<SubmissionHistoryProps> = ({ submissions }) => {
  if (submissions.length === 0) {
    return (
      <p className='text-xs text-stone-400' data-testid='submission-history-empty'>
        Chưa có lần nộp nào.
      </p>
    );
  }

  return (
    <div className='space-y-2' data-testid='submission-history'>
      <div className='flex items-center gap-1.5 text-xs font-bold text-stone-900'>
        <History className='w-3.5 h-3.5 text-orange-600' />
        <span>Lịch sử nộp ({submissions.length})</span>
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
                <span className='font-mono font-semibold text-stone-900'>Lần {s.attemptNumber}</span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-semibold text-xs ${style.className}`}
                >
                  {style.label}
                </span>
              </div>
              <div className='text-stone-500 font-mono text-xs'>
                Nộp {new Date(s.submittedAt).toLocaleString('vi-VN')}
                {s.decidedAt && <> · Quyết định {new Date(s.decidedAt).toLocaleString('vi-VN')}</>}
              </div>
              {s.decisionComment && (
                <div className='text-stone-800 text-xs'>
                  <strong>Lý do trả về:</strong> {s.decisionComment}
                </div>
              )}
              {s.scriptRevisionIds && s.scriptRevisionIds.length > 0 && (
                <div
                  className='flex items-center gap-1.5 flex-wrap text-xs text-stone-600 pt-0.5'
                  data-testid='submission-script-revisions'
                >
                  <span className='font-semibold'>Revisions kịch bản:</span>
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
