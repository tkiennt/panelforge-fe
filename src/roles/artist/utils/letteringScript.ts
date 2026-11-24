import { classifyScriptLine } from '@/shared/utils/textStyle';
import { translate } from '@/lib/i18n';
import type { BalloonType } from '../hooks/useLetteringBalloons';
import type { ScriptLineItem } from '../components/desk/ArtistCanvaSidebar';

const BALLOON_TYPES: BalloonType[] = [
  'SPEECH_BALLOON',
  'THOUGHT_BALLOON',
  'NARRATION_BOX',
  'SOUND_EFFECT',
];

export const BALLOON_TYPE_LABELS: Record<string, string> = {
  get SPEECH_BALLOON() {
    return translate('artist.balloonTypes.speech');
  },
  get THOUGHT_BALLOON() {
    return translate('artist.balloonTypes.thought');
  },
  get NARRATION_BOX() {
    return translate('artist.balloonTypes.narration');
  },
  get SOUND_EFFECT() {
    return translate('artist.balloonTypes.sfx');
  },
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
