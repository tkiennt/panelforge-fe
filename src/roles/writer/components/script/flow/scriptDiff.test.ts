import { describe, expect, it } from 'vitest';
import type { NextLineSuggestion, ScriptDraft } from '@/services/aiAgents.service';
import type { SceneDetailDto } from '@/services/scriptLine.service';
import { diffScriptRows, draftRows, insertRows, newBibleNames } from './scriptDiff';

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

  it('insertRows chèn dòng gợi ý ScriptLineInsert đúng vị trí afterLineId hoặc cuối Scene', () => {
    const scene = {
      id: 'sc-1',
      chapterId: 'ch-1',
      sceneNumber: 1,
      heading: 'Cảnh 1',
      summary: null,
      createdAt: '2026-11-25',
      scriptLines: [
        { id: 'l-1', lineOrder: 1, kind: 'Action', stageDirection: 'Mưa rơi.' },
        { id: 'l-2', lineOrder: 2, kind: 'Sfx', stageDirection: 'RẦM' },
      ],
    } as unknown as SceneDetailDto;

    const afterFirst: NextLineSuggestion = {
      schemaVersion: 1,
      runId: 'r-1',
      sceneId: 'sc-1',
      afterLineId: 'l-1',
      kind: 'Dialogue',
      speaker: 'Akira',
      text: 'Đi thôi!',
      reason: null,
    };
    expect(insertRows(scene, afterFirst)).toEqual([
      { el: 'action', text: 'Mưa rơi.' },
      { el: 'character', text: 'AKIRA:' },
      { el: 'dialogue', text: 'Đi thôi!' },
      { el: 'sfx', text: 'RẦM' },
    ]);

    const atEnd: NextLineSuggestion = {
      ...afterFirst,
      afterLineId: null,
      kind: 'Sfx',
      speaker: null,
      text: 'VÙÙÙ!',
    };
    expect(insertRows(scene, atEnd)).toEqual([
      { el: 'action', text: 'Mưa rơi.' },
      { el: 'sfx', text: 'RẦM' },
      { el: 'sfx', text: 'VÙÙÙ!' },
    ]);
  });
});
