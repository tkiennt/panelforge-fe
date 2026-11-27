import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProducerChapterManagementView } from './ProducerChapterManagementView';
import { chapterService } from '@/services/chapter.service';
import { chapterCastService } from '@/services/chapterCast.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { pageService } from '@/services/page.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    getChapterById: vi.fn(),
    getChapterReadiness: vi.fn(),
    getChapterReviews: vi.fn(),
    createChapter: vi.fn(),
    updateChapter: vi.fn(),
    deleteChapter: vi.fn(),
    getChapterLockGate: vi.fn(),
    unfreezeScript: vi.fn(),
  },
}));

vi.mock('@/services/chapterCast.service', () => ({
  chapterCastService: {
    getChapterCast: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
  },
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getPipelineStages: vi.fn(),
  },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
  },
}));

vi.mock('@/shared/modals/StartProductionModal', () => ({
  StartProductionModal: ({ isOpen, onClose, onSuccess }: any) =>
    isOpen ? (
      <div data-testid='start-production-modal'>
        <span>StartProductionModal Mock</span>
        <button onClick={onSuccess}>Xác nhận bắt đầu</button>
        <button onClick={onClose}>Đóng</button>
      </div>
    ) : null,
}));

vi.mock('@/shared/modals/RefreezeScriptModal', () => ({
  RefreezeScriptModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid='refreeze-script-modal'>
        <button onClick={onClose}>Đóng</button>
      </div>
    ) : null,
}));

vi.mock('../modals/ChapterAssignmentsModal', () => ({
  ChapterAssignmentsModal: () => null,
}));
vi.mock('../modals/ChapterEditionsModal', () => ({
  ChapterEditionsModal: () => null,
}));
vi.mock('../modals/PreviewLinksModal', () => ({
  PreviewLinksModal: () => null,
}));
vi.mock('@/shared/features/provenance/ChapterProvenanceModal', () => ({
  ChapterProvenanceModal: () => null,
}));

