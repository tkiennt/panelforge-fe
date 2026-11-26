import { describe, it, expect } from 'vitest';
import {
  mergeSpecAttributes,
  specCompleteness,
  toSpecCategory,
  specFields,
  parseBibleDetails,
  sanitizeArtistNotes,
} from './bibleSpec';

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

  it('provides simplified 2-field schema for character and 1-field for location/prop', () => {
    const charKeys = specFields('character').map((f) => f.key);
    expect(charKeys).toEqual(['age', 'artistNotes']);

    const locKeys = specFields('location').map((f) => f.key);
    expect(locKeys).toEqual(['artistNotes']);

    const propKeys = specFields('prop').map((f) => f.key);
    expect(propKeys).toEqual(['artistNotes']);
  });

  it('merges form values: trims, drops cleared fields, keeps keys outside the schema', () => {
    const merged = mergeSpecAttributes(
      'character',
      { age: '17', artistNotes: 'Ghi chú cũ', legacyNote: 'giữ nguyên' },
      { age: ' 18 ', artistNotes: 'Ghi chú mới' },
    );
    expect(merged).toEqual({ age: '18', artistNotes: 'Ghi chú mới', legacyNote: 'giữ nguyên' });
  });

  it('counts filled spec fields', () => {
    const { filled, total } = specCompleteness('prop', { artistNotes: 'Thanh kiếm gia truyền' });
    expect(filled).toBe(1);
    expect(total).toBe(1);

    const empty = specCompleteness('character', {});
    expect(empty.filled).toBe(0);
    expect(empty.total).toBe(2);
  });

  describe('parseBibleDetails backward compatibility', () => {
    it('returns empty strings for empty inputs and preserves freeform text', () => {
      expect(parseBibleDetails(null)).toEqual({ age: '', artistNotes: '' });
      expect(parseBibleDetails(undefined)).toEqual({ age: '', artistNotes: '' });
      expect(parseBibleDetails('')).toEqual({ age: '', artistNotes: '' });
      expect(parseBibleDetails('{}')).toEqual({ age: '', artistNotes: '' });
      expect(parseBibleDetails('Ghi chú tự do')).toEqual({ age: '', artistNotes: 'Ghi chú tự do' });
    });

    it('removes leaked DTO metadata from legacy Artist Notes', () => {
      const dumped =
        '- artistNotes: - Id: f1c462f8-3e0b-4cd0-8043-d968359b66a1 - Name: KRILLIN - Description: Áo cam - DetailsJson: {}';

      expect(sanitizeArtistNotes(dumped)).toBe('Áo cam');
      expect(parseBibleDetails(JSON.stringify({ artistNotes: dumped })).artistNotes).toBe('Áo cam');
      expect(sanitizeArtistNotes('Tóc đen, áo cam')).toBe('Tóc đen, áo cam');
    });

    it('parses simplified format with age and artistNotes', () => {
      const json = JSON.stringify({ age: '25-28', artistNotes: 'Tóc đen dài, vết sẹo mắt phải' });
      const parsed = parseBibleDetails(json);
      expect(parsed.age).toBe('25-28');
      expect(parsed.artistNotes).toBe('Tóc đen dài, vết sẹo mắt phải');
    });

    it('converts legacy 4-group schema into age and bulleted artistNotes', () => {
      const legacyJson = JSON.stringify({
        body: { age: '17 tuổi', height: '175cm', build: 'Mảnh khảnh' },
        face: { hair: 'Tóc bạc bù xù', eyes: 'Mắt xanh lục' },
        costume: { outfit: 'Áo khoác đen dài' },
        art: { forbidden: 'Tuyệt đối không vẽ mắt màu đỏ' },
      });

      const parsed = parseBibleDetails(legacyJson);
      expect(parsed.age).toBe('17 tuổi');
      expect(parsed.artistNotes).toContain('- Chiều cao: 175cm');
      expect(parsed.artistNotes).toContain('- Vóc dáng / Thể chất: Mảnh khảnh');
      expect(parsed.artistNotes).toContain('- Kiểu tóc / Màu tóc: Tóc bạc bù xù');
      expect(parsed.artistNotes).toContain('- Màu mắt / Ánh mắt: Mắt xanh lục');
      expect(parsed.artistNotes).toContain('- Trang phục: Áo khoác đen dài');
      expect(parsed.artistNotes).toContain(
        '- Lưu ý cấm kỵ / Tránh vẽ sai: Tuyệt đối không vẽ mắt màu đỏ',
      );
    });

    it('extracts top-level attributes if not grouped in body/face/costume/art', () => {
      const flatLegacyJson = JSON.stringify({
        height: '180cm',
        hair: 'Tóc vàng',
        forbidden: 'Không mang kính',
      });

      const parsed = parseBibleDetails(flatLegacyJson);
      expect(parsed.age).toBe('');
      expect(parsed.artistNotes).toContain('- Chiều cao: 180cm');
      expect(parsed.artistNotes).toContain('- Kiểu tóc / Màu tóc: Tóc vàng');
      expect(parsed.artistNotes).toContain('- Lưu ý cấm kỵ / Tránh vẽ sai: Không mang kính');
    });
  });
});
