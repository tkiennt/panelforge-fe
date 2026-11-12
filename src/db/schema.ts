/**
 * PanelForge Core Production Architecture Schema Specification
 *
 * Domain Relationship:
 * Series (Parent Workspace & Bible) ➔ Chapter (Production Container) ➔ Script (Dedicated Chapter Document)
 */

import { LexoRank } from 'lexorank';

// =============================================================================
// 1. ENUM DEFINITIONS
// =============================================================================

export const ChapterStatus = {
  PLANNING: 'PLANNING',
  SCRIPTING: 'SCRIPTING',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  STORYBOARDING: 'STORYBOARDING',
  DRAWING: 'DRAWING',
  PUBLISHED: 'PUBLISHED',
} as const;

export type ChapterStatusType = (typeof ChapterStatus)[keyof typeof ChapterStatus];

export const RoleInProject = {
  PRODUCER: 'PRODUCER',
  WRITER: 'WRITER',
  ARTIST: 'ARTIST',
  EDITOR: 'EDITOR',
} as const;

export type RoleInProjectType = (typeof RoleInProject)[keyof typeof RoleInProject];

// =============================================================================
// 2. DOMAIN INTERFACES & RELATIONAL MODELS
// =============================================================================

/**
 * 1. Series Level (Studio IP & Bible)
 * Contains the high-level intellectual property (IP), "Series Bible" (character sheets, worldbuilding, master plot outline).
 * Does NOT hold low-level production scripts.
 */
export interface Series {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations
  bible?: SeriesBible | null;
  chapters?: Chapter[];
  members?: ProjectMember[];
}

