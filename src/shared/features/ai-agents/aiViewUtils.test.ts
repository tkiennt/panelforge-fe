import { describe, it, expect } from 'vitest';
import { collectLines } from './aiViewUtils';
import type { AiStepDto } from '@/services/aiAgents.service';

const step = (agent: string, extra: Partial<AiStepDto>): AiStepDto =>
  ({ id: agent, stepIndex: 0, agent, status: 'Succeeded', ...extra }) as AiStepDto;

describe('collectLines', () => {
  it('lấy thứ tự và nội dung dòng từ bước Writer', () => {
    const map = collectLines(
      [
        step('Writer', {
          output: { lines: [{ lineId: 'a', order: 1, dialogue: 'Xin chào', speakerId: 'c1' }] },
        }),
      ],
      { c1: 'AKIRA' },
    );
    expect(map.a).toEqual({ order: 1, text: 'Xin chào', speaker: 'AKIRA' });
  });

  it('lượt chỉ phân khung (không có Writer): lấy thứ tự dòng từ scriptLineIds của step, không ra "dòng ?"', () => {
    const map = collectLines(
      [
        step('Storyboard', {
          input: {
            scriptLineIds: [
              { key: 'L1', lineId: 'x' },
              { key: 'L2', lineId: 'y' },
            ],
          },
        }),
      ],
      {},
    );
    expect(map.x.order).toBe(1);
    expect(map.y.order).toBe(2);
  });

  it('dữ liệu của bước Writer được ưu tiên hơn scriptLineIds', () => {
    const map = collectLines(
      [
        step('Writer', {
          output: { lines: [{ lineId: 'a', order: 3, stageDirection: 'Mưa rơi' }] },
        }),
        step('Storyboard', { input: { scriptLineIds: [{ key: 'L9', lineId: 'a' }] } }),
      ],
      {},
    );
    expect(map.a).toMatchObject({ order: 3, text: 'Mưa rơi' });
  });
});
