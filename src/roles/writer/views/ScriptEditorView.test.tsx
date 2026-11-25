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
import { chapterCastService } from '@/services/chapterCast.service';
import { aiAgentsService } from '@/services/aiAgents.service';

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
    restoreScriptRevision: vi.fn(),
  },
}));

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    getChapterById: vi.fn(),
    updateOutline: vi.fn(),
    getScriptVersions: vi.fn(),
    getScriptWorkingCopy: vi.fn(),
    saveChapterScript: vi.fn(),
    submitChapterScript: vi.fn(),
    getScriptComments: vi.fn(),
    resolveScriptComment: vi.fn(),
    unfreezeScript: vi.fn(),
    recallScript: vi.fn(),
    createChapter: vi.fn(),
    deleteChapter: vi.fn(),
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

vi.mock('@/services/chapterCast.service', () => ({
  chapterCastService: {
    getChapterCast: vi.fn().mockResolvedValue({
      chapterId: 'chap-1',
      entries: [],
      submitGate: { isPassed: true, blockers: [] },
      gate: { isPassed: true, blockers: [] },
    }),
    setChapterCastRevision: vi.fn(),
    setBibleEntryCrowd: vi.fn(),
    defineBibleEntry: vi.fn(),
    cancelReplacementRevision: vi.fn(),
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
      speakerLabel: 'Akira',
      dialogueText: 'Họ đang di chuyển. Chuẩn bị đi!',
      stageDirection: 'Akira nhìn xuống đoàn xe',
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

const renderView = (
  props: {
    workspaceRole?: string;
    currentUserId?: string;
    onShowToast?: (title: string, desc: string) => void;
  } = {},
) =>
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
    vi.mocked(chapterService.getChapterById).mockReset();
    vi.mocked(chapterService.getScriptVersions).mockReset();
    vi.mocked(chapterService.getScriptWorkingCopy).mockReset();
    vi.mocked(chapterService.saveChapterScript).mockReset();
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
    vi.mocked(chapterService.getScriptVersions).mockResolvedValue([]);
    vi.mocked(chapterService.saveChapterScript).mockResolvedValue({
      revisionId: 'rev-1',
      versionNumber: 1,
      created: true,
      warnings: [],
    });
    vi.mocked(chapterService.submitChapterScript).mockResolvedValue({
      revisionId: 'rev-1',
      versionNumber: 1,
      created: true,
      warnings: [],
      chapter: mockChapters[0] as any,
    });
    vi.mocked(chapterService.getScriptComments).mockResolvedValue([]);
    vi.mocked(assignmentService.getConsistencyFindings).mockResolvedValue([]);
    vi.mocked(assignmentService.getAssignments).mockResolvedValue([]);
    vi.mocked(assignmentService.getChangeRequests).mockResolvedValue([]);
    vi.mocked(workspaceService.getMembers).mockResolvedValue([]);
  });

  it('nạp và hiển thị danh sách Chapters, Scenes, ScriptLines và Characters', async () => {
    const user = userEvent.setup();
    renderView();

    expect(
      await screen.findByText('Biên Soạn Kịch Bản Phân Cảnh (Script Editor)'),
    ).toBeInTheDocument();
    await user.click(await screen.findByTestId('rail-scenes-btn'));
    const headings = await screen.findAllByText('Cảnh 1: Neo Tokyo - Đêm');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText(/Họ đang di chuyển/)).toBeInTheDocument();
    expect(screen.getAllByText(/Akira/i).length).toBeGreaterThan(0);
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

  it('cho phép mở Series Bible qua nút trên header', async () => {
    const user = userEvent.setup();
    renderView();

    const bibleBtn = await screen.findByTestId('rail-characters-btn');
    await user.click(bibleBtn);

    const drawer = await screen.findByTestId('script-right-bible-panel');
    expect(drawer).toBeInTheDocument();
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

  it('hiển thị banner khi kịch bản đã đóng băng', async () => {
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
    expect(await screen.findByTestId('script-frozen-banner')).toBeInTheDocument();
  });

  it('bàn viết dựng sẵn paper-editor-sheet cho chương', async () => {
    renderView({ workspaceRole: 'WRITER' });
    await screen.findByText(/Khởi đầu/i);

    const sheet = await screen.findByTestId('paper-editor-sheet');
    expect(sheet).toBeInTheDocument();
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
  });

  it('SCR-14 / BR-11: xử lý 409 CONFLICT trên saveChapterScript hiện thông báo chuẩn, giữ thay đổi chưa lưu và không tự gửi lại', async () => {
    const user = userEvent.setup();
    const onShowToast = vi.fn();
    vi.mocked(chapterService.getScriptVersions).mockResolvedValue([
      {
        id: 'rev-10',
        versionNumber: 10,
        message: 'v10',
        authorUserId: 'u-1',
        createdAt: '2026-10-01',
        lineCount: 1,
        contentHash: 'hash-10',
      },
    ]);

    const conflictErr = new Error('Xung đột phiên bản kịch bản');
    (conflictErr as any).status = 409;
    (conflictErr as any).code = 'CONFLICT';
    vi.mocked(chapterService.saveChapterScript).mockRejectedValueOnce(conflictErr);

    renderView({ onShowToast });

    await screen.findByText('Biên Soạn Kịch Bản Phân Cảnh (Script Editor)');
    await screen.findByText(/Họ đang di chuyển/);

    // Chèn gợi ý nhanh để tạo thay đổi chưa lưu
    await user.click(await screen.findByTestId('rail-ai-btn'));
    await user.click(await screen.findByText('SFX cao trào cho Panel'));

    expect(await screen.findByText(/Chưa lưu/)).toBeInTheDocument();

    // Bấm lưu (Ctrl+S) -> gặp 409
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(chapterService.saveChapterScript).toHaveBeenCalledTimes(1);
    });

    expect(chapterService.saveChapterScript).toHaveBeenCalledWith(
      'chap-1',
      expect.objectContaining({
        expectedRevisionId: 'rev-10',
      }),
    );

    const expectedMsg =
      'Kịch bản vừa được thay đổi (khôi phục / AI / người khác). Tải lại để xem bản mới nhất.';
    expect(onShowToast).toHaveBeenCalledWith(expectedMsg, '');
    expect(await screen.findByTestId('concurrency-error-banner')).toHaveTextContent(expectedMsg);

    // Không tự động gửi lại mù quáng
    expect(chapterService.saveChapterScript).toHaveBeenCalledTimes(1);

    // expectedRevisionId không bị ghi đè mù quáng khi chưa tải lại
    vi.mocked(chapterService.saveChapterScript).mockRejectedValueOnce(conflictErr);
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await waitFor(() => {
      expect(chapterService.saveChapterScript).toHaveBeenCalledTimes(2);
    });
    expect(vi.mocked(chapterService.saveChapterScript).mock.calls[1][1]).toEqual(
      expect.objectContaining({ expectedRevisionId: 'rev-10' }),
    );
  });

  it('BR-11 / quy tắc 9: khôi phục hoặc chấp nhận AI khi đang có chữ chưa lưu thì KHÔNG đè editor, chỉ hiện banner tải lại', async () => {
    const user = userEvent.setup();
    vi.mocked(chapterService.getScriptVersions).mockResolvedValue([
      {
        id: 'rev-10',
        versionNumber: 10,
        message: 'v10',
        authorUserId: 'u-1',
        createdAt: '2026-10-01',
        lineCount: 1,
        contentHash: 'hash-10',
      },
    ]);

    renderView();
    await screen.findByText('Biên Soạn Kịch Bản Phân Cảnh (Script Editor)');
    await screen.findByText(/Họ đang di chuyển/);
    await user.click(await screen.findByTestId('rail-ai-btn'));
    await user.click(await screen.findByText('SFX cao trào cho Panel'));
    expect(await screen.findByText(/Chưa lưu/)).toBeInTheDocument();

    // BE vừa tạo rev-11 (khôi phục / AI ở nơi khác)
    vi.mocked(chapterService.getScriptWorkingCopy).mockResolvedValue(null as any);
    vi.mocked(chapterService.getScriptVersions).mockResolvedValue([
      {
        id: 'rev-11',
        versionNumber: 11,
        message: 'Chấp nhận đề xuất AI (Script)',
        authorUserId: 'u-1',
        createdAt: '2026-10-02',
        lineCount: 1,
        contentHash: 'hash-11',
      },
    ]);
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('panelforge:script-working-copy-changed', {
          detail: { chapterId: 'chap-1' },
        }),
      );
    });

    expect(await screen.findByTestId('concurrency-error-banner')).toHaveTextContent(
      'Kịch bản vừa được thay đổi (khôi phục / AI / người khác). Tải lại để xem bản mới nhất.',
    );
    expect(screen.getByText(/Chưa lưu/)).toBeInTheDocument();

    // Vẫn giữ expectedRevisionId cũ: lưu tiếp sẽ bị BE chặn 409 thay vì đè bản mới
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    await waitFor(() => expect(chapterService.saveChapterScript).toHaveBeenCalled());
    expect(vi.mocked(chapterService.saveChapterScript).mock.calls.at(-1)![1]).toEqual(
      expect.objectContaining({ expectedRevisionId: 'rev-10' }),
    );
  });

  it('BR-08 / BR-11: sau khi restoreScriptRevision thành công thì tải lại working copy, cập nhật expectedRevisionId và nội dung đang hiển thị', async () => {
    const user = userEvent.setup();
    vi.mocked(chapterService.getScriptVersions).mockResolvedValueOnce([
      {
        id: 'rev-10',
        versionNumber: 10,
        message: 'v10',
        authorUserId: 'u-1',
        createdAt: '2026-10-01T00:00:00Z',
        lineCount: 1,
        contentHash: 'hash-10',
      },
    ]);
    vi.spyOn(aiAgentsService, 'getSceneRevisions').mockResolvedValue([
      {
        id: 'cr-2',
        kind: 'Script',
        versionNumber: 2,
        summary: 'Sửa tay lần 2',
        contentHash: 'h-cr2',
        createdAt: '2026-10-02T00:00:00Z',
      },
      {
        id: 'cr-1',
        kind: 'Script',
        versionNumber: 1,
        summary: 'Bản gốc ban đầu',
        contentHash: 'h-cr1',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]);

    renderView();
    await screen.findByText(/Họ đang di chuyển/);

    // Mở drawer lịch sử phiên bản
    await user.click(await screen.findByTestId('open-script-history-btn'));
    const restoreBtn = await screen.findByTestId('restore-script-revision-cr-1');

    // Khi restore thành công: BE tạo ScriptVersion mới rev-11 và working copy đổi sang nội dung của cr-1
    vi.mocked(scriptLineService.restoreScriptRevision).mockResolvedValueOnce({
      chapterVersion: 6,
      revisionId: 'cr-3',
      versionNumber: 3,
      restoredFromRevisionId: 'cr-1',
      restoredFromVersionNumber: 1,
    });
    vi.mocked(chapterService.getScriptWorkingCopy).mockResolvedValueOnce({
      contentHash: 'hash-11',
      lineCount: 1,
      rows: [
        {
          key: 'page:1',
          type: 'page',
          page: 1,
          panel: 0,
          text: '',
        },
        {
          key: 'panel:1.1',
          type: 'panel',
          page: 1,
          panel: 1,
          text: 'Toàn cảnh thành phố',
        },
        {
          key: 'line:line-1',
          type: 'Dialogue',
          page: 1,
          panel: 1,
          label: 'Akira',
          text: 'Lời thoại đã khôi phục về bản gốc v1!',
        },
      ],
    });
    vi.mocked(chapterService.getScriptVersions).mockResolvedValue([
      {
        id: 'rev-11',
        versionNumber: 11,
        message: 'Khôi phục về phiên bản 1',
        authorUserId: 'u-1',
        createdAt: '2026-10-03T00:00:00Z',
        lineCount: 1,
        contentHash: 'hash-11',
      },
    ]);

    await user.click(restoreBtn);

    await waitFor(() => {
      expect(scriptLineService.restoreScriptRevision).toHaveBeenCalledWith(
        'chap-1',
        'sc-1',
        'cr-1',
        { expectedChapterVersion: 5 },
      );
    });
    await waitFor(() => {
      expect(chapterService.getScriptWorkingCopy).toHaveBeenCalledWith('chap-1');
    });

    // Nội dung đang hiển thị được cập nhật theo working copy vừa tải
    expect(await screen.findByText(/Lời thoại đã khôi phục về bản gốc v1!/)).toBeInTheDocument();

    // Lần lưu kế tiếp gửi đúng expectedRevisionId mới ('rev-11'), không còn giữ 'rev-10'
    vi.mocked(chapterService.saveChapterScript).mockResolvedValueOnce({
      revisionId: 'rev-12',
      versionNumber: 12,
      created: true,
      warnings: [],
    });
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(chapterService.saveChapterScript).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          expectedRevisionId: 'rev-11',
        }),
      );
    });
  });

  it('BR-02 / BR-11: sau khi Accept đề xuất AI LineRewrite thì tải lại working copy và cập nhật expectedRevisionId', async () => {
    const kind = 'LineRewrite';
    vi.mocked(chapterService.getScriptVersions).mockResolvedValueOnce([
      {
        id: 'rev-10',
        versionNumber: 10,
        message: 'v10',
        authorUserId: 'u-1',
        createdAt: '2026-10-01T00:00:00Z',
        lineCount: 1,
        contentHash: 'hash-10',
      },
    ]);
    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValue([
      { ...mockScenes[0], pagesCount: 0 },
    ]);
    vi.spyOn(aiAgentsService, 'getSceneRevisions').mockResolvedValue([]);

    renderView();
    await screen.findByText(/Họ đang di chuyển/);

    vi.mocked(chapterService.getScriptWorkingCopy).mockResolvedValueOnce({
      contentHash: `hash-ai-${kind}`,
      lineCount: 1,
      rows: [
        {
          key: 'line:line-1',
          type: 'Dialogue',
          page: 1,
          panel: 1,
          label: 'Akira',
          text: `Nội dung mới từ AI ${kind}`,
        },
      ],
    });
    vi.mocked(chapterService.getScriptVersions).mockResolvedValue([
      {
        id: `rev-ai-${kind}`,
        versionNumber: 11,
        message: `Chấp nhận đề xuất AI (${kind})`,
        authorUserId: 'u-1',
        createdAt: '2026-10-03T00:00:00Z',
        lineCount: 1,
        contentHash: `hash-ai-${kind}`,
      },
    ]);

    // Khi review Accept LineRewrite phát sự kiện đồng bộ working copy
    act(() => {
      window.dispatchEvent(
        new CustomEvent('panelforge:script-working-copy-changed', {
          detail: {
            chapterId: 'chap-1',
            sceneId: 'sc-1',
            source: 'ai-accept',
            kind: 'LineRewrite',
          },
        }),
      );
    });

    await waitFor(() => {
      expect(chapterService.getScriptWorkingCopy).toHaveBeenCalledWith('chap-1');
    });
    expect(await screen.findByText(new RegExp(`Nội dung mới từ AI ${kind}`))).toBeInTheDocument();

    vi.mocked(chapterService.saveChapterScript).mockResolvedValueOnce({
      revisionId: 'rev-12',
      versionNumber: 12,
      created: true,
      warnings: [],
    });
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(chapterService.saveChapterScript).toHaveBeenCalledWith(
        'chap-1',
        expect.objectContaining({
          expectedRevisionId: `rev-ai-${kind}`,
        }),
      );
    });
  });

  it('SCR-14: hiển thị toast cảnh báo khi lưu kịch bản trả về warnings (lost refs / kept panels)', async () => {
    const onShowToast = vi.fn();
    vi.mocked(chapterService.saveChapterScript).mockResolvedValueOnce({
      revisionId: 'rev-11',
      versionNumber: 11,
      created: true,
      warnings: ['Trang 2 đã có artwork nên được giữ lại dù không còn trong kịch bản.'],
    });

    renderView({ onShowToast });
    await screen.findByText('Biên Soạn Kịch Bản Phân Cảnh (Script Editor)');
    await screen.findByText(/Họ đang di chuyển/);

    const saveBtn = await screen.findByTestId('save-script-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(chapterService.saveChapterScript).toHaveBeenCalledTimes(1);
    });

    expect(onShowToast).toHaveBeenCalledWith(
      'Cảnh báo tham chiếu Series Bible',
      'Trang 2 đã có artwork nên được giữ lại dù không còn trong kịch bản.',
    );
  });

  it('hiển thị link "Mở Series Bible để duyệt Canon" trên Gate 1 blocker banner (F#24)', async () => {
    vi.mocked(chapterService.getChaptersBySeries).mockResolvedValue({
      items: [
        {
          ...mockChapters[0],
          status: 'PreProduction',
          isScriptFrozen: false,
          scriptStatus: 'InReview',
        },
      ],
      totalCount: 1,
      pageIndex: 1,
      pageSize: 50,
      totalPages: 1,
    });
    vi.mocked(chapterCastService.getChapterCast).mockResolvedValue({
      chapterId: 'chap-1',
      entries: [],
      submitGate: { isPassed: true, blockers: [] },
      gate: {
        isPassed: false,
        canStart: false,
        blockers: [{ entryName: 'Hero Sword', reason: 'Chưa khoá Canon' } as any],
      },
    } as any);

    renderView();

    expect(await screen.findByTestId('start-blocked-banner')).toBeInTheDocument();
    expect(screen.getByText('Mở Series Bible để duyệt Canon')).toBeInTheDocument();
  });

  describe('AI Copilot viết lại dòng thoại (writer.rewrite)', () => {
    it('Writer bấm "Viết lại bằng AI" gọi runCopilot(writer.rewrite, lineId), hiện SuggestionCard và tải lại sau Accept', async () => {
      const user = userEvent.setup();
      const lineSuggestion = {
        id: 'sug-rw-1',
        runId: 'run-rw-1',
        stepId: 'step-rw-1',
        sceneId: 'sc-1',
        kind: 'LineRewrite' as const,
        status: 'Pending' as const,
        summary: 'Viết lại thoại theo giọng nhân vật',
        payload: {
          schemaVersion: 1,
          runId: 'run-rw-1',
          sceneId: 'sc-1',
          task: 'writer.rewrite',
          sourceScriptLineId: 'line-1',
          originalText: 'Họ đang di chuyển. Chuẩn bị đi!',
          suggestedText: 'Đoàn xe chuyển bánh rồi. Sẵn sàng ngay!',
          reason: 'Sắc gọn theo tính cách Akira',
        },
        payloadHash: 'hash-rw-1234',
        baseChapterVersion: 5,
        bibleRevisionIds: [],
        hasBlockingFindings: false,
        createdAt: '2026-11-18T10:00:00Z',
        decisions: [],
        canDecide: true,
        canAccept: true,
      };
      const runCopilotSpy = vi
        .spyOn(aiAgentsService, 'runCopilot')
        .mockResolvedValueOnce(lineSuggestion);
      const reviewSpy = vi.spyOn(aiAgentsService, 'review').mockResolvedValueOnce({
        suggestionId: 'sug-rw-1',
        status: 'Accepted',
        decisionId: 'dec-rw-1',
        resultRevisionId: 'rev-rw-1',
        chapterVersion: 6,
      });

      renderView({ workspaceRole: 'WRITER' });
      await screen.findByText(/Họ đang di chuyển/);

      const rewriteBtn = screen.getByRole('button', { name: /Viết lại bằng AI/i });
      await user.click(rewriteBtn);

      expect(runCopilotSpy).toHaveBeenCalledWith('se-1', {
        task: 'writer.rewrite',
        lineId: 'line-1',
      });
      expect(await screen.findByText('Đề xuất Viết lại / Rút gọn thoại')).toBeInTheDocument();

      vi.mocked(chapterService.getScriptWorkingCopy).mockResolvedValueOnce({
        contentHash: 'hash-after-rw',
        lineCount: 1,
        rows: [
          {
            key: 'line:line-1',
            type: 'Dialogue',
            page: 1,
            panel: 1,
            label: 'Akira',
            text: 'Đoàn xe chuyển bánh rồi. Sẵn sàng ngay!',
          },
        ],
      });

      await user.click(screen.getByRole('button', { name: /Accept \(cập nhật dòng thoại\)/ }));

      expect(reviewSpy).toHaveBeenCalledWith('se-1', 'sug-rw-1', 'accept', {
        chapterVersion: 5,
      });
      expect(await screen.findByText(/Đoàn xe chuyển bánh rồi/)).toBeInTheDocument();
    });

    it('ẩn nút "Viết lại bằng AI" khi kịch bản Frozen hoặc người dùng không phải Writer', async () => {
      vi.mocked(chapterService.getChaptersBySeries).mockResolvedValueOnce({
        items: [{ ...mockChapters[0], isScriptFrozen: true, scriptStatus: 'Frozen' }],
        totalCount: 1,
        pageIndex: 1,
        pageSize: 50,
        totalPages: 1,
      });
      vi.mocked(chapterService.getChapterById).mockResolvedValueOnce({
        ...mockChapters[0],
        isScriptFrozen: true,
        scriptStatus: 'Frozen',
      });

      const frozenRender = renderView({ workspaceRole: 'WRITER' });
      await screen.findByText(/Họ đang di chuyển/);
      expect(screen.queryByRole('button', { name: /Viết lại bằng AI/i })).not.toBeInTheDocument();
      frozenRender.unmount();

      renderView({ workspaceRole: 'PRODUCER' });
      await screen.findByText(/Họ đang di chuyển/);
      expect(screen.queryByRole('button', { name: /Viết lại bằng AI/i })).not.toBeInTheDocument();
    });

    it('hiển thị nguyên văn message lỗi 403 và 409 từ Backend khi gọi Viết lại bằng AI', async () => {
      const user = userEvent.setup();
      const { AiApiError } = await import('@/services/aiAgents.service');
      const runCopilotSpy = vi
        .spyOn(aiAgentsService, 'runCopilot')
        .mockRejectedValueOnce(
          new AiApiError('Bạn chưa được phân công viết chương này.', 'FORBIDDEN', 403),
        )
        .mockRejectedValueOnce(
          new AiApiError('Kịch bản chương này đã đóng băng (Frozen).', 'CONFLICT', 409),
        );

      renderView({ workspaceRole: 'WRITER' });
      await screen.findByText(/Họ đang di chuyển/);

      await user.click(screen.getByRole('button', { name: /Viết lại bằng AI/i }));
      expect(
        await screen.findByText('Bạn chưa được phân công viết chương này.'),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Viết lại bằng AI/i }));
      expect(runCopilotSpy).toHaveBeenCalledTimes(2);
      expect(
        (await screen.findAllByText('Kịch bản chương này đã đóng băng (Frozen).')).length,
      ).toBeGreaterThanOrEqual(1);
    });
  });
});
