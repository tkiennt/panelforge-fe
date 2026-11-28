import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Alert } from '@/shared/ui';
import { WorkspaceRole, SystemRole } from '@/types';
import { resolveCurrentWorkspaceRole, isRoleAllowed, isAdminRole } from './workspaceRoleGuard';
import { useTranslation } from '@/lib/i18n';

export interface RequireWorkspaceRoleProps {
  allowedRoles: (WorkspaceRole | SystemRole | string)[];
  currentWorkspaceRole?: WorkspaceRole | null;
  currentRole?: SystemRole | string;
  activeRoles?: string[];
  children?: React.ReactNode;
}

export const RequireWorkspaceRole: React.FC<RequireWorkspaceRoleProps> = ({
  allowedRoles,
  currentWorkspaceRole,
  currentRole,
  activeRoles,
  children,
}) => {
  const { t } = useTranslation();
  const effectiveRole = resolveCurrentWorkspaceRole(currentWorkspaceRole, activeRoles, currentRole);

  const allowed = isRoleAllowed(effectiveRole, allowedRoles, activeRoles, currentRole);

  if (!allowed) {
    if (isAdminRole(effectiveRole) || isAdminRole(currentRole)) {
      return <Navigate to='/admin' replace />;
    }
    return (
      <div className='p-6 max-w-2xl mx-auto py-12' data-testid='workspace-role-forbidden'>
        <Alert tone='danger' title={t('navigation.guard.forbiddenTitle')} className='shadow-xs'>
          <p className='text-sm text-stone-600 mt-1'>
            {t('navigation.guard.forbiddenDesc', { role: effectiveRole })}
          </p>
        </Alert>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
