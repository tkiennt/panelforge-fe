import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditorChapterDetail } from './EditorChapterDetail';
import { assignmentService } from '@/services/assignment.service';
import { pipelineService } from '@/services/pipeline.service';
import type {
  ChangeRequestDto,
  ChapterReviewStatsDto,
  ConsistencyFindingDto,
  StageProgressDto,
} from '@/types';
import type { PipelineStageDto } from '@/services/pipeline.service';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getChangeRequests: vi.fn(),
    getConsistencyFindings: vi.fn(),
    getStageProgress: vi.fn(),
  },
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getPipelineStages: vi.fn(),
  },
}));

const chapterStats = (
  n: number,
  over: Partial<ChapterReviewStatsDto> = {},
): ChapterReviewStatsDto => ({
  chapterId: `c${n}`,
  chapterNumber: n,
  title: `Tập ${n}`,
  status: 'InProduction',
  scriptStatus: 'Frozen',
  waitingReview: 0,
  inReview: 0,
  openChangeRequests: 0,
  resolvedChangeRequests: 0,
  verifiedChangeRequests: 0,
  overdueChangeRequests: 0,
  openFindings: 0,
  blockingFindings: 0,
  approved: 0,
  rejected: 0,
  firstPassApproved: 0,
  tasksTotal: 10,
  tasksApproved: 6,
  tasksInProgress: 2,
  tasksRework: 1,
  tasksOverdue: 1,
  ...over,
});

const renderDetail = (row = chapterStats(1)) =>
  render(
    <MemoryRouter>
      <EditorChapterDetail workspaceId='w1' seriesId='s1' row={row} />
    </MemoryRouter>,
  );

describe('EditorChapterDetail', () => {
  beforeEach(() => {
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);
    vi.mocked(assignmentService.getConsistencyFindings).mockResolvedValue([]);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([] as StageProgressDto[]);
    vi.mocked(pipelineService.getPipelineStages).mockResolvedValue([] as PipelineStageDto[]);
  });

  it('shows 2 Resolved change requests in editor-dash-to-verify', async () => {
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValueOnce([
      {
        id: 'cr-1',
        assignmentId: 'a1',
        chapterId: 'c1',
        responsibleUserId: 'u1',
        createdByUserId: 'u2',
        description: 'Sửa mắt nhân vật',
        status: 'Resolved',
        resolutionNote: 'Đã chỉnh lại tròng mắt',
        createdAt: '2026-11-20T00:00:00Z',
      } as ChangeRequestDto,
      {
        id: 'cr-2',
        assignmentId: 'a1',
        chapterId: 'c1',
        responsibleUserId: 'u1',
        createdByUserId: 'u2',
        description: 'Đổi phông chữ thoại',
        status: 'Resolved',
        resolutionNote: 'Đã đổi sang CC Wild Words',
        createdAt: '2026-11-20T00:00:00Z',
      } as ChangeRequestDto,
      {
        id: 'cr-3',
        assignmentId: 'a1',
        chapterId: 'c1',
        responsibleUserId: 'u1',
        createdByUserId: 'u2',
        description: 'Vẽ lại nền',
        status: 'Open',
        createdAt: '2026-11-20T00:00:00Z',
      } as ChangeRequestDto,
    ]);

    renderDetail();

    const toVerify = await screen.findByTestId('editor-dash-to-verify');
    const items = within(toVerify).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Sửa mắt nhân vật');
    expect(items[1].textContent).toContain('Đổi phông chữ thoại');
    expect(toVerify.textContent).not.toContain('Vẽ lại nền');
  });

  it('displays overdue Open change requests with text-rose-700', async () => {
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValueOnce([
      {
        id: 'cr-overdue',
        assignmentId: 'a1',
        chapterId: 'c1',
        responsibleUserId: 'u1',
        createdByUserId: 'u2',
        description: 'Yêu cầu quá hạn',
        status: 'Open',
        dueDate: '2020-01-01T00:00:00Z',
        createdAt: '2020-01-01T00:00:00Z',
      } as ChangeRequestDto,
      {
        id: 'cr-future',
        assignmentId: 'a1',
        chapterId: 'c1',
        responsibleUserId: 'u1',
        createdByUserId: 'u2',
        description: 'Yêu cầu còn hạn',
        status: 'Open',
        dueDate: '2099-01-01T00:00:00Z',
        createdAt: '2026-11-20T00:00:00Z',
      } as ChangeRequestDto,
    ]);

    renderDetail();

    const openSection = await screen.findByTestId('editor-dash-open-requests');
    const items = within(openSection).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const overdueSpan = items[0].querySelector('span.text-rose-700');
    expect(overdueSpan).not.toBeNull();
    expect(overdueSpan?.className).toContain('text-rose-700');

    const futureSpan = items[1].querySelector('span.text-stone-500');
    expect(futureSpan).not.toBeNull();
    expect(items[1].querySelector('span.text-rose-700')).toBeNull();
  });

  it('sorts Blocking findings before Warning findings', async () => {
    vi.mocked(assignmentService.getConsistencyFindings).mockResolvedValueOnce([
      {
        id: 'f-warn',
        chapterId: 'c1',
        ruleCode: 'R1',
        severity: 'Warning',
        status: 'Open',
        message: 'Cảnh báo màu tóc',
        lastDetectedAt: '2026-11-20T00:00:00Z',
        createdAt: '2026-11-20T00:00:00Z',
      } as ConsistencyFindingDto,
      {
        id: 'f-block',
        chapterId: 'c1',
        ruleCode: 'R2',
        severity: 'Blocking',
        status: 'Open',
        message: 'Lỗi chặn sai trang phục',
        lastDetectedAt: '2026-11-20T00:00:00Z',
        createdAt: '2026-11-20T00:00:00Z',
      } as ConsistencyFindingDto,
    ]);

    renderDetail();

    const findingsSection = await screen.findByTestId('editor-dash-findings');
    const items = within(findingsSection).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Lỗi chặn sai trang phục');
    expect(items[1].textContent).toContain('Cảnh báo màu tóc');
  });

  it('displays production progress line with approved, in progress, rework and overdue counts', async () => {
    renderDetail(
      chapterStats(1, {
        tasksTotal: 12,
        tasksApproved: 7,
        tasksInProgress: 3,
        tasksRework: 1,
        tasksOverdue: 1,
      }),
    );

    const progressSection = await screen.findByTestId('editor-dash-production-progress');
    expect(progressSection.textContent).toContain('7/12 việc đã duyệt');
    expect(progressSection.textContent).toContain('3 đang làm');
    expect(progressSection.textContent).toContain('1 làm lại');
    expect(progressSection.textContent).toContain('1 trễ');
  });

  it('renders stage-approved panels chart when stage progress is approved', async () => {
    vi.mocked(pipelineService.getPipelineStages).mockResolvedValueOnce([
      { id: 'st1', name: 'Storyboard', stageOrder: 1, isTerminal: false } as PipelineStageDto,
      { id: 'st2', name: 'Lineart', stageOrder: 2, isTerminal: false } as PipelineStageDto,
    ]);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValueOnce([
      { pipelineStageId: 'st1', status: 'Approved' } as StageProgressDto,
      { pipelineStageId: 'st1', status: 'Approved' } as StageProgressDto,
    ]);

    renderDetail();

    expect(await screen.findByText('Khung đã duyệt theo công đoạn')).toBeTruthy();
  });
});
