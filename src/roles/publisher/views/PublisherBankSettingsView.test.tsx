import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PublisherBankSettingsView } from './PublisherBankSettingsView';
import { paymentService } from '@/services/payment.service';

vi.mock('@/services/payment.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/payment.service')>();
  return {
    ...actual,
    paymentService: {
      getBankSettings: vi.fn(),
      updateBankSettings: vi.fn(),
      getPayments: vi.fn(),
    },
  };
});

const renderView = () =>
  render(
    <MemoryRouter initialEntries={['/publisher/revenue/workspaces/ws-1']}>
      <Routes>
        <Route
          path='/publisher/revenue/workspaces/:workspaceId'
          element={<PublisherBankSettingsView />}
        />
      </Routes>
    </MemoryRouter>,
  );

describe('PublisherBankSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tải và hiển thị cấu hình tài khoản ngân hàng của Studio', async () => {
    vi.mocked(paymentService.getBankSettings).mockResolvedValue({
      workspaceId: 'ws-1',
      bankBin: '970422',
      bankName: 'MB Bank',
      bankAccountNo: '0123456789',
      bankAccountName: 'STUDIO MOON',
    });

    renderView();

    expect(await screen.findByDisplayValue('0123456789')).toBeInTheDocument();
    expect(screen.getByDisplayValue('STUDIO MOON')).toBeInTheDocument();
  });

  it('lưu cấu hình ngân hàng thành công', async () => {
    const user = userEvent.setup();
    vi.mocked(paymentService.getBankSettings).mockResolvedValue({
      workspaceId: 'ws-1',
      bankBin: '970422',
      bankName: 'MB Bank',
      bankAccountNo: '',
      bankAccountName: '',
    });
    vi.mocked(paymentService.updateBankSettings).mockResolvedValue({
      workspaceId: 'ws-1',
      bankBin: '970422',
      bankName: 'MB Bank',
      bankAccountNo: '9876543210',
      bankAccountName: 'STUDIO SUN',
    });

    renderView();

    const accountNoInput = await screen.findByLabelText(/Số tài khoản/i);
    const accountNameInput = screen.getByLabelText(/Tên chủ tài khoản/i);

    await user.type(accountNoInput, '9876543210');
    await user.type(accountNameInput, 'STUDIO SUN');

    const saveBtn = screen.getByRole('button', { name: /Lưu cấu hình VietQR/i });
    expect(saveBtn).toBeEnabled();
    await user.click(saveBtn);

    await waitFor(() => {
      expect(paymentService.updateBankSettings).toHaveBeenCalledWith('ws-1', {
        bankBin: '970422',
        bankName: 'MB Bank',
        bankAccountNo: '9876543210',
        bankAccountName: 'STUDIO SUN',
      });
    });
  });

  it('hiển thị riêng doanh thu mở khóa và tổng tiền nạp ví', async () => {
    vi.mocked(paymentService.getBankSettings).mockResolvedValue({
      workspaceId: 'ws-1',
      bankBin: '970422',
      bankName: 'MB Bank',
      bankAccountNo: '0123456789',
      bankAccountName: 'STUDIO MOON',
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

    renderView();

    expect(await screen.findByTestId('kpi-unlock-revenue')).toHaveTextContent(/15[.,]000 VND/);
    expect(screen.getByTestId('kpi-total-topups')).toHaveTextContent(/100[.,]000 VND/);
  });
});
