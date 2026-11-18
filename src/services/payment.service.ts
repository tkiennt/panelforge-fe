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
      `/workspaces/${workspaceId}/payments`,
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

  /** POST /workspaces/{workspaceId}/payments/{transactionId}/approve */
  async approvePayment(workspaceId: string, transactionId: string): Promise<{ message: string }> {
    const res = await axiosClient.post<{ message: string }>(
      `/workspaces/${workspaceId}/payments/${transactionId}/approve`,
      {},
    );
    return res.data;
  },

  /** POST /workspaces/{workspaceId}/payments/{transactionId}/reject — body: RejectPaymentRequest */
  async rejectPayment(
    workspaceId: string,
    transactionId: string,
    reason?: string,
  ): Promise<{ message: string }> {
    const res = await axiosClient.post<{ message: string }>(
      `/workspaces/${workspaceId}/payments/${transactionId}/reject`,
      { reason: reason?.trim() || null },
    );
    return res.data;
  },

  /** GET /workspaces/{workspaceId}/payments/bank-settings */
  async getBankSettings(workspaceId: string): Promise<WorkspaceBankSettingsDto> {
    const res = await axiosClient.get<WorkspaceBankSettingsDto>(
      `/workspaces/${workspaceId}/payments/bank-settings`,
    );
    return res.data;
  },

  /** PUT /workspaces/{workspaceId}/payments/bank-settings */
  async updateBankSettings(
    workspaceId: string,
    settings: UpdateWorkspaceBankSettingsRequest,
  ): Promise<WorkspaceBankSettingsDto> {
    const res = await axiosClient.put<WorkspaceBankSettingsDto>(
      `/workspaces/${workspaceId}/payments/bank-settings`,
      settings,
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

/** vi = bản gốc Studio; en/ja = bản dịch Publisher upload ảnh từng trang. */
export type ContentLanguage = 'vi' | 'en' | 'ja';
export const CONTENT_LANGUAGES: ContentLanguage[] = ['vi', 'en', 'ja'];
export const TRANSLATION_LANGUAGES: ContentLanguage[] = ['en', 'ja'];

// ─── Publisher: Manage chương (PublisherMonetizationController) ──────────────

/** ChapterLanguagePriceDto */
export interface ChapterLanguagePriceDto {
  language: ContentLanguage;
  priceVnd: number;
  /** Publisher đặt giá riêng; false = đang dùng giá chung của chương. */
  isCustom: boolean;
}

/** ChapterLanguageStatusDto */
export interface ChapterLanguageStatusDto {
  language: ContentLanguage;
  translatedPages: number;
  /** Bản ngôn ngữ đã phát hành cho Reader (đủ ảnh mọi trang). */
  isAvailable: boolean;
  /** Trạng thái ấn bản ngôn ngữ (Draft | InReview | EditorApproved | Approved | Published). */
  editionStatus?: string | null;
}

/** ManagedPageDto */
export interface ManagedPageDto {
  pageId: string;
  pageNumber: number;
  /**
   * Trang xem trước hiệu lực (sau khi áp mặc định N trang đầu nếu chương chưa chọn tay): người chưa mua chương
   * trả phí vẫn xem được; trang khác khóa đến khi mua cả chương.
   */
  isPreview: boolean;
  imageUrls: Partial<Record<ContentLanguage, string | null>>;
}

/** ChapterManageDto */
export interface ChapterManageDto {
  chapterId: string;
  seriesId: string;
  chapterNumber: number;
  title?: string | null;
  isPublished: boolean;
  chapterIsLocked: boolean;
  basePriceVnd: number;
  /** Publisher đã chọn tay trang xem trước (không theo mặc định bộ truyện). */
  previewPagesCustomized: boolean;
  seriesDefaultPreviewPageCount: number;
  languagePrices: ChapterLanguagePriceDto[];
  languages: ChapterLanguageStatusDto[];
  pages: ManagedPageDto[];
}

/** LanguagePriceItem — priceVnd null/0 = bỏ giá riêng. */
export interface LanguagePriceItem {
  language: ContentLanguage;
  priceVnd: number | null;
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
  defaultPreviewPageCount: number;
}

/** SeriesMonetizationSettingsDto */
export interface SeriesMonetizationSettingsDto {
  seriesId: string;
  defaultPreviewPageCount: number;
  maxDefaultPreviewPageCount: number;
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
    vipRevenueVnd?: number;
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

  /** PUT /publisher/series/{seriesId}/monetization-settings — mặc định N trang đầu xem trước. */
  async updateSeriesSettings(
    seriesId: string,
    body: { defaultPreviewPageCount: number },
  ): Promise<SeriesMonetizationSettingsDto> {
    const res = await axiosClient.put<SeriesMonetizationSettingsDto>(
      `/publisher/series/${seriesId}/monetization-settings`,
      body,
    );
    return res.data;
  },

  /** GET /publisher/chapters/{chapterId}/manage */
  async getChapterManage(chapterId: string): Promise<ChapterManageDto> {
    const res = await axiosClient.get<ChapterManageDto>(`/publisher/chapters/${chapterId}/manage`);
    return res.data;
  },

  /** PUT /publisher/chapters/{chapterId}/preview-pages — chọn trang xem trước (chương chuyển sang chọn tay). */
  async setPreviewPages(chapterId: string, previewPageIds: string[]): Promise<ChapterManageDto> {
    const res = await axiosClient.put<ChapterManageDto>(
      `/publisher/chapters/${chapterId}/preview-pages`,
      { previewPageIds },
    );
    return res.data;
  },

  /** DELETE /publisher/chapters/{chapterId}/preview-pages — quay về mặc định của bộ truyện. */
  async resetPreviewPages(chapterId: string): Promise<ChapterManageDto> {
    const res = await axiosClient.delete<ChapterManageDto>(
      `/publisher/chapters/${chapterId}/preview-pages`,
    );
    return res.data;
  },

  /** PUT /publisher/chapters/{chapterId}/language-prices */
  async setLanguagePrices(
    chapterId: string,
    prices: LanguagePriceItem[],
    options?: { isLocked?: boolean; basePriceVnd?: number },
  ): Promise<ChapterManageDto> {
    const res = await axiosClient.put<ChapterManageDto>(
      `/publisher/chapters/${chapterId}/language-prices`,
      options ? { prices, ...options } : { prices },
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
