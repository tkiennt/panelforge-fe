import React from 'react';
import { AlertTriangle, CheckCircle2, CornerUpLeft } from 'lucide-react';

/**
 * Hai quyết định của cổng duyệt (CF3 bước 6–7): trả bài kèm nhận xét chung bắt buộc (BR-06) hoặc duyệt.
 * Lý do bị chặn luôn hiện bằng chữ, không chỉ bằng nút mờ.
 */
export const DecisionBar: React.FC<{
  summary: string;
  onSummaryChange: (v: string) => void;
  labels: {
    summary: string;
    summaryPlaceholder: string;
    summaryRequired: string;
    returnAction: string;
    approve: string;
  };
  warning?: string | null;
  returnBlocker?: string | null;
  approveBlocker: string | null;
  busy: 'return' | 'approve' | null;
  onReturn: () => void;
  onApprove: () => void;
}> = ({
  summary,
  onSummaryChange,
  labels,
  warning,
  returnBlocker,
  approveBlocker,
  busy,
  onReturn,
  onApprove,
}) => (
  <div className='shrink-0 space-y-3 border-t border-stone-200 bg-[#FAF9F5] p-4'>
    <label className='block text-sm font-semibold text-stone-800'>
      {labels.summary}
      <textarea
        value={summary}
        onChange={(e) => onSummaryChange(e.target.value)}
        rows={2}
        placeholder={labels.summaryPlaceholder}
        className='mt-1 w-full resize-y rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-normal text-stone-800 focus:border-orange-500 focus:outline-none'
      />
    </label>
    {warning && (
      <p className='flex items-start gap-1.5 text-xs text-amber-900'>
        <AlertTriangle className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden='true' />
        {warning}
      </p>
    )}
    {returnBlocker && <p className='text-xs text-stone-600'>{returnBlocker}</p>}
    {approveBlocker && <p className='text-xs text-stone-600'>{approveBlocker}</p>}
    <div className='flex flex-wrap gap-2'>
      <button
        type='button'
        onClick={onReturn}
        disabled={!summary.trim() || !!returnBlocker || busy === 'return'}
        title={!summary.trim() ? labels.summaryRequired : undefined}
        className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50'
      >
        <CornerUpLeft className='h-4 w-4' aria-hidden='true' />
        {labels.returnAction}
      </button>
      <button
        type='button'
        onClick={onApprove}
        disabled={!!approveBlocker || busy === 'approve'}
        className='inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
      >
        <CheckCircle2 className='h-4 w-4' aria-hidden='true' />
        {labels.approve}
      </button>
    </div>
  </div>
);
