import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type {
  AssetReferenceDto,
  AssignmentDto,
  ChangeRequestDto,
  StageProgressDto,
  SubmissionDto,
} from '@/types';
import { assignmentService } from '@/services/assignment.service';
import { artworkService } from '@/services/artwork.service';
import { panelService } from '@/services/panel.service';
import { AssignmentWorkCard } from './AssignmentWorkCard';

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getSubmissions: vi.fn(),
    getChangeRequests: vi.fn(),
    startAssignment: vi.fn(),
    submitAssignment: vi.fn(),
    openReview: vi.fn(),
    approveAssignment: vi.fn(),
    requestChanges: vi.fn(),
    resolveChangeRequest: vi.fn(),
    verifyChangeRequest: vi.fn(),
    reopenChangeRequest: vi.fn(),
    rejectChangeRequest: vi.fn(),
    resolveImpactReview: vi.fn(),
  },
}));

vi.mock('@/services/artwork.service', () => ({
  artworkService: {
    getArtworks: vi.fn(),
    uploadArtwork: vi.fn(),
    getArtworkAccessLink: vi.fn(),
  },
  computeFileSha256: vi.fn(),
  resolveArtworkUrl: vi.fn((u: string) => `http://api.test${u}`),
  toThumbnailUrl: vi.fn((u: string) => `${u}${u.includes('?') ? '&' : '?'}size=thumb`),
}));

vi.mock('@/services/panel.service', () => ({
  panelService: {
    getPanelsByPage: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn().mockResolvedValue([
      { id: 'page-1', pageNumber: 1, chapterId: 'c1' },
      { id: 'page-2', pageNumber: 2, chapterId: 'c1' },
    ]),
  },
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getSeriesPipeline: vi.fn().mockResolvedValue({
      id: 'pipe-1',
      stages: [
        { id: 'stage-1', name: 'Thumbnail', stageOrder: 1, isEnabled: true },
        { id: 'stage-2', name: 'Color', stageOrder: 2, isEnabled: false },
      ],
    }),
  },
}));

const assignment = (over: Partial<AssignmentDto> = {}): AssignmentDto => ({
  id: 'a1',
  seriesId: 's1',
  chapterId: 'c1',
  entityType: 'Page',
  targetEntityId: 'page-1',
  pipelineStageId: 'stage-1',
  assigneeUserId: 'artist-1',
  assignedRole: 'Artist' as never,
  brief: 'Vẽ pencil trang 1',
  priority: 'Medium',
  status: 'InProgress',
  createdAt: '2026-10-06T00:00:00Z',
  ...over,
});

const artwork = (over: Partial<AssetReferenceDto> = {}): AssetReferenceDto => ({
  id: 'art-1',
  assetId: 'asset-1',
  chapterId: 'c1',
  pageId: 'page-1',
  pipelineStageId: 'stage-1',
  versionNumber: 1,
  fileName: 'page1.png',
  contentType: 'image/png',
  sizeBytes: 2048,
  sha256: 'a'.repeat(64),
  reused: false,
  uploadedByUserId: 'artist-1',
  createdAt: new Date().toISOString(),
  ...over,
});

const changeRequest = (over: Partial<ChangeRequestDto> = {}): ChangeRequestDto => ({
  id: 'cr-1',
  assignmentId: 'a1',
  chapterId: 'c1',
  responsibleUserId: 'artist-1',
  createdByUserId: 'editor-1',
  description: 'Khung 1 lệch tỉ lệ',
  status: 'Open',
  createdAt: '2026-10-06T00:00:00Z',
  ...over,
});

interface Setup {
  assignment?: AssignmentDto;
  userId?: string;
  role?: string;
  workspaceRole?: string;
  crs?: ChangeRequestDto[];
  artworks?: AssetReferenceDto[];
  submissions?: SubmissionDto[];
  progress?: StageProgressDto[];
  related?: Pick<AssignmentDto, 'id' | 'status'>[];
}