describe('ProducerChapterManagementView (Unified Chapter Production Hub)', () => {
  const mockSeries = { id: 'series-1', title: 'Dragon Saga' };
  const mockChapters = [
    {
      id: 'chap-1',
      seriesId: 'series-1',
      chapterNumber: 1,
      title: 'Khởi đầu mới',
      status: 'PreProduction',
      scriptStatus: 'InReview',
      isScriptFrozen: false,
      lastSubmittedVersionId: 'ver-3',
      targetReleaseDate: '2026-12-01',
      pagesCount: 20,
      scenesCount: 4,
      versionVector: 2,
    },
    {
      id: 'chap-2',
      seriesId: 'series-1',
      chapterNumber: 2,
      title: 'Đêm định mệnh',
      status: 'InProduction',
      scriptStatus: 'Frozen',
      isScriptFrozen: true,
      lastSubmittedVersionId: 'ver-5',
      frozenScriptVersionId: 'ver-4',
      targetReleaseDate: '2026-12-15',
      pagesCount: 18,
      scenesCount: 3,
      versionVector: 7,
    },
  ];

  const renderHub = (chapterId = 'chap-1') =>
    render(
      <MemoryRouter
        initialEntries={[`/workspaces/ws-1/series/series-1/chapters?chapterId=${chapterId}`]}
      >
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/chapters'
            element={<ProducerChapterManagementView workspaceRole='PRODUCER' />}
          />
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/chapters/:chapterId/script/review'
            element={<div data-testid='canonical-script-workspace'>Script Workspace</div>}
          />
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/workspace'
            element={<div data-testid='canonical-production-board'>Production Board</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    (seriesService.getSeriesById as any).mockResolvedValue(mockSeries);
    (chapterService.getChaptersBySeries as any).mockResolvedValue({
      items: mockChapters,
      totalCount: 2,
    });
    (pipelineService.getPipelineStages as any).mockResolvedValue([
      { id: 'st-1', name: 'Pencil', stageOrder: 1, isEnabled: true },
      { id: 'st-2', name: 'Ink', stageOrder: 2, isEnabled: true },
    ]);
    (pageService.getPagesByChapter as any).mockResolvedValue([{ id: 'p1', pageNumber: 1 }]);
    (chapterService.getChapterLockGate as any).mockResolvedValue(null);
    (chapterService.getChapterReviews as any).mockResolvedValue([]);
    (chapterCastService.getChapterCast as any).mockResolvedValue({
      chapterId: 'chap-1',
      entities: [],
      submitGate: { canSubmit: true, blockers: [] },
      gate: { canStart: true, blockers: [] },
    });
  });

  it('Scenario A/B: shows blockers, disables Start Production with explicit reason, and deep-links to detail', async () => {
    (chapterService.getChapterById as any).mockResolvedValue(mockChapters[0]);
    (chapterService.getChapterReadiness as any).mockResolvedValue({
      chapterId: 'chap-1',
      seriesId: 'series-1',
      chapterNumber: 1,
      chapterTitle: 'Khởi đầu mới',
      chapterStatus: 'PreProduction',
      targetReleaseDate: '2026-12-01',
      isHandedOff: false,
      evaluatedScriptVersionId: 'ver-3',
      status: 'NOT_READY',
      canStartProduction: false,
      checks: [
        {
          code: 'SCRIPT_SUBMITTED',
          group: 'SCRIPT',
          label: 'Kịch bản đã gửi duyệt',
          passed: true,
          mandatory: true,
          statusText: 'Đã nộp v3',
        },
        {
          code: 'BIBLE_CANON_LOCKED',
          group: 'BIBLE',
          label: 'Tài liệu tham khảo bắt buộc đã khóa chuẩn',
          passed: false,
          mandatory: true,
          statusText: '2/3 đã sẵn sàng',
          reason: 'Còn 1 tài nguyên chưa khóa chuẩn Canon.',
          resolutionTarget: {
            workspace: 'pre-production',
            section: 'entities',
            resourceId: 'ent-3',
          },
        },
      ],
      blockers: [
        {
          code: 'BIBLE_REFERENCE_BLOCKED',
          severity: 'BLOCKING',
          message: 'Vegeta: Bản Mặc định v1 chưa được khoá Canon (chờ Artist vẽ).',
          resourceType: 'bible_entry',
          resourceId: 'ent-3',
          resolutionTarget: {
            workspace: 'pre-production',
            section: 'entities',
            resourceId: 'ent-3',
          },
        },
      ],
      warnings: [],
      summary: { required: 2, passed: 1, remaining: 1 },
      script: {
        latestVersionId: 'ver-3',
        latestVersionNumber: 3,
        approvedVersionId: 'ver-3',
        approvedVersionNumber: 3,
        productionVersionId: null,
        productionVersionNumber: null,
        scriptStatus: 'InReview',
        isScriptFrozen: false,
        hasUnpushedDraftChanges: false,
        sceneCount: 4,
        pageCount: 20,
        panelCount: 80,
        lineCount: 120,
        unresolvedCommentsCount: 0,
        openFindingsCount: 0,
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
        byCategory: [{ category: 'Character', required: 3, ready: 2, missing: 1 }],
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
        totalPages: 20,
        completedPages: 0,
        pageProgressPercent: 0,
        totalPanels: 80,
        approvedPanels: 0,
        panelProgressPercent: 0,
        stages: [],
      },
      evaluatedAt: '2026-11-27T05:00:00Z',
    });

    renderHub('chap-1');

    await waitFor(() => {
      expect(screen.getByTestId('overview-readiness-center')).toBeInTheDocument();
      expect(screen.getByTestId('overview-start-production-btn')).toBeDisabled();
    });

    expect(screen.getByTestId('start-production-disabled-reason')).toHaveTextContent('Vegeta');
    expect(screen.getByTestId('overview-script-summary')).toHaveTextContent('v3');
    expect(screen.getByTestId('overview-bible-summary')).toHaveTextContent('2/3 bắt buộc');
    expect(screen.getByTestId('action-blocker-BIBLE_REFERENCE_BLOCKED')).toBeInTheDocument();

    // Clicking Open Script Workspace navigates to canonical Script Workspace
    fireEvent.click(screen.getByTestId('open-script-workspace-btn'));
    expect(await screen.findByTestId('canonical-script-workspace')).toBeInTheDocument();
  });

  it('Scenario D/E: enables Start Production when all mandatory gates pass even with warnings', async () => {
    (chapterService.getChapterById as any).mockResolvedValue(mockChapters[0]);
    (chapterService.getChapterReadiness as any).mockResolvedValue({
      chapterId: 'chap-1',
      seriesId: 'series-1',
      chapterNumber: 1,
      chapterTitle: 'Khởi đầu mới',
      chapterStatus: 'PreProduction',
      isHandedOff: false,
      status: 'READY',
      canStartProduction: true,
      checks: [
        {
          code: 'SCRIPT_SUBMITTED',
          group: 'SCRIPT',
          label: 'Kịch bản đã gửi duyệt',
          passed: true,
          mandatory: true,
          statusText: 'Đã nộp v3',
        },
      ],
      blockers: [],
      warnings: [
        { code: 'UNRESOLVED_SCRIPT_COMMENTS', severity: 'WARNING', message: 'Còn 1 góp ý mở.' },
      ],
      summary: { required: 1, passed: 1, remaining: 0 },
      script: {
        latestVersionNumber: 3,
        approvedVersionNumber: 3,
        productionVersionNumber: null,
        scriptStatus: 'InReview',
        isScriptFrozen: false,
        hasUnpushedDraftChanges: false,
        sceneCount: 4,
        pageCount: 20,
        panelCount: 80,
        lineCount: 120,
        unresolvedCommentsCount: 1,
        openFindingsCount: 0,
      },
      bible: {
        requiredTotal: 2,
        readyCount: 2,
        missingDefinitionCount: 0,
        missingArtCount: 0,
        pendingApprovalCount: 0,
        reworkCount: 0,
        crowdOptionalCount: 1,
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
        totalPages: 20,
        completedPages: 0,
        pageProgressPercent: 0,
        totalPanels: 80,
        approvedPanels: 0,
        panelProgressPercent: 0,
        stages: [],
      },
      evaluatedAt: '2026-11-27T05:00:00Z',
    });

    renderHub('chap-1');

    await waitFor(() => {
      expect(screen.getByTestId('overview-start-production-btn')).toBeEnabled();
      expect(screen.getByTestId('lifecycle-step-ready_for_production')).toHaveAttribute(
        'data-step-state',
        'current',
      );
    });

    fireEvent.click(screen.getByTestId('overview-start-production-btn'));
    expect(await screen.findByTestId('start-production-modal')).toBeInTheDocument();
  });

  it('Scenario G/H: InProduction separates Task/Page/Panel progress and distinguishes Latest vs Production script version', async () => {
    (chapterService.getChapterById as any).mockResolvedValue(mockChapters[1]);
    (chapterService.getChapterReadiness as any).mockResolvedValue({
      chapterId: 'chap-2',
      seriesId: 'series-1',
      chapterNumber: 2,
      chapterTitle: 'Đêm định mệnh',
      chapterStatus: 'InProduction',
      isHandedOff: false,
      status: 'STARTED',
      canStartProduction: false,
      checks: [],
      blockers: [],
      warnings: [],
      summary: { required: 4, passed: 4, remaining: 0 },
      script: {
        latestVersionNumber: 5,
        approvedVersionNumber: 5,
        productionVersionNumber: 4,
        scriptStatus: 'Frozen',
        isScriptFrozen: true,
        hasUnpushedDraftChanges: false,
        sceneCount: 3,
        pageCount: 18,
        panelCount: 60,
        lineCount: 95,
        unresolvedCommentsCount: 0,
        openFindingsCount: 0,
      },
      bible: {
        requiredTotal: 3,
        readyCount: 3,
        missingDefinitionCount: 0,
        missingArtCount: 0,
        pendingApprovalCount: 0,
        reworkCount: 0,
        crowdOptionalCount: 0,
        nonVisualReadyCount: 0,
        byCategory: [],
      },
      production: {
        totalTasks: 9,
        approvedTasks: 4,
        submittedTasks: 2,
        inProgressTasks: 3,
        reworkTasks: 0,
        unassignedTasks: 0,
        overdueTasks: 0,
        taskProgressPercent: 44,
        totalPages: 3,
        completedPages: 1,
        pageProgressPercent: 33,
        totalPanels: 12,
        approvedPanels: 0,
        panelProgressPercent: 0,
        stages: [
          {
            stageId: 'st-1',
            stageName: 'Pencil',
            stageOrder: 1,
            totalTasks: 3,
            approvedTasks: 3,
            submittedTasks: 0,
            inProgressTasks: 0,
            reworkTasks: 0,
            unassignedTasks: 0,
          },
        ],
      },
      evaluatedAt: '2026-11-27T05:00:00Z',
    });

    renderHub('chap-2');

    await waitFor(() => {
      expect(screen.getByTestId('header-chapter-lifecycle-badge')).toHaveTextContent(
        'Đang sản xuất',
      );
      expect(screen.getByTestId('header-script-lock-badge')).toHaveTextContent('Kịch bản: Đã khóa');
      expect(screen.getByTestId('metric-task-progress')).toHaveTextContent('4/9 (44%)');
      expect(screen.getByTestId('metric-page-progress')).toHaveTextContent('1/3 (33%)');
      expect(screen.getByTestId('metric-panel-progress')).toHaveTextContent('0/12 (0%)');
    });

    expect(screen.getByTestId('overview-script-summary')).toHaveTextContent('v5');
    expect(screen.getByTestId('overview-script-summary')).toHaveTextContent('v4');
    expect(screen.getByTestId('hub-primary-action')).toHaveTextContent('Mở Bảng sản xuất');
  });

  it('P1-2: Action Center lists unassigned, pending review, rework, and overdue production tasks with link to Production Board', async () => {
    (chapterService.getChapterById as any).mockResolvedValue(mockChapters[1]);
    (chapterService.getChapterReadiness as any).mockResolvedValue({
      chapterId: 'chap-2',
      seriesId: 'series-1',
      chapterNumber: 2,
      chapterTitle: 'Đêm định mệnh',
      chapterStatus: 'InProduction',
      isHandedOff: false,
      status: 'STARTED',
      canStartProduction: false,
      checks: [],
      blockers: [],
      warnings: [],
      summary: { required: 3, passed: 3, remaining: 0 },
      script: {
        latestVersionNumber: 5,
        approvedVersionNumber: 5,
        productionVersionNumber: 5,
        scriptStatus: 'Frozen',
        isScriptFrozen: true,
        hasUnpushedDraftChanges: false,
        sceneCount: 3,
        pageCount: 18,
        panelCount: 60,
        lineCount: 95,
        unresolvedCommentsCount: 0,
        openFindingsCount: 0,
      },
      bible: {
        requiredTotal: 2,
        readyCount: 2,
        missingDefinitionCount: 0,
        missingArtCount: 0,
        pendingApprovalCount: 0,
        reworkCount: 0,
        crowdOptionalCount: 0,
        nonVisualReadyCount: 0,
        byCategory: [],
      },
      production: {
        totalTasks: 9,
        approvedTasks: 2,
        submittedTasks: 1,
        inProgressTasks: 1,
        reworkTasks: 1,
        unassignedTasks: 4,
        overdueTasks: 1,
        taskProgressPercent: 22,
        totalPages: 3,
        completedPages: 0,
        pageProgressPercent: 0,
        totalPanels: 12,
        approvedPanels: 0,
        panelProgressPercent: 0,
        stages: [],
      },
      evaluatedAt: '2026-11-27T05:00:00Z',
    });

    renderHub('chap-2');

    expect(await screen.findByTestId('action-production-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-rework')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-submitted')).toBeInTheDocument();
    expect(screen.getByTestId('action-production-unassigned')).toBeInTheDocument();
    expect(screen.queryByText('Không có việc cần xử lý ngay.')).not.toBeInTheDocument();
  });

  it('P1-4: shows descriptive empty state instead of 0/0 (0%) and 0/0 bắt buộc when totals are zero', async () => {
    (chapterService.getChapterById as any).mockResolvedValue(mockChapters[1]);
    (chapterService.getChapterReadiness as any).mockResolvedValue({
      chapterId: 'chap-2',
      seriesId: 'series-1',
      chapterNumber: 2,
      chapterTitle: 'Đêm định mệnh',
      chapterStatus: 'HandedOffAndPublished',
      isHandedOff: true,
      status: 'STARTED',
      canStartProduction: false,
      checks: [],
      blockers: [],
      warnings: [],
      summary: { required: 0, passed: 0, remaining: 0 },
      script: {
        latestVersionNumber: 1,
        approvedVersionNumber: 1,
        productionVersionNumber: 1,
        scriptStatus: 'Frozen',
        isScriptFrozen: true,
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
        stages: [
          {
            stageId: 'st-1',
            stageName: 'Pencil',
            stageOrder: 1,
            totalTasks: 0,
            approvedTasks: 0,
            submittedTasks: 0,
            inProgressTasks: 0,
            reworkTasks: 0,
            unassignedTasks: 0,
          },
        ],
      },
      evaluatedAt: '2026-11-27T05:00:00Z',
    });

    renderHub('chap-2');

    await waitFor(() => {
      expect(screen.getByTestId('metric-task-progress')).toHaveTextContent('Chưa có công việc');
      expect(screen.getByTestId('metric-page-progress')).toHaveTextContent('Chưa có trang');
      expect(screen.getByTestId('metric-panel-progress')).toHaveTextContent('Chưa có khung tranh');
      expect(screen.getByTestId('overview-bible-summary')).toHaveTextContent(
        'Không có tài liệu bắt buộc',
      );
    });
    expect(screen.queryByText(/0\/0/)).not.toBeInTheDocument();
  });
});
