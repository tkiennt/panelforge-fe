// src/services/payment.service.ts
// Hợp đồng API khớp với WorkspacePaymentsController, PlatformPaymentsController + PaymentDtos.cs (backend .NET 9).
import axiosClient from '../api/axiosClient';
import type { PagedResult } from './chapter.service';

/** WorkspacePaymentsSummaryDto */
export interface WorkspacePaymentSummaryDto {
  totalRevenueVnd: number;
  totalTopupsVnd: number;
  totalUnlockRevenueVnd: number;
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

/** PlatformBankAccountDto — tài khoản ngân hàng nền tảng nhận mọi tiền VietQR (Q13). */
export interface PlatformBankAccountDto {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  /** false: chưa cấu hình, server đang dùng SePay:DefaultBank. */
  isConfigured: boolean;
  changedAt?: string | null;
  changedByName?: string | null;
}

/** PlatformBankAccountResponseDto */
export interface PlatformBankAccountResponseDto {
  current: PlatformBankAccountDto;
  history: PlatformBankAccountDto[];
}

/** UpdatePlatformBankAccountRequest — bắt buộc mã 2FA (TOTP 6 số hoặc mã khôi phục). */
export interface UpdatePlatformBankAccountRequest {
  bankBin: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  twoFactorCode: string;
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
  totalTopupsVnd: 0,
  totalUnlockRevenueVnd: 0,
  pendingCount: 0,
  totalUnlockedChapters: 0,
  paidTransactionsCount: 0,
};

export const paymentService = {
  /**
   * KPI + danh sách giao dịch VietQR/Ví. `workspaceId = null`: toàn nền tảng (GET /api/platform/payments, gồm đơn nạp Ví);
   * có workspaceId: GET /api/workspaces/{workspaceId}/payments.
   */
  async getPayments(
    workspaceId: string | null,
    params?: GetPaymentsParams,
  ): Promise<WorkspacePaymentsPagedResult> {
    const query = { ...params, status: params?.status === 'All' ? undefined : params?.status };
    const res = await axiosClient.get<WorkspacePaymentsResponseDto>(
      workspaceId ? `/workspaces/${workspaceId}/payments` : '/platform/payments',
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

  /** POST /platform/payments/{transactionId}/approve — Publisher duyệt giao dịch của mọi Studio. */
  async approvePayment(transactionId: string): Promise<{ message: string }> {
    const res = await axiosClient.post<{ message: string }>(
      `/platform/payments/${transactionId}/approve`,
      {},
    );
    return res.data;
  },

  /** POST /platform/payments/{transactionId}/reject — body: RejectPaymentRequest */
  async rejectPayment(transactionId: string, reason?: string): Promise<{ message: string }> {
    const res = await axiosClient.post<{ message: string }>(
      `/platform/payments/${transactionId}/reject`,
      { reason: reason?.trim() || null },
    );
    return res.data;
  },

  /** GET /platform/payments/bank-account — tài khoản nhận tiền đang dùng + lịch sử. */
  async getPlatformBankAccount(): Promise<PlatformBankAccountResponseDto> {
    const res = await axiosClient.get<PlatformBankAccountResponseDto>(
      '/platform/payments/bank-account',
    );
    return res.data;
  },

  /** PUT /platform/payments/bank-account — chỉ Publisher, bắt buộc mã 2FA. */
  async updatePlatformBankAccount(
    request: UpdatePlatformBankAccountRequest,
  ): Promise<PlatformBankAccountDto> {
    const res = await axiosClient.put<PlatformBankAccountDto>(
      '/platform/payments/bank-account',
      request,
    );
    return res.data;
  },
};

export const POPULAR_VIETNAM_BANKS = [
  { bin: '970422', code: 'MB', name: 'MB Bank' },
  { bin: '970436', code: 'VCB', name: 'Vietcombank' },
  { bin: '970407', code: 'TCB', name: 'Techcombank' },
  { bin: '970416', code: 'ACB', name: 'ACB' },
  { bin: '970418', code: 'BIDV', name: 'BIDV' },
  { bin: '970415', code: 'CTG', name: 'VietinBank' },
  { bin: '970423', code: 'TPB', name: 'TPBank' },
  { bin: '970432', code: 'VPB', name: 'VPBank' },
  { bin: '970405', code: 'VBA', name: 'Agribank' },
  { bin: '970403', code: 'STB', name: 'Sacombank' },
  { bin: '970448', code: 'OCB', name: 'OCB' },
  { bin: '970443', code: 'SHB', name: 'SHB' },
  { bin: '970437', code: 'HDB', name: 'HDBank' },
  { bin: '970441', code: 'VIB', name: 'VIB' },
];

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

// ─── Ngôn ngữ bản phát hành (ContentLanguages) ───────────────────────────────

/** vi = bản gốc Studio; en = bản dịch. */
export type ContentLanguage = 'vi' | 'en';
export const CONTENT_LANGUAGES: ContentLanguage[] = ['vi', 'en'];
export const TRANSLATION_LANGUAGES: ContentLanguage[] = ['en'];

// ─── Publisher: Manage chương (PublisherMonetizationController) ──────────────

/**
 * ChapterLanguageStatusDto — một ấn bản ngôn ngữ của chương kèm quy định thương mại do Publisher đặt (BR-33).
 * Mỗi ấn bản có loại Free/Trả phí, giá VNĐ và N trang đầu xem trước riêng.
 */
export interface ChapterLanguageStatusDto {
  language: ContentLanguage;
  translatedPages: number;
  /** Ấn bản đã phát hành cho Reader. */
  isAvailable: boolean;
  /** Trạng thái ấn bản (Draft | InReview | EditorApproved | Approved | Published); null = chưa có ấn bản. */
  editionStatus?: string | null;
  /** D4: Publisher đã chốt Free/Trả phí; false → chưa được phát hành / hẹn giờ. */
  isMonetizationConfigured: boolean;
  isPaid: boolean;
  priceVnd: number;
  /** N trang đầu người chưa mua được xem (Free = 0). */
  freePreviewPages: number;
}

/** ManagedPageDto */
export interface ManagedPageDto {
  pageId: string;
  pageNumber: number;
  imageUrls: Partial<Record<ContentLanguage, string | null>>;
}

/** ChapterManageDto */
export interface ChapterManageDto {
  chapterId: string;
  seriesId: string;
  chapterNumber: number;
  title?: string | null;
  isPublished: boolean;
  languages: ChapterLanguageStatusDto[];
  pages: ManagedPageDto[];
  minPriceVnd: number;
  maxPriceVnd: number;
}

/** SetEditionMonetizationRequest (BR-33 / D4). */
export interface SetEditionMonetizationRequest {
  isPaid: boolean;
  /** Trả phí: giá VNĐ nguyên trong [minPriceVnd, maxPriceVnd]. Free: 0. */
  priceVnd: number;
  /** Trả phí: 0 ≤ N < tổng số trang. Free: bỏ qua. */
  freePreviewPages: number;
  /** Bắt buộc khi đổi loại hoặc giá của ấn bản đã phát hành. */
  reason?: string;
}

// ─── Publisher: dashboard series ─────────────────────────────────────────────

/** InsightStatsDto */
export interface InsightStatsDto {
  views: number;
  uniqueReaders: number;
  chapterPurchases: number;
  purchases: number;
  revenueVnd: number;
  ratingAverage: number;
  ratingCount: number;
}

/** ChapterInsightDto */
export interface ChapterInsightDto {
  chapterId: string;
  chapterNumber: number;
  title?: string | null;
  status: string;
  isPublished: boolean;
  isLocked: boolean;
  priceVnd: number;
  pageCount: number;
  /** Số trang xem trước hiệu lực (chỉ có tác dụng với chương trả phí). */
  previewPages: number;
  availableLanguages: ContentLanguage[];
  stats: InsightStatsDto;
}

/** SeriesInsightsDto */
export interface SeriesInsightsDto {
  seriesId: string;
  title: string;
  coverUrl?: string | null;
  workspaceId: string;
  workspaceName: string;
  language?: ContentLanguage | null;
  totals: InsightStatsDto;
  byLanguage: { language: ContentLanguage; stats: InsightStatsDto }[];
  chapters: ChapterInsightDto[];
}

// ─── Doanh thu Publisher / lượt đọc Producer ─────────────────────────────────

/** PublisherSeriesRevenueDto */
export interface PublisherSeriesRevenueDto {
  seriesId: string;
  seriesTitle: string;
  coverUrl?: string | null;
  workspaceId: string;
  workspaceName: string;
  totalRevenueVnd: number;
  chapterRevenueVnd: number;
  pendingCount: number;
  chapterUnlocks: number;
  totalViews: number;
  uniqueReaders: number;
}

/** PublisherRevenueDto */
export interface PublisherRevenueDto {
  summary: {
    totalRevenueVnd: number;
    chapterRevenueVnd: number;
    pendingCount: number;
    totalViews: number;
    topupRevenueVnd?: number;
  };
  series: PublisherSeriesRevenueDto[];
}

/** ChapterReaderStatsDto */
export interface ChapterReaderStatsDto {
  chapterId: string;
  chapterNumber: number;
  title?: string | null;
  isPublished: boolean;
  views: number;
  uniqueReaders: number;
}

/** SeriesReaderStatsDto */
export interface SeriesReaderStatsDto {
  seriesId: string;
  title: string;
  views: number;
  uniqueReaders: number;
  chapters: ChapterReaderStatsDto[];
}

/** WorkspaceReaderStatsDto */
export interface WorkspaceReaderStatsDto {
  totalViews: number;
  totalUniqueReaders: number;
  series: SeriesReaderStatsDto[];
}

export const monetizationService = {
  /** GET /api/publisher/series/{seriesId}/insights?language= (Publisher) — language undefined = tất cả. */
  async getSeriesInsights(
    seriesId: string,
    language?: ContentLanguage,
  ): Promise<SeriesInsightsDto> {
    const res = await axiosClient.get<SeriesInsightsDto>(`/publisher/series/${seriesId}/insights`, {
      params: language ? { language } : undefined,
    });
    return res.data;
  },

  /** GET /publisher/chapters/{chapterId}/manage */
  async getChapterManage(chapterId: string): Promise<ChapterManageDto> {
    const res = await axiosClient.get<ChapterManageDto>(`/publisher/chapters/${chapterId}/manage`);
    return res.data;
  },

  /**
   * PUT /publisher/chapters/{chapterId}/editions/{lang}/monetization — BR-33 / D4 (SetEditionMonetization):
   * loại Free/Trả phí, giá và N trang đầu xem trước của một ấn bản. Chỉ tài khoản Publisher.
   */
  async setEditionMonetization(
    chapterId: string,
    language: ContentLanguage,
    body: SetEditionMonetizationRequest,
  ): Promise<ChapterManageDto> {
    const res = await axiosClient.put<ChapterManageDto>(
      `/publisher/chapters/${chapterId}/editions/${language}/monetization`,
      body,
    );
    return res.data;
  },

  /** POST /chapters/{chapterId}/editions/{lang}/publish — phát hành ấn bản dịch đã được nghiệm thu (Approved). */
  async publishLanguageEdition(chapterId: string, language: ContentLanguage): Promise<void> {
    await axiosClient.post(`/chapters/${chapterId}/editions/${language}/publish`, {});
  },

  /** GET /api/publisher/revenue (Publisher/Admin) */
  async getPublisherRevenue(params?: {
    workspaceId?: string;
    search?: string;
  }): Promise<PublisherRevenueDto> {
    const res = await axiosClient.get<PublisherRevenueDto>('/publisher/revenue', { params });
    return res.data;
  },

  /** GET /workspaces/{workspaceId}/reader-stats (Producer) */
  async getReaderStats(workspaceId: string): Promise<WorkspaceReaderStatsDto> {
    const res = await axiosClient.get<WorkspaceReaderStatsDto>(
      `/workspaces/${workspaceId}/reader-stats`,
    );
    return res.data;
  },
};
