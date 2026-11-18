import React from 'react';
import { Outlet } from 'react-router-dom';
import { Alert } from '@/shared/ui';
import { WorkspaceRole, SystemRole } from '@/types';
import { resolveCurrentWorkspaceRole, isRoleAllowed } from './workspaceRoleGuard';

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
  const effectiveRole = resolveCurrentWorkspaceRole(currentWorkspaceRole, activeRoles, currentRole);

  const allowed = isRoleAllowed(effectiveRole, allowedRoles, activeRoles, currentRole);

  if (!allowed) {
    return (
      <div className='p-6 max-w-2xl mx-auto py-12' data-testid='workspace-role-forbidden'>
        <Alert tone='danger' title='403 - Không có quyền truy cập' className='shadow-xs'>
          <p className='text-sm text-stone-600 mt-1'>
            Bạn không có quyền truy cập vào khu vực này với vai trò hiện tại ({effectiveRole}).
          </p>
        </Alert>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
