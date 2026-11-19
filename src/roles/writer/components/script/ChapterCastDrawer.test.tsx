import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ChapterCastDrawer } from './ChapterCastDrawer';
import { ChapterCastDto, chapterCastService } from '@/services/chapterCast.service';
import { aiAgentsService, AiApiError } from '@/services/aiAgents.service';

describe('ChapterCastDrawer Component', () => {
  const mockCast: ChapterCastDto = {
    chapterId: 'chap-1',
    chapterNumber: 1,
    chapterTitle: 'Khởi đầu',
    submitGate: {
      canSubmit: false,
      blockers: [
        {
          bibleEntryId: 'stub-1',
          entryName: 'Hắc Y Nhân',
          reason: 'Chưa định nghĩa',
        },
      ],
    },
    gate: {
      canStart: true,
      blockers: [],
    },
    entities: [
      {
        bibleEntryId: 'stub-1',
        name: 'Hắc Y Nhân',
        code: 'HAC_Y',
        category: 0,
        isStub: true,
        isCrowd: false,
        source: 'Speaker',
        bibleStatus: 'Draft',
        chosenByWriter: false,
        panelRevisions: [],
        availableRevisions: [],
        mentions: [],
      },
      {
        bibleEntryId: 'char-1',
        name: 'Kaito',
        code: 'KAITO',
        category: 0,
        isStub: false,
        isCrowd: false,
        source: 'Speaker',
        bibleStatus: 'CanonLocked',
        boundRevision: {
          revisionId: 'rev-1',
          versionNumber: 1,
          variantLabel: 'Mặc định',
          status: 'CanonLocked',
          isCanonLocked: true,
        },
        chosenByWriter: true,
        panelRevisions: [],
        availableRevisions: [],
        mentions: [],
      },
    ],
  };

  it('renders drawer with data-testid="chapter-cast-drawer" and blockers alert', () => {
    render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterNumber={1}
        chapterTitle='Khởi đầu'
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );

    expect(screen.getByTestId('chapter-cast-drawer')).toBeInTheDocument();
    expect(screen.getAllByText(/Hắc Y Nhân/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Kaito')).toBeInTheDocument();
  });

  it('expands accordion row on click and ensures one open at a time', () => {
    render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );

    const toggleStub = screen.getByTestId('accordion-toggle-stub-1');
    const toggleKaito = screen.getByTestId('accordion-toggle-char-1');

    expect(toggleStub).toHaveAttribute('aria-expanded', 'false');
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleStub);
    expect(toggleStub).toHaveAttribute('aria-expanded', 'true');
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleKaito);
    expect(toggleStub).toHaveAttribute('aria-expanded', 'false');
    expect(toggleKaito).toHaveAttribute('aria-expanded', 'true');
  });

  it('verifies that entry name in definition is read-only', () => {
    render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );

    // Expand non-stub row (Kaito)
    const toggleKaito = screen.getByTestId('accordion-toggle-char-1');
    fireEvent.click(toggleKaito);

    // Click edit
    const editBtn = screen.getByTestId('edit-entry-btn');
    fireEvent.click(editBtn);

    // Name must be read-only
    const readonlyName = screen.getByTestId('define-entity-name-readonly');
    expect(readonlyName).toHaveTextContent('Kaito');
    expect(readonlyName.tagName.toLowerCase()).not.toBe('input');
  });

  it('Bible Stub Harvester: Writer bấm "Soạn nháp từ kịch bản", xem trích dẫn, bấm "Dùng làm nháp" đổ description & subtitle vào form để sửa rồi lưu qua defineBibleEntry', async () => {
    const runStubSpy = vi.spyOn(aiAgentsService, 'runBibleStubDraft').mockResolvedValueOnce({
      id: 'sug-stub-1',
      runId: 'run-stub-1',
      stepId: 'step-stub-1',
      sceneId: 'sc-1',
      kind: 'BibleStub',
      status: 'Pending',
      summary: 'Hồ sơ nháp cho Hắc Y Nhân',
      payload: {
        entryId: 'stub-1',
        name: 'Hắc Y Nhân',
        draft: {
          description: 'Sát thủ mặc áo choàng đen xuất hiện trên mái ngói.',
          subtitle: 'Sát thủ bí ẩn',
          citations: [
            {
              claim: 'Mặc áo choàng đen trên mái ngói',
              lineId: 'line-1',
              quote: 'Hắc Y Nhân đứng lặng trên mái ngói, tà áo choàng đen bay trong mưa.',
            },
          ],
        },
        reason: 'Tổng hợp từ dòng kịch bản 1',
      },
      payloadHash: 'hash-stub-1',
      baseChapterVersion: 2,
      bibleRevisionIds: [],
      hasBlockingFindings: false,
      createdAt: '2026-11-18T10:00:00Z',
      decisions: [],
      canDecide: true,
      canAccept: true,
    });
    const reviewSpy = vi.spyOn(aiAgentsService, 'review').mockResolvedValueOnce({
      suggestionId: 'sug-stub-1',
      status: 'Accepted',
      decisionId: 'dec-stub-1',
      resultRevisionId: null,
      chapterVersion: 2,
    });
    const defineSpy = vi
      .spyOn(chapterCastService, 'defineBibleEntry')
      .mockResolvedValueOnce({} as any);

    render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByTestId('accordion-toggle-stub-1'));
    fireEvent.click(screen.getByTestId('edit-entry-btn'));

    const draftBtn = screen.getByRole('button', { name: /Soạn nháp từ kịch bản/i });
    fireEvent.click(draftBtn);

    await waitFor(() => {
      expect(runStubSpy).toHaveBeenCalledWith('series-1', 'stub-1', undefined);
    });

    // Hiển thị từng trích dẫn
    expect(await screen.findByText('Mặc áo choàng đen trên mái ngói')).toBeInTheDocument();
    expect(
      screen.getByText(/Hắc Y Nhân đứng lặng trên mái ngói, tà áo choàng đen bay trong mưa\./),
    ).toBeInTheDocument();

    // Chưa tự động gọi defineBibleEntry trước khi Writer lưu
    expect(defineSpy).not.toHaveBeenCalled();

    // Bấm "Dùng làm nháp" -> ghi nhận Accept và đổ description + subtitle vào form
    fireEvent.click(screen.getByRole('button', { name: /Dùng làm nháp/i }));

    await waitFor(() => {
      expect(reviewSpy).toHaveBeenCalledWith('series-1', 'sug-stub-1', 'accept', {});
    });

    const subtitleInput = screen.getByPlaceholderText(/Kiếm sĩ lang thang/i) as HTMLInputElement;
    const descInput = screen.getByPlaceholderText(
      /Ngoại hình, trang phục, vũ khí/i,
    ) as HTMLTextAreaElement;
    expect(subtitleInput.value).toBe('Sát thủ bí ẩn');
    expect(descInput.value).toBe('Sát thủ mặc áo choàng đen xuất hiện trên mái ngói.');
    expect(defineSpy).not.toHaveBeenCalled();

    // Writer tự chỉnh sửa lại rồi bấm Lưu qua API định nghĩa hiện có
    fireEvent.change(descInput, {
      target: { value: 'Sát thủ mặc áo choàng đen, mang mặt nạ bạc.' },
    });
    fireEvent.click(screen.getByTestId('save-entry-draft-btn'));

    await waitFor(() => {
      expect(defineSpy).toHaveBeenCalledWith(
        'series-1',
        'stub-1',
        expect.objectContaining({
          name: 'Hắc Y Nhân',
          description: 'Sát thủ mặc áo choàng đen, mang mặt nạ bạc.',
          subtitle: 'Sát thủ bí ẩn',
        }),
      );
    });
  });

  it('Bible Stub Harvester: hiển thị nguyên văn lỗi 403/409 từ Backend và ẩn nút với non-Writer', async () => {
    vi.spyOn(aiAgentsService, 'runBibleStubDraft')
      .mockRejectedValueOnce(
        new AiApiError('Chỉ Writer của Workspace mới được xin hồ sơ nháp.', 'FORBIDDEN', 403),
      )
      .mockRejectedValueOnce(
        new AiApiError(
          'Chưa có dòng kịch bản nào nhắc tới mục này, nên không có căn cứ để soạn.',
          'CONFLICT',
          409,
        ),
      );

    const { rerender } = render(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={true}
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('accordion-toggle-stub-1'));
    fireEvent.click(screen.getByTestId('edit-entry-btn'));

    const draftBtn = screen.getByRole('button', { name: /Soạn nháp từ kịch bản/i });
    fireEvent.click(draftBtn);
    expect(
      await screen.findByText('Chỉ Writer của Workspace mới được xin hồ sơ nháp.'),
    ).toBeInTheDocument();

    fireEvent.click(draftBtn);
    expect(
      await screen.findByText(
        'Chưa có dòng kịch bản nào nhắc tới mục này, nên không có căn cứ để soạn.',
      ),
    ).toBeInTheDocument();

    rerender(
      <ChapterCastDrawer
        isOpen={true}
        onClose={vi.fn()}
        chapterId='chap-1'
        seriesId='series-1'
        canEditScript={false}
        chapterCast={mockCast}
        isLoading={false}
        onRefreshCast={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /Soạn nháp từ kịch bản/i }),
    ).not.toBeInTheDocument();
  });
});
