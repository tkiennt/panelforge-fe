// src/shared/features/collaboration/chapterReviewStatus.ts
// Tính toán trạng thái tiến độ 1 → 7 của từng trang và cảnh báo các trang chưa hoàn tất cho màn Review cấp Chapter.

import type { PipelineStageDto } from '@/services/pipeline.service';
import type { AssignmentDto, StageProgressDto } from '@/types';

export type PageStageStatus =
  'Approved' | 'InReview' | 'InProgress' | 'ChangesRequested' | 'NotStarted';

export interface StageStatusStyle {
  label: string;
  dotColor: string;
  badgeClass: string;
}

export const STAGE_STATUS_CONFIG: Record<PageStageStatus, StageStatusStyle> = {
  Approved: {
    label: 'Đã duyệt',
    dotColor: '#10B981', // green
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
  },
  InReview: {
    label: 'Chờ duyệt',
    dotColor: '#F59E0B', // amber/yellow
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-300 font-medium',
  },
  InProgress: {
    label: 'Đang làm',
    dotColor: '#3B82F6', // blue
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-300 font-medium',
  },
  ChangesRequested: {
    label: 'Cần làm lại',
    dotColor: '#EF4444', // red
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-semibold',
  },
  NotStarted: {
    label: 'Chưa làm',
    dotColor: '#9CA3AF', // gray
    badgeClass: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  },
};

/** Lấy các stage đang bật (bỏ isEnabled === false), sắp xếp theo stageOrder tăng dần. */
export function getActivePipelineStages(stages: PipelineStageDto[]): PipelineStageDto[] {
  return stages.filter((s) => s.isEnabled !== false).sort((a, b) => a.stageOrder - b.stageOrder);
}

/**
 * Kiểm tra xem một stage có phải là việc cấp Chapter (vd Script, Review) hay không.
 * Tiêu chí: có Assignment cấp Chapter cho stage đó, hoặc là initial/terminal, hoặc slug là script/review.
 */
export function isChapterLevelStage(
  stage: PipelineStageDto,
  chapterAssignments?: AssignmentDto[],
): boolean {
  if (
    chapterAssignments?.some(
      (a) => a.pipelineStageId === stage.id && String(a.entityType) === 'Chapter',
    )
  ) {
    return true;
  }
  const slug = (stage.slug || stage.name).toLowerCase();
  if (slug === 'script' || slug === 'review') return true;
  if (stage.isInitial || stage.isTerminal) return true;
  return false;
}

/** Chuẩn hoá chuỗi status của Assignment hoặc StageProgress về PageStageStatus. */
function normalizeStatus(statusRaw?: string | number | null): PageStageStatus {
  if (!statusRaw) return 'NotStarted';
  const s = String(statusRaw).toLowerCase();
  if (s === 'approved') return 'Approved';
  if (s === 'inreview' || s === 'submitted' || s === 'underreview') return 'InReview';
  if (s === 'inprogress') return 'InProgress';
  if (s === 'changesrequested' || s === 'reworkrequired') return 'ChangesRequested';
  return 'NotStarted';
}

/**
 * Tính trạng thái của một trang tại một stage:
 * - Stage cấp Chapter (Script, Review): lấy trạng thái từ Assignment cấp Chapter tương ứng.
 * - Stage cấp Panel/Page:
 *   + Xanh "Đã duyệt" khi MỌI Panel của trang đều Approved ở stage đó.
 *   + Đỏ "Cần làm lại" khi có ít nhất một Panel bị ChangesRequested / ReworkRequired (ưu tiên trạng thái tệ nhất).
 *   + Xanh dương "Đang làm" khi có Panel đang làm InProgress (hoặc một số Panel chưa làm trong khi số khác đã nộp/duyệt).
 *   + Vàng "Chờ duyệt" khi tất cả Panel đều đã nộp (InReview / Submitted) hoặc một số đã Approved và còn lại Chờ duyệt.
 *   + Xám "Chưa làm" khi chưa có dòng tiến độ nào.
 */
