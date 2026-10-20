import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SideDrawer } from './SideDrawer';
import { assignmentService } from '@/services/assignment.service';
import type { BoardCard } from './pipelineBoard.types';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getSubmissions: vi.fn(),
    getChangeRequests: vi.fn(),
    getAssignments: vi.fn(),
    deleteAssignment: vi.fn(),
  },
}));

vi.mock('./useTaskThumbnail', () => ({
  useTaskThumbnail: () => ({ url: null, isFallback: true, label: 'Thumbnail' }),
}));

describe('SideDrawer - Prerequisite Tasks (Req 7)', () => {
  const mockCardWithDeps: BoardCard = {
    id: 'as-target-99',
    seriesId: 'series-1',
    chapterId: 'chap-1',
    entityType: 'Page',
    targetEntityId: 'page-2',
    targetLabel: 'Trang 2',
    pageNumber: 2,
    pipelineStageId: 'st-2',
    stageName: 'Thumbnail',
    stageOrder: 2,
    assigneeUserId: 'u-2',
    assigneeName: 'Trần Bình',
    assigneeAvatarInitials: 'TB',
    assignedRole: 'ARTIST' as any,
    brief: 'Vẽ phác thảo chi tiết trang 02',
    priority: 'Medium',
    status: 'Assigned',
    dependsOnAssignmentIds: ['as-prereq-01', 'as-prereq-02'],
    rawAssignment: {} as any,
  };

  const mockChapterAssignments = [
    {
      id: 'as-prereq-01',
      seriesId: 'series-1',
      chapterId: 'chap-1',
      brief: 'Kịch bản phân cảnh trang 02',
      stageName: 'Script',
      pipelineStageId: 'st-1',
      assigneeUserId: 'u-1',
      assignedRole: 'WRITER' as any,
      entityType: 'Page' as any,
      targetEntityId: 'page-2',
      status: 'Approved' as any,
      priority: 'High' as any,
      createdAt: '2026-10-01',
    },
    {
      id: 'as-prereq-02',
      seriesId: 'series-1',
      chapterId: 'chap-1',
      brief: 'Phác thảo layout bố cục tổng thể',
      stageName: 'Thumbnail',
      pipelineStageId: 'st-2',
      assigneeUserId: 'u-2',
      assignedRole: 'ARTIST' as any,
      entityType: 'Page' as any,
      targetEntityId: 'page-2',
      status: 'InProgress' as any,
      priority: 'Medium' as any,
      createdAt: '2026-10-02',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue([]);
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);
    vi.mocked(assignmentService.getAssignments).mockResolvedValue(mockChapterAssignments as any);
  });

  const renderSideDrawer = (card: BoardCard | null) => {
    return render(
      <MemoryRouter
        initialEntries={[
          '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&assignmentId=as-target-99',
        ]}
      >
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/workspace'
            element={<SideDrawer isOpen={true} onClose={vi.fn()} card={card} />}
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('hiển thị danh sách công việc tiền đề chi tiết kèm số lượng đã duyệt (1/2 đã duyệt)', async () => {
    renderSideDrawer(mockCardWithDeps);

    await waitFor(() => {
      expect(screen.getByText(/Cần hoàn thành trước · 1\/2 đã duyệt/i)).toBeInTheDocument();
    });

    // Thẻ việc 1 (Approved)
    expect(screen.getByText('Kịch bản phân cảnh trang 02')).toBeInTheDocument();
    expect(screen.getByText('Đã duyệt')).toBeInTheDocument();

    // Thẻ việc 2 (InProgress)
    expect(screen.getByText('Phác thảo layout bố cục tổng thể')).toBeInTheDocument();

    // Banner chờ việc chưa duyệt
    expect(screen.getByText(/Đang chờ:/i)).toBeInTheDocument();
    expect(screen.getByText(/được duyệt trước khi bắt đầu/i)).toBeInTheDocument();

    // Có nút Xem sơ đồ
    expect(screen.getByRole('button', { name: /Xem sơ đồ/i })).toBeInTheDocument();
  });

  it('khi tất cả công việc tiền đề đã duyệt, hiển thị banner đáp ứng điều kiện phụ thuộc', async () => {
    const allApprovedChapterAssignments = [
      mockChapterAssignments[0],
      {
        ...mockChapterAssignments[1],
        status: 'Approved' as any,
      },
    ];
    vi.mocked(assignmentService.getAssignments).mockResolvedValueOnce(
      allApprovedChapterAssignments as any,
    );

    renderSideDrawer(mockCardWithDeps);

    await waitFor(() => {
      expect(screen.getByText(/Cần hoàn thành trước · 2\/2 đã duyệt/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        /Tất cả công việc tiền đề đã được duyệt\. Đã đáp ứng điều kiện phụ thuộc\./i,
      ),
    ).toBeInTheDocument();
  });

  it('khi thiếu dữ liệu hoặc không tìm thấy việc tiền đề, hiển thị cảnh báo và không coi là đã duyệt', async () => {
    // Chỉ nạp được 1 việc, việc thứ 2 bị thiếu
    vi.mocked(assignmentService.getAssignments).mockResolvedValueOnce([
      mockChapterAssignments[0],
    ] as any);

    renderSideDrawer(mockCardWithDeps);

    await waitFor(() => {
      expect(screen.getByText(/Cần hoàn thành trước · 1\/2 đã duyệt/i)).toBeInTheDocument();
    });

    // Việc thứ 2 không tìm thấy
    expect(screen.getByText(/Không tìm thấy thông tin hoặc đã bị xoá/i)).toBeInTheDocument();
    expect(screen.getByText('Chưa xác nhận')).toBeInTheDocument();
  });

  it('mở modal sơ đồ DAG khi bấm nút "Xem sơ đồ"', async () => {
    renderSideDrawer(mockCardWithDeps);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Xem sơ đồ/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Xem sơ đồ/i }));

    expect(screen.getByText('Sơ Đồ Quan Hệ Phụ Thuộc')).toBeInTheDocument();
    expect(screen.getAllByText('Vẽ phác thảo chi tiết trang 02').length).toBeGreaterThan(1);
  });
});
