// src/shared/lib/bibleColoring.ts
/**
 * Quy chuẩn tô màu trạng thái Series Bible & Nhân vật theo yêu cầu hệ thống:
 * 1. Màu xanh lá (Green): Series Bible / Nhân vật đã chốt artwork (Approved / Canon locked / có hình mẫu chốt).
 * 2. Màu vàng (Yellow / Amber): Có profile / định nghĩa trong Bible nhưng chưa có artwork.
 * 3. Màu cam (Orange): Nhân vật chưa định nghĩa trong Bible và chưa có artwork (Stub / nháp).
 * 4. Màu nhạt (Pale / Stone): Quần chúng (Crowd / Minor).
 */
import type { BibleEntryDto } from '@/services/bible.service';
import type { ChapterCastDto, ChapterCastItemDto } from '@/services/chapterCast.service';

export type BibleArtworkStatus =
  | 'approved_artwork'
  | 'defined_no_artwork'
  | 'undefined_no_artwork'
  | 'crowd';

export interface BibleEntityLike {
  id?: string;
  name: string;
  code?: string;
  isCrowd?: boolean;
  isStub?: boolean;
  referenceImageUrl?: string | null;
  effectiveRevision?: {
    isLocked?: boolean;
    reviewStatus?: string | null;
    referenceImageUrl?: string | null;
    conceptImageUrl?: string | null;
  } | null;
  boundRevision?: {
    isCanonLocked?: boolean;
    status?: string | null;
    referenceImageUrl?: string | null;
  } | null;
}

export const BIBLE_STATUS_STYLES: Record<
  BibleArtworkStatus,
  {
    status: BibleArtworkStatus;
    textColor: string;
    bg: string;
    text: string;
    border: string;
    badge: string;
    dot: string;
    label: string;
  }
> = {
  approved_artwork: {
    status: 'approved_artwork',
    textColor: '#15803d', // Green-700
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Đã chốt artwork',
  },
  defined_no_artwork: {
    status: 'defined_no_artwork',
    textColor: '#b45309', // Amber-700
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
    label: 'Có định nghĩa, chưa có artwork',
  },
  undefined_no_artwork: {
    status: 'undefined_no_artwork',
    textColor: '#c2410c', // Orange-700
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    dot: 'bg-orange-500',
    label: 'Chưa định nghĩa, chưa có artwork',
  },
  crowd: {
    status: 'crowd',
    textColor: '#78716c', // Stone-500 (Nhạt)
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    border: 'border-stone-200',
    badge: 'bg-stone-100 text-stone-600 border-stone-200',
    dot: 'bg-stone-400',
    label: 'Quần chúng',
  },
};

/**
 * Xác định trạng thái artwork của một thực thể Bible cụ thể
 */
export function getBibleArtworkStatus(entity?: BibleEntityLike | null): BibleArtworkStatus {
  if (!entity) return 'undefined_no_artwork';
  if (entity.isCrowd) return 'crowd';
  if (entity.isStub) return 'undefined_no_artwork';

  const hasApprovedArtwork =
    Boolean(entity.boundRevision?.isCanonLocked) ||
    entity.boundRevision?.status === 'Approved' ||
    Boolean(entity.effectiveRevision?.isLocked) ||
    entity.effectiveRevision?.reviewStatus === 'Approved' ||
    Boolean(entity.boundRevision?.referenceImageUrl) ||
    Boolean(entity.effectiveRevision?.referenceImageUrl) ||
    Boolean(entity.referenceImageUrl);

  if (hasApprovedArtwork) {
    return 'approved_artwork';
  }

  return 'defined_no_artwork';
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/:+$/, '');
}

/**
 * Tìm trạng thái Bible của một nhân vật / tên loa theo tên hiển thị
 */
export function getCharacterStatusTone(
  speakerOrName: string,
  bibleEntries?: BibleEntryDto[] | null,
  chapterCast?: ChapterCastDto | null,
): BibleArtworkStatus {
  const norm = normalizeName(speakerOrName);
  if (!norm) return 'undefined_no_artwork';

  // 1. Ưu tiên tra cứu trong ChapterCast nếu có
  if (chapterCast?.entities && chapterCast.entities.length > 0) {
    const castMatch = chapterCast.entities.find(
      (e) =>
        normalizeName(e.name) === norm ||
        (e.code && normalizeName(e.code) === norm) ||
        norm.startsWith(normalizeName(e.name)),
    );
    if (castMatch) {
      if (castMatch.isCrowd) return 'crowd';
      if (castMatch.isStub) return 'undefined_no_artwork';

      const hasApproved =
        Boolean(castMatch.boundRevision?.isCanonLocked) ||
        castMatch.boundRevision?.status === 'Approved' ||
        Boolean(castMatch.boundRevision?.referenceImageUrl);

      return hasApproved ? 'approved_artwork' : 'defined_no_artwork';
    }
  }

  // 2. Tra cứu trong Series Bible entries
  if (bibleEntries && bibleEntries.length > 0) {
    const entryMatch = bibleEntries.find(
      (e) =>
        normalizeName(e.name) === norm ||
        (e.code && normalizeName(e.code) === norm) ||
        (e.aliases && e.aliases.some((a) => normalizeName(a) === norm)) ||
        norm.startsWith(normalizeName(e.name)),
    );
    if (entryMatch) {
      return getBibleArtworkStatus(entryMatch);
    }
  }

  // 3. Mặc định: Chưa có trong Series Bible và chưa có artwork
  return 'undefined_no_artwork';
}
