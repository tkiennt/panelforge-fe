import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ScriptReviewView } from './ScriptReviewView';
import { chapterService } from '@/services/chapter.service';
import { scriptLineService } from '@/services/scriptLine.service';
import { assignmentService } from '@/services/assignment.service';
import { seriesService } from '@/services/series.service';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockChapter = {
  id: 'chap-101',
  seriesId: 'series-001',
  chapterNumber: 5,
  title: 'Hồi Kết Ở Đỉnh Núi Tuyết',
  isScriptFrozen: false,
  scriptContentHash: null,
  scriptReopenStatus: 'None',
  scenesCount: 2,
  pagesCount: 15,
};

const mockScenes = [
  {
    id: 'sc-1',
    chapterId: 'chap-101',
    sceneNumber: 1,
    heading: 'EXT. ĐỈNH NÚI TUYẾT - HOÀNG HÔN',
    summary: 'Nhân vật chính đối diện kẻ thù giữa cơn bão tuyết',
    scriptLinesCount: 2,
    pagesCount: 3,
    defaultNarrationMode: 'Present' as const,
    createdAt: '2026-11-10T00:00:00Z',
  },
  {
    id: 'sc-2',
    chapterId: 'chap-101',
    sceneNumber: 2,
    heading: 'INT. HANG ĐÁ - ĐÊM',
    summary: 'Nơi trú ẩn tạm thời',
    scriptLinesCount: 1,
    pagesCount: 2,
    createdAt: '2026-11-10T00:00:00Z',
  },
];

const mockSceneDetail1 = {
  ...mockScenes[0],
  scriptLines: [
    {
      id: 'line-1',
      lineOrder: 1,
      stageDirection: 'Gió tuyết rít từng cơn lạnh buốt',
      dialogueText: null,
      speakerCharacterId: null,
    },
    {
      id: 'line-2',
      lineOrder: 2,
      stageDirection: null,
      dialogueText: 'Ngươi không thể thoát khỏi đây đâu!',
      speakerCharacterId: 'char-hero',
    },
  ],
};

const mockBibleGate = {
  chapterId: 'chap-101',
  chapterNumber: 5,
  isPassed: true,
  lockedCount: 2,
  pendingCount: 0,
  items: [
    {
      bibleEntryId: 'b-1',
      code: 'HERO_REN',
      name: 'Ren Kusanagi',
      category: 'Character',
      isReferencedAsSpeaker: true,
      isReferencedInScriptLink: true,
      hasEffectiveRevision: true,
      isLocked: true,
    },
  ],
};

const renderView = (props: Partial<React.ComponentProps<typeof ScriptReviewView>> = {}) =>
  render(
    <MemoryRouter initialEntries={['/workspaces/ws-1/series/series-001/chapters/chap-101/script/review']}>
      <Routes>
        <Route
          path='/workspaces/:workspaceId/series/:seriesId/chapters/:chapterId/script/review'
          element={<ScriptReviewView workspaceRole='Editor' {...props} />}
        />
      </Routes>
    </MemoryRouter>
  );

describe('ScriptReviewView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(chapterService, 'getChapterById').mockResolvedValue(mockChapter as any);
    vi.spyOn(scriptLineService, 'getScenesByChapter').mockResolvedValue(mockScenes as any);
    vi.spyOn(scriptLineService, 'getSceneById').mockResolvedValue(mockSceneDetail1 as any);
    vi.spyOn(chapterService, 'checkBibleGate').mockResolvedValue(mockBibleGate as any);
    vi.spyOn(seriesService, 'getSeriesById').mockResolvedValue({ id: 'series-001', title: 'Kiếm Vũ' } as any);
    vi.spyOn(assignmentService, 'getConsistencyFindings').mockResolvedValue([] as any);
    vi.spyOn(assignmentService, 'runConsistencyCheck').mockResolvedValue({ findings: [] } as any);
  });

  it('renders chapter metadata and screenplay scenes properly', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Chương 5: Hồi Kết Ở Đỉnh Núi Tuyết/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/EXT. ĐỈNH NÚI TUYẾT - HOÀNG HÔN/i)).toBeInTheDocument();
    expect(screen.getByText(/Gió tuyết rít từng cơn lạnh buốt/i)).toBeInTheDocument();
    expect(screen.getByText(/Ngươi không thể thoát khỏi đây đâu!/i)).toBeInTheDocument();
  });

  it('displays unfrozen badge and freeze button for Producer role', async () => {
    renderView({ workspaceRole: 'Producer' });

    await waitFor(() => {
      expect(screen.getByText(/Bản thảo đang mở \(Chưa đóng băng\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Chốt Canon & Đóng Băng/i)).toBeInTheDocument();
    });
  });

  it('displays frozen badge and SHA-256 hash when script is already frozen', async () => {
    vi.spyOn(chapterService, 'getChapterById').mockResolvedValue({
      ...mockChapter,
      isScriptFrozen: true,
      scriptContentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    } as any);

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Đã chốt Canon & Đóng băng/i)).toBeInTheDocument();
      expect(screen.getByText(/e3b0c442.../i)).toBeInTheDocument();
    });
  });

  it('opens change request modal when clicking on line action button', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Ngươi không thể thoát khỏi đây đâu!/i)).toBeInTheDocument();
    });

    const commentLineBtn = screen.getByTitle(/Đặt yêu cầu sửa hoặc nhận xét cho dòng kịch bản này/i);
    fireEvent.click(commentLineBtn);

    expect(screen.getByText(/Gửi Yêu Cầu Chỉnh Sửa Kịch Bản/i)).toBeInTheDocument();
    expect(screen.getByText(/"Ngươi không thể thoát khỏi đây đâu!"/i)).toBeInTheDocument();
  });

  it('switches between inspector tabs (Bible Gate, Logic Canon, Change Requests)', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByText(/Kiểm tra Thực thể Bible/i)).toBeInTheDocument();
      expect(screen.getByText(/Ren Kusanagi/i)).toBeInTheDocument();
    });

    // Switch to Logic Canon tab
    fireEvent.click(screen.getByRole('button', { name: /Logic Canon/i }));
    expect(screen.getByText(/Kết Quả Quét Tính Nhất Quán/i)).toBeInTheDocument();

    // Switch to Change Requests tab
    fireEvent.click(screen.getByRole('button', { name: /Yêu cầu sửa/i }));
    expect(screen.getByText(/Yêu Cầu Chỉnh Sửa/i)).toBeInTheDocument();
  });
});
