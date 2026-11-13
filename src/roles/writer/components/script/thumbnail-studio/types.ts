// src/roles/writer/components/script/thumbnail-studio/types.ts

export type CameraShotType =
  'extreme_wide' | 'wide' | 'medium' | 'close_up' | 'extreme_close_up' | 'pov' | 'unknown';

export interface DialogueItem {
  id: string;
  character: string;
  modifier?: 'thought' | 'shout' | 'whisper' | 'off_panel' | 'filter';
  text: string;
}

export interface SoundEffectItem {
  id: string;
  text: string;
}

export interface PanelNode {
  id: string;
  panelNumber: number;
  shotType?: CameraShotType;
  actionDescription: string;
  dialogues: DialogueItem[];
  sfx: SoundEffectItem[];
  cameraNote?: string;
  startLineIndex?: number;
  endLineIndex?: number;
}

export interface PageNode {
  id: string;
  pageNumber: number;
  orderRank: string; // LexoRank string (e.g. '0|00000:', '0|00001:')
  sceneId?: string;
  panels: PanelNode[];
  startLineIndex?: number;
  endLineIndex?: number;
}

export interface SceneNode {
  id: string;
  title: string;
  slugline: string; // e.g. "INT. SHIBUYA CROSSING - NIGHT (RAIN)"
  environment?: {
    location?: string;
    timeOfDay?: string;
    weather?: string;
    moodColor?: string;
  };
  startLineIndex?: number;
}

export interface ComicScriptAST {
  scenes: SceneNode[];
  pages: PageNode[];
}
