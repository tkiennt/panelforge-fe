// src/services/payment.service.ts
// Hợp đồng API khớp với WorkspacePaymentsController + PaymentDtos.cs (backend .NET 9).
import axiosClient from '../api/axiosClient';
import type { PagedResult } from './chapter.service';

/** WorkspacePaymentsSummaryDto */
export interface WorkspacePaymentSummaryDto {
  totalRevenueVnd: number;
  pendingCount: number;
  totalUnlockedChapters: number;
  paidTransactionsCount: number;
}

export type PaymentTransactionType = 'Topup' | 'ChapterUnlock' | 'VipSubscription';
export type PaymentTransactionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';
export type PaymentStatusFilter = 'All' | 'Pending' | 'Approved' | 'Rejected';

/** WorkspacePaymentItemDto */
export interface PaymentTransactionDto {
  id: string;
  orderCode: string;
  readerName: string;
  readerEmail: string;
  readerAvatarUrl?: string | null;
  type: PaymentTransactionType;
  seriesId?: string | null;
  seriesTitle?: string | null;
  chapterId?: string | null;
  chapterNumber?: number | null;
  chapterTitle?: string | null;
  amountVnd: number;
  status: PaymentTransactionStatus;
  qrImageUrl: string;
  createdAt: string;
  confirmedAt?: string | null;
  confirmedByName?: string | null;
  rejectionReason?: string | null;
}

/** WorkspacePaymentsResponseDto (raw shape returned by the API) */
export interface WorkspacePaymentsResponseDto {
  summary: WorkspacePaymentSummaryDto;
  transactions: PagedResult<PaymentTransactionDto>;
}

/** Flattened shape consumed by the UI. */
export interface WorkspacePaymentsPagedResult extends PagedResult<PaymentTransactionDto> {
  summary: WorkspacePaymentSummaryDto;
}

/** WorkspaceBankSettingsDto */
export interface WorkspaceBankSettingsDto {
  workspaceId?: string;
  bankBin?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
}

/** UpdateWorkspaceBankSettingsRequest */
export interface UpdateWorkspaceBankSettingsRequest {
  bankBin: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
}

export interface GetPaymentsParams {
  status?: PaymentStatusFilter;
  seriesId?: string;
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

const EMPTY_SUMMARY: WorkspacePaymentSummaryDto = {
  totalRevenueVnd: 0,
  pendingCount: 0,
  totalUnlockedChapters: 0,
  paidTransactionsCount: 0,
};

export const paymentService = {
  /** GET /api/workspaces/{workspaceId}/payments — KPI tổng quan + danh sách giao dịch VietQR. */
  async getPayments(
    workspaceId: string,
    params?: GetPaymentsParams,
  ): Promise<WorkspacePaymentsPagedResult> {
    const query = { ...params, status: params?.status === 'All' ? undefined : params?.status };
    const res = await axiosClient.get<WorkspacePaymentsResponseDto>(
      `/api/workspaces/${workspaceId}/payments`,
      { params: query },
    );
    const page = res.data?.transactions;
    return {
      items: page?.items ?? [],
      totalCount: page?.totalCount ?? 0,
      pageIndex: page?.pageIndex ?? params?.pageIndex ?? 1,
      pageSize: page?.pageSize ?? params?.pageSize ?? 20,
      totalPages: Math.max(1, page?.totalPages ?? 1),
      summary: res.data?.summary ?? EMPTY_SUMMARY,
    };
  },

  /** POST /api/workspaces/{workspaceId}/payments/{transactionId}/approve */
  async approvePayment(workspaceId: string, transactionId: string): Promise<{ message: string }> {
    const res = await axiosClient.post<{ message: string }>(
      `/api/workspaces/${workspaceId}/payments/${transactionId}/approve`,
      {},
    );
    return res.data;
  },

  /** POST /api/workspaces/{workspaceId}/payments/{transactionId}/reject — body: RejectPaymentRequest */
  async rejectPayment(
    workspaceId: string,
    transactionId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const res = await axiosClient.post<{ message: string }>(
      `/api/workspaces/${workspaceId}/payments/${transactionId}/reject`,
      { reason: reason?.trim() || null },
    );
    return res.data;
  },

  /** GET /api/workspaces/{workspaceId}/payments/bank-settings */
  async getBankSettings(workspaceId: string): Promise<WorkspaceBankSettingsDto> {
    const res = await axiosClient.get<WorkspaceBankSettingsDto>(
      `/api/workspaces/${workspaceId}/payments/bank-settings`,
    );
    return res.data;
  },

  /** PUT /api/workspaces/{workspaceId}/payments/bank-settings */
  async updateBankSettings(
    workspaceId: string,
    settings: UpdateWorkspaceBankSettingsRequest,
  ): Promise<WorkspaceBankSettingsDto> {
    const res = await axiosClient.put<WorkspaceBankSettingsDto>(
      `/api/workspaces/${workspaceId}/payments/bank-settings`,
      settings,
    );
    return res.data;
  },
};

/** Bỏ dấu tiếng Việt + viết hoa — định dạng tên chủ tài khoản ngân hàng / VietQR. */
export function toBankAccountName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/** Ảnh VietQR (img.vietqr.io, template compact2). */
export function buildVietQrImageUrl(opts: {
  bankBin: string;
  bankAccountNo: string;
  amount: number;
  addInfo: string;
  accountName: string;
}): string {
  const { bankBin, bankAccountNo, amount, addInfo, accountName } = opts;
  return `https://img.vietqr.io/image/${encodeURIComponent(bankBin)}-${encodeURIComponent(
    bankAccountNo,
  )}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(
    accountName,
  )}`;
}
