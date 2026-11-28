import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { ArtistLayoutToolbar } from './ArtistLayoutToolbar';

const handlers = {
  onUploadSketch: vi.fn(),
  onOpenTemplates: vi.fn(),
  onSplitPanels: vi.fn(),
  onSaveLayout: vi.fn(),
};

const renderToolbar = (props: Partial<ComponentProps<typeof ArtistLayoutToolbar>> = {}) =>
  render(
    <ArtistLayoutToolbar
      {...handlers}
      hasSketch={false}
      hasPanels={false}
      isLayoutSaved={false}
      isDetectingPanels={false}
      isSavingLayout={false}
      {...props}
    />,
  );

describe('ArtistLayoutToolbar', () => {
  it('shows only the page upload CTA in the initial whole-page state', () => {
    renderToolbar();

    expect(screen.getByTestId('btn-upload-sketch-simple')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-split-panels-simple')).not.toBeInTheDocument();
    expect(screen.queryByTestId('canvas-btn-save-layout')).not.toBeInTheDocument();
    expect(screen.getByTestId('upload-mode-panel')).toBeEnabled();
  });

  it('allows panel mode without panels and offers layout selection', () => {
    renderToolbar({ uploadMode: 'panel' });

    expect(screen.getByTestId('btn-open-templates-simple')).toBeInTheDocument();
    expect(screen.queryByTestId('btn-upload-sketch-simple')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-split-panels-simple')).not.toBeInTheDocument();
  });

  it('shows split after a page image and save after a split result', () => {
    const { rerender } = renderToolbar({ hasSketch: true });
    fireEvent.click(screen.getByTestId('btn-split-panels-simple'));
    expect(handlers.onSplitPanels).toHaveBeenCalled();

    rerender(
      <ArtistLayoutToolbar
        {...handlers}
        hasSketch
        hasPanels
        isLayoutSaved={false}
        isDetectingPanels={false}
        isSavingLayout={false}
      />,
    );
    expect(screen.getByTestId('canvas-btn-save-layout')).toBeInTheDocument();
    expect(screen.getByText('Tách lại')).toBeInTheDocument();
  });

  it('hides editing controls in read-only mode', () => {
    renderToolbar({ readOnly: true, hasSketch: true, hasPanels: true });

    expect(screen.getByText('Chỉ xem')).toBeInTheDocument();
    expect(screen.queryByTestId('upload-mode-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-upload-sketch-simple')).not.toBeInTheDocument();
  });

  it('uses Save images for pending Ink or Color artwork', () => {
    renderToolbar({
      hasSketch: true,
      hasPanels: true,
      isLayoutSaved: true,
      hasPendingArtwork: true,
      isInkOrColorStage: true,
    });

    expect(screen.getByText('Lưu ảnh')).toBeInTheDocument();
    expect(screen.queryByText('Tách lại')).not.toBeInTheDocument();
  });
});
