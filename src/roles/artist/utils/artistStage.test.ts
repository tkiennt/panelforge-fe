import { describe, expect, it } from 'vitest';
import {
  findStageByKind,
  generateSafeId,
  getArtistStageKind,
  isArtistInkStage,
  isArtistLetteringStage,
  isArtistPencilStage,
  MAX_ARTWORK_IMAGE_BYTES,
} from './artistStage';

describe('getArtistStageKind', () => {
  it('ưu tiên slug và không nhầm "Nét chì" thành Ink', () => {
    const pencil = { slug: 'pencil', name: 'Nét chì (Pencil)' };

    expect(getArtistStageKind(pencil)).toBe('pencil');
    expect(isArtistPencilStage(pencil)).toBe(true);
    expect(isArtistInkStage(pencil)).toBe(false);
  });

  it('nhận đúng stage Ink theo slug', () => {
    expect(getArtistStageKind({ slug: 'ink', name: 'Đi nét & Trame (Ink)' })).toBe('ink');
  });

  it('fallback theo tên khi slug trống, vẫn ưu tiên Pencil trước Ink', () => {
    expect(getArtistStageKind({ slug: '', name: 'Nét chì (Pencil)' })).toBe('pencil');
    expect(getArtistStageKind({ slug: '', name: 'Đi nét & Trame (Ink)' })).toBe('ink');
    expect(getArtistStageKind({ slug: '', name: 'Ráp thoại (Lettering)' })).toBe('lettering');
  });

  it('nhận Lettering theo allowedRole', () => {
    const lettering = { slug: 'review', name: 'Duyệt bản thảo', allowedRole: 'Letterer' };

    expect(getArtistStageKind(lettering)).toBe('lettering');
    expect(isArtistLetteringStage(lettering)).toBe(true);
  });

  it('trả null cho stage không thuộc Artist', () => {
    expect(getArtistStageKind({ slug: 'script', name: 'Kịch bản' })).toBeNull();
    expect(getArtistStageKind(null)).toBeNull();
  });
});

describe('findStageByKind', () => {
  it('tìm đúng stage Ink dù Pencil đứng trước và tên có chữ "nét"', () => {
    const stages = [
      { slug: 'pencil', name: 'Nét chì (Pencil)' },
      { slug: 'ink', name: 'Đi nét & Trame (Ink)' },
      { slug: 'lettering', name: 'Ráp thoại (Lettering)' },
    ];

    expect(findStageByKind(stages, 'pencil')?.slug).toBe('pencil');
    expect(findStageByKind(stages, 'ink')?.slug).toBe('ink');
    expect(findStageByKind(stages, 'lettering')?.slug).toBe('lettering');
  });
});

describe('generateSafeId', () => {
  it('tạo id không rỗng và duy nhất', () => {
    const id1 = generateSafeId('test');
    const id2 = generateSafeId('test');
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});

describe('MAX_ARTWORK_IMAGE_BYTES', () => {
  it('là 20 MB để thống nhất với nhận diện vùng', () => {
    expect(MAX_ARTWORK_IMAGE_BYTES).toBe(20 * 1024 * 1024);
  });
});
