import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { adminService } from '@/services/admin.service';
import { monetizationService } from '@/services/payment.service';

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

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('hiển thị mục "Thống kê độc giả" trong danh sách điều hướng quản trị (Row #13)', () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    const analyticsNavButtons = screen.getAllByRole('button', { name: /Thống kê độc giả/i });
    expect(analyticsNavButtons.length).toBeGreaterThan(0);
  });

  it('chuyển sang tab Thống kê độc giả khi bấm vào mục điều hướng', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>,
    );

    const analyticsBtn = screen.getAllByRole('button', { name: /Thống kê độc giả/i })[0];
    fireEvent.click(analyticsBtn);

    await waitFor(() => {
      // Breadcrumb updates to current page: Thống kê độc giả
      const currentPage = screen.getByRole('listitem', { current: 'page' });
      expect(currentPage).toHaveTextContent('Thống kê độc giả');
    });
  });
});
