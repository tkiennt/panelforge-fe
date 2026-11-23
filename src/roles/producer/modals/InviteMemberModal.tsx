import React, { useState, useEffect } from 'react';
import { Mail, AlertTriangle, Plus, Trash2, User, UserPlus, X } from 'lucide-react';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';
import { TeamInviteAcceptance, TeamMemberItem } from '@/shared/components/lucian';
import { InviteResultModal, InviteResultItem } from './InviteResultModal';
import { Modal } from '@/shared/ui';

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
  { value: 'Writer', label: 'Biên kịch (Writer)' },
  { value: 'Artist', label: 'Họa sĩ (Artist)' },
  { value: 'Letterer', label: 'Chèn chữ (Letterer)' },
  { value: 'Editor', label: 'Biên tập viên (Editor)' },
  { value: 'Publisher', label: 'Nhà xuất bản (Publisher)' },
  { value: 'Producer', label: 'Sản xuất (Producer)' },
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
      throw new Error('Không tìm thấy không gian làm việc.');
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
    onShowToast('Đã gửi lời mời', `Đã gửi lời mời tới ${email} (${role}).`);
  };

  const handleRoleChangeDirect = async (id: string, email: string, newRole: string) => {
    if (!workspaceId || id.startsWith('invite-') || id.startsWith('mem-')) return;
    try {
      await workspaceService.updateMemberRole(workspaceId, id, { newRole });
      onShowToast('Cập nhật vai trò', `Đã đổi vai trò của ${email} sang ${newRole}.`);
    } catch (err: any) {
      onShowToast('Lỗi cập nhật', err?.message || 'Không thể cập nhật vai trò.');
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
      setErrorMsg('Vui lòng nhập định dạng email hợp lệ.');
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
      setErrorMsg('Email đã có trong danh sách bên dưới.');
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
      setErrorMsg('Vui lòng nhập ít nhất một email.');
      return;
    }

    if (!workspaceId) {
      setErrorMsg('Không tìm thấy không gian làm việc.');
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
              ? 'Đã thêm (chưa gửi email)'
              : 'Đã gửi email mời',
        });
      } catch (err: any) {
        results.push({
          email: item.email,
          role: item.role,
          success: false,
          message: err.message || 'Lỗi gửi lời mời',
        });
      }
    }

    setIsSubmitting(false);
    setResultItems(results);
    setShowResultModal(true);

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      onShowToast('Đã gửi lời mời', `Đã gửi lời mời tới ${successCount} người.`);
      setInviteList([]);
      setRawEmails('');
    }
  };

  const [singleEmail, setSingleEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('Artist');
  const [singleLoading, setSingleLoading] = useState(false);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleEmail.trim()) return;
    setSingleLoading(true);
    try {
      await handleDirectInvite(singleEmail.trim(), selectedRole);
      onShowToast(
        'Đã gửi lời mời thành công',
        `Lời mời cộng tác đã chuyển đến ${singleEmail.trim()}`,
      );
      setSingleEmail('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi gửi lời mời');
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
        title='Mời thành viên mới vào Studio'
        description={workspaceName}
        closeLabel='Đóng modal'
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
                  Mời thành viên mới vào Studio
                </h3>
                <p className='text-xs text-stone-500 mt-0.5'>
                  Thêm cộng sự và phân quyền tác vụ sáng tác trong hệ thống Studio
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
              <span>Thành viên mới</span>
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
              <span>Gửi hàng loạt</span>
            </button>
          </div>

          {/* Mode 1: Stitch Single Member Invite with Role Cards */}
          {inviteMode === 'interactive' && (
            <form onSubmit={handleSingleSubmit} className='p-5 overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-4 text-xs'>
              {errorMsg && (
                <div className='p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-200 flex items-start gap-2'>
                  <AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className='flex flex-col gap-1.5'>
                <label className='font-semibold text-stone-800 text-xs flex items-center justify-between'>
                  <span>
                    Email hoặc Tên thành viên <span className='text-orange-600'>*</span>
                  </span>
                </label>
                <div className='relative'>
                  <Mail className='w-4 h-4 text-stone-400 absolute left-3 top-2.5' />
                  <input
                    type='email'
                    required
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    placeholder='vd: artist.kenji@mappa.jp'
                    className='w-full bg-white border border-stone-200 rounded-xl pl-9 pr-3.5 py-2 text-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-600 shadow-2xs font-medium placeholder:text-stone-400'
                  />
                </div>
              </div>

              {/* Base Role Cards */}
              <div className='flex flex-col gap-2'>
                <label className='font-semibold text-stone-800 text-xs'>
                  Vai trò cốt lõi (Base Role) <span className='text-orange-600'>*</span>
                </label>
                <div className='grid grid-cols-1 gap-2'>
                  {[
                    {
                      role: 'Writer',
                      title: 'Biên kịch (Writer)',
                      desc: 'Tạo kịch bản, nhánh thoại & Series Bible',
                    },
                    {
                      role: 'Artist',
                      title: 'Họa sĩ chì / Name (Lead Artist)',
                      desc: 'Phác thảo bố cục trang & thumbnail',
                    },
                    {
                      role: 'Letterer',
                      title: 'Họa sĩ thoại / Chèn chữ (Letterer)',
                      desc: 'Gắn bóng thoại, hiệu ứng chữ SFX & hoàn thiện',
                    },
                    {
                      role: 'Editor',
                      title: 'Biên tập viên (Editor)',
                      desc: 'Biên tập, rà soát kịch bản & duyệt bản vẽ',
                    },
                  ].map((item) => (
                    <label
                      key={item.role}
                      className={`border rounded-xl px-3.5 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                        selectedRole === item.role
                          ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <input
                        type='radio'
                        name='member_base_role'
                        value={item.role}
                        checked={selectedRole === item.role}
                        onChange={() => setSelectedRole(item.role)}
                        className='accent-orange-600 shrink-0'
                      />
                      <div className='flex-1 flex flex-col'>
                        <span className='font-semibold text-stone-900 text-xs'>{item.title}</span>
                        <p className='text-[11px] text-stone-500 mt-0.5'>{item.desc}</p>
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
                  Hủy bỏ
                </button>
                <button
                  type='submit'
                  disabled={singleLoading || !singleEmail.trim()}
                  className='px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors'
                >
                  <UserPlus className='w-4 h-4' />
                  <span>{singleLoading ? 'Đang gửi...' : 'Gửi lời mời & Cấp quyền'}</span>
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
                    Email người nhận
                  </label>
                  <span className='text-[11px] text-stone-400'>
                    Cách nhau bằng dấu phẩy hoặc dòng mới
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
                    Thêm vào danh sách để gán vai trò riêng từng người.
                  </p>
                  <button
                    type='button'
                    onClick={handleAddEmails}
                    className='px-3 py-1 bg-white hover:bg-stone-50 border border-stone-200 rounded-md font-semibold text-stone-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs'
                  >
                    <Plus className='w-3 h-3 text-orange-600' />
                    <span>Thêm vào danh sách</span>
                  </button>
                </div>
              </div>

              {/* Danh Sách Đã Thêm & Gán Role */}
              {inviteList.length > 0 && (
                <div className='space-y-2 border-t border-stone-200 pt-3'>
                  <div className='flex items-center justify-between'>
                    <span className='font-semibold text-xs text-stone-700'>
                      Danh sách mời ({inviteList.length})
                    </span>
                    <div className='flex items-center gap-2'>
                      <span className='text-[11px] text-stone-500'>Vai trò chung:</span>
                      <select
                        value={defaultRole}
                        onChange={(e) => handleApplyRoleToAll(e.target.value)}
                        className='px-2 py-0.5 rounded border border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-800'
                      >
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
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
                                {r.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type='button'
                            onClick={() => handleRemoveEntry(item.id)}
                            className='p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer'
                            title='Xóa khỏi danh sách'
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
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting || (inviteList.length === 0 && !rawEmails.trim())}
                  className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5'
                >
                  {isSubmitting ? (
                    <span>Đang gửi...</span>
                  ) : (
                    <span>Gửi lời mời ({inviteList.length || (rawEmails.trim() ? 1 : 0)})</span>
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
