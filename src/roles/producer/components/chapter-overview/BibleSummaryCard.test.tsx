import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BibleSummaryCard } from './BibleSummaryCard';
import type { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BibleSummaryCard', () => {
  const mockChapter: ChapterDto = {
    id: 'chap-1',
    seriesId: 'series-1',
    chapterNumber: 1,
    title: 'Chương 1',
    status: 'PreProduction',
    updatedAt: '2026-11-28T00:00:00Z',
  } as unknown as ChapterDto;

  const mockReadiness: ChapterReadinessDto = {
    chapterId: 'chap-1',
    seriesId: 'series-1',
    chapterNumber: 1,
    chapterTitle: 'Chương 1',
    chapterStatus: 'PreProduction',
    isHandedOff: false,
    status: 'READY',
    canStartProduction: true,
    checks: [],
    blockers: [],
    warnings: [],
    summary: { required: 0, passed: 0, remaining: 0 },
    script: {
      latestVersionId: null,
      latestVersionNumber: null,
      approvedVersionId: null,
      approvedVersionNumber: null,
      productionVersionId: null,
      productionVersionNumber: null,
      scriptStatus: 'Draft',
      isScriptFrozen: false,
      hasUnpushedDraftChanges: false,
      sceneCount: 0,
      pageCount: 0,
      panelCount: 0,
      lineCount: 0,
      unresolvedCommentsCount: 0,
      openFindingsCount: 0,
    },
    bible: {
      requiredTotal: 3,
      readyCount: 2,
      missingDefinitionCount: 0,
      missingArtCount: 1,
      pendingApprovalCount: 1,
      reworkCount: 0,
      crowdOptionalCount: 4,
      nonVisualReadyCount: 0,
      byCategory: [
        { category: 'Character', required: 2, ready: 1, missing: 1 },
        { category: 'Location', required: 1, ready: 1, missing: 0 },
      ],
    },
    production: null,
    evaluatedAt: '2026-11-28T00:00:00Z',
  };

  it('renders card with overview-bible-summary and dl definition list', () => {
    render(
      <MemoryRouter>
        <BibleSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          missingBibleEntities={[]}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('overview-bible-summary');
    expect(card).toBeInTheDocument();
    expect(card.querySelector('dl')).toBeInTheDocument();
  });

  it('renders ready progress bar and header required count when requiredTotal > 0', () => {
    render(
      <MemoryRouter>
        <BibleSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          missingBibleEntities={[]}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('overview-bible-summary');
    expect(card).toHaveTextContent('2/3 bắt buộc');
    expect(card).toHaveTextContent('2/3 sẵn sàng');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles requiredTotal === 0 without displaying 0/0 and shows bibleNoRequired', () => {
    const zeroReadiness: ChapterReadinessDto = {
      ...mockReadiness,
      bible: {
        ...mockReadiness.bible,
        requiredTotal: 0,
        readyCount: 0,
        missingArtCount: 0,
        missingDefinitionCount: 0,
        pendingApprovalCount: 0,
        crowdOptionalCount: 0,
        byCategory: [],
      },
    };

    render(
      <MemoryRouter>
        <BibleSummaryCard
          chapter={mockChapter}
          readiness={zeroReadiness}
          missingBibleEntities={[]}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('overview-bible-summary');
    expect(card).toHaveTextContent('Không có tài liệu bắt buộc');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();
  });

  it('renders category breakdown badges', () => {
    render(
      <MemoryRouter>
        <BibleSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          missingBibleEntities={[]}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Nhân vật: 1\/2/)).toBeInTheDocument();
    expect(screen.getByText(/Bối cảnh: 1\/1/)).toBeInTheDocument();
  });

  it('limits missing entities to 3 and shows +n when more exist', () => {
    const missingEntities = [
      { bibleEntryId: 'e-1', name: 'Goku' },
      { bibleEntryId: 'e-2', name: 'Vegeta' },
      { bibleEntryId: 'e-3', name: 'Piccolo' },
      { bibleEntryId: 'e-4', name: 'Gohan' },
      { bibleEntryId: 'e-5', name: 'Trunks' },
    ];

    render(
      <MemoryRouter>
        <BibleSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          missingBibleEntities={missingEntities}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Goku')).toBeInTheDocument();
    expect(screen.getByText('Vegeta')).toBeInTheDocument();
    expect(screen.getByText('Piccolo')).toBeInTheDocument();
    expect(screen.queryByText('Gohan')).not.toBeInTheDocument();
    expect(screen.queryByText('Trunks')).not.toBeInTheDocument();

    // +2 button
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('navigates when clicking open-chapter-references-btn', () => {
    render(
      <MemoryRouter>
        <BibleSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          missingBibleEntities={[]}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const btn = screen.getByTestId('open-chapter-references-btn');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/workspaces/ws-1/series/series-1/chapters/chap-1/script/review?tab=entities',
    );
  });
});
