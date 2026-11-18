// src/roles/writer/components/script/flow/types.ts
import { NarrationMode } from '@/services/scriptLine.service';
import { BibleCategory } from '@/services/bible.service';

export type MangaBlockType =
  | 'scene_heading'
  | 'page_heading'
  | 'panel_heading'
  | 'stage_direction'
  | 'character'
  | 'dialogue'
  | 'thought'
  | 'transition'
  | 'caption'
  | 'sfx';

export interface ScriptLineBlockAttrs {
  scriptLineId: string;
  sceneId: string;
  blockType: MangaBlockType;
  speakerName: string | null;
  narrationMode: NarrationMode;
  lineOrder: number;
  panelId: string | null;
  pageNumber?: number;
  panelNumber?: number;
  hasThumbnail?: boolean;
}
