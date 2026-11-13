import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScriptReviewView } from './ScriptReviewView';
import { chapterService } from '@/services/chapter.service';
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

const mockBibleGate = {
  isPassed: true,
  lockedCount: 1,
  pendingCount: 0,
  items: [
    {
      bibleEntryId: 'b-1',
      code: 'HERO_REN',
      name: 'Ren Kusanagi',
      category: 'Character',
      isReferencedAsSpeaker: true,
      isReferencedInScriptLink: false,
      hasEffectiveRevision: true,
      isLocked: true,
    },
  ],
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
    vi.spyOn(chapterService, 'checkBibleGate').mockResolvedValue(mockBibleGate as any);
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

    expect(
      await screen.findAllByText(/Writer chưa gửi duyệt bản nào cho chương này/),
    ).toHaveLength(2);
  });

  it('can open comment composer and submit a comment using modern composer card', async () => {
    const addCommentSpy = vi
      .spyOn(chapterService, 'addScriptComment')
      .mockResolvedValue({
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

    // The comment item card appears in the comments panel
    expect(await screen.findByText('Sửa lại câu này ngắn gọn hơn')).toBeInTheDocument();
  });

  it('switches tabs between comments, changes, and checks', async () => {
    renderView();

    await screen.findByText(/Chương 5: Hồi Kết Ở Đỉnh Núi Tuyết/);

    const checksTab = screen.getByRole('tab', { name: /Kiểm tra/i });
    fireEvent.click(checksTab);

    // Checks tab content is visible
    expect(await screen.findByText(/Bible Gate của chương/i)).toBeInTheDocument();
  });
});
