import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelDto } from '@/types/pipeline';
import { PanelFrameOverlay } from './PanelFrameOverlay';

const panel = (id: string, n: number, balloonCheckRequired = false): PanelDto =>
  ({
    id,
    pageId: 'p1',
    panelNumber: n,
    readingOrder: n,
    boundingBox: JSON.stringify({ x: 0, y: (n - 1) * 600, width: 1200, height: 600 }),
    balloonCheckRequired,
  }) as PanelDto;

describe('PanelFrameOverlay – ART-06 Check Balloon Fit', () => {
  it('marks only panels whose artwork changed under balloons', () => {
    render(
      <PanelFrameOverlay
        panels={[panel('a', 1, true), panel('b', 2)]}
        pageWidth={1200}
        pageHeight={1800}
        artworks={{}}
        isLayoutSaved
        onUploadArtwork={vi.fn()}
        onRemoveArtwork={vi.fn()}
        onPreviewArtwork={vi.fn()}
      />,
    );

    expect(screen.getByTestId('canvas-panel-frame-1')).toHaveAttribute(
      'data-balloon-check',
      'true',
    );
    expect(screen.getByTestId('canvas-panel-balloon-check-1')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-frame-2')).not.toHaveAttribute('data-balloon-check');
    expect(screen.queryByTestId('canvas-panel-balloon-check-2')).not.toBeInTheDocument();
  });
});
