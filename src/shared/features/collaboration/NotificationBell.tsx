import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import type { NotificationDto } from '@/types';
import { formatRelativeTime } from './collaborationRules';

interface NotificationBellProps {
  workspaceId?: string;
  seriesId?: string;
  /** Chu kỳ hỏi Backend (BE chưa đẩy realtime nên dùng polling). Mặc định 30 giây. */
  pollIntervalMs?: number;
}

const TYPE_LABEL: Record<string, string> = {
  AssignmentAssigned: 'Việc mới',
  AssignmentUnassigned: 'Rút việc',
  AssignmentUpdated: 'Cập nhật việc',
  AssignmentSubmitted: 'Chờ duyệt',
  AssignmentApproved: 'Đã duyệt',
  AssignmentChangesRequested: 'Trả về sửa',
  ChangeRequestResolved: 'Đã sửa xong',
  ChangeRequestReopened: 'Mở lại yêu cầu',
  ChapterReadyForPublication: 'Chờ duyệt xuất bản',
  ChapterReopened: 'Chương bị mở lại',
  ChapterPublished: 'Chương đã xuất bản',
  AssignmentDueSoon: 'Sắp đến hạn',
  AssignmentOverdue: 'Đã quá hạn',
  ChangeRequestDueSoon: 'Sửa sắp đến hạn',
  ChangeRequestOverdue: 'Sửa đã quá hạn',
};

/**
 * Chuông thông báo thật (UC-14): số chưa đọc lấy từ Backend (`unreadCount`), polling định kỳ, bấm vào một thông báo thì đánh dấu
 * đã đọc và mở màn "Công việc của tôi" đúng chương và việc liên quan.
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  workspaceId,
  seriesId,
  pollIntervalMs = 30_000,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const res = await notificationService.getNotifications(false, 1, 20);
    setItems(res.items);
    setUnreadCount(res.unreadCount);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollIntervalMs]);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) void refresh();
  };

  const handleItemClick = async (n: NotificationDto) => {
    if (!n.readAt) {
      const marked = await notificationService.markAsRead(n.id);
      if (marked > 0) {
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
    if (workspaceId && seriesId && n.chapterId) {
      if (
        n.type === 'ChapterReadyForPublication' ||
        n.type === 'ChapterReopened' ||
        n.type === 'ChapterPublished'
      ) {
        setOpen(false);
        navigate(`/workspaces/${workspaceId}/series/${seriesId}/publishing`);
        return;
      }
      const query = new URLSearchParams({ chapterId: n.chapterId });
      if (n.assignmentId) query.set('assignmentId', n.assignmentId);
      setOpen(false);
      navigate(`/workspaces/${workspaceId}/series/${seriesId}/my-work?${query.toString()}`);
    }
  };

  const handleReadAll = async () => {
    await notificationService.markAllAsRead();
    const now = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.readAt ? x : { ...x, readAt: now })));
    setUnreadCount(0);
  };

  return (
    <div className='relative'>
      <button
        type='button'
        onClick={handleOpen}
        aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        data-testid='notification-bell'
        className='w-8 h-8 rounded-lg border border-[#E7E7E7] bg-white hover:bg-[#F8F6F0] flex items-center justify-center text-[#555555] hover:text-[#171717] transition-colors relative cursor-pointer'
      >
        <Bell className='w-4 h-4' />
        {unreadCount > 0 && (
          <span
            data-testid='notification-badge'
            className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#F97316] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white'
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setOpen(false)} />
          <div className='absolute right-0 top-10 w-80 bg-white border border-[#E7E7E7] rounded-xl shadow-2xl z-50 overflow-hidden'>
            <div className='flex items-center justify-between px-3 py-2 border-b border-[#E7E7E7] bg-[#FAF8F4]'>
              <span className='text-xs font-bold text-[#171717]'>Thông báo</span>
              <button
                type='button'
                onClick={() => void handleReadAll()}
                disabled={unreadCount === 0}
                className='text-[10px] font-semibold text-[#F97316] disabled:text-zinc-400 flex items-center gap-1 cursor-pointer disabled:cursor-default'
              >
                <CheckCheck className='w-3 h-3' />
                Đánh dấu đã đọc tất cả
              </button>
            </div>

            <div className='max-h-96 overflow-y-auto'>
              {items.length === 0 ? (
                <div className='p-6 text-center text-xs text-[#888888]'>Chưa có thông báo nào.</div>
              ) : (
                <ul className='divide-y divide-[#F0F0F0]'>
                  {items.map((n) => (
                    <li key={n.id}>
                      <button
                        type='button'
                        onClick={() => void handleItemClick(n)}
                        data-testid={`notification-${n.id}`}
                        className={`w-full text-left p-3 hover:bg-zinc-50 cursor-pointer ${n.readAt ? '' : 'bg-orange-50/50'}`}
                      >
                        <div className='flex items-center justify-between text-[10px] font-mono text-[#888888]'>
                          <span
                            className={
                              n.type === 'AssignmentOverdue' || n.type === 'ChangeRequestOverdue'
                                ? 'text-rose-600 font-bold flex items-center gap-1'
                                : n.type === 'AssignmentDueSoon' ||
                                    n.type === 'ChangeRequestDueSoon'
                                  ? 'text-amber-600 font-bold flex items-center gap-1'
                                  : n.readAt
                                    ? ''
                                    : 'text-[#F97316] font-bold'
                            }
                          >
                            {(n.type === 'AssignmentOverdue' ||
                              n.type === 'ChangeRequestOverdue') && (
                              <span className='w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0' />
                            )}
                            {(n.type === 'AssignmentDueSoon' ||
                              n.type === 'ChangeRequestDueSoon') && (
                              <span className='w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0' />
                            )}
                            {TYPE_LABEL[String(n.type)] ?? 'Thông báo'}
                          </span>
                          <span>{formatRelativeTime(n.createdAt)}</span>
                        </div>
                        <div
                          className={`text-xs mt-0.5 ${n.readAt ? 'text-[#555555]' : 'text-[#171717] font-semibold'}`}
                        >
                          {n.title}
                        </div>
                        <p className='text-[11px] text-[#666666] line-clamp-2 mt-0.5'>
                          {n.message}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