export interface SeriesBible {
  id: string;
  seriesId: string;
  logline: string | null;
  synopsis: string | null;
  worldSetting: string | null;
  characters?: CharacterProfile[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterProfile {
  id: string;
  bibleId: string;
  name: string;
  role: string | null; // Protagonist, Antagonist, Supporting
  bio: string | null;
  avatarUrl: string | null;
  colorTag: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 2. Project Membership & Permissions
 */
export interface ProjectMember {
  id: string;
  seriesId: string;
  userId: string;
  role: RoleInProjectType;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 3. Chapter Container (Producer Managed)
 * Represents a single weekly release/episode created by the Producer.
 * Tracks scheduling (deadlines, target panel count, assignees: Writer, Artist).
 * Manages the chapter state machine: planning -> scripting -> in_review -> approved -> storyboarding -> drawing -> published.
 */
export interface Chapter {
  id: string;
  seriesId: string;
  chapterNumber: number;
  title: string | null;
  status: ChapterStatusType;
  deadline: string | null;
  targetPanels: number; // default: 60

  // Assignees
  producerId: string;
  writerId: string | null;
  artistId: string | null;

  // The Script belongs strictly to this Chapter (1 Chapter : 1 Script)
  script?: ChapterScript | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * 4. Chapter Script Artifact & Structured AST
 * Strictly encapsulated INSIDE a Chapter (1 Chapter : 1 Script).
 * When in scripting status, only the assigned Writer (and Producer) can edit.
 * When the Writer submits for review and Producer marks approved, script is LOCKED (isLocked = true).
 */
export interface ChapterScript {
  id: string;
  chapterId: string; // Unique 1:1 relation with Chapter
  version: number;
  rawText: string;
  isLocked: boolean;
  lockedAt: string | null;
  lockedById: string | null;

  // Structured AST Nodes
  scenes?: Scene[];
  pages?: Page[];

  createdAt: string;
  updatedAt: string;
}

export interface Scene {
  id: string;
  scriptId: string;
  slugline: string; // e.g. "EXT. SHIBUYA CROSSING - NIGHT (RAIN)"
  orderIndex: number;
  isFlashback: boolean;
  panels?: Panel[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Page {
  id: string;
  scriptId: string;
  pageNumber: number;
  orderRank: string; // Fractional indexing string (LexoRank)
  panels?: Panel[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DialogueItem {
  character: string;
  modifier?: string; // e.g., "(O.S.)", "(WHISPERING)"
  text: string;
}

export interface SfxItem {
  text: string;
}

/**
 * Panel Model with Intra-Page Scene Transition:
 * Panels reference scenes independently (`panel.sceneId`),
 * allowing a single page to transition between scenes (e.g. Present -> Flashback).
 */
export interface Panel {
  id: string;
  pageId: string;
  sceneId: string; // Independent Scene binding (allows multi-scene per page)
  panelNumber: number;
  cameraShot: string | null;
  actionText: string;
  isFlashback: boolean;
  dialogues: DialogueItem[] | null;
  sfx: SfxItem[] | null;
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// 3. STATE MACHINE ENGINE & ACCESS GUARDS
// =============================================================================

export const VALID_CHAPTER_TRANSITIONS: Record<ChapterStatusType, readonly ChapterStatusType[]> = {
  [ChapterStatus.PLANNING]: [ChapterStatus.SCRIPTING],
  [ChapterStatus.SCRIPTING]: [ChapterStatus.IN_REVIEW],
  [ChapterStatus.IN_REVIEW]: [ChapterStatus.APPROVED, ChapterStatus.SCRIPTING], // Revision request returns to SCRIPTING
  [ChapterStatus.APPROVED]: [ChapterStatus.STORYBOARDING],
  [ChapterStatus.STORYBOARDING]: [ChapterStatus.DRAWING],
  [ChapterStatus.DRAWING]: [ChapterStatus.PUBLISHED],
  [ChapterStatus.PUBLISHED]: [],
};

/**
 * Validates whether a chapter status transition is allowed.
 */
export function canTransitionChapterStatus(
  currentStatus: ChapterStatusType,
  nextStatus: ChapterStatusType,
): boolean {
  const allowed = VALID_CHAPTER_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Evaluates whether a user can edit the script of a chapter:
 * - Chapter must be in SCRIPTING status.
 * - Script must not be locked (isLocked === false).
 * - User must be the assigned Writer or the Producer.
 */
export function isScriptEditable(
  chapter: Pick<Chapter, 'status' | 'writerId' | 'producerId'>,
  script: Pick<ChapterScript, 'isLocked'>,
  userId: string,
): { allowed: boolean; reason?: string } {
  if (script.isLocked) {
    return {
      allowed: false,
      reason: 'Script is locked and cannot be edited. It has been approved for production.',
    };
  }

  if (chapter.status !== ChapterStatus.SCRIPTING) {
    return {
      allowed: false,
      reason: `Script can only be edited when Chapter status is SCRIPTING (current: ${chapter.status}).`,
    };
  }

  const isWriter = chapter.writerId === userId;
  const isProducer = chapter.producerId === userId;

  if (!isWriter && !isProducer) {
    return {
      allowed: false,
      reason: 'Only the assigned Writer or the Producer is authorized to edit the script.',
    };
  }

  return { allowed: true };
}

/**
 * Generates an initial or interpolated LexoRank string for page fractional ordering.
 */
export function generatePageOrderRank(prevRank?: string, nextRank?: string): string {
  if (!prevRank && !nextRank) {
    return LexoRank.middle().toString();
  }
  if (!prevRank && nextRank) {
    return LexoRank.parse(nextRank).genPrev().toString();
  }
  if (prevRank && !nextRank) {
    return LexoRank.parse(prevRank).genNext().toString();
  }
  return LexoRank.parse(prevRank!).between(LexoRank.parse(nextRank!)).toString();
}

/**
 * Validates intra-page scene transitions:
 * Verifies that panels on the page reference valid scenes and detects multi-scene splits.
 */
export function analyzePageSceneTransitions(
  panels: Pick<Panel, 'panelNumber' | 'sceneId' | 'isFlashback'>[],
): {
  isMultiScene: boolean;
  sceneIds: string[];
  transitions: Array<{ fromSceneId: string; toSceneId: string; atPanelNumber: number }>;
} {
  const sorted = [...panels].sort((a, b) => a.panelNumber - b.panelNumber);
  const sceneIds = Array.from(new Set(sorted.map((p) => p.sceneId)));
  const transitions: Array<{ fromSceneId: string; toSceneId: string; atPanelNumber: number }> = [];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].sceneId !== sorted[i - 1].sceneId) {
      transitions.push({
        fromSceneId: sorted[i - 1].sceneId,
        toSceneId: sorted[i].sceneId,
        atPanelNumber: sorted[i].panelNumber,
      });
    }
  }

  return {
    isMultiScene: sceneIds.length > 1,
    sceneIds,
    transitions,
  };
}
