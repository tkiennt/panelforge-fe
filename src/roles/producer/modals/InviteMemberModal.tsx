import React, { useState } from 'react';
import { X, UserPlus, Mail, AlertTriangle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';
import { InviteResultModal, InviteResultItem } from './InviteResultModal';

interface InviteMemberModalProps {
  isOpen: boolean;
  workspaceId: string;
  workspaceName?: string;
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
  { value: 'Writer', label: 'Writer (Biên kịch / Kịch bản)' },
  { value: 'Artist', label: 'Artist (Họa sĩ chính)' },
  { value: 'Letterer', label: 'Letterer (Chèn chữ & SFX)' },
  { value: 'Editor', label: 'Editor (Biên tập viên)' },
  { value: 'Publisher', label: 'Publisher (Nhà xuất bản)' },
  { value: 'Producer', label: 'Producer (Giám đốc sản xuất)' },
];

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  workspaceId,
  workspaceName,
  onClose,
  onInvited,
  onShowToast,
}) => {
  // Input dạng nhiều email phân tách bởi phẩy, chấm phẩy, khoảng trắng hoặc dòng mới
  const [rawEmails, setRawEmails] = useState('');
  const [defaultRole, setDefaultRole] = useState('Artist');
  const [inviteList, setInviteList] = useState<MemberInviteEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Result modal state
  const [resultItems, setResultItems] = useState<InviteResultItem[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);

  if (!isOpen) return null;

  // Phân tích và trích xuất email từ raw input
  const handleAddEmails = () => {
    if (!rawEmails.trim()) return;

    // Tách email theo dấu phẩy, chấm phẩy, khoảng trắng hoặc xuống dòng
    const extracted = rawEmails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (extracted.length === 0) {
      setErrorMsg('Không tìm thấy định dạng email hợp lệ nào.');
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
      setErrorMsg('Các email đã tồn tại trong danh sách mời bên dưới.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Nếu người dùng chưa bấm "Thêm vào danh sách" mà đã gõ email trong ô, tự động thêm trước khi gửi
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
      setErrorMsg('Vui lòng nhập ít nhất một email hợp lệ để mời.');
      return;
    }

    if (!workspaceId) {
      setErrorMsg('Không tìm thấy thông tin Studio Workspace.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    const results: InviteResultItem[] = [];

    // Gửi lời mời lần lượt hoặc song song theo batch
    for (const item of currentList) {
      try {
        const addedMember = await workspaceService.addMember(workspaceId, {
          email: item.email,
          role: item.role as any,
        });

        // Cập nhật trạng thái hiển thị cho FE: 'Pending' (Chờ chấp nhận)
        const pendingMember: WorkspaceMemberDto = {
          ...addedMember,
          isEmailConfirmed: addedMember.isEmailConfirmed ?? false,
        };

        onInvited(pendingMember);

        results.push({
          email: item.email,
          role: item.role,
          success: true,
          message: addedMember.invitationEmailSent === false
            ? 'Đã thêm (Chưa gửi được email, cần gửi lại).'
            : 'Đã gửi lời mời tham gia qua email.',
        });
      } catch (err: any) {
        results.push({
          email: item.email,
          role: item.role,
          success: false,
          message: err.message || 'Lỗi gửi lời mời.',
        });
      }
    }

    setIsSubmitting(false);
    setResultItems(results);
    setShowResultModal(true);

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      onShowToast(
        'Đã gửi lời mời',
        `Đã gửi lời mời tới ${successCount} thành viên (Trạng thái: Chờ chấp nhận).`,
      );
      // Reset danh sách nếu thành công
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
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center'>
                <UserPlus className='w-4 h-4' />
              </div>
              <div>
                <h3 className='font-display font-bold text-base text-[#171717]'>
                  Mời Thành Viên Vào Studio
                </h3>
                <p className='text-[10px] text-stone-500 font-mono'>
                  {workspaceName || 'Hỗ trợ mời 1 lúc nhiều email & gán vai trò linh hoạt'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className='w-7 h-7 rounded-lg hover:bg-white border border-transparent hover:border-[#E7E7E7] flex items-center justify-center text-[#888888] hover:text-[#171717] transition-all cursor-pointer'
            >
              <X className='w-4 h-4' />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs'>
            {errorMsg && (
              <div className='p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 flex items-start gap-2'>
                <AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Input Nhiều Email */}
            <div>
              <div className='flex items-center justify-between mb-1.5'>
                <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888]'>
                  Danh sách Email nhận lời mời
                </label>
                <span className='text-[10px] text-stone-400'>
                  Phân cách bởi dấu phẩy, khoảng trắng hoặc dòng mới
                </span>
              </div>
              <textarea
                rows={3}
                placeholder='ví dụ: artist1@studio.com, writer@studio.com&#10;editor@studio.com'
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
              <div className='flex justify-between items-center mt-1.5'>
                <p className='text-[10px] text-stone-500'>
                  Bấm &quot;Thêm vào danh sách&quot; để thiết lập vai trò cho từng người.
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
                  <span className='font-mono font-bold uppercase text-[11px] text-stone-600'>
                    Danh sách chuẩn bị gửi ({inviteList.length})
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='text-[11px] text-stone-500'>Áp dụng tất cả:</span>
                    <select
                      value={defaultRole}
                      onChange={(e) => handleApplyRoleToAll(e.target.value)}
                      className='px-2 py-0.5 rounded border border-stone-200 bg-stone-50 text-[11px] font-semibold text-stone-800'
                    >
                      {AVAILABLE_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.value}
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
                              {r.value}
                            </option>
                          ))}
                        </select>
                        <button
                          type='button'
                          onClick={() => handleRemoveEntry(item.id)}
                          className='p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-colors cursor-pointer'
                          title='Xóa email này khỏi danh sách'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quy trình chấp nhận tham gia */}
            <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7] text-xs font-mono text-[#555555] space-y-1'>
              <div className='text-xs uppercase font-bold text-[#F97316] flex items-center gap-1.5'>
                <CheckCircle2 className='w-3.5 h-3.5' />
                <span>Quy trình tham gia Studio</span>
              </div>
              <p className='text-[11px] leading-relaxed text-[#737373]'>
                Thành viên sau khi được mời sẽ hiển thị ở trạng thái <b>Chờ chấp nhận (Pending)</b>.
                Người dùng mở liên kết trong email hoặc sử dụng mã OTP để đồng ý tham gia Studio.
              </p>
            </div>

            <div className='pt-2 flex items-center justify-between border-t border-stone-100'>
              <button
                type='button'
                onClick={onClose}
                className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
              >
                Hủy
              </button>
              <button
                type='submit'
                disabled={isSubmitting || (inviteList.length === 0 && !rawEmails.trim())}
                className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5'
              >
                {isSubmitting ? (
                  <span>Đang gửi lời mời...</span>
                ) : (
                  <span>
                    Gửi Lời Mời ({inviteList.length || (rawEmails.trim() ? 1 : 0)})
                  </span>
                )}
              </button>
            </div>
          </form>
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
