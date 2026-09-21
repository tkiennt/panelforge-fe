import React from 'react';
import { useProjectPermission, Permission } from '../../lib/permissions';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  userRoles: string[];
  permissionKey: Permission;
  children: React.ReactNode;
  fallbackMessage?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  userRoles,
  permissionKey,
  children,
  fallbackMessage = "Bạn cần quyền để thao tác khu vực này"
}) => {
  const hasPerm = useProjectPermission(userRoles, permissionKey);

  if (hasPerm) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/40 backdrop-blur-[1px] rounded">
        <div className="bg-[#171717] text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          <Lock className="w-3 h-3" />
          {fallbackMessage}
        </div>
      </div>
    </div>
  );
};
