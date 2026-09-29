// src/services/bible.service.ts
import { API_URL } from '../config/env';
export type BibleCategory = 0 | 1 | 2 | 3 | 4 | 5; // Character, Location, Prop, Terminology, StyleRule, PlotFact
export type BiblePriority = 0 | 1 | 2 | 3; // Low, Standard, High, CanonCritical

export interface BibleEntryRevisionDto {
  id: string;
  bibleEntryId: string;
  versionNumber: number;
  summary: string;
  snapshotJson: string;
  contentHash: string;
  authorId?: string | null;
  associatedChapterId?: string | null;
  effectiveFromChapterNumber: number;
  isInitialVersion: boolean;
  createdAt: string;
}

export interface BibleEntryDto {
  id: string;
  seriesBibleId: string;
  category: BibleCategory;
  code: string;
  name: string;
  subtitle?: string | null;
  description: string;
  detailsJson: string;
  referenceImageUrl?: string | null;
  priority: BiblePriority;
  strictCheck: boolean;
  isActive: boolean;
  effectiveRevision?: BibleEntryRevisionDto | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SeriesBibleDto {
  id: string;
  seriesId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  version: number;
  entries: BibleEntryDto[];
}

export interface CreateBibleEntryRequest {
  category: BibleCategory;
  code: string;
  name: string;
  description: string;
  subtitle?: string;
  detailsJson?: string;
  referenceImageUrl?: string;
  priority?: BiblePriority;
  strictCheck?: boolean;
  effectiveFromChapterNumber?: number;
}

export interface AddBibleEntryRevisionRequest {
  expectedVersionNumber?: number;
  summary: string;
  name: string;
  description: string;
  subtitle?: string;
  detailsJson?: string;
  referenceImageUrl?: string;
  priority?: BiblePriority;
  strictCheck?: boolean;
  effectiveFromChapterNumber?: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token && !token.startsWith('mock-')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const bibleService = {
  async getSeriesBible(seriesId: string): Promise<SeriesBibleDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/bible`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tải Series Bible.');
    }
    return res.json();
  },

  async getBibleEntriesAtChapter(
    seriesId: string,
    chapterNumber: number,
  ): Promise<BibleEntryDto[]> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/bible/at-chapter/${chapterNumber}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err.error || err.message || `Không thể tải Bible cho Chapter ${chapterNumber}.`,
      );
    }
    return res.json();
  },

  async getSeriesBibleAtChapter(
    seriesId: string,
    chapterNumber: number,
  ): Promise<{ entries: BibleEntryDto[] }> {
    const entries = await this.getBibleEntriesAtChapter(seriesId, chapterNumber);
    return { entries };
  },

  async createBibleEntry(seriesId: string, data: CreateBibleEntryRequest): Promise<BibleEntryDto> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/bible/entries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tạo mục Series Bible.');
    }
    return res.json();
  },

  async addRevision(
    seriesId: string,
    entryId: string,
    data: AddBibleEntryRevisionRequest,
  ): Promise<BibleEntryRevisionDto> {
    const res = await fetch(
      `${API_URL}/api/series/${seriesId}/bible/entries/${entryId}/revisions`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error: any = new Error(
        err.error || err.message || 'Không thể tạo phiên bản mới cho mục Bible.',
      );
      error.code = err.code || (res.status === 409 ? 'CONFLICT' : undefined);
      error.status = res.status;
      throw error;
    }
    return res.json();
  },

  async getEntryHistory(seriesId: string, entryId: string): Promise<BibleEntryRevisionDto[]> {
    const res = await fetch(`${API_URL}/api/series/${seriesId}/bible/entries/${entryId}/history`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Không thể tải lịch sử phiên bản của mục.');
    }
    return res.json();
  },
};
