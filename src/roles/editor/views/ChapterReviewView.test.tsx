import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChapterReviewView } from './ChapterReviewView';
import type { AssignmentDto, StageProgressDto } from '@/types';
import { pageService } from '@/services/page.service';
import { pipelineService } from '@/services/pipeline.service';
import { assignmentService } from '@/services/assignment.service';
import { artworkService } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';
import { elementService } from '@/services/element.service';
import { workspaceService } from '@/services/workspace.service';

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
  },
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getSeriesPipeline: vi.fn(),
  },
}));

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getAssignments: vi.fn(),
    getStageProgress: vi.fn(),
    getChangeRequests: vi.fn(),
    getConsistencyFindings: vi.fn(),
    getSubmissions: vi.fn(),
    getVisualConsistencyReport: vi.fn(),
    startAssignment: vi.fn(),
    approveReview: vi.fn(),
    returnWorkFromReview: vi.fn(),
  },
  extractError: vi.fn((err: any) => err?.message || 'Có lỗi xảy ra'),
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    getArtworks: vi.fn(),
    getArtworkAccessLink: vi.fn(),
  },
  resolveArtworkUrl: vi.fn((url: string) => url),
}));

vi.mock('@/services/panel.service', () => ({
  panelService: {
    getPanelsByPage: vi.fn(),
  },
}));

