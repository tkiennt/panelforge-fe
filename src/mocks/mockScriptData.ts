export type ScriptBlockType = 'scene_heading' | 'direction' | 'dialogue' | 'sfx' | 'panel_break';
export type AIState = 'suggested' | 'suggested_edited' | 'accepted' | 'none';

export interface BibleLink {
  startIndex: number;
  endIndex: number;
  entityId: string;
  text: string;
}

export interface ScriptBlock {
  id: string;
  type: ScriptBlockType;
  content: string;
  speakerId?: string; // Only for dialogue
  aiState?: AIState;
  linkedBibleEntries?: BibleLink[];
}

export const MOCK_SCRIPT_BLOCKS: ScriptBlock[] = [];
export const MOCK_OLD_VERSION_BLOCKS: ScriptBlock[] = [];
