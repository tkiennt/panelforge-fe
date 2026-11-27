export type ReadingDirectionValue = 'RightToLeft' | 'LeftToRight' | 'Vertical';

/** Enum BE: 0 RightToLeft, 1 LeftToRight, 2 Vertical; BE thường trả tên enum. */
export const toReadingDirection = (value: unknown): ReadingDirectionValue => {
  if (value === 'Vertical' || value === 2 || value === '2') return 'Vertical';
  if (value === 'LeftToRight' || value === 1 || value === '1') return 'LeftToRight';
  return 'RightToLeft';
};

/** Trang kế/trước theo phím mũi tên: đọc phải sang trái thì mũi tên trái là trang sau. */
export const pageStepForKey = (key: string, direction: ReadingDirectionValue): -1 | 0 | 1 => {
  if (direction === 'Vertical') return 0;
  const forwardKey = direction === 'RightToLeft' ? 'ArrowLeft' : 'ArrowRight';
  const backKey = direction === 'RightToLeft' ? 'ArrowRight' : 'ArrowLeft';
  if (key === forwardKey) return 1;
  if (key === backKey) return -1;
  return 0;
};
