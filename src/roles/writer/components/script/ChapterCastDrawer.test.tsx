import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChapterCastDrawer } from './ChapterCastDrawer';
import { ChapterCastDto } from '@/services/chapterCast.service';

describe('ChapterCastDrawer Component', () => {
  const mockCast: ChapterCastDto = {
    chapterId: 'chap-1',
    chapterNumber: 1,
    chapterTitle: 'Khởi đầu',
    submitGate: {
      canSubmit: false,
      blockers: [
        {
          bibleEntryId: 'stub-1',
          entryName: 'Hắc Y Nhân',
          reason: 'Chưa định nghĩa',
        },
      ],
    },
    gate: {
      canStart: true,
      blockers: [],
    },
    entities: [
      {
        bibleEntryId: 'stub-1',
        name: 'Hắc Y Nhân',
        code: 'HAC_Y',
        category: 0,
        isStub: true,
        isCrowd: false,
        source: 'Speaker',
        bibleStatus: 'Draft',
        chosenByWriter: false,
        panelRevisions: [],
        availableRevisions: [],
        mentions: [],
      },
      {
        bibleEntryId: 'char-1',
        name: 'Kaito',
        code: 'KAITO',
        category: 0,
        isStub: false,
        isCrowd: false,
        source: 'Speaker',
        bibleStatus: 'CanonLocked',
        boundRevision: {
          revisionId: 'rev-1',
          versionNumber: 1,
          variantLabel: 'Mặc định',
          status: 'CanonLocked',
          isCanonLocked: true,
        },
        chosenByWriter: true,
        panelRevisions: [],
        availableRevisions: [],
        mentions: [],
      },
    ],
  };

  it('renders drawer with data-testid="chapter-cast-drawer" and blockers alert', () => {
    render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterNumber={1}
        chapterTitle='Khởi đầu'
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );

    expect(screen.getByTestId('chapter-cast-drawer')).toBeInTheDocument();
    expect(screen.getAllByText(/Hắc Y Nhân/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Kaito')).toBeInTheDocument();
  });

  it('expands accordion row on click and ensures one open at a time', () => {
    render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );

    const toggleStub = screen.getByTestId('accordion-toggle-stub-1');
    const toggleKaito = screen.getByTestId('accordion-toggle-char-1');

    expect(toggleStub).toHaveAttribute('aria-expanded', 'false');
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleStub);
    expect(toggleStub).toHaveAttribute('aria-expanded', 'true');
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleKaito);
    expect(toggleStub).toHaveAttribute('aria-expanded', 'false');
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'true');
  });

  it('verifies that entry name in definition is read-only', () => {
    render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );

    // Expand non-stub row (Kaito)
    const toggleKaito = screen.getByTestId('accordion-toggle-char-1');
    fireEvent.click(toggleKaito);

    // Click edit
    const editBtn = screen.getByTestId('edit-entry-btn');
    fireEvent.click(editBtn);

    // Name must be read-only
    const readonlyName = screen.getByTestId('define-entity-name-readonly');
    expect(readonlyName).toHaveTextContent('Kaito');
    expect(readonlyName.tagName.toLowerCase()).not.toBe('input');
  });
});
