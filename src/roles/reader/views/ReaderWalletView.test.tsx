import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderWalletView } from './ReaderWalletView';
import { TOPUP_MAX_VND, walletService } from '@/services/wallet.service';

vi.mock('@/services/wallet.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/wallet.service')>();
  return {
    ...actual,
    walletService: {
      getMyWallet: vi.fn(),
      createTopup: vi.fn(),
      getTransactionStatus: vi.fn(),
    },
  };
});

const order = {
  orderId: 'ord-1',
  amountVnd: 50_000,
  qrCodeUrl: null,
  transferContent: 'PF ord-1',
  isCompleted: false,
  status: 'Pending',
};
const pending = { orderCode: 'ord-1', status: 'Pending', isCompleted: false, amountVnd: 50_000 };

const renderView = (path = '/catalog/wallet') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ReaderWalletView />
    </MemoryRouter>,
  );

const flush = () => act(async () => undefined);

describe('ReaderWalletView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.mocked(walletService.getMyWallet).mockResolvedValue({
      balanceVnd: 0,
      unlockedChapterIds: [],
      transactions: [],
    });
    vi.mocked(walletService.createTopup).mockResolvedValue(order);
    vi.mocked(walletService.getTransactionStatus).mockResolvedValue(pending);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const createOrder = async () => {
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '50000' } });
    fireEvent.submit(screen.getByRole('spinbutton').closest('form')!);
    await flush();
  };

  it('stops asking for the order status after leaving the page', async () => {
    const { unmount } = renderView();
    await flush();
    await createOrder();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(walletService.getTransactionStatus).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(walletService.getTransactionStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps the pending order when coming back to the wallet page', async () => {
    const first = renderView();
    await flush();
    await createOrder();
    first.unmount();

    renderView();
    await flush();
    expect(screen.getByText('PF ord-1')).toBeInTheDocument();
  });

  it('shows a status-check error and stops after the polling limit', async () => {
    vi.mocked(walletService.getTransactionStatus).mockRejectedValue(new Error('offline'));
    renderView();
    await flush();
    await createOrder();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.getByText(/offline/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(16 * 60 * 1000);
    });
    const calls = vi.mocked(walletService.getTransactionStatus).mock.calls.length;
    expect(screen.getByRole('button', { name: 'Kiểm tra lại' })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(walletService.getTransactionStatus).toHaveBeenCalledTimes(calls);
  });

  it('caps a suggested top-up amount at the maximum', async () => {
    renderView(`/catalog/wallet?amount=${TOPUP_MAX_VND * 10}`);
    await flush();
    expect(screen.getByRole('spinbutton')).toHaveValue(TOPUP_MAX_VND);
  });
});
