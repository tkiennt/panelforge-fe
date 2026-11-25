import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SeriesBibleView } from './SeriesBibleView';
import { bibleService } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { aiAgentsService, AiApiError } from '@/services/aiAgents.service';
import { ConfirmProvider } from '@/shared/context/ConfirmContext';

const render = (ui: React.ReactElement, options?: any) =>
  rtlRender(ui, { wrapper: MemoryRouter, ...options });

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getSeriesBible: vi.fn(),
    createBibleEntry: vi.fn(),
    defineBibleEntry: vi.fn().mockResolvedValue({}),
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
    setBibleEntryCrowd: vi.fn().mockResolvedValue({}),
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
      category: 'Character',
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
        reviewStatus: 'CanonLocked',
        lockedAt: '2026-10-15T00:00:00Z',
      },
    },
    {
      id: 'entry-loc-1',
      seriesBibleId: 'bible-1',
      category: 'Location',
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
        reviewStatus: 'Draft',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'WRITER', isOwner: false }),
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
    // Một số test gán đè getBibleDesignQueue; reset để hàng chờ không rò sang test sau.
    (bibleService as any).getBibleDesignQueue = vi.fn().mockResolvedValue([]);
  });

  it('renders hero header with series name, KPI tiles, category sidebar and count badge', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    expect(screen.getByText('Canon Hub')).toBeDefined();
    expect(screen.getByTestId('bible-sidebar')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1, name: 'Series Bible' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('2 mục tri thức')).toBeDefined();
    });

    expect(screen.getByText('Tạo mục nháp')).toBeDefined();
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

    // Tàn Lão Thôn has no image, so the detail shows the compact placeholder, not an image frame
    fireEvent.click(screen.getByTestId('bible-card-entry-loc-1'));
    expect(await screen.findByText('LOC-01')).toBeDefined();
    expect(screen.getAllByText('Ngôi làng bí ẩn ở trung tâm Đại Khư.').length).toBeGreaterThan(0);
    expect(screen.getByText('Chưa có ảnh Reference Sheet cho mục này')).toBeDefined();
    expect(screen.getByTestId('bible-detail-category')).toHaveTextContent('Bối cảnh & Địa điểm');
  });

  it('filters by status and clears filter with reset button', async () => {
    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId('bible-card-entry-chr-1')).toBeDefined();
      expect(screen.getByTestId('bible-card-entry-loc-1')).toBeDefined();
    });

    const statusSelect = screen.getByTestId('bible-status-filter') as HTMLSelectElement;
    fireEvent.change(statusSelect, { target: { value: 'CanonLocked' } });

    // Only Canon locked entry (Tần Mục) is visible
    expect(screen.getByTestId('bible-card-entry-chr-1')).toBeDefined();
    expect(screen.queryByTestId('bible-card-entry-loc-1')).toBeNull();

    // Reset filter button appears
    const clearBtn = screen.getByText('Xóa bộ lọc');
    fireEvent.click(clearBtn);

    // Both entries restored
    expect(screen.getByTestId('bible-card-entry-chr-1')).toBeDefined();
    expect(screen.getByTestId('bible-card-entry-loc-1')).toBeDefined();
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

  it('restricts Producer to redraw requests without draft creation (Q19/Q22)', async () => {
    localStorage.setItem(
      'activeWorkspace',
      JSON.stringify({ id: 'ws-1', currentUserRole: 'PRODUCER', isOwner: true }),
    );

    render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Tần Mục')).toBeDefined());
    expect(screen.getByTestId('bible-readonly-badge')).toBeDefined();
    expect(screen.queryByTestId('add-bible-entry-btn')).toBeNull();
    expect(screen.queryByTestId(/add-revision-btn-/i)).toBeNull();
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

    fireEvent.click(screen.getByTestId('bible-card-entry-chr-1'));
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
      expect(screen.getByText(/Nộp lại bản vẽ Concept Art/i)).toBeDefined();
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
      JSON.stringify({ id: 'ws-1', currentUserRole: 'WRITER', isOwner: false }),
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
      expect(screen.getByTestId('bible-card-entry-chr-1')).toBeDefined();
    });
    fireEvent.click(screen.getByTestId('bible-card-entry-chr-1'));

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

    await waitFor(() => expect(screen.getByTestId('bible-card-entry-chr-1')).toBeDefined());
    fireEvent.click(screen.getByTestId('bible-card-entry-chr-1'));
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
      // Chờ khung chi tiết của mục đang chọn hiển thị nút thẩm định
      await screen.findAllByTitle('Yêu cầu Artist vẽ lại concept');
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

    it('opens detail workbench without crashing when clicking View Details from Design Queue or card with missing variantLabel', async () => {
      localStorage.setItem(
        'activeWorkspace',
        JSON.stringify({ id: 'ws-1', currentUserRole: 'WRITER', isOwner: false }),
      );
      const entryMissingLabel = {
        ...mockEntries[0],
        effectiveRevision: {
          ...mockEntries[0].effectiveRevision!,
          variantLabel: undefined,
          stageName: null,
          reviewStatus: 'Draft',
          isLocked: false,
        },
      };
      (bibleService.getSeriesBible as any).mockResolvedValue({
        id: 'bible-1',
        seriesId: 'series-123',
        workspaceId: 'ws-1',
        name: 'Series Bible',
        version: 1,
        entries: [entryMissingLabel],
      });
      (bibleService as any).getBibleDesignQueue = vi.fn().mockResolvedValue([
        {
          entryId: entryMissingLabel.id,
          seriesId: 'series-123',
          code: entryMissingLabel.code,
          name: entryMissingLabel.name,
          category: 'Character',
          revisionId: 'rev-1',
          reviewStatus: 'Draft',
          stageName: null,
          updatedAt: '2026-11-18T10:00:00Z',
        },
      ]);
      (bibleService.getEntryHistory as any).mockResolvedValue([
        entryMissingLabel.effectiveRevision,
      ]);

      render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

      const queueBtn = await screen.findByTestId(`view-concept-history-${entryMissingLabel.id}`);
      fireEvent.click(queueBtn);

      expect(await screen.findByTestId('bible-entity-workbench')).toBeInTheDocument();
    });
  });

  describe('Crowd (Quần chúng) toggle directly on bible cards', () => {
    beforeEach(() => {
      // Test trước gán đè hàng đợi thiết kế, clearAllMocks không xoá implementation
      (bibleService as any).getBibleDesignQueue = vi.fn().mockResolvedValue([]);
    });

    it('allows toggling crowd status directly from the card action button', async () => {
      render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);
      await waitFor(() => expect(screen.getByText('Tần Mục')).toBeDefined());

      const toggleBtn = screen.getByTestId('crowd-badge-entry-chr-1');
      expect(toggleBtn.textContent).toBe('Đặt Quần chúng');

      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(bibleService.setBibleEntryCrowd).toHaveBeenCalledWith(
          'series-123',
          'entry-chr-1',
          true,
        );
      });
    });

    it('displays crowd badge when entity has isCrowd true', async () => {
      (bibleService.getSeriesBible as any).mockResolvedValueOnce({
        id: 'bible-1',
        seriesId: 'series-123',
        workspaceId: 'ws-1',
        name: 'Series Bible',
        version: 1,
        entries: [
          {
            ...mockEntries[0],
            isCrowd: true,
          },
        ],
      });

      render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);
      await waitFor(() => expect(screen.getByText('Tần Mục')).toBeDefined());

      expect(screen.getByTestId('crowd-badge-entry-chr-1').textContent).toBe('Quần chúng');
    });
  });

  describe('Bible Stub Definition & Harvester (Series Bible)', () => {
    const stubEntry = {
      id: 'stub-1',
      seriesBibleId: 'bible-1',
      category: 'Character',
      code: 'HAC_Y',
      name: 'Hắc Y Nhân',
      subtitle: '',
      description: '',
      detailsJson: '{}',
      referenceImageUrl: null,
      priority: 1,
      strictCheck: true,
      isActive: true,
      isStub: true,
      createdAt: '2026-11-18T00:00:00Z',
      effectiveRevision: null,
    };

    beforeEach(() => {
      (bibleService as any).getBibleDesignQueue = vi.fn().mockResolvedValue([]);
      (bibleService.getSeriesBible as any).mockResolvedValue({
        id: 'bible-1',
        seriesId: 'series-123',
        workspaceId: 'ws-1',
        name: 'Series Bible',
        version: 1,
        entries: [stubEntry, mockEntries[0]],
      });
    });

    it('applies bible?search=<name> from URL, lets Writer request AI draft with citations, pour via "Dùng làm nháp", edit manually, and save once via defineBibleEntry', async () => {
      const onShowToast = vi.fn();
      const runStubSpy = vi.spyOn(aiAgentsService, 'runBibleStubDraft').mockResolvedValueOnce({
        id: 'sug-stub-1',
        runId: 'run-stub-1',
        stepId: 'step-stub-1',
        sceneId: 'sc-1',
        kind: 'BibleStub',
        status: 'Pending',
        summary: 'Hồ sơ nháp cho Hắc Y Nhân',
        payload: {
          entryId: 'stub-1',
          name: 'Hắc Y Nhân',
          draft: {
            description: 'Sát thủ mặc áo choàng đen xuất hiện trên mái ngói.',
            subtitle: 'Sát thủ bí ẩn',
            citations: [
              {
                claim: 'Mặc áo choàng đen trên mái ngói',
                lineId: 'line-1',
                quote: 'Hắc Y Nhân đứng lặng trên mái ngói, tà áo choàng đen bay trong mưa.',
              },
            ],
          },
          reason: 'Tổng hợp từ dòng kịch bản 1',
        },
        payloadHash: 'hash-stub-1',
        baseChapterVersion: 2,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-18T10:00:00Z',
        decisions: [],
        canDecide: true,
        canAccept: true,
      });
      const reviewSpy = vi.spyOn(aiAgentsService, 'review').mockResolvedValueOnce({
        suggestionId: 'sug-stub-1',
        status: 'Accepted',
        decisionId: 'dec-stub-1',
        resultRevisionId: null,
        chapterVersion: 2,
      });

      let resolveDefine!: (val: any) => void;
      (bibleService.defineBibleEntry as any).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveDefine = resolve;
          }),
      );

      rtlRender(<SeriesBibleView activeProject={mockSeries as any} onShowToast={onShowToast} />, {
        wrapper: ({ children }) => (
          <MemoryRouter
            initialEntries={[
              '/workspaces/ws-1/series/series-123/bible?search=H%E1%BA%AFc%20Y%20Nh%C3%A2n',
            ]}
          >
            {children}
          </MemoryRouter>
        ),
      });

      // URL search param filters directly to Hắc Y Nhân (hides Tần Mục)
      expect(await screen.findByText('Hắc Y Nhân')).toBeInTheDocument();
      expect(screen.queryByText('Tần Mục')).toBeNull();
      expect((screen.getByTestId('bible-search-input') as HTMLInputElement).value).toBe(
        'Hắc Y Nhân',
      );

      // Stub does NOT offer normal create-revision; offers "Định nghĩa"
      expect(screen.queryByTestId('add-revision-btn-stub-1')).toBeNull();
      fireEvent.click(screen.getByTestId('define-stub-btn-stub-1'));

      // Read-only entity name
      const readonlyName = screen.getByTestId('define-entity-name-readonly');
      expect(readonlyName).toHaveTextContent('Hắc Y Nhân');
      expect(readonlyName.tagName.toLowerCase()).not.toBe('input');

      // Request AI draft from script
      fireEvent.click(screen.getByRole('button', { name: /Soạn nháp từ kịch bản/i }));
      await waitFor(() => {
        expect(runStubSpy).toHaveBeenCalledWith('series-123', 'stub-1', undefined);
      });

      // Displays verbatim citation claim & quote
      expect(await screen.findByText('Mặc áo choàng đen trên mái ngói')).toBeInTheDocument();
      expect(
        screen.getByText(/Hắc Y Nhân đứng lặng trên mái ngói, tà áo choàng đen bay trong mưa\./),
      ).toBeInTheDocument();

      // Must not auto-save before user saves
      expect(bibleService.defineBibleEntry).not.toHaveBeenCalled();

      // Click "Dùng làm nháp" -> records Accept and fills form fields only
      fireEvent.click(screen.getByRole('button', { name: /Dùng làm nháp/i }));
      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('series-123', 'sug-stub-1', 'accept', {});
      });

      const subtitleInput = screen.getByTestId('define-entity-subtitle-input') as HTMLInputElement;
      const descInput = screen.getByTestId(
        'define-entity-description-input',
      ) as HTMLTextAreaElement;
      expect(subtitleInput.value).toBe('Sát thủ bí ẩn');
      expect(descInput.value).toBe('Sát thủ mặc áo choàng đen xuất hiện trên mái ngói.');
      expect(bibleService.defineBibleEntry).not.toHaveBeenCalled();

      // IME composition Enter on subtitle input must be ignored
      fireEvent.keyDown(subtitleInput, { key: 'Enter', isComposing: true });
      expect(bibleService.defineBibleEntry).not.toHaveBeenCalled();

      // Writer edits description manually and saves; double-click must not double-submit
      fireEvent.change(descInput, {
        target: { value: 'Sát thủ mặc áo choàng đen, mang mặt nạ bạc.' },
      });
      const saveBtn = screen.getByTestId('save-define-stub-btn');
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);

      expect(bibleService.defineBibleEntry).toHaveBeenCalledTimes(1);
      expect(bibleService.defineBibleEntry).toHaveBeenCalledWith('series-123', 'stub-1', {
        name: 'Hắc Y Nhân',
        description: 'Sát thủ mặc áo choàng đen, mang mặt nạ bạc.',
        subtitle: 'Sát thủ bí ẩn',
      });

      const callsBeforeResolve = (bibleService.getSeriesBible as any).mock.calls.length;
      resolveDefine({
        ...stubEntry,
        isStub: false,
        subtitle: 'Sát thủ bí ẩn',
        description: 'Sát thủ mặc áo choàng đen, mang mặt nạ bạc.',
      });

      await waitFor(() => {
        expect((bibleService.getSeriesBible as any).mock.calls.length).toBeGreaterThan(
          callsBeforeResolve,
        );
        expect(onShowToast).toHaveBeenCalledWith(
          'Đã định nghĩa thực thể',
          expect.stringContaining('Hắc Y Nhân'),
        );
      });
    });

    it('shows verbatim 403/409 backend errors for AI draft and defineBibleEntry and keeps form open on failure', async () => {
      const onShowToast = vi.fn();
      vi.spyOn(aiAgentsService, 'runBibleStubDraft')
        .mockRejectedValueOnce(
          new AiApiError('Chỉ Writer của Workspace mới được xin hồ sơ nháp.', 'FORBIDDEN', 403),
        )
        .mockRejectedValueOnce(
          new AiApiError(
            'Chưa có dòng kịch bản nào nhắc tới mục này, nên không có căn cứ để soạn.',
            'CONFLICT',
            409,
          ),
        );
      (bibleService.defineBibleEntry as any).mockRejectedValueOnce({
        status: 409,
        code: 'CONFLICT',
        message: 'Mục này đã được định nghĩa trước đó.',
      });

      render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={onShowToast} />);

      fireEvent.click(await screen.findByTestId('define-stub-btn-stub-1'));

      const draftBtn = screen.getByRole('button', { name: /Soạn nháp từ kịch bản/i });
      fireEvent.click(draftBtn);
      expect(
        await screen.findByText('Chỉ Writer của Workspace mới được xin hồ sơ nháp.'),
      ).toBeInTheDocument();

      fireEvent.click(draftBtn);
      expect(
        await screen.findByText(
          'Chưa có dòng kịch bản nào nhắc tới mục này, nên không có căn cứ để soạn.',
        ),
      ).toBeInTheDocument();

      // Failing defineBibleEntry shows backend message verbatim and keeps form open
      const descInput = screen.getByTestId(
        'define-entity-description-input',
      ) as HTMLTextAreaElement;
      fireEvent.change(descInput, { target: { value: 'Mô tả thử nghiệm khi xung đột' } });
      fireEvent.click(screen.getByTestId('save-define-stub-btn'));

      expect(await screen.findByText('Mục này đã được định nghĩa trước đó.')).toBeInTheDocument();
      expect(onShowToast).toHaveBeenCalledWith(
        expect.any(String),
        'Mục này đã được định nghĩa trước đó.',
      );
      expect(screen.getByTestId('define-entity-description-input')).toHaveValue(
        'Mô tả thử nghiệm khi xung đột',
      );
    });

    it('hides stub define action & Harvester for non-Writers and only shows Harvester on stub entries', async () => {
      // Non-stub entry opened by Writer in AddRevisionModal must NOT show stub Harvester
      const writerRender = render(
        <SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />,
      );
      await screen.findByText('Hắc Y Nhân');

      expect(screen.getByTestId('define-stub-btn-stub-1')).toBeInTheDocument();
      expect(screen.queryByTestId('define-stub-btn-entry-chr-1')).toBeNull();
      fireEvent.click(screen.getByTestId('add-revision-btn-entry-chr-1'));
      expect(
        screen.queryByRole('button', { name: /Soạn nháp từ kịch bản/i }),
      ).not.toBeInTheDocument();
      writerRender.unmount();

      // Non-Writers (EDITOR, PRODUCER, ARTIST) do NOT see "Định nghĩa" or normal create-revision on stubs
      for (const role of ['EDITOR', 'PRODUCER', 'ARTIST']) {
        localStorage.setItem(
          'activeWorkspace',
          JSON.stringify({ id: 'ws-1', currentUserRole: role, isOwner: role === 'PRODUCER' }),
        );
        const { unmount } = render(
          <SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />,
        );
        await screen.findByText('Hắc Y Nhân');
        expect(screen.queryByTestId('define-stub-btn-stub-1')).toBeNull();
        expect(screen.queryByTestId('add-revision-btn-stub-1')).toBeNull();
        expect(
          screen.queryByRole('button', { name: /Soạn nháp từ kịch bản/i }),
        ).not.toBeInTheDocument();
        unmount();
      }
    });

    it('lets Writer reject AI stub draft without altering form or auto-saving, and preserves existing subtitle when AI draft subtitle is null', async () => {
      const runStubSpy = vi
        .spyOn(aiAgentsService, 'runBibleStubDraft')
        .mockResolvedValueOnce({
          id: 'sug-reject-1',
          runId: 'run-r-1',
          stepId: 'step-r-1',
          sceneId: 'sc-1',
          kind: 'BibleStub',
          status: 'Pending',
          summary: 'Hồ sơ nháp lần 1',
          payload: {
            entryId: 'stub-1',
            name: 'Hắc Y Nhân',
            draft: {
              description: 'Đề xuất không phù hợp.',
              subtitle: 'Vai trò sai',
              citations: [],
            },
            reason: 'Từ kịch bản',
          },
          payloadHash: 'hash-r-1',
          baseChapterVersion: 1,
          bibleRevisionIds: [],
          hasBlockingFindings: false,
          createdAt: '2026-11-19T10:00:00Z',
          decisions: [],
          canDecide: true,
          canAccept: true,
        })
        .mockResolvedValueOnce({
          id: 'sug-accept-2',
          runId: 'run-r-2',
          stepId: 'step-r-2',
          sceneId: 'sc-1',
          kind: 'BibleStub',
          status: 'Pending',
          summary: 'Hồ sơ nháp lần 2',
          payload: {
            entryId: 'stub-1',
            name: 'Hắc Y Nhân',
            draft: {
              description: 'Nhân vật áo đen xuất hiện dưới mưa.',
              subtitle: null,
              citations: [],
            },
            reason: 'Từ kịch bản',
          },
          payloadHash: 'hash-r-2',
          baseChapterVersion: 1,
          bibleRevisionIds: [],
          hasBlockingFindings: false,
          createdAt: '2026-11-19T10:05:00Z',
          decisions: [],
          canDecide: true,
          canAccept: true,
        });
      const reviewSpy = vi
        .spyOn(aiAgentsService, 'review')
        .mockResolvedValueOnce({
          suggestionId: 'sug-reject-1',
          status: 'Rejected',
          decisionId: 'dec-r-1',
          resultRevisionId: null,
          chapterVersion: 1,
        })
        .mockResolvedValueOnce({
          suggestionId: 'sug-accept-2',
          status: 'Accepted',
          decisionId: 'dec-r-2',
          resultRevisionId: null,
          chapterVersion: 1,
        });

      render(<SeriesBibleView activeProject={mockSeries as any} onShowToast={vi.fn()} />);

      fireEvent.click(await screen.findByTestId('define-stub-btn-stub-1'));

      const subtitleInput = screen.getByTestId('define-entity-subtitle-input') as HTMLInputElement;
      const descInput = screen.getByTestId(
        'define-entity-description-input',
      ) as HTMLTextAreaElement;
      fireEvent.change(subtitleInput, { target: { value: 'Thủ lĩnh ám sát' } });
      fireEvent.change(descInput, { target: { value: 'Mô tả tự viết ban đầu.' } });

      // 1. Request AI draft then Reject -> form remains untouched and defineBibleEntry is NOT called
      fireEvent.click(screen.getByRole('button', { name: /Soạn nháp từ kịch bản/i }));
      await screen.findByText('Đề xuất không phù hợp.');

      fireEvent.click(screen.getByRole('button', { name: /^Reject$/i }));
      fireEvent.click(screen.getByRole('button', { name: /Xác nhận Reject/i }));

      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('series-123', 'sug-reject-1', 'reject', {});
      });
      expect(subtitleInput.value).toBe('Thủ lĩnh ám sát');
      expect(descInput.value).toBe('Mô tả tự viết ban đầu.');
      expect(bibleService.defineBibleEntry).not.toHaveBeenCalled();

      // 2. Request another AI draft with subtitle: null -> accepting updates description but preserves Writer's subtitle
      fireEvent.click(screen.getByRole('button', { name: /Soạn nháp từ kịch bản/i }));
      await screen.findByText('Nhân vật áo đen xuất hiện dưới mưa.');
      expect(runStubSpy).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByRole('button', { name: /Dùng làm nháp/i }));
      await waitFor(() => {
        expect(reviewSpy).toHaveBeenCalledWith('series-123', 'sug-accept-2', 'accept', {});
      });
      expect(descInput.value).toBe('Nhân vật áo đen xuất hiện dưới mưa.');
      expect(subtitleInput.value).toBe('Thủ lĩnh ám sát');
      expect(bibleService.defineBibleEntry).not.toHaveBeenCalled();
    });
  });
});
