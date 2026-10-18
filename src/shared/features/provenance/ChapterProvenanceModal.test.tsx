import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { chapterService } from '@/services/chapter.service';
import { aiAgentsService } from '@/services/aiAgents.service';
import { ChapterProvenanceModal } from './ChapterProvenanceModal';

vi.mock('@/services/chapter.service', () => ({
  chapterService: { getSnapshots: vi.fn(), getSnapshot: vi.fn() },
}));
vi.mock('@/services/aiAgents.service', () => ({
  aiAgentsService: {
    getProvenanceReport: vi.fn(),
    getScenesByChapter: vi.fn(),
    getRunHistory: vi.fn(),
  },
}));

const snapshot = (n: number, isLatest: boolean) => ({
  id: `snap-${n}`,
  chapterId: 'c1',
  snapshotNumber: n,
  chapterVersion: n * 3,
  createdByUserId: 'u1',
  createdByName: 'Alex Producer',
  manifestHash: 'a'.repeat(64),
  isLatest,
  createdAt: '2026-10-17T03:00:00Z',
});

const open = (viewerRole: string) =>
  render(
    <ChapterProvenanceModal
      seriesId='s1'
      chapterId='c1'
      chapterNumber={1}
      chapterTitle='Đêm trăng máu'
      viewerRole={viewerRole}
      onClose={() => {}}
    />,
  );

