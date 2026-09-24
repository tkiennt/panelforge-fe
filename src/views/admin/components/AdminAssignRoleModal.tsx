import React from 'react';
import { Shield, X, AlertCircle } from 'lucide-react';
import { AdminUserItem } from '../../../services/admin.service';
import { Button } from '../../../components/ui/Button';

import { ALL_ROLES } from '../constants';

interface AdminAssignRoleModalProps {
  user: AdminUserItem;
  selectedNewRoles: string[];
  setSelectedNewRoles: React.Dispatch<React.SetStateAction<string[]>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export const AdminAssignRoleModal: React.FC<AdminAssignRoleModalProps> = ({
  user,
  selectedNewRoles,
  setSelectedNewRoles,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className='fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150'>
      <div className='bg-white rounded-2xl border border-[#E7E7E7] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200'>
        <div className='flex items-center justify-between border-b border-[#E7E7E7] pb-3'>
          <div className='flex items-center gap-2 text-sm font-bold text-[#171717]'>
            <Shield className='w-4 h-4 text-[#F97316]' />
            <span>Phân Quyền Vai Trò Hệ Thống (RBAC)</span>
          </div>
          <button onClick={onClose} className='text-[#888888] hover:text-[#171717] cursor-pointer'>
            <X className='w-4 h-4' />
          </button>
        </div>

        <div className='p-3 bg-[#FAF8F5] rounded-xl border border-[#E7E7E7] space-y-1 text-xs'>
          <div className='text-[#737373]'>Tài khoản áp dụng:</div>
          <div className='font-bold text-[#171717] text-sm'>{user.email}</div>
          <div className='text-[11px] text-[#888888] font-mono'>
            Vai trò hiện tại: <strong className='text-[#171717]'>{user.role}</strong>
          </div>
        </div>

        <form onSubmit={onSubmit} className='space-y-4'>
          <div>
            <label className='block text-xs font-bold text-[#171717] mb-2'>
              Chọn vai trò hệ thống / dự án:
            </label>
            <div className='grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-1'>
              {ALL_ROLES.map((r) => {
                const isSelected = selectedNewRoles.includes(r.key) || selectedNewRoles.includes(r.key.toUpperCase());
                return (
                  <label
                    key={r.key}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#F97316] bg-[#FFF7ED] font-bold text-[#171717]'
                        : 'border-[#E7E7E7] hover:bg-[#FAF8F5] text-[#555555]'
                    }`}
                  >
                    <div className='flex items-center gap-2'>
                      <input
                        type='checkbox'
                        className='w-3.5 h-3.5 accent-[#F97316] cursor-pointer'
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedNewRoles((prev) => [...prev, r.key]);
                          } else {
                            setSelectedNewRoles((prev) =>
                              prev.filter((role) => role !== r.key && role !== r.key.toUpperCase()),
                            );
                          }
                        }}
                      />
                      <span>{r.label}</span>
                    </div>
                    <span className='font-mono text-[10px] text-[#888888] uppercase'>
                      {r.key}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className='p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1'>
            <div className='font-semibold flex items-center gap-1'>
              <AlertCircle className='w-3.5 h-3.5 shrink-0' />
              <span>Cảnh báo phân quyền</span>
            </div>
            <p>
              Gán quyền <strong>Administrator</strong> sẽ cấp toàn quyền truy cập bảng điều khiển
              này và quyền chỉnh sửa tài khoản khác.
            </p>
          </div>

          <div className='flex items-center justify-end gap-2.5 pt-2 border-t border-[#E7E7E7]'>
            <Button
              type='button'
              onClick={onClose}
              variant="ghost"
              className="text-[#555555]"
            >
              Hủy
            </Button>
            <Button
              type='submit'
              isLoading={isSubmitting}
            >
              Xác Nhận Cập Nhật
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
