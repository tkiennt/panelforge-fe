import { cleanup, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LetteringBalloonOverlay } from './LetteringBalloonOverlay';

const element = {
  elementId: 'balloon-1',
  elementType: 'SPEECH_BALLOON',
  x: 100,
  y: 100,
  width: 200,
  height: 100,
  zIndex: 1,
  content: 'Xin chào',
  isRemoved: false,
  version: 1,
};

const renderOverlay = (onSelect = vi.fn()) => {
  const rendered = render(
    <LetteringBalloonOverlay
      elements={[element]}
      pageWidth={1200}
      pageHeight={1800}
      selectedId={null}
      activeGestureId={null}
      onSelect={onSelect}
      onScale={vi.fn()}
      onCopy={vi.fn()}
      onDelete={vi.fn()}
      onDragStart={vi.fn()}
      onDragMove={vi.fn()}
      onDragEnd={vi.fn()}
      onResizeStart={vi.fn()}
      onResizeMove={vi.fn()}
      onResizeEnd={vi.fn()}
    />,
  );
  return {
    onSelect,
    target: rendered.getByTestId('lettering-element-balloon-1'),
  };
};

describe('LetteringBalloonOverlay', () => {
  it('chỉ mở phần chỉnh thoại khi click, không mở sau thao tác kéo', () => {
    const clicked = renderOverlay();
    fireEvent.click(clicked.target);
    expect(clicked.onSelect).toHaveBeenCalledWith('balloon-1');
    cleanup();

    const draggedSelect = vi.fn();
    const dragged = renderOverlay(draggedSelect);
    fireEvent.pointerDown(dragged.target, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerMove(dragged.target, { clientX: 30, clientY: 10 });
    fireEvent.pointerUp(dragged.target, { clientX: 30, clientY: 10 });
    fireEvent.click(dragged.target);
    expect(draggedSelect).not.toHaveBeenCalled();
  });
});
