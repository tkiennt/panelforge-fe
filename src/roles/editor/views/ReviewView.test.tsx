import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReviewView } from './ReviewView';
import { assignmentService } from '@/services/assignment.service';
import { artworkService } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';

vi.mock('@/services/panel.service', () => ({
  panelService: { getPanelsByPage: vi.fn() },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: { getChapterById: vi.fn().mockResolvedValue({ id: 'c1', chapterNumber: 3 }) },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn().mockResolvedValue([{ id: 'p1', pageNumber: 4 }]),
  },
}));

vi.mock('@/shared/utils/compositePageRenderer', () => ({
  buildPageComposite: vi.fn().mockResolvedValue({ dataUrl: 'data:image/png;base64,composite' }),
}));

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getAssignmentById: vi.fn(),
    getChangeRequests: vi.fn(),
    getSubmissions: vi.fn(),
    getStageProgress: vi.fn(),
    openReview: vi.fn(),
    approveAssignment: vi.fn(),
    requestChanges: vi.fn(),
    verifyChangeRequest: vi.fn(),
    reopenChangeRequest: vi.fn(),
    rejectChangeRequest: vi.fn(),
    triageConsistencyFinding: vi.fn(),
    getVisualConsistencyReport: vi.fn(),
    runVisualConsistencyCheck: vi.fn(),
    resolveImpactReview: vi.fn(),
  },
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: { getArtworks: vi.fn(), getArtworkAccessLink: vi.fn() },
  resolveArtworkUrl: (u: string) => `http://api${u}`,
}));

const assignment = {
  id: 'a1',
  seriesId: 's1',
  chapterId: 'c1',
  entityType: 'Page',
  targetEntityId: 'p1',
  pipelineStageId: 'st1',
  stageName: 'Ink',
  assigneeUserId: 'artist-1',
  assignedRole: 'Artist',
  brief: 'Ink trang 4',
  priority: 'Normal',
  status: 'UnderReview',
  createdAt: '2026-10-08T00:00:00Z',
};

const art = (id: string, v: number, panelId?: string) => ({
  id,
  assetId: `asset-${id}`,
  chapterId: 'c1',
  pageId: 'p1',
  panelId,
  pipelineStageId: 'st1',
  versionNumber: v,
  fileName: `v${v}.png`,
  contentType: 'image/png',
  sizeBytes: 10,
  sha256: 'x',
  reused: false,
  uploadedByUserId: 'artist-1',
  createdAt: '2026-10-08T00:00:00Z',
});

const submissions = [
  {
    id: 's2',
    attemptNumber: 2,
    status: 'Pending',
    artworkReferenceIds: ['r2'],
    submittedAt: '2026-10-09T00:00:00Z',
  },
  {
    id: 's1',
    attemptNumber: 1,
    status: 'Rejected',
    artworkReferenceIds: ['r1'],
    submittedAt: '2026-10-08T00:00:00Z',
  },
];

const renderView = (role = 'EDITOR', userId = 'editor-1') =>
  render(
    <MemoryRouter initialEntries={['/review/a1?chapterId=c1']}>
      <Routes>
        <Route
          path='/review/:taskId'
          element={<ReviewView currentUserId={userId} workspaceRole={role} />}
        />
      </Routes>
    </MemoryRouter>,
  );

/** jsdom không đo layout: cho vùng ảnh kích thước 100×100 để toạ độ chuột đổi ra 0–1. */
const sizeImage = (el: HTMLElement) => {
  el.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
};

const drawBox = (area: HTMLElement) => {
  sizeImage(area);
  fireEvent.mouseDown(area, { clientX: 10, clientY: 20, button: 0 });
  fireEvent.mouseMove(area, { clientX: 40, clientY: 60 });
  fireEvent.mouseUp(area);
};

