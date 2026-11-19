import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SeriesImagePickerDialog } from './SeriesImagePickerDialog';
import { seriesService } from '@/services/series.service';

vi.mock('@/services/series.service', () => ({
  seriesService: {
    setSeriesImage: vi.fn(),
    setSeriesImagePreset: vi.fn(),
    clearSeriesImage: vi.fn(),
  },
}));

describe('SeriesImagePickerDialog', () => {
  const defaultProps = {
    seriesId: 'series-123',
    kind: 'avatar' as const,
    currentUrl: null,
    onClose: vi.fn(),
    onApplied: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-preview-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders avatar dialog title and controls correctly', () => {
    render(<SeriesImagePickerDialog {...defaultProps} />);

    expect(screen.getAllByText('Đổi avatar Series')[0]).toBeInTheDocument();
    expect(screen.getByText(/Ảnh vuông 1:1/)).toBeInTheDocument();
    expect(screen.getByTestId('series-image-preview')).toBeInTheDocument();
  });

  it('allows picking a preset and applying it', async () => {
    vi.mocked(seriesService.setSeriesImagePreset).mockResolvedValue('https://example.com/new-avatar.png');

    render(<SeriesImagePickerDialog {...defaultProps} />);

    const firstPreset = screen.getByTestId('series-preset-series-avatar-a1');
    fireEvent.click(firstPreset);

    const applyBtn = screen.getByTestId('series-image-apply');
    expect(applyBtn).not.toBeDisabled();
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(seriesService.setSeriesImagePreset).toHaveBeenCalledWith('series-123', 'avatar', 'series-avatar-a1');
      expect(defaultProps.onApplied).toHaveBeenCalledWith('https://example.com/new-avatar.png');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('supports uploading image with "Vừa khung" (fit) and "Lấp đầy" (cover) modes', async () => {
    render(<SeriesImagePickerDialog {...defaultProps} />);

    const fileInput = screen.getByTestId('series-image-file');
    const fakeFile = new File(['fake-image-bytes'], 'one-piece-poster.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    // When file selected, controls for "Vừa khung" and "Lấp đầy" appear
    expect(await screen.findByText('Vừa khung (Trọn vẹn ảnh)')).toBeInTheDocument();
    expect(screen.getByText('Lấp đầy (Cắt tuỳ chỉnh)')).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn: one-piece-poster.png/)).toBeInTheDocument();

    // Switch to cover mode to show zoom controls
    fireEvent.click(screen.getByText('Lấp đầy (Cắt tuỳ chỉnh)'));
    expect(screen.getByText('Thu phóng:')).toBeInTheDocument();
    expect(screen.getByLabelText('Thanh trượt thu phóng')).toBeInTheDocument();

    // Test zoom slider
    const slider = screen.getByLabelText('Thanh trượt thu phóng');
    fireEvent.change(slider, { target: { value: '1.5' } });
    expect(screen.getByText('150%')).toBeInTheDocument();

    // Reset button should be visible when zoomed
    const resetBtn = screen.getByRole('button', { name: /Đặt lại/ });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('rejects files larger than 5 MB', async () => {
    render(<SeriesImagePickerDialog {...defaultProps} />);

    const fileInput = screen.getByTestId('series-image-file');
    const largeFile = new File(['fake'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(await screen.findByTestId('series-image-error')).toHaveTextContent(/vượt giới hạn 5 MB/);
  });

  it('closes dialog on Escape key', () => {
    render(<SeriesImagePickerDialog {...defaultProps} />);

    fireEvent.keyDown(screen.getByTestId('series-avatar-dialog'), { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
