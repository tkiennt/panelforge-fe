// Lucian UX/UI Prompt #074 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#074
import React, { useState, useEffect, useRef, useCallback } from 'react';
import '@/styles/modules/lucian/lucian-074.css';

export interface LucianNotificationItem {
  id: string | number;
  author: string;
  action: string;
  time: string;
  gradient?: string;
  icon?: string;
  isMention?: boolean;
  isRead?: boolean;
}

export interface NotificationBellDropdownProps {
  title?: string;
  initialItems?: LucianNotificationItem[];
  allLabel?: string;
  mentionsLabel?: string;
  markAllReadLabel?: string;
  className?: string;
  onNotificationClick?: (item: LucianNotificationItem) => void;
  onMarkAllRead?: () => void;
}

const DEFAULT_ITEMS: LucianNotificationItem[] = [
  {
    id: 1,
    author: 'Doyun Han',
    action: ' mentioned you: “@Artist could you check this panel linework?”',
    time: 'Vừa xong',
    gradient: 'linear-gradient(140deg,#8B6CFF,#5B8CFF)',
    icon: '💬',
    isMention: true,
    isRead: false,
  },
  {
    id: 2,
    author: 'Harin Yoon',
    action: ' đã phê duyệt bản thảo “Chương 1: Khởi đầu”',
    time: '12 phút trước',
    gradient: 'linear-gradient(140deg,#22C3A6,#0EA5E9)',
    icon: '✅',
    isMention: false,
    isRead: false,
  },
  {
    id: 3,
    author: 'Mina Jung',
    action: ' đã giao việc mới cho bạn ở công đoạn Inking & Tone',
    time: '1 giờ trước',
    gradient: 'linear-gradient(140deg,#FF7A93,#B04FD0)',
    icon: '👋',
    isMention: false,
    isRead: true,
  },
  {
    id: 4,
    author: 'PanelForge AI',
    action: ' Báo cáo kiểm tra tính nhất quán Series Bible đã hoàn tất',
    time: 'Hôm qua',
    gradient: 'linear-gradient(140deg,#FFB547,#FF7A45)',
    icon: '📊',
    isMention: false,
    isRead: true,
  },
];

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({
  title = 'Thông báo',
  initialItems = DEFAULT_ITEMS,
  allLabel = 'Tất cả',
  mentionsLabel = 'Đề cập',
  markAllReadLabel = 'Đọc tất cả',
  className = '',
  onNotificationClick,
  onMarkAllRead,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');
  const [items, setItems] = useState<LucianNotificationItem[]>(initialItems);
  const [isRinging, setIsRinging] = useState(false);

  // Cập nhật items nếu props initialItems thay đổi
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleItemClick = useCallback(
    (item: LucianNotificationItem) => {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)));
      onNotificationClick?.(item);
    },
    [onNotificationClick],
  );

  const handleMarkAllRead = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    onMarkAllRead?.();
  }, [onMarkAllRead]);

  // Phím Escape để đóng popover
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        bellRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Bấm ngoài để đóng popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Lọc items theo tab All hoặc Mentions
  const displayedItems = items.filter((item) => {
    if (activeTab === 'mentions') return item.isMention;
    return true;
  });

  return (
    <div
      ref={rootRef}
      className={`ux u074 ${isOpen ? '' : 'is-closed'} ${className}`}
      data-testid='lucian-074-dropdown'
    >
      <div className='u074-top'>
        {title && <b>{title}</b>}
        <button
          ref={bellRef}
          className={`u074-bell ${isRinging ? 'ring' : ''}`}
          type='button'
          aria-expanded={isOpen}
          aria-label={`Notifications, ${unreadCount} unread`}
          onClick={handleToggle}
          data-testid='u074-bell-btn'
        >
          <svg viewBox='0 0 22 22' aria-hidden='true'>
            <path d='M5.5 15V10a5.5 5.5 0 0 1 11 0v5l1.5 1.5h-14zM9 18.5a2 2 0 0 0 4 0' />
          </svg>
          <span
            className={`u074-badge ${unreadCount === 0 ? 'zero' : ''}`}
            aria-hidden='true'
            data-testid='u074-badge'
          >
            {unreadCount}
          </span>
        </button>
      </div>

      <div className='u074-pan' role='region' aria-label='Notification list' aria-hidden={!isOpen}>
        <div className='u074-ph' role='tablist' aria-label='Notification type'>
          <button
            className='u074-tab'
            type='button'
            role='tab'
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            data-testid='u074-tab-all'
          >
            {allLabel}
          </button>
          <button
            className='u074-tab'
            type='button'
            role='tab'
            aria-selected={activeTab === 'mentions'}
            onClick={() => setActiveTab('mentions')}
            data-testid='u074-tab-mentions'
          >
            {mentionsLabel}
          </button>
          <button
            className='u074-all'
            type='button'
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
            data-testid='u074-mark-all-read'
          >
            {markAllReadLabel}
          </button>
        </div>

        <ul className='u074-list' aria-live='polite' data-testid='u074-list'>
          {displayedItems.length === 0 ? (
            <li className='p-6 text-center text-xs text-stone-400 font-medium'>
              Không có thông báo nào
            </li>
          ) : (
            displayedItems.map((item) => (
              <li key={item.id} className='u074-it' data-m={item.isMention ? '1' : '0'}>
                <div>
                  <button
                    className={`u074-row ${item.isRead ? 'read' : ''}`}
                    type='button'
                    onClick={() => handleItemClick(item)}
                    aria-label={`${item.author} ${item.action}, ${item.isRead ? 'đã đọc' : 'chưa đọc'}`}
                  >
                    <span
                      className='u074-av'
                      style={
                        {
                          '--g': item.gradient || 'linear-gradient(140deg,#8B6CFF,#5B8CFF)',
                        } as React.CSSProperties
                      }
                      aria-hidden='true'
                    >
                      <em>{item.icon || '📌'}</em>
                    </span>
                    <span className='u074-tx'>
                      <b>{item.author}</b>
                      <span>{item.action}</span>
                      <small>{item.time}</small>
                    </span>
                    <span className='u074-dot' aria-hidden='true' />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
