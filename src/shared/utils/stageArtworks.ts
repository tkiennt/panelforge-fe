// src/shared/utils/stageArtworks.ts
// Tiện ích tìm artwork của công đoạn trước đó có ảnh cho trang (dùng chung cho ReviewView và ChapterReviewArtworkOverview).

import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { artworkService } from '@/services/artwork.service';
import type { AssetReferenceDto } from '@/types';

/**
 * Ảnh hiển thị cho một khung trên Bàn vẽ (không gọi API).
 * - `stageId` có giá trị: bản mới nhất của khung ở đúng công đoạn đó (null nếu chưa có).
 * - Không có: công đoạn ĐANG BẬT có stageOrder cao nhất mà khung đã có ảnh; không có thì xét cả công đoạn đã tắt.
 * Không dựa vào thứ tự API trả về (trước đây `.pop()` lấy nhầm Pencil thay vì Ink/Color).
 */
export function pickPanelArtwork(
  arts: AssetReferenceDto[],
  panelId: string,
  stages: Pick<PipelineStageDto, 'id' | 'stageOrder' | 'isEnabled'>[],
  stageId?: string | null,
): AssetReferenceDto | null {
  const latestOf = (list: AssetReferenceDto[]) =>
    list.reduce<AssetReferenceDto | null>(
      (best, a) => (!best || a.versionNumber > best.versionNumber ? a : best),
      null,
    );
  const ofPanel = arts.filter((a) => a.panelId === panelId);
  if (stageId) return latestOf(ofPanel.filter((a) => a.pipelineStageId === stageId));

  const order = (id: string) => stages.find((s) => s.id === id)?.stageOrder ?? -1;
  const enabled = (id: string) => stages.find((s) => s.id === id)?.isEnabled !== false;
  const pool = ofPanel.some((a) => enabled(a.pipelineStageId))
    ? ofPanel.filter((a) => enabled(a.pipelineStageId))
    : ofPanel;
  const top = Math.max(-1, ...pool.map((a) => order(a.pipelineStageId)));
  return latestOf(pool.filter((a) => order(a.pipelineStageId) === top));
}

export interface LoadPreviousStageArtworksOptions {
  /** Danh sách stage đã nạp sẵn (nếu có) để tránh gọi lại API pipeline nhiều lần */
  stages?: PipelineStageDto[];
}

/**
 * Tìm ảnh của công đoạn gần nhất đứng trước `stageId` (hoặc trước công đoạn kết thúc nếu không truyền stageId)
 * mà trang đã có ảnh tải lên.
 * Ưu tiên các stage đang bật (isEnabled !== false) theo thứ tự stageOrder giảm dần (gần nhất trước).
 */
export async function loadPreviousStageArtworks(
  chapterId: string,
  seriesId: string,
  pageId: string,
  stageId?: string,
  options?: LoadPreviousStageArtworksOptions,
): Promise<AssetReferenceDto[]> {
  let stages = options?.stages;
  if (!stages) {
    const pipeline = await pipelineService.getSeriesPipeline(seriesId).catch(() => null);
    stages = pipeline?.stages ?? [];
  }

  // Lọc các stage đang bật
  const activeStages = stages.filter((s) => s.isEnabled !== false);

  let earlier: PipelineStageDto[];
  if (stageId) {
    const current = stages.find((s) => s.id === stageId);
    if (!current) return [];
    earlier = activeStages
      .filter((s) => s.stageOrder < current.stageOrder)
      .sort((x, y) => y.stageOrder - x.stageOrder);
  } else {
    // Nếu không truyền stageId, xét các stage đứng trước terminal stage
    earlier = activeStages.filter((s) => !s.isTerminal).sort((x, y) => y.stageOrder - x.stageOrder);
  }

  for (const stage of earlier) {
    const arts = await artworkService.getArtworks(chapterId, pageId, stage.id).catch(() => []);
    if (arts.length > 0) return arts;
  }

  // Fallback: nếu các active stage chưa có ảnh, tìm ở bất kỳ stage nào trước đó (kể cả stage tắt) có artwork
  const allEarlier = (
    stageId
      ? stages.filter(
          (s) => s.stageOrder < (stages.find((x) => x.id === stageId)?.stageOrder ?? 999),
        )
      : stages.filter((s) => !s.isTerminal)
  ).sort((x, y) => y.stageOrder - x.stageOrder);

  for (const stage of allEarlier) {
    if (earlier.some((e) => e.id === stage.id)) continue;
    const arts = await artworkService.getArtworks(chapterId, pageId, stage.id).catch(() => []);
    if (arts.length > 0) return arts;
  }

  return [];
}
