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

export const MOCK_PAGE_PANELS: PanelItem[] = [];
export const MOCK_BIBLE_OVERLAYS: BibleOverlay[] = [];
