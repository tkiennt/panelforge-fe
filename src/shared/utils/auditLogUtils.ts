import { AdminTone } from '@/roles/admin/views/components/AdminUi';
import { translate } from '@/lib/i18n';

/**
 * Chuyển đổi mã action kỹ thuật (LOGIN, LOGOUT, SESSIONS_REVOKED, CREATE_SERIES...)
 * sang nhãn tiếng Việt thân thiện với người dùng.
 */
export const formatActionLabel = (action?: string | null): string => {
  if (!action) return '—';
  const upper = action.trim().toUpperCase();

  // Nhóm phiên đăng nhập & bảo mật (mới theo HANDOFF.md 2026-11-03)
  if (upper === 'LOGIN') return translate('shared.auditLog.actions.login');
  if (upper === 'LOGOUT') return translate('shared.auditLog.actions.logout');
  if (upper === 'SESSIONS_REVOKED') return translate('shared.auditLog.actions.sessionsRevoked');
  if (upper === 'REVOKE_SESSION') return translate('shared.auditLog.actions.revokeSession');

  // Nhóm bản ghi kỹ thuật cũ (legacy)
  if (upper === 'CREATE_REFRESHTOKEN')
    return translate('shared.auditLog.actions.createRefreshToken');
  if (upper === 'UPDATE_REFRESHTOKEN')
    return translate('shared.auditLog.actions.updateRefreshToken');

  // Quản trị viên
  if (upper === 'ASSIGN_PRODUCER') return translate('shared.auditLog.actions.assignProducer');
  if (upper === 'ASSIGN_ROLE') return translate('shared.auditLog.actions.assignRole');

  // Thao tác cơ bản
  if (upper === 'CREATE') return translate('shared.auditLog.actions.create');
  if (upper === 'UPDATE') return translate('shared.auditLog.actions.update');
  if (upper === 'DELETE') return translate('shared.auditLog.actions.delete');
  if (upper === 'SUBMIT') return translate('shared.auditLog.actions.submit');
  if (upper === 'APPROVE') return translate('shared.auditLog.actions.approve');
  if (upper === 'REJECT') return translate('shared.auditLog.actions.reject');
  if (upper === 'RESOLVE') return translate('shared.auditLog.actions.resolve');
  if (upper === 'PUBLISH') return translate('shared.auditLog.actions.publish');
  if (upper === 'EXPORT') return translate('shared.auditLog.actions.export');

  // Ghép tiền tố CREATE_/UPDATE_/DELETE_
  if (upper.startsWith('CREATE_')) {
    const entity = upper.slice(7);
    return translate('shared.auditLog.actions.createEntity', {
      entity: formatEntityLabel(entity),
    });
  }
  if (upper.startsWith('UPDATE_')) {
    const entity = upper.slice(7);
    return translate('shared.auditLog.actions.updateEntity', {
      entity: formatEntityLabel(entity),
    });
  }
  if (upper.startsWith('DELETE_')) {
    const entity = upper.slice(7);
    return translate('shared.auditLog.actions.deleteEntity', {
      entity: formatEntityLabel(entity),
    });
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

  if (upper === 'SESSION') return translate('shared.auditLog.entities.session');
  if (upper === 'USER') return translate('shared.auditLog.entities.user');
  if (upper === 'SERIES') return translate('shared.auditLog.entities.series');
  if (upper === 'BIBLEENTRY') return 'Series Bible';
  if (upper === 'PIPELINESTAGE' || upper === 'STAGE')
    return translate('shared.auditLog.entities.pipelineStage');
  if (upper === 'WORKSPACE') return 'Studio';
  if (upper === 'CHAPTER') return translate('shared.auditLog.entities.chapter');
  if (upper === 'PAGE') return translate('shared.auditLog.entities.page');
  if (upper === 'PANEL') return translate('shared.auditLog.entities.panel');
  if (upper === 'REFRESHTOKEN') return translate('shared.auditLog.entities.refreshToken');
  if (upper === 'ASSETACCESSLOG') return translate('shared.auditLog.entities.assetAccessLog');
  if (upper === 'NOTIFICATION') return translate('shared.auditLog.entities.notification');
  if (upper === 'WORKSPACEAICONFIG') return translate('shared.auditLog.entities.workspaceAiConfig');

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
  if (upper.includes('DELETE') || upper.includes('REMOVE') || upper.includes('REJECT'))
    return 'danger';
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