describe('ReviewView (CF3: duyệt bản nộp tranh)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(assignmentService.getAssignmentById).mockResolvedValue(assignment as any);
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue(submissions as any);
    vi.mocked(assignmentService.getStageProgress).mockResolvedValue([]);
    vi.mocked(assignmentService.getVisualConsistencyReport).mockResolvedValue(null as any);
    vi.mocked(assignmentService.requestChanges).mockResolvedValue(assignment as any);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([]);
    vi.mocked(artworkService.getArtworks).mockResolvedValue([
      art('r1', 1),
      art('r2', 2),
      art('r3', 3),
    ] as any);
    vi.mocked(artworkService.getArtworkAccessLink).mockImplementation(async (_c, id) => ({
      url: `/assets/${id}`,
      expiresAtUtc: '2099-01-01T00:00:00Z',
    }));
  });

  it('shows the pending submission and compares it with the last decided one, ignoring later uploads', async () => {
    renderView();

    expect(await screen.findByAltText('Lần nộp 2 · đang duyệt')).toHaveAttribute(
      'src',
      'http://api/assets/r2',
    );
    expect(screen.getByText('Chương 3 · Trang 4 · Ink')).toBeInTheDocument();
    expect(screen.queryByTestId('review-previous-image')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'So với bản trước' }));
    expect(await screen.findByAltText('Lần nộp 1')).toHaveAttribute('src', 'http://api/assets/r1');
    expect(screen.queryByAltText(/Phiên bản 3/)).not.toBeInTheDocument();
  });

  it('turns a marked area into a change request on the reviewed version when returning', async () => {
    const user = userEvent.setup();
    renderView();
    drawBox(await screen.findByTestId('review-current-image'));

    await user.type(screen.getByLabelText('Mô tả vùng cần sửa'), 'Mặt Mira lệch');
    const returnBtn = screen.getByRole('button', { name: /Trả bài · 1 yêu cầu sửa/ });
    expect(returnBtn).toBeDisabled(); // BR-06: chưa có nhận xét chung
    expect(screen.getByRole('button', { name: 'Duyệt bản nộp' })).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/Đánh giá tổng quát/), 'Chưa ổn');
    await user.click(returnBtn);

    await waitFor(() =>
      expect(assignmentService.requestChanges).toHaveBeenCalledWith('c1', 'a1', {
        comment: 'Chưa ổn',
        expectedSubmissionId: 's2',
        changes: [
          {
            description: 'Mặt Mira lệch',
            regionJson: JSON.stringify({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }),
            assetReferenceId: 'r2',
            panelId: undefined,
          },
        ],
      }),
    );
  });

  it('blocks returning while a marked area has no description', async () => {
    const user = userEvent.setup();
    renderView();
    drawBox(await screen.findByTestId('review-current-image'));
    await user.type(screen.getByPlaceholderText(/Đánh giá tổng quát/), 'Chưa ổn');

    expect(screen.getByText('Còn 1 vùng khoanh chưa có mô tả.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trả bài · 1 yêu cầu sửa/ })).toBeDisabled();
  });

  it('ignores a click without dragging', async () => {
    renderView();
    const area = await screen.findByTestId('review-current-image');
    sizeImage(area);
    fireEvent.mouseDown(area, { clientX: 10, clientY: 20, button: 0 });
    fireEvent.mouseUp(area);
    expect(screen.queryByText('Nhận xét lần duyệt này')).not.toBeInTheDocument();
  });

  it('does not let the assignee review their own work', async () => {
    renderView('EDITOR', 'artist-1');
    expect(await screen.findByText(/không thể tự duyệt/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt bản nộp' })).not.toBeInTheDocument();
  });

  it('asks to open the review before deciding a submitted work', async () => {
    vi.mocked(assignmentService.getAssignmentById).mockResolvedValue({
      ...assignment,
      status: 'Submitted',
    } as any);
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Mở duyệt' }));
    await waitFor(() => expect(assignmentService.openReview).toHaveBeenCalledWith('c1', 'a1'));
  });

  it('verifies or reopens (reason required) a resolved change request; approve waits until closed', async () => {
    const user = userEvent.setup();
    const resolved = {
      id: 'cr1',
      assignmentId: 'a1',
      chapterId: 'c1',
      submissionId: 's1',
      assetReferenceId: 'r1',
      regionJson: JSON.stringify({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 }),
      description: 'Sửa bóng tóc',
      status: 'Resolved',
      createdAt: '2026-10-08T00:00:00Z',
    };
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([resolved] as any);
    vi.mocked(assignmentService.reopenChangeRequest).mockResolvedValue({
      ...resolved,
      status: 'Open',
    } as any);
    renderView();

    expect(await screen.findByText(/Còn 1 yêu cầu sửa chưa đóng/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duyệt bản nộp' })).toBeDisabled();

    // Bấm yêu cầu khoanh trên bản cũ thì bật so sánh để thấy vùng đó
    await user.click(screen.getByRole('button', { name: 'Vùng #1' }));
    expect(await screen.findByTestId('review-previous-image')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Chưa đạt' }));
    const confirm = screen.getAllByRole('button', { name: 'Chưa đạt' }).at(-1)!;
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText(/Vì sao chưa đạt/), 'Vẫn lệch');
    await user.click(confirm);
    await waitFor(() =>
      expect(assignmentService.reopenChangeRequest).toHaveBeenCalledWith('c1', 'cr1', 'Vẫn lệch'),
    );
  });

  it('composes panel-only submissions into one page and detects the panel of a marked area', async () => {
    const user = userEvent.setup();
    vi.mocked(artworkService.getArtworks).mockResolvedValue([art('pa1', 1, 'panel-1')] as any);
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue([
      {
        id: 's9',
        attemptNumber: 1,
        status: 'Pending',
        artworkReferenceIds: ['pa1'],
        submittedAt: '2026-10-09T00:00:00Z',
      },
    ] as any);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      {
        id: 'panel-1',
        pageId: 'p1',
        panelNumber: 1,
        boundingBox: JSON.stringify({ x: 0, y: 0, width: 1200, height: 1800 }),
      },
    ] as any);
    renderView();

    const image = await screen.findByAltText('Lần nộp 1 · đang duyệt');
    expect(image).toHaveAttribute('src', 'data:image/png;base64,composite');
    drawBox(screen.getByTestId('review-current-image'));
    await user.type(screen.getByLabelText('Mô tả vùng cần sửa'), 'Lệch khung');
    await user.type(screen.getByPlaceholderText(/Đánh giá tổng quát/), 'Sửa khung 1');
    await user.click(screen.getByRole('button', { name: /Trả bài · 1 yêu cầu sửa/ }));

    await waitFor(() => expect(assignmentService.requestChanges).toHaveBeenCalled());
    const change = vi.mocked(assignmentService.requestChanges).mock.calls[0][2].changes![0];
    expect(change.assetReferenceId).toBeUndefined();
    expect(change.panelId).toBe('panel-1');
  });

  it('requires a reason to ignore a visual deviation (BR-21)', async () => {
    const user = userEvent.setup();
    vi.mocked(assignmentService.getVisualConsistencyReport).mockResolvedValue({
      chapterId: 'c1',
      threshold: 0.75,
      deviations: [
        {
          findingId: 'vf1',
          chapterId: 'c1',
          characterId: 'ch1',
          characterName: 'Mira',
          pageId: 'p1',
          similarityScore: 0.6,
          threshold: 0.75,
          isDeviation: true,
          severity: 'Warning',
          message: 'Màu tóc khác character sheet',
          status: 'Open',
          detectedAt: '2026-10-08T00:00:00Z',
        },
      ],
    } as any);
    renderView();

    await user.click(await screen.findByRole('tab', { name: 'Kiểm tra' }));
    expect(screen.getByText('Màu tóc khác character sheet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    await user.type(screen.getByLabelText(/Lý do bỏ qua/), 'Cảnh ánh hoàng hôn');
    await user.click(screen.getAllByRole('button', { name: 'Bỏ qua' }).at(-1)!);
    await waitFor(() =>
      expect(assignmentService.triageConsistencyFinding).toHaveBeenCalledWith(
        'c1',
        'vf1',
        'Ignored',
        'Cảnh ánh hoàng hôn',
      ),
    );
  });

  it('holds decisions until an impact review is resolved with a reason', async () => {
    const user = userEvent.setup();
    vi.mocked(assignmentService.getAssignmentById).mockResolvedValue({
      ...assignment,
      impactReviewReason: 'Kịch bản cảnh 2 đã mở lại',
    } as any);
    renderView();

    expect(await screen.findByText('Kịch bản cảnh 2 đã mở lại')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt bản nộp' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Giữ kết quả' }));
    await user.type(screen.getByLabelText(/Lý do/), 'Không đổi bố cục');
    await user.click(screen.getAllByRole('button', { name: 'Giữ kết quả' }).at(-1)!);
    await waitFor(() =>
      expect(assignmentService.resolveImpactReview).toHaveBeenCalledWith('c1', 'a1', {
        decision: 'Keep',
        reason: 'Không đổi bố cục',
      }),
    );
  });
});
