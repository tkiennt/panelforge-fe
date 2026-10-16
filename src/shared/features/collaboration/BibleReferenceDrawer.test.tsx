import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BibleReferenceDrawer } from './BibleReferenceDrawer';
import { bibleService, BibleEntryDto } from '@/services/bible.service';

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getPanelBible: vi.fn(),
    getBibleEntriesAtChapter: vi.fn(),
  },
}));

vi.mock('@/shared/components/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid='auth-image' />
  ),
}));

const mockPanelEntries: BibleEntryDto[] = [
  {
    id: 'entry-1',
    seriesBibleId: 'bible-123',
    category: 'Character',
    code: 'CHR-01',
    name: 'Kaito Shion',
    subtitle: 'Main Protagonist',
    description: 'Tóc xanh dương, khăn quàng cổ. Áo khoác dài mùa đông có viền vàng',
    detailsJson: '{}',
    referenceImageUrl: '/api/series/series-123/bible/assets/hash1',
    priority: 'StrictCheck',
    strictCheck: true,
    isActive: true,
    effectiveRevision: {
      id: 'rev-1',
      bibleEntryId: 'entry-1',
      versionNumber: 1,
      summary: 'Bản chuẩn',
      snapshotJson: '{}',
      contentHash: 'hash1',
      effectiveFromChapterNumber: 1,
      isInitialVersion: true,
      createdAt: '2026-10-01T00:00:00Z',
      isLocked: true,
    },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  },
];

const mockChapterEntries: BibleEntryDto[] = [
  ...mockPanelEntries,
  {
    id: 'entry-2',
    seriesBibleId: 'bible-123',
    category: 'Character',
    code: 'CHR-02',
    name: 'Miku Hatsune',
    subtitle: 'Sidekick Singer',
    description: 'Tóc xanh lá buộc hai bên. Đồng phục xám viền xanh ngọc',
    detailsJson: '{}',
    referenceImageUrl: '/api/series/series-123/bible/assets/hash2',
    priority: 'CanonCritical',
    strictCheck: true,
    isActive: true,
    effectiveRevision: {
      id: 'rev-2',
      bibleEntryId: 'entry-2',
      versionNumber: 2,
      summary: 'Nâng cấp trang phục diễn',
      snapshotJson: '{}',
      contentHash: 'hash2',
      effectiveFromChapterNumber: 1,
      isInitialVersion: false,
      createdAt: '2026-10-05T00:00:00Z',
      isLocked: true,
    },
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  },
];

describe('BibleReferenceDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bibleService.getPanelBible).mockResolvedValue(mockPanelEntries);
    vi.mocked(bibleService.getBibleEntriesAtChapter).mockResolvedValue(mockChapterEntries);
  });

  it('does not render when isOpen is false', () => {
    render(
      <BibleReferenceDrawer
        isOpen={false}
        onClose={vi.fn()}
        seriesId='series-123'
        chapterId='chapter-456'
        panelId='panel-1'
      />,
    );

    expect(screen.queryByTestId('bible-reference-drawer')).not.toBeInTheDocument();
  });

  it('renders and fetches panel bible entries when open in panel mode', async () => {
    render(
      <BibleReferenceDrawer
        isOpen={true}
        onClose={vi.fn()}
        seriesId='series-123'
        chapterId='chapter-456'
        chapterNumber={1}
        panelId='panel-1'
        panelNumber={1}
      />,
    );

    expect(screen.getByTestId('bible-reference-drawer')).toBeInTheDocument();
    expect(bibleService.getPanelBible).toHaveBeenCalledWith('panel-1');

    await waitFor(() => {
      expect(screen.getByText('Kaito Shion')).toBeInTheDocument();
      expect(screen.getByText('Main Protagonist')).toBeInTheDocument();
      expect(
        screen.getByText('Tóc xanh dương, khăn quàng cổ. Áo khoác dài mùa đông có viền vàng'),
      ).toBeInTheDocument();
      expect(screen.getByText('Bản khoá v1')).toBeInTheDocument();
    });
  });

  it('switches to chapter canon mode and fetches canon entries with canonOnly=true', async () => {
    const user = userEvent.setup();
    render(
      <BibleReferenceDrawer
        isOpen={true}
        onClose={vi.fn()}
        seriesId='series-123'
        chapterId='chapter-456'
        chapterNumber={2}
        panelId='panel-1'
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Kaito Shion')).toBeInTheDocument();
    });

    const chapterTab = screen.getByTestId('tab-chapter-bible');
    await user.click(chapterTab);

    expect(bibleService.getBibleEntriesAtChapter).toHaveBeenCalledWith('series-123', 2, true);

    await waitFor(() => {
      expect(screen.getByText('Miku Hatsune')).toBeInTheDocument();
    });
  });

  it('allows switching panels in panel mode and notifies onSelectPanel', async () => {
    const user = userEvent.setup();
    const handleSelectPanel = vi.fn();
    const availablePanels = [
      { id: 'panel-1', panelNumber: 1, readingOrder: 1 },
      { id: 'panel-2', panelNumber: 2, readingOrder: 2 },
    ];

    render(
      <BibleReferenceDrawer
        isOpen={true}
        onClose={vi.fn()}
        seriesId='series-123'
        chapterId='chapter-456'
        panelId='panel-1'
        availablePanels={availablePanels}
        onSelectPanel={handleSelectPanel}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Kaito Shion')).toBeInTheDocument();
    });

    const panel2Button = screen.getByTestId('select-panel-panel-2');
    await user.click(panel2Button);

    expect(handleSelectPanel).toHaveBeenCalledWith('panel-2');
    expect(bibleService.getPanelBible).toHaveBeenCalledWith('panel-2');
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <BibleReferenceDrawer
        isOpen={true}
        onClose={handleClose}
        seriesId='series-123'
        panelId='panel-1'
      />,
    );

    const closeBtn = screen.getByTestId('close-bible-drawer-btn');
    await user.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders empty state when panel has no canon characters linked', async () => {
    vi.mocked(bibleService.getPanelBible).mockResolvedValueOnce([]);

    render(
      <BibleReferenceDrawer
        isOpen={true}
        onClose={vi.fn()}
        seriesId='series-123'
        panelId='panel-empty'
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Chưa có nhân vật gắn trong khung này/i)).toBeInTheDocument();
    });
  });
});
