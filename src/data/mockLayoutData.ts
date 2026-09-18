export type StageType = 'thumbnail' | 'pencil' | 'ink' | 'color' | 'letter' | 'review' | 'done';

export interface ArtworkVersion {
  id: string;
  uploaderName: string;
  uploaderAvatar: string;
  timestamp: string;
  stageAtUpload: StageType;
  thumbnailUrl?: string; // We'll just use a colored div if no URL
}

export interface PanelItem {
  id: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  stage: StageType;
  assignee: string;
  currentArtworkVersionId?: string;
  versions: ArtworkVersion[];
}

export interface BibleOverlay {
  id: string;
  entityId: string;
  name: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
}

// 1 page, 5 panels, 2 with versions, 1 empty
export const MOCK_PAGE_PANELS: PanelItem[] = [
  {
    id: 'PNL-01',
    x: 5,
    y: 5,
    width: 90,
    height: 25,
    stage: 'pencil',
    assignee: 'Ken',
    currentArtworkVersionId: 'v1',
    versions: [
      {
        id: 'v1',
        uploaderName: 'Ken',
        uploaderAvatar: 'K',
        timestamp: '2026-09-17T10:00:00Z',
        stageAtUpload: 'thumbnail',
      },
    ],
  },
  {
    id: 'PNL-02',
    x: 5,
    y: 32,
    width: 43,
    height: 35,
    stage: 'ink',
    assignee: 'Ken',
    currentArtworkVersionId: 'v2',
    versions: [
      {
        id: 'v2',
        uploaderName: 'Ken',
        uploaderAvatar: 'K',
        timestamp: '2026-09-17T11:15:00Z',
        stageAtUpload: 'pencil',
      },
      {
        id: 'v1',
        uploaderName: 'Ken',
        uploaderAvatar: 'K',
        timestamp: '2026-09-16T14:30:00Z',
        stageAtUpload: 'thumbnail',
      },
    ],
  },
  {
    id: 'PNL-03',
    x: 52,
    y: 32,
    width: 43,
    height: 35,
    stage: 'color',
    assignee: 'Ken',
    currentArtworkVersionId: 'v3',
    versions: [
      {
        id: 'v3',
        uploaderName: 'Ken',
        uploaderAvatar: 'K',
        timestamp: '2026-09-17T14:00:00Z',
        stageAtUpload: 'ink',
      },
      {
        id: 'v2',
        uploaderName: 'Ken',
        uploaderAvatar: 'K',
        timestamp: '2026-09-17T09:20:00Z',
        stageAtUpload: 'pencil',
      },
      {
        id: 'v1',
        uploaderName: 'Ken',
        uploaderAvatar: 'K',
        timestamp: '2026-09-16T10:10:00Z',
        stageAtUpload: 'thumbnail',
      },
    ],
  },
  {
    id: 'PNL-04',
    x: 5,
    y: 69,
    width: 60,
    height: 26,
    stage: 'done',
    assignee: 'Ken',
    currentArtworkVersionId: 'v4',
    versions: [
      {
        id: 'v4',
        uploaderName: 'Ken',
        uploaderAvatar: 'K',
        timestamp: '2026-09-17T16:45:00Z',
        stageAtUpload: 'review',
      },
    ],
  },
  {
    id: 'PNL-05',
    x: 68,
    y: 69,
    width: 27,
    height: 26,
    stage: 'thumbnail', // empty panel
    assignee: 'Ken',
    versions: [],
  },
];

export const MOCK_BIBLE_OVERLAYS: BibleOverlay[] = [
  // Example data if a bible reference is already dropped on canvas
];
