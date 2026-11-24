import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScriptRightBiblePanel } from './ScriptRightBiblePanel';
import type { BibleEntryDto } from '@/services/bible.service';
import type { ChapterCastDto } from '@/services/chapterCast.service';

const mockCharacters: any[] = [
  {
    id: 'char-1',
    seriesBibleId: 'series-1',
    name: 'Akira Kuroda',
    category: 'Character',
    description: 'Nhân vật chính vết sẹo chữ V',
    subtitle: 'Akira, Kuro',
    effectiveRevision: {
      id: 'rev-1',
      bibleEntryId: 'char-1',
      versionNumber: 2,
      variantLabel: 'v2.1 Revision',
      reviewStatus: 'CanonLocked',
      isLocked: true,
      summary: '',
      snapshotJson: '',
      contentHash: '',
      isInitialVersion: false,
      createdAt: '2026-01-01',
    },
    priority: 'Standard',
    strictCheck: false,
    isActive: true,
    code: 'CHR-01',
    detailsJson: '',
    createdAt: '2026-01-01',
  },
  {
    id: 'char-2',
    seriesBibleId: 'series-1',
    name: 'Tướng quân Kael',
    category: 'Character',
    description: 'Giáp vai nano Mk-II',
    effectiveRevision: {
      id: 'rev-2',
      bibleEntryId: 'char-2',
      versionNumber: 1,
      variantLabel: 'v1.4 Canon',
      reviewStatus: 'Draft',
      isLocked: false,
      summary: '',
      snapshotJson: '',
      contentHash: '',
      isInitialVersion: true,
      createdAt: '2026-01-01',
    },
    priority: 'Standard',
    strictCheck: false,
    isActive: true,
    code: 'CHR-02',
    detailsJson: '',
    createdAt: '2026-01-01',
  },
];

const mockCast: ChapterCastDto = {
  chapterId: 'chapter-1',
  chapterNumber: 1,
  chapterTitle: 'Chương 1',
  gate: {
    canStart: true,
    blockers: [],
  },
  submitGate: {
    canSubmit: true,
    blockers: [],
  },
  entities: [
    {
      bibleEntryId: 'char-1',
      code: 'CHR-01',
      name: 'Akira Kuroda',
      category: 'Character',
      isStub: false,
      isCrowd: false,
      isCanonLocked: true,
      source: 'Speaker',
      bibleStatus: 'Approved',
      chosenByWriter: true,
      panelRevisions: [],
      availableRevisions: [],
      mentions: [],
    },
    {
      bibleEntryId: 'char-2',
      code: 'CHR-02',
      name: 'Tướng quân Kael',
      category: 'Character',
      isStub: false,
      isCrowd: true,
      isCanonLocked: false,
      source: 'Speaker',
      bibleStatus: 'Draft',
      chosenByWriter: true,
      panelRevisions: [],
      availableRevisions: [],
      mentions: [],
    },
  ],
};

describe('ScriptRightBiblePanel', () => {
  it('hiển thị danh sách nhân vật trong chương với subtab Trong chương', () => {
    render(
      <MemoryRouter>
        <ScriptRightBiblePanel
          characters={mockCharacters}
          chapterCast={mockCast}
          seriesId='series-1'
          workspaceId='ws-1'
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Akira Kuroda')).toBeInTheDocument();
    expect(screen.getByText('Tướng quân Kael')).toBeInTheDocument();
    expect(screen.getByText('Bảng công cụ Biên kịch')).toBeInTheDocument();
  });

  it('chuyển đổi sang subtab Toàn bộ và tìm kiếm', () => {
    render(
      <MemoryRouter>
        <ScriptRightBiblePanel
          characters={mockCharacters}
          chapterCast={mockCast}
          allBibleEntries={mockCharacters}
          seriesId='series-1'
          workspaceId='ws-1'
        />
      </MemoryRouter>,
    );

    const allBtn = screen.getByRole('button', { name: /Toàn bộ/i });
    fireEvent.click(allBtn);

    const searchInput = screen.getByPlaceholderText(/Tìm nhân vật/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Akira' } });
    expect(screen.getByText('Akira Kuroda')).toBeInTheDocument();
    expect(screen.queryByText('Tướng quân Kael')).not.toBeInTheDocument();
  });

  it('kích hoạt onSelectEntity khi nhấp vào thẻ nhân vật', () => {
    const handleSelect = vi.fn();
    render(
      <MemoryRouter>
        <ScriptRightBiblePanel
          characters={mockCharacters}
          chapterCast={mockCast}
          onSelectEntity={handleSelect}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Akira Kuroda'));
    expect(handleSelect).toHaveBeenCalledWith(mockCharacters[0]);
  });
});
