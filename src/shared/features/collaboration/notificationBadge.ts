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
