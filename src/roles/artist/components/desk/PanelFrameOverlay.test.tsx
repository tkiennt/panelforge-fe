import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PanelDto } from '@/types/pipeline';
import { PanelFrameOverlay, type PanelArtworkData } from './PanelFrameOverlay';

const panel = (id: string, n: number, balloonCheckRequired = false): PanelDto =>
  ({
    id,
    pageId: 'page-1',
    panelNumber: n,
    readingOrder: n,
    boundingBox: JSON.stringify({ normalized: { x: 0, y: 0, w: 1, h: 1 } }),
    balloonCheckRequired,
    createdAt: '2026-11-28T00:00:00.000Z',
  }) as PanelDto;

const panels = [panel('panel-1', 1)];
const handlers = {
  onUploadArtwork: vi.fn(),
  onRemoveArtwork: vi.fn(),
  onPreviewArtwork: vi.fn(),
};

describe('PanelFrameOverlay', () => {
  it('marks only panels whose artwork changed under balloons', () => {
    render(
      <PanelFrameOverlay
        panels={[panel('a', 1, true), panel('b', 2)]}
        pageWidth={1200}
        pageHeight={1800}
        artworks={{}}
        isLayoutSaved
        {...handlers}
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

  it('does not mount panel dropzones or artwork actions in whole-page mode', () => {
    render(
      <PanelFrameOverlay
        panels={panels}
        pageWidth={1200}
        pageHeight={1800}
        artworks={{}}
        isLayoutSaved={false}
        mode='page'
        {...handlers}
      />,
    );

    expect(screen.queryByTestId('panel-dropzone-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('canvas-panel-badge-1').tagName).toBe('SPAN');
  });

  it('uploads exactly to the dropped panel in per-panel mode', () => {
    render(
      <PanelFrameOverlay
        panels={panels}
        pageWidth={1200}
        pageHeight={1800}
        artworks={{}}
        isLayoutSaved
        mode='panel'
        {...handlers}
      />,
    );
    const file = new File(['image'], 'panel.webp', { type: 'image/webp' });
    fireEvent.drop(screen.getByTestId('panel-dropzone-1'), {
      dataTransfer: { files: [file] },
    });
    expect(handlers.onUploadArtwork).toHaveBeenCalledWith('panel-1', 1, file);
  });

  it('shows only View for existing artwork when editing is unavailable', () => {
    const artwork: PanelArtworkData = {
      id: 'art-1',
      panelId: 'panel-1',
      panelNumber: 1,
      imageUrl: 'blob:art',
      fileName: 'panel.png',
      uploadedAt: '2026-11-28T00:00:00.000Z',
    };
    render(
      <PanelFrameOverlay
        panels={panels}
        pageWidth={1200}
        pageHeight={1800}
        artworks={{ 'panel-1': artwork }}
        isLayoutSaved
        mode='panel'
        canUploadArtwork={false}
        canSelectPanel={false}
        {...handlers}
      />,
    );

    expect(screen.getByTestId('panel-btn-view-1')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-btn-replace-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('panel-btn-remove-1')).not.toBeInTheDocument();
  });
});
