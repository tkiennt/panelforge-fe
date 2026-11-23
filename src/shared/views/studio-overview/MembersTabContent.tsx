import React from 'react';
import { Search, Mail, Key, Edit3, Trash2, ShieldCheck } from 'lucide-react';

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
  onOpenInviteModal?: () => void;
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
  onOpenInviteModal,
}) => {
  return (
    <div role='tabpanel' id='tabpanel-members' aria-labelledby='tab-members' className='space-y-5 animate-in fade-in duration-200'>
      {/* Stitch Header Row with Heading & Invite CTA */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h2 className='text-xl font-bold text-stone-900 flex items-center gap-2'>
            <span>Danh sách Nhân sự Studio</span>
            <span className='text-stone-500 font-normal text-base'>
              ({filteredMembers.length} Thành viên)
            </span>
          </h2>
          <p className='text-xs text-stone-500 mt-0.5'>
            Phân quyền vai trò sáng tác, phụ trách bảng mẫu nhân vật và giám sát biên tập
          </p>
        </div>

        {canCreateStudio && onOpenInviteModal && (
          <button
            type='button'
            onClick={onOpenInviteModal}
            className='inline-flex items-center gap-1.5 bg-orange-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-orange-700 transition-colors shadow-xs cursor-pointer shrink-0'
          >
            <ShieldCheck className='w-4 h-4' />
            <span>+ Mời thành viên</span>
          </button>
        )}
      </div>

      {/* Tab Filter Row & Search */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar'>
          {[
            { key: 'ALL', label: 'Tất cả thành viên', count: tabCounts.ALL },
            { key: 'LEAD', label: 'Giám đốc Sản xuất', count: tabCounts.LEAD },
            { key: 'ARTIST', label: 'Họa sĩ', count: tabCounts.ARTIST },
            { key: 'WRITER', label: 'Biên kịch', count: tabCounts.WRITER },
            { key: 'EDITOR', label: 'Biên tập viên', count: tabCounts.EDITOR },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => onMemberRoleFilterChange(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                memberRoleFilter === tab.key
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  memberRoleFilter === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className='relative w-full sm:w-72'>
          <Search className='w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2' />
          <input
            type='text'
            placeholder='Tìm kiếm thành viên theo tên, vai trò...'
            value={memberSearchQuery}
            onChange={(e) => onMemberSearchQueryChange(e.target.value)}
            className='pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-600 w-full shadow-2xs transition-all'
          />
        </div>
      </div>

      {/* Stitch Members Table */}
      <div className='bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse text-xs'>
            <thead>
              <tr className='border-b border-stone-200 bg-[#FAF9F5] text-stone-500 font-semibold uppercase tracking-wider text-[11px]'>
                <th className='py-3.5 px-4'>Thành viên</th>
                <th className='py-3.5 px-4'>Vai trò cốt lõi</th>
                <th className='py-3.5 px-4'>Bộ truyện đang tham gia</th>
                <th className='py-3.5 px-4'>Trạng thái công việc</th>
                <th className='py-3.5 px-4 text-right'>Tác vụ</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-stone-100 text-stone-800'>
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className='py-12 text-center text-xs text-stone-500'>
                    Không có thành viên nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => {
                  const roleStr = (member.role || 'MEMBER').toUpperCase();
                  const isProducer = roleStr === 'PRODUCER' || member.isOwner;
                  const isEditor = roleStr === 'EDITOR';
                  const isWriter = roleStr === 'WRITER';
                  const isArtist = roleStr === 'ARTIST' || roleStr === 'LEAD';

                  const roleBadgeClass = isProducer
                    ? 'bg-orange-100 text-orange-700'
                    : isEditor
                      ? 'bg-sky-100 text-sky-700'
                      : isArtist
                        ? 'bg-amber-100 text-amber-800'
                        : isWriter
                          ? 'bg-stone-100 text-stone-700'
                          : 'bg-stone-100 text-stone-700';

                  const roleDisplayName = isProducer
                    ? 'Producer / Chủ nhiệm'
                    : isWriter
                      ? 'Biên kịch chính (Writer)'
                      : isArtist
                        ? 'Họa sĩ chính (Lead Artist)'
                        : isEditor
                          ? 'Biên tập viên (Editor)'
                          : member.role || 'Thành viên';

                  const avatarBg = isProducer
                    ? '#FFEDD5'
                    : isArtist
                      ? '#FEF3C7'
                      : isEditor
                        ? '#E0F2FE'
                        : '#F5F5F4';

                  const avatarText = isProducer
                    ? '#C2410C'
                    : isArtist
                      ? '#92400E'
                      : isEditor
                        ? '#0369A1'
                        : '#44403C';

                  return (
                    <tr key={member.id} className='hover:bg-stone-50 transition-colors'>
                      <td className='py-3 px-4'>
                        <div className='flex items-center gap-3'>
                          <div
                            className='w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-xs shadow-2xs'
                            style={{ backgroundColor: avatarBg, color: avatarText }}
                          >
                            {member.initials || 'ME'}
                          </div>
                          <div>
                            <div className='font-semibold text-stone-900 text-xs flex items-center gap-1.5'>
                              <span>{member.name}</span>
                              {member.isOwner && (
                                <span className='text-[9px] px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 font-bold'>
                                  Chủ Studio
                                </span>
                              )}
                              {member.isYou && (
                                <span className='text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 font-bold'>
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className='text-[11px] text-stone-400 font-mono mt-0.5'>
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className='py-3 px-4'>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${roleBadgeClass}`}>
                          {roleDisplayName}
                        </span>
                      </td>

                      <td className='py-3 px-4'>
                        <span className='font-medium text-stone-700'>
                          {isProducer ? 'Tất cả Series (Toàn quyền)' : 'Theo phân bổ dự án'}
                        </span>
                      </td>

                      <td className='py-3 px-4'>
                        {member.isEmailConfirmed === false ? (
                          <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold'>
                            <span className='w-1.5 h-1.5 rounded-full bg-amber-500' />
                            Chờ kích hoạt
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold'>
                            <span className='w-1.5 h-1.5 rounded-full bg-emerald-600' />
                            Đang hoạt động
                          </span>
                        )}
                      </td>

                      <td className='py-3 px-4 text-right'>
                        {canCreateStudio ? (
                          <div className='flex items-center justify-end gap-2'>
                            {member.isEmailConfirmed === false && (
                              <button
                                type='button'
                                onClick={() => onResendInvitation(member.id)}
                                className='text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer'
                              >
                                Gửi lại
                              </button>
                            )}
                            <button
                              type='button'
                              onClick={() => onOpenEditAccess(member)}
                              className='text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer'
                            >
                              Điều chỉnh
                            </button>
                            {!member.isOwner && (
                              <button
                                type='button'
                                onClick={() => onDeleteMember({ id: member.id, email: member.email })}
                                className='text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer'
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className='text-stone-400 font-medium'>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
