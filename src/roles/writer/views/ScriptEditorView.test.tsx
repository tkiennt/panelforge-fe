import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScriptEditorView } from './ScriptEditorView';
import { scriptLineService } from '@/services/scriptLine.service';
import { chapterService } from '@/services/chapter.service';
import { bibleService } from '@/services/bible.service';

vi.mock('@/services/scriptLine.service', () => ({
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
  },
}));

vi.mock('@/services/bible.service', () => ({
  bibleService: {
    getSeriesBible: vi.fn(),
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

const renderView = (props: { workspaceRole?: string } = {}) =>
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
    vi.mocked(bibleService.getSeriesBible).mockResolvedValue(mockBible as any);
    vi.mocked(scriptLineService.getScenesByChapter).mockResolvedValue(mockScenes);
    vi.mocked(scriptLineService.getSceneById).mockResolvedValue(mockSceneDetail);
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
});
