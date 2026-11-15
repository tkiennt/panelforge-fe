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

export function isRoleAllowed(
  effectiveRole: string,
  allowedRoles: (WorkspaceRole | SystemRole | string)[],
): boolean {
  const normEffective = effectiveRole.toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => String(r).toUpperCase());

  // Support ADMIN and ADMINISTRATOR equivalence
  const effectiveMatchesAdmin = normEffective === 'ADMIN' || normEffective === 'ADMINISTRATOR';
  const allowedIncludesAdmin =
    normalizedAllowed.includes('ADMIN') || normalizedAllowed.includes('ADMINISTRATOR');

  if (effectiveMatchesAdmin && allowedIncludesAdmin) {
    return true;
  }

  return normalizedAllowed.includes(normEffective);
}
