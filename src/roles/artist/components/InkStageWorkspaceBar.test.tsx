import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { InkStageWorkspaceBar } from './InkStageWorkspaceBar';

describe('InkStageWorkspaceBar', () => {
  const defaultProps = {
    pencilUnderlayVisible: true,
    onTogglePencilUnderlay: vi.fn(),
    pencilUnderlayOpacity: 40,
    onPencilUnderlayOpacityChange: vi.fn(),
    hasPencilArt: true,
    selectedNib: 'g-pen' as const,
    onSelectNib: vi.fn(),
    screenToneEnabled: false,
    onToggleScreenTone: vi.fn(),
    selectedLpi: 60 as const,
    onSelectLpi: vi.fn(),
    toneDensity: 20,
    onToneDensityChange: vi.fn(),
    safeZoneVisible: false,
    onToggleSafeZone: vi.fn(),
    onTriggerUpload: vi.fn(),
    hasInkArtwork: false,
    inkArtworkVersion: null,
    isUploading: false,
    onHandoffToLettering: vi.fn(),
    isSubmitting: false,
  };

  it('hiển thị badge Upload Line-art và nút tải ảnh nét mực Ink', () => {
    render(<InkStageWorkspaceBar {...defaultProps} />);

    expect(screen.getByTestId('ink-stage-workspace-bar')).toBeInTheDocument();
    expect(screen.getByTestId('badge-ink-upload-mode')).toBeInTheDocument();
    expect(screen.getByTestId('badge-ink-upload-mode')).toHaveTextContent('Upload Line-art');

    const uploadBtn = screen.getByTestId('btn-upload-ink-art');
    expect(uploadBtn).toBeInTheDocument();
    expect(uploadBtn).toHaveTextContent('+ Tải ảnh Line-art');

    fireEvent.click(uploadBtn);
    expect(defaultProps.onTriggerUpload).toHaveBeenCalledTimes(1);
  });

  it('hiển thị trạng thái khi đã có bản Line-art mực v2', () => {
    render(
      <InkStageWorkspaceBar
        {...defaultProps}
        hasInkArtwork={true}
        inkArtworkVersion={2}
      />
    );

    const uploadBtn = screen.getByTestId('btn-upload-ink-art');
    expect(uploadBtn).toHaveTextContent('Line-art v2 (Tải bản mới)');
  });

  it('hỗ trợ bật tắt phác thảo chì nền và chuyển giao sang Lettering', () => {
    render(<InkStageWorkspaceBar {...defaultProps} />);

    const underlayBtn = screen.getByTestId('btn-toggle-pencil-underlay');
    fireEvent.click(underlayBtn);
    expect(defaultProps.onTogglePencilUnderlay).toHaveBeenCalled();

    const handoffBtn = screen.getByTestId('btn-handoff-ink-lettering-direct');
    fireEvent.click(handoffBtn);
    expect(defaultProps.onHandoffToLettering).toHaveBeenCalledTimes(1);
  });
});
