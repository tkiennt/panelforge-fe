import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { NotificationCenterView } from './NotificationCenterView';
import { notificationService } from '@/services/notification.service';
import { chapterService } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChapterById: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
  },
}));

describe('NotificationCenterView Component', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      type: 'AssignmentAssigned',
      title: 'Phân công công việc mới',
      message: 'Bạn được giao Inking Trang 12',
      chapterId: 'chap-1',
      assignmentId: 'assign-1',
      readAt: null,
      createdAt: '2026-10-19T10:00:00Z',
    },
    {
      id: 'notif-2',
      type: 'AssignmentApproved',
      title: 'Tác vụ đã được duyệt',
      message: 'Bản vẽ Chì Trang 5 đã được Producer chấp thuận',
      chapterId: 'chap-1',
      assignmentId: 'assign-2',
      readAt: '2026-10-19T10:30:00Z',
      createdAt: '2026-10-19T10:15:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      totalCount: 2,
      unreadCount: 1,
      pageIndex: 1,
      pageSize: 50,
    });
    vi.mocked(notificationService.markAsRead).mockResolvedValue(1);
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue(1);
  });

  it('tải và hiển thị danh sách thông báo từ API khi mount', async () => {
    render(
      <MemoryRouter>
        <NotificationCenterView />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Đang tải danh sách thông báo/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Phân công công việc mới')).toBeInTheDocument();
      expect(screen.getByText('Tác vụ đã được duyệt')).toBeInTheDocument();
      expect(screen.getByText(/1 chưa đọc/i)).toBeInTheDocument();
    });
  });

  it('đánh dấu một thông báo là đã đọc khi bấm nút Đã đọc', async () => {
    render(
      <MemoryRouter>
        <NotificationCenterView />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Phân công công việc mới')).toBeInTheDocument();
    });

    const readBtn = screen.getByText('Đã đọc');
    fireEvent.click(readBtn);

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1');
    });
  });

  it('đánh dấu tất cả thông báo là đã đọc khi bấm nút Đánh dấu đã đọc tất cả', async () => {
    render(
      <MemoryRouter>
        <NotificationCenterView />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Đánh dấu đã đọc tất cả')).toBeInTheDocument();
    });

    const readAllBtn = screen.getByText('Đánh dấu đã đọc tất cả');
    fireEvent.click(readAllBtn);

    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalled();
    });
  });

  it('lọc chỉ xem thông báo chưa đọc khi chọn tab Chưa đọc', async () => {
    render(
      <MemoryRouter>
        <NotificationCenterView />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Phân công công việc mới')).toBeInTheDocument();
    });

    const unreadTab = screen.getByRole('button', { name: /Chưa đọc/i });
    fireEvent.click(unreadTab);

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledWith(true, 1, 50);
    });
  });

  it('TASK-362: bấm thông báo "Chương X sẵn sàng chốt" hoặc "có ô bị ngâm" (chỉ có chapterId) điều hướng đến lưới giao việc của chương đó', async () => {
    vi.mocked(notificationService.getNotifications).mockResolvedValueOnce({
      items: [
        {
          id: 'notif-lock',
          type: 'AssignmentUpdated',
          title: 'Chương 5 sẵn sàng chốt',
          message: 'Mọi ô đã duyệt và không còn điều kiện chặn. Mở chương để duyệt/chốt.',
          chapterId: 'chap-5',
          assignmentId: null,
          readAt: null,
          createdAt: '2026-11-26T15:00:00Z',
        },
      ],
      totalCount: 1,
      unreadCount: 1,
      pageIndex: 1,
      pageSize: 50,
    });
    vi.mocked(chapterService.getChapterById).mockResolvedValueOnce({
      id: 'chap-5',
      seriesId: 'series-9',
    } as any);
    vi.mocked(seriesService.getSeriesById).mockResolvedValueOnce({
      id: 'series-9',
      workspaceId: 'ws-9',
    } as any);

    const LocationEcho = () => {
      const loc = useLocation();
      return <div data-testid='center-location'>{loc.pathname + loc.search}</div>;
    };

    render(
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route path='/notifications' element={<NotificationCenterView />} />
          <Route path='*' element={<LocationEcho />} />
        </Routes>
      </MemoryRouter>,
    );

    const cardTitle = await screen.findByText('Chương 5 sẵn sàng chốt');
    fireEvent.click(cardTitle);

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-lock');
      expect(screen.getByTestId('center-location')).toHaveTextContent(
        '/workspaces/ws-9/series/series-9/workspace?chapterId=chap-5&board=grid-v3',
      );
    });
  });
});
