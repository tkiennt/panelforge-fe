/**
 * PanelForge System Domain Lexicon & Contextual Copywriting Standard.
 *
 * Enforces two-tier contextual layering:
 * 1. Creative Viewport (Writer, Artist, Letterer): Focus on story, art, dialogue, pacing.
 * 2. Governance / Provenance Viewport (Editor, Producer, Admin): Preserves W3C PROV, CAS SHA-256 chips, and Canon Lock invariants.
 */

import { translate } from '@/lib/i18n';

export type UILanguageContext = 'creative' | 'governance';

export const DOMAIN_LEXICON = {
  creative: {
    // Integrity & Storage
    get contentHash() {
      return translate('shared.lexicon.creative.contentHash');
    },
    get originalImage() {
      return translate('shared.lexicon.creative.originalImage');
    },
    get storageCode() {
      return translate('shared.lexicon.creative.storageCode');
    },

    // Canon & Locking (BR-01, BR-07)
    get canonLocked() {
      return translate('shared.lexicon.creative.canonLocked');
    },
    get supersedeRevision() {
      return translate('shared.lexicon.creative.supersedeRevision');
    },
    get supersedeExplanation() {
      return translate('shared.lexicon.creative.supersedeExplanation');
    },

    // Versioning & Sync
    get versionVector() {
      return translate('shared.lexicon.creative.versionVector');
    },

    // Workflow & Assignments
    get carveOutAssignment() {
      return translate('shared.lexicon.creative.carveOutAssignment');
    },
    get changeRequest() {
      return translate('shared.lexicon.creative.changeRequest');
    },

    // Editorial & Consistency
    get consistencyFinding() {
      return translate('shared.lexicon.creative.consistencyFinding');
    },
    get staleDialogue() {
      return translate('shared.lexicon.creative.staleDialogue');
    },
    get staleAction() {
      return translate('shared.lexicon.creative.staleAction');
    },

    // Canvas & Layout
    get frameTemplate() {
      return translate('shared.lexicon.creative.frameTemplate');
    },
    get compositePage() {
      return translate('shared.lexicon.creative.compositePage');
    },
  },
  governance: {
    // Integrity & Storage (CAS W3C PROV)
    get contentHash() {
      return translate('shared.lexicon.governance.contentHash');
    },
    get originalImage() {
      return translate('shared.lexicon.governance.originalImage');
    },
    get storageCode() {
      return translate('shared.lexicon.governance.storageCode');
    },

    // Canon & Locking (BR-01, BR-07)
    get canonLocked() {
      return translate('shared.lexicon.governance.canonLocked');
    },
    get supersedeRevision() {
      return translate('shared.lexicon.governance.supersedeRevision');
    },
    get supersedeExplanation() {
      return translate('shared.lexicon.governance.supersedeExplanation');
    },

    // Versioning & Sync
    get versionVector() {
      return translate('shared.lexicon.governance.versionVector');
    },

    // Workflow & Assignments
    get carveOutAssignment() {
      return translate('shared.lexicon.governance.carveOutAssignment');
    },
    get changeRequest() {
      return translate('shared.lexicon.governance.changeRequest');
    },

    // Editorial & Consistency
    get consistencyFinding() {
      return translate('shared.lexicon.governance.consistencyFinding');
    },
    get staleDialogue() {
      return translate('shared.lexicon.governance.staleDialogue');
    },
    get staleAction() {
      return translate('shared.lexicon.governance.staleAction');
    },

    // Canvas & Layout
    get frameTemplate() {
      return translate('shared.lexicon.governance.frameTemplate');
    },
    get compositePage() {
      return translate('shared.lexicon.governance.compositePage');
    },
  },
};

/**
 * System Error Code UX Copy Mapping.
 * Translates backend domain error codes into 3-part structured user notifications:
 * [Nguyên nhân / Tình trạng] + [Giải thích ngắn] + [Chỉ dẫn hành động]
 */
export const SYSTEM_ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  // 409 Race Condition & Version Conflicts
  ELEMENT_VERSION_CONFLICT: {
    get title() {
      return translate('shared.lexicon.systemErrors.ELEMENT_VERSION_CONFLICT.title');
    },
    get description() {
      return translate('shared.lexicon.systemErrors.ELEMENT_VERSION_CONFLICT.description');
    },
  },
  BLOCKING_FINDINGS_EXIST: {
    get title() {
      return translate('shared.lexicon.systemErrors.BLOCKING_FINDINGS_EXIST.title');
    },
    get description() {
      return translate('shared.lexicon.systemErrors.BLOCKING_FINDINGS_EXIST.description');
    },
  },
  CHARACTER_NOT_LOCKED: {
    get title() {
      return translate('shared.lexicon.systemErrors.CHARACTER_NOT_LOCKED.title');
    },
    get description() {
      return translate('shared.lexicon.systemErrors.CHARACTER_NOT_LOCKED.description');
    },
  },
  SCRIPT_FROZEN: {
    get title() {
      return translate('shared.lexicon.systemErrors.SCRIPT_FROZEN.title');
    },
    get description() {
      return translate('shared.lexicon.systemErrors.SCRIPT_FROZEN.description');
    },
  },
  CANON_LOCKED_CANNOT_MODIFY: {
    get title() {
      return translate('shared.lexicon.systemErrors.CANON_LOCKED_CANNOT_MODIFY.title');
    },
    get description() {
      return translate('shared.lexicon.systemErrors.CANON_LOCKED_CANNOT_MODIFY.description');
    },
  },
};

/**
 * Format dynamic entity short ID for clean UI representation (<= 10 chars).
 */
export function formatShortId(id?: string | null): string {
  if (!id) return '—';
  const clean = id.trim();
  if (clean.length <= 8) return `#${clean}`;
  return `#${clean.slice(0, 8)}`;
}

/**
 * Format CAS SHA-256 hash for governance compact chips (ab7f...3c9d).
 */
export function formatShortHash(hash?: string | null, prefixLen = 4, suffixLen = 4): string {
  if (!hash) return '—';
  const clean = hash.trim();
  if (clean.length <= prefixLen + suffixLen + 3) return clean;
  return `${clean.slice(0, prefixLen)}...${clean.slice(-suffixLen)}`;
}

/**
 * Helper to get contextual lexicon based on role.
 */
export function getContextualLexicon(
  role?: string | null,
): typeof DOMAIN_LEXICON.creative | typeof DOMAIN_LEXICON.governance {
  const norm = (role || '').toUpperCase();
  if (['EDITOR', 'PRODUCER', 'ADMIN', 'ADMINISTRATOR', 'LEAD', 'PUBLISHER'].includes(norm)) {
    return DOMAIN_LEXICON.governance;
  }
  return DOMAIN_LEXICON.creative;
}
