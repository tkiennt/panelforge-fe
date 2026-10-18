import { describe, it, expect } from 'vitest';
import {
  getActivePipelineStages,
  computePageStageStatus,
  computePageProgressSummary,
  computeUnfinishedPagesWarning,
  formatUnfinishedWarningText,
} from './chapterReviewStatus';
import type { PipelineStageDto } from '@/services/pipeline.service';
import type { AssignmentDto, StageProgressDto } from '@/types';

describe('chapterReviewStatus', () => {
  const mockStages: PipelineStageDto[] = [
    {
      id: 'stg-1',
      name: 'Script',
      slug: 'script',
      stageOrder: 1,
      isInitial: true,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-2',
      name: 'Thumbnail',
      slug: 'thumbnail',
      stageOrder: 2,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-3',
      name: 'Pencil',
      slug: 'pencil',
      stageOrder: 3,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-4',
      name: 'Ink',
      slug: 'ink',
      stageOrder: 4,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-5',
      name: 'Color',
      slug: 'color',
      stageOrder: 5,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: false,
    }, // Stage tắt bị bỏ
    {
      id: 'stg-6',
      name: 'Letter',
      slug: 'letter',
      stageOrder: 6,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-7',
      name: 'Review',
      slug: 'review',
      stageOrder: 7,
      isInitial: false,
      isTerminal: false,
      isApprovalGate: false,
      isEnabled: true,
    },
    {
      id: 'stg-8',
      name: 'Approved',
      slug: 'approved',
      stageOrder: 8,
      isInitial: false,
      isTerminal: true,
      isApprovalGate: false,
      isEnabled: true,
    },
  ];

  it('stage tắt bị bỏ: getActivePipelineStages lọc bỏ các stage có isEnabled === false', () => {
    const active = getActivePipelineStages(mockStages);
    expect(active.map((s) => s.slug)).toEqual([
      'script',
      'thumbnail',
      'pencil',
      'ink',
      'letter',
      'review',
      'approved',
    ]);
    expect(active.find((s) => s.slug === 'color')).toBeUndefined();
  });

  it('đủ duyệt: trả về Approved khi mọi Panel của trang đều Approved ở stage đó', () => {
    const stage = mockStages[1]; // Thumbnail
    const pagePanelIds = ['panel-1', 'panel-2', 'panel-3'];
    const progressList: StageProgressDto[] = [
      {
        id: 'p1',
        pageId: 'page-1',
        panelId: 'panel-1',
        pipelineStageId: 'stg-2',
        status: 'Approved',
      },
      {
        id: 'p2',
        pageId: 'page-1',
        panelId: 'panel-2',
        pipelineStageId: 'stg-2',
        status: 'Approved',
      },
      {
        id: 'p3',
        pageId: 'page-1',
        panelId: 'panel-3',
        pipelineStageId: 'stg-2',
        status: 'Approved',
      },
    ];

    const status = computePageStageStatus('page-1', stage, pagePanelIds, progressList);
    expect(status).toBe('Approved');
  });

  it('một Panel cần làm lại: trả về ChangesRequested khi có ít nhất một Panel bị yêu cầu sửa (ưu tiên tệ nhất)', () => {
    const stage = mockStages[2]; // Pencil
    const pagePanelIds = ['panel-1', 'panel-2', 'panel-3'];
    const progressList: StageProgressDto[] = [
      {
        id: 'p1',
        pageId: 'page-1',
        panelId: 'panel-1',
        pipelineStageId: 'stg-3',
        status: 'Approved',
      },
      {
        id: 'p2',
        pageId: 'page-1',
        panelId: 'panel-2',
        pipelineStageId: 'stg-3',
        status: 'ChangesRequested',
      },
      {
        id: 'p3',
        pageId: 'page-1',
        panelId: 'panel-3',
        pipelineStageId: 'stg-3',
        status: 'InProgress',
      },
    ];

    const status = computePageStageStatus('page-1', stage, pagePanelIds, progressList);
    expect(status).toBe('ChangesRequested');
  });

  it('stage cấp Chapter: lấy trạng thái từ chính Assignment cấp Chapter (Script, Review)', () => {
    const scriptStage = mockStages[0]; // Script (isInitial: true)
    const reviewStage = mockStages[6]; // Review (cấp Chapter)

    const chapterAssignments: AssignmentDto[] = [
      {
        id: 'assign-script',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Chapter',
        targetEntityId: 'c1',
        pipelineStageId: 'stg-1',
        assigneeUserId: 'user-writer',
        assignedRole: 'WRITER' as any,
        brief: 'Viết kịch bản',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-17T00:00:00Z',
      },
      {
        id: 'assign-review',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Chapter',
        targetEntityId: 'c1',
        pipelineStageId: 'stg-7',
        assigneeUserId: 'user-editor',
        assignedRole: 'EDITOR' as any,
        brief: 'Duyệt chương',
        priority: 'High',
        status: 'InProgress',
        createdAt: '2026-10-17T00:00:00Z',
      },
    ];

    // Dù panelIds rỗng hay có panel, Script lấy từ assignment Script
    const scriptStatus = computePageStageStatus(
      'page-1',
      scriptStage,
      ['panel-1'],
      [],
      chapterAssignments,
    );
    expect(scriptStatus).toBe('Approved');

    // Review lấy từ assignment Review
    const reviewStatus = computePageStageStatus(
      'page-1',
      reviewStage,
      ['panel-1'],
      [],
      chapterAssignments,
    );
    expect(reviewStatus).toBe('InProgress');
  });

  it('tóm tắt tiến độ: hiển thị "N khung · đủ X/Y công đoạn"', () => {
    const active = getActivePipelineStages(mockStages); // 7 stages đang bật (bỏ Color)
    const pagePanelIds = ['p-1', 'p-2'];
    const progressList: StageProgressDto[] = [
      // Thumbnail
      { id: '1', pageId: 'pg-1', panelId: 'p-1', pipelineStageId: 'stg-2', status: 'Approved' },
      { id: '2', pageId: 'pg-1', panelId: 'p-2', pipelineStageId: 'stg-2', status: 'Approved' },
      // Pencil
      { id: '3', pageId: 'pg-1', panelId: 'p-1', pipelineStageId: 'stg-3', status: 'Approved' },
      { id: '4', pageId: 'pg-1', panelId: 'p-2', pipelineStageId: 'stg-3', status: 'Approved' },
    ];
    const chapterAssignments: AssignmentDto[] = [
      // Script
      {
        id: 'a-script',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Chapter',
        targetEntityId: 'c1',
        pipelineStageId: 'stg-1',
        assigneeUserId: 'u1',
        assignedRole: 'WRITER' as any,
        brief: 'Script',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-17T00:00:00Z',
      },
    ];

    const summary = computePageProgressSummary(
      'pg-1',
      pagePanelIds,
      active,
      progressList,
      chapterAssignments,
    );

    expect(summary.panelCount).toBe(2);
    expect(summary.totalActiveStages).toBe(7);
    // Đã duyệt: Script, Thumbnail, Pencil = 3
    expect(summary.approvedStageCount).toBe(3);
    expect(summary.summaryText).toBe('2 khung · đủ 3/7 công đoạn');
  });

  it('cảnh báo đỏ: phát hiện các trang chưa hoàn tất các công đoạn trước Review', () => {
    // Pipeline gồm cả Color đang bật
    const stagesWithColor = mockStages.map((s) => ({ ...s, isEnabled: true }));
    const active = getActivePipelineStages(stagesWithColor);

    const pages = [
      { id: 'page-1', pageNumber: 1 },
      { id: 'page-2', pageNumber: 2 },
    ];

    const getPanels = (pageId: string) => (pageId === 'page-1' ? ['p1-1'] : ['p2-1']);

    const progressList: StageProgressDto[] = [
      // Trang 1: xong hết từ Thumbnail đến Letter
      { id: '1', pageId: 'page-1', panelId: 'p1-1', pipelineStageId: 'stg-2', status: 'Approved' },
      { id: '2', pageId: 'page-1', panelId: 'p1-1', pipelineStageId: 'stg-3', status: 'Approved' },
      { id: '3', pageId: 'page-1', panelId: 'p1-1', pipelineStageId: 'stg-4', status: 'Approved' },
      { id: '4', pageId: 'page-1', panelId: 'p1-1', pipelineStageId: 'stg-5', status: 'Approved' },
      { id: '5', pageId: 'page-1', panelId: 'p1-1', pipelineStageId: 'stg-6', status: 'Approved' },
      // Trang 2: mới xong Thumbnail
      { id: '6', pageId: 'page-2', panelId: 'p2-1', pipelineStageId: 'stg-2', status: 'Approved' },
    ];

    const chapterAssignments: AssignmentDto[] = [
      // Script: đã duyệt
      {
        id: 'a-script',
        seriesId: 's1',
        chapterId: 'c1',
        entityType: 'Chapter',
        targetEntityId: 'c1',
        pipelineStageId: 'stg-1',
        assigneeUserId: 'u1',
        assignedRole: 'WRITER' as any,
        brief: 'Script',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-17T00:00:00Z',
      },
    ];

    const warnings = computeUnfinishedPagesWarning(
      pages,
      getPanels,
      active,
      progressList,
      chapterAssignments,
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0].pageNumber).toBe(2);
    expect(warnings[0].incompleteStageNames).toEqual(['Pencil', 'Ink', 'Color', 'Letter']);
    expect(formatUnfinishedWarningText(warnings[0])).toBe(
      'Trang 2 chưa xong: Pencil, Ink, Color, Letter',
    );
  });
});
