import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublisherBankSettingsView } from './PublisherBankSettingsView';
import { paymentService, type PlatformBankAccountDto } from '@/services/payment.service';

vi.mock('@/services/payment.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/payment.service')>();
  return {
    ...actual,
    paymentService: {
      getPlatformBankAccount: vi.fn(),
      updatePlatformBankAccount: vi.fn(),
      getPayments: vi.fn(),
    },
  };
});

const MOON: PlatformBankAccountDto = {
  bankBin: '970422',
  bankName: 'MB Bank',
  accountNo: '0123456789',
  accountName: 'PANELFORGE JSC',
  isConfigured: true,
  changedAt: '2026-11-28T04:00:00Z',
  changedByName: 'Phát Hành',
};

const renderView = (path = '/publisher/revenue/payments') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path='/publisher/revenue/payments' element={<PublisherBankSettingsView />} />
        <Route
          path='/publisher/revenue/workspaces/:workspaceId'
          element={<PublisherBankSettingsView />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('PublisherBankSettingsView (Q13: tài khoản ngân hàng nền tảng)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tải tài khoản nền tảng đang dùng và lịch sử thay đổi', async () => {
    vi.mocked(paymentService.getPlatformBankAccount).mockResolvedValue({
      current: MOON,
      history: [MOON],
    });

    renderView();

    expect(await screen.findByDisplayValue('0123456789')).toBeInTheDocument();
    expect(screen.getByDisplayValue('PANELFORGE JSC')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử tài khoản nhận tiền')).toBeInTheDocument();
  });

  it('báo đang dùng tài khoản mặc định khi chưa cấu hình', async () => {
    vi.mocked(paymentService.getPlatformBankAccount).mockResolvedValue({
      current: { ...MOON, isConfigured: false, changedAt: null, changedByName: null },
      history: [],
    });

    renderView();

    expect(await screen.findByText(/SePay:DefaultBank/)).toBeInTheDocument();
  });

  it('bắt nhập mã 2FA trước khi lưu và gửi mã cùng tài khoản mới', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentService.getPlatformBankAccount).mockResolvedValue({
      current: { ...MOON, isConfigured: false },
      history: [],
    });
    vi.mocked(paymentService.updatePlatformBankAccount).mockResolvedValue({
      ...MOON,
      accountNo: '9876543210',
      accountName: 'PANELFORGE SUN',
    });

    renderView();

    await user.type(await screen.findByLabelText(/Số tài khoản/i), '9876543210');
    await user.type(screen.getByLabelText(/Tên chủ tài khoản/i), 'PANELFORGE SUN');

    const saveBtn = screen.getByRole('button', { name: /Lưu cấu hình VietQR/i });
    expect(saveBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/Mã xác thực 2FA/i), '123456');
    expect(saveBtn).toBeEnabled();
    await user.click(saveBtn);

    await waitFor(() => {
      expect(paymentService.updatePlatformBankAccount).toHaveBeenCalledWith({
        bankBin: '970422',
        bankName: 'MB Bank',
        accountNo: '9876543210',
        accountName: 'PANELFORGE SUN',
        twoFactorCode: '123456',
      });
    });
  });

  it('trang toàn nền tảng lấy giao dịch không theo Studio, trang Studio lọc theo Studio', async () => {
    vi.mocked(paymentService.getPlatformBankAccount).mockResolvedValue({
      current: MOON,
      history: [],
    });
    vi.mocked(paymentService.getPayments).mockResolvedValue({
      items: [],
      totalCount: 0,
      pageIndex: 1,
      pageSize: 30,
      totalPages: 1,
      summary: {
        totalRevenueVnd: 15000,
        totalUnlockRevenueVnd: 15000,
        totalTopupsVnd: 100000,
        pendingCount: 0,
        totalUnlockedChapters: 1,
        paidTransactionsCount: 2,
      },
    });

    const { unmount } = renderView();
    expect(await screen.findByTestId('kpi-unlock-revenue')).toHaveTextContent(/15[.,]000 VND/);
    expect(screen.getByTestId('kpi-total-topups')).toHaveTextContent(/100[.,]000 VND/);
    expect(paymentService.getPayments).toHaveBeenCalledWith(null, expect.anything());
    unmount();

    renderView('/publisher/revenue/workspaces/ws-1');
    await waitFor(() =>
      expect(paymentService.getPayments).toHaveBeenCalledWith('ws-1', expect.anything()),
    );
    expect(await screen.findByTestId('kpi-unlock-revenue')).toBeInTheDocument();
    expect(screen.queryByTestId('kpi-total-topups')).not.toBeInTheDocument();
  });
});
