import type { PipelineStageDto } from '@/services/pipeline.service';

export type ArtistStageKind = 'pencil' | 'ink' | 'lettering' | null;

type StageLike = Pick<PipelineStageDto, 'slug' | 'name'> & {
  allowedRole?: string | null;
};

/**
 * Phân loại công đoạn Artist theo slug trước, chỉ fallback sang tên khi slug trống.
 *
 * Lý do: tên tiếng Việt của Pencil là "Nét chì (Pencil)" cũng chứa chữ "nét",
 * nên nếu so khớp chuỗi trên tên trước sẽ nhận nhầm Pencil thành Ink.
 */
export function getArtistStageKind(stage?: StageLike | null): ArtistStageKind {
  if (!stage) return null;

  const slug = (stage.slug || '').toLowerCase();
  const name = (stage.name || '').toLowerCase();

  // Slug là nguồn chính xác nhất. Pencil phải được kiểm tra trước Ink.
  if (slug) {
    if (slug.includes('pencil') || slug.includes('chì')) return 'pencil';
    if (slug.includes('ink') || slug.includes('mực') || slug.includes('nét')) return 'ink';
    if (slug.includes('letter') || slug.includes('thoại')) return 'lettering';
  }

  // Fallback theo tên: "Nét chì" phải khớp Pencil trước khi xét "nét" của Ink.
  if (name.includes('pencil') || name.includes('chì')) return 'pencil';
  if (name.includes('ink') || name.includes('mực') || name.includes('nét')) return 'ink';
  if (name.includes('letter') || name.includes('thoại')) return 'lettering';

  if ((stage.allowedRole || '').toLowerCase() === 'letterer') return 'lettering';
  return null;
}

export function isArtistPencilStage(stage?: StageLike | null): boolean {
  return getArtistStageKind(stage) === 'pencil';
}

export function isArtistInkStage(stage?: StageLike | null): boolean {
  return getArtistStageKind(stage) === 'ink';
}

export function isArtistLetteringStage(stage?: StageLike | null): boolean {
  return getArtistStageKind(stage) === 'lettering';
}

/** Stage đầu tiên trong pipeline thuộc một loại công đoạn Artist. */
export function findStageByKind<T extends StageLike>(
  stages: T[],
  kind: Exclude<ArtistStageKind, null>,
): T | undefined {
  return stages.find((stage) => getArtistStageKind(stage) === kind);
}
