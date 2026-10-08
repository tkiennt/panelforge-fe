import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReviewView } from './ReviewView';
import { assignmentService } from '@/services/assignment.service';
import { artworkService } from '@/services/artwork.service';
import { workspaceService } from '@/services/workspace.service';
import { seriesService } from '@/services/series.service';
import { panelService } from '@/services/panel.service';

vi.mock('@/services/panel.service', () => ({
  panelService: {
    getPanelsByPage: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getWorkspaceById: vi.fn(),
    getMembers: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
  },
}));

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    getAssignments: vi.fn(),
    getChangeRequests: vi.fn(),
    getSubmissions: vi.fn(),
    getConsistencyFindings: vi.fn(),
    getStageProgress: vi.fn(),
    openReview: vi.fn(),
    approveAssignment: vi.fn(),
    requestChanges: vi.fn(),
    verifyChangeRequest: vi.fn(),
    reopenChangeRequest: vi.fn(),
    runConsistencyCheck: vi.fn(),
    triageConsistencyFinding: vi.fn(),
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
  assigneeUserId: 'artist-1',
  assignedRole: 'Artist',
  brief: 'Thumbnail trang 1',
  priority: 'Normal',
  status: 'UnderReview',
  createdAt: '2026-10-08T00:00:00Z',
};

