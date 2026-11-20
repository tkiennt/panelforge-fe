import { describe, expect, it } from 'vitest';
import type { ScriptDraft } from '@/services/aiAgents.service';
import { diffScriptRows, draftRows, newBibleNames } from './scriptDiff';

const draft = {
  lines: [
    {
      lineId: 'a',
      order: 1,
      kind: 'Action',
      stageDirection: 'Mưa rơi.',
      refs: [{ surfaceText: 'Mưa', newName: 'Cơn mưa', newCategory: 'Prop' }],
    },
    {
      lineId: 'b',
      order: 2,
      kind: 'Dialogue',
      speakerId: null,
      speakerLabel: 'Lan (thì thầm)',
      dialogue: 'Về thôi.',
    },
    { lineId: 'c', order: 3, kind: 'Sfx', stageDirection: 'RẦM' },
  ],
} as unknown as ScriptDraft;

describe('scriptDiff', () => {
  it('dựng đúng loại dòng của trang script', () => {
    expect(draftRows(draft, {})).toEqual([
      { el: 'action', text: 'Mưa rơi.' },
      { el: 'character', text: 'LAN:' },
      { el: 'parens', text: 'thì thầm' },
      { el: 'dialogue', text: 'Về thôi.' },
      { el: 'sfx', text: 'RẦM' },
    ]);
    expect(newBibleNames(draft)).toEqual(['Cơn mưa', 'Lan']);
  });

  it('đánh dấu dòng bỏ, thêm và giữ nguyên', () => {
    const a = { el: 'action', text: 'A' };
    const b = { el: 'dialogue', text: 'B' };
    const c = { el: 'dialogue', text: 'C' };
    expect(diffScriptRows([a, b], [a, c]).map((r) => `${r.status}:${r.text}`)).toEqual([
      'same:A',
      'removed:B',
      'added:C',
    ]);
  });
});
