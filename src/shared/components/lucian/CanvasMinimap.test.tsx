import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { CanvasMinimap } from './CanvasMinimap';

describe('CanvasMinimap (#104)', () => {
  const mockPanels = [
    { id: 'p1', panelNumber: 1, percentX: 5, percentY: 5, percentW: 90, percentH: 40 },
    { id: 'p2', panelNumber: 2, percentX: 5, percentY: 50, percentW: 42, percentH: 45 },
    { id: 'p3', panelNumber: 3, percentX: 52, percentY: 50, percentW: 43, percentH: 45 },
  ];

  it('renders minimap with all panels and label', () => {
    render(<CanvasMinimap panels={mockPanels} pageNumber={2} selectedPanelId='p1' />);

    expect(screen.getByTestId('canvas-minimap-root')).toBeInTheDocument();
    expect(screen.getByText(/Trang 2 · 3 khung/i)).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });

  it('supports collapsing and expanding', () => {
    render(<CanvasMinimap panels={mockPanels} />);

    const collapseBtn = screen.getByTestId('collapse-minimap-btn');
    fireEvent.click(collapseBtn);

    expect(screen.getByTestId('canvas-minimap-collapsed')).toBeInTheDocument();
    expect(screen.getByTestId('open-minimap-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('open-minimap-btn'));
    expect(screen.getByTestId('canvas-minimap-root')).toBeInTheDocument();
  });

  it('handles keyboard navigation with arrow keys', () => {
    const handleSelect = vi.fn();
    render(
      <CanvasMinimap
        panels={mockPanels}
        selectedPanelId='p1'
        onSelectPanel={handleSelect}
      />
    );

    const btn = screen.getByTestId('minimap-canvas-btn');
    fireEvent.keyDown(btn, { key: 'ArrowRight' });
    expect(handleSelect).toHaveBeenCalledWith('p2');

    fireEvent.keyDown(btn, { key: 'ArrowLeft' });
    expect(handleSelect).toHaveBeenCalledWith('p3');
  });

  it('renders viewport indicator for selected panel', () => {
    render(<CanvasMinimap panels={mockPanels} selectedPanelId='p2' />);
    expect(screen.getByTestId('minimap-viewport-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('minimap-live-output')).toHaveTextContent(/Đang chọn khung #2/i);
  });
});
