import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { pageService } from '@/services/page.service';
import { PageHistoryPanel } from './PageHistoryPanel';

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
    getPageHistory: vi.fn(),
    comparePageVersions: vi.fn(),
    restorePageVersion: vi.fn(),
  },
}));

const history = (current: number) => ({
  pageId: 'p1',
  currentVersion: current,
  page: 1,
  pageSize: 100,
  totalCount: current,
  items: Array.from({ length: current }, (_, i) => current - i).map((v) => ({
    version: v,
    eventType: v === 1 ? 'PageCreated' : 'ElementMoved',
    elementId: v === 1 ? null : 'e1',
    actorUserId: v === 1 ? null : 'u1',
    actorName: v === 1 ? null : 'Họa sĩ An',
    occurredAtUtc: '2026-10-20T03:00:00Z',
    summary: v === 1 ? 'Tạo trang 1' : `Di chuyển bóng lần ${v}`,
  })),
});

const renderPanel = (role: string) => render(<PageHistoryPanel chapterId='c1' viewerRole={role} />);

describe('PageHistoryPanel (CF4 4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      { id: 'p1', chapterId: 'c1', pageNumber: 1 } as any,
    ]);
    vi.mocked(pageService.getPageHistory).mockResolvedValue(history(3));
  });

  it('lists canvas events newest first with actor', async () => {
    renderPanel('Artist');

    expect(await screen.findByText('Di chuyển bóng lần 3')).toBeInTheDocument();
    expect(screen.getByText('Phiên bản hiện tại: v3')).toBeInTheDocument();
    expect(screen.getAllByText(/Họa sĩ An/)).toHaveLength(2);
    expect(screen.getByTestId('page-event-1')).toHaveTextContent('Hệ thống');
    expect(pageService.getPageHistory).toHaveBeenCalledWith('p1', 1, 100);
  });

  it('compares an old version with the current one', async () => {
    vi.mocked(pageService.comparePageVersions).mockResolvedValue({
      pageId: 'p1',
      left: 1,
      right: 3,
      canvasChanged: false,
      added: 1,
      removed: 0,
      modified: 0,
      elements: [
        {
          elementId: 'e1aaaaaa-0000',
          elementType: 'SPEECH_BALLOON',
          change: 'Added',
          changedFields: [],
        },
      ],
    });
    renderPanel('Writer');
    await screen.findByText('Tạo trang 1');

    await userEvent.click(screen.getAllByRole('button', { name: /So với hiện tại/ })[1]);

    expect(pageService.comparePageVersions).toHaveBeenCalledWith('p1', 1, 3);
    expect(await screen.findByTestId('page-compare')).toHaveTextContent('+1 / −0 / ~0');
    expect(screen.getByText('SPEECH_BALLOON')).toBeInTheDocument();
    // Writer chỉ xem, không khôi phục
    expect(screen.queryByRole('button', { name: /Khôi phục/ })).not.toBeInTheDocument();
  });

  it('restores with the current version as expectedPageVersion and reloads', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(pageService.restorePageVersion).mockResolvedValue({
      pageId: 'p1',
      restoredFromVersion: 2,
      newVersion: 4,
      changes: 1,
    });
    renderPanel('Producer');
    await screen.findByText('Di chuyển bóng lần 2');

    await userEvent.click(screen.getAllByRole('button', { name: /Khôi phục/ })[0]);

    expect(pageService.restorePageVersion).toHaveBeenCalledWith('p1', 2, 3);
    expect(await screen.findByText(/Đã khôi phục về v2/)).toBeInTheDocument();
    expect(pageService.getPageHistory).toHaveBeenCalledTimes(2);
  });

  it('on 409 CONFLICT shows a reload message instead of re-sending', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(pageService.restorePageVersion).mockRejectedValue(
      Object.assign(new Error('Xung đột phiên bản'), { code: 'CONFLICT', status: 409 }),
    );
    renderPanel('Artist');
    await screen.findByText('Di chuyển bóng lần 2');

    await userEvent.click(screen.getAllByRole('button', { name: /Khôi phục/ })[0]);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('vừa được người khác sửa'),
    );
    expect(pageService.restorePageVersion).toHaveBeenCalledTimes(1);
    expect(pageService.getPageHistory).toHaveBeenCalledTimes(2);
  });
});
