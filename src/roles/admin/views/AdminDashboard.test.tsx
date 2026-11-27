import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from './AdminDashboard';

vi.mock('@/services/admin.service', () => ({
  adminService: {
    getSystemStats: vi.fn().mockResolvedValue({
      totalUsers: 10,
      activeUsers: 8,
      totalWorkspaces: 2,
      totalSeries: 5,
    }),
  },
}));

vi.mock('@/services/payment.service', () => ({
  monetizationService: {
    getReaderStats: vi.fn().mockResolvedValue({
      workspaceId: 'ws-1',
      totalViews: 1200,
      uniqueReaders: 350,
      series: [],
    }),
  },
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid='location'>{location.pathname + location.search}</div>;
};

const renderAt = (route: string) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path='/admin'
            element={
              <>
                <AdminDashboard />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('AdminDashboard (nội dung Admin Portal trong AppShell)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('không tự dựng sidebar riêng — điều hướng do AppShell đảm nhiệm', () => {
    renderAt('/admin');
    expect(screen.queryByTestId('admin-sidebar')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tổng quan hệ thống' })).toBeInTheDocument();
  });

  it('hiển thị Thống kê độc giả khi URL có ?tab=analytics (Row #13)', async () => {
    renderAt('/admin?tab=analytics');
    expect(await screen.findByText('Lượt đọc bộ truyện')).toBeInTheDocument();
  });

  it('tab không hợp lệ quay về Tổng quan', () => {
    renderAt('/admin?tab=khong-ton-tai');
    expect(screen.getByRole('heading', { name: 'Tổng quan hệ thống' })).toBeInTheDocument();
  });

  it('lối tắt trên Tổng quan cập nhật ?tab= để menu AppShell khớp', async () => {
    renderAt('/admin');
    const shortcut = screen
      .getAllByRole('button')
      .find((b) => /Người dùng/i.test(b.textContent ?? ''));
    expect(shortcut).toBeDefined();
    fireEvent.click(shortcut!);
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?tab=users');
  });
});
