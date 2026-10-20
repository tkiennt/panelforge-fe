import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnsavedChangesBar } from './UnsavedChangesBar';

describe('UnsavedChangesBar Component (#250)', () => {
  it('không render khi isDirty = false', () => {
    const { container } = render(
      <UnsavedChangesBar isDirty={false} onSave={vi.fn()} onDiscard={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('render thanh cảnh báo khi isDirty = true với số lượng thay đổi', () => {
    render(
      <UnsavedChangesBar isDirty={true} count={3} onSave={vi.fn()} onDiscard={vi.fn()} />
    );
    expect(screen.getByTestId('unsaved-changes-bar')).toBeInTheDocument();
    expect(screen.getByText(/3/i)).toBeInTheDocument();
  });

  it('gọi onDiscard khi click nút Hủy bỏ', () => {
    const onDiscardMock = vi.fn();
    render(
      <UnsavedChangesBar isDirty={true} onSave={vi.fn()} onDiscard={onDiscardMock} />
    );
    fireEvent.click(screen.getByTestId('unsaved-discard-btn'));
    expect(onDiscardMock).toHaveBeenCalledTimes(1);
  });

  it('gọi onSave khi click nút Lưu lại', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    render(
      <UnsavedChangesBar isDirty={true} onSave={onSaveMock} onDiscard={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId('unsaved-save-btn'));
    expect(onSaveMock).toHaveBeenCalledTimes(1);
  });

  it('hiển thị trạng thái đang lưu khi isSaving = true và disable nút', () => {
    render(
      <UnsavedChangesBar isDirty={true} isSaving={true} onSave={vi.fn()} onDiscard={vi.fn()} />
    );
    expect(screen.getByTestId('unsaved-save-btn')).toBeDisabled();
    expect(screen.getByTestId('unsaved-discard-btn')).toBeDisabled();
  });

  it('thêm class is-warn khi isWarn = true', () => {
    render(
      <UnsavedChangesBar isDirty={true} isWarn={true} onSave={vi.fn()} onDiscard={vi.fn()} />
    );
    const bar = screen.getByTestId('unsaved-changes-bar');
    expect(bar.className).toContain('is-warn');
  });
});