const art = (id: string, v: number) => ({
  id,
  assetId: `asset-${id}`,
  chapterId: 'c1',
  pageId: 'p1',
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

const finding = {
  id: 'f1',
  chapterId: 'c1',
  ruleCode: 'SPEAKER_MISSING',
  severity: 'Warning',
  message: 'Cảnh 1, dòng 2: lời thoại chưa có nhân vật nói.',
  evidence: 'Ai đó?',
  status: 'Open',
  lastDetectedAt: '2026-10-08T00:00:00Z',
  createdAt: '2026-10-08T00:00:00Z',
};

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

describe('ReviewView (CF3: duyệt, khoanh vùng, nhất quán)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([assignment] as any);
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue([]);
    vi.mocked(assignmentService.getConsistencyFindings).mockResolvedValue([finding] as any);
    vi.mocked(artworkService.getArtworks).mockResolvedValue([art('r1', 1), art('r2', 2)] as any);
    vi.mocked(artworkService.getArtworkAccessLink).mockImplementation(async (_c, id) => ({
      url: `/assets/${id}`,
      expiresAtUtc: '2026-10-08T01:00:00Z',
    }));
    vi.mocked(assignmentService.requestChanges).mockResolvedValue(assignment as any);
  });

  it('so sánh đúng bản được nộp: lần nộp 2 (v2) với lần nộp 1 (v1), bỏ qua v3 tải sau khi nộp', async () => {
    vi.mocked(artworkService.getArtworks).mockResolvedValue([
      art('r1', 1),
      art('r2', 2),
      art('r3', 3),
    ] as any);
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue([
      { id: 's2', attemptNumber: 2, status: 'Pending', artworkReferenceIds: ['r2'] },
      { id: 's1', attemptNumber: 1, status: 'Rejected', artworkReferenceIds: ['r1'] },
    ] as any);
    renderView();

    expect(await screen.findByAltText('Artwork v2')).toHaveAttribute('src', 'http://api/assets/r2');
    expect(await screen.findByAltText('Artwork v1')).toBeInTheDocument();
    expect(screen.queryByAltText('Artwork v3')).not.toBeInTheDocument();
    expect(screen.getByText(/Bản đang duyệt · v2 · lần nộp 2/)).toBeInTheDocument();
  });

  it('so sánh v1 với v2 hiện tại, ảnh lấy qua link ngắn hạn', async () => {
    renderView();
    expect(await screen.findByAltText('Artwork v2')).toHaveAttribute('src', 'http://api/assets/r2');
    expect(await screen.findByAltText('Artwork v1')).toHaveAttribute('src', 'http://api/assets/r1');
  });

  it('kéo chuột khoanh vùng trên bản hiện tại rồi trả về: gửi regionJson 0–1 + assetReferenceId', async () => {
    const user = userEvent.setup();
    renderView();
    const area = await screen.findByTestId('review-current-image');
    sizeImage(area);

    fireEvent.mouseDown(area, { clientX: 10, clientY: 20 });
    fireEvent.mouseMove(area, { clientX: 40, clientY: 60 });
    fireEvent.mouseUp(area);

    await user.type(screen.getByLabelText('Mô tả vùng M1'), 'Mặt Mira lệch');
    await user.type(screen.getByLabelText('Nhận xét chung'), 'Chưa ổn');
    await user.click(screen.getByRole('button', { name: /Trả về \(1 yêu cầu sửa\)/ }));

    await waitFor(() =>
      expect(assignmentService.requestChanges).toHaveBeenCalledWith('c1', 'a1', {
        comment: 'Chưa ổn',
        changes: [
          {
            description: 'Mặt Mira lệch',
            regionJson: JSON.stringify({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }),
            assetReferenceId: 'r2',
          },
        ],
      }),
    );
  });

  it('trả về thiếu nhận xét chung thì không gửi', async () => {
    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByRole('button', { name: /Trả về/ }));
    expect(await screen.findByText(/bắt buộc có nhận xét chung/)).toBeInTheDocument();
    expect(assignmentService.requestChanges).not.toHaveBeenCalled();
  });

  it('người làm (không phải người duyệt) không vẽ được và không có nút duyệt', async () => {
    renderView('ARTIST', 'artist-1');
    await screen.findByAltText('Artwork v2');
    expect(screen.queryByTestId('review-draft-panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Duyệt/ })).not.toBeInTheDocument();
  });

  it('tab Nhất quán: hiện finding kèm bằng chứng, Bỏ qua bắt buộc lý do', async () => {
    const user = userEvent.setup();
    vi.mocked(assignmentService.triageConsistencyFinding).mockResolvedValue(finding as any);
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Cảnh trong mơ');
    renderView();

    await user.click(await screen.findByRole('tab', { name: /Nhất quán/ }));
    expect(screen.getByText(finding.message)).toBeInTheDocument();
    expect(screen.getByText('Ai đó?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Bỏ qua (cần lý do)' }));
    expect(prompt).toHaveBeenCalled();
    await waitFor(() =>
      expect(assignmentService.triageConsistencyFinding).toHaveBeenCalledWith(
        'c1',
        'f1',
        'Ignored',
        'Cảnh trong mơ',
      ),
    );
    prompt.mockRestore();
  });

  it('zoom góc nhìn: bấm nút phóng to và bấm Đặt lại góc nhìn', async () => {
    const user = userEvent.setup();
    renderView();

    expect(await screen.findByText('100%')).toBeInTheDocument();
    const zoomInBtn = screen.getByTitle('Phóng to');
    await user.click(zoomInBtn);
    expect(screen.getByText('120%')).toBeInTheDocument();

    const resetBtn = screen.getByTitle('Đặt lại góc nhìn');
    await user.click(resetBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('bấm yêu cầu sửa: chọn đúng phiên bản của nó và làm nổi bật vùng khoanh', async () => {
    const user = userEvent.setup();
    const cr = {
      id: 'cr-1',
      assignmentId: 'a1',
      chapterId: 'c1',
      description: 'Sửa tóc nhân vật',
      regionJson: JSON.stringify({ x: 0.2, y: 0.2, w: 0.2, h: 0.2 }),
      status: 'Open',
      assetReferenceId: 'r1',
      createdAt: '2026-10-08T00:00:00Z',
    };
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([cr] as any);

    renderView();
    expect(await screen.findByText('Sửa tóc nhân vật')).toBeInTheDocument();

    // Bấm vào yêu cầu sửa
    await user.click(screen.getByText('Sửa tóc nhân vật'));
    expect(screen.getByText('Sửa tóc nhân vật').closest('li')).toHaveClass('border-orange-400');
  });

  it('yêu cầu sửa Resolved: Xác minh đạt (kèm ghi chú) và Mở lại (lý do bắt buộc)', async () => {
    const user = userEvent.setup();
    const resolvedCr = {
      id: 'cr-2',
      assignmentId: 'a1',
      chapterId: 'c1',
      description: 'Chỉnh mắt phải',
      regionJson: JSON.stringify({ x: 0.3, y: 0.3, w: 0.1, h: 0.1 }),
      status: 'Resolved',
      resolutionNote: 'Đã vẽ lại mắt',
      resolvedAt: '2026-10-08T01:00:00Z',
      assetReferenceId: 'r2',
      createdAt: '2026-10-08T00:00:00Z',
    };
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([resolvedCr] as any);
    vi.mocked(assignmentService.verifyChangeRequest).mockResolvedValue(resolvedCr as any);
    vi.mocked(assignmentService.reopenChangeRequest).mockResolvedValue(resolvedCr as any);

    const promptSpy = vi.spyOn(window, 'prompt');

    renderView();
    expect(await screen.findByText('Chỉnh mắt phải')).toBeInTheDocument();
    expect(screen.getByText('Đã sửa, chờ xác minh')).toBeInTheDocument();

    // Bấm Xác minh đạt kèm ghi chú
    promptSpy.mockReturnValueOnce('Nét vẽ tốt');
    await user.click(screen.getByRole('button', { name: /Xác minh đạt/i }));
    await waitFor(() =>
      expect(assignmentService.verifyChangeRequest).toHaveBeenCalledWith(
        'c1',
        'cr-2',
        'Nét vẽ tốt',
      ),
    );

    // Bấm Mở lại kèm lý do
    promptSpy.mockReturnValueOnce('Vẫn còn lem màu');
    await user.click(screen.getByRole('button', { name: /Mở lại/i }));
    await waitFor(() =>
      expect(assignmentService.reopenChangeRequest).toHaveBeenCalledWith(
        'c1',
        'cr-2',
        'Vẫn còn lem màu',
      ),
    );

    promptSpy.mockRestore();
  });

  it('khoá nút Duyệt khi còn yêu cầu sửa Open hoặc Resolved chưa xác minh', async () => {
    const unverifiedCr = {
      id: 'cr-open',
      assignmentId: 'a1',
      chapterId: 'c1',
      description: 'Chưa sửa xong',
      status: 'Open',
      createdAt: '2026-10-08T00:00:00Z',
    };
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([unverifiedCr] as any);

    renderView();
    const approveBtn = await screen.findByRole('button', { name: /Duyệt/i });
    expect(approveBtn).toBeDisabled();
  });

  it('chống quyết định nhầm: phát hiện lần nộp mới trong lúc đang xem thì chặn gửi Duyệt', async () => {
    const user = userEvent.setup();
    // Khi nạp ban đầu: có sub s1 (Pending); khi bấm Duyệt: có sub s2 (Pending mới)
    vi.mocked(assignmentService.getSubmissions)
      .mockResolvedValueOnce([
        { id: 's1', attemptNumber: 1, status: 'Pending', artworkReferenceIds: ['r2'] },
      ] as any)
      .mockResolvedValueOnce([
        { id: 's1', attemptNumber: 1, status: 'Superseded', artworkReferenceIds: ['r1'] },
        { id: 's2', attemptNumber: 2, status: 'Pending', artworkReferenceIds: ['r2'] },
      ] as any);

    renderView();
    const approveBtn = await screen.findByRole('button', { name: /Duyệt/i });
    expect(approveBtn).not.toBeDisabled();

    await user.click(approveBtn);

    expect(
      await screen.findByText(/Đã có lần nộp mới trong lúc bạn đang xem/i),
    ).toBeInTheDocument();
    expect(assignmentService.approveAssignment).not.toHaveBeenCalled();
  });

  it('chuyển đổi các chế độ so sánh: Thanh trượt (swipe) và Chồng ảnh (onion-skin)', async () => {
    const user = userEvent.setup();
    renderView();

    // Chuyển sang thanh trượt (swipe)
    const swipeBtn = await screen.findByRole('button', { name: /Thanh trượt/i });
    await user.click(swipeBtn);
    expect(screen.getByText('↔')).toBeInTheDocument();

    // Chuyển sang chồng ảnh (onion-skin)
    const onionBtn = screen.getByRole('button', { name: /Chồng ảnh/i });
    await user.click(onionBtn);
    expect(screen.getByText(/Độ mờ bản sau/i)).toBeInTheDocument();
  });

  it('cảnh báo khi hai phiên bản khác kích thước tự nhiên', async () => {
    renderView();
    const img1 = await screen.findByAltText('Artwork v1');
    const img2 = await screen.findByAltText('Artwork v2');

    // Giả lập kích thước khác nhau
    Object.defineProperty(img1, 'naturalWidth', { value: 1200, configurable: true });
    Object.defineProperty(img1, 'naturalHeight', { value: 1800, configurable: true });
    fireEvent.load(img1);

    Object.defineProperty(img2, 'naturalWidth', { value: 1000, configurable: true });
    Object.defineProperty(img2, 'naturalHeight', { value: 1500, configurable: true });
    fireEvent.load(img2);

    expect(
      await screen.findByText(/Hai phiên bản khác kích thước \(1200×1800 so với 1000×1500\)/i),
    ).toBeInTheDocument();
  });

  it('vẽ vùng không huỷ khi chuột ra khỏi ảnh: bắt sự kiện trên toàn cửa sổ và giới hạn toạ độ trong khoảng 0–1', async () => {
    const user = userEvent.setup();
    renderView();
    const area = await screen.findByTestId('review-current-image');
    sizeImage(area);

    // Bắt đầu vẽ ở toạ độ (20, 30) -> (0.2, 0.3)
    fireEvent.mouseDown(area, { clientX: 20, clientY: 30 });
    // Kéo chuột vượt ra ngoài phạm vi ảnh (ảnh 100x100, chuột ra toạ độ 250, 300)
    fireEvent.mouseMove(window, { clientX: 250, clientY: 300 });
    // Thả chuột trên toàn cửa sổ
    fireEvent.mouseUp(window);

    // Vùng khoanh M1 được tạo và toạ độ bị giới hạn (clamped) trong khoảng 0-1 (w: 0.8, h: 0.7)
    expect(await screen.findByLabelText('Mô tả vùng M1')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Mô tả vùng M1'), 'Vùng ngoài biên');
    await user.type(screen.getByLabelText('Nhận xét chung'), 'Cần chỉnh');
    await user.click(screen.getByRole('button', { name: /Trả về \(1 yêu cầu sửa\)/ }));

    await waitFor(() =>
      expect(assignmentService.requestChanges).toHaveBeenCalledWith('c1', 'a1', {
        comment: 'Cần chỉnh',
        changes: [
          {
            description: 'Vùng ngoài biên',
            regionJson: JSON.stringify({ x: 0.2, y: 0.3, w: 0.8, h: 0.7 }),
            assetReferenceId: 'r2',
          },
        ],
      }),
    );
  });

  it('click không kéo thì hiện gợi ý "Kéo chuột để khoanh vùng"', async () => {
    const onShowToast = vi.fn();
    render(
      <MemoryRouter initialEntries={['/review/a1?chapterId=c1']}>
        <Routes>
          <Route
            path='/review/:taskId'
            element={
              <ReviewView
                currentUserId='editor-1'
                workspaceRole='EDITOR'
                onShowToast={onShowToast}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    const area = await screen.findByTestId('review-current-image');
    sizeImage(area);

    // Click mà không kéo (hoặc kéo < 0.01)
    fireEvent.mouseDown(area, { clientX: 50, clientY: 50 });
    fireEvent.mouseUp(area);

    expect(onShowToast).toHaveBeenCalledWith('Gợi ý khoanh vùng', 'Kéo chuột để khoanh vùng');
    expect(await screen.findByTestId('drawing-hint-banner')).toBeInTheDocument();
    const hintItems = await screen.findAllByText(/Kéo chuột để khoanh vùng/i);
    expect(hintItems.length).toBeGreaterThanOrEqual(1);
    // Không tạo draft region
    expect(screen.queryByLabelText(/Mô tả vùng M1/i)).not.toBeInTheDocument();
  });

  it('màn duyệt tự nạp vai trò của mình trong Workspace khi mở bằng URL trực tiếp hoặc F5', async () => {
    vi.mocked(workspaceService.getWorkspaceById).mockResolvedValue({
      id: 'ws-100',
      name: 'Studio Test',
      currentUserRole: 'Editor',
      isOwner: false,
    } as any);
    vi.mocked(workspaceService.getMembers).mockResolvedValue([
      { userId: 'user-self', role: 'Editor', fullName: 'Self Editor' },
    ] as any);

    render(
      <MemoryRouter initialEntries={['/workspaces/ws-100/review/a1?chapterId=c1']}>
        <Routes>
          <Route
            path='/workspaces/:workspaceId/review/:taskId'
            element={<ReviewView currentUserId='user-self' />}
          />
        </Routes>
      </MemoryRouter>,
    );

    // Tự động gọi workspaceService để tải vai trò
    await waitFor(() => {
      expect(workspaceService.getWorkspaceById).toHaveBeenCalledWith('ws-100');
    });

    // Quyền duyệt được kích hoạt và vai trò được hiển thị trong header
    expect(await screen.findByText(/Vai trò: EDITOR/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Duyệt/i })).toBeInTheDocument();
  });

  it('lần nộp không có ảnh cả trang: tự động ghép ảnh các Panel từ submission.artworkReferenceIds lên khổ 1200x1800', async () => {
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      {
        id: 'p-1',
        pageId: 'p1',
        panelNumber: 1,
        readingOrder: 1,
        boundingBox: '{"x":10,"y":10,"width":80,"height":40,"unit":"px"}',
        createdAt: '2026-10-08T00:00:00Z',
      },
      {
        id: 'p-2',
        pageId: 'p1',
        panelNumber: 2,
        readingOrder: 2,
        boundingBox: '{"normalized":{"x":0.1,"y":0.5,"w":0.8,"h":0.4}}',
        createdAt: '2026-10-08T00:00:00Z',
      },
    ]);

    const panelArtworks = [
      {
        id: 'art-p1',
        assetId: 'asset-p1',
        chapterId: 'c1',
        pageId: 'p1',
        pipelineStageId: 'st1',
        versionNumber: 1,
        fileName: 'panel1.png',
        contentType: 'image/png',
        sizeBytes: 100,
        sha256: 'h1',
        reused: false,
        uploadedByUserId: 'artist-1',
        createdAt: '2026-10-08T00:00:00Z',
        panelId: 'p-1',
      },
      {
        id: 'art-p2',
        assetId: 'asset-p2',
        chapterId: 'c1',
        pageId: 'p1',
        pipelineStageId: 'st1',
        versionNumber: 1,
        fileName: 'panel2.png',
        contentType: 'image/png',
        sizeBytes: 100,
        sha256: 'h2',
        reused: false,
        uploadedByUserId: 'artist-1',
        createdAt: '2026-10-08T00:00:00Z',
        panelId: 'p-2',
      },
    ];

    vi.mocked(artworkService.getArtworks).mockResolvedValue(panelArtworks as any);
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue([
      {
        id: 'sub-composite',
        attemptNumber: 1,
        status: 'Pending',
        artworkReferenceIds: ['art-p1', 'art-p2'],
      } as any,
    ]);

    renderView();

    // Màn duyệt nhận diện phiên bản ghép từ Panel
    expect(await screen.findByText(/Đang duyệt: v1/i)).toBeInTheDocument();
    expect(screen.getByTestId('review-current-image')).toBeInTheDocument();
  });

  it('khoanh vùng trên trang ghép từ Panel: bỏ assetReferenceId và nhận diện đúng panelId từ boundingBox pixel', async () => {
    const user = userEvent.setup();
    const panelArtworks = [
      {
        id: 'art-p1',
        assetId: 'asset-p1',
        pageId: 'pg1',
        stageId: 's1',
        versionNumber: 1,
        fileName: 'panel1.png',
        contentType: 'image/png',
        sizeBytes: 100,
        sha256: 'h1',
        reused: false,
        uploadedByUserId: 'artist-1',
        createdAt: '2026-10-08T00:00:00Z',
        panelId: 'p-1',
      },
    ];

    vi.mocked(artworkService.getArtworks).mockResolvedValue(panelArtworks as any);
    vi.mocked(assignmentService.getSubmissions).mockResolvedValue([
      {
        id: 'sub-comp-test',
        attemptNumber: 1,
        status: 'Pending',
        artworkReferenceIds: ['art-p1'],
      } as any,
    ]);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      {
        id: 'p-1',
        pageId: 'pg1',
        panelNumber: 1,
        boundingBox: JSON.stringify({ x: 0, y: 0, width: 1200, height: 900, unit: 'px' }),
      } as any,
    ]);

    renderView();

    expect(await screen.findByText(/Đang duyệt: v1/i)).toBeInTheDocument();
    const area = screen.getByTestId('review-current-image');
    sizeImage(area);

    // Kéo chuột khoanh vùng trong khoảng [0..0.5] Y (nằm trong panel 1)
    fireEvent.mouseDown(area, { clientX: 10, clientY: 20 });
    fireEvent.mouseMove(area, { clientX: 40, clientY: 40 });
    fireEvent.mouseUp(area);

    await user.type(screen.getByLabelText(/Mô tả vùng/i), 'Nét khung 1 cần tỉa lại');
    await user.type(screen.getByLabelText('Nhận xét chung'), 'Trang ghép cần sửa');
    await user.click(screen.getByRole('button', { name: /Trả về \(1 yêu cầu sửa\)/ }));

    await waitFor(() =>
      expect(assignmentService.requestChanges).toHaveBeenCalledWith('c1', 'a1', {
        comment: 'Trang ghép cần sửa',
        expectedSubmissionId: 'sub-comp-test',
        changes: [
          {
            description: 'Nét khung 1 cần tỉa lại',
            regionJson: JSON.stringify({ x: 0.1, y: 0.2, w: 0.3, h: 0.2 }),
            panelId: 'p-1',
            assetReferenceId: undefined,
          },
        ],
      }),
    );
  });
});
