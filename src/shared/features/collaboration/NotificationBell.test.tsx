import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { NotificationDto, NotificationListDto } from '@/types';
import { notificationService } from '@/services/notification.service';
import type { ComponentProps } from 'react';
import { NotificationBell } from './NotificationBell';
import { getNotificationBadge } from './notificationBadge';
import { formatRelativeTime } from './collaborationRules';

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const notification = (over: Partial<NotificationDto> = {}): NotificationDto => ({
  id: 'n1',
  type: 'AssignmentAssigned',
  title: 'Bạn được giao việc mới',
  message: 'Vẽ pencil trang 1',
  assignmentId: 'asg-1',
  chapterId: 'chap-1',
  readAt: null,
  createdAt: new Date().toISOString(),
  ...over,
});

const list = (
  items: NotificationDto[],
  unreadCount = items.filter((i) => !i.readAt).length,
): NotificationListDto => ({
  items,
  totalCount: items.length,
  unreadCount,
  pageIndex: 1,
  pageSize: 20,
});

const Where = () => {
  const loc = useLocation();
  return <div data-testid='location'>{loc.pathname + loc.search}</div>;
};

const renderBell = (props: Partial<ComponentProps<typeof NotificationBell>> = {}) =>
  render(
    <MemoryRouter initialEntries={['/workspaces/ws-1/series/se-1/dashboard']}>
      <NotificationBell workspaceId='ws-1' seriesId='se-1' {...props} />
      <Routes>
        <Route path='*' element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.markAsRead).mockResolvedValue(1);
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue(2);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hiện số chưa đọc lấy từ Backend, không hiện chấm khi bằng 0', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(list([notification()], 3));
    renderBell();

    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Thông báo, 3 chưa đọc' })).toBeInTheDocument();
  });

  it('không có chấm khi không còn thông báo chưa đọc', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(
      list([notification({ readAt: '2026-10-06T00:00:00Z' })], 0),
    );
    renderBell();

    await waitFor(() => expect(notificationService.getNotifications).toHaveBeenCalled());
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thông báo' })).toBeInTheDocument();
  });

  it('chặn số quá lớn thành 99+', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(list([], 250));
    renderBell();

    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('99+');
  });

  it('mở danh sách thì liệt kê thông báo với nhãn theo loại', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(
      list([
        notification({
          id: 'n1',
          type: 'AssignmentChangesRequested',
          title: 'Việc của bạn bị trả về',
        }),
        notification({
          id: 'n2',
          type: 'AssignmentApproved',
          title: 'Việc của bạn đã được duyệt',
          readAt: '2026-10-06T00:00:00Z',
        }),
      ]),
    );
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByTestId('notification-bell'));

    expect(await screen.findByText('Việc của bạn bị trả về')).toBeInTheDocument();
    expect(screen.getByText('Trả về sửa')).toBeInTheDocument();
    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();
  });

  it('hiển thị nhãn Sắp đến hạn và Đã quá hạn chuẩn cho việc đến hạn', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(
      list([
        notification({
          id: 'due1',
          type: 'AssignmentDueSoon',
          title: 'Việc sắp đến hạn',
          message: 'Vẽ thumbnail trang 2 (hạn 2026-10-08 10:00 UTC)',
        }),
        notification({
          id: 'over1',
          type: 'AssignmentOverdue',
          title: 'Việc đã quá hạn',
          message: 'Vẽ pencil trang 1 (hạn 2026-10-06 10:00 UTC)',
        }),
      ]),
    );
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByTestId('notification-bell'));

    expect(await screen.findByText('Sắp đến hạn')).toBeInTheDocument();
    expect(screen.getByText('Đã quá hạn')).toBeInTheDocument();
    expect(screen.getByText('Việc sắp đến hạn')).toBeInTheDocument();
    expect(screen.getByText('Việc đã quá hạn')).toBeInTheDocument();
  });

  it('danh sách rỗng hiện thông báo trống', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(list([]));
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByTestId('notification-bell'));

    expect(await screen.findByText('Chưa có thông báo nào.')).toBeInTheDocument();
  });

  it('bấm thông báo chưa đọc thì đánh dấu đã đọc, giảm số và mở đúng việc', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(list([notification()]));
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByTestId('notification-bell'));
    await user.click(await screen.findByTestId('notification-n1'));

    expect(notificationService.markAsRead).toHaveBeenCalledWith('n1');
    await waitFor(() => expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument());
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/workspaces/ws-1/series/se-1/my-work?chapterId=chap-1&assignmentId=asg-1',
    );
  });

  it('bấm thông báo đã đọc thì không gọi đánh dấu lại', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(
      list([notification({ readAt: '2026-10-06T00:00:00Z' })]),
    );
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByTestId('notification-bell'));
    await user.click(await screen.findByTestId('notification-n1'));

    expect(notificationService.markAsRead).not.toHaveBeenCalled();
  });

  it('không điều hướng khi đang ở ngoài một Series nhưng vẫn đánh dấu đã đọc', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(list([notification()]));
    const user = userEvent.setup();
    renderBell({ workspaceId: undefined, seriesId: undefined });

    await user.click(await screen.findByTestId('notification-bell'));
    await user.click(await screen.findByTestId('notification-n1'));

    expect(notificationService.markAsRead).toHaveBeenCalledWith('n1');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/workspaces/ws-1/series/se-1/dashboard',
    );
  });

  it('"Đánh dấu đã đọc tất cả" gọi Backend và xoá số chưa đọc', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValue(
      list([notification({ id: 'n1' }), notification({ id: 'n2' })]),
    );
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByTestId('notification-bell'));
    await user.click(await screen.findByRole('button', { name: /Đánh dấu đã đọc tất cả/ }));

    expect(notificationService.markAllAsRead).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument());
  });

  it('polling: hỏi lại Backend theo chu kỳ và dừng khi gỡ component', async () => {
    vi.useFakeTimers();
    vi.mocked(notificationService.getNotifications).mockResolvedValue(list([]));
    const { unmount } = renderBell({ pollIntervalMs: 30_000 });

    await act(async () => {
      await Promise.resolve();
    });
    expect(notificationService.getNotifications).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(notificationService.getNotifications).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(notificationService.getNotifications).toHaveBeenCalledTimes(2);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-06T12:00:00Z');

  it.each([
    ['2026-10-06T11:59:40Z', 'vừa xong'],
    ['2026-10-06T11:45:00Z', '15 phút trước'],
    ['2026-10-06T09:00:00Z', '3 giờ trước'],
    ['2026-10-04T12:00:00Z', '2 ngày trước'],
  ])('%s → %s', (iso, expected) => {
    expect(formatRelativeTime(iso, now)).toBe(expected);
  });
});

