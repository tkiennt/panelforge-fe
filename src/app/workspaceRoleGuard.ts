import { WorkspaceRole, SystemRole, getRoleFromToken } from '@/types';

/**
 * Resolves the effective workspace role using the same sources AppShell uses:
 * 1. Explicit workspaceRole prop/state
 * 2. Active project roles
 * 3. localStorage workspaceRole / activeWorkspace.currentUserRole
 * 4. SystemRole (ADMINISTRATOR, PUBLISHER) from prop, token, or localStorage
 * 5. Default fallback to PRODUCER (standard studio view)
 */
export function resolveCurrentWorkspaceRole(
  propRole?: WorkspaceRole | null,
  propActiveRoles?: string[],
  propSystemRole?: SystemRole | string,
): string {
  if (propRole) return String(propRole).toUpperCase();
  if (propActiveRoles && propActiveRoles.length > 0) {
    return String(propActiveRoles[0]).toUpperCase();
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('workspaceRole');
      if (raw) return String(raw).toUpperCase();

      const savedWs = localStorage.getItem('activeWorkspace');
      if (savedWs) {
        const parsed = JSON.parse(savedWs);
        if (parsed?.currentUserRole) return String(parsed.currentUserRole).toUpperCase();
      }
    } catch {
      // ignore
    }
  }

  if (propSystemRole) {
    const norm = String(propSystemRole).toUpperCase();
    if (norm === 'ADMINISTRATOR' || norm === 'ADMIN') return 'ADMINISTRATOR';
    if (norm === 'PUBLISHER') return 'PUBLISHER';
  }

  if (typeof window !== 'undefined') {
    const tokenRole = getRoleFromToken();
    if (tokenRole) {
      if (tokenRole === 'ADMINISTRATOR') return 'ADMINISTRATOR';
      if (tokenRole === 'PUBLISHER') return 'PUBLISHER';
    }
    const storedUserRole = localStorage.getItem('userRole');
    if (storedUserRole) {
      const norm = storedUserRole.toUpperCase();
      if (norm === 'ADMIN' || norm === 'ADMINISTRATOR') return 'ADMINISTRATOR';
      if (norm === 'PUBLISHER') return 'PUBLISHER';
    }
  }

  return 'PRODUCER';
}

export function isAdminRole(role?: SystemRole | WorkspaceRole | string | null): boolean {
  if (!role) return false;
  const norm = String(role).toUpperCase();
  return norm === 'ADMIN' || norm === 'ADMINISTRATOR';
}

export function isRoleAllowed(
  effectiveRole: string,
  allowedRoles: (WorkspaceRole | SystemRole | string)[],
  activeRoles?: string[],
  currentRole?: string,
): boolean {
  const normEffective = effectiveRole.toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

  // 1. Support ADMIN and ADMINISTRATOR equivalence — allowed only when explicitly listed (BR-07)
  const effectiveMatchesAdmin = isAdminRole(normEffective);
  const currentMatchesAdmin = isAdminRole(currentRole);
  const allowedIncludesAdmin =
    normalizedAllowed.includes('ADMIN') || normalizedAllowed.includes('ADMINISTRATOR');

  if (effectiveMatchesAdmin || currentMatchesAdmin) {
    return allowedIncludesAdmin;
  }

  // 2. Check effective role
  if (normalizedAllowed.includes(normEffective)) {
    return true;
  }

  // 3. Producer (studio director) has access across all production desk screens (except publisher-only)
  if (normEffective === 'PRODUCER' && !normalizedAllowed.includes('PUBLISHER')) {
    return true;
  }

  // 4. Check if user has any active role that matches allowedRoles
  if (activeRoles && activeRoles.length > 0) {
    const hasMatch = activeRoles.some((r) => normalizedAllowed.includes(String(r).toUpperCase()));
    if (hasMatch) return true;
  }

  return false;
}
