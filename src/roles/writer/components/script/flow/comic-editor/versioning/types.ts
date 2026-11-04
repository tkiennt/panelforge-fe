// src/roles/writer/components/script/flow/comic-editor/versioning/types.ts

export type ScriptVersionStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'DEPRECATED';

export interface ScriptVersion {
  id: string;
  chapterId: string;
  versionNumber: string; // e.g. "1.0", "1.1", "2.0"
  major: number; // Incremented on post-approval revision (e.g., 2.0)
  minor: number; // Incremented on review feedback loops (e.g., 1.1)
  rawText: string; // Full text snapshot of that version
  snapshotAST: any; // Parsed JSON nodes (Pages, Panels, Dialogues)
  status: ScriptVersionStatus;
  changeLog?: string; // Feedback note from Producer or Writer summary
  isLocked: boolean; // True when status is APPROVED
  createdBy: string; // Writer User ID
  approvedBy?: string; // Producer User ID
  createdAt: string; // ISO Date string for serialization compatibility
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
  changeCategory?: 'camera' | 'dialogue' | 'panel' | 'page' | 'sfx' | 'general';
  changeDetail?: string;
}

export interface ScriptDiffSummary {
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  unchangedCount: number;
  lines: DiffLine[];
  sideBySide: {
    left: (DiffLine | null)[];
    right: (DiffLine | null)[];
  };
}

