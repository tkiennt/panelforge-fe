import type { ChapterCastDto } from '@/services/chapterCast.service';

const norm = (s?: string | null) => (s ?? '').replace(/\(nghĩ\)/gi, '').trim().normalize('NFC').toLowerCase();

/**
 * UIQ-11n, BR-15/Q23: biến thể tạo hình đang dùng cho một nhân vật ở chương (bản gắn riêng theo Panel ưu tiên
 * hơn bản của chương). Khớp theo id mục Bible, rồi theo tên người nói đã chuẩn hoá. Không có biến thể → undefined.
 */
export const buildCastVariantLookup = (cast: ChapterCastDto | null | undefined) => {
  const byId = new Map((cast?.entities ?? []).map((e) => [e.bibleEntryId, e]));
  const byName = new Map((cast?.entities ?? []).map((e) => [norm(e.name), e]));
  return (q: { entryId?: string | null; name?: string | null; panelId?: string | null }) => {
    const entity = (q.entryId && byId.get(q.entryId)) || (q.name ? byName.get(norm(q.name)) : undefined);
    if (!entity) return undefined;
    const panel = q.panelId ? entity.panelRevisions.find((p) => p.panelId === q.panelId) : undefined;
    return (panel?.variantLabel || entity.boundRevision?.variantLabel || '').trim() || undefined;
  };
};
