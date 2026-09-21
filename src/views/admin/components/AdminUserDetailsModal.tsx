import React from 'react';
import { X } from 'lucide-react';
import { AdminUserItem } from '../../../services/admin.service';
import { Button } from '../../../components/ui/Button';

interface AdminUserDetailsModalProps {
  user: AdminUserItem;
  onClose: () => void;
  renderProjectRoles: (user: AdminUserItem) => React.ReactNode;
}

export const AdminUserDetailsModal: React.FC<AdminUserDetailsModalProps> = ({
  user,
  onClose,
  renderProjectRoles,
}) => {
  return (
    <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <h3 className='text-sm font-bold text-[#171717]'>Chi Tiết Tài Khoản</h3>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className='w-4 h-4' />
          </Button>
        </div>

        <div className='space-y-3 text-xs'>
          <div>
            <span className='text-[#888888] block text-[10px] uppercase font-mono'>User ID</span>
            <span className='font-mono font-medium text-[#171717] select-all'>{user.id}</span>
          </div>
          <div>
            <span className='text-[#888888] block text-[10px] uppercase font-mono'>Email</span>
            <span className='font-semibold text-[#171717]'>{user.email}</span>
          </div>
          <div>
            <span className='text-[#888888] block text-[10px] uppercase font-mono'>Họ và tên</span>
            <span className='font-medium text-[#171717]'>{user.fullName || '—'}</span>
          </div>
          <div>
            <span className='text-[#888888] block text-[10px] uppercase font-mono'>
              Số điện thoại
            </span>
            <span className='font-mono text-[#171717]'>{user.phoneNumber || '—'}</span>
          </div>
          <div>
            <span className='text-[#888888] block text-[10px] uppercase font-mono'>
              Vai trò (Dự án)
            </span>
            <div className='mt-1'>{renderProjectRoles(user)}</div>
          </div>
          <div>
            <span className='text-[#888888] block text-[10px] uppercase font-mono'>
              Xác thực 2FA
            </span>
            <span
              className={`font-semibold ${user.twoFactorEnabled ? 'text-emerald-600' : 'text-gray-500'}`}
            >
              {user.twoFactorEnabled ? 'Đã kích hoạt RFC 6238 TOTP' : 'Chưa kích hoạt'}
            </span>
          </div>
          <div>
            <span className='text-[#888888] block text-[10px] uppercase font-mono'>Ngày tạo</span>
            <span className='font-mono text-[#737373]'>
              {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
            </span>
          </div>
        </div>

        <div className='pt-3 border-t border-[#E7E7E7] text-right'>
          <Button onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};
