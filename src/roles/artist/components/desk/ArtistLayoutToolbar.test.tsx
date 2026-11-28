import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArtistLayoutToolbar } from './ArtistLayoutToolbar';

const handlers = {
  onUploadSketch: vi.fn(),
  onOpenTemplates: vi.fn(),
  onSplitPanels: vi.fn(),
  onSaveLayout: vi.fn(),
};

describe('ArtistLayoutToolbar', () => {
  it('keeps every action visible and exposes disabled reasons', () => {
    render(
      <ArtistLayoutToolbar
        {...handlers}
        currentStep={1}
        hasSketch={false}
        hasPanels={false}
        isLayoutDirty={false}
        isDetectingPanels={false}
        isSavingLayout={false}
      />,
    );

    expect(screen.getByTestId('btn-upload-sketch-simple')).toBeEnabled();
    expect(screen.getByTestId('btn-open-templates-simple')).toBeEnabled();
    expect(screen.getByTestId('btn-split-panels-simple')).toHaveAccessibleDescription(
      'Cần tải phác thảo trước',
    );
    expect(screen.getByTestId('canvas-btn-save-layout')).toHaveAccessibleDescription(
      'Cần chọn mẫu khung hoặc tách khung trước',
    );
  });

  it('enables save after a layout change and invokes it', () => {
    render(
      <ArtistLayoutToolbar
        {...handlers}
        currentStep={3}
        hasSketch={false}
        hasPanels={true}
        isLayoutDirty={true}
        isDetectingPanels={false}
        isSavingLayout={false}
      />,
    );

    const save = screen.getByTestId('canvas-btn-save-layout');
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(handlers.onSaveLayout).toHaveBeenCalledTimes(1);
  });

  it('keeps layout action tabs visible and disabled with tooltip when layoutLockedReason is set', () => {
    const lockedReason = 'Chỉ công đoạn Pencil mới được sửa bố cục khung';
    render(
      <ArtistLayoutToolbar
        {...handlers}
        currentStep={1}
        hasSketch={false}
        hasPanels={false}
        isLayoutDirty={false}
        isDetectingPanels={false}
        isSavingLayout={false}
        layoutLockedReason={lockedReason}
      />,
    );

    expect(screen.queryByTestId('artist-layout-locked-notice')).not.toBeInTheDocument();
    expect(screen.getByTestId('btn-upload-sketch-simple')).toBeDisabled();
    expect(screen.getByTestId('btn-upload-sketch-simple')).toHaveAttribute('title', lockedReason);
    expect(screen.getByTestId('btn-open-templates-simple')).toBeDisabled();
    expect(screen.getByTestId('btn-open-templates-simple')).toHaveAttribute('title', lockedReason);
    expect(screen.getByTestId('btn-split-panels-simple')).toBeDisabled();
    expect(screen.getByTestId('btn-split-panels-simple')).toHaveAttribute('title', lockedReason);
    expect(screen.getByTestId('canvas-btn-save-layout')).toBeDisabled();
    expect(screen.getByTestId('canvas-btn-save-layout')).toHaveAttribute('title', lockedReason);
  });

  it('chỉ hiển thị hành động thuộc chế độ tải ảnh đang chọn', () => {
    const onUploadModeChange = vi.fn();
    const { rerender } = render(
      <ArtistLayoutToolbar
        {...handlers}
        currentStep={4}
        hasSketch={true}
        hasPanels={true}
        isLayoutDirty={false}
        isDetectingPanels={false}
        isSavingLayout={false}
        uploadMode='page'
        canUsePanelMode
        onUploadModeChange={onUploadModeChange}
      />,
    );

    expect(screen.getByTestId('btn-upload-sketch-simple')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('upload-mode-panel'));
    expect(onUploadModeChange).toHaveBeenCalledWith('panel');

    rerender(
      <ArtistLayoutToolbar
        {...handlers}
        currentStep={4}
        hasSketch={true}
        hasPanels={true}
        isLayoutDirty={false}
        isDetectingPanels={false}
        isSavingLayout={false}
        uploadMode='panel'
        canUsePanelMode
        onUploadModeChange={onUploadModeChange}
      />,
    );

    expect(screen.queryByTestId('btn-upload-sketch-simple')).not.toBeInTheDocument();
    expect(screen.getByText('Chọn một khung trên trang để tải hoặc thay ảnh')).toBeInTheDocument();
  });
});
