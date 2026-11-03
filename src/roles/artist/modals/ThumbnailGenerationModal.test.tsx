import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ThumbnailGenerationModal } from './ThumbnailGenerationModal';
import { aiAgentsService, AiSuggestionDto } from '@/services/aiAgents.service';

vi.mock('@/services/aiAgents.service', () => ({
  aiAgentsService: {
    runThumbnail: vi.fn(),
    review: vi.fn(),
    getSuggestions: vi.fn(),
  },
}));

vi.mock('@/shared/components/AuthenticatedImage', () => ({
  AuthenticatedImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid='authenticated-image' />
  ),
}));

const mockSuggestion: AiSuggestionDto = {
  id: 'sug-123',
  runId: 'run-1',
  stepId: 'step-1',
  sceneId: 'scene-1',
  kind: 'Thumbnail',
  status: 'Pending',
  summary: 'Thumbnail AI cho khung 1',
  payload: {
    schemaVersion: 1,
    runId: 'run-1',
    panelId: 'panel-1',
    pageId: 'page-1',
    stageId: 'stage-1',
    assetId: 'asset-1',
    sha256: 'abc123sha256',
    imagePromptRevisionId: 'rev-1',
    prompt: 'A brave manga hero staring into the sunset',
    provider: 'Gemini',
    model: 'gemini-2.5-flash',
    referenceEntryIds: [],
  },
  payloadHash: 'hash1',
  baseChapterVersion: 1,
  bibleRevisionIds: [],
  hasBlockingFindings: false,
  createdAt: new Date().toISOString(),
  decisions: [],
};

describe('ThumbnailGenerationModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    seriesId: 'series-1',
    chapterId: 'chap-1',
    panelId: 'panel-1',
    panelNumber: 2,
    chapterVersion: 1,
    onSuccess: vi.fn(),
    onShowToast: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(aiAgentsService.getSuggestions).mockResolvedValue([]);
  });

  it('renders correctly when open', () => {
    render(<ThumbnailGenerationModal {...defaultProps} />);
    expect(screen.getByText(/Sinh Ảnh Mẫu AI \(Thumbnail\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Khung #2/i)).toBeInTheDocument();
    expect(screen.getByTestId('start-generate-thumbnail-btn')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ThumbnailGenerationModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Sinh Ảnh Mẫu AI/i)).not.toBeInTheDocument();
  });

  it('generates thumbnail and displays the result', async () => {
    vi.mocked(aiAgentsService.runThumbnail).mockResolvedValueOnce(mockSuggestion);

    render(<ThumbnailGenerationModal {...defaultProps} />);

    const textarea = screen.getByLabelText(/Yêu cầu bổ sung cho ảnh khung này/i);
    fireEvent.change(textarea, { target: { value: 'Chi tiết biểu cảm' } });

    const generateBtn = screen.getByTestId('start-generate-thumbnail-btn');
    fireEvent.click(generateBtn);

    expect(aiAgentsService.runThumbnail).toHaveBeenCalledWith('series-1', {
      panelId: 'panel-1',
      instruction: 'Chi tiết biểu cảm',
    });

    await waitFor(() => {
      expect(screen.getByText(/Đã sinh ảnh mẫu AI thành công/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/A brave manga hero staring into the sunset/i)).toBeInTheDocument();
    expect(screen.getByTestId('accept-thumbnail-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reject-thumbnail-btn')).toBeInTheDocument();
  });

  it('accepts thumbnail and calls onSuccess and onClose', async () => {
    vi.mocked(aiAgentsService.getSuggestions).mockResolvedValueOnce([mockSuggestion]);
    vi.mocked(aiAgentsService.review).mockResolvedValueOnce({
      suggestionId: 'sug-123',
      status: 'Accepted',
      decisionId: 'dec-1',
      chapterVersion: 2,
    });

    render(<ThumbnailGenerationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('accept-thumbnail-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('accept-thumbnail-btn'));

    await waitFor(() => {
      expect(aiAgentsService.review).toHaveBeenCalledWith('series-1', 'sug-123', 'accept', {
        chapterVersion: 1,
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('rejects thumbnail and resets back to input state', async () => {
    vi.mocked(aiAgentsService.getSuggestions).mockResolvedValueOnce([mockSuggestion]);
    vi.mocked(aiAgentsService.review).mockResolvedValueOnce({
      suggestionId: 'sug-123',
      status: 'Rejected',
      decisionId: 'dec-2',
      chapterVersion: 1,
    });

    render(<ThumbnailGenerationModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId('reject-thumbnail-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('reject-thumbnail-btn'));

    await waitFor(() => {
      expect(aiAgentsService.review).toHaveBeenCalledWith('series-1', 'sug-123', 'reject', {
        chapterVersion: 1,
      });
      expect(screen.getByTestId('start-generate-thumbnail-btn')).toBeInTheDocument();
    });
  });

  it('displays error message when generation fails', async () => {
    vi.mocked(aiAgentsService.runThumbnail).mockRejectedValueOnce(
      new Error('Panel chưa có prompt ảnh đã duyệt.')
    );

    render(<ThumbnailGenerationModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('start-generate-thumbnail-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Panel chưa có prompt ảnh đã duyệt/i);
    });
  });

  it('displays guidance and button to step 1 when 409 conflict occurs', async () => {
    const onOpenStep1 = vi.fn();
    vi.mocked(aiAgentsService.runThumbnail).mockRejectedValueOnce({
      status: 409,
      message: 'Panel chưa có prompt ảnh đã duyệt. Chạy nhiệm vụ "Prompt ảnh cho panel" và Accept trước.',
    });

    render(<ThumbnailGenerationModal {...defaultProps} onOpenStep1={onOpenStep1} />);

    fireEvent.click(screen.getByTestId('start-generate-thumbnail-btn'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Panel chưa có prompt ảnh đã duyệt/i);
      expect(screen.getByTestId('open-step1-from-modal-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('open-step1-from-modal-btn'));
    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(onOpenStep1).toHaveBeenCalled();
  });
});
