import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { aiAgentsService, type AiSuggestionDto } from '@/services/aiAgents.service';
import { PublisherMetadataModal } from './PublisherMetadataModal';

const metadata: AiSuggestionDto = {
  id: 'sg-meta',
  runId: 'r1',
  stepId: 'st1',
  sceneId: 'sc1',
  kind: 'SeriesMetadata',
  status: 'Pending',
  summary: 'Metadata phát hành chương 2',
  payload: { synopsis: 'Cậu bé và ngọn hải đăng', genre: 'Phiêu lưu' },
  payloadHash: 'hash',
  baseChapterVersion: 3,
  bibleRevisionIds: [],
  hasBlockingFindings: false,
  createdAt: '',
  decisions: [],
  canDecide: true,
  canAccept: true,
};

describe('PublisherMetadataModal (Producer · FE #31)', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('gửi chapterId + ghi chú, Accept rồi báo màn hình tải lại Series', async () => {
    const runMeta = vi.spyOn(aiAgentsService, 'runPublisherMetadata').mockResolvedValue(metadata);
    const review = vi
      .spyOn(aiAgentsService, 'review')
      .mockResolvedValue({ suggestionId: 'sg-meta', status: 'Accepted' } as never);
    const onAccepted = vi.fn();
    render(
      <PublisherMetadataModal
        seriesId='s1'
        chapterId='c2'
        chapterLabel='#2'
        onClose={vi.fn()}
        onAccepted={onAccepted}
      />,
    );

    fireEvent.change(screen.getByTestId('publisher-metadata-instruction'), {
      target: { value: '  Không tiết lộ kết chương  ' },
    });
    fireEvent.click(screen.getByTestId('publisher-metadata-run'));

    await screen.findByText('Metadata phát hành chương 2');
    expect(runMeta).toHaveBeenCalledWith('s1', {
      chapterId: 'c2',
      instruction: 'Không tiết lộ kết chương',
    });

    fireEvent.click(screen.getByRole('button', { name: /Accept \(cập nhật Series\)/ }));

    await waitFor(() => expect(onAccepted).toHaveBeenCalledTimes(1));
    expect(review).toHaveBeenCalledWith('s1', 'sg-meta', 'accept', {});
    expect(screen.getByRole('status')).toHaveTextContent('Đã cập nhật tóm tắt và thể loại');
  });

  it('ghi chú trống thì gửi instruction = null', async () => {
    const runMeta = vi.spyOn(aiAgentsService, 'runPublisherMetadata').mockResolvedValue(metadata);
    render(
      <PublisherMetadataModal seriesId='s1' chapterId='c2' chapterLabel='#2' onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId('publisher-metadata-run'));

    await waitFor(() =>
      expect(runMeta).toHaveBeenCalledWith('s1', { chapterId: 'c2', instruction: null }),
    );
  });
});
