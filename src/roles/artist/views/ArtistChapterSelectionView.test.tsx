import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArtistChapterSelectionView } from './ArtistChapterSelectionView';
import { chapterService, ChapterDto } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';

const mockedNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
  },
}));

const MOCK_CHAPTERS: ChapterDto[] = [
  {
    id: 'chap-1',
    seriesId: 'ser-1',
    chapterNumber: 1,
    title: 'Khởi đầu hành trình',
    outline: 'Nhân vật chính nhận lời mời tham gia võ đài.',
    scenesCount: 5,
    pagesCount: 20,
    status: 'InProduction',
    isScriptFrozen: true,
    scriptContentHash: 'abc1234567890',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    versionVector: 1,
  },
  {
    id: 'chap-2',
    seriesId: 'ser-1',
    chapterNumber: 2,
    title: 'Cuộc gặp gỡ định mệnh',
    outline: 'Đối đầu với đối thủ đầu tiên tại quảng trường.',
    scenesCount: 3,
    pagesCount: 18,
    status: 'InProduction',
    isScriptFrozen: false,
    createdAt: '2026-01-03T00:00:00Z',
    versionVector: 1,
  },
  {
    id: 'chap-3',
    seriesId: 'ser-1',
    chapterNumber: 3,
    title: 'Bí mật hoàng gia',
    outline: 'Tiết lộ bí mật về hoàng đế cũ.',
    scenesCount: 4,
    pagesCount: 22,
    status: 'Approved',
    isScriptFrozen: true,
    scriptContentHash: 'def9876543210',
    createdAt: '2026-01-04T00:00:00Z',
    versionVector: 1,
  },
];

describe('ArtistChapterSelectionView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (seriesService.getSeriesById as any).mockResolvedValue({
      id: 'ser-1',
      title: 'Kiếm Sĩ Phương Đông',
      synopsis: 'Manga về kiếm sĩ viễn đông.',
    });
    (chapterService.getChaptersBySeries as any).mockResolvedValue(MOCK_CHAPTERS);
  });

  const renderComponent = (seriesId = 'ser-1', workspaceId = 'ws-1') => {
    return render(
      <MemoryRouter initialEntries={[`/workspaces/${workspaceId}/series/${seriesId}/artist`]}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/artist'
            element={<ArtistChapterSelectionView />}
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('renders series header and KPI stats correctly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Bàn vẽ họa sĩ — Kiếm Sĩ Phương Đông')).toBeInTheDocument();
    });

    expect(screen.getByTestId('artist-stats-total')).toHaveTextContent('3');
    expect(screen.getByTestId('artist-stats-frozen')).toHaveTextContent('2');
    expect(screen.getByTestId('artist-stats-in-progress')).toHaveTextContent('1');
  });

  it('renders chapter cards with status badges and details in grid view', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('artist-chapter-card-1')).toBeInTheDocument();
    });

    const card1 = screen.getByTestId('artist-chapter-card-1');
    expect(card1).toHaveTextContent('CHƯƠNG 1');
    expect(card1).toHaveTextContent('Khởi đầu hành trình');
    expect(card1).toHaveTextContent('20 trang');
    expect(card1).toHaveTextContent('Kịch bản đã chốt');
    expect(card1).toHaveTextContent('#abc12345');
    expect(card1).toHaveTextContent('Sẵn sàng vẽ');

    const card2 = screen.getByTestId('artist-chapter-card-2');
    expect(card2).toHaveTextContent('CHƯƠNG 2');
    expect(card2).toHaveTextContent('Cuộc gặp gỡ định mệnh');
    expect(card2).toHaveTextContent('18 trang');
    expect(card2).toHaveTextContent('Đang sản xuất');
    expect(card2).toHaveTextContent('Chưa chốt kịch bản');
  });

  it('filters chapters when clicking filter tabs', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('artist-chapter-card-1')).toBeInTheDocument();
    });

    // Click "Sẵn sàng vẽ" filter
    fireEvent.click(screen.getByTestId('artist-filter-frozen'));
    expect(screen.getByTestId('artist-chapter-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('artist-chapter-card-3')).toBeInTheDocument();
    expect(screen.queryByTestId('artist-chapter-card-2')).not.toBeInTheDocument();

    // Click "Đang sản xuất" filter
    fireEvent.click(screen.getByTestId('artist-filter-in-progress'));
    expect(screen.getByTestId('artist-chapter-card-2')).toBeInTheDocument();
    expect(screen.queryByTestId('artist-chapter-card-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist-chapter-card-3')).not.toBeInTheDocument();

    // Reset to "Tất cả"
    fireEvent.click(screen.getByTestId('artist-filter-all'));
    expect(screen.getByTestId('artist-chapter-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('artist-chapter-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('artist-chapter-card-3')).toBeInTheDocument();
  });

  it('searches chapters by title or outline', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('artist-chapter-card-1')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('artist-chapter-search-input');
    fireEvent.change(searchInput, { target: { value: 'quảng trường' } });

    expect(screen.getByTestId('artist-chapter-card-2')).toBeInTheDocument();
    expect(screen.queryByTestId('artist-chapter-card-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('artist-chapter-card-3')).not.toBeInTheDocument();
  });

  it('navigates to standalone FocusWorkspaceLayout desk when a chapter is clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('artist-enter-desk-btn-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('artist-enter-desk-btn-1'));

    expect(mockedNavigate).toHaveBeenCalledWith(
      '/workspaces/ws-1/series/ser-1/artist/desk?chapterId=chap-1',
    );
  });

  it('switches between Grid and Table view', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('artist-chapters-grid')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('artist-view-table'));
    expect(screen.getByTestId('artist-chapters-table')).toBeInTheDocument();
    expect(screen.getByTestId('artist-chapter-row-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('artist-view-grid'));
    expect(screen.getByTestId('artist-chapters-grid')).toBeInTheDocument();
  });

  it('renders empty state when no chapters exist', async () => {
    (chapterService.getChaptersBySeries as any).mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId('artist-chapters-empty')).toBeInTheDocument();
    });
    expect(screen.getByText('Chưa có chương nào trong bộ truyện')).toBeInTheDocument();
  });
});
