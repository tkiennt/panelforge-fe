import React from 'react';
import { UserPlus, Users } from 'lucide-react';
import type { SeriesProgressDto } from '@/services/series.service';
import { NEUTRAL_BADGE } from './dashboardFormat';

interface WorkloadCardProps {
  workload: SeriesProgressDto['workload'] | undefined;
  memberCount: number;
  assignChapterNumber: number | null;
  onAssign: () => void;
  onManageMembers: () => void;
}

const Counter: React.FC<{ label: string; value: number; tone: string }> = ({
  label,
  value,
  tone,
}) => (
  <div className='bg-stone-50 p-1.5 rounded-lg border border-stone-200'>
    <div className='text-stone-600 text-xs font-sans'>{label}</div>
    <div className={`font-bold text-sm ${tone}`}>{value}</div>
  </div>
);

export const WorkloadCard: React.FC<WorkloadCardProps> = ({
  workload,
  memberCount,
  assignChapterNumber,
  onAssign,
  onManageMembers,
}) => {
  const rows = workload ?? [];

  return (
    <div className='bg-white border border-stone-200/80 rounded-xl p-5 sm:p-6 shadow-xs space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3'>
        <div>
          <h2 className='text-base font-bold text-stone-900 flex items-center gap-2'>
            <Users className='w-4 h-4 text-orange-600' aria-hidden='true' />
            <span>Phân Bổ Khối Lượng Công Việc</span>
          </h2>
          <p className='text-xs text-stone-600 mt-0.5'>
            Số lượng panel và nhiệm vụ đang phụ trách theo từng nhân sự
          </p>
        </div>
        <span className='self-start sm:self-auto px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 text-xs font-mono font-semibold text-stone-700'>
          {rows.length} Nhân sự có việc
        </span>
      </div>

      {rows.length === 0 ? (
        <div className='border-2 border-dashed border-stone-300 rounded-xl p-6 flex flex-col items-center text-center gap-2'>
          <p className='font-semibold text-stone-900 text-xs'>
            {memberCount > 0
              ? `Đội ngũ sẵn sàng (${memberCount} thành viên) · Chưa có phân công đang mở`
              : 'Chưa có nhân sự được phân công vào Series'}
          </p>
          <p className='text-xs text-stone-600 max-w-xs'>
            {memberCount > 0
              ? 'Giao nhiệm vụ vẽ/lên kịch bản cho nghệ sĩ để bắt đầu theo dõi khối lượng công việc.'
              : 'Gán thành viên vào ban sản xuất để phân bổ trang và panel.'}
          </p>
          {memberCount > 0 && assignChapterNumber !== null ? (
            <button
              type='button'
              onClick={onAssign}
              className='btn-cta-primary focus-ring h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer'
            >
              <UserPlus className='w-3.5 h-3.5' aria-hidden='true' />
              <span>Giao việc mới (Chương {assignChapterNumber})</span>
            </button>
          ) : (
            <button
              type='button'
              onClick={onManageMembers}
              className='btn-cta-secondary focus-ring h-9 px-3 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap'
            >
              <UserPlus className='w-3.5 h-3.5' aria-hidden='true' />
              <span>Gán thành viên vào Series</span>
            </button>
          )}
        </div>
      ) : (
        <div className='space-y-2.5'>
          {rows.map((w) => (
            <div
              key={w.userId + w.role}
              className='p-3 border border-stone-200 rounded-lg space-y-2'
            >
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2.5 min-w-0'>
                  <div className='w-8 h-8 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center shrink-0'>
                    {(w.fullName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className='min-w-0'>
                    <div className='text-xs font-bold text-stone-900 truncate'>{w.fullName}</div>
                    <span
                      className={`inline-block px-1.5 rounded text-xs font-medium border ${NEUTRAL_BADGE}`}
                    >
                      {w.role}
                    </span>
                  </div>
                </div>
                {w.overdue > 0 && (
                  <span className='px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 shrink-0'>
                    {w.overdue} Quá hạn
                  </span>
                )}
              </div>
              <div className='grid grid-cols-3 gap-2 pt-2 border-t border-stone-100 text-xs font-mono text-center tabular-nums'>
                <Counter label='Đang làm' value={w.open} tone='text-blue-800' />
                <Counter label='Chờ duyệt' value={w.waitingReview} tone='text-amber-800' />
                <Counter label='Hoàn thành' value={w.done} tone='text-emerald-700' />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
