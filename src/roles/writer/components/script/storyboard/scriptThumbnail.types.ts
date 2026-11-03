// src/roles/writer/components/script/storyboard/scriptThumbnail.types.ts

export type CameraAngle =
  | 'Toàn cảnh (Wide Shot)'
  | 'Trung cảnh (Medium Shot)'
  | 'Cận cảnh (Close-Up)'
  | 'Đặc tả (Extreme Close-Up)'
  | 'Góc cao (High Angle / Bird-Eye)'
  | 'Góc thấp (Low Angle / Worm-Eye)'
  | 'Ngang vai (Over-the-Shoulder)'
  | 'Góc nghiêng (Dutch Angle)';

export interface StoryboardDialogue {
  id: string;
  speaker: string;
  text: string;
  speakerCharacterId?: string | null;
  narrationMode?: string;
}

export interface StoryboardPanel {
  id: string;
  panelKey: string; // e.g. "1.1", "1.2", "2.1"
  panelNumber: number; // e.g. 1, 2
  readingOrder: number;
  cameraAngle?: CameraAngle | string;
  stageDirection?: string;
  dialogues: StoryboardDialogue[];
  thumbnailUrl?: string | null;
  thumbnailName?: string | null;
  thumbnailFile?: File | null;
  notes?: string;
  sourceScriptLineIds?: string[];
  aspectRatio?: '16:9' | '4:3' | '1:1' | '3:4' | '21:9';
}

export interface StoryboardPage {
  id: string;
  pageNumber: number;
  panels: StoryboardPanel[];
  layoutFormat?: 'Manga' | 'Webtoon' | 'Comic';
}

export interface StoryboardDocument {
  pages: StoryboardPage[];
  rawScriptText: string;
}
