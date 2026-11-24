import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProducerChapterManagementView } from './ProducerChapterManagementView';
import { chapterService } from '@/services/chapter.service';
import { chapterCastService } from '@/services/chapterCast.service';
import { seriesService } from '@/services/series.service';
import { pipelineService } from '@/services/pipeline.service';
import { pageService } from '@/services/page.service';

vi.mock('@/services/chapter.service', () => ({
  chapterService: {
    getChaptersBySeries: vi.fn(),
    getChapterById: vi.fn(),
    createChapter: vi.fn(),
    updateChapter: vi.fn(),
    deleteChapter: vi.fn(),
    getChapterLockGate: vi.fn(),
    getScriptVersion: vi.fn(),
    getScriptWorkingCopy: vi.fn(),
    getScriptComments: vi.fn(),
    resolveScriptComment: vi.fn(),
    unfreezeScript: vi.fn(),
    approveChapter: vi.fn(),
    uploadChapterCover: vi.fn(),
    deleteChapterCover: vi.fn(),
  },
}));

vi.mock('@/services/chapterCast.service', () => ({
  chapterCastService: {
    getChapterCast: vi.fn(),
  },
}));

vi.mock('@/services/series.service', () => ({
  seriesService: {
    getSeriesById: vi.fn(),
  },
}));

vi.mock('@/services/pipeline.service', () => ({
  pipelineService: {
    getPipelineStages: vi.fn(),
  },
}));

vi.mock('@/services/page.service', () => ({
  pageService: {
    getPagesByChapter: vi.fn(),
  },
}));

vi.mock('@/shared/modals/StartProductionModal', () => ({
  StartProductionModal: ({ isOpen, onClose, onSuccess }: any) =>
    isOpen ? (
      <div data-testid='start-production-modal'>
        <span>StartProductionModal Mock</span>
        <button onClick={onSuccess}>Xác nhận bắt đầu</button>
        <button onClick={onClose}>Đóng</button>
      </div>
    ) : null,
}));

vi.mock('../modals/ChapterAssignmentsModal', () => ({
  ChapterAssignmentsModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid='assignments-modal'>
        <button onClick={onClose}>Đóng</button>
      </div>
    ) : null,
}));

vi.mock('../modals/ChapterEditionsModal', () => ({
  ChapterEditionsModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid='editions-modal'>
        <button onClick={onClose}>Đóng</button>
      </div>
    ) : null,
}));

vi.mock('@/shared/features/provenance/ChapterProvenanceModal', () => ({
  ChapterProvenanceModal: ({ onClose }: any) => (
    <div data-testid='provenance-modal'>
      <button onClick={onClose}>Đóng</button>
    </div>
  ),
}));

vi.mock('../modals/PreviewLinksModal', () => ({
  PreviewLinksModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid='preview-links-modal'>
        <button onClick={onClose}>Đóng</button>
      </div>
    ) : null,
}));

