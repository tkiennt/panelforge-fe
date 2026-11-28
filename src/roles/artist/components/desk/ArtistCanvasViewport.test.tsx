import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtistCanvasViewport } from './ArtistCanvasViewport';

describe('ArtistCanvasViewport', () => {
  const defaultProps = {
    pageKey: 'page-1',
    zoomScale: 1,
    sketch: null,
    hasPanels: false,
    isLayoutSaved: true,
    hasPendingArtwork: false,
    isDetectingPanels: false,
    isSavingLayout: false,
    readOnly: false,
    isInkOrColorStage: false,
    uploadMode: 'page' as const,
    onUploadModeChange: vi.fn(),
    onCanvasClick: vi.fn(),
    onUploadSketch: vi.fn(),
    onSplitPanels: vi.fn(),
    onOpenTemplates: vi.fn(),
    onSaveLayout: vi.fn(),
  };

  it('renders drawing and page tools by default when hideArtTools is false', () => {
    render(<ArtistCanvasViewport {...defaultProps} />);

    expect(screen.getByTestId('artist-layout-toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kéo thả|drag & drop/i })).toBeInTheDocument();
  });

  it('hides drawing and page tools when hideArtTools is true', () => {
    const handleUploadSketch = vi.fn();
    render(
      <ArtistCanvasViewport
        {...defaultProps}
        hideArtTools={true}
        onUploadSketch={handleUploadSketch}
      />,
    );

    expect(screen.queryByTestId('artist-layout-toolbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /kéo thả|drag & drop/i })).not.toBeInTheDocument();

    const surface = screen.getByTestId('artist-canvas-surface');
    const file = new File(['dummy'], 'test.png', { type: 'image/png' });
    fireEvent.drop(surface, {
      dataTransfer: {
        files: [file],
        types: ['Files'],
      },
    });
    expect(handleUploadSketch).not.toHaveBeenCalled();
  });

  it('hides original page strip when hideArtTools is true even with sketch and page mode', () => {
    render(
      <ArtistCanvasViewport
        {...defaultProps}
        hideArtTools={true}
        sketch={{
          imageUrl: 'https://example.com/sketch.png',
          fileName: 'page-sketch.png',
          isVisible: true,
        }}
      />,
    );

    expect(screen.queryByText('page-sketch.png')).not.toBeInTheDocument();
  });

  it('hides template button in panel mode without panels when hideArtTools is true', () => {
    render(
      <ArtistCanvasViewport
        {...defaultProps}
        uploadMode='panel'
        hasPanels={false}
        hideArtTools={true}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /chọn khung mẫu|choose template/i }),
    ).not.toBeInTheDocument();
  });
});