const renderCard = (s: Setup = {}) => {
  vi.mocked(assignmentService.getSubmissions).mockResolvedValue(s.submissions ?? []);
  vi.mocked(assignmentService.getChangeRequests).mockResolvedValue(s.crs ?? []);
  vi.mocked(artworkService.getArtworks).mockResolvedValue(s.artworks ?? []);
  const onChanged = vi.fn();
  const onToast = vi.fn();
  render(
    <AssignmentWorkCard
      chapterId='c1'
      assignment={s.assignment ?? assignment()}
      stageName='2. Pencil'
      assigneeName='An'
      userId={s.userId ?? 'artist-1'}
      workspaceRole={s.workspaceRole ?? s.role ?? 'ARTIST'}
      stageProgress={s.progress ?? []}
      onChanged={onChanged}
      onToast={onToast}
      relatedAssignments={s.related}
    />,
    { wrapper: MemoryRouter },
  );
  return { onChanged, onToast, user: userEvent.setup() };
};

describe('AssignmentWorkCard: người nhận', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Assigned: bấm "Bắt đầu làm" gọi Backend và báo cha nạp lại', async () => {
    const started = assignment({ status: 'InProgress' });
    vi.mocked(assignmentService.startAssignment).mockResolvedValue(started);
    const { user, onChanged } = renderCard({ assignment: assignment({ status: 'Assigned' }) });

    await user.click(await screen.findByRole('button', { name: 'Bắt đầu làm' }));

    expect(assignmentService.startAssignment).toHaveBeenCalledWith('c1', 'a1');
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(started));
  });

  it('lỗi từ Backend (409 cổng BR-19) hiện nguyên văn cho người dùng', async () => {
    vi.mocked(assignmentService.startAssignment).mockRejectedValue(
      new Error('Stage trước (Pencil) chưa được duyệt cho 1 panel.'),
    );
    const { user } = renderCard({ assignment: assignment({ status: 'Assigned' }) });

    await user.click(await screen.findByRole('button', { name: 'Bắt đầu làm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Stage trước (Pencil) chưa được duyệt',
    );
  });

  it('409 việc phụ thuộc chưa duyệt: hiện đúng câu `error` của BE (toast + inline)', async () => {
    const msg = 'Có 1 công việc phụ thuộc chưa được duyệt (Approved), chưa thể bắt đầu.';
    vi.mocked(assignmentService.startAssignment).mockRejectedValue(
      Object.assign(new Error(msg), { status: 409, code: 'CONFLICT' }),
    );
    const { user, onToast } = renderCard({ assignment: assignment({ status: 'Assigned' }) });

    await user.click(await screen.findByRole('button', { name: 'Bắt đầu làm' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(msg);
    expect(onToast).toHaveBeenCalledWith('Không thể bắt đầu', msg);
  });

  it('409 CHAPTER_READ_ONLY: báo "Chương chỉ đọc", không phải xung đột phiên bản', async () => {
    vi.mocked(assignmentService.startAssignment).mockRejectedValue(
      Object.assign(new Error('Chương đã Approved.'), { status: 409, code: 'CHAPTER_READ_ONLY' }),
    );
    const { user, onToast } = renderCard({ assignment: assignment({ status: 'Assigned' }) });

    await user.click(await screen.findByRole('button', { name: 'Bắt đầu làm' }));

    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('Chương chỉ đọc', 'Chương đã Approved.'),
    );
  });

  it('việc phụ thuộc chưa Approved: khoá nút Bắt đầu kèm lý do, không gọi BE', async () => {
    renderCard({
      assignment: assignment({ status: 'Assigned', dependsOnAssignmentIds: ['dep-1', 'dep-2'] }),
      related: [
        { id: 'dep-1', status: 'UnderReview' },
        { id: 'dep-2', status: 'Approved' },
      ],
    });

    const btn = await screen.findByTestId('start-assignment-btn');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Chờ 1 việc phụ thuộc được duyệt (Approved).');
    expect(screen.getByTestId('start-blocked-reason')).toHaveTextContent('Chờ 1 việc phụ thuộc');
    expect(assignmentService.startAssignment).not.toHaveBeenCalled();
  });

  it('thiếu artwork: nút Nộp bài bị khoá và nói rõ lý do', async () => {
    renderCard({ artworks: [] });

    expect(await screen.findByTestId('submit-blocked-reason')).toHaveTextContent('artwork');
    expect(screen.getByRole('button', { name: 'Nộp bài' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tải artwork lên' })).toBeInTheDocument();
  });

  it('chưa nạp xong chi tiết thì chưa cho nộp (tránh bật nút rồi mới tắt)', () => {
    vi.mocked(assignmentService.getSubmissions).mockReturnValue(new Promise(() => {}));
    vi.mocked(assignmentService.getChangeRequests).mockReturnValue(new Promise(() => {}));
    vi.mocked(artworkService.getArtworks).mockReturnValue(new Promise(() => {}));
    render(
      <AssignmentWorkCard
        chapterId='c1'
        assignment={assignment()}
        stageName='2. Pencil'
        assigneeName='An'
        userId='artist-1'
        workspaceRole='ARTIST'
        stageProgress={[]}
        onChanged={vi.fn()}
      />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByRole('button', { name: 'Nộp bài' })).toBeDisabled();
  });

  it('đủ artwork: nộp được và gọi đúng endpoint', async () => {
    const submitted = assignment({ status: 'Submitted' });
    vi.mocked(assignmentService.submitAssignment).mockResolvedValue(submitted);
    const { user, onChanged } = renderCard({ artworks: [artwork()] });

    const submit = await screen.findByRole('button', { name: 'Nộp bài' });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.click(submit);

    expect(assignmentService.submitAssignment).toHaveBeenCalledWith('c1', 'a1');
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(submitted));
  });

  it('artwork của stage khác không đủ để nộp', async () => {
    renderCard({ artworks: [artwork({ pipelineStageId: 'stage-2' })] });

    expect(await screen.findByTestId('submit-blocked-reason')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nộp bài' })).toBeDisabled();
  });

  it('còn yêu cầu sửa Open thì chặn nộp lại', async () => {
    renderCard({ artworks: [artwork()], crs: [changeRequest()] });

    expect(await screen.findByTestId('submit-blocked-reason')).toHaveTextContent('1 yêu cầu sửa');
    expect(screen.getByRole('button', { name: 'Nộp bài' })).toBeDisabled();
  });

  it('người nhận bấm "Đã sửa" rồi xác nhận thì gọi resolve', async () => {
    vi.mocked(assignmentService.resolveChangeRequest).mockResolvedValue(
      changeRequest({ status: 'Resolved' }),
    );
    const { user } = renderCard({
      assignment: assignment({ status: 'ReworkRequired' }),
      crs: [changeRequest()],
    });

    await user.click(await screen.findByRole('button', { name: 'Đã sửa' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận đã sửa' }));

    expect(assignmentService.resolveChangeRequest).toHaveBeenCalledWith('c1', 'cr-1', undefined);
  });

  it('ReworkRequired hiện lý do Editor trả về và cho bắt đầu sửa', async () => {
    renderCard({
      assignment: assignment({ status: 'ReworkRequired', lastFeedbackComment: 'Sửa lại khung 1' }),
    });

    expect(await screen.findByText(/Sửa lại khung 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bắt đầu sửa' })).toBeInTheDocument();
  });

  it('người không phải người nhận không có nút làm việc nào', async () => {
    renderCard({ assignment: assignment({ status: 'Assigned' }), userId: 'someone-else' });

    await waitFor(() => expect(assignmentService.getChangeRequests).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Bắt đầu làm' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nộp bài' })).not.toBeInTheDocument();
  });
});

describe('AssignmentWorkCard: Editor/Producer duyệt', () => {
  beforeEach(() => vi.clearAllMocks());

  const asEditor = (over: Setup = {}) => ({ userId: 'editor-1', role: 'EDITOR', ...over });

  it('Submitted: Editor mở xét duyệt', async () => {
    const opened = assignment({ status: 'UnderReview' });
    vi.mocked(assignmentService.openReview).mockResolvedValue(opened);
    const { user, onChanged } = renderCard(
      asEditor({ assignment: assignment({ status: 'Submitted' }) }),
    );

    await user.click(await screen.findByRole('button', { name: 'Mở xét duyệt' }));

    expect(assignmentService.openReview).toHaveBeenCalledWith('c1', 'a1');
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(opened));
  });

  it('UnderReview sạch yêu cầu sửa: Duyệt được', async () => {
    vi.mocked(assignmentService.approveAssignment).mockResolvedValue(
      assignment({ status: 'Approved' }),
    );
    const { user } = renderCard(asEditor({ assignment: assignment({ status: 'UnderReview' }) }));

    const approve = await screen.findByRole('button', { name: /Duyệt/ });
    await waitFor(() => expect(approve).toBeEnabled());
    await user.click(approve);

    expect(assignmentService.approveAssignment).toHaveBeenCalledWith('c1', 'a1');
  });

  it('còn yêu cầu Resolved chưa xác minh: khoá Duyệt, cho Xác minh đạt rồi mới duyệt', async () => {
    vi.mocked(assignmentService.verifyChangeRequest).mockResolvedValue(
      changeRequest({ status: 'Verified' }),
    );
    const { user } = renderCard(
      asEditor({
        assignment: assignment({ status: 'UnderReview' }),
        crs: [changeRequest({ status: 'Resolved' })],
      }),
    );

    const approve = await screen.findByRole('button', { name: /Duyệt/ });
    await waitFor(() => expect(approve).toBeDisabled());
    expect(screen.getByText(/xác minh trước khi duyệt/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xác minh đạt' }));
    expect(assignmentService.verifyChangeRequest).toHaveBeenCalledWith('c1', 'cr-1');
  });

  it('Editor mở lại yêu cầu chưa đạt: bắt buộc có comment', async () => {
    vi.mocked(assignmentService.reopenChangeRequest).mockResolvedValue(
      changeRequest({ status: 'Open' }),
    );
    const { user } = renderCard(
      asEditor({
        assignment: assignment({ status: 'UnderReview' }),
        crs: [changeRequest({ status: 'Resolved' })],
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'Chưa đạt, mở lại' }));
    const confirm = screen.getByRole('button', { name: 'Mở lại' });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: /Vì sao chưa đạt/ }), 'Vẫn lệch');
    await user.click(confirm);

    expect(assignmentService.reopenChangeRequest).toHaveBeenCalledWith('c1', 'cr-1', 'Vẫn lệch');
  });

  it('Editor chấp nhận phản đối: đóng yêu cầu Open với lý do', async () => {
    vi.mocked(assignmentService.rejectChangeRequest).mockResolvedValue(
      changeRequest({ status: 'Rejected' }),
    );
    const { user } = renderCard(
      asEditor({
        assignment: assignment({ status: 'ReworkRequired' }),
        crs: [changeRequest({ status: 'Open' })],
      }),
    );

    await user.click(await screen.findByRole('button', { name: 'Chấp nhận phản đối' }));
    await user.type(
      screen.getByRole('textbox', { name: /Lý do chấp nhận phản đối/ }),
      'Giữ nguyên bố cục',
    );
    await user.click(screen.getByRole('button', { name: 'Đóng yêu cầu' }));

    expect(assignmentService.rejectChangeRequest).toHaveBeenCalledWith(
      'c1',
      'cr-1',
      'Giữ nguyên bố cục',
    );
  });

  it('không ai tự duyệt việc của chính mình', async () => {
    renderCard({
      assignment: assignment({ status: 'UnderReview', assigneeUserId: 'editor-1' }),
      userId: 'editor-1',
      role: 'EDITOR',
    });

    await waitFor(() => expect(assignmentService.getChangeRequests).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('review-decision-panel')).not.toBeInTheDocument();
  });

  it('Artist không thấy nút duyệt', async () => {
    renderCard({
      assignment: assignment({ status: 'UnderReview', assigneeUserId: 'other' }),
      userId: 'artist-1',
      role: 'ARTIST',
    });

    await waitFor(() => expect(assignmentService.getChangeRequests).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument();
  });
});

describe('AssignmentWorkCard: trả về kèm yêu cầu sửa', () => {
  beforeEach(() => vi.clearAllMocks());

  const openReturnForm = async () => {
    vi.mocked(assignmentService.requestChanges).mockResolvedValue(
      assignment({ status: 'ReworkRequired' }),
    );
    const ctx = renderCard({
      assignment: assignment({ status: 'UnderReview' }),
      userId: 'editor-1',
      role: 'EDITOR',
    });
    await ctx.user.click(await screen.findByRole('button', { name: 'Trả về để sửa' }));
    return ctx;
  };

  it('không có lý do thì chưa gửi được', async () => {
    await openReturnForm();

    expect(screen.getByRole('button', { name: 'Gửi trả về' })).toBeDisabled();
  });

  it('chỉ có lý do: gửi không kèm danh sách yêu cầu (Backend tự tạo một yêu cầu từ lý do)', async () => {
    const { user } = await openReturnForm();

    await user.type(screen.getByRole('textbox', { name: 'Lý do trả về' }), 'Cần sửa khung 1');
    await user.click(screen.getByRole('button', { name: 'Gửi trả về' }));

    expect(assignmentService.requestChanges).toHaveBeenCalledWith('c1', 'a1', {
      comment: 'Cần sửa khung 1',
      changes: undefined,
    });
  });

  it('vùng nhập sai bị chặn, sửa đúng thì gửi vùng chuẩn hóa 0–1', async () => {
    const { user } = await openReturnForm();

    await user.type(screen.getByRole('textbox', { name: 'Lý do trả về' }), 'Cần sửa');
    await user.click(screen.getByRole('button', { name: 'Thêm yêu cầu sửa cụ thể' }));
    await user.type(screen.getByRole('textbox', { name: 'Mô tả yêu cầu sửa 1' }), 'Khung 1 lệch');
    await user.type(screen.getByRole('textbox', { name: 'Vùng x của yêu cầu sửa 1' }), '90');
    await user.type(screen.getByRole('textbox', { name: 'Vùng y của yêu cầu sửa 1' }), '0');
    await user.type(screen.getByRole('textbox', { name: 'Vùng w của yêu cầu sửa 1' }), '20');
    await user.type(screen.getByRole('textbox', { name: 'Vùng h của yêu cầu sửa 1' }), '10');

    // x 90 + rộng 20 vượt khỏi ảnh
    expect(screen.getByRole('button', { name: 'Gửi trả về' })).toBeDisabled();
    expect(screen.getByText(/Vùng phải nhập đủ/)).toBeInTheDocument();

    const x = screen.getByRole('textbox', { name: 'Vùng x của yêu cầu sửa 1' });
    await user.clear(x);
    await user.type(x, '10');
    await user.click(screen.getByRole('button', { name: 'Gửi trả về' }));

    expect(assignmentService.requestChanges).toHaveBeenCalledTimes(1);
    const body = vi.mocked(assignmentService.requestChanges).mock.calls[0][2];
    expect(body.comment).toBe('Cần sửa');
    expect(body.changes).toHaveLength(1);
    expect(body.changes?.[0].description).toBe('Khung 1 lệch');
    expect(JSON.parse(body.changes![0].regionJson!)).toEqual({ x: 0.1, y: 0, w: 0.2, h: 0.1 });
  });

  it('dòng yêu cầu bỏ trống mô tả thì không gửi lên', async () => {
    const { user } = await openReturnForm();

    await user.type(screen.getByRole('textbox', { name: 'Lý do trả về' }), 'Cần sửa');
    await user.click(screen.getByRole('button', { name: 'Thêm yêu cầu sửa cụ thể' }));
    await user.click(screen.getByRole('button', { name: 'Gửi trả về' }));

    expect(assignmentService.requestChanges).toHaveBeenCalledWith('c1', 'a1', {
      comment: 'Cần sửa',
      changes: undefined,
    });
  });

  it('có thể xoá một dòng yêu cầu đã thêm', async () => {
    const { user } = await openReturnForm();

    await user.click(screen.getByRole('button', { name: 'Thêm yêu cầu sửa cụ thể' }));
    expect(screen.getByRole('textbox', { name: 'Mô tả yêu cầu sửa 1' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Xoá yêu cầu sửa 1' }));

    expect(screen.queryByRole('textbox', { name: 'Mô tả yêu cầu sửa 1' })).not.toBeInTheDocument();
  });
});

describe('AssignmentWorkCard: lịch sử nộp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mở lịch sử thì thấy lần bị trả về kèm lý do', async () => {
    const { user } = renderCard({
      submissions: [
        {
          id: 'sub-1',
          assignmentId: 'a1',
          chapterId: 'c1',
          submittedByUserId: 'artist-1',
          attemptNumber: 1,
          status: 'Rejected',
          submittedAt: '2026-10-06T08:00:00Z',
          decidedAt: '2026-10-06T09:00:00Z',
          decisionComment: 'Khung 1 lệch tỉ lệ',
        },
      ],
    });

    await user.click(await screen.findByRole('button', { name: /Lịch sử nộp \(1\)/ }));

    expect(screen.getByTestId('submission-history')).toHaveTextContent('Lần 1');
    expect(screen.getByTestId('submission-history')).toHaveTextContent('Bị trả về');
    expect(screen.getByTestId('submission-history')).toHaveTextContent('Khung 1 lệch tỉ lệ');
  });
});

describe('AssignmentWorkCard: lối vào màn duyệt', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Editor thấy link mở màn duyệt khoanh vùng, người làm thì không', async () => {
    renderCard({ role: 'EDITOR', userId: 'editor-1' });
    const link = await screen.findByTestId('open-review-board');
    expect(link.getAttribute('href')).toContain('review/');
    expect(link.getAttribute('href')).toContain('chapterId=c1');
  });

  it('người làm (Artist) không thấy link màn duyệt', async () => {
    renderCard({});
    await screen.findByRole('button', { name: 'Nộp bài' });
    expect(screen.queryByTestId('open-review-board')).not.toBeInTheDocument();
  });

  it('Editor thấy ChapterReviewArtworkOverview và link mở màn duyệt khi việc ở cấp Chapter', async () => {
    renderCard({
      role: 'EDITOR',
      userId: 'editor-1',
      assignment: assignment({ entityType: 'Chapter', targetEntityId: 'c1' }),
    });
    expect(await screen.findByTestId('chapter-review-artwork-overview')).toBeInTheDocument();
    const link = await screen.findByTestId('open-review-board');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('review/');
  });
});

describe('AssignmentWorkCard: vùng khoanh trên artwork cho Artist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hiển thị badge "Vùng khoanh trên vN" và "Khung #N" trong danh sách yêu cầu sửa', async () => {
    vi.mocked(panelService.getPanelsByPage).mockResolvedValueOnce([
      {
        id: 'panel-1',
        pageId: 'page-1',
        panelNumber: 2,
        readingOrder: 2,
        boundingBox: '{"x":0,"y":0,"w":1,"h":1}',
      } as any,
    ]);

    renderCard({
      artworks: [artwork({ id: 'art-v2', versionNumber: 2, fileName: 'page1_v2.png' })],
      crs: [
        changeRequest({
          id: 'cr-1',
          description: 'Sửa mắt nhân vật',
          assetReferenceId: 'art-v2',
          panelId: 'panel-1',
          regionJson: '{"x":0.1,"y":0.2,"w":0.3,"h":0.4}',
        }),
      ],
    });

    expect(await screen.findByTestId('cr-version-badge-cr-1')).toHaveTextContent(
      'Vùng khoanh trên v2',
    );
    expect(screen.getByTestId('cr-panel-badge-cr-1')).toHaveTextContent('Khung #2');
    expect(screen.getByTestId('view-cr-on-artwork-cr-1')).toBeInTheDocument();
  });

  it('đưa khối "Yêu cầu sửa" lên TRÊN danh sách phiên bản khi việc đang ReworkRequired hoặc có yêu cầu Open', async () => {
    renderCard({
      assignment: assignment({ status: 'ReworkRequired' }),
      artworks: [artwork({ id: 'art-1', versionNumber: 1 })],
      crs: [
        changeRequest({
          id: 'cr-open',
          status: 'Open',
          description: 'Cần sửa gấp',
        }),
      ],
    });

    const crPanel = await screen.findByTestId('change-request-panel');
    const artPanel = await screen.findByTestId('artwork-panel');

    // DOM order: crPanel phải đứng trước artPanel
    expect(
      crPanel.compareDocumentPosition(artPanel) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('bấm "Xem trên ảnh" tự kích hoạt mở xem phiên bản tương ứng', async () => {
    vi.mocked(artworkService.getArtworkAccessLink).mockResolvedValueOnce({
      url: 'https://cdn.example.com/artworks/page1_v3.png',
      expiresAtUtc: '2026-10-08T11:00:00Z',
    });

    renderCard({
      artworks: [artwork({ id: 'art-v3', versionNumber: 3, fileName: 'page1_v3.png' })],
      crs: [
        changeRequest({
          id: 'cr-click',
          description: 'Xoá mục này',
          assetReferenceId: 'art-v3',
          regionJson: '{"x":0.043,"y":0.9063,"w":0.9375,"h":0.0937}',
        }),
      ],
    });

    const viewOnArtworkBtn = await screen.findByTestId('view-cr-on-artwork-cr-click');
    expect(viewOnArtworkBtn).toBeInTheDocument();

    // Click nút Xem trên ảnh
    await userEvent.click(viewOnArtworkBtn);

    // ArtworkPanel nạp link và hiển thị box
    await waitFor(() => {
      expect(screen.getByTestId('cr-box-cr-click')).toBeInTheDocument();
    });
  });
});

describe('AssignmentWorkCard: cờ kiểm tra ảnh hưởng (impactReviewReason)', () => {
  it('hiển thị badge, banner và khoá nút nộp khi có impactReviewReason', async () => {
    renderCard({
      assignment: assignment({
        status: 'InProgress',
        impactReviewReason: 'Kịch bản Scene 1 đã được biên tập lại',
      }),
      artworks: [artwork({ id: 'art-1', versionNumber: 1 })],
    });

    expect(await screen.findByTestId('impact-review-badge')).toHaveTextContent(
      'Cần kiểm tra ảnh hưởng',
    );
    expect(screen.getByTestId('impact-review-banner')).toHaveTextContent(
      'Kịch bản Scene 1 đã được biên tập lại',
    );

    const submitBtn = screen.getByRole('button', { name: /Nộp bài/i });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByTestId('submit-blocked-reason')).toHaveTextContent(
      'Công việc cần kiểm tra ảnh hưởng: Kịch bản Scene 1 đã được biên tập lại',
    );
  });

  it('ẩn nút Giữ kết quả / Yêu cầu làm lại với chính người nhận', async () => {
    renderCard({
      userId: 'artist-1',
      workspaceRole: 'ARTIST',
      assignment: assignment({
        assigneeUserId: 'artist-1',
        status: 'InProgress',
        impactReviewReason: 'Kịch bản thay đổi',
      }),
    });

    await waitFor(() => {
      expect(screen.queryByTestId('impact-review-reviewer-actions')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Giữ kết quả/i })).not.toBeInTheDocument();
    });
  });

  it('Editor/Producer thấy nút Giữ kết quả, nhập lý do và gọi resolveImpactReview', async () => {
    vi.mocked(assignmentService.resolveImpactReview).mockResolvedValueOnce({
      ...assignment(),
      impactReviewReason: null,
    });

    renderCard({
      userId: 'editor-1',
      workspaceRole: 'EDITOR',
      assignment: assignment({
        assigneeUserId: 'artist-1',
        status: 'InProgress',
        impactReviewReason: 'Kịch bản thay đổi',
      }),
    });

    const keepBtn = await screen.findByRole('button', { name: /Giữ kết quả/i });
    expect(keepBtn).toBeInTheDocument();

    await userEvent.click(keepBtn);
    const reasonInput = screen.getByLabelText(/Lý do xử lý ảnh hưởng/i);
    await userEvent.type(reasonInput, 'Đã kiểm tra, kết quả hiện tại vẫn khớp');

    const confirmBtn = screen.getByRole('button', { name: /Xác nhận/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(assignmentService.resolveImpactReview).toHaveBeenCalledWith('c1', 'a1', {
        decision: 'Keep',
        reason: 'Đã kiểm tra, kết quả hiện tại vẫn khớp',
      });
    });
  });
});
