import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReaderOpenStudioView } from './ReaderOpenStudioView';
import { walletService, WalletApiError } from '@/services/wallet.service';

vi.mock('@/services/wallet.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/wallet.service')>();
  return {
    ...actual,
    walletService: {
      getMyWallet: vi.fn(),
      getStudioPackage: vi.fn(),
      purchaseStudioPackage: vi.fn(),
    },
  };
});

const wallet = (balanceVnd: number) => ({ balanceVnd, unlockedChapterIds: [], transactions: [] });

const renderView = ({
  isSignedIn = true,
  canCreateStudio = false,
}: { isSignedIn?: boolean; canCreateStudio?: boolean } = {}) => {
  const onStudioUnlocked = vi.fn();
  const requestLogin = vi.fn();
  render(
    <MemoryRouter initialEntries={['/catalog/open-studio']}>
      <Routes>
        <Route path='/catalog' element={<Outlet context={{ isSignedIn, requestLogin }} />}>
          <Route
            path='open-studio'
            element={
              <ReaderOpenStudioView
                canCreateStudio={canCreateStudio}
                onStudioUnlocked={onStudioUnlocked}
              />
            }
          />
          <Route path='wallet' element={<p>wallet page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return { onStudioUnlocked, requestLogin };
};

describe('ReaderOpenStudioView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(walletService.getStudioPackage).mockResolvedValue({
      isOnSale: true,
      priceVnd: 100_000,
    });
  });

  it('buys the package at the shown price after confirming, then opens studio creation', async () => {
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet(150_000));
    vi.mocked(walletService.purchaseStudioPackage).mockResolvedValue({
      priceVnd: 100_000,
      remainingBalanceVnd: 50_000,
      orderCode: 'PF1',
      canCreateStudio: true,
    });
    const { onStudioUnlocked } = renderView();

    fireEvent.click(await screen.findByRole('button', { name: /Mua gói ·/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mua gói' }));

    await waitFor(() => expect(walletService.purchaseStudioPackage).toHaveBeenCalledWith(100_000));
    await waitFor(() => expect(onStudioUnlocked).toHaveBeenCalled());
  });

  it('sends a short wallet to top-up with exactly the missing amount', async () => {
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet(30_000));
    renderView();

    fireEvent.click(await screen.findByRole('button', { name: /Nạp thêm/ }));

    expect(await screen.findByText('wallet page')).toBeInTheDocument();
    expect(walletService.purchaseStudioPackage).not.toHaveBeenCalled();
  });

  it('offers to reload when the price changed before buying', async () => {
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet(150_000));
    vi.mocked(walletService.purchaseStudioPackage).mockRejectedValue(
      new WalletApiError('Giá gói đã thay đổi', 409, 'PRICE_CHANGED'),
    );
    const { onStudioUnlocked } = renderView();

    fireEvent.click(await screen.findByRole('button', { name: /Mua gói ·/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mua gói' }));

    expect(await screen.findByText('Giá gói đã thay đổi')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại giá mới' }));
    await waitFor(() => expect(walletService.getStudioPackage).toHaveBeenCalledTimes(2));
    expect(onStudioUnlocked).not.toHaveBeenCalled();
  });

  it('hides the buy button while the package is not on sale', async () => {
    vi.mocked(walletService.getStudioPackage).mockResolvedValue({
      isOnSale: false,
      priceVnd: null,
    });
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet(150_000));
    renderView();

    expect(await screen.findByText(/chưa mở bán/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mua gói/ })).not.toBeInTheDocument();
  });

  it('asks guests to log in instead of loading a wallet', async () => {
    const { requestLogin } = renderView({ isSignedIn: false });

    fireEvent.click(await screen.findByRole('button', { name: 'Đăng nhập để mua' }));

    expect(requestLogin).toHaveBeenCalled();
    expect(walletService.getMyWallet).not.toHaveBeenCalled();
  });

  it('does not sell again to an account that can already create a studio', async () => {
    const { onStudioUnlocked } = renderView({ canCreateStudio: true });

    fireEvent.click(await screen.findByRole('button', { name: 'Tạo Studio' }));

    expect(onStudioUnlocked).toHaveBeenCalled();
    expect(walletService.getMyWallet).not.toHaveBeenCalled();
  });
});
