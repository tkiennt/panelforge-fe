import React from 'react';
import { ArrowRight, Crown, Palette, PenTool, Users } from 'lucide-react';
import type { SeriesMemberDto } from '@/services/series.service';
import { NEUTRAL_BADGE } from './dashboardFormat';

const VISIBLE_MEMBERS = 5;

const roleIconFor = (role: string) =>
  role === 'PRODUCER' ? Crown : role === 'ARTIST' ? Palette : role === 'EDITOR' ? PenTool : Users;

export const SeriesTeamCard: React.FC<{ members: SeriesMemberDto[]; onManage: () => void }> = ({
  members,
  onManage,
}) => (
  <div className='bg-white border border-stone-200/80 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col h-full gap-3.5'>
    <div className='flex items-center justify-between border-b border-stone-100 pb-3'>
      <div>
        <h3 className='text-sm font-bold text-stone-900'>Đội ngũ sản xuất ({members.length})</h3>
        <p className='text-xs text-stone-600'>Nhân sự chính thức của bộ truyện</p>
      </div>
      <button
        type='button'
        onClick={onManage}
        className='focus-ring min-h-9 px-2 rounded-lg text-xs font-semibold text-orange-700 hover:text-orange-800 hover:bg-orange-50 cursor-pointer flex items-center gap-1'
      >
        <span>Quản lý</span>
        <ArrowRight className='w-3.5 h-3.5' aria-hidden='true' />
      </button>
    </div>

    {members.length === 0 ? (
      <div className='flex-1 py-8 flex flex-col items-center justify-center gap-2 text-center border-2 border-dashed border-stone-300 rounded-xl'>
        <p className='text-xs text-stone-600'>Chưa gán thành viên nào vào bộ truyện.</p>
        <button
          type='button'
          onClick={onManage}
          className='btn-cta-secondary focus-ring h-9 px-3 text-xs font-semibold cursor-pointer'
        >
          Gán thành viên vào Series
        </button>
      </div>
    ) : (
      <div className='space-y-2'>
        {members.slice(0, VISIBLE_MEMBERS).map((member) => {
          const roleLabel = member.seriesRole || (member as any).role || 'Thành viên';
          const RoleIcon = roleIconFor(String(roleLabel).toUpperCase());
          return (
            <div
              key={member.id || member.userId}
              className='flex items-center justify-between gap-2.5 p-2.5 rounded-lg border border-stone-200 text-xs'
            >
              <div className='flex items-center gap-2.5 min-w-0'>
                <div className='w-8 h-8 rounded-full bg-stone-900 text-white font-bold flex items-center justify-center shrink-0'>
                  {(member.fullName || member.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className='min-w-0'>
                  <div className='font-bold text-stone-900 truncate leading-tight'>
                    {member.fullName || member.email}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 rounded text-xs font-medium border mt-0.5 ${NEUTRAL_BADGE}`}
                  >
                    <RoleIcon className='w-3.5 h-3.5' aria-hidden='true' />
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {members.length > VISIBLE_MEMBERS && (
          <p className='text-xs font-mono text-stone-500 text-center pt-0.5'>
            + {members.length - VISIBLE_MEMBERS} thành viên khác
          </p>
        )}
      </div>
    )}
  </div>
);
