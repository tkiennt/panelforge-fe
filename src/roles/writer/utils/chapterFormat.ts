import { translate } from '@/lib/i18n';

/**
 * Định dạng nhãn hiển thị chương trong dropdown để tránh lặp "Chương 1: Chương 1".
 */
export const formatChapterOption = (chapterNumber: number, title?: string | null): string => {
  if (!title || !title.trim())
    return translate('writer.chapterFormat.number', { number: chapterNumber });
  let clean = title.trim();

  // Xóa mọi tiền tố lặp như: "Chương 1:", "Chuong 1:", "Chapter 1 -", "Chap 1:"
  const prefixRegex = new RegExp(
    `^(?:chương|chuong|chapter|chap|c)\\s*#?${chapterNumber}\\s*[:\\-–—.]?\\s*`,
    'i',
  );
  if (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '').trim();
  } else {
    const genericPrefix = /^(?:chương|chuong|chapter|chap)\\s*[:\\-–—.]\\s*/i;
    if (genericPrefix.test(clean)) {
      clean = clean.replace(genericPrefix, '').trim();
    }
  }

  return clean
    ? translate('writer.chapterFormat.numberWithTitle', { number: chapterNumber, title: clean })
    : translate('writer.chapterFormat.number', { number: chapterNumber });
};
