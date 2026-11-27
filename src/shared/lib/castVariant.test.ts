import { describe, expect, it } from 'vitest';
import { buildCastVariantLookup } from './castVariant';

const cast = {
  entities: [
    {
      bibleEntryId: 'e1',
      name: 'An',
      boundRevision: { variantLabel: 'Lúc nhỏ' },
      panelRevisions: [{ panelId: 'p2', variantLabel: 'Timeskip 18 tuổi' }],
    },
    { bibleEntryId: 'e2', name: 'Mai', boundRevision: null, panelRevisions: [] },
  ],
} as any;

describe('buildCastVariantLookup', () => {
  const lookup = buildCastVariantLookup(cast);
  it('dùng bản của chương, ưu tiên bản gắn riêng theo panel', () => {
    expect(lookup({ entryId: 'e1' })).toBe('Lúc nhỏ');
    expect(lookup({ entryId: 'e1', panelId: 'p2' })).toBe('Timeskip 18 tuổi');
  });
  it('khớp theo tên người nói (bỏ "(nghĩ)", không phân biệt hoa thường)', () => {
    expect(lookup({ name: 'an (nghĩ)' })).toBe('Lúc nhỏ');
  });
  it('không có biến thể hoặc không có cast thì undefined', () => {
    expect(lookup({ name: 'Mai' })).toBeUndefined();
    expect(buildCastVariantLookup(null)({ name: 'An' })).toBeUndefined();
  });
});
