export interface ScriptLineItem {
  id: string;
  lineOrder: number;
  panelId?: string | null;
  characterName?: string | null;
  characterColor?: string | null;
  dialogueText?: string | null;
  stageDirection?: string | null;
  cameraAngle?: string | null;
  mood?: string | null;
}

export interface CanvasPanelItem {
  id: string;
  panelNumber: number;
  readingOrder: number;
  x: number; // Percentage on canvas 0-100
  y: number; // Percentage on canvas 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
  imageUrl?: string | null;
  imageVersion?: string;
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
  suggestedPrompt?: string;
  negativePrompt?: string;
  assignedScriptIds?: string[];
}

export interface BibleCharacterRef {
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  hairStyleGuide?: string;
  costumeGuide?: string;
  colorKey?: string;
  notableFeatures?: string[];
}

export interface PanelScriptContext {
  panelNumber: number;
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
  actionSummary?: string;
  dialogueSnippets?: string[];
  detectedCharacters?: BibleCharacterRef[];
}

export type ViewMode = 'panel' | 'fullpage';
export type AiAgentStatus = 'ready' | 'generating' | 'idle' | 'error';
