import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { BibleCharactersDrawer } from './BibleCharactersDrawer';
import { BibleEntryDto } from '@/services/bible.service';
import { ChapterCastDto } from '@/services/chapterCast.service';

describe('BibleCharactersDrawer Component', () => {
  const mockCharacters: BibleEntryDto[] = [
    {
      id: 'char-1',
      seriesBibleId: 'bible-1',
      category: 'Character',
      code: 'KAITO',
      name: 'Kaito',
      subtitle: 'Kiếm sĩ lang thang',
      description: 'Chàng trai kiếm sĩ trẻ tuổi.',
      detailsJson: '{}',
      priority: 0,
      strictCheck: false,
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'char-2',
      seriesBibleId: 'bible-1',
      category: 'Character',
      code: 'AIKO',
      name: 'Aiko',
      subtitle: 'Pháp sư ánh sáng',
      description: 'Cô gái mang sức mạnh cổ xưa.',
      detailsJson: '{}',
      priority: 0,
      strictCheck: false,
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  const mockChapterCast: ChapterCastDto = {
    chapterId: 'chap-1',
    chapterNumber: 1,
    chapterTitle: 'Chapter 1',
    entities: [
      {
        bibleEntryId: 'char-1',
        code: 'KAITO',
        name: 'Kaito',
        category: 'Character',
        isStub: false,
        isCrowd: false,
        source: 'Speaker',
        bibleStatus: 'Draft',
        chosenByWriter: false,
        panelRevisions: [],
        availableRevisions: [],
        mentions: [],
      },
    ],
    submitGate: { canSubmit: true, blockers: [] },
    gate: { canStart: true, blockers: [] },
  };

  it('renders closed drawer as null', () => {
    const { container } = render(
      <BibleCharactersDrawer isOpen={false} onClose={vi.fn()} characters={mockCharacters} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders subtabs in order: Trong chương -> Ngoài chương -> Tất cả, with Trong chương default active', () => {
    render(
      <BibleCharactersDrawer
        isOpen={true}
        onClose={vi.fn()}
        characters={mockCharacters}
        chapterCast={mockChapterCast}
      />,
    );

    const castTab = screen.getByTestId('filter-tab-cast');
    const nonCastTab = screen.getByTestId('filter-tab-nonCast');
    const allTab = screen.getByTestId('filter-tab-all');

    expect(castTab).toBeInTheDocument();
    expect(nonCastTab).toBeInTheDocument();
    expect(allTab).toBeInTheDocument();

    // Verify ordering in DOM: Trong chương comes before Toàn bộ
    expect(castTab.compareDocumentPosition(allTab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Default tab is "Trong chương" (cast)
    expect(castTab.className).toContain('bg-primary');
    expect(screen.getByText('Kaito')).toBeInTheDocument();
    expect(screen.queryByText('Aiko')).not.toBeInTheDocument();

    // Switch to "Ngoài chương"
    fireEvent.click(nonCastTab);
    expect(screen.queryByText('Kaito')).not.toBeInTheDocument();
    expect(screen.getByText('Aiko')).toBeInTheDocument();

    // Switch to "Tất cả" / "Toàn bộ"
    fireEvent.click(allTab);
    expect(allTab.className).toContain('bg-primary');
    expect(screen.getByText('Kaito')).toBeInTheDocument();
    expect(screen.getByText('Aiko')).toBeInTheDocument();
  });

  it('renders characters list with accordions and expands one row at a time', () => {
    render(
      <BibleCharactersDrawer
        isOpen={true}
        onClose={vi.fn()}
        characters={mockCharacters}
        defaultTab='all'
      />,
    );

    expect(screen.getByTestId('bible-characters-drawer')).toBeInTheDocument();
    expect(screen.getByText('Kaito')).toBeInTheDocument();
    expect(screen.getByText('Aiko')).toBeInTheDocument();

    const toggleKaito = screen.getByTestId('accordion-toggle-char-1');
    const toggleAiko = screen.getByTestId('accordion-toggle-char-2');

    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');
    expect(toggleAiko).toHaveAttribute('aria-expanded', 'false');

    // Click Kaito to expand
    fireEvent.click(toggleKaito);
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'true');
    expect(toggleAiko).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(screen.getByTestId('accordion-content')).getByText('Chàng trai kiếm sĩ trẻ tuổi.'),
    ).toBeInTheDocument();

    // Click Aiko to expand -> Kaito must collapse (one open at a time)
    fireEvent.click(toggleAiko);
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');
    expect(toggleAiko).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(screen.getByTestId('accordion-content')).getByText('Cô gái mang sức mạnh cổ xưa.'),
    ).toBeInTheDocument();
  });
});
