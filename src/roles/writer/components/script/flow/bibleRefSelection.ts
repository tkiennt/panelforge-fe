import type { BibleCategory, BibleEntryDto } from '@/services/bible.service';

export interface SnappedSelection {
  from: number;
  to: number;
  text: string;
}

export const DRAFT_CATEGORIES = ['Character', 'Location', 'Prop'] as const;
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u;
const LETTER = /\p{L}/u;

const isWordCharacter = (char: string | undefined) => !!char && WORD_CHARACTER.test(char);

export function snapSelectionToWords(
  lineText: string,
  fromOffset: number,
  toOffset: number,
): SnappedSelection | null {
  let from = Math.max(0, Math.min(fromOffset, toOffset, lineText.length));
  let to = Math.max(0, Math.min(Math.max(fromOffset, toOffset), lineText.length));

  while (from < to && !isWordCharacter(lineText[from])) from += 1;
  while (to > from && !isWordCharacter(lineText[to - 1])) to -= 1;
  while (from > 0 && isWordCharacter(lineText[from - 1])) from -= 1;
  while (to < lineText.length && isWordCharacter(lineText[to])) to += 1;

  const text = lineText.slice(from, to).trim();
  return text ? { from, to, text } : null;
}

export const isValidBibleSelection = (text: string) => {
  const trimmed = text.trim();
  return trimmed.length >= 2 && LETTER.test(trimmed) && trimmed.length <= 100;
};

export const toBibleDraftCategory = (category: (typeof DRAFT_CATEGORIES)[number]): BibleCategory =>
  category;

export const normalizeEntryName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, (char) => (char === 'đ' ? 'd' : 'D'))
    .toLocaleLowerCase('vi')
    .trim();

export function findEntryAtOffset(lineText: string, offset: number, entries: BibleEntryDto[]) {
  const normalizedLine = normalizeEntryName(lineText);
  const sortedEntries = [...entries].sort((a, b) => b.name.length - a.name.length);

  for (const entry of sortedEntries) {
    const normalizedName = normalizeEntryName(entry.name);
    if (!normalizedName) continue;
    let index = 0;
    while ((index = normalizedLine.indexOf(normalizedName, index)) !== -1) {
      const end = index + normalizedName.length;
      const hasWordBoundary =
        !isWordCharacter(normalizedLine[index - 1]) && !isWordCharacter(normalizedLine[end]);
      if (hasWordBoundary && offset >= index && offset < end) {
        return { entry, from: index, to: end, text: lineText.slice(index, end) };
      }
      index = end;
    }
  }
  return null;
}
