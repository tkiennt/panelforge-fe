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
});
