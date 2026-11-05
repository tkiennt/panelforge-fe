export interface ScriptLineData {
  id: string;
  lineOrder: number;
  panelNumber?: number;
  characterName?: string;
  characterColor?: string;
  dialogueText?: string;
  stageDirection?: string;
}

export interface PanelArtwork {
  panelId: string;
  panelIndex: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  previewUrl?: string | null;
  version?: string;
  file?: File | null;
  updatedAt?: string;
  isUploaded?: boolean;
}

// Alias tương thích ngược cho FullPageCanvas cũ
export type PageArtworkState = PanelArtwork;

export interface PanelBlockData {
  id: string;
  panelNumber: number;
  readingOrder: number;
  // Normalized layout box (percentages 0-100) for clean CSS rendering
  x: number;
  y: number;
  width: number;
  height: number;
  artwork?: PanelArtwork;
  scriptLines: ScriptLineData[];
}

export interface PageLayoutState {
  pageId: string;
  pageNumber: number;
  templateId: string; // 'single-full' by default
  isFullPageUpload: boolean;
  panels: PanelArtwork[];
}

export interface FramePresetTemplate {
  id: string;
  name: string;
  category?: 'Kinh điển' | 'Hành động' | 'Đại cảnh' | 'Truyền thống';
  description: string;
  panelCount: number;
  badge?: string;
  previewGrid?: string;
  panels: Array<{
    panelNumber: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface BreadcrumbInfo {
  studioName: string;
  seriesTitle: string;
  chapterTitle: string;
  pageNumber: number;
  totalPages: number;
}

export interface CharacterModelSheet {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  modelSheetUrl?: string;
  palette: string[];
  notes?: string;
}

export interface PageFilmstripItem {
  pageNumber: number;
  hasArtwork: boolean;
  panelCount: number;
  thumbnailUrl?: string;
}
