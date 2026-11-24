import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScriptReviewView } from './ScriptReviewView';
import { chapterService } from '@/services/chapter.service';
import { chapterCastService } from '@/services/chapterCast.service';
import { assignmentService } from '@/services/assignment.service';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const EDITOR_ID = 'usr-editor';

const mockChapter = {
  id: 'chap-101',
  seriesId: 'series-001',
  chapterNumber: 5,
  title: 'Hồi Kết Ở Đỉnh Núi Tuyết',
  isScriptFrozen: false,
  scriptStatus: 'InReview',
  lastSubmittedVersionId: 'ver-submitted-1',
  previousSubmittedVersionId: null,
  scriptContentHash: null,
  scriptReopenStatus: 'None',
};

const mockScriptVersionDetail = {
  version: {
    id: 'ver-submitted-1',
    chapterId: 'chap-101',
    versionNumber: 1,
    commitMessage: 'Bản nộp duyệt 1',
    contentHash: 'abcdef123456',
    isSubmitted: true,
    createdAt: '2026-11-10T08:00:00Z',
    authorName: 'Writer Name',
  },
  rows: [
    { key: 'page:1', type: 'page', page: 1, panel: 0, text: 'Trang 1' },
    { key: 'panel:1:1', type: 'panel', page: 1, panel: 1, text: 'Panel 1' },
    {
      key: 'line:line-1',
      type: 'Dialogue',
      page: 1,
      panel: 1,
      character: 'Ren Kusanagi',
      text: 'Ngươi không thể thoát khỏi đây đâu!',
    },
    {
      key: 'line:line-2',
      type: 'Action',
      page: 1,
      panel: 1,
      text: 'Gió tuyết rít từng cơn lạnh buốt',
    },
  ],
};

const mockChapterCast = {
  chapterId: 'chap-101',
  chapterNumber: 5,
  chapterTitle: 'Hồi Kết Ở Đỉnh Núi Tuyết',
  entities: [
    {
      bibleEntryId: 'b-1',
      code: 'HERO_REN',
      name: 'Ren Kusanagi',
      category: 'Character',
      isStub: false,
      isCrowd: false,
      source: 'Speaker' as const,
      bibleStatus: 'Active',
      chosenByWriter: false,
      panelRevisions: [],
      availableRevisions: [],
      mentions: [],
    },
  ],
  submitGate: {
    canSubmit: true,
    blockers: [],
  },
  gate: {
    canStart: true,
    blockers: [],
  },
};

