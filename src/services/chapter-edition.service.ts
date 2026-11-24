// src/services/chapter-edition.service.ts
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

export type EditionStatus = 'Draft' | 'InReview' | 'EditorApproved' | 'Approved' | 'Published';

export interface ChapterEditionDto {
  id: string;
  chapterId: string;
  languageCode: string;
  status: EditionStatus;
  isPaid: boolean;
  priceVnd: number;
  freePreviewPages: number;
  currentSnapshotId?: string | null;
  translatorUserId?: string | null;
  translatorName?: string | null;
  approvedAt?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  publishedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt?: string | null;
  /** D4: Publisher đã chốt Free/Trả phí (Producer chỉ xem). */
  isMonetizationConfigured?: boolean;
}

export interface ReviewEditionRequest {
  action: 'Approve' | 'RequestChange' | 1 | 2;
  comment?: string;
}

export interface ReopenEditionRequest {
  reason: string;
}

function extractError(err: any, defaultMsg: string): string {
  const details = err.response?.data?.details;
  const msg = err.response?.data?.error || err.response?.data?.message || err.message || defaultMsg;
  if (Array.isArray(details) && details.length > 0) {
    return `${msg}: ${details.join(', ')}`;
  }
  return msg;
}

export const chapterEditionService = {
  getChapterEditions: async (chapterId: string): Promise<ChapterEditionDto[]> => {
    try {
      const res = await axiosClient.get(`/chapters/${chapterId}/editions`);
      return res.data;
    } catch (err: any) {
      throw new Error(
        extractError(err, translate('errors.services.chapterEdition.getEditionsFailed')),
      );
    }
  },

  submitEditionTranslation: async (chapterId: string, lang: string): Promise<ChapterEditionDto> => {
    try {
      const res = await axiosClient.post(`/chapters/${chapterId}/editions/${lang}/submit`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, translate('errors.services.chapterEdition.submitFailed')));
    }
  },

  reviewEdition: async (
    chapterId: string,
    lang: string,
    req: ReviewEditionRequest,
  ): Promise<ChapterEditionDto> => {
    try {
      const actionNumber = req.action === 'Approve' || req.action === 1 ? 1 : 2;
      const res = await axiosClient.post(`/chapters/${chapterId}/editions/${lang}/review`, {
        action: actionNumber,
        comment: req.comment,
      });
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, translate('errors.services.chapterEdition.reviewFailed')));
    }
  },

  approveEdition: async (chapterId: string, lang: string): Promise<ChapterEditionDto> => {
    try {
      const res = await axiosClient.post(`/chapters/${chapterId}/editions/${lang}/approve`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, translate('errors.services.chapterEdition.approveFailed')));
    }
  },

  publishEdition: async (chapterId: string, lang: string): Promise<ChapterEditionDto> => {
    try {
      const res = await axiosClient.post(`/chapters/${chapterId}/editions/${lang}/publish`);
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, translate('errors.services.chapterEdition.publishFailed')));
    }
  },

  reopenEdition: async (
    chapterId: string,
    lang: string,
    reqOrReason: string | ReopenEditionRequest,
  ): Promise<ChapterEditionDto> => {
    try {
      const reason = typeof reqOrReason === 'string' ? reqOrReason : reqOrReason.reason;
      const res = await axiosClient.post(`/chapters/${chapterId}/editions/${lang}/reopen`, {
        reason,
      });
      return res.data;
    } catch (err: any) {
      throw new Error(extractError(err, translate('errors.services.chapterEdition.reopenFailed')));
    }
  },
};
