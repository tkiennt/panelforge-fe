// src/services/readerLibrary.service.ts — thư viện cá nhân của độc giả, dùng chung với app mobile.
import axiosClient from '../api/axiosClient';
import { translate } from '@/lib/i18n';

export type LibraryList = 'read-later' | 'following' | 'favorites';

export interface ReadingProgressDto {
  seriesId: string;
  chapterId: string;
  chapterNumber: number;
  lastPageNumber: number;
  totalPages: number;
  language?: string | null;
  readAt: string;
}

export interface ReaderLibraryDto {
  readLater: string[];
  following: { seriesId: string; lastSeenAt?: string | null }[];
  favorites: string[];
  history: ReadingProgressDto[];
}

function fail(error: any, key: string): Error {
  return new Error(error?.response?.data?.message || translate(key));
}

export const readerLibraryService = {
  /** GET /api/users/me/library */
  get: async (): Promise<ReaderLibraryDto> => {
    try {
      const { data } = await axiosClient.get('/users/me/library');
      return {
        readLater: data?.readLater ?? [],
        following: data?.following ?? [],
        favorites: data?.favorites ?? [],
        history: data?.history ?? [],
      };
    } catch (error) {
      throw fail(error, 'errors.services.readerLibrary.loadFailed');
    }
  },

  /** PUT / DELETE /api/users/me/library/{list}/{seriesId} */
  set: async (list: LibraryList, seriesId: string, add: boolean): Promise<void> => {
    try {
      if (add) await axiosClient.put(`/users/me/library/${list}/${seriesId}`, {});
      else await axiosClient.delete(`/users/me/library/${list}/${seriesId}`);
    } catch (error) {
      throw fail(error, 'errors.services.readerLibrary.updateFailed');
    }
  },

  /** PUT /api/users/me/library/history — bản đọc sau cùng thắng. */
  saveProgress: async (progress: ReadingProgressDto): Promise<void> => {
    await axiosClient.put('/users/me/library/history', progress);
  },
};
