import React, { useState, useEffect } from 'react';
import { X, UserPlus, Mail, AlertTriangle, Plus, Trash2, User } from 'lucide-react';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';
import { TeamInviteAcceptance, TeamMemberItem } from '@/shared/components/lucian';
import { InviteResultModal, InviteResultItem } from './InviteResultModal';
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

const AVAILABLE_ROLES = [
  { value: 'Writer', labelKey: 'roles.writer', label: 'Biên kịch (Writer)' },
  { value: 'Artist', labelKey: 'roles.artist', label: 'Họa sĩ (Artist)' },
  { value: 'Letterer', labelKey: 'roles.letterer', label: 'Chèn chữ (Letterer)' },
  { value: 'Editor', labelKey: 'roles.editor', label: 'Biên tập viên (Editor)' },
  { value: 'Publisher', labelKey: 'roles.publisher', label: 'Nhà xuất bản (Publisher)' },
  { value: 'Producer', labelKey: 'roles.producer', label: 'Sản xuất (Producer)' },
];

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  workspaceId,
  workspaceName,
  initialMode = 'interactive',
  onClose,
  onInvited,
  onShowToast,
}) => {
  const { t } = useTranslation('members');
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
                status: m.status === 'Active' || (m.isEmailConfirmed && m.status !== 'Pending') ? 'Joined' : 'Pending',
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
      throw new Error(t('inviteModal.errorNoWorkspace', 'Không tìm thấy không gian làm việc.'));
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
      t('inviteModal.toastSentTitle', 'Đã gửi lời mời'),
      t('inviteModal.toastSentSingle', { email, role }, `Đã gửi lời mời tới ${email} (${role}).`),
    );
  };

  const handleRoleChangeDirect = async (id: string, email: string, newRole: string) => {
    if (!workspaceId || id.startsWith('invite-') || id.startsWith('mem-')) return;
    try {
      await workspaceService.updateMemberRole(workspaceId, id, { newRole });
      onShowToast(
        t('inviteModal.toastUpdateRoleTitle', 'Cập nhật vai trò'),
        t('inviteModal.toastUpdateRoleDesc', { email, role: newRole }, `Đã đổi vai trò của ${email} sang ${newRole}.`),
      );
    } catch (err: any) {
      onShowToast(
        t('inviteModal.toastUpdateRoleErrorTitle', 'Lỗi cập nhật'),
        err?.message || t('inviteModal.toastUpdateRoleErrorDesc', 'Không thể cập nhật vai trò.'),
      );
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
      setErrorMsg(t('inviteModal.errorInvalidEmail', 'Vui lòng nhập định dạng email hợp lệ.'));
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
      setErrorMsg(t('inviteModal.errorEmailExists', 'Email đã có trong danh sách bên dưới.'));
      return;
    }

    setInviteList([...inviteList, ...newEntries]);
    setRawEmails('');
  };

  const handleRemoveEntry = (id: string) => {
    setInviteList(inviteList.filter((item) => item.id !== id));
  };

  const handleRoleChange = (id: string, newRole: string) => {
    setInviteList(
      inviteList.map((item) => (item.id === id ? { ...item, role: newRole } : item)),
    );
  };

  const handleApplyRoleToAll = (targetRole: string) => {
    setDefaultRole(targetRole);
    setInviteList(inviteList.map((item) => ({ ...item, role: targetRole })));
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    let currentList = [...inviteList];
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
      setErrorMsg(t('inviteModal.errorEmptyList', 'Vui lòng nhập ít nhất một email.'));
      return;
    }

    if (!workspaceId) {
      setErrorMsg(t('inviteModal.errorNoWorkspace', 'Không tìm thấy không gian làm việc.'));
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
              ? t('inviteModal.addedNoEmail', 'Đã thêm (chưa gửi email)')
              : t('inviteModal.addedEmailSent', 'Đã gửi email mời'),
        });
      } catch (err: any) {
        results.push({
          email: item.email,
          role: item.role,
          success: false,
          message: err.message || t('inviteModal.errorSendFailed', 'Lỗi gửi lời mời'),
        });
      }
    }

    setIsSubmitting(false);
    setResultItems(results);
    setShowResultModal(true);

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      onShowToast(
        t('inviteModal.toastSentTitle', 'Đã gửi lời mời'),
        t('inviteModal.toastSentBatch', { count: successCount }, `Đã gửi lời mời tới ${successCount} người.`),
      );
      setInviteList([]);
      setRawEmails('');
    }
  };

  return (
    <>
      <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
        <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]'>
          {/* Header */}
          <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
            <div className='flex items-center gap-2.5'>
              <div className='w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center'>
                <UserPlus className='w-4 h-4' />
              </div>
              <div>
                <h3 className='font-display font-bold text-sm text-[#171717]'>
                  {t('inviteModal.title', 'Mời thành viên')}
                </h3>
                {workspaceName && (
                  <p className='text-[11px] text-[#737373]'>{workspaceName}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t('common.actions.close', 'Đóng modal')}
              className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className='flex items-center gap-1.5 p-1 bg-[#FAF8F4] rounded-xl mx-4 mt-3 border border-[#E7E7E7]'>
            <button
              type='button'
              onClick={() => setInviteMode('interactive')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                inviteMode === 'interactive'
                  ? 'bg-white text-[#171717] shadow-2xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <User className='w-3.5 h-3.5 text-orange-500' />
              <span>{t('inviteModal.tabInteractive', 'Cá nhân')}</span>
            </button>
            <button
              type='button'
              onClick={() => setInviteMode('batch')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                inviteMode === 'batch'
                  ? 'bg-white text-[#171717] shadow-2xs border border-[#E7E7E7]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Mail className='w-3.5 h-3.5 text-[#737373]' />
              <span>{t('inviteModal.tabBatch', 'Hàng loạt')}</span>
            </button>
          </div>

          {/* Mode 1: Direct Single / Interactive Flow */}
          {inviteMode === 'interactive' && (
            <div className='p-4 overflow-y-auto flex-1 custom-scrollbar space-y-3'>
              <TeamInviteAcceptance
                workspaceName={workspaceName || ''}
                initialMembers={existingMembers}
                availableRoles={AVAILABLE_ROLES.map((r) => r.value)}
                onInvite={handleDirectInvite}
                onRoleChange={handleRoleChangeDirect}
              />

              <p className='text-[11px] text-stone-400 text-center font-mono'>
                {t('inviteModal.interactiveHint', 'Thành viên cần xác nhận qua email để hoàn tất tham gia.')}
              </p>

              <div className='pt-1 flex items-center justify-end'>
                <button
                  type='button'
                  onClick={onClose}
                  className='px-4 py-2 bg-stone-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs'
                >
                  {t('inviteModal.close', 'Đóng')}
                </button>
              </div>
            </div>
          )}

          {/* Mode 2: Multi-email Batch Importer */}
          {inviteMode === 'batch' && (
            <form onSubmit={handleSubmitBatch} className='p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs'>
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
                    {t('inviteModal.emailLabel', 'Email người nhận')}
                  </label>
                  <span className='text-[11px] text-stone-400'>
                    {t('inviteModal.emailHint', 'Cách nhau bằng dấu phẩy hoặc dòng mới')}
                  </span>
                </div>
                <textarea
                  rows={3}
                  placeholder={t('inviteModal.emailPlaceholder', 'artist@studio.com, writer@studio.com')}
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
                    {t('inviteModal.addToListHint', 'Thêm vào danh sách để gán vai trò riêng từng người.')}
                  </p>
                  <button
                    type='button'
                    onClick={handleAddEmails}
                    className='px-3 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-md font-semibold text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                  >
                    <Plus className='w-3 h-3 text-orange-600' />
                    <span>{t('inviteModal.addToListBtn', 'Thêm vào danh sách')}</span>
                  </button>
                </div>
              </div>

              {/* Danh Sách Đã Thêm & Gán Role */}
              {inviteList.length > 0 && (
                <div className='space-y-2 border-t border-stone-200 pt-3'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-xs text-stone-700'>
                      {t('inviteModal.listTitle', { count: inviteList.length }, `Danh sách mời (${inviteList.length})`)}
                    </span>
                    <div className='flex items-center gap-2'>
                      <span className='text-[11px] text-stone-500'>
                        {t('inviteModal.commonRole', 'Vai trò chung:')}
                      </span>
                      <select
                        value={defaultRole}
                        onChange={(e) => handleApplyRoleToAll(e.target.value)}
                        className='px-2 py-0.5 rounded border border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-800'
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {t(r.labelKey, r.label)}
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
                            {AVAILABLE_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>
                                {t(r.labelKey, r.label)}
                              </option>
                            ))}
                          </select>
                          <button
                            type='button'
                            onClick={() => handleRemoveEntry(item.id)}
                            className='p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer'
                            title={t('inviteModal.removeEntry', 'Xóa khỏi danh sách')}
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
                  {t('inviteModal.cancel', 'Hủy')}
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting || (inviteList.length === 0 && !rawEmails.trim())}
                  className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5'
                >
                  {isSubmitting ? (
                    <span>{t('inviteModal.submitting', 'Đang gửi...')}</span>
                  ) : (
                    <span>
                      {t('inviteModal.submitBtn', { count: inviteList.length || (rawEmails.trim() ? 1 : 0) }, `Gửi lời mời (${inviteList.length || (rawEmails.trim() ? 1 : 0)})`)}
                    </span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

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
