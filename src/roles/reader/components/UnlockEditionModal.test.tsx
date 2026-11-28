import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnlockEditionModal } from './UnlockEditionModal';
import { walletService, WalletApiError } from '@/services/wallet.service';

vi.mock('@/services/wallet.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/wallet.service')>();
  return {
    ...actual,
    walletService: { getMyWallet: vi.fn(), unlockChapter: vi.fn() },
  };
});

const target = { chapterId: 'chap-1', language: 'en', priceVnd: 5000 };
const wallet = (balanceVnd: number) => ({ balanceVnd, unlockedChapterIds: [], transactions: [] });

const renderModal = (overrides: Partial<React.ComponentProps<typeof UnlockEditionModal>> = {}) => {
  const props = {
    target,
    isSignedIn: true,
    onClose: vi.fn(),
    onChanged: vi.fn(),
    onLogin: vi.fn(),
    onTopup: vi.fn(),
    ...overrides,
  };
  render(<UnlockEditionModal {...props} />);
  return props;
};

describe('UnlockEditionModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unlocks the edition with the shown price and reloads the chapter', async () => {
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet(8000));
    vi.mocked(walletService.unlockChapter).mockResolvedValue({
      chapterId: 'chap-1',
      success: true,
      remainingBalanceVnd: 3000,
    });
    const props = renderModal();
    const button = await screen.findByRole('button', { name: /Mở khóa ·/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() =>
      expect(walletService.unlockChapter).toHaveBeenCalledWith({
        chapterId: 'chap-1',
        language: 'en',
        expectedPriceVnd: 5000,
      }),
    );
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it('offers a top-up of exactly the shortfall when the wallet is short', async () => {
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet(2000));
    const props = renderModal();
    fireEvent.click(await screen.findByRole('button', { name: /Nạp thêm/ }));
    expect(props.onTopup).toHaveBeenCalledWith(3000);
    expect(walletService.unlockChapter).not.toHaveBeenCalled();
  });

  it('asks to reload when the price changed (409)', async () => {
    vi.mocked(walletService.getMyWallet).mockResolvedValue(wallet(8000));
    vi.mocked(walletService.unlockChapter).mockRejectedValue(
      new WalletApiError('Giá vừa thay đổi', 409, 'PRICE_CHANGED'),
    );
    const props = renderModal();
    const button = await screen.findByRole('button', { name: /Mở khóa ·/ });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.click(await screen.findByRole('button', { name: /Tải lại giá mới/ }));
    expect(screen.queryByText('Giá vừa thay đổi')).toBeNull();
    expect(props.onChanged).toHaveBeenCalled();
  });

  it('asks a guest to log in', () => {
    const props = renderModal({ isSignedIn: false });
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập để mở khóa/ }));
    expect(props.onLogin).toHaveBeenCalled();
    expect(walletService.getMyWallet).not.toHaveBeenCalled();
  });
});
