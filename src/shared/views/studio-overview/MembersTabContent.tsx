import React from 'react';
import { Search, Mail, Key, Edit3, Trash2 } from 'lucide-react';

const ROLE_BADGE_STYLE: Record<string, string> = {
  PRODUCER: 'bg-purple-50 text-purple-700 border-purple-200',
  LEAD: 'bg-purple-50 text-purple-700 border-purple-200',
  EDITOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WRITER: 'bg-blue-50 text-blue-700 border-blue-200',
  ARTIST: 'bg-amber-50 text-amber-700 border-amber-200',
  LETTERER: 'bg-pink-50 text-pink-700 border-pink-200',
  PUBLISHER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ADMINISTRATOR: 'bg-red-50 text-red-700 border-red-200',
};

export interface MembersTabContentProps {
  filteredMembers: any[];
  tabCounts: { ALL: number; LEAD: number; ARTIST: number; WRITER: number; EDITOR: number };
  memberRoleFilter: string;
  onMemberRoleFilterChange: (role: any) => void;
  memberSearchQuery: string;
  onMemberSearchQueryChange: (query: string) => void;
  canCreateStudio: boolean;
  onResendInvitation: (memberId: string) => void;
  onOpenEditAccess: (member: any) => void;
  onDeleteMember: (member: { id: string; email: string }) => void;
}

export const MembersTabContent: React.FC<MembersTabContentProps> = ({
  filteredMembers,
  tabCounts,
  memberRoleFilter,
  onMemberRoleFilterChange,
  memberSearchQuery,
  onMemberSearchQueryChange,
  canCreateStudio,
  onResendInvitation,
  onOpenEditAccess,
  onDeleteMember,
}) => {

  return (
    <div role='tabpanel' id='tabpanel-members' aria-labelledby='tab-members' className='space-y-6'>
      {/* Tab Selection Row & Search */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar'>
          {[
            { key: 'ALL', label: 'Tất cả thành viên', count: tabCounts.ALL },
            { key: 'LEAD', label: 'Giám đốc Sản xuất', count: tabCounts.LEAD },
            { key: 'ARTIST', label: 'Họa sĩ', count: tabCounts.ARTIST },
            { key: 'WRITER', label: 'Biên kịch & Storyboard', count: tabCounts.WRITER },
            { key: 'EDITOR', label: 'Biên tập viên', count: tabCounts.EDITOR },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onMemberRoleFilterChange(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-soft-sm ${
                memberRoleFilter === tab.key
                  ? 'bg-[#292524] text-white'
                  : 'bg-white text-[#4e4e4e] border border-[#e7e5e4] hover:bg-[#f0efed] hover:text-[#0c0a09]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                  memberRoleFilter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-[#f0efed] text-[#4e4e4e]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className='relative'>
          <Search className='w-3.5 h-3.5 text-[#777169] absolute left-3.5 top-1/2 -translate-y-1/2' />
          <input
            type='text'
            placeholder='Tìm kiếm thành viên theo tên, vai trò...'
            value={memberSearchQuery}
            onChange={(e) => onMemberSearchQueryChange(e.target.value)}
            className='pl-9 pr-4 py-2 bg-white rounded-full border border-[#e7e5e4] text-xs text-[#0c0a09] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#292524]/10 w-64 shadow-soft-sm transition-all'
          />
        </div>
      </div>

      {/* Members List */}
      <div className='bg-white border border-[#f0efed] rounded-2xl overflow-hidden shadow-soft-sm'>
        <div className='p-4 bg-[#fafafa] border-b border-[#f0efed] flex items-center justify-between'>
          <h3 className='text-sm font-serif font-light text-[#0c0a09]'>
            Thành viên Studio ({filteredMembers.length})
          </h3>
        </div>


        <div className='divide-y divide-[#E7E7E7]'>
          {filteredMembers.length === 0 ? (
            <div className='p-8 text-center text-xs text-[#888888] font-mono'>
              Không có thành viên nào phù hợp với bộ lọc hiện tại.
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                className='p-5 hover:bg-[#FAF8F4] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4'
              >
                {/* Member Info */}
                <div className='flex items-start sm:items-center gap-4'>
                  <div
                    className='w-11 h-11 rounded-full text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white'
                    style={{ backgroundColor: member.avatarBg || '#171717' }}
                  >
                    {member.initials || 'ST'}
                  </div>

                  <div>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h4 className='text-sm font-bold text-[#171717] font-serif'>{member.name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold tracking-wider ${
                          ROLE_BADGE_STYLE[member.role] ||
                          'bg-stone-50 text-stone-700 border-stone-200'
                        }`}
                      >
                        {(member.role || 'MEMBER').toUpperCase()}
                      </span>
                      {member.isOwner && (
                        <span className='px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 text-xs font-mono font-bold'>
                          STUDIO OWNER
                        </span>
                      )}
                      {member.isYou && (
                        <span className='px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-mono font-bold'>
                          YOU
                        </span>
                      )}
                      <span
                        className='inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-medium'
                        title='Khóa chữ ký số mật mã ECDSA P-256 đang hoạt động'
                      >
                        <Key className='w-3 h-3 text-emerald-600' />
                        <span>ECDSA P-256</span>
                      </span>
                      <span className='flex items-center gap-1 text-xs font-medium'>
                        {member.isEmailConfirmed === false ? (
                          <span className='text-[#D97706] flex items-center gap-1 bg-[#FEF3C7] px-1.5 py-0.5 rounded-sm border border-[#FDE68A]'>
                            Chờ kích hoạt
                          </span>
                        ) : (
                          <span className='text-[#059669] flex items-center gap-1'>
                            <span className='w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse'></span>
                            {member.status}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className='flex flex-wrap items-center gap-3 text-xs text-[#555555] mt-1 font-mono'>
                      <span className='flex items-center gap-1'>
                        <Mail className='w-3 h-3 text-[#888888]' />
                        {member.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex flex-col sm:flex-row sm:items-center gap-4 self-end md:self-center shrink-0'>
                  {canCreateStudio && (
                    <div className='flex items-center gap-2'>
                      {member.isEmailConfirmed === false && (
                        <button
                          onClick={() => onResendInvitation(member.id)}
                          className='px-3 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#888888] hover:text-[#171717] transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                        >
                          <Mail className='w-3 h-3' />
                          <span className='hidden sm:inline'>Gửi lại lời mời</span>
                        </button>
                      )}
                      <button
                        onClick={() => onOpenEditAccess(member)}
                        className='px-3 py-1.5 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] rounded-lg text-xs font-semibold text-[#171717] transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                      >
                        <Edit3 className='w-3 h-3 text-[#F97316]' />
                        <span>Sửa quyền</span>
                      </button>
                      {!member.isOwner && (
                        <button
                          onClick={() => onDeleteMember({ id: member.id, email: member.email })}
                          className='px-3 py-1.5 bg-white hover:bg-red-50 border border-[#E7E7E7] hover:border-red-200 rounded-lg text-xs font-semibold text-red-600 transition-colors cursor-pointer shadow-2xs flex items-center gap-1'
                        >
                          <Trash2 className='w-3 h-3' />
                          <span className='hidden sm:inline'>Xóa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
