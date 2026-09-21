import React from 'react';
import { Button, ButtonProps } from './Button';
import { useProjectPermission, Permission } from '../../lib/permissions';

interface PermissionButtonProps extends ButtonProps {
  userRoles: string[];
  permissionKey: Permission;
  fallbackTitle?: string;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  userRoles,
  permissionKey,
  fallbackTitle = "Bạn không có quyền thực hiện thao tác này",
  disabled,
  title,
  ...props
}) => {
  const hasPerm = useProjectPermission(userRoles, permissionKey);
  const isDisabled = disabled || !hasPerm;
  const tooltip = !hasPerm ? fallbackTitle : title;

  return (
    <Button
      disabled={isDisabled}
      title={tooltip}
      {...props}
    />
  );
};
