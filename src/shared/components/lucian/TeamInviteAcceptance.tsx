/* Lucian UX/UI Prompt #285 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#285 */
/* Adapted for PanelForge Editorial AI Studio Design System */

import React, { useState, useEffect, useRef } from 'react';
import '@/styles/modules/lucian/lucian-285.css';

export interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  color?: string;
  isOwner?: boolean;
  status: 'Pending' | 'Active' | 'Joined';
}

export interface TeamInviteAcceptanceProps {
  workspaceName?: string;
  initialMembers?: Array<{
    id?: string;
    name: string;
    email: string;
    role: string;
    isOwner?: boolean;
    status?: 'Pending' | 'Active' | 'Joined';
  }>;
  availableRoles?: string[];
  onInvite?: (email: string, role: string) => Promise<void> | void;
  onRoleChange?: (id: string, email: string, newRole: string) => void;
  className?: string;
}

const PALETTE = ['#F97316', '#6366F1', '#EC4899', '#0EA5E9', '#10B981', '#8B5CF6'];
const DEFAULT_ROLES = ['Artist', 'Writer', 'Editor', 'Letterer', 'Publisher'];

export const TeamInviteAcceptance: React.FC<TeamInviteAcceptanceProps> = ({
  workspaceName = 'Studio Workspace',
  initialMembers = [],
  availableRoles = DEFAULT_ROLES,
  onInvite,
  onRoleChange,
  className = '',
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize members list
  const [members, setMembers] = useState<TeamMemberItem[]>(() => {
    if (initialMembers.length > 0) {
      return initialMembers.map((m, idx) => ({
        id: m.id || `mem-${idx}-${m.email}`,
        name: m.name || m.email.split('@')[0],
        email: m.email,
        role: m.role || 'Artist',
        color: PALETTE[idx % PALETTE.length],
        isOwner: !!m.isOwner,
        status: m.status || (m.isOwner ? 'Active' : 'Joined'),
      }));
    }
    return [
      {
        id: 'owner-1',
        name: 'Studio Owner',
        email: 'owner@panelforge.studio',
        role: 'Producer',
        color: PALETTE[0],
        isOwner: true,
        status: 'Active',
      },
    ];
  });

  useEffect(() => {
    if (initialMembers.length > 0) {
      setMembers(
        initialMembers.map((m, idx) => ({
          id: m.id || `mem-${idx}-${m.email}`,
          name: m.name || m.email.split('@')[0],
          email: m.email,
          role: m.role || 'Artist',
          color: PALETTE[idx % PALETTE.length],
          isOwner: !!m.isOwner,
          status: m.status || (m.isOwner ? 'Active' : 'Joined'),
        })),
      );
    }
  }, [initialMembers]);

  const memberListRef = useRef<HTMLUListElement>(null);
  const activeCount = members.filter((m) => m.status === 'Active' || m.status === 'Joined').length;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailInput.trim());

  const currentRole = availableRoles[selectedRoleIndex % availableRoles.length];

  const handleToggleRole = () => {
    setSelectedRoleIndex((prev) => (prev + 1) % availableRoles.length);
  };

  const handleCycleMemberRole = (member: TeamMemberItem) => {
    if (member.isOwner) return;

    setAnimatingId(member.id);
    const currentIndex = availableRoles.indexOf(member.role);
    const nextRole = availableRoles[(currentIndex + 1) % availableRoles.length];

    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m)),
    );

    onRoleChange?.(member.id, member.email, nextRole);

    setTimeout(() => {
      setAnimatingId(null);
    }, 400);
  };

  const handleSendInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isEmailValid || isSubmitting) return;

    const trimmedEmail = emailInput.trim();
    const newId = `invite-${Date.now()}`;
    const newMember: TeamMemberItem = {
      id: newId,
      name: trimmedEmail.split('@')[0],
      email: trimmedEmail,
      role: currentRole,
      color: PALETTE[(members.length + 1) % PALETTE.length],
      isOwner: false,
      status: 'Pending',
    };

    setIsSubmitting(true);
    setErrorMessage('');
    setMembers((prev) => [newMember, ...prev]);
    setEmailInput('');

    try {
      if (onInvite) {
        await onInvite(trimmedEmail, currentRole);
      }
    } catch (err: any) {
      setMembers((prev) => prev.filter((m) => m.id !== newId));
      setErrorMessage(err?.message || 'Không thể gửi lời mời. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`ux u285 ${className}`}>
      {/* Header with Live Counter Badge */}
      <div className='u285-hd'>
        <div className='u285-hd-title'>
          <span>Thành viên</span>
          <span className='u285-ct' aria-label={`${activeCount} thành viên`}>
            {activeCount}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className='mx-4 mt-3 p-2 bg-red-50 text-red-600 text-[11px] rounded-lg border border-red-200 flex items-center justify-between'>
          <span>{errorMessage}</span>
          <button
            type='button'
            onClick={() => setErrorMessage('')}
            className='text-red-400 hover:text-red-700 ml-2 font-bold cursor-pointer'
          >
            ×
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendInvite} className='u285-fm'>
        <input
          className='u285-in'
          type='email'
          placeholder='Nhập email...'
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          aria-label='Email mời'
          autoComplete='off'
        />

        <button
          type='button'
          onClick={handleToggleRole}
          className='u285-rl'
          title='Đổi vai trò mặc định'
          aria-label={`Vai trò: ${currentRole}`}
        >
          <span>{currentRole}</span>
          <svg viewBox='0 0 9 9' aria-hidden='true'>
            <path
              d='M1.5 3l3 3 3-3'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </button>

        <button
          type='submit'
          disabled={!isEmailValid || isSubmitting}
          className='u285-go'
        >
          {isSubmitting ? 'Đang gửi...' : 'Mời'}
        </button>
      </form>

      {/* Animated Members List */}
      <ul ref={memberListRef} className='u285-ls custom-scrollbar' aria-live='polite'>
        {members.map((m) => {
          const isPending = m.status === 'Pending';
          const isJoined = m.status === 'Joined' || m.status === 'Active';

          return (
            <li key={m.id} className='u285-it'>
              <div>
                <div className='u285-rw'>
                  {/* Dynamic Scaled Avatar */}
                  <span
                    className='u285-av'
                    style={
                      {
                        '--c': m.color,
                        '--k': isPending ? 0 : 1,
                      } as React.CSSProperties
                    }
                  >
                    <span>{m.name.charAt(0).toUpperCase()}</span>
                  </span>

                  {/* Member Name and Email */}
                  <div className='u285-tx'>
                    <b>{m.name}</b>
                    <small>{m.email}</small>
                  </div>

                  {/* Status Indicator Badge */}
                  {isPending && (
                    <span className='u285-st pd' title='Chưa xác nhận email'>
                      Chờ duyệt
                    </span>
                  )}
                  {m.status === 'Joined' && (
                    <span className='u285-st ok' title='Đã tham gia'>
                      Đã tham gia
                    </span>
                  )}

                  {/* Role Button (Click to cycle roles) */}
                  <button
                    type='button'
                    disabled={m.isOwner}
                    onClick={() => handleCycleMemberRole(m)}
                    className={`u285-rb ${animatingId === m.id ? 'is-fl' : ''}`}
                    aria-label={`${m.name} - ${m.isOwner ? 'Chủ phòng' : m.role}`}
                    title={m.isOwner ? 'Chủ phòng' : 'Bấm để đổi vai trò'}
                  >
                    {m.isOwner ? 'Chủ phòng' : m.role}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
