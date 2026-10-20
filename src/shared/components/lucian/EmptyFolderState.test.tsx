import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyFolderState } from './EmptyFolderState';

describe('EmptyFolderState Component (#088)', () => {
  it('render tiêu đề và phụ đề rỗng', () => {
    render(
      <EmptyFolderState
        title="Chưa có nhân vật nào"
        subtitle="Hãy thêm nhân vật đầu tiên vào hồ sơ tác phẩm"
      />,
    );
    expect(screen.getByTestId('empty-folder-state')).toBeInTheDocument();
    expect(screen.getByText('Chưa có nhân vật nào')).toBeInTheDocument();
    expect(screen.getByText('Hãy thêm nhân vật đầu tiên vào hồ sơ tác phẩm')).toBeInTheDocument();
  });

  it('gọi callback onAction khi bấm nút hành động', () => {
    const onActionMock = vi.fn();
    render(
      <EmptyFolderState
        title="Chưa có nhân vật nào"
        actionText="Thêm nhân vật"
        onAction={onActionMock}
      />,
    );
    const actionBtn = screen.getByTestId('empty-folder-action-btn');
    expect(actionBtn).toBeInTheDocument();
    fireEvent.click(actionBtn);
    expect(onActionMock).toHaveBeenCalledTimes(1);
  });
});
