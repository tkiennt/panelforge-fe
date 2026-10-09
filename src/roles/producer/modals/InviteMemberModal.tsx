import React, { useState } from 'react';
import { X, UserPlus, Mail, AlertTriangle } from 'lucide-react';
import { workspaceService, WorkspaceMemberDto } from '@/services/workspace.service';

interface InviteMemberModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onInvited: (newMember: WorkspaceMemberDto) => void;
  onShowToast: (title: string, desc: string) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  workspaceId,
  onClose,
  onInvited,
  onShowToast,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Artist');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !workspaceId) return;

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const addedMember = await workspaceService.addMember(workspaceId, {
        email: email.trim(),
        role: role as any,
      });

      onInvited(addedMember);

      if (addedMember.invitationEmailSent === false) {
        onShowToast(
          'Đã thêm thành viên',
          'Đã thêm vào Studio nhưng chưa gửi được email thông báo. Vui lòng sử dụng tính năng "Gửi lại lời mời".',
        );
      } else {
        onShowToast(
          'Mời thành viên thành công',
          `Đã gửi lời mời tham gia tới ${addedMember.email}.`,
        );
      }
      setEmail('');
      setRole('Artist');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi gửi lời mời. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4'>
      <div className='bg-white border border-[#E7E7E7] rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150'>
        {/* Header */}
        <div className='p-4 bg-[#FAF8F4] border-b border-[#E7E7E7] flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <UserPlus className='w-4 h-4 text-[#F97316]' />
            <h3 className='font-display font-bold text-base text-[#171717]'>
              Mời Thành Viên Vào Studio
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
          {errorMsg && (
            <div className='p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200 flex items-start gap-2'>
              <AlertTriangle className='w-4 h-4 mt-0.5 shrink-0' />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className='block text-xs font-mono font-bold uppercase tracking-wider text-[#888888] mb-1.5'>
              Email người nhận
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
              Vai trò dự án
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className='w-full px-3 py-2 bg-[#FAF8F4] focus:bg-white rounded-lg border border-[#E7E7E7] text-xs text-[#171717] focus:outline-none focus:border-[#F97316] font-semibold cursor-pointer'
            >
              <option value='Writer'>Writer</option>
              <option value='Artist'>Artist</option>
              <option value='Letterer'>Letterer</option>
              <option value='Editor'>Editor</option>
              <option value='Publisher'>Publisher</option>
              <option value='Producer'>Producer</option>
            </select>
          </div>

          <div className='p-3 bg-[#FAF8F4] rounded-xl border border-[#E7E7E7] text-xs font-mono text-[#555555] space-y-1'>
            <div className='text-[10px] uppercase font-bold text-[#F97316]'>
              Thông tin kích hoạt tài khoản
            </div>
            <p className='text-[11px] leading-relaxed'>
              Nếu email chưa có tài khoản trong hệ thống, PanelForge sẽ gửi email mời kèm mã OTP 6
              số (hạn 15 phút). Người được mời dùng mã OTP này để tạo mật khẩu tại màn Kích hoạt tài
              khoản / Đặt lại mật khẩu.
            </p>
          </div>

          <div className='pt-2 flex items-center justify-between'>
            <button
              type='button'
              onClick={onClose}
              className='px-3 py-2 bg-white hover:bg-[#F3F1EB] border border-[#E7E7E7] text-[#555555] text-xs font-semibold rounded-lg transition-colors cursor-pointer'
            >
              Hủy
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='px-4 py-2 bg-[#171717] hover:bg-black text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50'
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi Lời Mời'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
