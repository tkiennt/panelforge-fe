// src/shared/utils/stageArtworks.ts
// Tiện ích tìm artwork của công đoạn trước đó có ảnh cho trang (dùng chung cho ReviewView và ChapterReviewArtworkOverview).

import { pipelineService, type PipelineStageDto } from '@/services/pipeline.service';
import { artworkService } from '@/services/artwork.service';
import { assignmentService } from '@/services/assignment.service';
import type { AssetReferenceDto } from '@/types';
import type { TaskGridDto } from '@/types/pipeline';

export interface PickArtworkOptions {
  /** Tập ID các công đoạn đã hoàn tất/duyệt trên trang này. Khi truyền vào, bỏ qua ảnh nháp ở công đoạn chưa duyệt. */
  approvedStageIds?: ReadonlySet<string> | string[];
}

function toStageIdSet(ids?: ReadonlySet<string> | string[]): ReadonlySet<string> | null {
  if (!ids) return null;
  return ids instanceof Set ? ids : new Set(ids);
}

/**
 * Ảnh đang làm hiển thị cho một khung trên Bàn vẽ (không gọi API).
 * - `stageId` có giá trị: bản mới nhất của khung ở đúng công đoạn đó (null nếu chưa có).
 * - Không có: công đoạn ĐANG BẬT có stageOrder cao nhất mà khung đã có ảnh; không có thì xét cả công đoạn đã tắt.
 * Không dựa vào thứ tự API trả về (trước đây `.pop()` lấy nhầm Pencil thay vì Ink/Color).
 */
export function pickPanelArtwork(
  arts: AssetReferenceDto[],
  panelId: string,
  stages: Pick<PipelineStageDto, 'id' | 'stageOrder' | 'isEnabled' | 'track'>[],
  stageId?: string | null,
  options?: PickArtworkOptions,
): AssetReferenceDto | null {
  const latestOf = (list: AssetReferenceDto[]) =>
    list.reduce<AssetReferenceDto | null>(
      (best, a) => (!best || a.versionNumber > best.versionNumber ? a : best),
      null,
    );
  const ofPanel = arts.filter((a) => a.panelId === panelId);
  if (stageId) return latestOf(ofPanel.filter((a) => a.pipelineStageId === stageId));

  const approvedSet = toStageIdSet(options?.approvedStageIds);
  const candidates = approvedSet
    ? ofPanel.filter((a) => approvedSet.has(a.pipelineStageId))
    : ofPanel;
  if (candidates.length === 0) return null;

  const order = (id: string) => stages.find((s) => s.id === id)?.stageOrder ?? -1;
  const enabled = (id: string) => stages.find((s) => s.id === id)?.isEnabled !== false;
  const pool = candidates.some((a) => enabled(a.pipelineStageId))
    ? candidates.filter((a) => enabled(a.pipelineStageId))
    : candidates;
  const top = Math.max(-1, ...pool.map((a) => order(a.pipelineStageId)));
  return latestOf(pool.filter((a) => order(a.pipelineStageId) === top));
}

/**
 * Ảnh đã duyệt của một khung (dành cho Letterer, Editor ở Gate 2, Reader).
 * Chỉ lấy từ các công đoạn nằm trong `approvedStageIds`, tránh để ảnh Ink nháp đè lên ảnh Pencil đã duyệt.
 */
export function pickApprovedPanelArtwork(
  arts: AssetReferenceDto[],
  panelId: string,
  stages: Pick<PipelineStageDto, 'id' | 'stageOrder' | 'isEnabled' | 'track'>[],
  approvedStageIds: ReadonlySet<string> | string[],
): AssetReferenceDto | null {
  return pickPanelArtwork(arts, panelId, stages, null, { approvedStageIds });
}

/**
 * Ảnh hiển thị cho toàn bộ Trang (Full-page Composite) trên Bàn vẽ (không gọi API).
 * - Lọc những artwork không gắn với panelId cụ thể (!a.panelId).
 * - `stageId` có giá trị: bản mới nhất của trang ở đúng công đoạn đó.
 * - Không có: công đoạn ĐANG BẬT có stageOrder cao nhất mà trang đã có ảnh; không có thì xét cả công đoạn đã tắt.
 */
export function pickPageArtwork(
  arts: AssetReferenceDto[],
  stages: Pick<PipelineStageDto, 'id' | 'stageOrder' | 'isEnabled' | 'track'>[],
  stageId?: string | null,
  options?: PickArtworkOptions,
): AssetReferenceDto | null {
  const latestOf = (list: AssetReferenceDto[]) =>
    list.reduce<AssetReferenceDto | null>(
      (best, a) => (!best || a.versionNumber > best.versionNumber ? a : best),
      null,
    );
  const ofPage = arts.filter((a) => !a.panelId);
  if (stageId) return latestOf(ofPage.filter((a) => a.pipelineStageId === stageId));

  const approvedSet = toStageIdSet(options?.approvedStageIds);
  const candidates = approvedSet
    ? ofPage.filter((a) => approvedSet.has(a.pipelineStageId))
    : ofPage;
  if (candidates.length === 0) return null;

  const order = (id: string) => stages.find((s) => s.id === id)?.stageOrder ?? -1;
  const enabled = (id: string) => stages.find((s) => s.id === id)?.isEnabled !== false;
  const pool = candidates.some((a) => enabled(a.pipelineStageId))
    ? candidates.filter((a) => enabled(a.pipelineStageId))
    : candidates;
  const top = Math.max(-1, ...pool.map((a) => order(a.pipelineStageId)));
  return latestOf(pool.filter((a) => order(a.pipelineStageId) === top));
}