const renderView = (
  query = '',
  props: Partial<React.ComponentProps<typeof ScriptReviewView>> = {},
) =>
  render(
    <MemoryRouter
      initialEntries={[
        `/workspaces/ws-1/series/series-001/chapters/chap-101/script/review${query}`,
      ]}
    >
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/chapters/:chapterId/script/review'
          element={<ScriptReviewView workspaceRole='Editor' currentUserId={EDITOR_ID} {...props} />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('ScriptReviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('user', JSON.stringify({ fullName: 'Trung Kiên' }));
    vi.spyOn(chapterService, 'getChapterById').mockResolvedValue(mockChapter as any);
    vi.spyOn(chapterService, 'getScriptVersion').mockResolvedValue(mockScriptVersionDetail as any);
    vi.spyOn(chapterService, 'getScriptComments').mockResolvedValue([] as any);
    vi.spyOn(chapterCastService, 'getChapterCast').mockResolvedValue(mockChapterCast as any);
    vi.spyOn(assignmentService, 'getConsistencyFindings').mockResolvedValue([] as any);
    vi.spyOn(assignmentService, 'runConsistencyCheck').mockResolvedValue({
      checkedAt: '2026-11-11T08:00:00Z',
      findings: [],
    } as any);
  });

  it('renders the manuscript with pushed version rows and speaker names', async () => {
    renderView();

    expect(await screen.findByText(/Chương 5: Hồi Kết Ở Đỉnh Núi Tuyết/)).toBeInTheDocument();
    expect(screen.getByText(/Panel 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Ngươi không thể thoát khỏi đây đâu!/)).toBeInTheDocument();
    expect(screen.getByText('Gió tuyết rít từng cơn lạnh buốt')).toBeInTheDocument();
  });

  it('displays empty state when chapter has no submitted version', async () => {
    vi.spyOn(chapterService, 'getChapterById').mockResolvedValue({
      ...mockChapter,
      scriptStatus: 'Draft',
      lastSubmittedVersionId: null,
    } as any);

    renderView();

    expect(await screen.findAllByText(/Writer chưa gửi duyệt bản nào cho chương này/)).toHaveLength(
      2,
    );
  });

  it('returns to the canonical editor desk instead of browser history', async () => {
    vi.mocked(chapterService.getChapterById).mockRejectedValueOnce(new Error('load failed'));
    renderView();

    await screen.findByText(/Không mở được kịch bản/i);
    fireEvent.click(screen.getByRole('button', { name: /Về bàn thẩm định/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/workspaces/ws-1/series/series-001/editor/desk');
  });

  it('can open comment composer and submit a comment using modern composer card', async () => {
    const addCommentSpy = vi.spyOn(chapterService, 'addScriptComment').mockResolvedValue({
      id: 'cmt-1',
      chapterId: 'chap-101',
      authorUserId: EDITOR_ID,
      authorName: 'Trung Kiên',
      body: 'Sửa lại câu này ngắn gọn hơn',
      quotedText: 'Ngươi không thể thoát khỏi đây đâu!',
      scriptLineId: 'line-1',
      createdAt: '2026-11-13T10:00:00Z',
      resolvedAt: null,
    } as any);

    renderView();

    await screen.findByText(/Ngươi không thể thoát khỏi đây đâu!/);

    const commentBtns = screen.getAllByTitle('Góp ý dòng này');
    expect(commentBtns.length).toBeGreaterThan(0);
    fireEvent.click(commentBtns[0]);

    // Composer card appears with user's name
    expect(screen.getByText('Trung Kiên')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Nhập nhận xét...');
    fireEvent.change(input, { target: { value: 'Sửa lại câu này ngắn gọn hơn' } });

    const submitBtn = screen.getByTestId('comment-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addCommentSpy).toHaveBeenCalledWith('chap-101', {
        sceneId: null,
        scriptLineId: 'line-1',
        quotedText: expect.any(String),
        body: 'Sửa lại câu này ngắn gọn hơn',
      });
    });

    // The comment item card appears inline on the script line and in the comments panel
    expect(
      (await screen.findAllByText('Sửa lại câu này ngắn gọn hơn')).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('switches tabs between comments, changes, and checks', async () => {
    renderView();

    await screen.findByText(/Chương 5: Hồi Kết Ở Đỉnh Núi Tuyết/);

    const checksTab = screen.getByRole('tab', { name: /Kiểm tra/i });
    fireEvent.click(checksTab);

    // Checks tab content is visible
    expect(await screen.findByText(/Bible Gate/i)).toBeInTheDocument();
  });

  it('shows warning with 2 unresolved comments and button stays enabled; hidden when 0', async () => {
    const unresolvedComments = [
      {
        id: 'c-1',
        chapterId: 'chap-101',
        authorUserId: 'usr-editor',
        authorName: 'Editor 1',
        body: 'Góp ý 1',
        createdAt: '2026-11-13T10:00:00Z',
        resolvedAt: null,
      },
      {
        id: 'c-2',
        chapterId: 'chap-101',
        authorUserId: 'usr-editor',
        authorName: 'Editor 2',
        body: 'Góp ý 2',
        createdAt: '2026-11-13T10:05:00Z',
        resolvedAt: null,
      },
    ];

    vi.spyOn(chapterService, 'getScriptComments').mockResolvedValue(unresolvedComments as any);

    const { unmount } = renderView('', { workspaceRole: 'Producer' });

    // Warning shows with 2 unresolved comments
    expect(await screen.findByTestId('open-comments-warning')).toHaveTextContent(
      'Còn 2 góp ý tham khảo; không chặn Gate 1',
    );

    // Button stays enabled
    const startBtn = screen.getByRole('button', { name: /Bắt đầu sản xuất/i });
    expect(startBtn).toBeInTheDocument();
    expect(startBtn).toBeEnabled();

    unmount();

    // Hidden when 0 unresolved comments
    vi.spyOn(chapterService, 'getScriptComments').mockResolvedValue([]);
    renderView('', { workspaceRole: 'Producer' });

    await screen.findByRole('button', { name: /Bắt đầu sản xuất/i });
    expect(screen.queryByTestId('open-comments-warning')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bắt đầu sản xuất/i })).toBeEnabled();
  });
});
