import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResourcesView } from './ResourcesView';
import {
  quotaService,
  AdminResourceOverviewDto,
  QuotaIncreaseRequestDto,
} from '@/services/quota.service';

vi.mock('@/services/quota.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/quota.service')>();
  return {
    ...actual,
    quotaService: {
      getResources: vi.fn(),
      updateResources: vi.fn(),
      getRequests: vi.fn(),
      approveRequest: vi.fn(),
      rejectRequest: vi.fn(),
      getPolicy: vi.fn(),
      updatePolicy: vi.fn(),
      reconcileStorage: vi.fn(),
      deleteOrphanFiles: vi.fn(),
    },
  };
});

const GB = 1024 ** 3;
const meter = (used: number, quota: number) => ({
  used,
  quota,
  isUnlimited: quota === 0,
  percentUsed: quota === 0 ? null : (used * 100) / quota,
});

const overview: AdminResourceOverviewDto = {
  totalStudios: 2,
  totalStorageUsedBytes: 9 * GB,
  totalTokensUsedThisMonth: 100,
  totalImagesThisMonth: 0,
  aiEnabledStudios: 2,
  nearLimitStudios: 1,
  exhaustedStudios: 1,
  pendingRequests: 1,
  warningThresholdPercent: 80,
  totalRequestsThisMonth: 0,
  studios: [
    {
      workspaceId: 'ws-a',
      name: 'Studio Alpha',
      ownerName: 'An',
      ownerEmail: 'an@test.com',
      memberCount: 3,
      seriesCount: 1,
      createdAt: '2026-11-01T00:00:00Z',
      storage: meter(9 * GB, 10 * GB),
      aiEnabled: true,
      aiTokens: meter(0, 1000),
      aiImages: meter(0, 0),
      aiRequests: meter(0, 0),
      requestsPerMinuteLimit: 0,
      aiNextResetAt: '2026-12-01T00:00:00Z',
      pendingRequestCount: 1,
      health: 'NearLimit',
    },
    {
      workspaceId: 'ws-b',
      name: 'Studio Beta',
      ownerName: 'Bình',
      ownerEmail: 'binh@test.com',
      memberCount: 1,
      seriesCount: 0,
      createdAt: '2026-11-02T00:00:00Z',
      storage: meter(0, 0),
      aiEnabled: true,
      aiTokens: meter(100, 100),
      aiImages: meter(0, 0),
      aiRequests: meter(0, 0),
      requestsPerMinuteLimit: 0,
      aiNextResetAt: '2026-12-01T00:00:00Z',
      pendingRequestCount: 0,
      health: 'Exhausted',
    },
  ],
};

const pending: QuotaIncreaseRequestDto = {
  id: 'rq-1',
  workspaceId: 'ws-a',
  workspaceName: 'Studio Alpha',
  resourceType: 'Storage',
  currentQuota: 10 * GB,
  requestedQuota: 20 * GB,
  reason: 'Thêm chương mới',
  requestedByUserId: 'u-1',
  requestedByName: 'An',
  createdAt: '2026-11-27T00:00:00Z',
  status: 'Pending',
  reviewedByUserId: null,
  reviewedByName: null,
  reviewedAt: null,
  reviewNote: null,
  grantedQuota: null,
};

const renderAt = (route = '/admin?tab=resources') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <ResourcesView />
    </MemoryRouter>,
  );

