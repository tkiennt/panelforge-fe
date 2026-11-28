import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminDashboard } from '../../AdminDashboard';
import type {
  AdminUserDetailDto,
  AdminWorkspaceDetailDto,
  SystemHealthDto,
} from '@/services/adminDetail.service';

const meter = (used: number, quota: number) => ({
  used,
  quota,
  isUnlimited: quota === 0,
  percentUsed: quota ? (used * 100) / quota : null,
});

const user: AdminUserDetailDto = {
  id: 'u-1',
  email: 'p@test.com',
  fullName: 'Producer Một',
  phoneNumber: null,
  avatarUrl: null,
  role: 'User',
  canCreateStudio: true,
  isActive: true,
  isEmailConfirmed: true,
  isPendingInvitation: false,
  twoFactorEnabled: false,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: null,
  lastActiveAt: '2026-11-28T00:00:00Z',
  activeSessions: [
    {
      sessionId: 's-1',
      deviceName: 'Chrome trên Windows',
      ipAddress: '10.0.0.1',
      userAgent: null,
      startedAt: '2026-11-27T00:00:00Z',
      lastActiveAt: '2026-11-28T00:00:00Z',
      expiresAt: '2026-12-05T00:00:00Z',
    },
  ],
  memberships: [
    {
      workspaceId: 'ws-1',
      workspaceName: 'Studio A',
      role: 'Producer',
      status: 'Active',
      isOwner: true,
      joinedAt: '2026-11-01T00:00:00Z',
    },
  ],
  wallet: null,
  aiUsageThisMonth: { tokens: 1500, calls: 3, failedCalls: 1 },
  recentActivity: [],
};

const studio: AdminWorkspaceDetailDto = {
  resources: {
    workspaceId: 'ws-1',
    name: 'Studio A',
    ownerName: 'Producer Một',
    ownerEmail: 'p@test.com',
    memberCount: 1,
    seriesCount: 1,
    createdAt: '2026-11-01T00:00:00Z',
    storage: meter(1, 10),
    aiEnabled: true,
    aiTokens: meter(100, 1000),
    aiImages: null,
    aiNextResetAt: '2026-12-01T00:00:00Z',
    pendingRequestCount: 0,
    health: 'Ok',
  },
  ownerId: 'u-1',
  aiProvider: 'Google Gemini',
  sessionLifetimeMinutes: null,
  sessionIdleTimeoutMinutes: 30,
  maxConcurrentSessions: null,
  members: [
    {
      userId: 'u-1',
      fullName: 'Producer Một',
      email: 'p@test.com',
      role: 'Producer',
      status: 'Active',
      userIsActive: true,
      joinedAt: '2026-11-01T00:00:00Z',
    },
  ],
  series: [
    {
      id: 'se-1',
      title: 'Kiếm Sĩ Cuối Cùng',
      isCompleted: false,
      chapterCount: 4,
      publishedChapterCount: 2,
      createdAt: '2026-11-02T00:00:00Z',
    },
  ],
  quotaRequests: [],
  aiLast30Days: { tokens: 100, calls: 2, failedCalls: 0, failedWorkflowRuns: 0 },
  recentActivity: [],
};

const health: SystemHealthDto = {
  status: 'Degraded',
  checkedAt: '2026-11-28T06:00:00Z',
  serverStartedAt: '2026-11-28T00:00:00Z',
  version: '1.0.0',
  dependencies: [
    {
      key: 'database',
      status: 'Healthy',
      provider: 'PostgreSQL',
      latencyMs: 4,
      reason: null,
      queueDepth: null,
    },
    {
      key: 'ai',
      status: 'Down',
      provider: 'PanelForge.AI',
      latencyMs: null,
      reason: 'UNREACHABLE',
      queueDepth: null,
    },
  ],
  signals: [
    { key: 'pendingQuotaRequests', count: 2, warning: true, oldestAt: '2026-11-20T00:00:00Z' },
  ],
};

vi.mock('@/services/adminDetail.service', () => ({
  adminDetailService: {
    getUser: vi.fn(() => Promise.resolve(user)),
    getWorkspace: vi.fn(() => Promise.resolve(studio)),
    getSystemHealth: vi.fn(() => Promise.resolve(health)),
  },
}));

vi.mock('@/services/quota.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/quota.service')>()),
  quotaService: {
    getPolicy: vi.fn().mockResolvedValue({ warningThresholdPercent: 80 }),
    getResources: vi.fn().mockResolvedValue({ studios: [], warningThresholdPercent: 80 }),
    getRequests: vi.fn().mockResolvedValue([]),
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

describe('Trang chi tiết Admin (OPS-30..32)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('?tab=users&user= mở chi tiết tài khoản, bấm Studio sang chi tiết Studio', async () => {
    renderAt('/admin?tab=users&user=u-1');
    expect(await screen.findByRole('heading', { name: 'Producer Một' })).toBeInTheDocument();
    expect(screen.getByText('Chrome trên Windows')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở Studio' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?tab=resources&studio=ws-1');
    expect(await screen.findByText('Kiếm Sĩ Cuối Cùng')).toBeInTheDocument();
  });

  it('chi tiết Studio: quay lại về bảng Tài nguyên, mở tài khoản thành viên', async () => {
    renderAt('/admin?tab=resources&studio=ws-1');
    expect(await screen.findByRole('heading', { name: 'Studio A' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem tài khoản' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?tab=users&user=u-1');
  });

  it('System Health hiện thành phần hỏng, lý do và mở màn xử lý', async () => {
    renderAt('/admin?tab=system-health');
    expect(await screen.findByText('Không kết nối được.')).toBeInTheDocument();
    expect(screen.getAllByText('Không hoạt động').length).toBeGreaterThan(0);
    expect(screen.getByText('Yêu cầu tăng hạn mức chờ duyệt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở màn xử lý' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?tab=resources&view=requests');
  });
});
