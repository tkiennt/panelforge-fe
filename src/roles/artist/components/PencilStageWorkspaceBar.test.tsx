import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PencilStageWorkspaceBar } from './PencilStageWorkspaceBar';

describe('PencilStageWorkspaceBar', () => {
  const defaultProps = {
    storyboardOpacity: 50,
    onStoryboardOpacityChange: vi.fn(),
    showStoryboardOverlay: true,
    onToggleStoryboardOverlay: vi.fn(),
    hasStoryboard: true,
    bibleEntries: [
      { id: 'bible-1', name: 'Nhân vật A' } as any,
    ],
    selectedBibleEntryId: null,
    onSelectBibleEntry: vi.fn(),
    sketchColor: 'blue' as const,
    onSketchColorChange: vi.fn(),
    onHandoffToInk: vi.fn(),
    isSubmitting: false,
    onTriggerUpload: vi.fn(),
    hasPencilArtwork: false,
    pencilArtworkVersion: null,
    isUploading: false,
  };

  it('hiển thị badge quy trình Upload ảnh và nút tải ảnh nét chì nổi bật', () => {
    render(<PencilStageWorkspaceBar {...defaultProps} />);

    expect(screen.getByTestId('pencil-stage-workspace-bar')).toBeInTheDocument();
    expect(screen.getByTestId('badge-pencil-upload-mode')).toBeInTheDocument();
    expect(screen.getByTestId('badge-pencil-upload-mode')).toHaveTextContent('Upload ảnh nét chì');

    const uploadBtn = screen.getByTestId('btn-upload-pencil-art');
    expect(uploadBtn).toBeInTheDocument();
    expect(uploadBtn).toHaveTextContent('+ Tải ảnh nét chì');

    fireEvent.click(uploadBtn);
    expect(defaultProps.onTriggerUpload).toHaveBeenCalledTimes(1);
  });

  it('hiển thị trạng thái khi đã có bản vẽ nét chì v1', () => {
    render(
      <PencilStageWorkspaceBar
        {...defaultProps}
        hasPencilArtwork={true}
        pencilArtworkVersion={1}
      />
    );

    const uploadBtn = screen.getByTestId('btn-upload-pencil-art');
    expect(uploadBtn).toHaveTextContent('Nét chì v1 (Tải bản mới)');
  });

  it('cho phép đổi bộ lọc màu hiển thị chì xanh / chì đen và bàn giao sang Ink', () => {
    render(<PencilStageWorkspaceBar {...defaultProps} />);

    const blueBtn = screen.getByTestId('btn-pencil-blue');
    const graphiteBtn = screen.getByTestId('btn-pencil-graphite');

    fireEvent.click(graphiteBtn);
    expect(defaultProps.onSketchColorChange).toHaveBeenCalledWith('graphite');

    const handoffBtn = screen.getByTestId('btn-handoff-pencil-ink-direct');
    fireEvent.click(handoffBtn);
    expect(defaultProps.onHandoffToInk).toHaveBeenCalledTimes(1);
  });
});
