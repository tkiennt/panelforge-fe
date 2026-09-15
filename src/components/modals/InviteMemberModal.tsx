import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, Key } from 'lucide-react';
import { StudioMember } from '../../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (newMember: StudioMember) => void;
  onShowToast: (title: string, desc: string) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  onShowToast,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Key Inker & Line Artist');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const initials = name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const member: StudioMember = {
      id: `member-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: role,
      avatarBg: '#F97316',
      initials: initials || 'ME',
      status: 'Active • Newly Assigned',
      activeTask: 'Chapter 5 Production Inks',
      cryptoKey: `ECDSA-P256 [0x${Math.random().toString(16).substr(2, 4).toUpperCase()}...${Math.random().toString(16).substr(2, 3).toUpperCase()}]`,
      permissions: ['600 DPI Upload', 'AI Pose Assist', 'Inking Pass'],
    };

    onInvite(member);
    onShowToast(
      'Member Invited',
      `${member.name} has been provisioned with cryptographic signing key.`,
    );
    onClose();
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <UserPlus className='w-4 h-4 text-[#F97316]' />
            <h3 className='font-display font-bold text-base text-[#171717]'>
              Invite Studio Production Member
            </h3>
          </div>
          <button
            onClick={onClose}
            className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
              Full Name
            </label>
            <input
              type='text'
              required
              placeholder='e.g. Kenji Satō'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            />
          </div>

          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
              Studio Email
            </label>
            <input
              type='email'
              required
              placeholder='e.g. artist@panelforge.studio'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316]'
            />
          </div>

          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
              Production Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
            >
              <option>Key Inker &amp; Line Artist</option>
              <option>Storyboard &amp; Screenplay</option>
              <option>Screentone &amp; Backgrounds</option>
              <option>Colorist &amp; Lettering FX</option>
              <option>Chief Editorial &amp; Compliance</option>
            </select>
          </div>

          <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7] text-xs font-mono text-[#555555] space-y-1'>
            <div className='text-[10px] text-[#888888] uppercase'>Security Notice</div>
            <p className='text-[11px] leading-relaxed'>
              Invited member will be automatically assigned an ECDSA cryptographic key for Tankōbon
              audit verification.
            </p>
          </div>

          <div className='pt-2 flex items-center justify-between'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer'
            >
              Provision Seat &amp; Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
