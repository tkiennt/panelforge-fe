import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ElementConflictModal } from './ElementConflictModal';

describe('ElementConflictModal', () => {
  it('không render khi isOpen là false', () => {
    const { container } = render(
      <ElementConflictModal isOpen={false} onReload={vi.fn()} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('render đầy đủ nội dung khi isOpen là true và gọi onReload khi người dùng chọn Tải lại', () => {
    const handleReload = vi.fn();
    const handleClose = vi.fn();

    render(
      <ElementConflictModal
        isOpen={true}
        elementId='elem-123'
        errorMessage='ELEMENT_VERSION_CONFLICT'
        onReload={handleReload}
        onClose={handleClose}
      />,
    );

    expect(screen.getByText(/Xung Đột Phiên Bản Phần Tử/i)).toBeInTheDocument();
    expect(screen.getByText(/Element ID: elem-123/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ELEMENT_VERSION_CONFLICT/i).length).toBeGreaterThanOrEqual(1);

    const reloadBtn = screen.getByText(/Tải lại dữ liệu mới nhất/i);
    fireEvent.click(reloadBtn);

    expect(handleReload).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