describe('ChapterProvenanceModal (CF4)', () => {
  beforeEach(() => {
    vi.mocked(chapterService.getSnapshots).mockResolvedValue([
      snapshot(2, true),
      snapshot(1, false),
    ]);
    vi.mocked(chapterService.getSnapshot).mockImplementation(async (_c, id) => ({
      snapshot: snapshot(id === 'snap-2' ? 2 : 1, id === 'snap-2'),
      manifest: {
        chapterId: 'c1',
        chapterVersion: 6,
        pages: [
          {
            pageId: 'p1',
            pageNumber: 1,
            canvasStreamVersion: -1,
            artworkReferenceId: null,
            artworkSha256: null,
          },
        ],
        scriptRevisionIds: ['r1', 'r2'],
        bibleRevisionIds: ['b1'],
      },
      hashVerified: id === 'snap-2',
    }));
    vi.mocked(aiAgentsService.getScenesByChapter).mockResolvedValue([]);
    vi.mocked(aiAgentsService.getRunHistory).mockResolvedValue({
      totalCount: 0,
      page: 1,
      pageSize: 50,
      items: [],
    });
  });

  it('liệt kê bản duyệt mới nhất trước, đánh dấu bản hiện hành và kết quả kiểm hash', async () => {
    open('Producer');

    expect(await screen.findByText('Bản duyệt #2')).toBeInTheDocument();
    expect(screen.getByText('Hiện hành')).toBeInTheDocument();
    expect(await screen.findByText(/Manifest còn nguyên vẹn/)).toBeInTheDocument();
    expect(screen.getByText('Chưa có ảnh cả trang')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Bản duyệt #1'));
    expect(await screen.findByText(/hash manifest không khớp/)).toBeInTheDocument();
  });

  it('Publisher không thấy tab Provenance (chỉ Producer/Editor, UC-19)', async () => {
    open('Publisher');
    await screen.findByText('Bản duyệt #2');

    expect(screen.queryByRole('tab', { name: /Provenance/ })).not.toBeInTheDocument();
    expect(aiAgentsService.getProvenanceReport).not.toHaveBeenCalled();
  });

  it('Editor mở tab Provenance: thấy thống kê, truy vết và dòng thời gian', async () => {
    vi.mocked(aiAgentsService.getProvenanceReport).mockResolvedValue({
      chapterId: 'c1',
      sceneId: null,
      generatedAtUtc: '2026-10-17T04:00:00Z',
      stats: {
        totalRuns: 0,
        totalSteps: 0,
        totalSuggestions: 0,
        acceptedSuggestions: 0,
        rejectedSuggestions: 0,
        pendingSuggestions: 0,
        modifiedByHumanDecisions: 0,
        totalRevisions: 1,
        aiOriginatedRevisions: 0,
        manualRevisions: 1,
        totalSnapshots: 1,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
      },
      nodes: [
        {
          nodeType: 'Revision',
          id: 'v1',
          timestamp: '2026-10-17T01:00:00Z',
          summary: 'v1 [Script] Sửa tay',
          details: { origin: 'Human', createdBy: 'writer' },
        },
      ],
      edges: [],
      timeline: [
        {
          timestamp: '2026-10-17T01:00:00Z',
          eventType: 'RevisionCreated',
          summary: 'Revision v1 (người)',
          entityId: 'v1',
        },
      ],
    });
    open('Editor');

    await userEvent.click(await screen.findByRole('tab', { name: /Provenance/ }));

    await waitFor(() =>
      expect(aiAgentsService.getProvenanceReport).toHaveBeenCalledWith('s1', 'c1', undefined),
    );
    expect(await screen.findByText('Do người viết/sửa')).toBeInTheDocument();
    expect(screen.getByText('Revision v1 (người)')).toBeInTheDocument();
  });

  it('báo lỗi BE (vd 403) thay vì để trống', async () => {
    vi.mocked(aiAgentsService.getProvenanceReport).mockRejectedValue(
      new Error('Chỉ Producer hoặc Editor của Workspace xem được Provenance Report.'),
    );
    open('Producer');

    await userEvent.click(await screen.findByRole('tab', { name: /Provenance/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Chỉ Producer hoặc Editor');
  });

  it('truy vết có cả Artist (artwork), Letterer (chèn chữ) và Editor (nộp/duyệt), lọc được theo vai trò', async () => {
    const rev = (id: string, kind: string, role: string, summary: string, at: string) => ({
      nodeType: 'Revision',
      id,
      timestamp: at,
      summary,
      details: { kind, role, versionNumber: 1, origin: 'Human', createdBy: `${role} A` },
    });
    vi.mocked(aiAgentsService.getProvenanceReport).mockResolvedValue({
      chapterId: 'c1',
      sceneId: null,
      generatedAtUtc: '2026-10-17T04:00:00Z',
      stats: {
        totalRuns: 0,
        totalSteps: 0,
        totalSuggestions: 0,
        acceptedSuggestions: 0,
        rejectedSuggestions: 0,
        pendingSuggestions: 0,
        modifiedByHumanDecisions: 0,
        totalRevisions: 1,
        aiOriginatedRevisions: 0,
        manualRevisions: 1,
        totalSnapshots: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
      },
      nodes: [
        rev('s', 'Script', 'Writer', 'v1 [Script] Kịch bản', '2026-10-17T01:00:00Z'),
        rev('a', 'Artwork', 'Artist', 'v1 [Artwork] Artwork Ink — Trang 1', '2026-10-17T02:00:00Z'),
        rev(
          'l',
          'Lettering',
          'Letterer',
          'v1 [Lettering] Trang 1 · đặt bóng',
          '2026-10-17T03:00:00Z',
        ),
        rev('r', 'Review', 'Editor', 'v1 [Review] Nộp lần 1: trả về', '2026-10-17T04:00:00Z'),
      ],
      edges: [],
      timeline: [],
    } as any);
    open('Editor');
    await userEvent.click(await screen.findByRole('tab', { name: /Provenance/ }));

    const select = await screen.findByLabelText('Chọn revision để truy vết');
    expect(select.querySelectorAll('option')).toHaveLength(4);
    // Không còn thông báo "mới chỉ có Writer" khi đã có vai trò khác
    expect(screen.queryByText(/mới có phiên bản kịch bản/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Chèn chữ (Letterer)' }));
    expect(select.querySelectorAll('option')).toHaveLength(1);
    expect(select).toHaveTextContent('[Letterer]');
    expect(screen.getByText('Vai trò:').nextSibling).toHaveTextContent('Letterer');

    await userEvent.click(screen.getByRole('button', { name: 'Nộp & duyệt (Editor)' }));
    expect(select).toHaveTextContent('Nộp lần 1: trả về');
  });

  it('hiển thị chi tiết production và liên kết bản liền trước (previousVersion), timeline sự kiện mới', async () => {
    vi.mocked(aiAgentsService.getProvenanceReport).mockResolvedValue({
      chapterId: 'c1',
      sceneId: null,
      generatedAtUtc: '2026-10-17T05:00:00Z',
      stats: {
        totalRuns: 0,
        totalSteps: 0,
        totalSuggestions: 0,
        acceptedSuggestions: 0,
        rejectedSuggestions: 0,
        pendingSuggestions: 0,
        modifiedByHumanDecisions: 0,
        totalRevisions: 2,
        aiOriginatedRevisions: 0,
        manualRevisions: 2,
        totalSnapshots: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
      },
      nodes: [
        {
          nodeType: 'Revision',
          id: 'art-v1',
          timestamp: '2026-10-17T02:00:00Z',
          summary: 'v1 [Artwork] Artwork Ink — Trang 1: page1_ink_v1.png',
          details: {
            kind: 'Artwork',
            role: 'Artist',
            versionNumber: 1,
            origin: 'Human',
            createdBy: 'Artist Minh',
            production: {
              stage: 'Ink',
              pageNumber: 1,
              fileName: 'page1_ink_v1.png',
            },
          },
        },
        {
          nodeType: 'Revision',
          id: 'art-v2',
          timestamp: '2026-10-17T03:00:00Z',
          summary: 'v2 [Artwork] Artwork Ink — Trang 1: page1_ink_v2.png',
          details: {
            kind: 'Artwork',
            role: 'Artist',
            versionNumber: 2,
            origin: 'Human',
            createdBy: 'Artist Minh',
            production: {
              stage: 'Ink',
              pageNumber: 1,
              fileName: 'page1_ink_v2.png',
            },
          },
        },
      ],
      edges: [
        {
          fromId: 'art-v1',
          toId: 'art-v2',
          relationship: 'previousVersion',
        },
      ],
      timeline: [
        {
          timestamp: '2026-10-17T02:00:00Z',
          eventType: 'ArtworkUploaded',
          summary: 'Họa sĩ tải artwork v1',
          entityId: 'art-v1',
        },
        {
          timestamp: '2026-10-17T03:00:00Z',
          eventType: 'LetteringChanged',
          summary: 'Letterer sửa chữ',
          entityId: 'let-1',
        },
        {
          timestamp: '2026-10-17T04:00:00Z',
          eventType: 'WorkSubmitted',
          summary: 'Nộp công đoạn Ink',
          entityId: 'sub-1',
        },
        {
          timestamp: '2026-10-17T04:30:00Z',
          eventType: 'ReviewDecided',
          summary: 'Biên tập viên duyệt',
          entityId: 'rev-1',
        },
      ],
    } as any);

    open('Producer');
    await userEvent.click(await screen.findByRole('tab', { name: /Provenance/ }));

    // art-v2 là mới nhất nên được chọn mặc định
    expect(await screen.findByText('Chi tiết thực hiện')).toBeInTheDocument();
    expect(screen.getByText('page1_ink_v2.png')).toBeInTheDocument();
    expect(screen.getByText('Ink')).toBeInTheDocument();
    expect(screen.getByText('Trang 1')).toBeInTheDocument();

    // Có liên kết bản liền trước art-v1
    const prevBtn = screen.getByRole('button', {
      name: 'v1 [Artwork] Artwork Ink — Trang 1: page1_ink_v1.png',
    });
    expect(prevBtn).toBeInTheDocument();

    // Bấm bản liền trước thì chuyển truy vết sang art-v1
    await userEvent.click(prevBtn);
    expect(screen.getByText('page1_ink_v1.png')).toBeInTheDocument();

    // Kiểm tra nhãn tiếng Việt cho các loại sự kiện timeline mới
    expect(screen.getByText('Họa sĩ tải artwork')).toBeInTheDocument();
    expect(screen.getByText('Letterer chỉnh sửa chữ')).toBeInTheDocument();
    expect(screen.getByText('Nộp công đoạn')).toBeInTheDocument();
    expect(screen.getByText('Biên tập viên thẩm định')).toBeInTheDocument();
  });
});
