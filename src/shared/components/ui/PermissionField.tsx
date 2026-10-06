import React from 'react';
import { useProjectPermission, Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface PermissionFieldProps {
  userRoles: string[];
  permissionKey: Permission;
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea';
  className?: string;
}

export const PermissionField: React.FC<PermissionFieldProps> = ({
  userRoles,
  permissionKey,
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
}) => {
  const hasPerm = useProjectPermission(userRoles, permissionKey);

  if (!hasPerm) {
    return (
      <div
        className={cn(
          'p-2 bg-[#F3F3F3] text-[#555555] rounded text-sm border border-transparent whitespace-pre-wrap',
          className,
        )}
      >
        {value || placeholder}
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        className={cn(
          'w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#F97316]',
          className,
        )}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <input
      type='text'
      className={cn(
        'w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#F97316]',
        className,
      )}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
    />
  );
};