export function computePageStageStatus(
  pageId: string,
  stage: PipelineStageDto,
  pagePanelIds: string[],
  stageProgressList: StageProgressDto[],
  chapterAssignments?: AssignmentDto[],
): PageStageStatus {
  // 1. Stage cấp Chapter (Script, Review): lấy trực tiếp từ Assignment cấp Chapter
  if (isChapterLevelStage(stage, chapterAssignments)) {
    const chapterAssign = chapterAssignments?.find(
      (a) =>
        (a.pipelineStageId === stage.id && String(a.entityType) === 'Chapter') ||
        (stage.slug === 'script' &&
          String(a.entityType) === 'Chapter' &&
          String(a.assignedRole).toUpperCase() === 'WRITER') ||
        (stage.slug === 'review' &&
          String(a.entityType) === 'Chapter' &&
          String(a.assignedRole).toUpperCase() === 'EDITOR'),
    );
    if (!chapterAssign) return 'NotStarted';
    return normalizeStatus(chapterAssign.status);
  }

  // 2. Stage cấp Page / Panel
  if (pagePanelIds.length === 0) {
    // Nếu trang chưa có panel nào, kiểm tra xem có stage-progress theo pageId hoặc assignment theo page
    const pageProg = stageProgressList.find(
      (sp) => sp.pageId === pageId && sp.pipelineStageId === stage.id,
    );
    if (pageProg) return normalizeStatus(pageProg.status);

    const pageAssign = chapterAssignments?.find(
      (a) => a.targetEntityId === pageId && a.pipelineStageId === stage.id,
    );
    if (pageAssign) return normalizeStatus(pageAssign.status);

    return 'NotStarted';
  }

  // Thu thập trạng thái của từng Panel thuộc trang ở stage này
  const panelStatuses = pagePanelIds.map((panelId) => {
    const prog = stageProgressList.find(
      (sp) => sp.panelId === panelId && sp.pipelineStageId === stage.id,
    );
    return prog ? normalizeStatus(prog.status) : 'NotStarted';
  });

  // Mọi Panel đều Approved -> Approved
  if (panelStatuses.every((s) => s === 'Approved')) {
    return 'Approved';
  }

  // Có bất kỳ Panel nào cần làm lại -> ChangesRequested (ưu tiên trạng thái tệ nhất)
  if (panelStatuses.some((s) => s === 'ChangesRequested')) {
    return 'ChangesRequested';
  }

  // Có Panel đang làm -> InProgress
  if (panelStatuses.some((s) => s === 'InProgress')) {
    return 'InProgress';
  }

  const notStartedCount = panelStatuses.filter((s) => s === 'NotStarted').length;
  const inReviewCount = panelStatuses.filter((s) => s === 'InReview').length;
  const approvedCount = panelStatuses.filter((s) => s === 'Approved').length;

  // Nếu tất cả đều Chưa làm
  if (notStartedCount === panelStatuses.length) {
    return 'NotStarted';
  }

  // Một số panel chưa làm, một số đã bắt đầu/nộp/duyệt -> tiến độ trang đang dở dang (InProgress)
  if (notStartedCount > 0 && (inReviewCount > 0 || approvedCount > 0)) {
    return 'InProgress';
  }

  // Tất cả panel đã nộp chờ duyệt (hoặc một số đã duyệt, số còn lại đang chờ duyệt) -> InReview
  if (inReviewCount > 0 && inReviewCount + approvedCount === panelStatuses.length) {
    return 'InReview';
  }

  return 'NotStarted';
}

export interface PageProgressSummary {
  panelCount: number;
  approvedStageCount: number;
  totalActiveStages: number;
  summaryText: string;
  stageStatuses: Record<string, PageStageStatus>;
}

/**
 * Tính toán tóm tắt tiến độ cho một trang:
 * Trả về chuỗi dạng "N khung · đủ X/Y công đoạn".
 */
export function computePageProgressSummary(
  pageId: string,
  pagePanelIds: string[],
  activeStages: PipelineStageDto[],
  stageProgressList: StageProgressDto[],
  chapterAssignments?: AssignmentDto[],
): PageProgressSummary {
  const stageStatuses: Record<string, PageStageStatus> = {};
  let approvedStageCount = 0;

  for (const stage of activeStages) {
    const status = computePageStageStatus(
      pageId,
      stage,
      pagePanelIds,
      stageProgressList,
      chapterAssignments,
    );
    stageStatuses[stage.id] = status;
    if (status === 'Approved') {
      approvedStageCount++;
    }
  }

  const panelCount = pagePanelIds.length;
  const totalActiveStages = activeStages.length;
  const summaryText = `${panelCount} khung · đủ ${approvedStageCount}/${totalActiveStages} công đoạn`;

  return {
    panelCount,
    approvedStageCount,
    totalActiveStages,
    summaryText,
    stageStatuses,
  };
}

export interface UnfinishedPageItem {
  pageId: string;
  pageNumber: number;
  incompleteStageNames: string[];
}

/**
 * Tìm các trang chưa hoàn tất các công đoạn trước Review:
 * Trả về danh sách cảnh báo, vd: "Trang 2 chưa xong: Pencil, Ink, Color, Letter".
 */
export function computeUnfinishedPagesWarning(
  pages: Array<{ id: string; pageNumber: number }>,
  getPanelIdsForPage: (pageId: string) => string[],
  activeStages: PipelineStageDto[],
  stageProgressList: StageProgressDto[],
  chapterAssignments?: AssignmentDto[],
): UnfinishedPageItem[] {
  // Tìm stage Review hoặc terminal stage để chỉ xét các công đoạn đứng trước nó
  const reviewStage = activeStages.find((s) => s.slug?.toLowerCase() === 'review' || s.isTerminal);
  const stagesToComplete = reviewStage
    ? activeStages.filter((s) => s.stageOrder < reviewStage.stageOrder)
    : activeStages.filter((s) => !s.isTerminal);

  const unfinishedList: UnfinishedPageItem[] = [];

  for (const page of pages) {
    const panelIds = getPanelIdsForPage(page.id);
    const incompleteStageNames: string[] = [];

    for (const stage of stagesToComplete) {
      const status = computePageStageStatus(
        page.id,
        stage,
        panelIds,
        stageProgressList,
        chapterAssignments,
      );
      if (status !== 'Approved') {
        incompleteStageNames.push(stage.name);
      }
    }

    if (incompleteStageNames.length > 0) {
      unfinishedList.push({
        pageId: page.id,
        pageNumber: page.pageNumber,
        incompleteStageNames,
      });
    }
  }

  return unfinishedList;
}

/** Định dạng chuỗi cảnh báo cho UI, vd "Trang 2 chưa xong: Pencil, Ink, Color, Letter". */
export function formatUnfinishedWarningText(item: UnfinishedPageItem): string {
  return `Trang ${item.pageNumber} chưa xong: ${item.incompleteStageNames.join(', ')}`;
}
