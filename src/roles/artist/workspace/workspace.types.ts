export type WorkspaceMode = 'full-page' | 'panel-template';

export interface ScriptLineData {
  id: string;
  lineOrder: number;
  panelNumber?: number;
  characterName?: string;
  characterColor?: string;
  dialogueText?: string;
  stageDirection?: string;
}

export interface PanelArtworkData {
  panelNumber: number;
  file?: File | null;
  previewUrl?: string | null;
  version?: string;
  updatedAt?: string;
}

export interface PanelBlockData {
  id: string;
  panelNumber: number;
  readingOrder: number;
  // Normalized layout box (percentages 0-100) for clean CSS rendering
  x: number;
  y: number;
  width: number;
  height: number;
  artwork?: PanelArtworkData;
  scriptLines: ScriptLineData[];
}

export interface PageArtworkState {
  file?: File | null;
  previewUrl?: string | null;
  version?: string;
  isUploaded?: boolean;
}

export interface FramePresetTemplate {
  id: string;
  name: string;
  description: string;
  panelCount: number;
  previewGrid: string; // SVG path or CSS grid representation
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
