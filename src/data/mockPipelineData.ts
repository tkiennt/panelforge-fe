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

export type RoleKey =
  'ADMINISTRATOR' | 'PRODUCER' | 'WRITER' | 'ARTIST' | 'LETTERER' | 'EDITOR' | 'READER';

export interface PipelineMember {
  id: string;
  name: string;
  role: RoleKey;
  avatarInitials: string;
}

export const PIPELINE_MEMBERS: Record<string, PipelineMember> = {
  'user-1': { id: 'user-1', name: 'Tatsuki F.', role: 'PRODUCER', avatarInitials: 'TF' },
  'user-2': { id: 'user-2', name: 'Kubo T.', role: 'WRITER', avatarInitials: 'KT' },
  'user-3': { id: 'user-3', name: 'Oda E.', role: 'ARTIST', avatarInitials: 'OE' },
  'user-4': { id: 'user-4', name: 'Miura K.', role: 'ARTIST', avatarInitials: 'MK' },
  'user-5': { id: 'user-5', name: 'Horikoshi K.', role: 'LETTERER', avatarInitials: 'HK' },
  'user-6': { id: 'user-6', name: 'Toriyama A.', role: 'EDITOR', avatarInitials: 'TA' },
};

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
}

export const MOCK_CARDS: PipelineCard[] = [
  // Page 1
  {
    id: 'page-1',
    type: 'page',
    identifier: 'Ch.5 · P.1',
    title: 'Opening Scene - Cityscape',
    stage: 'approved',
    assigneeId: 'user-3',
    deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    isAIAssisted: false,
    blockedBy: [],
    progress: 100,
  },

  // Page 2 (Breakdown into panels)
  {
    id: 'page-2',
    type: 'page',
    identifier: 'Ch.5 · P.2',
    title: 'Protagonist Introduction',
    stage: 'ink', // overall page stage
    assigneeId: 'user-3',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    isAIAssisted: false,
    blockedBy: [],
    progress: 60,
  },
  {
    id: 'panel-2-1',
    parentId: 'page-2',
    type: 'panel',
    identifier: 'Ch.5 · P.2 · Panel 1',
    title: 'Wide shot of hero',
    stage: 'color',
    assigneeId: 'user-4',
    deadline: new Date(Date.now() - 86400000 * 1).toISOString(), // Overdue
    isAIAssisted: true,
    blockedBy: [],
    progress: 100,
  },
  {
    id: 'panel-2-2',
    parentId: 'page-2',
    type: 'panel',
    identifier: 'Ch.5 · P.2 · Panel 2',
    title: 'Close up eyes',
    stage: 'pencil',
    assigneeId: 'user-3',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    isAIAssisted: false,
    blockedBy: [], // Not blocked
    progress: 100,
  },
  {
    id: 'panel-2-3',
    parentId: 'page-2',
    type: 'panel',
    identifier: 'Ch.5 · P.2 · Panel 3',
    title: 'Action pose',
    stage: 'thumbnail',
    assigneeId: 'user-3',
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    isAIAssisted: false,
    blockedBy: ['panel-2-2'], // Blocked by Panel 2
    progress: 100,
  },

  // Page 3
  {
    id: 'page-3',
    type: 'page',
    identifier: 'Ch.5 · P.3',
    title: 'Dialogue heavy',
    stage: 'script',
    assigneeId: 'user-2',
    deadline: new Date(Date.now() + 86400000 * 1).toISOString(),
    isAIAssisted: false,
    blockedBy: [],
    progress: 10,
  },
  {
    id: 'page-4',
    type: 'page',
    identifier: 'Ch.5 · P.4',
    title: 'Action Sequence',
    stage: 'review',
    assigneeId: 'user-6',
    deadline: new Date(Date.now() + 86400000 * 0.5).toISOString(),
    isAIAssisted: true,
    blockedBy: [],
    progress: 90,
  },
];
