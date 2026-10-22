import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardView } from './DashboardView';
import { seriesService } from '@/services/series.service';
import { notificationService } from '@/services/notification.service';
import type { SeriesProgressDto, SeriesDetailDto } from '@/services/series.service';

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesProgress: vi.fn(),
    getSeriesById: vi.fn(),
    getSeriesMembers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/notification.service', () => ({
  notificationService: {
    sendReminders: vi.fn().mockResolvedValue({ created: 2 }),
  },
}));

vi.mock('../modals/SeriesMembersModal', () => ({
  SeriesMembersModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid='series-members-modal'>
        <span>SeriesMembersModal Mock</span>
        <button onClick={onClose}>Đóng modal</button>
      </div>
    ) : null,
}));

vi.mock('../modals/SeriesChaptersModal', () => ({
  SeriesChaptersModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid='series-chapters-modal'>
        <span>SeriesChaptersModal Mock</span>
        <button onClick={onClose}>Đóng modal</button>
      </div>
    ) : null,
}));

vi.mock('../modals/CreateAssignmentModal', () => ({
  CreateAssignmentModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid='create-assignment-modal'>
        <span>CreateAssignmentModal Mock</span>
        <button onClick={onClose}>Đóng modal</button>
      </div>
    ) : null,
}));

const mockProgress: SeriesProgressDto = {
  seriesId: 'series-demo-1',
  generatedAt: '2026-10-07T12:00:00Z',
  chapters: [
    {
      chapterId: 'chap-1',
      chapterNumber: 1,
      title: 'Neon Awakening',
      status: 'InProduction',
      targetReleaseDate: '2026-11-15',
      pageCount: 24,
      panelCount: 96,
      percentComplete: 75.0,
      stages: [
        {
          stageId: 'st-thumb',
          name: 'Thumbnail',
          stageOrder: 1,
          notStarted: 0,
          inProgress: 0,
          submitted: 0,
          inReview: 0,
          changesRequested: 0,
          approved: 96,
        },
        {
          stageId: 'st-ink',
          name: 'Inking & Tone',
          stageOrder: 2,
          notStarted: 10,
          inProgress: 14,
          submitted: 0,
          inReview: 0,
          changesRequested: 0,
          approved: 72,
        },
      ],
      assignmentsByStatus: { InProgress: 2 },
      overdueAssignments: 1,
    },
    {
      chapterId: 'chap-2',
      chapterNumber: 2,
      title: 'Cyber Heist',
      status: 'InProduction',
      targetReleaseDate: '2026-12-01',
      pageCount: 30,
      panelCount: 120,
      percentComplete: 25.0,
      stages: [
        {
          stageId: 'st-thumb',
          name: 'Thumbnail',
          stageOrder: 1,
          notStarted: 0,
          inProgress: 20,
          submitted: 10,
          inReview: 0,
          changesRequested: 0,
          approved: 90,
        },
      ],
      assignmentsByStatus: { InProgress: 3 },
      overdueAssignments: 0,
    },
  ],
  workload: [
    {
      userId: 'user-kenji',
      fullName: 'Kenji Sato',
      role: 'Artist',
      open: 4,
      overdue: 1,
      waitingReview: 2,
      done: 18,
    },
  ],
  overdue: [
    {
      assignmentId: 'asg-overdue-1',
      chapterId: 'chap-1',
      assigneeUserId: 'user-kenji',
      assigneeName: 'Kenji Sato',
      status: 'InProgress',
      dueDate: '2026-10-01T00:00:00Z',
      brief: 'Hoàn thiện spread trang 18-19',
    },
  ],
  burndown: [
    { date: '2026-10-01', remaining: 25 },
    { date: '2026-10-04', remaining: 18 },
    { date: '2026-10-07', remaining: 7 },
  ],
};

const mockDetail: SeriesDetailDto = {
  id: 'series-demo-1',
  workspaceId: 'ws-demo',
  title: 'Neon Odyssey',
  readingDirection: 'RightToLeft',
  genre: 'Cyberpunk',
  format: 'Webtoon',
  storyArc: 'Arc 01: Tokyo Awakening',
  chaptersCount: 2,
  createdAt: '2026-09-15T00:00:00Z',
  chapters: [],
};

