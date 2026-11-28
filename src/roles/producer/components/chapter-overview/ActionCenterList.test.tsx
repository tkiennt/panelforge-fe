import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ActionCenterList } from './ActionCenterList';
import type { ChapterDto, ChapterReadinessDto } from '@/services/chapter.service';

describe('ActionCenterList', () => {
  const mockChapter: ChapterDto = {
    id: 'chap-1',
    seriesId: 'series-1',
    chapterNumber: 1,
    title: 'Chương 1',
    status: 'PreProduction',
    updatedAt: '2026-11-28T00:00:00Z',
  } as unknown as ChapterDto;

  const createEmptyReadiness = (): ChapterReadinessDto => ({
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
      requiredTotal: 0,
      readyCount: 0,
      missingDefinitionCount: 0,
      missingArtCount: 0,
      pendingApprovalCount: 0,
      reworkCount: 0,
      crowdOptionalCount: 0,
      nonVisualReadyCount: 0,
      byCategory: [],
    },
    production: {
      totalTasks: 0,
      approvedTasks: 0,
      submittedTasks: 0,
      inProgressTasks: 0,
      reworkTasks: 0,
      unassignedTasks: 0,
      overdueTasks: 0,
      taskProgressPercent: 0,
      totalPages: 0,
      completedPages: 0,
      pageProgressPercent: 0,
      totalPanels: 0,
      approvedPanels: 0,
      panelProgressPercent: 0,
      stages: [],
    },
    evaluatedAt: '2026-11-28T00:00:00Z',
  });

  it('renders green empty state when there are no actions (PreProduction vs InProduction)', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ActionCenterList
          workspaceId='ws-1'
          seriesId='series-1'
          chapter={mockChapter}
          readiness={createEmptyReadiness()}
          isPreProduction={true}
        />
      </MemoryRouter>,
    );

    const emptyContainer = screen.getByTestId('overview-action-center');
    expect(emptyContainer).toBeInTheDocument();
    expect(
      screen.getByText(
        /Không có điểm chặn\. Chương sẵn sàng bắt đầu sản xuất\.|No blockers\. Chapter is ready to start production\./,
      ),
    ).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ActionCenterList
          workspaceId='ws-1'
          seriesId='series-1'
          chapter={{ ...mockChapter, status: 'InProduction' }}
          readiness={createEmptyReadiness()}
          isPreProduction={false}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Không có việc cần xử lý ngay\.|No immediate actions required\./),
    ).toBeInTheDocument();
  });

  it('renders <= 3 items without toggle button and applies py-2 row styling', () => {
    const readiness: ChapterReadinessDto = {
      ...createEmptyReadiness(),
      blockers: [
        {
          code: 'BLOCKER_1',
          severity: 'BLOCKING',
          message: 'Điểm chặn 1',
          resourceType: 'script',
          resourceId: 'res-1',
          resolutionTarget: { workspace: 'pre-production', section: 'script' },
        },
      ],
      production: {
        ...createEmptyReadiness().production,
        overdueTasks: 2,
      },
    };

    render(
      <MemoryRouter>
        <ActionCenterList
          workspaceId='ws-1'
          seriesId='series-1'
          chapter={mockChapter}
          readiness={readiness}
        />
      </MemoryRouter>,
    );

    const blockerEl = screen.getByTestId('action-blocker-BLOCKER_1');
    const overdueEl = screen.getByTestId('action-production-overdue');

    expect(blockerEl).toBeInTheDocument();
    expect(overdueEl).toBeInTheDocument();
    expect(blockerEl.className).toContain('py-2');
    expect(overdueEl.className).toContain('py-2');

    // No show more button
    expect(screen.queryByRole('button', { name: /Xem thêm|Show.*more/i })).not.toBeInTheDocument();
  });

  it('renders only first 3 items when >3 items and toggles show more/less', () => {
    const readiness: ChapterReadinessDto = {
      ...createEmptyReadiness(),
      blockers: [
        {
          code: 'BLOCKER_1',
          severity: 'BLOCKING',
          message: 'Điểm chặn 1',
          resourceType: 'script',
          resourceId: 'res-1',
          resolutionTarget: { workspace: 'pre-production', section: 'script' },
        },
      ],
      production: {
        ...createEmptyReadiness().production,
        overdueTasks: 1,
        reworkTasks: 2,
        submittedTasks: 3,
      },
      warnings: [
        {
          code: 'WARN_1',
          severity: 'WARNING',
          message: 'Cảnh báo 1',
          resourceType: 'bible',
          resourceId: 'res-w',
          resolutionTarget: { workspace: 'pre-production', section: 'entities' },
        },
      ],
    };

    // Total items: 1 blocker + 3 production actions (overdue, rework, submitted) + 1 warning = 5 items
    render(
      <MemoryRouter>
        <ActionCenterList
          workspaceId='ws-1'
          seriesId='series-1'
          chapter={mockChapter}
          readiness={readiness}
        />
      </MemoryRouter>,
    );

    // Initial state: only first 3 items visible (blockers -> production actions in order)
    // 1. blocker-BLOCKER_1
    // 2. production-overdue
    // 3. production-rework
    expect(screen.getByTestId('action-blocker-BLOCKER_1')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-rework')).toBeInTheDocument();

    // 4th and 5th items are collapsed
    expect(screen.queryByTestId('action-production-submitted')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-warning-WARN_1')).not.toBeInTheDocument();

    // Show more button exists showing remaining count (5 - 3 = 2)
    const showMoreBtn = screen.getByRole('button', { name: /Xem thêm 2 mục|Show 2 more/i });
    expect(showMoreBtn).toBeInTheDocument();

    // Click show more
    fireEvent.click(showMoreBtn);

    // All 5 items now visible
    expect(screen.getByTestId('action-blocker-BLOCKER_1')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-rework')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-submitted')).toBeInTheDocument();
    expect(screen.getByTestId('action-warning-WARN_1')).toBeInTheDocument();

    // Button changed to Thu gọn / Show less
    const collapseBtn = screen.getByRole('button', { name: /Thu gọn|Show less/i });
    expect(collapseBtn).toBeInTheDocument();

    // Click collapse
    fireEvent.click(collapseBtn);

    // Collapsed back to 3
    expect(screen.getByTestId('action-blocker-BLOCKER_1')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-rework')).toBeInTheDocument();
    expect(screen.queryByTestId('action-production-submitted')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-warning-WARN_1')).not.toBeInTheDocument();
  });

  it('invokes navigation callback when action buttons are clicked', () => {
    const onNavigate = vi.fn();
    const readiness: ChapterReadinessDto = {
      ...createEmptyReadiness(),
      blockers: [
        {
          code: 'BLOCKER_1',
          severity: 'BLOCKING',
          message: 'Điểm chặn 1',
          resourceType: 'script',
          resourceId: 'res-1',
          resolutionTarget: { workspace: 'pre-production', section: 'script' },
        },
      ],
      production: {
        ...createEmptyReadiness().production,
        overdueTasks: 1,
      },
      warnings: [
        {
          code: 'WARN_1',
          severity: 'WARNING',
          message: 'Cảnh báo 1',
          resourceType: 'bible',
          resourceId: 'res-w',
          resolutionTarget: { workspace: 'pre-production', section: 'entities' },
        },
      ],
    };

    render(
      <MemoryRouter>
        <ActionCenterList
          workspaceId='ws-1'
          seriesId='series-1'
          chapter={mockChapter}
          readiness={readiness}
          onNavigate={onNavigate}
        />
      </MemoryRouter>,
    );

    // Click resolve blocker
    const resolveBtn = screen.getByRole('button', { name: /Mở xử lý|Resolve/i });
    fireEvent.click(resolveBtn);
    expect(onNavigate).toHaveBeenCalledWith(
      '/workspaces/ws-1/series/series-1/chapters/chap-1/script/review',
    );

    // Click open production board
    const prodBoardBtn = screen.getByRole('button', {
      name: /Mở bảng sản xuất|Open production board|Mở bảng/i,
    });
    fireEvent.click(prodBoardBtn);
    expect(onNavigate).toHaveBeenCalledWith(
      '/workspaces/ws-1/series/series-1/workspace?chapterId=chap-1&tab=progress',
    );

    // Click warning view details
    const viewDetailsBtn = screen.getByRole('button', { name: /Xem chi tiết|View details/i });
    fireEvent.click(viewDetailsBtn);
    expect(onNavigate).toHaveBeenCalledWith(
      '/workspaces/ws-1/series/series-1/chapters/chap-1/script/review?tab=entities',
    );
  });
});
