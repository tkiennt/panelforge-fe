import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ScriptSummaryCard } from './ScriptSummaryCard';
import type { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ScriptSummaryCard', () => {
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
      latestVersionId: 'v-3',
      latestVersionNumber: 3,
      approvedVersionId: 'v-2',
      approvedVersionNumber: 2,
      productionVersionId: 'v-1',
      productionVersionNumber: 1,
      scriptStatus: 'Approved',
      isScriptFrozen: true,
      hasUnpushedDraftChanges: false,
      sceneCount: 5,
      pageCount: 10,
      panelCount: 30,
      lineCount: 100,
      unresolvedCommentsCount: 2,
      openFindingsCount: 1,
      lastUpdatedAt: '2026-11-28T10:00:00Z',
    },
    bible: {
      requiredTotal: 3,
      readyCount: 2,
      missingDefinitionCount: 0,
      missingArtCount: 1,
      pendingApprovalCount: 0,
      reworkCount: 0,
      crowdOptionalCount: 1,
      nonVisualReadyCount: 0,
      byCategory: [],
    },
    production: null,
    evaluatedAt: '2026-11-28T00:00:00Z',
  };

  it('renders card with overview-script-summary test id and definition list', () => {
    render(
      <MemoryRouter>
        <ScriptSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('overview-script-summary');
    expect(card).toBeInTheDocument();
    expect(card.querySelector('dl')).toBeInTheDocument();
  });

  it('displays version numbers correctly (v3, v2, v1)', () => {
    render(
      <MemoryRouter>
        <ScriptSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('overview-script-summary');
    expect(card).toHaveTextContent('v3');
    expect(card).toHaveTextContent('v2');
    expect(card).toHaveTextContent('v1');
  });

  it('displays scene, pages/panels, open comments, and consistency alerts counters', () => {
    render(
      <MemoryRouter>
        <ScriptSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('overview-script-summary');
    expect(card).toHaveTextContent('5');
    expect(card).toHaveTextContent('10 / 30');
    expect(card).toHaveTextContent('2');
    expect(card).toHaveTextContent('1');
  });

  it('falls back when versions are null', () => {
    const emptyScriptReadiness: ChapterReadinessDto = {
      ...mockReadiness,
      script: {
        ...mockReadiness.script,
        latestVersionNumber: null,
        approvedVersionNumber: null,
        productionVersionNumber: null,
      },
    };

    render(
      <MemoryRouter>
        <ScriptSummaryCard
          chapter={mockChapter}
          readiness={emptyScriptReadiness}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const card = screen.getByTestId('overview-script-summary');
    expect(card).toHaveTextContent('—');
  });

  it('navigates when clicking open-script-workspace-btn', () => {
    render(
      <MemoryRouter>
        <ScriptSummaryCard
          chapter={mockChapter}
          readiness={mockReadiness}
          workspaceId='ws-1'
          seriesId='series-1'
        />
      </MemoryRouter>,
    );

    const btn = screen.getByTestId('open-script-workspace-btn');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/workspaces/ws-1/series/series-1/chapters/chap-1/script/review',
    );
  });
});
