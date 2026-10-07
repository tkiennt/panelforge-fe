export type StageKey =
  'script' | 'thumbnail' | 'pencil' | 'ink' | 'color' | 'letter' | 'review' | 'approved';

export interface PipelineStage {
  id: StageKey;
  label: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'script', label: 'Script' },
  { id: 'thumbnail', label: 'Thumbnail' },
  { id: 'pencil', label: 'Pencil' },
  { id: 'ink', label: 'Ink' },
  { id: 'color', label: 'Color' },
  { id: 'letter', label: 'Letter' },
  { id: 'review', label: 'Review' },
  { id: 'approved', label: 'Approved' },
];

import { WorkspaceRole } from '../types';

export type RoleKey = WorkspaceRole;

export interface PipelineMember {
  id: string;
  name: string;
  role: RoleKey;
  avatarInitials: string;
}

export const PIPELINE_MEMBERS: Record<string, PipelineMember> = {};

export type CardType = 'page' | 'panel';

export interface PipelineCard {
  id: string;
  type: CardType;
  identifier: string; // e.g. "Ch.5 · P.12"
  title: string;
  stage: StageKey;
  assigneeId: string;
  deadline: string; // ISO format or relative
  isAIAssisted: boolean;
  blockedBy: string[]; // IDs of cards this one depends on
  progress: number; // 0-100 (mainly for pages)
  thumbnailUrl?: string; // Optional image
  parentId?: string; // If this is a panel, ID of its parent page
  priority?: 'High' | 'Medium' | 'Low';
}

export const MOCK_CARDS: PipelineCard[] = [];
