import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RefreezeScriptModal } from './RefreezeScriptModal';
import { chapterService } from '@/services/chapter.service';
import { seriesService } from '@/services/series.service';
import { bibleService } from '@/services/bible.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getRefreezePreview: vi.fn(),
    refreezeScript: vi.fn(),
    addScriptComment: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesMembers: vi.fn(),
  },
}));

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    setBibleEntryCrowd: vi.fn(),
  },
}));

describe('RefreezeScriptModal Component', () => {
  const defaultProps = {
    isOpen: true,
    workspaceId: 'ws-1',
    seriesId: 'series-1',
    chapterId: 'chap-1',
    chapterNumber: 12,
    chapterTitle: 'Cuộc chạm trán',
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onShowToast: vi.fn(),
  };

  const mockMembers = [
    {
      id: 'm1',
      userId: 'artist-1',
      fullName: 'Nguyễn Văn Họa Sĩ',
      email: 'a@pf.local',
      seriesRole: 'Artist',
      status: 'Active',
    },
    {
      id: 'm2',
      userId: 'letterer-1',
      fullName: 'Trần Thị Letterer',
      email: 'l@pf.local',
      seriesRole: 'Letterer',
      status: 'Active',
    },
  ] as any;

  const basePreview = {
    chapterId: 'chap-1',
    chapterNumber: 12,
    chapterTitle: 'Cuộc chạm trán',
    previousFrozenVersionId: 'ver-1',
    previousFrozenVersionNumber: 1,
    submittedVersionId: 'ver-2',
    submittedVersionNumber: 2,
    hashParity: {
      isMatched: true,
      currentDraftHash: 'hash-v2',
      submittedHash: 'hash-v2',
      submittedVersionNumber: 2,
      latestVersionNumber: 2,
    },
    bibleGate: {
      isCanonLocked: true,
      blockers: [],
    },
    addedPages: [
      {
        pageId: 'page-5',
        pageNumber: 5,
        panelCount: 4,
        suggestedArtistId: null,
        suggestedArtistName: null,
        suggestedLettererId: null,
        suggestedLettererName: null,
      },
    ],
    removedPages: [
      {
        pageId: 'page-8',
        pageNumber: 8,
        canSafelyDelete: true,
        activeTaskCount: 0,
        hasArtwork: false,
        hasBalloons: false,
      },
    ],
    impactSummary: {
      visualImpactCount: 1,
      textImpactCount: 1,
    },
    visualImpacts: [
      {
        pageNumber: 2,
        panelNumber: 3,
        panelId: 'pan-2-3',
        changeType: 'ActionEdited',
        reason: 'Mô tả hành động khung tranh 3 đã được chỉnh sửa.',
        affectedStages: ['Pencil'],
        affectedAssigneeNames: ['Nguyễn Văn Họa Sĩ'],
      },
    ],
    textImpacts: [
      {
        pageNumber: 2,
        panelNumber: 1,
        lineId: 'line-1',
        elementId: 'el-1',
        kind: 'Dialogue',
        speakerLabel: 'Akira',
        oldText: 'Chào bạn!',
        newText: 'Chúng ta đi thôi!',
        isStale: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(seriesService.getSeriesMembers).mockResolvedValue(mockMembers);
    vi.mocked(chapterService.getRefreezePreview).mockResolvedValue(basePreview as any);
  });

  it('renders preview sections and blocks confirm until 100% added pages assigned', async () => {
    vi.mocked(chapterService.refreezeScript).mockResolvedValue({
      chapterId: 'chap-1',
      frozenScriptVersionId: 'ver-2',
      previousFrozenScriptVersionId: 'ver-1',
      addedPagesCount: 1,
      cancelledTasksCount: 1,
      visualImpactCount: 1,
      textImpactCount: 1,
      message: 'Đã chốt lại thành công.',
    });

    render(
      <MemoryRouter>
        <RefreezeScriptModal {...defaultProps} />
      </MemoryRouter>,
    );

    const addedSection = await screen.findByTestId('refreeze-added-pages');
    expect(addedSection).toHaveTextContent('Trang 5');
    expect(screen.getByTestId('refreeze-removed-pages')).toHaveTextContent('Trang 8');

    const confirmBtn = screen.getByTestId('refreeze-confirm-btn');
    expect(confirmBtn).toBeDisabled();

    // Assign Artist to Page 5
    fireEvent.change(screen.getByTestId('refreeze-artist-select-5'), {
      target: { value: 'artist-1' },
    });
    expect(confirmBtn).not.toBeDisabled();

    // Switch to Text Impact tab
    fireEvent.click(screen.getByTestId('refreeze-tab-text'));
    expect(screen.getByTestId('refreeze-text-list')).toHaveTextContent('Chúng ta đi thôi!');

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(chapterService.refreezeScript).toHaveBeenCalledWith('chap-1', {
        expectedScriptHash: 'hash-v2',
        newPageAssignments: [{ pageNumber: 5, artistId: 'artist-1', lettererId: null }],
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('displays 409 hash mismatch alert with 1-click nudge writer CTA', async () => {
    vi.mocked(chapterService.getRefreezePreview).mockResolvedValueOnce({
      ...basePreview,
      addedPages: [],
      hashParity: {
        isMatched: false,
        currentDraftHash: 'hash-draft-newer',
        submittedHash: 'hash-v2',
        submittedVersionNumber: 2,
        latestVersionNumber: 3,
      },
    } as any);
    vi.mocked(chapterService.addScriptComment).mockResolvedValueOnce({} as any);

    render(
      <MemoryRouter>
        <RefreezeScriptModal {...defaultProps} />
      </MemoryRouter>,
    );

    const mismatchAlert = await screen.findByTestId('refreeze-hash-mismatch-alert');
    expect(mismatchAlert).toHaveTextContent(/chỉnh sửa mới/i);
    expect(screen.getByTestId('refreeze-confirm-btn')).toBeDisabled();

    const nudgeBtn = screen.getByTestId('refreeze-nudge-writer-btn');
    fireEvent.click(nudgeBtn);

    await waitFor(() => {
      expect(chapterService.addScriptComment).toHaveBeenCalledWith('chap-1', {
        body: expect.stringContaining('Nộp kịch bản'),
      });
      expect(defaultProps.onShowToast).toHaveBeenCalled();
    });
  });

  it('displays 409 bible gate blocker alert with quick mark crowd button', async () => {
    vi.mocked(chapterService.getRefreezePreview).mockResolvedValueOnce({
      ...basePreview,
      addedPages: [],
      bibleGate: {
        isCanonLocked: false,
        blockers: [
          {
            bibleEntryId: 'entry-99',
            entryName: 'Kiếm Thần',
            reason: 'Chưa khóa Canon',
          },
        ],
      },
    } as any);
    vi.mocked(bibleService.setBibleEntryCrowd).mockResolvedValueOnce({} as any);

    render(
      <MemoryRouter>
        <RefreezeScriptModal {...defaultProps} />
      </MemoryRouter>,
    );

    const bibleAlert = await screen.findByTestId('refreeze-bible-blocker-alert');
    expect(bibleAlert).toHaveTextContent('Kiếm Thần');
    expect(screen.getByTestId('refreeze-confirm-btn')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu Quần chúng' }));

    await waitFor(() => {
      expect(bibleService.setBibleEntryCrowd).toHaveBeenCalledWith('series-1', 'entry-99', true);
    });
  });
});
