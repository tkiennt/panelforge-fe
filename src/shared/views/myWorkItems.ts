import type { MyTaskLotDto, MyWorkStudioDto, TaskGridReviewItemDto } from '@/types/pipeline';
import {
  buildArtistDeskUrl,
  buildEditorDeskUrl,
  buildScriptEditorUrl,
  buildTaskReviewUrl,
} from '@/app/routePaths';

export type WorkBucket = 'inProgress' | 'rework' | 'toReview';

interface WorkItem {
  key: string;
  bucket: WorkBucket;
  workspaceId: string;
  workspaceName: string;
  role: string;
  seriesTitle: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  stageName: string;
  dueDate?: string | null;
  isOverdue: boolean;
  pages: number[];
  href: string;
}

const roleKey = (role: unknown) => String(role ?? '').toUpperCase();

/** Bàn làm việc đúng vai trò của lô (Writer → kịch bản, Artist/Letterer → bàn vẽ, Editor → bàn duyệt). */
export const lotHref = (workspaceId: string, lot: MyTaskLotDto): string => {
  const role = roleKey(lot.assignedRole);
  if (role === 'WRITER')
    return buildScriptEditorUrl(workspaceId, lot.seriesId, { chapterId: lot.chapterId });
  if (role === 'EDITOR' || role === 'PRODUCER')
    return buildEditorDeskUrl(workspaceId, lot.seriesId, { chapterId: lot.chapterId });
  const firstPage = lot.tasks.find((c) => c.pageNumber != null)?.pageNumber ?? undefined;
  return buildArtistDeskUrl(workspaceId, lot.seriesId, {
    chapterId: lot.chapterId,
    page: firstPage,
  });
};

/** Gom việc của mọi Studio thành danh sách phẳng, chia nhóm Đang làm / Cần sửa / Chờ duyệt. */
export const flattenMyWork = (studios: MyWorkStudioDto[]): WorkItem[] =>
  studios.flatMap((s) => [
    ...s.lots.map((lot): WorkItem => ({
      key: `lot-${lot.id}`,
      bucket: lot.tasks.some((c) => c.status === 'ReworkRequired') ? 'rework' : 'inProgress',
      workspaceId: s.workspaceId,
      workspaceName: s.workspaceName,
      role: roleKey(lot.assignedRole),
      seriesTitle: lot.seriesTitle,
      chapterNumber: lot.chapterNumber,
      chapterTitle: lot.chapterTitle,
      stageName: lot.stageName,
      dueDate: lot.dueDate,
      isOverdue: lot.isOverdue,
      pages: lot.tasks.map((c) => c.pageNumber).filter((n): n is number => n != null),
      href: lotHref(s.workspaceId, lot),
    })),
    ...s.reviewQueue.map((item: TaskGridReviewItemDto): WorkItem => ({
      key: `review-${item.taskId}`,
      bucket: 'toReview',
      workspaceId: s.workspaceId,
      workspaceName: s.workspaceName,
      role: 'EDITOR',
      seriesTitle: item.seriesTitle,
      chapterNumber: item.chapterNumber,
      chapterTitle: item.chapterTitle,
      stageName: item.stageName,
      isOverdue: false,
      pages: item.pageNumber != null ? [item.pageNumber] : [],
      href: buildTaskReviewUrl(s.workspaceId, item.seriesId, item.taskId, item.chapterId),
    })),
  ]);
