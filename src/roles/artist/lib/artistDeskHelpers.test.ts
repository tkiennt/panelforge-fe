import { describe, expect, it } from 'vitest';
import type { PipelineStageDto } from '@/services/pipeline.service';
import { buildArtistFocusStages, resolveStageKey } from './artistDeskHelpers';

const stage = (over: Partial<PipelineStageDto>): PipelineStageDto => ({
  id: 'stage',
  name: 'Stage',
  slug: 'stage',
  stageOrder: 1,
  isApprovalGate: false,
  isInitial: false,
  isTerminal: false,
  isEnabled: true,
  ...over,
});

describe('buildArtistFocusStages', () => {
  it('không hiển thị Color khi pipeline bộ truyện không bật công đoạn này', () => {
    const result = buildArtistFocusStages([
      stage({ id: 'pencil', name: 'Pencil', slug: 'pencil', stageOrder: 1 }),
      stage({ id: 'ink', name: 'Ink', slug: 'ink', stageOrder: 2 }),
      stage({ id: 'color', name: 'Color', slug: 'color', stageOrder: 3, isEnabled: false }),
      stage({ id: 'letter', name: 'Letter', slug: 'lettering', stageOrder: 4 }),
    ]);

    expect(result.map((item) => item.key)).toEqual(['pencil', 'ink', 'lettering']);
  });

  it('chèn Color trước Letter khi pipeline bật Color', () => {
    const result = buildArtistFocusStages([
      stage({ id: 'color', name: 'Color', slug: 'color', stageOrder: 3 }),
    ]);

    expect(result.map((item) => item.key)).toEqual(['pencil', 'ink', 'color', 'lettering']);
  });
});

describe('resolveStageKey', () => {
  it('coi Color như công đoạn vẽ Ink khi có slug color', () => {
    expect(resolveStageKey({ slug: 'color', name: 'Color' })).toBe('ink');
  });

  it('coi Color như công đoạn vẽ Ink khi tên tiếng Việt "Tô màu"', () => {
    expect(resolveStageKey({ slug: '', name: 'Tô màu' })).toBe('ink');
  });

  it('giữ nguyên kết quả cho Pencil, Ink và Letter', () => {
    expect(resolveStageKey({ slug: 'pencil', name: 'Pencil' })).toBe('pencil');
    expect(resolveStageKey({ slug: 'ink', name: 'Ink' })).toBe('ink');
    expect(resolveStageKey({ slug: 'lettering', name: 'Letter' })).toBe('lettering');
  });
});
