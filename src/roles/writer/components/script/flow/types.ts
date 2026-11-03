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
  | 'transition';

export interface ScriptLineBlockAttrs {
  scriptLineId: string;
  sceneId: string;
  blockType: MangaBlockType;
  speakerCharacterId: string | null;
  speakerName: string | null;
  narrationMode: NarrationMode;
  lineOrder: number;
  panelId: string | null; // Luôn null ở tầng tự sự kịch bản
}

export interface MentionSuggestionItem {
  id: string;
  name: string;
  subtitle?: string | null;
  category: BibleCategory;
  code: string;
  isLocked: boolean;
  avatarUrl?: string | null;
  stageName?: string | null;
  isStub?: boolean;
}