vi.mock('@/services/element.service', () => ({
  elementService: {
    getPageSnapshot: vi.fn(),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

vi.mock('@/shared/utils/compositePageRenderer', () => ({
  buildPageComposite: vi.fn(async () => ({
    dataUrl: 'data:image/png;base64,mockCompositeDataUrl',
    width: 800,
    height: 1200,
    placedPanels: [],
    placedElements: [],
  })),
}));

vi.mock('@/shared/utils/stageArtworks', () => ({
  loadPreviousStageArtworks: vi.fn(async () => []),
}));

const mockAssignment: AssignmentDto = {
  id: 'review-assign-1',
  chapterId: 'chap-1',
  seriesId: 'series-1',
  entityType: 'Chapter',
  targetEntityId: 'chap-1',
  pipelineStageId: 'stage-review',
  stageName: 'Review',
  stageOrder: 7,
  assigneeUserId: 'editor-1',
  assignedRole: 'EDITOR',
  priority: 'Medium',
  status: 'InProgress',
  brief: 'Duyệt chất lượng toàn chương',
  createdAt: '2026-10-17T00:00:00Z',
  updatedAt: '2026-10-17T00:00:00Z',
};

const mockPages = [
  { id: 'page-1', chapterId: 'chap-1', pageNumber: 1, panelCount: 3, createdAt: '', updatedAt: '' },
  { id: 'page-2', chapterId: 'chap-1', pageNumber: 2, panelCount: 2, createdAt: '', updatedAt: '' },
];

const mockStages = [
  {
    id: 'stage-script',
    seriesId: 'series-1',
    name: 'Script',
    stageOrder: 1,
    entityType: 'Chapter',
    isActive: true,
  },
  {
    id: 'stage-storyboard',
    seriesId: 'series-1',
    name: 'Storyboard',
    stageOrder: 2,
    entityType: 'Page',
    isActive: true,
  },
  {
    id: 'stage-layout',
    seriesId: 'series-1',
    name: 'Layout',
    stageOrder: 3,
    entityType: 'Page',
    isActive: true,
  },
  {
    id: 'stage-ink',
    seriesId: 'series-1',
    name: 'Ink',
    stageOrder: 4,
    entityType: 'Panel',
    isActive: true,
  },
  {
    id: 'stage-color',
    seriesId: 'series-1',
    name: 'Color',
    stageOrder: 5,
    entityType: 'Panel',
    isActive: true,
  },
  {
    id: 'stage-letter',
    seriesId: 'series-1',
    name: 'Letter',
    stageOrder: 6,
    entityType: 'Page',
    isActive: true,
  },
  {
    id: 'stage-review',
    seriesId: 'series-1',
    name: 'Review',
    stageOrder: 7,
    entityType: 'Chapter',
    isActive: true,
  },
];

const mockProgress: StageProgressDto[] = [
  { id: 'p1', pageId: 'page-1', panelId: '', pipelineStageId: 'stage-letter', status: 'Approved' },
  { id: 'p2', pageId: 'page-2', panelId: '', pipelineStageId: 'stage-letter', status: 'Approved' },
];

const mockPanelsPage1 = [
  {
    id: 'panel-1',
    pageId: 'page-1',
    panelNumber: 1,
    boundingBox: '{"percentX":0,"percentY":0,"percentW":100,"percentH":50}',
  },
  {
    id: 'panel-2',
    pageId: 'page-1',
    panelNumber: 2,
    boundingBox: '{"percentX":0,"percentY":50,"percentW":100,"percentH":50}',
  },
];

describe('ChapterReviewView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (pageService.getPagesByChapter as any).mockResolvedValue(mockPages);
    (pipelineService.getSeriesPipeline as any).mockResolvedValue({ stages: mockStages });
    (assignmentService.getAssignments as any).mockResolvedValue([
      mockAssignment,
      {
        id: 'assign-letter-p1',
        chapterId: 'chap-1',
        entityType: 'Page',
        targetEntityId: 'page-1',
        pipelineStageId: 'stage-letter',
        stageName: 'Letter',
        stageOrder: 6,
        assigneeUserId: 'letterer-1',
        assignedRole: 'LETTERER',
        priority: 'Medium',
        status: 'Approved',
        createdAt: '2026-10-17T00:00:00Z',
      },
    ]);
    (assignmentService.getStageProgress as any).mockResolvedValue(mockProgress);
    (assignmentService.getChangeRequests as any).mockResolvedValue([]);
    (assignmentService.getConsistencyFindings as any).mockResolvedValue([]);
    (assignmentService.getSubmissions as any).mockResolvedValue([]);
    (assignmentService.getVisualConsistencyReport as any).mockResolvedValue(null);
    (artworkService.getArtworks as any).mockResolvedValue([]);
    (panelService.getPanelsByPage as any).mockResolvedValue(mockPanelsPage1);
    (elementService.getPageSnapshot as any).mockResolvedValue({ elements: [] });
    (workspaceService.getMembers as any).mockResolvedValue([
      { userId: 'letterer-1', fullName: 'Lê Letterer', role: 'Artist' },
    ]);
  });

  it('renders top bar stepper and page list', async () => {
    render(
      <MemoryRouter>
        <ChapterReviewView
          assignment={mockAssignment}
          chapterId='chap-1'
          seriesId='series-1'
          effectiveWsId='ws-1'
          effectiveRole='EDITOR'
          currentUserId='editor-1'
        />
      </MemoryRouter>,
    );

    // Wait for page to finish loading
    await waitFor(() => {
      expect(screen.getByTestId('page-item-page-1')).toBeInTheDocument();
      expect(screen.getByTestId('page-item-page-2')).toBeInTheDocument();
    });

    // Stepper labels
    expect(screen.getByText(/Editor duyệt/i)).toBeInTheDocument();
    expect(screen.getByText(/Producer duyệt/i)).toBeInTheDocument();
    expect(screen.getByText(/Publisher phát hành/i)).toBeInTheDocument();
  });

  it('allows switching active page', async () => {
    render(
      <MemoryRouter>
        <ChapterReviewView
          assignment={mockAssignment}
          chapterId='chap-1'
          seriesId='series-1'
          effectiveWsId='ws-1'
          effectiveRole='EDITOR'
          currentUserId='editor-1'
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-item-page-1')).toBeInTheDocument();
    });

    // Click Trang 2
    fireEvent.click(screen.getByTestId('page-item-page-2'));

    // Verify center header updates to Trang 2
    await waitFor(() => {
      expect(screen.getByText(/Trang 2 \/ 2/i)).toBeInTheDocument();
    });
  });

  it('shows checklist tab and allows toggling items', async () => {
    render(
      <MemoryRouter>
        <ChapterReviewView
          assignment={mockAssignment}
          chapterId='chap-1'
          seriesId='series-1'
          effectiveWsId='ws-1'
          effectiveRole='EDITOR'
          currentUserId='editor-1'
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('page-item-page-1')).toBeInTheDocument();
    });

    const checklistTabBtn = screen.getByRole('button', { name: /Checklist/i });
    fireEvent.click(checklistTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thoại đúng kịch bản/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Nhất quán nhân vật & Series Bible/i)).toBeInTheDocument();

    const checkbox = screen.getByRole('checkbox', { name: /Thoại đúng kịch bản/i });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('submits return-work with normalized coordinates and valid payload', async () => {
    (assignmentService.returnWorkFromReview as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <ChapterReviewView
          assignment={mockAssignment}
          chapterId='chap-1'
          seriesId='series-1'
          effectiveWsId='ws-1'
          effectiveRole='EDITOR'
          currentUserId='editor-1'
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Trả việc cho Trang 1/i)).toBeInTheDocument();
    });

    // Fill description
    const descTextarea = screen.getByTestId('input-return-description');
    fireEvent.change(descTextarea, { target: { value: 'Bóng thoại bị lệch ra ngoài mép khung' } });

    // Submit return-work
    const submitBtn = screen.getByTestId('btn-submit-return-work');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(assignmentService.returnWorkFromReview).toHaveBeenCalledWith(
        'chap-1',
        'review-assign-1',
        expect.objectContaining({
          targetAssignmentId: 'assign-letter-p1',
          description: 'Bóng thoại bị lệch ra ngoài mép khung',
        }),
      );
    });
  });

  it('handles 409 awaiting review with verbatim message and review link button', async () => {
    const error409 = {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          message: 'Việc này đang chờ duyệt: hãy trả về qua cổng duyệt của chính việc đó.',
        },
      },
    };
    (assignmentService.returnWorkFromReview as any).mockRejectedValue(error409);

    render(
      <MemoryRouter>
        <ChapterReviewView
          assignment={mockAssignment}
          chapterId='chap-1'
          seriesId='series-1'
          effectiveWsId='ws-1'
          effectiveRole='EDITOR'
          currentUserId='editor-1'
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Trả việc cho Trang 1/i)).toBeInTheDocument();
    });

    const descTextarea = screen.getByTestId('input-return-description');
    fireEvent.change(descTextarea, { target: { value: 'Cần sửa chữ' } });

    const submitBtn = screen.getByTestId('btn-submit-return-work');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Việc này đang chờ duyệt: hãy trả về qua cổng duyệt của chính việc đó\./i),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mở duyệt việc này/i })).toBeInTheDocument();
    });
  });
});
