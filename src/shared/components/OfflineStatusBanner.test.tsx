import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OfflineStatusBanner } from './OfflineStatusBanner';
import { offlineQueueService } from '@/services/offlineQueue.service';

vi.mock('@/services/offlineQueue.service', () => {
  let state = {
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncAt: null,
    items: [],
  };
  const listeners = new Set<(s: any) => void>();

  return {
    offlineQueueService: {
      getState: vi.fn(() => state),
      subscribe: vi.fn((cb: any) => {
        listeners.add(cb);
        cb(state);
        return () => listeners.delete(cb);
      }),
      flushQueue: vi.fn(async () => {
        state = { ...state, pendingCount: 0 };
        listeners.forEach((l) => l(state));
        return { succeeded: 1, failed: 0 };
      }),
      __setState: (newState: any) => {
        state = { ...state, ...newState };
        listeners.forEach((l) => l(state));
      },
    },
  };
});

describe('OfflineStatusBanner', () => {
  beforeEach(() => {
    (offlineQueueService as any).__setState({
      isOnline: true,
      pendingCount: 0,
      isSyncing: false,
    });
  });

  it('ẩn banner khi online và không có item nào trong hàng đợi', () => {
    const { container } = render(<OfflineStatusBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('hiển thị cảnh báo ngoại tuyến khi offline', () => {
    (offlineQueueService as any).__setState({
      isOnline: false,
      pendingCount: 2,
    });

    render(<OfflineStatusBanner />);
    expect(screen.getByText(/Chế độ ngoại tuyến:/i)).toBeInTheDocument();
    expect(screen.getByText(/2/i)).toBeInTheDocument();
    expect(screen.getByText(/Đồng bộ ngay/i)).toBeInTheDocument();
  });

  it('bấm nút "Đồng bộ ngay" kích hoạt flushQueue', async () => {
    (offlineQueueService as any).__setState({
      isOnline: false,
      pendingCount: 3,
    });

    render(<OfflineStatusBanner />);
    const syncBtn = screen.getByText(/Đồng bộ ngay/i);
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(offlineQueueService.flushQueue).toHaveBeenCalled();
    });
  });
});