describe('ResourcesView (Admin → Tài nguyên)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(quotaService.getResources).mockResolvedValue(overview);
    vi.mocked(quotaService.getRequests).mockResolvedValue([pending]);
  });

  it('hiển thị số liệu thật và trạng thái không chỉ bằng màu', async () => {
    renderAt();
    expect(await screen.findByText('Studio Alpha')).toBeInTheDocument();
    expect(screen.getByText('Gần hết')).toBeInTheDocument();
    expect(screen.getByText('Đã hết quota')).toBeInTheDocument();
    expect(screen.getByText('1 yêu cầu chờ')).toBeInTheDocument();
  });

  it('lọc theo tìm kiếm và báo không có kết quả', async () => {
    renderAt();
    await screen.findByText('Studio Alpha');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'beta' } });
    expect(screen.queryByText('Studio Alpha')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByText('Không có Studio khớp bộ lọc.')).toBeInTheDocument();
  });

  it('hiện lỗi kèm nút thử lại khi tải thất bại', async () => {
    vi.mocked(quotaService.getResources).mockRejectedValueOnce(new Error('Mất kết nối'));
    renderAt();
    expect(await screen.findByText('Mất kết nối')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Studio Alpha')).toBeInTheDocument();
  });

  it('cấu hình quota: bắt buộc lý do, cảnh báo dưới mức dùng, rồi gửi đúng byte', async () => {
    vi.mocked(quotaService.updateResources).mockResolvedValue(overview.studios[0]);
    renderAt();
    await screen.findByText('Studio Alpha');
    fireEvent.click(screen.getAllByRole('button', { name: 'Cấu hình' })[0]);

    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Storage Quota \(GB\)/), {
      target: { value: '5' },
    });
    expect(within(dialog).getByText(/thấp hơn dung lượng đang dùng/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByText('Vui lòng nhập lý do.')).toBeInTheDocument();
    expect(quotaService.updateResources).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Lý do điều chỉnh/), {
      target: { value: 'Giảm tạm' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() =>
      expect(quotaService.updateResources).toHaveBeenCalledWith('ws-a', {
        storageQuotaBytes: 5 * GB,
        monthlyTokenQuota: 1000,
        monthlyImageQuota: 0,
        monthlyRequestQuota: 0,
        requestsPerMinute: 0,
        aiEnabled: true,
        reason: 'Giảm tạm',
      }),
    );
  });

  it('báo lỗi từ server và giữ modal mở', async () => {
    vi.mocked(quotaService.updateResources).mockRejectedValue(
      new Error('Studio vừa được cập nhật'),
    );
    renderAt();
    await screen.findByText('Studio Alpha');
    fireEvent.click(screen.getAllByRole('button', { name: 'Cấu hình' })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Lý do điều chỉnh/), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findByText('Studio vừa được cập nhật')).toBeInTheDocument();
  });

  it('từ chối yêu cầu bắt buộc ghi lý do', async () => {
    vi.mocked(quotaService.rejectRequest).mockResolvedValue({ ...pending, status: 'Rejected' });
    renderAt('/admin?tab=resources&view=requests');
    expect(await screen.findByText('Thêm chương mới')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Từ chối' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    expect(await within(dialog).findByText('Từ chối phải ghi lý do.')).toBeInTheDocument();
    expect(quotaService.rejectRequest).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/Ghi chú/), { target: { value: 'Chưa cần' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    await waitFor(() =>
      expect(quotaService.rejectRequest).toHaveBeenCalledWith('rq-1', 'Chưa cần'),
    );
  });

  it('duyệt yêu cầu không cần ghi chú, cấp đúng mức xin', async () => {
    vi.mocked(quotaService.approveRequest).mockResolvedValue({ ...pending, status: 'Approved' });
    renderAt('/admin?tab=resources&view=requests');
    await screen.findByText('Thêm chương mới');
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Duyệt' }));
    await waitFor(() =>
      expect(quotaService.approveRequest).toHaveBeenCalledWith('rq-1', null, null),
    );
  });

  it('duyệt với mức khác mức xin gửi grantedQuota', async () => {
    vi.mocked(quotaService.approveRequest).mockResolvedValue({ ...pending, status: 'Approved' });
    renderAt('/admin?tab=resources&view=requests');
    await screen.findByText('Thêm chương mới');
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Mức cấp/), { target: { value: '15' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Duyệt' }));
    await waitFor(() =>
      expect(quotaService.approveRequest).toHaveBeenCalledWith('rq-1', 15 * GB, null),
    );
  });
});
