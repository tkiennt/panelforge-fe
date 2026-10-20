import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { GutterSpacingRuler } from './GutterSpacingRuler';

describe('GutterSpacingRuler (#117)', () => {
  it('renders correctly with given value and presets', () => {
    render(<GutterSpacingRuler value={2} onChange={vi.fn()} />);

    expect(screen.getByTestId('gutter-spacing-ruler-root')).toBeInTheDocument();
    expect(screen.getByTestId('gutter-current-value')).toHaveTextContent('2%');
    expect(screen.getByTestId('gutter-visual-stage')).toBeInTheDocument();
    expect(screen.getByTestId('gutter-presets-container')).toBeInTheDocument();
  });

  it('calls onChange when slider value changes', () => {
    const handleChange = vi.fn();
    render(<GutterSpacingRuler value={2} onChange={handleChange} />);

    const slider = screen.getByTestId('gutter-slider-input');
    fireEvent.change(slider, { target: { value: '4.5' } });

    expect(handleChange).toHaveBeenCalledWith(4.5);
  });

  it('calls onChange when preset button is clicked', () => {
    const handleChange = vi.fn();
    render(<GutterSpacingRuler value={2} onChange={handleChange} presets={[0, 1, 2, 4]} />);

    const presetBtn = screen.getByTestId('gutter-preset-4');
    fireEvent.click(presetBtn);

    expect(handleChange).toHaveBeenCalledWith(4);
  });
});
