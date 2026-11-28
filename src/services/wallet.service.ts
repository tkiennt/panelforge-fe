// src/services/wallet.service.ts — Ví VNĐ của độc giả (BR-33): số dư, nạp VietQR, mở khóa ấn bản.
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

export interface WalletTransactionDto {
  id: string;
  title: string;
  amountVnd: number;
  createdAt: string;
  balanceAfter: number;
  orderCode?: string;
}

export interface UserWalletDto {
  balanceVnd: number;
  unlockedChapterIds: string[];
  transactions: WalletTransactionDto[];
}

export interface TopupResponseDto {
  orderId: string;
  amountVnd: number;
  qrCodeUrl?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  transferContent?: string | null;
  isCompleted: boolean;
  status: string;
}

export interface TransactionStatusDto {
  orderCode: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | string;
  isCompleted: boolean;
  amountVnd: number;
  confirmedAt?: string | null;
  rejectionReason?: string | null;
}

export interface UnlockChapterResponseDto {
  chapterId: string;
  success: boolean;
  remainingBalanceVnd: number;
  message?: string | null;
}

/** Lỗi từ API Ví kèm mã HTTP: 400 thiếu tiền, 409 giá đã đổi, 404 ấn bản chưa phát hành. */
export class WalletApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'WalletApiError';
  }
}

function toWalletError(error: any, fallbackKey: string): WalletApiError {
  const data = error?.response?.data;
  return new WalletApiError(
    data?.message || data?.error || translate(fallbackKey),
    error?.response?.status,
    data?.code,
  );
}

/** Gói mở Studio đang bán (spec D11); `priceVnd` null khi Admin chưa đặt giá. */
export interface StudioPackageDto {
  isOnSale: boolean;
  priceVnd: number | null;
}

export interface PurchaseStudioPackageResponseDto {
  priceVnd: number;
  remainingBalanceVnd: number;
  orderCode: string;
  canCreateStudio: boolean;
}

export const TOPUP_MIN_VND = 1_000;
export const TOPUP_MAX_VND = 50_000_000;

export const walletService = {
  /** GET /api/wallet/me */
  getMyWallet: async (): Promise<UserWalletDto> => {
    try {
      const { data } = await axiosClient.get('/wallet/me');
      return {
        balanceVnd: data?.balanceVnd ?? 0,
        unlockedChapterIds: data?.unlockedChapterIds ?? [],
        transactions: data?.transactions ?? [],
      };
    } catch (error) {
      throw toWalletError(error, 'errors.services.wallet.loadFailed');
    }
  },

  /** POST /api/wallet/topup — đơn nạp VietQR vào tài khoản nền tảng (Q13). */
  createTopup: async (amountVnd: number): Promise<TopupResponseDto> => {
    try {
      const { data } = await axiosClient.post('/wallet/topup', {
        amountVnd,
        paymentMethod: 'vietqr',
        purpose: 'Topup',
      });
      return data;
    } catch (error) {
      throw toWalletError(error, 'errors.services.wallet.topupFailed');
    }
  },

  /** GET /api/wallet/transactions/{orderCode}/status */
  getTransactionStatus: async (orderCode: string): Promise<TransactionStatusDto> => {
    try {
      const { data } = await axiosClient.get(
        `/wallet/transactions/${encodeURIComponent(orderCode)}/status`,
      );
      return data;
    } catch (error) {
      throw toWalletError(error, 'errors.services.wallet.statusFailed');
    }
  },

  /**
   * POST /api/wallet/unlock-chapter — trừ Ví, mở khóa đúng ấn bản ngôn ngữ (BR-33, BR-34).
   * Gửi giá đang hiển thị để server từ chối (409) nếu Publisher vừa đổi giá.
   */
  unlockChapter: async (params: {
    chapterId: string;
    language: string;
    expectedPriceVnd: number;
  }): Promise<UnlockChapterResponseDto> => {
    try {
      const { data } = await axiosClient.post('/wallet/unlock-chapter', params);
      return data;
    } catch (error) {
      throw toWalletError(error, 'errors.services.wallet.unlockFailed');
    }
  },

  /** GET /api/catalog/studio-package — giá gói mở Studio, xem được khi chưa đăng nhập. */
  getStudioPackage: async (): Promise<StudioPackageDto> => {
    try {
      const { data } = await axiosClient.get('/catalog/studio-package');
      return { isOnSale: !!data?.isOnSale, priceVnd: data?.priceVnd ?? null };
    } catch (error) {
      throw toWalletError(error, 'errors.services.wallet.studioPackageLoadFailed');
    }
  },

  /**
   * POST /api/wallet/studio-package — mua gói mở Studio bằng Ví (D11). Gửi giá đang hiển thị:
   * 409 PRICE_CHANGED khi Admin vừa đổi giá, 409 ALREADY_OWNED khi đã có quyền tạo Studio.
   */
  purchaseStudioPackage: async (
    expectedPriceVnd: number,
  ): Promise<PurchaseStudioPackageResponseDto> => {
    try {
      const { data } = await axiosClient.post('/wallet/studio-package', { expectedPriceVnd });
      return data;
    } catch (error) {
      throw toWalletError(error, 'errors.services.wallet.studioPackagePurchaseFailed');
    }
  },
};
