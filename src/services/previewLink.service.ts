import axios from 'axios';
import axiosClient from '@/api/axiosClient';

export type PreviewLinkStatus = 'Active' | 'Expired' | 'Revoked';
export type ReadingDirection = 'RightToLeft' | 'LeftToRight';
export type PreviewFeedbackStatus = 'New' | 'Noted' | 'NeedsChange';

export interface CreatedPreviewLinkDto {
  id: string;
  recipientEmail: string;
  expiresAt: string;
  token: string;
}

export interface PreviewLinkDto {
  id: string;
  chapterId: string;
  recipientEmail: string;
  status: PreviewLinkStatus;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
  chapterVersion: number;
  pageCount: number;
  accessCount: number;
  deniedCount: number;
  lastAccessAt?: string | null;
  feedbackCount: number;
}

export interface PreviewPanelDto {
  panelId: string;
  panelNumber: number;
  boundingBox: string;
}

export interface PreviewPageDto {
  pageId: string;
  pageNumber: number;
  assetReferenceId: string;
  versionNumber: number;
  imageUrl: string;
  panels: PreviewPanelDto[];
}

export interface PreviewChapterDto {
  chapterId: string;
  seriesTitle: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  readingDirection: ReadingDirection;
  recipientEmail: string;
  watermarkText: string;
  expiresAt: string;
  chapterVersion: number;
  pages: PreviewPageDto[];
}

export interface PreviewFeedbackDto {
  id: string;
  previewLinkId: string;
  chapterId: string;
  pageId?: string | null;
  panelId?: string | null;
  assetReferenceId?: string | null;
  chapterVersion: number;
  recipientEmail: string;
  message: string;
  status: PreviewFeedbackStatus;
  triageNote?: string | null;
  triagedByUserId?: string | null;
  triagedAt?: string | null;
  createdAt: string;
  /** Yêu cầu sửa sinh từ phản hồi này (5.7); null = chưa chuyển. */
  changeRequestId?: string | null;
  /** Tên người nhận xét tự khai trên trang review công khai (không bắt buộc). */
  reviewerName?: string | null;
}

export interface CreatePreviewLinkRequest {
  recipientEmail: string;
  expiresInHours?: number;
}

export interface SubmitPreviewFeedbackRequest {
  token: string;
  message: string;
  pageId?: string | null;
  panelId?: string | null;
  reviewerName?: string | null;
}

export interface TriagePreviewFeedbackRequest {
  decision: 'Noted' | 'NeedsChange';
  note?: string;
}

/** description bỏ trống = BE lấy từ nội dung phản hồi + ghi chú triage. */
export interface CreateChangeRequestFromFeedbackRequest {
  assignmentId: string;
  description?: string;
  dueDate?: string;
}

/**
 * Dedicated anonymous Axios instance for Public Preview operations.
 * CRITICAL CONSTRAINT: Must NOT contain Authorization: Bearer headers or session interceptors.
 */
export const anonymousPreviewClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5044/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Helper to resolve relative preview image URLs to full absolute URLs.
 */
export function resolvePreviewImageUrl(relativeUrl: string): string {
  if (!relativeUrl) return '';
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  const rawBase =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5044';
  const cleanBase = rawBase.replace(/\/api\/?$/, '');
  const prefix = cleanBase
    ? cleanBase.endsWith('/')
      ? cleanBase.slice(0, -1)
      : cleanBase
    : typeof window !== 'undefined'
      ? window.location.origin
      : '';
  const cleanRel = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return `${prefix}${cleanRel}`;
}

export const previewLinkService = {
  // ── Studio Management (Bearer Authenticated) ──

  /**
   * Producer tạo link xem thử (chương Approved). Token chỉ trả về MỘT lần duy nhất.
   * POST /api/chapters/{chapterId}/preview-links
   */
  createPreviewLink: async (
    chapterId: string,
    req: CreatePreviewLinkRequest,
  ): Promise<CreatedPreviewLinkDto> => {
    const res = await axiosClient.post<CreatedPreviewLinkDto>(
      `/chapters/${chapterId}/preview-links`,
      req,
    );
    return res.data;
  },

  /**
   * Lấy danh sách link + thống kê truy cập (Producer, Editor).
   * GET /api/chapters/{chapterId}/preview-links
   */
  getPreviewLinks: async (chapterId: string): Promise<PreviewLinkDto[]> => {
    const res = await axiosClient.get<PreviewLinkDto[]>(`/chapters/${chapterId}/preview-links`);
    return res.data;
  },

  /**
   * Producer thu hồi link trước hạn.
   * POST /api/chapters/{chapterId}/preview-links/{linkId}/revoke
   */
  revokePreviewLink: async (chapterId: string, linkId: string): Promise<void> => {
    await axiosClient.post(`/chapters/${chapterId}/preview-links/${linkId}/revoke`);
  },

  /**
   * Lấy phản hồi từ link xem thử (Producer, Editor).
   * GET /api/chapters/{chapterId}/preview-feedback?status=
   */
  getPreviewFeedback: async (
    chapterId: string,
    status?: PreviewFeedbackStatus,
  ): Promise<PreviewFeedbackDto[]> => {
    const url = `/chapters/${chapterId}/preview-feedback${status ? `?status=${status}` : ''}`;
    const res = await axiosClient.get<PreviewFeedbackDto[]>(url);
    return res.data;
  },

  /**
   * Phân loại & xử lý phản hồi (Triage): Noted | NeedsChange (note bắt buộc khi NeedsChange).
   * POST /api/chapters/{chapterId}/preview-feedback/{feedbackId}/triage
   */
  triagePreviewFeedback: async (
    chapterId: string,
    feedbackId: string,
    req: TriagePreviewFeedbackRequest,
  ): Promise<PreviewFeedbackDto> => {
    const res = await axiosClient.post<PreviewFeedbackDto>(
      `/chapters/${chapterId}/preview-feedback/${feedbackId}/triage`,
      req,
    );
    return res.data;
  },

  /**
   * Phản hồi NeedsChange → yêu cầu sửa (ChangeRequest) của một việc; chương phải đã mở lại.
   * Việc đã duyệt bị trả về làm lại. POST /api/chapters/{chapterId}/preview-feedback/{feedbackId}/change-request
   */
  createChangeRequestFromFeedback: async (
    chapterId: string,
    feedbackId: string,
    req: CreateChangeRequestFromFeedbackRequest,
  ): Promise<PreviewFeedbackDto> => {
    const res = await axiosClient.post<PreviewFeedbackDto>(
      `/chapters/${chapterId}/preview-feedback/${feedbackId}/change-request`,
      req,
    );
    return res.data;
  },

  // ── Anonymous Receiver (NO Bearer Header) ──

  /**
   * Mở nội dung xem thử. Gửi token qua body POST, KHÔNG gửi Bearer.
   * POST /api/preview/open
   */
  openPreview: async (token: string): Promise<PreviewChapterDto> => {
    const res = await anonymousPreviewClient.post<PreviewChapterDto>('/preview/open', { token });
    return res.data;
  },

  /**
   * Gửi phản hồi từ người xem thử. KHÔNG gửi Bearer.
   * POST /api/preview/feedback
   */
  submitFeedback: async (req: SubmitPreviewFeedbackRequest): Promise<PreviewFeedbackDto> => {
    const res = await anonymousPreviewClient.post<PreviewFeedbackDto>('/preview/feedback', req);
    return res.data;
  },
};
