// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PanelModelSheetBlock } from './PanelModelSheetBlock';
import { bibleService, BibleEntryDto } from '@/services/bible.service';

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getPanelBible: vi.fn(),
  },
}));

const mockEntry: BibleEntryDto = {
  id: 'entry-1',
  seriesBibleId: 'bible-1',
  category: 'Character',
  code: 'CHAR-01',
  name: 'Naruto Uzumaki',
  subtitle: 'Ninja làng Lá',
  description: 'Nhân vật chính, ninja hiếu động.',
  detailsJson: '{}',
  referenceImageUrl: 'https://example.com/naruto.png',
  priority: 'High',
  strictCheck: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  effectiveRevision: {
    id: 'rev-1',
    bibleEntryId: 'entry-1',
    versionNumber: 1,
    summary: 'Tạo hình ban đầu',
    snapshotJson: '{}',
    contentHash: 'hash-1',
    stageName: 'Mặc định',
    isInitialVersion: true,
    createdAt: '2026-01-01T00:00:00Z',
    conceptImageUrl: 'https://example.com/naruto-concept.png',
  },
};

const mockFlashbackEntry: BibleEntryDto = {
  id: 'entry-2',
  seriesBibleId: 'bible-1',
  category: 'Character',
  code: 'CHAR-02',
  name: 'Sasuke Uchiha',
  subtitle: 'Thiên tài tộc Uchiha',
  description: 'Hồi tưởng thời thơ ấu.',
  detailsJson: '{}',
  referenceImageUrl: 'https://example.com/sasuke-child.png',
  priority: 'High',
  strictCheck: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  effectiveRevision: {
    id: 'rev-2',
    bibleEntryId: 'entry-2',
    versionNumber: 2,
    summary: 'Biến thể hồi tưởng lúc nhỏ',
    snapshotJson: '{}',
    contentHash: 'hash-2',
    stageName: 'Lúc nhỏ',
    isInitialVersion: false,
    createdAt: '2026-01-01T00:00:00Z',
    conceptImageUrl: 'https://example.com/sasuke-child.png',
  },
};

describe('PanelModelSheetBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders placeholder when no panelId is provided', () => {
    render(<PanelModelSheetBlock panelId={null} />);
    expect(screen.getByTestId('panel-model-sheet-no-panel')).toBeInTheDocument();
  });

  it('renders loading state initially while fetching', () => {
    vi.mocked(bibleService.getPanelBible).mockImplementation(() => new Promise(() => {}));

    render(<PanelModelSheetBlock panelId='panel-uuid-1' panelNumber={1} />);
    expect(screen.getByTestId('panel-model-sheet-loading')).toBeInTheDocument();
  });

  it('renders error state and retries on button click', async () => {
    vi.mocked(bibleService.getPanelBible)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([mockEntry]);

    render(<PanelModelSheetBlock panelId='panel-uuid-1' panelNumber={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('panel-model-sheet-error')).toBeInTheDocument();
    });

    const retryBtn = screen.getByTestId('panel-model-sheet-retry-btn');
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('panel-model-sheet-block')).toBeInTheDocument();
      expect(screen.getByText('Naruto Uzumaki')).toBeInTheDocument();
    });
  });

  it('renders empty state when panel has no referenced model sheets', async () => {
    vi.mocked(bibleService.getPanelBible).mockResolvedValueOnce([]);

    render(<PanelModelSheetBlock panelId='panel-uuid-1' panelNumber={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('panel-model-sheet-empty')).toBeInTheDocument();
    });
  });

  it('renders model sheet list with image, name, variant and revision', async () => {
    vi.mocked(bibleService.getPanelBible).mockResolvedValueOnce([mockEntry]);

    render(<PanelModelSheetBlock panelId='panel-uuid-1' panelNumber={1} />);

    await waitFor(() => {
      expect(screen.getByTestId('panel-model-sheet-block')).toBeInTheDocument();
    });

    expect(screen.getByTestId('model-sheet-entry-name')).toHaveTextContent('Naruto Uzumaki');
    expect(screen.getByTestId('model-sheet-image')).toHaveAttribute(
      'src',
      'https://example.com/naruto.png',
    );
    expect(screen.getByTestId('model-sheet-stage-label')).toHaveTextContent(/v1/);
  });

  it('renders label like Flashback - <variant> v1 when panel has its own stage', async () => {
    vi.mocked(bibleService.getPanelBible).mockResolvedValueOnce([mockFlashbackEntry]);

    render(
      <PanelModelSheetBlock
        panelId='panel-uuid-2'
        panelNumber={2}
        hasOwnStage={true}
        panelStage='Flashback'
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('panel-model-sheet-block')).toBeInTheDocument();
    });

    expect(screen.getByTestId('model-sheet-entry-name')).toHaveTextContent('Sasuke Uchiha');
    const label = screen.getByTestId('model-sheet-stage-label');
    // Kiểm tra nhãn dạng "Flashback - Lúc nhỏ v2" hoặc "Hồi tưởng · Lúc nhỏ v2"
    expect(label.textContent).toMatch(/(Flashback|Hồi tưởng).*Lúc nhỏ.*v2/);
  });
});
