import React from 'react';
import { AdminUserItem } from '@/services/admin.service';
import { AdminButton, AdminModal } from './AdminUi';

interface AdminUserDetailsModalProps {
  user: AdminUserItem;
  onClose: () => void;
  renderProjectRoles: (user: AdminUserItem) => React.ReactNode;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className='grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 py-2.5'>
    <dt className='text-sm text-admin-muted'>{label}</dt>
    <dd className='text-sm text-admin-ink min-w-0 break-words'>{children}</dd>
  </div>
);

export const AdminUserDetailsModal: React.FC<AdminUserDetailsModalProps> = ({
  user,
  onClose,
  renderProjectRoles,
}) => (
  <AdminModal
    title='Chi tiết tài khoản'
    onClose={onClose}
    footer={<AdminButton onClick={onClose}>Đóng</AdminButton>}
  >
    <dl className='divide-y divide-admin-line/70'>
      <Row label='Họ và tên'>{user.fullName || '—'}</Row>
      <Row label='Email'>
        <span className='break-all'>{user.email}</span>
      </Row>
      <Row label='Số điện thoại'>
        <span className='tabular-nums'>{user.phoneNumber || '—'}</span>
      </Row>
      <Row label='Vai trò'>{renderProjectRoles(user)}</Row>
      <Row label='Xác thực 2 lớp'>
        {user.twoFactorEnabled ? (
          <span className='text-emerald-800 font-medium'>Đã bật</span>
        ) : (
          'Chưa bật'
        )}
      </Row>
      <Row label='Xác thực email'>{user.isEmailConfirmed ? 'Đã xác thực' : 'Chưa xác thực'}</Row>
      <Row label='Ngày tạo'>
        <span className='tabular-nums'>
          {user.createdAt ? new Date(user.createdAt).toLocaleString('vi-VN') : '—'}
        </span>
      </Row>
      <Row label='Mã tài khoản'>
        <span className='font-mono text-xs break-all select-all'>{user.id}</span>
      </Row>
    </dl>
  </AdminModal>
);
