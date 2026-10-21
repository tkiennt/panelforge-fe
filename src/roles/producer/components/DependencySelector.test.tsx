import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DependencySelector } from './DependencySelector';
import type { AssignmentDto } from '@/services/assignment.service';
import type { PipelineStageDto } from '@/services/pipeline.service';
import type { PageDto } from '@/services/page.service';
import type { SeriesMemberDto } from '@/services/series.service';

describe('DependencySelector Component', () => {
  const mockStages: PipelineStageDto[] = [
    {
      id: 'st-script',
      name: 'Script',
      slug: 'script',
      stageOrder: 1,
      allowedRole: 'Writer',
      isApprovalGate: false,
      isInitial: true,
      isTerminal: false,
    },
    {
      id: 'st-thumb',
      name: 'Thumbnail',
      slug: 'thumb',
      stageOrder: 2,
      allowedRole: 'Artist',
      isApprovalGate: false,
      isInitial: false,
      isTerminal: false,
    },
    {
      id: 'st-ink',
      name: 'Inking',
      slug: 'ink',
      stageOrder: 3,
      allowedRole: 'Artist',
      isApprovalGate: false,
      isInitial: false,
      isTerminal: false,
    },
  ];

  const mockPages: PageDto[] = [
    {
      id: 'page-1',
      chapterId: 'chap-1',
      pageNumber: 1,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    },
    {
      id: 'page-2',
      chapterId: 'chap-1',
      pageNumber: 2,
      layoutFormat: 'StandardPage',
      widthPx: 1200,
      heightPx: 1800,
      dpi: 600,
      elementsCount: 0,
    },
  ];

  const mockMembers: SeriesMemberDto[] = [
    {
      id: 'u-1',
      userId: 'u-1',
      seriesId: 'series-1',
      fullName: 'Nguyễn An',
      email: 'an@panelforge.app',
      studioRole: 'WRITER',
      seriesRole: 'WRITER',
      joinedAt: '2026-10-01',
    },
    {
      id: 'u-2',
      userId: 'u-2',
      seriesId: 'series-1',
      fullName: 'Trần Bình',
      email: 'binh@panelforge.app',
      studioRole: 'ARTIST',
      seriesRole: 'ARTIST',
      joinedAt: '2026-10-01',
    },
  ];

  const mockAssignments: AssignmentDto[] = [
    {
      id: 'as-1',
      chapterId: 'chap-1',
      seriesId: 'series-1',
      brief: 'Kịch bản trang 01',
      entityType: 'Page',
      targetEntityId: 'page-1',
      pipelineStageId: 'st-script',
      assigneeUserId: 'u-1',
      assignedRole: 'WRITER' as any,
      status: 'Approved' as any,
      priority: 'High',
      dependsOnAssignmentIds: [],
      createdAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'as-2',
      chapterId: 'chap-1',
      seriesId: 'series-1',
      brief: 'Vẽ phác thảo trang 01',
      entityType: 'Page',
      targetEntityId: 'page-1',
      pipelineStageId: 'st-thumb',
      assigneeUserId: 'u-2',
      assignedRole: 'ARTIST' as any,
      status: 'InProgress' as any,
      priority: 'Medium',
      dependsOnAssignmentIds: ['as-1'],
      createdAt: '2026-10-02T00:00:00Z',
    },
    {
      id: 'as-3',
      chapterId: 'chap-1',
      seriesId: 'series-1',
      brief: 'Kịch bản trang 02',
      entityType: 'Page',
      targetEntityId: 'page-2',
      pipelineStageId: 'st-script',
      assigneeUserId: 'u-1',
      assignedRole: 'WRITER' as any,
      status: 'Approved' as any,
      priority: 'Medium',
      dependsOnAssignmentIds: [],
      createdAt: '2026-10-01T00:00:00Z',
    },
    {
      id: 'as-4',
      chapterId: 'chap-1',
      seriesId: 'series-1',
      brief: 'Lên nét trang 02',
      entityType: 'Page',
      targetEntityId: 'page-2',
      pipelineStageId: 'st-ink',
      assigneeUserId: 'u-2',
      assignedRole: 'ARTIST' as any,
      status: 'Draft' as any,
      priority: 'Low',
      dependsOnAssignmentIds: [],
      createdAt: '2026-10-03T00:00:00Z',
    },
  ];

  it('hiển thị nhãn "Cần hoàn thành trước · Không bắt buộc" và mô tả chuẩn xác', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Cần hoàn thành trước · Không bắt buộc')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Chọn những công việc phải được duyệt trước khi công việc này có thể bắt đầu.',
      ),
    ).toBeInTheDocument();
  });

  it('nhóm "Gợi ý liên quan" ưu tiên công việc cùng trang và giai đoạn trước trong pipeline', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        currentPageId='page-1'
        currentStageId='st-thumb' // Thumbnail -> Stage trước là Script
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );

    // Có phần Gợi ý liên quan
    expect(screen.getByText(/Gợi ý liên quan/i)).toBeInTheDocument();
    // Badge lý do
    expect(screen.getByText(/Cùng trang 1 · Giai đoạn trước trong pipeline/i)).toBeInTheDocument();
    // Có phần Các công việc khác
    expect(screen.getByText(/Các công việc khác/i)).toBeInTheDocument();
  });

  it('cho phép chọn công việc khi bấm vào hàng và gọi onChange với ID tương ứng', () => {
    const handleChange = vi.fn();
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={[]}
        onChange={handleChange}
      />,
    );

    const taskRow = screen.getByTestId('dep-item-as-1');
    expect(taskRow).toBeInTheDocument();
    fireEvent.click(taskRow);
    expect(handleChange).toHaveBeenCalledWith(['as-1']);
  });

  it('nút "Xem chi tiết ↗" có preventDefault, không kích hoạt chọn checkbox', () => {
    const handleChange = vi.fn();
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={[]}
        onChange={handleChange}
      />,
    );

    const detailButtons = screen.getAllByRole('button', { name: /Xem chi tiết/i });
    expect(detailButtons.length).toBeGreaterThan(0);

    // Click vào nút xem chi tiết
    fireEvent.click(detailButtons[0]);
    // handleChange KHÔNG được gọi
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('hiển thị khu vực "Đã chọn (N)" và nút xóa item gọi onChange với danh sách mới', () => {
    const handleChange = vi.fn();
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={['as-1', 'as-2']}
        onChange={handleChange}
      />,
    );

    expect(screen.getByText(/Đã chọn \(2\)/i)).toBeInTheDocument();

    const removeBtn = screen.getByRole('button', {
      name: /Bỏ chọn công việc Kịch bản trang 01/i,
    });
    expect(removeBtn).toBeInTheDocument();
    fireEvent.click(removeBtn);

    expect(handleChange).toHaveBeenCalledWith(['as-2']);
  });

  it('tính toán và hiển thị đúng banner tóm tắt ảnh hưởng khi chưa chọn gì', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Chưa chọn công việc cần hoàn thành trước.')).toBeInTheDocument();
  });

  it('tính toán và hiển thị đúng banner ảnh hưởng khi có công việc chưa duyệt (không nói "Có thể bắt đầu ngay")', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={['as-1', 'as-2']} // as-1 Approved, as-2 InProgress
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Đã chọn 2 công việc · 1 đã duyệt · 1 chưa duyệt/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Vẽ phác thảo trang 01/).length).toBeGreaterThan(0);
    expect(screen.getByText(/được duyệt trước khi bắt đầu/)).toBeInTheDocument();
    expect(screen.queryByText(/Có thể bắt đầu ngay/i)).not.toBeInTheDocument();
  });

  it('hiển thị đúng banner khi tất cả đã duyệt ("Điều kiện phụ thuộc đã được đáp ứng")', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={['as-1', 'as-3']} // cả 2 đều Approved
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        /Các công việc được chọn đều đã duyệt\. Điều kiện phụ thuộc đã được đáp ứng\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Có thể bắt đầu ngay/i)).not.toBeInTheDocument();
  });

  it('giữ nguyên lựa chọn khi tìm kiếm theo từ khóa', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={['as-1']}
        onChange={vi.fn()}
      />,
    );

    // Gõ tìm kiếm một việc khác không phải as-1
    const searchInput = screen.getByPlaceholderText(/Tìm theo tên công việc, mã hoặc trang…/i);
    fireEvent.change(searchInput, { target: { value: 'phác thảo' } });

    // as-1 vẫn nằm trong khu vực "Đã chọn (1)"
    expect(screen.getByText(/Đã chọn \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Kịch bản trang 01')).toBeInTheDocument();
  });

  it('mở modal sơ đồ phụ thuộc khi nhấn "Xem sơ đồ phụ thuộc"', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={['as-1']}
        onChange={vi.fn()}
      />,
    );

    const graphBtn = screen.getByRole('button', { name: /Xem sơ đồ phụ thuộc/i });
    expect(graphBtn).toBeInTheDocument();

    fireEvent.click(graphBtn);

    // Modal sơ đồ xuất hiện
    expect(screen.getByText('Sơ Đồ Quan Hệ Phụ Thuộc')).toBeInTheDocument();
    expect(screen.getByText('Công việc đang tạo')).toBeInTheDocument();
  });

  it('không cho phép chọn chính công việc đang chỉnh sửa (self-dependency prevention)', () => {
    render(
      <DependencySelector
        workspaceId='ws-1'
        seriesId='series-1'
        chapterId='chap-1'
        chapterNumber={1}
        currentAssignmentId='as-1' // Đang sửa chính as-1
        stages={mockStages}
        pages={mockPages}
        members={mockMembers}
        existingAssignments={mockAssignments}
        selectedIds={[]}
        onChange={vi.fn()}
      />,
    );

    // as-1 không được hiển thị trong danh sách để chọn
    expect(screen.queryByTestId('dep-item-as-1')).not.toBeInTheDocument();
  });
});
