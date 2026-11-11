import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScriptReviewView } from './ScriptReviewView';
import { chapterService } from '@/services/chapter.service';
import { scriptLineService } from '@/services/scriptLine.service';
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
const WRITER_ID = 'usr-writer';

const mockChapter = {
  id: 'chap-101',
  seriesId: 'series-001',
  chapterNumber: 5,
  title: 'Hồi Kết Ở Đỉnh Núi Tuyết',
  isScriptFrozen: false,
  scriptContentHash: null,
  scriptReopenStatus: 'None',
};

const sceneBase = {
  chapterId: 'chap-101',
  scriptLinesCount: 0,
  pagesCount: 0,
  createdAt: '2026-11-10T00:00:00Z',
};

const sceneDetails: Record<string, any> = {
  'sc-1': {
    ...sceneBase,
    id: 'sc-1',
    sceneNumber: 1,
    heading: 'EXT. ĐỈNH NÚI TUYẾT - HOÀNG HÔN',
    summary: 'Nhân vật chính đối diện kẻ thù giữa cơn bão tuyết',
    scriptLines: [
      {
        id: 'line-1',
        lineOrder: 1,
        stageDirection: 'Gió tuyết rít từng cơn lạnh buốt',
        dialogueText: null,
      },
      {
        id: 'line-2',
        lineOrder: 2,
        stageDirection: null,
        dialogueText: 'Ngươi không thể thoát khỏi đây đâu!',
        speakerCharacterId: 'b-1',
      },
    ],
  },
  'sc-2': {
    ...sceneBase,
    id: 'sc-2',
    sceneNumber: 2,
    heading: 'INT. HANG ĐÁ - ĐÊM',
    scriptLines: [
      { id: 'line-3', lineOrder: 1, stageDirection: 'Lửa trại bập bùng', dialogueText: null },
    ],
  },
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

const scriptAssignment = (overrides: Record<string, unknown> = {}) => ({
  id: 'asg-script',
  seriesId: 'series-001',
  chapterId: 'chap-101',
  entityType: 'Chapter',
  targetEntityId: 'chap-101',
  pipelineStageId: 'stg-script',
  assigneeUserId: WRITER_ID,
  assignedRole: 'Writer',
  brief: '',
  priority: 'Normal',
  status: 'UnderReview',
  createdAt: '2026-11-10T00:00:00Z',
  ...overrides,
});

const submission = {
  id: 'sub-2',
  assignmentId: 'asg-script',
  chapterId: 'chap-101',
  submittedByUserId: WRITER_ID,
  attemptNumber: 2,
  status: 'Pending',
  submittedAt: '2026-11-10T08:00:00Z',
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
    vi.spyOn(chapterService, 'getChapterById').mockResolvedValue(mockChapter as any);
    vi.spyOn(scriptLineService, 'getScenesByChapter').mockResolvedValue(
      Object.values(sceneDetails) as any,
    );
    vi.spyOn(scriptLineService, 'getSceneById').mockImplementation(
      async (id: string) => sceneDetails[id],
    );
    vi.spyOn(chapterService, 'checkBibleGate').mockResolvedValue(mockBibleGate as any);
    vi.spyOn(assignmentService, 'getConsistencyFindings').mockResolvedValue([] as any);
    vi.spyOn(assignmentService, 'getAssignmentById').mockResolvedValue(scriptAssignment() as any);
    vi.spyOn(assignmentService, 'getChangeRequests').mockResolvedValue([] as any);
    vi.spyOn(assignmentService, 'getSubmissions').mockResolvedValue([submission] as any);
  });

  it('renders the manuscript with speaker names resolved from the Bible', async () => {
    renderView();

    expect(await screen.findByText(/Chương 5: Hồi Kết Ở Đỉnh Núi Tuyết/)).toBeInTheDocument();
    expect(screen.getAllByText('EXT. ĐỈNH NÚI TUYẾT - HOÀNG HÔN').length).toBeGreaterThan(0);
    expect(screen.getByText('Gió tuyết rít từng cơn lạnh buốt')).toBeInTheDocument();
    expect(screen.getByText('Ngươi không thể thoát khỏi đây đâu!')).toBeInTheDocument();
    expect(screen.getByText('Ren Kusanagi')).toBeInTheDocument();
  });

  it('is read-only without a submission', async () => {
    renderView();

    expect(await screen.findByText(/không gắn với bài nộp nào/)).toBeInTheDocument();
    expect(screen.queryByTitle(/Nhận xét dòng này/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Duyệt kịch bản/ })).not.toBeInTheDocument();
  });

  it('blocks reviewing your own assignment (reviewer must differ from submitter)', async () => {
    vi.spyOn(assignmentService, 'getAssignmentById').mockResolvedValue(
      scriptAssignment({ assigneeUserId: EDITOR_ID }) as any,
    );
    renderView('?assignmentId=asg-script');

    expect(await screen.findByText(/không thể tự duyệt/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Duyệt kịch bản/ })).not.toBeInTheDocument();
  });

  it('turns line notes into anchored change requests when returning to the writer', async () => {
    const requestChanges = vi
      .spyOn(assignmentService, 'requestChanges')
      .mockResolvedValue(scriptAssignment({ status: 'ReworkRequired' }) as any);
    renderView('?assignmentId=asg-script');

    await screen.findByText('Ngươi không thể thoát khỏi đây đâu!');
    const lineButtons = screen.getAllByTitle(/Nhận xét dòng này/);
    fireEvent.click(lineButtons[1]);
    fireEvent.change(screen.getByPlaceholderText(/Cần sửa gì ở đây/), {
      target: { value: 'Câu thoại quá dài cho một bóng thoại' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm nhận xét' }));

    const notes = screen.getByText('Nhận xét lần duyệt này').closest('section') as HTMLElement;
    expect(within(notes).getByText('Câu thoại quá dài cho một bóng thoại')).toBeInTheDocument();
    expect(within(notes).getByText('Cảnh 1 · dòng 2')).toBeInTheDocument();

    // Duyệt bị khoá khi còn nhận xét chưa gửi; trả bài cần nhận xét chung (BR-06)
    expect(screen.getByRole('button', { name: /Duyệt kịch bản/ })).toBeDisabled();
    const returnBtn = screen.getByRole('button', { name: /Trả bài · 1 yêu cầu sửa/ });
    expect(returnBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Đánh giá tổng quát/), {
      target: { value: 'Rút gọn thoại cảnh 1' },
    });
    fireEvent.click(returnBtn);

    await waitFor(() =>
      expect(requestChanges).toHaveBeenCalledWith('chap-101', 'asg-script', {
        comment: 'Rút gọn thoại cảnh 1',
        changes: [
          {
            description: 'Câu thoại quá dài cho một bóng thoại',
            sceneId: 'sc-1',
            scriptLineId: 'line-2',
            quotedText: 'Ngươi không thể thoát khỏi đây đâu!',
          },
        ],
        expectedSubmissionId: 'sub-2',
      }),
    );
  });

  it('keeps approve locked until resolved change requests are verified', async () => {
    vi.spyOn(assignmentService, 'getChangeRequests').mockResolvedValue([
      {
        id: 'cr-1',
        assignmentId: 'asg-script',
        chapterId: 'chap-101',
        responsibleUserId: WRITER_ID,
        createdByUserId: EDITOR_ID,
        description: 'Ren không biết tên sư phụ ở chương này',
        status: 'Resolved',
        resolutionNote: 'Đã đổi thành "lão già"',
        sceneId: 'sc-1',
        scriptLineId: 'line-2',
        quotedText: 'Sư phụ Kaito, ngươi không thể thoát!',
        createdAt: '2026-11-09T00:00:00Z',
      },
    ] as any);
    const verify = vi.spyOn(assignmentService, 'verifyChangeRequest').mockResolvedValue({
      id: 'cr-1',
      status: 'Verified',
    } as any);
    renderView('?assignmentId=asg-script');

    expect(await screen.findByText('Writer báo đã sửa')).toBeInTheDocument();
    // Dòng đã đổi so với lúc nhận xét: hiện cả hai bản để đối chiếu
    expect(screen.getByText('Sư phụ Kaito, ngươi không thể thoát!')).toBeInTheDocument();
    expect(screen.getByText(/Còn 1 yêu cầu sửa chưa đóng/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Duyệt kịch bản/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Đạt' }));
    await waitFor(() => expect(verify).toHaveBeenCalledWith('chap-101', 'cr-1'));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Duyệt kịch bản/ })).not.toBeDisabled(),
    );
  });
});
