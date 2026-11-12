import { useMemo } from 'react';

export type Permission =
  | 'view_pipeline'
  | 'create_card'
  | 'drag_card'
  | 'edit_script'
  | 'edit_art'
  | 'review_card'
  | 'request_ai'
  | 'upload_layer'
  // Granular project permissions for Unified Workspace
  | 'script:write'
  | 'sketch:write'
  | 'color:write'
  | 'letter:write'
  | 'stage:approve';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  READER: [],
  WRITER: ['view_pipeline', 'drag_card', 'edit_script', 'request_ai', 'script:write'],
  ARTIST: [
    'view_pipeline',
    'drag_card',
    'edit_art',
    'request_ai',
    'upload_layer',
    'sketch:write',
    'color:write',
    // BR-31: Artist mặc định có công cụ đặt chữ trên Page được giao
    'letter:write',
  ],
  LETTERER: ['view_pipeline', 'drag_card', 'upload_layer', 'letter:write'],
  EDITOR: ['view_pipeline', 'review_card', 'stage:approve'],
  PRODUCER: ['view_pipeline', 'create_card', 'drag_card', 'review_card', 'stage:approve'],
  ADMINISTRATOR: [],
};

export function resolvePermissions(roles: string[]): Permission[] {
  const permissions = new Set<Permission>();
  roles.forEach((role) => {
    const rolePerms = ROLE_PERMISSIONS[role.toUpperCase()];
    if (rolePerms) {
      rolePerms.forEach((p) => permissions.add(p));
    }
  });
  return Array.from(permissions);
}

export function usePermissions(userRoles: string[]) {
  const permissions = useMemo(() => resolvePermissions(userRoles), [userRoles]);

  const hasPermission = (permission: Permission) => {
    return permissions.includes(permission);
  };

  return { permissions, hasPermission };
}

// Alias to match the specific requirement `useProjectPermission`
export function useProjectPermission(userRoles: string[], permissionKey: Permission): boolean {
  const { hasPermission } = usePermissions(userRoles);
  return hasPermission(permissionKey);
}
