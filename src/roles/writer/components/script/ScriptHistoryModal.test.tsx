import type { ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScriptHistoryModal } from './ScriptHistoryModal';
import { diffScriptLines } from './scriptDiff';
import { scriptLineService } from '@/services/scriptLine.service';
import { aiAgentsService } from '@/services/aiAgents.service';

vi.mock('@/services/scriptLine.service', () => ({
  scriptLineService: {
    getScriptRevision: vi.fn(),
    restoreScriptRevision: vi.fn(),
  },
}));
vi.mock('@/services/aiAgents.service', () => ({
  aiAgentsService: { getSceneRevisions: vi.fn() },
}));

const revisions = [
  {
    id: 'r1',
    kind: 'Script',
    versionNumber: 1,
    summary: 'Baseline',
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'r3',
    kind: 'Script',
    versionNumber: 3,
    summary: 'Sửa tay',
    createdAt: '2026-10-03T00:00:00Z',
  },
  {
    id: 'lay',
    kind: 'Layout',
    versionNumber: 2,
    summary: 'Layout',
    createdAt: '2026-10-02T00:00:00Z',
  },
] as any[];

const currentLines = [
  { id: 'l1', lineOrder: 1, dialogueText: 'Xin chào (mới)' },
  { id: 'l3', lineOrder: 2, dialogueText: 'Dòng mới thêm' },
] as any[];

const oldDetail = {
  id: 'r1',
  sceneId: 'sc',
  versionNumber: 1,
  summary: 'Baseline',
  isCurrent: false,
  createdAt: '2026-10-01T00:00:00Z',
  lines: [
    { lineId: 'l1', lineOrder: 1, dialogueText: 'Xin chào' },
    { lineId: 'l2', lineOrder: 2, dialogueText: 'Tạm biệt' },
  ],
};

const setup = (over: Partial<ComponentProps<typeof ScriptHistoryModal>> = {}) => {
  const props = {
    seriesId: 'se',
    chapterId: 'ch',
    sceneId: 'sc',
    chapterVersion: 7,
    currentLines,
    canRestore: true,
    onClose: vi.fn(),
    onRestored: vi.fn(),
    onConflict: vi.fn(),
    ...over,
  };
  render(<ScriptHistoryModal {...props} />);
  return props;
};

describe('diffScriptLines', () => {
  it('đối chiếu theo id dòng: giống / khác / bật lại / xoá mềm', () => {
    const rows = diffScriptLines(oldDetail.lines, [
      { id: 'l1', lineOrder: 1, dialogueText: 'Xin chào' },
      { id: 'l3', lineOrder: 2, dialogueText: 'Dòng mới thêm' },
    ] as any);
    expect(rows.map((r) => [r.key, r.status])).toEqual([
      ['l1', 'same'],
      ['l2', 'added'],
      ['l3', 'removed'],
    ]);
    const changed = diffScriptLines(oldDetail.lines, currentLines);
    expect(changed[0].status).toBe('changed');
  });
});

describe('ScriptHistoryModal (UC-13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aiAgentsService.getSceneRevisions).mockResolvedValue(revisions);
    vi.mocked(scriptLineService.getScriptRevision).mockResolvedValue(oldDetail as any);
  });

  it('đóng được bằng nút X, phím Esc và bấm nền; render ở cấp <body>', async () => {
    const props = setup();
    const dialog = await screen.findByTestId('script-history-modal');
    expect(dialog.parentElement).toBe(document.body);

    await userEvent.click(screen.getByLabelText('Đóng'));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    await userEvent.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledTimes(2);

    await userEvent.click(dialog);
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it('chỉ liệt kê revision Script, mới nhất trước', async () => {
    setup();
    expect(await screen.findByTestId('script-revision-r3')).toBeInTheDocument();
    expect(screen.queryByTestId('script-revision-lay')).not.toBeInTheDocument();
    const items = screen.getAllByTestId(/^script-revision-r/);
    expect(items[0]).toHaveAttribute('data-testid', 'script-revision-r3');
  });

  it('chọn một bản: tải nội dung và hiện so sánh', async () => {
    setup();
    await userEvent.click(await screen.findByTestId('script-revision-r1'));
    await screen.findByTestId('script-restore-btn');
    expect(scriptLineService.getScriptRevision).toHaveBeenCalledWith('ch', 'sc', 'r1');
    expect(screen.getAllByTestId('script-diff-row-changed')).toHaveLength(1);
    expect(screen.getAllByTestId('script-diff-row-added')).toHaveLength(1);
    expect(screen.getAllByTestId('script-diff-row-removed')).toHaveLength(1);
  });

  it('bản hiện tại (isCurrent) ẩn nút Khôi phục', async () => {
    vi.mocked(scriptLineService.getScriptRevision).mockResolvedValue({
      ...oldDetail,
      id: 'r3',
      isCurrent: true,
    } as any);
    setup();
    await userEvent.click(await screen.findByTestId('script-revision-r3'));
    expect(await screen.findByTestId('script-revision-current-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('script-restore-btn')).not.toBeInTheDocument();
  });

  it('không có quyền khôi phục thì không hiện nút', async () => {
    setup({ canRestore: false });
    await userEvent.click(await screen.findByTestId('script-revision-r1'));
    await screen.findByTestId('script-diff-row-changed');
    expect(screen.queryByTestId('script-restore-btn')).not.toBeInTheDocument();
  });

  it('khôi phục cần xác nhận và gửi expectedChapterVersion hiện tại', async () => {
    vi.mocked(scriptLineService.restoreScriptRevision).mockResolvedValue({
      chapterVersion: 8,
      revisionId: 'r4',
      versionNumber: 4,
      restoredFromRevisionId: 'r1',
      restoredFromVersionNumber: 1,
    });
    const props = setup();
    await userEvent.click(await screen.findByTestId('script-revision-r1'));
    await userEvent.click(await screen.findByTestId('script-restore-btn'));
    expect(scriptLineService.restoreScriptRevision).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('script-restore-confirm-btn'));
    await waitFor(() =>
      expect(scriptLineService.restoreScriptRevision).toHaveBeenCalledWith('ch', 'sc', 'r1', {
        expectedChapterVersion: 7,
      }),
    );
    await waitFor(() =>
      expect(props.onRestored).toHaveBeenCalledWith(expect.objectContaining({ chapterVersion: 8 })),
    );
  });

  it('409: báo lỗi, tải lại, KHÔNG tự gửi lại', async () => {
    const err: any = new Error('Lệch version');
    err.code = 'CONFLICT';
    err.status = 409;
    vi.mocked(scriptLineService.restoreScriptRevision).mockRejectedValue(err);
    const props = setup();
    await userEvent.click(await screen.findByTestId('script-revision-r1'));
    await userEvent.click(await screen.findByTestId('script-restore-btn'));
    await userEvent.click(screen.getByTestId('script-restore-confirm-btn'));
    expect(await screen.findByTestId('script-restore-error')).toHaveTextContent('Lệch version');
    expect(props.onConflict).toHaveBeenCalled();
    expect(scriptLineService.restoreScriptRevision).toHaveBeenCalledTimes(1);
    expect(aiAgentsService.getSceneRevisions).toHaveBeenCalledTimes(2);
  });

  it('chưa có revision: hiện trạng thái rỗng', async () => {
    vi.mocked(aiAgentsService.getSceneRevisions).mockResolvedValue([]);
    setup();
    expect(await screen.findByTestId('script-history-empty')).toBeInTheDocument();
  });
});
