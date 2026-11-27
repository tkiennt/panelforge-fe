import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExportView } from './ExportView';
import { chapterService } from '@/services/chapter.service';
import { exportService, ExportJobDto } from '@/services/export.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: { getChaptersBySeries: vi.fn(), handOffChapter: vi.fn() },
}));

vi.mock('@/services/export.service', () => ({
  exportService: {
    createExport: vi.fn(),
    getExports: vi.fn(),
    cancelExport: vi.fn(),
    downloadExport: vi.fn(),
  },
}));

const job = (id: string, status: ExportJobDto['status'], format = 'PDF'): ExportJobDto => ({
  id,
  chapterId: 'chap-2',
  format,
  status,
  requestedByUserId: 'u-1',
  chapterVersion: 3,
  pageCount: 12,
  fileName: status === 'Completed' ? 'Den bien - Chuong 2.pdf' : null,
  sizeBytes: status === 'Completed' ? 2_500_000 : null,
  error: status === 'Failed' ? 'Ảnh trang 4 hỏng hoặc không đọc được.' : null,
  createdAt: '2026-10-13T06:00:00Z',
  downloadCount: 0,
});

const renderView = (
  onShowToast = vi.fn(),
  initialUrl = '/workspaces/ws-1/series/series-1/export',
) =>
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/export'
          element={<ExportView onShowToast={onShowToast} />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ExportView (UC-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chapterService.getChaptersBySeries as any).mockResolvedValue({
      items: [
        { id: 'chap-1', chapterNumber: 1, status: 'InProduction' },
        { id: 'chap-2', chapterNumber: 2, title: 'Bão', status: 'ChapterApproved' },
        { id: 'chap-3', chapterNumber: 3, status: 'HandedOffAndPublished' },
      ],
    });
    (exportService.getExports as any).mockResolvedValue([]);
  });

  it('liệt kê mọi chương trong bộ chọn, mặc định chọn chương sẵn sàng đầu tiên và xếp hàng mỗi định dạng đã chọn', async () => {
    (exportService.createExport as any).mockResolvedValue(job('j-1', 'Queued'));

    renderView();

    const select = await screen.findByTestId('export-chapter-select');
    await waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(3));
    expect(select).toHaveValue('chap-2');

    fireEvent.click(screen.getByTestId('export-format-CBZ'));
    fireEvent.click(screen.getByTestId('export-submit'));

    await waitFor(() => {
      expect(exportService.createExport).toHaveBeenCalledWith('chap-2', 'PDF');
      expect(exportService.createExport).toHaveBeenCalledWith('chap-2', 'CBZ');
    });
  });

  it('P1-3: tôn trọng chapterId trên URL ngay cả khi chương đang InProduction, hiện lý do và vô hiệu nút tạo gói', async () => {
    renderView(vi.fn(), '/workspaces/ws-1/series/series-1/export?chapterId=chap-1');

    expect(await screen.findByTestId('export-no-chapter')).toBeInTheDocument();
    expect(screen.getByTestId('export-chapter-select')).toHaveValue('chap-1');
    expect(screen.getByTestId('export-not-eligible-reason')).toBeInTheDocument();
    expect(screen.getByTestId('export-goto-overview')).toBeInTheDocument();
    expect(screen.getByTestId('export-goto-board')).toBeInTheDocument();
    expect(screen.getByTestId('export-submit')).toBeDisabled();
    expect(exportService.getExports).not.toHaveBeenCalled();
  });

  it('hiện trạng thái, lỗi; tải bản xong và huỷ bản đang chờ', async () => {
    const done = job('j-done', 'Completed');
    (exportService.getExports as any).mockResolvedValue([
      done,
      job('j-wait', 'Queued', 'CBZ'),
      job('j-fail', 'Failed', 'WEBTOON'),
    ]);
    (exportService.downloadExport as any).mockResolvedValue(undefined);
    (exportService.cancelExport as any).mockResolvedValue(job('j-wait', 'Cancelled', 'CBZ'));

    renderView();

    expect(await screen.findByText('Ảnh trang 4 hỏng hoặc không đọc được.')).toBeInTheDocument();
    expect(screen.getByText('2.4 MB')).toBeInTheDocument();
    expect(screen.queryByTestId('export-download-j-wait')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('export-download-j-done'));
    fireEvent.click(screen.getByTestId('export-cancel-j-wait'));

    await waitFor(() => {
      expect(exportService.downloadExport).toHaveBeenCalledWith('chap-2', done);
      expect(exportService.cancelExport).toHaveBeenCalledWith('chap-2', 'j-wait');
    });
  });

  it('series chưa có chương đã duyệt thì báo, không cho xuất', async () => {
    (chapterService.getChaptersBySeries as any).mockResolvedValue({
      items: [{ id: 'chap-1', chapterNumber: 1, status: 'InProduction' }],
    });

    renderView();

    expect(await screen.findByTestId('export-no-chapter')).toBeInTheDocument();
    expect(screen.getByTestId('export-submit')).toBeDisabled();
  });

  it('D1: Producer bàn giao chương ChapterApproved cho Publisher sau khi xác nhận', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    (chapterService.handOffChapter as any).mockResolvedValue({ action: 'ProducerHandedOff' });

    renderView();

    fireEvent.click(await screen.findByTestId('handoff-submit'));

    await waitFor(() => expect(chapterService.handOffChapter).toHaveBeenCalledWith('chap-2'));
    expect(await screen.findByTestId('handoff-done')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-submit')).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('D1: huỷ xác nhận thì không bàn giao', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderView();

    fireEvent.click(await screen.findByTestId('handoff-submit'));
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(chapterService.handOffChapter).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('D1: chương đã bàn giao hiện nhãn, không hiện nút bàn giao', async () => {
    (chapterService.getChaptersBySeries as any).mockResolvedValue({
      items: [
        {
          id: 'chap-2',
          chapterNumber: 2,
          status: 'ChapterApproved',
          isHandedOff: true,
          handedOffAt: '2026-11-25T03:54:57Z',
        },
      ],
    });

    renderView();

    expect(await screen.findByTestId('handoff-done')).toBeInTheDocument();
    expect(screen.queryByTestId('handoff-submit')).not.toBeInTheDocument();
  });
});
