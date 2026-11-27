import React from 'react';
import {
  Clock,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Bell,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { NotificationDto } from '@/types';
import { chapterService } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';

export interface NotificationBadgeConfig {
  icon: LucideIcon;
  bg: string;
  text: string;
  border: string;
  containerClass: string;
}

export const getNotificationBadge = (type: string): NotificationBadgeConfig => {
  switch (type) {
    // 1. "Chờ duyệt" (Pending Review / Submitted): Dùng icon đồng hồ (Clock) tông cam (amber/orange) đồng bộ với text "Chờ duyệt"
    case 'AssignmentSubmitted':
    case 'ChapterReadyForPublication':
      return {
        icon: Clock,
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        border: 'border-orange-200',
        containerClass: 'bg-orange-50 text-orange-600 border-orange-200',
      };

    // 2. "Đã sửa xong" (Resolved / Revised): Dùng icon công cụ chỉnh sửa (FileEdit) tông màu xanh dương (blue)
    case 'ChangeRequestResolved':
      return {
        icon: FileEdit,
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        border: 'border-blue-200',
        containerClass: 'bg-blue-50 text-blue-600 border-blue-200',
      };

    // 3. "Chương đã xuất bản" / "Đã duyệt" (Published / Approved): Giữ icon checkmark (CheckCircle2) với nền viền xanh lá (emerald/green)
    case 'ChapterPublished':
    case 'AssignmentApproved':
    case 'AssignmentReady':
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-50',
        text: 'text-emerald-600',
        border: 'border-emerald-200',
        containerClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      };

    // 4. Các thông báo lỗi / từ chối / cảnh báo quá hạn: Dùng icon cảnh báo (AlertCircle / XCircle) tông đỏ/hồng
    case 'AssignmentChangesRequested':
    case 'ChangeRequestReopened':
    case 'ChapterReopened':
    case 'AssignmentOverdue':
    case 'ChangeRequestOverdue':
      return {
        icon: AlertCircle,
        bg: 'bg-rose-50',
        text: 'text-rose-600',
        border: 'border-rose-200',
        containerClass: 'bg-rose-50 text-rose-600 border-rose-200',
      };

    // Sắp đến hạn: Tông vàng hổ phách (amber)
    case 'AssignmentDueSoon':
    case 'ChangeRequestDueSoon':
      return {
        icon: Clock,
        bg: 'bg-amber-50',
        text: 'text-amber-600',
        border: 'border-amber-200',
        containerClass: 'bg-amber-50 text-amber-600 border-amber-200',
      };

    // 5. Thông báo hệ thống / tin nhắn / việc mới
    case 'AssignmentAssigned':
      return {
        icon: Bell,
        bg: 'bg-indigo-50',
        text: 'text-indigo-600',
        border: 'border-indigo-200',
        containerClass: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      };

    case 'AssignmentUpdated':
      return {
        icon: MessageSquare,
        bg: 'bg-sky-50',
        text: 'text-sky-600',
        border: 'border-sky-200',
        containerClass: 'bg-sky-50 text-sky-600 border-sky-200',
      };

    case 'AssignmentUnassigned':
      return {
        icon: XCircle,
        bg: 'bg-stone-100',
        text: 'text-stone-600',
        border: 'border-stone-200',
        containerClass: 'bg-stone-100 text-stone-600 border-stone-200',
      };

    default:
      return {
        icon: Bell,
        bg: 'bg-stone-100',
        text: 'text-stone-600',
        border: 'border-stone-200',
        containerClass: 'bg-stone-100 text-stone-600 border-stone-200',
      };
  }
};

/**
 * Xác định đường dẫn điều hướng khi người dùng bấm vào một thông báo:
 * - Thông báo Lưới V3 (`assignmentId == null`, có `chapterId`): mở thẳng Lưới V3 của chương (`.../workspace?chapterId=...&board=grid-v3`),
 *   tuyệt đối không điều hướng sang trang Assignment V2 với id null.
 * - Thông báo Assignment V2 (có `assignmentId` + `chapterId`): mở `.../my-work?chapterId=...&assignmentId=...`.
 * - Tự động tra cứu `seriesId` / `workspaceId` qua `chapterService` / `seriesService` khi người dùng đang đứng ngoài màn Series.
 */
export async function resolveNotificationTargetPath(
  n: NotificationDto,
  ctx?: { workspaceId?: string; seriesId?: string },
): Promise<string | null> {
  if (!n.chapterId) return null;

  let resolvedWsId = ctx?.workspaceId || undefined;
  let resolvedSeriesId = ctx?.seriesId || undefined;

  if (!resolvedWsId) {
    try {
      const savedWs = localStorage.getItem('activeWorkspace');
      const parsed = savedWs ? JSON.parse(savedWs) : null;
      if (parsed?.id && typeof parsed.id === 'string') {
        resolvedWsId = parsed.id;
      }
    } catch {
      // ignore malformed storage
    }
  }

  // Luôn tra chương: thông báo có thể thuộc Series khác Series đang mở (ctx.seriesId), dùng ctx sẽ mở nhầm Series.
  const chap = await chapterService.getChapterById(n.chapterId).catch(() => null);
  if (chap?.seriesId) {
    resolvedSeriesId = chap.seriesId;
  }

  if (resolvedSeriesId && (!resolvedWsId || (chap?.seriesId && chap.seriesId !== ctx?.seriesId))) {
    const ser = await seriesService.getSeriesById(resolvedSeriesId).catch(() => null);
    if (ser?.workspaceId) {
      resolvedWsId = ser.workspaceId;
    }
  }

  if (!resolvedWsId || !resolvedSeriesId) {
    return resolvedWsId ? `/workspaces/${resolvedWsId}/overview` : null;
  }

  if (
    n.type === 'ChapterReadyForPublication' ||
    n.type === 'ChapterReopened' ||
    n.type === 'ChapterPublished'
  ) {
    return `/workspaces/${resolvedWsId}/series/${resolvedSeriesId}/publishing`;
  }

  if (!n.assignmentId) {
    const query = new URLSearchParams({ chapterId: n.chapterId, board: 'grid-v3' });
    return `/workspaces/${resolvedWsId}/series/${resolvedSeriesId}/workspace?${query.toString()}`;
  }

  const query = new URLSearchParams({
    chapterId: n.chapterId,
    assignmentId: n.assignmentId,
  });
  return `/workspaces/${resolvedWsId}/series/${resolvedSeriesId}/my-work?${query.toString()}`;
}
