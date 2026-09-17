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

export const MOCK_SCRIPT_BLOCKS: ScriptBlock[] = [
  {
    id: 'block-1',
    type: 'scene_heading',
    content: 'EXT. NEO TOKYO CITYSCAPE - NIGHT',
  },
  {
    id: 'block-2',
    type: 'direction',
    content:
      'Neon lights reflect off the rain-slicked pavement. The city is alive, bustling with hover-cabs and pedestrians wielding holographic umbrellas.',
  },
  {
    id: 'block-3',
    type: 'sfx',
    content: 'WHOOOSH',
  },
  {
    id: 'block-4',
    type: 'direction',
    content:
      'A high-speed pursuit breaks the ambient noise. A lone figure on a sleek hyper-bike weaves through traffic.',
  },
  {
    id: 'block-5',
    type: 'dialogue',
    speakerId: 'char-1', // Assuming this matches a Bible Entity ID
    content: "I told you I'd be there in five. Keep the engine running.",
    linkedBibleEntries: [{ startIndex: 44, endIndex: 50, entityId: 'prop-1', text: 'engine' }],
  },
  {
    id: 'block-6',
    type: 'panel_break',
    content: '',
  },
  {
    id: 'block-7',
    type: 'scene_heading',
    content: 'INT. COMMAND CENTER - CONTINUOUS',
    aiState: 'suggested',
  },
  {
    id: 'block-8',
    type: 'direction',
    content: 'Multiple screens glow with data streams. The Operator types frantically.',
    aiState: 'suggested',
  },
  {
    id: 'block-9',
    type: 'dialogue',
    speakerId: 'char-2',
    content: "You're pushing the core too hard! The stabilizers won't hold at that velocity.",
    aiState: 'suggested_edited',
  },
  {
    id: 'block-10',
    type: 'panel_break',
    content: '',
  },
  {
    id: 'block-11',
    type: 'dialogue',
    speakerId: 'char-1',
    content: 'Just watch me.',
  },
  {
    id: 'block-12',
    type: 'sfx',
    content: 'VROOOOM - KRAK',
  },
  {
    id: 'block-13',
    type: 'direction',
    content: 'Sparks fly as the bike grazes a guardrail, tearing a chunk of metal away.',
  },
  {
    id: 'block-14',
    type: 'scene_heading',
    content: 'EXT. BRIDGE OVER THE BAY - CONTINUOUS',
  },
  {
    id: 'block-15',
    type: 'direction',
    content: 'The pursuit hits the open bridge. The pursuing drones close the gap.',
  },
];

export const MOCK_OLD_VERSION_BLOCKS: ScriptBlock[] = [
  { id: 'block-1', type: 'scene_heading', content: 'EXT. NEO TOKYO CITY - NIGHT' }, // Changed
  {
    id: 'block-2',
    type: 'direction',
    content: 'Neon lights reflect off the pavement. The city is alive.',
  }, // Changed
  // block-3 SFX is missing
  {
    id: 'block-4',
    type: 'direction',
    content: 'A lone figure on a sleek hyper-bike weaves through traffic.',
  },
  {
    id: 'block-5',
    type: 'dialogue',
    speakerId: 'char-1',
    content: "I told you I'd be there in five. Keep the engine running.",
  },
  // ... cut short for comparison
];
