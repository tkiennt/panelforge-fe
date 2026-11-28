import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AiApiError, aiAgentsService, type AiSuggestionDto } from '@/services/aiAgents.service';
import { PanelAiTools } from './PanelAiTools';

const thumbnail = (over: Partial<AiSuggestionDto> = {}): AiSuggestionDto => ({
  id: 'sg-thumb',
  runId: 'r1',
  stepId: 'st1',
  sceneId: 'sc1',
  kind: 'Thumbnail',
  status: 'Pending',
  summary: 'Thumbnail cho panel 1',
  payload: { panelId: 'p1', sha256: 'abc', assetId: 'a1' },
  payloadHash: 'hash',
  baseChapterVersion: 3,
  bibleRevisionIds: [],
  hasBlockingFindings: false,
  createdAt: '',
  decisions: [],
  canDecide: true,
  canAccept: true,
  ...over,
});

const onReload = vi.fn();

const renderTools = (over: Partial<React.ComponentProps<typeof PanelAiTools>> = {}) =>
  render(
    <PanelAiTools
      seriesId='s1'
      chapterId='c1'
      panelId='p1'
      sceneId='sc1'
      chapterVersion={3}
      readingDirection='RightToLeft'
      nameById={{}}
      onReload={onReload}
      {...over}
    />,
  );

describe('PanelAiTools (Artist · FE #31)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    onReload.mockReset();
  });

  it('Thumbnail AI: gọi đúng panel, chỉ thành artwork khi Accept rồi tải lại bàn vẽ', async () => {
    const runThumbnail = vi.spyOn(aiAgentsService, 'runThumbnail').mockResolvedValue(thumbnail());
    const review = vi
      .spyOn(aiAgentsService, 'review')
      .mockResolvedValue({ suggestionId: 'sg-thumb', status: 'Accepted' } as never);
    renderTools();

    fireEvent.click(screen.getByTestId('panel-ai-thumbnail'));

    await screen.findByText('Thumbnail cho panel 1');
    expect(runThumbnail).toHaveBeenCalledWith('s1', { panelId: 'p1' });
    expect(onReload).not.toHaveBeenCalled();
    // chạy lại bị khoá khi còn đề xuất chờ quyết định
    expect(screen.getByTestId('panel-ai-thumbnail')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Accept \(tạo Artwork mới\)/ }));

    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
    expect(review).toHaveBeenCalledWith('s1', 'sg-thumb', 'accept', {});
    expect(screen.queryByText('Thumbnail cho panel 1')).not.toBeInTheDocument();
  });

  it('lỗi từ Backend (403 ngoài phạm vi được giao) hiện đúng câu Backend trả', async () => {
    vi.spyOn(aiAgentsService, 'runThumbnail').mockRejectedValue(
      new AiApiError('Bạn chưa được giao ô Ink của panel này.', 'FORBIDDEN', 403),
    );
    renderTools();

    fireEvent.click(screen.getByTestId('panel-ai-thumbnail'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Bạn chưa được giao ô Ink của panel này.',
    );
  });

  it('Panel chưa gắn Scene: khoá nút mô tả vẽ và nói rõ lý do', () => {
    renderTools({ sceneId: null });

    expect(screen.getByTestId('panel-ai-image-prompt')).toBeDisabled();
    expect(screen.getByText(/chưa gắn Scene/)).toBeInTheDocument();
  });
});