describe('DashboardView Component (UC-16 Progress Dashboard)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(seriesService.getSeriesMembers).mockResolvedValue([]);
  });

  const renderDashboard = (seriesId = 'series-demo-1') =>
    render(
      <MemoryRouter initialEntries={[`/workspaces/ws-demo/series/${seriesId}/dashboard`]}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/dashboard'
            element={<DashboardView />}
          />
        </Routes>
      </MemoryRouter>,
    );

  it('tải và render đầy đủ dữ liệu tiến độ thật từ API (KPIs, Chapters, Stage Matrix, Burndown, Workload)', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce(mockProgress);
    vi.mocked(seriesService.getSeriesById).mockResolvedValueOnce(mockDetail);

    renderDashboard();

    // Verify loading and then data display
    await waitFor(() => {
      expect(screen.getByTestId('series-title')).toHaveTextContent(/Tổng quan bộ truyện: Neon Odyssey/i);
    });

    // Header badges
    expect(screen.getByText('Arc 01: Tokyo Awakening')).toBeInTheDocument();
    expect(screen.getByText(/webtoon/i)).toBeInTheDocument();
    expect(screen.getByText(/cyberpunk/i)).toBeInTheDocument();

    // 4 Top KPIs
    expect(screen.getByText('Tiến Độ Toàn Series')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // avg (75 + 25) / 2
    expect(screen.getByText('Cổng Chờ Xét Duyệt')).toBeInTheDocument();
    expect(screen.getByText('Việc nộp')).toBeInTheDocument();
    expect(screen.getByText('Việc Quá Hạn & Rủi Ro')).toBeInTheDocument();

    // Overdue Alert Banner
    expect(screen.getByText(/Danh Sách Công Việc Quá Hạn \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Hoàn thiện spread trang 18-19')).toBeInTheDocument();

    // Chapters Progress List
    expect(screen.getByText(/Chương 1: Neon Awakening/i)).toBeInTheDocument();
    expect(screen.getAllByText('75%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Chương 2: Cyber Heist/i)).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();

    // Stage Matrix for Chapter 1 (default selected)
    expect(screen.getByText(/Tiến độ công đoạn · Chương 1/i)).toBeInTheDocument();
    expect(screen.getByText('Thumbnail')).toBeInTheDocument();
    expect(screen.getByText('Inking & Tone')).toBeInTheDocument();

    // Burndown Chart
    expect(screen.getByText(/Biểu Đồ Burndown/i)).toBeInTheDocument();
    expect(screen.getByText('Còn: 7 việc')).toBeInTheDocument();

    // Workload
    expect(screen.getAllByText('Kenji Sato').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Artist')).toBeInTheDocument();
  });

  it('chuyển đổi chương đang chọn để xem ma trận công đoạn tương ứng', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce(mockProgress);
    vi.mocked(seriesService.getSeriesById).mockResolvedValueOnce(mockDetail);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Chương 2: Cyber Heist/i)).toBeInTheDocument();
    });

    // Click on Chapter 2
    fireEvent.click(screen.getByText(/Chương 2: Cyber Heist/i));

    // Matrix updates to Chapter 2
    await waitFor(() => {
      expect(screen.getByText(/Tiến độ công đoạn · Chương 2/i)).toBeInTheDocument();
    });
  });

  it('mở modal Quản lý Chương khi Producer bấm nút hành động', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce(mockProgress);
    vi.mocked(seriesService.getSeriesById).mockResolvedValueOnce(mockDetail);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Quản Lý Chương (Duyệt)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Quản Lý Chương (Duyệt)'));

    expect(screen.getByTestId('series-chapters-modal')).toBeInTheDocument();
  });

  it('hiển thị thông báo lỗi và nút thử lại khi gọi API progress thất bại', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockRejectedValueOnce(
      new Error('Không có quyền truy cập Series này.'),
    );
    vi.mocked(seriesService.getSeriesById).mockResolvedValueOnce(mockDetail);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Không có quyền truy cập Series này.')).toBeInTheDocument();
    });

    expect(screen.getByText('Thử lại')).toBeInTheDocument();
  });

  it('mở modal Giao việc mới khi Producer bấm nút Giao việc trên thẻ chương', async () => {
    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce(mockProgress);
    vi.mocked(seriesService.getSeriesById).mockResolvedValueOnce(mockDetail);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByTitle(/Giao việc mới cho Chương 1/i)[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTitle(/Giao việc mới cho Chương 1/i)[0]);

    expect(screen.getByTestId('create-assignment-modal')).toBeInTheDocument();
  });

  it('hiển thị danh sách yêu cầu sửa đổi quá hạn (Change Requests) trên Dashboard', async () => {
    const progressWithOverdueCr: SeriesProgressDto = {
      ...mockProgress,
      chapters: [
        {
          ...mockProgress.chapters[0],
          overdueChangeRequests: 2,
        },
        ...mockProgress.chapters.slice(1),
      ],
      overdueChangeRequests: [
        {
          changeRequestId: 'cr-overdue-1',
          assignmentId: 'asg-overdue-1',
          chapterId: 'chap-1',
          responsibleUserId: 'user-kenji',
          responsibleUserName: 'Kenji Sato',
          status: 'Open',
          dueDate: '2026-10-02T00:00:00Z',
          description: 'Sửa lại chi tiết mắt nhân vật tại panel 3',
        },
      ],
    };

    vi.mocked(seriesService.getSeriesProgress).mockResolvedValueOnce(progressWithOverdueCr);
    vi.mocked(seriesService.getSeriesById).mockResolvedValueOnce(mockDetail);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Danh Sách Yêu Cầu Sửa Đổi Quá Hạn/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Sửa lại chi tiết mắt nhân vật tại panel 3')).toBeInTheDocument();
    expect(screen.getAllByText('Kenji Sato').length).toBeGreaterThan(0);
    expect(screen.getByText(/1 yêu cầu sửa/i)).toBeInTheDocument();
    expect(screen.getByText('Xem yêu cầu cần sửa')).toBeInTheDocument();

    // Nút gửi thông báo nhắc hạn
    const sendReminderBtn = screen.getByRole('button', { name: /Gửi thông báo nhắc hạn/i });
    expect(sendReminderBtn).toBeInTheDocument();
    fireEvent.click(sendReminderBtn);
    expect(notificationService.sendReminders).toHaveBeenCalled();
  });
});
