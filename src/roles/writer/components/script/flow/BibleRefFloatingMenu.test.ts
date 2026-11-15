import { describe, expect, it } from 'vitest';
import {
  findEntryAtOffset,
  isValidBibleSelection,
  snapSelectionToWords,
  toBibleDraftCategory,
} from './bibleRefSelection';
import type { BibleEntryDto } from '@/services/bible.service';

describe('BibleRefFloatingMenu selection helpers', () => {
  it('snaps a partial Vietnamese selection to whole word boundaries', () => {
    expect(snapSelectionToWords('Linh gặp Nguyễn An ở Huế', 11, 12)).toEqual({
      from: 9,
      to: 15,
      text: 'Nguyễn',
    });
    expect(snapSelectionToWords('Linh gặp Nguyễn An ở Huế', 11, 17)).toEqual({
      from: 9,
      to: 18,
      text: 'Nguyễn An',
    });
  });

  it('requires at least two characters and one Unicode letter', () => {
    expect(isValidBibleSelection('A')).toBe(false);
    expect(isValidBibleSelection('12')).toBe(false);
    expect(isValidBibleSelection('Án')).toBe(true);
  });

  it('uses backend enum strings for draft categories', () => {
    expect(toBibleDraftCategory('Character')).toBe('Character');
    expect(toBibleDraftCategory('Location')).toBe('Location');
    expect(toBibleDraftCategory('Prop')).toBe('Prop');
  });

  it('recognizes the whole entry name without case or diacritics', () => {
    const entry = { id: 'entry-1', name: 'Nguyễn An' } as BibleEntryDto;
    expect(findEntryAtOffset('Gặp NGUYEN AN hôm nay', 7, [entry])).toEqual({
      entry,
      from: 4,
      to: 13,
      text: 'NGUYEN AN',
    });
  });
});
