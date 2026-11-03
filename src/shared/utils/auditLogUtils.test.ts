import { describe, it, expect } from 'vitest';
import {
  formatActionLabel,
  formatEntityLabel,
  getActionTone,
  getAuditStatusBadgeClass,
} from './auditLogUtils';

describe('auditLogUtils', () => {
  describe('formatActionLabel', () => {
    it('chuyển đổi các hành động phiên đăng nhập mới thành tiếng Việt', () => {
      expect(formatActionLabel('LOGIN')).toBe('Đăng nhập');
      expect(formatActionLabel('LOGOUT')).toBe('Đăng xuất');
      expect(formatActionLabel('SESSIONS_REVOKED')).toBe('Thu hồi phiên hàng loạt');
      expect(formatActionLabel('REVOKE_SESSION')).toBe('Thu hồi phiên');
    });

    it('chuyển đổi các hành động mã phiên cũ (legacy) thành tiếng Việt', () => {
      expect(formatActionLabel('CREATE_REFRESHTOKEN')).toBe('Cấp mã phiên (cũ)');
      expect(formatActionLabel('UPDATE_REFRESHTOKEN')).toBe('Gia hạn phiên (cũ)');
    });

    it('chuyển đổi các hành động CRUD cơ bản và ghép tiền tố', () => {
      expect(formatActionLabel('CREATE')).toBe('Tạo mới');
      expect(formatActionLabel('UPDATE')).toBe('Chỉnh sửa');
      expect(formatActionLabel('DELETE')).toBe('Xóa');
      expect(formatActionLabel('ASSIGN_PRODUCER')).toBe('Cấp quyền tạo Studio');
      expect(formatActionLabel('CREATE_SERIES')).toBe('Tạo Bộ truyện');
      expect(formatActionLabel('DELETE_STAGE')).toBe('Xóa Công đoạn sản xuất');
      expect(formatActionLabel('UPDATE_WORKSPACE')).toBe('Sửa Studio');
    });

    it('fallback an toàn khi action rỗng hoặc không xác định', () => {
      expect(formatActionLabel(null)).toBe('—');
      expect(formatActionLabel('')).toBe('—');
      expect(formatActionLabel('UNKNOWN_CUSTOM_ACTION')).toBe('UNKNOWN_CUSTOM_ACTION');
    });
  });

  describe('formatEntityLabel', () => {
    it('chuyển đổi tên các thực thể hệ thống sang tiếng Việt', () => {
      expect(formatEntityLabel('Session')).toBe('Phiên đăng nhập');
      expect(formatEntityLabel('User')).toBe('Người dùng');
      expect(formatEntityLabel('Series')).toBe('Bộ truyện');
      expect(formatEntityLabel('BibleEntry')).toBe('Series Bible');
      expect(formatEntityLabel('PipelineStage')).toBe('Công đoạn sản xuất');
      expect(formatEntityLabel('Workspace')).toBe('Studio');
      expect(formatEntityLabel('Chapter')).toBe('Chương');
      expect(formatEntityLabel('Page')).toBe('Trang');
      expect(formatEntityLabel('Panel')).toBe('Khung tranh');
      expect(formatEntityLabel('RefreshToken')).toBe('Mã phiên (cũ)');
    });

    it('fallback an toàn khi entity rỗng', () => {
      expect(formatEntityLabel(null)).toBe('—');
      expect(formatEntityLabel('')).toBe('—');
      expect(formatEntityLabel('CustomEntity')).toBe('CustomEntity');
    });
  });

  describe('getActionTone', () => {
    it('gán đúng tone màu giao diện cho các action', () => {
      expect(getActionTone('LOGIN')).toBe('success');
      expect(getActionTone('LOGOUT')).toBe('neutral');
      expect(getActionTone('SESSIONS_REVOKED')).toBe('danger');
      expect(getActionTone('REVOKE_SESSION')).toBe('danger');
      expect(getActionTone('CREATE_REFRESHTOKEN')).toBe('neutral');
      expect(getActionTone('UPDATE_REFRESHTOKEN')).toBe('neutral');
      expect(getActionTone('CREATE_SERIES')).toBe('success');
      expect(getActionTone('DELETE_STAGE')).toBe('danger');
      expect(getActionTone('UPDATE_PIPELINE')).toBe('info');
      expect(getActionTone('ASSIGN_PRODUCER')).toBe('accent');
    });
  });

  describe('getAuditStatusBadgeClass', () => {
    it('gán đúng style class cho các action trong AuditLogModal', () => {
      expect(getAuditStatusBadgeClass('LOGIN')).toContain('bg-emerald-50');
      expect(getAuditStatusBadgeClass('LOGOUT')).toContain('bg-stone-100');
      expect(getAuditStatusBadgeClass('SESSIONS_REVOKED')).toContain('bg-rose-50');
      expect(getAuditStatusBadgeClass('CREATE_REFRESHTOKEN')).toContain('bg-stone-100');
    });
  });
});
