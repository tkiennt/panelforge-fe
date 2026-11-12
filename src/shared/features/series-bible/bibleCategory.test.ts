import { describe, it, expect } from 'vitest';
import { isVisualDesignCategory } from './bibleCategory';

describe('isVisualDesignCategory (BE BibleEntry.IsVisualDesign)', () => {
  it.each([1, 2, 3, '1', 'Character', 'Location', 'Prop'])('%s có vòng đời khoá Canon', (c) => {
    expect(isVisualDesignCategory(c)).toBe(true);
  });

  it.each([4, 5, 6, 'Terminology', 'StyleRule', 'PlotFact', undefined])(
    '%s chỉ là văn bản',
    (c) => {
      expect(isVisualDesignCategory(c)).toBe(false);
    },
  );
});