/**
 * Ảnh cả trang đã duyệt (dành cho Letterer, Gate 2, Reader).
 */
export function pickApprovedPageArtwork(
  arts: AssetReferenceDto[],
  stages: Pick<PipelineStageDto, 'id' | 'stageOrder' | 'isEnabled' | 'track'>[],
  approvedStageIds: ReadonlySet<string> | string[],
): AssetReferenceDto | null {
  return pickPageArtwork(arts, stages, null, { approvedStageIds });
}

// ponytail: cache 5s theo chương để N trang không gọi lưới N lần; đổi sang TanStack Query nếu cần invalidate chính xác.
const gridCache = new Map<string, { at: number; grid: Promise<TaskGridDto | null> }>();

/**
 * Chương dùng lưới V3: các công đoạn có ô Approved của trang này. Ảnh nháp của công đoạn chưa duyệt
 * (vd. Ink đang vẽ dở) không được làm nền cho Letterer / Gate 2. Chương chưa dùng lưới → null (giữ hành vi cũ).
 */
async function approvedStagesOnGrid(chapterId: string, pageId: string): Promise<ReadonlySet<string> | null> {
  const hit = gridCache.get(chapterId);
  const grid =
    hit && Date.now() - hit.at < 5000
      ? hit.grid
      : assignmentService.getTaskGrid(chapterId).catch(() => null);
  if (!hit || hit.grid !== grid) gridCache.set(chapterId, { at: Date.now(), grid });

  const tasks = (await grid)?.tasks.filter((t) => t.pageId === pageId && t.status !== 'Cancelled') ?? [];
  if (tasks.length === 0) return null;
  return new Set(tasks.filter((t) => t.status === 'Approved').map((t) => t.pipelineStageId));
}

export interface LoadPreviousStageArtworksOptions {
  /** Danh sách stage đã nạp sẵn (nếu có) để tránh gọi lại API pipeline nhiều lần */
  stages?: PipelineStageDto[];
  /** Danh sách panelId của trang (nếu biết trước) để dừng sớm khi đã gom đủ mọi panel */
  panelIds?: string[];
  /** Chỉ lấy ảnh từ các công đoạn đã duyệt (bỏ qua công đoạn đang vẽ nháp) */
  approvedStageIds?: ReadonlySet<string> | string[];
}

/**
 * Tìm ảnh của các công đoạn đứng trước `stageId` (hoặc trước công đoạn kết thúc nếu không truyền stageId),
 * lùi theo TỪNG PANEL từ công đoạn gần nhất về trước để khi công đoạn sau (vd. Ink) mới vẽ 1/5 panel
 * thì 4 panel còn lại vẫn giữ được ảnh từ công đoạn trước (vd. Pencil) thay vì biến mất.
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

  const approvedSet =
    toStageIdSet(options?.approvedStageIds) ?? (await approvedStagesOnGrid(chapterId, pageId));
  const current = stageId ? stages.find((s) => s.id === stageId) : undefined;
  if (stageId && !current) return [];

  const isEligibleUpstream = (s: PipelineStageDto) => {
    // Nhánh B (Lettering) là chữ trên canvas, không phải nguồn ảnh nền cho nhánh A hay các bước sau
    if (s.track === 'B') return false;
    if (approvedSet && !approvedSet.has(s.id)) return false;
    if (current) return s.stageOrder < current.stageOrder;
    return !s.isTerminal;
  };

  const activeEarlier = stages
    .filter((s) => s.isEnabled !== false && isEligibleUpstream(s))
    .sort((x, y) => y.stageOrder - x.stageOrder);

  const collectPerPanel = async (
    candidateStages: PipelineStageDto[],
    byKey: Map<string, AssetReferenceDto>,
  ) => {
    const expectedPanels = options?.panelIds?.length ? new Set(options.panelIds) : null;
    for (const stage of candidateStages) {
      const arts = await artworkService.getArtworks(chapterId, pageId, stage.id).catch(() => []);
      if (arts.length === 0) continue;

      // Chọn bản có versionNumber cao nhất cho mỗi panelId (hoặc '__PAGE__' nếu là ảnh cả trang) trong stage này
      const latestInStage = new Map<string, AssetReferenceDto>();
      for (const art of arts) {
        const key = art.panelId || '__PAGE__';
        const prev = latestInStage.get(key);
        if (!prev || (art.versionNumber ?? 0) > (prev.versionNumber ?? 0)) {
          latestInStage.set(key, art);
        }
      }

      for (const [key, art] of latestInStage.entries()) {
        if (!byKey.has(key)) {
          byKey.set(key, art);
        }
      }

      const hasOnlyWholePage = latestInStage.has('__PAGE__') && latestInStage.size === 1;
      if (hasOnlyWholePage && !expectedPanels) {
        break;
      }
      if (expectedPanels && [...expectedPanels].every((pid) => byKey.has(pid))) {
        break;
      }
    }
  };

  const byKey = new Map<string, AssetReferenceDto>();
  await collectPerPanel(activeEarlier, byKey);

  // Fallback: nếu các active stage chưa có ảnh nào, tìm ở cả các stage đã tắt trước đó
  if (byKey.size === 0) {
    const disabledEarlier = stages
      .filter((s) => s.isEnabled === false && isEligibleUpstream(s))
      .sort((x, y) => y.stageOrder - x.stageOrder);
    await collectPerPanel(disabledEarlier, byKey);
  }

  return Array.from(byKey.values());
}
