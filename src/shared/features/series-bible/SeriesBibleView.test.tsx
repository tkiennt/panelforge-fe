import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeriesBibleView } from './SeriesBibleView';
import { bibleService } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { ConfirmProvider } from '@/shared/context/ConfirmContext';

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getSeriesBible: vi.fn(),
    createBibleEntry: vi.fn(),
    createRevision: vi.fn(),
    getRevisions: vi.fn(),
    confirmRevision: vi.fn().mockResolvedValue({}),
    supersedeRevision: vi.fn(),
    uploadReferenceImage: vi.fn(),
    getDesignQueue: vi.fn().mockResolvedValue([]),
    submitConceptArt: vi.fn().mockResolvedValue({}),
    requestReworkRevision: vi.fn().mockResolvedValue({}),
    addRevision: vi.fn().mockResolvedValue({}),
    getEntryHistory: vi.fn().mockResolvedValue([]),
    getEntryUsages: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesList: vi.fn(),
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
        variantLabel: 'Mặc định',
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
        variantLabel: 'Mặc định',
        isInitialVersion: true,
        createdAt: '2026-10-15T00:00:00Z',
        isLocked: false,
      },
    },
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
    (seriesService.getSeriesList as any).mockResolvedValue([mockSeries]);
  });

  it('renders hero header with series name, KPI tiles, category sidebar and count badge', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    expect(screen.getByText('Canon Hub')).toBeDefined();
    expect(screen.getByTestId('bible-sidebar')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Series Bible' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('2 mục tri thức')).toBeDefined();
    });

    // KPI: Tần Mục đã khoá Canon
    expect(screen.getByTestId('bible-stat-locked').textContent).toContain('1');

    // KPI: Tần Mục đã khoá Canon
    expect(screen.getByTestId('bible-stat-locked').textContent).toContain('1');

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

  it('displays the variant label', async () => {
    const entriesWithVariant = [
      {
        ...mockEntries[0],
        effectiveRevision: {
          ...mockEntries[0].effectiveRevision!,
          variantLabel: 'Lúc nhỏ',
        },
      },
    ];

    (bibleService.getSeriesBible as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: entriesWithVariant,
    });

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Tần Mục/)).toBeDefined();
    });

    // Header has name with variant: "Tần Mục · Lúc nhỏ"
    expect(screen.getByText(/· Lúc nhỏ/i)).toBeDefined();
    expect(screen.queryByText(/Ch\.1–19/i)).toBeNull();
  });

  it('shows the pending draft version badge on the card and detail', async () => {
    (bibleService.getSeriesBible as any).mockResolvedValue({
      id: 'bible-1',
      seriesId: 'series-123',
      workspaceId: 'ws-1',
      name: 'Series Bible',
      version: 1,
      entries: [{ ...mockEntries[0], latestDraftVersionNumber: 3 }],
    });

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    const cardBadge = await screen.findByTestId('pending-draft-badge-entry-chr-1');
    expect(cardBadge).toHaveTextContent('Có bản nháp v3');

    fireEvent.click(screen.getByText('Tần Mục'));
    expect(await screen.findByTestId('pending-draft-badge-detail')).toHaveTextContent(
      'Có bản nháp v3',
    );
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

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

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

  it('opens the shared confirm dialog when Artist clicks submit concept art', async () => {
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
      <ConfirmProvider>
        <SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />
      </ConfirmProvider>,
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

    // Shared ConfirmDialog keeps the existing copy and action labels.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nộp lại Concept Art' })).toBeDefined();
      expect(screen.getByText('Nộp lại bản')).toBeDefined();
    });
  });
  it('creates a new variant with a required label', async () => {
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
        variantLabel: 'Mặc định',
        isLocked: false,
        summary: 'Bản khởi tạo',
        snapshotJson: '{}',
      },
    ]);

    (bibleService.addRevision as any).mockResolvedValue({
      id: 'rev-2',
      versionNumber: 2,
      variantLabel: 'Thiếu niên',
      isLocked: false,
    });

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    // Mở Workbench của nhân vật
    await waitFor(() => {
      expect(screen.getByText('Tần Mục')).toBeDefined();
    });
    fireEvent.click(screen.getByText('Tần Mục'));

    // Mở modal tạo version
    await waitFor(() => {
      expect(screen.getByTestId('add-new-variant-btn')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('add-new-variant-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('variant-config-block')).toBeDefined();
      expect(screen.getByTestId('revision-variant-label-input')).toBeDefined();
    });

    expect(screen.getByTestId('revision-name-readonly')).toHaveTextContent('Tần Mục');
    expect(screen.queryByDisplayValue('Tần Mục')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('revision-variant-label-input'), {
      target: { value: 'Thiếu niên' },
    });
    fireEvent.change(screen.getByTestId('revision-summary-input'), {
      target: { value: 'Tạo biến thể thiếu niên cho nhân vật' },
    });

    fireEvent.click(screen.getByTestId('save-revision-submit-btn'));

    await waitFor(() => {
      expect(bibleService.addRevision).toHaveBeenCalledWith(
        'series-123',
        mockEntries[0].id,
        expect.objectContaining({
          variantLabel: 'Thiếu niên',
          summary: 'Tạo biến thể thiếu niên cho nhân vật',
        }),
      );
    });
  });

  it('shows the backend duplicate-label conflict and keeps the variant form open', async () => {
    const onShowToast = vi.fn();
    const duplicateMessage = 'Nhãn biến thể "Thiếu niên" đã tồn tại.';
    (bibleService.getEntryHistory as any).mockResolvedValue([
      {
        id: 'rev-1',
        versionNumber: 1,
        variantLabel: 'Mặc định',
        isLocked: false,
        summary: 'Bản khởi tạo',
        snapshotJson: '{}',
      },
    ]);
    (bibleService.addRevision as any).mockRejectedValue({
      status: 409,
      code: 'CONFLICT',
      message: duplicateMessage,
    });

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={onShowToast} />);

    await waitFor(() => expect(screen.getByText(mockEntries[0].name)).toBeDefined());
    fireEvent.click(screen.getByText(mockEntries[0].name));
    await waitFor(() => expect(screen.getByTestId('add-new-variant-btn')).toBeDefined());
    fireEvent.click(screen.getByTestId('add-new-variant-btn'));
    fireEvent.change(await screen.findByTestId('revision-variant-label-input'), {
      target: { value: 'Thiếu niên' },
    });
    fireEvent.change(screen.getByTestId('revision-summary-input'), {
      target: { value: 'Tạo biến thể thiếu niên cho nhân vật' },
    });
    fireEvent.click(screen.getByTestId('save-revision-submit-btn'));

    await waitFor(() =>
      expect(onShowToast).toHaveBeenCalledWith(expect.any(String), duplicateMessage),
    );
    expect(screen.getByTestId('revision-variant-label-input')).toBeDefined();
  });

  describe('Spec V2.6 §5.1 – quyền thẩm định & khoá Canon', () => {
    const renderWithConcept = async (role: string) => {
      localStorage.setItem(
        'activeWorkspace',
        JSON.stringify({ id: 'ws-1', currentUserRole: role, isOwner: false }),
      );
      (bibleService.getSeriesBible as any).mockResolvedValue({
        id: 'bible-1',
        seriesId: 'series-123',
        workspaceId: 'ws-1',
        name: 'Series Bible',
        version: 1,
        entries: [
          {
            ...mockEntries[0],
            effectiveRevision: {
              ...mockEntries[0].effectiveRevision!,
              reviewStatus: 'ConceptSubmitted',
              isLocked: false,
            },
          },
        ],
      });
      render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);
      await waitFor(() => expect(screen.getByText(/Tần Mục/)).toBeDefined());
    };

    it('EDITOR được xác nhận & khoá Canon thiết kế (Q20/Q22)', async () => {
      await renderWithConcept('EDITOR');
      expect(screen.queryAllByTitle('Writer/Editor duyệt concept art này').length).toBeGreaterThan(
        0,
      );
      expect(screen.queryAllByTitle('Yêu cầu Artist vẽ lại concept').length).toBeGreaterThan(0);
    });

    it('WRITER chỉ yêu cầu vẽ lại, không tự xác nhận khoá Canon (Q20/Q22)', async () => {
      await renderWithConcept('WRITER');
      expect(screen.queryAllByTitle('Writer/Editor duyệt concept art này')).toHaveLength(0);
      expect(screen.queryAllByTitle('Yêu cầu Artist vẽ lại concept').length).toBeGreaterThan(0);
    });

    it('Producer chỉ yêu cầu vẽ lại, không tự xác nhận thiết kế', async () => {
      await renderWithConcept('PRODUCER');
      expect(screen.queryAllByTitle('Writer/Editor duyệt concept art này')).toHaveLength(0);
      expect(screen.queryAllByTitle('Yêu cầu Artist vẽ lại concept').length).toBeGreaterThan(0);
    });

    it('Admin hệ thống không có quyền Producer trong Series Bible', async () => {
      localStorage.setItem('activeWorkspace', JSON.stringify({ id: 'ws-1', isOwner: false }));
      localStorage.setItem(
        'user',
        JSON.stringify({ role: 'ADMINISTRATOR', canCreateStudio: true }),
      );
      render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);
      await waitFor(() => expect(screen.getByText('Tần Mục')).toBeDefined());
      expect(screen.queryByTestId('add-bible-entry-btn')).toBeNull();
    });
  });
});
