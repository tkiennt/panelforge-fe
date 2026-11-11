import React from 'react';
import { AlertCircle, AlertTriangle, ArrowRight, Bell, CheckCircle2, Loader2 } from 'lucide-react';
import type { SeriesProgressDto } from '@/services/series.service';
import { formatViDate } from './dashboardFormat';

type Tone = 'amber' | 'rose';

const TONE: Record<
  Tone,
  { box: string; item: string; link: string; heading: string; icon: string }
> = {
  amber: {
    box: 'bg-amber-50/70 border-amber-200',
    item: 'border-amber-200',
    link: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200',
    heading: 'text-amber-950',
    icon: 'text-amber-700',
  },
  rose: {
    box: 'bg-rose-50/70 border-rose-200',
    item: 'border-rose-200',
    link: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200',
    heading: 'text-rose-950',
    icon: 'text-rose-600',
  },
};

const OverdueItem: React.FC<{
  tone: Tone;
  title: string;
  tag: string;
  owner: React.ReactNode;
  dueDate?: string | null;
  linkLabel: string;
  testId?: string;
  onOpen?: () => void;
}> = ({ tone, title, tag, owner, dueDate, linkLabel, testId, onOpen }) => (
  <div
    data-testid={testId}
    className={`p-2.5 bg-white rounded-lg border space-y-1.5 text-xs ${TONE[tone].item}`}
  >
    <div className='flex items-start justify-between gap-2'>
      <div className='font-semibold text-stone-900 line-clamp-1'>{title}</div>
      <span
        className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold shrink-0 border ${TONE[tone].link}`}
      >
        {tag}
      </span>
    </div>
    <div className='flex items-center justify-between text-stone-700'>
      <span>{owner}</span>
      <span className='text-rose-700 font-bold'>Hạn: {formatViDate(dueDate) ?? '–'}</span>
    </div>
    {onOpen && (
      <button
        type='button'
        onClick={onOpen}
        className={`focus-ring w-full min-h-9 border rounded-lg font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1 ${TONE[tone].link}`}
      >
        <span>{linkLabel}</span>
        <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
      </button>
    )}
  </div>
);

interface AttentionRiskCardProps {
  progress: SeriesProgressDto | null;
  overdueTotal: number;
  sendingReminders: boolean;
  onSendReminders: () => void;
  /** Null when there is no workspace/series route to open the task in. */
  openTask: ((chapterId: string, assignmentId: string) => void) | null;
}

export const AttentionRiskCard: React.FC<AttentionRiskCardProps> = ({
  progress,
  overdueTotal,
  sendingReminders,
  onSendReminders,
  openTask,
}) => {
  const overdueCrs = progress?.overdueChangeRequests ?? [];
  const overdue = progress?.overdue ?? [];

  return (
    <div className='bg-white border border-stone-200/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col h-full gap-3.5'>
      <div className='flex items-center justify-between border-b border-stone-100 pb-3'>
        <div>
          <h2 className='text-sm font-bold text-stone-900'>Mục Cần Chú Ý &amp; Rủi Ro</h2>
          <p className='text-xs text-stone-600'>Cảnh báo trễ hạn và yêu cầu sửa</p>
        </div>
        {overdueTotal > 0 ? (
          <span className='text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200'>
            {overdueTotal} mục
          </span>
        ) : (
          <span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200'>
            <CheckCircle2 className='w-3.5 h-3.5' aria-hidden='true' />
            Ổn định
          </span>
        )}
      </div>

      {overdueCrs.length > 0 && (
        <div
          data-testid='overdue-cr-banner'
          className={`border rounded-xl p-3.5 space-y-2.5 ${TONE.amber.box}`}
        >
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-1.5'>
              <AlertCircle className={`w-4 h-4 shrink-0 ${TONE.amber.icon}`} aria-hidden='true' />
              <h3 className={`text-xs font-bold ${TONE.amber.heading}`}>
                Danh Sách Yêu Cầu Sửa Đổi Quá Hạn ({overdueCrs.length})
              </h3>
            </div>
            <button
              type='button'
              onClick={onSendReminders}
              disabled={sendingReminders}
              className='bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-full focus-ring min-h-9 px-3 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              title='Gửi thông báo nhắc nhở đến người phụ trách yêu cầu sửa'
            >
              {sendingReminders ? (
                <Loader2 className='w-3.5 h-3.5 animate-spin' aria-hidden='true' />
              ) : (
                <Bell className='w-3.5 h-3.5' aria-hidden='true' />
              )}
              <span>{sendingReminders ? 'Đang gửi...' : 'Gửi thông báo nhắc hạn'}</span>
            </button>
          </div>
          <div className='space-y-2'>
            {overdueCrs.map((cr) => (
              <OverdueItem
                key={cr.changeRequestId}
                testId={`overdue-cr-card-${cr.changeRequestId}`}
                tone='amber'
                title={cr.description}
                tag='1 yêu cầu sửa'
                owner={
                  <>
                    Người sửa: <strong>{cr.responsibleUserName}</strong>
                  </>
                }
                dueDate={cr.dueDate}
                linkLabel='Xem yêu cầu cần sửa'
                onOpen={openTask ? () => openTask(cr.chapterId, cr.assignmentId) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <div className={`border rounded-xl p-3.5 space-y-2.5 ${TONE.rose.box}`}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1.5'>
              <AlertTriangle className={`w-4 h-4 shrink-0 ${TONE.rose.icon}`} aria-hidden='true' />
              <h3 className={`text-xs font-bold ${TONE.rose.heading}`}>
                Danh Sách Công Việc Quá Hạn ({overdue.length})
              </h3>
            </div>
            <span className='text-xs font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200'>
              Cần xử lý
            </span>
          </div>
          <div className='space-y-2'>
            {overdue.map((od) => (
              <OverdueItem
                key={od.assignmentId}
                tone='rose'
                title={od.brief}
                tag={od.status}
                owner={od.assigneeName}
                dueDate={od.dueDate}
                linkLabel='Xem việc cần xử lý'
                onOpen={openTask ? () => openTask(od.chapterId, od.assignmentId) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {overdue.length === 0 && overdueCrs.length === 0 && (
        <div className='flex-1 flex flex-col items-center justify-center py-6 px-4 text-center gap-1.5 bg-stone-50 rounded-xl border border-dashed border-stone-300 min-h-[140px]'>
          <CheckCircle2 className='w-5 h-5 text-emerald-600' aria-hidden='true' />
          <p className='text-xs font-bold text-stone-900'>Không có việc trễ hạn</p>
          <p className='text-xs text-stone-600 max-w-xs leading-relaxed'>
            Mọi nhiệm vụ và yêu cầu sửa trong Series đều còn trong hạn.
          </p>
        </div>
      )}
    </div>
  );
};
