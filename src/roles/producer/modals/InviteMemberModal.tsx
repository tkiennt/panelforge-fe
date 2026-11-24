import React, { useState, useEffect } from 'react';
import { Mail, AlertTriangle, Plus, Trash2, User, UserPlus, X } from 'lucide-react';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';
import { TeamInviteAcceptance, TeamMemberItem } from '@/shared/components/lucian';
import { InviteResultModal, InviteResultItem } from './InviteResultModal';
import { Modal } from '@/shared/ui';
import { useTranslation } from '@/lib/i18n';

interface InviteMemberModalProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceName?: string;
  initialMode?: 'interactive' | 'batch';
  onClose: () => void;
  onInvited: (newMember: WorkspaceMemberDto) => void;
  onShowToast: (title: string, desc: string) => void;
}

interface MemberInviteEntry {
  id: string;
  email: string;
  role: string;
}

const AVAILABLE_ROLE_VALUES = [
  'Writer',
  'Artist',
  'Letterer',
  'Editor',
  'Publisher',
  'Producer',
] as const;

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  workspaceId,
  workspaceName,
  initialMode = 'interactive',
  onClose,
  onInvited,
  onShowToast,
}) => {
  const { t } = useTranslation('production');
  const [inviteMode, setInviteMode] = useState<'interactive' | 'batch'>(initialMode);
  const [existingMembers, setExistingMembers] = useState<TeamMemberItem[]>([]);

  // Batch email input state
  const [rawEmails, setRawEmails] = useState('');
  const [defaultRole, setDefaultRole] = useState('Artist');
  const [inviteList, setInviteList] = useState<MemberInviteEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Result modal state
  const [resultItems, setResultItems] = useState<InviteResultItem[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);

  // Single member invite state
  const [singleEmail, setSingleEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('Artist');
  const [singleLoading, setSingleLoading] = useState(false);

  useEffect(() => {
    setInviteMode(initialMode);
  }, [initialMode]);

  // Load existing workspace members
  useEffect(() => {
    if (isOpen && workspaceId) {
      workspaceService
        .getMembers(workspaceId)
        .then((mems) => {
          if (mems && mems.length > 0) {
            setExistingMembers(
              mems.map((m) => ({
                id: m.userId,
                name: m.fullName || m.email.split('@')[0],
                email: m.email,
                role: typeof m.role === 'string' ? m.role : String(m.role),
                isOwner: m.isOwner,
                status:
                  m.status === 'Active' || (m.isEmailConfirmed && m.status !== 'Pending')
                    ? 'Joined'
                    : 'Pending',
              })),
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen, workspaceId]);

  if (!isOpen) return null;

  // Direct single-member invitation
  const handleDirectInvite = async (email: string, role: string) => {
    if (!workspaceId) {
      throw new Error(t('producer.inviteMemberModal.workspaceNotFound'));
    }

    const addedMember = await workspaceService.addMember(workspaceId, {
      email,
      role: role as any,
    });

    const pendingMember: WorkspaceMemberDto = {
      ...addedMember,
      status: addedMember.status || 'Pending',
      isEmailConfirmed: addedMember.isEmailConfirmed ?? false,
    };

    onInvited(pendingMember);
    onShowToast(
      t('producer.inviteMemberModal.inviteSentTitle'),
      t('producer.inviteMemberModal.inviteSentSingleDesc', { email, role }),
    );
  };

  const handleRoleChangeDirect = async (id: string, email: string, newRole: string) => {
    if (!workspaceId || id.startsWith('invite-') || id.startsWith('mem-')) return;
    try {
      await workspaceService.updateMemberRole(workspaceId, id, { newRole });
      onShowToast(
        t('producer.inviteMemberModal.roleUpdatedTitle'),
        t('producer.inviteMemberModal.roleUpdatedDesc', { email, role: newRole }),
      );
    } catch (err: any) {
      onShowToast(
        t('producer.inviteMemberModal.roleUpdateErrorTitle'),
        err?.message || t('producer.inviteMemberModal.roleUpdateErrorDesc'),
      );
      throw err;
    }
  };

  // Parse emails in batch input
  const handleAddEmails = () => {
    if (!rawEmails.trim()) return;

    const extracted = rawEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (extracted.length === 0) {
      setErrorMsg(t('producer.inviteMemberModal.invalidEmailFormat'));
      return;
    }

    setErrorMsg('');
    const existingEmails = new Set(inviteList.map((i) => i.email));
    const newEntries: MemberInviteEntry[] = [];

    extracted.forEach((em) => {
      if (!existingEmails.has(em)) {
        existingEmails.add(em);
        newEntries.push({
          id: `${em}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          email: em,
          role: defaultRole,
        });
      }
    });

    if (newEntries.length === 0) {
      setErrorMsg(t('producer.inviteMemberModal.emailAlreadyInList'));
      return;
    }

    setInviteList([...inviteList, ...newEntries]);
    setRawEmails('');
  };

  const handleRemoveEntry = (id: string) => {
    setInviteList(inviteList.filter((item) => item.id !== id));
  };

  const handleRoleChange = (id: string, newRole: string) => {
    setInviteList(inviteList.map((item) => (item.id === id ? { ...item, role: newRole } : item)));
  };

  const handleApplyRoleToAll = (targetRole: string) => {
    setDefaultRole(targetRole);
    setInviteList(inviteList.map((item) => ({ ...item, role: targetRole })));
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentList = [...inviteList];
    if (rawEmails.trim()) {
      const extracted = rawEmails
        .split(/[\s,;]+/)
        .map((em) => em.trim().toLowerCase())
        .filter((em) => em.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));

      const existingEmails = new Set(currentList.map((i) => i.email));
      extracted.forEach((em) => {
        if (!existingEmails.has(em)) {
          existingEmails.add(em);
          currentList.push({
            id: `${em}-${Date.now()}`,
            email: em,
            role: defaultRole,
          });
        }
      });
    }

    if (currentList.length === 0) {
      setErrorMsg(t('producer.inviteMemberModal.atLeastOneEmail'));
      return;
    }

    if (!workspaceId) {
      setErrorMsg(t('producer.inviteMemberModal.workspaceNotFound'));
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    const results: InviteResultItem[] = [];

    for (const item of currentList) {
      try {
        const addedMember = await workspaceService.addMember(workspaceId, {
          email: item.email,
          role: item.role as any,
        });

        const pendingMember: WorkspaceMemberDto = {
          ...addedMember,
          status: addedMember.status || 'Pending',
          isEmailConfirmed: addedMember.isEmailConfirmed ?? false,
        };

        onInvited(pendingMember);

        results.push({
          email: item.email,
          role: item.role,
          success: true,
          message:
            addedMember.invitationEmailSent === false
              ? t('producer.inviteMemberModal.addedNoEmail')
              : t('producer.inviteMemberModal.emailSent'),
        });
      } catch (err: any) {
        results.push({
          email: item.email,
          role: item.role,
          success: false,
          message: err.message || t('producer.inviteMemberModal.inviteError'),
        });
      }
    }

    setIsSubmitting(false);
    setResultItems(results);
    setShowResultModal(true);

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      onShowToast(
        t('producer.inviteMemberModal.inviteSentTitle'),
        t('producer.inviteMemberModal.inviteSentBatchDesc', { count: successCount }),
      );
      setInviteList([]);
      setRawEmails('');
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail.trim()) return;
    setSingleLoading(true);
    try {
      await handleDirectInvite(singleEmail.trim(), selectedRole);
      onShowToast(
        t('producer.inviteMemberModal.inviteSuccessTitle'),
        t('producer.inviteMemberModal.inviteSuccessDesc', { email: singleEmail.trim() }),
      );
      setSingleEmail('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || t('producer.inviteMemberModal.inviteError'));
    } finally {
      setSingleLoading(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !showResultModal}
        onClose={onClose}
        size='md'
        title={t('producer.inviteMemberModal.title')}
        description={workspaceName}
        closeLabel={t('producer.inviteMemberModal.closeLabel')}
      >
        <div className='bg-white border border-stone-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh] text-xs'>
          {/* Header */}
          <div className='p-5 border-b border-stone-200 flex items-center justify-between bg-white'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0'>
                <UserPlus className='w-5 h-5' />
              </div>
              <div>
                <h3 className='font-bold text-stone-900 text-base'>
                  {t('producer.inviteMemberModal.title')}
                </h3>
                <p className='text-xs text-stone-500 mt-0.5'>
                  {t('producer.inviteMemberModal.subtitle')}
                </p>
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className='flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl mx-5 mt-4 border border-stone-200'>
            <button
              type='button'
              onClick={() => setInviteMode('interactive')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                inviteMode === 'interactive'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User className='w-3.5 h-3.5 text-orange-600' />
              <span>{t('producer.inviteMemberModal.tabSingle')}</span>
            </button>
            <button
              type='button'
              onClick={() => setInviteMode('batch')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                inviteMode === 'batch'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Mail className='w-3.5 h-3.5 text-stone-500' />
              <span>{t('producer.inviteMemberModal.tabBatch')}</span>
            </button>
          </div>

          {/* Mode 1: Stitch Single Member Invite with Role Cards */}
          {inviteMode === 'interactive' && (
            <form
              onSubmit={handleSingleSubmit}
              className='p-5 overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-4 text-xs'
            >
              {errorMsg && (
                <div className='p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-start gap-2'>
                  <AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className='flex flex-col gap-1.5'>
                <label className='font-semibold text-stone-800 text-xs flex items-center justify-between'>
                  <span>
                    {t('producer.inviteMemberModal.emailOrNameLabel')}{' '}
                    <span className='text-orange-600'>*</span>
                  </span>
                </label>
                <div className='relative'>
                  <Mail className='w-4 h-4 text-stone-400 absolute left-3 top-2.5' />
                  <input
                    type='email'
                    required
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    placeholder={t('producer.inviteMemberModal.emailPlaceholder')}
                    className='w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3.5 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium placeholder:text-stone-400'
                  />
                </div>
              </div>

              {/* Base Role Cards */}
              <div className='flex flex-col gap-2'>
                <label className='font-semibold text-stone-800 text-xs'>
                  {t('producer.inviteMemberModal.baseRoleLabel')}{' '}
                  <span className='text-orange-600'>*</span>
                </label>
                <div className='grid grid-cols-1 gap-2'>
                  {(['Writer', 'Artist', 'Letterer', 'Editor'] as const).map((roleKey) => (
                    <label
                      key={roleKey}
                      className={`border rounded-xl px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        selectedRole === roleKey
                          ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type='radio'
                        name='member_base_role'
                        value={roleKey}
                        checked={selectedRole === roleKey}
                        onChange={() => setSelectedRole(roleKey)}
                        className='accent-orange-600 shrink-0'
                      />
                      <div className='flex-1 flex flex-col'>
                        <span className='font-semibold text-stone-900 text-xs'>
                          {t(`producer.inviteMemberModal.baseRoles.${roleKey}Title`)}
                        </span>
                        <p className='text-[11px] text-stone-500 mt-0.5'>
                          {t(`producer.inviteMemberModal.baseRoles.${roleKey}Desc`)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className='pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5'>
                <button
                  type='button'
                  onClick={onClose}
                  className='px-4 py-2 rounded-xl border border-stone-200 bg-white font-medium text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors'
                >
                  {t('producer.inviteMemberModal.cancelBtn')}
                </button>
                <button
                  type='submit'
                  disabled={singleLoading || !singleEmail.trim()}
                  className='px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors'
                >
                  <UserPlus className='w-4 h-4' />
                  <span>
                    {singleLoading
                      ? t('producer.inviteMemberModal.sending')
                      : t('producer.inviteMemberModal.submitSingle')}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Mode 2: Multi-email Batch Importer */}
          {inviteMode === 'batch' && (
            <form
              onSubmit={handleSubmitBatch}
              className='p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs'
            >
              {errorMsg && (
                <div className='p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 flex items-start gap-2'>
                  <AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Input Nhiều Email */}
              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <label className='block text-xs font-semibold text-[#171717]'>
                    {t('producer.inviteMemberModal.recipientEmailsLabel')}
                  </label>
                  <span className='text-[11px] text-stone-400'>
                    {t('producer.inviteMemberModal.emailSeparatorHint')}
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder='artist@studio.com, writer@studio.com'
                  value={rawEmails}
                  onChange={(e) => setRawEmails(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAddEmails();
                    }
                  }}
                  className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316] font-mono'
                />
                <div className='flex justify-between items-center mt-2'>
                  <p className='text-[11px] text-stone-400'>
                    {t('producer.inviteMemberModal.addToListHint')}
                  </p>
                  <button
                    type='button'
                    onClick={handleAddEmails}
                    className='px-3 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-md font-semibold text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                  >
                    <Plus className='w-3 h-3 text-orange-600' />
                    <span>{t('producer.inviteMemberModal.addToListBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Danh Sách Đã Thêm & Gán Role */}
              {inviteList.length > 0 && (
                <div className='space-y-2 border-t border-stone-200 pt-3'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-xs text-stone-700'>
                      {t('producer.inviteMemberModal.inviteListCount', {
                        count: inviteList.length,
                      })}
                    </span>
                    <div className='flex items-center gap-2'>
                      <span className='text-[11px] text-stone-500'>
                        {t('producer.inviteMemberModal.defaultRoleLabel')}
                      </span>
                      <select
                        value={defaultRole}
                        onChange={(e) => handleApplyRoleToAll(e.target.value)}
                        className='px-2 py-0.5 rounded border border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-800'
                      >
                        {AVAILABLE_ROLE_VALUES.map((r) => (
                          <option key={r} value={r}>
                            {t(`producer.inviteMemberModal.roles.${r}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className='max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-stone-200/80 rounded-xl p-2 bg-stone-50/50'>
                    {inviteList.map((item) => (
                      <div
                        key={item.id}
                        className='flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-stone-200 shadow-2xs'
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          <Mail className='w-3.5 h-3.5 text-stone-400 shrink-0' />
                          <span className='font-mono text-xs text-stone-900 truncate'>
                            {item.email}
                          </span>
                        </div>

                        <div className='flex items-center gap-2 shrink-0'>
                          <select
                            value={item.role}
                            onChange={(e) => handleRoleChange(item.id, e.target.value)}
                            className='px-2 py-1 rounded border border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-700 focus:outline-none focus:border-orange-500 cursor-pointer'
                          >
                            {AVAILABLE_ROLE_VALUES.map((r) => (
                              <option key={r} value={r}>
                                {t(`producer.inviteMemberModal.roles.${r}`)}
                              </option>
                            ))}
                          </select>
                          <button
                            type='button'
                            onClick={() => handleRemoveEntry(item.id)}
                            className='p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer'
                            title={t('producer.inviteMemberModal.removeFromListTitle')}
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='pt-2 flex items-center justify-between border-t border-stone-100'>
                <button
                  type='button'
                  onClick={onClose}
                  className='px-3.5 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
                >
                  {t('producer.inviteMemberModal.cancelBatch')}
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting || (inviteList.length === 0 && !rawEmails.trim())}
                  className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5'
                >
                  {isSubmitting ? (
                    <span>{t('producer.inviteMemberModal.sending')}</span>
                  ) : (
                    <span>
                      {t('producer.inviteMemberModal.submitBatch', {
                        count: inviteList.length || (rawEmails.trim() ? 1 : 0),
                      })}
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Modal Báo Cáo Kết Quả */}
      <InviteResultModal
        isOpen={showResultModal}
        onClose={() => {
          setShowResultModal(false);
          onClose();
        }}
        results={resultItems}
        workspaceName={workspaceName}
      />
    </>
  );
};
