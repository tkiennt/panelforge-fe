// Lucian UX/UI Prompt #074 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#074
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notification.service';
import type { NotificationDto } from '@/types';
import { formatRelativeTime } from './collaborationRules';
import '@/shared/components/lucian/lucian-074.css';

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

interface NotificationBadgeStyle {
  icon: string;
  bg: string;
  border: string;
  color: string;
}

const getNotificationBadgeStyle = (type: string): NotificationBadgeStyle => {
  switch (type) {
    case 'AssignmentApproved':
    case 'ChapterPublished':
      return { icon: '✅', bg: '#ECFDF5', border: '#A7F3D0', color: '#047857' };
    case 'AssignmentChangesRequested':
    case 'ChangeRequestReopened':
      return { icon: '✏️', bg: '#FFFBEB', border: '#FDE68A', color: '#B45309' };
    case 'AssignmentOverdue':
    case 'ChangeRequestOverdue':
      return { icon: '🚨', bg: '#FEF2F2', border: '#FECACA', color: '#B91C1C' };
    case 'ChapterReadyForPublication':
      return { icon: '🚀', bg: '#F5F3FF', border: '#DDD6FE', color: '#6D28D9' };
    case 'AssignmentAssigned':
    case 'AssignmentUpdated':
      return { icon: '📋', bg: '#FFF2E6', border: '#FDBA74', color: '#C2410C' };
    default:
      return { icon: '💬', bg: '#F3F0E9', border: '#D8D2C5', color: '#57534E' };
  }
};

/**
 * Chuông thông báo chuẩn Lucian UX/UI Element #074 kết hợp logic Backend thực tế (UC-14).
 * Cung cấp animation rung động lực học khi có tin mới, badge đếm co giãn spring, popover có tab và đánh dấu đã đọc mượt mà.
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  workspaceId,
  seriesId,
  pollIntervalMs = 30_000,
}) => {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [isRinging, setIsRinging] = useState(false);

  const prevCountRef = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await notificationService.getNotifications(false, 1, 20);
      setItems(res.items);
      const newUnread = res.unreadCount;
      if (newUnread > prevCountRef.current) {
        setIsRinging(true);
        window.setTimeout(() => setIsRinging(false), 1000);
      }
      prevCountRef.current = newUnread;
      setUnreadCount(newUnread);
    } catch {
      // Bỏ qua lỗi polling mạng ngầm
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [refresh, pollIntervalMs]);

  const handleToggle = () => {
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

  // Phím Escape để đóng popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Click outside để đóng popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const filteredItems = items.filter((n) => {
    if (activeTab === 'unread') return !n.readAt;
    return true;
  });

  return (
    <div
      ref={rootRef}
      className={`ux u074 ${open ? '' : 'is-closed'} relative inline-block`}
      style={{ width: 'auto', height: 'auto' }}
    >
      <button
        ref={bellRef}
        type='button'
        onClick={handleToggle}
        aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        data-testid='notification-bell'
        className={`u074-bell ${isRinging ? 'ring' : ''}`}
        style={{ width: '36px', height: '36px' }}
      >
        <svg viewBox='0 0 22 22' aria-hidden='true'>
          <path d='M5.5 15V10a5.5 5.5 0 0 1 11 0v5l1.5 1.5h-14zM9 18.5a2 2 0 0 0 4 0' />
        </svg>
        {unreadCount > 0 && (
          <span
            data-testid='notification-badge'
            className='u074-badge'
            aria-hidden='true'
            style={{ right: '-2px', top: '-2px' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel Lucian UX/UI #074 */}
      <div
        className='u074-pan'
        role='region'
        aria-label='Notification list'
        aria-hidden={!open}
        style={{
          width: '360px',
          top: '46px',
          right: '0',
          left: 'auto',
          boxShadow: '0 12px 36px -10px rgba(0,0,0,0.2), 0 0 0 1px var(--ux-line)',
        }}
      >
        {/* Panel Header & Tabs */}
        <div className='u074-ph' role='tablist' aria-label='Notification type'>
          <button
            className='u074-tab'
            type='button'
            role='tab'
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          >
            Tất cả
          </button>
          <button
            className='u074-tab'
            type='button'
            role='tab'
            aria-selected={activeTab === 'unread'}
            onClick={() => setActiveTab('unread')}
          >
            Chưa đọc ({unreadCount})
          </button>
          <button
            className='u074-all'
            type='button'
            disabled={unreadCount === 0}
            onClick={() => void handleReadAll()}
          >
            Đánh dấu đã đọc tất cả
          </button>
        </div>

        {/* Notification List */}
        <ul className='u074-list' aria-live='polite' style={{ maxHeight: '380px' }}>
          {filteredItems.length === 0 ? (
            <li className='p-6 text-center text-xs text-[#888888] font-medium'>
              Chưa có thông báo nào.
            </li>
          ) : (
            filteredItems.map((n) => {
              const badgeStyle = getNotificationBadgeStyle(n.type);
              const isOverdue =
                n.type === 'AssignmentOverdue' || n.type === 'ChangeRequestOverdue';
              const isDueSoon =
                n.type === 'AssignmentDueSoon' || n.type === 'ChangeRequestDueSoon';

              return (
                <li key={n.id} className='u074-it'>
                  <div>
                    <button
                      type='button'
                      onClick={() => void handleItemClick(n)}
                      data-testid={`notification-${n.id}`}
                      className={`u074-row ${n.readAt ? 'read' : ''}`}
                      style={{
                        padding: '10px 14px',
                        background: n.readAt ? 'transparent' : 'rgba(249, 115, 22, 0.05)',
                      }}
                    >
                      <span
                        className='u074-av'
                        style={{
                          background: badgeStyle.bg,
                          border: `1px solid ${badgeStyle.border}`,
                          color: badgeStyle.color,
                        }}
                        aria-hidden='true'
                      >
                        <span style={{ fontSize: '15px' }}>{badgeStyle.icon}</span>
                      </span>

                      <div className='u074-tx' style={{ flex: 1 }}>
                        <div className='flex items-center justify-between text-[11px] mb-0.5'>
                          <span
                            className={
                              isOverdue
                                ? 'text-rose-600 font-bold flex items-center gap-1'
                                : isDueSoon
                                  ? 'text-amber-600 font-bold flex items-center gap-1'
                                  : n.readAt
                                    ? 'text-[#888888]'
                                    : 'text-[#F97316] font-bold'
                            }
                          >
                            {isOverdue && <span className='w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0' />}
                            {isDueSoon && <span className='w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0' />}
                            {TYPE_LABEL[String(n.type)] ?? 'Thông báo'}
                          </span>
                          <small className='font-mono text-[10.5px] text-[#8E8A97]'>
                            {formatRelativeTime(n.createdAt)}
                          </small>
                        </div>

                        <b style={{ display: 'block', fontSize: '12.5px', lineHeight: '1.35', marginBottom: '2px', color: n.readAt ? '#44403C' : '#1C1917' }}>
                          {n.title}
                        </b>
                        <p style={{ margin: 0, fontSize: '11.5px', color: '#57534E', lineHeight: '1.4' }}>
                          {n.message}
                        </p>
                      </div>

                      {!n.readAt && <span className='u074-dot' aria-hidden='true' />}
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};
