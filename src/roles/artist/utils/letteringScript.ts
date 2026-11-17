import { classifyScriptLine } from '@/shared/utils/textStyle';
import type { BalloonType } from '../hooks/useLetteringBalloons';
import type { ScriptLineItem } from '../components/desk/ArtistCanvaSidebar';

const BALLOON_TYPES: BalloonType[] = [
  'SPEECH_BALLOON',
  'THOUGHT_BALLOON',
  'NARRATION_BOX',
  'SOUND_EFFECT',
];

export const BALLOON_TYPE_LABELS: Record<string, string> = {
  SPEECH_BALLOON: 'Bóng thoại',
  THOUGHT_BALLOON: 'Suy nghĩ',
  NARRATION_BOX: 'Dẫn truyện',
  SOUND_EFFECT: 'SFX',
};

/** Loại bóng gợi ý cho một dòng kịch bản (script đã biết dòng nào là thoại / suy nghĩ / dẫn truyện / SFX). */
export function suggestBalloonType(line: ScriptLineItem): {
  type: BalloonType;
  letterable: boolean;
  text: string;
} {
  const c = classifyScriptLine({
    dialogueText: line.dialogueText,
    stageDirection: line.stageDirection,
    speakerName: line.characterName,
    narrationMode: line.narrationMode,
  });
  const type = BALLOON_TYPES.includes(c.suggestedElementType as BalloonType)
    ? (c.suggestedElementType as BalloonType)
    : 'SPEECH_BALLOON';
  return { type, letterable: c.isLetterable, text: c.cleanText };
}
