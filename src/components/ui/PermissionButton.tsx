import React from 'react';
import { Button, ButtonProps } from './Button';
import { useProjectPermission, Permission } from '../../lib/permissions';
import { Lock } from 'lucide-react';

interface PermissionButtonProps extends ButtonProps {
  userRoles: string[];
  permissionKey: Permission;
  fallbackTitle?: string;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  userRoles,
  permissionKey,
  fallbackTitle = 'Bạn không có quyền thực hiện thao tác này',
  disabled,
  title,
  children,
  className = '',
  ...props
}) => {
  const hasPerm = useProjectPermission(userRoles, permissionKey);
  const isDisabled = disabled || !hasPerm;
  const tooltip = !hasPerm ? fallbackTitle : title;

  return (
    <Button
      disabled={isDisabled}
      title={tooltip}
      className={!hasPerm ? `${className} opacity-60 relative` : className}
      {...props}
    >
      {children}
      {!hasPerm && <Lock className='w-3.5 h-3.5 ml-1.5 opacity-70 inline-block' />}
    </Button>
  );
};
