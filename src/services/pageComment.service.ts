import axiosClient from '../api/axiosClient';

export type PageCommentStatus = 'Open' | 'Resolved' | 'ConvertedToRework';

export interface PageCommentDto {
  id: string;
  seriesId: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string | null;
  pageId?: string | null;
  pageNumber?: number | null;
  panelId?: string | null;
  panelNumber?: number | null;
  assetReferenceId?: string | null;
  pinX?: number | null;
  pinY?: number | null;
  message: string;
  authorUserId: string;
  authorName: string;
  status: PageCommentStatus;
  resolutionNote?: string | null;
  resolvedByUserId?: string | null;
  resolvedByName?: string | null;
  resolvedAt?: string | null;
  stageTaskId?: string | null;
  stageName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreatePageCommentRequest {
  pageId?: string | null;
  panelId?: string | null;
  assetReferenceId?: string | null;
  pinX?: number | null;
  pinY?: number | null;
  message: string;
}

export interface ResolvePageCommentRequest {
  note?: string | null;
}

export interface ConvertPageCommentToReworkRequest {
  stageTaskId: string;
  reason: string;
}

export interface PageCommentApiError extends Error {
  status?: number;
  code?: string;
}

function toApiError(error: unknown, fallbackMessage: string): PageCommentApiError {
  const errObj = error as {
    message?: string;
    response?: { status?: number; data?: { error?: string; message?: string; code?: string } };
  };
  const data = errObj?.response?.data;
  const serverMessage = (data?.error || data?.message || '').trim();
  const wrapped: PageCommentApiError = new Error(
    serverMessage || errObj?.message || fallbackMessage,
  );
  wrapped.status = errObj?.response?.status;
  wrapped.code =
    data?.code ||
    (errObj?.response?.status === 409
      ? 'CONFLICT'
      : errObj?.response?.status === 403
        ? 'FORBIDDEN'
        : undefined);
  return wrapped;
}

export const pageCommentService = {
  listBySeries: async (
    seriesId: string,
    params?: { chapterId?: string; status?: PageCommentStatus },
  ): Promise<PageCommentDto[]> => {
    try {
      const query: Record<string, string> = {};
      if (params?.chapterId) query.chapterId = params.chapterId;
      if (params?.status) query.status = params.status;
      const res = await axiosClient.get<PageCommentDto[]>(
        `/series/${encodeURIComponent(seriesId)}/page-comments`,
        { params: Object.keys(query).length > 0 ? query : undefined },
      );
      return res.data ?? [];
    } catch (error) {
      throw toApiError(error, 'Failed to load page comments');
    }
  },

  create: async (chapterId: string, body: CreatePageCommentRequest): Promise<PageCommentDto> => {
    try {
      const res = await axiosClient.post<PageCommentDto>(
        `/chapters/${encodeURIComponent(chapterId)}/page-comments`,
        body,
      );
      return res.data;
    } catch (error) {
      throw toApiError(error, 'Failed to create page comment');
    }
  },

  resolve: async (
    chapterId: string,
    commentId: string,
    body?: ResolvePageCommentRequest,
  ): Promise<PageCommentDto> => {
    try {
      const res = await axiosClient.post<PageCommentDto>(
        `/chapters/${encodeURIComponent(chapterId)}/page-comments/${encodeURIComponent(commentId)}/resolve`,
        body ?? {},
      );
      return res.data;
    } catch (error) {
      throw toApiError(error, 'Failed to resolve page comment');
    }
  },

  reopen: async (chapterId: string, commentId: string): Promise<PageCommentDto> => {
    try {
      const res = await axiosClient.post<PageCommentDto>(
        `/chapters/${encodeURIComponent(chapterId)}/page-comments/${encodeURIComponent(commentId)}/reopen`,
      );
      return res.data;
    } catch (error) {
      throw toApiError(error, 'Failed to reopen page comment');
    }
  },

  convertToRework: async (
    chapterId: string,
    commentId: string,
    body: ConvertPageCommentToReworkRequest,
  ): Promise<PageCommentDto> => {
    try {
      const res = await axiosClient.post<PageCommentDto>(
        `/chapters/${encodeURIComponent(chapterId)}/page-comments/${encodeURIComponent(commentId)}/rework`,
        body,
      );
      return res.data;
    } catch (error) {
      throw toApiError(error, 'Failed to convert page comment to rework');
    }
  },
};
