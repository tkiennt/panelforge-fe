import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TypeToConfirmModal } from './TypeToConfirmModal';

describe('TypeToConfirmModal Component (#269)', () => {
  it('không render khi isOpen = false', () => {
    const { container } = render(
      <TypeToConfirmModal
        isOpen={false}
        targetName='Episode 1'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('render modal và hiển thị targetName trong preview', () => {
    render(
      <TypeToConfirmModal
        isOpen={true}
        targetName='Episode 1'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('type-to-confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('target-name-preview')).toBeInTheDocument();
  });

  it('vô hiệu hóa nút xóa khi chưa gõ khớp tên', () => {
    render(
      <TypeToConfirmModal
        isOpen={true}
        targetName='Episode 1'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const submitBtn = screen.getByTestId('confirm-delete-submit-btn');
    expect(submitBtn).toBeDisabled();

    // Gõ sai
    const input = screen.getByTestId('confirm-delete-input');
    fireEvent.change(input, { target: { value: 'Epis' } });
    expect(submitBtn).toBeDisabled();
  });

  it('kích hoạt nút xóa khi gõ chính xác 100% targetName và gọi onConfirm', () => {
    const onConfirmMock = vi.fn();
    render(
      <TypeToConfirmModal
        isOpen={true}
        targetName='Episode 1'
        onConfirm={onConfirmMock}
        onCancel={vi.fn()}
      />,
    );
    const submitBtn = screen.getByTestId('confirm-delete-submit-btn');
    const input = screen.getByTestId('confirm-delete-input');

    fireEvent.change(input, { target: { value: 'Episode 1' } });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('gọi onCancel khi bấm nút Hủy hoặc bấm phím Escape', () => {
    const onCancelMock = vi.fn();
    render(
      <TypeToConfirmModal
        isOpen={true}
        targetName='Episode 1'
        onConfirm={vi.fn()}
        onCancel={onCancelMock}
      />,
    );
    fireEvent.click(screen.getByTestId('confirm-delete-cancel-btn'));
    expect(onCancelMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancelMock).toHaveBeenCalledTimes(2);
  });
});
