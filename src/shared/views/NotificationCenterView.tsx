import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  X,
  CheckCheck,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  Inbox,
  Filter,
} from 'lucide-react';
import { SystemRole, NotificationDto } from '@/types';
import { notificationService } from '@/services/notification.service';
import { formatRelativeTime } from '@/shared/features/collaboration/collaborationRules';

interface NotificationCenterViewProps {
  onNavigateToWorkspace?: (workspaceId: string, targetView?: string, role?: SystemRole) => void;
  onClose?: () => void;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  AssignmentAssigned: {
    label: 'Công việc mới',
    icon: Layers,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  AssignmentUnassigned: {
    label: 'Thu hồi việc',
    icon: AlertTriangle,
    color: 'text-stone-600',
    bg: 'bg-stone-50 border-stone-200',
  },
  AssignmentUpdated: {
    label: 'Cập nhật việc',
    icon: RefreshCw,
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-200',
  },
  AssignmentSubmitted: {
    label: 'Chờ xét duyệt',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  AssignmentApproved: {
    label: 'Đã phê duyệt',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  AssignmentChangesRequested: {
    label: 'Yêu cầu sửa đổi',
    icon: AlertTriangle,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
  ChangeRequestResolved: {
    label: 'Đã giải quyết yêu cầu',
    icon: CheckCircle2,
    color: 'text-teal-600',
    bg: 'bg-teal-50 border-teal-200',
  },
  ChangeRequestReopened: {
    label: 'Mở lại yêu cầu sửa',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  ChapterReadyForPublication: {
    label: 'Sẵn sàng xuất bản',
    icon: Sparkles,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
  ChapterReopened: {
    label: 'Chương được mở lại',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  ChapterPublished: {
    label: 'Đã xuất bản thành công',
    icon: Sparkles,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
  AssignmentDueSoon: {
    label: 'Sắp đến hạn',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  AssignmentOverdue: {
    label: 'Đã quá hạn',
    icon: AlertTriangle,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
  ChangeRequestDueSoon: {
    label: 'Hạn sửa sắp đến',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  ChangeRequestOverdue: {
    label: 'Hạn sửa đã quá hạn',
    icon: AlertTriangle,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
};

export const NotificationCenterView: React.FC<NotificationCenterViewProps> = ({
  onNavigateToWorkspace,
  onClose,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications(filter === 'unread', 1, 50);
      setNotifications(res?.items || []);
      setUnreadCount(res?.unreadCount || 0);
      setTotalCount(res?.totalCount || 0);
    } catch (err) {
      console.warn('Lỗi khi tải thông báo từ API:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (e: React.MouseEvent, n: NotificationDto) => {
    e.stopPropagation();
    if (n.readAt) return;
    const marked = await notificationService.markAsRead(n.id);
    if (marked > 0) {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, readAt: now } : item)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || now })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Lỗi khi đánh dấu đọc tất cả:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleItemClick = async (n: NotificationDto) => {
    if (!n.readAt) {
      await notificationService.markAsRead(n.id);
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, readAt: now } : item)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (onClose) {
      onClose();
    }

    // Định tuyến thông minh theo loại thông báo và dữ liệu liên quan
    try {
      const savedWs = localStorage.getItem('activeWorkspace');
      const wsId = savedWs ? JSON.parse(savedWs)?.id : undefined;

      if (
        n.type === 'ChapterReadyForPublication' ||
        n.type === 'ChapterReopened' ||
        n.type === 'ChapterPublished'
      ) {
        if (wsId) {
          navigate(`/workspaces/${wsId}/overview`);
          return;
        }
      }

      if (n.chapterId && wsId) {
        const query = new URLSearchParams({ chapterId: n.chapterId });
        if (n.assignmentId) query.set('assignmentId', n.assignmentId);
        navigate(`/workspaces/${wsId}/overview?${query.toString()}`);
        return;
      }
    } catch {
      // ignore
    }

    if (onNavigateToWorkspace) {
      onNavigateToWorkspace('default');
    }
  };

  const displayedNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((n) => !n.readAt);
    }
    return notifications;
  }, [notifications, filter]);

  return (
    <div className='max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-150'>
      {/* Editorial Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#D8D2C5]'>
        <div>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-[#FFF2E6] border border-[#F97316]/30 flex items-center justify-center text-[#F97316] shrink-0'>
              <Bell className='w-5 h-5' />
            </div>
            <div>
              <div className='flex items-center gap-2.5'>
                <h1 className='text-2xl font-serif font-bold text-[#1C1917] tracking-tight'>
                  Trung Tâm Thông Báo
                </h1>
                {unreadCount > 0 && (
                  <span className='px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F97316]/15 text-[#C2410C] border border-[#F97316]/30'>
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className='text-xs sm:text-sm text-[#57534E] mt-0.5'>
                Theo dõi phân công việc, tiến độ chương và các yêu cầu chỉnh sửa từ đội ngũ sản xuất.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex items-center gap-2 self-start sm:self-auto'>
          <button
            type='button'
            onClick={() => void fetchNotifications()}
            disabled={loading}
            title='Làm mới danh sách'
            className='px-3 py-2 rounded-lg border border-[#D8D2C5] bg-[#FCFBF8] hover:bg-[#F3F0E9] text-[#57534E] hover:text-[#1C1917] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50'
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className='hidden sm:inline'>Làm mới</span>
          </button>
          <button
            type='button'
            onClick={() => void handleMarkAllAsRead()}
            disabled={unreadCount === 0 || markingAll}
            className='px-3.5 py-2 rounded-lg bg-[#1C1917] hover:bg-black text-[#FCFBF8] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs'
          >
            <CheckCheck className='w-3.5 h-3.5' />
            <span>Đánh dấu đã đọc tất cả</span>
          </button>
          {onClose && (
            <button
              type='button'
              onClick={onClose}
              aria-label='Đóng'
              className='p-2 rounded-lg hover:bg-[#EFECE6] border border-transparent hover:border-[#D8D2C5] text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer'
            >
              <X className='w-5 h-5' />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className='flex items-center gap-2 border-b border-[#E7E2D9] pb-1 text-xs'>
        <button
          type='button'
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-[#1C1917] text-[#FCFBF8]'
              : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9]'
          }`}
        >
          Tất cả thông báo ({totalCount})
        </button>
        <button
          type='button'
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === 'unread'
              ? 'bg-[#1C1917] text-[#FCFBF8]'
              : 'text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3F0E9]'
          }`}
        >
          <span>Chưa đọc</span>
          {unreadCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                filter === 'unread'
                  ? 'bg-[#F97316] text-white'
                  : 'bg-[#F97316]/20 text-[#C2410C]'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification List Container */}
      <div className='bg-[#FCFBF8] border border-[#D8D2C5] rounded-2xl shadow-soft-sm overflow-hidden'>
        {loading ? (
          <div className='py-20 text-center text-[#78716C] flex flex-col items-center justify-center gap-3'>
            <RefreshCw className='w-7 h-7 animate-spin text-[#F97316]' />
            <span className='text-sm font-medium text-[#57534E]'>
              Đang tải danh sách thông báo từ hệ thống...
            </span>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className='py-20 text-center text-[#78716C] flex flex-col items-center justify-center gap-3'>
            <div className='w-14 h-14 rounded-2xl bg-[#F3F0E9] flex items-center justify-center text-[#A8A29E]'>
              <Inbox className='w-7 h-7' />
            </div>
            <div className='space-y-1'>
              <h3 className='text-base font-semibold text-[#1C1917]'>
                {filter === 'unread' ? 'Không có thông báo chưa đọc nào' : 'Chưa có thông báo nào'}
              </h3>
              <p className='text-xs text-[#78716C] max-w-sm mx-auto'>
                Khi có tác vụ mới, biên tập viên phản hồi hoặc tiến độ chương cập nhật, thông báo sẽ
                xuất hiện tại đây.
              </p>
            </div>
          </div>
        ) : (
          <div className='divide-y divide-[#E7E2D9]'>
            {displayedNotifications.map((n) => {
              const isUnread = !n.readAt;
              const config =
                TYPE_CONFIG[String(n.type)] || {
                  label: 'Thông báo',
                  icon: Bell,
                  color: 'text-[#78716C]',
                  bg: 'bg-[#F1EEE8] border-[#D8D2C5]',
                };
              const Icon = config.icon;

              return (
                <div
                  key={n.id}
                  onClick={() => void handleItemClick(n)}
                  className={`p-4 sm:p-5 flex gap-4 transition-colors cursor-pointer group relative ${
                    isUnread
                      ? 'bg-[#FFF2E6]/40 hover:bg-[#FFF2E6]/70 border-l-4 border-l-[#F97316]'
                      : 'hover:bg-[#F3F0E9]/50'
                  }`}
                >
                  {/* Icon Indicator */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${config.bg} ${config.color}`}
                  >
                    <Icon className='w-4 h-4' />
                  </div>

                  {/* Body Content */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-3 mb-1'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold border ${config.bg} ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <h2
                          className={`text-sm font-semibold truncate ${
                            isUnread ? 'text-[#1C1917]' : 'text-[#57534E]'
                          }`}
                        >
                          {n.title}
                        </h2>
                      </div>
                      <span className='text-[11px] text-[#78716C] font-mono whitespace-nowrap shrink-0 flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className='text-xs sm:text-sm text-[#57534E] leading-relaxed mb-2.5 line-clamp-2'>
                      {n.message}
                    </p>

                    <div className='flex items-center justify-between text-xs'>
                      <div className='flex items-center text-[#F97316] group-hover:text-[#EA580C] font-semibold text-xs'>
                        <span>Mở chi tiết công việc</span>
                        <ArrowRight className='w-3.5 h-3.5 ml-1 transform group-hover:translate-x-1 transition-transform' />
                      </div>

                      {isUnread && (
                        <button
                          type='button'
                          onClick={(e) => void handleMarkAsRead(e, n)}
                          title='Đánh dấu là đã đọc'
                          className='text-[11px] font-mono text-[#78716C] hover:text-[#1C1917] hover:underline flex items-center gap-1 p-1'
                        >
                          <CheckCheck className='w-3 h-3' />
                          <span>Đã đọc</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
