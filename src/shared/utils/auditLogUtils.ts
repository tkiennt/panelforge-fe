import { AdminTone } from '@/roles/admin/views/components/AdminUi';

/**
 * Chuyển đổi mã action kỹ thuật (LOGIN, LOGOUT, SESSIONS_REVOKED, CREATE_SERIES...)
 * sang nhãn tiếng Việt thân thiện với người dùng.
 */
export const formatActionLabel = (action?: string | null): string => {
  if (!action) return '—';
  const upper = action.trim().toUpperCase();

  // Nhóm phiên đăng nhập & bảo mật (mới theo HANDOFF.md 2026-11-03)
  if (upper === 'LOGIN') return 'Đăng nhập';
  if (upper === 'LOGOUT') return 'Đăng xuất';
  if (upper === 'SESSIONS_REVOKED') return 'Thu hồi phiên hàng loạt';
  if (upper === 'REVOKE_SESSION') return 'Thu hồi phiên';

  // Nhóm bản ghi kỹ thuật cũ (legacy)
  if (upper === 'CREATE_REFRESHTOKEN') return 'Cấp mã phiên (cũ)';
  if (upper === 'UPDATE_REFRESHTOKEN') return 'Gia hạn phiên (cũ)';

  // Quản trị viên
  if (upper === 'ASSIGN_PRODUCER') return 'Cấp quyền tạo Studio';
  if (upper === 'ASSIGN_ROLE') return 'Phân quyền';

  // Thao tác cơ bản
  if (upper === 'CREATE') return 'Tạo mới';
  if (upper === 'UPDATE') return 'Chỉnh sửa';
  if (upper === 'DELETE') return 'Xóa';
  if (upper === 'SUBMIT') return 'Nộp bài';
  if (upper === 'APPROVE') return 'Phê duyệt';
  if (upper === 'REJECT') return 'Từ chối';
  if (upper === 'RESOLVE') return 'Xử lý';
  if (upper === 'PUBLISH') return 'Xuất bản';
  if (upper === 'EXPORT') return 'Xuất dữ liệu';

  // Ghép tiền tố CREATE_/UPDATE_/DELETE_
  if (upper.startsWith('CREATE_')) {
    const entity = upper.slice(7);
    return `Tạo ${formatEntityLabel(entity)}`;
  }
  if (upper.startsWith('UPDATE_')) {
    const entity = upper.slice(7);
    return `Sửa ${formatEntityLabel(entity)}`;
  }
  if (upper.startsWith('DELETE_')) {
    const entity = upper.slice(7);
    return `Xóa ${formatEntityLabel(entity)}`;
  }

  return action;
};

/**
 * Chuyển đổi tên thực thể kỹ thuật (Session, User, Series, PipelineStage...)
 * sang tiếng Việt dễ hiểu.
 */
export const formatEntityLabel = (entity?: string | null): string => {
  if (!entity) return '—';
  const upper = entity.trim().toUpperCase();

  if (upper === 'SESSION') return 'Phiên đăng nhập';
  if (upper === 'USER') return 'Người dùng';
  if (upper === 'SERIES') return 'Bộ truyện';
  if (upper === 'BIBLEENTRY') return 'Series Bible';
  if (upper === 'PIPELINESTAGE' || upper === 'STAGE') return 'Công đoạn sản xuất';
  if (upper === 'WORKSPACE') return 'Studio';
  if (upper === 'CHAPTER') return 'Chương';
  if (upper === 'PAGE') return 'Trang';
  if (upper === 'PANEL') return 'Khung tranh';
  if (upper === 'REFRESHTOKEN') return 'Mã phiên (cũ)';
  if (upper === 'ASSETACCESSLOG') return 'Truy cập tài nguyên';
  if (upper === 'NOTIFICATION') return 'Thông báo';
  if (upper === 'WORKSPACEAICONFIG') return 'Cấu hình AI Studio';

  return entity;
};

/**
 * Trả về tone màu phù hợp cho AdminBadge
 */
export const getActionTone = (act?: string | null): AdminTone => {
  if (!act) return 'neutral';
  const upper = act.trim().toUpperCase();

  // Phiên đăng nhập & bảo mật
  if (upper === 'LOGIN') return 'success';
  if (upper === 'LOGOUT') return 'neutral';
  if (upper === 'SESSIONS_REVOKED' || upper === 'REVOKE_SESSION') return 'danger';

  // Bản ghi mã phiên cũ
  if (upper.includes('REFRESHTOKEN')) return 'neutral';

  // CRUD & workflow
  if (upper.includes('CREATE') || upper.includes('ADD')) return 'success';
  if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REJECT')) return 'danger';
  if (upper.includes('UPDATE') || upper.includes('EDIT')) return 'info';
  if (upper.includes('ASSIGN')) return 'accent';
  if (upper.includes('APPROVE') || upper.includes('RESOLVE')) return 'success';

  return 'neutral';
};

/**
 * Trả về class Tailwind tương ứng cho badge trong AuditLogModal
 */
export const getAuditStatusBadgeClass = (action?: string | null): string => {
  if (!action) return 'bg-stone-100 text-stone-700 border border-stone-200';
  const upper = action.trim().toUpperCase();

  if (upper === 'LOGIN') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (upper === 'LOGOUT') {
    return 'bg-stone-100 text-stone-700 border border-stone-200';
  }
  if (upper === 'SESSIONS_REVOKED' || upper === 'REVOKE_SESSION' || upper.includes('REVOKE')) {
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  }
  if (upper.includes('REFRESHTOKEN')) {
    return 'bg-stone-100 text-stone-700 border border-stone-200';
  }
  if (upper.includes('CREATE') || upper.includes('ADD')) {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  }
  if (upper.includes('DELETE') || upper.includes('REJECT') || upper.includes('REMOVE')) {
    return 'bg-rose-50 text-rose-700 border border-rose-200';
  }
  if (upper.includes('APPROVE') || upper.includes('RESOLVE')) {
    return 'bg-teal-50 text-teal-700 border border-teal-200';
  }
  if (upper.includes('PUBLISH') || upper.includes('EXPORT')) {
    return 'bg-purple-50 text-purple-700 border border-purple-200';
  }
  if (upper.includes('SUBMIT')) {
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  }

  return 'bg-stone-100 text-stone-700 border border-stone-200';
};
