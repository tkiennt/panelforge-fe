import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScriptEditorView } from './ScriptEditorView';
import { scriptLineService } from '@/services/scriptLine.service';
import { chapterService } from '@/services/chapter.service';
import { bibleService } from '@/services/bible.service';
import { seriesService } from '@/services/series.service';
import { assignmentService } from '@/services/assignment.service';
import { workspaceService } from '@/services/workspace.service';
import { pageService } from '@/services/page.service';
import { panelService } from '@/services/panel.service';

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
    createPage: vi.fn(),
  },
}));

vi.mock('@/services/panel.service', () => ({
  panelService: {
    getPanelsByPage: vi.fn(),
    createPanel: vi.fn(),
    assignPanelScriptLines: vi.fn(),
  },
}));

vi.mock('@/services/scriptLine.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/scriptLine.service')>()),
  scriptLineService: {
    getScenesByChapter: vi.fn(),
    getSceneById: vi.fn(),
    createScene: vi.fn(),
    updateScene: vi.fn(),
    deleteScene: vi.fn(),
    reorderScenes: vi.fn(),
    createScriptLine: vi.fn(),
    updateScriptLine: vi.fn(),
    deleteScriptLine: vi.fn(),
  },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    getChapterById: vi.fn(),
    updateOutline: vi.fn(),
  },
}));

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getSeriesBible: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
    updateStoryArc: vi.fn(),
  },
}));