describe('getNotificationBadge', () => {
  it('trả về Clock với tông cam cho thông báo Chờ duyệt', () => {
    const badge = getNotificationBadge('AssignmentSubmitted');
    expect(badge.bg).toBe('bg-orange-50');
    expect(badge.text).toBe('text-orange-600');
    expect(badge.border).toBe('border-orange-200');
    expect(badge.containerClass).toContain('bg-orange-50 text-orange-600 border-orange-200');

    const publication = getNotificationBadge('ChapterReadyForPublication');
    expect(publication.containerClass).toContain('bg-orange-50 text-orange-600 border-orange-200');
  });

  it('trả về FileEdit với tông xanh dương cho thông báo Đã sửa xong', () => {
    const badge = getNotificationBadge('ChangeRequestResolved');
    expect(badge.bg).toBe('bg-blue-50');
    expect(badge.text).toBe('text-blue-600');
    expect(badge.border).toBe('border-blue-200');
    expect(badge.containerClass).toContain('bg-blue-50 text-blue-600 border-blue-200');
  });

  it('trả về CheckCircle2 với tông xanh lá cho Đã duyệt và Chương đã xuất bản', () => {
    const approved = getNotificationBadge('AssignmentApproved');
    const published = getNotificationBadge('ChapterPublished');
    expect(approved.bg).toBe('bg-emerald-50');
    expect(approved.text).toBe('text-emerald-600');
    expect(published.containerClass).toContain('bg-emerald-50 text-emerald-600 border-emerald-200');
  });

  it('trả về AlertCircle với tông đỏ cho thông báo từ chối / trả về / quá hạn', () => {
    const rejected = getNotificationBadge('AssignmentChangesRequested');
    const overdue = getNotificationBadge('AssignmentOverdue');
    const reopened = getNotificationBadge('ChangeRequestReopened');
    expect(rejected.containerClass).toContain('bg-rose-50 text-rose-600 border-rose-200');
    expect(overdue.containerClass).toContain('bg-rose-50 text-rose-600 border-rose-200');
    expect(reopened.containerClass).toContain('bg-rose-50 text-rose-600 border-rose-200');
  });

  it('trả về Clock với tông vàng hổ phách cho thông báo sắp đến hạn', () => {
    const dueSoon = getNotificationBadge('AssignmentDueSoon');
    expect(dueSoon.containerClass).toContain('bg-amber-50 text-amber-600 border-amber-200');
  });

  it('trả về Bell với tông indigo / stone cho việc mới và thông báo mặc định', () => {
    const assigned = getNotificationBadge('AssignmentAssigned');
    const fallback = getNotificationBadge('UnknownType');
    expect(assigned.containerClass).toContain('bg-indigo-50 text-indigo-600 border-indigo-200');
    expect(fallback.containerClass).toContain('bg-stone-100 text-stone-600 border-stone-200');
  });
});
