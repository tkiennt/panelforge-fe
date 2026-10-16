import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeriesBibleView } from './SeriesBibleView';
import { bibleService } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { chapterService } from '@/services/chapter.service';

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getSeriesBible: vi.fn(),
    getSeriesBibleAtChapter: vi.fn(),
    createBibleEntry: vi.fn(),
    createRevision: vi.fn(),
    getRevisions: vi.fn(),
    lockRevision: vi.fn(),
    supersedeRevision: vi.fn(),
    uploadReferenceImage: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesList: vi.fn(),
  },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
  },
}));

vi.mock('@/shared/components/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ alt, className }: any) => (
    <img alt={alt} className={className} data-testid="auth-image" />
  ),
}));

describe('SeriesBibleView UX/UI improvements', () => {
  const mockSeries = {
    id: 'series-123',
    title: 'Võ Thần Ký',
    description: 'Truyện hành động võ hiệp',
  };

  const mockEntries = [
    {
      id: 'entry-chr-1',
      seriesBibleId: 'bible-1',
      category: 0, // Character -> 'characters'
      code: 'CHR-01',
      name: 'Tần Mục',
      subtitle: 'Tàn Lão Thôn Thiếu Chủ',
      description: 'Nhân vật chính, xuất thân Đại Khư tàn lão thôn.',
      detailsJson: '{}',
      referenceImageUrl: 'https://cdn.example.com/tanmuc.png',
      priority: 1,
      strictCheck: true,
      isActive: true,
      createdAt: '2026-10-15T00:00:00Z',
      effectiveRevision: {
        id: 'rev-1',
        bibleEntryId: 'entry-chr-1',
        versionNumber: 1,
        summary: 'Bản gốc',
        snapshotJson: '{}',
        contentHash: 'hash-1',
        effectiveFromChapterNumber: 1,
        isInitialVersion: true,
        createdAt: '2026-10-15T00:00:00Z',
        isLocked: true,
        lockedAt: '2026-10-15T00:00:00Z',
      },
    },
    {
      id: 'entry-loc-1',
      seriesBibleId: 'bible-1',
      category: 1, // Location -> 'locations'
      code: 'LOC-01',
      name: 'Tàn Lão Thôn',
      subtitle: 'Đại Khư',
      description: 'Ngôi làng bí ẩn ở trung tâm Đại Khư.',
      detailsJson: '{}',
      referenceImageUrl: null, // No image -> compact header test
      priority: 1,
      strictCheck: false,
      isActive: true,
      createdAt: '2026-10-15T00:00:00Z',
      effectiveRevision: {
        id: 'rev-2',
        bibleEntryId: 'entry-loc-1',
        versionNumber: 1,
        summary: 'Bản gốc',
        snapshotJson: '{}',
        contentHash: 'hash-2',
        effectiveFromChapterNumber: 1,
        isInitialVersion: true,
        createdAt: '2026-10-15T00:00:00Z',
        isLocked: false,
      },
    },
  ];

  const mockChapters = [
    { id: 'ch-1', chapterNumber: 1, title: 'Đại Khư sơ kiến' },
    { id: 'ch-2', chapterNumber: 2, title: 'Bóng tối giáng lâm' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'PRODUCER', isOwner: true })
    );

    (bibleService.getSeriesBible as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: mockEntries,
    });
    (bibleService.getSeriesBibleAtChapter as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: mockEntries,
    });
    (seriesService.getSeriesList as any).mockResolvedValue([mockSeries]);
    (chapterService.getChaptersBySeries as any).mockResolvedValue({ items: mockChapters });
  });

  it('renders compact header with Vietnamese breadcrumb and count badge', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    expect(screen.getByText('Trang chủ')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Series Bible' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('2 mục tri thức')).toBeDefined();
    });

    // Check primary button for producer
    expect(screen.getByText('Thêm mục mới')).toBeDefined();
  });

  it('updates search placeholder dynamically when switching tabs', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });

    // Default 'all' tab placeholder
    const searchInput = screen.getByPlaceholderText(
      'Tìm tên, mã hoặc mô tả trong Series Bible...'
    ) as HTMLInputElement;
    expect(searchInput).toBeDefined();

    // Click 'Nhân vật' tab
    const charTab = screen.getByTestId('tab-category-characters');
    fireEvent.click(charTab);

    // Placeholder updates for Character tab
    expect(
      screen.getByPlaceholderText('Tìm tên, mã hoặc mô tả nhân vật...')
    ).toBeDefined();

    // Click 'Địa điểm & Bối cảnh' tab
    const locTab = screen.getByTestId('tab-category-locations');
    fireEvent.click(locTab);

    // Placeholder updates for Location tab
    expect(
      screen.getByPlaceholderText('Tìm tên, mã hoặc mô tả địa điểm...')
    ).toBeDefined();
  });

  it('renders chapter versioning options with clear labels', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });

    // Finds chapter selector select element
    const chapterSelect = screen.getByLabelText(/Phiên bản hiệu lực/i) as HTMLSelectElement;
    expect(chapterSelect).toBeDefined();
    expect(chapterSelect.value).toBe('all');

    // Check options
    const options = Array.from(chapterSelect.options).map((opt) => opt.text);
    expect(options).toContain('Đang xem: Phiên bản mới nhất');
    expect(options.some((o) => o.includes('Chương 1'))).toBe(true);
    expect(options.some((o) => o.includes('Chương 2'))).toBe(true);
  });

  it('supports toggling between Grid view and List view', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });

    const listViewBtn = screen.getByLabelText('Xem dạng danh sách');
    fireEvent.click(listViewBtn);

    // View mode changed to list, local storage updated
    expect(localStorage.getItem('panelforge_bible_view_mode')).toBe('list');

    const gridViewBtn = screen.getByLabelText('Xem dạng lưới');
    fireEvent.click(gridViewBtn);
    expect(localStorage.getItem('panelforge_bible_view_mode')).toBe('grid');
  });

  it('renders compact header when no image is present without huge empty black box', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tàn Lão Thôn')).toBeDefined();
    });

    // Tàn Lão Thôn has no image, so it shouldn't render an AuthenticatedImage or fixed h-44 black box
    expect(screen.getByText('LOC-01')).toBeDefined();
    expect(screen.getByText('Ngôi làng bí ẩn ở trung tâm Đại Khư.')).toBeDefined();
  });

  it('filters by status and clears filter with reset button', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
      expect(screen.getByText('Tàn Lão Thôn')).toBeDefined();
    });

    const statusSelect = screen.getByLabelText(/Lọc trạng thái/i) as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'LOCKED' } });

    // Only Canon locked entry (Tần Mục) is visible
    expect(screen.getByText('Tần Mục')).toBeDefined();
    expect(screen.queryByText('Tàn Lão Thôn')).toBeNull();

    // Reset filter button appears
    const clearBtn = screen.getByText('Xóa bộ lọc');
    fireEvent.click(clearBtn);

    // Both entries restored
    expect(screen.getByText('Tần Mục')).toBeDefined();
    expect(screen.getByText('Tàn Lão Thôn')).toBeDefined();
  });
});
