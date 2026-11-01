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
    getDesignQueue: vi.fn().mockResolvedValue([]),
    submitConceptArt: vi.fn().mockResolvedValue({}),
    endorseRevision: vi.fn().mockResolvedValue({}),
    requestReworkRevision: vi.fn().mockResolvedValue({}),
    addRevision: vi.fn().mockResolvedValue({}),
    getEntryHistory: vi.fn().mockResolvedValue([]),
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
    <img alt={alt} className={className} data-testid='auth-image' />
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
      JSON.stringify({ id: 'ws-1', currentUserRole: 'PRODUCER', isOwner: true }),
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
      'Tìm tên, mã hoặc mô tả trong Series Bible...',
    ) as HTMLInputElement;
    expect(searchInput).toBeDefined();

    // Click 'Nhân vật' tab
    const charTab = screen.getByTestId('tab-category-characters');
    fireEvent.click(charTab);

    // Placeholder updates for Character tab
    expect(screen.getByPlaceholderText('Tìm tên, mã hoặc mô tả nhân vật...')).toBeDefined();

    // Click 'Địa điểm & Bối cảnh' tab
    const locTab = screen.getByTestId('tab-category-locations');
    fireEvent.click(locTab);

    // Placeholder updates for Location tab
    expect(screen.getByPlaceholderText('Tìm tên, mã hoặc mô tả địa điểm...')).toBeDefined();
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

  it('allows Writer to create draft entries and add revisions (Direction B)', async () => {
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'WRITER', isOwner: false }),
    );

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });

    // Top button displays "Tạo mục nháp" instead of "Thêm mục mới" or read-only
    expect(screen.getByText('Tạo mục nháp')).toBeDefined();

    // Cards have "+ Bản" enabled for Writer
    const addRevBtns = screen.getAllByTestId(/add-revision-btn-/i);
    expect(addRevBtns.length).toBeGreaterThan(0);
  });

  it('restricts Artist from creating draft entries (Series Bible only created by Writer)', async () => {
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'ARTIST', isOwner: false }),
    );

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });

    // Shows read-only badge and no draft buttons
    expect(screen.getByTestId('bible-readonly-badge')).toBeDefined();
    expect(screen.queryByTestId('add-bible-entry-btn')).toBeNull();
    const addRevBtns = screen.queryAllByTestId(/add-revision-btn-/i);
    expect(addRevBtns.length).toBe(0);
  });

  it('restricts Editor to read-only mode without draft buttons (Direction B)', async () => {
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'EDITOR', isOwner: false }),
    );

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });

    // Shows read-only badge
    expect(screen.getByTestId('bible-readonly-badge')).toBeDefined();
    expect(screen.queryByTestId('add-bible-entry-btn')).toBeNull();

    // No "+ Bản" buttons on cards
    expect(screen.queryByTestId(/add-revision-btn-/i)).toBeNull();
  });

  it('displays stageName and chapter range Ch.from-to instead of raw v1/v2', async () => {
    const entriesWithStage = [
      {
        ...mockEntries[0],
        effectiveRevision: {
          ...mockEntries[0].effectiveRevision!,
          stageName: 'Lúc nhỏ',
          effectiveFromChapterNumber: 1,
          effectiveToChapterNumber: 19,
        },
      },
    ];

    (bibleService.getSeriesBible as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: entriesWithStage,
    });

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Tần Mục/)).toBeDefined();
    });

    // Header has name with stage: "Tần Mục · Lúc nhỏ"
    expect(screen.getByText(/· Lúc nhỏ/i)).toBeDefined();
    // Range format: "Ch.1–19"
    expect(screen.getByText(/Ch\.1–19/i)).toBeDefined();
  });

  it('renders "Nộp lại" button for Artist when entry has ConceptSubmitted revision', async () => {
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'ARTIST', isOwner: false }),
    );

    const entriesWithConcept = [
      {
        ...mockEntries[0],
        effectiveRevision: {
          ...mockEntries[0].effectiveRevision!,
          reviewStatus: 'ConceptSubmitted',
          isLocked: false,
        },
      },
    ];

    (bibleService.getSeriesBible as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: entriesWithConcept,
    });

    render(
      <SeriesBibleView
        activeProject={mockSeries as any}
        onShowToast={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Tần Mục/)).toBeDefined();
    });

    const resubmitBtn = screen.getByTestId('artist-resubmit-btn-entry-chr-1');
    expect(resubmitBtn).toBeDefined();
    expect(resubmitBtn.textContent).toContain('Nộp lại');

    fireEvent.click(resubmitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Nộp lại bản vẽ Concept Art \(Sửa nộp nhầm\)/i)).toBeDefined();
    });
  });

  it('opens LucianConfirmModal when Artist clicks submit concept art', async () => {
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'ARTIST', isOwner: false }),
    );

    const entriesWithConcept = [
      {
        ...mockEntries[0],
        effectiveRevision: {
          ...mockEntries[0].effectiveRevision!,
          reviewStatus: 'ConceptSubmitted',
          isLocked: false,
        },
      },
    ];

    (bibleService.getSeriesBible as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: entriesWithConcept,
    });

    render(
      <SeriesBibleView
        activeProject={mockSeries as any}
        onShowToast={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('artist-resubmit-btn-entry-chr-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('artist-resubmit-btn-entry-chr-1'));

    await waitFor(() => {
      expect(screen.getByTestId('save-revision-submit-btn')).not.toBeDisabled();
    });

    // Click submit button in AddRevisionModal
    fireEvent.click(screen.getByTestId('save-revision-submit-btn'));

    // Should display LucianConfirmModal
    await waitFor(() => {
      expect(screen.getByText('Xác nhận nộp lại bản vẽ Concept Art')).toBeDefined();
      expect(screen.getByText('Xác nhận nộp lại')).toBeDefined();
    });
  });
  it('cho phép cấu hình tạo Thời kỳ (Era) mới ngay trên giao diện sinh version', async () => {
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'PRODUCER', isOwner: true }),
    );

    (bibleService.getSeriesBible as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: mockEntries,
    });

    (bibleService.getEntryHistory as any).mockResolvedValue([
      {
        id: 'rev-1',
        versionNumber: 1,
        stageName: 'Giai đoạn chuẩn',
        effectiveFromChapterNumber: 1,
        isLocked: false,
        summary: 'Bản khởi tạo',
        snapshotJson: '{}',
      },
    ]);

    (bibleService.addRevision as any).mockResolvedValue({
      id: 'rev-2',
      versionNumber: 2,
      stageName: 'Thiếu niên',
      effectiveFromChapterNumber: 15,
      isLocked: false,
    });

    render(
      <SeriesBibleView
        activeProject={mockSeries as any}
        onShowToast={vi.fn()}
      />,
    );

    // Mở Workbench của nhân vật
    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Tần Mục'));

    // Mở modal tạo version
    await waitFor(() => {
      expect(screen.getByTestId('add-new-era-btn')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('add-new-era-btn'));

    // Kiểm tra khối Era trên modal sinh version
    await waitFor(() => {
      expect(screen.getByTestId('era-config-block')).toBeDefined();
      expect(screen.getByTestId('revision-stage-name-input')).toBeDefined();
    });

    // Nhập tên thời kỳ mới
    fireEvent.change(screen.getByTestId('revision-stage-name-input'), {
      target: { value: 'Thiếu niên' },
    });
    fireEvent.change(screen.getByTestId('revision-effective-from-input'), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByTestId('revision-summary-input'), {
      target: { value: 'Tạo thời kỳ thiếu niên cho nhân vật' },
    });

    // Bấm nút Lưu phiên bản & Tạo thời kỳ
    fireEvent.click(screen.getByTestId('save-revision-submit-btn'));

    await waitFor(() => {
      expect(bibleService.addRevision).toHaveBeenCalledWith(
        'series-123',
        mockEntries[0].id,
        expect.objectContaining({
          stageName: 'Thiếu niên',
          effectiveFromChapterNumber: 15,
          summary: 'Tạo thời kỳ thiếu niên cho nhân vật',
        }),
      );
    });
  });
});
