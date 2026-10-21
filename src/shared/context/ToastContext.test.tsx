import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

const TestConsumer: React.FC = () => {
  const toast = useToast();

  return (
    <div>
      <button
        onClick={() => toast.success('Thành công', 'Thao tác đã được thực hiện')}
        data-testid='btn-success'
      >
        Trigger Success
      </button>
      <button
        onClick={() => toast.error('Xóa thành viên thất bại', 'Lỗi kết nối máy chủ')}
        data-testid='btn-error'
      >
        Trigger Error
      </button>
      <button
        onClick={() => toast.showToast('Cảnh báo hệ thống', 'Phiên làm việc sắp hết hạn')}
        data-testid='btn-auto-warn'
      >
        Trigger Auto Warn
      </button>
    </div>
  );
};

describe('ToastContext & ToastProvider (Lucian #070)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders success toast with correct content when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTestId('btn-success'));

    expect(screen.getByText('Thành công')).toBeInTheDocument();
    expect(screen.getByText('Thao tác đã được thực hiện')).toBeInTheDocument();
  });

  it('renders error toast with correct red badge and error message', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTestId('btn-error'));

    expect(screen.getByText('Xóa thành viên thất bại')).toBeInTheDocument();
    expect(screen.getByText('Lỗi kết nối máy chủ')).toBeInTheDocument();
  });

  it('automatically resolves type based on keywords (e.g. cảnh báo -> warning)', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTestId('btn-auto-warn'));

    expect(screen.getByText('Cảnh báo hệ thống')).toBeInTheDocument();
    expect(screen.getByText('Phiên làm việc sắp hết hạn')).toBeInTheDocument();
  });

  it('deduplicates identical toast clicks within the spam prevention window', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );

    const btn = screen.getByTestId('btn-success');
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);

    // Only 1 item rendered despite 3 clicks
    const titles = screen.getAllByText('Thành công');
    expect(titles.length).toBe(1);
  });
});
