import React from 'react';
import { Lock, Send, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export interface MembersTabContentProps {
  filteredMembers: any[];
  tabCounts?: { ALL: number; LEAD: number; ARTIST: number; WRITER: number; EDITOR: number };
  memberRoleFilter?: string;
  onMemberRoleFilterChange?: (role: any) => void;
  memberSearchQuery?: string;
  onMemberSearchQueryChange?: (query: string) => void;
  canCreateStudio: boolean;
  onResendInvitation?: (memberId: string) => void;
  onOpenEditAccess: (member: any) => void;
  onDeleteMember?: (member: { id: string; email: string }) => void;
  onOpenInviteModal?: () => void;
}

export const MembersTabContent: React.FC<MembersTabContentProps> = ({
  filteredMembers,
  canCreateStudio,
  onResendInvitation,
  onOpenEditAccess,
  onDeleteMember,
  onOpenInviteModal,
}) => {
  const { t } = useTranslation();

  const getInitials = (name?: string, email?: string): string => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'ME';
  };

  return (
    <div
      role='tabpanel'
      id='tabpanel-members'
      aria-labelledby='tab-members'
      className='flex flex-col gap-5 animate-in fade-in duration-200'
    >
      {/* Stitch Header */}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h2 className='font-serif text-2xl font-bold text-stone-900'>
            {t('members.crewTab.title')}{' '}
            <span className='text-stone-500 font-normal text-base' id='crew-count-heading'>
              ({filteredMembers.length} {t('members.crewTab.memberCountUnit')})
            </span>
          </h2>
          <p className='text-xs text-stone-500 mt-0.5'>{t('members.crewTab.subtitle')}</p>
        </div>

        {canCreateStudio && onOpenInviteModal && (
          <button
            type='button'
            onClick={onOpenInviteModal}
            className='inline-flex items-center gap-1.5 bg-orange-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-orange-700 transition-colors shadow-xs cursor-pointer'
          >
            <UserPlus className='w-4 h-4' />
            <span>{t('members.crewTab.inviteBtn')}</span>
          </button>
        )}
      </div>

      {/* Stitch Table */}
      <div className='bg-white border border-stone-200 rounded-xl shadow-xs overflow-x-auto'>
        <table className='w-full text-left border-collapse text-xs'>
          <thead>
            <tr className='border-b border-stone-200 bg-[#FAF9F5] text-stone-500 font-semibold uppercase tracking-wider text-xs'>
              <th className='py-3 px-4'>{t('members.crewTab.colMember')}</th>
              <th className='py-3 px-4'>{t('members.crewTab.colRole')}</th>
              <th className='py-3 px-4'>{t('members.crewTab.colSeries')}</th>
              <th className='py-3 px-4'>{t('members.crewTab.colStatus')}</th>
              <th className='py-3 px-4 text-right'>{t('members.crewTab.colActions')}</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-stone-100 text-stone-800' id='crew-table-body'>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className='py-12 text-center text-xs text-stone-500'>
                  {t('members.crewTab.empty')}
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const roleStr = String(member.role || 'MEMBER').toUpperCase();
                const isProducer = roleStr === 'PRODUCER' || roleStr === '0' || member.isOwner;
                const isEditor = roleStr === 'EDITOR' || roleStr === '4';
                const isWriter = roleStr === 'WRITER' || roleStr === '1';
                const isArtist = roleStr === 'ARTIST' || roleStr === 'LEAD' || roleStr === '2';
                const isLetterer = roleStr === 'LETTERER' || roleStr === '3';
                const isPublisher = roleStr === 'PUBLISHER';
                const memberId: string = member.userId || member.id;

                const roleBadgeClass = isProducer
                  ? 'bg-orange-100 text-orange-700'
                  : isEditor
                    ? 'bg-sky-100 text-sky-700'
                    : isArtist
                      ? 'bg-amber-100 text-amber-800'
                      : isWriter
                        ? 'bg-stone-100 text-stone-700'
                        : isLetterer
                          ? 'bg-stone-100 text-stone-700'
                          : 'bg-stone-100 text-stone-700';

                const roleDisplayName = isProducer
                  ? t('members.crewTab.roleProducer')
                  : isWriter
                    ? t('members.crewTab.roleWriter')
                    : isArtist
                      ? t('members.crewTab.roleArtist')
                      : isEditor
                        ? t('members.crewTab.roleEditor')
                        : isLetterer
                          ? t('members.crewTab.roleLetterer')
                          : isPublisher
                            ? t('members.crewTab.rolePublisher')
                            : member.role || t('members.crewTab.roleDefault');

                const avatarColorClass = isProducer
                  ? 'bg-orange-100 text-orange-700'
                  : isEditor
                    ? 'bg-sky-100 text-sky-700'
                    : isArtist
                      ? 'bg-amber-100 text-amber-800'
                      : isWriter
                        ? 'bg-stone-200 text-stone-700'
                        : 'bg-stone-100 text-stone-700';

                const memberName = member.fullName || member.name || member.email?.split('@')[0];
                const initials = getInitials(member.fullName || member.name, member.email);
                const isPending = member.status === 'Pending' || member.isEmailConfirmed === false;

                return (
                  <tr
                    key={member.userId || member.id || member.email}
                    className='hover:bg-stone-50 transition-colors'
                  >
                    <td className='py-3 px-4 flex items-center gap-3'>
                      <div
                        className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-xs ${avatarColorClass}`}
                      >
                        {initials}
                      </div>
                      <div>
                        <div className='font-semibold text-stone-900 text-xs flex items-center gap-1.5'>
                          <span>{memberName}</span>
                          {member.isOwner && (
                            <span className='px-1.5 py-0.2 rounded text-xs bg-orange-100 text-orange-700 font-bold'>
                              {t('members.crewTab.ownerBadge')}
                            </span>
                          )}
                          {member.isYou && (
                            <span className='px-1.5 py-0.2 rounded text-xs bg-blue-100 text-blue-700 font-bold'>
                              {t('members.crewTab.youBadge')}
                            </span>
                          )}
                        </div>
                        <div className='text-xs text-stone-500 mt-0.5'>{member.email}</div>
                      </div>
                    </td>

                    <td className='py-3 px-4'>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadgeClass}`}
                      >
                        {roleDisplayName}
                      </span>
                    </td>

                    <td className='py-3 px-4'>
                      <span className='font-medium text-stone-700'>
                        {isProducer
                          ? t('members.crewTab.allSeriesFullAccess')
                          : member.participatingSeries || member.seriesName || '—'}
                      </span>
                    </td>

                    <td className='py-3 px-4'>
                      {isPending ? (
                        <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold'>
                          <span className='w-1.5 h-1.5 rounded-full bg-amber-600' />
                          {t('members.crewTab.statusPending')}
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold'>
                          <span className='w-1.5 h-1.5 rounded-full bg-emerald-600' />
                          {t('members.crewTab.statusActive')}
                        </span>
                      )}
                    </td>

                    <td className='py-3 px-4 text-right'>
                      {member.isOwner ? (
                        <span
                          className='inline-flex items-center gap-1 text-stone-400'
                          title={t('members.crewTab.ownerLockedHint')}
                        >
                          <Lock className='size-3.5' aria-hidden='true' />
                          <span className='sr-only'>{t('members.crewTab.ownerLockedHint')}</span>
                        </span>
                      ) : canCreateStudio ? (
                        <div className='inline-flex items-center justify-end gap-1.5'>
                          {isPending && onResendInvitation && (
                            <button
                              type='button'
                              onClick={() => onResendInvitation(memberId)}
                              className='focus-ring inline-flex min-h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 cursor-pointer'
                            >
                              <Send className='size-3.5' aria-hidden='true' />
                              {t('members.crewTab.actionResend')}
                            </button>
                          )}
                          <button
                            type='button'
                            onClick={() => onOpenEditAccess(member)}
                            className='focus-ring inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 shadow-2xs hover:border-head-line hover:text-stone-900 cursor-pointer'
                          >
                            <ShieldCheck className='size-3.5 text-orange-600' aria-hidden='true' />
                            {t('members.crewTab.actionEditAccess')}
                          </button>
                          {onDeleteMember && (
                            <button
                              type='button'
                              onClick={() => onDeleteMember({ id: memberId, email: member.email })}
                              aria-label={`${t('members.crewTab.actionDelete')} ${memberName}`}
                              title={t('members.crewTab.actionDelete')}
                              className='focus-ring inline-flex size-8 items-center justify-center rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer'
                            >
                              <Trash2 className='size-3.5' aria-hidden='true' />
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
  );
};
