import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ScriptStatusBar } from './ScriptStatusBar';

describe('ScriptStatusBar', () => {
  it('không render gì nếu không có trạng thái hay lỗi nào', () => {
    const { container } = render(<ScriptStatusBar canEditScript={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị chip lỗi xung đột 409 khi có concurrencyError', () => {
    const onClear = vi.fn();
    render(
      <ScriptStatusBar
        concurrencyError='Xung đột sửa đổi (409 Conflict)'
        onClearConcurrencyError={onClear}
      />,
    );

    expect(screen.getByTestId('concurrency-error-banner')).toHaveTextContent(
      'Xung đột sửa đổi (409 Conflict)',
    );

    const closeBtn = screen.getByTitle('Đóng');
    fireEvent.click(closeBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('hiển thị chip kịch bản đóng băng', () => {
    render(<ScriptStatusBar isScriptFrozen={true} />);
    expect(screen.getByTestId('script-frozen-chip')).toHaveTextContent('Đã đóng băng');
  });

  it('hiển thị chip kịch bản đang thẩm định', () => {
    render(<ScriptStatusBar isScriptInReview={true} />);
    expect(screen.getByTestId('script-in-review-chip')).toBeInTheDocument();
  });

  it('hiển thị chip chương bị khoá nội dung', () => {
    render(<ScriptStatusBar isChapterLocked={true} />);
    expect(screen.getByTestId('chapter-locked-chip')).toBeInTheDocument();
  });

  it('hiển thị chip chỉ xem khi không có quyền sửa', () => {
    render(<ScriptStatusBar canEditScript={false} />);
    expect(screen.getByTestId('role-view-only-chip')).toBeInTheDocument();
  });

  it('hiển thị cảnh báo chặn gửi duyệt kèm nút mở cast', () => {
    const onOpenCast = vi.fn();
    render(
      <ScriptStatusBar
        isSubmitBlocked={true}
        onOpenCharactersDrawer={onOpenCast}
      />,
    );

    const submitBlocked = screen.getByTestId('submit-blocked-chip');
    expect(submitBlocked).toBeInTheDocument();

    const openCastBtn = screen.getByText('Mở Cast');
    fireEvent.click(openCastBtn);
    expect(onOpenCast).toHaveBeenCalledTimes(1);
  });

  it('cho phép mở ngăn kéo trạng thái chi tiết', () => {
    const onOpenStatus = vi.fn();
    render(
      <ScriptStatusBar
        isScriptFrozen={true}
        onOpenStatusDrawer={onOpenStatus}
      />,
    );

    const viewDetailsBtn = screen.getByText('Xem chi tiết');
    fireEvent.click(viewDetailsBtn);
    expect(onOpenStatus).toHaveBeenCalledTimes(1);
  });
});
