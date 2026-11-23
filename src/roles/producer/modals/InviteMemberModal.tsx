import React, { useState } from 'react';
import { Mail, UserPlus, Send, AlertTriangle } from 'lucide-react';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

export interface InviteMemberModalProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceName?: string;
  initialMode?: 'interactive' | 'batch';
  onClose: () => void;
  onInvited: (newMember: WorkspaceMemberDto) => void;
  onShowToast: (title: string, desc: string) => void;
}

interface RoleOption {
  value: string;
  titleKey: string;
  descKey: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'Writer',
    titleKey: 'members.studioInviteModal.roles.writerTitle',
    descKey: 'members.studioInviteModal.roles.writerDesc',
  },
  {
    value: 'Artist',
    titleKey: 'members.studioInviteModal.roles.leadArtistTitle',
    descKey: 'members.studioInviteModal.roles.leadArtistDesc',
  },
  {
    value: 'Letterer',
    titleKey: 'members.studioInviteModal.roles.inkerTitle',
    descKey: 'members.studioInviteModal.roles.inkerDesc',
  },
  {
    value: 'Editor',
    titleKey: 'members.studioInviteModal.roles.editorTitle',
    descKey: 'members.studioInviteModal.roles.editorDesc',
  },
];

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  workspaceId,
  onClose,
  onInvited,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('Artist');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg(t('members.studioInviteModal.errorEmptyEmail'));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMsg(t('members.studioInviteModal.errorInvalidEmail'));
      return;
    }

    if (!workspaceId) {
      setErrorMsg(t('members.studioInviteModal.errorSendFailed'));
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const addedMember = await workspaceService.addMember(workspaceId, {
        email: trimmedEmail,
        role: selectedRole,
      });

      const pendingMember: WorkspaceMemberDto = {
        ...addedMember,
        status: addedMember.status || 'Pending',
        isEmailConfirmed: addedMember.isEmailConfirmed ?? false,
      };

      onInvited(pendingMember);
      onShowToast(
        t('members.studioInviteModal.toastSuccessTitle'),
        t('members.studioInviteModal.toastSuccessDesc', { email: trimmedEmail }),
      );
      setEmail('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || t('members.studioInviteModal.errorSendFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = (
    <div className='flex items-center gap-3'>
      <div className='w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0'>
        <UserPlus className='w-5 h-5 text-orange-600' />
      </div>
      <div>
        <div className='font-bold text-stone-900 text-base'>
          {t('members.studioInviteModal.title')}
        </div>
        <div className='text-xs text-stone-500 font-normal mt-0.5'>
          {t('members.studioInviteModal.subtitle')}
        </div>
      </div>
    </div>
  );

  const modalFooter = (
    <div className='flex items-center justify-end gap-2.5 w-full'>
      <button
        type='button'
        onClick={onClose}
        className='px-4 py-2.5 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors text-xs'
      >
        {t('members.studioInviteModal.cancelBtn')}
      </button>
      <button
        type='submit'
        form='invite-studio-member-form'
        disabled={isSubmitting}
        className='px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-colors text-xs disabled:opacity-50'
      >
        <Send className='w-4 h-4' />
        <span>
          {isSubmitting
            ? t('members.studioInviteModal.submitting')
            : t('members.studioInviteModal.submitBtn')}
        </span>
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      footer={modalFooter}
      closeLabel={t('members.studioInviteModal.closeLabel')}
      size='md'
    >
      <form id='invite-studio-member-form' onSubmit={handleSubmit} className='flex flex-col gap-5 text-xs'>
        {errorMsg && (
          <div className='p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 shrink-0' />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className='flex flex-col gap-1.5'>
          <label htmlFor='invite-member-email' className='font-semibold text-stone-800 text-xs'>
            {t('members.studioInviteModal.emailLabel')} <span className='text-orange-600'>*</span>
          </label>
          <div className='relative'>
            <Mail className='w-4 h-4 text-stone-400 absolute left-3 top-2.5' />
            <input
              id='invite-member-email'
              type='text'
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('members.studioInviteModal.emailPlaceholder')}
              className='w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3.5 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium placeholder:text-stone-400'
            />
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between'>
            <label className='font-semibold text-stone-800 text-xs'>
              {t('members.studioInviteModal.roleLabel')} <span className='text-orange-600'>*</span>
            </label>
          </div>
          <div className='grid grid-cols-1 gap-2 overflow-y-auto pr-1'>
            {ROLE_OPTIONS.map((role) => {
              const isSelected = selectedRole === role.value;
              return (
                <label
                  key={role.value}
                  className={`border rounded-xl px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-orange-600 bg-orange-50/50'
                      : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type='radio'
                    name='member_role'
                    value={role.value}
                    checked={isSelected}
                    onChange={() => setSelectedRole(role.value)}
                    className='accent-orange-600 shrink-0'
                  />
                  <div className='flex-1 flex flex-col'>
                    <span className='font-semibold text-stone-900 text-xs'>{t(role.titleKey)}</span>
                    <p className='text-xs text-stone-500 mt-0.5'>{t(role.descKey)}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
};