describe('ProducerChapterManagementView', () => {
  const mockSeries = {
    id: 'series-1',
    title: 'Neon Odyssey',
    synopsis: 'A cyberpunk manga saga',
  };

  const mockChapters = [
    {
      id: 'chap-1',
      seriesId: 'series-1',
      chapterNumber: 1,
      title: 'Khởi đầu mới',
      status: 'PreProduction',
      scriptStatus: 'InReview',
      isScriptFrozen: false,
      lastSubmittedVersionId: 'ver-1',
      targetReleaseDate: '2026-12-01',
      pagesCount: 20,
      versionVector: 1,
    },
    {
      id: 'chap-2',
      seriesId: 'series-1',
      chapterNumber: 2,
      title: 'Đêm định mệnh',
      status: 'InProduction',
      scriptStatus: 'Frozen',
      isScriptFrozen: true,
      lastSubmittedVersionId: 'ver-2',
      targetReleaseDate: '2026-12-15',
      pagesCount: 24,
      versionVector: 2,
    },
  ];

  const mockScriptVersion = {
    version: {
      id: 'ver-1',
      versionNumber: 1,
      message: 'Nộp duyệt Gate 1',
      authorUserId: 'writer-1',
      authorName: 'Oda Eiichiro',
      createdAt: '2026-11-10T10:00:00Z',
      lineCount: 4,
      contentHash: 'abc123456789def',
      submittedAt: '2026-11-10T10:00:00Z',
    },
    rows: [
      { key: 'page:1', type: 'page', page: 1, panel: 0, text: '' },
      { key: 'panel:1', type: 'panel', page: 1, panel: 1, text: 'Góc nhìn từ trên cao' },
      {
        key: 'line:1',
        type: 'Dialogue',
        page: 1,
        panel: 1,
        label: 'REN',
        text: 'Thành phố này không bao giờ ngủ.',
      },
      {
        key: 'line:2',
        type: 'Sfx',
        page: 1,
        panel: 1,
        text: 'RẦM!',
      },
    ],
  };

  const mockCast = {
    chapterId: 'chap-1',
    chapterNumber: 1,
    chapterTitle: 'Khởi đầu mới',
    isScriptFrozen: false,
    gate: {
      canStart: true,
      blockers: [],
    },
    entities: [
      {
        bibleEntryId: 'char-ren',
        code: 'CHR-01',
        name: 'Ren Takahashi',
        category: 'Character',
        isStub: false,
        isCrowd: false,
        isCanonLocked: true,
        boundRevision: {
          revisionId: 'rev-1',
          versionNumber: 2,
          variantLabel: 'Trang phục thường',
          status: 'CanonLocked',
          isCanonLocked: true,
          referenceImageUrl: 'https://example.com/ren.png',
          summary: 'Nhân vật chính, 17 tuổi',
        },
        mentions: [{ lineId: 'line:1' }],
      },
    ],
  };

  const mockLockGate = {
    chapterId: 'chap-1',
    status: 'PreProduction',
    canApprove: false,
    items: [
      { code: 'SCRIPT_NOT_FROZEN', blocking: true, count: 1, message: 'Kịch bản chưa đóng băng' },
      {
        code: 'ASSIGNMENTS_NOT_APPROVED',
        blocking: true,
        count: 5,
        message: '5 công việc chưa duyệt',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (seriesService.getSeriesById as any).mockResolvedValue(mockSeries);
    (chapterService.getChaptersBySeries as any).mockResolvedValue({
      items: mockChapters,
      totalCount: 2,
    });
    (chapterService.getChapterById as any).mockImplementation((id: string) => {
      const found = mockChapters.find((c) => c.id === id) || mockChapters[0];
      return Promise.resolve(found);
    });
    (chapterService.getScriptVersion as any).mockResolvedValue(mockScriptVersion);
    (chapterCastService.getChapterCast as any).mockResolvedValue(mockCast);
    (chapterService.getChapterLockGate as any).mockResolvedValue(mockLockGate);
    (chapterService.getScriptComments as any).mockResolvedValue([]);
    (pageService.getPagesByChapter as any).mockResolvedValue([]);
    (pipelineService.getPipelineStages as any).mockResolvedValue([
      { id: 'stg-1', name: 'Storyboard' },
      { id: 'stg-2', name: 'Line Art' },
    ]);
  });

  const renderComponent = (chapterId = 'chap-1') => {
    return render(
      <MemoryRouter
        initialEntries={[`/workspaces/ws-1/series/series-1/chapters?chapterId=${chapterId}`]}
      >
        <Routes>
          <Route
            path='/workspaces/:workspaceId/series/:seriesId/chapters'
            element={<ProducerChapterManagementView workspaceRole='PRODUCER' />}
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('tải và hiển thị thanh tiêu đề gọn gàng, thông tin chương và nút chốt duyệt', async () => {
    renderComponent('chap-1');

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /chọn chương/i })).toBeInTheDocument();
      expect(screen.getByTestId('chapter-status-badge')).toHaveTextContent('Tiền kỳ');
      expect(screen.getByTestId('script-frozen-badge')).toHaveTextContent('Chờ duyệt (InReview)');
    });

    // Primary action button is concise: "Chốt duyệt & Bắt đầu"
    expect(screen.getByText('Chốt duyệt & Bắt đầu')).toBeInTheDocument();
  });

  it('đọc kịch bản: hiển thị cấu trúc Trang, Panel, Thoại nhân vật và Hiệu ứng SFX', async () => {
    renderComponent('chap-1');

    await waitFor(() => {
      expect(screen.getByText('TRANG 1')).toBeInTheDocument();
      expect(screen.getByText('PANEL 1 Góc nhìn từ trên cao')).toBeInTheDocument();
      expect(screen.getByText('[REN]:')).toBeInTheDocument();
      expect(screen.getByText('Thành phố này không bao giờ ngủ.')).toBeInTheDocument();
      expect(screen.getByText('⚡ SFX: RẦM!')).toBeInTheDocument();
    });
  });

  it('xem Art Series Bible bên cột đối chiếu: hiển thị nhân vật và trạng thái Locked', async () => {
    renderComponent('chap-1');

    await waitFor(() => {
      expect(screen.getByText('Ren Takahashi')).toBeInTheDocument();
      expect(screen.getByText('CHR-01')).toBeInTheDocument();
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });
  });

  it('chuyển tab Chốt Cổng: hiển thị checklist Gate 1 & Gate 3 ngắn gọn', async () => {
    renderComponent('chap-1');

    await waitFor(() => {
      expect(screen.getByText(/Chốt Cổng/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Chốt Cổng/i));

    await waitFor(() => {
      expect(screen.getByText('Gate 1: Bắt đầu sản xuất')).toBeInTheDocument();
      expect(screen.getByText('Gate 3: Khóa duyệt chương')).toBeInTheDocument();
      expect(screen.getByText('Kịch bản chưa đóng băng')).toBeInTheDocument();
    });
  });

  it('mở modal Start Production khi Producer bấm nút Chốt duyệt & Bắt đầu', async () => {
    renderComponent('chap-1');

    await waitFor(() => {
      expect(screen.getByText('Chốt duyệt & Bắt đầu')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Chốt duyệt & Bắt đầu'));

    await waitFor(() => {
      expect(screen.getByTestId('start-production-modal')).toBeInTheDocument();
    });
  });

  it('khi chọn chương đã Frozen (chap-2), hiển thị nút Bảng sản xuất và Mở lại kịch bản', async () => {
    renderComponent('chap-2');

    await waitFor(() => {
      expect(screen.getByTestId('script-frozen-badge')).toHaveTextContent('Đóng băng (Frozen)');
      expect(screen.getByText('Bảng sản xuất')).toBeInTheDocument();
      expect(screen.getByText('Mở lại')).toBeInTheDocument();
    });
  });
});
