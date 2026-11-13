import { describe, it, expect } from 'vitest';
import { mergeSpecAttributes, specCompleteness, toSpecCategory, specFields } from './bibleSpec';

describe('bibleSpec', () => {
  it('maps BE categories (number or name) and FE tabs to spec groups', () => {
    expect(toSpecCategory(1)).toBe('character');
    expect(toSpecCategory('Location')).toBe('location');
    expect(toSpecCategory(3)).toBe('prop');
    expect(toSpecCategory('Prop')).toBe('prop');
    expect(toSpecCategory('terminology')).toBe('terminology');
    expect(toSpecCategory(6)).toBe('terminology');
    expect(toSpecCategory('StyleRule')).toBe('style');
  });

  it('keeps legacy attribute keys so existing data still shows', () => {
    const keys = specFields('character').map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(['age', 'height', 'appearance']));
    expect(specFields('location').map((f) => f.key)).toEqual(
      expect.arrayContaining(['environmentType', 'scale', 'atmosphere', 'architecture']),
    );
  });

  it('merges form values: trims, drops cleared fields, keeps keys outside the schema', () => {
    const merged = mergeSpecAttributes(
      'character',
      { age: '17', height: '168 cm', legacyNote: 'giữ nguyên' },
      { age: ' 18 ', height: '', hair: 'tóc ngắn' },
    );
    expect(merged).toEqual({ age: '18', hair: 'tóc ngắn', legacyNote: 'giữ nguyên' });
  });

  it('counts filled spec fields', () => {
    const { filled, total } = specCompleteness('prop', { propType: 'chìa khoá', material: '  ' });
    expect(filled).toBe(1);
    expect(total).toBe(specFields('prop').length);
  });
});
