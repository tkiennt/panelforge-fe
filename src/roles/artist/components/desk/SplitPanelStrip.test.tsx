import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelDto } from '@/types/pipeline';
import { SplitPanelStrip } from './SplitPanelStrip';
import type { PanelArtworkData } from './PanelFrameOverlay';

const panel = (id: string, n: number): PanelDto =>
  ({ id, pageId: 'p1', panelNumber: n, readingOrder: n, boundingBox: '{}' }) as PanelDto;

const art = (panelId: string, n: number): PanelArtworkData => ({
  id: `art-${panelId}`,
  panelId,
  panelNumber: n,
  imageUrl: `blob:http://localhost/${panelId}`,
  fileName: `panel-${n}.png`,
  uploadedAt: '2026-11-26T00:00:00Z',
  source: 'auto-split',
});

const setup = (canEdit = true) => {
  const handlers = {
    onSelectPanel: vi.fn(),
    onPreviewArtwork: vi.fn(),
    onRemoveArtwork: vi.fn(),
  };
  render(
    <SplitPanelStrip
      // Cố ý xáo thứ tự để kiểm tra dải ảnh xếp theo thứ tự đọc.
      panels={[panel('c', 3), panel('a', 1), panel('b', 2)]}
      artworks={{ a: art('a', 1), c: art('c', 3) }}
      canEdit={canEdit}
      {...handlers}
    />,
  );
  return handlers;
};

describe('SplitPanelStrip', () => {
  it('lists every panel in reading order with its own image or an empty slot', () => {
    setup();
    const items = screen.getAllByTestId(/^split-strip-item-/);
    expect(items.map((el) => el.dataset.testid)).toEqual([
      'split-strip-item-1',
      'split-strip-item-2',
      'split-strip-item-3',
    ]);
    expect(screen.getByText('Ảnh theo khung (2/3)')).toBeInTheDocument();
    expect(screen.getByAltText('Ảnh khung 1')).toHaveAttribute('src', 'blob:http://localhost/a');
    expect(screen.getByText('Trống')).toBeInTheDocument();
    expect(screen.queryByTestId('split-strip-remove-2')).not.toBeInTheDocument();
  });

  it('downloads each image as its own file', () => {
    setup();
    const link = screen.getByTestId('split-strip-download-3');
    expect(link).toHaveAttribute('href', 'blob:http://localhost/c');
    expect(link).toHaveAttribute('download', 'panel-3.png');
  });

  it('removes one image at a time and previews or selects a panel', () => {
    const h = setup();
    fireEvent.click(screen.getByTestId('split-strip-remove-3'));
    expect(h.onRemoveArtwork).toHaveBeenCalledWith('c', 3);
    fireEvent.click(screen.getByTestId('split-strip-view-1'));
    expect(h.onPreviewArtwork).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: 'blob:http://localhost/a' }),
    );
    fireEvent.click(screen.getByLabelText('Chọn khung 2'));
    expect(h.onSelectPanel).toHaveBeenCalledWith('b');
  });

  it('disables removal when the page is not editable', () => {
    const h = setup(false);
    const remove = screen.getByTestId('split-strip-remove-1');
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(h.onRemoveArtwork).not.toHaveBeenCalled();
  });
});