vi.mock('@/services/assignment.service', () => ({
  assignmentService: {
    runConsistencyCheck: vi.fn(),
    getConsistencyFindings: vi.fn(),
    triageConsistencyFinding: vi.fn(),
    getAssignments: vi.fn(),
    getChangeRequests: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/workspace.service', () => ({
  workspaceService: {
    getMembers: vi.fn(),
  },
}));

const mockChapters = [
  {
    id: 'chap-1',
    seriesId: 'se-1',
    chapterNumber: 1,
    title: 'Khởi đầu',
    versionVector: 5,
    status: 'InProduction' as const,
    scenesCount: 1,
    pagesCount: 2,
    createdAt: '2026-10-01',
  },
];

const mockScenes = [
  {
    id: 'sc-1',
    chapterId: 'chap-1',
    sceneNumber: 1,
    heading: 'Cảnh 1: Neo Tokyo - Đêm',
    summary: 'Mưa rơi tầm tã trên nóc toà nhà',
    createdAt: '2026-10-01',
    scriptLinesCount: 1,
    pagesCount: 1,
  },
];

const mockSceneDetail = {
  id: 'sc-1',
  chapterId: 'chap-1',
  sceneNumber: 1,
  heading: 'Cảnh 1: Neo Tokyo - Đêm',
  summary: 'Mưa rơi tầm tã trên nóc toà nhà',
  createdAt: '2026-10-01',
  scriptLines: [
    {
      id: 'line-1',
      lineOrder: 1,
      dialogueText: 'Họ đang di chuyển. Chuẩn bị đi!',
      stageDirection: 'Akira nhìn xuống đoàn xe',
      speakerCharacterId: 'char-1',
      panelId: null,
    },
  ],
};

const mockBible = {
  id: 'b-1',
  seriesId: 'se-1',
  workspaceId: 'ws-1',
  name: 'Bible',
  version: 1,
  entries: [
    {
      id: 'char-1',
      seriesBibleId: 'b-1',
      category: 0, // Character
      code: 'AKIRA',
      name: 'Akira',
      description: 'Nhân vật chính 20 tuổi',
      detailsJson: '{}',
      priority: 1,
      strictCheck: true,
      isActive: true,
      createdAt: '2026-10-01',
    },
  ],
};

const renderView = (props: { workspaceRole?: string; currentUserId?: string } = {}) =>
  render(
    <MemoryRouter
      initialEntries={['/workspaces/ws-1/series/se-1/script?chapterId=chap-1&sceneId=sc-1']}
    >
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/script'
          element={<ScriptEditorView workspaceRole='WRITER' {...props} />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ScriptEditorView (UC-06 Writer Script)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: mockChapters,
      totalCount: 1,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });
    vi.mocked(chapterService.getChapterById).mockResolvedValue(mockChapters[0]);
    vi.mocked(pageService.getPagesByChapter).mockResolvedValue([
      {
        id: 'page-1',
        chapterId: 'chap-1',
        pageNumber: 1,
        layoutFormat: 'Default',
        widthPx: 800,
        heightPx: 1200,
        dpi: 300,
        elementsCount: 1,
      },
    ]);
    vi.mocked(panelService.getPanelsByPage).mockResolvedValue([
      {
        id: 'panel-1',
        pageId: 'page-1',
        panelNumber: 1,
        boundingBox: '{}',
        readingOrder: 1,
        createdAt: '2026-10-01',
      },
    ]);
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue(mockBible as any);
    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValue(mockScenes);
    vi.mocked(scriptLineService.getSceneById).mockResolvedValue(mockSceneDetail);
    vi.mocked(seriesService.getSeriesById).mockResolvedValue({
      id: 'se-1',
      workspaceId: 'ws-1',
      title: 'Neon Odyssey',
      storyArc: 'Hành trình vượt qua đêm đen Neo Tokyo.',
      readingDirection: 0,
      genre: 'Cyberpunk',
      format: 'Manga',
      chaptersCount: 1,
      createdAt: '2026-10-01',
      chapters: [],
    });
    vi.mocked(seriesService.updateStoryArc).mockResolvedValue({
      value: 'Story arc mới của series.',
    });
    vi.mocked(chapterService.updateOutline).mockResolvedValue({
      value: 'Outline mới của chương 1.',
    });
    vi.mocked(assignmentService.getConsistencyFindings).mockResolvedValue([]);
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);
    vi.mocked(workspaceService.getMembers).mockResolvedValue([]);
  });

  it('nạp và hiển thị danh sách Chapters, Scenes, ScriptLines và Characters', async () => {
    renderView();

    expect(
      await screen.findByText('Biên Soạn Kịch Bản Phân Cảnh (Script Editor)'),
    ).toBeInTheDocument();
    const headings = await screen.findAllByText('Cảnh 1: Neo Tokyo - Đêm');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Họ đang di chuyển/)).toBeInTheDocument();
    expect(screen.getByText(/Akira nhìn xuống đoàn xe/)).toBeInTheDocument();
    expect(screen.getAllByText('Akira').length).toBeGreaterThan(0);
  });

  it('nạp nhân vật vào ô Speaker khi BE trả category dạng chuỗi ("Character")', async () => {
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({
      ...mockBible,
      entries: [
        { ...mockBible.entries[0], category: 'Character' },
        {
          ...mockBible.entries[0],
          id: 'loc-1',
          code: 'TOWER',
          name: 'Tháp Đèn',
          category: 'Location',
        },
      ],
    } as any);

    const user = userEvent.setup();
    renderView();
    await user.click(await screen.findByTestId('open-add-line-btn'));

    expect(await screen.findByRole('option', { name: 'Akira' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Tháp Đèn' })).not.toBeInTheDocument();
  });

  it('cho phép thêm dòng kịch bản mới gửi đúng expectedChapterVersion', async () => {
    vi.mocked(scriptLineService.createScriptLine).mockResolvedValue({
      id: 'line-2',
      sceneId: 'sc-1',
      lineOrder: 2,
      dialogueText: 'Tôi đã sẵn sàng.',
      stageDirection: null,
      speakerCharacterId: 'char-1',
      panelId: null,
      chapterVersion: 6,
      revisionId: 'rev-2',
    });

    const user = userEvent.setup();
    renderView();

    const addBtn = await screen.findByTestId('open-add-line-btn');
    await user.click(addBtn);

    expect(await screen.findByText('Thêm Dòng Kịch Bản Mới (UC-06)')).toBeInTheDocument();

    const dialogueInput = screen.getByPlaceholderText(/Nhập lời thoại của nhân vật/i);
    await user.type(dialogueInput, 'Tôi đã sẵn sàng.');

    const submitBtn = await screen.findByTestId('submit-line-btn');
    await user.click(submitBtn);

    expect(scriptLineService.createScriptLine).toHaveBeenCalledWith(
      'chap-1',
      'sc-1',
      expect.objectContaining({
        dialogueText: 'Tôi đã sẵn sàng.',
        expectedChapterVersion: 5,
      }),
    );
  });

  it('xử lý 409 CONFLICT: hiển thị thông báo xung đột và tải lại dữ liệu mới nhất', async () => {
    const conflictErr = new Error(
      'Xung đột phiên bản: Chapter đã thay đổi (vector 6 != expected 5).',
    );
    (conflictErr as any).code = 'CONFLICT';
    (conflictErr as any).status = 409;
    vi.mocked(scriptLineService.createScriptLine).mockRejectedValueOnce(conflictErr);

    const user = userEvent.setup();
    renderView();

    const addBtn = await screen.findByTestId('open-add-line-btn');
    await user.click(addBtn);

    const dialogueInput = screen.getByPlaceholderText(/Nhập lời thoại của nhân vật/i);
    await user.type(dialogueInput, 'Dòng gây xung đột');

    const submitBtn = await screen.findByTestId('submit-line-btn');
    await user.click(submitBtn);

    expect(await screen.findByTestId('concurrency-error-banner')).toBeInTheDocument();
    // Tự động tải lại version mới
    expect(chapterService.getChapterById).toHaveBeenCalledWith('chap-1');
  });

  it('khóa kịch bản khi Chapter ở trạng thái Approved theo BR-12', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [{ ...mockChapters[0], status: 'Approved' }],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });

    renderView();

    expect(await screen.findByTestId('chapter-locked-banner')).toBeInTheDocument();
    // Nút thêm dòng kịch bản không xuất hiện
    expect(screen.queryByTestId('open-add-line-btn')).not.toBeInTheDocument();
  });

  it('chế độ chỉ đọc cho các vai trò không phải Producer/Writer', async () => {
    renderView({ workspaceRole: 'ARTIST' });

    expect(await screen.findByTestId('role-view-only-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('open-add-line-btn')).not.toBeInTheDocument();
  });

  it('khóa quyền sửa kịch bản khi chương đã giao cho Writer khác, hiển thị banner đã giao người khác', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([
      {
        id: 'as-1',
        seriesId: 'se-1',
        chapterId: 'chap-1',
        entityType: 'Chapter' as any,
        targetEntityId: 'chap-1',
        pipelineStageId: 'stg-1',
        assigneeUserId: 'other-writer-id',
        assignedRole: 'Writer' as any,
        brief: 'Viết kịch bản',
        priority: 'Medium' as any,
        status: 'Assigned' as any,
        createdAt: '2026-10-01',
      },
    ]);
    vi.mocked(workspaceService.getMembers).mockResolvedValue([
      {
        userId: 'other-writer-id',
        fullName: 'Lê Biên Kịch',
        email: 'writer@panelforge.com',
        role: 'Writer',
        isOwner: false,
        joinedAt: '2026-10-01',
      },
    ]);

    renderView({ workspaceRole: 'WRITER', currentUserId: 'my-writer-id' });

    const banner = await screen.findByTestId('writer-not-assigned-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('Lê Biên Kịch');
    expect(banner.textContent).toContain('Đã giao người khác');
    // Nút thêm dòng, viết nháp AI bị ẩn
    expect(screen.queryByTestId('open-add-line-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-ai-draft-btn')).not.toBeInTheDocument();
  });

  it('cho phép Writer được giao sửa kịch bản bình thường', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([
      {
        id: 'as-1',
        seriesId: 'se-1',
        chapterId: 'chap-1',
        entityType: 'Chapter' as any,
        targetEntityId: 'chap-1',
        pipelineStageId: 'stg-1',
        assigneeUserId: 'my-writer-id',
        assignedRole: 'Writer' as any,
        brief: 'Viết kịch bản',
        priority: 'Medium' as any,
        status: 'InProgress' as any,
        createdAt: '2026-10-01',
      },
    ]);

    renderView({ workspaceRole: 'WRITER', currentUserId: 'my-writer-id' });

    expect(await screen.findByTestId('open-add-line-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('writer-not-assigned-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('role-view-only-banner')).not.toBeInTheDocument();
  });

  it('chương chưa giao cho ai thì Writer vẫn sửa tự do', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);

    renderView({ workspaceRole: 'WRITER', currentUserId: 'any-writer-id' });

    expect(await screen.findByTestId('open-add-line-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('writer-not-assigned-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('role-view-only-banner')).not.toBeInTheDocument();
  });

  it('Assignment bị huỷ (cancelReason != null) thì không khoá quyền sửa của Writer', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([
      {
        id: 'as-cancelled',
        seriesId: 'se-1',
        chapterId: 'chap-1',
        entityType: 'Chapter' as any,
        targetEntityId: 'chap-1',
        pipelineStageId: 'stg-1',
        assigneeUserId: 'old-writer-id',
        assignedRole: 'Writer' as any,
        brief: 'Viết kịch bản cũ',
        priority: 'Medium' as any,
        status: 'Assigned' as any,
        createdAt: '2026-10-01',
        cancelReason: 'Đổi người viết',
      } as any,
    ]);

    renderView({ workspaceRole: 'WRITER', currentUserId: 'new-writer-id' });

    expect(await screen.findByTestId('open-add-line-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('writer-not-assigned-banner')).not.toBeInTheDocument();
  });

  it('Producer luôn có toàn quyền sửa kịch bản dù chương đã giao cho Writer khác', async () => {
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([
      {
        id: 'as-1',
        seriesId: 'se-1',
        chapterId: 'chap-1',
        entityType: 'Chapter' as any,
        targetEntityId: 'chap-1',
        pipelineStageId: 'stg-1',
        assigneeUserId: 'other-writer-id',
        assignedRole: 'Writer' as any,
        brief: 'Viết kịch bản',
        priority: 'Medium' as any,
        status: 'Assigned' as any,
        createdAt: '2026-10-01',
      },
    ]);

    renderView({ workspaceRole: 'PRODUCER', currentUserId: 'producer-id' });

    expect(await screen.findByTestId('open-add-line-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('writer-not-assigned-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('role-view-only-banner')).not.toBeInTheDocument();
  });

  it('bắt lỗi 403 Forbidden khi tạo dòng kịch bản và hiển thị thông báo lỗi', async () => {
    const user = userEvent.setup();
    const mockShowToast = vi.fn();
    render(
      <MemoryRouter
        initialEntries={['/workspaces/ws-1/series/se-1/script?chapterId=chap-1&sceneId=sc-1']}
      >
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/script'
            element={
              <ScriptEditorView
                workspaceRole='WRITER'
                currentUserId='my-writer-id'
                onShowToast={mockShowToast}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const openAddBtn = await screen.findByTestId('open-add-line-btn');
    await user.click(openAddBtn);

    vi.mocked(scriptLineService.createScriptLine).mockRejectedValueOnce({
      status: 403,
      message:
        'Kịch bản chương này đã được giao cho Writer khác. Chỉ người được giao hoặc Producer mới sửa được.',
    });

    const dialogueInput = screen.getByPlaceholderText(/Nhập lời thoại của nhân vật/i);
    await user.type(dialogueInput, 'Dòng thoại test 403');

    const submitBtn = await screen.findByTestId('submit-line-btn');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Không có quyền sửa kịch bản (403)',
        'Kịch bản chương này đã được giao cho Writer khác. Chỉ người được giao hoặc Producer mới sửa được.',
      );
    });
  });

  it('hiển thị chip mục Series Bible liên kết trên dòng kịch bản (UC-06)', async () => {
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue({
      ...mockBible,
      entries: [
        ...mockBible.entries,
        {
          id: 'entry-sword-prop',
          seriesBibleId: 'b-1',
          category: 2,
          code: 'SWORD',
          name: 'Bảo Kiếm Gia Truyền',
          description: 'Thanh bảo kiếm phát sáng ánh xanh',
          priority: 1,
          strictCheck: true,
          isActive: true,
          createdAt: '2026-10-01',
        },
      ],
    } as any);

    vi.mocked(scriptLineService.getSceneById).mockResolvedValue({
      ...mockSceneDetail,
      scriptLines: [
        {
          id: 'line-bible-1',
          lineOrder: 1,
          dialogueText: 'Thanh gươm này thuộc về thành cổ!',
          stageDirection: 'Akira rút gươm',
          speakerCharacterId: 'char-1',
          panelId: null,
          bibleEntryIds: ['entry-sword-prop'],
        },
      ],
    });

    renderView();

    const headings = await screen.findAllByText('Cảnh 1: Neo Tokyo - Đêm');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Thanh gươm này thuộc về thành cổ!/)).toBeInTheDocument();
    expect(await screen.findByText(/Bible:/i)).toBeInTheDocument();
    expect(screen.getByText('Bảo Kiếm Gia Truyền')).toBeInTheDocument();
  });

  it('cho phép Writer sửa và lưu Story Arc của Series qua PUT /api/series/{seriesId}/story-arc', async () => {
    const user = userEvent.setup();
    renderView();

    const toggleBtn = await screen.findByTestId('toggle-narrative-context-btn');
    await user.click(toggleBtn);

    const textarea = await screen.findByTestId('story-arc-textarea');
    expect(textarea).toHaveValue('Hành trình vượt qua đêm đen Neo Tokyo.');

    await user.clear(textarea);
    await user.type(textarea, 'Khám phá bí mật trung tâm điều khiển.');

    const saveBtn = screen.getByTestId('save-story-arc-btn');
    await user.click(saveBtn);

    expect(seriesService.updateStoryArc).toHaveBeenCalledWith(
      'se-1',
      'Khám phá bí mật trung tâm điều khiển.',
    );
  });

  it('cho phép Writer sửa và lưu Outline của Chapter, và bắt lỗi 409 khi chương khoá / xung đột', async () => {
    const conflictErr = new Error(
      'Chương đã được duyệt, không thể cập nhật đề cương (409 Conflict).',
    );
    (conflictErr as any).status = 409;
    vi.mocked(chapterService.updateOutline).mockRejectedValueOnce(conflictErr);

    const user = userEvent.setup();
    renderView();

    const toggleBtn = await screen.findByTestId('toggle-narrative-context-btn');
    await user.click(toggleBtn);

    const textarea = await screen.findByTestId('chapter-outline-textarea');
    await user.type(textarea, 'Dàn ý nhịp phim nhanh.');

    const saveBtn = screen.getByTestId('save-chapter-outline-btn');
    await user.click(saveBtn);

    expect(chapterService.updateOutline).toHaveBeenCalledWith(
      'chap-1',
      expect.stringContaining('Dàn ý'),
    );
    expect(await screen.findByTestId('concurrency-error-banner')).toBeInTheDocument();
  });

  it('chạy Kiểm tra nhất quán: hiển thị findings, cuộn tới dòng script, hiển thị badge trên dòng và KHÔNG có nút triage', async () => {
    vi.mocked(assignmentService.runConsistencyCheck).mockResolvedValue({
      chapterId: 'chap-1',
      checkedAt: '2026-10-08T10:00:00Z',
      newCount: 1,
      openCount: 1,
      blockingOpenCount: 1,
      clearedCount: 0,
      findings: [
        {
          id: 'find-1',
          chapterId: 'chap-1',
          ruleCode: 'SPEAKER_UNKNOWN',
          severity: 'Blocking',
          message: 'Nhân vật nói "Akira" không khớp mục Canon Bible nào.',
          evidence: 'Họ đang di chuyển. Chuẩn bị đi!',
          scriptLineId: 'line-1',
          status: 'Open',
          createdAt: '2026-10-08T10:00:00Z',
          lastDetectedAt: '2026-10-08T10:00:00Z',
        },
      ],
    });

    const user = userEvent.setup();
    renderView();

    const checkBtn = await screen.findByTestId('run-consistency-check-btn');
    await user.click(checkBtn);

    expect(assignmentService.runConsistencyCheck).toHaveBeenCalledWith('chap-1');

    // Hiển thị panel findings và badge trên dòng kịch bản
    expect(await screen.findByTestId('consistency-findings-panel')).toBeInTheDocument();
    expect(screen.getAllByText(/Nhân vật nói "Akira" không khớp/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SPEAKER_UNKNOWN').length).toBeGreaterThanOrEqual(1);

    // Hiển thị badge trên dòng kịch bản tương ứng
    expect(await screen.findByTestId('line-finding-line-1')).toBeInTheDocument();

    // Kiểm tra TUYỆT ĐỐI KHÔNG CÓ bất kỳ nút triage nào (Confirmed, Rejected, Ignored, NeedsClarification)
    expect(screen.queryByRole('button', { name: /xác nhận|confirmed/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /từ chối|rejected/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bỏ qua|ignored/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /làm rõ|needsclarification/i }),
    ).not.toBeInTheDocument();
  });

  it('formatChapterOption không làm lặp "Chương 1: Chương 1"', async () => {
    const { formatChapterOption } = await import('../utils/chapterFormat');
    expect(formatChapterOption(1, 'Chương 1: Cơn Bão Deadline')).toBe('Chương 1: Cơn Bão Deadline');
    expect(formatChapterOption(1, 'Chương 1')).toBe('Chương 1');
    expect(formatChapterOption(1, 'chương 1 - Tiếng sấm')).toBe('Chương 1: Tiếng sấm');
    expect(formatChapterOption(2, 'Khởi đầu mới')).toBe('Chương 2: Khởi đầu mới');
    expect(formatChapterOption(3, null)).toBe('Chương 3');
    expect(formatChapterOption(3, '')).toBe('Chương 3');
  });

  it('mở và đóng ngăn kéo phân cảnh từ thanh biểu tượng', async () => {
    const user = userEvent.setup();
    renderView();

    expect(screen.queryByTestId('script-scenes-drawer')).not.toBeInTheDocument();
    await user.click(await screen.findByTestId('rail-scenes-btn'));
    const drawer = await screen.findByTestId('script-scenes-drawer');
    expect(within(drawer).getByText('Cảnh 1: Neo Tokyo - Đêm')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByTestId('script-scenes-drawer')).not.toBeInTheDocument();
  });

  it('cho phép mở danh mục Nhân vật Series Bible qua nút trên header', async () => {
    const user = userEvent.setup();
    renderView();

    const bibleBtn = await screen.findByTestId('rail-characters-btn');
    await user.click(bibleBtn);

    expect(await screen.findByText('Nhân vật Series Bible (1)')).toBeInTheDocument();
    expect(screen.getByText('Nhân vật chính 20 tuổi')).toBeInTheDocument();
  });

  describe('Bản nháp cục bộ khi mất phiên / đóng tab', () => {
    beforeEach(() => localStorage.clear());

    it('lưu Story Arc đang gõ rồi đề nghị khôi phục ở lần mở sau', async () => {
      const user = userEvent.setup();
      const first = renderView();
      await user.click(await screen.findByTestId('toggle-narrative-context-btn'));
      const textarea = await screen.findByTestId('story-arc-textarea');
      await user.clear(textarea);
      await user.type(textarea, 'Bản nháp chưa kịp lưu');
      await waitFor(() => expect(localStorage.getItem('pf.draft.storyArc.se-1')).not.toBeNull(), {
        timeout: 2500,
      });
      first.unmount(); // giống bị văng ra trang đăng nhập

      renderView();
      const banner = await screen.findByTestId('draft-restore-storyArc');
      await user.click(within(banner).getByRole('button', { name: 'Khôi phục' }));
      await user.click(await screen.findByTestId('toggle-narrative-context-btn'));
      expect(await screen.findByTestId('story-arc-textarea')).toHaveValue('Bản nháp chưa kịp lưu');
      expect(seriesService.updateStoryArc).not.toHaveBeenCalled(); // người dùng vẫn tự bấm lưu
    }, 15000);

    it('"Bỏ bản nháp" xoá nháp; nháp trùng nội dung đã lưu thì không hỏi', async () => {
      localStorage.setItem(
        'pf.draft.storyArc.se-1',
        JSON.stringify({ text: 'Nháp cũ', savedAt: '2026-10-19T08:00:00.000Z' }),
      );
      const user = userEvent.setup();
      const view = renderView();
      const banner = await screen.findByTestId('draft-restore-storyArc');
      await user.click(within(banner).getByRole('button', { name: 'Bỏ bản nháp' }));
      expect(localStorage.getItem('pf.draft.storyArc.se-1')).toBeNull();
      view.unmount();

      localStorage.setItem(
        'pf.draft.storyArc.se-1',
        JSON.stringify({
          text: 'Hành trình vượt qua đêm đen Neo Tokyo.',
          savedAt: '2026-10-19T08:00:00.000Z',
        }),
      );
      renderView();
      await screen.findByTestId('toggle-narrative-context-btn');
      expect(screen.queryByTestId('draft-restore-storyArc')).toBeNull();
    });

    it('hiển thị nút Phân khung bằng AI (open-ai-storyboard-btn) và mở Storyboard panel khi bấm', async () => {
      const user = userEvent.setup();
      renderView();
      await user.click(await screen.findByTestId('rail-ai-btn'));
      const storyboardBtn = await screen.findByTestId('open-ai-storyboard-btn');
      expect(storyboardBtn).toBeInTheDocument();
      expect(storyboardBtn).toHaveTextContent('Phân khung bằng AI');

      await user.click(storyboardBtn);
      const panel = await screen.findByTestId('ai-assist-panel');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveAttribute('aria-label', 'Trợ lý AI · Phân khung Storyboard');
    });

    it('hiển thị chỉ báo "Đã có khung" khi phân cảnh đã có panel', async () => {
      vi.mocked(scriptLineService.getSceneById).mockResolvedValueOnce({
        ...mockSceneDetail,
        scriptLines: [
          {
            ...mockSceneDetail.scriptLines[0],
            panelId: 'panel-existing-1',
          },
        ],
      });
      renderView();
      fireEvent.click(await screen.findByTestId('rail-ai-btn'));
      const storyboardBtn = await screen.findByTestId('open-ai-storyboard-btn');
      expect(storyboardBtn).toHaveTextContent('Cảnh đã có khung');
    });
  });

  it('bỏ phần chọn phân cảnh và tự động khởi tạo cảnh đầu tiên khi chương chưa có phân cảnh nào', async () => {
    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValueOnce([]);
    vi.mocked(scriptLineService.createScene).mockResolvedValueOnce({
      id: 'sc-auto-1',
      chapterId: 'chap-1',
      sceneNumber: 1,
      heading: 'CẢNH 1: MỞ ĐẦU',
      summary: null,
      createdAt: '2026-10-01',
      scriptLinesCount: 0,
      pagesCount: 0,
    });
    vi.mocked(scriptLineService.getSceneById).mockResolvedValueOnce({
      id: 'sc-auto-1',
      chapterId: 'chap-1',
      sceneNumber: 1,
      heading: 'CẢNH 1: MỞ ĐẦU',
      summary: null,
      createdAt: '2026-10-01',
      scriptLines: [],
    });

    renderView();

    // Tuyệt đối không còn hiển thị màn hình rào cản "Chưa chọn Phân cảnh"
    expect(screen.queryByText('Chưa chọn Phân cảnh')).not.toBeInTheDocument();

    // Tự động gọi API createScene để tạo cảnh 1 và vào thẳng trang soạn kịch bản
    await waitFor(() => {
      expect(scriptLineService.createScene).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          sceneNumber: 1,
          heading: 'CẢNH 1: MỞ ĐẦU',
        }),
      );
    });
  });

  it('không cho phép Writer tạo chapter, chỉ Producer mới có quyền tạo và xoá chapter (Zero-Trust RBAC)', async () => {
    // 1. Khi vai trò là WRITER
    renderView({ workspaceRole: 'WRITER' });
    await screen.findByText(/Khởi đầu/i);
    fireEvent.click(await screen.findByTestId('rail-scenes-btn'));
    await screen.findByTestId('script-scenes-drawer');
    // Nút xoá chapter không xuất hiện cho Writer
    expect(screen.queryByTestId('delete-current-chapter-btn')).not.toBeInTheDocument();

    // 2. Khi vai trò là PRODUCER
    cleanup();
    renderView({ workspaceRole: 'PRODUCER' });
    fireEvent.click(await screen.findByTestId('rail-scenes-btn'));
    expect(await screen.findByTestId('delete-current-chapter-btn')).toBeInTheDocument();
  });

  it('hiển thị badge SHA-256 hash khi kịch bản đã đóng băng', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValueOnce({
      items: [
        {
          ...mockChapters[0],
          isScriptFrozen: true,
          scriptContentHash: '9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });
    vi.mocked(chapterService.getChapterById).mockResolvedValueOnce({
      ...mockChapters[0],
      isScriptFrozen: true,
      scriptContentHash: '9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef',
    });

    renderView({ workspaceRole: 'PRODUCER' });
    expect(await screen.findByText(/Kịch bản đã đóng băng/i)).toBeInTheDocument();
    expect(await screen.findByTestId('frozen-script-hash-badge')).toHaveTextContent('#98765432');
  });
  it('bàn viết hiện thanh loại dòng kiểu WriterSolo và dựng sẵn Trang 1 / Panel 1 cho chương trống', async () => {
    renderView({ workspaceRole: 'WRITER' });
    await screen.findByText(/Khởi đầu/i);

    fireEvent.click(await screen.findByTestId('tab-flow'));
    const sheet = await screen.findByTestId('paper-editor-sheet');
    expect(sheet).toBeInTheDocument();

    const toolbar = await screen.findByRole('toolbar');
    for (const label of ['Trang', 'Panel', 'Hành động', 'Nhân vật', 'Thoại', 'Dẫn truyện', 'SFX']) {
      expect(within(toolbar).getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(within(toolbar).getByRole('button', { name: 'Trang' })).toHaveAttribute(
      'title',
      'Trang · Ctrl+1',
    );

    // Nhãn Trang/Panel là decoration, không nằm trong chữ của dòng
    await waitFor(() => {
      expect(sheet.querySelector('[data-el="page"]')?.getAttribute('data-label')).toBe(
        'TRANG 1 - PANEL: 1',
      );
      expect(sheet.querySelector('[data-el="panel"]')?.getAttribute('data-label')).toBe('PANEL 1');
    });
  });

  it('hỗ trợ tạo mã tạm và lưu vào tempBibleCodes', async () => {
    const { getTempBibleCodes, saveTempBibleCode } = await import('@/shared/utils/tempBibleCodes');
    renderView({ workspaceRole: 'WRITER' });
    await screen.findByText(/Khởi đầu/i);

    saveTempBibleCode({
      code: 'CHR-LAM-DU',
      name: 'Lâm Du',
      category: 'Character',
      chapterNumber: 1,
    });

    const codes = getTempBibleCodes();
    expect(codes.some((c) => c.code === 'CHR-LAM-DU')).toBe(true);
  });

  it('Gộp banner: khi kịch bản đóng băng chỉ hiển thị 1 dải thông báo script-frozen-banner duy nhất', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValueOnce({
      items: [
        {
          ...mockChapters[0],
          isScriptFrozen: true,
          scriptContentHash: 'abc123hash',
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });
    vi.mocked(chapterService.getChapterById).mockResolvedValueOnce({
      ...mockChapters[0],
      isScriptFrozen: true,
      scriptContentHash: 'abc123hash',
    });

    renderView({ workspaceRole: 'WRITER' });
    await screen.findByText(/Khởi đầu/i);

    const topBanner = await screen.findByTestId('script-frozen-banner');
    expect(topBanner).toBeInTheDocument();
    expect(topBanner).toHaveTextContent('Thẻ xem nhanh vẫn dùng được qua hover hoặc Ctrl+.');

    fireEvent.click(await screen.findByTestId('tab-flow'));
    const sheet = await screen.findByTestId('paper-editor-sheet');
    expect(sheet).toBeInTheDocument();

    expect(screen.queryByTestId('flow-script-content-hash')).not.toBeInTheDocument();
  });
});
