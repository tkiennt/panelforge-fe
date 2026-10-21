import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LayerStackingOrder } from './LayerStackingOrder';
import type { ElementSnapshotDto } from '@/services/element.service';

describe('LayerStackingOrder (#122)', () => {
  const mockElements: ElementSnapshotDto[] = [
    {
      elementId: 'elem-1',
      elementType: 'BACKGROUND',
      zIndex: 1,
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      isRemoved: false,
    },
    {
      elementId: 'elem-2',
      elementType: 'CHARACTER_INSTANCE',
      zIndex: 3,
      x: 20,
      y: 20,
      width: 50,
      height: 60,
      isRemoved: false,
    },
    {
      elementId: 'elem-3',
      elementType: 'EFFECT',
      zIndex: 5,
      x: 30,
      y: 30,
      width: 40,
      height: 40,
      isRemoved: false,
    },
  ];

  it('renders all layers and 3D preview chips', () => {
    const handleSelect = vi.fn();
    render(
      <LayerStackingOrder
        elements={mockElements}
        selectedElementId='elem-2'
        onSelectElement={handleSelect}
        onChangeZIndex={vi.fn()}
      />,
    );

    expect(screen.getByTestId('layer-stacking-order-root')).toBeInTheDocument();
    expect(screen.getByTestId('preview-chip-elem-1')).toBeInTheDocument();
    expect(screen.getByTestId('preview-chip-elem-2')).toBeInTheDocument();
    expect(screen.getByTestId('preview-chip-elem-3')).toBeInTheDocument();

    expect(screen.getByTestId('layer-item-elem-1')).toBeInTheDocument();
    expect(screen.getByTestId('layer-item-elem-2')).toBeInTheDocument();
    expect(screen.getByTestId('layer-item-elem-3')).toBeInTheDocument();
  });

  it('supports bring-to-front and step actions', () => {
    const handleChangeZ = vi.fn();
    const handleBringToFront = vi.fn();
    render(
      <LayerStackingOrder
        elements={mockElements}
        selectedElementId='elem-1'
        onSelectElement={vi.fn()}
        onChangeZIndex={handleChangeZ}
        onBringToFront={handleBringToFront}
      />,
    );

    const bringBtn = screen.getByTestId('bring-to-front-elem-1');
    fireEvent.click(bringBtn);
    expect(handleBringToFront).toHaveBeenCalledWith(mockElements[0]);

    const stepUpBtn = screen.getByTestId('layer-up-elem-1');
    fireEvent.click(stepUpBtn);
    expect(handleChangeZ).toHaveBeenCalledWith(mockElements[0], 1);
  });

  it('allows clicking preview chip to bring to front and select', () => {
    const handleSelect = vi.fn();
    const handleBringToFront = vi.fn();
    render(
      <LayerStackingOrder
        elements={mockElements}
        selectedElementId='elem-1'
        onSelectElement={handleSelect}
        onChangeZIndex={vi.fn()}
        onBringToFront={handleBringToFront}
      />,
    );

    const chip = screen.getByTestId('preview-chip-elem-2');
    fireEvent.click(chip);
    expect(handleSelect).toHaveBeenCalledWith('elem-2');
    expect(handleBringToFront).toHaveBeenCalledWith(mockElements[1]);
  });
});
