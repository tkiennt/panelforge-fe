import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkspaceView } from './WorkspaceView';
import { chapterService } from '@/services/chapter.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
  },
}));

vi.mock('@/shared/features/pipeline-board/ProductionBoard', () => ({
  ProductionBoard: ({
    chapterId,
    refreshKey,
    isProducer,
    currentUserId,
  }: {
    chapterId?: string;
    refreshKey?: number;
    isProducer?: boolean;
    currentUserId?: string;
  }) => (
    <div data-testid='production-board-mock'>
      <span>Board chapter: {chapterId}</span>
      <span>Refresh: {refreshKey}</span>
      <span>Producer: {String(isProducer)}</span>
      <span>User: {currentUserId}</span>
    </div>
  ),
}));

describe('WorkspaceView (Quy trình sản xuất)', () => {
  const mockChapters = [
    {
      id: 'chap-1',
      seriesId: 'series-1',
      chapterNumber: 1,
      title: 'Chương 1: Khởi đầu cuộc hành trình',
      status: 'InProduction',
      versionVector: 1,
      scenesCount: 2,
      pagesCount: 15,
      createdAt: '2026-10-08T00:00:00Z',
    },
    {
      id: 'chap-2',
      seriesId: 'series-1',
      chapterNumber: 2,
      title: 'Đối đầu',
      status: 'Approved',
      versionVector: 2,
      scenesCount: 3,
      pagesCount: 20,
      createdAt: '2026-10-08T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: mockChapters as any,
      totalCount: 2,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });
  });

  const renderComponent = (props: Partial<Parameters<typeof WorkspaceView>[0]> = {}) =>
    render(
      <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-1/workspace']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/workspace'
            element={<WorkspaceView currentUserRole='PRODUCER' onShowToast={vi.fn()} {...props} />}
          />
        </Routes>
      </MemoryRouter>,
    );

  it('hiển thị tiêu đề, chương (không lặp tiền tố), trạng thái chương và truyền chương cho bảng', async () => {
    renderComponent({ currentUserId: 'u-1' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Quy trình sản xuất' }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Chương 1: Khởi đầu cuộc hành trình')).toBeInTheDocument();
      expect(screen.getByText('Đang sản xuất')).toBeInTheDocument();
      expect(screen.getByText('Board chapter: chap-1')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Chương 1: Chương 1/)).not.toBeInTheDocument();
    expect(screen.getByText('Producer: true')).toBeInTheDocument();
    expect(screen.getByText('User: u-1')).toBeInTheDocument();
  });

  it('đổi chương truyền đúng chapterId; làm mới tăng refreshKey thay vì remount', async () => {
    renderComponent();
    await waitFor(() => expect(screen.getByText('Board chapter: chap-1')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Chương:'), { target: { value: 'chap-2' } });
    await waitFor(() => expect(screen.getByText('Board chapter: chap-2')).toBeInTheDocument());
    expect(screen.getByText('Đã duyệt chương')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Làm mới dữ liệu' }));
    await waitFor(() => expect(screen.getByText('Refresh: 1')).toBeInTheDocument());
  });

  it('chặn quyền truy cập đối với độc giả (READER mode)', () => {
    renderComponent({ isReaderMode: true });
    expect(screen.getByText('Khu Vực Sản Xuất Giới Hạn')).toBeInTheDocument();
    expect(screen.queryByTestId('production-board-mock')).not.toBeInTheDocument();
  });

  it('vai không phải Producer (WRITER) được đánh dấu để bảng chọn mặc định "Cần tôi xử lý"', async () => {
    renderComponent({ currentUserRole: 'WRITER' });
    await waitFor(() => expect(screen.getByText('Producer: false')).toBeInTheDocument());
  });
});
